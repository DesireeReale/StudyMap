import type { JobView } from "@/core/jobs";

export const JOBS_CHANGED = "studymap:jobs";
export const POLL_MS = 2000;

export function announceJobs() {
  window.dispatchEvent(new Event(JOBS_CHANGED));
}

export async function waitForJob(jobId: string, alive: () => boolean): Promise<JobView | null> {
  while (alive()) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" }).catch(() => null);
    if (!res?.ok) continue;
    const job = (await res.json()) as JobView;
    if (job.status === "done" || job.status === "error") return job;
  }
  return null;
}

export function markSeen(jobId: string) {
  return fetch(`/api/jobs/${jobId}`, { method: "PATCH" }).catch(() => null);
}

export function uploadWithProgress(
  url: string,
  file: File,
  contentType: string,
  apiKey: string,
  onProgress: (ratio: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("apikey", apiKey);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(file);
  });
}
