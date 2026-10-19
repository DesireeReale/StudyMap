import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DeleteButton } from "@/components/DeleteButton";
import { FlashcardReview } from "@/components/FlashcardReview";
import { requireUser } from "@/lib/supabase/server";

export default async function DeckPage({ params }: PageProps<"/decks/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: deck } = await supabase.from("decks").select("id, title, document_id").eq("id", id).maybeSingle();
  if (!deck) notFound();
  const [{ data: cards }, { data: doc }] = await Promise.all([
    supabase.from("flashcards").select("id, front, back, last_result").eq("deck_id", id).order("position"),
    deck.document_id
      ? supabase.from("documents").select("id, title").eq("id", deck.document_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      <Breadcrumb current={deck.title} parent={doc ? { href: `/documents/${doc.id}`, label: doc.title } : undefined} />
      <h1 className="text-[24px] leading-tight font-bold">{deck.title}</h1>
      {cards?.length ? (
        <FlashcardReview cards={cards} />
      ) : (
        <p className="rounded-row border border-dashed border-control px-4 py-3 text-sm text-muted">Questo mazzo è vuoto.</p>
      )}
      <div className="mt-6 flex justify-end border-t border-border pt-6">
        <DeleteButton table="decks" id={deck.id} label="Elimina mazzo" confirm={`Eliminare il mazzo "${deck.title}"?`} />
      </div>
    </div>
  );
}
