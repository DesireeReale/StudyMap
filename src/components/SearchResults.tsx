import Link from "next/link";
import type { supabaseServer } from "@/lib/supabase/server";
import { searchWorkspace, snippet } from "@/lib/workspace";
import { DeckList, DocumentList, Empty, FolderBadge, MapList, NoteList, Panel } from "./LibraryLists";

export async function SearchResults({
  q,
  supabase,
  folderIds,
}: {
  q: string;
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  folderIds?: string[];
}) {
  const r = await searchWorkspace(supabase, q, folderIds);
  const total = r.folders.length + r.documents.length + r.maps.length + r.decks.length + r.notes.length;

  return (
    <section aria-label="Risultati della ricerca" className="flex flex-col gap-4">
      <p role="status" className="text-[15px] text-muted">
        {total === 0 ? `Nessun risultato per "${q}".` : `${total} ${total === 1 ? "risultato" : "risultati"} per "${q}".`}
      </p>
      {total === 0 && <Empty>Prova con una parola più corta o controlla l&apos;ortografia.</Empty>}
      {r.folders.length > 0 && (
        <Panel title="Cartelle" count={r.folders.length}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {r.folders.map((f) => (
              <li key={f.id}>
                <Link href={`/folders/${f.id}`} className="row-card flex items-center gap-3 hover:border-control">
                  <FolderBadge color={f.color} icon={f.icon} size={32} />
                  <span className="truncate font-bold">{f.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {r.notes.length > 0 && (
        <Panel title="Appunti" count={r.notes.length}>
          <NoteList items={r.notes.map((n) => ({ ...n, preview: snippet(n.body, q) }))} />
        </Panel>
      )}
      {r.documents.length > 0 && (
        <Panel title="Documenti" count={r.documents.length}>
          <DocumentList items={r.documents} />
        </Panel>
      )}
      {r.maps.length > 0 && (
        <Panel title="Mappe" count={r.maps.length}>
          <MapList items={r.maps} />
        </Panel>
      )}
      {r.decks.length > 0 && (
        <Panel title="Flashcard" count={r.decks.length}>
          <DeckList items={r.decks} />
        </Panel>
      )}
    </section>
  );
}
