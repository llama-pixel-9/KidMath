# Grade 1–4 Expansion — Claude Code Work-Orders

Phase-by-phase, copy-pasteable work-orders for building the Grade 1–4 + Math in
Focus + new-answer-format plan
([grade1-4-expansion-plan.md](./grade1-4-expansion-plan.md)) with Claude Code.

## How to use this document

- **One work-order = one focused Claude Code session.** Paste the **Prompt**
  block into a fresh session. Keeping sessions scoped keeps the prompt cache hot
  and cost down.
- **Run them in order.** Each phase depends on the ones before it.
- **Branch per phase:** `feature/grade1-4-phaseN` off the previous merged phase
  (Phase 0 lives on `feature/grade1-4-phase0`).
- **Do not advance until the Acceptance gate is green.** Every work-order ends
  with the same three commands — they must all pass:
  ```bash
  npx vitest run          # all tests green
  npm run lint            # clean (the Babel 500KB deopt note on applicationItems.js is expected)
  npm run bank:report     # ends with "PASS"
  ```
- **Model:** default **Sonnet 5** for the mechanical work (migrations, mode
  `generate()` logic, content, tests). Switch to **Opus 4.8** for the
  interactive-canvas builders in Phase 3. `/model` toggles per session.
- **Content generation** (Phase 4) runs as a **batch script**, never through the
  interactive agent.

## Non-negotiable invariants (every phase)

Carry these into every prompt — they are the "same game physics, kept stable"
requirement from plan §6b:

1. Every new answer format commits through **one shared `submitAnswer(value)`
   path** that wraps a type-aware `checkAnswer`, so `answerLockRef`, telemetry
   (`answerAttempts`/`answerProcessed`), the mistake bank, and the
   motion/sound/confetti/star feedback fire identically to a bubble tap.
2. `answerType` defaults to `"choice"` — existing multiple-choice behavior must
   stay **byte-for-byte identical** until a step deliberately changes it.
3. Respect `useReducedMotion()` and the `isLikelyLowEndDevice()` path in every
   new control; keep 80×80px touch targets.
4. Ship per-type `checkAnswer` unit tests **before** any content uses a format.
5. `src/bands.js` is the single source of truth for level→band mapping — never
   re-inline band logic.

---

## Phase 0 — Foundations

Goal: re-banding to G1–G4 (behind an alias shim), the `answerType` dispatch
engine (with `numberPad` as the first new type), and splitting the item-bank
monolith. Ships with **zero user-visible change** but unblocks everything.

### 0.1 — Grade-band single source of truth + alias shim ✅ DONE

Shipped on `feature/grade1-4-phase0`:
- `src/bands.js` — dependency-free leaf: legacy `LEVEL_BANDS`/`levelToBand`/
  `levelRangeToBands` (unchanged, still the active axis) **plus** `GRADE_BANDS`,
  `levelToGrade`, `levelRangeToGrades`, and the `legacyBandToGrades` /
  `gradeToLegacyBand` bridges.
- `itemMetadata.js` and `itemBank/index.js` now import from the leaf (duplication
  removed; behavior identical).
- `src/__tests__/gradeBands.spec.js` (wired into `npm test`). 142 tests pass,
  lint clean, bank report PASS.

### 0.2 — `answerType` dispatch engine + `numberPad` ✅ DONE

Shipped: type-aware `checkAnswer`/`questionAnswerType` in `mathEngine.js` (the
single scoring authority, used by `recordAnswer`; `"choice"` byte-identical);
non-choice questions skip `generateChoices`; MathExplorer's shared
`submitAnswer(value)` path + `<NumberPad>` dispatched by `answerType`;
`?input=numberpad` dev flag; `answerCheck.spec.js`.

**Prompt:**
```
Read docs/grade1-4-expansion-plan.md §3 and §6b, and src/bands.js.

Add an `answerType` field to the question/item model, defaulting to "choice".
Build the two registries from §3.1 WITHOUT changing existing "choice" behavior:

1. In src/mathEngine.js: add `checkAnswer(question, submitted)` — type-aware
   equality. For "choice" it must be exactly today's `submitted === question.answer`.
   `generateChoices` stays as-is for "choice" and is skipped for other types.
2. In src/MathExplorer.jsx: extract a single `submitAnswer(value)` that wraps
   `checkAnswer` and is the ONLY place that scores an answer — route today's
   bubble `handleAnswer(choice)` through it so answerLockRef, telemetry, mistake
   bank, and all motion/sound feedback are unchanged. Add an `<AnswerInput
   type=...>` dispatcher that renders the bubble grid for "choice" and a
   large-key on-screen number pad for "numberPad".
3. Add `answerType: "numberPad"` support end to end and prove it on a couple of
   existing multi-digit cells behind a query-param/dev flag (do not change the
   default experience).

Preserve every invariant in the doc's §6b. Add unit tests:
src/__tests__/answerCheck.spec.js (checkAnswer per type, incl. numberPad) and a
render smoke test for the number pad. Keep "choice" regression-identical.
```
**Files:** `src/mathEngine.js`, `src/MathExplorer.jsx`, `src/modes/itemQuality.js`
(accept the new `answerType`), new `src/__tests__/answerCheck.spec.js`.
**Acceptance:** the three gates + a manual check that the default game is visually
and behaviorally unchanged.

### 0.3 — Supabase migration: `level_band` → G1–G4-ready ✅ DONE

Shipped: `supabase/migrations/20260719120000_add_grade_band.sql` — additive
generated `grade_band` (G1–G4) column + index, alongside the untouched
`level_band`.

**Prompt:**
```
Read src/bands.js and supabase/migrations/0005_extend_item_bank_for_all_families.sql.
The item_bank.level_band column is a STORED GENERATED column hardcoded to
K-1/2-3/4-5 on level_min. Write a NEW timestamped migration that redefines it to
also expose the grade band, without breaking the existing level_band consumers
(admin coverage query, heatmap). Prefer adding a generated `grade_band` column
(G1–G4 via the src/bands.js thresholds) alongside the existing level_band, plus
the matching index, so nothing that reads level_band regresses. Do not hand-edit
0005. Document the column in the migration header.
```
**Files:** new `supabase/migrations/<timestamp>_add_grade_band.sql`.
**Acceptance:** the three gates (migration is additive; no app code depends on the
new column yet).

### 0.4 — Split the item-bank monolith ✅ DONE

Shipped: `applicationItems.js` is now a 27-line aggregator over per-mode files in
`src/itemBank/items/`; `REVIEW_STATUS` extracted to leaf `reviewStatus.js`;
shared writer `scripts/lib/itemBankFiles.js` used by `npm run bank:split` and
`bank:export`. `bank:report` byte-identical.

> **Phase 0 exit: COMPLETE.** All four steps merged on
> `feature/grade1-4-phase0`. Next: Phase 1.

**Prompt:**
```
src/itemBank/applicationItems.js is ~6,500 lines and holds ALL three families
(application/conceptual/procedural) despite its name; conceptualItems.js and
proceduralItems.js are empty stubs. Split it per §6 of the plan WITHOUT changing
any item data or the aggregated BUNDLED_ITEMS output. Suggested: per-mode files
under src/itemBank/items/<mode>.js re-aggregated by bundle.js, or move each
family's items into the correctly-named family file. Keep REVIEW_STATUS and all
exports stable. `npm run bank:report` output must be byte-identical before/after.
```
**Files:** `src/itemBank/*`.
**Acceptance:** the three gates + `npm run bank:report` diff shows identical
counts.

> **Phase 0 exit:** merge `feature/grade1-4-phase0`. After this, `answerType`
> exists, grades are expressible, and content lives in sane files.

---

## Phase 1 — Cheap formats + deepen existing modes + MiF content-first

Goal: `symbolSelect` + `fillBlank`; Grade-4 depth in existing modes
(division-with-remainders, multi-digit ×, place value to millions, rounding,
factors/multiples); MiF bar-model & number-bond word problems shipped as
typed-answer items with a **static pictorial hint** (plan §4c).

**Prompt (formats):** ✅ DONE — `symbolSelect` (`<SymbolSelect>`) and `fillBlank`
(reuses `<NumberPad>`) shipped: `checkAnswer` branches (fillBlank = numeric,
symbolSelect = strict equality), dispatch in MathExplorer, tests in
`answerCheck.spec.js`. Both route through the shared `submitAnswer` path. The
mode-deepening and MiF static-hint prompts below are still open.
```
Read plan §3.2 and §6b and the Phase 0 answerType engine. Add `symbolSelect`
(<, >, =) and `fillBlank` (numberPad bound to a slot in an equation) as new
answerTypes: renderer in the AnswerInput dispatcher, checkAnswer branch, unit
tests. symbolSelect must reuse the comparing mode's existing pattern. Keep the
shared submitAnswer path.
```
**Progress (deepen modes):**
- ✅ `multiplication` — levels 9–10 now 2-digit×1-digit → 2-digit×2-digit; multi-digit
  products tagged `answerType: "numberPad"`.
- ✅ `comparing` — emits `answerType: "symbolSelect"` (already reaches 4.NBT to 1000).
- ⬜ division (needs compound quotient+remainder answer — see note), placeValue to
  millions + rounding, counting/skipCounting.

> **Key architectural finding.** `generateQuestion` consults the **bank** for
> every family by default, so for **densely-banked** modes (addition, subtraction,
> multiplication at ~50/cell) the bank serves the question and a generator-only
> `answerType` change is pre-empted — visible Grade-4 *typed* content for those
> modes must be **authored into the bank** (numberPad items). `buildQuestionFromBankItem`
> already carries `answerType` through, so the bank is answerType-ready. For
> **sparse** modes (comparing, counting, skipCounting, placeValue, division at
> 3/cell) generator changes surface immediately via the fallback path. Net: the
> engine/format plumbing is done; bulk Grade-4 content is bank-authoring work
> (Phase 4 batch pipeline).

**Prompt (deepen modes):**
```
Extend these modes to real Grade 4 within the integer schema: division WITH
remainders (division.js is labelled "no remainders!" — add a remainder subskill
and quotient+remainder fillBlank answer), 2-digit × 2-digit and 4-digit × 1-digit
multiplication, place value to 1,000,000 + rounding, and multi-digit add/sub with
regrouping. Update each mode's RANGES and metadata; add blueprints. Author a
Phase-1-floor (3/cell) set of items for the new cells and run bank:report.
```
**Prompt (MiF static-hint):**
```
Add a static pictorial "model hint" component (bar model part-whole & comparison,
number bond) rendered above the prompt for application/conceptual items that
carry a `modelHint` spec in their payload. The kid still answers with
numberPad/choice — no interactivity yet. Author a first batch of MiF-style
bar-model and number-bond word problems using it (plan §4c per-grade digest).
```
**Acceptance:** the three gates.

---

## Phase 2 — Fractions & decimals

Goal: `fraction` + `decimal` answer formats, generalize `question.answer` beyond
integers, fraction-aware distractors; ship `fractions` (incl. fraction-of-a-set,
equivalent, mixed↔improper) and `decimals` modes at the 3/cell floor.

**Prompt:**
```
Read plan §3.3 and §4c. Generalize the item schema so `question.answer` can be a
fraction ({num,den}) or decimal, keeping integer answers working. Add `fraction`
and `decimal` answerTypes (renderer + type-aware checkAnswer: 3/4 ≡ 6/8, 0.5 ≡
.50) with unit tests. Add fraction-aware distractor generation (equivalent-but-
unreduced, common wrong-denominator) for choice-type fraction items. Create the
`fractions` and `decimals` modes (register in src/modes/index.js) with subskills,
blueprints, and a 3/cell floor of items. Fraction-of-a-set renders with a static
grouped-set hint (Phase 3 makes it interactive). Update itemQuality validator and
cloudLoader normalize for the new answer shapes (payload is jsonb — no DB
migration needed).
```
**Files:** `src/mathEngine.js`, `src/MathExplorer.jsx`, `src/modes/fractions.js`,
`src/modes/decimals.js`, `src/modes/index.js`, `src/modes/itemQuality.js`,
`src/itemBank/*`, new specs.
**Acceptance:** the three gates.

---

## Phase 3 — Interactive builders (the MiF interactions) + measure/geometry/data

Goal: turn the Phase-1/2 static hints into live `buildModel` renderers, in
MiF-priority order, and ship the remaining modes. **Use Opus 4.8 for the builder
UI work.**

Run as several small sessions, one builder or mode cluster each:
```
Read plan §3.2, §4c, and §6b. Implement the `buildModel:<name>` interactive
answer renderer for <name>, reusing the shared submitAnswer commit path so the
motion/sound/lock/telemetry are identical to a bubble tap. Support reduced-motion
and the low-end-device path. Add checkAnswer (tolerance-based where needed) and a
render smoke test. Wire it so items already carrying the model spec upgrade from
static hint to interactive with no data change.
```
Builder order: `numberBond → barPartWhole → barCompare → placeValueDiscs →
fractionSet`, then `buildNumberLine → clock → angle → array → tenFrame →
matchSort`. Then the modes: `measurement`, `angles`, `linesShapes`,
`areaPerimeter`, `dataGraphs`, `time`, `money`, `patterns`, `factorsMultiples`.
**Acceptance (each session):** the three gates + manual check the builder
celebrates identically to a bubble tap.

---

## Phase 4 — Fill the content floor (batch, not interactive)

Goal: bring every G1–G4 cell to depth. **This is the switch-on-4-bands step**:
once modes span 12 levels, flip `src/bands.js` so G1–G4 is the active coverage
axis, update `LEVEL_BANDS` consumers (bankReport, CoverageHeatmap, ReviewQueue,
itemBankCoverage.spec), re-tag item `levelRange`s, and apply the grade-band
migration.

**Prompt (real draft provider):**
```
scripts/itemGen/ ships only an echo provider. Add a real Claude batch provider
(Anthropic Batch API, Sonnet 5, 50% off) behind the existing pluggable provider
interface and the validateBankItem numeric gate. It must run as a standalone
script, never through the interactive agent. Generate drafts per empty/lagging
cell; humans approve in the admin Review queue. Follow the phase2 playbook cadence
for seeding + bank:report.
```
**Prompt (band switch):**
```
Flip src/bands.js so G1–G4 is the active coverage axis (LEVEL_BANDS → GRADE_BANDS
semantics), extend each mode's RANGES to 12 levels (G4 = 10–12), re-tag item
levelRanges, and update every LEVEL_BANDS consumer (bankReport.js,
CoverageHeatmap.jsx, ReviewQueue.jsx, itemBankCoverage.spec.js, validateDrafts.js)
plus the level-ring UI in MathExplorer. Land it as one well-tested migration with
the alias bridges easing the transition. bank:report must PASS on the 4-band matrix.
```
**Acceptance:** the three gates; every cell ≥ target depth; PR flipped to ready.

---

## Cost tracking

Log `usage` per session (Claude Code shows it) against the estimate: engineering
~$500–1,600 total on Max 20× or mixed API; content batch ~$200–400. Sonnet by
default; Opus 4.8 only for Phase 3 builders.
