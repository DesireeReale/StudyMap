import { describe, expect, it } from "vitest";
import { MODELS } from "@/config/ai";
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
  const keys = (plan: "free" | "pro", consent: boolean, vision = false) =>
    modelChain(plan, { consent, vision }).map((m) => m.key);

  it("excludes models that train on data without consent", () => {
    expect(keys("free", false)).toEqual([]);
  });

  it("includes them with consent", () => {
    expect(keys("free", true)).toEqual([
      "gemini-flash",
      "gemini-flash-lite",
      "nemotron-vl-free",
      "gemma-4-free",
      "openrouter-free",
    ]);
    expect(keys("pro", true).slice(-3)).toEqual(["nemotron-vl-free", "gemma-4-free", "openrouter-free"]);
  });

  it("filters vision-capable models", () => {
    expect(keys("free", true, true)).toEqual(["gemini-flash", "gemini-flash-lite", "nemotron-vl-free", "gemma-4-free"]);
  });

  it("skips disabled models and models without an API key", () => {
    expect(MODELS.find((m) => m.key === "muse-spark")?.enabled).toBe(false);
    expect(modelChain("pro", { consent: true, hasKey: (m) => m.provider !== "gemini" }).map((m) => m.key)).toEqual([
      "nemotron-vl-free",
      "gemma-4-free",
      "openrouter-free",
    ]);
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
