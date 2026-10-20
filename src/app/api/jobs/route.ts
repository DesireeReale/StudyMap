import { NextResponse } from "next/server";
import { isStale, JOB_STALE_ERROR } from "@/core/jobs";
import { apiUser, fail } from "@/lib/api";
import { failJob, toView } from "@/lib/jobs";

const RECENT_MS = 24 * 60 * 60_000;

export async function GET() {
  const auth = await apiUser();
  if (!auth) return fail("Non autenticato", 401);

  const { data } = await auth.supabase
    .from("ai_jobs")
    .select("*")
    .is("seen_at", null)
    .gte("created_at", new Date(Date.now() - RECENT_MS).toISOString())
    .order("created_at")
    .limit(5);
  const jobs = data ?? [];
  await Promise.all(jobs.filter((j) => isStale(j)).map((j) => failJob(j, JOB_STALE_ERROR)));
  return NextResponse.json({ jobs: jobs.map(toView) });
}
