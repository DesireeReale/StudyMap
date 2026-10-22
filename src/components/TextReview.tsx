"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { applyFixes, segments, type Segment } from "@/core/review";
import { announceJobs } from "@/lib/job-client";
import type { Pdf } from "@/lib/pdf-browser";

type Original = { url: string; kind: "pdf" | "image" };
type PageState = { index: number; text: string; fixes: string[]; whole: string | null };

const CREATE_LABEL: Record<string, string> = { mindmap: "mappa", flashcards: "flashcard", summary: "riassunto", quiz: "quiz" };

const initialFixes = (parts: Segment[]) => parts.filter((s) => s.kind !== "text").map((s) => (s.kind === "guess" ? s.text : ""));

function OriginalPage({ original, page, pdf }: { original: Original; page: number; pdf: () => Promise<Pdf> }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (original.kind !== "pdf") return;
    let live = true;
    (async () => {
      const { renderPage } = await import("@/lib/pdf-browser");
      const canvas = await renderPage(await pdf(), page + 1);
      canvas.className = "h-auto w-full";
      if (live) box.current?.replaceChildren(canvas);
    })().catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [original, page, pdf]);
  if (failed) return <p className="p-4 text-sm text-muted">Non riesco a mostrare la pagina originale.</p>;
  if (original.kind === "image")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={original.url} alt={`Pagina ${page + 1} originale`} className="h-auto w-full" />;
  return (
    <div ref={box} role="img" aria-label={`Pagina ${page + 1} originale`} className="min-h-40">
      <p className="p-4 text-sm text-muted">Carico la pagina…</p>
    </div>
  );
}

export function TextReview({
  documentId,
  title,
  original,
  pages: initial,
  create,
}: {
  documentId: string;
  title: string;
  original: Original | null;
  pages: { index: number; text: string }[];
  create: string[];
}) {
  const router = useRouter();
  const [pages, setPages] = useState<PageState[]>(() =>
    initial.map((p) => ({ ...p, fixes: initialFixes(segments(p.text)), whole: null })),
  );
  const [shown, setShown] = useState<Set<number>>(() => new Set(initial.slice(0, 1).map((p) => p.index)));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const pdfPromise = useRef<Promise<Pdf> | null>(null);
  const [loadPdf] = useState(() => () => {
    pdfPromise.current ??= (async () => {
      const { openPdf } = await import("@/lib/pdf-browser");
      return openPdf(await (await fetch(original!.url)).arrayBuffer());
    })();
    return pdfPromise.current;
  });

  const total = pages.reduce((n, p) => n + (p.whole === null ? p.fixes.length : 0), 0);
  const update = (index: number, change: (p: PageState) => PageState) =>
    setPages((all) => all.map((p) => (p.index === index ? change(p) : p)));
  const toggleOriginal = (index: number) =>
    setShown((s) => {
      const next = new Set(s);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  async function confirm() {
    setBusy(true);
    setProblem(null);
    const res = await fetch(`/api/documents/${documentId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pages: pages.map((p) => ({ index: p.index, text: p.whole ?? applyFixes(p.text, p.fixes) })) }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setProblem(json.error ?? "Salvataggio non riuscito: riprova.");
    }
    if (json.jobs) announceJobs();
    router.push(json.href);
  }

  let counter = 0;
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-tight font-bold">Controlla il testo</h1>
        <p className="max-w-[70ch] text-[17px] leading-relaxed">
          L&apos;AI ha letto <strong>{title}</strong> dalle immagini. Le parole{" "}
          <mark className="rounded bg-notice px-1 text-notice-ink">evidenziate</mark> sono quelle di cui non è sicura:
          confrontale con la pagina originale e correggile. Con il tasto Tab passi da una parola alla successiva. Anche
          le altre parole possono essere sbagliate: se ne trovi, usa &quot;Modifica tutto il testo&quot;.
        </p>
        <p className="text-[15px] text-muted">
          {total === 0 ? "Nessuna parola incerta da controllare." : `${total} parole incerte da controllare.`}
          {create.length > 0 && ` Dopo la conferma creo: ${create.map((c) => CREATE_LABEL[c] ?? c).join(", ")}.`}
        </p>
      </header>

      {pages.map((p) => {
        let k = 0;
        const open = !!original && shown.has(p.index);
        return (
          <section key={p.index} aria-labelledby={`page-${p.index}`} className="panel flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`page-${p.index}`} className="text-[20px] font-bold">
                Pagina {p.index + 1}
              </h2>
              <div className="flex flex-wrap gap-2">
                {original && (
                  <button type="button" className="btn-secondary" aria-expanded={open} onClick={() => toggleOriginal(p.index)}>
                    {open ? "Nascondi l'originale" : "Mostra l'originale"}
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  aria-pressed={p.whole !== null}
                  onClick={() => update(p.index, (s) => ({ ...s, whole: s.whole === null ? applyFixes(s.text, s.fixes) : null }))}
                >
                  Modifica tutto il testo
                </button>
              </div>
            </div>
            <div className={open ? "grid items-start gap-4 lg:grid-cols-2" : ""}>
              {open && (
                <div className="overflow-hidden rounded-row border border-border bg-white">
                  <OriginalPage original={original} page={p.index} pdf={loadPdf} />
                </div>
              )}
              {p.whole !== null ? (
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold">Testo della pagina {p.index + 1}</span>
                  <textarea
                    value={p.whole}
                    onChange={(e) => update(p.index, (s) => ({ ...s, whole: e.target.value }))}
                    rows={18}
                    className="reading rounded-row border border-control bg-sheet p-4 text-[18px] leading-[1.8]"
                  />
                </label>
              ) : (
                <div className="reading rounded-row bg-sheet p-4 text-[18px] leading-[2.2] whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {segments(p.text).map((s, i) => {
                    if (s.kind === "text") return <span key={i}>{s.text}</span>;
                    const n = k++;
                    const value = p.fixes[n] ?? "";
                    return (
                      <input
                        key={i}
                        value={value}
                        size={Math.max(8, value.length + 2)}
                        placeholder={s.kind === "unreadable" ? "illeggibile" : undefined}
                        aria-label={`Parola incerta ${++counter} di ${total}, pagina ${p.index + 1}: ${
                          s.kind === "guess" ? `l'AI ha letto "${s.text}"` : "l'AI non è riuscita a leggerla"
                        }`}
                        onChange={(e) =>
                          update(p.index, (st) => ({ ...st, fixes: st.fixes.map((f, j) => (j === n ? e.target.value : f)) }))
                        }
                        className="mx-0.5 rounded border-2 border-notice-border bg-notice px-1.5 py-0.5 font-bold text-notice-ink focus:outline-3 focus:outline-offset-2 focus:outline-accent"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {problem && (
        <p role="alert" className="text-negative">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={confirm} disabled={busy} aria-busy={busy}>
          {busy ? "Salvo…" : create.length ? "Conferma e crea" : "Conferma il testo"}
        </button>
        <p className="text-sm text-muted">Le parole lasciate vuote restano segnate come [illeggibile].</p>
      </div>
    </div>
  );
}
