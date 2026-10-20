import { describe, expect, it } from "vitest";
import { dayPeriod, FeedbackBody } from "./feedback";

describe("FeedbackBody", () => {
  it("accepts a valid request and trims the text", () => {
    const r = FeedbackBody.parse({ kind: "idea", message: "  Vorrei le mappe in PDF  ", page: "" });
    expect(r).toEqual({ kind: "idea", message: "Vorrei le mappe in PDF", page: null });
  });

  it("rejects unknown kinds and messages outside 10-2000 characters", () => {
    expect(FeedbackBody.safeParse({ kind: "spam", message: "Messaggio valido" }).success).toBe(false);
    expect(FeedbackBody.safeParse({ kind: "idea", message: "   corto   " }).success).toBe(false);
    expect(FeedbackBody.safeParse({ kind: "altro", message: "x".repeat(2001) }).success).toBe(false);
    expect(FeedbackBody.safeParse({ kind: "altro", message: "x".repeat(2000) }).success).toBe(true);
  });

  it("uses one counter per UTC day", () => {
    expect(dayPeriod(new Date("2026-10-20T23:59:00Z"))).toBe("2026-10-20");
  });
});
