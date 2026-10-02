-- Word problems on by default (Sai, 2026-10-02). The web client now treats a
-- missing choice as "on" (src/userPreferences.js DEFAULT_ALLOW_WORD_PROBLEMS),
-- and the client seeds a new user's row from that value; this keeps the
-- column default in step for any row inserted without it.
--
-- Schema only: rows that already exist keep the value they hold, and almost
-- all of them say false because they were seeded from the old device default.
-- Until 20261002183100 (needs Sai's go-ahead) is applied, existing signed-in
-- households keep word problems off.
--
-- Review before applying (agents cannot supabase db push by design).

alter table public.user_preferences
  alter column allow_word_problems set default true;
