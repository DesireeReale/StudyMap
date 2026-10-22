import { describe, expect, it } from "vitest";
import { applyFixes, clearMarkers, segments, uncertainCount } from "./review";

describe("review markers", () => {
  const text = "La [?terna] RGB e [illeggibile] bit.";

  it("splits text, guesses and unreadable words", () => {
    expect(segments(text)).toEqual([
      { kind: "text", text: "La " },
      { kind: "guess", text: "terna" },
      { kind: "text", text: " RGB e " },
      { kind: "unreadable" },
      { kind: "text", text: " bit." },
    ]);
    expect(uncertainCount(text)).toBe(2);
    expect(uncertainCount("[Figura: schema]")).toBe(0);
  });

  it("applies the student's fixes and keeps guesses left empty", () => {
    expect(applyFixes(text, ["terna", "24"])).toBe("La terna RGB e 24 bit.");
    expect(applyFixes(text, ["", ""])).toBe("La terna RGB e [illeggibile] bit.");
    expect(clearMarkers("[?Quadrato] MxN")).toBe("Quadrato MxN");
  });
});
