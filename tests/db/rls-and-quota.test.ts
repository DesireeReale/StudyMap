import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/lib/supabase/types";
import { admin, createTestUser, deleteTestUser, signedInClient } from "../supabase";

type Client = SupabaseClient<Database>;
let a: { id: string; client: Client };
let b: { id: string; client: Client };

beforeAll(async () => {
  const [ua, ub] = await Promise.all([createTestUser("rls-a"), createTestUser("rls-b")]);
  a = { id: ua.id, client: await signedInClient(ua.email, ua.password) };
  b = { id: ub.id, client: await signedInClient(ub.email, ub.password) };
  await a.client.from("documents").insert({ title: "Doc A", kind: "text", pages: ["a"] });
  await b.client.from("documents").insert({ title: "Doc B", kind: "text", pages: ["b"] });
});

afterAll(async () => {
  await Promise.all([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
});

describe("row level security", () => {
  it("creates a free profile on sign up", async () => {
    const { data } = await a.client.from("profiles").select("plan").single();
    expect(data?.plan).toBe("free");
  });

  it("each user sees only their own documents", async () => {
    const { data } = await a.client.from("documents").select("title");
    expect(data).toEqual([{ title: "Doc A" }]);
  });

  it("a user cannot modify another user's rows", async () => {
    const { data: docB } = await admin.from("documents").select("id").eq("user_id", b.id).single();
    await a.client.from("documents").update({ title: "hacked" }).eq("id", docB!.id);
    const { data } = await admin.from("documents").select("title").eq("id", docB!.id).single();
    expect(data?.title).toBe("Doc B");
  });

  it("the plan is not writable by the client, the consent is", async () => {
    const plan = await a.client.from("profiles").update({ plan: "pro" }).eq("id", a.id);
    expect(plan.error?.code).toBe("42501");
    const consent = await a.client
      .from("profiles")
      .update({ ai_data_sharing_consent_at: new Date().toISOString() })
      .eq("id", a.id);
    expect(consent.error).toBeNull();
  });

  it("clients cannot write usage or call consume_quota", async () => {
    const usage = await a.client
      .from("ai_usage")
      .insert({ user_id: a.id, task: "mindmap", provider: "x", model: "x", ok: true });
    expect(usage.error).not.toBeNull();
    const rpc = await a.client.rpc("consume_quota", { p_user: a.id, p_kind: "generation", p_period: "test" });
    expect(rpc.error).not.toBeNull();
  });

  it("storage is limited to the user's own folder", async () => {
    const file = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    const own = await a.client.storage.from("documents").upload(`${a.id}/own.pdf`, file);
    expect(own.error).toBeNull();
    const other = await a.client.storage.from("documents").upload(`${b.id}/intruder.pdf`, file);
    expect(other.error).not.toBeNull();
    const read = await b.client.storage.from("documents").download(`${a.id}/own.pdf`);
    expect(read.error).not.toBeNull();
  });
});

describe("consume_quota", () => {
  it("never exceeds the limit under concurrent calls", async () => {
    const calls = Array.from({ length: 10 }, () =>
      admin.rpc("consume_quota", { p_user: a.id, p_kind: "generation", p_period: "test", p_amount: 1, p_limit: 5 }),
    );
    const results = await Promise.all(calls);
    expect(results.filter((r) => r.data === true)).toHaveLength(5);
    const { data } = await admin
      .from("quota_counters")
      .select("count")
      .eq("user_id", a.id)
      .eq("period", "test")
      .single();
    expect(data?.count).toBe(5);
  });
});
