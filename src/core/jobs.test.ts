import { describe, expect, it } from "vitest";
import { isStale, JOB_STALE_MS, openLabel, phaseText, progressRatio } from "./jobs";

describe("isStale", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("flags unfinished jobs that stopped updating", () => {
    expect(isStale({ status: "running", updated_at: ago(JOB_STALE_MS + 1) }, now)).toBe(true);
    expect(isStale({ status: "queued", updated_at: ago(JOB_STALE_MS + 1) }, now)).toBe(true);
    expect(isStale({ status: "running", updated_at: ago(60_000) }, now)).toBe(false);
  });

  it("never flags finished jobs", () => {
    expect(isStale({ status: "done", updated_at: ago(JOB_STALE_MS * 10) }, now)).toBe(false);
    expect(isStale({ status: "error", updated_at: ago(JOB_STALE_MS * 10) }, now)).toBe(false);
  });
});

describe("phaseText", () => {
  const base = { type: "mindmap" as const, status: "running" as const, done: 0, total: 0, error: null };

  it("describes each phase in plain words", () => {
    expect(phaseText({ ...base, type: "ingest", phase: "read" })).toBe("Leggo il testo del file…");
    expect(phaseText({ ...base, type: "ingest", phase: "transcribe", done: 11, total: 40 })).toBe("Sto leggendo pagina 12 di 40");
    expect(phaseText({ ...base, phase: "generate", done: 1, total: 5 })).toBe("Creo la mappa: parte 2 di 5");
    expect(phaseText({ ...base, phase: "generate", done: 0, total: 1 })).toBe("Creo la mappa…");
    expect(phaseText({ ...base, phase: "merge" })).toBe("Metto insieme le parti…");
    expect(phaseText({ ...base, phase: "wait" })).toMatch(/^In coda/);
  });

  it("reports the outcome", () => {
    expect(phaseText({ ...base, status: "done", phase: "done" })).toBe("Mappa pronta");
    expect(phaseText({ ...base, status: "error", phase: "error", error: "Quota finita" })).toBe("Quota finita");
    expect(openLabel("flashcards")).toBe("Apri le flashcard");
  });

  it("only shows a bar when the total is known", () => {
    expect(progressRatio({ status: "running", done: 3, total: 4 })).toBe(0.75);
    expect(progressRatio({ status: "running", done: 0, total: 0 })).toBeNull();
    expect(progressRatio({ status: "done", done: 0, total: 0 })).toBe(1);
  });
});
