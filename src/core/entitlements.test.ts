import { describe, expect, it } from "vitest";
import { MODELS } from "@/config/ai";
import { PLANS } from "@/config/plans";
import {
  canSaveDocument,
  checkPdfPages,
  checkUploadSize,
  minutePeriod,
  modelChain,
  monthPeriod,
  quotaLimit,
} from "./entitlements";

describe("modelChain", () => {
  const keys = (plan: "free" | "pro", consent: boolean, vision = false) =>
    modelChain(plan, { consent, vision }).map((m) => m.key);

  it("excludes models that train on data without consent", () => {
    expect(keys("free", false)).toEqual([]);
  });

  it("includes them with consent", () => {
    expect(keys("free", true)).toEqual(["gemini-flash", "gemini-flash-lite", "openrouter-free"]);
  });

  it("filters vision-capable models", () => {
    expect(keys("free", true, true)).toEqual(["gemini-flash", "gemini-flash-lite"]);
  });

  it("skips disabled models and models without an API key", () => {
    expect(MODELS.find((m) => m.key === "muse-spark")?.enabled).toBe(false);
    expect(modelChain("pro", { consent: true, hasKey: (m) => m.provider !== "gemini" }).map((m) => m.key)).toEqual([
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
