"use client";

import { useState } from "react";
import type { DaySnapshot } from "@/lib/data";
import { formatDay } from "@/lib/dates";
import { vocabLink } from "@/lib/vocab-link";
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
      body: day.daily.map((status, i) => (
        <DailyTile key={status.target.id} status={status} color={color(status.target.area_id)} index={i} {...vocabLink(status.target, day.vocab)} />
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
              <WeeklyQuickLog key={progress.target.id} progress={progress} date={day.date} color={color(progress.target.area_id)} />
            ))}
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
            {day.weekly
              .filter((w) => !w.direct)
              .map((w) => (
                <li key={w.target.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span aria-hidden>{w.target.rules.icon}</span>
                    {w.target.name}
                  </span>
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
      body: <TaskList tasks={day.tasks} date={day.date} areas={day.areas} canMove />,
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
        <div className="flex items-center justify-between">
          <span className="label">
            Evening check-in · {formatDay(day.date)}
          </span>
          <span className="label">
            {index + 1} / {steps.length}
          </span>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s.title}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= index ? "bg-accent" : "bg-chip"}`}
            />
          ))}
        </div>
        <div className="rise" key={step.title}>
          <h1 className="font-serif text-5xl leading-tight italic tracking-tight">{step.title}</h1>
          <p className="text-muted">{step.hint}</p>
        </div>
      </header>

      <div className="flex flex-col gap-3">{step.body}</div>

      <div className="flex gap-3">
        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="min-h-12 flex-1 rounded-full bg-chip font-medium active:scale-[0.98]"
          >
            Back
          </button>
        )}
        {!last && (
          <button
            type="button"
            onClick={() => setIndex(index + 1)}
            className="min-h-12 flex-[2] rounded-full bg-accent font-semibold text-on-accent active:scale-[0.98]"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
