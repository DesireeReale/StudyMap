import { after, NextResponse } from "next/server";
import { z } from "zod";
import { PLANS } from "@/config/plans";
import { generationLimitReached, monthPeriod, quizLimitReached, quotaLimit, weekPeriod } from "@/core/entitlements";
import { textToPages } from "@/core/ingest";
import { consumeQuota, guardAi } from "@/lib/ai";
import { apiUser, denied, fail } from "@/lib/api";
import { failJob, runJob, type Source } from "@/lib/jobs";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

const type = z.enum(["mindmap", "flashcards", "summary", "quiz"]);
const Body = z.union([z.object({ documentId: z.uuid(), type }), z.object({ noteId: z.uuid(), type })]);

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth) return fail("Non autenticato", 401);
  const { supabase, profile } = auth;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Richiesta non valida", 400);
  const body = parsed.data;

  let doc: Source;
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

  const week = body.type === "quiz" ? weekPeriod() : null;
  if (week && !(await consumeQuota(profile.id, "quiz", week, 1, quotaLimit(PLANS[profile.plan].quizzesPerWeek)))) {
    return denied(quizLimitReached(profile.plan), 402);
  }
  const refundQuiz = () => (week ? consumeQuota(profile.id, "quiz", week, -1, null) : null);

  const period = monthPeriod();
  if (!(await consumeQuota(profile.id, "generation", period, 1, quotaLimit(PLANS[profile.plan].generationsPerMonth)))) {
    await refundQuiz();
    return denied(generationLimitReached(profile.plan), 402);
  }

  const { data: job, error } = await supabaseAdmin()
    .from("ai_jobs")
    .insert({
      user_id: profile.id,
      type: body.type,
      document_id: "documentId" in body ? body.documentId : null,
      note_id: "noteId" in body ? body.noteId : null,
      quota_period: period,
      quiz_period: week,
    })
    .select("*")
    .single();
  if (error) {
    await consumeQuota(profile.id, "generation", period, -1, null);
    await refundQuiz();
    return fail("La generazione non è riuscita. Riprova.", 500);
  }

  after(() => runJob(job, supabase, profile, doc).catch((e) => failJob(job, String(e))));
  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
