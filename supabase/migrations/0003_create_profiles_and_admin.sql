-- Migration: 0003_create_profiles_and_admin
-- Adds a lightweight profiles table with an is_admin flag, plus admin
-- policies on item_bank that depend on it.

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin lookup helper. SECURITY DEFINER bypasses RLS so policies on
-- other tables can call it safely.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select is_admin from public.profiles where user_id = uid), false);
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Admin policies on item_bank: full read and CRUD for admins.
drop policy if exists "item_bank_admin_read_all" on public.item_bank;
create policy "item_bank_admin_read_all"
  on public.item_bank
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "item_bank_admin_insert" on public.item_bank;
create policy "item_bank_admin_insert"
  on public.item_bank
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "item_bank_admin_update" on public.item_bank;
create policy "item_bank_admin_update"
  on public.item_bank
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "item_bank_admin_delete" on public.item_bank;
create policy "item_bank_admin_delete"
  on public.item_bank
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));
