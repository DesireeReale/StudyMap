import { describe, expect, it } from "vitest";
import { isDue, schedule } from "./srs";

const now = new Date("2026-10-20T10:00:00Z");
const fresh = { ease: 2.5, interval_days: 0, repetitions: 0 };
const days = (iso: string) => Math.round((new Date(iso).getTime() - now.getTime()) / 86_400_000);

describe("schedule", () => {
  it("spaces correct answers at 1, 6 and then interval × ease days", () => {
    const first = schedule(fresh, "known", now);
    const second = schedule(first, "known", now);
    const third = schedule(second, "known", now);
    expect([days(first.due_at), days(second.due_at), days(third.due_at)]).toEqual([1, 6, 15]);
  });

  it("brings a forgotten card back in ten minutes and lowers its ease", () => {
    const s = schedule({ ease: 2.5, interval_days: 15, repetitions: 3 }, "unknown", now);
    expect(s).toMatchObject({ ease: 2.3, interval_days: 0, repetitions: 0 });
    expect(new Date(s.due_at).getTime() - now.getTime()).toBe(10 * 60 * 1000);
  });

  it("never lets ease drop below 1.3 or intervals grow past ten years", () => {
    expect(schedule({ ease: 1.3, interval_days: 0, repetitions: 0 }, "unknown", now).ease).toBe(1.3);
    expect(schedule({ ease: 3, interval_days: 3000, repetitions: 9 }, "known", now).interval_days).toBe(3650);
  });

  it("knows when a card is due", () => {
    expect(isDue({ due_at: "2026-10-20T09:59:00Z" }, now)).toBe(true);
    expect(isDue({ due_at: "2026-10-21T10:00:00Z" }, now)).toBe(false);
  });
});
