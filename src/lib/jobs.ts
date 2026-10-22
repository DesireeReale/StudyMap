import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiUnavailableError } from "@/core/ai/client";
import type { MindMap } from "@/core/ai/schemas";
import { generateFlashcards, generateMindMap, generateQuiz, generateSummary, overviewMindMap, summaryToText } from "@/core/ai/tasks";
import { detectChapters } from "@/core/chapters";
import { mindMapToGraph } from "@/core/graph";
import { isStale, JOB_STALE_ERROR, type JobPhase, type JobView, type Progress } from "@/core/jobs";
import type { AiJobRow, Database, Profile } from "@/lib/supabase/types";
import { aiContextFor, consumeQuota } from "./ai";
import { supabaseAdmin } from "./supabase/server";

export type GenerationType = Exclude<AiJobRow["type"], "ingest">;
export type Source = { id: string | null; title: string; pages: string[]; folder_id: string };

export class JobFailure extends Error {}

export function toView(job: AiJobRow): JobView {
  const { id, type, status, phase, done, total, title, href, error, document_id, note_id, retryable, upgrade } = job;
  const view = { id, type, status, phase, done, total, title, href, error, document_id, note_id, retryable, upgrade };
  return isStale(job) ? { ...view, status: "error", phase: "error", error: JOB_STALE_ERROR } : view;
}

function reporter(jobId: string): Progress {
  let chain = Promise.resolve();
  return (phase, done = 0, total = 0) => {
    chain = chain
      .then(async () => {
        await supabaseAdmin()
          .from("ai_jobs")
          .update({ phase, done, total, updated_at: new Date().toISOString() })
          .eq("id", jobId)
          .eq("status", "running");
      })
      .catch((e) => console.error("job progress failed", e));
  };
}

export type Work = (progress: Progress, onWait: (waiting: boolean) => void) => Promise<string>;

export type GenerationOptions = { chapters?: boolean };

export function generation(
  supabase: SupabaseClient<Database>,
  profile: Profile,
  type: GenerationType,
  doc: Source,
  options: GenerationOptions = {},
): Work {
  return async (progress, onWait) => {
    const ctx = { ...aiContextFor(profile), onWait };
    const input = { title: doc.title, pages: doc.pages };
    const onPart = (done: number, total: number) => progress("generate", done, total);
    const chapters = type === "mindmap" && options.chapters ? detectChapters(doc.pages) : [];

    if (chapters.length) {
      const made: { title: string; map: MindMap }[] = [];
      const rows = [];
      for (const [i, chapter] of chapters.entries()) {
        progress("generate", i, chapters.length);
        const map = await generateMindMap(ctx, { title: chapter.title, pages: doc.pages.slice(chapter.from, chapter.to + 1) });
        made.push({ title: chapter.title, map });
        rows.push({
          title: `${doc.title} · ${i + 1}. ${chapter.title}`.slice(0, 200),
          document_id: doc.id,
          folder_id: doc.folder_id,
          graph: mindMapToGraph(map),
        });
      }
      progress("merge");
      const { error } = await supabase.from("maps").insert(rows);
      if (error) throw error;
      const { data, error: overviewError } = await supabase
        .from("maps")
        .insert({
          title: `${doc.title} · Mappa generale`.slice(0, 200),
          document_id: doc.id,
          folder_id: doc.folder_id,
          graph: mindMapToGraph(overviewMindMap(doc.title, made)),
        })
        .select("id")
        .single();
      if (overviewError) throw overviewError;
      return `/maps/${data.id}`;
    }

    if (type === "mindmap") {
      const map = await generateMindMap(ctx, input, onPart);
      progress("merge");
      const { data, error } = await supabase
        .from("maps")
        .insert({ title: doc.title, document_id: doc.id, folder_id: doc.folder_id, graph: mindMapToGraph(map) })
        .select("id")
        .single();
      if (error) throw error;
      return `/maps/${data.id}`;
    }

    if (type === "summary") {
      const text = summaryToText(await generateSummary(ctx, input, onPart), doc.id ? doc.pages.length : 0);
      const { data, error } = await supabase
        .from("notes")
        .insert({
          title: `Riassunto · ${doc.title}`.slice(0, 200),
          body: text.slice(0, 100_000),
          folder_id: doc.folder_id,
          document_id: doc.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return `/notes/${data.id}`;
    }

    if (type === "quiz") {
      const questions = await generateQuiz(ctx, input, onPart);
      const { data, error } = await supabase
        .from("quizzes")
        .insert({ title: doc.title, document_id: doc.id, folder_id: doc.folder_id, questions })
        .select("id")
        .single();
      if (error) throw error;
      return `/quizzes/${data.id}`;
    }

    const cards = await generateFlashcards(ctx, input, onPart);
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
  };
}

async function settle(job: AiJobRow, patch: { status: "done" | "error"; phase: JobPhase; href?: string; error?: string }) {
  const { data } = await supabaseAdmin()
    .from("ai_jobs")
    .update({ ...patch, updated_at: new Date().toISOString(), duration_ms: Date.now() - Date.parse(job.created_at) })
    .eq("id", job.id)
    .in("status", ["queued", "running"])
    .select("id");
  return (data?.length ?? 0) > 0;
}

export async function failJob(job: AiJobRow, message: string) {
  if (!(await settle(job, { status: "error", phase: "error", error: message.slice(0, 500) }))) return;
  if (job.quota_period) await consumeQuota(job.user_id, "generation", job.quota_period, -1, null);
  if (job.quiz_period) await consumeQuota(job.user_id, "quiz", job.quiz_period, -1, null);
}

function queueAware(progress: Progress) {
  let last: Parameters<Progress> = ["queued"];
  const tracked: Progress = (...args) => {
    last = args;
    progress(...args);
  };
  const onWait = (waiting: boolean) => (waiting ? progress("wait") : progress(...last));
  return { tracked, onWait };
}

export async function runJob(job: AiJobRow, work: Work, onFail?: () => Promise<unknown>) {
  await supabaseAdmin()
    .from("ai_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("status", "queued");
  try {
    const { tracked, onWait } = queueAware(reporter(job.id));
    await settle(job, { status: "done", phase: "done", href: await work(tracked, onWait) });
  } catch (e) {
    const known = e instanceof JobFailure || e instanceof AiUnavailableError;
    if (!known) console.error("job failed", e);
    await onFail?.().catch(() => null);
    await failJob(job, known ? e.message : "Non è riuscito. Riprova.");
  }
}
