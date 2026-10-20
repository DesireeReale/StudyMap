import { NextResponse } from "next/server";
import { isStale, JOB_STALE_ERROR } from "@/core/jobs";
import { apiUser, fail } from "@/lib/api";
import { failJob, toView } from "@/lib/jobs";
import { supabaseAdmin } from "@/lib/supabase/server";

async function ownJob(id: string) {
  const auth = await apiUser();
  if (!auth) return null;
  const { data } = await auth.supabase.from("ai_jobs").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function GET(_request: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const job = await ownJob((await ctx.params).id);
  if (!job) return fail("Lavoro non trovato", 404);
  if (isStale(job)) await failJob(job, JOB_STALE_ERROR);
  return NextResponse.json(toView(job));
}

export async function PATCH(_request: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const job = await ownJob((await ctx.params).id);
  if (!job) return fail("Lavoro non trovato", 404);
  await supabaseAdmin().from("ai_jobs").update({ seen_at: new Date().toISOString() }).eq("id", job.id);
  return NextResponse.json({ ok: true });
}
