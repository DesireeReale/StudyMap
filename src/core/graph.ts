import dagre from "@dagrejs/dagre";
import type { MindMap } from "./ai/schemas";

export type GraphNode = {
  id: string;
  position: { x: number; y: number };
  data: { label: string; color: string };
};
export type GraphEdge = { id: string; source: string; target: string; label?: string };
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

export const NODE_COLORS = ["#1f201d", "#1b6e66", "#d4e9e5", "#2f4f6f", "#f3dcdc", "#e6e8e7"];

export const NODE_COLOR_NAMES: Record<string, string> = {
  "#1f201d": "inchiostro",
  "#1b6e66": "verde acqua",
  "#d4e9e5": "verde acqua chiaro",
  "#2f4f6f": "blu ardesia",
  "#f3dcdc": "rosa chiaro",
  "#e6e8e7": "grigio chiaro",
};

const DEPTH_COLORS = ["#1f201d", "#1b6e66", "#d4e9e5", "#e6e8e7"];

function luminance(hex: string): number {
  const v = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

const INK = "#1f201d";

export function textColorFor(fill: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(fill)) return "#ffffff";
  const l = luminance(fill);
  const onWhite = 1.05 / (l + 0.05);
  const onInk = (l + 0.05) / (luminance(INK) + 0.05);
  return onInk > onWhite ? INK : "#ffffff";
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
      data: { label: n.label, color: DEPTH_COLORS[Math.min(depthOf(n.id), DEPTH_COLORS.length - 1)]! },
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
