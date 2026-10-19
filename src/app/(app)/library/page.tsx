import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/config/plans";
import { monthPeriod } from "@/core/entitlements";
import { UploadForm } from "@/components/UploadForm";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Libreria" };

const date = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });

export default async function LibraryPage() {
  const { supabase, user, profile } = await requireUser();
  const [docs, maps, decks, usage] = await Promise.all([
    supabase.from("documents").select("id, title, kind, page_count, created_at").order("created_at", { ascending: false }),
    supabase.from("maps").select("id, title, updated_at").order("updated_at", { ascending: false }),
    supabase.from("decks").select("id, title, created_at").order("created_at", { ascending: false }),
    supabase.from("quota_counters").select("count").eq("period", monthPeriod()).eq("kind", "generation").maybeSingle(),
  ]);
  const plan = PLANS[profile.plan];
  const used = usage.data?.count ?? 0;
  const docCount = docs.data?.length ?? 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-8">
        <section aria-labelledby="upload">
          <h1 id="upload" className="mb-4 text-2xl font-bold">
            Nuovo materiale
          </h1>
          <UploadForm userId={user.id} maxUploadBytes={plan.maxUploadBytes} />
        </section>

        <section aria-labelledby="docs">
          <h2 id="docs" className="mb-3 text-xl font-bold">
            Documenti
          </h2>
          {docCount === 0 ? (
            <p className="text-muted">Nessun documento: carica il primo qui sopra.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {docs.data!.map((d) => (
                <li key={d.id}>
                  <Link href={`/documents/${d.id}`} className="card block hover:border-brand">
                    <span className="font-bold">{d.title}</span>
                    <span className="block text-sm text-muted">
                      {d.kind.toUpperCase()} · {d.page_count} {d.page_count === 1 ? "pagina" : "pagine"} ·{" "}
                      {date(d.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-8">
        <section aria-labelledby="usage" className="card">
          <h2 id="usage" className="mb-2 font-bold">
            Utilizzo di questo mese
          </h2>
          <p>
            Generazioni AI: {used} / {plan.generationsPerMonth}
          </p>
          <p>
            Documenti: {docCount} / {Number.isFinite(plan.maxDocuments) ? plan.maxDocuments : "illimitati"}
          </p>
        </section>

        <section aria-labelledby="maps">
          <h2 id="maps" className="mb-3 text-xl font-bold">
            Mappe
          </h2>
          <ItemList items={maps.data ?? []} href={(id) => `/maps/${id}`} empty="Ancora nessuna mappa." />
        </section>

        <section aria-labelledby="decks">
          <h2 id="decks" className="mb-3 text-xl font-bold">
            Flashcard
          </h2>
          <ItemList items={decks.data ?? []} href={(id) => `/decks/${id}`} empty="Ancora nessun mazzo." />
        </section>
      </aside>
    </div>
  );
}

function ItemList({
  items,
  href,
  empty,
}: {
  items: { id: string; title: string }[];
  href: (id: string) => string;
  empty: string;
}) {
  if (!items.length) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-1">
      {items.map((i) => (
        <li key={i.id}>
          <Link href={href(i.id)} className="text-brand underline">
            {i.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
