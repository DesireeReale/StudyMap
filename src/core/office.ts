import { posix } from "node:path";
import { textToPages } from "./ingest";
import type { Zip } from "./zip";

export type Figure = { id: string; mime: string; bytes: Uint8Array };
export type SourcePage = { text: string; figures: Figure[] };

export const figureMarker = (id: string) => `[[figura:${id}]]`;

const IMAGE_MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
const MIN_FIGURE_BYTES = 1024;

export function officeKind(zip: Zip): "docx" | "pptx" | null {
  if (zip.has("word/document.xml")) return "docx";
  if (zip.has("ppt/presentation.xml")) return "pptx";
  return null;
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

const text = (zip: Zip, name: string) => {
  const read = zip.get(name);
  return read ? new TextDecoder().decode(read()) : "";
};

function relations(zip: Zip, part: string): Map<string, { target: string; type: string }> {
  const dir = posix.dirname(part);
  const xml = text(zip, `${dir}/_rels/${posix.basename(part)}.rels`);
  const rels = new Map<string, { target: string; type: string }>();
  for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const attr = (k: string) => m[0].match(new RegExp(`\\b${k}="([^"]*)"`))?.[1] ?? "";
    if (attr("TargetMode") === "External") continue;
    rels.set(attr("Id"), { target: posix.normalize(posix.join(dir, attr("Target"))).replace(/^\//, ""), type: attr("Type") });
  }
  return rels;
}

function figure(zip: Zip, path: string, seen: Set<string>): Figure | null {
  const mime = IMAGE_MIME[posix.extname(path).slice(1).toLowerCase()];
  const read = zip.get(path);
  if (!mime || !read || seen.has(path)) return null;
  seen.add(path);
  const bytes = read();
  return bytes.length < MIN_FIGURE_BYTES ? null : { id: String(seen.size), mime, bytes };
}

function paragraphs(xml: string, para: string, run: string): string[] {
  const out: string[] = [];
  for (const p of xml.split(`</${para}>`)) {
    const line = [...p.matchAll(new RegExp(`<${run}(?:\\s[^>]*)?>([^<]*)</${run}>|<w:tab/>|<w:br/>|r:embed="([^"]+)"`, "g"))]
      .map((m) => (m[2] ? `\u0000${m[2]}\u0000` : m[0] === "<w:tab/>" ? "\t" : m[0] === "<w:br/>" ? "\n" : decodeXml(m[1] ?? "")))
      .join("")
      .trim();
    if (line) out.push(line);
  }
  return out;
}

export function readDocx(zip: Zip): SourcePage[] {
  const part = "word/document.xml";
  const rels = relations(zip, part);
  const seen = new Set<string>();
  const figures: Figure[] = [];
  const body = paragraphs(text(zip, part), "w:p", "w:t")
    .map((line) =>
      line.replace(/\u0000([^\u0000]+)\u0000/g, (_, rid: string) => {
        const f = rels.get(rid) && figure(zip, rels.get(rid)!.target, seen);
        if (!f) return "";
        figures.push(f);
        return `\n${figureMarker(f.id)}\n`;
      }),
    )
    .join("\n\n");
  return textToPages(body).map((page) => ({ text: page, figures: figures.filter((f) => page.includes(figureMarker(f.id))) }));
}

export function readPptx(zip: Zip): SourcePage[] {
  const presentation = "ppt/presentation.xml";
  const rels = relations(zip, presentation);
  const order = [...text(zip, presentation).matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map((m) => rels.get(m[1]!)?.target);
  const seen = new Set<string>();
  return order.flatMap((slide) => {
    if (!slide || !zip.has(slide)) return [];
    const slideRels = relations(zip, slide);
    const figures: Figure[] = [];
    const lines = paragraphs(text(zip, slide), "a:p", "a:t").map((line) =>
      line.replace(/\u0000([^\u0000]+)\u0000/g, (_, rid: string) => {
        const f = slideRels.get(rid) && figure(zip, slideRels.get(rid)!.target, seen);
        if (f) figures.push(f);
        return "";
      }),
    );
    const notesPart = [...slideRels.values()].find((r) => r.type.endsWith("/notesSlide"))?.target;
    const notes = notesPart
      ? paragraphs(text(zip, notesPart).replace(/<a:fld\b[\s\S]*?<\/a:fld>/g, ""), "a:p", "a:t").join("\n")
      : "";
    const body = lines.filter((l) => l.trim()).join("\n");
    return [{ text: notes ? `${body}\n\nNote del relatore:\n${notes}` : body, figures }];
  });
}
