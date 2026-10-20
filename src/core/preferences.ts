import { z } from "zod";
import { APP_STYLES, FONTS, SPACINGS, TEXT_SIZES } from "@/config/styles";

const ids = <T extends readonly { id: string }[]>(list: T) => list.map((x) => x.id) as [T[number]["id"], ...T[number]["id"][]];

const Preferences = z.object({
  style: z.enum(ids(APP_STYLES)).catch(APP_STYLES[0].id),
  font: z.enum(ids(FONTS)).catch("stile"),
  size: z.enum(ids(TEXT_SIZES)).catch("normale"),
  spacing: z.enum(ids(SPACINGS)).catch("normale"),
});

export type Preferences = z.infer<typeof Preferences>;

export const DEFAULT_PREFERENCES: Preferences = Preferences.parse({});

export function parsePreferences(value: unknown): Preferences {
  if (typeof value === "string") {
    if (APP_STYLES.some((s) => s.id === value)) return { ...DEFAULT_PREFERENCES, style: value as Preferences["style"] };
    try {
      value = JSON.parse(value);
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }
  return value && typeof value === "object" ? Preferences.parse(value) : DEFAULT_PREFERENCES;
}

export function hasSavedPreferences(value: unknown): boolean {
  return !!value && typeof value === "object" && Object.keys(value).length > 0;
}
