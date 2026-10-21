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
  structuredOutput: "json_schema" | "json_object";
  usesDataForTraining: boolean;
  enabled: boolean;
  reasoning?: { effort: "low"; extraTokens: number };
  timeoutMs?: number;
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
// MiniMax M3.1 Flash requires reasoning (lowest effort "low"); reasoning tokens count against max_tokens.
export const MODELS: ModelConfig[] = [
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
    reasoning: { effort: "low", extraTokens: 4000 },
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

export const CHAINS: Record<PlanId, string[]> = {
  free: [
    "minimax-flash-free",
    "muse-spark-contributor",
    "mistral-small",
    "gemma-4-free",
    "gemini-flash",
    "gemini-flash-lite",
    "nemotron-vl-free",
    "openrouter-free",
  ],
  pro: [
    "muse-spark",
    "mistral-small",
    "gemma-4-free",
    "gemini-flash",
    "gemini-flash-lite",
    "nemotron-vl-free",
    "openrouter-free",
  ],
};

export type TaskId = "mindmap" | "flashcards" | "transcribe" | "figure" | "summary" | "quiz" | "chat";

export const TASKS: Record<TaskId, { promptVersion: string; maxTokens: number; timeoutMs: number }> = {
  mindmap: { promptVersion: "v2", maxTokens: 4000, timeoutMs: 40_000 },
  flashcards: { promptVersion: "v2", maxTokens: 4000, timeoutMs: 40_000 },
  transcribe: { promptVersion: "v1", maxTokens: 3000, timeoutMs: 30_000 },
  figure: { promptVersion: "v1", maxTokens: 2000, timeoutMs: 30_000 },
  summary: { promptVersion: "v1", maxTokens: 3000, timeoutMs: 40_000 },
  quiz: { promptVersion: "v2", maxTokens: 4000, timeoutMs: 40_000 },
  chat: { promptVersion: "v1", maxTokens: 2000, timeoutMs: 30_000 },
};

export const CHUNK_INPUT_TOKENS = 12_000;
export const CONTEXT_USE = 0.8;

// Per-account request limits shared by every user of the app. OpenRouter :free models: 20 per minute and
// 1000 per day once at least 10 credits were bought (https://openrouter.ai/docs/api-reference/limits).
// The other values are estimates: check them in each provider's console.
export const PROVIDER_LIMITS: Record<ProviderId, { perMinute: number; perDay: number | null }> = {
  openrouter: { perMinute: 20, perDay: 1000 },
  mistral: { perMinute: 60, perDay: null },
  gemini: { perMinute: 10, perDay: 250 },
  meta: { perMinute: 60, perDay: null },
};
export const QUEUE_ROUNDS = 3;
export const RETRY_DELAYS_MS = [2_000, 5_000];
