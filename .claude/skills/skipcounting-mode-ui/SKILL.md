---
name: skipcounting-mode-ui
description: How Skip Count! (skipCounting) presents questions and how its bank is built — sequence payloads, counting claims, band-1 number caps, and every question pattern by family. Use when changing skip-count rendering or authoring skipCounting bank items.
---

# skipCounting — mode UI & bank

Generator: `src/modes/skipCounting.js` (21 varieties incl. targetedOnly
`midBlankDrill`/`repeatedAdditionDrill`). Bank design:
`docs/skipcounting-bank-design.md`. Assembler: `authorSkipCounting.js` on
the shared `bankAssembler.js`.

## Payload rules

- Sequences render via `display.{sequence, step}`; non-unit steps draw NO
  number line (deliberate — arcs would be needed to read honestly).
- Claims: {next} for runs, {between} for interior blanks (midpoint rule),
  {moreLess} for leading blanks, {sum} for totals, {countOn} for jumps;
  slips add `display.pattern {start, step, badIdx}`.
- Band-1 prompts may not state numbers above 20 — the template `item()`
  helper throws.
- Judgment = "Is this right?" Yes/No + display.truth.
- Repeated addition uses ≥3 addends ("5 + 5 = ?" is the addition bank's).

## Question pattern catalog (by family)

### Procedural (letter-free; no signature cap)
| structureType | Bands | Asks |
|---|---|---|
| `nextTermForward/Backward` | 1 | next in 2s/5s/10s runs, both directions, 2-4 terms |
| `nextTermThreesFours` / `backTermThreesFours` / `fivesRun` / `tensRun` | 2 | 3s/4s join; longer 5s/10s |
| `nextTermBigSteps` / `offMultipleRun` | 3 | 6s/25s/50s/100s; off-multiple starts (3, 13, 23…) |
| `missingMiddleTerm/Short/Long/ThreesFours/BigSteps` | 1-3 | interior blank (Sprint ladder) |
| `missingStartTerm/Small/ThreesFours/Big` | 1-3 | leading blank |
| `repeatedAddition(ThreesFours/Big)` | 1-3 | "2 + 2 + 2 = ?" |
| `unitFormSmall/Mid/Big` | 1-3 | "4 twos = ?" (G3 unit form) |

### Conceptual (named prose; ≤5/signature)
| structureType | Bands | Asks |
|---|---|---|
| `membershipJudge(Threes/Big)` | 1-3 | does the count ever say N? (even/odd via 2s) |
| `oddOneOutNotMultiple(ThreesFours/Big)` | 1-3 | which listed number is NOT in the count |
| `nextClaimJudge(Mid/Big)` | 1-3 | judge a child's next-term claim |
| `identifyRule(ThreesFours/Big)` | 1-3 | choose the jump size |
| `errorSkipSlip(Mid/Big)` | 1-3 | find the term that breaks the run |
| `twoJumps(Mid/Big)` | 1-3 | land after two hops |
| `pairsHandsDimes(More)` | 1-2 | pictured pairs/hands/dimes counted by their step |
| `predictLastSmall/Count(Big)` | 1-3 | the last number said (choices ±step) |
| `groupsClaimJudge(Mid/Big)` | 1-3 | judge a groups-total claim |

### Application (stories; ≤3/signature; ask REAL quantities, never "what comes next")
| structureType | Bands | Situation |
|---|---|---|
| `storyEqualGroups` / `storyLastCount` | all | wheels/pairs/hands/coins × groups |
| `storyGroupsClaim` | all | judge a grouped-total claim |
| `storyFindStep` | all | equal growth shown — how much per step |
| `storyCountJumps` | all | how many scoops/jumps to the target |
| `storyLandOn` | all | where do g hops of s land |
| `storyPerDay` / `storyRuleInWorld` / `storyRuleClaim` | all | clock marks, rows of chairs, pages per day |
