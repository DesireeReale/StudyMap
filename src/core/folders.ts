export const MAX_FOLDER_DEPTH = 3;

export type TreeFolder = { id: string; parent_id: string | null; name: string; position: number };

const byPosition = (a: TreeFolder, b: TreeFolder) => a.position - b.position || a.name.localeCompare(b.name, "it");

export function childrenOf<T extends TreeFolder>(folders: T[], parentId: string | null): T[] {
  return folders.filter((f) => f.parent_id === parentId).sort(byPosition);
}

export function subtreeIds(folders: TreeFolder[], rootId: string): string[] {
  const ids = [rootId];
  for (let i = 0; i < ids.length; i++) ids.push(...folders.filter((f) => f.parent_id === ids[i]).map((f) => f.id));
  return ids;
}

export function pathTo<T extends TreeFolder>(folders: T[], id: string): T[] {
  const path: T[] = [];
  let current = folders.find((f) => f.id === id);
  while (current && path.length <= MAX_FOLDER_DEPTH) {
    path.unshift(current);
    current = folders.find((f) => f.id === current!.parent_id);
  }
  return path;
}

export function treeOptions(folders: TreeFolder[]): { id: string; name: string; depth: number }[] {
  const out: { id: string; name: string; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const f of childrenOf(folders, parentId)) {
      out.push({ id: f.id, name: f.name, depth });
      walk(f.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function moveTargets(folders: TreeFolder[], folderId: string): { id: string; name: string; depth: number }[] {
  const own = new Set(subtreeIds(folders, folderId));
  const height = (id: string): number => 1 + Math.max(0, ...childrenOf(folders, id).map((c) => height(c.id)));
  const h = height(folderId);
  const current = folders.find((f) => f.id === folderId)?.parent_id;
  return treeOptions(folders).filter((o) => !own.has(o.id) && o.id !== current && o.depth + 1 + h <= MAX_FOLDER_DEPTH);
}

export function reorder<T extends { id: string }>(items: T[], id: string, toIndex: number): T[] {
  const from = items.findIndex((i) => i.id === id);
  if (from < 0 || toIndex < 0 || toIndex >= items.length || from === toIndex) return items;
  const next = [...items];
  next.splice(toIndex, 0, ...next.splice(from, 1));
  return next;
}

export function folderError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "Qui c'è già una cartella con questo nome.";
  if (error.code === "23514" && error.message.includes("livelli")) return error.message;
  if (error.code === "23514" && error.message.includes("sé stessa")) return error.message;
  if (error.code === "23503") return "La cartella non è vuota: sposta o elimina prima il suo contenuto.";
  return "Operazione non riuscita. Riprova.";
}
