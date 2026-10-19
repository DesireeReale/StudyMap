import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { MapEditor } from "@/components/MapEditor";
import { exportOptions } from "@/core/entitlements";
import { requireUser } from "@/lib/supabase/server";

export default async function MapPage({ params }: PageProps<"/maps/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const { data: map } = await supabase.from("maps").select("id, title, graph, document_id").eq("id", id).maybeSingle();
  if (!map) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href={map.document_id ? `/documents/${map.document_id}` : "/library"} className="text-brand underline">
        ← Indietro
      </Link>
      <MapEditor mapId={map.id} title={map.title} graph={map.graph} exportOptions={exportOptions(profile.plan)} />
      <DeleteButton table="maps" id={map.id} label="Elimina mappa" confirm="Eliminare questa mappa?" />
    </div>
  );
}
