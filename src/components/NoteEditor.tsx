"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export const MAX_NOTE_CHARS = 100_000;

export function NoteEditor({ noteId, title, body }: { noteId: string; title: string; body: string }) {
  const [draft, setDraft] = useState({ title, body });
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const saved = useRef(JSON.stringify({ title, body }));
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

  const statusText = { saved: "Salvato", saving: "Salvataggio…", error: "Salvataggio non riuscito" }[status];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="note-title" className="sr-only">
          Titolo dell&apos;appunto
        </label>
        <input
          id="note-title"
          value={draft.title}
          maxLength={200}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className="min-w-0 flex-1 rounded-field bg-transparent px-1 text-[24px] leading-tight font-bold text-ink"
        />
        <p role="status" className={`text-sm ${status === "error" ? "text-negative" : "text-muted"}`}>
          {statusText}
        </p>
      </div>
      <label htmlFor="note-body" className="sr-only">
        Testo dell&apos;appunto
      </label>
      <textarea
        id="note-body"
        value={draft.body}
        maxLength={MAX_NOTE_CHARS}
        onChange={(e) => setDraft({ ...draft, body: e.target.value })}
        placeholder="Scrivi o incolla qui i tuoi appunti. Si salvano da soli."
        spellCheck
        className="reading field min-h-[60vh] resize-y p-4"
      />
      <p className="num text-right text-[13px] text-muted">
        {draft.body.length.toLocaleString("it-IT")} / {MAX_NOTE_CHARS.toLocaleString("it-IT")} caratteri
      </p>
    </div>
  );
}
