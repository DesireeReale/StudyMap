import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";
import { figureMarker, type SourcePage } from "./office";

export const MIN_PAGE_CHARS = 50;

export class PageLimitError extends Error {
  constructor(readonly pages: number) {
    super(`PDF with ${pages} pages`);
  }
}

export type Transcribe = (dataUrl: string) => Promise<string>;
export type Describe = (dataUrl: string, context: string) => Promise<string>;
export type Figures = { describe: Describe; max: number };
export type OnPage = (done: number, total: number) => void;

function counted<T>(jobs: (() => Promise<T>)[], slow: boolean[], onPage?: OnPage): (() => Promise<T>)[] {
  const total = slow.filter(Boolean).length;
  let done = 0;
  if (onPage && total) onPage(0, total);
  return jobs.map((job, i) =>
    slow[i]
      ? async () => {
          const result = await job();
          onPage?.(++done, total);
          return result;
        }
      : job,
  );
}

const CONCURRENCY = 4;

async function inParallel<T>(jobs: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await jobs[i]!();
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
  return results;
}

const withFigure = (text: string, description: string) => (description.trim() ? `${text}\n\nFigura: ${description.trim()}` : text);

async function describeSafely(figures: Figures, dataUrl: string, context: string): Promise<string> {
  try {
    return await figures.describe(dataUrl, context);
  } catch (e) {
    console.error("figure description failed", e);
    return "";
  }
}

export async function ingestPdf(
  bytes: Uint8Array,
  opts: { maxPages: number; transcribe: Transcribe; figures?: Figures; onPage?: OnPage },
): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  if (pdf.numPages > opts.maxPages) throw new PageLimitError(pdf.numPages);
  const { text } = await extractText(pdf, { mergePages: false });
  const render = (page: number) =>
    renderPageAsImage(pdf, page, { canvasImport: () => import("@napi-rs/canvas"), scale: 1.5, toDataURL: true });

  let budget = opts.figures?.max ?? 0;
  const slow: boolean[] = [];
  const jobs = text.map((raw, i) => {
    const pageText = raw.trim();
    slow[i] = true;
    if (pageText.length < MIN_PAGE_CHARS) return async () => (await opts.transcribe(await render(i + 1))).trim() || pageText;
    slow[i] = false;
    if (!opts.figures || budget <= 0) return async () => pageText;
    budget--;
    slow[i] = true;
    const figures = opts.figures;
    return async () => withFigure(pageText, await describeSafely(figures, await render(i + 1), pageText));
  });
  return inParallel(counted(jobs, slow, opts.onPage));
}

export async function ingestOffice(
  pages: SourcePage[],
  opts: { maxPages: number; figures?: Figures; onPage?: OnPage },
): Promise<string[]> {
  if (pages.length > opts.maxPages) throw new PageLimitError(pages.length);
  let budget = opts.figures?.max ?? 0;
  const slow: boolean[] = [];
  return inParallel(
    counted(
      pages.map((page, i) => {
      const chosen = opts.figures ? page.figures.slice(0, Math.max(0, budget)) : [];
      budget -= chosen.length;
      slow[i] = chosen.length > 0;
      return async () => {
        let text = page.text;
        for (const f of chosen) {
          const description = await describeSafely(opts.figures!, `data:${f.mime};base64,${Buffer.from(f.bytes).toString("base64")}`, page.text);
          text = text.includes(figureMarker(f.id))
            ? text.replace(figureMarker(f.id), description.trim() ? `Figura: ${description.trim()}` : "")
            : withFigure(text, description);
        }
        return text.replace(/\[\[figura:[^\]]+\]\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
      };
      }),
      slow,
      opts.onPage,
    ),
  );
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
