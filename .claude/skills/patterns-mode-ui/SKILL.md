# patterns mode — UI + bank patterns

Generator: `src/modes/patterns.js` (variety catalog; `selectVariety` is
already band-safe — it filters by band first and never leaves it). Bank
batch `b0821` (2,322 items; see `docs/patterns-bank-design.md`). Subskills:
`repeatingPattern`, `arithmeticNext`, `geometricNext`, `missingTerm`,
`patternRule`.

## Rendering notes

- Shape/number runs render through `display.sequence` (words or numbers;
  "?" entries allowed). Prompts also carry the run — that mirrors the
  generator's own payloads.
- Patterns prompts are inherently verbal: with the word-problems toggle OFF
  the bank is filtered out entirely and the generator serves. Don't read
  that as a serving bug.
- The generator's geometric items carry `relation {a, b, op: "x"}` and can
  be re-presented by the formats layer ("16 x 2 = 32" at low levels);
  bank items are never format-transformed.

## Question pattern catalog

### procedural (auto-approved; "Pattern:" register)

**repeatingPattern** — `extendAB/ABB/ABC(Teen)/ABCD(Long)/AABB` "Pattern:
circle, square, circle, square, ? — what comes next?" (choice of core
shapes) · `afterShape(B/Trio/Quad)` "Which comes right after circle?" ·
`shapeAtPosition(Far/Q2/Quad)` "What is shape number 7?" ·
`countShapeInRun` "How many circle shapes are in the first 12?"

**arithmeticNext** — `nextTeen/Mid/Big` "Pattern: 3, 6, 9, ? — what comes
next?" · `backTeen/Mid/Big` falling runs "20, 18, 16, ?" (claim next with
negative step) · `firstMid/Big` "Pattern: ?, 23, 29, 35 — what comes
first?" (countBack claim)

**geometricNext** — `doubleTeen` 2- and 4-term doubling runs (3-term runs
belong to band 2 — cross-band string dedupe) · `geoNext_2x/3x`,
`geoNextBig_2x/3x/5x` "each term is 3 times the one before." ·
`halfTeen/Mid/Big` "each term is half the one before." · `doubleOnce`
"Double 7." · `halveOnce` "Halve 16." · `tripleOnce` · `doubleTwice`
"Start at 3 and double it, 2 times in a row." · `multiplyOnce/Chain`

**missingTerm** — `gapTeen/Mid/Big` "Fill the gap: 4, ?, 12, 16." (between
claim = midpoint) · `firstTeen/MidGap/BigGap` "Fill the gap: ?, 9, 13, 17."

**patternRule** — `stepTeen/Mid/Big` "Pattern: 5, 8, 11. Rule: add ? each
time." (gap claim) · `applyTeen/Mid/Big` "Rule: start at 3 and add 4 each
time. What is number 4 in the pattern?"

### conceptual (reviewed; named prose)

**repeatingPattern** — `coreIdentify` "Which part repeats?" (choices:
truncated/extended/reversed cores) · `judgeExtend` "Kai continues the
pattern … with square. Is Kai right?" · `willBeAt` "Will shape number 7 be
circle?" **arithmeticNext** — `whichNext` (distractors: off-by-one, repeat
last, +2 steps) · `judgeNext` · `growsFaster` "Which pattern grows faster,
A or B?" **geometricNext** — `geoRulePick` "Which rule fits?" (the add-vs-
multiply misconception) · `addOrMultJudge` "says each jump is the same
size. Is that right?" · `whichGeoNext` (additive-continuation distractor) ·
`doubleJudge` **missingTerm** — `whichFills` · `judgeFill` · `twoGaps` "two
numbers are hidden — what fills the FIRST gap?" **patternRule** —
`rulePick` "What is the rule?" · `findError` "one number breaks the
pattern. Which?" (slip claim, verified against the shown run) · `parityAt`
"Will number 8 in the pattern be even?"

### application (reviewed)

**repeating** — `storyNextColor` bead/flag/tile/stamp patterns "Which color
comes next?" · `storyColorAt` "What color lands at position 7?" ·
`storyColorCount` "How many gold beads does Nia use?" **arithmetic** —
`storyGrow`/`storyShrink` jars/albums/towers/shelves growing or shrinking
evenly · `storyAfterDays` "starts with 4 shells and adds 3 more each day —
how many after 3 days?" **geometric** — `storyDouble`/`storyTriple`/
`storyHalf` lily pads/bubbles/sprouts/cranes **missingTerm** —
`storySmudge` smudged house/locker/page/ticket numbers · `storyFirstGone`
"the first ticket tore off" · `storyBetween` "one missing halfway between"
**patternRule** — `storyRate` "By how many leaves does it grow each day?" ·
`storyProject` "How many bricks on day 5?" · `storyWrongEntry` "one log
entry breaks the pattern"

## Traps learned building this bank

- **Cross-band duplicate strings** are the big one here: the same doubling
  run or (start,step) pair in two bands produces identical promptTexts.
  Partition the data (band 1 owns lengths 2/4, band 2 owns length 3;
  conceptual data lists disjoint across bands).
- Phrasings without a child name blow the conceptual/application signature
  caps — every prose phrasing carries a rotating name.
- "how many of them are circle?" fails `nounlessQuestion` — say "how many
  circle shapes".
- Band-1 sequences must keep every SHOWN term ≤20 (answers may exceed);
  4-term runs, 5-term error runs, and first+2·step all need checking.
- `geoDiv` claims carry `terms` (shown count) — start/2^terms is the
  answer, and starts must be divisible by 2^(terms+1).
- storyWrappedDrill warnings (~280) are expected on application items.
