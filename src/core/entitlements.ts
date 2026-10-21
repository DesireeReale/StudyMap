import { CHAINS, MODELS, type ModelConfig } from "@/config/ai";
import { PLANS, type PlanId } from "@/config/plans";

export type Denied = { ok: false; reason: string; upgrade: boolean };
export type Decision = { ok: true } | Denied;

const allow: Decision = { ok: true };

export function modelChain(
  plan: PlanId,
  opts: { consent: boolean; vision?: boolean; hasKey?: (m: ModelConfig) => boolean; now?: number; chains?: typeof CHAINS },
): ModelConfig[] {
  const now = opts.now ?? Date.now();
  return (opts.chains ?? CHAINS)[plan][opts.vision ? "vision" : "text"]
    .map((key) => MODELS.find((m) => m.key === key))
    .filter((m): m is ModelConfig => !!m)
    .filter((m) => m.enabled)
    .filter((m) => !m.expiresAt || now < Date.parse(m.expiresAt))
    .filter((m) => opts.consent || !m.usesDataForTraining)
    .filter((m) => !opts.vision || m.vision)
    .filter((m) => !opts.hasKey || opts.hasKey(m));
}

export function quotaLimit(limit: number): number | null {
  return Number.isFinite(limit) ? limit : null;
}

export function canSaveDocument(plan: PlanId, currentCount: number): Decision {
  const max = PLANS[plan].maxDocuments;
  if (currentCount < max) return allow;
  return {
    ok: false,
    reason: `Hai raggiunto il limite di ${max} documenti salvati del piano ${plan}. Elimina un documento o passa a Pro.`,
    upgrade: plan === "free",
  };
}

export function canCreateSubject(plan: PlanId, currentCount: number): Decision {
  const max = PLANS[plan].maxSubjects;
  if (currentCount < max) return allow;
  return {
    ok: false,
    reason: `Il piano ${plan} consente al massimo ${max} materie. Puoi creare sottocartelle dentro quelle che hai o passare a Pro.`,
    upgrade: plan === "free",
  };
}

export function checkPdfPages(plan: PlanId, pages: number): Decision {
  const max = PLANS[plan].maxPdfPages;
  if (pages <= max) return allow;
  return {
    ok: false,
    reason: `Il file ha ${pages} pagine o slide: il piano ${plan} ne consente al massimo ${max}.`,
    upgrade: plan === "free",
  };
}

export function checkUploadSize(plan: PlanId, bytes: number): Decision {
  const max = PLANS[plan].maxUploadBytes;
  if (bytes <= max) return allow;
  return {
    ok: false,
    reason: `Il file supera la dimensione massima di ${Math.round(max / 1024 / 1024)} MB.`,
    upgrade: plan === "free",
  };
}

export function generationLimitReached(plan: PlanId): Denied {
  return {
    ok: false,
    reason: `Hai usato tutte le ${PLANS[plan].generationsPerMonth} generazioni AI di questo mese. I contenuti già creati restano disponibili.`,
    upgrade: plan === "free",
  };
}

export function tokenLimitReached(plan: PlanId): Denied {
  return {
    ok: false,
    reason: "Hai raggiunto il tetto mensile di utilizzo AI. I contenuti già creati restano disponibili.",
    upgrade: plan === "free",
  };
}

export function quizLimitReached(plan: PlanId): Denied {
  const max = PLANS[plan].quizzesPerWeek;
  return {
    ok: false,
    reason: `Il piano ${plan} include ${max} ${max === 1 ? "quiz" : "quiz"} a settimana: il prossimo lo puoi creare lunedì. Mappe e flashcard restano disponibili.`,
    upgrade: plan === "free",
  };
}

export function chatLimitReached(plan: PlanId): Denied {
  return {
    ok: false,
    reason: `Hai usato le ${PLANS[plan].chatQuestionsPerMonth} domande al documento del piano ${plan} per questo mese. Riassunti, flashcard e quiz restano disponibili.`,
    upgrade: plan === "free",
  };
}

export function weekPeriod(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function exportOptions(plan: PlanId) {
  return PLANS[plan].export;
}

export function monthPeriod(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function minutePeriod(d = new Date()): string {
  return d.toISOString().slice(0, 16);
}
