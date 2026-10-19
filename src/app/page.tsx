import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export default async function Home() {
  const { user } = await getUser();
  if (user) redirect("/library");

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <p className="font-bold uppercase tracking-wide text-brand">StudyMap</p>
      <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
        Dai tuoi appunti a mappe concettuali e flashcard, in pochi secondi.
      </h1>
      <p className="text-lg text-muted">
        Carica PDF, foto degli appunti o slide: l&apos;AI costruisce una mappa che puoi modificare e un mazzo di
        flashcard per ripassare. Pensato per chi studia infermieristica, utile per ogni materia.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/login" className="btn-primary">
          Inizia gratis
        </Link>
        <Link href="/privacy" className="btn-secondary">
          Privacy
        </Link>
      </div>
    </main>
  );
}
