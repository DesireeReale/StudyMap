"use client";

import { useState, type FormEvent } from "react";
import { FEEDBACK_KINDS } from "@/core/feedback";

export function FeedbackForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: data.get("kind"), message: data.get("message"), page: data.get("page") }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      form.reset();
      return setMessage("Grazie! Il messaggio è arrivato.");
    }
    const body = (await res?.json().catch(() => null)) as { error?: string } | null;
    setMessage(body?.error ?? "Non è stato possibile inviare il messaggio. Riprova.");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-2">Di cosa si tratta?</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_KINDS.map((k, i) => (
            <label
              key={k.id}
              className="flex min-h-10 cursor-pointer items-center rounded-full border border-border px-4 text-[15px] text-muted hover:text-ink has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-bold has-[:checked]:text-ink has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]"
            >
              <input type="radio" name="kind" value={k.id} defaultChecked={i === 0} className="sr-only" />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className="label">Messaggio</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          className="reading field h-auto py-2"
          placeholder="Descrivi l'idea o il problema. Se è un problema, scrivi cosa stavi facendo."
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label">Dove succede? (facoltativo)</span>
        <input name="page" maxLength={200} className="field" placeholder="Per esempio: quiz, mappa, caricamento" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Invio…" : "Invia"}
        </button>
        <p role="status" className="text-sm text-muted empty:hidden">
          {message}
        </p>
      </div>
    </form>
  );
}
