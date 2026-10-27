import { connection } from "next/server";
import { cookies } from "next/headers";
import { TZ_COOKIE, addDays, isValidTimeZone, todayIn, weekStart } from "./dates";
import { HISTORY_DAYS, buildDay, type DayInput, type DaySnapshot } from "./snapshot";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import type { Area, DailyLog, Target, Task, Verdict } from "./types";

export type { DaySnapshot, WeekDay } from "./snapshot";

/** Today in the user's timezone (set by <TimeZoneSync>, UTC until then). */
export async function getToday(): Promise<string> {
  // Reading the clock must happen per request, never at build time.
  await connection();
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return todayIn(isValidTimeZone(tz) ? tz : "UTC");
}

/**
 * Who to load data for. The app passes nothing and relies on the signed-in
 * user's session (RLS). The MCP server has no session, so it passes the
 * service-role client plus the user id, and every query filters on it.
 */
export type DataContext = { supabase: SupabaseClient; userId: string };

function scoper(userId: string | undefined) {
  return <Q,>(query: Q): Q =>
    userId ? (query as unknown as { eq: (column: string, value: string) => Q }).eq("user_id", userId) : query;
}

/** The raw rows behind a day: what buildDay turns into a DaySnapshot. */
export async function loadDayInput(date: string, ctx?: DataContext): Promise<DayInput> {
  const supabase = ctx?.supabase ?? (await createClient());
  const own = scoper(ctx?.userId);

  const [areas, targets, logRows, openTasks, doneTasks, milestoneTasks, verdict, vocabToday, vocabDue, decided, journal] = await Promise.all([
    own(supabase.from("areas").select("id, name, color, sort, for_tasks").eq("active", true).order("sort")),
    own(supabase
      .from("targets")
      .select("id, area_id, name, kind, metric, target_min, target_max, unit, due_date, rollup_from, rules, notes, sort, created_at")
      .eq("active", true)
      .order("sort")),
    own(supabase
      .from("daily_logs")
      .select("id, log_date, target_id, value, tag")
      .gte("log_date", addDays(date, -HISTORY_DAYS))
      .lte("log_date", date)
      .order("created_at")),
    own(supabase
      .from("tasks")
      .select("*")
      .is("milestone_id", null)
      .in("status", ["todo", "in_progress"])
      .or(`due_date.is.null,due_date.lte.${date}`)
      .order("due_date", { nullsFirst: false })
      .order("created_at")),
    own(supabase
      .from("tasks")
      .select("*")
      .is("milestone_id", null)
      .eq("status", "done")
      .eq("finished_on", date)),
    own(supabase.from("tasks").select("*").not("milestone_id", "is", null).order("sort")),
    own(supabase.from("verdicts").select("verdict_date, text, model").eq("verdict_date", date).maybeSingle()),
    own(supabase.from("vocab_words").select("id", { count: "exact", head: true }).eq("learned_on", date)),
    own(supabase.from("vocab_words").select("id", { count: "exact", head: true }).lte("next_review", date).lt("learned_on", date)),
    own(supabase.from("target_suggestions").select("target_id").gte("created_at", weekStart(date))),
    own(supabase.from("journal_entries").select("text").eq("entry_date", date).maybeSingle()),
  ]);

  for (const r of [areas, targets, logRows, openTasks, doneTasks, milestoneTasks, verdict, vocabToday, vocabDue, decided, journal]) {
    if (r.error) throw new Error(r.error.message);
  }

  const allTargets = (targets.data ?? []) as Target[];
  const logs = (logRows.data ?? []) as DailyLog[];

  // "Latest value" milestones (follower count) need their newest log, which
  // can be older than this week.
  const latestTargets = allTargets.filter((t) => t.kind === "milestone" && t.rules.aggregate === "latest");
  const latestLogs: DailyLog[] = [];
  if (latestTargets.length) {
    const { data, error } = await own(supabase
      .from("daily_logs")
      .select("id, log_date, target_id, value, tag"))
      .in("target_id", latestTargets.map((t) => t.id))
      .lte("log_date", date)
      .order("log_date", { ascending: false });
    if (error) throw new Error(error.message);
    const seen = new Set<string>();
    for (const log of (data ?? []) as DailyLog[]) {
      if (!seen.has(log.target_id)) latestLogs.push(log);
      seen.add(log.target_id);
    }
  }

  return {
    date,
    areas: (areas.data ?? []) as Area[],
    targets: allTargets,
    logs,
    latestLogs,
    tasks: [...((openTasks.data ?? []) as Task[]), ...((doneTasks.data ?? []) as Task[])],
    milestoneTasks: (milestoneTasks.data ?? []) as Task[],
    decidedThisWeek: (decided.data ?? []).map((d) => d.target_id as string),
    vocabLearned: vocabToday.count ?? 0,
    vocabDue: vocabDue.count ?? 0,
    journalText: (journal.data?.text as string | undefined) ?? "",
    verdict: (verdict.data as Verdict | null) ?? null,
  };
}

/** Everything the Today screen, check-in and verdict need for one day. */
export async function loadDay(date: string, ctx?: DataContext): Promise<DaySnapshot> {
  return buildDay(await loadDayInput(date, ctx));
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
