import { EXPORT_TABLES } from "@/app/api/export/[table]/route";

const card = "rounded-3xl border border-line bg-card p-5";

const DESCRIPTIONS: Record<(typeof EXPORT_TABLES)[number], string> = {
  areas: "Life areas and to-do categories",
  targets: "Daily, weekly and milestone targets",
  target_history: "Old versions of targets you changed",
  target_suggestions: "Adaptive target suggestions and your answers",
  daily_logs: "Everything you logged, day by day",
  tasks: "To-dos and milestone checklist items",
  journal_entries: "Journal entries",
  vocab_words: "Every vocab word and its review box",
  vocab_reviews: "Every recall answer and its grade",
  watchlist: "Things to watch, read or listen to",
  verdicts: "Daily verdicts and what they were shown",
  ideas: "Ideas with category and why they came up",
  vision_items: "Vision board goals (photos stay in storage)",
};

/** Download everything: one JSON file, or any table as CSV for Excel or pandas. */
export default function ExportPage() {
  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="label">Your data</span>
        <h1 className="font-serif text-5xl leading-none italic tracking-tight lg:text-6xl">Export</h1>
        <p className="max-w-xl text-muted">
          Everything Compound stores is yours. Download it all as one JSON file, or one table at a time as CSV for Excel or pandas.
        </p>
      </header>
      {/* A file download, not a page: a plain link is right here. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/api/export/all"
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-accent font-semibold text-on-accent sm:w-fit sm:px-8"
      >
        Download everything (JSON)
      </a>
      <section className={`${card} grid grid-cols-1 gap-x-6 sm:grid-cols-2`}>
        {EXPORT_TABLES.map((table) => (
          <a key={table} href={`/api/export/${table}`} className="flex items-center justify-between gap-3 border-b border-line py-3">
            <span className="flex flex-col">
              <span className="font-mono text-sm">{table}.csv</span>
              <span className="text-xs text-muted">{DESCRIPTIONS[table]}</span>
            </span>
            <span className="text-sm font-medium text-accent">CSV ↓</span>
          </a>
        ))}
      </section>
    </>
  );
}
