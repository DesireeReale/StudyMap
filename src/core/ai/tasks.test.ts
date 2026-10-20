import { describe, expect, it } from "vitest";
import { MODELS } from "@/config/ai";
import { chunkPages } from "./chunk";
import type { AiContext } from "./client";
import { mockChat } from "./mock";
import type { MindMap } from "./schemas";
import {
  balanceAnswers,
  dedupeCards,
  generateFlashcards,
  generateMindMap,
  generateQuiz,
  generateSummary,
  mergeMindMaps,
  normalizeMindMap,
  summaryToText,
} from "./tasks";

const ctx: AiContext = { chain: [MODELS[0]!], visionChain: [MODELS[0]!], chat: mockChat, record: async () => {} };

describe("chunkPages", () => {
  it("groups pages under the budget and keeps page markers", () => {
    const chunks = chunkPages(["a".repeat(30), "b".repeat(30), "c".repeat(30)], 20);
    expect(chunks).toHaveLength(3);
    expect(chunks[1]).toContain("[Pagina 2]");
  });

  it("splits a single oversized page", () => {
    const chunks = chunkPages(["x".repeat(1000)], 50);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
    expect(chunks.join("")).toContain("x".repeat(100));
  });

  it("skips empty pages", () => {
    expect(chunkPages(["", "  ", "testo"], 100)).toEqual(["[Pagina 3]\ntesto\n\n"]);
  });
});

describe("normalizeMindMap", () => {
  it("adds a root when there are several, fixes dangling parents and cycles", () => {
    const map: MindMap = {
      nodes: [
        { id: "a", label: "A", parentId: null, relation: null },
        { id: "b", label: "B", parentId: "missing", relation: null },
        { id: "c", label: "C", parentId: "d", relation: null },
        { id: "d", label: "D", parentId: "c", relation: null },
        { id: "a", label: "dup", parentId: null, relation: null },
      ],
    };
    const out = normalizeMindMap(map, "Titolo");
    const roots = out.nodes.filter((n) => n.parentId === null);
    expect(roots).toEqual([{ id: "root", label: "Titolo", parentId: null, relation: null }]);
    expect(out.nodes).toHaveLength(5);
  });
});

describe("mergeMindMaps", () => {
  it("attaches each chunk under a shared root with namespaced ids", () => {
    const part: MindMap = {
      nodes: [
        { id: "n1", label: "R", parentId: null, relation: null },
        { id: "n2", label: "F", parentId: "n1", relation: "x" },
      ],
    };
    const out = mergeMindMaps("Doc", [part, part]);
    expect(out.nodes).toHaveLength(5);
    expect(new Set(out.nodes.map((n) => n.id)).size).toBe(5);
    expect(out.nodes.find((n) => n.id === "c1_n2")?.parentId).toBe("c1_n1");
    expect(out.nodes.find((n) => n.id === "c0_n1")?.parentId).toBe("root");
  });
});

describe("tasks with the mock provider", () => {
  it("generates a mind map with a single root", async () => {
    const map = await generateMindMap(ctx, { title: "Cardio", pages: ["Lo scompenso cardiaco..."] });
    expect(map.nodes.filter((n) => n.parentId === null)).toHaveLength(1);
  });

  it("generates deduplicated flashcards across chunks", async () => {
    const pages = ["a".repeat(60_000), "b".repeat(60_000)];
    const cards = await generateFlashcards(ctx, { title: "Cardio", pages });
    expect(cards).toHaveLength(3);
  });

  it("dedupes on normalized front", () => {
    expect(dedupeCards([{ front: "Cos'è?" }, { front: "cos è" }, { front: "Altro" }])).toHaveLength(2);
  });
});

describe("summary and quiz", () => {
  it("renders the summary as headed bullet lists", async () => {
    const summary = await generateSummary(ctx, { title: "Scompenso", pages: ["Testo di prova."] });
    expect(summaryToText(summary)).toBe(
      "## Che cos'è\n- Lo scompenso cardiaco è l'incapacità del cuore di garantire una gittata adeguata.\n\n## Segni e sintomi\n- Dispnea da sforzo e ortopnea.\n- Edemi declivi e turgore giugulare.",
    );
  });

  it("keeps each right answer while spreading answers across positions", () => {
    const q = (n: number) => ({ question: `D${n}`, options: [`giusta${n}`, "b", "c", "d"], correct: 0, explanation: "x" });
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const out = balanceAnswers([q(1), q(2), q(3), q(4), q(5), q(6), q(7), q(8)], random);
    for (const [i, item] of out.entries()) expect(item.options[item.correct]).toBe(`giusta${i + 1}`);
    const counts = [0, 1, 2, 3].map((p) => out.filter((x) => x.correct === p).length);
    expect(counts).toEqual([2, 2, 2, 2]);
  });

  it("generates a quiz from the mock with four options per question", async () => {
    const quiz = await generateQuiz(ctx, { title: "Scompenso", pages: ["Testo di prova."] });
    expect(quiz).toHaveLength(3);
    expect(quiz.every((x) => x.options.length === 4 && x.correct >= 0 && x.correct < 4)).toBe(true);
  });
});
