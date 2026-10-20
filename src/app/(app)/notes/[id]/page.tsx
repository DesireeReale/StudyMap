import { notFound } from "next/navigation";
import { treeOptions } from "@/core/folders";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DeleteButton } from "@/components/DeleteButton";
import { MoveToFolder } from "@/components/FolderControls";
import { NoteEditor } from "@/components/NoteEditor";
import { requireUser } from "@/lib/supabase/server";
import { folderTrail, loadFolders } from "@/lib/workspace";

export default async function NotePage({ params }: PageProps<"/notes/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: note }, folders] = await Promise.all([
    supabase.from("notes").select("id, title, body, folder_id").eq("id", id).maybeSingle(),
    loadFolders(supabase),
  ]);
  if (!note) notFound();

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb trail={folderTrail(folders, note.folder_id)} current={note.title} />
        <MoveToFolder table="notes" id={note.id} current={note.folder_id} options={treeOptions(folders)} />
      </div>
      <NoteEditor noteId={note.id} title={note.title} body={note.body} />
      <div className="mt-6 flex justify-end border-t border-border pt-6">
        <DeleteButton
          table="notes"
          id={note.id}
          label="Elimina appunto"
          confirm={`Eliminare l'appunto "${note.title}"?`}
          redirect={`/folders/${note.folder_id}`}
        />
      </div>
    </div>
  );
}
