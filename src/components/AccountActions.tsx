"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "./icons";

export function ConsentToggle({ consentAt }: { consentAt: string | null }) {
  const [consent, setConsent] = useState(!!consentAt);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !consent;
    setBusy(true);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = user
      ? await supabase
          .from("profiles")
          .update({ ai_data_sharing_consent_at: next ? new Date().toISOString() : null })
          .eq("id", user.id)
      : { error: new Error("no session") };
    setBusy(false);
    if (error) return setMessage("Non è stato possibile salvare la scelta. Riprova.");
    setConsent(next);
    setMessage(next ? "Consenso registrato." : "Consenso revocato.");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="consent-title" className="flex items-center gap-2 text-sm font-bold">
            Servizi AI gratuiti
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                consent ? "bg-pill-positive text-pill-positive-ink" : "bg-sheet text-muted"
              }`}
            >
              {consent ? "Attivo" : "Disattivato"}
            </span>
          </p>
          <p id="consent-desc" className="mt-1 text-sm text-muted">
            Google Gemini e OpenRouter possono conservare i contenuti inviati e usarli per migliorare i loro modelli.
            In questa fase di sviluppo la generazione con l&apos;AI funziona solo con questo consenso. Puoi revocarlo
            quando vuoi: i contenuti già creati restano.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={consent}
          aria-labelledby="consent-title"
          aria-describedby="consent-desc"
          disabled={busy}
          onClick={toggle}
          className={`relative mt-0.5 h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-150 disabled:opacity-60 ${
            consent ? "bg-positive" : "bg-control"
          }`}
        >
          <span
            className={`absolute top-1 left-1 size-5 rounded-full bg-sheet transition-transform duration-150 ${
              consent ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      <p role="status" className="text-sm text-muted empty:hidden">
        {message}
      </p>
    </div>
  );
}

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
