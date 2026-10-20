import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/config/plans";
import { longDate } from "@/core/dates";
import { childrenOf } from "@/core/folders";
import { FolderGrid } from "@/components/FolderControls";
import { Empty, MaterialList, PageHeader, SearchForm, Section } from "@/components/LibraryLists";
import { SearchResults } from "@/components/SearchResults";
import { StudyDock } from "@/components/StudyDock";
import { requireUser } from "@/lib/supabase/server";
import { folderStats, loadFolders, loadStudy, toMaterials } from "@/lib/workspace";

export const metadata: Metadata = { title: "Libreria" };

const fmt = (n: number) => (Number.isFinite(n) ? n : "∞");

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const q = String((await searchParams).q ?? "").trim().slice(0, 100);
  const { supabase, profile } = await requireUser();
  const [folders, study, docs, mapFolders, recentMaps, decks, notes] = await Promise.all([
    loadFolders(supabase),
    loadStudy(supabase, profile),
    supabase.from("documents").select("id, title, kind, page_count, created_at, folder_id").order("created_at", { ascending: false }),
    supabase.from("maps").select("folder_id"),
    supabase.from("maps").select("id, title, graph, updated_at, folder_id").order("updated_at", { ascending: false }).limit(3),
    supabase.from("decks").select("id, title, created_at, folder_id").order("created_at", { ascending: false }),
    supabase.from("notes").select("id, title, updated_at, folder_id").order("updated_at", { ascending: false }),
  ]);

  const plan = PLANS[profile.plan];
  const subjects = childrenOf(folders, null);
  const docList = docs.data ?? [];
  const stats = folderStats(folders, [docList, mapFolders.data ?? [], decks.data ?? [], notes.data ?? []]);
  const recent = toMaterials(
    { documents: docList.slice(0, 3), notes: (notes.data ?? []).slice(0, 3), maps: recentMaps.data ?? [], decks: (decks.data ?? []).slice(0, 3) },
    folders,
    study.counts,
  ).slice(0, 4);

  const { focus, toReview } = study;
  const [title, action] =
    focus && toReview > 0
      ? [`Oggi ripassi ${focus.title}.`, { href: `/decks/${focus.id}`, label: "Inizia il ripasso" }]
      : focus
        ? ["Oggi hai ripassato tutto.", { href: "/upload", label: "Carica materiale" }]
        : ["Carica il materiale da studiare.", { href: "/upload", label: "Carica materiale" }];

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-10">
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={`Home · ${longDate()}`}
          title={title}
          actions={
            <Link href={action.href} className="btn-primary h-11 px-5">
              {action.label}
            </Link>
          }
        />
        <StudyDock data={study.dock} />
        <SearchForm q={q} label="Cerca in tutta la libreria" />
      </div>

      {q ? (
        <SearchResults q={q} supabase={supabase} folders={folders} />
      ) : (
        <>
          <FolderGrid
            key={subjects.map((s) => `${s.id}${s.position}`).join()}
            title="Materie"
            folders={subjects}
            stats={stats}
            parentId={null}
            newLabel="Nuova materia"
            placeholder="es. Diritto privato"
            canCreate={subjects.length < plan.maxSubjects}
            limitNotice={
              <p className="text-sm text-muted">
                Hai {subjects.length} materie su {plan.maxSubjects}: crea sottocartelle dentro una materia o{" "}
                <Link href="/settings#piano" className="font-bold text-accent hover:underline">
                  passa a Pro
                </Link>
                .
              </p>
            }
          />

          <Section title="Continua da dove eri">
            {recent.length ? (
              <MaterialList items={recent} />
            ) : (
              <Empty>Qui ritrovi gli ultimi documenti, appunti, mappe e flashcard su cui hai lavorato.</Empty>
            )}
          </Section>
        </>
      )}

      <p className="num border-t border-rule pt-4 text-[13px] text-muted">
        Piano {profile.plan === "pro" ? "Pro" : "Free"} · {study.used} di {fmt(plan.generationsPerMonth)} generazioni AI
        questo mese · {docList.length} di {fmt(plan.maxDocuments)} documenti · {subjects.length} di {fmt(plan.maxSubjects)}{" "}
        materie ·{" "}
        <Link href="/settings#piano" className="font-bold text-accent hover:underline">
          Dettagli
        </Link>
      </p>
    </div>
  );
}
