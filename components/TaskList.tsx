"use client";

import { useOptimistic, useTransition } from "react";
import { moveTaskToTomorrow, setTaskDone } from "@/app/actions";
import { formatDay } from "@/lib/dates";
import { carriedDays } from "@/lib/todo";
import type { Area, Task } from "@/lib/types";
import { QuickAdd } from "./QuickAdd";

type TaskChange = { type: "done"; id: string; done: boolean } | { type: "hide"; id: string };

/** Category chip in the area's colour. */
export function CategoryChip({ area }: { area: Area }) {
  return (
    <span
      className="rounded-full px-2 py-0.5"
      style={{ color: area.color, background: `color-mix(in srgb, ${area.color} 16%, transparent)` }}
    >
      {area.name}
    </span>
  );
}

/** "Carried 2 days": amber for a day or two, red from three. */
export function CarryBadge({ days }: { days: number }) {
  if (days <= 0) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 ${days >= 3 ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`}>
      Carried {days} {days === 1 ? "day" : "days"}
    </span>
  );
}

/**
 * Open to-dos (unfinished ones carry over day to day) with quick add below.
 * `canMove` adds "→ tomorrow" for the check-in; `showListed` adds the day
 * each task was listed.
 */
export function TaskList({
  tasks,
  date,
  areas = [],
  canMove = false,
  flat = false,
  showListed = false,
  showAdd = true,
}: {
  tasks: Task[];
  date: string;
  areas?: Area[];
  canMove?: boolean;
  /** Drop the list's own card when it already sits inside one. */
  flat?: boolean;
  showListed?: boolean;
  showAdd?: boolean;
}) {
  const [, startTransition] = useTransition();

  const [items, apply] = useOptimistic(tasks, (current: Task[], change: TaskChange) => {
    if (change.type === "done") {
      return current.map((t) => (t.id === change.id ? { ...t, status: change.done ? ("done" as const) : ("todo" as const) } : t));
    }
    return current.filter((t) => t.id !== change.id);
  });

  function run(change: TaskChange, action: () => Promise<void>) {
    startTransition(async () => {
      apply(change);
      await action();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className={`flex flex-col ${flat ? "-mx-1" : "overflow-hidden rounded-3xl border border-line bg-card"}`}>
        {items.length === 0 && (
          <li className="px-4 py-5 text-center text-sm text-muted">Nothing open. Enjoy the space, or add one below.</li>
        )}
        {items.map((task) => {
          const done = task.status === "done";
          const carried = done ? 0 : carriedDays(task, date);
          const area = areas.find((a) => a.id === task.area_id);
          const upcoming = !done && task.due_date && task.due_date > date;
          return (
            <li key={task.id} className={`flex items-center gap-3 border-b border-line py-3 last:border-b-0 ${flat ? "px-1" : "px-4"}`}>
              <button
                type="button"
                aria-label={done ? "Mark not done" : "Mark done"}
                onClick={() => run({ type: "done", id: task.id, done: !done }, () => setTaskDone(task.id, !done, date))}
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm transition active:scale-90 ${
                  done ? "border-good bg-good text-card" : "border-line hover:border-accent"
                }`}
              >
                {done ? "✓" : ""}
              </button>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={done ? "text-muted line-through" : ""}>{task.title}</span>
                {(carried > 0 || area || upcoming || showListed) && (
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                    {area && <CategoryChip area={area} />}
                    <CarryBadge days={carried} />
                    {upcoming && <span className="rounded-full bg-chip px-2 py-0.5 text-muted">Due {formatDay(task.due_date!)}</span>}
                    {showListed && task.listed_on && <span className="text-muted">Listed {formatDay(task.listed_on)}</span>}
                  </span>
                )}
              </span>
              {canMove && !done && (
                <button
                  type="button"
                  onClick={() => run({ type: "hide", id: task.id }, () => moveTaskToTomorrow(task.id, date))}
                  className="shrink-0 rounded-full bg-chip px-3 py-1.5 text-xs font-medium"
                >
                  → Tomorrow
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {showAdd && <QuickAdd date={date} areas={areas} compact />}
    </div>
  );
}
