import type { PlanId } from "./plans";

export type ProviderId = keyof typeof PROVIDERS;

export type ModelConfig = {
  key: string;
  provider: ProviderId;
  id: string;
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
  contextTokens: number;
  vision: boolean;
  structuredOutput: "json_schema" | "json_object" | "prompt";
  usesDataForTraining: boolean;
  enabled: boolean;
  reasoning?: { extraTokens: number; mandatory?: boolean };
  timeoutMs?: number;
  expiresAt?: string;
};

export const PROVIDERS = {
  mistral: { baseURL: "https://api.mistral.ai/v1", apiKeyEnv: "MISTRAL_API_KEY" },
  openrouter: { baseURL: "https://openrouter.ai/api/v1", apiKeyEnv: "OPENROUTER_API_KEY" },
  meta: { baseURL: "https://api.meta.ai/v1", apiKeyEnv: "META_API_KEY" },
  gemini: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", apiKeyEnv: "GEMINI_API_KEY" },
} as const;

// Prices are what this app actually pays: 0 on free tiers (Gemini free tier, OpenRouter :free).
// The Gemini free tier is off: Google's terms allow only paid services for apps serving EEA users
// (https://ai.google.dev/gemini-api/terms, "Use Restrictions"). Enable it again only with a paid key.
// Gemini's OpenAI-compatible endpoint rejects our JSON schemas in json_schema mode, so it uses json_object + Zod.
// Models with `reasoning` get the task's effort (TASKS), or the lowest one when they cannot turn it off;
// reasoning tokens are billed as output and count against max_tokens, so they get `extraTokens` more.
// OpenRouter models with `usesDataForTraining: false` are routed only to providers that do not collect data (`data_collection: "deny"`).
// A model with `expiresAt` leaves the chains automatically after that instant.
export const MODELS: ModelConfig[] = [
  {
    key: "qwen-flash",
    provider: "openrouter",
    id: "qwen/qwen3.7-flash",
    inputUsdPerMTok: 0.03,
    outputUsdPerMTok: 0.13,
    contextTokens: 1_000_000,
    vision: true,
    structuredOutput: "json_object",
    usesDataForTraining: true,
    enabled: true,
    reasoning: { extraTokens: 4000 },
  },
  {
    key: "deepseek-flash",
    provider: "openrouter",
    id: "deepseek/deepseek-v4.1-flash",
    inputUsdPerMTok: 0.024,
    outputUsdPerMTok: 0.375,
    contextTokens: 1_048_576,
    vision: true,
    structuredOutput: "json_object",
    usesDataForTraining: true,
    enabled: true,
    reasoning: { extraTokens: 4000 },
  },
  {
    key: "minimax-flash-free",
    provider: "openrouter",
    id: "minimax/minimax-m3.1-flash:free",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
    contextTokens: 1_000_000,
    vision: true,
    structuredOutput: "json_object",
    usesDataForTraining: true,
    enabled: true,
    reasoning: { extraTokens: 4000, mandatory: true },
    expiresAt: "2026-10-22T00:00:00Z",
  },
  {
    key: "gemini-flash",
    provider: "gemini",
    id: "gemini-flash-latest",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
    contextTokens: 1_000_000,
    vision: true,
    structuredOutput: "json_object",
    usesDataForTraining: true,
    enabled: false,
  },
  {
    key: "gemini-flash-lite",
    provider: "gemini",
    id: "gemini-flash-lite-latest",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
    contextTokens: 1_000_000,
    vision: true,
    structuredOutput: "json_object",
    usesDataForTraining: true,
    enabled: false,
  },
  {
    key: "mistral-small",
    provider: "mistral",
    id: "mistral-small-2603",
    inputUsdPerMTok: 0.15,
    outputUsdPerMTok: 0.6,
    contextTokens: 256_000,
    vision: true,
    structuredOutput: "json_schema",
    usesDataForTraining: false,
    enabled: false,
  },
  {
    key: "nemotron-vl-free",
    provider: "openrouter",
    id: "nvidia/nemotron-3.5-super-vl:free",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
    contextTokens: 1_000_000,
    vision: true,
    structuredOutput: "json_object",
    usesDataForTraining: true,
    enabled: true,
  },
  {
    key: "gemma-4-31b-free",
    provider: "openrouter",
    id: "google/gemma-4-31b-it:free",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
    contextTokens: 262_144,
    vision: true,
    structuredOutput: "json_object",
    usesDataForTraining: true,
    enabled: true,
  },
  {
    key: "gemma-4-free",
    provider: "openrouter",
    id: "google/gemma-4-26b-a4b-it:free",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
    contextTokens: 262_144,
    vision: true,
    structuredOutput: "json_object",
    usesDataForTraining: true,
    enabled: true,
  },
  {
    key: "openrouter-free",
    provider: "openrouter",
    id: "openrouter/free",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
    contextTokens: 32_000,
    vision: false,
    structuredOutput: "json_object",
    usesDataForTraining: true,
    enabled: true,
  },
  {
    key: "muse-spark",
    provider: "meta",
    id: "muse-spark-1.3",
    inputUsdPerMTok: 1.25,
    outputUsdPerMTok: 4.25,
    contextTokens: 1_048_576,
    vision: true,
    structuredOutput: "json_schema",
    usesDataForTraining: false,
    enabled: false,
  },
  {
    key: "muse-spark-contributor",
    provider: "meta",
    id: "muse-spark-1.3-contributor",
    inputUsdPerMTok: 0.1,
    outputUsdPerMTok: 0.2,
    contextTokens: 1_048_576,
    vision: true,
    structuredOutput: "json_schema",
    usesDataForTraining: true,
    enabled: false,
  },
];

export type Chains = { text: string[]; vision: string[] };

export const CHAINS: Record<PlanId, Chains> = {
  free: {
    text: ["deepseek-flash", "qwen-flash", "gemma-4-free"],
    vision: ["deepseek-flash", "qwen-flash", "gemma-4-free"],
  },
  pro: {
    text: ["muse-spark", "mistral-small", "deepseek-flash", "qwen-flash", "gemma-4-free"],
    vision: ["muse-spark", "mistral-small", "deepseek-flash", "qwen-flash", "gemma-4-free"],
  },
};

export type TaskId = "mindmap" | "flashcards" | "transcribe" | "figure" | "summary" | "quiz" | "chat";

export type Reasoning = "none" | "low" | "medium";

// `chunkInputTokens` caps the input of one call when the answer grows with the input (a summary of a long document
// would otherwise be cut at max_tokens).
export const TASKS: Record<
  TaskId,
  { promptVersion: string; maxTokens: number; timeoutMs: number; reasoning: Reasoning; chunkInputTokens?: number }
> = {
  mindmap: { promptVersion: "v2", maxTokens: 4000, timeoutMs: 40_000, reasoning: "none" },
  flashcards: { promptVersion: "v2", maxTokens: 4000, timeoutMs: 40_000, reasoning: "none" },
  transcribe: { promptVersion: "v2", maxTokens: 3000, timeoutMs: 30_000, reasoning: "none" },
  figure: { promptVersion: "v1", maxTokens: 2000, timeoutMs: 30_000, reasoning: "none" },
  summary: { promptVersion: "v3", maxTokens: 6000, timeoutMs: 90_000, reasoning: "none", chunkInputTokens: 6_000 },
  quiz: { promptVersion: "v3", maxTokens: 4000, timeoutMs: 60_000, reasoning: "low" },
  chat: { promptVersion: "v1", maxTokens: 2000, timeoutMs: 30_000, reasoning: "none" },
};

export const CHUNK_INPUT_TOKENS = 12_000;
export const CONTEXT_USE = 0.8;

export type LimitPool = ProviderId | "openrouter-free";

export const poolOf = (m: ModelConfig): LimitPool =>
  m.provider === "openrouter" && m.inputUsdPerMTok === 0 && m.outputUsdPerMTok === 0 ? "openrouter-free" : m.provider;

// Per-account request limits shared by every user of the app. OpenRouter free models: 20 per minute, 50 per day
// until 10 credits were bought in total, then 1000 (https://openrouter.ai/docs/api-reference/limits).
// The other values are estimates: check them in each provider's console.
export const PROVIDER_LIMITS: Record<LimitPool, { perMinute: number; perDay: number | null }> = {
  "openrouter-free": { perMinute: 20, perDay: 50 },
  openrouter: { perMinute: 60, perDay: null },
  mistral: { perMinute: 60, perDay: null },
  gemini: { perMinute: 10, perDay: 250 },
  meta: { perMinute: 60, perDay: null },
};
export const QUEUE_ROUNDS = 3;
export const RETRY_DELAYS_MS = [2_000, 5_000];
