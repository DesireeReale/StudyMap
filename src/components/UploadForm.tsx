"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_NOTE_CHARS } from "@/core/files";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "./icons";
import { UpgradeNotice } from "./UpgradeNotice";

const ACCEPT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};
const EXTENSIONS = new Set(Object.values(ACCEPT));
const LEGACY = /\.(doc|ppt)$/i;
const UNSUPPORTED = "Formato non supportato: carica PDF, Word (.docx), PowerPoint (.pptx), PNG, JPEG o WebP.";

function fileExtension(file: File): string | undefined {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  return ACCEPT[file.type] ?? (fromName && EXTENSIONS.has(fromName) ? fromName : undefined);
}

const MIME_OF = Object.fromEntries(Object.entries(ACCEPT).map(([mime, ext]) => [ext, mime]));

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
  const [ext, setExt] = useState<string>();
  const [fileName, setFileName] = useState<string>();
  const [figures, setFigures] = useState(false);

  async function submit(body: Record<string, string | boolean>) {
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
      const ext = fileExtension(file);
      if (!ext) {
        const message = LEGACY.test(file.name) ? "Questo è un vecchio file .doc o .ppt: aprilo e salvalo come .docx, .pptx oppure PDF." : UNSUPPORTED;
        return setProblem({ message, upgrade: false });
      }
      if (file.size > maxUploadBytes) {
        return setProblem({
          message: `Il file supera ${Math.round(maxUploadBytes / 1024 / 1024)} MB.`,
          upgrade: true,
        });
      }
      const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabaseBrowser()
        .storage.from("documents")
        .upload(storagePath, file, { contentType: MIME_OF[ext] });
      if (error) return setProblem({ message: "Caricamento non riuscito. Riprova.", upgrade: false });
      await submit({ kind: "file", title: title || file.name.replace(/\.[^.]+$/, ""), storagePath, folderId, figures: ext !== "png" && ext !== "jpg" && ext !== "webp" && figures });
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
            {m === "file" ? "File" : "Testo o appunti"}
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
          <div className="relative flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-accent bg-accent-soft p-6 text-center transition-colors duration-150 hover:bg-active has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]">
            <Icon name="upload" size={32} className="text-accent" />
            <span className="text-[17px] font-bold text-ink">
              {fileName ?? "Trascina qui il file, oppure fai clic per sceglierlo"}
            </span>
            <span className="text-[13px] text-muted">
              {fileName ? "Fai clic per cambiarlo" : "Funziona anche con le foto degli appunti"}
            </span>
            <input
              id="upload-file"
              name="file"
              type="file"
              required
              accept={[...Object.keys(ACCEPT), ".docx", ".pptx"].join(",")}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                const chosen = file ? fileExtension(file) : undefined;
                setFileName(file?.name);
                setExt(chosen);
                setFigures(chosen === "pptx" || chosen === "docx");
              }}
              aria-describedby="upload-file-help"
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              data-testid="file-input"
            />
          </div>
          <p id="upload-file-help" className="text-[13px] text-muted">
            PDF, Word, PowerPoint, PNG, JPEG o WebP, fino a {Math.round(maxUploadBytes / 1024 / 1024)} MB.
          </p>
          {(ext === "pdf" || ext === "docx" || ext === "pptx") && (
            <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-row border border-border bg-sheet p-3">
              <input
                type="checkbox"
                name="figures"
                checked={figures}
                onChange={(e) => setFigures(e.currentTarget.checked)}
                className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
                aria-describedby="upload-figures-help"
              />
              <span>
                <span className="block font-bold">Leggi anche immagini, schemi e formule</span>
                <span id="upload-figures-help" className="block text-[13px] text-muted">
                  L&apos;AI descrive grafici, formule e disegni, così finiscono anche in riassunto, flashcard e quiz. Il
                  caricamento richiede più tempo.
                  {ext === "pptx" &&
                    " Le forme disegnate direttamente in PowerPoint non si leggono: per quelle esporta le slide in PDF e carica il PDF."}
                </span>
              </span>
            </label>
          )}
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
