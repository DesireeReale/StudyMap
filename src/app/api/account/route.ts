import { NextResponse } from "next/server";
import { apiUser, fail } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function DELETE() {
  const auth = await apiUser();
  if (!auth) return fail("Non autenticato", 401);
  const admin = supabaseAdmin();
  const folder = auth.user.id;

  for (;;) {
    const { data: files, error } = await admin.storage.from("documents").list(folder, { limit: 100 });
    if (error) return fail("Cancellazione dei file non riuscita", 500);
    if (!files.length) break;
    const { error: removeError } = await admin.storage
      .from("documents")
      .remove(files.map((f) => `${folder}/${f.name}`));
    if (removeError) return fail("Cancellazione dei file non riuscita", 500);
  }

  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) return fail("Cancellazione dell'account non riuscita", 500);
  await auth.supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
