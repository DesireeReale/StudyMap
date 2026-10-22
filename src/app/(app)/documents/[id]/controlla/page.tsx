import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TextReview } from "@/components/TextReview";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Controlla il testo" };

export default async function ReviewPage({ params }: PageProps<"/documents/[id]/controlla">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, kind, storage_path, pages, review_pages, review_create")
    .eq("id", id)
    .maybeSingle();
  if (!doc) notFound();
  if (!doc.review_pages) redirect(`/documents/${doc.id}`);

  const { data: signed } = doc.storage_path
    ? await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 3600)
    : { data: null };

  return (
    <TextReview
      documentId={doc.id}
      title={doc.title}
      original={signed ? { url: signed.signedUrl, kind: doc.kind === "pdf" ? "pdf" : "image" } : null}
      pages={doc.review_pages.map((index) => ({ index, text: doc.pages[index] ?? "" }))}
      create={doc.review_create}
    />
  );
}
