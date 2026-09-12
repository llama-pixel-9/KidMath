# measurement mode — UI + bank patterns

Generator: `src/modes/measurement.js`. Bank batch `b0821` (2,313 items; see
`docs/measurement-bank-design.md`). Subskills: `lengthConvert`,
`massVolumeConvert`, `benchmarkEstimate`, `compareOrder`,
`multiStepMeasure`. Band ladder: K-1 = NO conversion (sense/compares ≤20);
2-3 = larger→smaller conversions; 4-5 = reverse direction + mixed units.

## Rendering notes

- Everything is prose/choice/typed — no measurement-specific widget. The
  generator's band-1 `compareSameUnit` uses `symbolSelect` (`a ? b`).
- `selectVariety` keeps family subordinate to band (leak fix), and
  `compareSameUnit` is PROCEDURAL — band 1's only procedural variety; if
  it goes back to conceptual, the band-1 procedural bank cell becomes
  unreachable.

## Question pattern catalog

### procedural (auto-approved)

**lengthConvert** — `longerByTeen` "A 12 cm ribbon and a 7 cm ribbon. The
first is longer by ? cm" · `iterateTeen` "4 paperclips, each 3 cm, laid
end to end = ? cm" · `convertDownMid` "3 m = ? cm" · `mixedToSmallMid`
"1 m 25 cm = ? cm" · `convertUpBig` "300 cm = ? m" · `addMixedBig`
"2 m + 340 cm = ? cm"

**massVolumeConvert** — `heavierByTeen` / `pourTogether` (≤20) ·
`convertDownMassMid` "2 kg = ? g" · `mixedVolumeMid` "1 L 250 mL = ? mL" ·
`convertUpMassBig` "2000 g = ? kg" · `mixedMassBig` "2 kg 340 g = ? g"

**benchmarkEstimate** — `magnitudePickTeen` "a pencil: about 18 cm or 18
m?" · `benchmarkPickTeen` "About how long is a school bus?" ·
`betweenEstimateMid` "longer than 3 m, shorter than 5 m → ? m" ·
`roundTenMid`/`roundHundredBig` · `midEstimateBig` halfway estimates

**compareOrder** — `sameUnitPickTeen` (choice) · `differenceTeen/Mid` "84
cm is more than 47 cm by ? cm" · `crossUnitPickMid` "2 m or 180 cm?" ·
`pickLongestBig` three measures · `diffAfterConvertBig` "3 m is longer
than 250 cm by ? cm"

**multiStepMeasure** — `joinLengthsTeen/Mid` · `cutLengthTeen` ·
`usedFromRollMid` · `convertThenAdd(Mass)Big` "1 m 30 cm of rope plus 45
cm more = ? cm"

### conceptual (reviewed; named prose)

**lengthConvert** — `whichLongerTeen` · `unitScaleJudgeTeen` "a crayon is
about 9 m? No" (the benchmark scale error) · `growthSentence` "which
number sentence finds the growth?" · `convJudgeMid` · `crossLonger_band2`
· `factorPickMid` "to change metres into centimetres, multiply by ?" ·
`factorSlipJudge` (×10-vs-×100 slips) · `whichAmountBig` ·
`twoStepJudgeBig` (m→mm claims)

**massVolumeConvert** — `whichHeavierTeen`/`whichHoldsMoreTeen` ·
`massSenseJudgeTeen` · `convJudgeMassMid` · `crossHeavierMid` ·
`lessJudgeMassMid` · `factorSlipMassJudge` · `enoughVolumeJudge` "recipe
needs 1500 mL; the 2 L carton — enough?" · `heaviestSaidBig`

**benchmarkEstimate** — `estimateJudgeTeen/Mid/Big` scale-sanity judged ·
`bestUnitPickTeen` · `closerToPickTeen` · `roundJudgeMid/Big` (round-down
slips) · `estimateOrExactMid` "does this task need an EXACT measure?" ·
`closestSumBig`

**compareOrder** — `transitiveTeen` "rope > scarf > ribbon — longest?" ·
`cmpJudgeTeen` · `whichShorterTeen` · `bigNumberTrapMid` "300 cm beats 2 m
because the number is bigger — right?" (the flagship misconception) ·
`middleMeasureMid` · `lessJudgeMid` · `equalTrapBig` "2 m equals 200 cm?"
· `pickShortestBig` · `longestSaidBig`

**multiStepMeasure** — `joinPlanTeen`/`cutPlanTeen` number-sentence picks ·
`joinJudgeTeen` · `twoStepJudgeMid` · `orderInvarianceMid` "cut first or
join first — same result?" · `firstStepPickMid` "which step comes FIRST?"
· `mixedSlipJudgeBig` (the add-the-numbers slip: 3 m 25 cm ≠ 28 cm) ·
`rollLeftoverBig` · `halfJugJudgeBig`

### application (reviewed; craft/garden/kitchen/trail/pet scenes)

`storyGrow_*` plants gaining cm · `storyStripJoin`/`storySnip` craft
ribbon · `storyTrailMetres`/`storyWallCm`/`storyRaceKm`/`storyBannerCm`/
`storyRibbonLeft` conversions in context · `storyPetGain_*` ·
`storySoupML`/`storyFlourG`/`storyJuiceMix`/`storyFeedGrams`/
`storyPourIn`/`storyPourOut`/`storyBatterMore`/`storyJarsTotal` ·
`storyGuessOff_*` "guessed 6 cm, really 9 — how far off?" ·
`storySensibleLabel`/`storyUnitChoice`/`storyGuessJudge` ·
`storyRoundWalk`/`storyRoundPier`/`storyBoardsRound`/`storyEstimateOff` ·
`storyBoatRace`/`storyShellLonger`/`storyTowerDiff`/`storyJarCompare`/
`storyRopeCompare`/`storyPathShorter`/`storyParcelHeaviest`/
`storyMelonDiff`/`storyGapAfterConvert` · `storyFence_*`/`storyQuiltRow`/
`storyTwoHops`/`storyPourTwice`/`storyJoinTrim`/`storyRecipeMore`/
`storyTankFill`/`storyPackParcel`

## Traps learned building this bank

- Band 1 is conversion-free BY DESIGN — don't put "3 m = ? cm" below level
  4, and keep every band-1 prompt number ≤20 (so quarters-style values like
  "30 cm" or "40 kg" can't be STATED at band 1 even in sensible-guess
  items).
- A band with no procedural variety makes that band's procedural bank cell
  unreachable — the engine consults the bank by the GENERATED family.
- Question tails like "that is how many?" fail `nounlessQuestion` — name
  the unit ("How many centimetres is that?").
- Label-answer compares need strictly distinct values (the verifier rejects
  ties for cmp/cmp3/maxSaid claims).
- bandAppropriate/readability warnings are expected in bulk here (metric
  values are big and unit-dense); they're advisory.
