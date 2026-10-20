import { z } from "zod";

export const FEEDBACK_PER_DAY = 5;

export const FEEDBACK_KINDS = [
  { id: "idea", label: "Idea" },
  { id: "problema", label: "Problema" },
  { id: "altro", label: "Altro" },
] as const;

export const FeedbackBody = z.object({
  kind: z.enum(["idea", "problema", "altro"]),
  message: z.string().trim().min(10).max(2000),
  page: z.string().trim().max(200).nullish().transform((p) => p || null),
});

export type Feedback = z.infer<typeof FeedbackBody>;

export function dayPeriod(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
