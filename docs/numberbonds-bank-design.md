# Number Bonds bank — design

Built 2026-08-20 (batch tag `b0820`, 1,591 drafts). The authoritative record
of how the numberBonds item bank is structured, so future expansions extend
it instead of rediscovering it.

## Source survey

The item shapes come from a full pattern survey of the EngageNY/Eureka
modules that carry number-bond work (`resources/engageny/`, CC BY-NC-SA —
**structural inspiration only, zero copied wording**):

- **GK M4** (Number Pairs to 10): progression of wholes 2–5 → 6–8 → 9–10 →
  partners of 10; open decomposition (`C = ___ + ___`) is the dominant K
  shape; zero is a legitimate part; bond orientation deliberately rotated;
  5-group structure is the pictorial default; yes/no bond verification.
- **G1 M1** (Sums/Differences to 10): the three-unknown taxonomy (both parts
  / whole+part / both-parts-given); Number Bond Dash (all facts of one whole,
  timed); bond → 2 addition + 2 subtraction sentences (fact families);
  doubles and doubles+1; equal-sign placement deliberately varied.
- **G1 M2** (Make Ten / Take from Ten): the partner-of-ten table (9→1, 8→2,
  7→3) generates whole drill families; make-ten bonds hang **under the
  addend being split**; take-from-ten bonds decompose the teen into 10+ones;
  two-line answer chains (`9 + 4 = 9 + 1 + 3 = 10 + 3`); strategy choice and
  error-analysis items.
- **G1 M4 / G2 M1 / G2 M3** (place value): tens/ones bonds (27 = 20 + 7 and
  the non-canonical 27 = 17 + 10, "ten on the right"); matched contrast
  pairs (16+2 vs 16+20); ladders (13−8 → 23−8 → 43−8); make-next-ten within
  100 (39+4 via 39+1+3); bonds to 100/1000; three-branch hundreds bonds
  (263 = 200 + 60 + 3, zero traps like 305).

Full agent catalogs of all four surveys live in the session that built this
(2026-08-20); the distilled shapes are the `structureType` values below.

## Cell matrix

3 subskills × 3 families × 3 bands = 27 cells, every cell ≥ 50 items.
Bands: K-1 `[1,3]` wholes ≤10 · 2-3 `[4,6]` within 20 · 4-5 `[7,10]` within
100/1000.

| Subskill | Procedural (numeric, sig-cap ∞) | Conceptual (visual/judged, cap 5/sig) | Application (stories, cap 3/sig) |
|---|---|---|---|
| `partWhole` | `? = a + b` full enumeration, teen/three-addend, tens-ones/hundreds compose | two-color ten frames, emoji part pictures, choose-the-whole, unit form | put-together, three-part collections, tens-and-ones packing |
| `missingPart` | `w = p + ?` full Dash fact space, take-from-ten facts, partners of 20/100/1000 | make-ten frames (count+build), bond sentences, hidden part, non-canonical splits, error analysis | take-apart addend unknown, change unknown |
| `decompose` | pattern pairs, commutative flips, make-ten splits, ladders, T/F claims | which-pair, odd-one-out, open decomposition (multiSelect), fact families, strategy splits, three-branch place bonds | partner-to-ten, fill-the-ten, make-ten, equal split, take-out-ten, tens-and-singles |

**Numeric-first low levels**: band-1/2 procedural prompts are symbolic
(`9 = 4 + ?`), so they pass `isVerbalPrompt` and serve in the
no-word-problems path — this bank is what closed the "first levels should be
mostly numbers" gap for numberBonds.

## Payload convention (enforced by the `bondMath` QC check)

All items: `op: "bond"`, `a`/`b` null — this keeps the trio arithmetic check
and MathExplorer's vertical-equation layout out of the way (vertical fires
only when `answer === a op b`).

- **missing part**: `display.whole` + `display.part` (the given);
  gate asserts `part + answer === whole`.
- **three-part missing**: `display.whole` + `display.parts` (the givens);
  gate asserts `sum(parts) + answer === whole`.
- **whole unknown**: `display.parts` only; gate asserts `sum(parts) === answer`.
- **judged/choice forms** (T/F, which-pair, multiSelect): no numeric bond
  payload; `authorNumberBonds.js` has build-time asserts instead (claim
  truth, option sums, unique make-ten lead, fact-family sentence truth).

## Widgets (visual parity with other modes)

- `numberBond` — the cherry diagram; **missing-part only** (shows whole +
  one part). Values ≤3 chars (whole ≤ 999); bonds to 1000 use `numberPad`.
- `tenFrame` — `frameMode: "count"` has a built-in digit pad; `"build"`
  submits how many cells the child tapped. `filled` = red, `filledB` = blue
  (a two-color frame shows an addition), `frames: 2` for teens. Any item
  with frame display fields MUST use `answerType: "tenFrame"` — the frame is
  drawn by the widget, not the figure registry.
- `multiSelect` — `display.options` + `requiredCount`; answer is the array.
- True/false — `choices: ["True","False"]` + `question.subPrompt`; the claim
  goes in `promptText` ordered `a + b = c` so the judgment renderer parses it.
- Emoji part-pictures render through the emoji-run prompt path (no display
  fields needed).

## Generation & gates

`scripts/itemGen/authorNumberBonds.js` (no LLM — the fact spaces are finite):

- `numberBondTemplates.js` — deterministic procedural + conceptual builders.
  Conceptual builders rotate phrasings via `rotor()` (≤5 uses each) because
  signature caps apply per `mode::subskill::family` bucket **across bands**.
- `numberBondStories.js` — application skeletons × rotating name/noun/number
  instantiation (name+noun are part of the prompt signature, so rotation
  keeps every wording under the 3-per-signature cap). All stated numbers ≥2
  (grammar), answers never equal a stated number (answer-given-away).
- Gate: `validateBankItem` → `runChecks` (incl. `bondMath`) → build-time
  math asserts → global promptText uniqueness vs the bundle → signature caps
  (`findPromptOveruse`) → per-cell ≥50 floor. Any failure exits non-zero and
  writes nothing.

Re-running is safe and byte-identical (seeded shuffles). **A rerun with the
same `--tag` upserts over the same itemIds** — use a new tag for a new batch.

## Lifecycle

Drafts land in Supabase `item_bank` → `/admin` Review queue (batch view;
drill batches suit batch-trust spot-checking) → approve → `npm run
bank:export && npm run bank:seed:build` → both DB and bundle carry the items
(the two must agree — hard rule).
