import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BETA_TERMS_VERSION } from "../../src/config/beta";
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

  it("the plan is not writable by the client, the consent and the exam date are", async () => {
    const plan = await a.client.from("profiles").update({ plan: "pro" }).eq("id", a.id);
    expect(plan.error?.code).toBe("42501");
    const consent = await a.client
      .from("profiles")
      .update({ ai_data_sharing_consent_at: new Date().toISOString() })
      .eq("id", a.id);
    expect(consent.error).toBeNull();
    const exam = await a.client.from("profiles").update({ exam_date: "2026-12-15" }).eq("id", a.id);
    expect(exam.error).toBeNull();
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

describe("take_provider_slot", () => {
  const take = (minute: string, day: string, dayLimit: number | null) =>
    admin.rpc("take_provider_slot", {
      p_provider: "test-provider",
      p_minute: minute,
      p_minute_limit: 3,
      p_day: day,
      p_day_limit: dayLimit,
    });
  const day = `d:test-${crypto.randomUUID()}`;

  it("lets through only the per-minute limit under concurrent calls", async () => {
    const minute = `m:test-${crypto.randomUUID()}`;
    const results = await Promise.all(Array.from({ length: 8 }, () => take(minute, day, 5)));
    expect(results.map((r) => r.data).filter((d) => d === "ok")).toHaveLength(3);
    expect(results.map((r) => r.data).filter((d) => d === "minute")).toHaveLength(5);
  });

  it("does not spend the daily budget on calls refused by the minute limit", async () => {
    const minute = `m:test-${crypto.randomUUID()}`;
    expect((await take(minute, day, 5)).data).toBe("ok");
    expect((await take(minute, day, 5)).data).toBe("ok");
    expect((await take(`m:test-${crypto.randomUUID()}`, day, 5)).data).toBe("day");
    await admin.from("provider_usage").delete().eq("provider", "test-provider");
  });
});

describe("beta terms", () => {
  it("are saved on the profile when sign-up sends their version", async () => {
    const [withTerms, without] = await Promise.all([createTestUser("terms-yes"), createTestUser("terms-no", { betaTerms: false })]);
    const { data } = await admin
      .from("profiles")
      .select("id, beta_terms_version, beta_terms_accepted_at")
      .in("id", [withTerms.id, without.id]);
    const byId = new Map(data!.map((p) => [p.id, p]));
    expect(byId.get(withTerms.id)).toMatchObject({ beta_terms_version: BETA_TERMS_VERSION });
    expect(byId.get(withTerms.id)?.beta_terms_accepted_at).not.toBeNull();
    expect(byId.get(without.id)).toMatchObject({ beta_terms_version: null, beta_terms_accepted_at: null });
    await Promise.all([deleteTestUser(withTerms.id), deleteTestUser(without.id)]);
  });
});
