# areaPerimeter mode — UI + bank patterns

Generator: `src/modes/areaPerimeter.js` (`selectVariety` fixed 2026-08-21:
the itemFamily filter no longer falls back to any-band — the numberBonds
level-leak class). Bank batch `b0821` (1,881 items; see
`docs/areaperimeter-bank-design.md`). Subskills: `area`, `perimeter`,
`compositeFigures`, `measureReasoning`. Dims: 2-6 units / 3-12 cm /
to 15 m.

## Rendering notes

- Bank answers are integers (numberPad) or word choices; the generator's
  `display.{width,height}` grid payloads are generator-only — bank items
  carry claims in `display.ap` instead, so the m4 spec's swap-distractor
  probe must bypass the bank (`consultBankFamilies: []`).
- "Area: 5 x 3 = ?" / "Perim: 5 + 3 + 5 + 3 = ?" are the letter-free
  registers (5 letters — under the 6-letter isVerbalPrompt threshold).

## Question pattern catalog

### procedural (auto-approved)

**area** — `areaDims_*` "A rectangle is 8 cm long and 5 cm wide. What is
its area in square cm?" (band1 counts unit squares) · `areaLF_*`
letter-free · `squareArea_*` · `areaPick_*` (perimeter and w+h as
distractors) **perimeter** — `perimDims_*` "trip all the way around" /
perimeter in cm/m · `perimLF_*` letter-free · `squarePerim_*` ·
`missingSide_*` "perimeter 22 cm, one side 7 cm → other side"
**compositeFigures** — `joinAreas_*` two rectangles, no overlap ·
`cutArea_*` notch removed · `twoSquares_*` · `missingPart_*` total minus
known part **measureReasoning** — `whichMeasure_*` fence-vs-sod picks
(band1: "around the edge"/"inside the shape") · `unitPick_*` unit squares
vs units (13 nouns carry uniqueness) · `labelPick_*` · `bothMeasures_*`

### conceptual (reviewed; named prose, mostly judged)

**area** — `areaAddTrap_*` adds the sides (No) · `areaSaidJudge_*` ·
`turnJudge_*` "rotation changes area" (No) **perimeter** —
`perimHalfTrap_*` only two sides added (No) · `perimSaidJudge_*` ·
`swapTrap_*` answers a perimeter question with the area (No)
**compositeFigures** — `overlapTrap_*` "just add overlapping areas" (No) ·
`splitJudge_*` cutting preserves total area (Yes) · `sumJudge_*`
**measureReasoning** — `purposeJudge_*` is area the right measure for
this job? · `unitJudge_*` wrong-unit labels (No) · `samePerimJudge_*`
equal-perimeter/unequal-area pairs (data verified both ways)

### application (reviewed; 3 skeletons × 17 names per band)

`storyRug_*`/`storyGardenA_*`/`storyPaint_*` (cover: area) ·
`storyFence_*`/`storyFrame_*`/`storyWalk_*` (around: perimeter) ·
`storyRooms_*`/`storyPatio_*`/`storyCut_*` (composite) ·
`storyChalk_*`/`storyCover_*`/`storyTrim_*` (choose the measure, then
compute).

## Traps learned building this bank

- The 4-phrasing pass scheme wraps after 2 passes (`% 4`): a 13-item list
  over 5 distinct values repeats (value, phrasing) on pass 3. Keep lists
  ≤ 2 × distinct-values, or widen the data.
- Missing-side rows where p/2 − w = w state the answer in the prompt.
- Generator band-1 grid varieties put dims in `display.{width,height}`
  and the m4 spec recomputes from prompt fragments ("N rows with N
  squares") — bank wording deliberately differs so the pinned
  recomputation never matches bank items.
