"use client";

import { useState, useTransition } from "react";
import { setDayValue, setMilestoneTaskStatus } from "@/app/actions";
import { daysBetween, formatDay, formatMinutes } from "@/lib/dates";
import type { MilestoneProgress } from "@/lib/progress";
import { ProgressBar } from "./ui";

/**
 * Check-in view of one milestone: progress by hours, plus a quick way to move
 * the next checklist item along — or, for count goals, enter the latest number.
 */
export function MilestoneQuick({ progress, date, color }: { progress: MilestoneProgress; date: string; color?: string }) {
  const { target, mode, done, total } = progress;
  const [pending, startTransition] = useTransition();
  const [count, setCount] = useState("");

  const run = (action: () => Promise<void>) => startTransition(action);
  const stale = mode === "latest" && (!progress.latestDate || daysBetween(progress.latestDate, date) >= 7);

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 ${pending ? "opacity-70" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{target.name}</span>
        {target.due_date && <span className="shrink-0 text-xs text-muted">{formatDay(target.due_date)}</span>}
      </div>
      <ProgressBar value={done} max={total} color={color} />
      <span className="text-sm text-muted">
        {mode === "tasks"
          ? `${formatMinutes(done)} of ${formatMinutes(total)}`
          : `${done.toLocaleString()} of ${total.toLocaleString()} ${target.unit ?? ""}`}
        {progress.perDayNeeded !== null && progress.perDayNeeded > 0 && ` · needs ${formatMinutes(progress.perDayNeeded)}/day`}
        {progress.perWeekNeeded !== null && progress.perWeekNeeded > 0 && ` · needs +${Math.ceil(progress.perWeekNeeded)}/week`}
      </span>

      {mode === "tasks" &&
        progress.nextTasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2 rounded-xl bg-chip px-3 py-2">
            <span className="flex flex-1 flex-col text-sm">
              {task.title}
              <span className="text-xs text-muted">
                {task.status === "in_progress" ? "In progress" : "Next"} · {formatMinutes(task.est_minutes ?? 0)}
              </span>
            </span>
            {task.status === "todo" && (
              <button
                type="button"
                onClick={() => run(() => setMilestoneTaskStatus(task.id, "in_progress"))}
                className="rounded-full bg-card px-3 py-1.5 text-xs font-medium"
              >
                Start
              </button>
            )}
            <button
              type="button"
              onClick={() => run(() => setMilestoneTaskStatus(task.id, "done"))}
              className="rounded-full bg-good px-3 py-1.5 text-xs font-medium text-background"
            >
              Done
            </button>
          </div>
        ))}

      {mode === "latest" && (
        <form
          className="flex gap-2"
          action={() => {
            const value = Number(count);
            if (value > 0) run(() => setDayValue(target.id, date, value));
            setCount("");
          }}
        >
          <input
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
            placeholder={stale ? `Weekly update: current ${target.unit ?? "count"}` : `Update ${target.unit ?? "count"}`}
            className="min-h-11 flex-1 rounded-xl border border-line bg-transparent px-3 text-sm"
          />
          <button className="min-h-11 rounded-xl bg-chip px-4 text-sm font-medium">Save</button>
        </form>
      )}
    </div>
  );
}
