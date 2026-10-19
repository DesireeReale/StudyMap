import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

const root = path.resolve(import.meta.dirname, "..");

function readEnv(file: string): Record<string, string> {
  const full = path.join(root, file);
  return existsSync(full) ? (parseEnv(readFileSync(full, "utf8")) as Record<string, string>) : {};
}

export function loadTestEnv(): Record<string, string> {
  const env = readEnv(".env.test");
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!env[key]) throw new Error(`.env.test is missing ${key}: create it from .env.test.example`);
  }
  const devUrl = readEnv(".env.local").NEXT_PUBLIC_SUPABASE_URL;
  if (devUrl && devUrl === env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(".env.test points to the development project: use a separate Supabase test project");
  }
  return { ...env, AI_MOCK: "1" };
}
