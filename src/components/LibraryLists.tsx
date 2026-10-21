import Link from "next/link";
import type { ReactNode } from "react";
import type { FolderColor, FolderIcon } from "@/config/styles";
import { shortDate } from "@/core/dates";
import { Icon, type IconName } from "./icons";

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      <div className="text-[14px] text-muted">{eyebrow}</div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="max-w-[24ch] min-w-0 text-[32px] leading-[1.05] font-bold tracking-[-0.025em] break-words md:text-[44px]">
          {title}
        </h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-row border border-dashed border-control px-4 py-3 text-sm text-muted">{children}</p>;
}

export function EmptyAction({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-row border border-dashed border-control px-5 py-5 text-[15px] text-muted">
      <p>{children}</p>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function FolderBadge({ color, icon, size = 40 }: { color: FolderColor; icon: FolderIcon; size?: number }) {
  return (
    <span
      className="folder-tile inline-flex shrink-0 items-center justify-center rounded-lg align-middle"
      style={{ "--folder-bg": `var(--${color})`, "--folder-ink": `var(--${color}-ink)`, width: size, height: size } as React.CSSProperties}
    >
      <Icon name={icon} size={Math.round(size / 2)} />
    </span>
  );
}

export type MaterialKind = "documento" | "appunto" | "riassunto" | "mappa" | "flashcard" | "quiz";

export type Material = { kind: MaterialKind; id: string; title: string; detail: string; date: string; place?: string; folderId?: string };

const KINDS: Record<MaterialKind, { label: string; icon: IconName; href: string; chip: string }> = {
  documento: { label: "Documento", icon: "file", href: "/documents", chip: "bg-surface text-muted" },
  appunto: { label: "Appunto", icon: "note", href: "/notes", chip: "bg-pill-positive text-pill-positive-ink" },
  riassunto: { label: "Riassunto", icon: "note", href: "/notes", chip: "bg-surface text-ink" },
  mappa: { label: "Mappa", icon: "map", href: "/maps", chip: "bg-accent-soft text-ink" },
  flashcard: { label: "Flashcard", icon: "cards", href: "/decks", chip: "bg-notice text-notice-ink" },
  quiz: { label: "Quiz", icon: "check", href: "/quizzes", chip: "bg-pill-negative text-pill-negative-ink" },
};

export const MATERIAL_FILTERS: { id: MaterialKind | null; name: string }[] = [
  { id: null, name: "Tutto" },
  { id: "documento", name: "Documenti" },
  { id: "appunto", name: "Appunti" },
  { id: "riassunto", name: "Riassunti" },
  { id: "mappa", name: "Mappe" },
  { id: "flashcard", name: "Flashcard" },
  { id: "quiz", name: "Quiz" },
];

export function MaterialList({ items }: { items: Material[] }) {
  return (
    <ul className="flex flex-col border-t border-rule">
      {items.map((m) => {
        const k = KINDS[m.kind];
        return (
          <li key={`${m.kind}-${m.id}`} className="border-b border-rule">
            <Link
              href={`${k.href}/${m.id}`}
              className="flex min-h-14 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-active"
            >
              <Icon name={k.icon} size={18} className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate font-bold">{m.title}</span>
                  <span className={`num rounded-full px-2 py-0.5 text-[12px] ${k.chip}`}>
                    {k.label}
                    {m.detail && ` · ${m.detail}`}
                  </span>
                </span>
              </span>
              <span className="num hidden shrink-0 text-[13px] text-muted sm:block">
                {m.place ? `${m.place} · ` : ""}
                {shortDate(m.date)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SearchForm({ q, label }: { q: string; label: string }) {
  return (
    <form role="search" className="flex items-center gap-2 border-b border-control focus-within:border-accent has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]">
      <Icon name="search" className="shrink-0 text-muted" />
      <label htmlFor="search" className="sr-only">
        {label}
      </label>
      <input
        id="search"
        name="q"
        type="search"
        defaultValue={q}
        placeholder={label}
        maxLength={100}
        className="h-11 min-w-0 flex-1 bg-transparent px-1 text-[15px] text-ink placeholder:text-muted focus:outline-none"
      />
      <button type="submit" className="btn-ghost h-9 px-3 text-sm">
        Cerca
      </button>
    </form>
  );
}
