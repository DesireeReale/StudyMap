import { AppNav } from "@/components/AppNav";
import { aiMockEnabled } from "@/lib/ai";
import { getAppStyle } from "@/lib/app-style";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, profile } = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-sheet focus:px-4 focus:py-2"
      >
        Vai al contenuto
      </a>
      <AppNav email={user.email ?? ""} plan={profile.plan} appStyle={await getAppStyle()} />
      <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
        {aiMockEnabled && (
          <p role="alert" className="mb-2 rounded-lg bg-pill-negative px-4 py-2 text-sm font-bold text-pill-negative-ink">
            Modalità demo (AI_MOCK=1): nessun modello AI viene chiamato e ogni documento produce la stessa mappa e
            le stesse flashcard di esempio.
          </p>
        )}
        <main
          id="contenuto"
          className="flex-1 bg-sheet px-4 py-6 md:rounded-2xl md:border md:border-border md:px-8 md:py-9"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
