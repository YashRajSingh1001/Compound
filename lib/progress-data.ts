import type { ProgressData } from "@/components/ProgressView";
import { addDays } from "./dates";
import { habitRates, studyComparisons, trackingStart, weeklyHistory, type WeekPoint } from "./insights";
import { buildDay, HISTORY_DAYS, type DayInput } from "./snapshot";

/** Shared with the demo: raw rows in, everything the Progress screen shows out. */
export function buildProgress(
  input: DayInput,
  todoSameDay: number | null,
  reviews: { correct: boolean }[],
): ProgressData {
  const day = buildDay(input);
  const { targets, logs, date } = input;
  const since = trackingStart(targets, date, HISTORY_DAYS);
  const main = targets.find((t) => t.kind === "weekly" && t.metric === "minutes" && t.rollup_from && !t.rules.tag);

  const milestoneItems: ProgressData["milestoneItems"] = {};
  for (const t of input.milestoneTasks) {
    if (t.milestone_id) (milestoneItems[t.milestone_id] ??= []).push(t);
  }

  // Weeks that ended before tracking started would only show empty bars.
  const tracked = (points: WeekPoint[]) => points.filter((p) => addDays(p.weekStart, 6) >= since);

  return {
    day,
    history: Object.fromEntries(
      targets.filter((t) => t.kind === "weekly").map((t) => [t.id, tracked(weeklyHistory(t, targets, logs, date, 8))]),
    ),
    studyHistory: main ? { target: main, points: tracked(weeklyHistory(main, targets, logs, date, 12)) } : null,
    milestoneItems,
    comparisons: studyComparisons(targets, logs, since, date),
    habits: habitRates(targets, logs, since, date),
    trackingSince: since,
    vocabAccuracy: reviews.length ? reviews.filter((r) => r.correct).length / reviews.length : null,
    todoSameDay,
  };
}
