"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UpgradeNotice } from "./UpgradeNotice";

type Kind = "mindmap" | "flashcards";

export function GenerateButtons({ documentId }: { documentId: string }) {
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
        body: JSON.stringify({ documentId, type }),
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" disabled={!!busy} onClick={() => generate("mindmap")}>
          {busy === "mindmap" ? "Creo la mappa…" : "Genera mappa concettuale"}
        </button>
        <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => generate("flashcards")}>
          {busy === "flashcards" ? "Creo le flashcard…" : "Genera flashcard"}
        </button>
      </div>
      <p aria-live="polite" className="text-sm text-muted">
        {busy ? "Può richiedere fino a un minuto per i documenti lunghi." : ""}
      </p>
      {problem && <UpgradeNotice message={problem.message} upgrade={problem.upgrade} />}
    </div>
  );
}
