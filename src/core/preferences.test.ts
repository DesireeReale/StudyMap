import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, hasSavedPreferences, parsePreferences } from "./preferences";

describe("preferences", () => {
  it("reads the old style-only cookie", () => {
    expect(parsePreferences("evidenziatore")).toEqual({ ...DEFAULT_PREFERENCES, style: "evidenziatore" });
  });

  it("keeps valid values and replaces invalid ones", () => {
    expect(parsePreferences(JSON.stringify({ style: "corsia", font: "atkinson", size: "enorme", spacing: "ampia" }))).toEqual({
      style: "corsia",
      font: "atkinson",
      size: "normale",
      spacing: "ampia",
    });
  });

  it("falls back to defaults on junk", () => {
    expect(parsePreferences("{not json")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(42)).toEqual(DEFAULT_PREFERENCES);
  });

  it("treats an empty profile value as not saved", () => {
    expect(hasSavedPreferences({})).toBe(false);
    expect(hasSavedPreferences({ font: "lexend" })).toBe(true);
  });
});
