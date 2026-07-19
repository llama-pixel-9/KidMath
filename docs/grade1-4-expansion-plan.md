# Grade 1–4 Content & Answer-Format Expansion Plan

Status: **Proposed**. This is the umbrella roadmap for taking KidMath from its
current K–3 arithmetic core to a coherent **Grade 1 → Grade 4** program, and
for introducing **new question/answer formats** beyond the single
integer-multiple-choice shape the game uses today.

It sits above the existing content playbooks
([phase2-bank-expansion-playbook](./phase2-bank-expansion-playbook.md),
[curated-item-bank-rollout](./curated-item-bank-rollout.md)); those still
govern the *authoring grind* once the foundations below are in place.

---

## 0. Why this is more than "add harder items"

Two hard constraints in today's code shape everything:

1. **Every question is the same shape.** The engine attaches
   `q.choices` (an array of **integers**) via `generateChoices(answer, 4, q)`
   in `src/mathEngine.js`; `MathExplorer.jsx` renders those as bubble buttons
   and checks correctness with `choice === currentQ.answer`. There is no
   concept of a typed answer, a fraction, a symbol pick, or a manipulative.

2. **Grade banding is coarse and implicit.** `levelToGradeBand()` in
   `src/modes/itemMetadata.js` maps the 10-level ladder to just three fuzzy
   bands — `K-1` (≤3), `2-3` (≤6), `4-5` (else). There is no explicit
   Grade 1/2/3/4 axis, so "1st-to-4th-grade content" cannot even be expressed
   or measured today.

The plan therefore has **two foundation workstreams** (banding + answer
formats) that unblock the content, then the content itself.

---

## 1. Target

- A deliberate **Grade 1 / Grade 2 / Grade 3 / Grade 4** progression, each
  grade with defined domains and difficulty, replacing the current 3-band
  approximation.
- A **typed answer-format system**: `answerType` on every question, with a
  renderer + validator per type. Multiple-choice becomes *one* type among
  several, not the only shape.
- New Grade 2–4 domains that the integer-MCQ format cannot express:
  fractions, decimals, factors/multiples, patterns, measurement, geometry,
  money, time.
- **Curriculum anchor: Math in Focus (Singapore Approach), Grades 1–4** —
  incorporate most of the major problem types per grade, including its
  signature representations (number bonds, bar models, place-value discs,
  fraction-of-a-set). See §4c.
- **Same game physics, kept stable** — every new answer format runs through the
  existing animated/sound/streak commit loop and answer-lock; the input control
  changes, the game around it does not. See §6b.
- Runs on the current **Vercel + Supabase** stack with minimal schema change
  (`payload` is `jsonb`; only the `level_band` generated column must migrate).
  See §6c.
- Bank validator (`npm run bank:report`) stays **PASS**; adaptive engine,
  mistake replay, telemetry, admin coverage tools, and worksheet export all
  keep working across the new bands and answer types.

---

## 2. Foundation A — Explicit Grade 1–4 bands

### 2.1 The change
Replace the 3-band scheme with a 4-band, grade-aligned scheme. Recommended
level→grade mapping (extends the ladder to 12 levels so each grade gets a
clean 3-level run):

| Grade | `gradeBand` value | `levelRange` |
|---|---|---|
| Grade 1 | `G1` | `[1, 3]` |
| Grade 2 | `G2` | `[4, 6]` |
| Grade 3 | `G3` | `[7, 9]` |
| Grade 4 | `G4` | `[10, 12]` |

(We keep `K-1`/`2-3`/`4-5` as legacy aliases during migration so existing
items and tests don't break in one big-bang; a compatibility shim in
`levelToGradeBand` returns both the new and old label until items are
re-tagged.)

### 2.2 Files touched
- `src/modes/itemMetadata.js` — `levelToGradeBand` + new band constants.
- `src/modes/blueprints.js` — blueprints keyed per band.
- `src/modes/*.js` — each mode's `RANGES` extended to 12 levels.
- **Item schema / data** — every item's `levelRange` re-tagged into the 4 bands
  (scripted migration; bands 3→4 grows the cell matrix by ~33%).
- `scripts/bankReport.js`, `src/admin/CoverageHeatmap.jsx`,
  `src/__tests__/itemBankCoverage.spec.js` — cell matrix becomes
  `modes × subskills × families × 4 bands`.
- Coverage docs: [mode-coverage-map](./mode-coverage-map.md) cell count
  updates (8 modes × ~3 subskills × 3 families × **4** bands ≈ **288 cells**,
  before new modes).

### 2.3 Risk
Re-banding is the single most cross-cutting change. Do it **first and alone**,
behind the alias shim, so it lands as a mechanical, well-tested migration
before any new content depends on it.

---

## 3. Foundation B — The answer-format engine ("a different kind of question")

### 3.1 The abstraction
Add an `answerType` field to every question (default `"choice"` for 100%
back-compat). Introduce two registries:

- **Input renderers** (in `MathExplorer.jsx`): an `<AnswerInput type=…>`
  dispatcher that renders the right control instead of the hardcoded bubble
  grid. Each renderer reports a *submitted value* through one `onSubmit`
  callback.
- **Answer validators** (in `mathEngine.js`): a `checkAnswer(question,
  submitted)` function that replaces the bare `choice === q.answer`. Equality
  is **type-aware** (e.g. `3/4` ≡ `6/8`; `0.5` ≡ `.50`).

`generateChoices` becomes a no-op for non-`choice` types (no distractors
needed); it stays exactly as-is for `choice`.

### 3.2 Answer formats to build (ordered by cost)

| `answerType` | Example prompt | Notes / effort |
|---|---|---|
| `choice` | existing MCQ | already shipped — becomes the default type |
| `numberPad` | "324 × 6 = ▢" (type it) | on-screen keypad; kills guessing on multi-digit. **Low** |
| `symbolSelect` | "47 ▢ 52 → <, >, =" | `comparing` mode already does this pattern. **Low** |
| `fillBlank` | "6 × ▢ = 42" | numberPad bound to a slot in an equation. **Low–Med** |
| `fraction` | "type the fraction: ▢/▢" | new schema (`answer` may be `{num,den}`), fraction rendering, equivalence check. **Med** |
| `decimal` | "type 0.7" | non-integer `answer`, decimal-aware equality. **Med** |
| `matchSort` | "order 4 numbers"; "match equal fractions" | drag/tap ordering. **Med** |
| `buildNumberLine` | "plot 3/4 on the line" | interactive canvas; tolerance-based check. **High** |
| `buildModel` | drag place-value blocks / shade a fraction bar / fill a ten-frame | interactive canvas. **High** |

### 3.3 Schema & validator changes
- `question.answer` generalizes from integer to a **canonical value**
  (integer, decimal, `{num,den}`, symbol, or ordered array).
- `validateBankItem` (`src/modes/itemQuality.js` + item-bank validator) learns
  the new `answerType`s and their required fields; numeric-consistency check
  is extended per type (e.g. fraction reduces correctly, decimal matches).
- Non-`choice` items skip the "exactly one correct choice / unique choices"
  gates in [assessment-quality-gates](./assessment-quality-gates.md) Gate 2;
  add per-type gates instead.

### 3.4 Downstream
- `PrintableWorksheet.jsx` — render each `answerType` on paper (typed/build
  types print as a blank to fill; interactive types degrade to a static
  depiction). Must not crash on unknown types.
- Telemetry already keys on `itemId`/`itemFamily`; add `answerType` to the
  answered-question event for later analysis.

---

## 4. Content map — Grade 1 → 4

Existing 8 modes cover most G1–G3 number/operations. The table below shows
what to **deepen** vs **add**, the grade it unlocks, CCSS anchor, and the
answer formats it needs.

### 4.1 Deepen existing modes

| Mode | Grade reach today → target | What to add | New formats |
|---|---|---|---|
| `addition` / `subtraction` | ~G1–3 → **G4** | multi-digit + regrouping, multi-step | `numberPad`, `fillBlank` |
| `multiplication` | G3 → **G4** | 2-digit × 2-digit, 4-digit × 1-digit | `numberPad` |
| `division` | G3 → **G4** | **division *with* remainders** (mode is labeled "no remainders!" today — a real G4 gap) | `numberPad`, `fillBlank` (quotient + remainder) |
| `placeValue` | G1–2 → **G4** | place value to 1,000,000; rounding | `numberPad`, `buildModel` |
| `comparing` | G1 → **G4** | compare multi-digit, fractions, decimals | `symbolSelect` |
| `counting` / `skipCounting` | G1–2 | bridge to multiples/patterns | `fillBlank` |

### 4.2 New modes

| New mode | Grade | CCSS | Subskills (draft) | Primary formats |
|---|---|---|---|---|
| `factorsMultiples` | G4 | 4.OA.B | factorPairs, primeComposite, multiples | `matchSort`, `choice` |
| `patterns` | G3–4 | 4.OA.C | numberPattern, shapePattern, ruleInference | `fillBlank`, `numberPad` |
| `fractions` | G3–4 | 3.NF, 4.NF | equivalence, compare, addSubLikeDenom, fractionTimesWhole | `fraction`, `symbolSelect`, `buildModel` |
| `decimals` | G4 | 4.NF.C | tenthsHundredths, compareDecimals, fractionDecimal | `decimal`, `symbolSelect` |
| `money` | G1–3 | 2.MD.C.8 | countCoins, makeChange, dollarsCents | `numberPad`, `choice` |
| `time` | G1–3 | 1.MD.B, 3.MD.A | readClock, elapsedTime | `choice`, `buildModel` (clock) |
| `measurement` | G3–4 | 4.MD.A | unitConvert, areaPerimeter, angles | `numberPad`, `fillBlank` |
| `geometry` | G4 | 4.G.A | classifyShapes, linesAngles, symmetry | `choice`, `buildModel` |

Money and time are deliberately included even though "lower" grade — they are
high-value for parents and reuse cheap formats.

---

## 4c. Math in Focus alignment (Singapore Approach)

Target: incorporate **most of the major problem types in each of Grades 1–4**
as taught in *Math in Focus: The Singapore Approach* (Marshall Cavendish /
HMH). MiF's distinguishing feature is not its topic list (that mostly matches
CCSS §4) but its **signature representations** — and those map directly onto
the `answerType` system in §3. Getting these interactions right is what makes
the game read as *authentically Singapore*, not generic drill.

### The MiF representation toolkit → our `answerType`

| MiF representation | What the kid does | Maps to | Grades |
|---|---|---|---|
| **Number bond** (part-part-whole "cherry") | whole=10, part=6 → find 4; list bonds of a number | `buildModel:numberBond` (or `fillBlank` fallback) | G1–2 |
| **Bar model — part-whole** | build a bar, find total or missing part | `buildModel:barPartWhole` (or `numberPad` on a shown bar) | G2–4 |
| **Bar model — comparison** | "A has 12, B has 5 more; find B / total" | `buildModel:barCompare` (or `numberPad`) | G2–4 |
| **Place-value discs / chart** | trade 10 ones→1 ten to model regrouping | `buildModel:placeValueDiscs` | G2–4 |
| **Ten-frame / make-ten** | fill a frame; bridge 10 (8+5 = 8+2+3) | `buildModel:tenFrame` / `fillBlank` | G1–2 |
| **Dot-paper array** | build rows×cols for a multiplication fact | `buildModel:array` | G2–3 |
| **Fraction of a set / fraction bar** | "⅗ of 20"; shade a bar; place on number line | `buildModel:fractionSet` / `fraction` | G2–4 |
| **Number line** | plot, compare, round, elapsed time | `buildNumberLine` | G1–4 |
| **Clock / elapsed time** | set hands; find elapsed time | `buildModel:clock` | G1–3 |
| **Protractor / angle** | measure or draw an angle in degrees | `buildModel:angle` (+ `numberPad` degrees) | G4 |
| **Mental-math + rounding/estimation** | estimate, then check reasonableness | `numberPad` (two-part: estimate + exact) | G2–4 |

**The four highest-signal MiF interactions** (per the research — build these
first among the interactive types): **number bonds, bar models (part-whole +
comparison), place-value discs, and fraction-of-a-set.** If these feel great,
the rest of the manipulatives follow the same `buildModel` engine.

### Pragmatic sequencing that protects §6b game physics

Bar models and discs are `buildModel` (high cost) — but **most MiF word
problems can ship first as typed-answer items**: render the bar/number-bond as
a *static pictorial hint* above the prompt and let the kid answer with
`numberPad`/`fraction`. This captures the MiF content and pedagogy (the child
still reasons with the model) while keeping the stable, animated commit loop.
The **interactive builder** (drag discs, draw the bar) is a later upgrade of
the *same item* — the payload already carries the model spec; only the renderer
changes from "show" to "manipulate." So MiF content is not gated on the hardest
UI work.

### Per-grade MiF "must-have" problem types (digest)

Condensed from the cross-checked scope-and-sequence; drives which cells to
author per grade.

- **Grade 1** — number bonds; +/− facts to 10 then 20 via make-ten &
  doubles; numbers/place value to 100–120; 2-digit +/− with regrouping;
  shapes & patterns; ordinal/position; length & weight (non-standard);
  picture/bar graphs; time to hour/half-hour; money (coins); intro equal
  groups.
- **Grade 2** — numbers to 1,000 + expanded form; 3-digit +/− with regrouping
  (discs); **bar models for +/−**; ×/÷ tables of 2,3,4,5,10 with fact families;
  metric length/mass/volume; **bar models for ×/÷**; fractions (unit, compare
  like, add/sub like, fraction of a whole); money ($ & ¢); time to 5 min +
  elapsed; graphs/line plots.
- **Grade 3** — numbers to 10,000; mental math + **rounding/estimation with
  reasonableness**; 4-digit +/−; **2-step bar-model** word problems; ×/÷ tables
  6–9; 2–3-digit × 1-digit; **division with remainder**; fractions (equivalent,
  compare/order, on number line, fraction of a set); metric & customary
  measurement + conversion; time & temperature; angles; parallel/perpendicular
  lines; 2-D shape classification; **area & perimeter**.
- **Grade 4** — place value to 1,000,000 + rounding; **factors/multiples,
  prime/composite**; up to 4-digit × 1-digit, 2-digit × 2-digit, **long
  division with remainder**; tables & line graphs; fractions & **mixed ↔
  improper**, fraction × whole, fraction of a set; **decimals** (tenths/
  hundredths, ↔ fractions, compare/order, round, add/sub); angles with
  protractor; perpendicular/parallel segments; squares/rectangles; area &
  perimeter of **composite figures**; symmetry; tessellations.

### Mode-list adjustments driven by MiF

The §4.2 new-mode list expands/splits to cover MiF's full span:

- Add **`dataGraphs`** (picture/bar/line graphs, line plots, tables) — G1–4,
  formats `choice`/`numberPad`.
- **`numberBonds`** as an early-grade mode (or a cross-mode subskill+answerType)
  for G1–2 — the MiF entry point to addition/subtraction.
- **`barModel`** treated as a *cross-cutting application answerType*
  (`buildModel:bar*`) available to addition, subtraction, multiplication,
  division, and fractions — not a standalone mode.
- Split **`geometry`** into MiF's distinct threads: `angles`,
  `linesShapes` (parallel/perpendicular, classify 2-D shapes, symmetry,
  tessellation), and `areaPerimeter` (its own mode given how central it is
  G3–4).
- **`measurement`** covers both metric and customary + conversion (MiF teaches
  both).

The "Put On Your Thinking Cap!" non-routine heuristics (guess-and-check,
work-backward, before/after) are a **later enrichment layer** — tag such items
with a `heuristic` field for an optional "challenge" family once the core
cells are full.

## 5. Phasing

Each phase ends with `bank:report` PASS, tests + lint green, and a seed
migration, per the existing playbook cadence.

- **Phase 0 — Foundations (blocking).**
  §2 re-banding migration (behind alias shim) + §3 `answerType` engine with
  `choice` as the only wired type. Ships with zero user-visible change but
  makes everything below possible. Add `numberPad` here as the first proof of
  the dispatcher.

- **Phase 1 — Cheap formats + deepen existing modes + MiF content-first.**
  `numberPad`, `symbolSelect`, `fillBlank`. Division-with-remainders,
  multi-digit mult, place value to millions, multi-digit add/sub, rounding/
  estimation, factors/multiples. Ship **MiF bar-model & number-bond word
  problems as typed-answer items with a static pictorial hint** (§4c) — this
  banks the signature MiF content without the interactive-builder cost. All
  fits the extended integer schema and preserves the stable commit loop.

- **Phase 2 — Fractions & decimals.**
  `fraction` + `decimal` formats and schema generalization of
  `question.answer`; ship `fractions` (incl. **fraction-of-a-set**, equivalent,
  mixed↔improper) and `decimals` modes at the Phase-1 floor (3/cell) first,
  then expand. Fraction-of-a-set renders as a static grouped-set hint here.

- **Phase 3 — Manipulatives (the MiF interactions) + measurement/geometry.**
  Upgrade the Phase-1/2 static hints into live `buildModel` renderers, in
  MiF-priority order: **numberBond → barPartWhole → barCompare →
  placeValueDiscs → fractionSet**, then `buildNumberLine`, `clock`, `angle`,
  `array`, `tenFrame`, `matchSort`. Ship `measurement`, `angles`,
  `linesShapes`, `areaPerimeter`, `dataGraphs`, `time`, `money`, `patterns`.
  Each builder reuses the §6b shared commit path — same physics as a bubble tap.

- **Phase 4 — Fill the floor.**
  Run the [phase2 playbook](./phase2-bank-expansion-playbook.md) (updated for
  4 bands and new modes) to bring every new cell to depth. **Accelerator:** the
  draft pipeline `scripts/itemGen/` currently ships only an *echo* provider —
  wiring a real Claude provider behind the existing `validateBankItem` numeric
  gate turns the 4-session-per-mode grind into review-only work. This is the
  highest-leverage tooling investment for content volume.

---

## 6. Impacted-files checklist (single source of truth)

- `src/modes/itemMetadata.js` — bands + `answerType` constants
- `src/modes/blueprints.js` — per-band blueprints
- `src/modes/*.js` — 12-level ranges; new mode files for §4.2
- `src/modes/index.js` — register new modes
- `src/modes/itemQuality.js` + item-bank validator — new `answerType`s
- `src/mathEngine.js` — `checkAnswer` dispatch; `generateChoices` guard
- `src/MathExplorer.jsx` — `<AnswerInput>` dispatcher + per-type renderers
- `src/PrintableWorksheet.jsx` — per-type print rendering / graceful skip
- `src/itemBank/*` — split the 6.5k-line `applicationItems.js` monolith (it
  currently holds **all three families** despite the name;
  `conceptualItems.js`/`proceduralItems.js` are empty stubs) — do this as part
  of Phase 0 so new-mode content lands in sane files
- `scripts/bankReport.js`, `src/admin/CoverageHeatmap.jsx`,
  `src/__tests__/itemBankCoverage.spec.js` — 4-band matrix
- **`supabase/migrations/00xx_rebands_level_band.sql`** — redefine the
  generated `level_band` column + dependent band index for `G1–G4` (§6c)
- `src/itemBank/cloudLoader.js` — `normalizeBankRow` already passes `payload`
  through; extend `validateBankItem` for new `answerType`s (no column change)
- `scripts/itemGen/` — real draft provider as Supabase/Vercel function (Phase 4)
- Docs: this file, `mode-coverage-map`, `mode-blueprints`, `standards-rubric`,
  `phase2-bank-expansion-playbook`

---

## 6b. Game physics & stability (must-not-regress)

New answer formats must feel like *the same game* — the "physics" and
reliability of the current bubble-tap loop are a hard requirement, not a
nice-to-have. Every `answerType` renderer must preserve:

- **Motion + feedback identity** — Framer Motion enter/exit, the confetti
  burst, star award, streak/level-up flashes, and `sounds.js` cues fire on the
  same events (`correct`/`wrong`/`streak`/`levelUp`/`complete`) regardless of
  input type. A typed answer and a shaded fraction bar should celebrate
  identically to a tapped bubble.
- **The answer lock** — `answerLockRef` / feedback-state guard in
  `handleAnswer` prevents double-submits and race conditions. Every new input
  routes through the *same* single commit path (a `submitAnswer(value)` that
  wraps type-aware `checkAnswer`) so the lock, telemetry
  (`answerAttempts`/`answerProcessed`), and diagnostics marks stay intact. No
  renderer gets its own side-channel to score answers.
- **Reduced-motion + low-end-device paths** — `useReducedMotion()` and the
  `isLikelyLowEndDevice()` branch must apply to new controls too (e.g. a
  number-pad without spring physics on iPad). Interactive `buildModel` types
  need an explicitly cheap render mode.
- **Retry/mistake-bank fidelity** — the mistake bank re-prompts an item 5
  questions later with full context; new answer types must round-trip through
  the retry queue with their `answerSpec` intact (Gate 3 in
  [assessment-quality-gates](./assessment-quality-gates.md)).
- **Touch ergonomics** — keep the 80×80px minimum target; number pads and
  symbol pickers are large, thumb-reachable, and keyboard-optional.
- **Stability gates** — each new `answerType` ships with unit tests for its
  `checkAnswer` equality (including the tricky cases: `3/4 ≡ 6/8`, `0.5 ≡ .50`,
  quotient+remainder) and a render smoke test, before any content uses it.

Guiding rule: **the input control changes; the game around it does not.**

## 6c. Infrastructure: Vercel + Supabase (current reality)

The item bank and all user data already live in **Supabase**; the app is a
Vite SPA deployed on **Vercel** (`vercel.json` is a catch-all SPA rewrite, no
serverless functions yet). This plan is designed around that stack:

**What the existing schema gives us for free**
- `item_bank.payload` is **`jsonb`** — so `answerType`, `answerSpec`,
  fraction/decimal answers, and build-model specs all live in `payload` with
  **no table migration**. The client validator (`normalizeBankRow` +
  `validateBankItem`) is the gate, not the DB.
- `mode_id`, `item_family`, `subskill`, `structure_type` have **no CHECK
  constraints** → the 8 new modes (§4.2) and new subskills insert with zero DB
  changes. `review_status` (draft/reviewed/approved/retired) is unchanged.

**What DOES need a Supabase migration**
- **`level_band` is a `stored generated column`** hardcoded to
  `K-1/2-3/4-5` on `level_min` (migration `0005`). Moving to `G1–G4` (§2)
  **requires a new migration** redefining that generated expression and the
  `item_bank_mode_family_band_idx` that depends on it. This is the one
  unavoidable schema change and belongs in Phase 0.
- Admin coverage queries, the `level_band` filter, and the heatmap read that
  column, so they update in lockstep with the migration.

**Seed / deploy pipeline at scale**
- `npm run bank:seed` writes a **timestamped, full-bank** seed migration
  (already ~1 MB each: `20260423002904_seed_item_bank.sql`). At 4 bands × ~16
  modes this file balloons toward multi-MB per session. Mitigations to decide
  in Phase 0: (a) per-mode seed files instead of one monolith, and/or (b) move
  bulk seeding out of `supabase/migrations` into a `bank:push` script that
  upserts via the Supabase client (the export/`cloudLoader` round-trip already
  exists), keeping migrations for *schema* only.
- `npm run bank:export` snapshots approved cloud rows back into the bundled
  fallback so first paint / offline / tests still work — keep this contract as
  content grows.

**Where new server-side compute lives (no Node server today)**
- **Real-LLM draft provider** (§5 Phase 4) and any batch validation should run
  as a **Supabase Edge Function** or a **Vercel serverless function**, invoked
  by `scripts/itemGen/`, so secrets stay server-side and the pluggable provider
  interface is honored.
- A future **parent dashboard** aggregation (mastery rollups over
  `progress_item_stats` / `session_diagnostics`) similarly belongs in a
  Supabase RPC / Edge Function rather than pulling raw rows to the client.

## 7. Risks & mitigations

- **Re-banding blast radius** → land it first, alone, behind an alias shim
  with tests before any content depends on it (§2.3).
- **Content volume explosion** — 3→4 bands (+33%) plus ~8 new modes multiplies
  the cell matrix several-fold → the real-LLM draft provider (§5 Phase 4) is
  the mitigation, not more manual sessions.
- **Worksheet parity** — interactive answer types can't be "typed" on paper →
  define a static print fallback per type; never block the game on print.
- **Fraction/decimal equality & distractors** → type-aware `checkAnswer` plus
  fraction-aware distractor generation (equivalent-but-unreduced, common
  wrong-denominator, etc.) rather than the integer offset heuristic.
- **Adaptive integrity** — the engine targets weakest subskill and interleaves
  families; new modes must supply real subskills/blueprints so adaptivity and
  analytics keep working (not a single catch-all subskill).

---

## 8. Recommended first move

Build **Phase 0** end-to-end and ship it invisibly:

1. Re-banding migration + alias shim (+ tests).
2. `answerType` dispatch with `choice` preserved bit-for-bit and `numberPad`
   added as the second wired type on a couple of existing multi-digit cells.
3. Split the item-bank monolith.

That produces a demoable "type your answer" mode on existing content, proves
the new architecture with no regression, and unblocks every phase after it.
