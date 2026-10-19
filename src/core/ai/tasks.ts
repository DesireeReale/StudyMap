import { z } from "zod";
import { CHUNK_INPUT_TOKENS, TASKS } from "@/config/ai";
import { chunkPages } from "./chunk";
import { complete, type AiContext } from "./client";
import { loadPrompt } from "./prompts";
import {
  FlashcardsSchema,
  MindMapSchema,
  TranscriptionSchema,
  type Flashcards,
  type MindMap,
} from "./schemas";

type MindMapNode = MindMap["nodes"][number];

async function systemPrompt(task: "mindmap" | "flashcards" | "transcribe", schema: z.ZodType, title = "") {
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

export function dedupeCards<T extends { front: string }>(cards: T[]): T[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    const key = c.front.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
