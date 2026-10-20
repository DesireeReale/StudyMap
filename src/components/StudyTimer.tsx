"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { parsePreferences, type Preferences } from "@/core/preferences";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "./icons";
import { applyPreferences, savePreferences } from "./StyleSwitch";

type Mode = "studio" | "pausa" | "pausa-lunga";
type Settings = Pick<Preferences, "timerStudy" | "timerBreak" | "timerLong" | "timerSessions">;
type State = { mode: Mode; session: number; left: number; endAt: number | null };

const KEY = "studymap-timer";
const MODE_LABEL: Record<Mode, string> = { studio: "Studio", pausa: "Pausa", "pausa-lunga": "Pausa lunga" };
const PRESETS = [
  { name: "25 + 5", timerStudy: 25, timerBreak: 5 },
  { name: "50 + 10", timerStudy: 50, timerBreak: 10 },
  { name: "90 + 20", timerStudy: 90, timerBreak: 20 },
];

const lengthOf = (s: Settings, m: Mode) => 60 * (m === "studio" ? s.timerStudy : m === "pausa" ? s.timerBreak : s.timerLong);
const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

function readSaved(): State | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return v && typeof v.left === "number" && v.mode in MODE_LABEL ? v : null;
  } catch {
    return null;
  }
}

function writeSaved(v: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
}

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {}
}

type Timer = {
  mode: Mode;
  session: number;
  left: number;
  total: number;
  running: boolean;
  active: boolean;
  settings: Settings;
  todayMinutes: number;
  announce: string;
  toggle: () => void;
  skip: () => void;
  reset: () => void;
  configure: (change: Partial<Settings>) => void;
};

const TimerContext = createContext<Timer | null>(null);

export function useStudyTimer() {
  const timer = useContext(TimerContext);
  if (!timer) throw new Error("useStudyTimer needs StudyTimerProvider");
  return timer;
}

export function StudyTimerProvider({ prefs, children }: { prefs: Preferences; children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    timerStudy: prefs.timerStudy,
    timerBreak: prefs.timerBreak,
    timerLong: prefs.timerLong,
    timerSessions: prefs.timerSessions,
  });
  const [state, setState] = useState<State>({ mode: "studio", session: 1, left: lengthOf(settings, "studio"), endAt: null });
  const [now, setNow] = useState(() => Date.now());
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [announce, setAnnounce] = useState("");
  const loaded = useRef(false);
  const latest = useRef({ state, settings });
  useEffect(() => {
    latest.current = { state, settings };
  });

  useEffect(() => {
    const restore = requestAnimationFrame(() => {
      const saved = readSaved();
      if (saved) setState(saved);
      loaded.current = true;
    });
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    supabaseBrowser()
      .from("study_sessions")
      .select("minutes")
      .gte("ended_at", midnight.toISOString())
      .then(({ data }) => setTodayMinutes((data ?? []).reduce((sum, r) => sum + r.minutes, 0)));
    return () => cancelAnimationFrame(restore);
  }, []);

  useEffect(() => {
    if (loaded.current) writeSaved(state);
  }, [state]);

  function logMinutes(minutes: number) {
    if (minutes < 1) return;
    setTodayMinutes((t) => t + minutes);
    supabaseBrowser().from("study_sessions").insert({ minutes: Math.min(minutes, 240) }).then();
  }

  function advance(finished: State, s: Settings): State {
    if (finished.mode !== "studio") {
      const session = finished.mode === "pausa-lunga" ? 1 : finished.session + 1;
      return { mode: "studio", session, left: lengthOf(s, "studio"), endAt: null };
    }
    const mode: Mode = finished.session >= s.timerSessions ? "pausa-lunga" : "pausa";
    return { mode, session: finished.session, left: lengthOf(s, mode), endAt: null };
  }

  useEffect(() => {
    if (state.endAt === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const { state: s, settings: cfg } = latest.current;
      if (s.endAt !== null && s.endAt <= t) {
        if (s.mode === "studio") logMinutes(cfg.timerStudy);
        const next = advance(s, cfg);
        setState(next);
        setAnnounce(s.mode === "studio" ? "Sessione finita: è ora di una pausa." : "Pausa finita: si riparte.");
        beep();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [state.endAt]);

  const left = state.endAt === null ? state.left : Math.max(0, Math.ceil((state.endAt - now) / 1000));
  const total = lengthOf(settings, state.mode);
  const running = state.endAt !== null;
  const active = running || left < total || state.mode !== "studio" || state.session > 1;

  useEffect(() => {
    const base = document.title.replace(/^\d\d:\d\d · [^·]+ · /, "");
    document.title = active ? `${clock(left)} · ${MODE_LABEL[state.mode]} · ${base}` : base;
  }, [active, left, state.mode]);

  const timer: Timer = {
    mode: state.mode,
    session: state.session,
    left,
    total,
    running,
    active,
    settings,
    todayMinutes,
    announce,
    toggle: () => {
      const t = Date.now();
      setNow(t);
      setState((s) =>
        s.endAt === null
          ? { ...s, endAt: t + s.left * 1000 }
          : { ...s, left: Math.max(0, Math.ceil((s.endAt - t) / 1000)), endAt: null },
      );
    },
    skip: () => {
      if (state.mode === "studio") logMinutes(Math.floor((total - left) / 60));
      setState(advance(state, settings));
    },
    reset: () => setState({ mode: "studio", session: 1, left: lengthOf(settings, "studio"), endAt: null }),
    configure: (change) => {
      const next = { ...settings, ...change };
      setSettings(next);
      if (state.endAt === null) setState((s) => ({ ...s, left: lengthOf(next, s.mode) }));
      const prefsNow = parsePreferences({ ...document.documentElement.dataset, ...next });
      applyPreferences(prefsNow);
      savePreferences(prefsNow);
    },
  };

  return <TimerContext.Provider value={timer}>{children}</TimerContext.Provider>;
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const id = `timer-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] text-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isInteger(v) && v >= min && v <= max) onChange(v);
        }}
        className="field h-10 w-full"
      />
    </div>
  );
}

export function TimerCell() {
  const t = useStudyTimer();
  const minutes = Math.round(t.total / 60);
  const preset = PRESETS.find((p) => p.timerStudy === t.settings.timerStudy && p.timerBreak === t.settings.timerBreak);

  return (
    <div className="flex h-full flex-col justify-between gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="study-chip">
          {MODE_LABEL[t.mode]} · {minutes} min
        </span>
        <button
          type="button"
          popoverTarget="timer-settings"
          className="flex min-h-8 cursor-pointer items-center gap-1 rounded-full px-2 text-[13px] hover:underline"
        >
            <Icon name="settings" size={14} />
            Imposta
        </button>
        <div
          id="timer-settings"
          popover="auto"
          aria-label="Impostazioni del timer"
          className="timer-popover m-auto w-[340px] max-w-[calc(100vw-32px)] flex-col gap-4 rounded-row border border-border bg-raised p-5 text-ink shadow-lg"
        >
            <div className="flex items-center justify-between">
              <p className="text-[17px] font-bold">Timer di studio</p>
              <button type="button" popoverTarget="timer-settings" popoverTargetAction="hide" aria-label="Chiudi" className="btn-ghost h-9 w-9 px-0">
                <Icon name="close" size={16} />
              </button>
            </div>
            <fieldset>
              <legend className="label mb-2">Ritmo</legend>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    aria-pressed={preset?.name === p.name}
                    onClick={() => t.configure({ timerStudy: p.timerStudy, timerBreak: p.timerBreak })}
                    className={`min-h-9 cursor-pointer rounded-full border px-3 text-[13px] ${preset?.name === p.name ? "border-accent bg-accent-soft font-bold" : "border-border"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Stepper label="Studio (min)" value={t.settings.timerStudy} min={5} max={120} onChange={(v) => t.configure({ timerStudy: v })} />
              <Stepper label="Pausa (min)" value={t.settings.timerBreak} min={1} max={30} onChange={(v) => t.configure({ timerBreak: v })} />
              <Stepper label="Pausa lunga (min)" value={t.settings.timerLong} min={5} max={60} onChange={(v) => t.configure({ timerLong: v })} />
              <Stepper label="Sessioni" value={t.settings.timerSessions} min={1} max={8} onChange={(v) => t.configure({ timerSessions: v })} />
            </div>
            <p className="text-[13px] text-muted">Dopo l&apos;ultima sessione parte la pausa lunga. Alla fine di ogni fase suona un segnale.</p>
            <button type="button" className="btn-ghost h-9 self-start px-3 text-sm" onClick={t.reset}>
              Ricomincia da capo
            </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="num font-mono text-[34px] leading-none" aria-label={`${MODE_LABEL[t.mode]}, ${clock(t.left)} rimasti`}>
          {clock(t.left)}
        </p>
        <div className="flex gap-2">
          <button type="button" className="study-btn-ghost" onClick={t.skip}>
            Salta
          </button>
          <button type="button" className="study-btn" onClick={t.toggle}>
            {t.running ? "Pausa" : t.left < t.total ? "Riprendi" : "Avvia"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="flex gap-1" aria-hidden="true">
          {Array.from({ length: t.settings.timerSessions }, (_, i) => (
            <span key={i} className={`study-dot ${i < t.session - (t.mode === "studio" ? 1 : 0) ? "is-done" : ""}`} />
          ))}
        </span>
        <span className="num">
          sessione {t.session} di {t.settings.timerSessions} · oggi {t.todayMinutes} min
        </span>
      </div>
      <span role="status" className="sr-only">
        {t.announce}
      </span>
    </div>
  );
}

export function MiniTimer() {
  const t = useStudyTimer();
  if (!t.active) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-full bg-accent-soft py-1 pr-1 pl-3 text-[14px] text-ink">
      <span className="num">
        {MODE_LABEL[t.mode]} {clock(t.left)}
      </span>
      <button
        type="button"
        onClick={t.toggle}
        aria-label={t.running ? "Metti in pausa il timer" : "Fai ripartire il timer"}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-active"
      >
        <Icon name={t.running ? "pause" : "play"} size={16} />
      </button>
    </div>
  );
}
