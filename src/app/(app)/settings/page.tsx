import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PLANS } from "@/config/plans";
import { ConsentToggle, DeleteAccount, ExamDate } from "@/components/AccountActions";
import { FeedbackForm } from "@/components/FeedbackForm";
import { WorkspacePicker } from "@/components/StyleSwitch";
import { getWorkspace } from "@/lib/app-style";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Impostazioni" };

const fmt = (n: number) => (Number.isFinite(n) ? String(n) : "illimitati");

export default async function SettingsPage() {
  const { profile, user } = await requireUser();
  const free = PLANS.free;
  const pro = PLANS.pro;
  const rows: [string, string, string][] = [
    ["Generazioni AI al mese", fmt(free.generationsPerMonth), fmt(pro.generationsPerMonth)],
    ["Pagine per PDF", fmt(free.maxPdfPages), fmt(pro.maxPdfPages)],
    ["Documenti salvati", fmt(free.maxDocuments), fmt(pro.maxDocuments)],
    ["Materie", fmt(free.maxSubjects), fmt(pro.maxSubjects)],
    ["Esportazione", "PNG con marchio", "PNG e PDF"],
  ];

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col">
      <header className="mb-8">
        <h1 className="text-[24px] leading-tight font-bold">Impostazioni</h1>
        <p className="mt-1 text-[15px] text-muted">{user.email}</p>
      </header>

      <Section id="piano" title="Piano" description={`Sei sul piano ${profile.plan === "pro" ? "Pro" : "Free"}.`}>
        <table className="num w-full text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="pb-2 font-normal">
                <span className="sr-only">Funzione</span>
              </th>
              <th scope="col" className={`pb-2 text-right font-normal ${profile.plan === "free" ? "font-bold text-ink" : ""}`}>
                Free
              </th>
              <th scope="col" className={`pb-2 text-right font-normal ${profile.plan === "pro" ? "font-bold text-ink" : ""}`}>
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, f, p]) => (
              <tr key={label} className="border-t border-rule">
                <th scope="row" className="py-2.5 font-normal">
                  {label}
                </th>
                <td className="py-2.5 text-right">{f}</td>
                <td className="py-2.5 text-right">{p}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {profile.plan === "free" && <p className="mt-4 text-sm text-muted">L&apos;abbonamento Pro sarà disponibile a breve.</p>}
      </Section>

      <Section id="esame" title="Esame" description="Nella home compare il conto alla rovescia dei giorni che mancano.">
        <ExamDate userId={user.id} initial={profile.exam_date} />
      </Section>

      <Section id="stile" title="Il tuo spazio" description="Tema, carattere e dimensione del testo. Le scelte si salvano nel tuo account e le ritrovi su ogni dispositivo. Ogni tema ha una versione chiara e una scura, che segue il sistema.">
        <WorkspacePicker initial={(await getWorkspace(profile.preferences)).prefs} />
      </Section>

      <Section
        title="Dati e AI"
        description={
          <>
            Cosa può succedere ai materiali che carichi.{" "}
            <Link href="/privacy" className="font-bold text-accent hover:underline">
              Informativa privacy
            </Link>
          </>
        }
      >
        <ConsentToggle consentAt={profile.ai_data_sharing_consent_at} />
      </Section>

      <Section
        id="suggerimenti"
        title="Suggerisci un'idea"
        description="Proponi una funzione nuova o segnala qualcosa che non va. Il messaggio viene salvato insieme al tuo account."
      >
        <FeedbackForm />
      </Section>

      <Section
        title="Elimina account"
        description="Cancella in modo permanente account, documenti, file caricati, mappe e flashcard. Non si può annullare."
      >
        <DeleteAccount />
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-label={title} className="grid gap-4 border-t border-border py-8 first-of-type:border-t-0 first-of-type:pt-0 lg:grid-cols-12">
      <div className="lg:col-span-4 lg:pt-1.5">
        <h2 className="text-base font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="panel p-5 lg:col-span-8">{children}</div>
    </section>
  );
}
