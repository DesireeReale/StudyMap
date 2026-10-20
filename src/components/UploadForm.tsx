"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_NOTE_CHARS } from "@/core/files";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { UpgradeNotice } from "./UpgradeNotice";

const ACCEPT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

type Problem = { message: string; upgrade: boolean };

export function UploadForm({
  userId,
  maxUploadBytes,
  folders,
  initialFolder,
  initialMode = "file",
}: {
  userId: string;
  maxUploadBytes: number;
  folders: { id: string; name: string; depth: number }[];
  initialFolder?: string;
  initialMode?: "file" | "text";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"file" | "text">(initialMode);
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
    router.push(json.href);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProblem(null);
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title")).trim();
    const folderId = String(form.get("folder") ?? "");
    setBusy(true);
    try {
      if (mode === "text") {
        await submit({ kind: "text", title, text: String(form.get("text")), folderId });
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
      await submit({ kind: "file", title: title || file.name.replace(/\.[^.]+$/, ""), storagePath, folderId });
    } catch {
      setProblem({ message: "Errore di rete. Riprova.", upgrade: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel flex flex-col gap-4" aria-busy={busy}>
      <fieldset className="flex w-fit gap-1 rounded-full bg-sheet p-1">
        <legend className="sr-only">Tipo di materiale</legend>
        {(["file", "text"] as const).map((m) => (
          <label
            key={m}
            className={`flex h-9 cursor-pointer items-center rounded-full px-4 text-[15px] transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${
              mode === m ? "bg-primary font-bold text-on-primary" : "text-muted hover:text-ink"
            }`}
          >
            <input
              type="radio"
              name="mode"
              value={m}
              checked={mode === m}
              onChange={() => setMode(m)}
              className="sr-only"
            />
            {m === "file" ? "PDF o immagine" : "Testo o appunti"}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="upload-folder" className="label">
          Cartella
        </label>
        <select id="upload-folder" name="folder" defaultValue={initialFolder} className="field">
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {"\u00a0\u00a0\u00a0".repeat(f.depth) + f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="upload-title" className="label">
          Titolo{mode === "file" && <span className="font-normal text-muted"> (facoltativo)</span>}
        </label>
        <input id="upload-title" name="title" required={mode === "text"} maxLength={200} className="field" />
      </div>

      {mode === "file" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="upload-file" className="label">
            File
          </label>
          <input
            id="upload-file"
            name="file"
            type="file"
            required
            accept={Object.keys(ACCEPT).join(",")}
            aria-describedby="upload-file-help"
            className="field h-auto py-2 file:mr-3 file:h-8 file:cursor-pointer file:rounded-full file:border-0 file:bg-secondary file:px-4 file:font-bold file:text-ink"
            data-testid="file-input"
          />
          <p id="upload-file-help" className="text-[13px] text-muted">
            PDF, PNG, JPEG o WebP, fino a {Math.round(maxUploadBytes / 1024 / 1024)} MB.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor="upload-text" className="label">
            Testo
          </label>
          <textarea
            id="upload-text"
            name="text"
            required
            minLength={20}
            maxLength={MAX_NOTE_CHARS}
            rows={10}
            aria-describedby="upload-text-help"
            className="field h-auto py-2 leading-relaxed"
          />
          <p id="upload-text-help" className="text-[13px] text-muted">
            Diventa un appunto che puoi modificare quando vuoi e da cui generare mappa e flashcard.
          </p>
        </div>
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
