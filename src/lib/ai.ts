import "server-only";
import { PROVIDERS, type ModelConfig } from "@/config/ai";
import { PLANS, RATE_LIMITS } from "@/config/plans";
import { openaiChat, type AiContext } from "@/core/ai/client";
import { mockChat } from "@/core/ai/mock";
import {
  minutePeriod,
  modelChain,
  monthPeriod,
  quotaLimit,
  tokenLimitReached,
  type Decision,
} from "@/core/entitlements";
import { supabaseAdmin } from "./supabase/server";
import type { Profile } from "./supabase/types";

export const aiMockEnabled = process.env.AI_MOCK === "1" && process.env.NODE_ENV !== "production";
const hasKey = (m: ModelConfig) => !!process.env[PROVIDERS[m.provider].apiKeyEnv];

export function aiContextFor(profile: Profile): AiContext {
  const admin = supabaseAdmin();
  const consent = aiMockEnabled || !!profile.ai_data_sharing_consent_at;
  const keyFilter = aiMockEnabled ? undefined : hasKey;
  return {
    chain: modelChain(profile.plan, { consent, hasKey: keyFilter }),
    visionChain: modelChain(profile.plan, { consent, vision: true, hasKey: keyFilter }),
    chat: aiMockEnabled ? mockChat : openaiChat,
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
