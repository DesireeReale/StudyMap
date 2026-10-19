import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Informativa privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
      <Link href="/" className="text-brand underline">
        ← StudyMap
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Informativa privacy</h1>
      <p className="mt-2 text-muted">Bozza da completare con i dati del titolare prima della pubblicazione.</p>

      <h2>Quali dati trattiamo</h2>
      <ul>
        <li>Email e dati di accesso (anche tramite Google).</li>
        <li>I materiali di studio che carichi (PDF, immagini, testo) e ciò che generi (mappe, flashcard).</li>
        <li>Dati di utilizzo del servizio AI (numero di richieste e token) per gestire i limiti del piano.</li>
      </ul>

      <h2>Non caricare dati di pazienti</h2>
      <p>
        StudyMap è uno strumento di studio. Non caricare dati personali o sanitari di pazienti reali (nomi, cartelle
        cliniche, referti, foto).
      </p>

      <h2>Dove sono conservati</h2>
      <p>Database e file sono ospitati su Supabase in una regione dell&apos;Unione Europea.</p>

      <h2>Elaborazione con l&apos;intelligenza artificiale</h2>
      <p>
        Per creare mappe e flashcard il testo dei tuoi materiali viene inviato a un provider AI. Di default usiamo
        Mistral AI (Francia, UE), configurato in modo che i contenuti non vengano usati per addestrare i modelli.
      </p>
      <p>
        <strong>Solo se dai un consenso separato</strong> nelle impostazioni, in caso di sovraccarico possiamo usare
        anche provider gratuiti raggiunti tramite OpenRouter, che possono trovarsi fuori dall&apos;UE, conservare i
        contenuti e usarli per migliorare i propri modelli. Il consenso è facoltativo, revocabile in qualsiasi momento e
        l&apos;app funziona anche senza.
      </p>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi eliminare in qualsiasi momento singoli documenti oppure l&apos;intero account con tutti i dati collegati
        dalla pagina Impostazioni. Hai inoltre i diritti previsti dagli articoli 15-22 del GDPR.
      </p>
    </main>
  );
}
