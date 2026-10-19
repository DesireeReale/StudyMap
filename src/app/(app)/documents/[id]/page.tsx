import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { GenerateButtons } from "@/components/GenerateButtons";
import { requireUser } from "@/lib/supabase/server";

export default async function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, kind, page_count, storage_path, pages")
    .eq("id", id)
    .maybeSingle();
  if (!doc) notFound();

  const [maps, decks] = await Promise.all([
    supabase.from("maps").select("id, title").eq("document_id", id),
    supabase.from("decks").select("id, title").eq("document_id", id),
  ]);
  const preview = doc.pages.join("\n\n").slice(0, 1500);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/library" className="text-brand underline">
          ← Libreria
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{doc.title}</h1>
        <p className="text-muted">
          {doc.kind.toUpperCase()} · {doc.page_count} {doc.page_count === 1 ? "pagina" : "pagine"}
        </p>
      </div>

      <GenerateButtons documentId={doc.id} />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card" aria-labelledby="derived">
          <h2 id="derived" className="mb-2 font-bold">
            Creato da questo documento
          </h2>
          {!maps.data?.length && !decks.data?.length && <p className="text-muted">Ancora niente.</p>}
          <ul className="flex flex-col gap-1">
            {maps.data?.map((m) => (
              <li key={m.id}>
                Mappa:{" "}
                <Link href={`/maps/${m.id}`} className="text-brand underline">
                  {m.title}
                </Link>
              </li>
            ))}
            {decks.data?.map((d) => (
              <li key={d.id}>
                Flashcard:{" "}
                <Link href={`/decks/${d.id}`} className="text-brand underline">
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="preview">
          <h2 id="preview" className="mb-2 font-bold">
            Anteprima del testo estratto
          </h2>
          <p className="max-h-64 overflow-auto whitespace-pre-wrap text-sm text-muted">{preview}</p>
        </section>
      </div>

      <DeleteButton
        table="documents"
        id={doc.id}
        storagePath={doc.storage_path}
        label="Elimina documento"
        confirm="Eliminare il documento? Mappe e flashcard già create resteranno nella libreria."
      />
    </div>
  );
}
