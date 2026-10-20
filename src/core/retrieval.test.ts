import { describe, expect, it } from "vitest";
import { MODELS } from "@/config/ai";
import type { AiContext } from "./ai/client";
import { mockChat } from "./ai/mock";
import { askDocument } from "./ai/tasks";
import { reflow, selectPages, words } from "./retrieval";

const filler = (n: number) => Array.from({ length: n }, (_, i) => `testo generico numero ${i}`).join(" ");

describe("selectPages", () => {
  it("sends the whole document when it fits", () => {
    expect(selectPages(["a", "b", "c"], "qualsiasi", 1000)).toEqual([0, 1, 2]);
  });

  it("picks the pages that share words with the question, plus their neighbours", () => {
    const pages = Array.from({ length: 30 }, () => filler(60));
    pages[12] = `${filler(40)} La responsabilità contrattuale nasce dall'inadempimento.`;
    pages[25] = `${filler(40)} Il contratto si risolve per inadempimento grave.`;
    expect(selectPages(pages, "Quando c'è responsabilità per inadempimento?", 2500, 2)).toEqual([11, 12, 13, 24, 25, 26]);
  });

  it("ignores accents, case and short words, and folds plurals", () => {
    expect(words("Le Velocità è nulla")).toEqual(["velocit", "nulla"]);
    expect(words("accelerazioni")).toEqual(words("accelerazione"));
  });
});

describe("reflow", () => {
  it("joins lines the PDF broke mid-sentence and keeps lists and headings apart", () => {
    expect(reflow("A P I · C I S C R A e a te")).toBe("API · CISCRA e a te");
    expect(reflow("1.1 Classi e processi\nL'endpoint è identico")).toBe("1.1 Classi e processi\nL'endpoint è identico");
    const raw = "A P I R E F E R E N C E\n1. Convenzioni\n• Base URL: tutte le rotte (es.\n{BASE_URL}/sessions).\n• Il nome della classe\n(case-sensitive).\nUna frase\nspezzata in due.";
    expect(reflow(raw)).toBe(
      "APIREFERENCE\n1. Convenzioni\n• Base URL: tutte le rotte (es.\n{BASE_URL}/sessions).\n• Il nome della classe (case-sensitive).\nUna frase spezzata in due.",
    );
  });
});

describe("askDocument", () => {
  const ctx: AiContext = { chain: [MODELS[0]!], visionChain: [], chat: mockChat, record: async () => {} };

  it("keeps only citations of pages that were actually sent", async () => {
    const out = await askDocument(ctx, { title: "Scompenso", pages: ["Dispnea ed edemi."], unit: "Pagina", history: [], question: "Sintomi?" });
    expect(out.pages).toEqual([1]);
    expect(out.answer).toContain("dispnea");
  });
});
