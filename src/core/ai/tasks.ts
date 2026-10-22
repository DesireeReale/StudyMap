import { z } from "zod";
import { CHUNK_INPUT_TOKENS, TASKS, type TaskId } from "@/config/ai";
import { chunkPages } from "./chunk";
import { complete, inputBudget, type AiContext } from "./client";
import { loadPrompt } from "./prompts";
import { selectPages } from "../retrieval";
import {
  ChatAnswerSchema,
  FlashcardsSchema,
  MindMapSchema,
  QuizSchema,
  SummarySchema,
  TranscriptionSchema,
  type ChatAnswer,
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

export type OnPart = (done: number, total: number) => void;

export async function generateMindMap(
  ctx: AiContext,
  input: { title: string; pages: string[] },
  onPart?: OnPart,
): Promise<MindMap> {
  const system = await systemPrompt("mindmap", MindMapSchema, input.title);
  const parts: MindMap[] = [];
  const chunks = chunkPages(input.pages, inputBudget(ctx.chain, "mindmap"));
  for (const [i, chunk] of chunks.entries()) {
    onPart?.(i, chunks.length);
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

export function overviewMindMap(title: string, chapters: { title: string; map: MindMap }[]): MindMap {
  const nodes: MindMapNode[] = [{ id: "root", label: title, parentId: null, relation: null }];
  chapters.forEach((chapter, i) => {
    const id = `ch${i}`;
    nodes.push({ id, label: `${i + 1}. ${chapter.title}`.slice(0, 200), parentId: "root", relation: null });
    const map = normalizeMindMap(chapter.map, chapter.title);
    const root = map.nodes.find((n) => n.parentId === null)!;
    for (const n of map.nodes.filter((n) => n.parentId === root.id)) {
      nodes.push({ id: `${id}_${n.id}`, label: n.label, parentId: id, relation: n.relation });
    }
  });
  return { nodes };
}

export async function generateFlashcards(
  ctx: AiContext,
  input: { title: string; pages: string[] },
  onPart?: OnPart,
): Promise<Flashcards["cards"]> {
  const system = await systemPrompt("flashcards", FlashcardsSchema, input.title);
  const cards: Flashcards["cards"] = [];
  const chunks = chunkPages(input.pages, inputBudget(ctx.chain, "flashcards"));
  for (const [i, chunk] of chunks.entries()) {
    onPart?.(i, chunks.length);
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

export async function describeFigure(ctx: AiContext, dataUrl: string, context: string): Promise<string> {
  const system = await systemPrompt("figure", TranscriptionSchema);
  const { data } = await complete(ctx, {
    task: "figure",
    schema: TranscriptionSchema,
    vision: true,
    ocrPages: 1,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: `Testo che accompagna la figura:\n${context.slice(0, 2000) || "(nessuno)"}` },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });
  return data.markdown;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function askDocument(
  ctx: AiContext,
  input: { title: string; pages: string[]; unit: "Pagina" | "Slide"; history: ChatTurn[]; question: string },
): Promise<ChatAnswer> {
  const system = await systemPrompt("chat", ChatAnswerSchema, input.title);
  const sent = selectPages(input.pages, `${input.history.filter((t) => t.role === "user").slice(-1)[0]?.content ?? ""} ${input.question}`, CHUNK_INPUT_TOKENS);
  const material = sent.map((i) => `[${input.unit} ${i + 1}]\n${input.pages[i]!.trim()}`).join("\n\n");
  const { data } = await complete(ctx, {
    task: "chat",
    schema: ChatAnswerSchema,
    messages: [
      { role: "system", content: system },
      ...input.history.slice(-6),
      { role: "user", content: `Materiale:\n${material}\n\nDomanda: ${input.question}` },
    ],
  });
  const allowed = new Set(sent.map((i) => i + 1));
  return { answer: data.answer, pages: [...new Set(data.pages)].filter((p) => allowed.has(p)).sort((a, b) => a - b) };
}

export async function generateSummary(
  ctx: AiContext,
  input: { title: string; pages: string[] },
  onPart?: OnPart,
): Promise<Summary> {
  const system = await systemPrompt("summary", SummarySchema, input.title);
  const sections: Summary["sections"] = [];
  const chunks = chunkPages(input.pages, inputBudget(ctx.chain, "summary"));
  for (const [i, chunk] of chunks.entries()) {
    onPart?.(i, chunks.length);
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

export function summaryToText(summary: Summary, pageCount = 0): string {
  return summary.sections
    .map((s) => {
      const pages = [...new Set(s.pages)].filter((p) => p <= pageCount).sort((a, b) => a - b);
      const source = pages.length ? `\n${pagesLine(pages)}` : "";
      return `## ${s.heading}${source}\n${s.points.map((p) => `- ${p}`).join("\n")}`;
    })
    .join("\n\n");
}

export const pagesLine = (pages: number[]) => `[${pages.length === 1 ? "pagina" : "pagine"} ${pages.join(", ")}]`;

export async function generateQuiz(
  ctx: AiContext,
  input: { title: string; pages: string[] },
  onPart?: OnPart,
): Promise<QuizQuestion[]> {
  const system = await systemPrompt("quiz", QuizSchema, input.title);
  const questions: QuizQuestion[] = [];
  const chunks = chunkPages(input.pages, inputBudget(ctx.chain, "quiz"));
  for (const [i, chunk] of chunks.entries()) {
    onPart?.(i, chunks.length);
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
  const slots = questions.filter((q) => q.type === "scelta").map((_, i) => i % 4);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j]!, slots[i]!];
  }
  let next = 0;
  return questions.map((q) => {
    if (q.type !== "scelta") return q;
    const right = q.options[q.correct]!;
    const wrong = q.options.filter((_, k) => k !== q.correct);
    for (let k = wrong.length - 1; k > 0; k--) {
      const j = Math.floor(random() * (k + 1));
      [wrong[k], wrong[j]] = [wrong[j]!, wrong[k]!];
    }
    const target = slots[next++]!;
    return { ...q, options: [...wrong.slice(0, target), right, ...wrong.slice(target)], correct: target };
  });
}
