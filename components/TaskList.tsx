"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { addTask, moveTaskToTomorrow, setTaskDone } from "@/app/actions";
import { formatDay } from "@/lib/dates";
import type { Task } from "@/lib/types";

type TaskChange = { type: "done"; id: string; done: boolean } | { type: "hide"; id: string } | { type: "add"; title: string };

/**
 * Today's tasks with a plain add box. (Step 5 upgrades the add box to
 * natural-language quick add.) `canMove` adds "→ tomorrow" for the check-in.
 */
export function TaskList({ tasks, date, canMove = false }: { tasks: Task[]; date: string; canMove?: boolean }) {
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [items, apply] = useOptimistic(tasks, (current: Task[], change: TaskChange) => {
    if (change.type === "done") {
      return current.map((t) => (t.id === change.id ? { ...t, status: change.done ? ("done" as const) : ("todo" as const) } : t));
    }
    if (change.type === "hide") return current.filter((t) => t.id !== change.id);
    return [
      ...current,
      {
        id: `optimistic-${Math.random()}`,
        title: change.title,
        area_id: null,
        milestone_id: null,
        due_date: date,
        est_minutes: null,
        status: "todo" as const,
        notes: null,
        sort: 0,
        completed_at: null,
      },
    ];
  });

  function run(change: TaskChange, action: () => Promise<void>) {
    startTransition(async () => {
      apply(change);
      await action();
    });
  }

  function onAdd(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    inputRef.current!.value = "";
    run({ type: "add", title }, () => addTask(title, date));
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col overflow-hidden rounded-3xl border border-line bg-card">
        {items.length === 0 && (
          <li className="px-4 py-5 text-center text-sm text-muted">Nothing due today. Enjoy the space, or add one below.</li>
        )}
        {items.map((task) => {
          const done = task.status === "done";
          const overdue = !done && task.due_date && task.due_date < date;
          const optimistic = task.id.startsWith("optimistic-");
          return (
            <li key={task.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <button
                type="button"
                aria-label={done ? "Mark not done" : "Mark done"}
                disabled={optimistic}
                onClick={() => run({ type: "done", id: task.id, done: !done }, () => setTaskDone(task.id, !done, date))}
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm transition active:scale-90 ${
                  done ? "border-good bg-good text-card" : "border-line hover:border-accent"
                }`}
              >
                {done ? "✓" : ""}
              </button>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={done ? "text-muted line-through" : ""}>{task.title}</span>
                {overdue && <span className="text-xs text-bad">Due {formatDay(task.due_date!)}</span>}
              </span>
              {canMove && !done && !optimistic && (
                <button
                  type="button"
                  onClick={() => run({ type: "hide", id: task.id }, () => moveTaskToTomorrow(task.id, date))}
                  className="shrink-0 rounded-full bg-chip px-3 py-1.5 text-xs font-medium"
                >
                  → Tomorrow
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <form action={onAdd} className="flex gap-2">
        <input
          ref={inputRef}
          name="title"
          placeholder="Add a task for today…"
          autoComplete="off"
          className="min-h-12 flex-1 rounded-full border border-line bg-card px-5 outline-none transition focus:border-accent"
        />
        <button className="min-h-12 rounded-full bg-accent px-5 font-semibold text-on-accent active:scale-95">Add</button>
      </form>
    </div>
  );
}
