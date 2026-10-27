import Link from "next/link";
import { Suspense } from "react";
import { FinishedLog } from "@/components/FinishedLog";
import { QuickAdd } from "@/components/QuickAdd";
import { TaskList } from "@/components/TaskList";
import { getToday, loadTodo } from "@/lib/data";
import { formatDay } from "@/lib/dates";
import { todoStats } from "@/lib/todo";

// Groq calls (verdict, vocab words, quick add) can take 10–20 s; the default limit may be shorter.
export const maxDuration = 60;

const card = "rounded-3xl border border-line bg-card p-5";

export default function TodoPage({ searchParams }: PageProps<"/todo">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-chip" aria-label="Loading to-dos" />}>
      <Todo searchParams={searchParams} />
    </Suspense>
  );
}

async function Todo({ searchParams }: { searchParams: PageProps<"/todo">["searchParams"] }) {
  const date = await getToday();
  const [{ areas, open, finished }, params] = await Promise.all([loadTodo(date), searchParams]);
  const stats = todoStats(open, finished, date);

  const categories = areas.filter((a) => a.for_tasks);
  const cat = typeof params.cat === "string" && categories.some((a) => a.id === params.cat) ? params.cat : null;
  const byCat = <T extends { area_id: string | null }>(list: T[]) => (cat ? list.filter((t) => t.area_id === cat) : list);
  const count = (id: string) => open.filter((t) => t.area_id === id).length + finished.filter((t) => t.area_id === id).length;
  const maxTrend = Math.max(...stats.trend.map((w) => w.rate ?? 0), 0.01);

  return (
    <>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <span className="label">Commitments · {formatDay(date)}</span>
          <h1 className="font-serif text-5xl leading-none italic tracking-tight lg:text-6xl">To-do</h1>
        </div>
        <div className="w-full lg:max-w-xl">
          <QuickAdd date={date} areas={areas} />
        </div>
      </header>

      <section aria-label="Consistency" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Finished same day"
          value={stats.sameDayRate === null ? "—" : `${Math.round(stats.sameDayRate * 100)}%`}
          sub={stats.finishedRecent ? `${stats.sameDay} of ${stats.finishedRecent} · last 30 days` : "Nothing finished yet"}
        />
        <Stat
          label="Avg days to finish"
          value={stats.avgDaysToFinish === null ? "—" : stats.avgDaysToFinish.toFixed(1)}
          sub="Lower is better"
        />
        <Stat label="Open now" value={String(stats.open)} sub={`${stats.carried} carried from earlier days`} />
        <Stat
          label="Oldest open"
          value={stats.oldest ? `${stats.oldest.days} d` : "—"}
          sub={stats.oldest ? stats.oldest.title : "Nothing overdue"}
        />
        <div className={`${card} col-span-2 flex flex-col gap-2 lg:col-span-1`}>
          <span className="label">Same-day trend</span>
          <div className="flex h-10 items-end gap-1.5">
            {stats.trend.map((w, i) => (
              <span
                key={w.weekStart}
                title={`Week of ${formatDay(w.weekStart)}: ${w.rate === null ? "nothing finished" : `${Math.round(w.rate * 100)}% of ${w.finished}`}`}
                className="flex-1 rounded-t-md rounded-b-sm"
                style={{
                  height: w.rate === null ? 4 : Math.max(6, Math.round((w.rate / maxTrend) * 40)),
                  background: w.rate === null ? "var(--chip)" : i === stats.trend.length - 1 ? "var(--accent)" : "color-mix(in srgb, var(--accent) 40%, var(--chip))",
                }}
              />
            ))}
          </div>
          <span className="truncate text-xs text-muted">Last 6 weeks · this week right</span>
        </div>
      </section>

      <nav aria-label="Categories" className="flex flex-wrap gap-2">
        <Link
          href="/todo"
          className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm ${
            cat ? "border-line bg-card" : "border-accent/60 bg-accent-soft text-accent"
          }`}
        >
          All <span className="text-muted">{open.length + finished.length}</span>
        </Link>
        {categories.map((a) => (
          <Link
            key={a.id}
            href={`/todo?cat=${a.id}`}
            className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm ${
              cat === a.id ? "border-accent/60 bg-accent-soft" : "border-line bg-card"
            }`}
          >
            <span className="size-2 rounded-full" style={{ background: a.color }} />
            {a.name} <span className="text-muted">{count(a.id)}</span>
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className={`${card} flex flex-col gap-2 lg:col-span-5`}>
          <div className="flex items-baseline justify-between">
            <span className="label">Open · carries over until done</span>
            <span className="text-sm text-muted">{byCat(open).length}</span>
          </div>
          <TaskList tasks={byCat(open)} date={date} areas={areas} flat showListed showAdd={false} />
        </section>
        <section className={`${card} flex flex-col lg:col-span-7`}>
          <div className="flex items-baseline justify-between">
            <span className="label">Finished log</span>
            {/* A file download, not a page: a plain link is right here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/export/tasks" className="text-sm font-medium text-accent" title="All to-dos as CSV">
              Export CSV
            </a>
          </div>
          <FinishedLog tasks={byCat(finished)} areas={areas} date={date} />
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className={`${card} flex min-w-0 flex-col gap-1`}>
      <span className="label">{label}</span>
      <span className="font-serif text-4xl leading-none">{value}</span>
      <span className="truncate text-xs text-muted">{sub}</span>
    </div>
  );
}
