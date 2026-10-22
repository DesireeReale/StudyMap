import { describe, expect, it } from "vitest";
import { MODELS } from "@/config/ai";
import { chunkPages } from "./chunk";
import type { AiContext } from "./client";
import { sameAnswer } from "../answers";
import { mockChat } from "./mock";
import { QuizSchema, type MindMap } from "./schemas";
import {
  balanceAnswers,
  dedupeCards,
  generateFlashcards,
  generateMindMap,
  generateQuiz,
  generateSummary,
  mergeMindMaps,
  overviewMindMap,
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

describe("overviewMindMap", () => {
  it("links every chapter to the top concepts of its map", () => {
    const chapter: MindMap = {
      nodes: [
        { id: "r", label: "Cuore", parentId: null, relation: null },
        { id: "a", label: "Atri", parentId: "r", relation: "comprende" },
        { id: "b", label: "Valvole", parentId: "a", relation: null },
      ],
    };
    const map = overviewMindMap("Fisiologia", [{ title: "Il cuore", map: chapter }]);
    expect(map.nodes.map((n) => [n.label, n.parentId])).toEqual([
      ["Fisiologia", null],
      ["1. Il cuore", "root"],
      ["Atri", "ch0"],
    ]);
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

  it("writes the source pages of each section, dropping pages the document does not have", async () => {
    const summary = await generateSummary(ctx, { title: "Scompenso", pages: ["Testo di prova."] });
    expect(summaryToText(summary, 1)).toContain("## Che cos'è\n[pagina 1]\n- Lo scompenso");
    expect(summaryToText(summary, 1)).toContain("## Segni e sintomi\n[pagina 1]\n- Dispnea");
    expect(summaryToText(summary, 2)).toContain("## Segni e sintomi\n[pagine 1, 2]\n");
  });

  it("keeps each right answer while spreading answers across positions", () => {
    const q = (n: number) => ({ type: "scelta" as const, question: `D${n}`, options: [`giusta${n}`, "b", "c", "d"], correct: 0, answer: "", explanation: "x" });
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const tf = { type: "vero_falso" as const, question: "V?", options: ["Vero", "Falso"], correct: 1, answer: "", explanation: "x" };
    const out = balanceAnswers([q(1), q(2), tf, q(3), q(4), q(5), q(6), q(7), q(8)], random);
    expect(out.splice(2, 1)).toEqual([tf]);
    for (const [i, item] of out.entries()) expect(item.options[item.correct]).toBe(`giusta${i + 1}`);
    const counts = [0, 1, 2, 3].map((p) => out.filter((x) => x.correct === p).length);
    expect(counts).toEqual([2, 2, 2, 2]);
  });

  it("generates a quiz from the mock with every question type", async () => {
    const quiz = await generateQuiz(ctx, { title: "Scompenso", pages: ["Testo di prova."] });
    expect(quiz.map((x) => x.type)).toEqual(["scelta", "vero_falso", "completamento"]);
    expect(quiz[0]!.options[quiz[0]!.correct]).toBe("Edemi declivi");
  });

  it("rejects a question that breaks the rules of its type", () => {
    const base = { question: "La ___ è...", options: [], correct: 0, answer: "", explanation: "x" };
    expect(QuizSchema.safeParse({ questions: [{ ...base, type: "completamento" }] }).success).toBe(false);
    expect(QuizSchema.safeParse({ questions: [{ ...base, type: "completamento", answer: "norma" }] }).success).toBe(true);
    expect(QuizSchema.safeParse({ questions: [{ ...base, type: "scelta" }] }).success).toBe(false);
  });
});

describe("typed answers", () => {
  it("ignores case, accents and punctuation, and accepts alternatives", () => {
    expect(sameAnswer(" Semi fowler. ", "semi-Fowler")).toBe(true);
    expect(sameAnswer("perche", "perché")).toBe(true);
    expect(sameAnswer("dolo", "colpa / negligenza")).toBe(false);
    expect(sameAnswer("negligenza", "colpa / negligenza")).toBe(true);
    expect(sameAnswer("", "x")).toBe(false);
  });
});
