"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_NOTE_CHARS } from "@/core/files";
import { outline } from "@/core/outline";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function NoteEditor({ noteId, title, body }: { noteId: string; title: string; body: string }) {
  const [draft, setDraft] = useState({ title, body });
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const saved = useRef(JSON.stringify({ title, body }));
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const headings = outline(draft.body);
  const snapshot = JSON.stringify(draft);

  useEffect(() => {
    if (snapshot === saved.current) return;
    setStatus("saving");
    const timer = setTimeout(async () => {
      const next = JSON.parse(snapshot) as typeof draft;
      const { error } = await supabaseBrowser()
        .from("notes")
        .update({ title: next.title.trim() || "Appunto senza titolo", body: next.body, updated_at: new Date().toISOString() })
        .eq("id", noteId);
      if (!error) saved.current = snapshot;
      setStatus(error ? "error" : "saved");
    }, 800);
    return () => clearTimeout(timer);
  }, [snapshot, noteId]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (snapshot !== saved.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [snapshot]);

  function jumpTo(offset: number) {
    const ta = bodyRef.current;
    if (!ta) return;
    ta.blur();
    ta.setSelectionRange(offset, offset);
    ta.focus();
  }

  const statusText = { saved: "Salvato", saving: "Salvataggio…", error: "Salvataggio non riuscito" }[status];

  return (
    <div className={`flex w-full flex-col gap-3 ${headings.length > 1 ? "max-w-[1076px]" : "max-w-[860px]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="note-title" className="sr-only">
          Titolo dell&apos;appunto
        </label>
        <input
          id="note-title"
          value={draft.title}
          maxLength={200}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className="min-w-0 flex-1 rounded-field bg-transparent px-1 text-[32px] leading-[1.05] font-bold tracking-[-0.025em] break-words md:text-[44px] text-ink"
        />
        <p role="status" className={`text-sm ${status === "error" ? "text-negative" : "text-muted"}`}>
          {statusText}
        </p>
      </div>
      <div className={headings.length > 1 ? "grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]" : "flex flex-col"}>
        {headings.length > 1 && (
          <nav aria-label="Sezioni" className="lg:sticky lg:top-4 lg:self-start">
            <p className="label mb-2">Sezioni</p>
            <ol className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {headings.map((h) => (
                <li key={h.offset} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => jumpTo(h.offset)}
                    className="w-full cursor-pointer rounded-field px-2.5 py-1.5 text-left text-sm text-muted hover:bg-active hover:text-ink"
                  >
                    {h.title}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <label htmlFor="note-body" className="sr-only">
          Testo dell&apos;appunto
        </label>
        <textarea
          ref={bodyRef}
          id="note-body"
          value={draft.body}
          maxLength={MAX_NOTE_CHARS}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          placeholder="Scrivi o incolla qui i tuoi appunti. Si salvano da soli."
          spellCheck
          className="reading field min-h-[60vh] resize-y p-4"
        />
      </div>
      <p className="num text-right text-[13px] text-muted">
        {draft.body.length.toLocaleString("it-IT")} / {MAX_NOTE_CHARS.toLocaleString("it-IT")} caratteri
      </p>
    </div>
  );
}
