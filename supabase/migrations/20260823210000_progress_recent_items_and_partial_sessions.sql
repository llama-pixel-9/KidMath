-- Kid-sim fix plan, PR B ("Ladder that fits").
--
-- 1. The no-repeat window (`recentBankItemIds`) used to be device-local only;
--    a kid switching devices at level 1–3 re-saw the same few prompts. Persist
--    it with the progress row (capped client-side at 24 ids).
-- 2. A session the kid leaves before the end card is now saved as
--    kind = 'partial' so "minutes practiced" stops being a floor.
--
-- Apply BEFORE deploying the client that writes these (the client selects
-- `recent_bank_item_ids` on every progress read).
alter table public.progress
  add column if not exists recent_bank_item_ids jsonb not null default '[]'::jsonb;

alter table public.practice_sessions
  drop constraint if exists practice_sessions_kind_check;
alter table public.practice_sessions
  add constraint practice_sessions_kind_check
  check (kind in ('normal', 'fledging', 'partial'));
