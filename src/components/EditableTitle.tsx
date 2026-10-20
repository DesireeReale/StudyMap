"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

const H1 = "text-[32px] leading-[1.05] font-bold tracking-[-0.025em] break-words md:text-[44px]";

export function EditableTitle({ table, id, title, label }: { table: "documents" | "decks"; id: string; title: string; label: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [error, setError] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next = value.trim();
    if (!next) return;
    const { error } = await supabaseBrowser().from(table).update({ title: next }).eq("id", id);
    setError(!!error);
    if (error) return;
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h1 className={`min-w-0 ${H1}`}>{title}</h1>
        <button type="button" className="btn-ghost h-8 px-3 text-sm" onClick={() => setEditing(true)}>
          Rinomina
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex min-w-0 flex-wrap items-center gap-2">
      <label htmlFor={`title-${id}`} className="sr-only">
        {label}
      </label>
      <input
        id={`title-${id}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
        maxLength={200}
        autoFocus
        className="field h-11 max-w-md flex-1 text-[18px] font-bold"
      />
      <button type="submit" className="btn-primary h-10">
        Salva
      </button>
      <button
        type="button"
        className="btn-ghost h-10"
        onClick={() => {
          setValue(title);
          setEditing(false);
        }}
      >
        Annulla
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-negative">
          Non è stato possibile rinominare. Riprova.
        </p>
      )}
    </form>
  );
}
