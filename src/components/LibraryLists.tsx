import Link from "next/link";
import type { ReactNode } from "react";
import { shortDate } from "@/core/dates";
import type { Graph } from "@/core/graph";
import type { FolderColor, FolderIcon } from "@/config/styles";
import { Icon } from "./icons";
import { DeckStrip, MapThumb, type DeckCounts } from "./StudyMarks";

const KIND_LABEL = { pdf: "PDF", image: "Immagine", text: "Testo" } as const;

export function Panel({
  title,
  count,
  className = "",
  action,
  children,
}: {
  title: string;
  count?: number;
  className?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className={`panel flex flex-col gap-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          {title}
          {count !== undefined && (
            <span className="num rounded-full bg-sheet px-2 py-0.5 text-xs font-normal text-muted">{count}</span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-row border border-dashed border-control px-4 py-3 text-sm text-muted">{children}</p>;
}

export function FolderBadge({ color, icon, size = 40 }: { color: FolderColor; icon: FolderIcon; size?: number }) {
  return (
    <span
      className="folder-tile flex shrink-0 items-center justify-center rounded-lg"
      style={{ "--folder-bg": `var(--${color})`, "--folder-ink": `var(--${color}-ink)`, width: size, height: size } as React.CSSProperties}
    >
      <Icon name={icon} size={Math.round(size / 2)} />
    </span>
  );
}

export function DocumentList({
  items,
}: {
  items: { id: string; title: string; kind: keyof typeof KIND_LABEL; page_count: number; created_at: string }[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((d) => (
        <li key={d.id}>
          <Link href={`/documents/${d.id}`} className="row-card flex min-h-[63px] items-center gap-3 hover:border-control">
            <Icon name="file" size={16} className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{d.title}</span>
              <span className="num block text-[13px] text-muted">
                {KIND_LABEL[d.kind]} · {d.page_count} {d.page_count === 1 ? "pagina" : "pagine"}
              </span>
            </span>
            <span className="num shrink-0 text-[13px] text-muted">{shortDate(d.created_at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MapList({ items }: { items: { id: string; title: string; graph: Graph; updated_at: string }[] }) {
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {items.map((m) => (
        <li key={m.id}>
          <Link href={`/maps/${m.id}`} className="row-card flex min-h-[63px] items-center gap-3 hover:border-control">
            <MapThumb graph={m.graph} />
            <span className="min-w-0">
              <span className="block truncate font-bold">{m.title}</span>
              <span className="num block text-[13px] text-muted">
                {m.graph.nodes.length} concetti · {shortDate(m.updated_at)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function DeckList({ items, counts }: { items: { id: string; title: string }[]; counts?: Map<string, DeckCounts> }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((d) => (
        <li key={d.id}>
          <Link href={`/decks/${d.id}`} className="row-card flex min-h-[63px] flex-col gap-2 hover:border-control">
            <span className="flex items-center gap-2 font-bold">
              <Icon name="cards" size={16} className="shrink-0 text-muted" />
              <span className="truncate">{d.title}</span>
            </span>
            {counts && <DeckStrip counts={counts.get(d.id) ?? { known: 0, unknown: 0, fresh: 0 }} />}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function NoteList({ items }: { items: { id: string; title: string; preview: string; updated_at: string }[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((n) => (
        <li key={n.id}>
          <Link href={`/notes/${n.id}`} className="row-card flex min-h-[63px] items-start gap-3 hover:border-control">
            <Icon name="note" size={16} className="mt-1 shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{n.title}</span>
              <span className="line-clamp-2 block text-[13px] text-muted">{n.preview || "Appunto vuoto"}</span>
            </span>
            <span className="num shrink-0 text-[13px] text-muted">{shortDate(n.updated_at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SearchForm({ q, label }: { q: string; label: string }) {
  return (
    <form role="search" className="flex gap-2">
      <label htmlFor="search" className="sr-only">
        {label}
      </label>
      <input id="search" name="q" type="search" defaultValue={q} placeholder={label} maxLength={100} className="field h-11" />
      <button type="submit" className="btn-secondary h-11" aria-label="Cerca">
        <Icon name="search" />
      </button>
    </form>
  );
}
