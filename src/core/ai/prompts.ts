import { readFile } from "node:fs/promises";
import path from "node:path";

const cache = new Map<string, string>();

export async function loadPrompt(
  name: string,
  version: string,
  vars: Record<string, string> = {},
): Promise<string> {
  const file = `${name}.${version}.md`;
  let template = cache.get(file);
  if (template === undefined) {
    template = await readFile(path.join(process.cwd(), "prompts", file), "utf8");
    cache.set(file, template);
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
