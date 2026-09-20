-- Play by skill (phase 2): a practice session can be FOR a skill.
--
-- skill_id  the catalog skill a pinned session practiced (src/skills/catalog.js);
--           null on a "mix" session across a grade's skills and on every
--           ladder session.
-- grade     the catalog grade the session worked in: 'K','1'..'5'.
--
-- Both nullable, no backfill: existing rows stay exactly as they are, and each
-- attempt inside `attempts` carries its own skillId going forward. The level
-- columns are untouched — a skill session still records the (internal) level
-- it played at.
--
-- APPLY BEFORE turning the skillsPlay flag on: the client only sends these
-- columns for skill sessions, and an insert naming an unknown column fails.

alter table public.practice_sessions
  add column if not exists skill_id text,
  add column if not exists grade text
    check (grade is null or grade in ('K','1','2','3','4','5'));

create index if not exists practice_sessions_skill_idx
  on public.practice_sessions (user_id, kid_id, skill_id)
  where skill_id is not null;
