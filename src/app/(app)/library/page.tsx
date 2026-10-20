import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/config/plans";
import { longDate } from "@/core/dates";
import { childrenOf } from "@/core/folders";
import { FolderTiles, NewFolderForm } from "@/components/FolderControls";
import { Empty, MapList, Panel, SearchForm } from "@/components/LibraryLists";
import { SearchResults } from "@/components/SearchResults";
import { StudyDock } from "@/components/StudyDock";
import { UsageBar } from "@/components/StudyMarks";
import { requireUser } from "@/lib/supabase/server";
import { folderStats, loadFolders, loadStudy } from "@/lib/workspace";

export const metadata: Metadata = { title: "Libreria" };

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const q = String((await searchParams).q ?? "").trim().slice(0, 100);
  const { supabase, profile } = await requireUser();
  const [folders, study, docs, maps, decks, notes] = await Promise.all([
    loadFolders(supabase),
    loadStudy(supabase, profile),
    supabase.from("documents").select("kind, folder_id"),
    supabase.from("maps").select("id, title, graph, updated_at, folder_id").order("updated_at", { ascending: false }),
    supabase.from("decks").select("folder_id"),
    supabase.from("notes").select("folder_id"),
  ]);

  const plan = PLANS[profile.plan];
  const subjects = childrenOf(folders, null);
  const mapList = maps.data ?? [];
  const docCount = docs.data?.length ?? 0;
  const stats = folderStats(folders, [docs.data ?? [], mapList, decks.data ?? [], notes.data ?? []]);

  const { focus, toReview } = study;
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

      <StudyDock data={study.dock} />

      <SearchForm q={q} label="Cerca in tutta la libreria" />

      {q ? (
        <SearchResults q={q} supabase={supabase} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <Panel title="Materie" count={subjects.length} className="lg:col-span-9">
            <FolderTiles key={subjects.map((s) => `${s.id}${s.position}`).join()} folders={subjects} stats={stats} />
            {subjects.length < plan.maxSubjects ? (
              <NewFolderForm parentId={null} label="Nuova materia" placeholder="es. Diritto privato, Analisi 1, Farmacologia" />
            ) : (
              <p className="text-sm text-muted">
                Hai {subjects.length} materie su {plan.maxSubjects}: crea sottocartelle dentro una materia o{" "}
                <Link href="/settings#piano" className="font-bold text-accent hover:underline">
                  passa a Pro
                </Link>
                .
              </p>
            )}
          </Panel>

          <Panel title="Il tuo piano" className="lg:col-span-3">
            <div className="flex flex-col gap-4">
              <UsageBar label="Generazioni AI" used={study.used} limit={plan.generationsPerMonth} unit="" />
              <UsageBar label="Documenti" used={docCount} limit={plan.maxDocuments} unit="" />
              <UsageBar label="Materie" used={subjects.length} limit={plan.maxSubjects} unit="" />
              <p className="text-sm text-muted">
                Piano {profile.plan === "pro" ? "Pro" : "Free"} ·{" "}
                <Link href="/settings#piano" className="font-bold text-accent hover:underline">
                  Dettagli
                </Link>
              </p>
            </div>
          </Panel>

          <Panel title="Ultime mappe" count={mapList.length} className="lg:col-span-12">
            {mapList.length ? (
              <MapList items={mapList.slice(0, 4)} />
            ) : (
              <Empty>Le mappe che generi dai documenti compaiono qui e nella loro materia.</Empty>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
