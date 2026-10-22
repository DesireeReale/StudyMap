import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { daysUntil } from "@/core/dates";
import { childrenOf, MAX_FOLDER_DEPTH, moveTargets, pathTo, subtreeIds } from "@/core/folders";
import { Breadcrumb } from "@/components/Breadcrumb";
import { InlineRename } from "@/components/EditableTitle";
import { FolderGrid, FolderSettings } from "@/components/FolderControls";
import { Icon } from "@/components/icons";
import { EmptyAction, FolderBadge, PageHeader, SearchForm, Section } from "@/components/LibraryLists";
import { MaterialBrowser } from "@/components/MaterialBrowser";
import { SearchResults } from "@/components/SearchResults";
import { StudyDock } from "@/components/StudyDock";
import { requireUser } from "@/lib/supabase/server";
import { folderStats, folderTrail, loadFolders, loadStudy, pageTitle, toMaterials } from "@/lib/workspace";

export async function generateMetadata({ params }: PageProps<"/folders/[id]">): Promise<Metadata> {
  return pageTitle("folders", (await params).id);
}

export default async function FolderPage({ params, searchParams }: PageProps<"/folders/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const q = String(query.q ?? "").trim().slice(0, 100);
  const { supabase, profile } = await requireUser();
  const foldersP = loadFolders(supabase);
  const [folders, study, docs, maps, decks, notes, quizzes] = await Promise.all([
    foldersP,
    loadStudy(supabase, profile, foldersP.then((f) => subtreeIds(f, id))),
    supabase.from("documents").select("id, title, kind, page_count, created_at, folder_id"),
    supabase.from("maps").select("id, title, graph, updated_at, folder_id"),
    supabase.from("decks").select("id, title, created_at, folder_id"),
    supabase.from("notes").select("id, title, updated_at, folder_id"),
    supabase.from("quizzes").select("id, title, created_at, folder_id"),
  ]);
  const folder = folders.find((f) => f.id === id);
  if (!folder) notFound();

  const depth = pathTo(folders, id).length;
  const children = childrenOf(folders, id);
  const tree = subtreeIds(folders, id);
  const here = <T extends { folder_id: string }>(rows: T[] | null) => (rows ?? []).filter((r) => r.folder_id === id);
  const all = toMaterials(
    { documents: here(docs.data), notes: here(notes.data), maps: here(maps.data), decks: here(decks.data), quizzes: here(quizzes.data) },
    [],
    study.counts,
  );
  const stats = folderStats(folders, [docs.data ?? [], maps.data ?? [], decks.data ?? [], notes.data ?? [], quizzes.data ?? []]);
  const isEmpty = children.length + all.length === 0;
  const rootCount = childrenOf(folders, null).length;
  const kind = depth === 1 ? "materia" : "cartella";
  const upload = `/upload?folder=${id}`;
  const base = `/folders/${id}`;

  const subfolders = (children.length > 0 || depth < MAX_FOLDER_DEPTH) && (
    <FolderGrid
      key={children.map((c) => `${c.id}${c.position}`).join()}
      title="Cartelle"
      hint={children.length ? undefined : "facoltative, per dividerla in parti"}
      folders={children}
      stats={stats}
      parentId={id}
      newLabel="Nuova cartella"
      placeholder="es. Scritto"
      canCreate={depth < MAX_FOLDER_DEPTH}
    />
  );

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-10">
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={<Breadcrumb trail={folderTrail(folders, id).slice(0, -1)} current={folder.name} />}
          title={
            <span className="flex items-center gap-3">
              <FolderBadge color={folder.color} icon={folder.icon} size={44} />
              <span className="min-w-0">
                <InlineRename table="folders" id={folder.id} value={folder.name} label="Nome della cartella" />
              </span>
            </span>
          }
          actions={
            <>
              <Link href={`${base}?personalizza=1#personalizza`} className="btn-secondary h-11 px-5">
                Personalizza
              </Link>
              <Link href={upload} className="btn-primary h-11 px-5">
                <Icon name="upload" />
                Carica qui
              </Link>
            </>
          }
        />
        {depth === 1 && (
          <StudyDock
            data={{
              ...study.dock,
              ...(folder.exam_date ? { examDays: daysUntil(folder.exam_date), examDate: folder.exam_date } : {}),
              examHref: `${base}?personalizza=1#personalizza`,
            }}
          />
        )}
        <SearchForm q={q} label={`Cerca in ${folder.name}`} />
      </div>

      {q ? (
        <SearchResults q={q} supabase={supabase} folders={folders} folderIds={tree} />
      ) : (
        <>
          {children.length > 0 && subfolders}

          {all.length ? (
            <MaterialBrowser items={all} emptyText={`Niente di questo tipo in questa ${kind}.`} />
          ) : (
          <Section title="Materiale">
            {
              <EmptyAction
                actions={
                  <>
                    <Link href={upload} className="btn-primary">
                      <Icon name="upload" />
                      Carica PDF o foto
                    </Link>
                    <Link href={`${upload}&mode=text`} className="btn-secondary">
                      <Icon name="note" />
                      Scrivi un appunto
                    </Link>
                  </>
                }
              >
                Questa {kind} è vuota. Carica il materiale dell&apos;esame o scrivi i tuoi appunti: da qui generi mappe e
                flashcard.
              </EmptyAction>
            }
          </Section>
          )}

          {children.length === 0 && subfolders}
        </>
      )}

      <details id="personalizza" className="border-t border-rule pt-6" open={!!query.personalizza}>
        <summary className="cursor-pointer text-[17px] font-bold">Personalizza {kind}</summary>
        <div className="mt-6">
          <FolderSettings
            folder={folder}
            parentId={folder.parent_id}
            targets={moveTargets(folders, id)}
            canDelete={isEmpty && (depth > 1 || rootCount > 1)}
          />
        </div>
      </details>
    </div>
  );
}
