-- Capture the `public.progress` table that already exists in the live database.
--
-- This table was created manually (or via an uncommitted migration) and had NO
-- migration in the repo, even though src/progressStore.js reads/writes it as the
-- primary per-user progress store (level, mistake bank, session/star tallies).
-- The native iOS app depends on it, so its schema + RLS are captured here for
-- reproducibility and as the documented contract. Reconstructed faithfully from
-- the live table (columns, the (user_id,mode) upsert key) and the own-row RLS
-- pattern used by public.progress_item_stats (migration 0002).
--
-- Guarded with `if not exists` / `if not exists`-style DDL so applying it against
-- the live database is a no-op and never clobbers existing data; it materialises
-- the table in fresh/local environments and keeps the schema under version
-- control from here on.

create table if not exists public.progress (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  mode           text not null,
  level          int  not null default 1,
  mistake_bank   jsonb not null default '[]'::jsonb,
  total_sessions int  not null default 0,
  lifetime_stars int  not null default 0,
  updated_at     timestamptz not null default now(),
  unique (user_id, mode)
);

-- The client upserts on (user_id, mode) (src/progressStore.js `onConflict`).
create index if not exists progress_user_idx on public.progress (user_id);

-- Keep updated_at fresh (function defined in migration 0001).
drop trigger if exists progress_touch_updated_at on public.progress;
create trigger progress_touch_updated_at
  before update on public.progress
  for each row execute function public.touch_updated_at();

alter table public.progress enable row level security;

-- Own-row access only, mirroring progress_item_stats (migration 0002). A user
-- sees and writes their own progress and nobody else's.
drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own"
  on public.progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own"
  on public.progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own"
  on public.progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "progress_delete_own" on public.progress;
create policy "progress_delete_own"
  on public.progress
  for delete
  to authenticated
  using (auth.uid() = user_id);
