"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function AccountActions({ consentAt }: { consentAt: string | null }) {
  const router = useRouter();
  const [consent, setConsent] = useState(!!consentAt);
  const [message, setMessage] = useState<string | null>(null);

  async function toggleConsent(next: boolean) {
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ ai_data_sharing_consent_at: next ? new Date().toISOString() : null })
      .eq("id", user.id);
    if (error) return setMessage("Non è stato possibile salvare la scelta.");
    setConsent(next);
    setMessage(next ? "Consenso registrato." : "Consenso revocato.");
  }

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
    <>
      <section className="card flex flex-col gap-3" aria-labelledby="consent">
        <h2 id="consent" className="text-xl font-bold">
          Uso dei tuoi contenuti da parte dei provider AI
        </h2>
        <p>
          Senza consenso i tuoi materiali vengono elaborati solo da provider che <strong>non</strong> li usano per
          addestrare i propri modelli. Se acconsenti, possiamo usare anche servizi AI gratuiti (Google Gemini,
          OpenRouter) che possono conservare i contenuti inviati e usarli per migliorare i loro modelli. Puoi revocare
          il consenso in qualsiasi momento; i contenuti già creati restano disponibili. In questa fase di sviluppo la
          generazione con l&apos;AI funziona solo con il consenso.
        </p>
        <label className="flex items-center gap-3 font-bold">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => toggleConsent(e.target.checked)}
            className="size-5"
          />
          Acconsento all&apos;uso dei miei contenuti da parte di questi provider
        </label>
      </section>

      <section className="card flex flex-col items-start gap-3" aria-labelledby="danger">
        <h2 id="danger" className="text-xl font-bold">
          Elimina account
        </h2>
        <p>Cancella in modo permanente il tuo account e tutti i dati collegati, compresi i file caricati.</p>
        <button type="button" className="btn-danger" onClick={deleteAccount}>
          Elimina account e dati
        </button>
      </section>

      {message && <p role="status">{message}</p>}
    </>
  );
}
