"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BETA_TERMS, BETA_TERMS_VERSION } from "@/config/beta";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function BetaTerms({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabaseBrowser()
      .from("profiles")
      .update({ beta_terms_accepted_at: new Date().toISOString(), beta_terms_version: BETA_TERMS_VERSION })
      .eq("id", userId);
    setBusy(false);
    if (error) return setError("Non è stato possibile salvare l'accettazione. Riprova.");
    router.refresh();
  }

  return (
    <section aria-labelledby="beta-title" className="mx-auto flex max-w-[640px] flex-col gap-5 py-6">
      <h1 id="beta-title" className="text-[28px] leading-tight font-bold">
        Condizioni della beta
      </h1>
      <p className="reading">{BETA_TERMS}</p>
      <p className="text-sm text-muted">
        I dettagli, l&apos;elenco dei provider e come revocare sono nell&apos;
        <Link href="/privacy" className="font-bold text-accent hover:underline">
          informativa privacy
        </Link>
        .
      </p>
      <form onSubmit={accept} className="flex flex-col gap-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-row border border-border bg-sheet p-3">
          <input type="checkbox" required className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" />
          <span className="font-bold">Ho letto e accetto le condizioni della beta</span>
        </label>
        {error && (
          <p role="alert" className="text-sm text-negative">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary self-start" disabled={busy}>
          Accetto e continuo
        </button>
      </form>
    </section>
  );
}
