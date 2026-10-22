import { after, NextResponse } from "next/server";
import { z } from "zod";
import { PLANS } from "@/config/plans";
import { AiUnavailableError } from "@/core/ai/client";
import { describeFigure, transcribeImage } from "@/core/ai/tasks";
import { canSaveDocument, checkPdfPages, checkUploadSize } from "@/core/entitlements";
import { MAX_NOTE_CHARS, MIME, detectFileKind } from "@/core/files";
import { PageLimitError, ingestOffice, ingestPdf } from "@/core/ingest";
import { officeKind, readDocx, readPptx } from "@/core/office";
import { readZip } from "@/core/zip";
import { aiContextFor, guardAi } from "@/lib/ai";
import { apiUser, denied, fail } from "@/lib/api";
import { startRequested } from "@/lib/generation";
import { failJob, JobFailure, runJob, type Work } from "@/lib/jobs";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 300;

const UNSUPPORTED = "Formato non supportato: carica PDF, Word (.docx), PowerPoint (.pptx), PNG, JPEG o WebP.";

const folderId = z.uuid().optional();
const create = z.array(z.enum(["mindmap", "flashcards", "summary", "quiz"])).max(4).default([]);
const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), title: z.string().trim().min(1).max(200), text: z.string().trim().min(20), folderId, create }),
  z.object({
    kind: z.literal("file"),
    title: z.string().trim().min(1).max(200),
    storagePath: z.string().min(1),
    folderId,
    figures: z.boolean().default(false),
    create,
  }),
]);

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth) return fail("Non autenticato", 401);
  const { supabase, user, profile } = auth;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Richiesta non valida", 400);
  const body = parsed.data;

  const { count } = await supabase.from("documents").select("id", { count: "exact", head: true });
  const canSave = canSaveDocument(profile.plan, count ?? 0);

  if (body.kind === "text") {
    if (body.text.length > MAX_NOTE_CHARS) return fail("Il testo è troppo lungo per un appunto.", 400);
    const { data, error } = await supabase
      .from("notes")
      .insert({ title: body.title, body: body.text, folder_id: body.folderId })
      .select("id")
      .single();
    if (error) return fail("Salvataggio non riuscito", 500);
    const types = [...new Set(body.create)];
    await startRequested(supabase, profile, types, { noteId: data.id }, body.title);
    return NextResponse.json({ id: data.id, href: `/notes/${data.id}`, jobs: types.length });
  }

  const removeUpload = () => supabase.storage.from("documents").remove([body.storagePath]);
  if (!body.storagePath.startsWith(`${user.id}/`)) return fail("Percorso non valido", 400);
  if (!canSave.ok) {
    await removeUpload();
    return denied(canSave);
  }

  const { data: blob, error: downloadError } = await supabase.storage.from("documents").download(body.storagePath);
  if (downloadError || !blob) return fail("File non trovato", 404);

  const size = checkUploadSize(profile.plan, blob.size);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const detected = detectFileKind(bytes);
  if (!size.ok) {
    await removeUpload();
    return denied(size, 413);
  }
  if (detected === "legacy-office") {
    await removeUpload();
    return fail("Questo è un vecchio file .doc o .ppt: aprilo e salvalo come .docx, .pptx oppure PDF.", 415);
  }
  let zip: ReturnType<typeof readZip> | null = null;
  try {
    zip = detected === "zip" ? readZip(bytes) : null;
  } catch {
    zip = null;
  }
  const kind = zip ? officeKind(zip) : detected === "zip" ? null : detected;
  if (!kind) {
    await removeUpload();
    return fail(UNSUPPORTED, 415);
  }

  const guard = await guardAi(profile);
  if (!guard.ok) {
    await removeUpload();
    return denied(guard, 429);
  }

  const { data: job, error: jobError } = await supabaseAdmin()
    .from("ai_jobs")
    .insert({ user_id: user.id, type: "ingest", title: body.title })
    .select("*")
    .single();
  if (jobError) {
    await removeUpload();
    return fail("Salvataggio non riuscito", 500);
  }

  const ctx = aiContextFor(profile);
  const plan = PLANS[profile.plan];
  const transcribe = (dataUrl: string) => transcribeImage(ctx, dataUrl);
  const figures = body.figures ? { describe: (dataUrl: string, context: string) => describeFigure(ctx, dataUrl, context), max: plan.maxFigures } : undefined;

  const work: Work = async (progress, onWait) => {
    ctx.onWait = onWait;
    progress("read");
    const onPage = (done: number, total: number) => progress("transcribe", done, total);
    const transcribed: number[] = [];
    let pages: string[];
    try {
      if (kind === "pdf") pages = await ingestPdf(bytes, { maxPages: plan.maxPdfPages, transcribe, figures, onPage, onTranscribed: (i) => transcribed.push(i) });
      else if (kind === "docx") pages = await ingestOffice(readDocx(zip!), { maxPages: plan.maxPdfPages, figures, onPage });
      else if (kind === "pptx") pages = await ingestOffice(readPptx(zip!), { maxPages: plan.maxPdfPages, figures, onPage });
      else {
        onPage(0, 1);
        pages = [await transcribe(`data:${MIME[kind]};base64,${Buffer.from(bytes).toString("base64")}`)];
        transcribed.push(0);
      }
    } catch (e) {
      if (e instanceof PageLimitError) {
        const decision = checkPdfPages(profile.plan, e.pages);
        if (!decision.ok) throw new JobFailure(decision.reason);
      }
      if (e instanceof JobFailure || e instanceof AiUnavailableError) throw e;
      console.error("ingest failed", e);
      throw new JobFailure("Non è stato possibile leggere il file.");
    }
    if (!pages.some((p) => p.trim())) throw new JobFailure("Non ho trovato testo nel file.");
    const review = transcribed.length > 0;
    const create = [...new Set(body.create)];

    const { data, error } = await supabase
      .from("documents")
      .insert({
        title: body.title,
        folder_id: body.folderId,
        kind: kind === "png" || kind === "jpeg" || kind === "webp" ? "image" : kind,
        storage_path: body.storagePath,
        pages,
        page_count: pages.length,
        review_pages: review ? transcribed.sort((a, b) => a - b) : null,
        review_create: review ? create : [],
      })
      .select("id")
      .single();
    if (error) throw new JobFailure("Salvataggio non riuscito");
    if (review) return `/documents/${data.id}/controlla`;
    await startRequested(supabase, profile, create, { documentId: data.id }, body.title);
    return `/documents/${data.id}`;
  };

  after(() => runJob(job, work, removeUpload).catch((e) => failJob(job, String(e))));
  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
