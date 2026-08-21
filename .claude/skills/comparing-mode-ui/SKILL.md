---
name: comparing-mode-ui
description: How Comparison Crow (comparing) presents questions and how its bank is built — the symbolSelect a?b layout, compare payload claims, the compareMath gate, and every question pattern by family. Use when changing comparison rendering or authoring comparing bank items.
---

# Comparing — mode UI & bank

Generator: `src/modes/comparing.js` (16 varieties incl. the targetedOnly
`benchmarkDrill`). Bank design: `docs/comparing-bank-design.md`. Assembler:
`scripts/itemGen/authorComparing.js` (+ comparingTemplates/comparingStories).

## Payload rules

- Symbol answers (`<`/`>`/`=`): `op: "?"` + numeric `a`/`b` → renders the
  circle `a ? b` layout, `answerType: "symbolSelect"`; promptText mirrors
  "a ? b" for uniqueness. Expression sides ("3 + 4") and unit-form sides
  ("2 tens 5 ones") are strings. Pictured-row compares must NOT set numeric
  a/b (the structure gate demands prose numbers) — counts go in
  `display.compare = {kind:"counts", a, b}`.
- Numeric answers carry `display.compare` claims the compareMath check
  recomputes: difference/gap/oneMoreLess/closerTo/midpoint.
- Judged = Yes/No + display.truth. Never True/False.

## Question pattern catalog (by family)

### Procedural (letter-free / symbolic; no signature cap)
| structureType | Bands | Asks |
|---|---|---|
| `symbolWithin10/TwoDigit/ThreeDigit` | 1 / 2 / 3 | pick <,>,= — incl. reversals 13/31, big-digit trap, equal pairs, digit-count trap 98/102 |
| `symbolClaimJudge` / `bigSymbolClaimJudge` | 1 / 3 | judged claim "7 > 4" — Is this right? |
| `expressionCompare` / `relationalNoCompute` | 2 / 3 | "3 + 4 ? 5 + 2"; compensation pairs decided WITHOUT computing |
| `placeValueCompare` | 2 | "2 tens 5 ones ? 3 tens 1 one" |
| `vsFive/Ten/Fifteen/Twenty/Fifty/NearestDecade/Hundred/FiveHundred` | 1–3 | landmark drills "n ? benchmark" |
| `orderWithin10/TwoDigit/ThreeDigit` | 1–3 | order three numbers (permutation choices) |
| `pickExtreme*` | 1–3 | which is smallest/largest |
| `oneMoreLess` / `tenMoreLess(Big)` | 1–3 | typed n±1, n±10 |
| `benchmarkDrill` (generator, targetedOnly) | 1–3 | in-band landmark drill for scheduled requests |

### Conceptual (visual/judged; ≤5 per signature — names/nouns rotate)
| structureType | Bands | Asks |
|---|---|---|
| `rowsChooseSymbol(Teen)` | 1 / 2 | pictured rows → choose the symbol |
| `mouthReasoning(Teen)` | 1 / 2 | alligator-mouth reasoning, worded |
| `bothTrueWithin10/Big` | 1 / 3 | multiSelect BOTH true comparisons |
| `symbolFlipFix(Big)` | 2 / 3 | fix a child's reversed symbol |
| `digitCountTrap` | 3 | 98 vs 102 — more digits wins |
| `closerToTen/Decade(Big)` | 1–3 | closer-to choices (claim-checked) |
| `frameGapToTen` | 1 | ten-frame distance to full |
| `fitsBetween*` | 1–3 | pick the number between the bounds |
| `moreThanBenchmark(Big)` | 1 / 3 | threshold judgments |
| `distanceFromTen/Hundred` | 2 / 3 | typed distance to the landmark |
| `nearerToFull` | 1 | which frame count is nearer ten |
| `rowsMoreFewer(Teen)` | 1 / 2 | which row has more/fewer (pictured) |
| `closerToTarget(Big)` | 2 / 3 | which number is nearer the target |
| `lineMidpoint(Big)` | 2 / 3 | numberLine widget halfway tap |
| `rowsHowManyMore` | 1 | pictured difference |
| `closerClaimJudge` | 3 | judged closeness claims |

### Application (stories; ≤3 per signature)
| structureType | Bands | Situation |
|---|---|---|
| `storyWhoMoreFewer` | all | who has more/fewer (names as choices) |
| `storyDifference` | all | how many more/fewer/apart |
| `storyLanguageTrap` | 2–3 | "more" wording, smaller unknown (Progressions) |
| `storyOneMoreLess` | 1 | one more/less in context |
| `storyEnough` | all | needs N, has M — enough? (Yes/No) |
| `storyCloserTo` | all | count closer to lo or hi |
| `storyGapToGoal` | all | how many more to the goal |
| `storyChooseSymbol` | all | story → pick the sign |
| `storyMoreClaimJudge` / `storyWroteSign` | 1–3 | judged claims and written signs |
