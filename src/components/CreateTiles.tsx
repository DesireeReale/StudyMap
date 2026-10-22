"use client";

import Link from "next/link";
import { useState } from "react";
import { type Kind, PROGRESS, useGenerate, WAIT_HINT } from "./GenerateButtons";
import { Icon } from "./icons";
import { UpgradeNotice } from "./UpgradeNotice";

export type Made = { href: string; title: string };

const TILES: { kind: Kind; title: string; text: string; icon: "note" | "map" | "cards" | "check"; count: [string, string] }[] = [
  { kind: "summary", title: "Riassunto", text: "Il testo in breve, con le pagine da cui viene.", icon: "note", count: ["riassunto", "riassunti"] },
  { kind: "mindmap", title: "Mappa concettuale", text: "I concetti e come si collegano.", icon: "map", count: ["mappa", "mappe"] },
  { kind: "flashcards", title: "Flashcard", text: "Domanda e risposta, per ripassare.", icon: "cards", count: ["mazzo", "mazzi"] },
  { kind: "quiz", title: "Quiz", text: "Mettiti alla prova con domande vere.", icon: "check", count: ["quiz", "quiz"] },
];

export function CreateTiles({
  documentId,
  chapters,
  made,
  summaryAnchor,
}: {
  documentId: string;
  chapters: number;
  made: Record<Kind, Made[]>;
  summaryAnchor: string;
}) {
  const { busy, problem, generate } = useGenerate({ documentId });
  const [perChapter, setPerChapter] = useState(false);

  return (
    <section aria-labelledby="create-title" className="flex flex-col gap-3">
      <h2 id="create-title" className="text-sm font-bold text-muted">
        Crea da questo documento
      </h2>
      <ul className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
        {TILES.map((t, i) => {
          const items = made[t.kind];
          const latest = items[0];
          const running = busy === t.kind;
          const name = t.title.toLowerCase();
          return (
            <li key={t.kind} className="create-tile flex flex-col gap-2 p-3 sm:gap-2.5 sm:p-4" data-lead={t.kind === "summary" && !latest ? "" : undefined}>
              <div className="flex items-start justify-between gap-2">
                <span className="create-tile-icon flex size-[42px] items-center justify-center" data-tone={i + 1}>
                  <Icon name={t.icon} />
                </span>
                {running ? (
                  <span className="spinner animate-spin" aria-hidden="true" />
                ) : (
                  items.length > 0 && (
                    <span className="num text-[13px] text-muted">
                      {items.length} {t.count[items.length === 1 ? 0 : 1]}
                    </span>
                  )
                )}
              </div>
              <h3 className="text-[17px] font-bold">{t.title}</h3>
              <p className="flex-1 text-[13px] leading-snug text-muted sm:text-sm">{t.text}</p>
              {t.kind === "mindmap" && chapters > 1 && (
                <fieldset className="flex flex-col text-[13px]" disabled={!!busy}>
                  <legend className="sr-only">Quante mappe creare</legend>
                  <label className="flex min-h-8 cursor-pointer items-center gap-2">
                    <input type="radio" name="map-count" checked={!perChapter} onChange={() => setPerChapter(false)} className="size-[18px] accent-[var(--accent)]" />
                    Una mappa
                  </label>
                  <label className="flex min-h-8 cursor-pointer items-center gap-2">
                    <input type="radio" name="map-count" checked={perChapter} onChange={() => setPerChapter(true)} className="size-[18px] accent-[var(--accent)]" />
                    Una per capitolo ({chapters}) e una generale
                  </label>
                </fieldset>
              )}
              {items.length > 1 && (
                <details className="text-[13px]">
                  <summary className="flex min-h-8 cursor-pointer items-center font-bold">Elenco completo ({items.length})</summary>
                  <ul className="flex flex-col">
                    {items.map((m) => (
                      <li key={m.href}>
                        <Link href={m.href} className="block truncate py-1.5 underline-offset-2 hover:underline">
                          {m.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {running ? (
                <button type="button" className="btn-secondary h-[34px] w-full text-sm" disabled>
                  In corso…
                </button>
              ) : latest ? (
                <>
                  <Link href={t.kind === "summary" ? summaryAnchor : latest.href} aria-label={t.kind === "summary" ? "Leggi sotto il riassunto" : `Apri ${name}`} className="btn-secondary h-[34px] w-full text-sm">
                    {t.kind === "summary" ? "Leggi sotto" : "Apri"}
                  </Link>
                  <button type="button" className="btn-ghost h-[34px] w-full text-sm font-normal text-muted" aria-label={`Crea di nuovo: ${name}`} disabled={!!busy} onClick={() => generate(t.kind, perChapter)}>
                    Crea di nuovo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={`${t.kind === "summary" ? "btn-primary" : "btn-secondary"} h-[34px] w-full text-sm`}
                  aria-label={`Crea ${name}`}
                  disabled={!!busy}
                  onClick={() => generate(t.kind, perChapter)}
                >
                  Crea
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="text-sm text-muted empty:hidden">
        {busy ? `${PROGRESS[busy]} ${WAIT_HINT}` : ""}
      </p>
      {problem && <UpgradeNotice message={problem.message} upgrade={problem.upgrade} />}
    </section>
  );
}
