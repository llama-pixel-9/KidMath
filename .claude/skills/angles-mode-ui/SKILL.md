# angles mode — UI + bank patterns

Generator: `src/modes/angles.js` (two 2026-08-21 fixes: `classifyByTurn`
CONCEPTUAL→PROCEDURAL — band 1 had no procedural variety at all — and the
`selectVariety` itemFamily filter no longer leaves the band). Bank batch
`b0821` (1,850 items; see `docs/angles-bank-design.md`). Subskills:
`measureAngle`, `angleSum`, `classifyAngle`, `missingAngle`. Band 1 is
degree-free (corners/turns); bands 2-3 use degrees.

## Rendering notes

- Bank answers: integers (numberPad) and word choices; the generator's
  protractor (`answerType:"angle"`) and shapeFigure varieties are not in
  the bank.
- Degree-free band-1 items carry degree math in `display.ang` claims
  (`divTurn {whole, unit}`, `missDeg {total, a}` with unit-count answers)
  so the author verifier still checks every one.

## Question pattern catalog

### procedural (auto-approved)

**classifyAngle** — band1 `cornerClassify_*` "opens less than a square
corner → acute" · `turnClassify_*` "a quarter turn makes which kind?" ·
`cmpCorner_*` smaller/bigger than a square corner · `orderKinds_*`;
bands2-3 `degreeClassify_*` "120 degrees → obtuse" (band3 uses boundary
values 89/90/91/179/180) · `rangePick_*` "which of 40, 90, 120, 180 is
acute?" · `cmpRightDeg_*` · `benchKind_*` **measureAngle** — band1
`turnCount_*` "square corners along a straight line = 2" ·
`quartersLeft_*`; bands2-3 `benchmarkDeg_*` "a quarter turn = ? degrees" ·
`degLF_*` LETTER-FREE "90 + ? = 180 (deg)" · `halfDeg_*` bisect ·
`doubleDeg_*` **angleSum** — band1 `turnsMake_*` "two square corners make
a straight line" · `turnsTotal_*`/`cornersTotal_*`/`halvesTotal_*`;
bands2-3 `addDeg_*` adjacent sums · `sumLF_*` "30 + 45 = ? (deg)" ·
`tripleDeg_*` · `sumPick_*` **missingAngle** — band1 `missingQuarters_*`
"3 of 4 quarter turns done — how many missing?" · `missingCornerLine_*` ·
`missingHalf_*`; bands2-3 `missingTo_*` "30 + ? completes a right angle"
· `missLF_*` "90 - 40 = ? (deg)" · `missingThird_*` · `missPick_*`

### conceptual (reviewed; named prose, mostly judged)

**classifyAngle** — `classSaidJudge_*` label audits · `tiltJudge_*`
orientation-decides-rightness (alternating truth) · `rayLengthTrap_*`
"longer rays, bigger angle" (No) **measureAngle** — `estimateJudge_*`
sensible real-world estimates (Yes) · `estimateTrap_*` swapped estimates
(No) · `turnFactJudge_*` **angleSum** — `sumSaidJudge_*` ·
`pairMakeJudge_*` "30 and 60 make a right angle?" · `orderJudge_*`
commutativity **missingAngle** — `missSaidJudge_*` · `splitWholeJudge_*`
parts re-total the whole · `partWholeTrap_*` "can 120 be part of a right
angle?" (partFits claim)

### application (reviewed; 3 skeletons × 17 names per band)

`storyDoor_*`/`storyClock_*`/`storyScissors_*` (classify in the world) ·
`storyRobot_*`/`storyDial_*`/`storyWheel_*` (turns → counts or degrees) ·
`storySpin_*`/`storyFold_*`/`storyDance_*` (sums) ·
band1 `storyWind_*`/`storyPinwheel_*`/`storyCrank_*`, bands2-3
`storyDoorGap_*`/`storyPie_*`/`storyGate_*` (missing amounts).

## Traps learned building this bank

- Band 1 is inherently verbal (degree-free prose) — it serves with the
  word-problems toggle ON, like patterns/time. The letter-free "(deg)"
  forms only exist in bands 2-3.
- Unit-count missing drills ("4 quarter turns, 2 done") state numbers that
  can EQUAL the answer — every such phrasing must end in "?" for the
  structureMatch exemption.
- The judged register's `missSaid` wording must name the right whole:
  t=90 rows phrased as "a full turn" made the sentence false while the
  claim said true.
- The generator's band-1 `estimateAngle` prints benchmark degrees (30/90/
  150) with the angle widget — deliberate, not a magnitude leak.
- The 4-phrasing pass scheme wraps after 2 passes; small band-1 value
  pools (3-4 tuples) need explicit combo×phrasing bijections or capped
  list lengths.
