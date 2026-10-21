import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/config/plans";
import { childrenOf } from "@/core/folders";
import { FolderGrid } from "@/components/FolderControls";
import { PageHeader } from "@/components/LibraryLists";
import { requireUser } from "@/lib/supabase/server";
import { folderStats, loadFolders } from "@/lib/workspace";

export const metadata: Metadata = { title: "Materie" };

export default async function SubjectsPage() {
  const { supabase, profile } = await requireUser();
  const [folders, ...lists] = await Promise.all([
    loadFolders(supabase),
    ...(["documents", "maps", "decks", "notes", "quizzes"] as const).map((t) =>
      supabase
        .from(t)
        .select("folder_id")
        .then((r) => r.data ?? []),
    ),
  ]);
  const plan = PLANS[profile.plan];
  const subjects = childrenOf(folders, null);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-8">
      <PageHeader eyebrow="Le tue materie" title="Materie" />
      <FolderGrid
        key={subjects.map((s) => `${s.id}${s.position}`).join()}
        title="Materie"
        folders={subjects}
        stats={folderStats(folders, lists)}
        parentId={null}
        newLabel="Nuova materia"
        placeholder="es. Diritto privato"
        canCreate={subjects.length < plan.maxSubjects}
        limitNotice={
          <p className="text-sm text-muted">
            Hai {subjects.length} materie su {plan.maxSubjects}: crea sottocartelle dentro una materia o{" "}
            <Link href="/settings#piano" className="font-bold text-accent hover:underline">
              passa a Pro
            </Link>
            .
          </p>
        }
      />
    </div>
  );
}
