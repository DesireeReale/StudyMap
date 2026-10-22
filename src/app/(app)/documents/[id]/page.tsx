import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { shortDate } from "@/core/dates";
import { treeOptions } from "@/core/folders";
import { MoveToFolder } from "@/components/FolderControls";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DeleteButton } from "@/components/DeleteButton";
import { CreateTiles } from "@/components/CreateTiles";
import { DocumentChat } from "@/components/DocumentChat";
import { excerptsFor, reflow } from "@/core/retrieval";
import { EditableTitle } from "@/components/EditableTitle";
import { Expandable } from "@/components/Expandable";
import { Icon } from "@/components/icons";
import { SummaryView } from "@/components/SummaryView";
import { summaryPages } from "@/core/outline";
import { detectChapters } from "@/core/chapters";
import { pageCount } from "@/core/files";
import { requireUser } from "@/lib/supabase/server";
import { folderTrail, loadFolders, pageTitle } from "@/lib/workspace";

const KIND_LABEL = { pdf: "PDF", image: "Immagine", text: "Testo incollato", docx: "Word", pptx: "PowerPoint" } as const;

export async function generateMetadata({ params }: PageProps<"/documents/[id]">): Promise<Metadata> {
  return pageTitle("documents", (await params).id);
}

export default async function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, kind, page_count, storage_path, pages, created_at, folder_id, review_pages")
    .eq("id", id)
    .maybeSingle();
  if (!doc) notFound();

  const [maps, decks, folders, chat, summaries, quizzes] = await Promise.all([
    supabase.from("maps").select("id, title, updated_at").eq("document_id", id).order("updated_at", { ascending: false }),
    supabase.from("decks").select("id, title, created_at").eq("document_id", id).order("created_at", { ascending: false }),
    loadFolders(supabase),
    supabase.from("chat_messages").select("id, role, content, pages").eq("document_id", id).order("id"),
    supabase.from("notes").select("id, title, body, updated_at").eq("document_id", id).order("updated_at", { ascending: false }),
    supabase.from("quizzes").select("id, title, created_at").eq("document_id", id).order("created_at", { ascending: false }),
  ]);
  const summary = summaries.data?.[0];
  const messages = chat.data ?? [];
  const fullText = reflow(doc.pages.join("\n\n"));
  const preview = fullText.slice(0, 4000);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb trail={folderTrail(folders, doc.folder_id)} current={doc.title} />
        <MoveToFolder table="documents" id={doc.id} current={doc.folder_id} options={treeOptions(folders)} />
      </div>
      <header>
        <EditableTitle table="documents" id={doc.id} title={doc.title} label="Titolo del documento" />
        <p className="num mt-1 text-[15px] text-muted">
          {KIND_LABEL[doc.kind]} · {pageCount(doc.kind, doc.page_count)} · caricato il {shortDate(doc.created_at)}
        </p>
      </header>

      {doc.review_pages && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-row border border-notice-border bg-notice px-4 py-3 text-notice-ink">
          <p>Il testo letto dalle immagini non è ancora stato controllato.</p>
          <Link href={`/documents/${doc.id}/controlla`} className="btn-primary">
            Controlla il testo
          </Link>
        </div>
      )}

      <CreateTiles
        documentId={doc.id}
        chapters={detectChapters(doc.pages).length}
        summaryAnchor="#summary-title"
        made={{
          summary: (summaries.data ?? []).map((n) => ({ href: `/notes/${n.id}`, title: n.title })),
          mindmap: (maps.data ?? []).map((m) => ({ href: `/maps/${m.id}`, title: m.title })),
          flashcards: (decks.data ?? []).map((d) => ({ href: `/decks/${d.id}`, title: d.title })),
          quiz: (quizzes.data ?? []).map((z) => ({ href: `/quizzes/${z.id}`, title: z.title })),
        }}
      />

      {summary && (
        <section aria-labelledby="summary-title" className="flex scroll-mt-6 flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="summary-title" className="text-[20px] font-bold">
              Riassunto
            </h2>
            <Link href={`/notes/${summary.id}`} className="btn-secondary">
              <Icon name="note" />
              Apri e modifica
            </Link>
          </div>
          <Expandable more="Mostra tutto il riassunto" less="Mostra meno">
            <SummaryView
              body={summary.body}
              source={{
                excerpts: excerptsFor(doc.pages, summaryPages(summary.body)),
                unit: doc.kind === "pptx" ? "Slide" : "Pagina",
                idPrefix: "riassunto",
              }}
              className="w-full rounded-row border border-border bg-sheet px-[clamp(16px,4%,48px)] py-6"
            />
          </Expandable>
        </section>
      )}

      <DocumentChat
        source={{ documentId: doc.id }}
        unit={doc.kind === "pptx" ? "Slide" : "Pagina"}
        initial={messages}
        excerpts={excerptsFor(doc.pages, messages.flatMap((m) => m.pages))}
        fold
      />

      <details className="panel group py-4">
        <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 font-bold">
            <Icon name="file" />
            Testo estratto
          </span>
          <span className="text-sm text-muted group-open:hidden">Mostra</span>
          <span className="hidden text-sm text-muted group-open:inline">Nascondi</span>
        </summary>
        <div className="mt-4 max-h-[420px] overflow-auto reading rounded-row bg-sheet p-4 whitespace-pre-wrap [overflow-wrap:anywhere]">
          {preview}
          {fullText.length > preview.length && <span className="text-muted"> …</span>}
        </div>
      </details>

      <section aria-label="Elimina documento" className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border pt-5 text-sm">
        <p className="max-w-xl text-muted">Mappe, flashcard e quiz già creati restano nella libreria.</p>
        <DeleteButton
          table="documents"
          id={doc.id}
          storagePath={doc.storage_path}
          label="Elimina documento"
          redirect={`/folders/${doc.folder_id}`}
          confirm={`Eliminare "${doc.title}"? Il file e il testo estratto verranno cancellati; mappe, flashcard e quiz già creati resteranno nella libreria.`}
          className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-muted underline underline-offset-2 hover:text-negative"
        />
      </section>
    </div>
  );
}
