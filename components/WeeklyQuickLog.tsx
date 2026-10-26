"use client";

import { useOptimistic, useTransition } from "react";
import { setDayValue } from "@/app/actions";
import { formatMinutes } from "@/lib/dates";
import type { WeeklyProgress } from "@/lib/progress";
import { ActionPill, IconBubble, PaceBadge, ProgressBar } from "./ui";

/** Formats a weekly amount in the target's own unit. */
export function formatAmount(amount: number, progress: WeeklyProgress): string {
  return progress.target.metric === "minutes" ? formatMinutes(amount) : `${Math.round(amount * 10) / 10}`;
}

/**
 * A weekly target that's logged directly, day by day (Reels, Tech news).
 * Targets counted in "days" get a done-today toggle; others get − / +1.
 */
export function WeeklyQuickLog({ progress, date, color }: { progress: WeeklyProgress; date: string; color?: string }) {
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
    <div className={`flex flex-col gap-3 rounded-3xl border border-line bg-card p-3 pr-4 ${pending ? "opacity-80" : ""}`}>
      <div className="flex items-center gap-3">
        <IconBubble icon={target.rules.icon} name={target.name} color={color} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{target.name}</span>
          <span className="flex items-center gap-2 text-sm text-muted">
            {formatAmount(actual, progress)} / {goal} {target.unit}
            <PaceBadge status={actual >= goal ? "done" : progress.status} />
          </span>
        </div>
        {perDay ? (
          <ActionPill onClick={() => save(today > 0 ? 0 : 1)} active={today > 0}>
            {today > 0 ? "✓ Today" : "Did it today"}
          </ActionPill>
        ) : (
          <div className="flex items-center gap-1.5">
            {today > 0 && (
              <button
                type="button"
                aria-label={`One less ${target.unit ?? ""}`}
                onClick={() => save(Math.max(today - 1, 0))}
                className="size-10 rounded-full bg-chip text-lg text-muted active:scale-95"
              >
                −
              </button>
            )}
            <ActionPill onClick={() => save(today + 1)} label={`One more ${target.unit ?? ""}`}>
              {today > 0 ? `+1 · ${today} today` : "+1"}
            </ActionPill>
          </div>
        )}
      </div>
      <ProgressBar value={actual} max={goal} color={color} />
    </div>
  );
}
