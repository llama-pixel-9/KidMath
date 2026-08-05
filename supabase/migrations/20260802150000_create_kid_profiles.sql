-- Migration: create kid_profiles
-- First flight (§20): one parent account holds up to four kids. We store
-- first name, age and grade — and nothing else (the screen says so; keep it
-- true). The 4-kid cap is enforced client-side and by policy check here.

create table if not exists public.kid_profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 40),
  age        text not null check (age in ('5','6','7','8','9','10','11','12+')),
  grade      text not null check (grade in ('K','1st','2nd','3rd','4th','5th','6th')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kid_profiles_user_idx on public.kid_profiles (user_id, created_at);

drop trigger if exists kid_profiles_touch_updated_at on public.kid_profiles;
create trigger kid_profiles_touch_updated_at
  before update on public.kid_profiles
  for each row execute function public.touch_updated_at();

alter table public.kid_profiles enable row level security;

drop policy if exists "kid_profiles_select_own" on public.kid_profiles;
create policy "kid_profiles_select_own"
  on public.kid_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "kid_profiles_insert_own" on public.kid_profiles;
create policy "kid_profiles_insert_own"
  on public.kid_profiles
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (select count(*) from public.kid_profiles k where k.user_id = auth.uid()) < 4
  );

drop policy if exists "kid_profiles_update_own" on public.kid_profiles;
create policy "kid_profiles_update_own"
  on public.kid_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "kid_profiles_delete_own" on public.kid_profiles;
create policy "kid_profiles_delete_own"
  on public.kid_profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);
