import { describe, expect, it } from "vitest";
import { blocks, outline } from "./outline";

describe("outline", () => {
  it("lists markdown headings with their position in the text", () => {
    const body = "## Definizione\n- sindrome clinica\n\n## Segni e sintomi \n- dispnea\n#non un titolo";
    expect(outline(body)).toEqual([
      { title: "Definizione", offset: 0 },
      { title: "Segni e sintomi", offset: body.indexOf("## Segni") },
    ]);
  });

  it("returns nothing for plain notes", () => {
    expect(outline("Appunti senza titoli.\nSeconda riga.")).toEqual([]);
  });
});

describe("blocks", () => {
  it("reads the source pages line of a section", () => {
    expect(blocks("## Segni\n[pagine 4, 6]\n- Dispnea")).toEqual([
      { kind: "heading", text: "Segni" },
      { kind: "pages", text: "[pagine 4, 6]", pages: [4, 6] },
      { kind: "point", text: "Dispnea" },
    ]);
  });

  it("splits a summary into headings, points and plain lines", () => {
    expect(blocks("## Segni\n- Dispnea\n\nNota finale")).toEqual([
      { kind: "heading", text: "Segni" },
      { kind: "point", text: "Dispnea" },
      { kind: "text", text: "Nota finale" },
    ]);
  });
});
