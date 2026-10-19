import { describe, expect, it } from "vitest";
import { daysUntil, greeting, longDate, nextMonthStart } from "./dates";

describe("dates", () => {
  it("greets by the hour in Rome, not UTC", () => {
    expect(greeting(new Date("2026-10-19T06:30:00Z"))).toBe("Buongiorno");
    expect(greeting(new Date("2026-10-19T12:30:00Z"))).toBe("Buon pomeriggio");
    expect(greeting(new Date("2026-10-19T17:30:00Z"))).toBe("Buonasera");
  });

  it("capitalises only the weekday", () => {
    expect(longDate(new Date("2026-10-19T10:00:00Z"))).toBe("Lunedì 19 ottobre");
  });

  it("names the first day of next month", () => {
    expect(nextMonthStart(new Date("2026-12-15T10:00:00Z"))).toBe("1 gennaio");
  });
});

describe("daysUntil", () => {
  it("counts calendar days in the Rome time zone", () => {
    expect(daysUntil("2026-10-20", new Date("2026-10-19T10:00:00Z"))).toBe(1);
    expect(daysUntil("2026-10-20", new Date("2026-10-19T22:30:00Z"))).toBe(0);
    expect(daysUntil("2026-10-19", new Date("2026-10-19T10:00:00Z"))).toBe(0);
    expect(daysUntil("2026-12-25", new Date("2026-10-19T10:00:00Z"))).toBe(67);
    expect(daysUntil("2026-10-10", new Date("2026-10-19T10:00:00Z"))).toBe(-9);
  });
});
