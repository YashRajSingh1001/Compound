"use client";

import { useState } from "react";
import type { DaySnapshot } from "@/lib/data";
import { formatDay } from "@/lib/dates";
import { DailyTile } from "./DailyTile";
import { MilestoneQuick } from "./MilestoneQuick";
import { TaskList } from "./TaskList";
import { PaceBadge } from "./ui";
import { VerdictCard } from "./VerdictCard";
import { WeeklyQuickLog, formatAmount } from "./WeeklyQuickLog";

/**
 * The ~2 minute evening flow: non-negotiables → the week → milestones →
 * tasks → verdict. Every tap saves immediately, so quitting halfway loses
 * nothing. Steps with nothing to show are skipped.
 */
export function CheckInFlow({ day }: { day: DaySnapshot }) {
  const color = (areaId: string | null) => day.areas.find((a) => a.id === areaId)?.color;

  const steps = [
    {
      title: "Non-negotiables",
      hint: "Did the basics happen today?",
      show: day.daily.length > 0,
      body: day.daily.map((status) => (
        <DailyTile key={status.target.id} status={status} color={color(status.target.area_id)} />
      )),
    },
    {
      title: "This week",
      hint: "Anything to add, and where you stand.",
      show: day.weekly.length > 0,
      body: (
        <>
          {day.weekly
            .filter((w) => w.direct)
            .map((progress) => (
              <WeeklyQuickLog key={progress.target.id} progress={progress} date={day.date} />
            ))}
          <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
            {day.weekly
              .filter((w) => !w.direct)
              .map((w) => (
                <li key={w.target.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{w.target.name}</span>
                  <span className="flex items-center gap-2 text-muted">
                    {formatAmount(w.actual, w)} / {formatAmount(w.goal, w)}
                    <PaceBadge status={w.status} />
                  </span>
                </li>
              ))}
          </ul>
        </>
      ),
    },
    {
      title: "Milestones",
      hint: "Finish or start a section? Tick it off.",
      show: day.milestones.length > 0,
      body: day.milestones.map((progress) => (
        <MilestoneQuick key={progress.target.id} progress={progress} date={day.date} color={color(progress.target.area_id)} />
      )),
    },
    {
      title: "Tasks",
      hint: "Tick what's done. Push the rest to tomorrow.",
      show: true,
      body: <TaskList tasks={day.tasks} date={day.date} canMove />,
    },
    {
      title: "Verdict",
      hint: day.green ? "Green day. Here's the honest read." : "Here's the honest read on today.",
      show: true,
      body: <VerdictCard date={day.date} verdict={day.verdict} />,
    },
  ].filter((s) => s.show);

  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index === steps.length - 1;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted">Evening check-in · {formatDay(day.date)}</p>
        <div className="flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s.title} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-foreground" : "bg-chip"}`} />
          ))}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{step.title}</h1>
          <p className="text-muted">{step.hint}</p>
        </div>
      </header>

      <div className="flex flex-col gap-3">{step.body}</div>

      <div className="flex gap-3">
        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="min-h-12 flex-1 rounded-2xl bg-chip font-medium"
          >
            Back
          </button>
        )}
        {!last && (
          <button
            type="button"
            onClick={() => setIndex(index + 1)}
            className="min-h-12 flex-[2] rounded-2xl bg-foreground font-medium text-background"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
