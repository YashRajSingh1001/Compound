import { createClient } from "@/lib/supabase/server";

// CSV of every to-do with its listed and finished dates. RLS limits it to
// the signed-in user; signed out, the list is simply empty.
const COLUMNS = ["title", "category", "status", "listed_on", "due_date", "finished_on", "est_minutes", "source"] as const;

function cell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in first", { status: 401 });

  const { data, error } = await supabase
    .from("tasks")
    .select("title, status, listed_on, due_date, finished_on, est_minutes, source, areas(name)")
    .is("milestone_id", null)
    .order("listed_on");
  if (error) return new Response(error.message, { status: 500 });

  const rows = (data ?? []).map((t) => {
    const area = t.areas as unknown as { name: string } | null;
    const row: Record<(typeof COLUMNS)[number], unknown> = { ...t, category: area?.name ?? "" };
    return COLUMNS.map((c) => cell(row[c])).join(",");
  });
  return new Response([COLUMNS.join(","), ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="compound-todos.csv"',
    },
  });
}
