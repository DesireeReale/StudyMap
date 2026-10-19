"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { APP_STYLES, STYLE_COOKIE, type AppStyle } from "@/config/styles";
import { NODE_ROLES } from "@/core/roles";

function useAppStyle(initial: AppStyle) {
  const router = useRouter();
  const [current, setCurrent] = useOptimistic(initial);
  const [, startTransition] = useTransition();
  function choose(style: AppStyle) {
    document.cookie = `${STYLE_COOKIE}=${style}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.style = style;
    startTransition(() => {
      setCurrent(style);
      router.refresh();
    });
  }
  return [current, choose] as const;
}

export function StyleToggle({ initial }: { initial: AppStyle }) {
  const [current, choose] = useAppStyle(initial);
  return (
    <div role="radiogroup" aria-label="Stile grafico" className="grid grid-cols-2 gap-1 rounded-full bg-active p-1">
      {APP_STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={current === s.id}
          onClick={() => choose(s.id)}
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

export function StylePicker({ initial }: { initial: AppStyle }) {
  const [current, choose] = useAppStyle(initial);
  return (
    <div role="radiogroup" aria-label="Stile grafico" className="grid gap-3 sm:grid-cols-2">
      {APP_STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={current === s.id}
          onClick={() => choose(s.id)}
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
  );
}
