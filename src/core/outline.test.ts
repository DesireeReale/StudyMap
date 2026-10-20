import { describe, expect, it } from "vitest";
import { outline } from "./outline";

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
