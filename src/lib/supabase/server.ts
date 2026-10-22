import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { activeSubscription } from "@/core/entitlements";
import { todayIso } from "@/core/dates";
import type { PlanId } from "@/config/plans";
import type { Database } from "./types";

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
          } catch {
            // Server Components cannot set cookies; the proxy refreshes the session.
          }
        },
      },
    },
  );
}

export function supabaseAdmin() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function loadProfile(supabase: SupabaseClient<Database>, userId: string) {
  const [{ data: profile }, { data: subs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("subscriptions").select("*").eq("user_id", userId).eq("product", "studymap"),
  ]);
  if (!profile) return null;
  const subscription = activeSubscription(subs ?? [], todayIso());
  const plan: PlanId = subscription?.plan ?? "free";
  return { profile: { ...profile, plan }, subscription };
}

export const getUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ? { id: data.claims.sub, email: data.claims.email } : null;
  return { supabase, user };
});

export const requireUser = cache(async () => {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const loaded = await loadProfile(supabase, user.id);
  if (!loaded) redirect("/login");
  return { supabase, user, ...loaded };
});
