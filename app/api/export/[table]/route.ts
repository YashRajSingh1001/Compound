import { createClient } from "@/lib/supabase/server";

// Download your data: /api/export/<table> gives one table as CSV,
// /api/export/all gives every table in one JSON file. RLS limits every
// query to the signed-in user.
export const EXPORT_TABLES = [
  "areas",
  "targets",
  "target_history",
  "target_suggestions",
  "daily_logs",
  "tasks",
  "journal_entries",
  "vocab_words",
  "vocab_reviews",
  "watchlist",
  "verdicts",
] as const;

type Table = (typeof EXPORT_TABLES)[number];

// Oldest first; tables differ in which column records that.
const ORDER_BY: Partial<Record<Table, string>> = { target_history: "id", watchlist: "added_at" };

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[]): string {
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\n");
}

export async function GET(_request: Request, { params }: RouteContext<"/api/export/[table]">) {
  const { table } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in first", { status: 401 });

  const fetchTable = async (name: Table) => {
    const { data, error } = await supabase.from(name).select("*").order(ORDER_BY[name] ?? "created_at");
    if (error) throw new Error(`${name}: ${error.message}`);
    // user_id is the same on every row; leave it out.
    return ((data ?? []) as Record<string, unknown>[]).map((row) => {
      const copy = { ...row };
      delete copy.user_id;
      return copy;
    });
  };

  const stamp = new Date().toISOString().slice(0, 10);
  try {
    if (table === "all") {
      const entries = await Promise.all(EXPORT_TABLES.map(async (name) => [name, await fetchTable(name)] as const));
      const body = JSON.stringify({ exported_at: new Date().toISOString(), tables: Object.fromEntries(entries) }, null, 2);
      return new Response(body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="compound-${stamp}.json"`,
        },
      });
    }
    if (!(EXPORT_TABLES as readonly string[]).includes(table)) return new Response("Unknown table", { status: 404 });
    return new Response(toCsv(await fetchTable(table as Table)), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="compound-${table}-${stamp}.csv"`,
      },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Export failed", { status: 500 });
  }
}
