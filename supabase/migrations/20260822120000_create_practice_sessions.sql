-- Migration: practice_sessions — the practice log behind the parent report.
-- One row per FINISHED session with every answered question inside it
-- (attempts jsonb: prompt, answer, given, correct, retry, ms, level, subskill,
-- family, itemId). Before this, nothing recorded when a session happened, how
-- long it took, or which prompts were missed.
--
-- kid_id is the first per-kid progress dimension (ADR-001 step 3): nullable
-- because anonymous-device rows merged on sign-in may predate a profile, and
-- ON DELETE SET NULL so deleting a kid profile (COPPA "refuse further
-- collection") detaches rather than silently loses the parent's history.
-- The whole-account purge cascades from auth.users.

create table if not exists public.practice_sessions (
  id                uuid primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  kid_id            uuid references public.kid_profiles(id) on delete set null,
  mode              text not null,
  kind              text not null default 'normal' check (kind in ('normal', 'fledging')),
  level_start       smallint not null check (level_start between 1 and 10),
  level_end         smallint not null check (level_end between 1 and 10),
  started_at        timestamptz not null,
  ended_at          timestamptz not null,
  duration_ms       integer not null default 0 check (duration_ms between 0 and 1800000),
  active_ms         integer not null default 0,
  questions         smallint not null default 0,
  first_try_correct smallint not null default 0,
  retries_mastered  smallint not null default 0,
  stars_earned      smallint not null default 0,
  attempts          jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists practice_sessions_user_started_idx
  on public.practice_sessions (user_id, started_at desc);
create index if not exists practice_sessions_kid_started_idx
  on public.practice_sessions (kid_id, started_at desc);

alter table public.practice_sessions enable row level security;

drop policy if exists "practice_sessions_select_own" on public.practice_sessions;
create policy "practice_sessions_select_own"
  on public.practice_sessions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "practice_sessions_insert_own" on public.practice_sessions;
create policy "practice_sessions_insert_own"
  on public.practice_sessions for insert to authenticated
  with check (auth.uid() = user_id);

-- Upsert (the client re-sends a row when an offline write is flushed) needs update.
drop policy if exists "practice_sessions_update_own" on public.practice_sessions;
create policy "practice_sessions_update_own"
  on public.practice_sessions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "practice_sessions_delete_own" on public.practice_sessions;
create policy "practice_sessions_delete_own"
  on public.practice_sessions for delete to authenticated
  using (auth.uid() = user_id);
