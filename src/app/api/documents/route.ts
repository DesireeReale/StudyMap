import { NextResponse } from "next/server";
import { z } from "zod";
import { PLANS } from "@/config/plans";
import { AiUnavailableError } from "@/core/ai/client";
import { transcribeImage } from "@/core/ai/tasks";
import { canSaveDocument, checkPdfPages, checkUploadSize } from "@/core/entitlements";
import { MAX_TEXT_CHARS, MIME, detectFileKind } from "@/core/files";
import { PageLimitError, ingestPdf, textToPages } from "@/core/ingest";
import { aiContextFor, guardAi } from "@/lib/ai";
import { apiUser, denied, fail } from "@/lib/api";

export const maxDuration = 300;

const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), title: z.string().trim().min(1).max(200), text: z.string().trim().min(20) }),
  z.object({ kind: z.literal("file"), title: z.string().trim().min(1).max(200), storagePath: z.string().min(1) }),
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
    if (!canSave.ok) return denied(canSave);
    if (body.text.length > MAX_TEXT_CHARS) return fail("Il testo è troppo lungo.", 400);
    const pages = textToPages(body.text);
    const { data, error } = await supabase
      .from("documents")
      .insert({ title: body.title, kind: "text", pages, page_count: pages.length })
      .select("id")
      .single();
    if (error) return fail("Salvataggio non riuscito", 500);
    return NextResponse.json({ id: data.id });
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
  const kind = detectFileKind(bytes);
  if (!size.ok || !kind) {
    await removeUpload();
    return size.ok ? fail("Formato non supportato: carica PDF, PNG, JPEG o WebP.", 415) : denied(size, 413);
  }

  const guard = await guardAi(profile);
  if (!guard.ok) {
    await removeUpload();
    return denied(guard, 429);
  }

  const ctx = aiContextFor(profile);
  const transcribe = (dataUrl: string) => transcribeImage(ctx, dataUrl);
  let pages: string[];
  try {
    pages =
      kind === "pdf"
        ? await ingestPdf(bytes, { maxPages: PLANS[profile.plan].maxPdfPages, transcribe })
        : [await transcribe(`data:${MIME[kind]};base64,${Buffer.from(bytes).toString("base64")}`)];
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
      kind: kind === "pdf" ? "pdf" : "image",
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
  return NextResponse.json({ id: data.id });
}
