import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/lib/supabase/types";
import { admin, createTestUser, deleteTestUser, signedInClient } from "../supabase";

type Client = SupabaseClient<Database>;
let owner: { id: string; client: Client };
let a: { id: string; email: string; client: Client };
let b: { id: string; client: Client };

beforeAll(async () => {
  const [uo, ua, ub] = await Promise.all([createTestUser("sub-owner"), createTestUser("sub-a"), createTestUser("sub-b")]);
  owner = { id: uo.id, client: await signedInClient(uo.email, uo.password) };
  a = { id: ua.id, email: ua.email, client: await signedInClient(ua.email, ua.password) };
  b = { id: ub.id, client: await signedInClient(ub.email, ub.password) };
  await admin.from("admins").insert({ user_id: owner.id });
  await admin.from("subscriptions").insert([
    { user_id: a.id, plan: "pro", note: "a" },
    { user_id: b.id, plan: "pro", note: "b" },
  ]);
});

afterAll(async () => {
  await Promise.all([owner && deleteTestUser(owner.id), a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
});

describe("subscriptions", () => {
  it("a student reads only their own rows", async () => {
    const { data } = await a.client.from("subscriptions").select("note");
    expect(data).toEqual([{ note: "a" }]);
  });

  it("a student cannot write subscriptions or use the admin functions", async () => {
    const insert = await a.client.from("subscriptions").insert({ user_id: a.id, plan: "promax" });
    expect(insert.error).not.toBeNull();
    const grant = await a.client.rpc("admin_grant_plan", { p_user: a.id, p_plan: "promax", p_ends_at: null, p_note: "" });
    expect(grant.error?.code).toBe("42501");
    const list = await a.client.rpc("admin_users_page", { p_today: "2026-10-22", p_month: "2026-10" });
    expect(list.error?.code).toBe("42501");
    expect(list.data).toBeNull();
    expect((await a.client.rpc("is_admin")).data).toBe(false);
    const admins = await a.client.from("admins").select("user_id");
    expect(admins.data ?? []).toEqual([]);
  });

  it("the owner grants and revokes, and both are recorded", async () => {
    expect((await owner.client.rpc("is_admin")).data).toBe(true);
    const { data: id, error } = await owner.client.rpc("admin_grant_plan", {
      p_user: b.id,
      p_plan: "pro",
      p_ends_at: "2026-12-31",
      p_note: "pagato 25/10",
    });
    expect(error).toBeNull();
    await owner.client.rpc("admin_revoke_subscription", { p_id: id! });
    const { data } = await admin.from("subscriptions").select("created_by, revoked_by, revoked_at").eq("id", id!).single();
    expect(data).toMatchObject({ created_by: owner.id, revoked_by: owner.id });
    expect(data?.revoked_at).not.toBeNull();
  });

  it("the owner lists users with their active plan, filtered and paginated", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await owner.client.rpc("admin_users_page", {
      p_today: today,
      p_month: today.slice(0, 7),
      p_email: a.email.toUpperCase(),
    });
    expect(error).toBeNull();
    expect(data?.count).toBe(1);
    expect(data?.rows[0]).toMatchObject({ id: a.id, plan: "pro", last_note: "a", generations: 0, documents: 0 });
    expect(data!.total_users).toBeGreaterThanOrEqual(3);

    const free = await owner.client.rpc("admin_users_page", { p_today: today, p_month: today.slice(0, 7), p_filter: "free", p_limit: 200 });
    expect(free.data?.rows.some((r) => r.id === a.id)).toBe(false);
    expect(free.data?.rows.some((r) => r.id === owner.id)).toBe(true);

    const sorted = await owner.client.rpc("admin_users_page", {
      p_today: today,
      p_month: today.slice(0, 7),
      p_sort: "email; drop table public.admins",
      p_limit: 1,
    });
    expect(sorted.error).toBeNull();
    expect(sorted.data?.rows).toHaveLength(1);
  });
});
