"use client";

import { useEffect, useState } from "react";
import { isDue, schedule } from "@/core/srs";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Card = {
  id: string;
  front: string;
  back: string;
  last_result: "known" | "unknown" | null;
  ease: number;
  interval_days: number;
  repetitions: number;
  due_at: string;
};

const byDue = (a: Card, b: Card) => a.due_at.localeCompare(b.due_at);
const nextDate = (cards: Card[]) =>
  cards.length
    ? new Date([...cards].sort(byDue)[0]!.due_at).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })
    : null;

export function FlashcardReview({ cards: initial }: { cards: Card[] }) {
  const [cards, setCards] = useState(initial);
  const [queue, setQueue] = useState(() => initial.filter((c) => isDue(c)).sort(byDue));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, "known" | "unknown">>({});

  const card = queue[index];
  const done = index >= queue.length;

  async function answer(result: "known" | "unknown") {
    if (!card) return;
    const next = { ...card, ...schedule(card, result), last_result: result };
    setResults((r) => ({ ...r, [card.id]: r[card.id] === "unknown" ? "unknown" : result }));
    setCards((cs) => cs.map((c) => (c.id === card.id ? next : c)));
    if (result === "unknown") setQueue((q) => [...q, next]);
    setFlipped(false);
    setIndex((i) => i + 1);
    await supabaseBrowser()
      .from("flashcards")
      .update({
        last_result: result,
        reviewed_at: new Date().toISOString(),
        ease: next.ease,
        interval_days: next.interval_days,
        repetitions: next.repetitions,
        due_at: next.due_at,
      })
      .eq("id", card.id);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest("input, textarea, button")) return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (flipped && e.key === "1") void answer("unknown");
      if (flipped && e.key === "2") void answer("known");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function restart(list: Card[]) {
    setQueue(list);
    setIndex(0);
    setResults({});
    setFlipped(false);
  }

  if (done) {
    const reviewed = Object.keys(results).length;
    const forgot = Object.values(results).filter((r) => r === "unknown").length;
    const upcoming = nextDate(cards.filter((c) => !isDue(c)));
    return (
      <div className="flex flex-col gap-4">
        <DeckStatus cards={cards} />
        <div className="panel flex flex-col items-start gap-4" role="status">
          <p className="text-[20px] font-bold">{reviewed ? "Ripasso di oggi finito" : "Niente da ripassare oggi"}</p>
          <p className="num text-[15px]">
            {reviewed
              ? `Hai ripassato ${reviewed} ${reviewed === 1 ? "carta" : "carte"}${forgot ? `, ${forgot} da consolidare: torneranno presto` : ""}.`
              : "Le carte di questo mazzo tornano quando stai per dimenticarle."}
            {upcoming && ` Prossimo ripasso: ${upcoming}.`}
          </p>
          <button type="button" className="btn-secondary" onClick={() => restart([...cards].sort(byDue))}>
            Ripassa tutto comunque
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DeckStatus cards={cards} />
      <div className="flex flex-col gap-2">
        <p className="num text-sm text-muted" aria-live="polite">
          Flashcard <span className="text-ink">{index + 1}</span> di {queue.length}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-rule" aria-hidden="true">
          <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Mostra la domanda" : "Mostra la risposta"}
        className={`flex min-h-[22rem] w-full cursor-pointer flex-col items-center justify-center gap-5 rounded-card border-2 bg-sheet p-6 text-center transition-colors duration-150 md:min-h-[26rem] md:p-10 ${
          flipped ? "border-accent" : "border-border hover:border-control"
        }`}
      >
        <span
          className={`rounded-full px-3 py-1 font-mono text-[12px] tracking-[0.06em] uppercase ${
            flipped ? "bg-pill-positive text-pill-positive-ink" : "bg-accent-soft text-ink"
          }`}
        >
          {flipped ? "Risposta" : "Domanda"}
        </span>
        <span aria-live="polite" className="flex w-full max-w-[40ch] flex-col items-center gap-5">
          <span className={`reading font-display leading-snug ${flipped ? "text-[18px] text-muted" : "text-[26px] md:text-[30px]"}`}>
            {card!.front}
          </span>
          {flipped && (
            <span className="reading w-full border-t-2 border-accent-soft pt-5 text-[24px] leading-snug md:text-[28px]">
              {card!.back}
            </span>
          )}
        </span>
        <span className="text-sm text-muted">{flipped ? "Tocca per nascondere la risposta" : "Tocca o premi Spazio per la risposta"}</span>
      </button>
      {flipped && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary h-12" onClick={() => answer("unknown")} aria-keyshortcuts="1">
            Non lo so <span className="text-sm font-normal text-muted">1</span>
          </button>
          <button type="button" className="btn-primary h-12" onClick={() => answer("known")} aria-keyshortcuts="2">
            Lo so <span className="text-sm font-normal opacity-70">2</span>
          </button>
        </div>
      )}
    </div>
  );
}

function DeckStatus({ cards }: { cards: Card[] }) {
  const due = cards.filter((c) => isDue(c)).length;
  const fresh = cards.filter((c) => c.last_result === null).length;
  const learned = cards.filter((c) => c.last_result === "known" && !isDue(c)).length;
  const shaky = cards.filter((c) => c.last_result === "unknown").length;
  const items: [string, number][] = [
    ["Da ripassare oggi", due],
    ["Mai viste", fresh],
    ["Da consolidare", shaky],
    ["Imparate", learned],
  ];
  return (
    <dl aria-label="Stato del mazzo" className="num grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([label, n]) => (
        <div key={label} className="flex flex-col gap-0.5 rounded-row border border-border bg-raised px-3 py-2">
          <dt className="text-[13px] text-muted">{label}</dt>
          <dd className="text-[20px] leading-tight font-bold">{n}</dd>
        </div>
      ))}
    </dl>
  );
}
