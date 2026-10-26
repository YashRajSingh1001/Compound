"use client";

import { useState, useTransition } from "react";
import { generateVerdict } from "@/app/actions";
import type { Verdict } from "@/lib/types";

export function VerdictCard({ date, verdict }: { date: string; verdict: Verdict | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ask() {
    setError(null);
    startTransition(async () => {
      const result = await generateVerdict(date);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-line bg-card p-5">
      <div
        className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-accent opacity-10 blur-3xl"
        aria-hidden
      />
      <span className="label">Tonight&rsquo;s verdict</span>
      {verdict ? (
        <p className={`font-serif text-[22px] leading-snug transition-opacity ${pending ? "opacity-40" : ""}`}>
          {verdict.text}
        </p>
      ) : (
        <p className="font-serif text-[22px] leading-snug text-muted italic">
          Log your day, then get an honest read on how it went.
        </p>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      <button
        type="button"
        onClick={ask}
        disabled={pending}
        className="min-h-12 rounded-full bg-accent font-semibold text-on-accent transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Reading your day…" : verdict ? "Get a fresh verdict" : "Get verdict"}
      </button>
    </div>
  );
}
