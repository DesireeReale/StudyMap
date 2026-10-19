import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
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
      <div role="note" className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
        Non caricare dati di pazienti reali (nomi, cartelle cliniche, referti): usa solo materiale di studio.
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
