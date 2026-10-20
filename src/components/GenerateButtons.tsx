"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { announceJobs, markSeen, waitForJob } from "@/lib/job-client";
import { Icon } from "./icons";
import { UpgradeNotice } from "./UpgradeNotice";

type Kind = "mindmap" | "flashcards" | "summary" | "quiz";
const PROGRESS: Record<Kind, string> = {
  mindmap: "Sto creando la mappa…",
  flashcards: "Sto creando le flashcard…",
  summary: "Sto scrivendo il riassunto…",
  quiz: "Sto preparando il quiz…",
};

export function GenerateButtons({ source }: { source: { documentId: string } | { noteId: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [problem, setProblem] = useState<{ message: string; upgrade: boolean } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

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
      announceJobs();
      const job = await waitForJob(json.jobId, () => alive.current);
      if (!job) return;
      await markSeen(job.id);
      announceJobs();
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
