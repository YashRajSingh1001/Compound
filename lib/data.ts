import { connection } from "next/server";
import { cookies } from "next/headers";
import { TZ_COOKIE, addDays, isValidTimeZone, todayIn, weekStart } from "./dates";
import {
  currentStreak,
  dailyStatus,
  dayScore,
  milestoneProgress,
  weeklyProgress,
  type DailyStatus,
  type MilestoneProgress,
  type WeeklyProgress,
} from "./progress";
import { createClient } from "./supabase/server";
import type { Area, DailyLog, Target, Task, Verdict } from "./types";

/** Today in the user's timezone (set by <TimeZoneSync>, UTC until then). */
export async function getToday(): Promise<string> {
  // Reading the clock must happen per request, never at build time.
  await connection();
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return todayIn(isValidTimeZone(tz) ? tz : "UTC");
}

// The heatmap shows this many weeks, ending with the current one.
export const HEATMAP_WEEKS = 18;
// How far back logs are loaded: the heatmap's first Monday, at most.
const HISTORY_DAYS = HEATMAP_WEEKS * 7;

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
  /** Today's vocab progress, for the Vocab tile. */
  vocab: { learned: number; perDay: number; due: number };
  verdict: Verdict | null;
};

/** Everything the Today screen, check-in and verdict need for one day. */
export async function loadDay(date: string): Promise<DaySnapshot> {
  const supabase = await createClient();

  const [areas, targets, logRows, openTasks, doneTasks, milestoneTasks, verdict, vocabToday, vocabDue] = await Promise.all([
    supabase.from("areas").select("id, name, color, sort, for_tasks").eq("active", true).order("sort"),
    supabase
      .from("targets")
      .select("id, area_id, name, kind, metric, target_min, target_max, unit, due_date, rollup_from, rules, notes, sort")
      .eq("active", true)
      .order("sort"),
    supabase
      .from("daily_logs")
      .select("id, log_date, target_id, value, tag")
      .gte("log_date", addDays(date, -HISTORY_DAYS))
      .lte("log_date", date)
      .order("created_at"),
    supabase
      .from("tasks")
      .select("*")
      .is("milestone_id", null)
      .in("status", ["todo", "in_progress"])
      .or(`due_date.is.null,due_date.lte.${date}`)
      .order("due_date", { nullsFirst: false })
      .order("created_at"),
    supabase
      .from("tasks")
      .select("*")
      .is("milestone_id", null)
      .eq("status", "done")
      .eq("finished_on", date),
    supabase.from("tasks").select("*").not("milestone_id", "is", null).order("sort"),
    supabase.from("verdicts").select("verdict_date, text, model").eq("verdict_date", date).maybeSingle(),
    supabase.from("vocab_words").select("id", { count: "exact", head: true }).eq("learned_on", date),
    supabase.from("vocab_words").select("id", { count: "exact", head: true }).lte("next_review", date).lt("learned_on", date),
  ]);

  for (const r of [areas, targets, logRows, openTasks, doneTasks, milestoneTasks, verdict, vocabToday, vocabDue]) {
    if (r.error) throw new Error(r.error.message);
  }

  const allTargets = (targets.data ?? []) as Target[];
  const logs = (logRows.data ?? []) as DailyLog[];

  // "Latest value" milestones (follower count) need their newest log, which
  // can be older than this week.
  const latestTargets = allTargets.filter((t) => t.kind === "milestone" && t.rules.aggregate === "latest");
  const latestLogs = new Map<string, DailyLog>();
  if (latestTargets.length) {
    const { data, error } = await supabase
      .from("daily_logs")
      .select("id, log_date, target_id, value, tag")
      .in("target_id", latestTargets.map((t) => t.id))
      .lte("log_date", date)
      .order("log_date", { ascending: false });
    if (error) throw new Error(error.message);
    for (const log of (data ?? []) as DailyLog[]) {
      if (!latestLogs.has(log.target_id)) latestLogs.set(log.target_id, log);
    }
  }

  const daily = allTargets
    .filter((t) => t.kind === "daily")
    .map((t) => dailyStatus(t, allTargets, logs, date));

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
    areas: (areas.data ?? []) as Area[],
    daily,
    weekly: allTargets
      .filter((t) => t.kind === "weekly")
      .map((t) => weeklyProgress(t, allTargets, logs, date)),
    milestones: allTargets
      .filter((t) => t.kind === "milestone")
      .map((t) => milestoneProgress(t, (milestoneTasks.data ?? []) as Task[], latestLogs.get(t.id), date)),
    tasks: [...((openTasks.data ?? []) as Task[]), ...((doneTasks.data ?? []) as Task[])],
    green: daily.length > 0 && daily.every((d) => d.done),
    streak: currentStreak(allTargets, logs, date, HISTORY_DAYS),
    bestStreak,
    week: heat.slice(-7).map((d) => (d.date > date ? { ...d, total: daily.length } : d)),
    heat,
    vocab: {
      learned: vocabToday.count ?? 0,
      perDay: (allTargets.find((t) => t.rules.vocab)?.rules.vocab?.groups ?? []).reduce((a, g) => a + g.count, 0),
      due: vocabDue.count ?? 0,
    },
    verdict: (verdict.data as Verdict | null) ?? null,
  };
}

export type TodoSnapshot = {
  date: string;
  areas: Area[];
  /** Every open to-do, upcoming ones included. */
  open: Task[];
  /** Finished in the last FINISHED_DAYS days, newest first. */
  finished: Task[];
};

// Long enough for the 6-week same-day trend.
const FINISHED_DAYS = 42;

export async function loadTodo(date: string): Promise<TodoSnapshot> {
  const supabase = await createClient();
  const [areas, open, finished] = await Promise.all([
    supabase.from("areas").select("id, name, color, sort, for_tasks").eq("active", true).order("sort"),
    supabase
      .from("tasks")
      .select("*")
      .is("milestone_id", null)
      .in("status", ["todo", "in_progress"])
      .order("listed_on")
      .order("created_at"),
    supabase
      .from("tasks")
      .select("*")
      .is("milestone_id", null)
      .eq("status", "done")
      .gte("finished_on", addDays(date, -FINISHED_DAYS))
      .order("finished_on", { ascending: false })
      .order("completed_at", { ascending: false }),
  ]);
  for (const r of [areas, open, finished]) if (r.error) throw new Error(r.error.message);
  return {
    date,
    areas: (areas.data ?? []) as Area[],
    open: (open.data ?? []) as Task[],
    finished: (finished.data ?? []) as Task[],
  };
}
