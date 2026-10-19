import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";
import { PROVIDERS, REQUEST_TIMEOUT_MS, TASKS, type ModelConfig, type TaskId } from "@/config/ai";

export type Message = ChatCompletionMessageParam;

export type ChatRequest = {
  task: TaskId;
  model: ModelConfig;
  messages: Message[];
  maxTokens: number;
  jsonSchema: Record<string, unknown>;
};

export type ChatResponse = { content: string; inputTokens: number; outputTokens: number };

export type ChatFn = (req: ChatRequest) => Promise<ChatResponse>;

export type UsageRecord = {
  task: TaskId;
  provider: string;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  ocrPages: number;
  costUsd: number;
  ok: boolean;
  error: string | null;
};

export type AiContext = {
  chain: ModelConfig[];
  visionChain: ModelConfig[];
  chat: ChatFn;
  record: (usage: UsageRecord) => Promise<void>;
};

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export class AiUnavailableError extends Error {
  constructor(message = "Il servizio AI è momentaneamente occupato. Riprova tra qualche minuto.") {
    super(message);
  }
}

class InvalidOutputError extends Error {}

export const openaiChat: ChatFn = async ({ model, messages, maxTokens, jsonSchema }) => {
  const provider = PROVIDERS[model.provider];
  const client = new OpenAI({
    baseURL: provider.baseURL,
    apiKey: process.env[provider.apiKeyEnv],
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });
  try {
    const res = await client.chat.completions.create({
      model: model.id,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      response_format:
        model.structuredOutput === "json_schema"
          ? { type: "json_schema", json_schema: { name: "output", schema: jsonSchema } }
          : { type: "json_object" },
    });
    return {
      content: res.choices[0]?.message?.content ?? "",
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
    };
  } catch (e) {
    if (e instanceof OpenAI.APIError) throw new ProviderError(e.message, e.status);
    throw new ProviderError(e instanceof Error ? e.message : String(e));
  }
};

export function costUsd(model: ModelConfig, inputTokens: number, outputTokens: number): number {
  return (inputTokens * model.inputUsdPerMTok + outputTokens * model.outputUsdPerMTok) / 1_000_000;
}

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
  const { promptVersion, maxTokens } = TASKS[opts.task];
  const jsonSchema = z.toJSONSchema(opts.schema) as Record<string, unknown>;
  const chain = opts.vision ? ctx.visionChain : ctx.chain;
  if (!chain.length) {
    throw new AiUnavailableError(
      "Nessun modello AI disponibile: manca la chiave API del provider oppure, con i provider gratuiti, il consenso all'uso dei dati (Impostazioni).",
    );
  }
  let totalInput = 0;

  for (const model of chain) {
    const messages = [...opts.messages];
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        let res: ChatResponse;
        try {
          res = await ctx.chat({ task: opts.task, model, messages, maxTokens, jsonSchema });
        } catch (e) {
          await ctx.record({
            task: opts.task,
            provider: model.provider,
            model: model.id,
            promptVersion,
            inputTokens: 0,
            outputTokens: 0,
            ocrPages: 0,
            costUsd: 0,
            ok: false,
            error: e instanceof Error ? e.message.slice(0, 500) : String(e),
          });
          throw e;
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

        await ctx.record({
          task: opts.task,
          provider: model.provider,
          model: model.id,
          promptVersion,
          inputTokens: res.inputTokens,
          outputTokens: res.outputTokens,
          ocrPages: data !== undefined ? (opts.ocrPages ?? 0) : 0,
          costUsd: costUsd(model, res.inputTokens, res.outputTokens),
          ok: data !== undefined,
          error: error?.slice(0, 500) ?? null,
        });

        if (data !== undefined) return { data, inputTokens: totalInput };

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
    }
  }
  throw new AiUnavailableError();
}
