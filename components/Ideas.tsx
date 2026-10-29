"use client";

import { useState, useTransition } from "react";
import { addIdea, deleteIdea, updateIdea } from "@/app/(app)/ideas/actions";
import { formatDay } from "@/lib/dates";
import { IDEA_STATUSES, STATUS_LABEL, type Idea, type IdeaStatus } from "@/lib/ideas";
import { DictateButton } from "./DictateButton";

/** Type or dictate an idea in any shape; Groq files it. */
export function IdeaCapture() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      const reply = await addIdea(text);
      if (reply.error) setError(reply.error);
      else setText("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
        }}
        rows={3}
        disabled={pending}
        aria-label="New idea"
        placeholder="An idea, in any shape. Say why it came up if you like: 'while editing the RAG reel I thought…'"
        className="w-full resize-y rounded-2xl border border-line bg-background p-4 text-[15px] leading-relaxed outline-none transition focus:border-accent"
      />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="text-xs text-muted">Groq gives it a title, a category and the &ldquo;why&rdquo;. You can change them after.</span>
        <div className="flex items-start gap-2">
          <DictateButton label="Say it" onText={(spoken) => setText((t) => (t.trim() ? `${t.trim()} ${spoken}` : spoken))} />
          <button
            type="button"
            onClick={save}
            disabled={pending || !text.trim()}
            className="min-h-11 rounded-full bg-accent px-6 text-sm font-semibold text-on-accent transition active:scale-95 disabled:opacity-50"
          >
            {pending ? "Filing…" : "Save idea"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}

/** One idea: what, why it came up, where it stands. */
export function IdeaCard({ idea, color }: { idea: Idea; color?: string }) {
  const [pending, startTransition] = useTransition();
  const tint = color ?? "var(--accent)";
  return (
    <article className={`flex flex-col gap-3 rounded-3xl border border-line bg-card p-5 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          {idea.category && (
            <span
              className="w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ color: tint, background: `color-mix(in srgb, ${tint} 16%, transparent)` }}
            >
              {idea.category}
            </span>
          )}
          <h3 className={`font-serif text-2xl leading-tight ${idea.status === "done" ? "text-muted line-through" : ""}`}>{idea.title}</h3>
        </div>
        <button
          type="button"
          aria-label={`Delete idea: ${idea.title}`}
          onClick={() => startTransition(() => deleteIdea(idea.id))}
          className="px-1 text-muted hover:text-bad"
        >
          ✕
        </button>
      </div>
      {idea.context && (
        <p className="text-sm">
          <span className="label mr-2 !text-[10px]">Why</span>
          {idea.context}
        </p>
      )}
      {idea.details && <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{idea.details}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
        <span>
          {formatDay(idea.created_at.slice(0, 10))}
          {idea.source === "chat" ? " · from Claude" : ""}
        </span>
        <select
          aria-label="Status"
          value={idea.status}
          onChange={(e) => startTransition(() => updateIdea(idea.id, { status: e.target.value as IdeaStatus }))}
          className="min-h-9 rounded-full border border-line bg-background px-3 text-xs"
        >
          {IDEA_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
