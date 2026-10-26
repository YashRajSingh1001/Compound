// Pure functions that turn targets + logs into "where am I vs where should I be".
// No database access here, so the same logic serves the app, the verdict and
// (later) the MCP server.

import { addDays, daysBetween, isWeekend, weekStart, weekdayIndex } from "./dates";
import type { DailyLog, Target, Task } from "./types";

const REST_TAG = "rest";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** What a daily target asks for on a given date (minutes, count, or 1 for bool). */
export function dailyRequired(target: Target, date: string): number {
  if (target.metric === "bool") return 1;
  if (target.metric === "minutes" && isWeekend(date) && target.rules.weekend_min) {
    return target.rules.weekend_min;
  }
  return target.target_min ?? 1;
}

/**
 * Tags a target's logs can carry. Either listed on the target itself
 * (workout: gym/run/rest) or implied by targets that roll up from it
 * (study: genai/pytorch).
 */
export function tagsFor(target: Target, targets: Target[]): string[] {
  if (target.rules.tags?.length) return target.rules.tags;
  const fromChildren = targets
    .filter((t) => t.rollup_from === target.id && t.rules.tag)
    .map((t) => t.rules.tag!);
  return [...new Set(fromChildren)];
}

/** The logs that count toward `target`, following rollup_from and tag rules. */
export function logsFor(target: Target, logs: DailyLog[]): DailyLog[] {
  const sourceId = target.rollup_from ?? target.id;
  const { tag, exclude_tags } = target.rules;
  return logs.filter(
    (l) =>
      l.target_id === sourceId &&
      (!tag || l.tag === tag) &&
      (!exclude_tags || !exclude_tags.includes(l.tag ?? "")),
  );
}

const sum = (logs: DailyLog[]) => logs.reduce((total, l) => total + Number(l.value), 0);

// ---------------------------------------------------------------------------
// Daily non-negotiables
// ---------------------------------------------------------------------------

export type DailyStatus = {
  target: Target;
  date: string;
  value: number;
  required: number;
  done: boolean;
  tags: string[];
  logs: DailyLog[];
  /** Set when today's log is a rest day beyond the weekly allowance. */
  extraRest: boolean;
};

export function dailyStatus(
  target: Target,
  targets: Target[],
  weekLogs: DailyLog[],
  date: string,
): DailyStatus {
  const logs = weekLogs.filter((l) => l.target_id === target.id && l.log_date === date);
  const required = dailyRequired(target, date);
  const value = target.metric === "bool" ? (logs.length > 0 ? 1 : 0) : sum(logs);

  // A rest day counts as done only while within the weekly allowance.
  let extraRest = false;
  const allowance = target.rules.rest_days_per_week;
  if (allowance !== undefined && logs.some((l) => l.tag === REST_TAG)) {
    const restDaysSoFar = new Set(
      weekLogs
        .filter((l) => l.target_id === target.id && l.tag === REST_TAG && l.log_date <= date)
        .map((l) => l.log_date),
    ).size;
    extraRest = restDaysSoFar > allowance;
  }

  return {
    target,
    date,
    value,
    required,
    done: value >= required && !extraRest,
    tags: tagsFor(target, targets),
    logs,
    extraRest,
  };
}

// ---------------------------------------------------------------------------
// Weekly targets — pace
// ---------------------------------------------------------------------------

export type PaceStatus = "done" | "ahead" | "on_pace" | "behind";

export type WeeklyProgress = {
  target: Target;
  actual: number;
  goal: number;
  /** Where you should be by the end of `date` to finish the week on target. */
  expected: number;
  status: PaceStatus;
  /** True when logged directly (not computed from another target's logs). */
  direct: boolean;
  /** This day's own logs, for directly logged targets. */
  todayValue: number;
  daysLeft: number;
};

export function weeklyProgress(
  target: Target,
  targets: Target[],
  weekLogs: DailyLog[],
  date: string,
): WeeklyProgress {
  const goal = target.target_min ?? 0;
  const start = weekStart(date);
  const counted = logsFor(target, weekLogs).filter((l) => l.log_date >= start && l.log_date <= date);
  const actual = sum(counted);

  // Spread the goal over the week the way the source target spreads it:
  // study asks 90 min on weekdays and 150 on weekends, so by Friday you should
  // have 450/750, not 5/7 of 750. Without a minutes source, spread evenly.
  const source = targets.find((t) => t.id === target.rollup_from);
  const weights = Array.from({ length: 7 }, (_, i) =>
    source?.metric === "minutes" ? dailyRequired(source, addDays(start, i)) : 1,
  );
  const elapsed = weekdayIndex(date) + 1;
  const share = weights.slice(0, elapsed).reduce((a, b) => a + b, 0) / weights.reduce((a, b) => a + b, 0);
  const expected = goal * share;

  const gap = actual - expected;
  const status: PaceStatus =
    actual >= goal ? "done" : gap >= goal * 0.1 ? "ahead" : gap >= -goal * 0.05 ? "on_pace" : "behind";

  return {
    target,
    actual,
    goal,
    expected,
    status,
    direct: !target.rollup_from,
    todayValue: sum(weekLogs.filter((l) => l.target_id === target.id && l.log_date === date)),
    daysLeft: 7 - elapsed,
  };
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export type MilestoneProgress = {
  target: Target;
  mode: "tasks" | "latest";
  done: number;
  total: number;
  daysLeft: number | null;
  /** tasks mode: minutes per day still needed to hit the due date. */
  perDayNeeded: number | null;
  /** latest mode: increase per week still needed. */
  perWeekNeeded: number | null;
  /** tasks mode: what to work on next (in progress first). */
  nextTasks: Task[];
  latestDate: string | null;
};

export function milestoneProgress(
  target: Target,
  tasks: Task[],
  latest: DailyLog | undefined,
  date: string,
): MilestoneProgress {
  const daysLeft = target.due_date ? Math.max(daysBetween(date, target.due_date), 0) : null;

  if (target.rules.aggregate === "latest") {
    const done = latest ? Number(latest.value) : 0;
    const total = target.target_min ?? 0;
    const weeksLeft = daysLeft !== null ? Math.max(daysLeft / 7, 1) : null;
    return {
      target,
      mode: "latest",
      done,
      total,
      daysLeft,
      perDayNeeded: null,
      perWeekNeeded: weeksLeft ? Math.max(total - done, 0) / weeksLeft : null,
      nextTasks: [],
      latestDate: latest?.log_date ?? null,
    };
  }

  const items = tasks.filter((t) => t.milestone_id === target.id && t.status !== "skipped");
  const minutes = (t: Task) => t.est_minutes ?? 0;
  const total = items.reduce((a, t) => a + minutes(t), 0);
  const done = items.filter((t) => t.status === "done").reduce((a, t) => a + minutes(t), 0);
  const nextTasks = items
    .filter((t) => t.status !== "done")
    .sort((a, b) => Number(b.status === "in_progress") - Number(a.status === "in_progress") || a.sort - b.sort)
    .slice(0, 2);

  return {
    target,
    mode: "tasks",
    done,
    total,
    daysLeft,
    perDayNeeded: daysLeft ? (total - done) / daysLeft : null,
    perWeekNeeded: null,
    nextTasks,
    latestDate: null,
  };
}
