-- Migration: progress per kid (ADR-001 step 3, using kid_id -> kid_profiles as
-- practice_sessions already does).
--
-- Until now `progress` and `progress_item_stats` were keyed (user_id, mode):
-- siblings shared one level, one mistake bank, one star total. This adds a
-- nullable kid_id to both and re-keys uniqueness to (user_id, kid_id, mode[, item_id])
-- with NULLS NOT DISTINCT, so rows merged from an anonymous device before any
-- profile exists (kid_id null — the "household" row) still upsert cleanly.
--
-- Backfill rule: a household that already has kids gets its existing row COPIED
-- to every kid — they were all seeing that shared level, so nobody drops to
-- Level 1 — and the household row is then removed. Accounts without kids keep
-- their household row; the first kid to load a mode inherits it as a seed
-- (progressStore.loadCloud), the same one-time-inherit rule the device blob uses.
--
-- kid_id is ON DELETE CASCADE: a deleted child profile takes their progress
-- with it (16 CFR §312.6 — refuse further collection). accountPurge.purgeKidData
-- also deletes explicitly; the cascade is the backstop.

-- ---------- progress ----------
alter table public.progress
  add column if not exists kid_id uuid references public.kid_profiles(id) on delete cascade;

do $$
declare c record;
begin
  -- The live table was created by hand before migrations existed, so the
  -- (user_id, mode) unique constraint may not carry the textbook name.
  for c in
    select conname from pg_constraint
    where conrelid = 'public.progress'::regclass and contype = 'u'
  loop
    execute format('alter table public.progress drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.progress
  add constraint progress_user_kid_mode_key unique nulls not distinct (user_id, kid_id, mode);
create index if not exists progress_kid_idx on public.progress (kid_id);

-- ---------- progress_item_stats ----------
alter table public.progress_item_stats
  add column if not exists kid_id uuid references public.kid_profiles(id) on delete cascade;

alter table public.progress_item_stats drop constraint if exists progress_item_stats_pkey;
alter table public.progress_item_stats
  add column if not exists id uuid not null default gen_random_uuid();
alter table public.progress_item_stats add primary key (id);
alter table public.progress_item_stats
  add constraint progress_item_stats_user_kid_mode_item_key
  unique nulls not distinct (user_id, kid_id, mode, item_id);
create index if not exists progress_item_stats_kid_mode_idx on public.progress_item_stats (kid_id, mode);

-- ---------- backfill: copy household rows to every existing kid ----------
insert into public.progress (user_id, kid_id, mode, level, mistake_bank, total_sessions, lifetime_stars, updated_at)
select p.user_id, k.id, p.mode, p.level, p.mistake_bank, p.total_sessions, p.lifetime_stars, p.updated_at
from public.progress p
join public.kid_profiles k on k.user_id = p.user_id
where p.kid_id is null
on conflict (user_id, kid_id, mode) do nothing;

insert into public.progress_item_stats (user_id, kid_id, mode, item_id, attempts, first_try_correct, correct, total_response_ms, last_seen_at)
select s.user_id, k.id, s.mode, s.item_id, s.attempts, s.first_try_correct, s.correct, s.total_response_ms, s.last_seen_at
from public.progress_item_stats s
join public.kid_profiles k on k.user_id = s.user_id
where s.kid_id is null
on conflict (user_id, kid_id, mode, item_id) do nothing;

delete from public.progress p
where p.kid_id is null
  and exists (select 1 from public.kid_profiles k where k.user_id = p.user_id);

delete from public.progress_item_stats s
where s.kid_id is null
  and exists (select 1 from public.kid_profiles k where k.user_id = s.user_id);

-- ---------- RLS: a kid_id must belong to the caller ----------
drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own" on public.progress for insert to authenticated
  with check (
    auth.uid() = user_id
    and (kid_id is null or exists (select 1 from public.kid_profiles k where k.id = kid_id and k.user_id = auth.uid()))
  );
drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (kid_id is null or exists (select 1 from public.kid_profiles k where k.id = kid_id and k.user_id = auth.uid()))
  );

drop policy if exists "progress_item_stats_insert_own" on public.progress_item_stats;
create policy "progress_item_stats_insert_own" on public.progress_item_stats for insert to authenticated
  with check (
    auth.uid() = user_id
    and (kid_id is null or exists (select 1 from public.kid_profiles k where k.id = kid_id and k.user_id = auth.uid()))
  );
drop policy if exists "progress_item_stats_update_own" on public.progress_item_stats;
create policy "progress_item_stats_update_own" on public.progress_item_stats for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (kid_id is null or exists (select 1 from public.kid_profiles k where k.id = kid_id and k.user_id = auth.uid()))
  );
