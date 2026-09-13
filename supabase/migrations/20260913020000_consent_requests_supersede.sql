-- Resend hygiene for the email-plus consent flow.
--
-- Before this, every "Resend the email" tap inserted a fresh pending request
-- with its own 14-day link, and confirming one left the others live — so a
-- parent who tapped an older email's link created a SECOND profile for the
-- same child. Now a request is 'superseded' when a newer one is sent for the
-- same account, and granting one closes every other pending row in the same
-- transaction. Only the newest email's link works; the others land on a
-- "this link was replaced" page, never on a duplicate profile.
--
-- ⚠️ Review before applying (agents cannot supabase db push by design).

alter table public.consent_requests
  drop constraint if exists consent_requests_status_check;
alter table public.consent_requests
  add constraint consent_requests_status_check
  check (status in ('pending', 'granted', 'superseded'));

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
    return; -- granted, superseded, expired, or unknown — caller shows a soft page
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

  -- Any other email still in the parent's inbox for this account is now a
  -- resend of THIS consent; its link must not mint a duplicate profile.
  update public.consent_requests
     set status = 'superseded'
   where user_id = req.user_id and status = 'pending' and id <> req.id;

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

revoke execute on function public.grant_parental_consent(uuid) from public, anon, authenticated;

-- Superseded rows still hold a child's name; they age out on the same
-- 14-day promise as pending ones.
create or replace function public.expire_stale_consent_requests()
returns void language sql security definer set search_path = public as $$
  delete from public.consent_requests
   where status in ('pending', 'superseded')
     and notice_sent_at < now() - interval '14 days';
$$;

drop index if exists public.consent_requests_stale_idx;
create index if not exists consent_requests_stale_idx
  on public.consent_requests (notice_sent_at) where status in ('pending', 'superseded');
