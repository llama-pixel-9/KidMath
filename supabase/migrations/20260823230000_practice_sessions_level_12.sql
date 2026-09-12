-- Phase 3 (curriculum plan): Grade-5 modes extend to a 12-level ladder.
-- The practice-log check constraints capped session levels at 10 and would
-- reject level-11/12 sessions in fractionOps / decimalOps / volumeCoordinates.
alter table public.practice_sessions
  drop constraint if exists practice_sessions_level_start_check;
alter table public.practice_sessions
  drop constraint if exists practice_sessions_level_end_check;
alter table public.practice_sessions
  add constraint practice_sessions_level_start_check check (level_start between 1 and 12);
alter table public.practice_sessions
  add constraint practice_sessions_level_end_check check (level_end between 1 and 12);
