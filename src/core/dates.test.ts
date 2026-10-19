import { describe, expect, it } from "vitest";
import { greeting, longDate, nextMonthStart } from "./dates";

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
