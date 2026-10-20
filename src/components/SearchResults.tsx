import Link from "next/link";
import type { supabaseServer } from "@/lib/supabase/server";
import { searchWorkspace, toMaterials, type FolderItem } from "@/lib/workspace";
import { Empty, FolderBadge, MaterialList, Section } from "./LibraryLists";

export async function SearchResults({
  q,
  supabase,
  folders,
  folderIds,
}: {
  q: string;
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  folders: FolderItem[];
  folderIds?: string[];
}) {
  const r = await searchWorkspace(supabase, q, folderIds);
  const items = toMaterials(r, folders);
  const total = r.folders.length + items.length;

  return (
    <Section title="Risultati" aside={<p role="status" className="text-[14px] text-muted">{`${total} ${total === 1 ? "risultato" : "risultati"} per "${q}"`}</p>}>
      {total === 0 && <Empty>Nessun risultato. Prova con una parola più corta o controlla l&apos;ortografia.</Empty>}
      {r.folders.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {r.folders.map((f) => (
            <li key={f.id}>
              <Link href={`/folders/${f.id}`} className="flex items-center gap-2 rounded-full border border-border py-1 pr-4 pl-1 font-bold hover:border-control">
                <FolderBadge color={f.color} icon={f.icon} size={28} />
                {f.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && <MaterialList items={items} />}
    </Section>
  );
}
