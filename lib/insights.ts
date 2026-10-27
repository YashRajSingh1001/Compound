// Numbers for the Progress page: week-by-week history and simple
// correlations. Pure functions over targets + logs, like lib/progress.ts.

import { addDays, daysBetween, isWeekend, weekStart } from "./dates";
import { dailyStatus, weeklyProgress } from "./progress";
import type { DailyLog, Target } from "./types";

export type WeekPoint = { weekStart: string; actual: number; goal: number; share: number; current: boolean };

/** One point per week for the last `weeks` weeks (this week last, still in progress). */
export function weeklyHistory(target: Target, targets: Target[], logs: DailyLog[], today: string, weeks = 8): WeekPoint[] {
  const thisWeek = weekStart(today);
  const goal = target.target_min ?? 0;
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisWeek, -(weeks - 1 - i) * 7);
    const end = start === thisWeek ? today : addDays(start, 6);
    const actual = weeklyProgress(target, targets, logs, end).actual;
    return { weekStart: start, actual, goal, share: goal ? actual / goal : 0, current: start === thisWeek };
  });
}

/** The first day worth analysing: when the targets were created, at most `maxDays` back. */
export function trackingStart(targets: Target[], today: string, maxDays: number): string {
  const created = targets.map((t) => t.created_at?.slice(0, 10)).filter((d): d is string => Boolean(d)).sort()[0];
  const floor = addDays(today, -maxDays + 1);
  return created && created > floor ? created : floor;
}

export type Comparison = { label: string; a: { name: string; avg: number; days: number }; b: { name: string; avg: number; days: number } };

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/**
 * Average daily minutes of the main minutes target (study), split two ways:
 * on days with vs without a workout, and weekdays vs weekends. Days before
 * tracking started are left out, so zeros from before the app don't count.
 */
export function studyComparisons(targets: Target[], logs: DailyLog[], from: string, today: string): Comparison[] {
  const minutesTarget = targets.find((t) => t.kind === "daily" && t.metric === "minutes");
  const activity = targets.find((t) => t.kind === "daily" && t.metric === "bool" && t.rules.tags?.length);
  if (!minutesTarget) return [];

  const days = Array.from({ length: daysBetween(from, today) + 1 }, (_, i) => addDays(from, i));
  const minutesOn = (d: string) =>
    logs.filter((l) => l.target_id === minutesTarget.id && l.log_date === d).reduce((s, l) => s + Number(l.value), 0);

  const out: Comparison[] = [];
  if (activity) {
    const trained = (d: string) => logs.some((l) => l.target_id === activity.id && l.log_date === d && l.tag !== "rest");
    const yes = days.filter(trained);
    const no = days.filter((d) => !trained(d));
    out.push({
      label: `${minutesTarget.name} on ${activity.name.toLowerCase()} days vs other days`,
      a: { name: `${activity.name} days`, avg: avg(yes.map(minutesOn)), days: yes.length },
      b: { name: "Other days", avg: avg(no.map(minutesOn)), days: no.length },
    });
  }
  const weekdays = days.filter((d) => !isWeekend(d));
  const weekends = days.filter(isWeekend);
  out.push({
    label: `${minutesTarget.name}: weekdays vs weekends`,
    a: { name: "Weekdays", avg: avg(weekdays.map(minutesOn)), days: weekdays.length },
    b: { name: "Weekends", avg: avg(weekends.map(minutesOn)), days: weekends.length },
  });
  return out;
}

/** How often each daily non-negotiable was done since tracking started. */
export function habitRates(targets: Target[], logs: DailyLog[], from: string, today: string) {
  const days = Array.from({ length: daysBetween(from, today) + 1 }, (_, i) => addDays(from, i));
  return targets
    .filter((t) => t.kind === "daily")
    .map((t) => {
      const done = days.filter((d) => dailyStatus(t, targets, logs, d).done).length;
      return { target: t, done, days: days.length, rate: days.length ? done / days.length : 0 };
    });
}
