"use client";

import { useEffect, useState } from "react";

const SESSION_SECONDS = 25 * 60;

export function StudyTimer() {
  const [left, setLeft] = useState(SESSION_SECONDS);
  const [endAt, setEndAt] = useState<number | null>(null);

  useEffect(() => {
    if (endAt === null) return;
    const id = setInterval(() => {
      const next = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setLeft(next);
      if (next === 0) setEndAt(null);
    }, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  const running = endAt !== null;
  const done = left === 0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="flex items-end justify-between gap-2">
      <p className="num font-mono text-[26px] leading-none">
        {mm}:{ss}
      </p>
      <span role="status" className="sr-only">
        {done ? "Sessione di studio finita: fai una pausa." : ""}
      </span>
      <button
        type="button"
        onClick={() => {
          if (running) return setEndAt(null);
          const seconds = done ? SESSION_SECONDS : left;
          setLeft(seconds);
          setEndAt(Date.now() + seconds * 1000);
        }}
        className="min-h-9 cursor-pointer rounded-full bg-dock-ink px-3 text-[13px] font-bold text-[var(--tile)] transition-opacity duration-150 hover:opacity-90"
      >
        {done ? "Ricomincia" : running ? "Pausa" : left < SESSION_SECONDS ? "Riprendi" : "Avvia"}
      </button>
    </div>
  );
}
