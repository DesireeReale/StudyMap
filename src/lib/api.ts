import "server-only";
import { NextResponse } from "next/server";
import type { Denied } from "@/core/entitlements";
import { supabaseServer } from "./supabase/server";

export function fail(error: string, status: number, upgrade = false) {
  return NextResponse.json({ error, upgrade }, { status });
}

export function denied(decision: Denied, status = 403) {
  return fail(decision.reason, status, decision.upgrade);
}

export async function apiUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return null;
  return { supabase, user, profile };
}
