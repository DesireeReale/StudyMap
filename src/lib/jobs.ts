import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiUnavailableError } from "@/core/ai/client";
import { generateFlashcards, generateMindMap, generateQuiz, generateSummary, summaryToText } from "@/core/ai/tasks";
import { mindMapToGraph } from "@/core/graph";
import type { JobStatus } from "@/core/jobs";
import type { AiJobRow, Database, Profile } from "@/lib/supabase/types";
import { aiContextFor, consumeQuota } from "./ai";
import { supabaseAdmin } from "./supabase/server";

export type JobType = AiJobRow["type"];
export type Source = { id: string | null; title: string; pages: string[]; folder_id: string };

async function produce(
  supabase: SupabaseClient<Database>,
  profile: Profile,
  type: JobType,
  doc: Source,
): Promise<string> {
  const ctx = aiContextFor(profile);
  const input = { title: doc.title, pages: doc.pages };

  if (type === "mindmap") {
    const graph = mindMapToGraph(await generateMindMap(ctx, input));
    const { data, error } = await supabase
      .from("maps")
      .insert({ title: doc.title, document_id: doc.id, folder_id: doc.folder_id, graph })
      .select("id")
      .single();
    if (error) throw error;
    return `/maps/${data.id}`;
  }

  if (type === "summary") {
    const text = summaryToText(await generateSummary(ctx, input));
    const { data, error } = await supabase
      .from("notes")
      .insert({ title: `Riassunto · ${doc.title}`.slice(0, 200), body: text.slice(0, 100_000), folder_id: doc.folder_id })
      .select("id")
      .single();
    if (error) throw error;
    return `/notes/${data.id}`;
  }

  if (type === "quiz") {
    const questions = await generateQuiz(ctx, input);
    const { data, error } = await supabase
      .from("quizzes")
      .insert({ title: doc.title, document_id: doc.id, folder_id: doc.folder_id, questions })
      .select("id")
      .single();
    if (error) throw error;
    return `/quizzes/${data.id}`;
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
  return `/decks/${deck.id}`;
}

async function settle(job: AiJobRow, patch: { status: JobStatus; href?: string; error?: string }) {
  const { data } = await supabaseAdmin()
    .from("ai_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", job.id)
    .in("status", ["queued", "running"])
    .select("id");
  return (data?.length ?? 0) > 0;
}

export async function failJob(job: AiJobRow, message: string) {
  if (!(await settle(job, { status: "error", error: message.slice(0, 500) }))) return;
  await consumeQuota(job.user_id, "generation", job.quota_period, -1, null);
  if (job.quiz_period) await consumeQuota(job.user_id, "quiz", job.quiz_period, -1, null);
}

export async function runJob(job: AiJobRow, supabase: SupabaseClient<Database>, profile: Profile, doc: Source) {
  await supabaseAdmin()
    .from("ai_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("status", "queued");
  try {
    await settle(job, { status: "done", href: await produce(supabase, profile, job.type, doc) });
  } catch (e) {
    if (!(e instanceof AiUnavailableError)) console.error("generation failed", e);
    await failJob(job, e instanceof AiUnavailableError ? e.message : "La generazione non è riuscita. Riprova.");
  }
}
