import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, fail } from "@/lib/api";
import { startGeneration } from "@/lib/generation";

export const maxDuration = 300;

const type = z.enum(["mindmap", "flashcards", "summary", "quiz"]);
const Body = z.union([
  z.object({ documentId: z.uuid(), type, chapters: z.boolean().optional() }),
  z.object({ noteId: z.uuid(), type }),
]);

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth) return fail("Non autenticato", 401);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Richiesta non valida", 400);
  const { type: kind, ...rest } = parsed.data;
  const { chapters, ...source } = { chapters: false, ...rest };

  const started = await startGeneration(auth.supabase, auth.profile, kind, source, { chapters });
  if (!started.ok) return fail(started.reason, started.status, started.upgrade);
  return NextResponse.json({ jobId: started.jobId }, { status: 202 });
}
