"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuizQuestion } from "@/core/ai/schemas";
import { sameAnswer } from "@/core/answers";
import { supabaseBrowser } from "@/lib/supabase/browser";

const LETTERS = ["A", "B", "C", "D"];

export function QuizRunner({ quizId, questions }: { quizId: string; questions: QuizQuestion[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<{ right: boolean; pick?: number } | null>(null);
  const [score, setScore] = useState(0);
  const [saved, setSaved] = useState<"idle" | "saved" | "error">("idle");

  const done = index >= questions.length;
  const q = questions[index];

  function answer(right: boolean, pick?: number) {
    if (result || !q) return;
    setResult({ right, pick });
    if (right) setScore((s) => s + 1);
  }

  function overrule() {
    setResult({ right: true });
    setScore((s) => s + 1);
  }

  async function next() {
    const last = index === questions.length - 1;
    setResult(null);
    setIndex((i) => i + 1);
    if (!last) return;
    const { error } = await supabaseBrowser()
      .from("quiz_attempts")
      .insert({ quiz_id: quizId, score, total: questions.length });
    setSaved(error ? "error" : "saved");
    router.refresh();
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="panel flex flex-col items-start gap-4" role="status">
        <p className="text-[20px] font-bold">Quiz finito</p>
        <p className="num text-[15px]">
          Hai risposto bene a <span className="font-bold text-accent">{score}</span> domande su {questions.length} ({pct}%).
          {saved === "error" && " Il risultato non è stato salvato."}
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setIndex(0);
            setScore(0);
            setSaved("idle");
          }}
        >
          Rifai il quiz
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="num text-sm text-muted" aria-live="polite">
          Domanda <span className="text-ink">{index + 1}</span> di {questions.length} · {score} giuste
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-rule" aria-hidden="true">
          <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${(index / questions.length) * 100}%` }} />
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
              key={index}
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
                onClick={() => answer(i === q!.correct, i)}
                className={`reading flex min-h-14 cursor-pointer items-start gap-3 rounded-row border px-4 py-3 text-left transition-colors duration-150 disabled:cursor-default ${
                  isRight
                    ? "border-positive bg-pill-positive text-pill-positive-ink"
                    : isWrong
                      ? "border-negative bg-pill-negative text-pill-negative-ink"
                      : "border-border bg-raised hover:border-control"
                }`}
              >
                {q!.type === "scelta" && <span className="num shrink-0 font-bold">{LETTERS[i]}</span>}
                <span className="flex-1">{option}</span>
                {isRight && <span className="shrink-0 text-sm font-bold">Giusta</span>}
                {isWrong && <span className="shrink-0 text-sm font-bold">Sbagliata</span>}
              </button>
            );
          })}
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
            {index === questions.length - 1 ? "Vedi il risultato" : "Prossima domanda"}
          </button>
        </div>
      )}
    </div>
  );
}

function rightAnswer(q: QuizQuestion) {
  if (q.type === "completamento") return `La risposta giusta è "${q.answer.replace(/\s*\/\s*/g, '" o "')}".`;
  if (q.type === "vero_falso") return `L'affermazione è ${q.correct === 0 ? "vera" : "falsa"}.`;
  return `La risposta giusta è la ${LETTERS[q.correct]}.`;
}
