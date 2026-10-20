"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { HEART_FAILURE, MapArt } from "./MapArt";

const TOOLS: { id: string; tab: string; title: string; text: string; points: string[]; shot: ReactNode }[] = [
  {
    id: "mappa",
    tab: "Mappa",
    title: "Mappe che si leggono",
    text: "Un ramo, un colore. I concetti sono collegati da relazioni scritte e puoi riordinarli come vuoi.",
    points: ["Concetti e relazioni in italiano", "Rinomini, sposti, colori e colleghi", "Export PNG, Markdown e OPML"],
    shot: <MapArt data={HEART_FAILURE} className="bg-transparent!" />,
  },
  {
    id: "flashcard",
    tab: "Flashcard",
    title: "Flashcard che tornano al momento giusto",
    text: "Rispondi so o non so: le carte difficili tornano prima, quelle facili più avanti.",
    points: ["Ripetizione dilazionata", "Carte modificabili a mano", "Export CSV e Anki"],
    shot: (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 rounded-card border border-border bg-sheet p-6 text-center">
          <span className="text-xs tracking-wider text-muted uppercase">Domanda</span>
          <span className="font-display text-[22px] leading-snug font-bold">
            Quale aumento di peso in tre giorni va segnalato?
          </span>
          <span className="border-t-2 border-accent-soft pt-3 text-[17px]">Più di 2 kg</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center font-bold">
          <span className="rounded-row bg-pill-negative py-2.5 text-pill-negative-ink">Non lo so</span>
          <span className="rounded-row bg-pill-positive py-2.5 text-pill-positive-ink">Lo so</span>
        </div>
      </div>
    ),
  },
  {
    id: "quiz",
    tab: "Quiz",
    title: "Quiz con le spiegazioni",
    text: "Ogni risposta ha il suo perché, così capisci dove hai sbagliato.",
    points: ["Scelta multipla, vero o falso, completamento", "Spiegazione dopo ogni risposta", "Domande generate dal tuo materiale"],
    shot: (
      <div className="flex flex-col gap-2.5">
        <span className="text-sm text-muted">Domanda 4 di 10</span>
        <strong className="font-display text-[19px]">Quale farmaco riduce il precarico?</strong>
        {["Digossina", "Furosemide", "Amiodarone"].map((o, i) => (
          <span
            key={o}
            className={`flex items-center gap-3 rounded-row border px-3.5 py-2.5 ${
              i === 1 ? "border-positive bg-pill-positive text-pill-positive-ink" : "border-border bg-sheet"
            }`}
          >
            <b className="num grid size-6 shrink-0 place-items-center rounded-md bg-active text-sm text-ink">{i + 1}</b>
            {o}
          </span>
        ))}
        <p className="border-l-3 border-positive pl-2.5 text-[15px] text-muted">
          Il diuretico riduce il volume circolante e quindi il precarico.
        </p>
      </div>
    ),
  },
  {
    id: "riassunto",
    tab: "Riassunto",
    title: "Riassunti divisi per argomento",
    text: "Il materiale diventa un appunto in sezioni brevi, che puoi correggere e da cui generare altro.",
    points: ["Sezioni con titoli e punti chiave", "Modificabile come una nota", "Export in testo"],
    shot: (
      <div className="flex flex-col gap-2 rounded-row border border-border bg-sheet p-5">
        <h4 className="font-display text-[17px] font-bold">Segni e sintomi</h4>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px]">
          <li>La dispnea compare prima sotto sforzo, poi a riposo.</li>
          <li>L&apos;ortopnea costringe a dormire con più cuscini.</li>
          <li>Negli arti inferiori si formano edemi declivi.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "chiedi",
    tab: "Chiedi al documento",
    title: "Chiedi al documento",
    text: "Fai una domanda sul tuo materiale e ricevi la risposta con le pagine da cui viene.",
    points: ["Risposte dal tuo documento", "Numeri di pagina citati", "Conversazioni salvate"],
    shot: (
      <div className="flex flex-col gap-2.5">
        <p className="max-w-[85%] self-end rounded-card bg-primary px-4 py-2.5 text-on-primary">
          Che differenza c&apos;è tra scompenso destro e sinistro?
        </p>
        <p className="max-w-[85%] rounded-card border border-border bg-sheet px-4 py-2.5">
          Nel sinistro prevalgono i sintomi polmonari, come dispnea e ortopnea; nel destro la congestione sistemica,
          con edemi ed epatomegalia. <span className="num text-sm font-bold text-accent">pagine 4, 6</span>
        </p>
      </div>
    ),
  },
];

export function ToolTabs() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const tool = TOOLS[active]!;

  function onKeyDown(e: KeyboardEvent) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const next = e.key === "Home" ? 0 : e.key === "End" ? TOOLS.length - 1 : (active + step + TOOLS.length) % TOOLS.length;
    if (!step && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Strumenti" className="flex flex-wrap gap-2" onKeyDown={onKeyDown}>
        {TOOLS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-controls="tool-panel"
            aria-selected={i === active}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={`min-h-11 cursor-pointer rounded-full border px-4 text-[16px] font-bold transition-colors duration-150 ${
              i === active ? "border-ink bg-ink text-sheet" : "border-border bg-sheet text-ink hover:border-control"
            }`}
          >
            {t.tab}
          </button>
        ))}
      </div>
      <div
        id="tool-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tool.id}`}
        className="grid items-center gap-8 rounded-card border border-border bg-sheet p-5 md:p-9 lg:grid-cols-[2fr_3fr]"
      >
        <div className="flex flex-col gap-3">
          <h3 className="text-[26px] leading-tight font-semibold">{tool.title}</h3>
          <p className="text-[clamp(18px,1.6vw,20px)] text-muted">{tool.text}</p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {tool.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="flex min-h-[280px] min-w-0 flex-col justify-center rounded-row border border-border bg-chrome p-[18px]">
          {tool.shot}
        </div>
      </div>
    </div>
  );
}
