"use client";

import { useState } from "react";
import { Empty, MATERIAL_FILTERS, MaterialList, type Material, type MaterialKind } from "./LibraryLists";

export function MaterialBrowser({ items, emptyText }: { items: Material[]; emptyText: string }) {
  const [kind, setKind] = useState<MaterialKind | null>(null);
  const shown = kind ? items.filter((m) => m.kind === kind) : items;

  return (
    <section aria-label="Materiale" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">Materiale</h2>
        <div role="group" aria-label="Filtra per tipo" className="flex flex-wrap gap-1 rounded-full bg-sheet p-1 text-[13px]">
          {MATERIAL_FILTERS.map((f) => {
            const count = f.id ? items.filter((m) => m.kind === f.id).length : items.length;
            return (
              <button
                key={f.name}
                type="button"
                aria-pressed={kind === f.id}
                onClick={() => setKind(f.id)}
                className={`flex min-h-8 cursor-pointer items-center gap-1 rounded-full px-3 ${kind === f.id ? "bg-raised font-bold text-ink" : "text-muted hover:text-ink"}`}
              >
                {f.name}
                <span className="num text-[12px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
      {shown.length ? <MaterialList items={shown} /> : <Empty>{emptyText}</Empty>}
    </section>
  );
}
