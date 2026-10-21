export type PlanId = "free" | "pro";

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
};

const MB = 1024 * 1024;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    generationsPerMonth: 20,
    inputTokensPerMonth: 1_000_000,
    maxPdfPages: 20,
    maxFigures: 20,
    maxDocuments: 10,
    maxSubjects: 3,
    maxUploadBytes: 10 * MB,
    export: { png: true, pdf: false, watermark: true },
    quizzesPerWeek: 1,
    chatQuestionsPerMonth: 20,
    audio: false,
  },
  pro: {
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
  },
};

export const RATE_LIMITS = {
  aiRequestsPerMinute: 5,
};
