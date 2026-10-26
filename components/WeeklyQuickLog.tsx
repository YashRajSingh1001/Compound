"use client";

import { useOptimistic, useTransition } from "react";
import { setDayValue } from "@/app/actions";
import { formatMinutes } from "@/lib/dates";
import type { WeeklyProgress } from "@/lib/progress";
import { PaceBadge } from "./ui";

/** Formats a weekly amount in the target's own unit. */
export function formatAmount(amount: number, progress: WeeklyProgress): string {
  return progress.target.metric === "minutes" ? formatMinutes(amount) : `${Math.round(amount * 10) / 10}`;
}

/**
 * A weekly target that's logged directly, day by day (Reels, Tech news).
 * Targets counted in "days" get a done-today toggle; others get − / +.
 */
export function WeeklyQuickLog({ progress, date }: { progress: WeeklyProgress; date: string }) {
  const { target, goal } = progress;
  const [pending, startTransition] = useTransition();
  const [today, setToday] = useOptimistic(progress.todayValue);
  const actual = progress.actual - progress.todayValue + today;
  const perDay = target.unit === "days";

  function save(next: number) {
    startTransition(async () => {
      setToday(next);
      await setDayValue(target.id, date, next > 0 ? next : null);
    });
  }

  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 ${pending ? "opacity-80" : ""}`}>
      <div className="flex flex-1 flex-col">
        <span className="font-semibold">{target.name}</span>
        <span className="flex items-center gap-2 text-sm text-muted">
          {formatAmount(actual, progress)} / {goal} {target.unit} this week
          <PaceBadge status={actual >= goal ? "done" : progress.status} />
        </span>
      </div>
      {perDay ? (
        <button
          type="button"
          onClick={() => save(today > 0 ? 0 : 1)}
          className={`min-h-11 rounded-full px-4 text-sm font-medium ${
            today > 0 ? "bg-good text-background" : "bg-chip"
          }`}
        >
          {today > 0 ? "✓ Today" : "Today?"}
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`One less ${target.unit ?? ""}`}
            onClick={() => save(Math.max(today - 1, 0))}
            disabled={today === 0}
            className="size-11 rounded-full bg-chip text-lg disabled:opacity-40"
          >
            −
          </button>
          <span className="w-6 text-center font-semibold">{today}</span>
          <button
            type="button"
            aria-label={`One more ${target.unit ?? ""}`}
            onClick={() => save(today + 1)}
            className="size-11 rounded-full bg-chip text-lg"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
