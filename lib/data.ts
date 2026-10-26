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

// How far back logs are loaded: enough for streaks and this week's pace.
const HISTORY_DAYS = 120;

export type WeekDay = { date: string; done: number; total: number };

export type DaySnapshot = {
  date: string;
  areas: Area[];
  daily: DailyStatus[];
  weekly: WeeklyProgress[];
  milestones: MilestoneProgress[];
  /** Open tasks due by this date (or undated) plus tasks finished on it. */
  tasks: Task[];
  green: boolean;
  /** Consecutive green days (see currentStreak). */
  streak: number;
  /** Monday → Sunday of this week, with non-negotiables done per day. */
  week: WeekDay[];
  verdict: Verdict | null;
};

/** Everything the Today screen, check-in and verdict need for one day. */
export async function loadDay(date: string): Promise<DaySnapshot> {
  const supabase = await createClient();

  const [areas, targets, logRows, openTasks, doneTasks, milestoneTasks, verdict] = await Promise.all([
    supabase.from("areas").select("id, name, color, sort").eq("active", true).order("sort"),
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
      .eq("due_date", date),
    supabase.from("tasks").select("*").not("milestone_id", "is", null).order("sort"),
    supabase.from("verdicts").select("verdict_date, text, model").eq("verdict_date", date).maybeSingle(),
  ]);

  for (const r of [areas, targets, logRows, openTasks, doneTasks, milestoneTasks, verdict]) {
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
    week: Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart(date), i);
      return { date: day, ...(day <= date ? dayScore(allTargets, logs, day) : { done: 0, total: daily.length }) };
    }),
    verdict: (verdict.data as Verdict | null) ?? null,
  };
}
