"use client";

import { useOptimistic, useTransition } from "react";
import { decideSuggestion } from "@/app/actions";
import { formatMinutes } from "@/lib/dates";
import type { TargetSuggestion } from "@/lib/progress";
import { IconBubble } from "./ui";

function amount(s: TargetSuggestion, value: number, max: number | null) {
  const base = s.target.metric === "minutes" ? formatMinutes(value) : String(value);
  const range = max !== null && s.target.metric !== "minutes" ? `${base}–${max}` : base;
  return s.target.metric === "minutes" ? range : `${range} ${s.target.unit ?? ""}`;
}

/** Adaptive targets: after two weeks well under or over a goal, offer a new one. Never automatic. */
export function SuggestionsCard({ suggestions }: { suggestions: TargetSuggestion[] }) {
  const [, startTransition] = useTransition();
  const [items, hide] = useOptimistic(suggestions, (current: TargetSuggestion[], id: string) =>
    current.filter((s) => s.target.id !== id),
  );
  if (!items.length) return null;

  function decide(s: TargetSuggestion, decision: "accepted" | "dismissed") {
    startTransition(async () => {
      hide(s.target.id);
      await decideSuggestion(s.target.id, decision, {
        direction: s.direction,
        suggestedMin: s.suggestedMin,
        suggestedMax: s.suggestedMax,
        reason: s.reason,
      });
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent-soft/40 p-5">
      <div className="flex flex-col gap-1">
        <span className="label !text-accent">Targets, adjusted to reality</span>
        <p className="text-sm text-muted">Based on your last two full weeks. Nothing changes unless you accept.</p>
      </div>
      {items.map((s) => (
        <div key={s.target.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center">
          <IconBubble icon={s.target.rules.icon} name={s.target.name} size={40} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-semibold">
              {s.direction === "lower" ? "Lower" : "Raise"} {s.target.name} to {amount(s, s.suggestedMin, s.suggestedMax)} a week?
            </span>
            <span className="text-sm text-muted">
              {s.reason} Now: {amount(s, s.target.target_min ?? 0, s.target.target_max)}.
            </span>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => decide(s, "dismissed")} className="min-h-10 rounded-full bg-chip px-4 text-sm font-medium">
              Keep as is
            </button>
            <button
              type="button"
              onClick={() => decide(s, "accepted")}
              className="min-h-10 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent"
            >
              {s.direction === "lower" ? "Lower it" : "Raise it"}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
