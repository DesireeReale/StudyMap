import "server-only";
import { PROVIDER_LIMITS, PROVIDERS, type ModelConfig, type ProviderId } from "@/config/ai";
import { PLANS, RATE_LIMITS } from "@/config/plans";
import { openaiChat, type AiContext, type Slot } from "@/core/ai/client";
import { mockChat } from "@/core/ai/mock";
import {
  minutePeriod,
  modelChain,
  monthPeriod,
  quotaLimit,
  tokenLimitReached,
  type Decision,
} from "@/core/entitlements";
import { BETA_SHARED_MODELS, BETA_TERMS_VERSION } from "@/config/beta";
import { dayPeriod } from "@/core/feedback";
import { supabaseAdmin } from "./supabase/server";
import type { Profile } from "./supabase/types";

export const aiMockEnabled = process.env.AI_MOCK === "1" && process.env.NODE_ENV !== "production";
const hasKey = (m: ModelConfig) => !!process.env[PROVIDERS[m.provider].apiKeyEnv];
const mockDelayMs = Number(process.env.AI_MOCK_DELAY_MS ?? 0);
const slowMockChat: typeof mockChat = async (req) => {
  if (mockDelayMs > 0) await new Promise((r) => setTimeout(r, mockDelayMs));
  return mockChat(req);
};

const mockProviderLimit = Number(process.env.AI_MOCK_PROVIDER_LIMIT ?? 0);

async function takeSlot(provider: ProviderId): Promise<Slot> {
  const limits = aiMockEnabled ? { perMinute: mockProviderLimit, perDay: null } : PROVIDER_LIMITS[provider];
  const { data, error } = await supabaseAdmin().rpc("take_provider_slot", {
    p_provider: aiMockEnabled ? `mock:${provider}` : provider,
    p_minute: `m:${minutePeriod()}`,
    p_minute_limit: limits.perMinute,
    p_day: `d:${dayPeriod()}`,
    p_day_limit: limits.perDay,
  });
  if (error) {
    console.error("take_provider_slot failed", error.message);
    return "ok";
  }
  return data as Slot;
}

export const acceptedBetaTerms = (profile: Profile) => profile.beta_terms_version === BETA_TERMS_VERSION;

const sharedModelsAllowed = (profile: Profile) =>
  BETA_SHARED_MODELS ? acceptedBetaTerms(profile) : !!profile.ai_data_sharing_consent_at;

export function aiContextFor(profile: Profile): AiContext {
  const admin = supabaseAdmin();
  const consent = aiMockEnabled || sharedModelsAllowed(profile);
  const keyFilter = aiMockEnabled ? undefined : hasKey;
  return {
    chain: modelChain(profile.plan, { consent, hasKey: keyFilter }),
    visionChain: modelChain(profile.plan, { consent, vision: true, hasKey: keyFilter }),
    chat: aiMockEnabled ? slowMockChat : openaiChat,
    takeSlot: !aiMockEnabled || mockProviderLimit > 0 ? takeSlot : undefined,
    record: async (u) => {
      const { error } = await admin.from("ai_usage").insert({
        user_id: profile.id,
        task: u.task,
        provider: aiMockEnabled ? "mock" : u.provider,
        model: u.model,
        prompt_version: u.promptVersion,
        input_tokens: u.inputTokens,
        output_tokens: u.outputTokens,
        ocr_pages: u.ocrPages,
        cost_usd: u.costUsd,
        ok: u.ok,
        error: u.error,
        duration_ms: u.durationMs,
        queue_wait_ms: u.queueWaitMs,
        outcome: u.outcome,
      });
      if (error) console.error("ai_usage insert failed", error.message);
      if (u.inputTokens > 0) await consumeQuota(profile.id, "input_tokens", monthPeriod(), u.inputTokens, null);
    },
  };
}

export async function consumeQuota(
  userId: string,
  kind: string,
  period: string,
  amount: number,
  limit: number | null,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("consume_quota", {
    p_user: userId,
    p_kind: kind,
    p_period: period,
    p_amount: amount,
    p_limit: limit,
  });
  if (error) throw new Error(`consume_quota failed: ${error.message}`);
  return data === true;
}

export async function guardAi(profile: Profile): Promise<Decision> {
  const withinRate = await consumeQuota(
    profile.id,
    "rl:ai",
    minutePeriod(),
    1,
    RATE_LIMITS.aiRequestsPerMinute,
  );
  if (!withinRate) {
    return { ok: false, reason: "Troppe richieste in poco tempo. Riprova tra un minuto.", upgrade: false };
  }
  const { data } = await supabaseAdmin()
    .from("quota_counters")
    .select("count")
    .eq("user_id", profile.id)
    .eq("period", monthPeriod())
    .eq("kind", "input_tokens")
    .maybeSingle();
  const limit = quotaLimit(PLANS[profile.plan].inputTokensPerMonth);
  if (limit !== null && (data?.count ?? 0) >= limit) return tokenLimitReached(profile.plan);
  return { ok: true };
}
