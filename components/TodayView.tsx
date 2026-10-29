import Link from "next/link";
import { signOut } from "@/app/login/actions";
import type { DaySnapshot } from "@/lib/snapshot";
import type { VisionCardData } from "@/lib/vision";
import { formatMinutes } from "@/lib/dates";
import { lineOfTheDay } from "@/lib/quotes";
import { tileLink } from "@/lib/tile-links";
import { DailyTile } from "./DailyTile";
import { SuggestionsCard } from "./SuggestionsCard";
import { TaskList } from "./TaskList";
import { HeroCard, Heatmap, PaceCard, StreakCard, TodayHeader } from "./TodayHeader";
import { IconBubble, ProgressBar } from "./ui";
import { VerdictCard } from "./VerdictCard";
import { VisionBanner } from "./VisionBanner";
import { WeekRow } from "./WeekRow";

// Bento grid: 12 columns on laptops, one column on phones. `order` puts the
// tap targets right under the header on a phone.
const card = "rounded-3xl border border-line bg-card p-5";

/**
 * The Today screen for one day's snapshot. No data fetching, so the public
 * demo can render it with generated data.
 */
export function TodayView({
  day,
  demo = false,
  vision = null,
}: {
  day: DaySnapshot;
  demo?: boolean;
  /** Today's rotating vision board card, if there is one. */
  vision?: VisionCardData | null;
}) {
  const color = (areaId: string | null) => day.areas.find((a) => a.id === areaId)?.color;
  const done = day.daily.filter((d) => d.done);
  const left = day.daily.filter((d) => !d.done).map((d) => d.target.name);

  // The headline pace card: the first weekly minutes target that adds up a
  // daily target without a tag filter (Study hours), plus its tagged parts.
  const main = day.weekly.find((w) => w.target.metric === "minutes" && w.target.rollup_from && !w.target.rules.tag);
  const parts = main ? day.weekly.filter((w) => w.target.rollup_from === main.target.rollup_from && w.target.rules.tag) : [];
  const weekRows = day.weekly.filter((w) => w !== main && !parts.includes(w));
  const openTasks = day.tasks.filter((t) => t.status !== "done").length;

  return (
    <>
      <TodayHeader date={day.date} showToggle={!demo} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="order-1 lg:col-span-5">
          <HeroCard done={done.length} total={day.daily.length} left={left} quote={lineOfTheDay(day.date)} />
        </div>
        <div className="order-3 lg:order-2 lg:col-span-3">
          <StreakCard streak={day.streak} best={day.bestStreak} week={day.week} today={day.date} />
        </div>
        {main && (
          <div className="order-4 lg:order-3 lg:col-span-4">
            <PaceCard main={main} parts={parts} />
          </div>
        )}

        {day.suggestions.length > 0 && (
          <div className="order-3 lg:order-4 lg:col-span-12">
            <SuggestionsCard suggestions={day.suggestions} />
          </div>
        )}

        <section
          aria-label="Non-negotiables"
          className="order-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:order-4 lg:col-span-12 xl:grid-cols-4"
        >
          {day.daily.map((status, i) => (
            <DailyTile key={status.target.id} status={status} color={color(status.target.area_id)} index={i} {...tileLink(status.target, day)} />
          ))}
        </section>

        {vision && (
          <div className="order-3 lg:order-4 lg:col-span-12">
            <VisionBanner item={vision} today={day.date} />
          </div>
        )}

        <div className="order-8 lg:order-5 lg:col-span-5">
          <Heatmap heat={day.heat} today={day.date} />
        </div>

        <section className={`${card} order-5 flex flex-col gap-4 lg:order-6 lg:col-span-4`}>
          <span className="label">This week</span>
          {weekRows.map((w) => (
            <WeekRow key={w.target.id} progress={w} date={day.date} color={color(w.target.area_id)} />
          ))}
        </section>

        <section className={`${card} order-6 flex flex-col gap-2 lg:order-7 lg:col-span-3`}>
          <div className="flex items-baseline justify-between">
            <span className="label">To-do</span>
            <Link href="/todo" className="text-sm font-medium text-accent">
              {openTasks} open →
            </Link>
          </div>
          <TaskList tasks={day.tasks} date={day.date} areas={day.areas} flat />
        </section>

        {day.milestones.length > 0 && (
          <section className={`${card} order-7 flex flex-col gap-1 lg:order-8 lg:col-span-7`}>
            <span className="label mb-2">Milestones</span>
            {day.milestones.map((m) => {
              const pct = m.total ? Math.round((m.done / m.total) * 100) : 0;
              return (
                <div key={m.target.id} className="flex items-center gap-3 border-t border-line py-3">
                  <IconBubble icon={m.target.rules.icon} name={m.target.name} color={color(m.target.area_id)} size={40} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{m.target.name}</span>
                      <span className="font-serif text-xl leading-none">{pct}%</span>
                    </div>
                    <ProgressBar value={m.done} max={m.total} color={color(m.target.area_id)} />
                    <span className="text-xs text-muted">
                      {m.mode === "tasks"
                        ? `${formatMinutes(m.done)} of ${formatMinutes(m.total)}`
                        : `${m.done.toLocaleString()} of ${m.total.toLocaleString()} ${m.target.unit ?? ""}`}
                      {m.daysLeft !== null && ` · ${m.daysLeft} days left`}
                      {m.perDayNeeded !== null && m.perDayNeeded > 0 && ` · needs ${formatMinutes(m.perDayNeeded)}/day`}
                      {m.perWeekNeeded !== null && m.perWeekNeeded > 0 && ` · needs +${Math.ceil(m.perWeekNeeded)}/week`}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <div className="order-9 lg:col-span-5">
          <VerdictCard date={day.date} verdict={day.verdict} />
        </div>
      </div>

      {!demo && (
        <div className="flex justify-center gap-6 text-xs text-muted">
          <Link href="/export" className="hover:text-foreground">
            Export data
          </Link>
          <form action={signOut}>
            <button className="hover:text-foreground">Sign out</button>
          </form>
        </div>
      )}
    </>
  );
}
