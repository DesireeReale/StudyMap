import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { PLANS } from "@/config/plans";
import { CREATOR, SUPPORT_EMAIL } from "@/core/feedback";
import { BrandMark } from "@/components/icons";
import { UpgradeContact } from "@/components/UpgradeContact";
import { HEART_FAILURE, MapArt } from "@/components/landing/MapArt";
import { ReadingDemo } from "@/components/landing/ReadingDemo";
import { ToolTabs } from "@/components/landing/ToolTabs";
import { getUser } from "@/lib/supabase/server";

const free = PLANS.free;
const pro = PLANS.pro;
const many = (n: number, what: string, unlimited: string) =>
  Number.isFinite(n) ? `${n} ${what}` : unlimited;

const NAV = [
  { href: "#come", label: "Come funziona" },
  { href: "#strumenti", label: "Strumenti" },
  { href: "#prezzi", label: "Prezzi" },
  { href: "#domande", label: "Domande" },
];

const STEPS: { title: string; text: string; mini: ReactNode }[] = [
  {
    title: "Carichi il materiale",
    text: "PDF, Word, PowerPoint, foto degli appunti o testo incollato. Il testo dei PDF si legge subito.",
    mini: (
      <>
        <span className="rounded-field border-2 border-dashed border-accent bg-accent-soft p-4 text-center font-bold">
          Trascina qui il PDF della lezione
        </span>
        <span className="text-[13px] text-muted">
          PDF, Word, PowerPoint, foto · fino a {free.maxPdfPages} pagine nel
          piano gratuito
        </span>
      </>
    ),
  },
  {
    title: "Scegli cosa creare",
    text: "Dal documento generi con un clic mappa, flashcard, quiz o riassunto. Li ritrovi nella cartella della materia.",
    mini: (
      <span className="grid grid-cols-2 gap-1.5">
        {["Mappa", "Flashcard", "Quiz", "Riassunto"].map((t) => (
          <span
            key={t}
            className="rounded-field border border-border bg-sheet px-2 py-1.5 font-semibold"
          >
            <span className="text-positive" aria-hidden="true">
              ✓{" "}
            </span>
            {t}
          </span>
        ))}
      </span>
    ),
  },
  {
    title: "Studi e ripassi",
    text: "Ogni giorno sai cosa ripassare e quanto manca all'esame. Le carte difficili tornano prima.",
    mini: (
      <span className="flex flex-wrap gap-1.5 rounded-row border border-dock-line bg-dock p-1.5">
        {[
          ["24", "carte oggi"],
          ["12", "giorni all'esame"],
          ["25:00", "studio"],
        ].map(([n, l], i) => (
          <span
            key={l}
            className="flex-[1_1_70px] rounded-field px-2 py-1.5 text-[12px] leading-tight text-dock-ink"
            style={{ background: `var(--dock-tile-${i + 1})` } as CSSProperties}
          >
            <b className="num block font-mono text-[18px]">{n}</b>
            {l}
          </span>
        ))}
      </span>
    ),
  },
];

const FAQ = [
  {
    q: "Dove finiscono i miei file?",
    a: "Su server nell'Unione Europea, visibili solo a te. Per creare mappe, flashcard e quiz il testo passa a un servizio AI; i dettagli sono nell'informativa privacy. Puoi cancellare un documento o l'intero account quando vuoi dalle Impostazioni.",
  },
  {
    q: "Posso caricare documenti con dati di altre persone?",
    a: "No. Carica solo materiale di studio: dispense, slide, appunti. Niente dati personali di persone reali, come cartelle cliniche, atti di cause, dati di clienti o di pazienti.",
  },
  {
    q: "L'AI usa i miei contenuti per addestrarsi?",
    a: "In questa fase l'app usa servizi AI gratuiti che possono conservare i testi inviati e usarli per migliorare i loro modelli. Per questo l'AI si attiva solo con un consenso separato, che puoi ritirare in qualsiasi momento dalle Impostazioni.",
  },
  {
    q: "Quanto sono affidabili mappe e quiz?",
    a: "Il modello è istruito a usare solo il tuo materiale e la terminologia corretta, ma può sbagliare. Controlla sempre quello che genera: mappe, flashcard e appunti si correggono a mano.",
  },
  {
    q: "Quali file posso caricare?",
    a: "PDF, Word, PowerPoint, foto degli appunti (PNG, JPEG, WebP) e testo incollato.",
  },
  {
    q: "Va bene per chi ha DSA?",
    a: "È pensata anche per chi ha DSA: caratteri ad alta leggibilità, testo più grande e più spaziato, mappe in maiuscolo, sfondi di lettura, contrasto verificato e uso completo da tastiera.",
  },
  {
    q: "Va bene per il mio corso di laurea?",
    a: "Sì. Funziona con il materiale di qualsiasi esame, da Analisi a Diritto privato, da Anatomia a Storia. È nata per infermieristica, quindi conosce bene i termini clinici.",
  },
  {
    q: "Serve una carta di credito?",
    a: "No. Il piano gratuito non chiede dati di pagamento.",
  },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[13px] leading-none tracking-[0.06em] text-accent uppercase">
      {children}
    </span>
  );
}

function SectionHead({
  eyebrow,
  title,
  id,
  children,
}: {
  eyebrow: string;
  title: string;
  id: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex max-w-[60ch] flex-col gap-3">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        id={id}
        className="text-[clamp(28px,3.6vw,40px)] leading-[1.12] font-bold tracking-[-0.02em] text-balance"
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

const btnGhost =
  "btn h-[50px] px-6 text-[17px] text-ink ring-2 ring-border ring-inset hover:bg-active";

function Check({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="font-bold text-positive" aria-hidden="true">
        ✓
      </span>
      {children}
    </li>
  );
}

export default async function Home() {
  const { user } = await getUser();
  if (user) redirect("/library");

  return (
    <div className="bg-chrome font-sans text-[17px] leading-[1.6] text-ink [--body-font:var(--font-atkinson-next),system-ui,sans-serif]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-field focus:bg-sheet focus:p-3"
      >
        Vai al contenuto
      </a>

      <header className="sticky top-0 z-20 border-b border-border bg-chrome/95 backdrop-blur-sm">
        <nav
          aria-label="Principale"
          className="mx-auto flex h-16 w-full max-w-[1196px] items-center gap-6 px-6"
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 font-display text-[18px] font-bold"
          >
            <BrandMark size={30} />
            StudyMap
          </Link>
          <ul className="ml-auto hidden items-center gap-[22px] text-[16px] md:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  className="font-semibold text-muted hover:text-ink"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="btn-primary ml-auto h-[42px] px-[18px] text-[16px] md:ml-0"
          >
            Inizia gratis
          </Link>
        </nav>
      </header>

      <main id="main">
        <section
          aria-labelledby="hero-title"
          className="py-[clamp(56px,8vw,96px)]"
        >
          <div className="mx-auto grid w-full max-w-[1180px] items-center gap-[clamp(32px,5vw,64px)] px-4 min-[901px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="flex flex-col gap-[22px]">
              <Eyebrow>
                Per studiare meglio, qualsiasi materia
              </Eyebrow>
              <h1
                id="hero-title"
                className="text-[clamp(38px,5.4vw,60px)] leading-[1.05] font-bold tracking-[-0.025em] text-balance"
              >
                Carichi la lezione. Ripassi da una mappa.
              </h1>
              <p className="max-w-[46ch] text-[clamp(18px,1.6vw,20px)] text-muted">
                Dal PDF, dalle slide o dalla foto degli appunti, StudyMap ricava
                una mappa concettuale da modificare, flashcard che tornano
                quando stai per dimenticarle, quiz con le spiegazioni e un
                riassunto da correggere.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="btn-primary h-[50px] px-6 text-[17px]"
                >
                  Inizia gratis
                </Link>
                <a href="#come" className={btnGhost}>
                  Guarda come funziona
                </a>
              </div>
            </div>

            <div className="relative">
              <figure className="overflow-hidden rounded-card border border-border bg-sheet shadow-[0_24px_60px_-30px_rgb(15_27_45/0.35)]">
                <figcaption className="flex items-center gap-2.5 border-b border-border px-4 py-2.5 text-[14px] text-muted">
                  <b className="text-ink">Scompenso cardiaco</b> ·
                  Infermieristica clinica
                  <span className="num ml-auto rounded-md bg-accent-soft px-2 py-0.5 font-mono text-[12px] text-ink">
                    9 concetti
                  </span>
                </figcaption>
                <MapArt
                  data={HEART_FAILURE}
                  label="Esempio di mappa concettuale sullo scompenso cardiaco con tre rami: segni e sintomi, farmaci, assistenza"
                />
              </figure>
              <div
                aria-hidden="true"
                className="mt-3 flex flex-col gap-1.5 rounded-row border border-border bg-sheet px-3.5 py-3 shadow-[0_16px_40px_-24px_rgb(15_27_45/0.45)] min-[561px]:absolute min-[561px]:right-2 min-[561px]:bottom-[-26px] min-[561px]:mt-0 min-[561px]:max-w-[230px] min-[901px]:right-[-14px]"
              >
                <span className="font-mono text-[11px] tracking-[0.05em] text-muted uppercase">
                  Flashcard · da ripassare
                </span>
                <span className="leading-snug font-bold">
                  Primo segno dello scompenso sinistro?
                </span>
                <span className="rounded-md bg-pill-positive px-2 py-1 text-[14px] text-pill-positive-ink">
                  Dispnea da sforzo
                </span>
              </div>
              <div
                aria-hidden="true"
                className="absolute bottom-[-40px] left-2 hidden max-w-[230px] flex-col gap-1.5 rounded-row border border-border bg-sheet px-3.5 py-3 shadow-[0_16px_40px_-24px_rgb(15_27_45/0.45)] min-[561px]:flex min-[901px]:left-[-14px]"
              >
                <span className="font-mono text-[11px] tracking-[0.05em] text-muted uppercase">
                  Quiz · 8 su 10
                </span>
                <span className="leading-snug font-bold">
                  Hai sbagliato 2 domande sui diuretici
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="come"
          aria-labelledby="come-title"
          className="scroll-mt-16 py-[clamp(56px,8vw,96px)]"
        >
          <div className="mx-auto flex w-full max-w-[1180px] px-4 flex-col gap-10">
            <SectionHead
              eyebrow="Come funziona"
              title="Tre passi, dal materiale al ripasso"
              id="come-title"
            />
            <ol className="grid gap-5 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="flex flex-col gap-3 rounded-card border border-border bg-sheet p-[22px]"
                >
                  <span
                    className="grid size-[34px] place-items-center rounded-full bg-primary font-display font-bold text-on-primary"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-[20px] leading-tight font-semibold">
                    {s.title}
                  </h3>
                  <p className="text-muted">{s.text}</p>
                  <div
                    aria-hidden="true"
                    className="flex flex-col gap-2 rounded-row border border-dashed border-border bg-chrome p-3.5 text-[14px]"
                  >
                    {s.mini}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="strumenti"
          aria-labelledby="tools-title"
          className="scroll-mt-16 pb-[clamp(56px,8vw,96px)]"
        >
          <div className="mx-auto flex w-full max-w-[1180px] px-4 flex-col gap-8">
            <SectionHead
              eyebrow="Strumenti"
              title="Un materiale, cinque modi di studiarlo"
              id="tools-title"
            />
            <ToolTabs />
          </div>
        </section>

        <section
          aria-label="Impostazioni di lettura"
          className="bg-band py-[clamp(56px,8vw,96px)] text-on-band"
        >
          <div className="mx-auto w-full max-w-[1180px] px-4">
            <ReadingDemo />
          </div>
        </section>

        <section
          id="prezzi"
          aria-labelledby="prezzi-title"
          className="scroll-mt-16 py-[clamp(56px,8vw,96px)]"
        >
          <div className="mx-auto flex w-full max-w-[786px] px-4 flex-col gap-8">
            <SectionHead
              eyebrow="Prezzi"
              title="Gratis per iniziare, senza crediti nascosti"
              id="prezzi-title"
            >
              <p className="text-[clamp(18px,1.6vw,20px)] text-muted">
                Contiamo le generazioni, non crediti dal valore misterioso. Se
                una generazione non riesce, non viene contata.
              </p>
            </SectionHead>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-4 rounded-card border border-border bg-sheet p-6">
                <h3 className="text-[20px] leading-tight font-semibold">Gratis</h3>
                <p className="font-display text-[36px] leading-none font-bold">
                  0 €{" "}
                  <small className="font-sans text-[16px] font-normal text-muted">
                    per sempre
                  </small>
                </p>
                <ul className="flex flex-col gap-2">
                  <Check>
                    {many(
                      free.generationsPerMonth,
                      "generazioni AI al mese",
                      "Generazioni AI illimitate",
                    )}
                  </Check>
                  <Check>PDF fino a {free.maxPdfPages} pagine</Check>
                  <Check>
                    {many(
                      free.maxDocuments,
                      "documenti salvati",
                      "Documenti illimitati",
                    )}
                  </Check>
                  <Check>
                    {many(free.maxSubjects, "materie", "Materie illimitate")}
                  </Check>
                  <Check>
                    {many(
                      free.quizzesPerWeek,
                      "quiz a settimana",
                      "Quiz illimitati",
                    )}
                  </Check>
                  <Check>
                    {many(
                      free.chatQuestionsPerMonth,
                      "domande al documento al mese",
                      "Domande al documento illimitate",
                    )}
                  </Check>
                  <Check>Export PNG con marchio</Check>
                </ul>
                <Link href="/login" className={`${btnGhost} mt-auto w-full`}>
                  Inizia gratis
                </Link>
              </div>
              <div className="flex flex-col gap-4 rounded-card border-2 border-accent bg-sheet p-6">
                <h3 className="text-[20px] leading-tight font-semibold">Pro</h3>
                <p className="font-display text-[36px] leading-none font-bold">
                  Su richiesta
                </p>
                <ul className="flex flex-col gap-2">
                  <Check>
                    {many(
                      pro.generationsPerMonth,
                      "generazioni AI al mese",
                      "Generazioni AI illimitate",
                    )}
                  </Check>
                  <Check>PDF fino a {pro.maxPdfPages} pagine</Check>
                  <Check>
                    {many(
                      pro.maxDocuments,
                      "documenti",
                      "Documenti illimitati",
                    )}
                  </Check>
                  <Check>
                    {many(pro.maxSubjects, "materie", "Materie illimitate")}
                  </Check>
                  <Check>
                    {many(
                      pro.quizzesPerWeek,
                      "quiz a settimana",
                      "Quiz illimitati",
                    )}
                  </Check>
                  <Check>
                    {many(
                      pro.chatQuestionsPerMonth,
                      "domande al documento al mese",
                      "Domande al documento illimitate",
                    )}
                  </Check>
                  <Check>Export PNG e PDF senza marchio</Check>
                </ul>
                <UpgradeContact className="mt-auto text-[14px] text-muted" />
              </div>
            </div>
            <p className="rounded-row bg-accent-soft px-5 py-4 font-bold">
              Quello che crei resta tuo: se un limite finisce, mappe, flashcard
              e appunti restano lì e li apri quando vuoi.
            </p>
          </div>
        </section>

        <section
          id="domande"
          aria-labelledby="domande-title"
          className="scroll-mt-16 pb-[clamp(56px,8vw,96px)]"
        >
          <div className="mx-auto grid w-full max-w-[1180px] px-4 gap-10 lg:grid-cols-[2fr_3fr]">
            <SectionHead
              eyebrow="Domande"
              title="Le risposte prima di iscriverti"
              id="domande-title"
            />
            <div>
              {FAQ.map((f) => (
                <details
                  key={f.q}
                  className="group border-b border-border py-4"
                >
                  <summary className="flex cursor-pointer list-none justify-between gap-4 font-display text-[18px] font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      className="text-[22px] leading-none text-accent group-open:hidden"
                      aria-hidden="true"
                    >
                      +
                    </span>
                    <span
                      className="hidden text-[22px] leading-none text-accent group-open:inline"
                      aria-hidden="true"
                    >
                      −
                    </span>
                  </summary>
                  <p className="mt-2.5 max-w-[62ch] text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="final-title"
          className="pb-[clamp(56px,8vw,96px)] text-center"
        >
          <div className="mx-auto flex w-full max-w-[1180px] px-4 flex-col items-center gap-4">
            <h2
              id="final-title"
              className="text-[clamp(28px,3.6vw,40px)] leading-[1.12] font-bold tracking-[-0.02em] text-balance"
            >
              La prossima lezione, già in mappa
            </h2>
            <p className="text-[clamp(18px,1.6vw,20px)] text-muted">
              Ti bastano un PDF e due minuti.
            </p>
            <Link href="/login" className="btn-primary h-[50px] px-6 text-[17px]">
              Inizia gratis
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-7 text-[14px] text-muted">
        <div className="mx-auto flex w-full max-w-[1180px] px-4 flex-wrap justify-between gap-x-6 gap-y-3">
          <span>StudyMap · Italia</span>
          <span className="flex flex-wrap gap-4">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink hover:underline">
              {SUPPORT_EMAIL}
            </a>
            <Link href="/privacy" className="hover:text-ink hover:underline">
              Privacy
            </Link>
            <Link href="/login" className="hover:text-ink hover:underline">
              Accedi
            </Link>
          </span>
        </div>
        <div className="mx-auto mt-10 flex max-w-[1180px] flex-col items-center gap-2 px-4 text-center text-[13px]">
          <Image src="/brand/volpe-192.png" width={88} height={88} alt="" />
          <p className="mt-2">Una mappa alla volta, fino all&apos;esame.</p>
          <p>
            © 2026 StudyMap, creato da{" "}
            <a href={CREATOR.url} target="_blank" rel="noopener" className="text-ink underline underline-offset-2 hover:text-accent">
              {CREATOR.name}
            </a>{" "}
            con <span aria-label="amore" className="text-negative">♥</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
