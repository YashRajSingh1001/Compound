// Fake but believable data for the public demo (/demo). Nothing here comes
// from the database: a seeded random generator builds ~18 weeks of history
// for a sample user, ending today, and the real snapshot code turns it into
// screens. The same date always gives the same data.

import { addDays, isWeekend, weekdayIndex } from "./dates";
import { HISTORY_DAYS, type DayInput } from "./snapshot";
import type { Area, DailyLog, Target, Task } from "./types";

function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AREAS: Area[] = [
  { id: "a-study", name: "Study", color: "#6366f1", sort: 0, for_tasks: true },
  { id: "a-fitness", name: "Fitness", color: "#22c55e", sort: 1 },
  { id: "a-vocab", name: "Vocab", color: "#f59e0b", sort: 2 },
  { id: "a-journal", name: "Journal", color: "#f43f5e", sort: 3 },
  { id: "a-content", name: "Content", color: "#ec4899", sort: 4, for_tasks: true },
  { id: "a-news", name: "Tech news", color: "#0ea5e9", sort: 5 },
  { id: "a-personal", name: "Personal", color: "#14b8a6", sort: 6, for_tasks: true },
  { id: "a-work", name: "Work", color: "#c08a3e", sort: 7, for_tasks: true },
];

function targets(created: string): Target[] {
  const base = { target_max: null, due_date: null, rollup_from: null, notes: null, created_at: `${created}T00:00:00Z` };
  const t = (o: Partial<Target> & Pick<Target, "id" | "name" | "kind" | "metric" | "area_id">, sort: number): Target => ({
    ...base,
    target_min: null,
    unit: null,
    rules: {},
    sort,
    ...o,
  });
  return [
    t({ id: "study", area_id: "a-study", name: "Study block", kind: "daily", metric: "minutes", target_min: 90, unit: "min", rules: { icon: "📚", weekend_min: 150 } }, 0),
    t({ id: "workout", area_id: "a-fitness", name: "Workout", kind: "daily", metric: "bool", rules: { icon: "🏋️", rest_days_per_week: 1, tags: ["gym", "run", "rest"] } }, 1),
    t({ id: "vocab", area_id: "a-vocab", name: "Vocab", kind: "daily", metric: "bool", rules: { icon: "🔤", vocab: { groups: [{ name: "Tech & data", count: 5, brief: "" }, { name: "Professional English", count: 5, brief: "" }] } } }, 2),
    t({ id: "journal", area_id: "a-journal", name: "Journal", kind: "daily", metric: "bool", rules: { icon: "✍️", journal: true } }, 3),
    t({ id: "study-week", area_id: "a-study", name: "Study hours", kind: "weekly", metric: "minutes", target_min: 750, unit: "min", rollup_from: "study", rules: { icon: "⏱️" } }, 4),
    t({ id: "genai", area_id: "a-study", name: "GenAI cert", kind: "weekly", metric: "minutes", target_min: 450, unit: "min", rollup_from: "study", rules: { icon: "🤖", tag: "genai" } }, 5),
    t({ id: "pytorch", area_id: "a-study", name: "PyTorch", kind: "weekly", metric: "minutes", target_min: 300, unit: "min", rollup_from: "study", rules: { icon: "🔥", tag: "pytorch" } }, 6),
    t({ id: "workouts", area_id: "a-fitness", name: "Workouts", kind: "weekly", metric: "count", target_min: 6, unit: "sessions", rollup_from: "workout", rules: { icon: "💪", exclude_tags: ["rest"] } }, 7),
    t({ id: "gym", area_id: "a-fitness", name: "Gym", kind: "weekly", metric: "count", target_min: 4, target_max: 5, unit: "sessions", rollup_from: "workout", rules: { icon: "🏋️", tag: "gym" } }, 8),
    t({ id: "run", area_id: "a-fitness", name: "Running", kind: "weekly", metric: "count", target_min: 1, target_max: 2, unit: "runs", rollup_from: "workout", rules: { icon: "🏃", tag: "run" } }, 9),
    t({ id: "reels", area_id: "a-content", name: "Reels", kind: "weekly", metric: "count", target_min: 3, unit: "reels", rules: { icon: "🎬" } }, 10),
    t({ id: "news", area_id: "a-news", name: "Tech news", kind: "weekly", metric: "count", target_min: 5, unit: "days", rules: { icon: "📰" } }, 11),
    t({ id: "cert", area_id: "a-study", name: "Cloud ML certification", kind: "milestone", metric: "minutes", unit: "min", rules: { icon: "🧱", progress: "task_minutes" } }, 12),
    t({ id: "course", area_id: "a-study", name: "Deep learning course", kind: "milestone", metric: "minutes", unit: "min", rules: { icon: "🔥", progress: "task_minutes" } }, 13),
    t({ id: "followers", area_id: "a-content", name: "2,000 followers", kind: "milestone", metric: "count", target_min: 2000, unit: "followers", rules: { icon: "📈", aggregate: "latest" } }, 14),
  ];
}

function task(id: string, title: string, extra: Partial<Task>): Task {
  return {
    id,
    title,
    area_id: null,
    milestone_id: null,
    due_date: null,
    est_minutes: null,
    status: "todo",
    notes: null,
    sort: 0,
    completed_at: null,
    ...extra,
  };
}

export function demoInput(date: string): DayInput {
  const rand = random(Number(date.replace(/-/g, "")));
  const start = addDays(date, -HISTORY_DAYS + 1);
  const all = targets(start).map((t) =>
    t.id === "cert" ? { ...t, due_date: addDays(date, 21) } : t.id === "course" ? { ...t, due_date: addDays(date, 40) } : t.id === "followers" ? { ...t, due_date: addDays(date, 64) } : t,
  );
  const logs: DailyLog[] = [];
  let n = 0;
  const log = (day: string, target: string, value: number, tag: string | null = null) =>
    logs.push({ id: `l${n++}`, log_date: day, target_id: target, value, tag });

  for (let i = 0; i < HISTORY_DAYS; i++) {
    const day = addDays(start, i);
    const isToday = day === date;
    // The last six days are all green, so the demo shows a live streak.
    const streakDay = day >= addDays(date, -6) && !isToday;
    const weekend = isWeekend(day);

    // Study: most days, longer at weekends, split between two courses.
    if (isToday) log(day, "study", 60, "genai");
    else if (streakDay || rand() < (weekend ? 0.8 : 0.88)) {
      // Streak days clear the daily minimum; other days hover around it.
      const total = streakDay
        ? (weekend ? 155 : 95) + Math.round(rand() * 40)
        : weekend
          ? 120 + Math.round(rand() * 60)
          : 65 + Math.round(rand() * 55);
      const genai = Math.round((total * (0.5 + rand() * 0.2)) / 5) * 5;
      log(day, "study", genai, "genai");
      log(day, "study", total - genai, "pytorch");
    }

    // Workout: Sunday rest, otherwise gym or a run, the odd day skipped.
    if (weekdayIndex(day) === 6) log(day, "workout", 1, "rest");
    else if (isToday || streakDay || rand() < 0.88) log(day, "workout", 1, rand() < 0.72 || isToday ? "gym" : "run");

    if (isToday || streakDay || rand() < 0.9) log(day, "vocab", 1, "auto");
    if (!isToday && (streakDay || rand() < 0.76)) log(day, "journal", 1, "auto");
    // Reels lag behind (about half the goal), so the demo shows a "lower it" suggestion.
    if (rand() < 0.22) log(day, "reels", 1);
    if (isToday || rand() < 0.72) log(day, "news", 1);
  }

  // Followers: a weekly count creeping up.
  const latestLogs: DailyLog[] = [{ id: "f-latest", log_date: addDays(date, -2), target_id: "followers", value: 1240, tag: null }];

  const minutes = (lecture: number, reading: number) => ({ est_minutes: lecture + reading, notes: reading ? `${lecture} min lecture + ${reading} min reading` : null });
  const certSections: [string, number, number][] = [
    ["Foundations", 45, 45],
    ["Data preparation", 91, 50],
    ["Model training at scale", 191, 50],
    ["Feature stores", 34, 20],
    ["Retrieval and RAG", 147, 50],
    ["Agents and tools", 54, 45],
    ["Monitoring and tracing", 81, 50],
    ["Practice exam", 150, 0],
  ];
  const milestoneTasks: Task[] = [
    ...certSections.map(([title, l, r], i) =>
      task(`c${i}`, title, { milestone_id: "cert", sort: i, status: i < 4 ? "done" : i === 4 ? "in_progress" : "todo", ...minutes(l, r) }),
    ),
    ...["Tensors", "Training loops", "Classification", "Computer vision", "Custom datasets", "Packaging code"].map((title, i) =>
      task(`d${i}`, `${String(i).padStart(2, "0")} — ${title}`, {
        milestone_id: "course",
        sort: i,
        est_minutes: 360,
        status: i < 2 ? "done" : i === 2 ? "in_progress" : "todo",
      }),
    ),
  ];

  const tasks: Task[] = [
    task("t1", "Renew car insurance", { area_id: "a-personal", listed_on: addDays(date, -3), due_date: addDays(date, -3) }),
    task("t2", "Send project update to the team", { area_id: "a-work", listed_on: addDays(date, -1), due_date: addDays(date, -1) }),
    task("t3", "Script next reel: RAG in 60 seconds", { area_id: "a-content", listed_on: date, due_date: date }),
    task("t4", "Book dentist appointment", { area_id: "a-personal", listed_on: date, due_date: date, status: "done", finished_on: date }),
  ];

  return {
    date,
    areas: AREAS,
    targets: all,
    logs,
    latestLogs,
    tasks,
    milestoneTasks,
    decidedThisWeek: [],
    vocabLearned: 10,
    vocabDue: 0,
    journalText: "",
    verdict: {
      verdict_date: date,
      model: "demo",
      text: "Not a green day yet: Workout and Vocab are done, Study block and Journal are still open. Study is 30 m short of tonight's pace with four days left in the week. Finish 30 minutes of the course tonight and write three lines before bed to keep the six-day streak alive.",
    },
  };
}
