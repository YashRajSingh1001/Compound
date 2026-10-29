import "server-only";

// The Compound MCP server's tools, so Claude.ai can log your day from chat.
// No logged-in session exists here: every query runs with the service-role
// client and filters on COMPOUND_USER_ID explicitly.

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { loadDay } from "../data";
import { addDays, formatDay, formatMinutes, isISODate, isValidTimeZone, todayIn } from "../dates";
import { createAdminClient } from "../supabase/admin";
import type { Target } from "../types";

// Shape of mcp-handler's server, kept to what this file uses.
type McpServer = {
  registerTool: (
    name: string,
    config: { title: string; description: string; inputSchema: z.ZodType; annotations?: Record<string, boolean> },
    handler: (args: never) => Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }>,
  ) => void;
};

type Ctx = { db: SupabaseClient; userId: string; today: string };

function context(): Ctx {
  const userId = process.env.COMPOUND_USER_ID;
  if (!userId) throw new Error("COMPOUND_USER_ID is not set");
  const tz = process.env.COMPOUND_TIMEZONE;
  return { db: createAdminClient(), userId, today: todayIn(isValidTimeZone(tz) ? tz : "UTC") };
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (t: string) => ({ content: [{ type: "text" as const, text: t }], isError: true });

function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

async function activeTargets({ db, userId }: Ctx): Promise<Target[]> {
  return check(await db.from("targets").select("*").eq("user_id", userId).eq("active", true).order("sort")) as Target[];
}

/**
 * Exact name first, then a unique partial match. `prefer` breaks ties, e.g.
 * log_day prefers targets you can log ("study" → Study block, not Study hours).
 */
function findTarget(targets: Target[], name: string, prefer?: (t: Target) => boolean): Target | string {
  const n = name.trim().toLowerCase();
  const exact = targets.find((t) => t.name.toLowerCase() === n);
  if (exact) return exact;
  const partial = targets.filter((t) => t.name.toLowerCase().includes(n) || n.includes(t.name.toLowerCase()));
  if (partial.length === 1) return partial[0];
  const preferred = prefer ? partial.filter(prefer) : [];
  if (preferred.length === 1) return preferred[0];
  const names = targets.map((t) => `"${t.name}"`).join(", ");
  return partial.length ? `"${name}" matches several targets: ${partial.map((t) => t.name).join(", ")}.` : `No target called "${name}". Targets: ${names}.`;
}

function describeTarget(t: Target): string {
  const amount =
    t.metric === "bool"
      ? "done / not done"
      : t.metric === "minutes"
        ? `${formatMinutes(t.target_min ?? 0)}${t.rules.weekend_min ? ` (weekends ${formatMinutes(t.rules.weekend_min)})` : ""}`
        : `${t.target_min ?? ""}${t.target_max ? `–${t.target_max}` : ""} ${t.unit ?? ""}`.trim();
  const tags = t.rules.tags?.length ? ` · tags: ${t.rules.tags.join(", ")}` : t.rules.tag ? ` · counts "${t.rules.tag}" logs` : "";
  const due = t.due_date ? ` · due ${formatDay(t.due_date)}` : "";
  const how = t.rollup_from ? " · computed (log the daily target instead)" : "";
  return `- ${t.name} [${t.kind}, ${t.metric}]: ${amount}${tags}${due}${how}`;
}

const dateArg = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .describe("YYYY-MM-DD. Defaults to today in the user's timezone.");

export function registerTools(server: McpServer) {
  server.registerTool(
    "get_targets",
    {
      title: "Get targets",
      description:
        "List Yash's active Compound targets: daily non-negotiables, weekly targets and milestones, with their goals. Call this before log_day if unsure of target names.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const ctx = context();
      const targets = await activeTargets(ctx);
      const group = (kind: string) => targets.filter((t) => t.kind === kind).map(describeTarget).join("\n");
      return text(`Daily:\n${group("daily")}\n\nWeekly:\n${group("weekly")}\n\nMilestones:\n${group("milestone")}`);
    },
  );

  server.registerTool(
    "log_day",
    {
      title: "Log the day",
      description:
        "Log what Yash did: study minutes (with tag e.g. genai or pytorch), workouts (tag gym, run or rest), reels, tech news, follower count, vocab or journal done. Minutes and counts add to what's already logged unless replace is true; done/not-done targets are set.",
      inputSchema: z.object({
        date: dateArg,
        entries: z
          .array(
            z.object({
              target: z.string().describe('Target name, e.g. "Study block", "Workout", "Reels on @yashraj.decodes"'),
              value: z.number().optional().describe("Minutes or count. Omit for done/not-done targets (means done); 0 clears."),
              tag: z.string().optional().describe('e.g. "genai", "pytorch", "gym", "run", "rest"'),
              replace: z.boolean().optional().describe("Replace the day's value instead of adding to it."),
            }),
          )
          .min(1),
      }),
    },
    async (args: { date?: string; entries: { target: string; value?: number; tag?: string; replace?: boolean }[] }) => {
      const ctx = context();
      const date = args.date ?? ctx.today;
      if (date > ctx.today) return fail("Can't log a future day.");
      const targets = await activeTargets(ctx);
      const done: string[] = [];
      for (const entry of args.entries) {
        const target = findTarget(targets, entry.target, (t) => !t.rollup_from);
        if (typeof target === "string") return fail(target);
        if (target.rollup_from) {
          const source = targets.find((t) => t.id === target.rollup_from);
          return fail(`"${target.name}" is computed from "${source?.name}". Log "${source?.name}" instead.`);
        }
        const value = entry.value ?? 1;
        const setsValue = entry.replace || target.metric === "bool" || target.unit === "days" || target.rules.aggregate === "latest";
        const tag = entry.tag?.trim().toLowerCase() || null;
        if (setsValue) {
          check(await ctx.db.from("daily_logs").delete().eq("user_id", ctx.userId).eq("target_id", target.id).eq("log_date", date));
        }
        if (value > 0) {
          check(
            await ctx.db.from("daily_logs").insert({
              user_id: ctx.userId,
              target_id: target.id,
              log_date: date,
              value: target.metric === "bool" || target.unit === "days" ? 1 : value,
              tag,
              source: "chat",
            }),
          );
        }
        done.push(
          value > 0
            ? `${target.name}: ${target.metric === "minutes" ? formatMinutes(value) : target.metric === "bool" ? "done" : value}${tag ? ` (${tag})` : ""}`
            : `${target.name}: cleared`,
        );
      }
      return text(`Logged for ${formatDay(date)}:\n${done.map((d) => `- ${d}`).join("\n")}`);
    },
  );

  server.registerTool(
    "add_journal_entry",
    {
      title: "Add journal entry",
      description:
        "Save a journal entry for a day (one per day; new text is appended to that day's entry). Also ticks the Journal non-negotiable. Journal text stays in the database and is never sent to any AI.",
      inputSchema: z.object({ text: z.string().min(1).max(20000), date: dateArg }),
    },
    async (args: { text: string; date?: string }) => {
      const ctx = context();
      const date = args.date ?? ctx.today;
      const existing = check(
        await ctx.db.from("journal_entries").select("id, text").eq("user_id", ctx.userId).eq("entry_date", date).maybeSingle(),
      ) as { id: string; text: string } | null;
      if (existing) {
        check(await ctx.db.from("journal_entries").update({ text: `${existing.text}\n\n${args.text.trim()}` }).eq("id", existing.id));
      } else {
        check(await ctx.db.from("journal_entries").insert({ user_id: ctx.userId, entry_date: date, text: args.text.trim(), source: "chat" }));
      }
      const journal = (await activeTargets(ctx)).find((t) => t.kind === "daily" && t.rules.journal);
      if (journal) {
        check(await ctx.db.from("daily_logs").delete().eq("user_id", ctx.userId).eq("target_id", journal.id).eq("log_date", date));
        check(await ctx.db.from("daily_logs").insert({ user_id: ctx.userId, target_id: journal.id, log_date: date, value: 1, source: "chat" }));
      }
      return text(`${existing ? "Added to" : "Saved"} the journal for ${formatDay(date)}${journal ? " and ticked Journal" : ""}.`);
    },
  );

  server.registerTool(
    "add_task",
    {
      title: "Add to-do",
      description:
        "Add a to-do to Compound. It's listed today and carries over every day until finished. Category is optional (e.g. Personal, Work, Study, Health, Content, Errands).",
      inputSchema: z.object({
        title: z.string().min(1).max(200),
        category: z.string().optional(),
        due_date: dateArg,
        est_minutes: z.number().int().positive().optional(),
      }),
    },
    async (args: { title: string; category?: string; due_date?: string; est_minutes?: number }) => {
      const ctx = context();
      let areaId: string | null = null;
      if (args.category) {
        const areas = check(await ctx.db.from("areas").select("id, name").eq("user_id", ctx.userId).eq("for_tasks", true)) as {
          id: string;
          name: string;
        }[];
        const match = areas.find((a) => a.name.toLowerCase() === args.category!.trim().toLowerCase());
        if (!match) return fail(`No category "${args.category}". Categories: ${areas.map((a) => a.name).join(", ")}.`);
        areaId = match.id;
      }
      const due = args.due_date && args.due_date >= ctx.today ? args.due_date : ctx.today;
      check(
        await ctx.db.from("tasks").insert({
          user_id: ctx.userId,
          title: args.title.trim(),
          area_id: areaId,
          due_date: due,
          est_minutes: args.est_minutes ?? null,
          listed_on: ctx.today,
          source: "chat",
        }),
      );
      return text(`Added "${args.title.trim()}"${args.category ? ` (${args.category})` : ""}, due ${formatDay(due)}.`);
    },
  );

  server.registerTool(
    "add_watchlist_item",
    {
      title: "Add to watchlist",
      description: "Save a movie, series, podcast, article, book, reel or video to Compound's watchlist inbox.",
      inputSchema: z.object({
        url: z.string().url().optional(),
        title: z.string().max(300).optional(),
        type: z.enum(["movie", "series", "podcast", "article", "book", "reel", "video"]).optional(),
        mood: z.enum(["brain", "fun", "background"]).optional(),
        est_minutes: z.number().int().positive().optional(),
      }),
    },
    async (args: { url?: string; title?: string; type?: string; mood?: string; est_minutes?: number }) => {
      if (!args.url && !args.title) return fail("Give a url or a title.");
      const ctx = context();
      check(
        await ctx.db.from("watchlist").insert({
          user_id: ctx.userId,
          url: args.url ?? null,
          title: args.title ?? null,
          type: args.type ?? null,
          mood: args.mood ?? null,
          est_minutes: args.est_minutes ?? null,
          source: "chat",
        }),
      );
      return text(`Saved "${args.title ?? args.url}" to the watchlist.`);
    },
  );

  server.registerTool(
    "get_words",
    {
      title: "Get vocab words",
      description: "List the vocab words Yash learned between two dates (inclusive), with meanings, examples and review box. Useful for quizzing him.",
      inputSchema: z.object({ from: dateArg, to: dateArg }),
      annotations: { readOnlyHint: true },
    },
    async (args: { from?: string; to?: string }) => {
      const ctx = context();
      const to = args.to ?? ctx.today;
      const from = args.from ?? addDays(to, -6);
      if (!isISODate(from) || !isISODate(to)) return fail("Dates must be YYYY-MM-DD.");
      const words = check(
        await ctx.db
          .from("vocab_words")
          .select("word, part_of_speech, meaning, example, category, learned_on, box")
          .eq("user_id", ctx.userId)
          .gte("learned_on", from <= to ? from : to)
          .lte("learned_on", from <= to ? to : from)
          .order("learned_on"),
      ) as { word: string; part_of_speech: string | null; meaning: string; example: string | null; category: string | null; learned_on: string; box: number }[];
      if (!words.length) return text(`No words learned between ${formatDay(from)} and ${formatDay(to)}.`);
      return text(
        words
          .map((w) => `- ${w.word}${w.part_of_speech ? ` (${w.part_of_speech})` : ""} · ${w.category ?? ""} · learned ${formatDay(w.learned_on)} · box ${w.box}\n  ${w.meaning}${w.example ? `\n  "${w.example}"` : ""}`)
          .join("\n"),
      );
    },
  );

  server.registerTool(
    "get_week_summary",
    {
      title: "Get week summary",
      description:
        "Where Yash stands: today's non-negotiables, each weekly target vs where he should be by tonight, milestones with pace needed, streak and open to-dos. Never includes journal text.",
      inputSchema: z.object({ date: dateArg }),
      annotations: { readOnlyHint: true },
    },
    async (args: { date?: string }) => {
      const ctx = context();
      const date = args.date ?? ctx.today;
      const day = await loadDay(date, { supabase: ctx.db, userId: ctx.userId });
      const amount = (n: number, metric: string, unit: string | null) =>
        metric === "minutes" ? formatMinutes(n) : `${Math.round(n * 10) / 10} ${unit ?? ""}`.trim();
      const lines = [
        `${formatDay(date)} · ${day.green ? "green day" : `${day.daily.filter((d) => d.done).length}/${day.daily.length} non-negotiables`} · streak ${day.streak} (best ${day.bestStreak})`,
        "",
        "Today:",
        ...day.daily.map((d) => `- ${d.done ? "✓" : "✗"} ${d.target.name}${d.target.metric === "minutes" ? ` ${formatMinutes(d.value)} / ${formatMinutes(d.required)}` : ""}`),
        "",
        "This week:",
        ...day.weekly.map(
          (w) =>
            `- ${w.target.name}: ${amount(w.actual, w.target.metric, w.target.unit)} of ${amount(w.goal, w.target.metric, w.target.unit)} · should be ${amount(w.expected, w.target.metric, w.target.unit)} by tonight · ${w.status.replace("_", " ")}`,
        ),
        "",
        "Milestones:",
        ...day.milestones.map(
          (m) =>
            `- ${m.target.name}: ${m.mode === "tasks" ? `${formatMinutes(m.done)} of ${formatMinutes(m.total)}` : `${m.done} of ${m.total}`}${m.daysLeft !== null ? ` · ${m.daysLeft} days left` : ""}${m.perDayNeeded ? ` · needs ${formatMinutes(m.perDayNeeded)}/day` : ""}${m.perWeekNeeded ? ` · needs +${Math.ceil(m.perWeekNeeded)}/week` : ""}`,
        ),
        "",
        `Open to-dos: ${day.tasks.filter((t) => t.status !== "done").map((t) => t.title).join("; ") || "none"}`,
      ];
      return text(lines.join("\n"));
    },
  );

  server.registerTool(
    "update_target",
    {
      title: "Update target",
      description:
        "Change a target's goal (min/max), due date, or switch it off. The old version is kept in history. Use when Yash asks to change a commitment.",
      inputSchema: z.object({
        target: z.string(),
        target_min: z.number().nonnegative().optional(),
        target_max: z.number().nonnegative().nullable().optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        active: z.boolean().optional(),
      }),
    },
    async (args: { target: string; target_min?: number; target_max?: number | null; due_date?: string | null; active?: boolean }) => {
      const ctx = context();
      const target = findTarget(await activeTargets(ctx), args.target);
      if (typeof target === "string") return fail(target);
      const patch: Record<string, unknown> = {};
      if (args.target_min !== undefined) patch.target_min = args.target_min;
      if (args.target_max !== undefined) patch.target_max = args.target_max;
      if (args.due_date !== undefined) patch.due_date = args.due_date;
      if (args.active !== undefined) patch.active = args.active;
      if (!Object.keys(patch).length) return fail("Nothing to change.");
      check(await ctx.db.from("targets").update(patch).eq("user_id", ctx.userId).eq("id", target.id));
      const updated = { ...target, ...patch } as Target;
      return text(`Updated ${target.name}.\nBefore: ${describeTarget(target).slice(2)}\nNow: ${describeTarget(updated).slice(2)}`);
    },
  );

  server.registerTool(
    "add_idea",
    {
      title: "Save an idea",
      description:
        "Save an idea to Yash's Compound idea log. Fill in a short title, the details in his words, a category (reuse one from get_ideas when it fits, e.g. Content, Project, Career, Business), and context: why the idea came up or what it relates to, only if he said so.",
      inputSchema: z.object({
        title: z.string().min(1).max(140),
        details: z.string().max(4000).optional(),
        category: z.string().max(40).optional(),
        context: z.string().max(200).optional().describe("Why it came up, e.g. 'while building ReadKernel'"),
      }),
    },
    async (args: { title: string; details?: string; category?: string; context?: string }) => {
      const ctx = context();
      check(
        await ctx.db.from("ideas").insert({
          user_id: ctx.userId,
          title: args.title.trim(),
          details: args.details?.trim() || null,
          category: args.category?.trim() || null,
          context: args.context?.trim() || null,
          source: "chat",
        }),
      );
      return text(`Saved idea "${args.title.trim()}"${args.category ? ` under ${args.category}` : ""}.`);
    },
  );

  server.registerTool(
    "get_ideas",
    {
      title: "Get ideas",
      description: "List Yash's saved ideas with category, why they came up and status. Optionally filter by category or status.",
      inputSchema: z.object({
        category: z.string().optional(),
        status: z.enum(["new", "exploring", "parked", "done"]).optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args: { category?: string; status?: string }) => {
      const ctx = context();
      let query = ctx.db
        .from("ideas")
        .select("title, details, category, context, status, created_at")
        .eq("user_id", ctx.userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (args.category) query = query.ilike("category", args.category);
      if (args.status) query = query.eq("status", args.status);
      const ideas = check(await query) as {
        title: string;
        details: string | null;
        category: string | null;
        context: string | null;
        status: string;
        created_at: string;
      }[];
      if (!ideas.length) return text("No ideas saved yet with those filters.");
      return text(
        ideas
          .map(
            (i) =>
              `- ${i.title} [${i.category ?? "no category"} · ${i.status} · ${formatDay(i.created_at.slice(0, 10))}]` +
              (i.context ? `\n  Why: ${i.context}` : "") +
              (i.details ? `\n  ${i.details}` : ""),
          )
          .join("\n"),
      );
    },
  );
}
