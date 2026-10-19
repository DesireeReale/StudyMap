import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/config/plans";
import { AccountActions } from "@/components/AccountActions";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Impostazioni" };

export default async function SettingsPage() {
  const { profile, user } = await requireUser();
  const free = PLANS.free;
  const pro = PLANS.pro;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-3xl font-bold">Impostazioni</h1>
      <p>Account: {user.email}</p>

      <section id="piano" className="card" aria-labelledby="plan">
        <h2 id="plan" className="mb-2 text-xl font-bold">
          Il tuo piano: {profile.plan === "pro" ? "Pro" : "Free"}
        </h2>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Free</th>
              <th scope="col">Pro</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Generazioni AI al mese</th>
              <td>{free.generationsPerMonth}</td>
              <td>{pro.generationsPerMonth}</td>
            </tr>
            <tr>
              <th scope="row">Pagine per PDF</th>
              <td>{free.maxPdfPages}</td>
              <td>{pro.maxPdfPages}</td>
            </tr>
            <tr>
              <th scope="row">Documenti salvati</th>
              <td>{free.maxDocuments}</td>
              <td>illimitati</td>
            </tr>
            <tr>
              <th scope="row">Esportazione</th>
              <td>PNG con marchio</td>
              <td>PNG e PDF</td>
            </tr>
          </tbody>
        </table>
        {profile.plan === "free" && <p className="mt-3 text-muted">L&apos;abbonamento Pro sarà disponibile a breve.</p>}
      </section>

      <AccountActions consentAt={profile.ai_data_sharing_consent_at} />

      <p>
        <Link href="/privacy" className="text-brand underline">
          Informativa privacy
        </Link>
      </p>
    </div>
  );
}
