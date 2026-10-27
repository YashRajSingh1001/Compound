"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { addSession, deleteLog, setDayValue } from "@/app/actions";
import { formatMinutes } from "@/lib/dates";
import type { DailyStatus } from "@/lib/progress";
import type { DailyLog } from "@/lib/types";
import { ActionPill, Chip, IconBubble, ProgressRing } from "./ui";

const SESSION_PRESETS = [15, 30, 45, 60, 90];

let optimisticCount = 0;
const optimisticId = () => `optimistic-${++optimisticCount}`;

type LogChange = { type: "add"; log: DailyLog } | { type: "remove"; id: string } | { type: "replace"; logs: DailyLog[] };

/**
 * One daily non-negotiable as a big tap target.
 * - bool without tags (Vocab, Journal): tap toggles done.
 * - bool with tags (Workout): tap opens gym / run / rest.
 * - minutes (Study): tap opens session presets, split by tag.
 * - with `href` (Vocab): tap opens its own page, which ticks it when done.
 */
export function DailyTile({
  status,
  color,
  index = 0,
  href,
  note,
}: {
  status: DailyStatus;
  color?: string;
  index?: number;
  href?: string;
  /** Replaces the default status line, e.g. "4 of 10 words · 5 to review". */
  note?: string;
}) {
  const { target, date, required, tags } = status;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState<string | null>(tags[0] ?? null);
  const [pending, startTransition] = useTransition();

  // Show the change instantly; the server refresh then confirms it.
  const [logs, applyChange] = useOptimistic(status.logs, (current: DailyLog[], change: LogChange) => {
    if (change.type === "add") return [...current, change.log];
    if (change.type === "remove") return current.filter((l) => l.id !== change.id);
    return change.logs;
  });

  const value = target.metric === "bool" ? (logs.length ? 1 : 0) : logs.reduce((a, l) => a + Number(l.value), 0);
  // The server's rest-day check only applies until an optimistic change replaces the logs.
  const extraRest = status.extraRest && logs === status.logs;
  const done = value >= required && !extraRest;
  const loggedTag = logs[0]?.tag ?? null;

  const fakeLog = (v: number, t: string | null): DailyLog => ({
    id: optimisticId(),
    log_date: date,
    target_id: target.id,
    value: v,
    tag: t,
  });

  function run(change: LogChange, action: () => Promise<void>) {
    startTransition(async () => {
      applyChange(change);
      await action();
    });
  }

  function onTileTap() {
    if (href) {
      router.push(href);
    } else if (target.metric === "bool" && tags.length === 0) {
      const next = done ? null : 1;
      run({ type: "replace", logs: next ? [fakeLog(1, null)] : [] }, () => setDayValue(target.id, date, next));
    } else {
      setOpen((o) => !o);
    }
  }

  function pickTag(t: string) {
    const clear = loggedTag === t && logs.length > 0;
    run({ type: "replace", logs: clear ? [] : [fakeLog(1, t)] }, () =>
      setDayValue(target.id, date, clear ? null : 1, clear ? null : t),
    );
  }

  let detail: string;
  if (target.metric === "minutes") detail = `${Math.round(value)} of ${required} min`;
  else if (extraRest) detail = "Extra rest day this week";
  else if (tags.length) detail = loggedTag ? `Logged · ${loggedTag}` : "Not logged yet";
  else detail = done ? "Done for today" : "Not done yet";
  if (note) detail = note;

  const expandable = !href && (target.metric !== "bool" || tags.length > 0);
  const ring = target.metric === "minutes" ? Math.min(value / required, 1) : done ? 1 : 0;

  let pill: React.ReactNode;
  if (href) pill = done ? "✓ Done" : "Open";
  else if (!expandable) pill = done ? "✓ Done" : "Done";
  else if (target.metric === "minutes") pill = done ? "✓ + Log" : "+ Log";
  else pill = loggedTag && !extraRest ? `✓ ${loggedTag}` : "Log";

  return (
    <div
      className={`rise overflow-hidden rounded-3xl border bg-card transition-colors ${
        done ? "border-good/50" : "border-line"
      } ${pending ? "opacity-80" : ""}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-3 p-3 pr-4">
        <button
          type="button"
          onClick={onTileTap}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={expandable ? open : undefined}
        >
          <ProgressRing value={ring} max={1} size={52} stroke={3.5} color={done ? "var(--good)" : color}>
            <IconBubble icon={target.rules.icon} name={target.name} color={done ? "var(--good)" : color} size={40} />
          </ProgressRing>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[17px] font-semibold">{target.name}</span>
            <span className={`text-sm ${extraRest ? "text-warn" : done ? "text-good" : "text-muted"}`}>{detail}</span>
          </span>
        </button>
        <ActionPill onClick={onTileTap} active={done && !expandable} label={`${target.name}: ${href || expandable ? "open" : "toggle done"}`}>
          {pill}
        </ActionPill>
      </div>

      {open && target.metric === "bool" && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          {tags.map((t) => (
            <Chip key={t} active={loggedTag === t && logs.length > 0} onClick={() => pickTag(t)}>
              {t}
            </Chip>
          ))}
        </div>
      )}

      {open && target.metric === "minutes" && (
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="label mr-1">On</span>
              {tags.map((t) => (
                <Chip key={t} active={tag === t} onClick={() => setTag(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {SESSION_PRESETS.map((m) => (
              <Chip
                key={m}
                onClick={() => run({ type: "add", log: fakeLog(m, tag) }, () => addSession(target.id, date, m, tag))}
              >
                + {m} m
              </Chip>
            ))}
          </div>
          {logs.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-2xl bg-chip px-3 py-2">
                  <span>
                    {formatMinutes(Number(l.value))}
                    {l.tag ? <span className="text-muted"> · {l.tag}</span> : null}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove session"
                    className="px-2 text-muted hover:text-bad"
                    disabled={l.id.startsWith("optimistic-")}
                    onClick={() => run({ type: "remove", id: l.id }, () => deleteLog(l.id))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
