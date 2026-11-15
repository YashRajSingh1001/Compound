"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { formatDay, formatMinutes } from "@/lib/dates";
import { HEAT_LEVELS, heatLevel } from "@/lib/heat";
import { checkInHref } from "@/lib/nav";
import type { WeekDay } from "@/lib/snapshot";

const TIP_WIDTH = 224;

type Tip = { index: number; left: number; top: number; bottom: number };

function partValue(part: WeekDay["parts"][number]): string {
  if (part.metric === "minutes") return `${formatMinutes(part.value)} / ${formatMinutes(part.required)}`;
  if (part.metric === "count" && part.share < 1) return `${part.value} / ${part.required}`;
  if (part.share >= 1) return part.detail ? `✓ ${part.detail}` : "✓";
  return "—";
}

function extraValue(extra: WeekDay["extras"][number]): string {
  if (extra.unit === "days") return "✓";
  if (extra.metric === "minutes") return formatMinutes(extra.value);
  const unit = extra.unit && extra.value === 1 && extra.unit.endsWith("s") ? extra.unit.slice(0, -1) : extra.unit;
  return `${extra.value}${unit ? ` ${unit}` : ""}`;
}

function DayCard({ day, linkable }: { day: WeekDay; linkable: boolean }) {
  const logged = day.score > 0 || day.extras.length > 0;
  return (
    <>
      <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1.5">
        <span className="font-semibold">{formatDay(day.date)}</span>
        <span className="text-xs text-muted">{day.total ? `${Math.round(day.score * 100)}% done` : ""}</span>
      </div>
      {logged ? (
        <ul className="flex flex-col gap-1 pt-1.5">
          {day.parts.map((p) => (
            <li key={p.name} className="flex flex-col">
              <span className="flex justify-between gap-3">
                <span className={p.share > 0 ? "" : "text-muted"}>
                  <span aria-hidden>{p.icon} </span>
                  {p.name}
                </span>
                <span className={`shrink-0 tabular-nums ${p.share >= 1 ? "text-good" : p.share > 0 ? "text-warn" : "text-muted"}`}>
                  {partValue(p)}
                </span>
              </span>
              {p.metric === "minutes" && p.detail && <span className="text-xs text-muted">{p.detail}</span>}
            </li>
          ))}
          {day.extras.map((e) => (
            <li key={e.name} className="flex justify-between gap-3">
              <span className="truncate">
                <span aria-hidden>{e.icon} </span>
                {e.name}
              </span>
              <span className="shrink-0 tabular-nums text-good">{extraValue(e)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pt-1.5 text-muted">Nothing logged</p>
      )}
      {linkable && <p className="pt-2 text-xs text-muted">Click to edit this day</p>}
    </>
  );
}

export function HeatGrid({ heat, today, linkable = false }: { heat: WeekDay[]; today: string; linkable?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  function show(index: number, el: HTMLElement) {
    const width = wrap.current?.clientWidth ?? TIP_WIDTH;
    const center = el.offsetLeft + el.offsetWidth / 2;
    const left = Math.max(0, Math.min(center - TIP_WIDTH / 2, width - TIP_WIDTH));
    setTip({ index, left, top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight });
  }

  const hide = () => setTip(null);
  const day = tip ? heat[tip.index] : null;
  const below = tip ? tip.index % 7 < 3 : false;

  return (
    <div ref={wrap} className="relative" onMouseLeave={hide}>
      <div className="grid grid-flow-col grid-rows-7 gap-[5px]" style={{ gridAutoColumns: "minmax(0, 1fr)" }}>
        {heat.map((d, i) => {
          const future = d.date > today;
          const className = `aspect-square rounded-[4px] ${future ? "opacity-30" : ""} ${
            d.date === today ? "outline-[1.5px] outline-foreground" : ""
          } ${tip?.index === i ? "outline-[1.5px] outline-accent" : ""}`;
          const handlers = future
            ? {}
            : {
                onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(i, e.currentTarget),
                onFocus: (e: React.FocusEvent<HTMLElement>) => show(i, e.currentTarget),
                onBlur: hide,
              };
          const label = `${formatDay(d.date)}${d.total ? ` · ${Math.round(d.score * 100)}% done` : ""}`;
          return linkable && !future ? (
            <Link
              key={d.date}
              href={checkInHref(d.date, today)}
              aria-label={`${label}. Edit in check-in`}
              className={`${className} transition`}
              style={{ background: HEAT_LEVELS[heatLevel(d)] }}
              {...handlers}
            />
          ) : (
            <span key={d.date} aria-label={label} className={className} style={{ background: HEAT_LEVELS[heatLevel(d)] }} {...handlers} />
          );
        })}
      </div>
      {tip && day && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 rounded-2xl border border-line bg-card p-3 text-sm shadow-lg"
          style={{
            width: TIP_WIDTH,
            left: tip.left,
            top: below ? tip.bottom + 8 : tip.top - 8,
            transform: below ? undefined : "translateY(-100%)",
          }}
        >
          <DayCard day={day} linkable={linkable} />
        </div>
      )}
    </div>
  );
}
