"use client";

import { useState } from "react";

const OPTIONS = [
  { id: "caps", label: "Maiuscolo", className: "uppercase tracking-[0.03em]" },
  { id: "space", label: "Più spazio", className: "tracking-[0.06em] [word-spacing:0.16em] leading-[2]" },
  { id: "cream", label: "Sfondo crema", className: "" },
  { id: "big", label: "Testo grande", className: "text-[22px]" },
] as const;

type OptionId = (typeof OPTIONS)[number]["id"];

export function ReadingDemo() {
  const [on, setOn] = useState<Set<OptionId>>(new Set());

  function toggle(id: OptionId) {
    const next = new Set(on);
    if (!next.delete(id)) next.add(id);
    setOn(next);
  }

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h2 className="text-[clamp(28px,3.6vw,40px)] leading-tight font-bold">Leggi come ti viene meglio</h2>
        <p className="max-w-[46ch] text-[18px] opacity-85">
          Caratteri ad alta leggibilità, tutto maiuscolo, più spazio tra le lettere, sfondi di lettura, due temi e la
          modalità scura. Prova qui accanto.
        </p>
        <div role="group" aria-label="Prova le impostazioni di lettura" className="mt-2 flex flex-wrap gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={on.has(o.id)}
              onClick={() => toggle(o.id)}
              className={`min-h-11 cursor-pointer rounded-full border px-4 text-[15px] font-bold transition-colors duration-150 ${
                on.has(o.id)
                  ? "border-on-primary bg-on-primary text-primary"
                  : "border-on-primary/40 bg-transparent text-on-primary hover:border-on-primary"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div
        data-paper={on.has("cream") ? "crema" : undefined}
        className={`rounded-card bg-sheet p-6 text-[18px] leading-relaxed text-ink transition-colors duration-200 ${OPTIONS.filter(
          (o) => on.has(o.id),
        )
          .map((o) => o.className)
          .join(" ")}`}
      >
        <h3 className="mb-2 text-[20px] font-bold">Bilancio idrico</h3>
        <p>
          Nel paziente con scompenso si registrano ogni giorno peso, entrate e uscite. Un aumento di peso superiore a 2 kg
          in tre giorni va segnalato: può indicare ritenzione di liquidi.
        </p>
      </div>
    </div>
  );
}
