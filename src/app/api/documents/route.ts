import { NextResponse } from "next/server";
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

export const maxDuration = 300;

const UNSUPPORTED = "Formato non supportato: carica PDF, Word (.docx), PowerPoint (.pptx), PNG, JPEG o WebP.";

const folderId = z.uuid().optional();
const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), title: z.string().trim().min(1).max(200), text: z.string().trim().min(20), folderId }),
  z.object({ kind: z.literal("file"), title: z.string().trim().min(1).max(200), storagePath: z.string().min(1), folderId, figures: z.boolean().default(false) }),
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
    return NextResponse.json({ id: data.id, href: `/notes/${data.id}` });
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

  const ctx = aiContextFor(profile);
  const plan = PLANS[profile.plan];
  const transcribe = (dataUrl: string) => transcribeImage(ctx, dataUrl);
  const figures = body.figures ? { describe: (dataUrl: string, context: string) => describeFigure(ctx, dataUrl, context), max: plan.maxFigures } : undefined;
  let pages: string[];
  try {
    if (kind === "pdf") pages = await ingestPdf(bytes, { maxPages: plan.maxPdfPages, transcribe, figures });
    else if (kind === "docx") pages = await ingestOffice(readDocx(zip!), { maxPages: plan.maxPdfPages, figures });
    else if (kind === "pptx") pages = await ingestOffice(readPptx(zip!), { maxPages: plan.maxPdfPages, figures });
    else pages = [await transcribe(`data:${MIME[kind]};base64,${Buffer.from(bytes).toString("base64")}`)];
  } catch (e) {
    await removeUpload();
    if (e instanceof PageLimitError) {
      const decision = checkPdfPages(profile.plan, e.pages);
      if (!decision.ok) return denied(decision, 413);
    }
    if (e instanceof AiUnavailableError) return fail(e.message, 503);
    console.error("ingest failed", e);
    return fail("Non è stato possibile leggere il file.", 422);
  }

  if (!pages.some((p) => p.trim())) {
    await removeUpload();
    return fail("Non ho trovato testo nel file.", 422);
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: body.title,
      folder_id: body.folderId,
      kind: kind === "png" || kind === "jpeg" || kind === "webp" ? "image" : kind,
      storage_path: body.storagePath,
      pages,
      page_count: pages.length,
    })
    .select("id")
    .single();
  if (error) {
    await removeUpload();
    return fail("Salvataggio non riuscito", 500);
  }
  return NextResponse.json({ id: data.id, href: `/documents/${data.id}` });
}
