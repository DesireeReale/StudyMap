import { describe, expect, it } from "vitest";
import { cardsToAnki, cardsToCsv, graphToMarkdown, graphToOpml } from "./export";
import type { Graph } from "./graph";

const node = (id: string, label: string, x = 0) => ({ id, position: { x, y: 0 }, data: { label, color: "neutro" } });

const graph: Graph = {
  nodes: [node("r", "Contratto"), node("b", "Forma", 200), node("a", "Requisiti", 100), node("c", "Accordo"), node("z", "Solo")],
  edges: [
    { id: "1", source: "r", target: "b" },
    { id: "2", source: "r", target: "a", label: "richiede" },
    { id: "3", source: "a", target: "c" },
    { id: "4", source: "c", target: "r" },
  ],
};

describe("export", () => {
  it("quotes CSV fields that need it", () => {
    expect(cardsToCsv([{ front: 'Art. "1321"', back: "a, b\nc" }])).toBe('﻿Fronte,Retro\r\n"Art. ""1321""","a, b\nc"');
  });

  it("writes Anki text with tabs and line breaks as HTML", () => {
    expect(cardsToAnki([{ front: "x < y", back: "uno\tdue\ntre" }])).toBe("#separator:tab\n#html:true\nx &lt; y\tuno due<br>tre");
  });

  it("turns the map into a nested list ordered left to right, surviving cycles", () => {
    expect(graphToMarkdown("Diritto", graph)).toBe(
      "# Diritto\n\n- Solo\n- Contratto\n  - Requisiti (richiede)\n    - Accordo\n  - Forma\n",
    );
  });

  it("escapes OPML", () => {
    const opml = graphToOpml("A & B", { nodes: [node("r", '"x"')], edges: [] });
    expect(opml).toContain("<title>A &amp; B</title>");
    expect(opml).toContain('<outline text="&quot;x&quot;"/>');
  });
});
