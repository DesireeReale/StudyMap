import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";
import { SUPPORT_EMAIL } from "../feedback";
import {
  CHUNK_INPUT_TOKENS,
  CONTEXT_USE,
  poolOf,
  PROVIDERS,
  QUEUE_ROUNDS,
  RETRY_DELAYS_MS,
  TASKS,
  type LimitPool,
  type ModelConfig,
  type Reasoning,
  type TaskId,
} from "@/config/ai";

export type Message = ChatCompletionMessageParam;

export type ChatRequest = {
  task: TaskId;
  model: ModelConfig;
  messages: Message[];
  maxTokens: number;
  jsonSchema: Record<string, unknown>;
  fallbacks?: string[];
  timeoutMs: number;
};

export type ChatResponse = {
  content: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
  costUsd?: number;
  model?: string;
  truncated?: boolean;
};

export type ChatFn = (req: ChatRequest) => Promise<ChatResponse>;

export type UsageRecord = {
  task: TaskId;
  provider: string;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  ocrPages: number;
  costUsd: number;
  ok: boolean;
  error: string | null;
  durationMs: number;
  queueWaitMs: number;
  outcome: Outcome;
};

export type Outcome = "ok" | "invalid" | "timeout" | "rate_limited" | "error";

export type AiContext = {
  chain: ModelConfig[];
  visionChain: ModelConfig[];
  chat: ChatFn;
  record: (usage: UsageRecord) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  takeSlot?: (pool: LimitPool) => Promise<Slot>;
  onWait?: (waiting: boolean) => void;
  now?: () => number;
};

export type Slot = "ok" | "minute" | "day";

export const NO_CREDIT_ERROR = `I modelli AI dell'app sono momentaneamente senza credito. Abbiamo bisogno di ricaricarlo: riprova più tardi o scrivi a ${SUPPORT_EMAIL}.`;

export const DAILY_LIMIT_ERROR =
  "Per oggi i modelli AI gratuiti hanno raggiunto il limite di richieste dell'app. Riprova domani.";

export const TRUNCATED_ERROR = `La risposta dell'AI era troppo lunga ed è stata interrotta. Riprova; se succede ancora scrivi a ${SUPPORT_EMAIL}.`;
export const TIMEOUT_ERROR = "L'AI ha impiegato troppo tempo a rispondere. Riprova tra poco.";
export const INVALID_ERROR = "L'AI ha risposto in un formato non valido. Riprova.";
export const FAILED_ERROR = "Il servizio AI non ha risposto correttamente. Riprova tra poco.";

export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export function inputBudget(chain: ModelConfig[], task: TaskId): number {
  const context = chain[0]?.contextTokens ?? 0;
  const budget = Math.max(CHUNK_INPUT_TOKENS, Math.floor(context * CONTEXT_USE) - TASKS[task].maxTokens);
  return Math.min(budget, TASKS[task].chunkInputTokens ?? budget);
}

export function effortFor(model: ModelConfig, task: TaskId): Reasoning | undefined {
  if (!model.reasoning) return undefined;
  const effort = TASKS[task].reasoning;
  return effort === "none" && model.reasoning.mandatory ? "low" : effort;
}

const msToNextMinute = (now: number) => 60_000 - (now % 60_000) + 500;

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly timeout = false,
  ) {
    super(message);
  }
}

export class AiUnavailableError extends Error {
  constructor(message = "Il servizio AI è momentaneamente occupato. Riprova tra qualche minuto.") {
    super(message);
  }
}

class InvalidOutputError extends Error {
  constructor(readonly truncated = false) {
    super(truncated ? "output truncated at max_tokens" : "invalid output");
  }
}

export const openaiChat: ChatFn = async ({ task, model, messages, maxTokens, jsonSchema, fallbacks, timeoutMs }) => {
  const provider = PROVIDERS[model.provider];
  const client = new OpenAI({
    baseURL: provider.baseURL,
    apiKey: process.env[provider.apiKeyEnv],
    timeout: timeoutMs,
    maxRetries: 0,
  });
  try {
    const res = await client.chat.completions.create({
      model: model.id,
      ...(fallbacks?.length ? { models: [model.id, ...fallbacks] } : {}),
      ...(model.reasoning ? { reasoning: { effort: effortFor(model, task) } } : {}),
      ...(model.provider === "openrouter" && !model.usesDataForTraining ? { provider: { data_collection: "deny" } } : {}),
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      ...(model.structuredOutput === "prompt"
        ? {}
        : {
            response_format:
              model.structuredOutput === "json_schema"
                ? { type: "json_schema" as const, json_schema: { name: "output", schema: jsonSchema } }
                : { type: "json_object" as const },
          }),
    });
    return {
      content: res.choices[0]?.message?.content ?? "",
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
      reasoningTokens: res.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
      costUsd: (res.usage as { cost?: number } | undefined)?.cost,
      model: res.model,
      truncated: res.choices[0]?.finish_reason === "length",
    };
  } catch (e) {
    if (e instanceof OpenAI.APIConnectionTimeoutError) throw new ProviderError(e.message, undefined, true);
    if (e instanceof OpenAI.APIError) throw new ProviderError(e.message, e.status);
    throw new ProviderError(e instanceof Error ? e.message : String(e));
  }
};

export function costUsd(model: ModelConfig, inputTokens: number, outputTokens: number): number {
  return (inputTokens * model.inputUsdPerMTok + outputTokens * model.outputUsdPerMTok) / 1_000_000;
}

function outcomeOf(e: unknown): Outcome {
  if (e instanceof ProviderError && e.timeout) return "timeout";
  if (e instanceof ProviderError && e.status === 429) return "rate_limited";
  return "error";
}

function isBusy(e: unknown): boolean {
  return e instanceof ProviderError && e.status !== undefined && (e.status === 429 || e.status >= 500);
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function shouldFallback(e: unknown): boolean {
  if (e instanceof InvalidOutputError) return true;
  if (!(e instanceof ProviderError)) return false;
  return e.status === undefined || ![400, 404, 422].includes(e.status);
}

export function parseJsonOutput(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

export async function complete<T>(
  ctx: AiContext,
  opts: {
    task: TaskId;
    schema: z.ZodType<T>;
    messages: Message[];
    vision?: boolean;
    ocrPages?: number;
  },
): Promise<{ data: T; inputTokens: number }> {
  const { promptVersion, maxTokens, timeoutMs } = TASKS[opts.task];
  const now = ctx.now ?? Date.now;
  let queueWaitMs = 0;
  const jsonSchema = z.toJSONSchema(opts.schema) as Record<string, unknown>;
  const chain = opts.vision ? ctx.visionChain : ctx.chain;
  if (!chain.length) {
    throw new AiUnavailableError(
      "Nessun modello AI disponibile: manca la chiave API del provider oppure non hai ancora accettato le condizioni della beta.",
    );
  }
  let totalInput = 0;
  const inputTokens = estimateTokens(JSON.stringify(opts.messages));
  const full = new Map<LimitPool, Slot>();
  const tried = new Set<string>();
  const failures: unknown[] = [];
  const fits = (m: ModelConfig) => inputTokens + maxTokens <= m.contextTokens * CONTEXT_USE;

  for (let round = 0; round <= QUEUE_ROUNDS; round++) {
    full.clear();
    tried.clear();
    for (const [index, model] of chain.entries()) {
      const pool = poolOf(model);
      if (tried.has(model.key) || !fits(model) || full.has(pool)) continue;
      const slot = ctx.takeSlot ? await ctx.takeSlot(pool) : "ok";
      if (slot !== "ok") {
        full.set(pool, slot);
        continue;
      }
      const later = chain.slice(index + 1);
      const fallbacks =
        model.provider === "openrouter"
          ? later.filter(
              (m) =>
                poolOf(m) === pool &&
                m.usesDataForTraining === model.usesDataForTraining &&
                !tried.has(m.key) &&
                fits(m),
            )
          : [];
      for (const m of [model, ...fallbacks]) tried.add(m.key);
      const isLast = later.every((m) => tried.has(m.key));
      const messages = [...opts.messages];
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          let res: ChatResponse | undefined;
          let durationMs = 0;
          for (let retry = 0; !res; retry++) {
            const started = now();
            try {
              res = await ctx.chat({
                task: opts.task,
                model,
                messages,
                maxTokens: maxTokens + (effortFor(model, opts.task) !== "none" ? (model.reasoning?.extraTokens ?? 0) : 0),
                jsonSchema,
                fallbacks: fallbacks.map((m) => m.id),
                timeoutMs: model.timeoutMs ?? timeoutMs,
              });
              durationMs = now() - started;
            } catch (e) {
              await ctx.record({
                task: opts.task,
                provider: model.provider,
                model: model.id,
                promptVersion,
                inputTokens: 0,
                outputTokens: 0,
                reasoningTokens: 0,
                ocrPages: 0,
                costUsd: 0,
                ok: false,
                error: e instanceof Error ? e.message.slice(0, 500) : String(e),
                durationMs: now() - started,
                queueWaitMs,
                outcome: outcomeOf(e),
              });
              if (e instanceof ProviderError && e.timeout) for (const m of fallbacks) tried.delete(m.key);
              if (!isBusy(e) || !isLast || retry >= RETRY_DELAYS_MS.length) throw e;
              await (ctx.sleep ?? wait)(RETRY_DELAYS_MS[retry]!);
            }
          }
          totalInput += res.inputTokens;

          let error: string | null = null;
          let data: T | undefined;
          try {
            const parsed = opts.schema.safeParse(parseJsonOutput(res.content));
            if (parsed.success) data = parsed.data;
            else error = z.prettifyError(parsed.error);
          } catch (e) {
            error = e instanceof Error ? e.message : "JSON non valido";
          }
          if (data === undefined && res.truncated) error = `truncated at max_tokens (${res.outputTokens} output tokens): ${error}`;

          await ctx.record({
            task: opts.task,
            provider: model.provider,
            model: res.model ?? model.id,
            promptVersion,
            inputTokens: res.inputTokens,
            outputTokens: res.outputTokens,
            reasoningTokens: res.reasoningTokens ?? 0,
            ocrPages: data !== undefined ? (opts.ocrPages ?? 0) : 0,
            costUsd: res.costUsd ?? costUsd(model, res.inputTokens, res.outputTokens),
            ok: data !== undefined,
            error: error?.slice(0, 500) ?? null,
            durationMs,
            queueWaitMs,
            outcome: data !== undefined ? "ok" : "invalid",
          });

          if (data !== undefined) return { data, inputTokens: totalInput };
          if (res.truncated) throw new InvalidOutputError(true);

          messages.push(
            { role: "assistant", content: res.content },
            {
              role: "user",
              content: `La risposta non rispetta lo schema JSON richiesto:\n${error}\nRispondi di nuovo solo con JSON valido.`,
            },
          );
        }
        throw new InvalidOutputError();
      } catch (e) {
        if (!shouldFallback(e)) throw e;
        failures.push(e);
      }
    }
    if (![...full.values()].includes("minute") || round === QUEUE_ROUNDS) break;
    ctx.onWait?.(true);
    const pause = msToNextMinute(now());
    await (ctx.sleep ?? wait)(pause);
    queueWaitMs += pause;
    ctx.onWait?.(false);
  }
  if (full.size && [...full.values()].every((v) => v === "day")) throw new AiUnavailableError(DAILY_LIMIT_ERROR);
  if (failures.length && failures.every((e) => e instanceof ProviderError && e.status === 402)) {
    console.error("AI providers out of credit");
    throw new AiUnavailableError(NO_CREDIT_ERROR);
  }
  const reason = failureMessage(failures);
  if (reason) {
    console.error(
      `AI ${opts.task} failed on every model:`,
      failures.map((e) => (e instanceof ProviderError ? `${e.status ?? (e.timeout ? "timeout" : "error")} ${e.message}` : (e as Error).message)),
    );
    throw new AiUnavailableError(reason);
  }
  throw new AiUnavailableError();
}

function failureMessage(failures: unknown[]): string | null {
  const real = failures.filter((e) => !(e instanceof ProviderError && e.status === 429));
  if (!real.length) return null;
  if (real.some((e) => e instanceof InvalidOutputError && e.truncated)) return TRUNCATED_ERROR;
  if (real.some((e) => e instanceof ProviderError && e.timeout)) return TIMEOUT_ERROR;
  if (real.some((e) => e instanceof InvalidOutputError)) return INVALID_ERROR;
  return FAILED_ERROR;
}
