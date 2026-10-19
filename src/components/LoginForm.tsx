"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = supabaseBrowser();
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${location.origin}/auth/callback` },
          });
    setBusy(false);
    if (error) return setError(mode === "signin" ? "Email o password non corrette." : error.message);
    if (!data.session) return setInfo("Controlla la tua email per confermare la registrazione.");
    router.push("/library");
    router.refresh();
  }

  async function google() {
    await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="card flex flex-col gap-5">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 font-bold">
          Email
          <input name="email" type="email" required autoComplete="email" className="field font-normal" />
        </label>
        <label className="flex flex-col gap-1 font-bold">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="field font-normal"
          />
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        {info && <p role="status">{info}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {mode === "signin" ? "Accedi" : "Crea account"}
        </button>
      </form>
      <button type="button" className="btn-secondary" onClick={google}>
        Continua con Google
      </button>
      <button
        type="button"
        className="text-brand underline"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
      </button>
    </div>
  );
}
