import { z } from "zod";
import { CHUNK_INPUT_TOKENS, TASKS, type TaskId } from "@/config/ai";
import { chunkPages } from "./chunk";
import { complete, type AiContext } from "./client";
import { loadPrompt } from "./prompts";
import {
  FlashcardsSchema,
  MindMapSchema,
  QuizSchema,
  SummarySchema,
  TranscriptionSchema,
  type Flashcards,
  type MindMap,
  type QuizQuestion,
  type Summary,
} from "./schemas";

type MindMapNode = MindMap["nodes"][number];

async function systemPrompt(task: TaskId, schema: z.ZodType, title = "") {
  return loadPrompt(task, TASKS[task].promptVersion, {
    title,
    schema: JSON.stringify(z.toJSONSchema(schema)),
  });
}

export async function generateMindMap(
  ctx: AiContext,
  input: { title: string; pages: string[] },
): Promise<MindMap> {
  const system = await systemPrompt("mindmap", MindMapSchema, input.title);
  const parts: MindMap[] = [];
  for (const chunk of chunkPages(input.pages, CHUNK_INPUT_TOKENS)) {
    const { data } = await complete(ctx, {
      task: "mindmap",
      schema: MindMapSchema,
      messages: [
        { role: "system", content: system },
        { role: "user", content: chunk },
      ],
    });
    parts.push(data);
  }
  return mergeMindMaps(input.title, parts);
}

export function normalizeMindMap(map: MindMap, title: string): MindMap {
  const nodes: MindMapNode[] = [];
  const seen = new Set<string>();
  for (const n of map.nodes) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    nodes.push({ ...n });
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (const n of nodes) {
    if (n.parentId !== null && !byId.has(n.parentId)) n.parentId = null;
  }
  for (const n of nodes) {
    const visited = new Set<string>([n.id]);
    let cur = n.parentId ? byId.get(n.parentId) : undefined;
    while (cur) {
      if (visited.has(cur.id)) {
        n.parentId = null;
        break;
      }
      visited.add(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
  }

  const roots = nodes.filter((n) => n.parentId === null);
  if (roots.length === 1) return { nodes };
  const rootId = seen.has("root") ? `root_${nodes.length}` : "root";
  for (const r of roots) r.parentId = rootId;
  return { nodes: [{ id: rootId, label: title, parentId: null, relation: null }, ...nodes] };
}

export function mergeMindMaps(title: string, parts: MindMap[]): MindMap {
  if (parts.length === 1) return normalizeMindMap(parts[0]!, title);
  const nodes: MindMapNode[] = [{ id: "root", label: title, parentId: null, relation: null }];
  parts.forEach((part, i) => {
    for (const n of normalizeMindMap(part, title).nodes) {
      nodes.push({
        ...n,
        id: `c${i}_${n.id}`,
        parentId: n.parentId === null ? "root" : `c${i}_${n.parentId}`,
      });
    }
  });
  return { nodes };
}

export async function generateFlashcards(
  ctx: AiContext,
  input: { title: string; pages: string[] },
): Promise<Flashcards["cards"]> {
  const system = await systemPrompt("flashcards", FlashcardsSchema, input.title);
  const cards: Flashcards["cards"] = [];
  for (const chunk of chunkPages(input.pages, CHUNK_INPUT_TOKENS)) {
    const { data } = await complete(ctx, {
      task: "flashcards",
      schema: FlashcardsSchema,
      messages: [
        { role: "system", content: system },
        { role: "user", content: chunk },
      ],
    });
    cards.push(...data.cards);
  }
  return dedupeCards(cards).slice(0, 60);
}

export function dedupeBy<T>(items: T[], text: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = text(item).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const dedupeCards = <T extends { front: string }>(cards: T[]) => dedupeBy(cards, (c) => c.front);

export async function transcribeImage(ctx: AiContext, dataUrl: string): Promise<string> {
  const system = await systemPrompt("transcribe", TranscriptionSchema);
  const { data } = await complete(ctx, {
    task: "transcribe",
    schema: TranscriptionSchema,
    vision: true,
    ocrPages: 1,
    messages: [
      { role: "system", content: system },
      { role: "user", content: [{ type: "image_url", image_url: { url: dataUrl } }] },
    ],
  });
  return data.markdown;
}

export async function generateSummary(ctx: AiContext, input: { title: string; pages: string[] }): Promise<Summary> {
  const system = await systemPrompt("summary", SummarySchema, input.title);
  const sections: Summary["sections"] = [];
  for (const chunk of chunkPages(input.pages, CHUNK_INPUT_TOKENS)) {
    const { data } = await complete(ctx, {
      task: "summary",
      schema: SummarySchema,
      messages: [
        { role: "system", content: system },
        { role: "user", content: chunk },
      ],
    });
    sections.push(...data.sections);
  }
  return { sections };
}

export function summaryToText(summary: Summary): string {
  return summary.sections.map((s) => `## ${s.heading}\n${s.points.map((p) => `- ${p}`).join("\n")}`).join("\n\n");
}

export async function generateQuiz(ctx: AiContext, input: { title: string; pages: string[] }): Promise<QuizQuestion[]> {
  const system = await systemPrompt("quiz", QuizSchema, input.title);
  const questions: QuizQuestion[] = [];
  for (const chunk of chunkPages(input.pages, CHUNK_INPUT_TOKENS)) {
    const { data } = await complete(ctx, {
      task: "quiz",
      schema: QuizSchema,
      messages: [
        { role: "system", content: system },
        { role: "user", content: chunk },
      ],
    });
    questions.push(...data.questions);
  }
  return balanceAnswers(dedupeBy(questions, (q) => q.question).slice(0, 20));
}

export function balanceAnswers(questions: QuizQuestion[], random = Math.random): QuizQuestion[] {
  const slots = questions.map((_, i) => i % 4);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j]!, slots[i]!];
  }
  return questions.map((q, i) => {
    const right = q.options[q.correct]!;
    const wrong = q.options.filter((_, k) => k !== q.correct);
    for (let k = wrong.length - 1; k > 0; k--) {
      const j = Math.floor(random() * (k + 1));
      [wrong[k], wrong[j]] = [wrong[j]!, wrong[k]!];
    }
    const target = slots[i]!;
    return { ...q, options: [...wrong.slice(0, target), right, ...wrong.slice(target)], correct: target };
  });
}
