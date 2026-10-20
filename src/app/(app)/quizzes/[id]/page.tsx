import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { shortDate } from "@/core/dates";
import { treeOptions } from "@/core/folders";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DeleteButton } from "@/components/DeleteButton";
import { MoveToFolder } from "@/components/FolderControls";
import { QuizRunner } from "@/components/QuizRunner";
import { requireUser } from "@/lib/supabase/server";
import { folderTrail, loadFolders, pageTitle } from "@/lib/workspace";

export async function generateMetadata({ params }: PageProps<"/quizzes/[id]">): Promise<Metadata> {
  return pageTitle("quizzes", (await params).id);
}

export default async function QuizPage({ params }: PageProps<"/quizzes/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: quiz }, { data: attempts }, folders] = await Promise.all([
    supabase.from("quizzes").select("id, title, questions, folder_id, document_id").eq("id", id).maybeSingle(),
    supabase.from("quiz_attempts").select("score, total, created_at").eq("quiz_id", id).order("created_at", { ascending: false }).limit(5),
    loadFolders(supabase),
  ]);
  if (!quiz) notFound();
  const { data: doc } = quiz.document_id
    ? await supabase.from("documents").select("id, title").eq("id", quiz.document_id).maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb
          trail={folderTrail(folders, quiz.folder_id)}
          current={quiz.title}
          parent={doc ? { href: `/documents/${doc.id}`, label: doc.title } : undefined}
        />
        <MoveToFolder table="quizzes" id={quiz.id} current={quiz.folder_id} options={treeOptions(folders)} />
      </div>
      <h1 className="text-[32px] leading-[1.05] font-bold tracking-[-0.025em] break-words md:text-[44px]">Quiz · {quiz.title}</h1>
      <div className="w-full max-w-[760px]">
        <QuizRunner quizId={quiz.id} questions={quiz.questions} />
      </div>
      {attempts && attempts.length > 0 && (
        <section aria-label="Tentativi precedenti" className="flex max-w-[760px] flex-col gap-2">
          <h2 className="text-[17px] font-bold">Tentativi precedenti</h2>
          <ul className="num flex flex-col border-t border-rule text-[15px]">
            {attempts.map((a) => (
              <li key={a.created_at} className="flex justify-between border-b border-rule px-2 py-2.5">
                <span>
                  {a.score} su {a.total} ({Math.round((a.score / a.total) * 100)}%)
                </span>
                <span className="text-muted">{shortDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-6 flex justify-end border-t border-border pt-6">
        <DeleteButton table="quizzes" id={quiz.id} redirect={`/folders/${quiz.folder_id}`} label="Elimina quiz" confirm={`Eliminare il quiz "${quiz.title}"?`} />
      </div>
    </div>
  );
}
