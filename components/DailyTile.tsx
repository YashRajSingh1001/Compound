"use client";

import { useOptimistic, useState, useTransition } from "react";
import { addSession, deleteLog, setDayValue } from "@/app/actions";
import { formatMinutes } from "@/lib/dates";
import type { DailyStatus } from "@/lib/progress";
import type { DailyLog } from "@/lib/types";
import { Chip, ProgressBar } from "./ui";

const SESSION_PRESETS = [15, 30, 45, 60, 90];

let optimisticCount = 0;
const optimisticId = () => `optimistic-${++optimisticCount}`;

type LogChange = { type: "add"; log: DailyLog } | { type: "remove"; id: string } | { type: "replace"; logs: DailyLog[] };

/**
 * One daily non-negotiable as a big tap target.
 * - bool without tags (Vocab, Journal): tap toggles done.
 * - bool with tags (Workout): tap opens gym / run / rest.
 * - minutes (Study): tap opens session presets, split by tag.
 */
export function DailyTile({ status, color }: { status: DailyStatus; color?: string }) {
  const { target, date, required, tags } = status;
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
    if (target.metric === "bool" && tags.length === 0) {
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
  if (target.metric === "minutes") detail = `${formatMinutes(value)} / ${formatMinutes(required)}`;
  else if (extraRest) detail = "Extra rest day";
  else if (tags.length) detail = loggedTag ?? "Not logged";
  else detail = done ? "Done" : "Not done";

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition ${
        done ? "border-good bg-good-soft" : "border-line bg-card"
      } ${pending ? "opacity-80" : ""}`}
    >
      <button type="button" onClick={onTileTap} className="flex min-h-18 w-full items-center gap-4 px-4 py-3 text-left">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-lg ${
            done ? "border-good bg-good text-background" : "border-line"
          }`}
          style={done ? undefined : { borderColor: color }}
          aria-hidden
        >
          {done ? "✓" : ""}
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-lg font-semibold">{target.name}</span>
          <span className={`text-sm ${extraRest ? "text-warn" : "text-muted"}`}>
            {detail}
          </span>
        </span>
        {target.metric !== "bool" || tags.length ? (
          <span className="text-muted" aria-hidden>
            {open ? "▴" : "▾"}
          </span>
        ) : null}
      </button>

      {target.metric === "minutes" && (
        <div className="px-4 pb-3">
          <ProgressBar value={value} max={required} color={color} />
        </div>
      )}

      {open && target.metric === "bool" && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          {tags.map((t) => (
            <Chip key={t} active={loggedTag === t && logs.length > 0} onClick={() => pickTag(t)}>
              {t}
            </Chip>
          ))}
        </div>
      )}

      {open && target.metric === "minutes" && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
            <ul className="flex flex-col gap-1 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg bg-chip px-3 py-2">
                  <span>
                    {formatMinutes(Number(l.value))}
                    {l.tag ? <span className="text-muted"> · {l.tag}</span> : null}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove session"
                    className="px-2 text-muted"
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
