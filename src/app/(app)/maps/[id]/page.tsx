import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DeleteButton } from "@/components/DeleteButton";
import { MapEditor } from "@/components/MapEditor";
import { exportOptions } from "@/core/entitlements";
import { requireUser } from "@/lib/supabase/server";

export default async function MapPage({ params }: PageProps<"/maps/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const { data: map } = await supabase.from("maps").select("id, title, graph, document_id").eq("id", id).maybeSingle();
  if (!map) notFound();
  const { data: doc } = map.document_id
    ? await supabase.from("documents").select("id, title").eq("id", map.document_id).maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-col gap-3">
      <Breadcrumb current={map.title} parent={doc ? { href: `/documents/${doc.id}`, label: doc.title } : undefined} />
      <MapEditor mapId={map.id} title={map.title} graph={map.graph} exportOptions={exportOptions(profile.plan)} />
      <div className="mt-6 flex justify-end border-t border-border pt-6">
        <DeleteButton table="maps" id={map.id} label="Elimina mappa" confirm={`Eliminare la mappa "${map.title}"?`} />
      </div>
    </div>
  );
}
