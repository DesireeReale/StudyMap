import { NextResponse } from "next/server";
import { z } from "zod";
import { clearMarkers } from "@/core/review";
import { apiUser, fail } from "@/lib/api";
import { startRequested } from "@/lib/generation";
import type { GenerationType } from "@/lib/jobs";

const Body = z.object({
  pages: z.array(z.object({ index: z.number().int().min(0), text: z.string().max(50_000) })).max(500),
});

export async function POST(request: Request, ctx: RouteContext<"/api/documents/[id]/review">) {
  const auth = await apiUser();
  if (!auth) return fail("Non autenticato", 401);
  const { supabase, profile } = auth;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Richiesta non valida", 400);

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, pages, review_pages, review_create")
    .eq("id", (await ctx.params).id)
    .maybeSingle();
  if (!doc) return fail("Documento non trovato", 404);
  if (!doc.review_pages) return NextResponse.json({ href: `/documents/${doc.id}`, jobs: 0 });

  const allowed = new Set(doc.review_pages);
  const pages = [...doc.pages];
  for (const { index, text } of parsed.data.pages) if (allowed.has(index)) pages[index] = text;
  for (const i of allowed) if (pages[i] !== undefined) pages[i] = clearMarkers(pages[i]);

  const { error } = await supabase
    .from("documents")
    .update({ pages, review_pages: null, review_create: [] })
    .eq("id", doc.id)
    .not("review_pages", "is", null)
    .select("id")
    .single();
  if (error) return fail("Salvataggio non riuscito", 409);
  const types = doc.review_create as GenerationType[];
  await startRequested(supabase, profile, types, { documentId: doc.id }, doc.title);
  return NextResponse.json({ href: `/documents/${doc.id}`, jobs: types.length });
}
