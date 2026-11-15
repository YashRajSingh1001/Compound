"use client";

import { useState } from "react";
import type { DaySnapshot, WeekDay } from "@/lib/data";
import { formatDay } from "@/lib/dates";
import { tileLink } from "@/lib/tile-links";
import { CheckInDays } from "./CheckInDays";
import { DailyTile } from "./DailyTile";
import { MilestoneQuick } from "./MilestoneQuick";
import { TaskList } from "./TaskList";
import { PaceBadge } from "./ui";
import { VerdictCard } from "./VerdictCard";
import { WeeklyQuickLog, formatAmount } from "./WeeklyQuickLog";

export function CheckInFlow({ day, today, recent }: { day: DaySnapshot; today: string; recent: WeekDay[] }) {
  const past = day.date < today;
  const when = past ? "that day" : "today";
  const color = (areaId: string | null) => day.areas.find((a) => a.id === areaId)?.color;

  const steps = [
    {
      title: "Daily",
      hint: `Did the basics happen ${when}? Study time is open below.`,
      show: day.daily.length > 0,
      body: day.daily.map((status, i) => (
        <DailyTile
          key={status.target.id}
          status={status}
          color={color(status.target.area_id)}
          index={i}
          defaultOpen={status.target.metric === "minutes"}
          {...tileLink(status.target, day, !past)}
        />
      )),
    },
    {
      title: "Week",
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
      hint: "Finish or start a section? Tick it off. Undo brings back one ticked by mistake.",
      show: day.milestones.length > 0,
      body: day.milestones.map((progress) => (
        <MilestoneQuick key={progress.target.id} progress={progress} date={day.date} color={color(progress.target.area_id)} />
      )),
    },
    {
      title: "Tasks",
      hint: "Tick what's done. Push the rest to tomorrow.",
      show: !past,
      body: <TaskList tasks={day.tasks} date={day.date} areas={day.areas} canMove />,
    },
    {
      title: "Verdict",
      hint: day.green ? "Green day. Here's the honest read." : `Here's the honest read on ${when}.`,
      show: true,
      body: <VerdictCard date={day.date} verdict={day.verdict} />,
    },
  ].filter((s) => s.show);

  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index === steps.length - 1;

  return (
    <div className="flex flex-col gap-5">
      <CheckInDays selected={day.date} today={today} recent={recent} />
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h1 className="font-serif font-semibold text-3xl tracking-tight">{past ? "Catching up" : "Evening check-in"}</h1>
          <span className="label">{formatDay(day.date)}</span>
        </div>
        <div role="tablist" aria-label="Check-in sections" className="flex gap-1 rounded-full bg-chip p-1">
          {steps.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => setIndex(i)}
              className={`min-h-9 flex-auto rounded-full px-2.5 text-[13px] font-semibold transition active:scale-95 ${
                i === index ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
        <p className="rise text-muted" key={step.title}>
          {step.hint}
        </p>
      </header>

      <div role="tabpanel" aria-label={step.title} className="flex flex-col gap-3">
        {step.body}
      </div>

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
            Next: {steps[index + 1].title}
          </button>
        )}
      </div>
    </div>
  );
}
