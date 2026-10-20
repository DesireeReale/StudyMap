"use client";

import { useState } from "react";

const CARDS = [
  {
    front: "Quali sono i requisiti del contratto?",
    back: "L'accordo delle parti, la causa, l'oggetto e la forma, quando la legge la prescrive a pena di nullità (art. 1325 c.c.).",
  },
  {
    front: "Che cosa misura la derivata di una funzione in un punto?",
    back: "Il tasso di variazione istantaneo della funzione in quel punto, cioè la pendenza della retta tangente al grafico.",
  },
];

export function LiveCard() {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = CARDS[i]!;

  return (
    <div className="flex w-full max-w-[460px] flex-col gap-3" data-ui>
      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        aria-label={flipped ? "Mostra la domanda" : "Mostra la risposta"}
        className={`flex min-h-56 cursor-pointer flex-col justify-between gap-6 rounded-card border p-6 text-left transition-colors duration-200 ${
          flipped ? "border-accent bg-accent-soft" : "border-border bg-sheet hover:border-control"
        }`}
      >
        <span className="text-sm text-muted">{flipped ? "Risposta" : "Domanda"}</span>
        <span aria-live="polite" className="text-[20px] leading-snug">
          {flipped ? card.back : card.front}
        </span>
        <span className="text-sm text-muted">{flipped ? "Tocca per tornare alla domanda" : "Tocca per vedere la risposta"}</span>
      </button>
      {flipped && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn-secondary h-11"
            onClick={() => {
              setFlipped(false);
              setI((i + 1) % CARDS.length);
            }}
          >
            Non lo so
          </button>
          <button
            type="button"
            className="btn-primary h-11"
            onClick={() => {
              setFlipped(false);
              setI((i + 1) % CARDS.length);
            }}
          >
            Lo so
          </button>
        </div>
      )}
    </div>
  );
}
