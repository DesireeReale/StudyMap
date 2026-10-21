import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { childrenOf, pathTo } from "@/core/folders";
import { isSummary, SECTIONS, sectionHref, type SectionSlug } from "@/core/sections";
import { EmptyAction, MaterialList, PageHeader, type Material } from "@/components/LibraryLists";
import { requireUser } from "@/lib/supabase/server";
import { loadFolders, loadStudy, toMaterials, type FolderItem } from "@/lib/workspace";

type Auth = Awaited<ReturnType<typeof requireUser>>;

const section = (tipo: string) => SECTIONS.find((s) => s.slug === tipo);

export async function generateMetadata({ params }: PageProps<"/studia/[tipo]">): Promise<Metadata> {
  return { title: section((await params).tipo)?.label ?? "Studia" };
}

async function load(slug: SectionSlug, { supabase, profile }: Auth, folders: FolderItem[]): Promise<{ items: Material[]; due?: number }> {
  if (slug === "mappe") {
    const { data } = await supabase.from("maps").select("id, title, graph, updated_at, folder_id").order("updated_at", { ascending: false });
    return { items: toMaterials({ maps: data ?? [] }, folders) };
  }
  if (slug === "flashcard") {
    const [{ data }, study] = await Promise.all([
      supabase.from("decks").select("id, title, created_at, folder_id").order("created_at", { ascending: false }),
      loadStudy(supabase, profile),
    ]);
    return { items: toMaterials({ decks: data ?? [] }, folders, study.counts), due: study.toReview };
  }
  if (slug === "quiz") {
    const { data } = await supabase.from("quizzes").select("id, title, created_at, folder_id").order("created_at", { ascending: false });
    return { items: toMaterials({ quizzes: data ?? [] }, folders) };
  }
  if (slug === "riassunti") {
    const { data } = await supabase.from("notes").select("id, title, updated_at, folder_id").order("updated_at", { ascending: false });
    return { items: toMaterials({ notes: (data ?? []).filter((n) => isSummary(n.title)) }, folders) };
  }
  const { data } = await supabase
    .from("documents")
    .select("id, title, kind, page_count, created_at, folder_id")
    .order("created_at", { ascending: false });
  return { items: toMaterials({ documents: data ?? [] }, folders) };
}

export default async function SectionPage({ params, searchParams }: PageProps<"/studia/[tipo]">) {
  const current = section((await params).tipo);
  if (!current) notFound();
  const materia = String((await searchParams).materia ?? "");
  const auth = await requireUser();
  const folders = await loadFolders(auth.supabase);
  const { items, due } = await load(current.slug, auth, folders);

  const subjectOf = (folderId?: string) => (folderId ? pathTo(folders, folderId)[0] : undefined);
  const placed = items.map((m) => {
    const subject = subjectOf(m.folderId);
    return { ...m, place: subject?.name, subjectId: subject?.id };
  });
  const shown = materia ? placed.filter((m) => m.subjectId === materia) : placed;
  const used = new Set(placed.map((m) => m.subjectId));
  const subjects = childrenOf(folders, null).filter((s) => used.has(s.id));

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
      <PageHeader
        eyebrow="Studia"
        title={current.label}
        actions={
          <Link href="/upload" className="btn-primary h-11 px-5">
            Carica materiale
          </Link>
        }
      />
      <p className="num -mt-2 text-[15px] text-muted">
        {items.length} {items.length === 1 ? current.one : current.detail}
        {due ? ` · ${due} ${due === 1 ? "carta" : "carte"} da ripassare oggi` : ""}
      </p>
      {subjects.length > 1 && (
        <nav aria-label="Filtra per materia" className="flex flex-wrap gap-2">
          {[{ id: "", name: "Tutte le materie" }, ...subjects].map((s) => {
            const active = materia === s.id;
            return (
              <Link
                key={s.id || "all"}
                href={s.id ? `${sectionHref(current.slug)}?materia=${s.id}` : sectionHref(current.slug)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center rounded-full border px-4 text-[15px] ${
                  active ? "border-accent bg-accent-soft font-bold text-ink" : "border-border text-muted hover:text-ink"
                }`}
              >
                {s.name}
              </Link>
            );
          })}
        </nav>
      )}
      {shown.length ? (
        <MaterialList items={shown} />
      ) : (
        <EmptyAction
          actions={
            <Link href="/upload" className="btn-primary">
              Carica materiale
            </Link>
          }
        >
          {materia ? "Niente di questo tipo in questa materia." : `Non hai ancora ${current.detail}: carica una lezione e scegli cosa creare.`}
        </EmptyAction>
      )}
    </div>
  );
}
