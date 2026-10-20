import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DeckEditor } from "@/components/DeckEditor";
import { DeleteButton } from "@/components/DeleteButton";
import { EditableTitle } from "@/components/EditableTitle";
import { FlashcardReview } from "@/components/FlashcardReview";
import { cardsToAnki, cardsToCsv } from "@/core/export";
import { treeOptions } from "@/core/folders";
import { Icon } from "@/components/icons";
import { MoveToFolder } from "@/components/FolderControls";
import { requireUser } from "@/lib/supabase/server";
import { folderTrail, loadFolders, pageTitle } from "@/lib/workspace";

const dataUrl = (type: string, text: string) => `data:${type};charset=utf-8,${encodeURIComponent(text)}`;

export async function generateMetadata({ params }: PageProps<"/decks/[id]">): Promise<Metadata> {
  return pageTitle("decks", (await params).id);
}

export default async function DeckPage({ params }: PageProps<"/decks/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: deck } = await supabase.from("decks").select("id, title, document_id, folder_id").eq("id", id).maybeSingle();
  if (!deck) notFound();
  const [{ data: cards }, { data: doc }, folders] = await Promise.all([
    supabase.from("flashcards").select("id, front, back, last_result, position, ease, interval_days, repetitions, due_at").eq("deck_id", id).order("position"),
    deck.document_id
      ? supabase.from("documents").select("id, title").eq("id", deck.document_id).maybeSingle()
      : Promise.resolve({ data: null }),
    loadFolders(supabase),
  ]);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb
          trail={folderTrail(folders, deck.folder_id)}
          current={deck.title}
          parent={doc ? { href: `/documents/${doc.id}`, label: doc.title } : undefined}
        />
        <MoveToFolder table="decks" id={deck.id} current={deck.folder_id} options={treeOptions(folders)} />
      </div>
      <EditableTitle table="decks" id={deck.id} title={deck.title} label="Titolo del mazzo" />
      {cards?.length ? (
        <div className="w-full max-w-[760px]">
          <FlashcardReview key={cards.map((c) => `${c.id}${c.front.length}${c.back.length}`).join()} cards={cards} />
        </div>
      ) : (
        <p className="rounded-row border border-dashed border-control px-4 py-3 text-sm text-muted">
          Questo mazzo è vuoto: aggiungi la prima carta qui sotto.
        </p>
      )}
      <DeckEditor deckId={deck.id} cards={cards ?? []} />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        {cards?.length ? (
          <span className="flex flex-wrap gap-2">
            <a className="btn-secondary" download={`${deck.title}.csv`} href={dataUrl("text/csv", cardsToCsv(cards))}>
              <Icon name="download" />
              CSV
            </a>
            <a className="btn-secondary" download={`${deck.title}.txt`} href={dataUrl("text/plain", cardsToAnki(cards))}>
              <Icon name="download" />
              Anki
            </a>
          </span>
        ) : (
          <span />
        )}
        <DeleteButton table="decks" id={deck.id} redirect={`/folders/${deck.folder_id}`} label="Elimina mazzo" confirm={`Eliminare il mazzo "${deck.title}"?`} />
      </div>
    </div>
  );
}
