import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NODE_ROLES } from "@/core/graph";

const css = readFileSync(path.join(import.meta.dirname, "globals.css"), "utf8");
const [light, dark] = css.split("@media (prefers-color-scheme: dark)");

function block(source: string, style: string): Record<string, string> {
  const body = source.split(`[data-style="${style}"] {`)[1]!.split("}")[0]!;
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1]!, m[2]!]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const PAIRS: [string, string][] = [
  ["text", "chrome"],
  ["text", "sheet"],
  ["text", "surface"],
  ["muted", "chrome"],
  ["muted", "sheet"],
  ["muted", "surface"],
  ["accent", "sheet"],
  ["accent", "chrome"],
  ["on-accent", "accent"],
  ["on-primary", "primary"],
  ["text", "accent-soft"],
  ["text", "secondary"],
  ...NODE_ROLES.map((r): [string, string] => [`node-${r}-ink`, `node-${r}`]),
  ["on-band", "band"],
  ["on-band-muted", "band"],
  ["on-band", "band-control"],
  ["band", "band-accent"],
  ...[1, 2, 3, 4].flatMap((i): [string, string][] => [
    ["dock-ink", `dock-tile-${i}`],
    ["dock-muted", `dock-tile-${i}`],
  ]),
];

describe.each(["corsia", "evidenziatore"])("%s tokens", (style) => {
  it.each([
    ["light", block(light!, style)],
    ["dark", { ...block(light!, style), ...block(dark!, style) }],
  ])("meet WCAG AA contrast in %s mode", (_, tokens) => {
    for (const [fg, bg] of PAIRS) {
      expect(tokens[fg], `--${fg}`).toBeDefined();
      expect(tokens[bg], `--${bg}`).toBeDefined();
      expect(contrast(tokens[fg]!, tokens[bg]!), `--${fg} on --${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
