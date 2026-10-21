import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { PLANS } from "@/config/plans";
import { generationLimitReached, monthPeriod, quizLimitReached, quotaLimit, weekPeriod, type Denied } from "@/core/entitlements";
import { textToPages } from "@/core/ingest";
import type { Database, Profile } from "@/lib/supabase/types";
import { consumeQuota, guardAi } from "./ai";
import { failJob, generation, runJob, type GenerationType, type Source } from "./jobs";
import { supabaseAdmin } from "./supabase/server";

export type GenerationSource = { documentId: string } | { noteId: string };
export type Started = { ok: true; jobId: string } | (Denied & { status: number });

const denied = (d: Denied, status: number): Started => ({ ...d, status });

export async function startGeneration(
  supabase: SupabaseClient<Database>,
  profile: Profile,
  type: GenerationType,
  source: GenerationSource,
): Promise<Started> {
  let doc: Source;
  if ("noteId" in source) {
    const { data: note } = await supabase.from("notes").select("title, body, folder_id").eq("id", source.noteId).single();
    if (!note) return denied({ ok: false, reason: "Appunto non trovato", upgrade: false }, 404);
    if (note.body.trim().length < 20) {
      return denied({ ok: false, reason: "L'appunto è troppo corto: scrivi almeno qualche riga.", upgrade: false }, 400);
    }
    doc = { id: null, title: note.title, pages: textToPages(note.body), folder_id: note.folder_id };
  } else {
    const { data } = await supabase.from("documents").select("id, title, pages, folder_id").eq("id", source.documentId).single();
    if (!data) return denied({ ok: false, reason: "Documento non trovato", upgrade: false }, 404);
    doc = data;
  }

  const guard = await guardAi(profile);
  if (!guard.ok) return denied(guard, 429);

  const week = type === "quiz" ? weekPeriod() : null;
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
      type,
      title: doc.title.slice(0, 200),
      document_id: "documentId" in source ? source.documentId : null,
      note_id: "noteId" in source ? source.noteId : null,
      quota_period: period,
      quiz_period: week,
    })
    .select("*")
    .single();
  if (error) {
    await consumeQuota(profile.id, "generation", period, -1, null);
    await refundQuiz();
    return denied({ ok: false, reason: "La generazione non è riuscita. Riprova.", upgrade: false }, 500);
  }

  after(() => runJob(job, generation(supabase, profile, type, doc)).catch((e) => failJob(job, String(e))));
  return { ok: true, jobId: job.id };
}

export async function startRequested(
  supabase: SupabaseClient<Database>,
  profile: Profile,
  types: GenerationType[],
  source: GenerationSource,
  title: string,
) {
  for (const type of types) {
    const started = await startGeneration(supabase, profile, type, source);
    if (started.ok) continue;
    await supabaseAdmin()
      .from("ai_jobs")
      .insert({
        user_id: profile.id,
        type,
        title: title.slice(0, 200),
        document_id: "documentId" in source ? source.documentId : null,
        note_id: "noteId" in source ? source.noteId : null,
        status: "error",
        phase: "error",
        error: started.reason.slice(0, 500),
      });
  }
}
