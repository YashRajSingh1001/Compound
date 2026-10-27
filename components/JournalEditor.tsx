"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveJournal } from "@/app/(app)/journal/actions";
import { DictateButton } from "./DictateButton";

const PROMPTS = ["What went well today?", "What drained you?", "What did you learn?", "One thing for tomorrow."];

const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/**
 * Write or paste the day's entry. Saves itself a moment after you stop
 * typing (and on Save or Ctrl/Cmd+Enter), so closing the app loses nothing.
 */
export function JournalEditor({ date, initial, isToday }: { date: string; initial: string; isToday: boolean }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<string | null>(initial ? "Saved" : null);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(text);

  function save(value: string) {
    if (value === saved) return;
    setStatus("Saving…");
    startTransition(async () => {
      const reply = await saveJournal(date, value);
      if (reply.error) {
        setStatus(`Not saved: ${reply.error}`);
        return;
      }
      setSaved(value);
      // Only report "Saved" if nothing new was typed meanwhile.
      if (latest.current === value) {
        const time = new Date(reply.savedAt!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        setStatus(value.trim() ? `Saved ${time}` : "Entry removed");
      }
    });
  }

  function onChange(value: string) {
    setText(value);
    latest.current = value;
    setStatus("Unsaved changes");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(value), 1200);
  }

  /** Dictated text goes at the end: after a space, or straight onto a fresh line. */
  function appendSpoken(spoken: string) {
    const current = latest.current;
    if (!current.trim()) return onChange(spoken);
    const joiner = /\s$/.test(current) ? "" : " ";
    onChange(`${current}${joiner}${spoken}`);
  }

  // Save on leaving the page too.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => save(latest.current)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(latest.current);
        }}
        aria-label="Journal entry"
        placeholder={`${isToday ? "How was today?" : "How was this day?"} Write or paste anything.\n\n${PROMPTS.join("\n")}`}
        className="min-h-[55vh] w-full resize-y rounded-2xl border border-line bg-background p-4 font-serif text-[19px] leading-relaxed outline-none transition placeholder:text-muted/70 focus:border-accent lg:min-h-[60vh]"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">
          {wordCount(text)} words{status ? ` · ${status}` : ""}
        </span>
        <div className="flex items-start gap-2">
          <DictateButton label="Dictate" onText={appendSpoken} />
          <button
            type="button"
            onClick={() => save(latest.current)}
            disabled={text === saved}
            className="min-h-11 rounded-full bg-accent px-6 text-sm font-semibold text-on-accent transition active:scale-95 disabled:opacity-50"
          >
            {text === saved && saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">
        Private: journal text stays in your database and is never sent to the AI. Dictating sends only the audio clip to Groq to turn it
        into text; the audio isn&rsquo;t stored.
      </p>
    </div>
  );
}
