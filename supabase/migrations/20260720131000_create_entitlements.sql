-- Shared subscription entitlement, one row per user.
--
-- The iOS app sells via StoreKit 2 (App Store rule for digital subscriptions);
-- the web app sells via Stripe. Both write the SAME entitlement here, so either
-- platform can unlock premium content and there is a single source of truth.
-- `source` records which platform granted the active entitlement.
--
-- Kept separate from `public.profiles` on purpose: profiles is admin-writable
-- only (users cannot self-update it, which is what stops self-promotion to
-- admin). Entitlements need to be written by the signed-in user, so they live
-- in their own table with own-row RLS.
--
-- TRUST MODEL (v1): the client writes its own entitlement after StoreKit 2's
-- on-device cryptographic verification (or a verified Stripe webhook redirect on
-- web). This is spoofable by a determined user editing their own row. The
-- documented hardening path is a Supabase Edge Function that validates receipts
-- with Apple's App Store Server API / Stripe webhooks and becomes the ONLY
-- writer (RLS below would then drop the own-row insert/update and grant them to
-- the service role instead). Shipping v1 client-write is an accepted tradeoff.

create table if not exists public.entitlements (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  status       text not null default 'none'
               check (status in ('none', 'active', 'grace', 'expired')),
  source       text check (source in ('appstore', 'stripe')),
  product_id   text,
  expires_at   timestamptz,
  updated_at   timestamptz not null default now()
);

drop trigger if exists entitlements_touch_updated_at on public.entitlements;
create trigger entitlements_touch_updated_at
  before update on public.entitlements
  for each row execute function public.touch_updated_at();

alter table public.entitlements enable row level security;

-- Own-row read/write (v1 client-write trust model, see header). Admins read all.
drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "entitlements_insert_own" on public.entitlements;
create policy "entitlements_insert_own"
  on public.entitlements
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "entitlements_update_own" on public.entitlements;
create policy "entitlements_update_own"
  on public.entitlements
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Convenience: is the signed-in user currently entitled? Usable from PostgREST
-- (`select public.has_active_entitlement()`) and from RLS on any future
-- premium-gated table.
create or replace function public.has_active_entitlement(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = uid
      and e.status in ('active', 'grace')
      and (e.expires_at is null or e.expires_at > now())
  );
$$;
