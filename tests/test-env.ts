import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

const root = process.cwd();

function readEnv(file: string): Record<string, string> {
  const full = path.join(root, file);
  return existsSync(full) ? (parseEnv(readFileSync(full, "utf8")) as Record<string, string>) : {};
}

export function loadTestEnv(): Record<string, string> {
  const env = readEnv(".env.test");
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!env[key]) throw new Error(`.env.test is missing ${key}: create it from .env.test.example`);
  }
  const prodUrl = readEnv(".env.production.local").NEXT_PUBLIC_SUPABASE_URL;
  if (prodUrl && prodUrl === env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(".env.test points to the production project: use the Supabase test project");
  }
  return { ...env, AI_MOCK: "1" };
}
