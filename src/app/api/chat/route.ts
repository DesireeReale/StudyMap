import { NextResponse } from "next/server";
import { z } from "zod";
import { PLANS } from "@/config/plans";
import { AiUnavailableError } from "@/core/ai/client";
import { askDocument } from "@/core/ai/tasks";
import { chatLimitReached, monthPeriod, quotaLimit } from "@/core/entitlements";
import { textToPages } from "@/core/ingest";
import { excerptsFor } from "@/core/retrieval";
import { aiContextFor, consumeQuota, guardAi } from "@/lib/ai";
import { apiUser, denied, fail } from "@/lib/api";

export const maxDuration = 120;

const Source = z.union([z.object({ documentId: z.uuid() }), z.object({ noteId: z.uuid() })]);
const Ask = z.intersection(Source, z.object({ question: z.string().trim().min(2).max(1000) }));

const column = (source: z.infer<typeof Source>) =>
  "noteId" in source ? (["note_id", source.noteId] as const) : (["document_id", source.documentId] as const);

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth) return fail("Non autenticato", 401);
  const { supabase, profile } = auth;

  const parsed = Ask.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Richiesta non valida", 400);
  const body = parsed.data;
  const [key, id] = column(body);
  const owner = { document_id: key === "document_id" ? id : null, note_id: key === "note_id" ? id : null };

  let source: { title: string; pages: string[]; unit: "Pagina" | "Slide" };
  if ("noteId" in body) {
    const { data } = await supabase.from("notes").select("title, body").eq("id", body.noteId).single();
    if (!data) return fail("Appunto non trovato", 404);
    source = { title: data.title, pages: textToPages(data.body), unit: "Pagina" };
  } else {
    const { data } = await supabase.from("documents").select("title, pages, kind").eq("id", body.documentId).single();
    if (!data) return fail("Documento non trovato", 404);
    source = { title: data.title, pages: data.pages, unit: data.kind === "pptx" ? "Slide" : "Pagina" };
  }
  if (!source.pages.some((p) => p.trim())) return fail("Questo materiale non ha testo da consultare.", 400);

  const guard = await guardAi(profile);
  if (!guard.ok) return denied(guard, 429);

  const period = monthPeriod();
  if (!(await consumeQuota(profile.id, "chat", period, 1, quotaLimit(PLANS[profile.plan].chatQuestionsPerMonth)))) {
    return denied(chatLimitReached(profile.plan), 402);
  }

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq(key, id)
    .order("id", { ascending: false })
    .limit(6);

  try {
    const reply = await askDocument(aiContextFor(profile), {
      ...source,
      history: (history ?? []).reverse(),
      question: body.question,
    });
    const { data, error } = await supabase
      .from("chat_messages")
      .insert([
        { ...owner, role: "user", content: body.question, pages: [] },
        { ...owner, role: "assistant", content: reply.answer.slice(0, 4000), pages: reply.pages },
      ])
      .select("id, role, content, pages");
    if (error) throw error;
    return NextResponse.json({ messages: data, excerpts: excerptsFor(source.pages, reply.pages) });
  } catch (e) {
    await consumeQuota(profile.id, "chat", period, -1, null);
    if (e instanceof AiUnavailableError) return fail(e.message, 503);
    console.error("chat failed", e);
    return fail("Non sono riuscito a rispondere. Riprova.", 500);
  }
}
