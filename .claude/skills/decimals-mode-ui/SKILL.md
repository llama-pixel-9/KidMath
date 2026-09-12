# decimals mode — UI + bank patterns

Generator: `src/modes/decimals.js` (band-safe `selectVariety`; no engine
changes needed). Bank batch `b0821` (1,896 items; see
`docs/decimals-bank-design.md`). Subskills: `tenthsHundredths`,
`compareDecimals`, `fractionToDecimal`, `decimalAsNumber`. Bands: tenths /
+hundredths / +whole parts (≤9.99).

## Rendering notes

- Typed answers are decimal numbers with `answerType: "decimal"` (decimal
  pad); fraction labels are strings; compares are choice `<`/`>`/`=`.
- The generator's `numberLine`, `symbolSelect`, and `multiSelect` varieties
  are not represented in the bank.

## Question pattern catalog

### procedural (auto-approved)

**tenthsHundredths** — `writeDecimal_*` "Write seven tenths as a decimal."
/ "3 tenths and 4 hundredths = ?" / band3 ones+tenths+hundredths compose ·
`shadeDecimal_*` "7 of 10 equal parts colored → decimal" (band2/3:
100-grid) · `readDigit_*` "In 0.47, the hundredths digit = ?" ·
`countUnits_*` "0.47 equals how many hundredths?" · `fillNumerator_*`
LETTER-FREE "0.7 = ?/10", "?/100 = 0.45" **compareDecimals** —
`cmpSymbol_*` letter-free "0.3 ? 0.7" (choices <,>,=) · `biggerPick_*` ·
`smallestPick_*` least of three **fractionToDecimal** — `fracToDec_*`
letter-free "7/10 = ?" (typed decimal) · `decToFrac_*` "0.7 = ?" (fraction
choices) · `fracDecPick_*` decimal choices for 1/2, 3/4, 7/20…
**decimalAsNumber** — `countOn_*` letter-free "0.4, 0.5, 0.6, ?" ·
`tickRead_*` "mark 7 of 10 on a 0-1 line → decimal" · `addSmall_*`
letter-free "0.5 + 0.1 = ?"

### conceptual (reviewed; named prose, mostly judged)

**tenthsHundredths** — `placeTrap_*` writes 0.07 for seven tenths (No) ·
`trailingZero_*` 0.X0 = 0.X judgments (band1 only 0.10/0.20 — QC reads
"0.30" as 30) · `shadeJudge_*` **compareDecimals** — `longerTrap_*`
"0.18 > 0.6 because 18 > 6" (No) · `cmpJudge_*` audit written
comparisons · `padTrap_*` "0.40 beats 0.4 — longer" (No)
**fractionToDecimal** — `fracDecJudge_*` "3/10 = 0.3?" · `halfJudge_*`
"is 0.5 exactly one half?" · `tenHundredJudge_*` tenths↔hundredths
equivalence chains **decimalAsNumber** — `closerEnd_*` nearer 0 or 1 ·
`betweenJudge_*` inside the unit interval? · `beyondOne_*` "1.3 > 1?"

### application (reviewed; 3 skeletons × 17 names per band)

`storyDimes_*`/`storyJug_*`/`storyPenny_*` (dimes as tenths, level marks;
band1 penny skeleton is a dime/penny judgment — 90 pennies would break the
band-1 ≤20 rule) · `storyRun_*`/`storyRibbon_*`/`storyBake_*` (7/10 of a
km → decimal) · `storyFar_*`/`storyTall_*`/`storyFull_*` (pick the larger
decimal) · `storyTrail_*`/`storyPour_*`/`storyStep_*` (marks, top-ups,
gauge sequences).

## Traps learned building this bank

- **Sessions default word-problems OFF** (`createAdaptiveSession` options
  default `allowWordProblems: false`) and `isVerbalPrompt` counts ≥6 total
  LETTERS — every prose drill is "verbal". Each procedural band needs
  letter-free items or the bank never serves under default settings.
- `createAdaptiveSession(mode, sessionSize, options)` — options is the
  THIRD argument. Passing options second silently ignores them (probes did
  this and chased a phantom serving bug).
- Served bank questions carry `metadata.itemId` + `metadata.itemSource ===
  "bank"` — there is no `bankItemId` field on the question.
- QC's `bandAppropriate` parses "0.30" as 30 in K-1; the authoring-side
  throw strips decimal fractional parts, so it won't catch these — keep
  band-1 free of 0.X0 (X>2) and of hundredths entirely.
- Sequence drills whose next term is a whole number can trip
  `structureMatch` when the integer appears as a decimal's fraction digit
  ("6.7, 6.8, 6.9 → 7" — the 7 in "6.7" reads as stated).
- "one tenths" — pluralize tenth/tenths by count in every phrasing.
