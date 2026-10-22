import { jsPDF } from "jspdf";
import { describe, expect, it, vi } from "vitest";
import { detectFileKind } from "./files";
import { PageLimitError, ingestPdf, textToPages } from "./ingest";

function samplePdf(): Uint8Array {
  const doc = new jsPDF();
  doc.text("Lo scompenso cardiaco è una sindrome clinica caratterizzata da dispnea ed edemi.", 10, 10);
  doc.addPage();
  return new Uint8Array(doc.output("arraybuffer"));
}

describe("ingestPdf", () => {
  it("extracts native text and transcribes pages without text", async () => {
    const transcribe = vi.fn(async (dataUrl: string) => {
      expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
      return "pagina scansionata";
    });
    const transcribed: number[] = [];
    const pages = await ingestPdf(samplePdf(), { maxPages: 5, transcribe, onTranscribed: (i) => transcribed.push(i) });
    expect(pages[0]).toContain("scompenso cardiaco");
    expect(pages[1]).toBe("pagina scansionata");
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(transcribed).toEqual([1]);
  });

  it("counts only the pages that need an image pass", async () => {
    const onPage = vi.fn();
    await ingestPdf(samplePdf(), { maxPages: 5, transcribe: async () => "pagina scansionata", onPage });
    expect(onPage.mock.calls).toEqual([
      [0, 1],
      [1, 1],
    ]);
  });

  it("describes the figures of pages with text when asked", async () => {
    const transcribe = vi.fn(async () => "pagina scansionata");
    const describe = vi.fn(async () => "grafico pressione-volume");
    const pages = await ingestPdf(samplePdf(), { maxPages: 5, transcribe, figures: { describe, max: 10 } });
    expect(pages[0]).toMatch(/^Lo scompenso[^\n]+\n\nFigura: grafico pressione-volume$/);
    expect(describe).toHaveBeenCalledTimes(1);
  });

  it("rejects PDFs over the page limit before extracting", async () => {
    const transcribe = vi.fn();
    await expect(ingestPdf(samplePdf(), { maxPages: 1, transcribe })).rejects.toBeInstanceOf(PageLimitError);
    expect(transcribe).not.toHaveBeenCalled();
  });
});

describe("detectFileKind", () => {
  it("uses magic bytes, not extensions", () => {
    expect(detectFileKind(samplePdf())).toBe("pdf");
    expect(detectFileKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    expect(detectFileKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(detectFileKind(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("webp");
    expect(detectFileKind(new TextEncoder().encode("<html>"))).toBeNull();
  });
});

describe("textToPages", () => {
  it("splits pasted text on paragraph boundaries", () => {
    const text = Array.from({ length: 10 }, (_, i) => `Paragrafo ${i} ${"x".repeat(500)}`).join("\n\n");
    const pages = textToPages(text, 1200);
    expect(pages.length).toBeGreaterThan(3);
    expect(pages.join("\n\n")).toBe(text);
  });
});
