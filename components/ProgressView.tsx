// The Progress screen: the week target by target, milestones with their full
// checklists, and insights. Pure display; the real page and the public demo
// both render it with their own data.

import { formatDay, formatMinutes } from "@/lib/dates";
import type { Comparison, WeekPoint } from "@/lib/insights";
import type { DaySnapshot } from "@/lib/snapshot";
import type { Target, Task } from "@/lib/types";
import { MilestoneChecklist } from "./MilestoneChecklist";
import { Heatmap } from "./TodayHeader";
import { IconBubble, PaceBadge, ProgressBar } from "./ui";

const card = "rounded-3xl border border-line bg-card p-5";

export type ProgressData = {
  day: DaySnapshot;
  history: Record<string, WeekPoint[]>;
  /** Longer history of the headline minutes target, for the big chart. */
  studyHistory: { target: Target; points: WeekPoint[] } | null;
  milestoneItems: Record<string, Task[]>;
  comparisons: Comparison[];
  habits: { target: Target; done: number; days: number; rate: number }[];
  trackingSince: string;
  vocabAccuracy: number | null;
  todoSameDay: number | null;
};

const amount = (t: Target, n: number) => (t.metric === "minutes" ? formatMinutes(n) : `${Math.round(n * 10) / 10}`);

function MiniBars({ points, color }: { points: WeekPoint[]; color?: string }) {
  return (
    <div className="flex h-10 items-end gap-1" aria-hidden>
      {points.map((p) => (
        <span
          key={p.weekStart}
          title={`Week of ${formatDay(p.weekStart)}: ${Math.round(p.share * 100)}%`}
          className={`flex-1 rounded-t-[3px] ${p.current ? "opacity-60" : ""}`}
          style={{
            height: `${Math.max(Math.min(p.share, 1.25) * 32, p.actual > 0 ? 3 : 2)}px`,
            background: p.share >= 1 ? "var(--good)" : p.actual > 0 ? (color ?? "var(--accent)") : "var(--chip)",
          }}
        />
      ))}
    </div>
  );
}

function StudyChart({ target, points }: { target: Target; points: WeekPoint[] }) {
  const goal = target.target_min ?? 0;
  const max = Math.max(goal * 1.25, ...points.map((p) => p.actual), 1);
  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex h-40 items-end gap-2">
        <div
          className="absolute inset-x-0 border-t border-dashed border-muted/60"
          style={{ bottom: `${(goal / max) * 100}%` }}
          aria-hidden
        />
        {points.map((p) => (
          <div key={p.weekStart} className="flex h-full flex-1 flex-col justify-end" title={`Week of ${formatDay(p.weekStart)}: ${formatMinutes(p.actual)}`}>
            <div
              className={`rounded-t-md ${p.current ? "opacity-60" : ""}`}
              style={{ height: `${(p.actual / max) * 100}%`, minHeight: p.actual ? 4 : 2, background: p.actual >= goal ? "var(--good)" : "var(--accent)" }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 text-[10px] text-muted">
        {points.map((p, i) => (
          <span key={p.weekStart} className="flex-1 text-center">
            {i % 2 === points.length % 2 || p.current ? formatDay(p.weekStart).slice(4) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProgressView({ data, readOnly = false }: { data: ProgressData; readOnly?: boolean }) {
  const { day } = data;
  const color = (areaId: string | null) => day.areas.find((a) => a.id === areaId)?.color;
  const pastDays = day.heat.filter((d) => d.total > 0 && d.date >= data.trackingSince);
  const greenRate = pastDays.length ? pastDays.filter((d) => d.done === d.total).length / pastDays.length : null;
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="label">Since {formatDay(data.trackingSince)} · this week and beyond</span>
        <h1 className="font-serif text-5xl leading-none italic tracking-tight lg:text-6xl">Progress</h1>
      </header>

      <section aria-label="Highlights" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Green days", value: pct(greenRate), sub: `${pastDays.filter((d) => d.done === d.total).length} of ${pastDays.length} days` },
          { label: "Streak", value: String(day.streak), sub: `Best ${day.bestStreak}` },
          { label: "Vocab accuracy", value: pct(data.vocabAccuracy), sub: "Daily recall tests" },
          { label: "To-dos same day", value: pct(data.todoSameDay), sub: "Last 30 days" },
          ...data.habits.slice(0, 1).map((h) => ({ label: `${h.target.name} rate`, value: pct(h.rate), sub: `${h.done} of ${h.days} days` })),
        ].map((s) => (
          <div key={s.label} className={`${card} flex flex-col gap-1`}>
            <span className="label">{s.label}</span>
            <span className="font-serif text-4xl leading-none">{s.value}</span>
            <span className="text-xs text-muted">{s.sub}</span>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className={`${card} flex flex-col gap-1 lg:col-span-7`}>
          <div className="flex items-baseline justify-between">
            <span className="label mb-2">This week, target by target</span>
            <span className="text-xs text-muted">bars: last 8 weeks</span>
          </div>
          {day.weekly.map((w) => (
            <div key={w.target.id} className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-4 border-t border-line py-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <span aria-hidden>{w.target.rules.icon}</span>
                    <span className="truncate">{w.target.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-muted">
                    {amount(w.target, w.actual)} / {amount(w.target, w.goal)}
                    <PaceBadge status={w.status} />
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-chip">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min((w.actual / (w.goal || 1)) * 100, 100)}%`, background: color(w.target.area_id) ?? "var(--accent)" }}
                  />
                  <div
                    className="absolute -top-0.5 h-3 w-0.5 rounded bg-foreground"
                    style={{ left: `${Math.min((w.expected / (w.goal || 1)) * 100, 100)}%` }}
                    title={`Should be ${amount(w.target, w.expected)} by tonight`}
                  />
                </div>
                <span className="text-xs text-muted">
                  Should be {amount(w.target, w.expected)} by tonight · {w.daysLeft} {w.daysLeft === 1 ? "day" : "days"} left
                </span>
              </div>
              <MiniBars points={data.history[w.target.id] ?? []} color={color(w.target.area_id)} />
            </div>
          ))}
        </section>

        <div className="flex flex-col gap-4 lg:col-span-5">
          {data.studyHistory && (
            <section className={`${card} flex flex-col gap-3`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="label">{data.studyHistory.target.name} · last 12 weeks</span>
                <span className="text-xs text-muted">- - - goal {formatMinutes(data.studyHistory.target.target_min ?? 0)}</span>
              </div>
              <StudyChart target={data.studyHistory.target} points={data.studyHistory.points} />
            </section>
          )}
          {data.comparisons.length > 0 && (
            <section className={`${card} flex flex-col gap-4`}>
              <span className="label">Patterns</span>
              {data.comparisons.map((c) => {
                const max = Math.max(c.a.avg, c.b.avg, 1);
                return (
                  <div key={c.label} className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    {[c.a, c.b].map((side) => (
                      <div key={side.name} className="grid grid-cols-[110px_minmax(0,1fr)_64px] items-center gap-2 text-xs">
                        <span className="text-muted">{side.name}</span>
                        <div className="h-2.5 rounded-full bg-chip">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${(side.avg / max) * 100}%` }} />
                        </div>
                        <span className="text-right">{formatMinutes(side.avg)}/day</span>
                      </div>
                    ))}
                    <span className="text-[11px] text-muted">
                      Average per day · {c.a.days} vs {c.b.days} days
                    </span>
                  </div>
                );
              })}
            </section>
          )}
        </div>

        <section className={`${card} flex flex-col gap-3 lg:col-span-12`}>
          <span className="label">Milestones</span>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {day.milestones.map((m) => {
              const pctDone = m.total ? Math.round((m.done / m.total) * 100) : 0;
              const items = data.milestoneItems[m.target.id] ?? [];
              return (
                <div key={m.target.id} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <IconBubble icon={m.target.rules.icon} name={m.target.name} color={color(m.target.area_id)} size={40} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-semibold">{m.target.name}</span>
                      <span className="text-xs text-muted">
                        {m.target.due_date ? `Due ${formatDay(m.target.due_date)} · ${m.daysLeft} days left` : "No due date"}
                      </span>
                    </div>
                    <span className="font-serif text-3xl leading-none">{pctDone}%</span>
                  </div>
                  <ProgressBar value={m.done} max={m.total} color={color(m.target.area_id)} />
                  <span className="text-xs text-muted">
                    {m.mode === "tasks"
                      ? `${formatMinutes(m.done)} of ${formatMinutes(m.total)}`
                      : `${m.done.toLocaleString()} of ${m.total.toLocaleString()} ${m.target.unit ?? ""}`}
                    {m.perDayNeeded ? ` · needs ${formatMinutes(m.perDayNeeded)}/day` : ""}
                    {m.perWeekNeeded ? ` · needs +${Math.ceil(m.perWeekNeeded)}/week` : ""}
                  </span>
                  {items.length > 0 &&
                    (readOnly ? (
                      <ol className="flex flex-col">
                        {items.map((t) => (
                          <li key={t.id} className="flex items-center gap-3 border-t border-line py-2.5 text-sm">
                            <span className={`size-3 rounded-full ${t.status === "done" ? "bg-good" : t.status === "in_progress" ? "bg-accent" : "bg-line"}`} />
                            <span className={`flex-1 ${t.status === "done" ? "text-muted line-through" : ""}`}>{t.title}</span>
                            <span className="text-xs text-muted">{formatMinutes(t.est_minutes ?? 0)}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <MilestoneChecklist items={items} color={color(m.target.area_id)} />
                    ))}
                </div>
              );
            })}
          </div>
        </section>

        <div className="lg:col-span-7">
          <Heatmap heat={day.heat} today={day.date} />
        </div>
        <section className={`${card} flex flex-col gap-3 lg:col-span-5`}>
          <span className="label">Non-negotiables since {formatDay(data.trackingSince)}</span>
          {data.habits.map((h) => (
            <div key={h.target.id} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span aria-hidden>{h.target.rules.icon}</span>
                  {h.target.name}
                </span>
                <span className="text-muted">
                  {h.done}/{h.days} · {pct(h.rate)}
                </span>
              </div>
              <ProgressBar value={h.rate} max={1} color={color(h.target.area_id)} />
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
