import { cookies } from "next/headers";
import { STYLE_COOKIE, type AppStyle } from "@/config/styles";
import { hasSavedPreferences, parsePreferences, type Preferences } from "@/core/preferences";

export async function getPreferences(): Promise<Preferences> {
  const value = (await cookies()).get(STYLE_COOKIE)?.value;
  return parsePreferences(value ? decodeURIComponent(value) : undefined);
}

export async function getAppStyle(): Promise<AppStyle> {
  return (await getPreferences()).style;
}

export async function getWorkspace(saved: unknown) {
  const local = await getPreferences();
  if (!hasSavedPreferences(saved)) return { prefs: local, stale: false };
  const prefs = parsePreferences(saved);
  return { prefs, stale: JSON.stringify(prefs) !== JSON.stringify(local) };
}
