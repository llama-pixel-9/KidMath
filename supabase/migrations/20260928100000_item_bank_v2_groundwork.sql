-- Migration: 20260928100000_item_bank_v2_groundwork
-- Item bank v2 groundwork: per-item tag and hint columns on item_bank, the
-- per-skill version switch, and the item_models table that v2 items are
-- generated from.
--
-- Apply with `supabase db push` from the repo root after review (agents never
-- push by design). Additive and idempotent: every statement is
-- `if not exists` / `drop policy if exists`, and no existing row is edited.
--
-- The app does not depend on this having landed. src/itemBank/versionSwitch.js
-- treats a missing item_version_switch table as "every skill on v1", and the
-- loaders fall back to the v1 column list when item_bank lacks the new
-- columns, so the web app can deploy before or after this migration.

-- ---------------------------------------------------------------------------
-- item_bank: v2 columns. All nullable, so every v1 row stays valid untouched.
-- `version` (int, default 1) already exists from 0001; v2 rows carry 2.
-- ---------------------------------------------------------------------------
alter table public.item_bank
  add column if not exists item_model_id text,
  add column if not exists difficulty text
    check (difficulty in ('easy', 'moderate', 'hard')),
  add column if not exists hint jsonb,
  add column if not exists tags jsonb,
  add column if not exists kid_safe jsonb;

comment on column public.item_bank.item_model_id is
  'item_models.id this row was generated from. Fixing one model fixes all its copies.';
comment on column public.item_bank.difficulty is
  'easy | moderate | hard within the row''s grade band. Null on v1 rows.';
comment on column public.item_bank.hint is
  'Per-item hint content: { nudge, steps[], picture, example, feedback, solution }. Any field may be missing.';
comment on column public.item_bank.tags is
  'Structured tags that are not filter columns (curriculum, language, context, wrong-answer mistakes).';
comment on column public.item_bank.kid_safe is
  'Kid-safe check verdict for this row: { ok, hits[], checked_at }.';

-- The admin UI lists every copy of a model; keep that a single index probe.
create index if not exists item_bank_item_model_idx
  on public.item_bank (item_model_id)
  where item_model_id is not null;

-- ---------------------------------------------------------------------------
-- item_version_switch: which bank version each skill serves. Read by the app
-- on every bank load, so a flip reaches the next session with no redeploy.
--   v1      -> version-1 rows for everyone
--   preview -> version-2 rows for preview browsers, version-1 for everyone else
--   v2      -> version-2 rows for everyone
-- ---------------------------------------------------------------------------
create table if not exists public.item_version_switch (
  mode_id      text primary key,
  live_version text not null default 'v1'
               check (live_version in ('v1', 'preview', 'v2')),
  changed_by   uuid null,
  changed_at   timestamptz not null default now(),
  note         text null
);

-- The row is an audit record of the flip, so its timestamp must move with it.
create or replace function public.touch_changed_at()
returns trigger as $$
begin
  new.changed_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists item_version_switch_touch_changed_at on public.item_version_switch;
create trigger item_version_switch_touch_changed_at
  before update on public.item_version_switch
  for each row execute function public.touch_changed_at();

alter table public.item_version_switch enable row level security;

-- Anonymous kids load the bank too, so the switch is readable without a session.
drop policy if exists "item_version_switch_select" on public.item_version_switch;
create policy "item_version_switch_select"
  on public.item_version_switch
  for select
  to anon, authenticated
  using (true);

drop policy if exists "item_version_switch_admin_insert" on public.item_version_switch;
create policy "item_version_switch_admin_insert"
  on public.item_version_switch
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "item_version_switch_admin_update" on public.item_version_switch;
create policy "item_version_switch_admin_update"
  on public.item_version_switch
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "item_version_switch_admin_delete" on public.item_version_switch;
create policy "item_version_switch_admin_delete"
  on public.item_version_switch
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- One row per skill (the TOPIC_LABELS keys in src/skills/catalog.js), all on
-- v1. Re-running never resets a skill that has since been flipped.
insert into public.item_version_switch (mode_id) values
  ('counting'),
  ('comparing'),
  ('skipCounting'),
  ('placeValue'),
  ('placeValueDiscs'),
  ('numberBonds'),
  ('addition'),
  ('subtraction'),
  ('barModels'),
  ('multiplication'),
  ('division'),
  ('factorsMultiples'),
  ('patterns'),
  ('fractions'),
  ('fractionOps'),
  ('decimals'),
  ('decimalOps'),
  ('measurement'),
  ('money'),
  ('time'),
  ('dataGraphs'),
  ('areaPerimeter'),
  ('angles'),
  ('linesShapes'),
  ('volumeCoordinates')
on conflict (mode_id) do nothing;

-- ---------------------------------------------------------------------------
-- item_models: the templates v2 items are generated from. `spec` holds the
-- template, slots, number ranges, widget and hint slots; review happens per
-- model, never in bulk.
-- ---------------------------------------------------------------------------
create table if not exists public.item_models (
  id            text primary key,
  mode_id       text not null,
  subskill      text,
  grade         text,
  difficulty    text,
  spec          jsonb not null,
  review_status text not null default 'draft'
                check (review_status in ('draft', 'approved', 'rejected', 'flagged')),
  review_note   text,
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists item_models_touch_updated_at on public.item_models;
create trigger item_models_touch_updated_at
  before update on public.item_models
  for each row execute function public.touch_updated_at();

-- The review queue is "this skill, riskiest first"; the dashboard counts by status.
create index if not exists item_models_mode_status_idx
  on public.item_models (mode_id, review_status);

alter table public.item_models enable row level security;

drop policy if exists "item_models_select" on public.item_models;
create policy "item_models_select"
  on public.item_models
  for select
  to authenticated
  using (true);

drop policy if exists "item_models_admin_insert" on public.item_models;
create policy "item_models_admin_insert"
  on public.item_models
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "item_models_admin_update" on public.item_models;
create policy "item_models_admin_update"
  on public.item_models
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "item_models_admin_delete" on public.item_models;
create policy "item_models_admin_delete"
  on public.item_models
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));
