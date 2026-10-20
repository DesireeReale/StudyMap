import { NextResponse } from "next/server";
import { dayPeriod, FEEDBACK_PER_DAY, FeedbackBody } from "@/core/feedback";
import { consumeQuota } from "@/lib/ai";
import { apiUser, fail } from "@/lib/api";
import { notifyNewRequest } from "@/lib/notify";

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth) return fail("Non autenticato", 401);
  const { supabase, user } = auth;

  const parsed = FeedbackBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Scegli il tipo e scrivi un messaggio tra 10 e 2000 caratteri.", 400);

  const period = dayPeriod();
  if (!(await consumeQuota(user.id, "feedback", period, 1, FEEDBACK_PER_DAY))) {
    return fail(`Puoi inviare al massimo ${FEEDBACK_PER_DAY} messaggi al giorno. Riprova domani.`, 429);
  }

  const { kind, message, page } = parsed.data;
  const { error } = await supabase.from("feature_requests").insert({ kind, message, page });
  if (error) {
    await consumeQuota(user.id, "feedback", period, -1, null);
    return fail("Non è stato possibile inviare il messaggio. Riprova.", 500);
  }

  await notifyNewRequest(parsed.data, user.email);
  return NextResponse.json({ ok: true });
}
