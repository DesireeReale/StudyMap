import { blocks } from "@/core/outline";
import { Icon } from "./icons";

export type PageSource = { excerpts: Record<number, string>; unit: "Pagina" | "Slide"; idPrefix: string };

export function SummaryView({ body, source, className = "" }: { body: string; source?: PageSource; className?: string }) {
  let heading = 0;
  return (
    <article className={`reading flex flex-col gap-2 ${className}`}>
      {blocks(body).map((b, i) => {
        if (b.kind === "heading") {
          return (
            <h3 key={i} id={`sezione-${heading++}`} className="mt-4 scroll-mt-4 text-[1.2em] font-bold first:mt-0">
              {b.text}
            </h3>
          );
        }
        if (b.kind === "pages") {
          return source ? (
            <PageRefs key={i} pages={b.pages} source={source} block={i} />
          ) : (
            <p key={i} className="num text-[0.85em] text-muted">
              {b.text.slice(1, -1)}
            </p>
          );
        }
        return (
          <p key={i} className={b.kind === "point" ? "relative pl-5 before:absolute before:left-1 before:text-accent before:content-['•']" : ""}>
            {b.text}
          </p>
        );
      })}
    </article>
  );
}

function PageRefs({ pages, source, block }: { pages: number[]; source: PageSource; block: number }) {
  const short = source.unit === "Slide" ? "slide" : "pag.";
  return (
    <span className="flex flex-wrap gap-1.5" aria-label={`Fonte: ${source.unit.toLowerCase()} ${pages.join(", ")}`}>
      {pages.map((p) => {
        const id = `${source.idPrefix}-${block}-${p}`;
        return (
          <span key={p}>
            <button
              type="button"
              popoverTarget={id}
              className="num min-h-8 cursor-pointer rounded-full border border-control px-3 text-[13px] font-bold text-accent hover:bg-accent-soft"
            >
              {short} {p}
            </button>
            <span
              id={id}
              popover="auto"
              className="timer-popover m-auto max-h-[70dvh] w-[640px] max-w-[calc(100vw-32px)] flex-col gap-3 overflow-auto rounded-row border border-border bg-raised p-5 text-ink shadow-lg"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-bold">
                  {source.unit} {p}
                </span>
                <button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label="Chiudi" className="btn-ghost h-9 w-9 px-0">
                  <Icon name="close" size={16} />
                </button>
              </span>
              <span className="reading block whitespace-pre-wrap">{source.excerpts[p] ?? "Testo non disponibile."}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}
