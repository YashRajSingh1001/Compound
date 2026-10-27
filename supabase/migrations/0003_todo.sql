-- Compound — to-do list: carry-over, categories and a finished log.
-- Run once in Supabase → SQL Editor, after 0002_vocab.sql.

-- The day a task was added and the day it was finished, in your timezone.
-- "Finished same day" and "days to finish" come from these two dates.
alter table tasks
  add column listed_on date,
  add column finished_on date;

update tasks set listed_on = created_at::date where listed_on is null;
update tasks set finished_on = completed_at::date where finished_on is null and status = 'done';

alter table tasks alter column listed_on set default current_date;
alter table tasks alter column listed_on set not null;

create index tasks_finished_idx on tasks (user_id, finished_on);

-- Which areas show up as to-do categories (Personal, Work, Study…). Areas
-- like Vocab or Journal stay out of the picker.
alter table areas add column for_tasks boolean not null default false;
