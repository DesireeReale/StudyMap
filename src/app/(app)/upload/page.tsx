import type { Metadata } from "next";
import { PLANS } from "@/config/plans";
import { UploadForm } from "@/components/UploadForm";
import { treeOptions } from "@/core/folders";
import { requireUser } from "@/lib/supabase/server";
import { loadFolders } from "@/lib/workspace";

export const metadata: Metadata = { title: "Carica materiale" };

export default async function UploadPage({ searchParams }: PageProps<"/upload">) {
  const { folder } = await searchParams;
  const { supabase, user, profile } = await requireUser();
  const options = treeOptions(await loadFolders(supabase));
  const initialFolder = options.find((o) => o.id === folder)?.id ?? options[0]?.id;
  const plan = PLANS[profile.plan];

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-8">
      <header>
        <h1 className="text-[24px] leading-tight font-bold">Carica materiale</h1>
        <p className="mt-1 text-[15px] text-muted">
          PDF fino a {plan.maxPdfPages} pagine, foto degli appunti o testo incollato. Il testo viene estratto subito;
          mappa e flashcard le generi dalla pagina del documento.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <UploadForm userId={user.id} maxUploadBytes={plan.maxUploadBytes} folders={options} initialFolder={initialFolder} />
        </div>
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <div role="note" className="rounded-row border border-notice-border bg-notice p-4 text-sm text-notice-ink">
            <p className="font-bold">Niente dati di pazienti reali</p>
            <p className="mt-1">
              Carica solo materiale di studio: niente nomi, cartelle cliniche, referti o foto di pazienti.
            </p>
          </div>
          <div className="panel text-sm text-muted">
            <p className="font-bold text-ink">Cosa funziona meglio</p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
              <li>PDF con testo selezionabile: si legge subito e non consuma la quota AI.</li>
              <li>Foto ben illuminate, una pagina per foto.</li>
              <li>Un capitolo per volta: mappe più chiare.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
