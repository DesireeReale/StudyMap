import { describe, expect, it } from "vitest";
import { CHAINS, MODELS } from "@/config/ai";
import { PLANS } from "@/config/plans";
import {
  canCreateSubject,
  canSaveDocument,
  checkPdfPages,
  checkUploadSize,
  minutePeriod,
  modelChain,
  monthPeriod,
  quotaLimit,
  weekPeriod,
} from "./entitlements";

describe("modelChain", () => {
  const before = Date.parse("2026-10-21T12:00:00Z");
  const after = Date.parse("2026-10-22T00:00:01Z");
  const keys = (plan: "free" | "pro", opts: { consent?: boolean; vision?: boolean; now?: number } = {}) =>
    modelChain(plan, { consent: opts.consent ?? true, vision: opts.vision, now: opts.now ?? before }).map((m) => m.key);

  it("excludes models that train on data without consent", () => {
    expect(keys("free", { consent: false })).toEqual([]);
  });

  it("follows the configured text and vision chains", () => {
    const enabled = (list: string[]) => list.filter((k) => MODELS.find((m) => m.key === k)?.enabled);
    expect(keys("free")).toEqual(enabled(CHAINS.free.text));
    expect(keys("free", { vision: true })).toEqual(enabled(CHAINS.free.vision));
    expect(keys("free", { vision: true }).every((k) => MODELS.find((m) => m.key === k)?.vision)).toBe(true);
  });

  it("drops a model on its own once it expires", () => {
    expect(keys("free")[0]).toBe("minimax-flash-free");
    expect(keys("free", { now: after })).not.toContain("minimax-flash-free");
    expect(keys("free", { now: after, vision: true })).not.toContain("minimax-flash-free");
  });

  it("skips disabled models and models without an API key", () => {
    expect(MODELS.filter((m) => m.provider === "gemini").every((m) => !m.enabled)).toBe(true);
    expect(modelChain("pro", { consent: true, now: before, hasKey: (m) => m.provider === "openrouter" }).every((m) => m.provider === "openrouter")).toBe(true);
  });
});

describe("limits", () => {
  it("document limit blocks free users at the configured count", () => {
    expect(canSaveDocument("free", PLANS.free.maxDocuments - 1).ok).toBe(true);
    expect(canSaveDocument("free", PLANS.free.maxDocuments)).toMatchObject({ ok: false, upgrade: true });
    expect(canSaveDocument("pro", 10_000).ok).toBe(true);
  });

  it("pdf pages and upload size", () => {
    expect(checkPdfPages("free", PLANS.free.maxPdfPages).ok).toBe(true);
    expect(checkPdfPages("free", PLANS.free.maxPdfPages + 1).ok).toBe(false);
    expect(checkPdfPages("pro", PLANS.free.maxPdfPages + 1).ok).toBe(true);
    expect(checkUploadSize("free", PLANS.free.maxUploadBytes + 1).ok).toBe(false);
  });

  it("maps infinite limits to null for the database", () => {
    expect(quotaLimit(Infinity)).toBeNull();
    expect(quotaLimit(5)).toBe(5);
  });

  it("periods", () => {
    const d = new Date("2026-10-19T13:45:12Z");
    expect(monthPeriod(d)).toBe("2026-10");
    expect(minutePeriod(d)).toBe("2026-10-19T13:45");
  });
});

describe("canCreateSubject", () => {
  it("stops the free plan at its subject limit", () => {
    expect(canCreateSubject("free", PLANS.free.maxSubjects - 1).ok).toBe(true);
    expect(canCreateSubject("free", PLANS.free.maxSubjects)).toMatchObject({ ok: false, upgrade: true });
  });

  it("never stops pro", () => {
    expect(canCreateSubject("pro", 500).ok).toBe(true);
  });
});

describe("weekPeriod", () => {
  it("uses ISO weeks, which can belong to the previous year", () => {
    expect(weekPeriod(new Date("2026-01-01T12:00:00Z"))).toBe("2026-W01");
    expect(weekPeriod(new Date("2026-10-20T12:00:00Z"))).toBe("2026-W43");
    expect(weekPeriod(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
  });
});
