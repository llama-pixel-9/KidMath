-- Migration: 20260928110000_kid_profiles_state
-- Item bank v2 groundwork: which US state's test vocabulary a kid sees.
-- Items are written in Common Core wording; a kid with a state on file gets
-- that state's words swapped in (src/content/stateWords.js — "strip diagram"
-- in Texas). Null means Common Core wording, which every existing kid keeps.
-- The state changes vocabulary only: not the items, levels or progress.
--
-- Apply with `supabase db push` from the repo root after review (agents never
-- push by design). Additive and idempotent; no existing row is edited. The
-- web app reads this column with a fallback (src/kidProfiles.js fetchKids),
-- so it can deploy before or after this lands.
--
-- Follow-ups outside this migration: consent_requests / grant_parental_consent
-- do not carry a state yet (a kid added through the consent email starts at
-- Common Core wording), and the iOS KidProfilesService mirror.

alter table public.kid_profiles
  add column if not exists state text
    -- Null passes a CHECK, so "not set" needs no separate clause.
    check (state ~ '^[A-Z]{2}$');

comment on column public.kid_profiles.state is
  'Two-letter USPS code of the state whose test wording the kid sees (src/usStates.js), or null for Common Core wording. Changes vocabulary only.';
