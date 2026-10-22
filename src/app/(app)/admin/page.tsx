import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { PLAN_LABELS, PLANS } from "@/config/plans";
import { longDay, shortDate, todayIso } from "@/core/dates";
import { activeSubscription, monthPeriod } from "@/core/entitlements";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Amministrazione" };

async function requireAdmin() {
  const ctx = await requireUser();
  const { data } = await ctx.supabase.rpc("is_admin");
  if (!data) notFound();
  return ctx;
}

async function grantPro(form: FormData) {
  "use server";
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_grant_plan", {
    p_user: String(form.get("user_id")),
    p_plan: "pro",
    p_ends_at: String(form.get("ends_at") ?? "") || null,
    p_note: String(form.get("note") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

async function revoke(form: FormData) {
  "use server";
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_revoke_subscription", { p_id: String(form.get("id")) });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const { supabase } = await requireAdmin();
  const query = await searchParams;
  const email = typeof query.email === "string" ? query.email.trim() : "";
  const { data: student } = email
    ? await supabase.rpc("admin_user_overview", { p_email: email, p_month: monthPeriod() })
    : { data: null };
  const active = student ? activeSubscription(student.subscriptions, todayIso()) : null;
  const plan = active?.plan ?? "free";

  return (
    <div className="mx-auto flex max-w-[800px] flex-col gap-6">
      <h1 className="text-[24px] leading-tight font-bold">Amministrazione</h1>

      <form className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="label">Email dello studente</span>
          <input name="email" type="email" required defaultValue={email} className="field" />
        </label>
        <button type="submit" className="btn-primary">
          Cerca
        </button>
      </form>

      {email && !student && <p className="text-sm text-muted">Nessun utente con questa email.</p>}

      {student && (
        <section aria-label="Studente" className="panel flex flex-col gap-5 p-5">
          <dl className="num grid grid-cols-2 gap-3 text-sm">
            <dt className="text-muted">Email</dt>
            <dd>{student.email}</dd>
            <dt className="text-muted">Piano attivo</dt>
            <dd className="font-bold">{PLAN_LABELS[plan]}</dd>
            <dt className="text-muted">Scadenza</dt>
            <dd>{active ? (active.ends_at ? longDay(active.ends_at) : "nessuna") : "—"}</dd>
            <dt className="text-muted">Generazioni questo mese</dt>
            <dd>
              {student.generations} di {PLANS[plan].generationsPerMonth}
            </dd>
            <dt className="text-muted">Costo AI questo mese</dt>
            <dd>{Number(student.cost_usd).toFixed(4)} $</dd>
          </dl>

          <form action={grantPro} className="flex flex-wrap items-end gap-3 border-t border-rule pt-4">
            <input type="hidden" name="user_id" value={student.id} />
            <label className="flex flex-col gap-1.5">
              <span className="label">Scadenza (facoltativa)</span>
              <input name="ends_at" type="date" min={todayIso()} className="field w-auto" />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="label">Nota</span>
              <input name="note" maxLength={200} className="field" placeholder="Per esempio: pagato 25/10 con PayPal" />
            </label>
            <button type="submit" className="btn-primary">
              Sblocca Pro
            </button>
          </form>

          <ul className="flex flex-col gap-2 border-t border-rule pt-4 text-sm">
            {student.subscriptions.length === 0 && <li className="text-muted">Nessun piano assegnato.</li>}
            {student.subscriptions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="num">
                  {PLAN_LABELS[s.plan]} dal {shortDate(s.starts_at)}
                  {s.ends_at ? ` al ${shortDate(s.ends_at)}` : ", senza scadenza"}
                  {s.note ? ` · ${s.note}` : ""} · creato il {shortDate(s.created_at)}
                  {s.revoked_at ? ` · revocato il ${shortDate(s.revoked_at)}` : ""}
                </span>
                {!s.revoked_at && (
                  <form action={revoke}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="btn-danger">
                      Revoca
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
