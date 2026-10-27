"use client";

import { useState, useTransition } from "react";
import { addWatchItem, deleteWatchItem, setWatchDone, updateWatchItem } from "@/app/(app)/watchlist/actions";
import { MOOD_LABEL, WATCH_MOODS, WATCH_TYPES, hostOf, type WatchItem, type WatchMood, type WatchType } from "@/lib/watchlist";

/** Paste a link (title and type are filled in for you) or type a name. */
export function WatchAdd() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        setError(null);
        startTransition(async () => {
          const reply = await addWatchItem(value);
          if (reply.error) setError(reply.error);
          else setValue("");
        });
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a link, or type a name: Dune Part Two"
          aria-label="Add to watchlist"
          disabled={pending}
          className="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-card px-5 outline-none transition focus:border-accent"
        />
        <button
          disabled={pending || !value.trim()}
          className="min-h-12 rounded-full bg-accent px-5 font-semibold text-on-accent active:scale-95 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
    </form>
  );
}

const select = "min-h-9 rounded-full border border-line bg-background px-3 text-xs capitalize";

/** One item: open the link, tag it, mark it done or remove it. */
export function WatchRow({ item }: { item: WatchItem }) {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<void>) => startTransition(action);
  const host = hostOf(item.url);
  const name = item.title || host || item.url || "Untitled";
  const done = item.status === "done";
  const details = [host, item.type, item.mood && MOOD_LABEL[item.mood], item.est_minutes && `${item.est_minutes} min`].filter(Boolean);

  return (
    <li className={`flex flex-col gap-2.5 border-t border-line py-3 first:border-t-0 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={done ? "Mark not done" : "Mark done"}
          onClick={() => run(() => setWatchDone(item.id, !done))}
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs transition active:scale-90 ${
            done ? "border-good bg-good text-card" : "border-line hover:border-accent"
          }`}
        >
          {done ? "✓" : ""}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-medium break-words hover:text-accent ${done ? "text-muted line-through" : ""}`}
            >
              {name}
            </a>
          ) : (
            <span className={`font-medium ${done ? "text-muted line-through" : ""}`}>{name}</span>
          )}
          <span className="text-xs text-muted">{details.length ? details.join(" · ") : "Not tagged yet"}</span>
        </div>
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={() => run(() => deleteWatchItem(item.id))}
          className="px-1 text-muted hover:text-bad"
        >
          ✕
        </button>
      </div>
      {!done && (
        <div className="flex flex-wrap gap-2 pl-9">
          <select
            aria-label="Type"
            value={item.type ?? ""}
            onChange={(e) => run(() => updateWatchItem(item.id, { type: (e.target.value || null) as WatchType | null }))}
            className={select}
          >
            <option value="">Type…</option>
            {WATCH_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            aria-label="Mood"
            value={item.mood ?? ""}
            onChange={(e) => run(() => updateWatchItem(item.id, { mood: (e.target.value || null) as WatchMood | null }))}
            className={select}
          >
            <option value="">Mood…</option>
            {WATCH_MOODS.map((m) => (
              <option key={m} value={m}>
                {MOOD_LABEL[m]}
              </option>
            ))}
          </select>
          <select
            aria-label="Length"
            value={item.est_minutes ?? ""}
            onChange={(e) => run(() => updateWatchItem(item.id, { est_minutes: e.target.value ? Number(e.target.value) : null }))}
            className={select}
          >
            <option value="">Length…</option>
            {[5, 10, 15, 30, 45, 60, 90, 120, 180].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${m / 60} h`}
              </option>
            ))}
          </select>
        </div>
      )}
    </li>
  );
}
