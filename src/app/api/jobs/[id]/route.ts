import { NextResponse } from "next/server";
import { isStale, JOB_STALE_ERROR } from "@/core/jobs";
import { apiUser, fail } from "@/lib/api";
import { failJob } from "@/lib/jobs";

export async function GET(_request: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const auth = await apiUser();
  if (!auth) return fail("Non autenticato", 401);
  const { id } = await ctx.params;

  const { data: job } = await auth.supabase.from("ai_jobs").select("*").eq("id", id).maybeSingle();
  if (!job) return fail("Generazione non trovata", 404);

  if (isStale(job)) {
    await failJob(job, JOB_STALE_ERROR);
    return NextResponse.json({ status: "error", href: null, error: JOB_STALE_ERROR });
  }
  return NextResponse.json({ status: job.status, href: job.href, error: job.error });
}
