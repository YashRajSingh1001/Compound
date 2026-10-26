import { formatDay } from "@/lib/dates";
import type { WeekDay } from "@/lib/data";
import { ThemeToggle } from "./ThemeToggle";
import { ProgressRing } from "./ui";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** Big serif "Today", the day's completion ring and the theme toggle. */
export function TodayHeader({ date, done, total }: { date: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="label">{longDate(date).replace(",", " ·")}</span>
        <h1 className="font-serif text-6xl leading-none italic tracking-tight">Today</h1>
        <span className="text-sm text-muted">
          {done === total && total > 0 ? "Every non-negotiable done." : `${done} of ${total} non-negotiables done`}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <ProgressRing value={done} max={total} size={72} stroke={5} color={done === total ? "var(--good)" : "var(--accent)"}>
          <span className="flex flex-col items-center leading-none">
            <span className="font-serif text-2xl">{pct}%</span>
            <span className="label !text-[9px] !tracking-[0.1em]">done</span>
          </span>
        </ProgressRing>
        <ThemeToggle />
      </div>
    </header>
  );
}

/** Line of the day between two hairlines. */
export function QuoteLine({ text }: { text: string }) {
  return (
    <figure className="flex gap-3 border-y border-line py-4">
      <span className="font-serif text-4xl leading-none text-accent" aria-hidden>
        &ldquo;
      </span>
      <blockquote className="font-serif text-xl leading-snug italic">{text}</blockquote>
    </figure>
  );
}

/** Mon → Sun with each day's completion, plus the current streak. */
export function WeekStrip({ week, today, streak }: { week: WeekDay[]; today: string; streak: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-3">
      <div className="grid grid-cols-7 gap-1">
        {week.map((day, i) => {
          const isToday = day.date === today;
          const future = day.date > today;
          const full = day.total > 0 && day.done === day.total;
          return (
            <div
              key={day.date}
              className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${
                isToday ? "bg-accent text-on-accent" : future ? "opacity-40" : ""
              }`}
              title={formatDay(day.date)}
            >
              <span className={`label !text-[10px] ${isToday ? "!text-on-accent" : ""}`}>{LETTERS[i]}</span>
              <span className="font-serif text-xl leading-none">{Number(day.date.slice(8))}</span>
              <span
                className={`size-1.5 rounded-full ${
                  full ? (isToday ? "bg-on-accent" : "bg-good") : day.done > 0 ? "bg-warn" : isToday ? "bg-on-accent/40" : "bg-line"
                }`}
                aria-label={future ? undefined : `${day.done} of ${day.total} done`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-line px-2 pt-3 text-sm">
        <span className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            🔥
          </span>
          <span>
            <span className="font-semibold">{streak}-day</span> <span className="text-muted">streak</span>
          </span>
        </span>
        <span className="text-xs text-muted">
          {streak === 0 ? "A green day today starts one." : "Green days in a row. Keep it alive."}
        </span>
      </div>
    </div>
  );
}
