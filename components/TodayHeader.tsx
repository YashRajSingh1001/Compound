// The bento cards at the top of the Today screen. Server components: they
// only display numbers, the interactive pieces live in their own files.

import Link from "next/link";
import type { WeekDay } from "@/lib/data";
import { addDays, formatDay, formatMinutes, weekdayName } from "@/lib/dates";
import type { WeeklyProgress } from "@/lib/progress";
import { ThemeToggle } from "./ThemeToggle";
import { PaceBadge, ProgressRing } from "./ui";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const card = "rounded-3xl border border-line bg-card p-5";

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .replace(",", " ·");
}

export const dayHref = (date: string, today: string) => (date === today ? "/" : `/?date=${date}`);

function dayTitle(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  return weekdayName(date);
}

export function TodayHeader({
  date,
  today = date,
  showToggle = true,
  navigable = false,
}: {
  date: string;
  today?: string;
  showToggle?: boolean;
  navigable?: boolean;
}) {
  const past = date < today;
  const arrow =
    "flex size-9 items-center justify-center rounded-full border border-line bg-card text-lg leading-none text-muted transition hover:text-foreground";
  return (
    <header className="flex items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="label truncate">{longDate(date)}</span>
        <h1 className="font-serif font-semibold text-5xl leading-none tracking-tight lg:text-6xl">{dayTitle(date, today)}</h1>
        {navigable && (
          <nav aria-label="Change day" className="mt-2 flex items-center gap-2">
            <Link href={dayHref(addDays(date, -1), today)} aria-label="Previous day" className={arrow}>
              ‹
            </Link>
            {past ? (
              <Link href={dayHref(addDays(date, 1), today)} aria-label="Next day" className={arrow}>
                ›
              </Link>
            ) : (
              <span aria-hidden className={`${arrow} opacity-30`}>
                ›
              </span>
            )}
            {past && (
              <Link href="/" className="ml-1 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
                Back to today
              </Link>
            )}
          </nav>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <Link
          href={past ? `/check-in?date=${date}` : "/check-in"}
          className="flex h-11 items-center rounded-full bg-accent px-4 text-sm font-semibold whitespace-nowrap text-on-accent transition active:scale-95 sm:px-5"
        >
          {past ? (
            "Check-in for this day"
          ) : (
            <>
              <span className="hidden sm:inline">Evening&nbsp;</span>
              <span className="sm:hidden">Check-in</span>
              <span className="hidden sm:inline">check-in</span>
            </>
          )}
        </Link>
        {showToggle && (
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        )}
      </div>
    </header>
  );
}

/** Completion ring, what's left, and the line of the day. */
export function HeroCard({ done, total, left, quote }: { done: number; total: number; left: string[]; quote: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const all = total > 0 && done === total;
  return (
    <section className={`${card} flex items-center gap-5 lg:gap-6 lg:px-6`}>
      <ProgressRing value={done} max={total} size={124} stroke={10} color={all ? "var(--good)" : "var(--accent)"}>
        <span className="flex flex-col items-center leading-none">
          <span className="font-serif font-semibold text-4xl">{pct}%</span>
          <span className="label mt-1 !text-[10px]">done</span>
        </span>
      </ProgressRing>
      <div className="flex min-w-0 flex-col gap-2.5">
        <span className="text-sm text-muted">
          {all
            ? "Every non-negotiable done. Green day."
            : done === 0
              ? `0 of ${total} non-negotiables · nothing ticked yet`
              : `${done} of ${total} non-negotiables · ${new Intl.ListFormat("en-GB").format(left)} left`}
        </span>
        <p className="font-serif font-medium text-xl leading-snug lg:text-2xl">
          <span className="text-accent">&ldquo;</span>
          {quote}
        </p>
        <span className="label !text-[10px]">Line of the day</span>
      </div>
    </section>
  );
}

/** Current streak, best streak and this week's seven days. */
export function StreakCard({
  streak,
  best,
  week,
  today,
  realToday,
}: {
  streak: number;
  best: number;
  week: WeekDay[];
  today: string;
  realToday?: string;
}) {
  const toBeat = best - streak;
  return (
    <section className={`${card} flex flex-col gap-2`}>
      <span className="label">Streak</span>
      <div className="flex items-baseline gap-2.5">
        <svg viewBox="0 0 24 24" className="size-7 self-center text-warn" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
          <path d="M12 3c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2 1-4 3-5 0 2 1 3 2 3 0-3 0-5 1-8Z" />
        </svg>
        <span className="font-serif font-semibold text-6xl leading-[0.9]">{streak}</span>
        <span className="text-muted">green {streak === 1 ? "day" : "days"}</span>
      </div>
      <span className="text-sm text-muted">
        {best === 0
          ? realToday && today < realToday
            ? "No green days yet by this day."
            : "A green day today starts one."
          : toBeat > 0 ? `Best: ${best} · ${toBeat} more to beat it` : `Best: ${best} · this is your record`}
      </span>
      <div className="mt-auto grid grid-cols-7 gap-1 pt-2">
        {week.map((day, i) => {
          const isToday = day.date === today;
          const future = day.date > today;
          const full = day.total > 0 && day.done === day.total;
          const dot = (
            <>
              <span className="font-mono text-[11px] text-muted">{LETTERS[i]}</span>
              <span
                className={`size-3 rounded-full ${
                  future ? "bg-chip" : full ? "bg-good" : day.done > 0 ? "bg-warn" : "bg-line"
                } ${isToday ? "outline-2 outline-offset-2 outline-accent" : ""}`}
              />
            </>
          );
          return realToday && day.date <= realToday ? (
            <Link
              key={day.date}
              href={dayHref(day.date, realToday)}
              title={`Open ${formatDay(day.date)}`}
              className="flex flex-col items-center gap-1.5 rounded-lg py-1 transition hover:bg-chip"
            >
              {dot}
            </Link>
          ) : (
            <div key={day.date} className="flex flex-col items-center gap-1.5 py-1" title={formatDay(day.date)}>
              {dot}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The main minutes target (study) with where you should be by tonight. */
export function PaceCard({ main, parts }: { main: WeeklyProgress; parts: WeeklyProgress[] }) {
  const gap = main.actual - main.expected;
  const pct = main.goal ? Math.min((main.actual / main.goal) * 100, 100) : 0;
  const marker = main.goal ? Math.min((main.expected / main.goal) * 100, 100) : 0;
  return (
    <section className={`${card} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="label">{main.target.name} this week</span>
        <PaceBadge status={main.status} />
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-serif font-semibold text-5xl leading-none">{formatMinutes(main.actual)}</span>
        <span className="text-muted">of {formatMinutes(main.goal)}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-chip">
        <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
        <div className="absolute -top-1 h-[18px] w-0.5 rounded bg-foreground" style={{ left: `${marker}%` }} title="Where you should be by tonight" />
      </div>
      <span className="text-sm text-muted">
        Should be {formatMinutes(main.expected)} by tonight ·{" "}
        {Math.abs(gap) < 1 ? "right on it" : gap > 0 ? `${formatMinutes(gap)} ahead` : `${formatMinutes(-gap)} short`}
      </span>
      {parts.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {parts.map((p) => (
            <span key={p.target.id}>
              <span className="text-muted">{p.target.name}</span> {formatMinutes(p.actual)} / {formatMinutes(p.goal)}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

const HEAT_LEVELS = [
  "var(--chip)",
  "color-mix(in srgb, var(--accent) 30%, var(--chip))",
  "color-mix(in srgb, var(--accent) 62%, var(--chip))",
  "var(--accent)",
];

function heatLevel(day: WeekDay): number {
  if (day.total === 0 || day.done === 0) return 0;
  if (day.done === day.total) return 3;
  return day.done / day.total >= 0.5 ? 2 : 1;
}

/** GitHub-style grid of the last weeks: one square per day, darker = more done. */
export function Heatmap({ heat, today, realToday }: { heat: WeekDay[]; today: string; realToday?: string }) {
  const past = heat.filter((d) => d.date <= today && d.total > 0);
  const green = past.filter((d) => d.done === d.total).length;
  const avg = past.length ? Math.round((past.reduce((a, d) => a + d.done / d.total, 0) / past.length) * 100) : 0;
  return (
    <section className={`${card} flex flex-col gap-4`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="label">Last {heat.length / 7} weeks</span>
        <span className="text-sm text-muted">
          {green} green {green === 1 ? "day" : "days"} · {avg}% avg
        </span>
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-[5px]" style={{ gridAutoColumns: "minmax(0, 1fr)" }}>
        {heat.map((day) => {
          const className = `aspect-square rounded-[4px] ${day.date > today ? "opacity-30" : ""} ${
            day.date === today ? "outline-[1.5px] outline-foreground" : ""
          }`;
          const title = `${formatDay(day.date)}${day.date <= today ? ` · ${day.done}/${day.total}` : ""}`;
          return realToday && day.date <= realToday ? (
            <Link
              key={day.date}
              href={dayHref(day.date, realToday)}
              title={`${title} · open`}
              aria-label={`Open ${formatDay(day.date)}`}
              className={`${className} transition hover:outline-[1.5px] hover:outline-accent`}
              style={{ background: HEAT_LEVELS[heatLevel(day)] }}
            />
          ) : (
            <span key={day.date} title={title} className={className} style={{ background: HEAT_LEVELS[heatLevel(day)] }} />
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        Less
        {HEAT_LEVELS.map((bg) => (
          <span key={bg} className="size-3 rounded-[3px]" style={{ background: bg }} />
        ))}
        More
      </div>
    </section>
  );
}
