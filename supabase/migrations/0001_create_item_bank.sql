-- Migration: 0001_create_item_bank
-- Creates the cloud-side item bank that supersedes the bundled
-- src/itemBank/applicationItems.js as the source of truth for approved
-- application-family items.

create table if not exists public.item_bank (
  item_id        text primary key,
  mode_id        text not null,
  item_family    text not null default 'application',
  subskill       text not null,
  structure_type text not null,
  level_min      int  not null,
  level_max      int  not null check (level_max >= level_min),
  review_status  text not null default 'draft'
                 check (review_status in ('draft','reviewed','approved','retired')),
  payload        jsonb not null,
  version        int  not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id) on delete set null,
  updated_by     uuid references auth.users(id) on delete set null
);

create index if not exists item_bank_mode_status_level_idx
  on public.item_bank (mode_id, review_status, level_min, level_max);

create index if not exists item_bank_subskill_idx
  on public.item_bank (subskill);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists item_bank_touch_updated_at on public.item_bank;
create trigger item_bank_touch_updated_at
  before update on public.item_bank
  for each row execute function public.touch_updated_at();

alter table public.item_bank enable row level security;

-- All authenticated users can read approved items.
drop policy if exists "item_bank_read_approved" on public.item_bank;
create policy "item_bank_read_approved"
  on public.item_bank
  for select
  to authenticated
  using (review_status = 'approved');

-- Admin policies are added in the profiles migration so we can reference
-- the is_admin flag via a security-definer helper.
