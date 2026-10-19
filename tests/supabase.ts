import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types";
import { loadTestEnv } from "./test-env";

const env = loadTestEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL!;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export const admin = createClient<Database>(url, env.SUPABASE_SERVICE_ROLE_KEY!, noSession);

export async function createTestUser(label: string) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return { id: data.user.id, email, password };
}

export async function signedInClient(email: string, password: string) {
  const client = createClient<Database>(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, noSession);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

export async function deleteTestUser(id: string) {
  const { data: files } = await admin.storage.from("documents").list(id);
  if (files?.length) await admin.storage.from("documents").remove(files.map((f) => `${id}/${f.name}`));
  await admin.auth.admin.deleteUser(id);
}
