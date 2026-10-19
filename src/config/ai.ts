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
};

export const PROVIDERS = {
  mistral: { baseURL: "https://api.mistral.ai/v1", apiKeyEnv: "MISTRAL_API_KEY" },
  openrouter: { baseURL: "https://openrouter.ai/api/v1", apiKeyEnv: "OPENROUTER_API_KEY" },
  meta: { baseURL: "https://api.meta.ai/v1", apiKeyEnv: "META_API_KEY" },
} as const;

// Prices are what this app actually pays: 0 on free tiers (Mistral Experiment, OpenRouter :free).
export const MODELS: ModelConfig[] = [
  {
    key: "mistral-small",
    provider: "mistral",
    id: "mistral-small-2603",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
    contextTokens: 256_000,
    vision: true,
    structuredOutput: "json_schema",
    usesDataForTraining: false,
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
  free: ["muse-spark-contributor", "mistral-small", "openrouter-free"],
  pro: ["muse-spark", "mistral-small", "openrouter-free"],
};

export type TaskId = "mindmap" | "flashcards" | "transcribe";

export const TASKS: Record<TaskId, { promptVersion: string; maxTokens: number }> = {
  mindmap: { promptVersion: "v1", maxTokens: 4000 },
  flashcards: { promptVersion: "v1", maxTokens: 4000 },
  transcribe: { promptVersion: "v1", maxTokens: 3000 },
};

export const CHUNK_INPUT_TOKENS = 12_000;
export const REQUEST_TIMEOUT_MS = 90_000;
