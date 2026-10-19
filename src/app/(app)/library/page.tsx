import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PLANS } from "@/config/plans";
import { daysUntil, longDate, shortDate } from "@/core/dates";
import { monthPeriod } from "@/core/entitlements";
import { Icon } from "@/components/icons";
import { StudyDock } from "@/components/StudyDock";
import { DeckStrip, MapThumb, UsageBar, type DeckCounts } from "@/components/StudyMarks";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Libreria" };

const KIND_LABEL = { pdf: "PDF", image: "Immagine", text: "Testo" } as const;

export default async function LibraryPage() {
  const { supabase, profile } = await requireUser();
  const [docs, maps, decks, cards, usage] = await Promise.all([
    supabase.from("documents").select("id, title, kind, page_count, created_at").order("created_at", { ascending: false }),
    supabase.from("maps").select("id, title, graph, updated_at").order("updated_at", { ascending: false }),
    supabase.from("decks").select("id, title, created_at").order("created_at", { ascending: false }),
    supabase.from("flashcards").select("deck_id, last_result"),
    supabase.from("quota_counters").select("count").eq("period", monthPeriod()).eq("kind", "generation").maybeSingle(),
  ]);

  const plan = PLANS[profile.plan];
  const documents = docs.data ?? [];
  const mapList = maps.data ?? [];
  const deckList = decks.data ?? [];
  const used = usage.data?.count ?? 0;

  const counts = new Map<string, DeckCounts>();
  for (const c of cards.data ?? []) {
    const k = counts.get(c.deck_id) ?? { known: 0, unknown: 0, fresh: 0 };
    if (c.last_result === "known") k.known++;
    else if (c.last_result === "unknown") k.unknown++;
    else k.fresh++;
    counts.set(c.deck_id, k);
  }
  const toReview = [...counts.values()].reduce((sum, k) => sum + k.unknown + k.fresh, 0);
  const pending = (k: DeckCounts | undefined) => (k ? k.unknown + k.fresh : 0);
  const focus = [...deckList].sort((a, b) => pending(counts.get(b.id)) - pending(counts.get(a.id)))[0];
  const focusCounts = focus ? counts.get(focus.id) : undefined;

  const [title, action] =
    focus && toReview > 0
      ? [`Oggi ripassi ${focus.title}.`, { href: `/decks/${focus.id}`, label: "Inizia il ripasso" }]
      : focus
        ? ["Oggi hai ripassato tutto.", { href: "/upload", label: "Carica materiale" }]
        : ["Carica il materiale da studiare.", { href: "/upload", label: "Carica materiale" }];

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <header className="mb-4 flex flex-col gap-5">
        <p className="text-[15px] text-muted">{longDate()}</p>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h1 className="max-w-[18ch] text-[36px] leading-[1.02] font-bold tracking-[-0.03em] md:text-[52px]">{title}</h1>
          <Link href={action.href} className="btn-primary h-12 px-6 text-[17px]">
            {action.label}
          </Link>
        </div>
      </header>

      <StudyDock
        data={{
          deck: focus && focusCounts
            ? { title: focus.title, known: focusCounts.known, total: focusCounts.known + pending(focusCounts) }
            : null,
          toReview,
          examDays: profile.exam_date ? daysUntil(profile.exam_date) : null,
          lastMap: mapList[0] ? { id: mapList[0].id, title: mapList[0].title } : null,
          generations: { used, limit: plan.generationsPerMonth },
        }}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel title="Mappe" count={mapList.length} className="lg:col-span-9">
          {mapList.length ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Link
                href={`/maps/${mapList[0]!.id}`}
                className="row-card flex flex-col gap-3 p-3 hover:border-control md:row-span-3"
              >
                <MapThumb graph={mapList[0]!.graph} width={320} height={150} />
                <span className="min-w-0 px-1 pb-1">
                  <span className="block truncate font-bold">{mapList[0]!.title}</span>
                  <span className="num block text-[13px] text-muted">
                    {mapList[0]!.graph.nodes.length} concetti · aggiornata {shortDate(mapList[0]!.updated_at)}
                  </span>
                </span>
              </Link>
              {mapList.length > 1 ? (
                mapList.slice(1, 4).map((m) => (
                  <Link key={m.id} href={`/maps/${m.id}`} className="row-card flex min-h-[63px] items-center gap-3 hover:border-control">
                    <MapThumb graph={m.graph} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{m.title}</span>
                      <span className="num block text-[13px] text-muted">
                        {m.graph.nodes.length} concetti · {shortDate(m.updated_at)}
                      </span>
                    </span>
                  </Link>
                ))
              ) : (
                <p className="self-center text-sm text-muted md:row-span-3">
                  Apri la mappa per rinominare, spostare e colorare i concetti, poi esportala in PNG.
                </p>
              )}
            </div>
          ) : (
            <Empty>Le mappe che generi dai documenti compaiono qui.</Empty>
          )}
        </Panel>

        <Panel title="Il tuo piano" className="lg:col-span-3">
          <div className="flex flex-col gap-4">
            <UsageBar label="Generazioni AI" used={used} limit={plan.generationsPerMonth} unit="" />
            <UsageBar label="Documenti" used={documents.length} limit={plan.maxDocuments} unit="" />
            <p className="text-sm text-muted">
              Piano {profile.plan === "pro" ? "Pro" : "Free"} ·{" "}
              <Link href="/settings#piano" className="font-bold text-accent hover:underline">
                Dettagli
              </Link>
            </p>
          </div>
        </Panel>

        <Panel title="Flashcard" count={deckList.length} className="lg:col-span-6">
          {deckList.length ? (
            <ul className="flex flex-col gap-2">
              {deckList.map((d) => (
                <li key={d.id}>
                  <Link href={`/decks/${d.id}`} className="row-card flex min-h-[63px] flex-col gap-2 hover:border-control">
                    <span className="flex items-center gap-2 font-bold">
                      <Icon name="cards" size={16} className="shrink-0 text-muted" />
                      <span className="truncate">{d.title}</span>
                    </span>
                    <DeckStrip counts={counts.get(d.id) ?? { known: 0, unknown: 0, fresh: 0 }} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Genera le flashcard da un documento per iniziare a ripassare.</Empty>
          )}
        </Panel>

        <Panel title="Documenti" count={documents.length} className="lg:col-span-6">
          {documents.length ? (
            <ul className="flex flex-col gap-2">
              {documents.map((d) => (
                <li key={d.id}>
                  <Link href={`/documents/${d.id}`} className="row-card flex min-h-[63px] items-center gap-3 hover:border-control">
                    <Icon name="file" size={16} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{d.title}</span>
                      <span className="num block text-[13px] text-muted">
                        {KIND_LABEL[d.kind]} · {d.page_count} {d.page_count === 1 ? "pagina" : "pagine"}
                      </span>
                    </span>
                    <span className="num shrink-0 text-[13px] text-muted">{shortDate(d.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              Nessun documento.{" "}
              <Link href="/upload" className="font-bold text-accent hover:underline">
                Carica il primo
              </Link>
            </Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  count,
  className = "",
  children,
}: {
  title: string;
  count?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className={`panel flex flex-col gap-4 ${className}`}>
      <h2 className="flex items-center gap-2 text-[15px] font-bold">
        {title}
        {count !== undefined && (
          <span className="num rounded-full bg-sheet px-2 py-0.5 text-xs font-normal text-muted">{count}</span>
        )}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-row border border-dashed border-control px-4 py-3 text-sm text-muted">{children}</p>;
}
