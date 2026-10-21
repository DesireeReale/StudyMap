"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { QuizQuestion } from "@/core/ai/schemas";
import { sameAnswer } from "@/core/answers";
import { defaultSettings, pickQuestions, topicsOf, TYPE_LABELS, typesOf, type QuizSettings } from "@/core/quiz";
import { supabaseBrowser } from "@/lib/supabase/browser";

const COUNTS = [5, 10, 15];

export function QuizRunner({ quizId, questions }: { quizId: string; questions: QuizQuestion[] }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"setup" | "run" | "done">("setup");
  const [settings, setSettings] = useState<QuizSettings>(() => defaultSettings(questions));
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [result, setResult] = useState<{ right: boolean; pick?: number } | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [saved, setSaved] = useState<"idle" | "saved" | "error">("idle");

  const q = phase === "run" ? questions[order[pos]!] : undefined;

  function start(list: number[]) {
    setOrder(list);
    setPos(0);
    setScore(0);
    setWrong([]);
    setResult(null);
    setSaved("idle");
    setPhase("run");
  }

  function answer(right: boolean, pick?: number) {
    if (result || !q) return;
    setResult({ right, pick });
    if (right) setScore((s) => s + 1);
    else setWrong((w) => [...w, order[pos]!]);
  }

  function overrule() {
    setResult({ right: true });
    setScore((s) => s + 1);
    setWrong((w) => w.filter((i) => i !== order[pos]));
  }

  async function next() {
    setResult(null);
    if (pos < order.length - 1) return setPos((p) => p + 1);
    setPhase("done");
    const { error } = await supabaseBrowser().from("quiz_attempts").insert({ quiz_id: quizId, score, total: order.length });
    setSaved(error ? "error" : "saved");
    router.refresh();
  }

  useEffect(() => {
    if (phase !== "run" || !q || result || q.type === "completamento") return;
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      const i = Number(e.key) - 1;
      if (Number.isInteger(i) && i >= 0 && i < q!.options.length) {
        e.preventDefault();
        answer(i === q!.correct, i);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (phase === "setup") {
    return <QuizSetup questions={questions} settings={settings} onChange={setSettings} onStart={() => start(pickQuestions(questions, settings))} />;
  }

  if (phase === "done") {
    const pct = Math.round((score / order.length) * 100);
    return (
      <div className="flex flex-col gap-4">
        <div className="panel flex flex-col items-start gap-3" role="status">
          <p className="text-[20px] font-bold">Quiz finito</p>
          <p className="num text-[15px]">
            Hai risposto bene a <span className="font-bold text-accent">{score}</span> domande su {order.length} ({pct}%).
            {saved === "error" && " Il risultato non è stato salvato."}
          </p>
          <div className="flex flex-wrap gap-2">
            {wrong.length > 0 && (
              <button type="button" className="btn-primary" onClick={() => start(wrong)}>
                Rifai le sbagliate ({wrong.length})
              </button>
            )}
            <button type="button" className={wrong.length ? "btn-secondary" : "btn-primary"} onClick={() => setPhase("setup")}>
              Nuovo quiz
            </button>
          </div>
        </div>
        {wrong.length > 0 && (
          <section aria-labelledby="wrong-title" className="flex flex-col gap-3">
            <h2 id="wrong-title" className="text-[17px] font-bold">
              Da ripassare
            </h2>
            <ol className="flex flex-col gap-2">
              {wrong.map((i) => (
                <li key={i} className="flex flex-col gap-1.5 rounded-row border border-border bg-raised p-4">
                  <p className="reading font-bold">{questions[i]!.question}</p>
                  <p className="reading">
                    <span className="font-bold text-positive">{rightAnswer(questions[i]!)}</span> {questions[i]!.explanation}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="num text-sm text-muted" aria-live="polite">
          Domanda <span className="text-ink">{pos + 1}</span> di {order.length} · {score} giuste
          {q!.topic && ` · ${q!.topic}`}
        </p>
        <div
          role="progressbar"
          aria-label="Avanzamento del quiz"
          aria-valuemin={0}
          aria-valuemax={order.length}
          aria-valuenow={pos}
          className="h-1.5 w-full overflow-hidden rounded-full bg-rule"
        >
          <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${(pos / order.length) * 100}%` }} />
        </div>
      </div>

      {q!.type === "completamento" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            answer(sameAnswer(String(new FormData(e.currentTarget).get("answer") ?? ""), q!.answer));
          }}
        >
          <label className="reading text-[22px] leading-snug font-bold md:text-[24px]" htmlFor="quiz-answer">
            {q!.question}
          </label>
          <span className="flex flex-wrap gap-2">
            <input
              key={pos}
              id="quiz-answer"
              name="answer"
              autoComplete="off"
              autoFocus
              readOnly={!!result}
              maxLength={100}
              className={`reading h-12 min-w-0 flex-1 rounded-field border bg-raised px-3 ${
                result ? (result.right ? "border-positive" : "border-negative") : "border-control"
              }`}
              placeholder="Scrivi la parola mancante"
            />
            {!result && (
              <button type="submit" className="btn-primary h-12">
                Controlla
              </button>
            )}
          </span>
        </form>
      ) : (
        <fieldset className="flex flex-col gap-3">
          <legend className="reading mb-3 text-[22px] leading-snug font-bold md:text-[24px]">{q!.question}</legend>
          {q!.options.map((option, i) => {
            const isRight = result !== null && i === q!.correct;
            const isWrong = result?.pick === i && i !== q!.correct;
            return (
              <button
                key={i}
                type="button"
                disabled={result !== null}
                aria-pressed={result?.pick === i}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => answer(i === q!.correct, i)}
                className={`reading flex min-h-14 cursor-pointer items-start gap-3 rounded-row border px-4 py-3 text-left transition-colors duration-150 disabled:cursor-default ${
                  isRight
                    ? "border-positive bg-pill-positive text-pill-positive-ink"
                    : isWrong
                      ? "border-negative bg-pill-negative text-pill-negative-ink"
                      : "border-border bg-raised hover:border-control"
                }`}
              >
                <span className="num grid size-7 shrink-0 place-items-center rounded-md bg-active text-sm font-bold" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="flex-1">{option}</span>
                {isRight && <span className="shrink-0 text-sm font-bold">Giusta</span>}
                {isWrong && <span className="shrink-0 text-sm font-bold">Sbagliata</span>}
              </button>
            );
          })}
          {!result && <p className="text-sm text-muted">Puoi rispondere anche con i tasti da 1 a {q!.options.length}.</p>}
        </fieldset>
      )}

      {result && (
        <div className="flex flex-col items-start gap-3 rounded-row bg-surface p-4" role="status">
          <p className="reading">
            <span className="font-bold">{result.right ? "Esatto. " : `${rightAnswer(q!)} `}</span>
            {q!.explanation}
          </p>
          {!result.right && q!.type === "completamento" && (
            <button type="button" className="btn-ghost" onClick={overrule}>
              La mia risposta era giusta
            </button>
          )}
          <button type="button" className="btn-primary" onClick={next} autoFocus>
            {pos === order.length - 1 ? "Vedi il risultato" : "Prossima domanda"}
          </button>
        </div>
      )}
    </div>
  );
}

function QuizSetup({
  questions,
  settings,
  onChange,
  onStart,
}: {
  questions: QuizQuestion[];
  settings: QuizSettings;
  onChange: (s: QuizSettings) => void;
  onStart: () => void;
}) {
  const types = typesOf(questions);
  const topics = topicsOf(questions);
  const available = pickQuestions(questions, { ...settings, count: questions.length }).length;
  const chosen = settings.types.length ? Math.min(settings.count, available) : 0;
  const counts = [...COUNTS.filter((c) => c < available), available].filter((c, i, a) => a.indexOf(c) === i);
  const pill =
    "flex min-h-10 cursor-pointer items-center rounded-full border border-border px-4 text-[15px] text-muted hover:text-ink has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-bold has-[:checked]:text-ink has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]";

  return (
    <form
      className="panel flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (chosen) onStart();
      }}
    >
      <h2 className="text-[20px] font-bold">Prima di iniziare</h2>
      {topics.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-2">Argomento</legend>
          <div className="flex flex-wrap gap-2">
            {[null, ...topics].map((t) => (
              <label key={t ?? "all"} className={pill}>
                <input
                  type="radio"
                  name="topic"
                  className="sr-only"
                  checked={settings.topic === t}
                  onChange={() => onChange({ ...settings, topic: t, count: questions.length })}
                />
                {t ?? "Tutti"}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {types.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-2">Tipo di domande</legend>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <label key={t} className={pill}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={settings.types.includes(t)}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      count: questions.length,
                      types: e.target.checked ? [...settings.types, t] : settings.types.filter((x) => x !== t),
                    })
                  }
                />
                {TYPE_LABELS[t]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {counts.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-2">Numero di domande</legend>
          <div className="flex flex-wrap gap-2">
            {counts.map((c) => (
              <label key={c} className={pill}>
                <input
                  type="radio"
                  name="count"
                  className="sr-only"
                  checked={Math.min(settings.count, available) === c}
                  onChange={() => onChange({ ...settings, count: c })}
                />
                <span className="num">{c === available ? `Tutte (${c})` : c}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={!chosen}>
          Inizia
        </button>
        <p className="num text-sm text-muted" aria-live="polite">
          {chosen ? `${chosen} ${chosen === 1 ? "domanda" : "domande"}` : "Scegli almeno un tipo di domanda."}
        </p>
      </div>
    </form>
  );
}

function rightAnswer(q: QuizQuestion) {
  if (q.type === "completamento") return `La risposta giusta è "${q.answer.replace(/\s*\/\s*/g, '" o "')}".`;
  if (q.type === "vero_falso") return `L'affermazione è ${q.correct === 0 ? "vera" : "falsa"}.`;
  return `La risposta giusta è la ${q.correct + 1}: "${q.options[q.correct]}".`;
}
