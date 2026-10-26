# Compound — project brief

> App name: **Compound** — small daily wins that compound.

## What this is
A personal daily tracker for Yash that he opens every evening on his iPhone to log his day. It tells him honestly where he's on pace and where he's lagging, adapts targets over time, and doubles as a **public portfolio project** (data + GenAI engineering) for analytics job applications.

## Hard rules for Claude Code
- **Never run git commands** (no commit, push, branch, PR, etc.). When code is ready, give Yash the exact terminal commands to run himself. Claude must not appear as a contributor on the repo.
- Never put secrets in code. All keys live in `.env.local` (gitignored) and Vercel environment variables. Never ask Yash to paste keys into chat.
- Explain things in plain English with short code snippets; Yash is a data scientist, strong in Python, newer to TypeScript/Next.js and to macOS.

## Stack
| Piece | Choice |
|---|---|
| Frontend + API routes | Next.js (App Router, TypeScript), deployed on Vercel (Hobby/free) |
| Database + auth | Supabase — a **new dedicated project** for this app (free plan; his other project is ReadKernel). Postgres + Supabase Auth, Row Level Security on every table |
| LLM | **Groq** free tier (OpenAI-compatible endpoint), called only from server-side API routes |
| Chat logging | A small **MCP server** (deployed on Vercel alongside the app) that Claude.ai connects to as a custom connector |
| Mobile | Installable PWA ("Add to Home Screen" on iPhone), full-screen, light + dark mode |

## Design principles
1. **Nothing hardcoded.** Areas, targets, milestones and tasks are all database rows. A new commitment must never require a code change.
2. **Pace, not just totals.** Weekly targets show where he *should* be by today vs. where he is ("Thu: 4/10 h, should be ~6 h → 2 h behind").
3. **Floor + targets + milestones.** Daily non-negotiables (binary) → weekly targets (counts/hours) → milestones (dated goals with checklist items).
4. **Privacy.** Journal text never leaves Supabase. The Groq verdict receives only checkmarks, numbers and task titles — never journal content.
5. **Fast logging.** The evening check-in must take ~2 minutes.

## Current targets (seed these via a seed script, editable in-app)

### Daily non-negotiables (a day is "green" when all are done)
- Study block — at least **90 min on weekdays**, at least **2 h 30 min on weekends** (counts toward weekly study hours)
- Workout — 6 per week; 1 rest day per week does not break the streak
- Vocab — 5 new words + recall test on yesterday's words
- Journal — one entry

### Weekly targets
- Study: **12.5 h minimum** (5 × 90 min + 2 × 150 min) — ~7.5 h GenAI cert, ~5 h PyTorch (PyTorch gets all 12.5 h once the GenAI course is done)
- Workouts: 6 total — gym 4–5, running 1–2
- Content: 3 Reels on @yashraj.decodes
- Tech news: 5 of 7 days, ~10 min (his own site, ReadKernel, counts)

### Milestones
**Databricks Generative AI Engineer Associate** (Udemy: "Databricks Generative AI Engineer Associate Exam Prep"). Course target ~17 Nov 2026; exam date TBD (proposed: last week of Nov 2026). Each section = checklist item with lecture minutes + reading buffer:

| Section | Lecture | + Reading |
|---|---|---|
| 3 | 45 m | 45 m |
| 4 | 1 h 31 m | 50 m |
| 5 — GenAI primer & fundamentals | 3 h 11 m | 50 m |
| 6 — AI/BI Genie | 14 m | 20 m |
| 7 — RAG using enterprise data | 2 h 27 m | 50 m |
| 8 — AI agents using LangChain | 54 m | 45 m |
| 9 — MLflow tracing & prompt registry | 1 h 21 m | 50 m |
| 10 — Agent Bricks ecosystem | 1 h 23 m | 50 m |
| 11 — MCP servers & AI Gateway | 41 m | 45 m |
| 12 — Agent memory | 34 m | 45 m |
| 13 — Practice test | ~2.5 h | — |

Total ≈ 23 h. Progress bars move by **hours completed**, not sections ticked.

**PyTorch (learnpytorch.io), finish through section 05.** Section 00 done; 01 in progress/revising; 02–05 remaining. ~6 h per section, ~30 h remaining. Target ~early Dec 2026.

**Instagram:** 2,000 followers on @yashraj.decodes by 31 Dec 2026 (manual weekly entry of follower count).

## Data model (starting point — refine as needed)
All tables have `user_id` + RLS (owner-only).
- `areas` — id, name, color, sort, active
- `targets` — id, area_id, kind (`daily` | `weekly` | `milestone`), metric (`bool` | `count` | `minutes`), target_min, target_max, unit, due_date, active, created_at, updated_at (keep history when targets change)
- `tasks` — id, title, area_id, milestone_id (nullable), due_date, recurrence (nullable), est_minutes, actual_minutes, status, source (`app` | `quick_add` | `chat`), created_at
- `daily_logs` — date, target_id, value, note
- `journal_entries` — id, entry_date, text, source (`app` | `chat` | `import`), created_at
- `vocab_words` — id, word, meaning, example, learned_on, box (Leitner 1–5), next_review, times_tested, times_correct
- `watchlist` — id, url, title, type (`movie` | `series` | `podcast` | `article` | `book` | `reel` | `video`), mood (`brain` | `fun` | `background`), status (`inbox` | `queued` | `done`), added_at, source
- `verdicts` — date, text, model, inputs_summary (jsonb)

## Features by phase

### v1 — the app
- Auth (Supabase, Yash's account only for now)
- **Today** screen: non-negotiables as big tap targets, today's tasks, quick-add bar, "Get verdict" button
- **Evening check-in** flow (~2 min) ending in the daily verdict
- **Week** view: each weekly target with pace indicator (ahead / on pace / behind)
- **Milestones** view: checklist with hour-based progress bars
- **Quick add**: natural language → Groq parses to `{title, area, due_date, est_minutes, recurrence}` → confirmation card → saved
- **Vocab**: Groq generates 5 words/day (no repeats; word, meaning, example sentence), recall quiz on yesterday's words, Leitner spaced repetition, "test me on words from date X to Y"
- **Watchlist**: paste link → inbox; tag type + mood later; "I have 30 min and want something fun" filter
- **Journal**: write or paste entry; one entry per day (editable)
- **Adaptive targets**: if a weekly target is under ~60% for 2 consecutive weeks, suggest lowering it; if above ~90% for 2 weeks, suggest raising it. Always a suggestion Yash accepts or dismisses — never automatic.
- **Export**: CSV/JSON download of all tables
- PWA manifest + icons so it installs to the iPhone home screen

### v2 — MCP server (chat logging from Claude.ai)
Tools: `add_journal_entry`, `log_day`, `add_task`, `add_watchlist_item`, `get_words(from, to)`, `get_week_summary`, `get_targets`, `update_target`. Must require authentication so only Yash can use it. Document how to add it to Claude.ai as a custom connector.

### v3 — portfolio
- **Insights** page: streak heatmap (GitHub-style), weekly pace charts, simple correlations (e.g. study hours on workout vs. rest days)
- **Public demo mode** with realistic fake data (never real journal/data), linked from his portfolio
- README written for recruiters: problem, architecture diagram, stack, screenshots

### Later
- Journal import script from his existing Google Doc export
- Voice dictation in the app (Groq Whisper)

## Environment variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `GROQ_API_KEY` (server only), plus an MCP auth secret in v2.
