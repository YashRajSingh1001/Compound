// To-do consistency maths. Pure functions over task rows, so the page and
// (later) the MCP server and Insights can share them.

import { addDays, daysBetween, weekStart } from "./dates";
import type { Task } from "./types";

/** Days an open task has been carried past the day it was listed (0 = added today). */
export function carriedDays(task: Task, today: string): number {
  const listed = task.listed_on ?? task.due_date;
  if (task.status === "done" || !listed || listed >= today) return 0;
  return daysBetween(listed, today);
}

/** Days between listing and finishing (0 = finished the same day). */
export function daysToFinish(task: Task): number | null {
  if (!task.finished_on || !task.listed_on) return null;
  return Math.max(daysBetween(task.listed_on, task.finished_on), 0);
}

export type TodoStats = {
  finishedRecent: number;
  sameDay: number;
  /** Share finished on the day they were listed, last 30 days (null = nothing finished). */
  sameDayRate: number | null;
  avgDaysToFinish: number | null;
  open: number;
  carried: number;
  oldest: { title: string; days: number } | null;
  /** Same-day rate per week, oldest first, for the last `weeks` weeks. */
  trend: { weekStart: string; rate: number | null; finished: number }[];
};

export function todoStats(open: Task[], finished: Task[], today: string, weeks = 6): TodoStats {
  const since = addDays(today, -29);
  const recent = finished.filter((t) => t.finished_on && t.finished_on >= since);
  const lags = recent.map(daysToFinish).filter((d): d is number => d !== null);
  const sameDay = lags.filter((d) => d === 0).length;

  const carried = open.map((t) => ({ title: t.title, days: carriedDays(t, today) }));
  const oldest = carried.reduce<{ title: string; days: number } | null>(
    (best, t) => (t.days > 0 && (!best || t.days > best.days) ? t : best),
    null,
  );

  const firstWeek = addDays(weekStart(today), -(weeks - 1) * 7);
  const trend = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(firstWeek, i * 7);
    const end = addDays(start, 6);
    const inWeek = finished.filter((t) => t.finished_on && t.finished_on >= start && t.finished_on <= end);
    const same = inWeek.filter((t) => daysToFinish(t) === 0).length;
    return { weekStart: start, finished: inWeek.length, rate: inWeek.length ? same / inWeek.length : null };
  });

  return {
    finishedRecent: recent.length,
    sameDay,
    sameDayRate: lags.length ? sameDay / lags.length : null,
    avgDaysToFinish: lags.length ? lags.reduce((a, b) => a + b, 0) / lags.length : null,
    open: open.length,
    carried: carried.filter((t) => t.days > 0).length,
    oldest,
    trend,
  };
}
