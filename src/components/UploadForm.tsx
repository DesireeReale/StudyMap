"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { UpgradeNotice } from "./UpgradeNotice";

const ACCEPT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

type Problem = { message: string; upgrade: boolean };

export function UploadForm({ userId, maxUploadBytes }: { userId: string; maxUploadBytes: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<"file" | "text">("file");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  async function submit(body: Record<string, string>) {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return setProblem({ message: json.error, upgrade: json.upgrade });
    router.push(`/documents/${json.id}`);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProblem(null);
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title")).trim();
    setBusy(true);
    try {
      if (mode === "text") {
        await submit({ kind: "text", title, text: String(form.get("text")) });
        return;
      }
      const file = form.get("file");
      if (!(file instanceof File) || !file.size) return setProblem({ message: "Scegli un file.", upgrade: false });
      const ext = ACCEPT[file.type];
      if (!ext) return setProblem({ message: "Formato non supportato: carica PDF, PNG, JPEG o WebP.", upgrade: false });
      if (file.size > maxUploadBytes) {
        return setProblem({
          message: `Il file supera ${Math.round(maxUploadBytes / 1024 / 1024)} MB.`,
          upgrade: true,
        });
      }
      const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabaseBrowser()
        .storage.from("documents")
        .upload(storagePath, file, { contentType: file.type });
      if (error) return setProblem({ message: "Caricamento non riuscito. Riprova.", upgrade: false });
      await submit({ kind: "file", title: title || file.name.replace(/\.[^.]+$/, ""), storagePath });
    } catch {
      setProblem({ message: "Errore di rete. Riprova.", upgrade: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-4" aria-busy={busy}>
      <fieldset className="flex gap-2">
        <legend className="sr-only">Tipo di materiale</legend>
        {(["file", "text"] as const).map((m) => (
          <label
            key={m}
            className={`btn cursor-pointer has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-accent ${mode === m ? "bg-brand text-white" : "border border-line"}`}
          >
            <input
              type="radio"
              name="mode"
              value={m}
              checked={mode === m}
              onChange={() => setMode(m)}
              className="sr-only"
            />
            {m === "file" ? "PDF o immagine" : "Testo"}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 font-bold">
        Titolo{mode === "file" && <span className="font-normal text-muted"> (facoltativo)</span>}
        <input name="title" required={mode === "text"} maxLength={200} className="field font-normal" />
      </label>

      {mode === "file" ? (
        <label className="flex flex-col gap-1 font-bold">
          File (PDF, PNG, JPEG, WebP)
          <input
            name="file"
            type="file"
            required
            accept={Object.keys(ACCEPT).join(",")}
            className="field font-normal"
            data-testid="file-input"
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 font-bold">
          Testo
          <textarea name="text" required minLength={20} rows={8} className="field font-normal" />
        </label>
      )}

      {problem && <UpgradeNotice message={problem.message} upgrade={problem.upgrade} />}

      <button type="submit" className="btn-primary self-start" disabled={busy}>
        {busy ? "Elaborazione in corso…" : "Carica"}
      </button>
      <p aria-live="polite" className="sr-only">
        {busy ? "Elaborazione del documento in corso" : ""}
      </p>
    </form>
  );
}
