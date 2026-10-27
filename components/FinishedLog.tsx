"use client";

import { useOptimistic, useTransition } from "react";
import { setTaskDone } from "@/app/actions";
import { formatDay } from "@/lib/dates";
import { daysToFinish } from "@/lib/todo";
import type { Area, Task } from "@/lib/types";
import { CategoryChip } from "./TaskList";

function lagBadge(days: number | null) {
  if (days === null) return null;
  const label = days === 0 ? "Same day" : `+${days} ${days === 1 ? "day" : "days"}`;
  const className = days === 0 ? "bg-good-soft text-good" : days <= 2 ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad";
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{label}</span>;
}

/** Finished to-dos grouped by the day they were finished, with listed → finished dates. */
export function FinishedLog({ tasks, areas, date }: { tasks: Task[]; areas: Area[]; date: string }) {
  const [, startTransition] = useTransition();
  const [items, hide] = useOptimistic(tasks, (current: Task[], id: string) => current.filter((t) => t.id !== id));

  const days = [...new Set(items.map((t) => t.finished_on).filter((d): d is string => Boolean(d)))];

  if (!items.length) {
    return <p className="py-6 text-center text-sm text-muted">Nothing finished yet. Tick a to-do and it lands here with its dates.</p>;
  }

  return (
    <div className="flex flex-col">
      {days.map((day) => (
        <div key={day} className="flex flex-col">
          <span className="label px-1 pt-4 pb-1 !text-accent">{day === date ? "Today" : formatDay(day)}</span>
          {items
            .filter((t) => t.finished_on === day)
            .map((t) => {
              const area = areas.find((a) => a.id === t.area_id);
              return (
                <div key={t.id} className="flex items-center gap-3 border-t border-line px-1 py-3">
                  <button
                    type="button"
                    aria-label={`Mark "${t.title}" not done`}
                    title="Undo"
                    onClick={() =>
                      startTransition(async () => {
                        hide(t.id);
                        await setTaskDone(t.id, false, date);
                      })
                    }
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-good text-xs text-card transition active:scale-90"
                  >
                    ✓
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[15px]">{t.title}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted">
                      {area && <CategoryChip area={area} />}
                      {t.listed_on && (
                        <span>
                          Listed {formatDay(t.listed_on)} → Finished {formatDay(day)}
                        </span>
                      )}
                    </span>
                  </div>
                  {lagBadge(daysToFinish(t))}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
