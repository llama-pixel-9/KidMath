-- Consent evidence. California B&P §17602 requires proof of what each
-- subscriber was shown and agreed to, retained for 3 years or 1 year after
-- termination, whichever is longer. `disclosure_text` stores the LITERAL
-- string rendered beside the checkbox — not a summary. That is the point.
create table if not exists public.consent_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            text not null check (kind in ('account','autorenew','coppa_vpc','coppa_revoked')),
  terms_version   text not null,
  privacy_version text not null,
  disclosure_text text not null,
  user_agent      text,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists consent_events_user_idx
  on public.consent_events (user_id, created_at desc);

alter table public.consent_events enable row level security;

-- Append-only from the client: a user may write and read their own consent
-- records, but may never alter or delete one. Evidence you can edit is not
-- evidence. Deletion happens only via the auth.users cascade.
drop policy if exists "consent_insert_own" on public.consent_events;
create policy "consent_insert_own" on public.consent_events
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "consent_select_own" on public.consent_events;
create policy "consent_select_own" on public.consent_events
  for select to authenticated using (auth.uid() = user_id);
