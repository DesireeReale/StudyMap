"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icons";
import { UpgradeNotice } from "./UpgradeNotice";

type Kind = "mindmap" | "flashcards" | "summary" | "quiz";
type JobState = { status: "queued" | "running" | "done" | "error"; href: string | null; error: string | null };

const POLL_MS = 2000;
const PROGRESS: Record<Kind, string> = {
  mindmap: "Sto creando la mappa…",
  flashcards: "Sto creando le flashcard…",
  summary: "Sto scrivendo il riassunto…",
  quiz: "Sto preparando il quiz…",
};

async function waitForJob(jobId: string): Promise<JobState> {
  for (;;) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
    if (!res.ok) return { status: "error", href: null, error: "Non riesco a leggere lo stato della generazione. Ricarica la pagina." };
    const job = (await res.json()) as JobState;
    if (job.status === "done" || job.status === "error") return job;
  }
}

export function GenerateButtons({ source }: { source: { documentId: string } | { noteId: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [problem, setProblem] = useState<{ message: string; upgrade: boolean } | null>(null);

  async function generate(type: Kind) {
    setBusy(type);
    setProblem(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...source, type }),
      });
      const json = await res.json();
      if (!res.ok) return setProblem({ message: json.error, upgrade: json.upgrade });
      const job = await waitForJob(json.jobId);
      if (job.status === "error" || !job.href) {
        return setProblem({ message: job.error ?? "La generazione non è riuscita. Riprova.", upgrade: false });
      }
      router.push(job.href);
    } catch {
      setProblem({ message: "Errore di rete. Riprova.", upgrade: false });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex max-w-md flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => generate("summary")}>
          <Icon name="note" />
          {busy === "summary" ? PROGRESS.summary : "Riassunto"}
        </button>
        <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => generate("quiz")}>
          <Icon name="check" />
          {busy === "quiz" ? PROGRESS.quiz : "Quiz"}
        </button>
        <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => generate("flashcards")}>
          <Icon name="cards" />
          {busy === "flashcards" ? PROGRESS.flashcards : "Genera flashcard"}
        </button>
        <button type="button" className="btn-primary" disabled={!!busy} onClick={() => generate("mindmap")}>
          <Icon name="map" />
          {busy === "mindmap" ? PROGRESS.mindmap : "Genera mappa concettuale"}
        </button>
      </div>
      <p aria-live="polite" className="text-sm text-muted empty:hidden">
        {busy ? `${PROGRESS[busy]} Con i documenti lunghi può servire qualche minuto. Se cambi pagina il lavoro continua e il risultato compare nella cartella della materia.` : ""}
      </p>
      {problem && <UpgradeNotice message={problem.message} upgrade={problem.upgrade} />}
    </div>
  );
}
