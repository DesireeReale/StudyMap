import dagre from "@dagrejs/dagre";
import type { MindMap } from "./ai/schemas";

export type GraphNode = {
  id: string;
  position: { x: number; y: number };
  data: { label: string; color: string };
};
export type GraphEdge = { id: string; source: string; target: string; label?: string };
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

export const NODE_COLORS = ["#1d4ed8", "#047857", "#b45309", "#7e22ce", "#be123c", "#334155"];

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
  const depth = new Map<string, number>();
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const depthOf = (id: string): number => {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    const parent = byId.get(id)?.parentId;
    const d = parent ? depthOf(parent) + 1 : 0;
    depth.set(id, d);
    return d;
  };

  return layoutGraph({
    nodes: map.nodes.map((n) => ({
      id: n.id,
      position: { x: 0, y: 0 },
      data: { label: n.label, color: NODE_COLORS[Math.min(depthOf(n.id), NODE_COLORS.length - 1)]! },
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
