import Link from "next/link";
import { Suspense } from "react";
import { DailyTile } from "@/components/DailyTile";
import { TaskList } from "@/components/TaskList";
import { SectionTitle } from "@/components/ui";
import { VerdictCard } from "@/components/VerdictCard";
import { WeeklyQuickLog } from "@/components/WeeklyQuickLog";
import { getToday, loadDay } from "@/lib/data";
import { formatDay } from "@/lib/dates";
import { signOut } from "../login/actions";

export default function TodayPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading your day…</p>}>
      <Today />
    </Suspense>
  );
}

async function Today() {
  const day = await loadDay(await getToday());
  const color = (areaId: string | null) => day.areas.find((a) => a.id === areaId)?.color;
  const doneCount = day.daily.filter((d) => d.done).length;

  return (
    <>
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{formatDay(day.date)}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              day.green ? "bg-good-soft text-good" : "bg-chip text-muted"
            }`}
          >
            {day.green ? "Green day" : `${doneCount}/${day.daily.length} done`}
          </span>
          <form action={signOut}>
            <button className="text-xs text-muted">Sign out</button>
          </form>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <SectionTitle>Non-negotiables</SectionTitle>
        {day.daily.map((status) => (
          <DailyTile key={status.target.id} status={status} color={color(status.target.area_id)} />
        ))}
      </section>

      {day.weekly.some((w) => w.direct) && (
        <section className="flex flex-col gap-3">
          <SectionTitle>Log for the week</SectionTitle>
          {day.weekly
            .filter((w) => w.direct)
            .map((progress) => (
              <WeeklyQuickLog key={progress.target.id} progress={progress} date={day.date} />
            ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionTitle>Tasks</SectionTitle>
        <TaskList tasks={day.tasks} date={day.date} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionTitle>Verdict</SectionTitle>
          <Link href="/check-in" className="text-sm font-medium text-muted">
            Evening check-in →
          </Link>
        </div>
        <VerdictCard date={day.date} verdict={day.verdict} />
      </section>
    </>
  );
}
