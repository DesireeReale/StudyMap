"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "./icons";
import { LoginMascot, type MascotPose } from "./LoginMascot";

let ruler: CanvasRenderingContext2D | null = null;

function textRatio(input: HTMLInputElement) {
  ruler ??= document.createElement("canvas").getContext("2d");
  if (!ruler) return 0;
  const style = getComputedStyle(input);
  ruler.font = style.font;
  const room = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  return Math.min(ruler.measureText(input.value).width / room, 1);
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pose, setPose] = useState<MascotPose>("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [look, setLook] = useState(0);

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
    <div className="flex flex-col">
      <LoginMascot pose={pose === "password" && showPassword ? "peek" : pose} look={look} />
      <div className="panel relative flex flex-col gap-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="login-email" className="label">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="field h-11"
              onFocus={(e) => {
                setPose("email");
                setLook(textRatio(e.currentTarget));
              }}
              onBlur={() => setPose("idle")}
              onChange={(e) => setLook(textRatio(e.currentTarget))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="login-password" className="label">
              Password
            </label>
            <div className="relative" onFocus={() => setPose("password")} onBlur={() => setPose("idle")}>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="field h-11 w-full pr-11"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-muted hover:text-ink"
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                aria-pressed={showPassword}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword(!showPassword)}
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} />
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-negative">
              {error}
            </p>
          )}
          {info && <p role="status" className="text-sm">{info}</p>}
          <button type="submit" className="btn-primary h-11" disabled={busy}>
            {mode === "signin" ? "Accedi" : "Crea account"}
          </button>
        </form>
        <button type="button" className="btn-secondary h-11" onClick={google}>
          Continua con Google
        </button>
        <button
          type="button"
          className="cursor-pointer text-sm font-bold text-accent hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
        </button>
      </div>
    </div>
  );
}
