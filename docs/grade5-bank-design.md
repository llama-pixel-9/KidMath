# grade-5 banks design (batch b0824)

3,742 authored items for the three Grade-5 modes (curriculum plan, Phase 2):
fractionOps 1,248, decimalOps 1,248, volumeCoordinates 1,246 — every reachable
(subskill × family × band) cell at the 52-item floor, gate-clean, and every
cell served on-target per `bankCellCoverage.spec.js`.

Unlike the b0821/b0823 template-file builds, these modes' **variety catalogs
are the templates**: `scripts/itemGen/authorGrade5.js` drives each mode's own
`generate()` under a seeded mulberry32 RNG, converts questions to bank rows,
and greedily selects per cell under the global prompt-uniqueness and
per-signature caps (conceptual 5, application 3 — counted across bands, since
signature cells are mode::subskill::family). Reruns are deterministic.

```bash
node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorGrade5.js --tag b0824 [--write]
```

## Registers & conventions

- **fractionOps** (5.NF): answers are `fraction` strings judged by value
  equivalence, `numberPad` wholes, or Yes/No choices. Band 1 bridges from
  grade-4 like-denominator work; band 2 is unlike-denominator ± and fraction ×
  whole; band 3 is fraction × fraction and unit-fraction ÷.
- **decimalOps** (5.NBT): all computation in integer tenths/hundredths, typed
  through the `decimal` widget. Band 1 keeps every stated number inside the
  K magnitude gate (tenths digits only — the `bandAppropriate` check parses
  "0.75" as 75); money stories start at band 2.
- **volumeCoordinates** (5.MD.C + 5.G.A): the `cubeGrid` and `coordGrid`
  figures carry the math. Figure prompts with no numbers are salted with a
  name/thing by the authoring script so global prompt-uniqueness holds
  ("Maya built this crate from unit cubes…"). Coordinate answers are single
  numbers or a labeled-point choice — no new widgets.
- Band-scoped subskills (`subskillLevels` on each mode config) keep the
  coverage gate honest: e.g. `divideUnitFractions` [7,10],
  `multiplyDivideDecimals` [7,10], `compositeAndDistance` [7,10].

## Structural inspirations (no verbatim text)

CCSS 5.NF.1-7, 5.NBT.2/3/7, 5.MD.3-5, 5.G.1-2; EngageNY G5 M1-M6 (fetched
into `resources/engageny/` by `scripts/fetchResources.sh`) — structure and
sequencing only, wording original; CCSS Progressions 2023 (NF, MD chapters).

## Review

All three families auto-approved with the batch (deterministic, gate-verified,
same convention as b0823) — flagged in the PR for Sai's spot-check; per-item
Retire in `/admin` is the rollback.

## Phase 3 — the 12-level ladder (2026-08-23)

The three Grade-5 modes run a 12-level ladder (band 4 = L10-12, "Grade 5
work" on the `levelToGrade` axis); every other mode stays at 10. The per-mode
cap lives in `src/modeLevels.js` (mirrored by each mode config's `maxLevel`
and `GradeSeed.swift`; a gradeSeed spec pins the three in agreement). Their
band-3 bank rows were re-tagged `[7,10] → [7,12]` (cloud + bundle: 1,402
rows) so the open top band serves from the bank at L11-12 — no new items.
Grade seeding caps at `maxLevel - 3`, so the top band is always earned.
`practice_sessions` level checks widen to 1..12
(`supabase/migrations/20260823230000_practice_sessions_level_12.sql`).
