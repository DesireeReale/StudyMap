import type { Graph } from "./graph";

type Card = { front: string; back: string };

const csvField = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function cardsToCsv(cards: Card[]): string {
  return "﻿" + [["Fronte", "Retro"], ...cards.map((c) => [c.front, c.back])].map((r) => r.map(csvField).join(",")).join("\r\n");
}

const ankiField = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\t/g, " ").replace(/\r?\n/g, "<br>");

export function cardsToAnki(cards: Card[]): string {
  return ["#separator:tab", "#html:true", ...cards.map((c) => `${ankiField(c.front)}\t${ankiField(c.back)}`)].join("\n");
}

type TreeItem = { label: string; relation?: string; children: TreeItem[] };

function toTree(graph: Graph): TreeItem[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const out = new Map<string, { id: string; relation?: string }[]>();
  const hasParent = new Set<string>();
  for (const e of graph.edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    out.set(e.source, [...(out.get(e.source) ?? []), { id: e.target, relation: e.label }]);
    hasParent.add(e.target);
  }
  const x = (id: string) => byId.get(id)!.position.x;
  const seen = new Set<string>();
  const build = (id: string, relation?: string): TreeItem => {
    seen.add(id);
    const children: TreeItem[] = [];
    for (const k of [...(out.get(id) ?? [])].sort((a, b) => x(a.id) - x(b.id))) {
      if (!seen.has(k.id)) children.push(build(k.id, k.relation));
    }
    return { label: byId.get(id)!.data.label, relation, children };
  };
  const tree: TreeItem[] = [];
  for (const n of [...graph.nodes.filter((n) => !hasParent.has(n.id)), ...graph.nodes]) {
    if (!seen.has(n.id)) tree.push(build(n.id));
  }
  return tree;
}

const withRelation = (t: TreeItem) => (t.relation ? `${t.label} (${t.relation})` : t.label);

export function graphToMarkdown(title: string, graph: Graph): string {
  const lines = [`# ${title}`, ""];
  const walk = (items: TreeItem[], depth: number) => {
    for (const t of items) {
      lines.push(`${"  ".repeat(depth)}- ${withRelation(t)}`);
      walk(t.children, depth + 1);
    }
  };
  walk(toTree(graph), 0);
  return lines.join("\n") + "\n";
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function graphToOpml(title: string, graph: Graph): string {
  const outline = (t: TreeItem, depth: number): string => {
    const pad = "  ".repeat(depth);
    const attrs = `text="${xml(t.label)}"${t.relation ? ` _note="${xml(t.relation)}"` : ""}`;
    if (!t.children.length) return `${pad}<outline ${attrs}/>`;
    return `${pad}<outline ${attrs}>\n${t.children.map((c) => outline(c, depth + 1)).join("\n")}\n${pad}</outline>`;
  };
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    `  <head><title>${xml(title)}</title></head>`,
    "  <body>",
    ...toTree(graph).map((t) => outline(t, 2)),
    "  </body>",
    "</opml>",
    "",
  ].join("\n");
}
