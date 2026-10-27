"use client";

import { useOptimistic, useTransition } from "react";
import { setMilestoneTaskStatus } from "@/app/actions";
import { formatMinutes } from "@/lib/dates";
import type { Task } from "@/lib/types";

type Status = "todo" | "in_progress" | "done";
const NEXT: Record<Status, Status> = { todo: "in_progress", in_progress: "done", done: "todo" };
const LABEL: Record<Status, string> = { todo: "To do", in_progress: "In progress", done: "Done" };

/** Every item of a milestone. Tap the circle: to do → in progress → done → to do. */
export function MilestoneChecklist({ items, color }: { items: Task[]; color?: string }) {
  const [, startTransition] = useTransition();
  const [list, apply] = useOptimistic(items, (current: Task[], change: { id: string; status: Status }) =>
    current.map((t) => (t.id === change.id ? { ...t, status: change.status } : t)),
  );

  return (
    <ol className="flex flex-col">
      {list.map((t) => {
        const status = (t.status === "skipped" ? "todo" : t.status) as Status;
        return (
          <li key={t.id} className="flex items-center gap-3 border-t border-line py-2.5">
            <button
              type="button"
              aria-label={`${t.title}: ${LABEL[status]}. Tap for ${LABEL[NEXT[status]].toLowerCase()}`}
              onClick={() =>
                startTransition(async () => {
                  apply({ id: t.id, status: NEXT[status] });
                  await setMilestoneTaskStatus(t.id, NEXT[status]);
                })
              }
              className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs transition active:scale-90"
              style={
                status === "done"
                  ? { background: "var(--good)", borderColor: "var(--good)", color: "var(--card)" }
                  : status === "in_progress"
                    ? { borderColor: color ?? "var(--accent)", background: `color-mix(in srgb, ${color ?? "var(--accent)"} 25%, transparent)` }
                    : { borderColor: "var(--line)" }
              }
            >
              {status === "done" ? "✓" : status === "in_progress" ? "•" : ""}
            </button>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={`text-sm ${status === "done" ? "text-muted line-through" : ""}`}>{t.title}</span>
              {t.notes && <span className="text-xs text-muted">{t.notes}</span>}
            </span>
            <span className="shrink-0 text-xs text-muted">{formatMinutes(t.est_minutes ?? 0)}</span>
          </li>
        );
      })}
    </ol>
  );
}
