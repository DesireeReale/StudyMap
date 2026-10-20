import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/lib/supabase/types";
import { createTestUser, deleteTestUser, signedInClient } from "../supabase";

type Client = SupabaseClient<Database>;
let a: { id: string; client: Client };
let b: { id: string; client: Client };

const one = async <P extends PromiseLike<{ data: unknown; error: unknown }>>(p: P) => {
  const { data, error } = await p;
  if (error || !data) throw error ?? new Error("no data");
  return data as NonNullable<Awaited<P>["data"]>;
};

beforeAll(async () => {
  const [ua, ub] = await Promise.all([createTestUser("fold-a"), createTestUser("fold-b")]);
  a = { id: ua.id, client: await signedInClient(ua.email, ua.password) };
  b = { id: ub.id, client: await signedInClient(ub.email, ub.password) };
});

afterAll(async () => {
  await Promise.all([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
});

describe("folders", () => {
  it("gives every new user a Generale subject that receives new content", async () => {
    const folders = await one(a.client.from("folders").select("id, name, parent_id"));
    expect(folders).toEqual([expect.objectContaining({ name: "Generale", parent_id: null })]);
    const doc = await one(
      a.client.from("documents").insert({ title: "Senza cartella", kind: "text", pages: ["x"] }).select("folder_id").single(),
    );
    expect(doc.folder_id).toBe(folders[0]!.id);
  });

  it("hides other users' folders and notes", async () => {
    await one(b.client.from("notes").insert({ title: "Appunto B" }).select("id").single());
    expect((await a.client.from("folders").select("name")).data).toEqual([{ name: "Generale" }]);
    expect((await a.client.from("notes").select("title")).data).toEqual([]);
  });

  it("refuses content in another user's folder", async () => {
    const bFolder = await one(b.client.from("folders").select("id").single());
    const { error } = await a.client.from("notes").insert({ title: "Intruso", folder_id: bFolder.id });
    expect(error).not.toBeNull();
    const sub = await a.client.from("folders").insert({ name: "Intrusa", parent_id: bFolder.id });
    expect(sub.error).not.toBeNull();
  });

  it("stops at three levels and refuses cycles", async () => {
    const root = await one(a.client.from("folders").insert({ name: "Diritto privato" }).select("id").single());
    const l2 = await one(a.client.from("folders").insert({ name: "Scritto", parent_id: root.id }).select("id").single());
    const l3 = await one(a.client.from("folders").insert({ name: "Esercizi", parent_id: l2.id }).select("id").single());
    const l4 = await a.client.from("folders").insert({ name: "Troppo", parent_id: l3.id });
    expect(l4.error?.message).toContain("3 livelli");
    const cycle = await a.client.from("folders").update({ parent_id: l3.id }).eq("id", root.id);
    expect(cycle.error).not.toBeNull();
    const dup = await a.client.from("folders").insert({ name: "scritto", parent_id: root.id });
    expect(dup.error?.code).toBe("23505");
  });

  it("keeps a folder with content and moves a document with what was generated from it", async () => {
    const target = await one(a.client.from("folders").insert({ name: "Analisi 1" }).select("id").single());
    const source = await one(a.client.from("folders").insert({ name: "Fisica" }).select("id").single());
    const doc = await one(
      a.client.from("documents").insert({ title: "Limiti", kind: "text", pages: ["x"], folder_id: source.id }).select("id").single(),
    );
    await a.client.from("maps").insert({ title: "Limiti", document_id: doc.id, folder_id: source.id, graph: { nodes: [], edges: [] } });
    await a.client.from("decks").insert({ title: "Limiti", document_id: doc.id, folder_id: source.id });

    const blocked = await a.client.from("folders").delete().eq("id", source.id);
    expect(blocked.error?.code).toBe("23503");

    expect((await a.client.rpc("move_document", { p_document: doc.id, p_folder: target.id })).error).toBeNull();
    const [maps, decks] = await Promise.all([
      one(a.client.from("maps").select("folder_id").eq("document_id", doc.id)),
      one(a.client.from("decks").select("folder_id").eq("document_id", doc.id)),
    ]);
    expect([...maps, ...decks].map((r) => r.folder_id)).toEqual([target.id, target.id]);
    expect((await a.client.from("folders").delete().eq("id", source.id)).error).toBeNull();
  });

  it("saves preferences on the profile", async () => {
    const prefs = { style: "evidenziatore", font: "atkinson", size: "grande", spacing: "ampia" };
    expect((await a.client.from("profiles").update({ preferences: prefs }).eq("id", a.id)).error).toBeNull();
    const profile = await one(a.client.from("profiles").select("preferences").single());
    expect(profile.preferences).toEqual(prefs);
  });
});
