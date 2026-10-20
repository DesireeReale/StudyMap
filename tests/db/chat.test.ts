import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/lib/supabase/types";
import { createTestUser, deleteTestUser, signedInClient } from "../supabase";

let a: { id: string; client: SupabaseClient<Database> };
let b: { id: string; client: SupabaseClient<Database> };

beforeAll(async () => {
  const [ua, ub] = await Promise.all([createTestUser("chat-a"), createTestUser("chat-b")]);
  a = { id: ua.id, client: await signedInClient(ua.email, ua.password) };
  b = { id: ub.id, client: await signedInClient(ub.email, ub.password) };
});

afterAll(async () => {
  await Promise.all([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
});

describe("chat messages", () => {
  it("are private, cannot be edited and go away with their note", async () => {
    const { data: note } = await a.client.from("notes").insert({ title: "Ottica", body: "La luce si propaga in linea retta." }).select("id").single();
    const insert = await a.client
      .from("chat_messages")
      .insert({ note_id: note!.id, role: "assistant", content: "In linea retta.", pages: [1] })
      .select("id")
      .single();
    expect(insert.error).toBeNull();

    expect((await b.client.from("chat_messages").select("id")).data).toEqual([]);
    expect((await b.client.from("chat_messages").insert({ note_id: note!.id, role: "user", content: "x" })).error).not.toBeNull();
    expect((await a.client.from("chat_messages").insert({ role: "user", content: "senza fonte" })).error).not.toBeNull();

    await a.client.from("chat_messages").update({ content: "cambiato" }).eq("id", insert.data!.id);
    expect((await a.client.from("chat_messages").select("content").eq("id", insert.data!.id).single()).data?.content).toBe("In linea retta.");

    await a.client.from("notes").delete().eq("id", note!.id);
    expect((await a.client.from("chat_messages").select("id")).data).toEqual([]);
  });
});
