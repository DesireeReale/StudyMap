"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Card = { id: string; front: string; back: string; last_result: "known" | "unknown" | null };

export function FlashcardReview({ cards: initial }: { cards: Card[] }) {
  const order = (cs: Card[]) => [...cs].sort((a, b) => rank(a) - rank(b));
  const [queue, setQueue] = useState(() => order(initial));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, "known" | "unknown">>({});

  const card = queue[index];
  const done = index >= queue.length;

  async function answer(result: "known" | "unknown") {
    if (!card) return;
    setResults((r) => ({ ...r, [card.id]: result }));
    setFlipped(false);
    setIndex((i) => i + 1);
    await supabaseBrowser()
      .from("flashcards")
      .update({ last_result: result, reviewed_at: new Date().toISOString() })
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

  if (done) {
    const unknown = queue.filter((c) => results[c.id] === "unknown");
    const knownCount = queue.length - unknown.length;
    return (
      <div className="panel flex flex-col items-start gap-4" role="status">
        <p className="text-[20px] font-bold">Ripasso finito</p>
        <p className="num text-[15px]">
          Sapevi <span className="font-bold text-accent">{knownCount}</span> flashcard su {queue.length}
          {unknown.length > 0 ? `; ${unknown.length} da rivedere.` : "."}
        </p>
        <div className="flex flex-wrap gap-2">
          {unknown.length > 0 && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setQueue(unknown);
                setIndex(0);
                setResults({});
              }}
            >
              Ripassa le {unknown.length} che non sapevi
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setQueue(order(initial));
              setIndex(0);
              setResults({});
            }}
          >
            Ricomincia da capo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
        className={`flex min-h-64 cursor-pointer flex-col justify-between gap-6 rounded-card border p-6 text-left transition-colors duration-150 md:p-8 ${
          flipped ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-control"
        }`}
      >
        <span className="text-sm text-muted">{flipped ? "Risposta" : "Domanda"}</span>
        <span aria-live="polite" className="text-[22px] leading-snug md:text-[24px]">
          {flipped ? card!.back : card!.front}
        </span>
        <span className="text-sm text-muted">{flipped ? "Tocca per rivedere la domanda" : "Tocca o premi Spazio per la risposta"}</span>
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

function rank(c: Card) {
  return c.last_result === "unknown" ? 0 : c.last_result === null ? 1 : 2;
}
