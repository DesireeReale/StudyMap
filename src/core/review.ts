export type Segment = { kind: "text"; text: string } | { kind: "guess"; text: string } | { kind: "unreadable" };

const MARKER = /\[\?([^\[\]\n]{1,80})\]|\[illeggibile\]/gi;

export function segments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKER)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push(m[1] !== undefined ? { kind: "guess", text: m[1].trim() } : { kind: "unreadable" });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

export const uncertainCount = (text: string) => segments(text).filter((s) => s.kind !== "text").length;

export function applyFixes(text: string, fixes: string[]): string {
  let i = 0;
  return segments(text)
    .map((s) => {
      if (s.kind === "text") return s.text;
      const fix = fixes[i++]?.trim();
      if (fix) return fix;
      return s.kind === "guess" ? s.text : "[illeggibile]";
    })
    .join("");
}

export const clearMarkers = (text: string) => applyFixes(text, []);
