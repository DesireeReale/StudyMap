import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DeleteButton } from "@/components/DeleteButton";
import { MapEditor } from "@/components/MapEditor";
import { exportOptions } from "@/core/entitlements";
import { treeOptions } from "@/core/folders";
import { MoveToFolder } from "@/components/FolderControls";
import { getAppStyle } from "@/lib/app-style";
import { requireUser } from "@/lib/supabase/server";
import { folderTrail, loadFolders, pageTitle } from "@/lib/workspace";

export async function generateMetadata({ params }: PageProps<"/maps/[id]">): Promise<Metadata> {
  return pageTitle("maps", (await params).id);
}

export default async function MapPage({ params }: PageProps<"/maps/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const { data: map } = await supabase.from("maps").select("id, title, graph, document_id, folder_id").eq("id", id).maybeSingle();
  if (!map) notFound();
  const [{ data: doc }, folders] = await Promise.all([
    map.document_id
      ? supabase.from("documents").select("id, title").eq("id", map.document_id).maybeSingle()
      : Promise.resolve({ data: null }),
    loadFolders(supabase),
  ]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb
          trail={folderTrail(folders, map.folder_id)}
          current={map.title}
          parent={doc ? { href: `/documents/${doc.id}`, label: doc.title } : undefined}
        />
        <MoveToFolder table="maps" id={map.id} current={map.folder_id} options={treeOptions(folders)} />
      </div>
      <MapEditor mapId={map.id} title={map.title} graph={map.graph} exportOptions={exportOptions(profile.plan)}
        appStyle={await getAppStyle()}
      />
      <div className="mt-6 flex justify-end border-t border-border pt-6">
        <DeleteButton table="maps" id={map.id} redirect={`/folders/${map.folder_id}`} label="Elimina mappa" confirm={`Eliminare la mappa "${map.title}"?`} />
      </div>
    </div>
  );
}
