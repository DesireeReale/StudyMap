import dagre from "@dagrejs/dagre";
import type { MindMap } from "./ai/schemas";
import { NODE_ROLES, type NodeRole } from "./roles";

export type GraphNode = {
  id: string;
  position: { x: number; y: number };
  data: { label: string; color: string; collapsed?: boolean };
};
export type GraphEdge = { id: string; source: string; target: string; label?: string };
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

export { NODE_ROLES, type NodeRole };

const AREAS = ["area-1", "area-2", "area-3"] as const;

const LEGACY_HEX: Record<string, NodeRole> = {
  "#1f201d": "radice",
  "#1d4ed8": "radice",
  "#1b6e66": "area-2",
  "#2f4f6f": "area-2",
  "#d4e9e5": "area-3",
  "#f3dcdc": "area-1",
  "#e6e8e7": "neutro",
};

export function nodeRole(color: string): NodeRole {
  return (NODE_ROLES as readonly string[]).includes(color) ? (color as NodeRole) : (LEGACY_HEX[color.toLowerCase()] ?? "neutro");
}

export function childRole(parent: NodeRole | undefined, siblings: number): NodeRole {
  if (!parent) return "radice";
  return parent === "radice" ? AREAS[siblings % AREAS.length]! : parent;
}

export function nodeSize(label: string) {
  return { width: Math.min(260, Math.max(120, label.length * 8 + 32)), height: 48 };
}

export function layoutGraph(graph: Graph): Graph {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 30, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of graph.nodes) g.setNode(n.id, nodeSize(n.data.label));
  for (const e of graph.edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      const { x, y, width, height } = g.node(n.id);
      return { ...n, position: { x: x - width / 2, y: y - height / 2 } };
    }),
  };
}

export function mindMapToGraph(map: MindMap): Graph {
  const role = new Map<string, NodeRole>();
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const siblings = new Map<string, number>();
  const roleOf = (id: string): NodeRole => {
    const cached = role.get(id);
    if (cached) return cached;
    const parent = byId.get(id)?.parentId;
    let r: NodeRole = "radice";
    if (parent) {
      const i = siblings.get(parent) ?? 0;
      siblings.set(parent, i + 1);
      r = childRole(roleOf(parent), i);
    }
    role.set(id, r);
    return r;
  };

  return layoutGraph({
    nodes: map.nodes.map((n) => ({
      id: n.id,
      position: { x: 0, y: 0 },
      data: { label: n.label, color: roleOf(n.id) },
    })),
    edges: map.nodes
      .filter((n) => n.parentId !== null)
      .map((n) => ({
        id: `${n.parentId}-${n.id}`,
        source: n.parentId!,
        target: n.id,
        ...(n.relation ? { label: n.relation } : {}),
      })),
  });
}

export function openingNodes(graph: Graph, depth = 2): { id: string }[] {
  const targets = new Set(graph.edges.map((e) => e.target));
  const ids = new Set(graph.nodes.filter((n) => !targets.has(n.id)).map((n) => n.id));
  let level = new Set(ids);
  for (let d = 0; d < depth; d++) {
    level = new Set(graph.edges.filter((e) => level.has(e.source) && !ids.has(e.target)).map((e) => e.target));
    for (const id of level) ids.add(id);
  }
  return [...ids].map((id) => ({ id }));
}

type Link = { source: string; target: string };

export function descendants(edges: Link[], id: string): Set<string> {
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    for (const e of edges) {
      if (e.source === current && !out.has(e.target) && e.target !== id) {
        out.add(e.target);
        stack.push(e.target);
      }
    }
  }
  return out;
}

export function hiddenNodes(edges: Link[], collapsed: Iterable<string>): Set<string> {
  const hidden = new Set<string>();
  for (const id of collapsed) for (const d of descendants(edges, id)) hidden.add(d);
  return hidden;
}

export function branchRecolor(edges: Link[], ids: string[], color: NodeRole): Set<string> {
  const targets = new Set(edges.map((e) => e.target));
  const out = new Set<string>();
  for (const id of ids) {
    out.add(id);
    if (targets.has(id)) for (const d of descendants(edges, id)) out.add(d);
  }
  if (color === "radice") return new Set(ids);
  return out;
}
