import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/lib/supabase/types";
import { admin, createTestUser, deleteTestUser, signedInClient } from "../supabase";

let a: { id: string; client: SupabaseClient<Database> };
let b: { id: string; client: SupabaseClient<Database> };

beforeAll(async () => {
  const [ua, ub] = await Promise.all([createTestUser("fr-a"), createTestUser("fr-b")]);
  a = { id: ua.id, client: await signedInClient(ua.email, ua.password) };
  b = { id: ub.id, client: await signedInClient(ub.email, ub.password) };
});

afterAll(async () => {
  await Promise.all([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
});

describe("feature requests", () => {
  it("can be sent but never read back from the client", async () => {
    expect((await a.client.from("feature_requests").insert({ kind: "idea", message: "Mappe esportabili in PDF" })).error).toBeNull();

    expect((await a.client.from("feature_requests").select("id")).error).not.toBeNull();
    expect((await b.client.from("feature_requests").select("id")).error).not.toBeNull();
    expect((await a.client.from("feature_requests").delete().eq("user_id", a.id)).error).not.toBeNull();

    expect(
      (await b.client.from("feature_requests").insert({ user_id: a.id, kind: "idea", message: "Al posto di un altro" })).error,
    ).not.toBeNull();
    expect((await a.client.from("feature_requests").insert({ kind: "idea", message: "corto" })).error).not.toBeNull();

    const { data } = await admin.from("feature_requests").select("user_id, kind").in("user_id", [a.id, b.id]);
    expect(data).toEqual([{ user_id: a.id, kind: "idea" }]);
  });
});
