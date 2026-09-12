# barModels mode — UI + bank patterns

Generator: `src/modes/barModels.js` (`selectVariety` is already band-safe —
it never leaves the in-band pool). Bank batch `b0821` (1,836 items; see
`docs/barmodels-bank-design.md`). Subskills: `partWhole`, `comparison`,
`multiplicative`, `fractionBar`. Band scales: ≤20 / ≤100 / ≤1000.

## Rendering notes

- Missing-part items carry `answerType:"barModel"` + `display
  {type:"barPartWhole", whole, part}` (`src/components/BarModel.jsx`);
  the author script asserts part < whole and answer = whole − part.
- The generator's part-whole rows carry `relation {a, b, op:"-"}` (ASCII
  minus on purpose — "−"/"+" trigger the vertical-sum renderer); bank items
  don't set relation, so they're never format-transformed.

## Question pattern catalog

### procedural (auto-approved; terse bar register)

**partWhole** — `barMissingPart_*` "Whole 12, one part 7. The other part
= ?" (with the drawn bar) · `barWhole_*` "Parts 7 and 6. The whole bar
= ?" **comparison** — `barDiff_*` "Long bar 14, short bar 9. The
difference = ?" · `barMore_*` "Short bar 9. The long bar is 5 more. Long
bar = ?" **multiplicative** — `unitsTotal_*` "3 equal bar parts of 4 each.
The whole = ?" · `unitOf_*` "A bar of 12 splits into 3 equal parts. Each
part = ?" **fractionBar** — `fracOf_*` "A bar of 12 is cut into 4 equal
pieces. 3 pieces = ?" · `wholeFromPiece_*` "One of 4 equal pieces holds 5.
The whole bar = ?"

### conceptual (reviewed; named prose)

**partWhole** — `barJudge_*` "parts 9 and 5 make a whole of 15 — right?" ·
`eqPick_*` "which number sentence finds the missing part?" (12 − 7 vs
12 + 7 vs 7 − 12) · `threePartJudge_*` **comparison** — `fewerPick_*` the
fewer-means-subtract-from-WHOM trap (sum distractor included) ·
`diffJudge_*` · `whichLonger_*` "whose bar should be drawn LONGER?"
(more/fewer/leads/trails phrasings flip the winner) **multiplicative** —
`timesPick_*` (k+u additive distractor) · `equalJudge_*` partition audits
· `unitCount_*` "how many 4-parts fill a 12-bar?" **fractionBar** —
`halfJudge_*` · `biggerPiece_*` "one half or one quarter — which piece is
bigger?" (unit-fraction ordering) · `sharePick_*`

### application (reviewed; Singapore-style stories, shells/cards/acorns/caps)

`storyJoin_*` / `storyLeft_*` (with drawn bar) / `storyThree_*` ·
`storyDiff_*` / `storyMore_*` / `storyFewer_*` · `storyTimes_*` /
`storyShare_*` / `storyRows_*` · `storyFrac_*` / `storyHalf_*` /
`storyRebuild_*`. Bands 2-3 carry "Sketch the bar if it helps." tags.

## Traps learned building this bank

- Distinguish more-than (countOn) from fewer-than (countBack) claims — and
  keep the sum distractor in fewer-picks; it's the misconception.
  "How many does X have?" without the noun fails `nounlessQuestion`.
- unitOf/fracOf data must divide exactly (the verifier hard-fails
  non-divisible wholes).
- whichLonger phrasing-to-winner mapping must be per-phrasing explicit
  (more/leads → first name; fewer/trails → second).
- The terse drill register ("Whole 12, one part 7") keeps strings disjoint
  from subtraction/addition banks.
