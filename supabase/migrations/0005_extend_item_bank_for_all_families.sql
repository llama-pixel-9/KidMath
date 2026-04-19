-- Migration: 0005_extend_item_bank_for_all_families
-- Prepares public.item_bank to host conceptual and procedural items (not just
-- application) across all K-5 level bands and adds indexes + generated columns
-- for the cell-coverage reporting used by the admin UI and bank:report.

-- Representation type used by conceptual/procedural items that aren't plain
-- word problems (e.g. 'numberLine', 'tenFrame', 'array', 'placeValueBlocks').
-- Nullable so existing application items remain valid.
alter table public.item_bank
  add column if not exists representation_type text;

-- Derived level-band column so the admin UI can filter by K-1 / 2-3 / 4-5
-- without recomputing on the client. Generated so it always matches
-- level_min/level_max.
alter table public.item_bank
  add column if not exists level_band text
    generated always as (
      case
        when level_min <= 3 then 'K-1'
        when level_min <= 6 then '2-3'
        else '4-5'
      end
    ) stored;

-- Freeform provenance (author, source url, license) used by the sourcing
-- pipeline to keep license-clean exemplars auditable. Kept as jsonb so we can
-- evolve the shape without another migration.
alter table public.item_bank
  add column if not exists source jsonb;

-- Reviewer attribution for the review-queue UI.
alter table public.item_bank
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.item_bank
  add column if not exists reviewed_at timestamptz;

-- Composite index that matches the selector hot path:
--   WHERE mode_id=? AND item_family=? AND review_status='approved'
--     AND level_min<=? AND level_max>=?
create index if not exists item_bank_mode_family_status_level_idx
  on public.item_bank (mode_id, item_family, review_status, level_min, level_max);

-- Band index for the admin cell-gap heatmap.
create index if not exists item_bank_mode_family_band_idx
  on public.item_bank (mode_id, item_family, level_band);
