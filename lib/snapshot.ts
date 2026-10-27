// Turns a day's raw rows into everything the screens show. Pure: no
// database, no cookies. The app feeds it real rows (lib/data.ts); the public
// demo feeds it generated ones (lib/demo.ts).

import { addDays, formatMinutes, weekStart } from "./dates";
import {
  currentStreak,
  dailyStatus,
  dayScore,
  milestoneProgress,
  suggestTargets,
  weeklyProgress,
  type DailyStatus,
  type MilestoneProgress,
  type TargetSuggestion,
  type WeeklyProgress,
} from "./progress";
import type { Area, DailyLog, Target, Task, Verdict } from "./types";

// The heatmap shows this many weeks, ending with the current one.
export const HEATMAP_WEEKS = 18;
// How far back logs are loaded: the heatmap's first Monday, at most.
export const HISTORY_DAYS = HEATMAP_WEEKS * 7;

export type WeekDay = { date: string; done: number; total: number };

export type DaySnapshot = {
  date: string;
  areas: Area[];
  daily: DailyStatus[];
  weekly: WeeklyProgress[];
  milestones: MilestoneProgress[];
  /** Open tasks due by this date (or undated; earlier ones carry over) plus tasks finished on it. */
  tasks: Task[];
  green: boolean;
  /** Consecutive green days (see currentStreak). */
  streak: number;
  /** Longest run of green days in the loaded history. */
  bestStreak: number;
  /** Monday → Sunday of this week, with non-negotiables done per day. */
  week: WeekDay[];
  /** HEATMAP_WEEKS whole weeks, Monday first; days after `date` have total 0. */
  heat: WeekDay[];
  /** Adaptive target suggestions not yet accepted or dismissed this week. */
  suggestions: TargetSuggestion[];
  /** Today's vocab progress, for the Vocab tile. */
  vocab: { learned: number; perDay: number; due: number };
  /** Today's journal length (the text itself never leaves the server). */
  journal: { words: number };
  verdict: Verdict | null;
};

export type DayInput = {
  date: string;
  areas: Area[];
  targets: Target[];
  /** Daily logs for the last HISTORY_DAYS days. */
  logs: DailyLog[];
  /** Newest log of each "latest value" milestone (follower count), any age. */
  latestLogs: DailyLog[];
  tasks: Task[];
  milestoneTasks: Task[];
  decidedThisWeek: string[];
  vocabLearned: number;
  vocabDue: number;
  journalText: string;
  verdict: Verdict | null;
};

export function buildDay(input: DayInput): DaySnapshot {
  const { date, targets: allTargets, logs } = input;
  const daily = allTargets.filter((t) => t.kind === "daily").map((t) => dailyStatus(t, allTargets, logs, date));

  const heatStart = addDays(weekStart(date), -(HEATMAP_WEEKS - 1) * 7);
  const heat: WeekDay[] = Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) => {
    const day = addDays(heatStart, i);
    return { date: day, ...(day <= date ? dayScore(allTargets, logs, day) : { done: 0, total: 0 }) };
  });
  let bestStreak = 0;
  let run = 0;
  for (const day of heat) {
    run = day.total > 0 && day.done === day.total ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
  }

  return {
    date,
    areas: input.areas,
    daily,
    weekly: allTargets.filter((t) => t.kind === "weekly").map((t) => weeklyProgress(t, allTargets, logs, date)),
    milestones: allTargets
      .filter((t) => t.kind === "milestone")
      .map((t) => milestoneProgress(t, input.milestoneTasks, input.latestLogs.find((l) => l.target_id === t.id), date)),
    tasks: input.tasks,
    green: daily.length > 0 && daily.every((d) => d.done),
    streak: currentStreak(allTargets, logs, date, HISTORY_DAYS),
    bestStreak,
    week: heat.slice(-7).map((d) => (d.date > date ? { ...d, total: daily.length } : d)),
    heat,
    suggestions: suggestTargets(allTargets, logs, date, new Set(input.decidedThisWeek), (t, amount) =>
      t.metric === "minutes" ? formatMinutes(amount) : String(Math.round(amount * 10) / 10),
    ),
    vocab: {
      learned: input.vocabLearned,
      perDay: (allTargets.find((t) => t.rules.vocab)?.rules.vocab?.groups ?? []).reduce((a, g) => a + g.count, 0),
      due: input.vocabDue,
    },
    journal: { words: input.journalText.trim().split(/\s+/).filter(Boolean).length },
    verdict: input.verdict,
  };
}
