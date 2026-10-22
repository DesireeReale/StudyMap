export type PlanId = "free" | "pro" | "promax";

export type Feature = "podcast";

export type Plan = {
  generationsPerMonth: number;
  inputTokensPerMonth: number;
  maxPdfPages: number;
  maxFigures: number;
  maxDocuments: number;
  maxSubjects: number;
  maxUploadBytes: number;
  export: { png: boolean; pdf: boolean; watermark: boolean };
  quizzesPerWeek: number;
  chatQuestionsPerMonth: number;
  audio: boolean;
  features: Feature[];
};

const MB = 1024 * 1024;

const pro: Plan = {
  generationsPerMonth: 150,
  inputTokensPerMonth: 5_000_000,
  maxPdfPages: 200,
  maxFigures: 200,
  maxDocuments: Infinity,
  maxSubjects: Infinity,
  maxUploadBytes: 25 * MB,
  export: { png: true, pdf: true, watermark: false },
  quizzesPerWeek: Infinity,
  chatQuestionsPerMonth: 300,
  audio: true,
  features: [],
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    generationsPerMonth: 10,
    inputTokensPerMonth: 1_000_000,
    maxPdfPages: 20,
    maxFigures: 20,
    maxDocuments: 5,
    maxSubjects: 3,
    maxUploadBytes: 5 * MB,
    export: { png: true, pdf: false, watermark: true },
    quizzesPerWeek: 1,
    chatQuestionsPerMonth: 20,
    audio: false,
    features: [],
  },
  pro,
  promax: { ...pro, features: [] },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "promax"];

export const PLAN_LABELS: Record<PlanId, string> = { free: "Free", pro: "Pro", promax: "Pro Max" };

export const RATE_LIMITS = {
  aiRequestsPerMinute: 5,
};
