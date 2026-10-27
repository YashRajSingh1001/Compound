-- Compound — daily vocab: word categories and a history of every recall answer.
-- Run once in Supabase → SQL Editor, after 0001_init.sql.

-- Which group a word belongs to ("Tech & data", "Professional English"…).
-- The groups and how many words each gets per day live in the Vocab target's
-- rules, so this is free text rather than a fixed list.
alter table vocab_words
  add column category text,
  add column part_of_speech text;

-- One row per answer you type in a recall test or practice session.
create table vocab_reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  word_id      uuid not null references vocab_words on delete cascade,
  reviewed_on  date not null,
  mode         text not null default 'daily' check (mode in ('daily', 'practice')),
  answer       text not null,
  correct      boolean not null,
  feedback     text,
  box_before   int,
  box_after    int,
  created_at   timestamptz not null default now()
);

create index vocab_reviews_day_idx on vocab_reviews (user_id, reviewed_on);
create index vocab_reviews_word_idx on vocab_reviews (word_id);
create index vocab_words_learned_idx on vocab_words (user_id, learned_on);

alter table vocab_reviews enable row level security;
create policy "owner only" on vocab_reviews for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
