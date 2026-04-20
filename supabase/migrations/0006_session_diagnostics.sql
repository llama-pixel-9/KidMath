-- Session diagnostics: capture real-user runtime behavior so we can find
-- production hangs. Designed to be killable instantly via feature_flags.

create table if not exists public.session_diagnostics (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  device_label text,
  user_agent text,
  viewport jsonb,
  hardware jsonb,
  app_version text,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  counters jsonb not null default '{}'::jsonb,
  events jsonb not null default '[]'::jsonb,
  freeze_detected boolean not null default false,
  freeze_max_block_ms integer,
  post_mortem jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_diagnostics_started_at_idx on public.session_diagnostics (started_at desc);
create index if not exists session_diagnostics_freeze_idx on public.session_diagnostics (freeze_detected) where freeze_detected = true;
create index if not exists session_diagnostics_user_id_idx on public.session_diagnostics (user_id);

alter table public.session_diagnostics enable row level security;

drop policy if exists "telemetry_insert_any" on public.session_diagnostics;
create policy "telemetry_insert_any" on public.session_diagnostics
  for insert to anon, authenticated with check (true);

drop policy if exists "telemetry_update_by_session" on public.session_diagnostics;
create policy "telemetry_update_by_session" on public.session_diagnostics
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "telemetry_select_admin" on public.session_diagnostics;
create policy "telemetry_select_admin" on public.session_diagnostics
  for select to authenticated using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, enabled)
values ('session_telemetry', true)
on conflict (key) do nothing;

alter table public.feature_flags enable row level security;

drop policy if exists "feature_flags_select_any" on public.feature_flags;
create policy "feature_flags_select_any" on public.feature_flags
  for select to anon, authenticated using (true);

drop policy if exists "feature_flags_update_admin" on public.feature_flags;
create policy "feature_flags_update_admin" on public.feature_flags
  for update to authenticated using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );
