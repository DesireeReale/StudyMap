import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { shortDate } from "@/core/dates";
import { treeOptions } from "@/core/folders";
import { MoveToFolder } from "@/components/FolderControls";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DeleteButton } from "@/components/DeleteButton";
import { EditableTitle } from "@/components/EditableTitle";
import { GenerateButtons } from "@/components/GenerateButtons";
import { Icon } from "@/components/icons";
import { MapThumb } from "@/components/StudyMarks";
import { requireUser } from "@/lib/supabase/server";
import { folderTrail, loadFolders, pageTitle } from "@/lib/workspace";

const KIND_LABEL = { pdf: "PDF", image: "Immagine", text: "Testo incollato" } as const;

export async function generateMetadata({ params }: PageProps<"/documents/[id]">): Promise<Metadata> {
  return pageTitle("documents", (await params).id);
}

export default async function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, kind, page_count, storage_path, pages, created_at, folder_id")
    .eq("id", id)
    .maybeSingle();
  if (!doc) notFound();

  const [maps, decks, folders] = await Promise.all([
    supabase.from("maps").select("id, title, graph, updated_at").eq("document_id", id).order("updated_at", { ascending: false }),
    supabase.from("decks").select("id, title, created_at").eq("document_id", id).order("created_at", { ascending: false }),
    loadFolders(supabase),
  ]);
  const made = (maps.data?.length ?? 0) + (decks.data?.length ?? 0);
  const preview = doc.pages.join("\n\n").slice(0, 4000);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb trail={folderTrail(folders, doc.folder_id)} current={doc.title} />
        <MoveToFolder table="documents" id={doc.id} current={doc.folder_id} options={treeOptions(folders)} />
      </div>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <EditableTitle table="documents" id={doc.id} title={doc.title} label="Titolo del documento" />
          <p className="num mt-1 text-[15px] text-muted">
            {KIND_LABEL[doc.kind]} · {doc.page_count} {doc.page_count === 1 ? "pagina" : "pagine"} · caricato il{" "}
            {shortDate(doc.created_at)}
          </p>
        </div>
        <GenerateButtons source={{ documentId: doc.id }} />
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        <section aria-label="Creato da questo documento" className="panel flex min-w-0 flex-col gap-4 lg:col-span-5">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            Creato da questo documento
            <span className="num rounded-full bg-sheet px-2 py-0.5 text-xs font-normal text-muted">{made}</span>
          </h2>
          {made === 0 ? (
            <p className="rounded-row border border-dashed border-control px-4 py-3 text-sm text-muted">
              Ancora niente: genera una mappa concettuale o un mazzo di flashcard con i pulsanti in alto.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {maps.data?.map((m) => (
                <li key={m.id}>
                  <Link href={`/maps/${m.id}`} className="row-card flex min-h-[63px] items-center gap-3 hover:border-control">
                    <MapThumb graph={m.graph} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">Mappa · {m.title}</span>
                      <span className="num block text-[13px] text-muted">
                        {m.graph.nodes.length} concetti · {shortDate(m.updated_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {decks.data?.map((d) => (
                <li key={d.id}>
                  <Link href={`/decks/${d.id}`} className="row-card flex min-h-[63px] items-center gap-3 hover:border-control">
                    <span className="flex h-12 w-[72px] shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
                      <Icon name="cards" size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">Flashcard · {d.title}</span>
                      <span className="num block text-[13px] text-muted">creato il {shortDate(d.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Testo estratto" className="panel flex min-w-0 flex-col gap-4 lg:col-span-7">
          <h2 className="text-[15px] font-bold">Testo estratto</h2>
          <div className="max-h-[420px] overflow-auto reading rounded-row bg-sheet p-4 whitespace-pre-wrap [overflow-wrap:anywhere]">
            {preview}
            {doc.pages.join("\n\n").length > preview.length && <span className="text-muted"> …</span>}
          </div>
        </section>
      </div>

      <section aria-label="Elimina documento" className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <p className="max-w-xl text-sm text-muted">
          Eliminando il documento si cancellano il file e il testo estratto. Mappe e flashcard già create restano nella
          libreria.
        </p>
        <DeleteButton
          table="documents"
          id={doc.id}
          storagePath={doc.storage_path}
          label="Elimina documento"
          redirect={`/folders/${doc.folder_id}`}
          confirm={`Eliminare "${doc.title}"? Mappe e flashcard già create resteranno nella libreria.`}
        />
      </section>
    </div>
  );
}
