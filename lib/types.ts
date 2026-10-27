// Row shapes for the tables in supabase/migrations. Kept by hand for now;
// can be swapped for `supabase gen types` output later.

export type Area = {
  id: string;
  name: string;
  color: string;
  sort: number;
  /** Offered as a to-do category. */
  for_tasks?: boolean;
};

export type VocabGroup = { name: string; count: number; brief: string };

export type TargetRules = {
  icon?: string;
  /** Marks the daily vocab target: which word groups to learn, how many each. */
  vocab?: { groups: VocabGroup[] };
  /** Marks the daily journal target: saving an entry ticks it. */
  journal?: boolean;
  weekend_min?: number;
  rest_days_per_week?: number;
  tags?: string[];
  tag?: string;
  exclude_tags?: string[];
  aggregate?: "sum" | "latest";
  progress?: "task_minutes";
  [key: string]: unknown;
};

export type Target = {
  id: string;
  area_id: string | null;
  name: string;
  kind: "daily" | "weekly" | "milestone";
  metric: "bool" | "count" | "minutes";
  target_min: number | null;
  target_max: number | null;
  unit: string | null;
  due_date: string | null;
  rollup_from: string | null;
  rules: TargetRules;
  notes: string | null;
  sort: number;
  created_at?: string;
};

export type Task = {
  id: string;
  title: string;
  area_id: string | null;
  milestone_id: string | null;
  due_date: string | null;
  est_minutes: number | null;
  status: "todo" | "in_progress" | "done" | "skipped";
  notes: string | null;
  sort: number;
  completed_at: string | null;
  /** The day it was added (your timezone); carry-over counts from here. */
  listed_on?: string;
  finished_on?: string | null;
  recurrence?: string | null;
};

export type DailyLog = {
  id: string;
  log_date: string;
  target_id: string;
  value: number;
  tag: string | null;
};

export type Verdict = {
  verdict_date: string;
  text: string;
  model: string;
};

export type VocabWord = {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  part_of_speech: string | null;
  category: string | null;
  learned_on: string;
  box: number;
  next_review: string;
  times_tested: number;
  times_correct: number;
};

export type GradeResult = { wordId: string; correct: boolean; feedback: string; boxAfter?: number };
