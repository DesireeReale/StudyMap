import "server-only";
import { PLANS } from "@/config/plans";
import { daysUntil } from "@/core/dates";
import { monthPeriod } from "@/core/entitlements";
import { pathTo } from "@/core/folders";
import type { DockData } from "@/components/StudyDock";
import type { Material } from "@/components/LibraryLists";
import type { DeckCounts } from "@/components/StudyMarks";
import { supabaseServer } from "./supabase/server";
import type { FolderRow, Profile } from "./supabase/types";

type Supabase = Awaited<ReturnType<typeof supabaseServer>>;
export type FolderItem = Pick<FolderRow, "id" | "parent_id" | "name" | "color" | "icon" | "position" | "created_at">;

export async function pageTitle(table: "folders" | "documents" | "maps" | "decks" | "notes", id: string) {
  const supabase = await supabaseServer();
  const column = table === "folders" ? "name" : "title";
  const { data } = await supabase.from(table).select(column).eq("id", id).maybeSingle();
  return { title: (data as Record<string, string> | null)?.[column] ?? "Non trovato" };
}

export async function loadFolders(supabase: Supabase): Promise<FolderItem[]> {
  const { data } = await supabase.from("folders").select("id, parent_id, name, color, icon, position, created_at").order("position");
  return data ?? [];
}

export function folderTrail(folders: FolderItem[], id: string) {
  return pathTo(folders, id).map((f) => ({ href: `/folders/${f.id}`, label: f.name }));
}

const STAT_LABELS = [
  ["documento", "documenti"],
  ["mappa", "mappe"],
  ["mazzo", "mazzi"],
  ["appunto", "appunti"],
] as const;

export function folderStats(folders: FolderItem[], lists: { folder_id: string }[][]): Record<string, string> {
  const totals = new Map<string, number[]>();
  lists.forEach((list, k) => {
    for (const row of list) {
      for (const f of pathTo(folders, row.folder_id)) {
        const t = totals.get(f.id) ?? [0, 0, 0, 0];
        t[k]!++;
        totals.set(f.id, t);
      }
    }
  });
  return Object.fromEntries(
    [...totals].map(([id, t]) => [
      id,
      t.map((n, k) => (n ? `${n} ${STAT_LABELS[k]![n === 1 ? 0 : 1]}` : "")).filter(Boolean).join(" · "),
    ]),
  );
}

export async function loadStudy(supabase: Supabase, profile: Profile, scope?: Promise<string[]>) {
  const [decks, maps, cards, usage, folderIds] = await Promise.all([
    supabase.from("decks").select("id, title, folder_id, created_at").order("created_at", { ascending: false }),
    supabase.from("maps").select("id, title, folder_id").order("updated_at", { ascending: false }),
    supabase.from("flashcards").select("deck_id, last_result"),
    supabase.from("quota_counters").select("count").eq("period", monthPeriod()).eq("kind", "generation").maybeSingle(),
    scope,
  ]);
  const inScope = (row: { folder_id: string }) => !folderIds || folderIds.includes(row.folder_id);
  const deckList = (decks.data ?? []).filter(inScope);
  const deckIds = new Set(deckList.map((d) => d.id));
  const mapList = (maps.data ?? []).filter(inScope);

  const counts = new Map<string, DeckCounts>();
  for (const c of cards.data ?? []) {
    if (!deckIds.has(c.deck_id)) continue;
    const k = counts.get(c.deck_id) ?? { known: 0, unknown: 0, fresh: 0 };
    if (c.last_result === "known") k.known++;
    else if (c.last_result === "unknown") k.unknown++;
    else k.fresh++;
    counts.set(c.deck_id, k);
  }
  const pending = (k: DeckCounts | undefined) => (k ? k.unknown + k.fresh : 0);
  const toReview = [...counts.values()].reduce((sum, k) => sum + pending(k), 0);
  const focus = [...deckList].sort((a, b) => pending(counts.get(b.id)) - pending(counts.get(a.id)))[0];
  const focusCounts = focus ? counts.get(focus.id) : undefined;
  const used = usage.data?.count ?? 0;
  const lastMap = mapList[0];

  const dock: DockData = {
    deck:
      focus && focusCounts
        ? { title: focus.title, known: focusCounts.known, total: focusCounts.known + pending(focusCounts) }
        : null,
    toReview,
    examDays: profile.exam_date ? daysUntil(profile.exam_date) : null,
    lastMap: lastMap ? { id: lastMap.id, title: lastMap.title } : null,
    generations: { used, limit: PLANS[profile.plan].generationsPerMonth },
  };
  return { dock, decks: deckList, counts, focus, toReview, used };
}

const pattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function searchWorkspace(supabase: Supabase, q: string, folderIds?: string[]) {
  const like = pattern(q);
  const scoped = <Q extends { in: (column: string, values: string[]) => Q }>(q: Q) => (folderIds ? q.in("folder_id", folderIds) : q);
  const folderQuery = supabase.from("folders").select("id, parent_id, name, color, icon, position, created_at").ilike("name", like);
  const [folders, documents, maps, decks, noteTitles, noteBodies] = await Promise.all([
    folderIds ? folderQuery.in("id", folderIds) : folderQuery,
    scoped(supabase.from("documents").select("id, title, kind, page_count, created_at, folder_id").ilike("title", like)).limit(30),
    scoped(supabase.from("maps").select("id, title, graph, updated_at, folder_id").ilike("title", like)).limit(30),
    scoped(supabase.from("decks").select("id, title, created_at, folder_id").ilike("title", like)).limit(30),
    scoped(supabase.from("notes").select("id, title, body, updated_at, folder_id").ilike("title", like)).limit(30),
    scoped(supabase.from("notes").select("id, title, body, updated_at, folder_id").ilike("body", like)).limit(30),
  ]);
  const notes = [...(noteTitles.data ?? []), ...(noteBodies.data ?? [])].filter(
    (n, i, all) => all.findIndex((m) => m.id === n.id) === i,
  );
  return {
    folders: folders.data ?? [],
    documents: documents.data ?? [],
    maps: maps.data ?? [],
    decks: decks.data ?? [],
    notes,
  };
}

export function snippet(body: string, q: string, size = 140): string {
  const at = body.toLowerCase().indexOf(q.toLowerCase());
  const start = Math.max(0, (at < 0 ? 0 : at) - size / 2);
  const text = body.slice(start, start + size).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${text}${start + size < body.length ? "…" : ""}`;
}

const DOC_LABEL = { pdf: "PDF", image: "Immagine", text: "Testo" } as const;

export function toMaterials(
  rows: {
    documents?: { id: string; title: string; kind: keyof typeof DOC_LABEL; page_count: number; created_at: string; folder_id: string }[];
    notes?: { id: string; title: string; updated_at: string; folder_id: string }[];
    maps?: { id: string; title: string; graph: { nodes: unknown[] }; updated_at: string; folder_id: string }[];
    decks?: { id: string; title: string; created_at: string; folder_id: string }[];
  },
  folders: FolderItem[] = [],
  counts?: Map<string, { unknown: number; fresh: number }>,
): Material[] {
  const place = (id: string) => folders.find((f) => f.id === id)?.name;
  const pending = (id: string) => {
    const k = counts?.get(id);
    return k ? `${k.unknown + k.fresh} da ripassare` : "";
  };
  return [
    ...(rows.documents ?? []).map((d) => ({
      kind: "documento" as const,
      id: d.id,
      title: d.title,
      detail: `${DOC_LABEL[d.kind]} · ${d.page_count} ${d.page_count === 1 ? "pagina" : "pagine"}`,
      date: d.created_at,
      place: place(d.folder_id),
    })),
    ...(rows.notes ?? []).map((n) => ({ kind: "appunto" as const, id: n.id, title: n.title, detail: "", date: n.updated_at, place: place(n.folder_id) })),
    ...(rows.maps ?? []).map((m) => ({
      kind: "mappa" as const,
      id: m.id,
      title: m.title,
      detail: `${m.graph.nodes.length} concetti`,
      date: m.updated_at,
      place: place(m.folder_id),
    })),
    ...(rows.decks ?? []).map((d) => ({ kind: "flashcard" as const, id: d.id, title: d.title, detail: pending(d.id), date: d.created_at, place: place(d.folder_id) })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}
