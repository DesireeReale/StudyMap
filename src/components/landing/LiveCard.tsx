"use client";

import { useState } from "react";

const CARDS = [
  {
    front: "Che cos'è la posizione semi-Fowler?",
    back: "Paziente supino con il busto sollevato di 30-45°: facilita la respirazione, per esempio nello scompenso cardiaco.",
  },
  {
    front: "Perché si pesa ogni giorno il paziente con scompenso?",
    back: "Un aumento rapido del peso indica ritenzione idrica: va rilevato alla stessa ora, con la stessa bilancia.",
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
