"use server";

// Every write the Today screen and check-in make. Each action refreshes the
// page afterwards, so the server-computed pace numbers update straight away.
// RLS guarantees these only ever touch the signed-in user's rows.

import { refresh } from "next/cache";
import { loadDay } from "@/lib/data";
import { addDays, isISODate } from "@/lib/dates";
import { GROQ_MODEL, groqChat } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";
import { VERDICT_SYSTEM, verdictInputs } from "@/lib/verdict";

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function assertDate(date: string) {
  if (!isISODate(date)) throw new Error(`Bad date: ${date}`);
}

/** Replace a target's logs for one day with a single value (or clear them with null). */
export async function setDayValue(targetId: string, date: string, value: number | null, tag: string | null = null) {
  assertDate(date);
  const supabase = await createClient();
  check((await supabase.from("daily_logs").delete().eq("target_id", targetId).eq("log_date", date)).error);
  if (value !== null && value > 0) {
    check((await supabase.from("daily_logs").insert({ target_id: targetId, log_date: date, value, tag })).error);
  }
  refresh();
}

/** Add one session (e.g. 45 min of PyTorch) on top of what's already logged. */
export async function addSession(targetId: string, date: string, value: number, tag: string | null) {
  assertDate(date);
  if (!(value > 0 && value <= 24 * 60)) throw new Error("Session must be between 1 and 1440");
  const supabase = await createClient();
  check((await supabase.from("daily_logs").insert({ target_id: targetId, log_date: date, value, tag })).error);
  refresh();
}

export async function deleteLog(logId: string) {
  const supabase = await createClient();
  check((await supabase.from("daily_logs").delete().eq("id", logId)).error);
  refresh();
}

export async function addTask(title: string, date: string) {
  assertDate(date);
  const clean = title.trim();
  if (!clean) return;
  const supabase = await createClient();
  check((await supabase.from("tasks").insert({ title: clean.slice(0, 200), due_date: date, source: "app" })).error);
  refresh();
}

export async function setTaskDone(taskId: string, done: boolean, date: string) {
  assertDate(date);
  const supabase = await createClient();
  check(
    (
      await supabase
        .from("tasks")
        .update(
          done
            ? // due_date = the day it was done, so it shows under that day.
              { status: "done", completed_at: new Date().toISOString(), due_date: date }
            : { status: "todo", completed_at: null },
        )
        .eq("id", taskId)
    ).error,
  );
  refresh();
}

/** Push an open task to the next day. */
export async function moveTaskToTomorrow(taskId: string, date: string) {
  assertDate(date);
  const supabase = await createClient();
  check((await supabase.from("tasks").update({ due_date: addDays(date, 1) }).eq("id", taskId)).error);
  refresh();
}

/** Milestone checklist items: todo → in progress → done. */
export async function setMilestoneTaskStatus(taskId: string, status: "todo" | "in_progress" | "done") {
  const supabase = await createClient();
  check(
    (
      await supabase
        .from("tasks")
        .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
        .eq("id", taskId)
    ).error,
  );
  refresh();
}

/** Ask Groq for the day's verdict and save it (one per day; asking again replaces it). */
export async function generateVerdict(date: string): Promise<{ text: string } | { error: string }> {
  assertDate(date);
  try {
    const inputs = verdictInputs(await loadDay(date));
    const text = await groqChat(VERDICT_SYSTEM, JSON.stringify(inputs));
    const supabase = await createClient();
    check(
      (
        await supabase
          .from("verdicts")
          .upsert(
            { verdict_date: date, text, model: GROQ_MODEL, inputs_summary: inputs },
            { onConflict: "user_id,verdict_date" },
          )
      ).error,
    );
    refresh();
    return { text };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
