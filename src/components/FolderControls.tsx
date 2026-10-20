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

type Folder = { id: string; name: string; color: FolderColor; icon: FolderIcon; position: number };
type Option = { id: string; name: string; depth: number };

const indent = (o: Option) => `${"   ".repeat(o.depth)}${o.name}`;

export function NewFolderForm({ parentId, label, placeholder }: { parentId: string | null; label: string; placeholder: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; upgrade: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  const id = `new-folder-${parentId ?? "root"}`;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <input id={id} name="name" required maxLength={80} placeholder={placeholder} className="field max-w-sm flex-1" />
        <button type="submit" className="btn-primary h-10" disabled={busy}>
          <Icon name="plus" />
          Crea
        </button>
      </div>
      {problem && <UpgradeNotice message={problem.message} upgrade={problem.upgrade} />}
    </form>
  );
}

export function FolderTiles({ folders, stats }: { folders: Folder[]; stats: Record<string, string> }) {
  const router = useRouter();
  const [items, setItems] = useState(folders);
  const [dragged, setDragged] = useState<string | null>(null);
  const [status, setStatus] = useState("");

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
    const failed = results.some((r) => r?.error);
    setItems(next.map((f, position) => ({ ...f, position })));
    setStatus(failed ? "Ordine non salvato. Riprova." : `${next[to]!.name} spostata in posizione ${to + 1}.`);
    router.refresh();
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((f, i) => (
          <li
            key={f.id}
            draggable
            onDragStart={() => setDragged(f.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragged && move(dragged, i)}
            onDragEnd={() => setDragged(null)}
            className={`row-card flex items-center gap-3 ${dragged === f.id ? "opacity-50" : ""}`}
          >
            <FolderBadge color={f.color} icon={f.icon} />
            <Link href={`/folders/${f.id}`} className="min-w-0 flex-1 hover:underline">
              <span className="block truncate font-bold">{f.name}</span>
              <span className="num block truncate text-[13px] text-muted">{stats[f.id] ?? "Vuota"}</span>
            </Link>
            {items.length > 1 && (
              <span className="flex shrink-0 flex-col">
                <button
                  type="button"
                  className="btn-ghost h-7 px-2"
                  aria-label={`Sposta ${f.name} prima`}
                  disabled={i === 0}
                  onClick={() => move(f.id, i - 1)}
                >
                  <Icon name="up" size={16} />
                </button>
                <button
                  type="button"
                  className="btn-ghost h-7 px-2"
                  aria-label={`Sposta ${f.name} dopo`}
                  disabled={i === items.length - 1}
                  onClick={() => move(f.id, i + 1)}
                >
                  <Icon name="down" size={16} />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">
        {status}
      </p>
    </>
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

  async function save(change: { name?: string; color?: FolderColor; icon?: FolderIcon; parent_id?: string }) {
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
