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
      paper: "stile",
      mapCase: "normale",
      timerStudy: 25,
      timerBreak: 5,
      timerLong: 15,
      timerSessions: 4,
    });
  });

  it("reads timer lengths from strings and clamps bad ones", () => {
    const p = parsePreferences({ timerStudy: "50", timerBreak: "0", timerSessions: 99 });
    expect([p.timerStudy, p.timerBreak, p.timerSessions]).toEqual([50, 5, 4]);
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
