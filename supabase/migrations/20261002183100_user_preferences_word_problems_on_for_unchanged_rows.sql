-- Word problems on for signed-in households that never chose (Sai, 2026-10-02).
--
-- NEEDS SAI'S GO-AHEAD. Not applied. If Sai says no, delete this file before
-- the next push (supabase db push applies every pending migration).
--
-- Why: before 2026-10-02 the web client gave every signed-in user without a
-- row a new row seeded from this device, and the device default was off. So
-- almost every existing row says false, whether or not anyone chose that. The
-- cloud value wins on sign-in and is copied to the device, so without this
-- step the new default (on) reaches only signed-out browsers and new accounts.
-- 20261002183000 changes the column default only.
--
-- Which rows: false rows nobody changed after that seeding insert. The insert
-- sent updated_at from the device clock and created_at came from the server,
-- so the two agree to within the device clock's error. Every later write (a
-- gear toggle, or the old failed-read re-seed) is an upsert UPDATE, and the
-- touch_updated_at trigger moves updated_at to the server's now(), so a row
-- that was ever written again is left alone.
--
-- Where it can be wrong:
--   * a device clock more than a minute off at the first sign-in: the row
--     looks changed and stays off (the safe side);
--   * a row re-seeded by the old failed-read bug looks changed and stays off;
--   * a parent who switched stories off within a minute of the first sign-in,
--     or switched them on and back off while signed out before ever signing
--     in, gets them back on (rare; the gear switch turns them off again).
--
-- The other option Sai can pick: flip every false row
--   update public.user_preferences set allow_word_problems = true
--    where allow_word_problems = false;
-- which also overrides households that switched stories off on purpose (they
-- cannot be told apart from the seeded default).
--
-- Preview before applying:
--   select count(*) filter (where abs(extract(epoch from (updated_at - created_at))) < 60) as flips,
--          count(*) as all_false
--     from public.user_preferences
--    where allow_word_problems = false;
--
-- Review before applying (agents cannot supabase db push by design).

update public.user_preferences
   set allow_word_problems = true
 where allow_word_problems = false
   and abs(extract(epoch from (updated_at - created_at))) < 60;
