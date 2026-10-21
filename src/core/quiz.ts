import { QUESTION_TYPES, type QuizQuestion } from "./ai/schemas";

export type QuestionType = (typeof QUESTION_TYPES)[number];
export type QuizSettings = { count: number; types: QuestionType[]; topic: string | null };

export const TYPE_LABELS: Record<QuestionType, string> = {
  scelta: "Scelta multipla",
  vero_falso: "Vero o falso",
  completamento: "Completamento",
};

export function typesOf(questions: QuizQuestion[]): QuestionType[] {
  return QUESTION_TYPES.filter((t) => questions.some((q) => q.type === t));
}

export function topicsOf(questions: QuizQuestion[]): string[] {
  return [...new Set(questions.map((q) => q.topic?.trim()).filter((t): t is string => !!t))];
}

export function defaultSettings(questions: QuizQuestion[]): QuizSettings {
  return { count: questions.length, types: typesOf(questions), topic: null };
}

export function pickQuestions(questions: QuizQuestion[], settings: QuizSettings): number[] {
  return questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => settings.types.includes(q.type))
    .filter(({ q }) => !settings.topic || q.topic?.trim() === settings.topic)
    .slice(0, Math.max(1, settings.count))
    .map(({ i }) => i);
}
