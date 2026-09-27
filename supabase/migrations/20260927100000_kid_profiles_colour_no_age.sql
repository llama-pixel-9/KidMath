-- Design handoff 2a (2026-09-26): "Who's learning" collects first name, grade
-- and a colour — age is removed. Age stays as a column for rows that have it
-- but is no longer required; the colour picks the kid's circle on the
-- profile picker. Collecting LESS than the parental-consent notice lists is
-- fine; the notice copy is tidied separately.
--
-- ⚠️ Review before applying (agents cannot supabase db push by design).

alter table public.kid_profiles
  alter column age drop not null,
  add column if not exists colour text
    check (colour is null or colour in ('seafoam', 'tealMid', 'apricot', 'sunLight'));

alter table public.consent_requests
  alter column kid_age drop not null;
