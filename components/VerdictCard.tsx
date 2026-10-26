"use client";

import { useState, useTransition } from "react";
import { generateVerdict } from "@/app/actions";
import type { Verdict } from "@/lib/types";
import { Card } from "./ui";

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
    <Card className="flex flex-col gap-3">
      {verdict ? (
        <p className="leading-relaxed">{verdict.text}</p>
      ) : (
        <p className="text-sm text-muted">Log your day, then get an honest read on how it went.</p>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      <button
        type="button"
        onClick={ask}
        disabled={pending}
        className="min-h-12 rounded-2xl bg-foreground font-medium text-background disabled:opacity-50"
      >
        {pending ? "Thinking…" : verdict ? "Get a fresh verdict" : "Get verdict"}
      </button>
    </Card>
  );
}
