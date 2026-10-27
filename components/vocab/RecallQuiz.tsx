"use client";

import { useState, useTransition } from "react";
import { gradeAnswers } from "@/app/(app)/vocab/actions";
import type { GradeResult } from "@/lib/types";
import { DictateButton } from "../DictateButton";

export type QuizWord = { id: string; word: string; part_of_speech: string | null; meaning: string; box: number };

/**
 * Type what each word means; Groq grades the batch. Results stay on screen
 * (from local state) even after the page refreshes and the words leave the
 * due list.
 */
export function RecallQuiz({ words, date, mode }: { words: QuizWord[]; date: string; mode: "daily" | "practice" }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<GradeResult[] | null>(null);
  const [quizWords] = useState(words);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function check() {
    setError(null);
    startTransition(async () => {
      const reply = await gradeAnswers(
        date,
        quizWords.map((w) => ({ wordId: w.id, answer: answers[w.id] ?? "" })),
        mode,
      );
      if (reply.error) setError(reply.error);
      else setResults(reply.results ?? []);
    });
  }

  const score = results?.filter((r) => r.correct).length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {results && (
        <div className="flex items-baseline justify-between rounded-2xl bg-accent-soft px-4 py-3">
          <span className="font-serif text-3xl text-accent">
            {score} / {results.length}
          </span>
          <span className="text-sm text-muted">
            {mode === "daily" ? "Right answers move up a box; misses come back tomorrow." : "Practice only. Your review schedule is unchanged."}
          </span>
        </div>
      )}
      <ol className="flex flex-col gap-3">
        {quizWords.map((w, i) => {
          const result = results?.find((r) => r.wordId === w.id);
          return (
            <li
              key={w.id}
              className={`flex flex-col gap-2 rounded-2xl border p-4 transition ${
                result ? (result.correct ? "border-good/50 bg-good-soft/40" : "border-bad/40 bg-bad-soft/40") : "border-line"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={`answer-${w.id}`} className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-muted">{i + 1}</span>
                  <span className="font-serif text-2xl">{w.word}</span>
                  {w.part_of_speech && <span className="text-xs text-muted italic">{w.part_of_speech}</span>}
                </label>
                {result && (
                  <span className={`text-sm font-semibold ${result.correct ? "text-good" : "text-bad"}`}>
                    {result.correct ? "✓ Got it" : "✗ Missed"}
                    {mode === "daily" && result.boxAfter !== undefined && (
                      <span className="ml-2 font-normal text-muted">box {result.boxAfter}</span>
                    )}
                  </span>
                )}
              </div>
              {result ? (
                <>
                  {answers[w.id]?.trim() && <p className="text-sm text-muted">You wrote: &ldquo;{answers[w.id].trim()}&rdquo;</p>}
                  <p className="text-sm">
                    <span className="font-semibold">Meaning:</span> {w.meaning}
                  </p>
                  {result.feedback && <p className="text-sm text-muted italic">{result.feedback}</p>}
                </>
              ) : (
                <div className="flex items-start gap-2">
                <textarea
                  id={`answer-${w.id}`}
                  rows={2}
                  value={answers[w.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [w.id]: e.target.value }))}
                  placeholder="What does it mean? Your own words are fine."
                  disabled={pending}
                  className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2 text-[15px] outline-none transition focus:border-accent"
                />
                <DictateButton
                  compact
                  label={`Say what ${w.word} means`}
                  prompt={`The meaning of the word "${w.word}".`}
                  onText={(spoken) => setAnswers((a) => ({ ...a, [w.id]: a[w.id]?.trim() ? `${a[w.id].trim()} ${spoken}` : spoken }))}
                />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {error && <p className="text-sm text-bad">{error}</p>}
      {!results && (
        <button
          type="button"
          onClick={check}
          disabled={pending}
          className="min-h-12 rounded-full bg-accent font-semibold text-on-accent transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Grading your answers…" : "Check my answers"}
        </button>
      )}
    </div>
  );
}
