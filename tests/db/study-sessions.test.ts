import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/lib/supabase/types";
import { createTestUser, deleteTestUser, signedInClient } from "../supabase";

let a: { id: string; client: SupabaseClient<Database> };
let b: { id: string; client: SupabaseClient<Database> };

beforeAll(async () => {
  const [ua, ub] = await Promise.all([createTestUser("study-a"), createTestUser("study-b")]);
  a = { id: ua.id, client: await signedInClient(ua.email, ua.password) };
  b = { id: ub.id, client: await signedInClient(ub.email, ub.password) };
});

afterAll(async () => {
  await Promise.all([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
});

describe("study sessions", () => {
  it("records minutes that only the owner sees and cannot change", async () => {
    expect((await a.client.from("study_sessions").insert({ minutes: 25 })).error).toBeNull();
    expect((await a.client.from("study_sessions").insert({ minutes: 0 })).error).not.toBeNull();
    expect((await b.client.from("study_sessions").select("minutes")).data).toEqual([]);
    await a.client.from("study_sessions").update({ minutes: 240 }).gte("minutes", 1);
    expect((await a.client.from("study_sessions").select("minutes")).data).toEqual([{ minutes: 25 }]);
  });
});
