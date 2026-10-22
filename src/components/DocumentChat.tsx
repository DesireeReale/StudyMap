"use client";

import { useId, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "./icons";
import { UpgradeNotice } from "./UpgradeNotice";

export type ChatMessage = { id: number; role: "user" | "assistant"; content: string; pages: number[] };
type Source = { documentId: string } | { noteId: string };

export function DocumentChat({
  source,
  unit,
  initial,
  excerpts: initialExcerpts,
  fold = false,
}: {
  source: Source;
  unit: "Pagina" | "Slide";
  initial: ChatMessage[];
  excerpts: Record<number, string>;
  fold?: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const [excerpts, setExcerpts] = useState(initialExcerpts);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; upgrade: boolean } | null>(null);
  const baseId = useId();
  const short = unit === "Slide" ? "Slide" : "Pag.";

  async function ask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const question = String(new FormData(form).get("question") ?? "").trim();
    if (question.length < 2 || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...source, question }),
      });
      const json = await res.json();
      if (!res.ok) return setProblem({ message: json.error, upgrade: json.upgrade });
      setMessages((m) => [...m, ...json.messages]);
      setExcerpts((x) => ({ ...x, ...json.excerpts }));
      form.reset();
    } catch {
      setProblem({ message: "Errore di rete. Riprova.", upgrade: false });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    const chats = supabaseBrowser().from("chat_messages").delete();
    const { error } = await ("noteId" in source ? chats.eq("note_id", source.noteId) : chats.eq("document_id", source.documentId));
    if (error) return setProblem({ message: "Non sono riuscito a cancellare la conversazione.", upgrade: false });
    setMessages([]);
  }

  const newChat = messages.length > 0 && (
    <button type="button" className="btn-ghost" onClick={reset}>
      Nuova conversazione
    </button>
  );
  const body = (
    <>
      {messages.length === 0 ? (
        <p className="text-sm text-muted">
          Fai una domanda sul materiale: la risposta usa solo questo documento e indica da quale {unit.toLowerCase()} viene.
        </p>
      ) : (
        <ol className="flex max-h-[520px] flex-col gap-3 overflow-auto" aria-live="polite">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`reading max-w-[90%] rounded-row px-4 py-3 whitespace-pre-wrap [overflow-wrap:anywhere] ${
                m.role === "user" ? "self-end bg-accent-soft text-ink" : "self-start border border-border bg-raised"
              }`}
            >
              <span className="sr-only">{m.role === "user" ? "Tu: " : "Risposta: "}</span>
              {m.content}
              {m.role === "assistant" && m.pages.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-1.5 whitespace-normal">
                  {m.pages.map((p) => {
                    const id = `${baseId}-${m.id}-${p}`;
                    return (
                      <span key={p}>
                        <button
                          type="button"
                          popoverTarget={id}
                          className="num min-h-8 cursor-pointer rounded-full border border-control px-3 text-[13px] font-bold text-accent hover:bg-accent-soft"
                        >
                          {short} {p}
                        </button>
                        <span
                          id={id}
                          popover="auto"
                          className="timer-popover m-auto max-h-[70dvh] w-[640px] max-w-[calc(100vw-32px)] flex-col gap-3 overflow-auto rounded-row border border-border bg-raised p-5 text-ink shadow-lg"
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="font-bold">
                              {unit} {p}
                            </span>
                            <button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label="Chiudi" className="btn-ghost h-9 w-9 px-0">
                              <Icon name="close" size={16} />
                            </button>
                          </span>
                          <span className="reading block whitespace-pre-wrap">{excerpts[p] ?? "Testo non disponibile."}</span>
                        </span>
                      </span>
                    );
                  })}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={ask} className="flex flex-col gap-2" aria-busy={busy}>
        <label htmlFor={`${baseId}-q`} className="sr-only">
          La tua domanda
        </label>
        <span className="flex flex-wrap gap-2">
          <input
            id={`${baseId}-q`}
            name="question"
            required
            minLength={2}
            maxLength={1000}
            autoComplete="off"
            placeholder="es. Qual è la differenza tra… ?"
            className="field min-w-0 flex-1"
          />
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Sto cercando…" : "Chiedi"}
          </button>
        </span>
        <p aria-live="polite" className="sr-only">
          {busy ? "Sto cercando nel documento" : ""}
        </p>
      </form>
      {problem && <UpgradeNotice message={problem.message} upgrade={problem.upgrade} />}
    </>
  );

  if (fold) {
    return (
      <section aria-label="Chiedi al documento">
        <details className="panel group py-4" open={initial.length > 0}>
          <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 font-bold">
              <Icon name="chat" />
              Chiedi al documento
            </span>
            <span className="text-sm text-muted group-open:hidden max-sm:hidden">Fai una domanda</span>
            <span className="hidden text-sm text-muted group-open:inline">Nascondi</span>
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            {newChat && <div className="flex justify-end">{newChat}</div>}
            {body}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section aria-label="Chiedi al documento" className="panel flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">Chiedi al documento</h2>
        {newChat}
      </div>
      {body}
    </section>
  );
}
