"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { openLabel, phaseText, progressRatio, type JobView } from "@/core/jobs";
import { announceJobs, JOBS_CHANGED, markSeen, POLL_MS } from "@/lib/job-client";
import { Icon } from "./icons";

const active = (j: JobView) => j.status === "queued" || j.status === "running";

export function JobTray() {
  const pathname = usePathname();
  const [jobs, setJobs] = useState<JobView[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const known = useRef(new Map<string, JobView["status"]>());
  const dismissed = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    const res = await fetch("/api/jobs", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const jobs = ((await res.json()) as { jobs: JobView[] }).jobs;
    for (const j of jobs) {
      if (j.status === "done" && j.href === window.location.pathname && !dismissed.current.has(j.id)) {
        dismissed.current.add(j.id);
        void markSeen(j.id);
      }
    }
    const next = jobs.filter((j) => !dismissed.current.has(j.id));
    for (const j of next) {
      const before = known.current.get(j.id);
      if (before !== j.status && (j.status === "done" || j.status === "error" || !before)) {
        setAnnouncement(`${j.title}: ${phaseText(j)}`);
      }
      known.current.set(j.id, j.status);
    }
    setJobs(next);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [pathname, refresh]);

  useEffect(() => {
    const onChange = () => void refresh();
    window.addEventListener(JOBS_CHANGED, onChange);
    return () => window.removeEventListener(JOBS_CHANGED, onChange);
  }, [refresh]);

  const running = jobs.some(active);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [running, refresh]);

  async function dismiss(id: string) {
    dismissed.current.add(id);
    setJobs((js) => js.filter((j) => j.id !== id));
    await markSeen(id);
  }

  async function retry(job: JobView) {
    await dismiss(job.id);
    const source = job.document_id ? { documentId: job.document_id } : { noteId: job.note_id };
    await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...source, type: job.type }),
    }).catch(() => null);
    announceJobs();
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {jobs.length > 0 && (
        <section
          aria-label="Lavori in corso"
          className="fixed right-4 bottom-4 z-40 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2"
        >
          {jobs.map((j) => {
            const ratio = progressRatio(j);
            return (
              <div
                key={j.id}
                className={`flex flex-col gap-2 rounded-card border bg-raised p-3 text-sm shadow-[0_16px_40px_-24px_rgb(15_27_45/0.5)] ${
                  j.status === "error" ? "border-negative" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink">{j.title || "Documento"}</span>
                    <span className={`num block ${j.status === "error" ? "text-negative" : "text-muted"}`}>{phaseText(j)}</span>
                  </p>
                  {j.status === "done" && j.href && (
                    <Link href={j.href} onClick={() => dismiss(j.id)} className="btn-primary h-9 shrink-0 px-3 text-[14px]">
                      {openLabel(j.type)}
                    </Link>
                  )}
                  {!active(j) && (
                    <button
                      type="button"
                      onClick={() => dismiss(j.id)}
                      aria-label="Chiudi l'avviso"
                      className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-active hover:text-ink"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </div>
                {active(j) && (
                  <div
                    role="progressbar"
                    aria-label={phaseText(j)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={ratio === null ? undefined : Math.round(ratio * 100)}
                    className="h-1.5 overflow-hidden rounded-full bg-rule"
                  >
                    <span
                      className={`block h-full rounded-full bg-accent transition-[width] duration-300 ${ratio === null ? "w-1/4 opacity-60" : ""}`}
                      style={ratio === null ? undefined : { width: `${Math.max(ratio * 100, 4)}%` }}
                    />
                  </div>
                )}
                {j.status === "error" &&
                  (j.type === "ingest" ? (
                    <Link href="/upload" onClick={() => dismiss(j.id)} className="btn-secondary self-start">
                      Carica di nuovo
                    </Link>
                  ) : (
                    (j.document_id || j.note_id) && (
                      <button type="button" onClick={() => retry(j)} className="btn-secondary self-start">
                        Riprova
                      </button>
                    )
                  ))}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
