import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/core/feedback";
import { BETA_TERMS } from "@/config/beta";

export const metadata: Metadata = { title: "Informativa privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-[17px] leading-relaxed md:py-20 [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:text-[20px] [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
      <Link href="/" className="text-sm font-bold text-accent hover:underline">
        ← StudyMap
      </Link>
      <h1 className="mt-6 text-[32px] leading-tight font-bold">Informativa privacy</h1>
      <p className="mt-2 text-muted">Bozza da completare con i dati del titolare prima della pubblicazione.</p>

      <h2>Quali dati trattiamo</h2>
      <ul>
        <li>Email e dati di accesso (anche tramite Google).</li>
        <li>I materiali di studio che carichi (PDF, immagini, testo) e ciò che generi (mappe, flashcard).</li>
        <li>Dati di utilizzo del servizio AI (numero di richieste e token) per gestire i limiti del piano.</li>
        <li>
          I suggerimenti e le segnalazioni che invii dalle Impostazioni, salvati insieme al tuo account per poterli
          leggere e risponderti. Si cancellano con l&apos;account.
        </li>
      </ul>

      <h2>Non caricare dati di altre persone</h2>
      <p>
        StudyMap è uno strumento di studio. Non caricare dati personali di persone reali: per esempio
        cartelle cliniche e referti di pazienti, atti di cause, dati di clienti, foto.
      </p>

      <h2>Dove sono conservati</h2>
      <p>Database e file sono ospitati su Supabase in una regione dell&apos;Unione Europea.</p>

      <h2>Elaborazione con l&apos;intelligenza artificiale durante la beta</h2>
      <p>
        <strong>{BETA_TERMS}</strong> Accetti queste condizioni alla registrazione (o al primo accesso, se avevi già un
        account): salviamo la data e la versione del testo che hai accettato.
      </p>
      <p>
        Per creare mappe, flashcard, quiz, riassunti e risposte il testo e le immagini dei tuoi materiali vengono inviati, tramite
        OpenRouter (Stati Uniti), a questi provider di modelli:
      </p>
      <ul>
        <li>DeepSeek, società con sede in Cina (modello DeepSeek V4.1 Flash);</li>
        <li>Alibaba, società con sede in Cina (modello Qwen 3.7 Flash);</li>
        <li>Google (modelli Gemma), solo come riserva.</li>
      </ul>
      <p>
        OpenRouter può inoltrare la richiesta a uno qualsiasi dei server che offrono questi modelli: questi servizi
        possono conservare i contenuti e usarli per migliorare i propri modelli. I testi vengono quindi
        trasferiti fuori dall&apos;Unione Europea, anche verso paesi per cui non esiste una decisione di adeguatezza
        della Commissione europea, come la Cina.
      </p>
      <p>
        <strong>Come revocare:</strong> elimina l&apos;account dalla pagina Impostazioni. Si cancellano l&apos;account
        e tutti i contenuti salvati su StudyMap; non possiamo cancellare le copie che i provider AI hanno già
        conservato.
      </p>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi eliminare in qualsiasi momento singoli documenti oppure l&apos;intero account con tutti i dati collegati
        dalla pagina Impostazioni. Hai inoltre i diritti previsti dagli articoli 15-22 del GDPR.
      </p>

      <h2>Contatti</h2>
      <p>
        Per domande sui tuoi dati o per esercitare i tuoi diritti scrivi a{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-accent hover:underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </main>
  );
}
