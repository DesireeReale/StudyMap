import { describe, expect, it } from "vitest";
import type { QuizQuestion } from "./ai/schemas";
import { defaultSettings, pickQuestions, topicsOf, typesOf } from "./quiz";

const q = (type: QuizQuestion["type"], topic?: string): QuizQuestion => ({
  type,
  question: "x",
  options: [],
  correct: 0,
  answer: "",
  explanation: "y",
  ...(topic ? { topic } : {}),
});
const all = [q("scelta", "Cause"), q("vero_falso", "Cause"), q("scelta", "Terapia"), q("completamento"), q("scelta", " Terapia ")];

describe("quiz settings", () => {
  it("offers only the types and topics the quiz has", () => {
    expect(typesOf(all)).toEqual(["scelta", "vero_falso", "completamento"]);
    expect(topicsOf(all)).toEqual(["Cause", "Terapia"]);
    expect(topicsOf([q("scelta")])).toEqual([]);
  });

  it("filters by type and topic and keeps the original order", () => {
    expect(pickQuestions(all, defaultSettings(all))).toEqual([0, 1, 2, 3, 4]);
    expect(pickQuestions(all, { count: 10, types: ["scelta"], topic: null })).toEqual([0, 2, 4]);
    expect(pickQuestions(all, { count: 10, types: ["scelta", "vero_falso"], topic: "Terapia" })).toEqual([2, 4]);
    expect(pickQuestions(all, { count: 2, types: ["scelta", "vero_falso", "completamento"], topic: null })).toEqual([0, 1]);
  });
});
