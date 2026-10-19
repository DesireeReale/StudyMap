import { describe, expect, it } from "vitest";
import { MOCK_OUTPUTS } from "./ai/mock";
import { MindMapSchema } from "./ai/schemas";
import { mindMapToGraph } from "./graph";

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
