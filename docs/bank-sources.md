# Item Bank Source Attribution

This document tracks per-item attribution for bank items adapted from open-licensed sources.
Each session that adapts from external material appends its citations here.

## Licenses

- **Illustrative Mathematics** — https://tasks.illustrativemathematics.org — CC BY 4.0. Verbatim retention permitted with attribution.
- **Open Up Resources K-5 Math** — https://access.openupresources.org — CC BY 4.0. Same terms.
- **OpenStax K-5** — https://openstax.org — CC BY 4.0. Same terms.

Items sourced under CC BY 4.0 carry a `source` field in their bank payload with `name`, `url`, `license`, `fetchedAt`, and usually an `adaptedFrom` label identifying the source task.

## Phase 2 Batch 3 (part 2) — Addition procedural + conceptual (2026-04-20)

Completed Batch 3 by adding 99 procedural + 99 conceptual items (198 total). Bundle now 1586 items, every addition cell at 36-39 items.

Procedural additions used identity (+0) and near-tens pairs (10+X, 11-19 + Y) to avoid duplicate-prompt collisions with the saturated K-1 pool.

Conceptual additions introduced 5 new templates to keep under the per-cell signature limit of 5:
- "Sum path: starting at X, jump Y. Where do you land?"
- "True or make it true: is X + Y equal to Z?"
- "Fingers: show X on one hand and Y on the other. How many fingers?"
- "Add by place value: tens + tens + ones + ones pattern"
- "Halve and double reasoning: X + X is the same as Y. Verify the total."
- "Count-on from X by some amount to reach Y. The amount is?"
- "Open the equation: X + __ = Y. What goes in the blank?"
- "Bar model: a total of Y with one bar at X. Length of the other bar?"
- "Open number sentence: A + B equals what?"
- "Use compensation: X + Y = (X+c) + (Y-c). Compute the value."
- "Rewrite A + B as (A+d) + (B-d). What is the total?"

## Phase 2 Batch 3 — Addition application only (2026-04-20)

Added 99 more addition *application* items (`addition-app-238` through `addition-app-336`). Procedural and conceptual not yet expanded this round — deferred to the next "continue" session so numeric selection stays careful and avoids prompt collisions in the increasingly saturated K-1 proc pool.

- Fresh character set (Eliot, Felicia, Giselle, Hector, Imogen, Jasper, Kira, Leif, Mateo, Nola, Oren, Piper, Qi, Rashid, Savannah, Tomas, Ulises, Vanessa, Wyatt, Xiomara, Yusuf, Zion, Aria, Boaz, Camille, Dmitri, Emeril, Freya, Gideon, Hazel).
- Fresh context set (cabin, cottage, campsite, canyon, coast, craft fair, pottery studio, bird feeder, squirrel trail, camping shelter, museum vault, bicycle repair shop, rock-climbing gym, ice rink, ski lodge, theater stage, observatory, telescope, dance floor, magician's stage).

Addition application cell counts post-session: 35-38 items per cell. Procedural and conceptual still at 25.

## Phase 2 Batch 2 — Addition (2026-04-20)

Added 297 more addition items (99 application + 99 procedural + 99 conceptual). All structurally inspired by IM task patterns (no verbatim text in this batch); same CC BY 4.0 sources referenced in Batch 1. This session introduced new conceptual templates (commutative/doubles/near-doubles framings, "What goes in the circle", "If sum is X and first addend is A, second addend is?", "Missing piece: X equals A plus what?", "Think-addition").

Addition cell counts post-session: 25-28 items per cell (target 50+).

## Phase 2 Batch 1 — Addition (2026-04-20)

Added 297 new addition items (99 application + 99 procedural + 99 conceptual). Two items are IM-anchored with verbatim/near-verbatim adaptation; the remaining 295 are structural variants inspired by IM task patterns (Add-To, Part-Part-Whole, Compare) without verbatim text.

### IM-anchored items

| itemId | IM task | URL | Standard |
| --- | --- | --- | --- |
| `addition-app-040` | At the Park (join change unknown variant) | https://tasks.illustrativemathematics.org/content-standards/1/OA/A/1/tasks/160.html | 1.OA.A.1 |
| `addition-app-041` | Maria's Marbles (compare smaller unknown) | https://tasks.illustrativemathematics.org/content-standards/1/OA/A/1/tasks/162.html | 1.OA.A.1 |

### Structural inspirations (no verbatim text)

The remaining 295 items draw on these IM task patterns for structure but use original wording:

- Add-To Result Unknown / Change Unknown — 1.OA.A.1 cluster (At the Park, School Supplies, Sharing Markers, The Pet Snake, 20 Tickets, Growing Bean Plants)
- Part-Part-Whole Whole Unknown / Part Unknown — K.OA.A.3 (Boys and Girls Variation 1 & 2, Ten Flashing Fireflies)
- Compare Difference / Bigger / Smaller Unknown — 1.OA.A.1 (Maria's Marbles, Field Day Scarcity, Peyton's Books)
- Make-Ten fluency — K.OA.A.4 (finding the number that makes 10)
- Ten-frame decomposition — K.OA.A.3

All inspirations come from https://tasks.illustrativemathematics.org under CC BY 4.0.
