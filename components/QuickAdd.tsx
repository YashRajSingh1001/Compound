"use client";

import { useState, useTransition } from "react";
import { addTask, parseQuickAdd, type NewTask } from "@/app/actions";
import type { Area } from "@/lib/types";
import { DictateButton } from "./DictateButton";

/**
 * Natural-language add: type "renew car insurance by friday", Groq fills in
 * title, category and due date, and a confirmation card lets you fix any of
 * it before saving. A category picked by hand wins over Groq's guess.
 */
export function QuickAdd({ date, areas, compact = false }: { date: string; areas: Area[]; compact?: boolean }) {
  const categories = areas.filter((a) => a.for_tasks);
  const [text, setText] = useState("");
  const [pick, setPick] = useState("auto");
  const [draft, setDraft] = useState<NewTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function read() {
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      const reply = await parseQuickAdd(text, date);
      // If Groq is unavailable, still let you save the line as typed.
      const task: NewTask = reply.task ?? {
        title: text.trim(),
        areaId: null,
        dueDate: date,
        estMinutes: null,
        recurrence: null,
        source: "app",
      };
      if (reply.error) setError(`Couldn't read the details (${reply.error}). Check them below.`);
      setDraft(pick === "auto" ? task : { ...task, areaId: pick });
    });
  }

  function save() {
    if (!draft?.title.trim()) return;
    const task = draft;
    startTransition(async () => {
      await addTask(task, date);
      setDraft(null);
      setText("");
      setError(null);
    });
  }

  const field = "min-h-11 rounded-xl border border-line bg-background px-3 text-sm outline-none focus:border-accent";

  if (draft) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-3 rounded-2xl border border-accent/50 bg-accent-soft/40 p-3"
      >
        <span className="label">Check and save</span>
        <input
          aria-label="Title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className={`${field} font-medium`}
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Category"
            value={draft.areaId ?? ""}
            onChange={(e) => setDraft({ ...draft, areaId: e.target.value || null })}
            className={`${field} flex-1`}
          >
            <option value="">No category</option>
            {categories.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Due date"
            value={draft.dueDate ?? date}
            min={date}
            onChange={(e) => setDraft({ ...draft, dueDate: e.target.value || date })}
            className={`${field} flex-1`}
          />
        </div>
        {(draft.estMinutes || draft.recurrence) && (
          <span className="text-xs text-muted">
            {draft.estMinutes ? `About ${draft.estMinutes} min` : ""}
            {draft.estMinutes && draft.recurrence ? " · " : ""}
            {draft.recurrence ? `Repeats ${draft.recurrence}` : ""}
          </span>
        )}
        {error && <p className="text-xs text-warn">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setDraft(null)} className="min-h-11 flex-1 rounded-full bg-chip text-sm font-medium">
            Cancel
          </button>
          <button disabled={pending} className="min-h-11 flex-[2] rounded-full bg-accent text-sm font-semibold text-on-accent disabled:opacity-60">
            {pending ? "Saving…" : "Save to-do"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        read();
      }}
      className={`flex flex-wrap gap-2 ${compact ? "" : "sm:flex-nowrap"}`}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={compact ? "Add a to-do…" : "Add a to-do: renew car insurance by friday"}
        aria-label="New to-do"
        autoComplete="off"
        disabled={pending}
        className={`min-h-12 min-w-0 flex-1 rounded-full border border-line bg-card px-5 outline-none transition focus:border-accent ${
          compact ? "basis-40" : "basis-full sm:basis-auto"
        }`}
      />
      <DictateButton compact label="Say a to-do" onText={(spoken) => setText((t) => (t.trim() ? `${t.trim()} ${spoken}` : spoken))} />
      {!compact && (
        <select
          aria-label="Category"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="min-h-12 flex-1 rounded-full border border-line bg-card px-4 text-sm sm:flex-none"
        >
          <option value="auto">Auto category</option>
          {categories.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
      <button
        disabled={pending || !text.trim()}
        className="min-h-12 rounded-full bg-accent px-5 font-semibold text-on-accent transition active:scale-95 disabled:opacity-50"
      >
        {pending ? "Reading…" : "Add"}
      </button>
    </form>
  );
}
