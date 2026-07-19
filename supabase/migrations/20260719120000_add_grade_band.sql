-- Migration: 20260719120000_add_grade_band
-- Adds a generated `grade_band` column (G1–G4) to public.item_bank ALONGSIDE the
-- existing `level_band` (K-1 / 2-3 / 4-5). Additive and non-breaking: every
-- existing consumer of `level_band` (admin coverage query, heatmap, bank:report)
-- keeps working unchanged. The Grade 1–4 axis is the migration target for the
-- Grade 1–4 expansion (docs/grade1-4-expansion-plan.md §2 / §6c); this column
-- lets the cloud bank expose grades before the app-side switch flips over.
--
-- Thresholds mirror src/bands.js `levelToGrade` on level_min:
--   level_min <= 3 -> G1 ;  <= 6 -> G2 ;  <= 8 -> G3 ;  else -> G4
-- (G3/G4 split the legacy 4-5 band; when modes extend to 12 levels G4 covers
-- levels 10–12, and this expression is unchanged.)

alter table public.item_bank
  add column if not exists grade_band text
    generated always as (
      case
        when level_min <= 3 then 'G1'
        when level_min <= 6 then 'G2'
        when level_min <= 8 then 'G3'
        else 'G4'
      end
    ) stored;

-- Band index mirroring item_bank_mode_family_band_idx (which is keyed on
-- level_band) so the grade-band cell/coverage query has the same index support.
create index if not exists item_bank_mode_family_grade_band_idx
  on public.item_bank (mode_id, item_family, grade_band);
