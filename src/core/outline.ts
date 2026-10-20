export type Heading = { title: string; offset: number };

export function outline(body: string): Heading[] {
  return [...body.matchAll(/^#{1,3}[ \t]+(.+?)[ \t]*$/gm)].map((m) => ({ title: m[1]!, offset: m.index }));
}
