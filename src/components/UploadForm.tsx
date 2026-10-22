"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MAX_NOTE_CHARS } from "@/core/files";
import { announceJobs, markSeen, uploadWithProgress, waitForJob } from "@/lib/job-client";
import type { Pdf } from "@/lib/pdf-browser";
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
type PdfInfo = { pdf: Pdf; scanned: boolean[] };

const readPdf = async (file: File): Promise<PdfInfo> => {
  const { openPdf, scannedPages } = await import("@/lib/pdf-browser");
  const pdf = await openPdf(await file.arrayBuffer());
  return { pdf, scanned: await scannedPages(pdf) };
};
type Source = "document" | "photo" | "text";

const SOURCES: { id: Source; title: string; text: string; icon: "file" | "upload" | "note" }[] = [
  { id: "document", title: "Documento", text: "PDF, Word o PowerPoint", icon: "file" },
  { id: "photo", title: "Foto degli appunti", text: "Scatta o scegli una foto", icon: "upload" },
  { id: "text", title: "Testo incollato", text: "Appunti scritti o copiati", icon: "note" },
];
const DOCUMENT_ACCEPT = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".pdf",
  ".docx",
  ".pptx",
].join(",");
const PHOTO_ACCEPT = "image/png,image/jpeg,image/webp";
const CREATE = [
  { id: "mindmap", label: "Mappa" },
  { id: "flashcards", label: "Flashcard" },
  { id: "quiz", label: "Quiz" },
  { id: "summary", label: "Riassunto" },
] as const;

export function UploadForm({
  userId,
  maxUploadBytes,
  maxPdfPages,
  folders,
  initialFolder,
  initialMode = "file",
}: {
  userId: string;
  maxUploadBytes: number;
  maxPdfPages: number;
  folders: { id: string; name: string; depth: number }[];
  initialFolder?: string;
  initialMode?: "file" | "text";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Source>(initialMode === "text" ? "text" : "document");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [ext, setExt] = useState<string>();
  const [fileName, setFileName] = useState<string>();
  const [figures, setFigures] = useState(false);
  const [uploaded, setUploaded] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [range, setRange] = useState({ from: 1, to: 1 });
  const [preparing, setPreparing] = useState<{ done: number; total: number } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function submit(body: Record<string, string | boolean | string[]>) {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return setProblem({ message: json.error, upgrade: json.upgrade });
    if (json.href) {
      if (json.jobs) announceJobs();
      return router.push(json.href);
    }
    announceJobs();
    setReading(true);
    const job = await waitForJob(json.jobId, () => alive.current);
    if (!job) return;
    await markSeen(job.id);
    announceJobs();
    setReading(false);
    if (job.status === "done" && job.href) return router.push(job.href);
    setProblem({ message: job.error ?? "Non è stato possibile leggere il file.", upgrade: false });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProblem(null);
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title")).trim();
    const folderId = String(form.get("folder") ?? "");
    const create = form.getAll("create").map(String);
    setBusy(true);
    try {
      if (mode === "text") {
        await submit({ kind: "text", title, text: String(form.get("text")), folderId, create });
        return;
      }
      const file = form.get("file");
      if (!(file instanceof File) || !file.size) return setProblem({ message: "Scegli un file.", upgrade: false });
      const ext = fileExtension(file);
      if (!ext) {
        const message = LEGACY.test(file.name) ? "Questo è un vecchio file .doc o .ppt: aprilo e salvalo come .docx, .pptx oppure PDF." : UNSUPPORTED;
        return setProblem({ message, upgrade: false });
      }
      let upload: File = file;
      let pageRange = {};
      if (ext === "pdf") {
        const info = pdfInfo ?? (await readPdf(file));
        const count = info.scanned.length;
        const { from, to } = pdfInfo ? range : { from: 1, to: Math.min(count, maxPdfPages) };
        if (!(from >= 1 && to <= count && from <= to))
          return setProblem({ message: `Scegli pagine tra 1 e ${count}, con la prima non dopo l'ultima.`, upgrade: false });
        if (to - from + 1 > maxPdfPages)
          return setProblem({ message: `Il tuo piano legge al massimo ${maxPdfPages} pagine per file: riduci l'intervallo.`, upgrade: true });
        if (info.scanned.slice(from - 1, to).every(Boolean)) {
          const { rebuildAsJpeg } = await import("@/lib/pdf-browser");
          const blob = await rebuildAsJpeg(info.pdf, { from, to }, (done, total) => setPreparing({ done, total }));
          setPreparing(null);
          upload = new File([blob], file.name, { type: "application/pdf" });
        } else if (from !== 1 || to !== count) pageRange = { pageFrom: from, pageTo: to };
      }
      if (upload.size > maxUploadBytes) {
        return setProblem({
          message: `Il file supera ${Math.round(maxUploadBytes / 1024 / 1024)} MB.`,
          upgrade: true,
        });
      }
      const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { data: signed, error } = await supabaseBrowser().storage.from("documents").createSignedUploadUrl(storagePath);
      setUploaded(0);
      const ok =
        !error &&
        (await uploadWithProgress(signed.signedUrl, upload, MIME_OF[ext]!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, setUploaded));
      setUploaded(null);
      if (!ok) return setProblem({ message: "Caricamento non riuscito. Riprova.", upgrade: false });
      await submit({ kind: "file", title: title || file.name.replace(/\.[^.]+$/, ""), storagePath, folderId, figures: ext !== "png" && ext !== "jpg" && ext !== "webp" && figures, create, ...pageRange });
    } catch {
      setProblem({ message: "Errore di rete. Riprova.", upgrade: false });
    } finally {
      setPreparing(null);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel flex flex-col gap-4" aria-busy={busy}>
      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-2">Cosa carichi?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SOURCES.map((src) => (
            <label
              key={src.id}
              className="flex cursor-pointer items-center gap-3 rounded-row border-2 border-border bg-sheet p-3.5 transition-colors duration-150 hover:border-control has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] sm:flex-col sm:items-start"
            >
              <input
                type="radio"
                name="mode"
                value={src.id}
                checked={mode === src.id}
                onChange={() => {
                  setMode(src.id);
                  setFileName(undefined);
                  setExt(undefined);
                }}
                className="sr-only"
              />
              <Icon name={src.icon} size={24} className="shrink-0 text-accent" />
              <span>
                <span className="block font-bold text-ink">{src.title}</span>
                <span className="block text-[13px] text-muted">{src.text}</span>
              </span>
            </label>
          ))}
        </div>
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
          Titolo{mode !== "text" && <span className="font-normal text-muted"> (facoltativo)</span>}
        </label>
        <input id="upload-title" name="title" required={mode === "text"} maxLength={200} className="field" />
      </div>

      {mode !== "text" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="upload-file" className="label">
            File
          </label>
          <div className="relative flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-accent bg-accent-soft p-6 text-center transition-colors duration-150 hover:bg-active has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]">
            <Icon name="upload" size={32} className="text-accent" />
            <span className="text-[17px] font-bold text-ink">
              {fileName ??
                (mode === "photo"
                  ? "Scatta una foto o sceglila dalla galleria"
                  : "Trascina qui il file, oppure fai clic per sceglierlo")}
            </span>
            <span className="text-[13px] text-muted">
              {fileName ? "Fai clic per cambiarlo" : mode === "photo" ? "Una pagina per foto, ben illuminata" : "PDF, Word o PowerPoint"}
            </span>
            <input
              id="upload-file"
              name="file"
              type="file"
              required
              accept={mode === "photo" ? PHOTO_ACCEPT : DOCUMENT_ACCEPT}
              {...(mode === "photo" ? { capture: "environment" as const } : {})}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                const chosen = file ? fileExtension(file) : undefined;
                setFileName(file?.name);
                setExt(chosen);
                setFigures(chosen === "pptx" || chosen === "docx");
                setPdfInfo(null);
                if (file && chosen === "pdf")
                  readPdf(file)
                    .then((info) => {
                      setPdfInfo(info);
                      setRange({ from: 1, to: Math.min(info.scanned.length, maxPdfPages) });
                    })
                    .catch(() => setPdfInfo(null));
              }}
              aria-describedby="upload-file-help"
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              data-testid="file-input"
            />
          </div>
          <p id="upload-file-help" className="text-[13px] text-muted">
            {mode === "photo" ? "PNG, JPEG o WebP" : "PDF, Word (.docx) o PowerPoint (.pptx)"}, fino a{" "}
            {Math.round(maxUploadBytes / 1024 / 1024)} MB.
          </p>
          {ext === "pdf" && pdfInfo && (
            <fieldset className="mt-2 flex flex-col gap-2 rounded-row border border-border bg-sheet p-3">
              <legend className="sr-only">Pagine da leggere</legend>
              <div className="flex flex-wrap items-center gap-2 text-[15px]">
                <label htmlFor="upload-from">Dalla pagina</label>
                <input
                  id="upload-from"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={pdfInfo.scanned.length}
                  value={range.from}
                  onChange={(e) => setRange({ ...range, from: Number(e.currentTarget.value) })}
                  aria-describedby="upload-range-help"
                  className="field w-24"
                />
                <label htmlFor="upload-to">alla pagina</label>
                <input
                  id="upload-to"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={pdfInfo.scanned.length}
                  value={range.to}
                  onChange={(e) => setRange({ ...range, to: Number(e.currentTarget.value) })}
                  aria-describedby="upload-range-help"
                  className="field w-24"
                />
                <span className="num text-muted">di {pdfInfo.scanned.length}</span>
              </div>
              <p id="upload-range-help" className="text-[13px] text-muted">
                {pdfInfo.scanned.length > maxPdfPages && `Il tuo piano legge al massimo ${maxPdfPages} pagine per file: scegli quali. `}
                {pdfInfo.scanned.every(Boolean) &&
                  "Le pagine sono scansionate: prima di caricarle le comprimo sul tuo dispositivo, così il file pesa meno. Dopo la lettura potrai controllare il testo."}
              </p>
            </fieldset>
          )}
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

      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-1">Cosa vuoi creare?</legend>
        <p className="mb-1 text-[13px] text-muted">
          Li prepariamo subito dopo la lettura e li trovi nella stessa cartella. Puoi anche crearli dopo, dalla pagina del
          materiale.
        </p>
        <div className="flex flex-wrap gap-2">
          {CREATE.map((c) => (
            <label
              key={c.id}
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-[15px] text-muted hover:text-ink has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-bold has-[:checked]:text-ink has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]"
            >
              <input type="checkbox" name="create" value={c.id} className="peer sr-only" />
              <span aria-hidden="true" className="hidden text-positive peer-checked:inline">
                ✓
              </span>
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      {problem && <UpgradeNotice message={problem.message} upgrade={problem.upgrade} />}

      {preparing && (
        <div className="flex flex-col gap-1.5">
          <p className="num text-sm font-bold">
            Preparo le pagine scansionate: {preparing.done} di {preparing.total}
          </p>
          <div
            role="progressbar"
            aria-label="Preparazione delle pagine scansionate"
            aria-valuemin={0}
            aria-valuemax={preparing.total}
            aria-valuenow={preparing.done}
            className="h-2 overflow-hidden rounded-full bg-rule"
          >
            <span className="block h-full rounded-full bg-accent" style={{ width: `${(preparing.done / preparing.total) * 100}%` }} />
          </div>
        </div>
      )}
      {uploaded !== null && (
        <div className="flex flex-col gap-1.5">
          <p className="num text-sm font-bold">Caricamento del file: {Math.round(uploaded * 100)}%</p>
          <div
            role="progressbar"
            aria-label="Caricamento del file"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(uploaded * 100)}
            className="h-2 overflow-hidden rounded-full bg-rule"
          >
            <span className="block h-full rounded-full bg-accent" style={{ width: `${uploaded * 100}%` }} />
          </div>
        </div>
      )}
      {reading && (
        <p className="rounded-row bg-accent-soft px-4 py-3 text-sm text-ink">
          Sto leggendo il file. Puoi cambiare pagina: l&apos;avanzamento resta visibile in basso a destra.
        </p>
      )}

      <button type="submit" className="btn-primary self-start" disabled={busy}>
        {preparing ? "Preparazione…" : uploaded !== null ? "Caricamento…" : reading ? "Lettura in corso…" : busy ? "Elaborazione in corso…" : "Carica"}
      </button>
      <p aria-live="polite" className="sr-only">
        {preparing ? "Preparo le pagine scansionate" : uploaded !== null ? "Caricamento del file in corso" : reading ? "File caricato. Lo sto leggendo." : ""}
      </p>
    </form>
  );
}
