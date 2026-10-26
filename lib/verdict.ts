import "server-only";

import type { DaySnapshot } from "./data";
import { formatDay, formatMinutes } from "./dates";

// What the LLM sees: checkmarks, numbers and task titles. Never journal text —
// the journal only appears as done / not done.
export function verdictInputs(day: DaySnapshot) {
  const amount = (n: number, metric: string, unit: string | null) =>
    metric === "minutes" ? formatMinutes(n) : `${Math.round(n * 10) / 10} ${unit ?? ""}`.trim();

  return {
    date: formatDay(day.date),
    all_non_negotiables_done: day.green,
    // Pre-counted so the model can't miscount the list below.
    non_negotiables_done: `${day.daily.filter((d) => d.done).length} of ${day.daily.length}`,
    done_today: day.daily.filter((d) => d.done).map((d) => d.target.name),
    not_done_today: day.daily.filter((d) => !d.done).map((d) => d.target.name),
    green_day_streak: day.streak,
    daily: day.daily.map((d) => ({
      name: d.target.name,
      done: d.done,
      logged: d.target.metric === "bool" ? (d.logs[0]?.tag ?? (d.done ? "yes" : "no")) : amount(d.value, d.target.metric, d.target.unit),
      required: d.target.metric === "bool" ? undefined : amount(d.required, d.target.metric, d.target.unit),
      extra_rest_day: d.extraRest || undefined,
    })),
    week_so_far: day.weekly.map((w) => ({
      name: w.target.name,
      actual: amount(w.actual, w.target.metric, w.target.unit),
      should_be_by_tonight: amount(w.expected, w.target.metric, w.target.unit),
      weekly_goal: amount(w.goal, w.target.metric, w.target.unit),
      status: w.status,
      days_left_in_week: w.daysLeft,
    })),
    milestones: day.milestones.map((m) => ({
      name: m.target.name,
      progress:
        m.mode === "tasks"
          ? `${formatMinutes(m.done)} of ${formatMinutes(m.total)}`
          : `${m.done} of ${m.total} ${m.target.unit ?? ""}`.trim(),
      due: m.target.due_date ? formatDay(m.target.due_date) : null,
      days_left: m.daysLeft,
      needed_per_day: m.perDayNeeded !== null ? formatMinutes(m.perDayNeeded) : undefined,
      needed_per_week: m.perWeekNeeded !== null ? Math.ceil(m.perWeekNeeded) : undefined,
      next_up: m.nextTasks.map((t) => t.title),
    })),
    tasks_done: day.tasks.filter((t) => t.status === "done").map((t) => t.title),
    tasks_open: day.tasks.filter((t) => t.status !== "done").map((t) => t.title),
  };
}

export const VERDICT_SYSTEM = `You are the honest evening coach inside a personal habit tracker called Compound.
You get one day's data as JSON: daily non-negotiables, weekly targets with pace, dated milestones and tasks.

Write the verdict for today:
- First sentence: a straight call on the day (green day or not), naming what was done (done_today) and what wasn't (not_done_today).
- Then the single biggest gap, using the real numbers (e.g. "Study is 2 h behind pace with 2 days left").
- Mention a milestone only if its needed pace looks hard to keep.
- End with one concrete action for tomorrow.

Rules: 3 to 5 short sentences, under 90 words, plain text, no headings, no bullet points, no emojis.
Be direct and warm, never preachy. Use only the numbers given; don't invent anything.`;
