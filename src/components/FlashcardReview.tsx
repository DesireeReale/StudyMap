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
    return (
      <div className="card flex flex-col items-start gap-4" role="status">
        <p className="text-xl font-bold">Ripasso completato</p>
        <p>
          Sapevi {queue.length - unknown.length} flashcard su {queue.length}.
        </p>
        <div className="flex flex-wrap gap-3">
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
      <p className="text-muted" aria-live="polite">
        Flashcard {index + 1} di {queue.length}
      </p>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Mostra la domanda" : "Mostra la risposta"}
        className="card flex min-h-56 flex-col items-center justify-center gap-3 text-center text-xl hover:border-brand"
      >
        <span className="text-sm font-bold uppercase text-muted">{flipped ? "Risposta" : "Domanda"}</span>
        <span aria-live="polite">{flipped ? card!.back : card!.front}</span>
      </button>
      {flipped ? (
        <div className="flex gap-3">
          <button type="button" className="btn-danger flex-1" onClick={() => answer("unknown")} aria-keyshortcuts="1">
            Non lo so
          </button>
          <button type="button" className="btn-primary flex-1" onClick={() => answer("known")} aria-keyshortcuts="2">
            Lo so
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">Premi Spazio o tocca la carta per vedere la risposta.</p>
      )}
    </div>
  );
}

function rank(c: Card) {
  return c.last_result === "unknown" ? 0 : c.last_result === null ? 1 : 2;
}
