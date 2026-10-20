import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { childrenOf, MAX_FOLDER_DEPTH, moveTargets, pathTo, subtreeIds } from "@/core/folders";
import { Breadcrumb } from "@/components/Breadcrumb";
import { FolderGrid, FolderSettings } from "@/components/FolderControls";
import { Icon } from "@/components/icons";
import { DeckList, DocumentList, Empty, EmptyAction, FolderBadge, MapList, NoteList, Panel, SearchForm } from "@/components/LibraryLists";
import { SearchResults } from "@/components/SearchResults";
import { StudyDock } from "@/components/StudyDock";
import { requireUser } from "@/lib/supabase/server";
import { folderStats, folderTrail, loadFolders, loadStudy, pageTitle } from "@/lib/workspace";

export async function generateMetadata({ params }: PageProps<"/folders/[id]">): Promise<Metadata> {
  return pageTitle("folders", (await params).id);
}

export default async function FolderPage({ params, searchParams }: PageProps<"/folders/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const q = String(query.q ?? "").trim().slice(0, 100);
  const { supabase, profile } = await requireUser();
  const folders = await loadFolders(supabase);
  const folder = folders.find((f) => f.id === id);
  if (!folder) notFound();

  const path = pathTo(folders, id);
  const depth = path.length;
  const tree = subtreeIds(folders, id);
  const children = childrenOf(folders, id);
  const [study, docs, maps, decks, notes] = await Promise.all([
    depth === 1 ? loadStudy(supabase, profile, tree) : null,
    supabase.from("documents").select("id, title, kind, page_count, created_at, folder_id").in("folder_id", tree).order("created_at", { ascending: false }),
    supabase.from("maps").select("id, title, graph, updated_at, folder_id").in("folder_id", tree).order("updated_at", { ascending: false }),
    supabase.from("decks").select("id, title, folder_id").in("folder_id", tree).order("created_at", { ascending: false }),
    supabase.from("notes").select("id, title, body, updated_at, folder_id").in("folder_id", tree).order("updated_at", { ascending: false }),
  ]);
  const here = <T extends { folder_id: string }>(rows: T[] | null) => (rows ?? []).filter((r) => r.folder_id === id);
  const [docList, mapList, deckList, noteList] = [here(docs.data), here(maps.data), here(decks.data), here(notes.data)];
  const stats = folderStats(folders, [docs.data ?? [], maps.data ?? [], decks.data ?? [], notes.data ?? []]);
  const isEmpty = children.length + docList.length + mapList.length + deckList.length + noteList.length === 0;
  const rootCount = childrenOf(folders, null).length;
  const kind = depth === 1 ? "materia" : "cartella";
  const upload = `/upload?folder=${id}`;
  const subfolders = (children.length > 0 || depth < MAX_FOLDER_DEPTH) && (
    <Panel title="Cartelle" count={children.length}>
      {children.length === 0 && (
        <p className="text-sm text-muted">Facoltativo: dividi questa {kind} in parti, per esempio Scritto e Orale.</p>
      )}
      <FolderGrid
        key={children.map((c) => `${c.id}${c.position}`).join()}
        folders={children}
        stats={stats}
        parentId={id}
        newLabel="Nuova cartella"
        placeholder="es. Scritto"
        canCreate={depth < MAX_FOLDER_DEPTH}
      />
    </Panel>
  );

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <Breadcrumb trail={folderTrail(folders, id).slice(0, -1)} current={folder.name} />
      <header className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <FolderBadge color={folder.color} icon={folder.icon} size={56} />
          <div className="min-w-0">
            <h1 className="text-[28px] leading-tight font-bold break-words md:text-[36px]">{folder.name}</h1>
            <p className="text-[15px] text-muted">{stats[id] || `Questa ${kind} è vuota.`}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={upload} className="btn-primary">
            <Icon name="upload" />
            Carica qui
          </Link>
        </div>
      </header>

      {study && <StudyDock data={study.dock} />}

      <SearchForm q={q} label={`Cerca in ${folder.name}`} />

      {q ? (
        <SearchResults q={q} supabase={supabase} folderIds={tree} />
      ) : (
        <>
          {children.length > 0 && subfolders}

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Documenti" count={docList.length}>
              {docList.length ? (
                <DocumentList items={docList} />
              ) : (
                <EmptyAction href={upload} label="Carica PDF o foto">
                  Carica qui il materiale di questa {kind}: PDF o foto degli appunti.
                </EmptyAction>
              )}
            </Panel>
            <Panel title="Appunti" count={noteList.length}>
              {noteList.length ? (
                <NoteList items={noteList.map((n) => ({ ...n, preview: n.body.slice(0, 200) }))} />
              ) : (
                <EmptyAction href={`${upload}&mode=text`} label="Scrivi un appunto">
                  Scrivi o incolla i tuoi appunti: potrai modificarli e generare mappe e flashcard.
                </EmptyAction>
              )}
            </Panel>
            <Panel title="Mappe" count={mapList.length}>
              {mapList.length ? <MapList items={mapList} /> : <Empty>Le mappe che generi dai documenti di questa cartella compaiono qui.</Empty>}
            </Panel>
            <Panel title="Flashcard" count={deckList.length}>
              {deckList.length ? (
                <DeckList items={deckList} counts={study?.counts} />
              ) : (
                <Empty>I mazzi generati dai documenti di questa cartella compaiono qui.</Empty>
              )}
            </Panel>
          </div>

          {children.length === 0 && subfolders}
        </>
      )}

      <details className="panel mt-6" open={!!query.personalizza}>
        <summary className="cursor-pointer text-[15px] font-bold">Personalizza {kind}</summary>
        <div className="mt-4">
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
