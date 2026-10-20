import { blocks } from "@/core/outline";

export function SummaryView({ body, className = "" }: { body: string; className?: string }) {
  let heading = 0;
  return (
    <article className={`reading flex flex-col gap-2 ${className}`}>
      {blocks(body).map((b, i) =>
        b.kind === "heading" ? (
          <h3 key={i} id={`sezione-${heading++}`} className="mt-4 scroll-mt-4 text-[1.2em] font-bold first:mt-0">
            {b.text}
          </h3>
        ) : (
          <p
            key={i}
            className={b.kind === "point" ? "relative pl-5 before:absolute before:left-1 before:text-accent before:content-['•']" : ""}
          >
            {b.text}
          </p>
        ),
      )}
    </article>
  );
}
