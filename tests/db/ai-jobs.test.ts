import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/lib/supabase/types";
import { admin, createTestUser, deleteTestUser, signedInClient } from "../supabase";

let a: { id: string; client: SupabaseClient<Database> };
let b: { id: string; client: SupabaseClient<Database> };

beforeAll(async () => {
  const [ua, ub] = await Promise.all([createTestUser("job-a"), createTestUser("job-b")]);
  a = { id: ua.id, client: await signedInClient(ua.email, ua.password) };
  b = { id: ub.id, client: await signedInClient(ub.email, ub.password) };
});

afterAll(async () => {
  await Promise.all([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
});

describe("ai jobs", () => {
  it("are readable only by their owner and written only by the server", async () => {
    const { data: note } = await a.client.from("notes").insert({ title: "Ottica", body: "La luce si propaga in linea retta." }).select("id").single();
    const { data: job, error } = await admin
      .from("ai_jobs")
      .insert({ user_id: a.id, type: "mindmap", note_id: note!.id, quota_period: "2026-10" })
      .select("id")
      .single();
    expect(error).toBeNull();

    expect((await a.client.from("ai_jobs").select("status").eq("id", job!.id).single()).data?.status).toBe("queued");
    expect((await b.client.from("ai_jobs").select("id")).data).toEqual([]);

    expect((await a.client.from("ai_jobs").insert({ user_id: a.id, type: "quiz", note_id: note!.id, quota_period: "2026-10" })).error).not.toBeNull();
    await a.client.from("ai_jobs").update({ status: "done", href: "/maps/x" }).eq("id", job!.id);
    expect((await a.client.from("ai_jobs").select("status").eq("id", job!.id).single()).data?.status).toBe("queued");
  });
});
