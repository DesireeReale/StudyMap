"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { APP_STYLES, FONTS, SPACINGS, STYLE_COOKIE, TEXT_SIZES, type AppStyle } from "@/config/styles";
import { parsePreferences, type Preferences } from "@/core/preferences";
import { NODE_ROLES } from "@/core/roles";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function applyPreferences(prefs: Preferences) {
  document.cookie = `${STYLE_COOKIE}=${encodeURIComponent(JSON.stringify(prefs))}; path=/; max-age=31536000; samesite=lax`;
  Object.assign(document.documentElement.dataset, prefs);
}

let saving = Promise.resolve();

function savePreferences(prefs: Preferences) {
  saving = saving.then(async () => {
    const supabase = supabaseBrowser();
    const { data } = await supabase.auth.getSession();
    if (data.session) await supabase.from("profiles").update({ preferences: prefs }).eq("id", data.session.user.id);
  });
  return saving;
}

function usePreferences(initial: Preferences) {
  const router = useRouter();
  const [current, setCurrent] = useOptimistic(initial);
  const [, startTransition] = useTransition();
  function choose(change: Partial<Preferences>) {
    const next = { ...parsePreferences({ ...document.documentElement.dataset }), ...change };
    applyPreferences(next);
    startTransition(async () => {
      setCurrent(next);
      await savePreferences(next);
      router.refresh();
    });
  }
  return [current, choose] as const;
}

export function StyleToggle({ initial }: { initial: Preferences }) {
  const [prefs, choose] = usePreferences(initial);
  const current: AppStyle = prefs.style;
  return (
    <div role="radiogroup" aria-label="Stile grafico" className="grid grid-cols-2 gap-1 rounded-full bg-active p-1">
      {APP_STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={current === s.id}
          onClick={() => choose({ style: s.id })}
          className={`min-h-9 cursor-pointer rounded-full px-2 text-[13px] transition-colors duration-150 ${
            current === s.id ? "bg-sheet font-bold text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}

export function WorkspacePicker({ initial }: { initial: Preferences }) {
  const [prefs, choose] = usePreferences(initial);
  const current: AppStyle = prefs.style;
  return (
    <div className="flex flex-col gap-8">
    <div role="radiogroup" aria-label="Stile grafico" className="grid gap-3 sm:grid-cols-2">
      {APP_STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={current === s.id}
          onClick={() => choose({ style: s.id })}
          data-style={s.id}
          className={`flex cursor-pointer flex-col gap-4 rounded-row border-2 bg-sheet p-4 text-left text-ink transition-colors duration-150 ${
            current === s.id ? "border-accent" : "border-border hover:border-control"
          }`}
        >
          <span className="flex items-center gap-2" aria-hidden="true">
            {NODE_ROLES.map((r) => (
              <span
                key={r}
                data-role={r}
                className="concept-node h-6 w-10"
                style={{ "--node-bg": `var(--node-${r})`, "--node-ink": `var(--node-${r}-ink)` } as React.CSSProperties}
              />
            ))}
          </span>
          <span>
            <span className="block font-display text-[20px] font-bold">{s.name}</span>
            <span className="mt-1 block text-sm text-muted">{s.description}</span>
          </span>
          <span className={`text-sm font-bold ${current === s.id ? "text-accent" : "text-muted"}`}>
            {current === s.id ? "In uso" : "Usa questo stile"}
          </span>
        </button>
      ))}
    </div>
      <Choice label="Carattere" options={FONTS} value={prefs.font} onChange={(font) => choose({ font })} />
      <Choice label="Dimensione del testo" options={TEXT_SIZES} value={prefs.size} onChange={(size) => choose({ size })} />
      <Choice label="Spaziatura del testo" options={SPACINGS} value={prefs.spacing} onChange={(spacing) => choose({ spacing })} />
      <p className="reading max-w-[60ch] rounded-row border border-border bg-raised p-4">
        Anteprima: così appaiono appunti, documenti e flashcard. Il giudice applica la legge; la derivata misura come
        cambia una funzione.
      </p>
    </div>
  );
}

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; name: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="label mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.id}
            className={`flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-[15px] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${
              value === o.id ? "border-accent bg-accent-soft font-bold text-ink" : "border-border text-muted hover:text-ink"
            }`}
          >
            <input
              type="radio"
              name={label}
              value={o.id}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
              className="sr-only"
            />
            {o.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PreferencesSync({ prefs }: { prefs: Preferences }) {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    applyPreferences(prefs);
    router.refresh();
  }, [prefs, router]);
  return null;
}
