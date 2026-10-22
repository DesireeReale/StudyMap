export type Chapter = { title: string; from: number; to: number };

export const MAX_CHAPTERS = 8;

const NAMED = /^(capitolo|cap\.|chapter|lezione|unità|unit|parte|modulo|sezione)\s*[\dIVX]+\b/i;
const NUMBERED = /^\d{1,2}(\.\d{1,2})*[.)]?\s+\p{Lu}/u;
const MARKDOWN = /^#{1,3}\s+\S/;

export function isHeading(line: string): boolean {
  if (line.length < 3 || line.length > 80 || /[.;,]$/.test(line)) return false;
  if (NAMED.test(line) || MARKDOWN.test(line) || NUMBERED.test(line)) return true;
  const letters = line.match(/\p{L}/gu) ?? [];
  const upper = line.match(/\p{Lu}/gu) ?? [];
  return letters.length >= 4 && upper.length / letters.length >= 0.9;
}

function headingTitle(line: string): string {
  const text = line.replace(/^#{1,3}\s+/, "").trim();
  const shouting = text === text.toUpperCase() && /\p{Lu}{2}/u.test(text);
  if (!shouting) return text;
  const lower = text.toLocaleLowerCase("it");
  return lower.charAt(0).toLocaleUpperCase("it") + lower.slice(1);
}

const lines = (page: string) => page.split("\n").map((l) => l.trim()).filter(Boolean);

export function detectChapters(pages: string[], max = MAX_CHAPTERS): Chapter[] {
  const firsts = pages.map((p) => lines(p)[0] ?? "");
  const counts = new Map<string, number>();
  for (const f of firsts) counts.set(f, (counts.get(f) ?? 0) + 1);
  const repeated = (line: string) => pages.length >= 4 && (counts.get(line) ?? 0) >= pages.length / 2;

  const sections: { title: string; from: number }[] = [];
  pages.forEach((page, i) => {
    const first = lines(page).find((l) => !repeated(l));
    if (first && isHeading(first)) sections.push({ title: headingTitle(first), from: i });
    else if (i === 0) sections.push({ title: "Introduzione", from: 0 });
  });
  if (sections.length < 2) return [];

  const minPages = Math.max(2, Math.ceil(pages.length / max));
  const groups: { titles: string[]; from: number; to: number }[] = [];
  sections.forEach((s, i) => {
    const to = (sections[i + 1]?.from ?? pages.length) - 1;
    const last = groups.at(-1);
    if (last && last.to - last.from + 1 < minPages) {
      last.titles.push(s.title);
      last.to = to;
    } else groups.push({ titles: [s.title], from: s.from, to });
  });
  const tail = groups.at(-1)!;
  if (groups.length > 1 && tail.to - tail.from + 1 < minPages / 2) {
    groups.pop();
    const prev = groups.at(-1)!;
    prev.titles.push(...tail.titles);
    prev.to = tail.to;
  }
  if (groups.length < 2) return [];
  return groups.map((g) => ({ title: shorten(g.titles), from: g.from, to: g.to }));
}

function shorten(titles: string[]): string {
  let out = titles[0]!;
  for (const t of titles.slice(1)) {
    if (`${out}, ${t}`.length > 70) return `${out}…`;
    out = `${out}, ${t}`;
  }
  return out;
}
