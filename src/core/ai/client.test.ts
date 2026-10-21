import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { MODELS, RETRY_DELAYS_MS, TASKS } from "@/config/ai";
import {
  AiUnavailableError,
  DAILY_LIMIT_ERROR,
  ProviderError,
  complete,
  costUsd,
  inputBudget,
  type Slot,
  type AiContext,
  type ChatFn,
  type UsageRecord,
} from "./client";

const schema = z.object({ answer: z.string() });
const byKey = (key: string) => MODELS.find((m) => m.key === key)!;
const [modelA, modelB] = [
  { ...byKey("gemini-flash"), key: "a", id: "model-a", inputUsdPerMTok: 1, outputUsdPerMTok: 2 },
  { ...byKey("gemini-flash-lite"), key: "b", id: "model-b" },
];
const modelC = { ...byKey("gemma-4-free"), key: "c", id: "model-c" };

function ctx(chat: ChatFn) {
  const usage: UsageRecord[] = [];
  const c: AiContext = {
    chain: [modelA, modelB],
    visionChain: [modelA],
    chat: vi.fn(chat),
    record: async (u) => {
      usage.push(u);
    },
    sleep: vi.fn(async () => {}),
  };
  return { c, usage };
}

const ok = (content: string) => ({ content, inputTokens: 1000, outputTokens: 500 });
const run = (c: AiContext) =>
  complete(c, { task: "mindmap", schema, messages: [{ role: "user", content: "x" }] });

describe("complete", () => {
  it("returns validated data and records cost", async () => {
    const { c, usage } = ctx(async () => ok('{"answer":"sì"}'));
    await expect(run(c)).resolves.toEqual({ data: { answer: "sì" }, inputTokens: 1000 });
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({ model: "model-a", ok: true, costUsd: 0.002, promptVersion: TASKS.mindmap.promptVersion });
  });

  it("always sends max_tokens from the task config", async () => {
    const { c } = ctx(async () => ok('{"answer":"x"}'));
    await run(c);
    expect(c.chat).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: TASKS.mindmap.maxTokens }));
  });

  it.each([429, 500, 503])("moves to the next model at once when one is busy (status %s)", async (status) => {
    const { c, usage } = ctx(async ({ model }) => {
      if (model.id === "model-a") throw new ProviderError("busy", status);
      return ok('{"answer":"b"}');
    });
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "b" } });
    expect(usage.map((u) => [u.model, u.ok])).toEqual([
      ["model-a", false],
      ["model-b", true],
    ]);
    expect(c.sleep).not.toHaveBeenCalled();
  });

  it("retries the last model with backoff when it is busy", async () => {
    let calls = 0;
    const { c, usage } = ctx(async () => {
      if (calls++ === 0) throw new ProviderError("high demand", 503);
      return ok('{"answer":"a"}');
    });
    c.chain = [modelA];
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "a" } });
    expect(usage.map((u) => [u.model, u.ok])).toEqual([
      ["model-a", false],
      ["model-a", true],
    ]);
    expect(vi.mocked(c.sleep!).mock.calls.map(([ms]) => ms)).toEqual([RETRY_DELAYS_MS[0]]);
  });

  it("gives up on the last model after the backoff delays", async () => {
    const { c, usage } = ctx(async () => {
      throw new ProviderError("high demand", 503);
    });
    c.chain = [modelA];
    await expect(run(c)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(usage).toHaveLength(RETRY_DELAYS_MS.length + 1);
    expect(vi.mocked(c.sleep!).mock.calls.map(([ms]) => ms)).toEqual(RETRY_DELAYS_MS);
  });

  it("falls back without waiting on network errors and timeouts", async () => {
    const { c, usage } = ctx(async ({ model }) => {
      if (model.id === "model-a") throw new ProviderError("timeout");
      return ok('{"answer":"b"}');
    });
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "b" } });
    expect(usage.map((u) => u.model)).toEqual(["model-a", "model-b"]);
    expect(c.sleep).not.toHaveBeenCalled();
  });

  it("does not fall back on a 400", async () => {
    const { c } = ctx(async () => {
      throw new ProviderError("bad request", 400);
    });
    await expect(run(c)).rejects.toThrow("bad request");
    expect(c.chat).toHaveBeenCalledTimes(1);
  });

  it("retries once with the validation error, then succeeds", async () => {
    const replies = ["not json", '```json\n{"answer":"ok"}\n```'];
    const { c, usage } = ctx(async () => ok(replies.shift()!));
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "ok" }, inputTokens: 2000 });
    const second = vi.mocked(c.chat).mock.calls[1]![0];
    expect(second.messages.at(-1)).toMatchObject({ role: "user" });
    expect(usage.map((u) => u.ok)).toEqual([false, true]);
  });

  it("moves to the next model after two invalid outputs", async () => {
    const { c } = ctx(async ({ model }) => ok(model.id === "model-a" ? '{"wrong":1}' : '{"answer":"b"}'));
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "b" } });
    expect(c.chat).toHaveBeenCalledTimes(3);
  });

  it("throws AiUnavailableError when the whole chain fails", async () => {
    const { c } = ctx(async () => {
      throw new ProviderError("rate limited", 429);
    });
    await expect(run(c)).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("explains when no model is configured", async () => {
    const { c } = ctx(async () => ok('{"answer":"x"}'));
    c.chain = [];
    await expect(run(c)).rejects.toThrow("Nessun modello AI disponibile");
    expect(c.chat).not.toHaveBeenCalled();
  });

  it("uses the vision chain for image tasks", async () => {
    const { c } = ctx(async () => ok('{"answer":"x"}'));
    await complete(c, { task: "transcribe", schema, vision: true, messages: [] });
    expect(vi.mocked(c.chat).mock.calls[0]![0].model.id).toBe("model-a");
  });
});

describe("costUsd", () => {
  it("computes per-million pricing", () => {
    expect(costUsd(modelA, 2_000_000, 1_000_000)).toBe(4);
  });
});

describe("provider limits", () => {
  const slots = (byProvider: Record<string, Slot[]>) =>
    vi.fn(async (provider: string) => byProvider[provider]?.shift() ?? "ok");

  it("moves at once to a model of another provider when one is full", async () => {
    const { c, usage } = ctx(async () => ok('{"answer":"c"}'));
    c.chain = [modelA, modelB, modelC];
    c.takeSlot = slots({ [modelA.provider]: ["minute"] });
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "c" } });
    expect(usage.map((u) => u.model)).toEqual(["model-c"]);
    expect(c.takeSlot).toHaveBeenCalledTimes(2);
    expect(c.sleep).not.toHaveBeenCalled();
  });

  it("queues until the next minute when every provider is full", async () => {
    const { c, usage } = ctx(async () => ok('{"answer":"a"}'));
    c.chain = [modelA, modelC];
    c.takeSlot = slots({ [modelA.provider]: ["minute"], [modelC.provider]: ["minute"] });
    c.onWait = vi.fn();
    c.now = () => Date.parse("2026-10-20T12:00:45Z");
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "a" } });
    expect(c.onWait).toHaveBeenNthCalledWith(1, true);
    expect(c.onWait).toHaveBeenNthCalledWith(2, false);
    expect(vi.mocked(c.sleep!).mock.calls).toEqual([[15_500]]);
    expect(usage.map((u) => u.model)).toEqual(["model-a"]);
  });

  it("stops with a clear message when the daily limit is reached everywhere", async () => {
    const { c } = ctx(async () => ok('{"answer":"a"}'));
    c.chain = [modelA, modelC];
    c.takeSlot = vi.fn(async () => "day" as const);
    await expect(run(c)).rejects.toThrow(DAILY_LIMIT_ERROR);
    expect(c.chat).not.toHaveBeenCalled();
  });

  it("gives up after a few minutes in the queue", async () => {
    const { c } = ctx(async () => ok('{"answer":"a"}'));
    c.chain = [modelA];
    c.takeSlot = vi.fn(async () => "minute" as const);
    await expect(run(c)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(c.sleep).toHaveBeenCalledTimes(3);
  });

  it("skips models whose context is too small for the input", async () => {
    const { c, usage } = ctx(async () => ok('{"answer":"c"}'));
    c.chain = [{ ...modelA, contextTokens: 6_000 }, modelC];
    await complete(c, { task: "mindmap", schema, messages: [{ role: "user", content: "x".repeat(20_000) }] });
    expect(usage.map((u) => u.model)).toEqual(["model-c"]);
  });

  it("sends the whole document at once when it fits the first model", () => {
    expect(inputBudget([{ ...modelC, contextTokens: 262_144 }], "mindmap")).toBe(Math.floor(262_144 * 0.8) - TASKS.mindmap.maxTokens);
    expect(inputBudget([{ ...modelC, contextTokens: 8_000 }], "mindmap")).toBe(12_000);
  });
});

describe("OpenRouter fallbacks", () => {
  const minimax = { ...byKey("minimax-flash-free"), key: "m", id: "minimax" };
  const gemma = { ...byKey("gemma-4-free"), key: "g", id: "gemma" };

  it("lets OpenRouter switch between its models in one request and records who answered", async () => {
    const { c, usage } = ctx(async () => ({ ...ok('{"answer":"g"}'), model: "gemma" }));
    c.chain = [minimax, gemma, modelA];
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "g" } });
    expect(c.chat).toHaveBeenCalledTimes(1);
    expect(c.chat).toHaveBeenCalledWith(
      expect.objectContaining({ fallbacks: ["gemma"], maxTokens: TASKS.mindmap.maxTokens + minimax.reasoning!.extraTokens }),
    );
    expect(usage[0]).toMatchObject({ model: "gemma", ok: true });
  });

  it("does not retry the OpenRouter fallbacks itself and moves to another provider", async () => {
    const { c, usage } = ctx(async ({ model }) => {
      if (model.provider === "openrouter") throw new ProviderError("busy", 429);
      return ok('{"answer":"a"}');
    });
    c.chain = [minimax, gemma, modelA];
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "a" } });
    expect(vi.mocked(c.chat).mock.calls.map(([req]) => req.model.id)).toEqual(["minimax", "model-a"]);
    expect(usage.map((u) => u.model)).toEqual(["minimax", "model-a"]);
  });

  it("sends no fallback list to other providers", async () => {
    const { c } = ctx(async () => ok('{"answer":"a"}'));
    c.chain = [modelA, gemma];
    await run(c);
    expect(c.chat).toHaveBeenCalledWith(expect.objectContaining({ fallbacks: [] }));
  });
});

describe("latency", () => {
  const minimax = { ...byKey("minimax-flash-free"), key: "m", id: "minimax" };
  const gemma = { ...byKey("gemma-4-free"), key: "g", id: "gemma" };
  const clock = (...times: number[]) => vi.fn(() => times.shift() ?? 0);

  it("records how long each call took and its outcome", async () => {
    const { c, usage } = ctx(async () => ok('{"answer":"a"}'));
    c.chain = [modelA];
    c.now = clock(1_000, 4_500);
    await run(c);
    expect(usage[0]).toMatchObject({ durationMs: 3_500, queueWaitMs: 0, outcome: "ok" });
    expect(c.chat).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: TASKS.mindmap.timeoutMs }));
  });

  it("moves on after a timeout and still tries the models OpenRouter did not reach", async () => {
    const { c, usage } = ctx(async ({ model }) => {
      if (model.id === "minimax") throw new ProviderError("Request timed out.", undefined, true);
      return ok('{"answer":"g"}');
    });
    c.chain = [minimax, gemma];
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "g" } });
    expect(vi.mocked(c.chat).mock.calls.map(([req]) => req.model.id)).toEqual(["minimax", "gemma"]);
    expect(usage.map((u) => [u.model, u.outcome])).toEqual([
      ["minimax", "timeout"],
      ["gemma", "ok"],
    ]);
  });

  it("labels rate limits and counts the time spent in the queue", async () => {
    let calls = 0;
    const { c, usage } = ctx(async () => {
      if (calls++ === 0) throw new ProviderError("busy", 429);
      return ok('{"answer":"a"}');
    });
    c.chain = [modelA, modelC];
    c.takeSlot = vi.fn(async (provider: string) => (provider === modelC.provider && calls === 1 ? "minute" : "ok"));
    c.now = () => Date.parse("2026-10-20T12:00:30Z");
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "a" } });
    expect(usage[0]).toMatchObject({ outcome: "rate_limited", queueWaitMs: 0 });
    expect(usage.at(-1)).toMatchObject({ outcome: "ok", queueWaitMs: 30_500 });
  });
});
