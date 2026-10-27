"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { generateTodaysWords } from "@/app/(app)/vocab/actions";

/** Fetches today's words the first time the page opens; a button if that fails. */
export function GenerateWords({ date, perDay }: { date: string; perDay: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  function run() {
    setError(null);
    startTransition(async () => {
      const reply = await generateTodaysWords(date);
      if (reply.error) setError(reply.error);
    });
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    // Runs once per mount; `run` is stable enough for that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-10 text-center">
      {pending ? (
        <>
          <span className="size-8 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden />
          <p className="font-serif text-xl italic">Picking today&rsquo;s {perDay} words…</p>
          <p className="text-sm text-muted">Checking your history so nothing repeats.</p>
        </>
      ) : error ? (
        <>
          <p className="text-sm text-bad">{error}</p>
          <button type="button" onClick={run} className="min-h-11 rounded-full bg-accent px-5 font-semibold text-on-accent">
            Try again
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">Loading today&rsquo;s words…</p>
      )}
    </div>
  );
}
