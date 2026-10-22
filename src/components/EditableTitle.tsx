"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { folderError } from "@/core/folders";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "./icons";

const H1 = "text-[32px] leading-[1.05] font-bold tracking-[-0.025em] break-words md:text-[44px]";

export function EditableTitle({ table, id, title, label }: { table: "documents" | "decks"; id: string; title: string; label: string }) {
  return (
    <h1 className={`min-w-0 ${H1}`}>
      <InlineRename table={table} id={id} value={title} label={label} />
    </h1>
  );
}

export function InlineRename({
  table,
  id,
  value,
  label,
}: {
  table: "documents" | "decks" | "folders";
  id: string;
  value: string;
  label: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const hintId = useId();

  async function save() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === shown) return setDraft(shown);
    setShown(next);
    const db = supabaseBrowser();
    const { error } =
      table === "folders"
        ? await db.from("folders").update({ name: next }).eq("id", id)
        : await db.from(table).update({ title: next }).eq("id", id);
    if (error) {
      setShown(shown);
      setDraft(shown);
      return setError(table === "folders" ? folderError(error) : "Non è stato possibile rinominare. Riprova.");
    }
    setError(null);
    router.refresh();
  }

  return (
    <>
      {editing ? (
        <input
          aria-label={label}
          aria-describedby={hintId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setDraft(shown);
              setEditing(false);
            }
          }}
          maxLength={table === "folders" ? 80 : 200}
          autoFocus
          className="max-w-full min-w-[4ch] border-0 border-b-2 border-accent bg-transparent p-0 font-[inherit] tracking-[inherit] text-ink outline-none! [field-sizing:content]"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-describedby={hintId}
          className="group/rename -mx-2 inline cursor-text rounded-lg px-2 text-left [font:inherit] tracking-[inherit] break-words text-inherit hover:bg-active"
        >
          {shown.slice(0, shown.lastIndexOf(" ") + 1)}
          <span className="whitespace-nowrap">
            {shown.slice(shown.lastIndexOf(" ") + 1)}
            <Icon name="pencil" size={18} className="ml-2 inline-block align-middle text-muted opacity-60 group-hover/rename:opacity-100" />
          </span>
        </button>
      )}
      <span id={hintId} className={editing ? "mt-1 block text-[13px] font-normal tracking-normal text-muted" : "sr-only"}>
        {editing ? "Invio per salvare, Esc per annullare" : "Premi per rinominare"}
      </span>
      {error && (
        <span role="alert" className="mt-1 block text-sm font-normal tracking-normal text-negative">
          {error}
        </span>
      )}
    </>
  );
}
