-- M6b.2 — columns the expanded taxonomy needs.
--
-- `structure_type` already exists and now carries the CCSS Table 1/2 vocabulary
-- (29 values) rather than the old informal one. Two things it cannot express:
--
--   variety_id  the ~306 documented varieties in docs/item-bank-variety-spec.md.
--               A tag, deliberately NOT a coverage axis: making it one would
--               take `fractions` from ~12 cells to 54 and the bank with it.
--
--   format_id   which format transform an item represents, for the few that are
--               authored rather than generated (error analysis carries real
--               narrative prose, so it is a bank item that happens to look like
--               a transform).
--
-- Both are nullable: every existing row is valid without them.

alter table public.item_bank
  add column if not exists variety_id text,
  add column if not exists format_id  text;

-- Coverage reporting groups by these, so index the combination we actually
-- query rather than each column separately.
create index if not exists item_bank_structure_variety_idx
  on public.item_bank (mode_id, structure_type, variety_id)
  where review_status = 'approved';

comment on column public.item_bank.variety_id is
  'Variety from docs/item-bank-variety-spec.md. A tag for reporting and targeting, not a coverage axis.';
comment on column public.item_bank.format_id is
  'Format transform this item represents, for authored formats such as error analysis. Null for plain items.';
