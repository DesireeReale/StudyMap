import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { MODELS, RETRY_DELAYS_MS, TASKS } from "@/config/ai";
import {
  AiUnavailableError,
  ProviderError,
  complete,
  costUsd,
  type AiContext,
  type ChatFn,
  type UsageRecord,
} from "./client";

const schema = z.object({ answer: z.string() });
const [modelA, modelB] = [
  { ...MODELS[0]!, key: "a", id: "model-a", inputUsdPerMTok: 1, outputUsdPerMTok: 2 },
  { ...MODELS[1]!, key: "b", id: "model-b" },
];

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
    expect(usage[0]).toMatchObject({ model: "model-a", ok: true, costUsd: 0.002, promptVersion: "v1" });
  });

  it("always sends max_tokens from the task config", async () => {
    const { c } = ctx(async () => ok('{"answer":"x"}'));
    await run(c);
    expect(c.chat).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: TASKS.mindmap.maxTokens }));
  });

  it.each([429, 500, 503])("retries a busy model (status %s) with backoff, then falls back", async (status) => {
    const { c, usage } = ctx(async ({ model }) => {
      if (model.id === "model-a") throw new ProviderError("busy", status);
      return ok('{"answer":"b"}');
    });
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "b" } });
    const attemptsOnA = RETRY_DELAYS_MS.length + 1;
    expect(usage.map((u) => [u.model, u.ok])).toEqual([
      ...Array.from({ length: attemptsOnA }, () => ["model-a", false]),
      ["model-b", true],
    ]);
    expect(vi.mocked(c.sleep!).mock.calls.map(([ms]) => ms)).toEqual(RETRY_DELAYS_MS);
  });

  it("recovers on the same model when it is busy only once", async () => {
    let calls = 0;
    const { c, usage } = ctx(async () => {
      if (calls++ === 0) throw new ProviderError("high demand", 503);
      return ok('{"answer":"a"}');
    });
    await expect(run(c)).resolves.toMatchObject({ data: { answer: "a" } });
    expect(usage.map((u) => [u.model, u.ok])).toEqual([
      ["model-a", false],
      ["model-a", true],
    ]);
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
