import { describe, expect, it } from "vitest";
import { isStale, JOB_STALE_MS } from "./jobs";

describe("isStale", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("flags unfinished jobs that stopped updating", () => {
    expect(isStale({ status: "running", updated_at: ago(JOB_STALE_MS + 1) }, now)).toBe(true);
    expect(isStale({ status: "queued", updated_at: ago(JOB_STALE_MS + 1) }, now)).toBe(true);
    expect(isStale({ status: "running", updated_at: ago(60_000) }, now)).toBe(false);
  });

  it("never flags finished jobs", () => {
    expect(isStale({ status: "done", updated_at: ago(JOB_STALE_MS * 10) }, now)).toBe(false);
    expect(isStale({ status: "error", updated_at: ago(JOB_STALE_MS * 10) }, now)).toBe(false);
  });
});
