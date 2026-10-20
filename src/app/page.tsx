import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PLANS } from "@/config/plans";
import { BrandMark } from "@/components/icons";
import { LiveCard } from "@/components/landing/LiveCard";
import { HEART_FAILURE, MapArt } from "@/components/landing/MapArt";
import { RevealOnScroll } from "@/components/landing/Motion";
import { ReadingDemo } from "@/components/landing/ReadingDemo";
import { ToolTabs } from "@/components/landing/ToolTabs";
import { Showcase } from "@/components/landing/Showcase";
import { getUser } from "@/lib/supabase/server";

const free = PLANS.free;

const STEPS: { line: string; text: string; proof?: ReactNode; accent?: boolean }[] = [
  {
    line: "Prima carichi il materiale.",
    text: `PDF fino a ${free.maxPdfPages} pagine, foto degli appunti o testo incollato. Il testo dei PDF si legge subito.`,
    proof: (
      <Image
        src="/landing/upload.png"
        alt="Schermata di caricamento di StudyMap con il testo degli appunti sullo scompenso cardiaco"
        width={1208}
        height={840}
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="w-full rounded-row bg-surface p-2"
      />
    ),
  },
  {
    line: "Poi l'AI lo scompone in concetti.",
    text: "Ne esce una mappa in italiano, con i termini tecnici della tua materia e le relazioni scritte tra i concetti.",
    proof: (
      <MapArt data={HEART_FAILURE}
        label="Mappa concettuale sul contratto: requisiti, effetti, patologie e scioglimento"
        className="rounded-row border-8 border-surface"
      />
    ),
  },
  {
    line: "Tu sistemi la mappa.",
    text: "Rinomini, sposti, colori e colleghi i concetti. Tutto resta nella tua libreria, insieme ai documenti.",
    proof: (
      <Image
        src="/landing/library.png"
        alt="Home di StudyMap con il mazzo da ripassare oggi, il conto alla rovescia dell'esame, il timer di studio, le materie e le ultime mappe"
        width={1208}
        height={905}
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="w-full rounded-row bg-surface p-2"
      />
    ),
  },
  {
    line: "Infine ripassi con le flashcard.",
    text: "Domande brevi, risposte complete: segni cosa sai e torni su cosa non sai. Provane una qui accanto.",
    proof: <LiveCard />,
    accent: true,
  },
];

const FAQ = [
  {
    q: "Posso caricare documenti con dati di altre persone?",
    a: "No. Carica solo materiale di studio: dispense, slide, appunti. Niente dati personali di persone reali, come cartelle cliniche, atti di cause, dati di clienti o di pazienti.",
  },
  {
    q: "Quanto sono affidabili le mappe?",
    a: "Il modello è istruito a usare solo il tuo materiale e la terminologia corretta, ma può sbagliare. Controlla sempre la mappa: è fatta per essere corretta.",
  },
  {
    q: "Dove finiscono i miei file?",
    a: "Su server nell'Unione Europea. Per creare mappe e flashcard il testo passa a un servizio AI; i dettagli sono nell'informativa privacy. Puoi cancellare documenti e account quando vuoi.",
  },
  {
    q: "Funziona dal telefono?",
    a: "Sì, dal browser, e si può aggiungere alla schermata home come un'app. La mappa si modifica meglio da computer o tablet.",
  },
  {
    q: "Serve una carta di credito?",
    a: "No. Il piano Free è gratuito e non chiede dati di pagamento.",
  },
  {
    q: "Va bene per il mio corso di laurea?",
    a: "Sì. Funziona con il materiale di qualsiasi esame, da Analisi a Diritto privato, da Anatomia a Storia: la mappa usa i termini della tua materia. Puoi dividere tutto in materie e cartelle.",
  },
];

export default async function Home() {
  const { user } = await getUser();
  if (user) redirect("/library");

  return (
    <div className="bg-sheet text-ink">
      <RevealOnScroll />

      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-5 md:px-8">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-bold">
          <BrandMark size={24} />
          StudyMap
        </Link>
        <Link href="/login" className="rounded-full px-3 py-2 text-[17px] font-bold underline-offset-4 hover:underline">
          Accedi
        </Link>
      </header>

      <main>
        <section className="flex min-h-svh flex-col justify-center px-4 pt-24 pb-16 md:px-8">
          <h1 className="mx-auto w-full max-w-[1376px] text-[13.5vw] leading-[0.95] font-bold tracking-[-0.045em] md:text-[clamp(56px,11.4vw,176px)]">
            <span className="mask-line">
              <span className="mask-inner">Dagli appunti</span>
            </span>
            <span className="mask-line">
              <span className="mask-inner" style={{ animationDelay: "60ms" }}>
                alla mappa.
              </span>
            </span>
          </h1>
          <div className="hero-after mx-auto mt-10 flex w-full max-w-[1376px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[44ch] text-[17px] leading-relaxed md:text-[20px]">
              Carica PDF, slide o foto degli appunti: StudyMap ne ricava una mappa concettuale da modificare e le
              flashcard per ripassare. Per qualsiasi corso di laurea.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/login" className="btn-primary h-12 px-6 text-[17px]">
                Inizia gratis
              </Link>
              <Link href="/privacy" className="rounded-full px-3 py-2 text-[17px] font-bold underline-offset-4 hover:underline">
                Privacy
              </Link>
            </div>
          </div>
        </section>

        <Showcase />

        <section aria-labelledby="steps-title" className="mx-auto flex max-w-[1376px] flex-col gap-20 px-4 py-32 md:gap-28 md:px-8 md:py-48">
          {STEPS.map((s, i) => (
            <div key={s.line} className="grid items-start gap-8 lg:grid-cols-12">
              <div data-reveal className="reveal lg:col-span-6" style={{ marginLeft: `${i * 6}%` }}>
                {i === 0 ? (
                  <h2 id="steps-title" className="step-line">
                    {s.line}
                  </h2>
                ) : (
                  <h3 className={`step-line ${s.accent ? "text-accent" : ""}`}>{s.line}</h3>
                )}
                <p className="mt-3 max-w-[34ch] text-[17px] leading-relaxed text-muted">{s.text}</p>
              </div>
              <div data-reveal className="reveal flex lg:col-span-5 lg:col-start-8" style={{ transitionDelay: "90ms" }}>
                {s.proof}
              </div>
            </div>
          ))}
        </section>

        <section aria-labelledby="tools-title" className="mx-auto flex max-w-[1180px] flex-col gap-8 px-4 pb-24 md:px-8 md:pb-32">
          <h2 id="tools-title" className="text-[clamp(28px,3.6vw,40px)] leading-tight font-bold">
            Un materiale, cinque modi di studiarlo
          </h2>
          <ToolTabs />
        </section>

        <section aria-label="Impostazioni di lettura" className="bg-primary px-4 py-20 text-on-primary md:px-8 md:py-28">
          <div className="mx-auto max-w-[1180px]">
            <ReadingDemo />
          </div>
        </section>

        <section aria-labelledby="price-title" className="flex min-h-[80svh] flex-col justify-center bg-surface px-4 py-24 md:px-8">
          <div className="mx-auto w-full max-w-[1376px]">
            <h2
              id="price-title"
              data-reveal
              className="reveal section-display"
            >
              Cinque generazioni al mese, per{" "}
              <span className="inline-block rounded-[0.08em] bg-accent px-[0.15em] text-on-accent">0&nbsp;€</span>.
            </h2>
            <div data-reveal className="reveal mt-16 grid gap-8 lg:grid-cols-12 lg:items-end">
              <p className="text-[17px] leading-relaxed lg:col-span-6 lg:text-[20px]">
                Il piano Free comprende {free.generationsPerMonth} generazioni AI al mese tra mappe e mazzi di flashcard,
                PDF fino a {free.maxPdfPages} pagine, {free.maxDocuments} documenti salvati e l&apos;esportazione in PNG.
              </p>
              <div className="flex flex-col items-start gap-2 lg:col-span-3 lg:col-start-10 lg:items-end">
                <Link href="/login" className="btn-primary h-12 px-6 text-[17px]">
                  Crea l&apos;account
                </Link>
                <p className="text-sm text-muted">Il piano Pro arriverà presto.</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-title" className="mx-auto max-w-[1376px] px-4 py-32 md:px-8 md:py-48">
          <dl className="flex flex-col gap-14 md:gap-20">
            <div className="grid gap-3 lg:grid-cols-12">
              <h2 id="faq-title" className="faq-q text-muted lg:col-span-6">
                Domande frequenti
              </h2>
            </div>
            {FAQ.map((f) => (
              <div key={f.q} data-reveal className="reveal grid gap-3 lg:grid-cols-12">
                <dt className="faq-q lg:col-span-6">{f.q}</dt>
                <dd className="max-w-[40ch] text-[17px] leading-relaxed lg:col-span-5 lg:col-start-8 lg:pt-1.5">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="flex flex-col gap-32 bg-accent px-4 py-10 text-on-accent md:gap-40 md:px-8">
        <div className="mx-auto flex w-full max-w-[1376px] flex-wrap items-start justify-between gap-6 text-[17px]">
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 font-bold">StudyMap</p>
            <p className="max-w-[40ch] text-on-accent/90">Mappe concettuali e flashcard dai tuoi appunti, per chi studia all&apos;università.</p>
          </div>
          <a href="#" className="font-bold underline-offset-4 hover:underline">
            Torna su
          </a>
        </div>
        <div className="mx-auto w-full max-w-[1376px]">
          <Link
            href="/login"
            className="section-display block underline-offset-[0.08em] hover:underline"
          >
            Inizia a studiare.
          </Link>
          <div className="mt-10 flex flex-col gap-2 text-[14px] text-on-accent/90 md:flex-row md:justify-between">
            <p className="flex gap-4">
              <Link href="/privacy" className="hover:underline">
                Privacy
              </Link>
              <Link href="/login" className="hover:underline">
                Accedi
              </Link>
            </p>
            <p>Immagini: schermate di StudyMap con contenuti di esempio</p>
            <p>Italia, 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
