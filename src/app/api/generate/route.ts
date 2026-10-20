import { NextResponse } from "next/server";
import { z } from "zod";
import { PLANS } from "@/config/plans";
import { AiUnavailableError } from "@/core/ai/client";
import { generateFlashcards, generateMindMap } from "@/core/ai/tasks";
import { generationLimitReached, monthPeriod, quotaLimit } from "@/core/entitlements";
import { mindMapToGraph } from "@/core/graph";
import { textToPages } from "@/core/ingest";
import { aiContextFor, consumeQuota, guardAi } from "@/lib/ai";
import { apiUser, denied, fail } from "@/lib/api";

export const maxDuration = 300;

const type = z.enum(["mindmap", "flashcards"]);
const Body = z.union([z.object({ documentId: z.uuid(), type }), z.object({ noteId: z.uuid(), type })]);

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth) return fail("Non autenticato", 401);
  const { supabase, profile } = auth;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Richiesta non valida", 400);
  const body = parsed.data;

  let doc: { id: string | null; title: string; pages: string[]; folder_id: string };
  if ("noteId" in body) {
    const { data: note } = await supabase.from("notes").select("title, body, folder_id").eq("id", body.noteId).single();
    if (!note) return fail("Appunto non trovato", 404);
    if (note.body.trim().length < 20) return fail("L'appunto è troppo corto: scrivi almeno qualche riga.", 400);
    doc = { id: null, title: note.title, pages: textToPages(note.body), folder_id: note.folder_id };
  } else {
    const { data } = await supabase.from("documents").select("id, title, pages, folder_id").eq("id", body.documentId).single();
    if (!data) return fail("Documento non trovato", 404);
    doc = data;
  }

  const guard = await guardAi(profile);
  if (!guard.ok) return denied(guard, 429);

  const period = monthPeriod();
  const limit = quotaLimit(PLANS[profile.plan].generationsPerMonth);
  if (!(await consumeQuota(profile.id, "generation", period, 1, limit))) {
    return denied(generationLimitReached(profile.plan), 402);
  }

  const ctx = aiContextFor(profile);
  const input = { title: doc.title, pages: doc.pages };
  try {
    if (body.type === "mindmap") {
      const graph = mindMapToGraph(await generateMindMap(ctx, input));
      const { data, error } = await supabase
        .from("maps")
        .insert({ title: doc.title, document_id: doc.id, folder_id: doc.folder_id, graph })
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json({ id: data.id, href: `/maps/${data.id}` });
    }

    const cards = await generateFlashcards(ctx, input);
    const { data: deck, error } = await supabase
      .from("decks")
      .insert({ title: doc.title, document_id: doc.id, folder_id: doc.folder_id })
      .select("id")
      .single();
    if (error) throw error;
    const { error: cardsError } = await supabase
      .from("flashcards")
      .insert(cards.map((c, position) => ({ deck_id: deck.id, front: c.front, back: c.back, position })));
    if (cardsError) {
      await supabase.from("decks").delete().eq("id", deck.id);
      throw cardsError;
    }
    return NextResponse.json({ id: deck.id, href: `/decks/${deck.id}` });
  } catch (e) {
    await consumeQuota(profile.id, "generation", period, -1, null);
    if (e instanceof AiUnavailableError) return fail(e.message, 503);
    console.error("generation failed", e);
    return fail("La generazione non è riuscita. Riprova.", 500);
  }
}
