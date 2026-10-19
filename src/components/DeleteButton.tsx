"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function DeleteButton({
  table,
  id,
  storagePath,
  label,
  confirm: question,
}: {
  table: "documents" | "maps" | "decks";
  id: string;
  storagePath?: string | null;
  label: string;
  confirm: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm(question)) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return setError("Eliminazione non riuscita.");
    if (storagePath) await supabase.storage.from("documents").remove([storagePath]);
    router.push("/library");
    router.refresh();
  }

  return (
    <div>
      <button type="button" className="btn-danger" onClick={onClick}>
        {label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
