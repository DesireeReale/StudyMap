import "server-only";
import type { Feedback } from "@/core/feedback";

export async function notifyNewRequest(request: Feedback, userEmail: string | undefined): Promise<void> {
  const to = process.env.FEEDBACK_EMAIL_TO;
  const key = process.env.RESEND_API_KEY;
  if (!to || !key) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.FEEDBACK_EMAIL_FROM || "StudyMap <onboarding@resend.dev>",
        to: [to],
        subject: `StudyMap: nuova richiesta (${request.kind})`,
        text: [request.message, "", `Pagina: ${request.page ?? "-"}`, `Utente: ${userEmail ?? "-"}`].join("\n"),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`notifyNewRequest failed: ${res.status}`);
  } catch (e) {
    console.error("notifyNewRequest failed", e);
  }
}
