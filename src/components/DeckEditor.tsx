"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "./icons";

type Card = { id: string; front: string; back: string; position: number };

const MAX = 1000;

export function DeckEditor({ deckId, cards: initial }: { deckId: string; cards: Card[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [status, setStatus] = useState("");

  async function save(card: Card, change: Partial<Pick<Card, "front" | "back">>) {
    const next = { ...card, ...change };
    if (next.front === card.front && next.back === card.back) return;
    if (!next.front.trim() || !next.back.trim()) return setStatus("Domanda e risposta non possono essere vuote.");
    setCards((cs) => cs.map((c) => (c.id === card.id ? next : c)));
    const { error } = await supabaseBrowser().from("flashcards").update(change).eq("id", card.id);
    setStatus(error ? "Salvataggio non riuscito." : "Salvato.");
    if (!error) router.refresh();
  }

  async function remove(card: Card) {
    if (!window.confirm(`Eliminare la carta "${card.front.slice(0, 60)}"?`)) return;
    const { error } = await supabaseBrowser().from("flashcards").delete().eq("id", card.id);
    if (error) return setStatus("Eliminazione non riuscita.");
    setCards((cs) => cs.filter((c) => c.id !== card.id));
    setStatus("Carta eliminata.");
    router.refresh();
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const front = String(data.get("front")).trim();
    const back = String(data.get("back")).trim();
    if (!front || !back) return setStatus("Scrivi sia la domanda sia la risposta.");
    const position = cards.reduce((max, c) => Math.max(max, c.position), -1) + 1;
    const { data: row, error } = await supabaseBrowser()
      .from("flashcards")
      .insert({ deck_id: deckId, front, back, position })
      .select("id, front, back, position")
      .single();
    if (error || !row) return setStatus("Non è stato possibile aggiungere la carta.");
    setCards((cs) => [...cs, row]);
    form.reset();
    setStatus("Carta aggiunta.");
    router.refresh();
  }

  return (
    <details className="border-t border-rule pt-6">
      <summary className="cursor-pointer text-[17px] font-bold">Modifica le carte ({cards.length})</summary>
      <div className="mt-6 flex max-w-[760px] flex-col gap-4">
        <p className="text-sm text-muted">Le modifiche si salvano quando esci dal campo.</p>
        <ol className="flex flex-col gap-4">
          {cards.map((c, i) => (
            <li key={c.id} className="flex flex-col gap-2 border-b border-rule pb-4">
              <div className="flex items-center justify-between gap-2">
                <span className="num text-[13px] text-muted">Carta {i + 1}</span>
                <button type="button" className="btn-ghost h-8 px-3 text-sm" onClick={() => remove(c)} aria-label={`Elimina la carta ${i + 1}`}>
                  <Icon name="trash" size={16} />
                  Elimina
                </button>
              </div>
              <label className="flex flex-col gap-1 text-[13px] text-muted">
                Domanda
                <textarea
                  defaultValue={c.front}
                  maxLength={MAX}
                  rows={2}
                  onBlur={(e) => save(c, { front: e.target.value.trim() })}
                  className="reading field h-auto py-2 text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-muted">
                Risposta
                <textarea
                  defaultValue={c.back}
                  maxLength={MAX}
                  rows={3}
                  onBlur={(e) => save(c, { back: e.target.value.trim() })}
                  className="reading field h-auto py-2 text-ink"
                />
              </label>
            </li>
          ))}
        </ol>
        <form onSubmit={add} className="flex flex-col gap-2 rounded-row border border-dashed border-control p-4">
          <p className="font-bold">Nuova carta</p>
          <label className="flex flex-col gap-1 text-[13px] text-muted">
            Domanda
            <textarea name="front" required maxLength={MAX} rows={2} className="reading field h-auto py-2 text-ink" />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-muted">
            Risposta
            <textarea name="back" required maxLength={MAX} rows={3} className="reading field h-auto py-2 text-ink" />
          </label>
          <button type="submit" className="btn-primary self-start">
            <Icon name="plus" />
            Aggiungi carta
          </button>
        </form>
        <p role="status" className="text-sm text-muted">
          {status}
        </p>
      </div>
    </details>
  );
}
