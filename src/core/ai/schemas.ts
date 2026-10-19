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
