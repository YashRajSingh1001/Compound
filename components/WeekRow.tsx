"use client";

import { useOptimistic, useTransition } from "react";
import { setDayValue } from "@/app/actions";
import type { WeeklyProgress } from "@/lib/progress";
import { PaceBadge } from "./ui";
import { formatAmount } from "./WeeklyQuickLog";

/**
 * One weekly target as a compact row with a pace bar. Directly logged
 * targets (Reels, Tech news) get a small action: +1, or a done-today toggle
 * for targets counted in days.
 */
export function WeekRow({ progress, date, color }: { progress: WeeklyProgress; date: string; color?: string }) {
  const { target, goal } = progress;
  const [pending, startTransition] = useTransition();
  const [today, setToday] = useOptimistic(progress.todayValue);
  const actual = progress.actual - progress.todayValue + today;
  const perDay = target.unit === "days";
  const pct = goal ? Math.min((actual / goal) * 100, 100) : 0;
  const unit = target.metric === "minutes" ? "" : ` ${target.unit ?? ""}`;
  const range = target.target_max ? `${goal}–${target.target_max}` : formatAmount(goal, progress);

  function save(next: number) {
    startTransition(async () => {
      setToday(next);
      await setDayValue(target.id, date, next > 0 ? next : null);
    });
  }

  return (
    <div className={`flex flex-col gap-1.5 ${pending ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <span aria-hidden>{target.rules.icon}</span>
          <span className="truncate">{target.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-muted">
          {formatAmount(actual, progress)} / {range}
          {unit}
          <PaceBadge status={actual >= goal ? "done" : progress.status} />
          {progress.direct &&
            (perDay ? (
              <button
                type="button"
                onClick={() => save(today > 0 ? 0 : 1)}
                className={`h-7 rounded-full px-2.5 text-xs font-semibold transition active:scale-95 ${
                  today > 0 ? "bg-good text-card" : "bg-accent-soft text-accent"
                }`}
              >
                {today > 0 ? "✓ Today" : "Today"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => save(today + 1)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (today > 0) save(today - 1);
                }}
                title="Right-click or long-press to undo one"
                className="h-7 rounded-full bg-accent-soft px-2.5 text-xs font-semibold text-accent transition active:scale-95"
              >
                +1
              </button>
            ))}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-chip">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color ?? "var(--accent)" }} />
      </div>
    </div>
  );
}
