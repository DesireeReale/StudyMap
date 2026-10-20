import { estimateTokens } from "./ai/chunk";

const STOPWORDS = new Set(
  "il lo la i gli le un uno una di a da in con su per tra fra e o ma se che chi cui non come dove quando quale quali cosa cos e è sono del della dei degli delle al allo alla ai agli alle dal dalla dai nel nella nei nelle sul sulla sui questo questa quello quella mi ti si ci vi ne piu più anche ad ed od the of and to is".split(
    " ",
  ),
);

export function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map((w) => (w.length > 5 ? w.slice(0, -1) : w));
}

export const excerptsFor = (pages: string[], cited: number[]): Record<number, string> =>
  Object.fromEntries(cited.filter((p) => pages[p - 1] !== undefined).map((p) => [p, pages[p - 1]!.trim().slice(0, 4000)]));

// ponytail: keyword overlap, misses synonyms; switch to embeddings (pgvector) if answers miss the right pages.
export function selectPages(pages: string[], question: string, maxTokens: number, top = 6): number[] {
  const all = pages.map((_, i) => i);
  if (estimateTokens(pages.join("\n\n")) <= maxTokens) return all;

  const terms = new Set(words(question));
  const pageWords = pages.map((p) => words(p));
  const docFreq = new Map<string, number>();
  for (const ws of pageWords) for (const w of new Set(ws)) if (terms.has(w)) docFreq.set(w, (docFreq.get(w) ?? 0) + 1);

  const scores = pageWords.map((ws) => {
    let score = 0;
    for (const w of ws) if (terms.has(w)) score += Math.log(1 + pages.length / docFreq.get(w)!) / Math.sqrt(ws.length || 1);
    return score;
  });
  const best = all.filter((i) => scores[i]! > 0).sort((a, b) => scores[b]! - scores[a]!).slice(0, top);
  const picked = new Set<number>();
  for (const i of best.length ? best : all.slice(0, top)) for (const j of [i, i + 1, i - 1]) if (pages[j] !== undefined) picked.add(j);

  const chosen: number[] = [];
  let used = 0;
  for (const i of [...best, ...[...picked].filter((i) => !best.includes(i))]) {
    const cost = estimateTokens(pages[i]!);
    if (used + cost > maxTokens && chosen.length) continue;
    chosen.push(i);
    used += cost;
  }
  return chosen.sort((a, b) => a - b);
}
