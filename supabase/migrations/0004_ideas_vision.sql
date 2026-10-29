-- Compound — Ideas and the Vision board.
-- Run once in Supabase → SQL Editor, after 0003_todo.sql.

-- ---------------------------------------------------------------------------
-- ideas — anything worth keeping, with why it came up
-- ---------------------------------------------------------------------------

create table ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  title       text not null,
  details     text,
  category    text,                 -- free text: Content, Project, Career, Business…
  context     text,                 -- why it came up: "while building ReadKernel"
  status      text not null default 'new' check (status in ('new', 'exploring', 'parked', 'done')),
  source      text not null default 'app' check (source in ('app', 'chat')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index ideas_user_idx on ideas (user_id, created_at desc);
create trigger ideas_updated_at before update on ideas for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- vision_items — the manifestation board
--   statement   written as already true: "I have 5,000 followers."
--   target_id   optional link to a tracked target, for live progress
--   image_path  a file in the private "vision" storage bucket
-- ---------------------------------------------------------------------------

create table vision_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  title       text not null,
  statement   text,
  details     text,
  category    text,
  target_date date,
  target_id   uuid references targets on delete set null,
  image_path  text,
  image_url   text,                 -- or a picture from the web, by link
  achieved_at timestamptz,
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger vision_items_updated_at before update on vision_items for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: owner only
-- ---------------------------------------------------------------------------

alter table ideas enable row level security;
create policy "owner only" on ideas for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter table vision_items enable row level security;
create policy "owner only" on vision_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Photo storage: a private bucket; each user's files live under <user id>/
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vision', 'vision', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "vision photos: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'vision' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vision photos: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'vision' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vision photos: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'vision' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vision photos: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'vision' and (storage.foldername(name))[1] = (select auth.uid())::text);
