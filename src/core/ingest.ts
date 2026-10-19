import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";

export const MIN_PAGE_CHARS = 50;

export class PageLimitError extends Error {
  constructor(readonly pages: number) {
    super(`PDF with ${pages} pages`);
  }
}

export type Transcribe = (dataUrl: string) => Promise<string>;

export async function ingestPdf(
  bytes: Uint8Array,
  opts: { maxPages: number; transcribe: Transcribe },
): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  if (pdf.numPages > opts.maxPages) throw new PageLimitError(pdf.numPages);
  const { text } = await extractText(pdf, { mergePages: false });

  const pages: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const pageText = text[i]!.trim();
    if (pageText.length >= MIN_PAGE_CHARS) {
      pages.push(pageText);
      continue;
    }
    const image = await renderPageAsImage(pdf, i + 1, {
      canvasImport: () => import("@napi-rs/canvas"),
      scale: 1.5,
      toDataURL: true,
    });
    pages.push((await opts.transcribe(image)).trim() || pageText);
  }
  return pages;
}

export function textToPages(text: string, pageChars = 3000): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const pages: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && current.length + p.length > pageChars) {
      pages.push(current.trim());
      current = "";
    }
    current += p + "\n\n";
  }
  if (current.trim()) pages.push(current.trim());
  return pages;
}
