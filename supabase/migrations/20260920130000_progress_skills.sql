-- Play by skill (phase 3): the per-topic grade pointer and skill mastery live
-- on the per-kid, per-mode progress row, next to the level they replace in the
-- UI. No new table: this row is already scoped by kid_id, covered by RLS and
-- by the account-deletion purge, and merged on sign-in.
--
--   grade            the catalog grade ('K','1'..'5') the kid is working in for
--                    this topic; null = not decided yet (the client resolves it
--                    from the level and the practice log — the level is never
--                    moved by that).
--   grade_unlocked   the highest grade earned by mastery, or opened by a parent.
--   pinned_skill_id  a catalog skill a parent pinned for this kid.
--   skill_mastery    { [skillId]: { state, attempts, correct, recent, sessions,
--                    needsReview, masteredAt, lastSessionAt, sinceMastery } }
--                    for this topic's skills only (src/skills/mastery.js).
--
-- All nullable / defaulted, no backfill: existing rows are untouched and the
-- first load derives mastery from practice_sessions.
--
-- APPLY BEFORE turning VITE_SKILLS_PLAY on: the client only names these
-- columns when the flag is on, and a query naming an unknown column fails.

alter table public.progress
  add column if not exists grade text
    check (grade is null or grade in ('K','1','2','3','4','5')),
  add column if not exists grade_unlocked text
    check (grade_unlocked is null or grade_unlocked in ('K','1','2','3','4','5')),
  add column if not exists pinned_skill_id text,
  add column if not exists skill_mastery jsonb not null default '{}'::jsonb;
