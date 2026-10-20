export type JobStatus = "queued" | "running" | "done" | "error";

export const JOB_STALE_MS = 6 * 60_000;

export const JOB_STALE_ERROR = "La generazione si è interrotta. Riprova: non ti è stata conteggiata.";

export function isStale(job: { status: JobStatus; updated_at: string }, now = Date.now()): boolean {
  return (job.status === "queued" || job.status === "running") && now - Date.parse(job.updated_at) > JOB_STALE_MS;
}
