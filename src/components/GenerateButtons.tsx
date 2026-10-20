"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icons";
import { UpgradeNotice } from "./UpgradeNotice";

type Kind = "mindmap" | "flashcards" | "summary" | "quiz";

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
      router.push(json.href);
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
          {busy === "summary" ? "Scrivo il riassunto…" : "Riassunto"}
        </button>
        <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => generate("quiz")}>
          <Icon name="check" />
          {busy === "quiz" ? "Preparo il quiz…" : "Quiz"}
        </button>
        <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => generate("flashcards")}>
          <Icon name="cards" />
          {busy === "flashcards" ? "Creo le flashcard…" : "Genera flashcard"}
        </button>
        <button type="button" className="btn-primary" disabled={!!busy} onClick={() => generate("mindmap")}>
          <Icon name="map" />
          {busy === "mindmap" ? "Creo la mappa…" : "Genera mappa concettuale"}
        </button>
      </div>
      <p aria-live="polite" className="text-sm text-muted empty:hidden">
        {busy ? "Può richiedere fino a un minuto per i documenti lunghi." : ""}
      </p>
      {problem && <UpgradeNotice message={problem.message} upgrade={problem.upgrade} />}
    </div>
  );
}
