import Link from "next/link";
import type { ReactNode } from "react";
import { StudyTimer } from "./StudyTimer";

export type DockData = {
  deck: { title: string; known: number; total: number } | null;
  toReview: number;
  examDays: number | null;
  lastMap: { id: string; title: string } | null;
  generations: { used: number; limit: number };
};

function Tile({ tone, label, children }: { tone: 1 | 2 | 3 | 4; label: string; children: ReactNode }) {
  return (
    <div
      className="flex min-h-[116px] flex-col justify-between gap-3 rounded-row p-3 text-dock-ink"
      style={{ "--tile": `var(--dock-tile-${tone})`, background: "var(--tile)" } as React.CSSProperties}
    >
      <p className="text-[13px] text-dock-muted">{label}</p>
      {children}
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className="shrink-0 -rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth="6" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="var(--dock-accent)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
      />
    </svg>
  );
}

const big = "num font-mono text-[26px] leading-none";

export function StudyDock({ data }: { data: DockData }) {
  const { deck, toReview, examDays, lastMap, generations } = data;
  const pct = deck && deck.total ? deck.known / deck.total : 0;

  return (
    <section
      aria-label="Il tuo studio di oggi"
      className="grid grid-cols-2 gap-2 rounded-card border border-dock-line bg-dock p-2 sm:grid-cols-3 lg:grid-cols-6"
    >
      <Tile tone={1} label={deck ? deck.title : "Mazzo"}>
        <div className="flex items-center gap-2">
          <Ring value={pct} />
          <p className={big}>
            {Math.round(pct * 100)}
            <span className="text-[15px]">%</span>
            <span className="sr-only"> delle carte che sai</span>
          </p>
        </div>
      </Tile>

      <Tile tone={2} label="Da ripassare">
        <p className={big}>
          {toReview}
          <span className="block pt-1 font-sans text-[13px] text-dock-muted">{toReview === 1 ? "carta" : "carte"}</span>
        </p>
      </Tile>

      <Tile tone={3} label="All'esame">
        {examDays === null ? (
          <Link href="/settings#esame" className="text-[15px] font-bold underline underline-offset-4">
            Imposta la data
          </Link>
        ) : (
          <p className={big}>
            {Math.max(examDays, 0)}
            <span className="block pt-1 font-sans text-[13px] text-dock-muted">
              {examDays < 0 ? "esame passato" : examDays === 0 ? "è oggi" : examDays === 1 ? "giorno" : "giorni"}
            </span>
          </p>
        )}
      </Tile>

      <Tile tone={4} label="Studio · 25 minuti">
        <StudyTimer />
      </Tile>

      <Tile tone={1} label="Riprendi">
        {lastMap ? (
          <Link href={`/maps/${lastMap.id}`} className="line-clamp-2 text-[15px] leading-snug font-bold underline-offset-4 hover:underline">
            {lastMap.title}
          </Link>
        ) : (
          <p className="text-[15px] leading-snug">Nessuna mappa ancora</p>
        )}
      </Tile>

      <Tile tone={2} label="Generazioni AI">
        <p className={big}>
          {generations.used}
          <span className="text-[15px] text-dock-muted"> / {generations.limit}</span>
        </p>
      </Tile>
    </section>
  );
}
