import { NextResponse } from "next/server";
import { z } from "zod";
import { canCreateSubject } from "@/core/entitlements";
import { folderError } from "@/core/folders";
import { apiUser, denied, fail } from "@/lib/api";

const Body = z.object({ name: z.string().trim().min(1).max(80), parentId: z.uuid().nullable().default(null) });

export async function POST(request: Request) {
  const auth = await apiUser();
  if (!auth) return fail("Non autenticato", 401);
  const { supabase, profile } = auth;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Scrivi un nome tra 1 e 80 caratteri.", 400);
  const { name, parentId } = parsed.data;

  const siblings = supabase.from("folders").select("id", { count: "exact", head: true });
  const { count } = await (parentId ? siblings.eq("parent_id", parentId) : siblings.is("parent_id", null));
  if (!parentId) {
    const decision = canCreateSubject(profile.plan, count ?? 0);
    if (!decision.ok) return denied(decision);
  }

  const { data, error } = await supabase
    .from("folders")
    .insert({ name, parent_id: parentId, position: count ?? 0 })
    .select("id")
    .single();
  if (error) return fail(folderError(error), 400);
  return NextResponse.json({ id: data.id });
}
