-- The live `progress` table carries a check constraint `progress_mode_check`
-- that is NOT in this migrations folder (schema drift from the hand-created
-- table). It allows only addition / subtraction / multiplication, so every
-- signed-in save for the other 19 modes fails with 23514 and the kid restarts
-- that mode at level 1 next session. Found by the 2026-08-23 kid simulation
-- (docs/qa/kid-sim-2026-08-report.md). Modes are app-defined; drop the check
-- rather than enumerate 22 ids the DB would have to track.
alter table public.progress drop constraint if exists progress_mode_check;
