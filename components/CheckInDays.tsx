"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAX_DAYS_BACK, addDays, formatDay, weekdayName } from "@/lib/dates";
import { checkInHref } from "@/lib/nav";
import type { WeekDay } from "@/lib/snapshot";

export function CheckInDays({ selected, today, recent }: { selected: string; today: string; recent: WeekDay[] }) {
  const router = useRouter();
  return (
    <nav aria-label="Pick a day" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="label">Which day?</span>
        <input
          type="date"
          aria-label="Pick an older day"
          min={addDays(today, -MAX_DAYS_BACK)}
          max={today}
          value={selected}
          onChange={(e) => e.target.value && router.push(checkInHref(e.target.value, today))}
          className="h-9 rounded-full border border-line bg-card px-3 text-base text-muted outline-none focus:border-accent sm:text-sm"
        />
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {recent.map((d) => {
          const active = d.date === selected;
          const full = d.total > 0 && d.done === d.total;
          const dot = full ? "bg-good" : d.score > 0 ? "bg-warn" : "bg-line";
          return (
            <Link
              key={d.date}
              href={checkInHref(d.date, today)}
              aria-current={active ? "date" : undefined}
              title={`${formatDay(d.date)} · ${Math.round(d.score * 100)}% done`}
              className={`flex flex-col items-center gap-1 rounded-2xl border py-2 transition active:scale-95 ${
                active ? "border-accent bg-accent text-on-accent" : "border-line bg-card hover:border-accent"
              }`}
            >
              <span className={`text-[10px] font-semibold tracking-wider uppercase ${active ? "" : "text-muted"}`}>
                {d.date === today ? "Today" : weekdayName(d.date).slice(0, 3)}
              </span>
              <span className="text-lg leading-none font-semibold">{Number(d.date.slice(8))}</span>
              <span className={`size-1.5 rounded-full ${dot}`} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
