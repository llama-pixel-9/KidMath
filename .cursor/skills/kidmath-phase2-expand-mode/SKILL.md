---
name: kidmath-phase2-expand-mode
description: Expand a KidMath mode's item bank to the Phase 2 quantity floor (50+ items per cell across the mode × subskill × family × band matrix). Use when the user asks to "expand phase 2", "grow the bank", "fill cells to 50", or starts Phase 2 work on any of division, comparing, counting, skipCounting, or placeValue (or any other mode that still sits near the Phase 1 floor of ~3 items per cell).
---

# KidMath Phase 2 Bank Expansion Skill

Use this skill whenever you are expanding a KidMath mode's item bank from the Phase 1 floor (~3 items per cell) to the Phase 2 floor (≥ 50 items per cell).

## How to Use

1. **Read the full playbook**: [`docs/phase2-bank-expansion-playbook.md`](../../../docs/phase2-bank-expansion-playbook.md). It contains the mode reference table, phrasing rotations, template families, session cadence, seed/Supabase workflow, and parallelism rules.
2. Follow the 4-session cadence (§3 of the playbook) and the hot-loop structure in §4.
3. Run `npm run bank:report` after every batch insert, and the full validation checklist in §11 at the end of every session.

## Non-Negotiables

- **Consult open-licensed sources before authoring.** Read `data/exemplars/<mode>/` for seed exemplars and use IM / Open Up Resources / OpenStax K-5 task clusters (indexed by the mode's CCSS domain in `src/modes/<mode>.js`) as structural anchors. Playbook §1b and §1c cover the CCSS map, license allowlist, and attribution workflow. Every session must produce at least 3 application items with a populated `source` field plus a bank-sources.md entry listing the IM/OUR clusters used for structural inspiration.
- Every `promptText` must stay globally unique across the entire bank — the validator will flag duplicates.
- Use the **timestamped** seed generator (`npm run bank:seed`) at the end of each session and commit the new migration file with the bundle change. Do not overwrite `supabase/migrations/0004_seed_item_bank.sql`.
- One mode per branch (`feature/phase2-<mode>`). Modes can be worked on in parallel because their items live in distinct sections of `src/itemBank/applicationItems.js`.
- Final target: every cell in the mode has ≥ 50 approved items. `npm run bank:report` must end with `PASS` and cell distribution counts must all be ≥ 50.

## Output When Reporting Completion

When a mode's Phase 2 expansion is finished:

1. Confirm all 27 cells are at ≥ 50 and include the count distribution.
2. List the total items added and the bundle size before/after.
3. Note the new Supabase migration filename so the user knows what to `supabase db push`.
4. List the IM / OUR / OpenStax tasks that were cited (anchored) and the clusters used for structural inspiration; confirm `docs/bank-sources.md` has a corresponding entry for each session's batches.
5. Link the PR URL.
