import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { detectFileKind } from "./files";
import { PageLimitError, ingestOffice } from "./ingest";
import { officeKind, readDocx, readPptx } from "./office";
import { readZip } from "./zip";

const fixture = (name: string) => new Uint8Array(readFileSync(`tests/fixtures/${name}`));

describe("office files", () => {
  it("reads slides in presentation order, with notes and their pictures", () => {
    const bytes = fixture("lezione.pptx");
    expect(detectFileKind(bytes)).toBe("zip");
    const zip = readZip(bytes);
    expect(officeKind(zip)).toBe("pptx");
    const [first, second] = readPptx(zip);
    expect(first).toEqual({ text: "Introduzione alla cinematica", figures: [] });
    expect(second!.text).toBe("Moto rettilineo\nLa velocità è costante & l'accelerazione è nulla\n\nNote del relatore:\nRicordare il grafico");
    expect(second!.figures).toHaveLength(1);
    expect(second!.figures[0]!.mime).toBe("image/png");
  });

  it("reads Word paragraphs, tabs and where pictures sit", () => {
    const zip = readZip(fixture("appunti.docx"));
    expect(officeKind(zip)).toBe("docx");
    const [page] = readDocx(zip);
    expect(page!.text).toBe("Il contratto\n\nArt. 1321: accordo di due o più parti\n\n[[figura:1]]\n\nRequisiti\tart. 1325");
    expect(page!.figures).toHaveLength(1);
  });

  it("puts figure descriptions in place and stays within the budget", async () => {
    const describe = vi.fn(async (dataUrl: string, context: string) => {
      expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
      return context.includes("contratto") ? "schema delle parti" : "grafico";
    });
    const [docx] = await ingestOffice(readDocx(readZip(fixture("appunti.docx"))), { maxPages: 5, figures: { describe, max: 5 } });
    expect(docx).toContain("parti\n\nFigura: schema delle parti\n\nRequisiti");

    const slides = await ingestOffice(readPptx(readZip(fixture("lezione.pptx"))), { maxPages: 5, figures: { describe, max: 0 } });
    expect(slides[1]).not.toContain("Figura");
    expect(describe).toHaveBeenCalledTimes(1);
  });

  it("drops markers when figures are off and enforces the page limit", async () => {
    const [docx] = await ingestOffice(readDocx(readZip(fixture("appunti.docx"))), { maxPages: 5 });
    expect(docx).toBe("Il contratto\n\nArt. 1321: accordo di due o più parti\n\nRequisiti\tart. 1325");
    await expect(ingestOffice(readPptx(readZip(fixture("lezione.pptx"))), { maxPages: 1 })).rejects.toBeInstanceOf(PageLimitError);
  });

  it("recognises old binary Office files", () => {
    expect(detectFileKind(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe("legacy-office");
  });
});
