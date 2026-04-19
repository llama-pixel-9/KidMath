-- Migration: 0002_create_progress_item_stats
-- Per-(user, mode, item) analytics that previously lived only in
-- localStorage as session.bankItemStats. Enables cross-device progress and
-- aggregate analytics for content tuning.

create table if not exists public.progress_item_stats (
  user_id            uuid not null references auth.users(id) on delete cascade,
  mode               text not null,
  item_id            text not null,
  attempts           int  not null default 0,
  first_try_correct  int  not null default 0,
  correct            int  not null default 0,
  total_response_ms  bigint not null default 0,
  last_seen_at       timestamptz not null default now(),
  primary key (user_id, mode, item_id)
);

create index if not exists progress_item_stats_item_idx
  on public.progress_item_stats (item_id);

create index if not exists progress_item_stats_user_mode_idx
  on public.progress_item_stats (user_id, mode);

alter table public.progress_item_stats enable row level security;

drop policy if exists "progress_item_stats_select_own" on public.progress_item_stats;
create policy "progress_item_stats_select_own"
  on public.progress_item_stats
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "progress_item_stats_insert_own" on public.progress_item_stats;
create policy "progress_item_stats_insert_own"
  on public.progress_item_stats
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "progress_item_stats_update_own" on public.progress_item_stats;
create policy "progress_item_stats_update_own"
  on public.progress_item_stats
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "progress_item_stats_delete_own" on public.progress_item_stats;
create policy "progress_item_stats_delete_own"
  on public.progress_item_stats
  for delete
  to authenticated
  using (auth.uid() = user_id);
