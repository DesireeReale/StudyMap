import Link from "next/link";
import { Icon } from "./icons";

type Crumb = { href: string; label: string };

export function Breadcrumb({ current, parent, trail: path = [] }: { current: string; parent?: Crumb; trail?: Crumb[] }) {
  const trail = [{ href: "/library", label: "Libreria" }, ...path, ...(parent ? [parent] : [])];
  return (
    <nav aria-label="Percorso" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {trail.map((t) => (
          <li key={t.href} className="flex items-center gap-1">
            <Link href={t.href} className="rounded px-1 hover:text-ink hover:underline">
              {t.label}
            </Link>
            <Icon name="back" size={14} className="rotate-180" />
          </li>
        ))}
        <li aria-current="page" className="max-w-[40ch] truncate px-1 text-ink">
          {current}
        </li>
      </ol>
    </nav>
  );
}
