/**
 * Seeds your current areas, targets and milestone checklists.
 *
 *   npm run seed            first-time seed (refuses if data already exists)
 *   npm run seed -- --reset wipe areas/targets/tasks and seed again
 *                           (refuses once you have real daily logs)
 *
 * After seeding, everything here is editable in the app — this file is only
 * the starting point, not the source of truth.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_USER_EMAIL;

if (!url || !serviceKey || !email) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SEED_USER_EMAIL in .env.local",
  );
  process.exit(1);
}

// The service role key skips RLS, so every insert below sets user_id explicitly.
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

// for_tasks: shows up as a to-do category.
const AREAS = [
  { key: "study", name: "Study", color: "#6366f1", for_tasks: true },
  { key: "fitness", name: "Fitness", color: "#22c55e", for_tasks: false },
  { key: "vocab", name: "Vocab", color: "#f59e0b", for_tasks: false },
  { key: "journal", name: "Journal", color: "#f43f5e", for_tasks: false },
  { key: "content", name: "Content", color: "#ec4899", for_tasks: true },
  { key: "news", name: "Tech news", color: "#0ea5e9", for_tasks: false },
  { key: "personal", name: "Personal", color: "#14b8a6", for_tasks: true },
  { key: "work", name: "Work", color: "#c08a3e", for_tasks: true },
  { key: "health", name: "Health", color: "#65a30d", for_tasks: true },
  { key: "errands", name: "Errands", color: "#f97316", for_tasks: true },
] as const;

type AreaKey = (typeof AREAS)[number]["key"];

type TargetSeed = {
  key: string;
  area: AreaKey;
  name: string;
  kind: "daily" | "weekly" | "milestone";
  metric: "bool" | "count" | "minutes";
  target_min?: number;
  target_max?: number;
  unit?: string;
  due_date?: string;
  rollup_from?: string; // key of another target in this list
  rules?: Record<string, unknown>;
  notes?: string;
};

const TARGETS: TargetSeed[] = [
  // Daily non-negotiables — a day is green when all are done.
  {
    key: "study_daily", area: "study", name: "Study block", kind: "daily", metric: "minutes",
    target_min: 90, unit: "min", rules: { icon: "📚", weekend_min: 150 },
  },
  {
    key: "workout_daily", area: "fitness", name: "Workout", kind: "daily", metric: "bool",
    rules: { icon: "🏋️", rest_days_per_week: 1, tags: ["gym", "run", "rest"] },
  },
  {
    key: "vocab_daily", area: "vocab", name: "Vocab", kind: "daily", metric: "bool",
    rules: {
      icon: "🔤",
      // Words per day, by group. Groq picks them; the recall test is the next day.
      vocab: {
        groups: [
          {
            name: "Tech & data",
            count: 5,
            brief:
              "Terms from AI, machine learning, statistics, data science and data engineering that a working data scientist should be able to explain clearly in an interview.",
          },
          {
            name: "Professional English",
            count: 5,
            brief:
              "Advanced English for work and life: words that make emails, meetings, presentations and writing sharper. Real vocabulary, not business jargon or buzzwords.",
          },
        ],
      },
    },
  },
  {
    key: "journal_daily", area: "journal", name: "Journal", kind: "daily", metric: "bool",
    rules: { icon: "✍️" },
  },

  // Weekly targets.
  {
    key: "study_weekly", area: "study", name: "Study hours", kind: "weekly", metric: "minutes",
    target_min: 750, unit: "min", rollup_from: "study_daily",
    notes: "5 × 90 min + 2 × 150 min",
    rules: { icon: "⏱️" },
  },
  {
    key: "study_genai", area: "study", name: "GenAI cert", kind: "weekly", metric: "minutes",
    target_min: 450, unit: "min", rollup_from: "study_daily", rules: { icon: "🤖", tag: "genai" },
  },
  {
    key: "study_pytorch", area: "study", name: "PyTorch", kind: "weekly", metric: "minutes",
    target_min: 300, unit: "min", rollup_from: "study_daily", rules: { icon: "🔥", tag: "pytorch" },
    notes: "Gets all 750 min once the GenAI course is done",
  },
  {
    key: "workouts_weekly", area: "fitness", name: "Workouts", kind: "weekly", metric: "count",
    target_min: 6, unit: "sessions", rollup_from: "workout_daily",
    rules: { icon: "💪", exclude_tags: ["rest"] },
  },
  {
    key: "gym_weekly", area: "fitness", name: "Gym", kind: "weekly", metric: "count",
    target_min: 4, target_max: 5, unit: "sessions", rollup_from: "workout_daily",
    rules: { icon: "🏋️", tag: "gym" },
  },
  {
    key: "run_weekly", area: "fitness", name: "Running", kind: "weekly", metric: "count",
    target_min: 1, target_max: 2, unit: "runs", rollup_from: "workout_daily",
    rules: { icon: "🏃", tag: "run" },
  },
  {
    key: "reels_weekly", area: "content", name: "Reels on @yashraj.decodes", kind: "weekly",
    metric: "count", target_min: 3, unit: "reels",
    rules: { icon: "🎬" },
  },
  {
    key: "news_weekly", area: "news", name: "Tech news", kind: "weekly", metric: "count",
    target_min: 5, unit: "days", rules: { icon: "📰", minutes_per_day: 10 },
    notes: "ReadKernel counts",
  },

  // Milestones.
  {
    key: "databricks", area: "study", name: "Databricks GenAI Engineer Associate",
    kind: "milestone", metric: "minutes", unit: "min", due_date: "2026-11-17",
    rules: { icon: "🧱", progress: "task_minutes" },
    notes: "Udemy: Databricks Generative AI Engineer Associate Exam Prep. Date = course target; exam TBD (proposed: last week of Nov 2026).",
  },
  {
    key: "pytorch", area: "study", name: "PyTorch through section 05", kind: "milestone",
    metric: "minutes", unit: "min", due_date: "2026-12-05",
    rules: { icon: "🔥", progress: "task_minutes" },
    notes: "learnpytorch.io. Target ~early Dec 2026.",
  },
  {
    key: "instagram", area: "content", name: "2,000 followers on @yashraj.decodes",
    kind: "milestone", metric: "count", target_min: 2000, unit: "followers",
    due_date: "2026-12-31", rules: { icon: "📈", aggregate: "latest", log_every: "week" },
  },
];

// Milestone checklists. est_minutes = lecture + reading buffer.
const CHECKLISTS: Record<string, { title: string; lecture: number; reading: number; status?: string }[]> = {
  databricks: [
    { title: "Section 3", lecture: 45, reading: 45 },
    { title: "Section 4", lecture: 91, reading: 50 },
    { title: "Section 5 — GenAI primer & fundamentals", lecture: 191, reading: 50 },
    { title: "Section 6 — AI/BI Genie", lecture: 14, reading: 20 },
    { title: "Section 7 — RAG using enterprise data", lecture: 147, reading: 50 },
    { title: "Section 8 — AI agents using LangChain", lecture: 54, reading: 45 },
    { title: "Section 9 — MLflow tracing & prompt registry", lecture: 81, reading: 50 },
    { title: "Section 10 — Agent Bricks ecosystem", lecture: 83, reading: 50 },
    { title: "Section 11 — MCP servers & AI Gateway", lecture: 41, reading: 45 },
    { title: "Section 12 — Agent memory", lecture: 34, reading: 45 },
    { title: "Section 13 — Practice test", lecture: 150, reading: 0 },
  ],
  pytorch: [
    { title: "00 — PyTorch fundamentals", lecture: 360, reading: 0, status: "done" },
    { title: "01 — PyTorch workflow", lecture: 360, reading: 0, status: "in_progress" },
    { title: "02 — Neural network classification", lecture: 360, reading: 0 },
    { title: "03 — Computer vision", lecture: 360, reading: 0 },
    { title: "04 — Custom datasets", lecture: 360, reading: 0 },
    { title: "05 — Going modular", lecture: 360, reading: 0 },
  ],
};

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

async function findUserId(): Promise<string> {
  // Fine for a personal project: there is only one user.
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email!.toLowerCase());
  if (!user) {
    throw new Error(`No Supabase Auth user with email ${email}. Create it first (see README).`);
  }
  return user.id;
}

async function must<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}

async function main() {
  const reset = process.argv.includes("--reset");
  const userId = await findUserId();

  const existing = await must(db.from("areas").select("id").eq("user_id", userId));
  if (existing.length > 0) {
    if (!reset) {
      console.log("Already seeded. Run `npm run seed -- --reset` to wipe and re-seed.");
      return;
    }
    const logs = await must(db.from("daily_logs").select("id").eq("user_id", userId).limit(1));
    if (logs.length > 0) {
      throw new Error("Refusing to reset: you already have daily logs. Edit targets in the app instead.");
    }
    // Targets cascade to tasks that belong to milestones; delete the rest explicitly.
    await must(db.from("tasks").delete().eq("user_id", userId));
    await must(db.from("targets").delete().eq("user_id", userId));
    await must(db.from("areas").delete().eq("user_id", userId));
    console.log("Wiped areas, targets and tasks.");
  }

  // Areas
  const areaRows = await must(
    db
      .from("areas")
      .insert(AREAS.map((a, i) => ({ user_id: userId, name: a.name, color: a.color, for_tasks: a.for_tasks, sort: i })))
      .select("id, name"),
  );
  const areaId = (key: AreaKey) =>
    areaRows.find((r) => r.name === AREAS.find((a) => a.key === key)!.name)!.id;

  // Targets — insert without rollup_from first, since it points at other rows.
  const targetIds: Record<string, string> = {};
  for (const [i, t] of TARGETS.entries()) {
    const row = await must<{ id: string }>(
      db
        .from("targets")
        .insert({
          user_id: userId,
          area_id: areaId(t.area),
          name: t.name,
          kind: t.kind,
          metric: t.metric,
          target_min: t.target_min ?? null,
          target_max: t.target_max ?? null,
          unit: t.unit ?? null,
          due_date: t.due_date ?? null,
          rules: t.rules ?? {},
          notes: t.notes ?? null,
          sort: i,
        })
        .select("id")
        .single(),
    );
    targetIds[t.key] = row.id;
  }
  for (const t of TARGETS.filter((t) => t.rollup_from)) {
    await must(
      db.from("targets").update({ rollup_from: targetIds[t.rollup_from!] }).eq("id", targetIds[t.key]),
    );
  }

  // Milestone checklists
  for (const [milestoneKey, items] of Object.entries(CHECKLISTS)) {
    const milestone = TARGETS.find((t) => t.key === milestoneKey)!;
    await must(
      db.from("tasks").insert(
        items.map((item, i) => ({
          user_id: userId,
          title: item.title,
          area_id: areaId(milestone.area),
          milestone_id: targetIds[milestoneKey],
          est_minutes: item.lecture + item.reading,
          status: item.status ?? "todo",
          completed_at: item.status === "done" ? new Date().toISOString() : null,
          source: "seed",
          notes: item.reading ? `${item.lecture} min lecture + ${item.reading} min reading` : null,
          sort: i,
        })),
      ),
    );
  }

  const total = (key: string) =>
    CHECKLISTS[key].reduce((sum, item) => sum + item.lecture + item.reading, 0);
  console.log(`Seeded ${AREAS.length} areas and ${TARGETS.length} targets.`);
  console.log(`Databricks checklist: ${CHECKLISTS.databricks.length} sections, ${(total("databricks") / 60).toFixed(1)} h`);
  console.log(`PyTorch checklist: ${CHECKLISTS.pytorch.length} sections, ${(total("pytorch") / 60).toFixed(1)} h`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
