# fractions mode — UI + bank patterns

Generator: `src/modes/fractions.js` (`selectVariety` is band-safe; three
varieties reclassified to PROCEDURAL 2026-08-21 — see
`docs/fractions-bank-design.md`). Bank batch `b0821` (2,787 items).
Subskills: `partWhole`, `fractionAsNumber`, `equivalence`,
`compareFractions`, `addLikeDenominators`, `fractionOfSet`. Denominator
bands: {2,3,4} / +{5,6,8} / +{10,12}.

## Rendering notes

- Fraction answers are strings via `fracLabel` ("3/4") — bank items use
  choice or numberPad only. The generator's `numberLine`
  (`tickValue` decimals), `symbolSelect`, and `multiSelect` varieties are
  NOT represented in the bank (non-integer answers fail QC; multiSelect is
  banned bank-wide).
- `FractionInput` / `FractionSet` widgets exist but bank drills type plain
  integers (numerators, denominators, counts, of-set results).

## Question pattern catalog

### procedural (auto-approved; terse drill register)

**partWhole** — `shadeName_*` "3 of 4 equal parts are shaded. The shaded
fraction = ?" · `unshadeName_*` (the UNSHADED complement) · `wholeParts_*`
"How many fourths make one whole?" · `readDen_*`/`readNum_*` "In the
fraction 3/4, the bottom/top number = ?" **fractionAsNumber** —
`unitMeaning_*` "1/4 means 1 of ? equal parts" · `unitJumps_*` "3 hops of
1/4 from 0 land on ?/4" · `wholeAsFrac_*` "1 = ?/4" · `tickName_*` "step 3
of 4 on a 0-1 line" · `countUnits_*`/`unitsBuild_*` (decompose/compose via
unit fractions) **equivalence** — `scaleUp_*` "1/2 = ?/4" ·
`simplifyUnit_*` "2/4 = 1/?" · `missingDen_*` "1/2 = 2/?" · `scaleDown_*`
"4/8 = ?/2" **compareFractions** — `sameDenCmp_*` / `sameNumCmp_*` pick
<,>,= · `halfBenchmark_*` less/equal/greater than 1/2 · `smallestPick_*`
least of three like fractions **addLikeDenominators** — `addLike_*` /
`subLike_*` / `missingAddend_*` "1/4 + ?/4 = 3/4" · `addThree_*` ·
`subFromOne_*` "1 - 1/4 = ?" **fractionOfSet** — `ofSet_*` "1/3 of 12 = ?"
· `wholeFromUnit_*` "1/4 of a number is 5. The number = ?" · `ofSetPick_*`

### conceptual (reviewed; named prose, mostly judged)

**partWhole** — `partPartTrap_*` writes 3/1 for 3-of-4 (part-to-part, No) ·
`equalPartsJudge_*` are the pieces truly equal parts? · `nameJudge_*`
**fractionAsNumber** — `wholeJudge_*` "4/4 equals one whole?" ·
`closerEnd_*` nearer 0 or 1 · `beyondOne_*` improper > 1 judgments
**equivalence** — `equivJudge_*` cross-mult audits · `pickEquiv_*` find the
twin · `doubleBothJudge_*` "doubling top AND bottom changes the value"
(No) **compareFractions** — `bigDenTrap_*` "bigger denominator, bigger
fraction" (No) · `whichBigger_*` pick the larger · `sameWholeTrap_*` "half
of a giant cookie = half of a small one" (No) **addLikeDenominators** —
`denTrap_*` adds the denominators too (No) · `sumJudge_*` · `completeWhole_*`
which fraction reaches 1 **fractionOfSet** — `ofSetJudge_*` ·
`biggerShare_*` 1/2 vs 1/4 of the same set · `keepRest_*` give away 1/d,
keep how many

### application (reviewed; 3 skeletons × 17 names per band)

`storyEat_*`/`storyPaint_*`/`storyLeft_*` (pizza slices, painted fences) ·
`storyTrail_*`/`storyRibbon_*`/`storyBottle_*` (distance walked, marks
filled) · `storyScoop_*`/`storyGrid_*`/`storyPizza_*` (1/2 cup with a 1/4
scoop — equivalence in the wild) · `storyShare_*`/`storyDays_*`/
`storyFuller_*` (same-size wholes compared) · `storyRead_*`/`storyPlant_*`/
`storyPour_*` (like-denominator add/subtract) · `storyGive_*`/`storyUse_*`/
`storyKeep_*` (of-a-set give/use/keep).

## Traps learned building this bank

- The self-answering rule exempts prompts containing `?` or `_` — "State
  the denominator of 3/10." fails, "What is the denominator of 3/10?"
  passes. Terse imperative drills need a question mark.
- "How many is that?" / "of 45 works out to how many?" fail
  `nounlessQuestion`; bare-number drills should ask "What number is that?".
- Band 1 has only ~6-10 distinct fraction tuples per structure; nameless
  drills need 4 phrasings with a pass-based index
  (`floor(i/len)*2 + i%2`), not 2, to stay promptText-unique.
- cmpPick claims hard-fail equal cross-products; closerEnd hard-fails the
  exact half; every of-set/equivalence claim enforces divisibility.
- Session probes must `recordAnswer` between draws — the family cursor
  only advances on answers, so a draw-only probe sees one family forever.
