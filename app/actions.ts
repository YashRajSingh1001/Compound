"use server";

// Every write the Today screen and check-in make. Each action refreshes the
// page afterwards, so the server-computed pace numbers update straight away.
// RLS guarantees these only ever touch the signed-in user's rows.

import { refresh } from "next/cache";
import { loadDay } from "@/lib/data";
import { addDays, isISODate, weekdayName } from "@/lib/dates";
import { GROQ_MODEL, groqChat, groqJSON } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";
import { QUICK_ADD_SYSTEM } from "@/lib/quick-add";
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

export type NewTask = {
  title: string;
  areaId: string | null;
  dueDate: string | null;
  estMinutes: number | null;
  recurrence: string | null;
  source: "app" | "quick_add";
};

/** Adds a to-do, listed today. Unfinished ones carry over until done. */
export async function addTask(task: NewTask, date: string) {
  assertDate(date);
  const title = task.title.trim();
  if (!title) return;
  if (task.dueDate) assertDate(task.dueDate);
  const supabase = await createClient();
  check(
    (
      await supabase.from("tasks").insert({
        title: title.slice(0, 200),
        area_id: task.areaId,
        due_date: task.dueDate ?? date,
        est_minutes: task.estMinutes,
        recurrence: task.recurrence,
        source: task.source,
        listed_on: date,
      })
    ).error,
  );
  refresh();
}

/** Turns "renew car insurance by friday ~30m" into a structured task with Groq. */
export async function parseQuickAdd(text: string, date: string): Promise<{ task?: NewTask; error?: string }> {
  assertDate(date);
  const clean = text.trim().slice(0, 300);
  if (!clean) return { error: "Type something first." };
  try {
    const supabase = await createClient();
    const { data: areas, error } = await supabase.from("areas").select("id, name").eq("for_tasks", true).order("sort");
    if (error) throw new Error(error.message);
    const reply = await groqJSON<{
      title?: string;
      category?: string | null;
      due_date?: string | null;
      est_minutes?: number | null;
      recurrence?: string | null;
    }>(
      QUICK_ADD_SYSTEM,
      JSON.stringify({ today: date, weekday: weekdayName(date), categories: (areas ?? []).map((a) => a.name), text: clean }),
      { maxTokens: 800, temperature: 0.1 },
    );
    const area = (areas ?? []).find((a) => a.name.toLowerCase() === reply.category?.toLowerCase());
    return {
      task: {
        title: reply.title?.trim() || clean,
        areaId: area?.id ?? null,
        dueDate: isISODate(reply.due_date) && reply.due_date >= date ? reply.due_date : date,
        estMinutes: typeof reply.est_minutes === "number" && reply.est_minutes > 0 ? Math.round(reply.est_minutes) : null,
        recurrence: reply.recurrence || null,
        source: "quick_add",
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't read that" };
  }
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
            ? { status: "done", completed_at: new Date().toISOString(), finished_on: date }
            : { status: "todo", completed_at: null, finished_on: null },
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
