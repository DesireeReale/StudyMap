import Link from "next/link";
import type { ReactNode } from "react";
import { TimerCell } from "./StudyTimer";

export type DockData = {
  deck: { id: string; title: string; known: number; total: number } | null;
  toReview: number;
  examDays: number | null;
  examDate: string | null;
};

function Cell({ tone, label, children, wide = false }: { tone: 1 | 2 | 3; label?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`study-cell ${wide ? "lg:col-span-2" : ""}`} style={{ "--cell": `var(--dock-tile-${tone})` } as React.CSSProperties}>
      {label && <p className="text-[13px] opacity-80">{label}</p>}
      {children}
    </div>
  );
}

const big = "num font-mono text-[28px] leading-none";

export function StudyDock({ data }: { data: DockData }) {
  const { deck, toReview, examDays, examDate } = data;
  const pct = deck && deck.total ? Math.round((deck.known / deck.total) * 100) : 0;

  return (
    <section aria-label="Il tuo studio di oggi" className="study-strip grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Cell tone={1} label="Ripasso di oggi">
        <p className={big}>
          {toReview} <span className="font-sans text-[15px]">{toReview === 1 ? "carta" : "carte"}</span>
        </p>
        {deck ? (
          <Link href={`/decks/${deck.id}`} className="truncate text-[13px] underline-offset-4 hover:underline">
            {deck.title} · {pct}% delle carte che sai
          </Link>
        ) : (
          <p className="text-[13px] opacity-80">Genera un mazzo da un documento</p>
        )}
      </Cell>

      <Cell tone={2} label="All'esame">
        {examDays === null ? (
          <Link href="/settings#esame" className="text-[15px] font-bold underline underline-offset-4">
            Imposta la data
          </Link>
        ) : (
          <>
            <p className={big}>
              {Math.max(examDays, 0)}{" "}
              <span className="font-sans text-[15px]">
                {examDays < 0 ? "esame passato" : examDays === 0 ? "è oggi" : examDays === 1 ? "giorno" : "giorni"}
              </span>
            </p>
            {examDate && (
              <p className="text-[13px] opacity-80">
                {new Date(`${examDate}T12:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}
              </p>
            )}
          </>
        )}
      </Cell>

      <Cell tone={3} wide>
        <TimerCell />
      </Cell>
    </section>
  );
}
