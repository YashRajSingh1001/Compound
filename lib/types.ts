// Row shapes for the tables in supabase/migrations. Kept by hand for now;
// can be swapped for `supabase gen types` output later.

export type Area = {
  id: string;
  name: string;
  color: string;
  sort: number;
};

export type TargetRules = {
  icon?: string;
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
