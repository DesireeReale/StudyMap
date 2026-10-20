"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FOLDER_COLORS, FOLDER_ICONS, type FolderColor, type FolderIcon } from "@/config/styles";
import { folderError, reorder } from "@/core/folders";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "./icons";
import { FolderBadge } from "./LibraryLists";
import { UpgradeNotice } from "./UpgradeNotice";

type Folder = { id: string; name: string; color: FolderColor; icon: FolderIcon; position: number; exam_date?: string | null };
type Option = { id: string; name: string; depth: number };

const indent = (o: Option) => `${"   ".repeat(o.depth)}${o.name}`;

type GridFolder = Folder & { created_at: string };
type Sort = "personale" | "data" | "nome";
const SORTS: { id: Sort; name: string }[] = [
  { id: "data", name: "Data" },
  { id: "nome", name: "Nome" },
  { id: "personale", name: "Personale" },
];

function closeMenu(e: React.MouseEvent) {
  const menu = (e.currentTarget as HTMLElement).closest("details");
  if (menu) menu.open = false;
}

export function FolderGrid({
  title,
  hint,
  folders,
  stats,
  parentId,
  newLabel,
  placeholder,
  canCreate,
  limitNotice,
}: {
  title: string;
  hint?: string;
  folders: GridFolder[];
  stats: Record<string, string>;
  parentId: string | null;
  newLabel: string;
  placeholder: string;
  canCreate: boolean;
  limitNotice?: React.ReactNode;
}) {
  const router = useRouter();
  const [items, setItems] = useState(folders);
  const [sort, setSort] = useState<Sort>("personale");
  const [dragged, setDragged] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; upgrade: boolean } | null>(null);

  const shown =
    sort === "personale"
      ? items
      : [...items].sort((a, b) =>
          sort === "nome" ? a.name.localeCompare(b.name, "it") : b.created_at.localeCompare(a.created_at),
        );

  async function move(id: string, to: number) {
    const next = reorder(items, id, to);
    if (next === items) return;
    setItems(next);
    const supabase = supabaseBrowser();
    const results = await Promise.all(
      next.map((f, position) =>
        f.position === position ? null : supabase.from("folders").update({ position }).eq("id", f.id),
      ),
    );
    setItems(next.map((f, position) => ({ ...f, position })));
    setStatus(results.some((r) => r?.error) ? "Ordine non salvato. Riprova." : `${next[to]!.name} spostata in posizione ${to + 1}.`);
    router.refresh();
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, parentId }),
      });
      const json = await res.json();
      if (!res.ok) return setProblem({ message: json.error, upgrade: json.upgrade });
      router.push(`/folders/${json.id}`);
    } catch {
      setProblem({ message: "Errore di rete. Riprova.", upgrade: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">
          {title}
          {hint && <span className="ml-2 text-[14px] font-normal text-muted">{hint}</span>}
        </h2>
      {items.length > 1 && (
        <div role="radiogroup" aria-label="Ordina per" className="flex w-fit gap-1 rounded-full bg-sheet p-1 text-[13px]">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={sort === s.id}
              onClick={() => setSort(s.id)}
              className={`min-h-8 cursor-pointer rounded-full px-3 ${sort === s.id ? "bg-raised font-bold text-ink" : "text-muted hover:text-ink"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      </div>

      <ul className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
        {canCreate && (
          <li>
            {creating ? (
              <form onSubmit={create} className="folder-new flex flex-col justify-center gap-2 p-3">
                <label htmlFor={`new-folder-${parentId ?? "root"}`} className="sr-only">
                  {newLabel}
                </label>
                <input
                  id={`new-folder-${parentId ?? "root"}`}
                  name="name"
                  required
                  maxLength={80}
                  autoFocus
                  placeholder={placeholder}
                  onKeyDown={(e) => e.key === "Escape" && setCreating(false)}
                  className="field"
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary h-9 flex-1" disabled={busy}>
                    Crea
                  </button>
                  <button type="button" className="btn-ghost h-9" onClick={() => setCreating(false)}>
                    Annulla
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" aria-label={newLabel} onClick={() => setCreating(true)} className="folder-new flex w-full cursor-pointer items-center justify-center text-accent">
                <Icon name="plus" size={32} />
              </button>
            )}
            <p className="mt-2 text-center text-[15px] font-bold text-accent" aria-hidden="true">
              {newLabel}
            </p>
          </li>
        )}
        {shown.map((f) => {
          const i = items.findIndex((x) => x.id === f.id);
          const movable = sort === "personale" && items.length > 1;
          return (
            <li
              key={f.id}
              draggable={movable}
              onDragStart={() => setDragged(f.id)}
              onDragOver={(e) => movable && e.preventDefault()}
              onDrop={() => dragged && move(dragged, i)}
              onDragEnd={() => setDragged(null)}
              className={`relative ${dragged === f.id ? "opacity-50" : ""}`}
            >
              <Link
                href={`/folders/${f.id}`}
                className="group block rounded-row"
                style={{ "--folder-bg": `var(--${f.color})`, "--folder-ink": `var(--${f.color}-ink)` } as React.CSSProperties}
              >
                <span className="folder-card" aria-hidden="true">
                  <span className="folder-face">
                    <Icon name={f.icon} size={32} />
                  </span>
                </span>
                <span className="mt-2 block truncate text-center text-[15px] font-bold group-hover:underline">{f.name}</span>
                <span className="num block truncate text-center text-[13px] text-muted">{stats[f.id] || "Vuota"}</span>
              </Link>
              <details className="absolute top-3 right-1">
                <summary
                  aria-label={`Azioni per ${f.name}`}
                  className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-[18px] leading-none hover:bg-black/10"
                  style={{ color: `var(--${f.color}-ink)` }}
                >
                  ⋯
                </summary>
                <div className="absolute right-0 z-10 mt-1 flex w-44 flex-col rounded-row border border-border bg-raised p-1 text-[14px] shadow-lg">
                  {movable && (
                    <>
                      <button type="button" disabled={i === 0} className="btn-ghost h-9 justify-start" onClick={(e) => { closeMenu(e); move(f.id, i - 1); }}>
                        <Icon name="up" size={16} />
                        Sposta prima
                      </button>
                      <button type="button" disabled={i === items.length - 1} className="btn-ghost h-9 justify-start" onClick={(e) => { closeMenu(e); move(f.id, i + 1); }}>
                        <Icon name="down" size={16} />
                        Sposta dopo
                      </button>
                    </>
                  )}
                  <Link href={`/folders/${f.id}?personalizza=1`} className="btn-ghost h-9 justify-start">
                    <Icon name="settings" size={16} />
                    Personalizza
                  </Link>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      {!canCreate && limitNotice}
      {problem && <UpgradeNotice message={problem.message} upgrade={problem.upgrade} />}
      <p role="status" className="sr-only">
        {status}
      </p>
    </section>
  );
}

export function FolderSettings({
  folder,
  parentId,
  targets,
  canDelete,
}: {
  folder: Folder;
  parentId: string | null;
  targets: Option[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState("");

  async function save(change: { name?: string; color?: FolderColor; icon?: FolderIcon; parent_id?: string; exam_date?: string | null }) {
    setError(null);
    const { error } = await supabaseBrowser().from("folders").update(change).eq("id", folder.id);
    if (error) return setError(folderError(error));
    setSaved("Modifica salvata.");
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Eliminare "${folder.name}"?`)) return;
    const { error } = await supabaseBrowser().from("folders").delete().eq("id", folder.id);
    if (error) return setError(folderError(error));
    router.push(parentId ? `/folders/${parentId}` : "/library");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = String(new FormData(e.currentTarget).get("name")).trim();
          if (name && name !== folder.name) save({ name });
        }}
      >
        <label htmlFor="folder-name" className="label">
          Nome
        </label>
        <div className="flex flex-wrap gap-2">
          <input id="folder-name" name="name" defaultValue={folder.name} required maxLength={80} className="field max-w-sm flex-1" />
          <button type="submit" className="btn-secondary h-10">
            Rinomina
          </button>
        </div>
      </form>

      {!parentId && (
        <label className="flex flex-col gap-2">
          <span className="label">Data dell&apos;esame di questa materia</span>
          <span className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              defaultValue={folder.exam_date ?? ""}
              onChange={(e) => save({ exam_date: e.target.value || null })}
              className="field w-auto"
            />
            <span className="text-[13px] text-muted">Se la lasci vuota, vale la data generale delle Impostazioni.</span>
          </span>
        </label>
      )}

      <fieldset>
        <legend className="label mb-2">Colore</legend>
        <div className="flex flex-wrap gap-2">
          {FOLDER_COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              aria-label={`Colore ${i + 1}`}
              aria-pressed={folder.color === c}
              onClick={() => save({ color: c })}
              className={`cursor-pointer rounded-xl border-2 p-1 ${folder.color === c ? "border-accent" : "border-transparent"}`}
            >
              <FolderBadge color={c} icon={folder.icon} size={36} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label mb-2">Icona</legend>
        <div className="flex flex-wrap gap-2">
          {FOLDER_ICONS.map((ic) => (
            <button
              key={ic.id}
              type="button"
              aria-label={ic.name}
              aria-pressed={folder.icon === ic.id}
              onClick={() => save({ icon: ic.id })}
              className={`cursor-pointer rounded-xl border-2 p-1 ${folder.icon === ic.id ? "border-accent" : "border-transparent"}`}
            >
              <FolderBadge color={folder.color} icon={ic.id} size={36} />
            </button>
          ))}
        </div>
      </fieldset>

      {parentId && targets.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor="folder-move" className="label">
            Sposta dentro
          </label>
          <select
            id="folder-move"
            className="field max-w-sm"
            defaultValue=""
            onChange={(e) => e.target.value && save({ parent_id: e.target.value })}
          >
            <option value="" disabled>
              Scegli una cartella
            </option>
            {targets.map((o) => (
              <option key={o.id} value={o.id}>
                {indent(o)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <p className="max-w-xl text-sm text-muted">
          {canDelete
            ? "Si può eliminare solo una cartella vuota: prima sposta o elimina quello che contiene."
            : "È la tua unica materia: creane un'altra prima di eliminarla."}
        </p>
        <button type="button" className="btn-danger" onClick={remove} disabled={!canDelete}>
          <Icon name="trash" />
          Elimina {parentId ? "cartella" : "materia"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}
      <p role="status" className="sr-only">
        {saved}
      </p>
    </div>
  );
}

export function MoveToFolder({
  table,
  id,
  current,
  options,
}: {
  table: "documents" | "maps" | "decks" | "notes";
  id: string;
  current: string;
  options: Option[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");

  async function onChange(folder: string) {
    const supabase = supabaseBrowser();
    const { error } =
      table === "documents"
        ? await supabase.rpc("move_document", { p_document: id, p_folder: folder })
        : await supabase.from(table).update({ folder_id: folder }).eq("id", id);
    setStatus(error ? "Spostamento non riuscito." : "Spostato.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`move-${id}`} className="text-sm text-muted">
        Cartella
      </label>
      <select id={`move-${id}`} className="field h-9 w-auto max-w-xs" value={current} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {indent(o)}
          </option>
        ))}
      </select>
      <span role="status" className="text-sm text-muted">
        {status}
      </span>
    </div>
  );
}
