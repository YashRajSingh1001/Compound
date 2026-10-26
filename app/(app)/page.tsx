import Link from "next/link";
import { Suspense } from "react";
import { DailyTile } from "@/components/DailyTile";
import { TaskList } from "@/components/TaskList";
import { QuoteLine, TodayHeader, WeekStrip } from "@/components/TodayHeader";
import { IconBubble, ProgressBar, SectionTitle } from "@/components/ui";
import { VerdictCard } from "@/components/VerdictCard";
import { WeeklyQuickLog } from "@/components/WeeklyQuickLog";
import { getToday, loadDay } from "@/lib/data";
import { formatMinutes } from "@/lib/dates";
import { lineOfTheDay } from "@/lib/quotes";
import { signOut } from "../login/actions";

export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <Today />
    </Suspense>
  );
}

function TodaySkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-label="Loading your day">
      <div className="h-24 rounded-3xl bg-chip" />
      <div className="h-16 rounded-3xl bg-chip" />
      <div className="h-32 rounded-3xl bg-chip" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-3xl bg-chip" />
      ))}
    </div>
  );
}

async function Today() {
  const day = await loadDay(await getToday());
  const color = (areaId: string | null) => day.areas.find((a) => a.id === areaId)?.color;
  const doneCount = day.daily.filter((d) => d.done).length;
  const direct = day.weekly.filter((w) => w.direct);

  return (
    <>
      <TodayHeader date={day.date} done={doneCount} total={day.daily.length} />
      <QuoteLine text={lineOfTheDay(day.date)} />
      <WeekStrip week={day.week} today={day.date} streak={day.streak} />

      <section className="flex flex-col gap-3">
        <SectionTitle aside={<span className="text-xs text-muted">The floor, every day</span>}>Non-negotiables</SectionTitle>
        {day.daily.map((status, i) => (
          <DailyTile key={status.target.id} status={status} color={color(status.target.area_id)} index={i} />
        ))}
      </section>

      {direct.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>This week</SectionTitle>
          {direct.map((progress) => (
            <WeeklyQuickLog key={progress.target.id} progress={progress} date={day.date} color={color(progress.target.area_id)} />
          ))}
        </section>
      )}

      {day.milestones.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>Milestones</SectionTitle>
          <div className="flex flex-col overflow-hidden rounded-3xl border border-line bg-card">
            {day.milestones.map((m) => {
              const pct = m.total ? Math.round((m.done / m.total) * 100) : 0;
              return (
                <div key={m.target.id} className="flex items-center gap-3 border-b border-line p-3 pr-4 last:border-b-0">
                  <IconBubble icon={m.target.rules.icon} name={m.target.name} color={color(m.target.area_id)} size={40} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{m.target.name}</span>
                      <span className="font-serif text-lg leading-none">{pct}%</span>
                    </div>
                    <ProgressBar value={m.done} max={m.total} color={color(m.target.area_id)} />
                    <span className="text-xs text-muted">
                      {m.mode === "tasks"
                        ? `${formatMinutes(m.done)} of ${formatMinutes(m.total)}`
                        : `${m.done.toLocaleString()} of ${m.total.toLocaleString()} ${m.target.unit ?? ""}`}
                      {m.daysLeft !== null && ` · ${m.daysLeft} days left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionTitle>Tasks</SectionTitle>
        <TaskList tasks={day.tasks} date={day.date} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle
          aside={
            <Link href="/check-in" className="text-sm font-medium text-accent">
              Evening check-in →
            </Link>
          }
        >
          Verdict
        </SectionTitle>
        <VerdictCard date={day.date} verdict={day.verdict} />
      </section>

      <form action={signOut} className="flex justify-center">
        <button className="text-xs text-muted hover:text-foreground">Sign out</button>
      </form>
    </>
  );
}
