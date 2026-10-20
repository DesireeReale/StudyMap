import { z } from "zod";

export const MindMapSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1).max(200),
        parentId: z.string().nullable(),
        relation: z.string().max(60).nullable(),
      }),
    )
    .min(1)
    .max(120),
});
export type MindMap = z.infer<typeof MindMapSchema>;

export const FlashcardsSchema = z.object({
  cards: z
    .array(z.object({ front: z.string().min(1).max(500), back: z.string().min(1).max(1500) }))
    .min(1)
    .max(60),
});
export type Flashcards = z.infer<typeof FlashcardsSchema>;

export const TranscriptionSchema = z.object({ markdown: z.string() });

export const SummarySchema = z.object({
  sections: z
    .array(z.object({ heading: z.string().min(1).max(120), points: z.array(z.string().min(1).max(400)).min(1).max(8) }))
    .min(1)
    .max(12),
});
export type Summary = z.infer<typeof SummarySchema>;

export const QuizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1).max(500),
        options: z.array(z.string().min(1).max(300)).length(4),
        correct: z.number().int().min(0).max(3),
        explanation: z.string().min(1).max(800),
      }),
    )
    .min(1)
    .max(20),
});
export type Quiz = z.infer<typeof QuizSchema>;
export type QuizQuestion = Quiz["questions"][number];
