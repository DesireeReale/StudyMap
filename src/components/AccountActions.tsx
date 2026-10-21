"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "./icons";

export function DeleteAccount() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function deleteAccount() {
    if (!window.confirm("Eliminare definitivamente account, documenti, mappe e flashcard? L'operazione non è reversibile.")) {
      return;
    }
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) return setMessage("Eliminazione non riuscita. Riprova.");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button type="button" className="btn-danger" onClick={deleteAccount}>
        <Icon name="trash" />
        Elimina account e dati
      </button>
      {message && (
        <p role="alert" className="text-sm text-negative">
          {message}
        </p>
      )}
    </div>
  );
}

export function ExamDate({ userId, initial }: { userId: string; initial: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  const [message, setMessage] = useState<string | null>(null);

  async function save(next: string) {
    setValue(next);
    const { error } = await supabaseBrowser()
      .from("profiles")
      .update({ exam_date: next || null })
      .eq("id", userId);
    setMessage(error ? "Non è stato possibile salvare la data. Riprova." : next ? "Data salvata." : "Data rimossa.");
    if (!error) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="label">Data del prossimo esame</span>
        <span className="flex flex-wrap items-center gap-2">
          <input type="date" value={value} onChange={(e) => save(e.target.value)} className="field w-auto" />
          {value && (
            <button type="button" className="btn-ghost" onClick={() => save("")}>
              Rimuovi
            </button>
          )}
        </span>
      </label>
      <p role="status" className="text-sm text-muted empty:hidden">
        {message}
      </p>
    </div>
  );
}
