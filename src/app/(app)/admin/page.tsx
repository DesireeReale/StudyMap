import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PLAN_LABELS, PLANS } from "@/config/plans";
import { daysUntil, shortDate, todayIso } from "@/core/dates";
import { monthPeriod } from "@/core/entitlements";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Amministrazione" };

const PAGE_SIZE = 50;

const FILTERS = [
  { id: "all", label: "Tutti" },
  { id: "free", label: "Free" },
  { id: "pro", label: "Pro" },
  { id: "expiring", label: "In scadenza (7 giorni)" },
  { id: "expired", label: "Scaduti di recente" },
] as const;

const COLUMNS = [
  { id: "email", label: "Email" },
  { id: "created_at", label: "Registrato" },
  { id: "plan", label: "Piano" },
  { id: "ends_at", label: "Scadenza" },
  { id: null, label: "Ultimo sblocco" },
  { id: "generations", label: "Generazioni" },
  { id: "documents", label: "Documenti" },
  { id: "cost", label: "Costo AI" },
  { id: "last_active", label: "Ultima attività" },
] as const;

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

const usd = (n: number) => `${Number(n).toFixed(2)} $`;

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const { supabase } = await requireAdmin();
  const query = await searchParams;
  const param = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const state = {
    q: param("q").trim(),
    filter: FILTERS.some((f) => f.id === param("filter")) ? param("filter") : "all",
    sort: param("sort") || "created_at",
    dir: param("dir") === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(param("page")) || 1),
  };
  const href = (changes: Partial<typeof state>) => {
    const next = { ...state, ...changes };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v && !(k === "page" && v === 1)) params.set(k, String(v));
    return `/admin?${params}`;
  };

  const today = todayIso();
  const { data, error } = await supabase.rpc("admin_users_page", {
    p_today: today,
    p_month: monthPeriod(),
    p_filter: state.filter,
    p_email: state.q,
    p_sort: state.sort,
    p_desc: state.dir === "desc",
    p_limit: PAGE_SIZE,
    p_offset: (state.page - 1) * PAGE_SIZE,
  });
  if (error || !data) throw new Error(error?.message ?? "admin_users_page failed");
  const pages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));

  const stats: [string, string][] = [
    ["Utenti", String(data.total_users)],
    ["Pro attivi", String(data.pro_users)],
    ["In scadenza entro 7 giorni", String(data.expiring)],
    ["Costo AI del mese", usd(data.cost_month)],
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[24px] leading-tight font-bold">Amministrazione</h1>

      <dl className="num grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="panel flex flex-col gap-1 p-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-[22px] font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <nav aria-label="Filtri" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={href({ filter: f.id, page: 1 })}
              aria-current={state.filter === f.id ? "page" : undefined}
              className={state.filter === f.id ? "btn-primary" : "btn-secondary"}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form className="flex items-end gap-2">
          <input type="hidden" name="filter" value={state.filter} />
          <label className="flex flex-col gap-1.5">
            <span className="label">Cerca per email</span>
            <input name="q" type="search" defaultValue={state.q} className="field" />
          </label>
          <button type="submit" className="btn-secondary">
            Cerca
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="num w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="text-muted">
              {COLUMNS.map((c) => (
                <th key={c.label} scope="col" className="pb-2 pr-3 font-normal">
                  {c.id ? (
                    <Link
                      href={href({ sort: c.id, dir: state.sort === c.id && state.dir === "desc" ? "asc" : "desc", page: 1 })}
                      className={state.sort === c.id ? "font-bold text-ink" : "hover:text-ink"}
                    >
                      {c.label}
                      {state.sort === c.id ? (state.dir === "desc" ? " ↓" : " ↑") : ""}
                    </Link>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              <th scope="col" className="pb-2 font-normal">
                <span className="sr-only">Azioni</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr className="border-t border-rule">
                <td colSpan={COLUMNS.length + 1} className="py-4 text-muted">
                  Nessun utente.
                </td>
              </tr>
            )}
            {data.rows.map((u) => (
              <tr key={u.id} className="border-t border-rule align-top">
                <th scope="row" className="max-w-[220px] truncate py-2.5 pr-3 font-normal" title={u.email}>
                  {u.email}
                </th>
                <td className="py-2.5 pr-3">{shortDate(u.created_at)}</td>
                <td className="py-2.5 pr-3 font-bold">{PLAN_LABELS[u.plan]}</td>
                <td className="py-2.5 pr-3">
                  {u.plan === "free" ? "—" : u.ends_at ? `${shortDate(u.ends_at)} (${daysUntil(u.ends_at)} gg)` : "nessuna"}
                </td>
                <td className="max-w-[180px] truncate py-2.5 pr-3" title={u.last_note ?? undefined}>
                  {u.last_note ?? "—"}
                </td>
                <td className="py-2.5 pr-3">
                  {u.generations} / {PLANS[u.plan].generationsPerMonth}
                </td>
                <td className="py-2.5 pr-3">{u.documents}</td>
                <td className="py-2.5 pr-3">{usd(u.cost_usd)}</td>
                <td className="py-2.5 pr-3">{u.last_active ? shortDate(u.last_active) : "—"}</td>
                <td className="py-2.5">
                  <div className="flex flex-wrap items-start gap-2">
                    <details>
                      <summary className="btn-secondary cursor-pointer list-none">Sblocca Pro</summary>
                      <form action={grantPro} className="mt-2 flex w-64 flex-col gap-2">
                        <input type="hidden" name="user_id" value={u.id} />
                        <label className="flex flex-col gap-1">
                          <span className="label">Scadenza (facoltativa)</span>
                          <input name="ends_at" type="date" min={today} className="field" />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="label">Nota</span>
                          <input name="note" maxLength={200} className="field" placeholder="pagato 25/10 con PayPal" />
                        </label>
                        <button type="submit" className="btn-primary">
                          Conferma
                        </button>
                      </form>
                    </details>
                    {u.active_id && (
                      <form action={revoke}>
                        <input type="hidden" name="id" value={u.active_id} />
                        <button type="submit" className="btn-danger">
                          Revoca
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pagine" className="num flex items-center gap-3 text-sm">
          {state.page > 1 && (
            <Link href={href({ page: state.page - 1 })} className="btn-secondary">
              Precedente
            </Link>
          )}
          <span>
            Pagina {state.page} di {pages}
          </span>
          {state.page < pages && (
            <Link href={href({ page: state.page + 1 })} className="btn-secondary">
              Successiva
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
