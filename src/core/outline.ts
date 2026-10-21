export type Heading = { title: string; offset: number };

export type Block = { kind: "heading" | "point" | "text"; text: string } | { kind: "pages"; text: string; pages: number[] };

export function blocks(body: string): Block[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const source = /^\[pagin[ae]\s+([\d,\s]+)\]$/i.exec(line);
      if (source) {
        const pages = source[1]!.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
        return { kind: "pages", text: line, pages };
      }
      const heading = /^#{1,3}\s+(.+)$/.exec(line);
      if (heading) return { kind: "heading", text: heading[1]! };
      const point = /^[-*•]\s+(.+)$/.exec(line);
      return point ? { kind: "point", text: point[1]! } : { kind: "text", text: line };
    });
}

export function summaryPages(body: string): number[] {
  return [...new Set(blocks(body).flatMap((b) => (b.kind === "pages" ? b.pages : [])))];
}

export function outline(body: string): Heading[] {
  return [...body.matchAll(/^#{1,3}[ \t]+(.+?)[ \t]*$/gm)].map((m) => ({ title: m[1]!, offset: m.index }));
}
