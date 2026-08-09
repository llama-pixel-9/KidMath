-- Open-world data model (docs/larkit-open-world-implementation-plan.md, Part 3).
--
-- ADDITIVE ONLY, by design law (plan Part 4): new tables, no ALTERs to
-- anything the live game uses. Not applied to production until the first
-- dark merge.
--
-- Ownership model: every row belongs to a kid (kid_profiles) under a parent
-- account (auth.users). user_id is stored redundantly on each table so RLS
-- stays a cheap equality check; the award Edge Function verifies the
-- kid ↔ user link before writing.
--
-- Write posture (server-authoritative economy, plan Part 3):
--   world_defs        read-only content, service-role writes only
--   skill_mastery     client reads own rows; ONLY the world-award function writes
--   world_inventory   client reads own rows; ONLY the world-award function writes
--   world_award_log   append-only audit, service-role writes; parents can read
--   world_player_state / quest_progress
--                     position and quest-step state are not currency — the
--                     client reads and writes its own rows directly.

-- ---------------------------------------------------------------- world_defs
-- Versioned zone content: layout, NPC placements, quest graph, interaction
-- points. Content, not code — new islands ship as rows, without app releases.
create table if not exists public.world_defs (
  zone_id    text not null,
  version    int  not null default 1,
  def        jsonb not null,
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (zone_id, version)
);

alter table public.world_defs enable row level security;

-- Anyone (including the account-free free tier) may read published zones.
-- No client write policies: zone content ships via service role / migrations.
drop policy if exists "world_defs_select_published" on public.world_defs;
create policy "world_defs_select_published"
  on public.world_defs
  for select
  to anon, authenticated
  using (published);

-- --------------------------------------------------------- world_player_state
create table if not exists public.world_player_state (
  kid_id           uuid primary key references public.kid_profiles(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  current_zone     text,
  position         jsonb,
  discovered_zones text[] not null default '{}',
  updated_at       timestamptz not null default now()
);

create index if not exists world_player_state_user_idx on public.world_player_state (user_id);

drop trigger if exists world_player_state_touch_updated_at on public.world_player_state;
create trigger world_player_state_touch_updated_at
  before update on public.world_player_state
  for each row execute function public.touch_updated_at();

alter table public.world_player_state enable row level security;

drop policy if exists "world_player_state_select_own" on public.world_player_state;
create policy "world_player_state_select_own"
  on public.world_player_state
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "world_player_state_insert_own" on public.world_player_state;
create policy "world_player_state_insert_own"
  on public.world_player_state
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.kid_profiles k where k.id = kid_id and k.user_id = auth.uid())
  );

drop policy if exists "world_player_state_update_own" on public.world_player_state;
create policy "world_player_state_update_own"
  on public.world_player_state
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "world_player_state_delete_own" on public.world_player_state;
create policy "world_player_state_delete_own"
  on public.world_player_state
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------- skill_mastery
-- Per-skill mastery driving discovery: Leitner box + streak + spaced
-- repetition due date. Progression = learning; the award function is the one
-- writer, so mastery can't be minted client-side any more than stars can.
create table if not exists public.skill_mastery (
  kid_id       uuid not null references public.kid_profiles(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  skill_id     text not null,
  box          int  not null default 1 check (box between 1 and 5),
  streak       int  not null default 0,
  attempts     int  not null default 0,
  correct      int  not null default 0,
  last_seen_at timestamptz,
  due_at       timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (kid_id, skill_id)
);

create index if not exists skill_mastery_user_idx on public.skill_mastery (user_id);
create index if not exists skill_mastery_due_idx  on public.skill_mastery (kid_id, due_at);

drop trigger if exists skill_mastery_touch_updated_at on public.skill_mastery;
create trigger skill_mastery_touch_updated_at
  before update on public.skill_mastery
  for each row execute function public.touch_updated_at();

alter table public.skill_mastery enable row level security;

drop policy if exists "skill_mastery_select_own" on public.skill_mastery;
create policy "skill_mastery_select_own"
  on public.skill_mastery
  for select
  to authenticated
  using (auth.uid() = user_id);
-- No insert/update/delete policies: world-award (service role) is the only writer.

-- ----------------------------------------------------------- world_inventory
-- Stars balance, owned cosmetics, pet, home layout. Economy = effort.
create table if not exists public.world_inventory (
  kid_id     uuid primary key references public.kid_profiles(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  stars      int  not null default 0 check (stars >= 0),
  items      jsonb not null default '[]'::jsonb,
  pet        jsonb,
  home       jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists world_inventory_user_idx on public.world_inventory (user_id);

drop trigger if exists world_inventory_touch_updated_at on public.world_inventory;
create trigger world_inventory_touch_updated_at
  before update on public.world_inventory
  for each row execute function public.touch_updated_at();

alter table public.world_inventory enable row level security;

drop policy if exists "world_inventory_select_own" on public.world_inventory;
create policy "world_inventory_select_own"
  on public.world_inventory
  for select
  to authenticated
  using (auth.uid() = user_id);
-- No client write policies: the client never mints currency (plan Part 3).
-- Spending (cosmetics purchases) will be a second Edge Function later —
-- still server-side, still this one table.

-- ------------------------------------------------------------ quest_progress
create table if not exists public.quest_progress (
  kid_id     uuid not null references public.kid_profiles(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  quest_id   text not null,
  zone_id    text not null,
  step       int  not null default 0,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (kid_id, quest_id)
);

create index if not exists quest_progress_user_idx on public.quest_progress (user_id);

drop trigger if exists quest_progress_touch_updated_at on public.quest_progress;
create trigger quest_progress_touch_updated_at
  before update on public.quest_progress
  for each row execute function public.touch_updated_at();

alter table public.quest_progress enable row level security;

drop policy if exists "quest_progress_select_own" on public.quest_progress;
create policy "quest_progress_select_own"
  on public.quest_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "quest_progress_insert_own" on public.quest_progress;
create policy "quest_progress_insert_own"
  on public.quest_progress
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.kid_profiles k where k.id = kid_id and k.user_id = auth.uid())
  );

drop policy if exists "quest_progress_update_own" on public.quest_progress;
create policy "quest_progress_update_own"
  on public.quest_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "quest_progress_delete_own" on public.quest_progress;
create policy "quest_progress_delete_own"
  on public.quest_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------- world_award_log
-- One row per world-award call: the audit trail for the economy (plan
-- Part 6). Append-only; written by the Edge Function with the service role.
create table if not exists public.world_award_log (
  id            uuid primary key default gen_random_uuid(),
  kid_id        uuid not null references public.kid_profiles(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  zone_id       text,
  quest_id      text,
  payload       jsonb not null,
  stars_awarded int  not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists world_award_log_kid_idx on public.world_award_log (kid_id, created_at);

alter table public.world_award_log enable row level security;

drop policy if exists "world_award_log_select_own" on public.world_award_log;
create policy "world_award_log_select_own"
  on public.world_award_log
  for select
  to authenticated
  using (auth.uid() = user_id);
-- No client write policies — service role only.
