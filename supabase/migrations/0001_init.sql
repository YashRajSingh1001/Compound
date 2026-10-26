-- Compound — initial schema.
-- Run once in Supabase → SQL Editor (paste the whole file, click Run).
--
-- Every table has user_id + Row Level Security: a row is visible and editable
-- only by the user who owns it. user_id defaults to the logged-in user, so the
-- app never has to send it.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- areas — life areas (Study, Fitness, Content…), used for colour + grouping
-- ---------------------------------------------------------------------------

create table areas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null,
  color       text not null default '#71717a',
  sort        int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------------------
-- targets — daily non-negotiables, weekly targets and milestones
--
--   rollup_from  a weekly/milestone target can be computed from another
--                target's logs (e.g. weekly study hours = sum of daily study
--                minutes). Null means it is logged directly.
--   rules        small per-target settings that don't deserve a column, e.g.
--                {"weekend_min": 150}         stricter target on Sat/Sun
--                {"rest_days_per_week": 1}    rest day doesn't break streak
--                {"tag": "gym"}               only count logs with this tag
--                {"aggregate": "latest"}      use latest value, not the sum
-- ---------------------------------------------------------------------------

create table targets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  area_id      uuid references areas on delete set null,
  name         text not null,
  kind         text not null check (kind in ('daily', 'weekly', 'milestone')),
  metric       text not null check (metric in ('bool', 'count', 'minutes')),
  target_min   numeric,
  target_max   numeric,
  unit         text,
  due_date     date,
  rollup_from  uuid references targets on delete set null,
  rules        jsonb not null default '{}',
  notes        text,
  sort         int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger targets_updated_at before update on targets
  for each row execute function set_updated_at();

-- Keeps the old version of a target whenever its numbers change, so the
-- Insights page can show "target was 15 h until 3 Nov, then 12.5 h".
create table target_history (
  id           bigint generated always as identity primary key,
  target_id    uuid not null references targets on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  target_min   numeric,
  target_max   numeric,
  due_date     date,
  rules        jsonb,
  active       boolean,
  valid_from   timestamptz not null,
  valid_to     timestamptz not null default now()
);

create or replace function record_target_history() returns trigger
language plpgsql as $$
begin
  if (old.target_min, old.target_max, old.due_date, old.rules, old.active)
     is distinct from
     (new.target_min, new.target_max, new.due_date, new.rules, new.active) then
    insert into target_history
      (target_id, user_id, target_min, target_max, due_date, rules, active, valid_from)
    values
      (old.id, old.user_id, old.target_min, old.target_max, old.due_date, old.rules, old.active, old.updated_at);
  end if;
  return new;
end;
$$;

create trigger targets_history before update on targets
  for each row execute function record_target_history();

-- ---------------------------------------------------------------------------
-- tasks — one-off and recurring to-dos; also milestone checklist items
-- ---------------------------------------------------------------------------

create table tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  title           text not null,
  area_id         uuid references areas on delete set null,
  milestone_id    uuid references targets on delete cascade,
  due_date        date,
  recurrence      text,            -- e.g. 'daily', 'weekly:mon', null = one-off
  est_minutes     int,
  actual_minutes  int,
  status          text not null default 'todo'
                  check (status in ('todo', 'in_progress', 'done', 'skipped')),
  source          text not null default 'app'
                  check (source in ('app', 'quick_add', 'chat', 'seed')),
  notes           text,
  sort            int not null default 0,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index tasks_milestone_idx on tasks (milestone_id);
create index tasks_due_idx on tasks (user_id, due_date);

-- ---------------------------------------------------------------------------
-- daily_logs — what actually happened. Several rows per target per day are
-- fine (e.g. two study sessions). tag splits one target into kinds
-- (study: 'genai' | 'pytorch', workout: 'gym' | 'run' | 'rest').
-- ---------------------------------------------------------------------------

create table daily_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  log_date    date not null,
  target_id   uuid not null references targets on delete cascade,
  value       numeric not null default 1,
  tag         text,
  note        text,
  source      text not null default 'app' check (source in ('app', 'chat', 'import')),
  created_at  timestamptz not null default now()
);

create index daily_logs_date_idx on daily_logs (user_id, log_date);
create index daily_logs_target_idx on daily_logs (target_id, log_date);

-- ---------------------------------------------------------------------------
-- journal_entries — one per day. Never sent to the LLM.
-- ---------------------------------------------------------------------------

create table journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  entry_date  date not null,
  text        text not null,
  source      text not null default 'app' check (source in ('app', 'chat', 'import')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, entry_date)
);

create trigger journal_updated_at before update on journal_entries
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- vocab_words — Leitner boxes 1–5; a word moves up a box when recalled,
-- back to box 1 when missed.
-- ---------------------------------------------------------------------------

create table vocab_words (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  word           text not null,
  meaning        text not null,
  example        text,
  learned_on     date not null default current_date,
  box            int  not null default 1 check (box between 1 and 5),
  next_review    date not null default current_date + 1,
  times_tested   int  not null default 0,
  times_correct  int  not null default 0,
  created_at     timestamptz not null default now()
);

-- No repeats, ignoring case.
create unique index vocab_words_unique on vocab_words (user_id, lower(word));
create index vocab_review_idx on vocab_words (user_id, next_review);

-- ---------------------------------------------------------------------------
-- watchlist — things to watch / read / listen to
-- ---------------------------------------------------------------------------

create table watchlist (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  url          text,
  title        text,
  type         text check (type in ('movie', 'series', 'podcast', 'article', 'book', 'reel', 'video')),
  mood         text check (mood in ('brain', 'fun', 'background')),
  est_minutes  int,
  status       text not null default 'inbox' check (status in ('inbox', 'queued', 'done')),
  source       text not null default 'app' check (source in ('app', 'chat')),
  added_at     timestamptz not null default now(),
  done_at      timestamptz
);

-- ---------------------------------------------------------------------------
-- verdicts — the daily LLM verdict, plus exactly what it was shown
-- ---------------------------------------------------------------------------

create table verdicts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  verdict_date    date not null,
  text            text not null,
  model           text not null,
  inputs_summary  jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  unique (user_id, verdict_date)
);

-- ---------------------------------------------------------------------------
-- target_suggestions — adaptive targets. Always a suggestion; never applied
-- automatically.
-- ---------------------------------------------------------------------------

create table target_suggestions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  target_id       uuid not null references targets on delete cascade,
  direction       text not null check (direction in ('lower', 'raise')),
  suggested_min   numeric,
  suggested_max   numeric,
  reason          text not null,
  status          text not null default 'open' check (status in ('open', 'accepted', 'dismissed')),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

-- ---------------------------------------------------------------------------
-- Row Level Security: owner-only on every table
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'areas', 'targets', 'target_history', 'tasks', 'daily_logs',
    'journal_entries', 'vocab_words', 'watchlist', 'verdicts', 'target_suggestions'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "owner only" on %I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end;
$$;
