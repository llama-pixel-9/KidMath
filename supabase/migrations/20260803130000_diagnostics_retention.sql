-- E2 data hygiene: tighten session_diagnostics RLS and enforce the 90-day
-- retention the privacy policy commits to.
--
-- ⚠️ Review before applying (supabase db push is deliberately denied to
-- agents — see docs/compliance-claude-code-workorders.md).

-- 1 ▸ RLS. The launch posture (0006) let any anon client insert and update
-- any row: `update ... using (true)` meant one visitor could overwrite
-- another's diagnostics given a session_id. Telemetry now runs only for
-- signed-in users (src/main.jsx gates bootstrapTelemetry), so anon loses
-- write access entirely and writes are scoped to the caller's own rows.
--
-- Note on "own session_id": the client's session_id is generated in the
-- browser and is not a JWT claim, so Postgres cannot verify it directly.
-- The enforceable equivalent is user scoping — a caller may only touch rows
-- carrying their own auth.uid(), and session_id uniqueness stops collisions
-- within an account.

drop policy if exists "telemetry_insert_any" on public.session_diagnostics;
create policy "telemetry_insert_own" on public.session_diagnostics
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "telemetry_update_by_session" on public.session_diagnostics;
create policy "telemetry_update_own" on public.session_diagnostics
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2 ▸ Retention. §312.10 prohibits indefinite retention, and the published
-- privacy policy commits to 90 days for diagnostics. This makes that true.
create extension if not exists pg_cron;

create or replace function public.purge_old_diagnostics()
returns void language sql security definer as $$
  delete from public.session_diagnostics
   where started_at < now() - interval '90 days';
$$;

-- Idempotent scheduling: unschedule any previous copy first.
do $do$
begin
  perform cron.unschedule('purge-session-diagnostics')
   where exists (select 1 from cron.job where jobname = 'purge-session-diagnostics');
end
$do$;

select cron.schedule(
  'purge-session-diagnostics',
  '17 4 * * *',
  $$select public.purge_old_diagnostics()$$
);

-- Verify it actually runs (security program §6 says check monthly):
--   select jobname, schedule, active from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 5;
