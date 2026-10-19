import { describe, expect, it } from "vitest";
import { MOCK_OUTPUTS } from "./ai/mock";
import { MindMapSchema } from "./ai/schemas";
import { NODE_COLORS, mindMapToGraph, textColorFor } from "./graph";

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

describe("textColorFor", () => {
  it("keeps node labels readable on every palette colour and on legacy colours", () => {
    expect(textColorFor("#1f201d")).toBe("#ffffff");
    expect(textColorFor("#d4e9e5")).toBe("#1f201d");
    expect(textColorFor("#1d4ed8")).toBe("#ffffff"); // taste-skill-ignore: colour of maps saved before the palette change
    expect(NODE_COLORS.every((c) => ["#ffffff", "#1f201d"].includes(textColorFor(c)))).toBe(true);
  });
});
