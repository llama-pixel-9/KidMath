-- E5 consent plumbing: the email-plus VPC holding pen and the one-transaction
-- grant. 16 CFR §312.5(b)(2)(viii) / §312.5(c)(1).
--
-- ⚠️ Review before applying (agents cannot supabase db push by design).
-- Depends on 20260803120000_create_consent_events.sql.

-- The holding pen. §312.5(c)(1) lets us hold the parent's contact details —
-- and the names they typed — for the sole purpose of obtaining consent.
-- NOT a kid profile: nothing here feeds practice, sync, or any feature, and
-- expire_stale_consent_requests() deletes it if consent never arrives.
create table if not exists public.consent_requests (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  kid_first_name       text not null check (char_length(kid_first_name) between 1 and 40),
  kid_age              text not null check (kid_age in ('5','6','7','8','9','10','11','12+')),
  kid_grade            text not null check (kid_grade in ('K','1st','2nd','3rd','4th','5th','6th')),
  terms_version        text not null,
  privacy_version      text not null,
  status               text not null default 'pending' check (status in ('pending','granted')),
  notice_sent_at       timestamptz not null default now(),
  consent_received_at  timestamptz,
  confirmation_sent_at timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists consent_requests_user_idx
  on public.consent_requests (user_id, created_at desc);
create index if not exists consent_requests_stale_idx
  on public.consent_requests (notice_sent_at) where status = 'pending';

alter table public.consent_requests enable row level security;

-- Writes go through the Edge Functions (service role) only; a parent may
-- watch their own request's status.
drop policy if exists "consent_requests_select_own" on public.consent_requests;
create policy "consent_requests_select_own" on public.consent_requests
  for select to authenticated using (auth.uid() = user_id);

-- The one-transaction grant: on receipt of consent, create the kid profile
-- AND the consent evidence together — §312.5's "nothing about the child
-- touches the database before consent" has its complement here: when consent
-- lands, profile and evidence appear atomically or not at all.
create or replace function public.grant_parental_consent(p_request_id uuid)
returns table (
  kid_profile_id   uuid,
  consent_event_id uuid,
  kid_first_name   text,
  parent_email     text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  req     public.consent_requests%rowtype;
  kid_id  uuid;
  evt_id  uuid;
  email   text;
begin
  select * into req
    from public.consent_requests
   where id = p_request_id and status = 'pending'
     for update;
  if not found then
    return; -- already granted, expired, or unknown — caller shows a soft page
  end if;

  -- The 4-kid cap lives in kid_profiles RLS, which security definer bypasses;
  -- enforce it here too.
  if (select count(*) from public.kid_profiles k where k.user_id = req.user_id) >= 4 then
    raise exception 'kid profile limit reached';
  end if;

  insert into public.kid_profiles (user_id, first_name, age, grade)
  values (req.user_id, req.kid_first_name, req.kid_age, req.kid_grade)
  returning id into kid_id;

  update public.consent_requests
     set status = 'granted', consent_received_at = now()
   where id = req.id;

  insert into public.consent_events
    (user_id, kind, terms_version, privacy_version, disclosure_text, meta)
  values (
    req.user_id,
    'coppa_vpc',
    req.terms_version,
    req.privacy_version,
    'Parental Consent Notice v' || req.privacy_version || ' — email-plus (16 CFR 312.5(b)(2)(viii))',
    jsonb_build_object(
      'method', 'email-plus',
      'noticeSentAt', req.notice_sent_at,
      'consentReceivedAt', now(),
      'childProfileId', kid_id,
      'requestId', req.id
    )
  )
  returning id into evt_id;

  select u.email into email from auth.users u where u.id = req.user_id;

  return query select kid_id, evt_id, req.kid_first_name, email;
end;
$$;

-- Callable by the service role only (the consent-confirm Edge Function).
revoke execute on function public.grant_parental_consent(uuid) from public, anon, authenticated;

-- The confirming message is the second half of the email-plus method; its
-- timestamp completes the evidence triple. Service-role-only meta merge —
-- consent_events stays append-only for clients.
create or replace function public.stamp_consent_confirmation(
  p_consent_event_id uuid,
  p_sent_at timestamptz
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.consent_events
     set meta = meta || jsonb_build_object('confirmationSentAt', p_sent_at)
   where id = p_consent_event_id and kind = 'coppa_vpc';
$$;

revoke execute on function public.stamp_consent_confirmation(uuid, timestamptz) from public, anon, authenticated;

-- §312.5(c)(1): if no consent arrives within a reasonable time, delete the
-- contact information and any names held. 14 days is the window the direct
-- notice promises. (The parent's own account — their email under their own
-- consent — remains; the pending child name and grant token do not.)
create or replace function public.expire_stale_consent_requests()
returns void language sql security definer set search_path = public as $$
  delete from public.consent_requests
   where status = 'pending'
     and notice_sent_at < now() - interval '14 days';
$$;

do $do$
begin
  perform cron.unschedule('expire-consent-requests')
   where exists (select 1 from cron.job where jobname = 'expire-consent-requests');
end
$do$;

select cron.schedule(
  'expire-consent-requests',
  '43 4 * * *',
  $$select public.expire_stale_consent_requests()$$
);
