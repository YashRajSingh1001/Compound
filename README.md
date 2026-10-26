# Compound

Small daily wins that compound. A personal evening check-in tracker that shows honestly where I'm on pace and where I'm behind.

> A README for recruiters (architecture, screenshots) comes in v3. For now, this is the setup guide.

## Stack

Next.js 16 (App Router, TypeScript) · Supabase (Postgres + Auth + Row Level Security) · Groq · Vercel · PWA

## Local setup

1. **Create a Supabase project** called `compound` (free plan), separate from any other project.
2. **Create the tables:** Supabase → SQL Editor → paste [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → Run.
3. **Create your login:** Supabase → Authentication → Users → *Add user* → *Create new user*. Enter your email and a password, and tick *Auto Confirm User*.
4. **Turn off public sign-ups:** Authentication → Sign In / Providers → turn off *Allow new users to sign up*.
5. **Add your keys:** copy `.env.local.example` to `.env.local` and fill it in. The keys are under Project Settings → API.
6. **Install, seed and run:**

   ```bash
   npm install
   npm run seed
   npm run dev
   ```

   Then open http://localhost:3000 and sign in.

## Project layout

```
app/                    pages (App Router)
  login/                sign-in page + server actions
lib/supabase/           Supabase clients (server + browser)
proxy.ts                refreshes the session; redirects logged-out visitors to /login
supabase/migrations/    database schema + RLS policies
scripts/seed.ts         initial areas, targets and milestone checklists
```

## How targets work

Nothing is hardcoded: every target lives in the `targets` table.

- **daily:** the non-negotiables. A day is green when all of them are done.
- **weekly:** counts or minutes per week. `rollup_from` lets a weekly target add up another target's logs (weekly study hours = the sum of daily study minutes), and `rules.tag` narrows that to one kind (only `pytorch` sessions).
- **milestone:** a dated goal. Its checklist items are rows in `tasks`, and progress is measured in hours completed, not items ticked.

When a target's numbers change, the old version is saved automatically in `target_history`.
