import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { aiMockEnabled } from "@/lib/ai";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireUser();

  return (
    <>
      <header className="border-b border-line bg-white">
        <nav aria-label="Principale" className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/library" className="text-lg font-bold text-brand">
            StudyMap
          </Link>
          <Link href="/library" className="hover:underline">
            Libreria
          </Link>
          <Link href="/settings" className="hover:underline">
            Impostazioni
          </Link>
          <span className="ml-auto rounded-full bg-stone-100 px-3 py-1 text-sm font-bold uppercase">
            {profile.plan}
          </span>
          <SignOutButton />
        </nav>
      </header>
      {aiMockEnabled && (
        <div role="alert" className="bg-red-700 px-4 py-2 text-center text-sm font-bold text-white">
          Modalità demo (AI_MOCK=1): nessun modello AI viene chiamato e ogni documento produce la stessa mappa e le
          stesse flashcard di esempio.
        </div>
      )}
      <div role="note" className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
        Non caricare dati di pazienti reali (nomi, cartelle cliniche, referti): usa solo materiale di studio.
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
