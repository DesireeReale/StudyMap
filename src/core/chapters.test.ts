import { describe, expect, it } from "vitest";
import { detectChapters, isHeading } from "./chapters";

const header = "Mario Rossi Appunti di Fisiologia . 2026";
const page = (first: string) => `${header}\n${first}\nTesto della pagina con abbastanza parole per essere un paragrafo normale.`;

describe("detectChapters", () => {
  it("recognises chapter-like first lines", () => {
    expect(isHeading("GESTIONE DELLA MEMORIA")).toBe(true);
    expect(isHeading("Capitolo 3 - Il cuore")).toBe(true);
    expect(isHeading("2.1 Ciclo cardiaco")).toBe(true);
    expect(isHeading("## Ventilazione")).toBe(true);
    expect(isHeading("Il cuore pompa il sangue nei vasi.")).toBe(false);
    expect(isHeading("PA")).toBe(false);
  });

  it("skips the repeated page header and groups short sections", () => {
    const pages = [
      page("Il corso parte da qui."),
      page("continua."),
      page("IL CUORE"),
      page("altro"),
      page("CICLO CARDIACO"),
      page("altro"),
      page("IL RENE"),
      page("altro"),
      page("altro"),
      page("altro"),
    ];
    expect(detectChapters(pages, 5)).toEqual([
      { title: "Introduzione", from: 0, to: 1 },
      { title: "Il cuore", from: 2, to: 3 },
      { title: "Ciclo cardiaco", from: 4, to: 5 },
      { title: "Il rene", from: 6, to: 9 },
    ]);
    expect(detectChapters(pages, 2)).toEqual([
      { title: "Introduzione, Il cuore, Ciclo cardiaco", from: 0, to: 5 },
      { title: "Il rene", from: 6, to: 9 },
    ]);
  });

  it("returns nothing without recognisable headings", () => {
    expect(detectChapters(["solo testo.", "ancora testo.", "fine."])).toEqual([]);
  });
});
