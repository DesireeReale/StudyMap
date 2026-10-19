import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { FlashcardReview } from "@/components/FlashcardReview";
import { requireUser } from "@/lib/supabase/server";

export default async function DeckPage({ params }: PageProps<"/decks/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: deck } = await supabase.from("decks").select("id, title, document_id").eq("id", id).maybeSingle();
  if (!deck) notFound();
  const { data: cards } = await supabase
    .from("flashcards")
    .select("id, front, back, last_result")
    .eq("deck_id", id)
    .order("position");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href={deck.document_id ? `/documents/${deck.document_id}` : "/library"} className="text-brand underline">
        ← Indietro
      </Link>
      <h1 className="text-3xl font-bold">{deck.title}</h1>
      {cards?.length ? <FlashcardReview cards={cards} /> : <p>Questo mazzo è vuoto.</p>}
      <DeleteButton table="decks" id={deck.id} label="Elimina mazzo" confirm="Eliminare questo mazzo di flashcard?" />
    </div>
  );
}
