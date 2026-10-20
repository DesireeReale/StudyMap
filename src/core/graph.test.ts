import { describe, expect, it } from "vitest";
import { MOCK_OUTPUTS } from "./ai/mock";
import { MindMapSchema } from "./ai/schemas";
import { childRole, type Graph, mindMapToGraph, nodeRole, openingNodes } from "./graph";

describe("mindMapToGraph", () => {
  it("creates one edge per non-root node and lays out ranks top-down", () => {
    const map = MindMapSchema.parse(MOCK_OUTPUTS.mindmap);
    const graph = mindMapToGraph(map);
    expect(graph.nodes).toHaveLength(map.nodes.length);
    expect(graph.edges).toHaveLength(map.nodes.length - 1);
    const y = (id: string) => graph.nodes.find((n) => n.id === id)!.position.y;
    expect(y("n1")).toBeLessThan(y("n2"));
    expect(y("n2")).toBeLessThan(y("n3"));
    expect(graph.edges.find((e) => e.target === "n4")?.label).toBe("si manifesta con");
  });
});

describe("node roles", () => {
  it("gives each top-level branch its own area and keeps it down the branch", () => {
    const graph = mindMapToGraph(MindMapSchema.parse(MOCK_OUTPUTS.mindmap));
    const role = (id: string) => graph.nodes.find((n) => n.id === id)!.data.color;
    expect(role("n1")).toBe("radice");
    const top = graph.edges.filter((e) => e.source === "n1").map((e) => role(e.target));
    expect(new Set(top).size).toBe(Math.min(top.length, 3));
    for (const e of graph.edges.filter((e) => e.source !== "n1")) expect(role(e.target)).toBe(role(e.source));
  });

  it("converts colours of maps saved before roles", () => {
    expect(nodeRole("#1F201D")).toBe("radice");
    expect(nodeRole("#d4e9e5")).toBe("area-3");
    expect(nodeRole("area-2")).toBe("area-2");
    expect(nodeRole("#123456")).toBe("neutro");
    expect(childRole(undefined, 0)).toBe("radice");
    expect(childRole("radice", 4)).toBe("area-2");
  });
});

describe("openingNodes", () => {
  it("keeps the root and the first two levels", () => {
    const graph = {
      nodes: ["r", "a", "b", "a1", "a1x"].map((id) => ({ id, position: { x: 0, y: 0 }, data: { label: id, color: "neutro" } })),
      edges: [
        { id: "1", source: "r", target: "a" },
        { id: "2", source: "r", target: "b" },
        { id: "3", source: "a", target: "a1" },
        { id: "4", source: "a1", target: "a1x" },
      ],
    };
    expect(openingNodes(graph satisfies Graph)).toEqual([{ id: "r" }, { id: "a" }, { id: "b" }, { id: "a1" }]);
  });
});
