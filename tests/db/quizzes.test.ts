import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/lib/supabase/types";
import { createTestUser, deleteTestUser, signedInClient } from "../supabase";

let a: { id: string; client: SupabaseClient<Database> };
let b: { id: string; client: SupabaseClient<Database> };
const questions = [{ type: "scelta" as const, question: "Q", options: ["a", "b", "c", "d"], correct: 0, answer: "", explanation: "e" }];

beforeAll(async () => {
  const [ua, ub] = await Promise.all([createTestUser("quiz-a"), createTestUser("quiz-b")]);
  a = { id: ua.id, client: await signedInClient(ua.email, ua.password) };
  b = { id: ub.id, client: await signedInClient(ub.email, ub.password) };
});

afterAll(async () => {
  await Promise.all([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
});

describe("quizzes", () => {
  it("keeps quizzes and attempts private to their owner", async () => {
    const { data: quiz, error } = await a.client.from("quizzes").insert({ title: "Contratto", questions }).select("id").single();
    expect(error).toBeNull();
    expect((await a.client.from("quiz_attempts").insert({ quiz_id: quiz!.id, score: 1, total: 1 })).error).toBeNull();
    expect((await a.client.from("quiz_attempts").insert({ quiz_id: quiz!.id, score: 2, total: 1 })).error).not.toBeNull();
    expect((await b.client.from("quizzes").select("id")).data).toEqual([]);
    expect((await b.client.from("quiz_attempts").insert({ quiz_id: quiz!.id, score: 1, total: 1 })).error).not.toBeNull();
  });
});
