# Item Bank Variety Spec — Part A & B: The Four Operation Modes

Companion to `problem-variety-expansion-plan.md`. Evidence: `research-k4-problem-types.md` §1-2.
Covers `addition`, `subtraction`, `multiplication`, `division`.

**This is the authoring spec.** Reviewers should read the example column as if it were on screen — if an
example reads badly here, it will read badly in the app.

## Sourcing model

**Static authored items. No templating.** Every prose-carrying item is individually authored and
human-reviewed with its numbers fixed, in the existing bank format:

```js
question: { a:9, b:7, answer:16,
            display: { promptText: "Mina has 9 shells and finds 7 more. How many now?" } }
```

Parameterized templates were considered and **rejected**. Do not reintroduce them.

**Sourcing rule applied to every row below:**

| Item type | Source |
|---|---|
| `application` | **bank** — authored, reviewed |
| `conceptual` carrying prose / a written stem | **bank** |
| `conceptual`, purely symbolic or visual, no authored wording | generator |
| `procedural`, symbolic | generator — `27 + 45 = ?` has no prose to review |
| Format transforms (true/false, odd-one-out, error analysis) | generator **from a bank item** — inherits reviewed prose |

**Volume consequence — read this before estimating cost.** One authored item is one item; the numbers
are fixed, so it cannot be re-instantiated. The engine's `SESSION_SIZE = 15` and `RECENT_BANK_WINDOW = 8`
mean an adaptive session targeting a child's weakest cell **can exhaust a small cell within a single
session**. The old floor of 8 items/cell is far too low under this model. Floors below are tiered by
traffic; see §Authoring load.

Marking: **[S]** = grounded in a retrieved source (CCSS Table 1/2, OA Progressions).
**[C]** = constructed by us. Part A/B is unusually well sourced; most rows are [S].

---

## How difficulty works here

Not by number size. By **where the unknown sits** and whether the situation equation matches the
solution operation. Tiers and grade placement are from the OA Progressions [S]:

| Tier | Property | Level band |
|---|---|---|
| Easy | Solvable by direct modeling (count all) | 1-3 |
| Middle | Requires counting on / counting back | 4-6 |
| Difficult | **Situation equation opposite to solution operation** | 7-10 |

Number magnitude is a *secondary* dial applied within a structure, not the primary one.

---

# PART A — Additive structures (`addition`, `subtraction`)

Note: Table 1 is a *single* grid spanning both modes. `addition` and `subtraction` are UI framings, not
distinct taxonomies — Take From/Result Unknown is a subtraction item; Add To/Start Unknown is filed under
addition but *solved* by subtraction. **Both modes draw from the same 14 structures**, filtered by which
operation the child will perform.

## A1. The 14 structures

| # | Variety ID | Equation | Canonical example [S] | Tier | Band | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | `addToResultUnknown` | `2 + 3 = ?` | Two bunnies sat on the grass. Three more bunnies hopped there. How many bunnies are on the grass now? | Easy | 1-3 | application | bank |
| 2 | `addToChangeUnknown` | `2 + ? = 5` | Two bunnies were sitting on the grass. Some more hopped there. Then there were five. How many hopped over? | Middle | 4-6 | application | bank |
| 3 | `addToStartUnknown` | `? + 3 = 5` | Some bunnies were sitting on the grass. Three more hopped there. Then there were five. How many were there before? | **Difficult** | 7-10 | application | bank |
| 4 | `takeFromResultUnknown` | `5 − 2 = ?` | Five apples were on the table. I ate two apples. How many are on the table now? | Easy | 1-3 | application | bank |
| 5 | `takeFromChangeUnknown` | `5 − ? = 3` | Five apples were on the table. I ate some apples. Then there were three. How many did I eat? | Middle | 4-6 | application | bank |
| 6 | `takeFromStartUnknown` | `? − 2 = 3` | Some apples were on the table. I ate two apples. Then there were three. How many were on the table before? | **Difficult** | 7-10 | application | bank |
| 7 | `putTogetherTotalUnknown` | `3 + 2 = ?` | Three red apples and two green apples are on the table. How many apples are on the table? | Easy | 1-3 | application | bank |
| 8 | `putTogetherAddendUnknown` | `3 + ? = 5` | Five apples are on the table. Three are red and the rest are green. How many are green? | Middle | 4-6 | application | bank |
| 9 | `bothAddendsUnknown` | `5 = 0+5, 1+4, 2+3…` | Grandma has five flowers. How many can she put in her red vase and how many in her blue vase? | Easy | 1-3 | conceptual | generator |
| 10 | `compareDifferenceMore` | `2 + ? = 5` | Lucy has two apples. Julie has five apples. How many **more** apples does Julie have than Lucy? | Middle | 4-6 | application | bank |
| 11 | `compareDifferenceFewer` | `5 − 2 = ?` | Lucy has two apples. Julie has five apples. How many **fewer** apples does Lucy have than Julie? | Middle | 4-6 | application | bank |
| 12 | `compareBiggerMore` | `2 + 3 = ?` | Julie has three **more** apples than Lucy. Lucy has two apples. How many does Julie have? | Middle | 4-6 | application | bank |
| 13 | `compareBiggerFewer` ⚠ | `2 + 3 = ?` | Lucy has three **fewer** apples than Julie. Lucy has two apples. How many does Julie have? | **Difficult** | 7-10 | application | bank |
| 14 | `compareSmallerMore` ⚠ | `5 − 3 = ?` | Julie has three **more** apples than Lucy. Julie has five apples. How many does Lucy have? | **Difficult** | 7-10 | application | bank |
| 15 | `compareSmallerFewer` | `5 − 3 = ?` | Lucy has three **fewer** apples than Julie. Julie has five apples. How many does Lucy have? | Middle | 4-6 | application | bank |

⚠ = the **language traps**. The Progressions footnote states one version "directs the correct operation"
and "the other versions are more difficult" [S]. In #13 the word *fewer* appears but the child must
**add**; in #14 the word *more* appears but the child must **subtract**. These are the highest-value items
in the entire app and we currently generate none of them.

(15 rows because Difference Unknown splits into two language variants; the 12-cell/11-subtype/14-template
reconciliation is in the research doc §1.)

## A2. Grade gating [S]

- **Band 1-3 (K):** structures 1, 4, 7, 9 **only**, totals within 10.
- **Band 4-6 (G1-2):** add 2, 5, 8, 10, 11, 12, 15. Introduce 3, 6, 13, 14 without requiring mastery.
- **Band 7-10 (G2+):** all 15, both language variants, within 100. Two-step unlocked.

Progressions constraint: two-step problems "should not involve these [most difficult] subtypes" and
should mostly use single-digit addends [S]. **Never compose two Difficult structures.**

## A3. Format overlay

Each structure above × these formats. Formats are **generator transforms — never banked** (plan §Phase 5).

| # | Format ID | Applied to | Concrete example | Band | Family |
|---|---|---|---|---|---|
| F1 | `symbolic` | any | `7 + 5 = ?` | all | procedural |
| F2 | `missingOperand` | 2,3,5,6,8 | `7 + ? = 12` | 4-10 | conceptual |
| F3 | `missingOperator` | any | `7 ? 5 = 12` | 4-10 | conceptual |
| F4 | `trueFalse` | any | `8 + 5 = 13` — true or false? | 4-10 | conceptual |
| F5 | `equationForm` | any | `12 = 7 + 5` — true or false? *(reversed; commonly called false)* | 4-10 | conceptual |
| F6 | `reflexive` | any | `9 = 9` — true or false? *(commonly called false)* | 4-6 | conceptual |
| F7 | `commutative` | any | `6 + 9 = 9 + 6` — true or false? | 4-6 | conceptual |
| F8 | `balanceBothSides` | any | `8 + 4 = 7 + 5` — true or false? | 7-10 | conceptual |
| F9 | `balanceOpen` | any | `8 + 4 = □ + 5` | 7-10 | conceptual |
| F10 | `relationalNonComputable` | any | `37 + 48 = 38 + 47` — true or false? *(true by compensation; too awkward to compute)* | 7-10 | conceptual |
| F11 | `oddOneOut` | any | Which does **not** equal 12? `7+5` · `8+4` · `6+5` · `9+3` | 4-10 | conceptual |
| F12 | `errorAnalysis` | any | Sam says `27 + 5 = 72`. What mistake did Sam make? | 7-10 | conceptual |
| F13 | `estimation` | any | About how much is `48 + 51`? ~50 · ~100 · ~150 · ~500 | 4-10 | application |
| F14 | `extraneousInfo` | 1-15 | Maya had 8 marbles in a red bag and 3 friends. She found 5 more marbles. How many marbles now? | 7-10 | application |
| F15 | `twoStep` | Easy+Middle only | Maya had 8 stickers. She gave 3 away, then found 4. How many now? | 7-10 | application |
| F16 | `twoCorrect` | any | Pick **both** that equal 12: `7+5` · `6+5` · `8+4` · `9+2` | 4-10 | conceptual |

F5-F10 target the equal-sign misconception (Carpenter, Franke & Levi 2003 [S]). F10 is the most valuable:
the numbers are deliberately awkward so computing is harder than reasoning.

## A4. Representation overlay

Same structure, three renderings — the Math in Focus CPA commitment [S].

| Rep ID | answerType | Applies to | Example |
|---|---|---|---|
| `objectSet` | choice | 1,4,7,9 | 🍎🍎🍎 + 🍎🍎 shown; how many? |
| `numberBond` | numberBond | 7,8,9 | whole 5, part 3, part ? |
| `barPartWhole` | barModel | 1-9 | two-segment bar, total unknown |
| `barComparison` | barModel | 10-15 | two stacked bars with a difference bracket |
| `numberLine` ⚠NEW | numberLine | 2,3,5,6,10-15 | jump from 2 to 5 — how far? |
| `symbolic` | numberPad / choice | all | `2 + 3 = ?` |

⚠ `numberLine` is the one **new widget** Part A needs. It is the canonical Grade 2-3 model for Compare
and Change Unknown and we have no equivalent. Treat as a UI cost to schedule.

Everything else already exists: `barModel`, `numberBond`, `numberPad`, `symbolSelect`, `choice`.
**Today `addition` emits none of `barModel`, `numberBond`, or `objectSet`** despite all three being built.

## A5. Context pool

Under the static-authored model this is **an authoring aid, not a runtime multiplier** — it is the
vocabulary authors draw on to keep 100 items in one cell from reading alike. Contexts are orthogonal to
structure; one pool serves all 15.

- **Actors:** rotate given names per the authoring guide (Maya, Ravi, Lucy, Julie, Sam, Ana, Kofi, Mei, Omar, Nina…)
- **Countables:** apples, stickers, marbles, shells, books, pencils, buttons, crayons, cards, coins, blocks, beads
- **Settings:** table, garden, shelf, backpack, jar, box, pond, playground
- **Join verbs:** hopped over, joined, arrived, was given, found, bought
- **Separate verbs:** ate, gave away, lost, sold, shared, put back

Authoring guards, enforced by `validateDrafts.js` rather than by reviewer discipline:

- Rotate actor names so no name exceeds ~15% of a cell.
- Keep `findPromptOveruse()` signature share ≤25% within a cell (plan §Phase 0). With 100 authored items
  per T1 cell this is the check that stops an LLM producing 100 near-identical shell-counting stories.
- Vary the countable noun and setting across a cell — an author asked for 100 Add To/Result Unknown items
  will otherwise drift into one context.

## A6. Misconceptions & distractors

`distractors.js` currently implements 4 strategies. Below, each tag maps to a *diagnostic* wrong answer.

| Tag | Child's error | Distractor rule | Example (`8 + 5 = 13`) |
|---|---|---|---|
| `operationSwap` | Adds when the story says subtract, or vice versa | `a − b` instead of `a + b` | 3 |
| `offByOne` | Miscounts by one when counting on | `answer ± 1` | 12 or 14 |
| `placeValueSlip` | Fails to regroup; writes both digits | concatenate / drop the carry | 113 |
| `keywordTrap` ⚠NEW | Follows the word, not the structure — the #13/#14 trap | apply the operation the *word* suggests | #14 "3 more", answer 2, distractor **8** |
| `equalsMeansCompute` ⚠NEW | Reads "=" as "answer next" | in `8 + 4 = □ + 5`, answer left side (12) or total (17) | 12, 17 |
| `startAsResult` ⚠NEW | On Start Unknown, adds the two given numbers | `given1 + given2` | #3 (`? + 3 = 5`) → **8** |
| `countAllIncludingSelf` | Counts a boundary twice | `answer + 1` on Compare | — |

The three ⚠NEW tags are the ones that make the hard structures *diagnostic*. Without them, a child
failing #14 is indistinguishable from one who simply miscounted — which is the whole reason to build
this taxonomy.

---

# PART B — Multiplicative structures (`multiplication`, `division`)

CCSS Table 2 [S]. Equal Groups and Array/Area are Grade 3; multiplicative Compare is Grade 4.
As with Table 1, the grid spans both modes: Group Size Unknown and Number of Groups Unknown are the
two division meanings.

## B1. The 9 structures

| # | Variety ID | Equation | Canonical example [S] | Band | Family | Source |
|---|---|---|---|---|---|---|
| 1 | `equalGroupsProductUnknown` | `3 × 6 = ?` | There are 3 bags with 6 plums in each bag. How many plums are there in all? | 4-6 | application | bank |
| 2 | `equalGroupsSizeUnknown` *(partitive)* | `3 × ? = 18` | If 18 plums are shared equally into 3 bags, then how many plums will be in each bag? | 4-6 | application | bank |
| 3 | `equalGroupsNumberUnknown` *(quotitive)* | `? × 6 = 18` | If 18 plums are to be packed 6 to a bag, then how many bags are needed? | 7-10 | application | bank |
| 4 | `arrayProductUnknown` | `3 × 6 = ?` | There are 3 rows of apples with 6 apples in each row. How many apples are there? | 4-6 | application | bank |
| 5 | `arrayRowSizeUnknown` | `3 × ? = 18` | If 18 apples are arranged into 3 equal rows, how many apples will be in each row? | 4-6 | application | bank |
| 6 | `arrayRowCountUnknown` | `? × 6 = 18` | If 18 apples are arranged into equal rows of 6 apples, how many rows will there be? | 7-10 | application | bank |
| 7 | `compareProductUnknown` | `3 × 6 = ?` | A blue hat costs $6. A red hat costs 3 times as much as the blue hat. How much does the red hat cost? | 7-10 | application | bank |
| 8 | `compareSetSizeUnknown` | `3 × ? = 18` | A red hat costs $18 and that is 3 times as much as a blue hat costs. How much does a blue hat cost? | 7-10 | application | bank |
| 9 | `compareMultiplierUnknown` | `? × 6 = 18` | A red hat costs $18 and a blue hat costs $6. How many times as much does the red hat cost as the blue hat? | 7-10 | application | bank |

**Priority flag.** The bank today holds `equalGroupsTotalUnknown` × 933 and `quotitiveDivision` × **4**.
Structures 3 and 6 — measurement/quotitive division — are effectively untaught in the app. Structures
7-9 (multiplicative Compare, Grade 4) are absent entirely. These are the gap.

## B2. Additional Grade 3-4 structures [C]

Not in Table 2 but required by the grade level:

| # | Variety ID | Example | Band |
|---|---|---|---|
| 10 | `divisionWithRemainder` | 17 pencils shared among 5 children. How many each, and how many left over? | 7-10 |
| 11 | `remainderInterpretation` | 17 children need vans holding 5 each. How many vans are needed? *(answer 4, not 3 r2)* | 7-10 |
| 12 | `areaProductUnknown` | A rug is 3 ft by 6 ft. What is its area? | 7-10 |
| 13 | `areaSideUnknown` | A rug covers 18 sq ft and is 3 ft wide. How long is it? | 7-10 |
| 14 | `multiStepTwoOps` | 4 boxes of 6 crayons; 5 crayons break. How many usable? | 7-10 |

#11 is worth building deliberately: the arithmetic is identical to #10 but the *interpretation* differs,
and children who have only met "r2" answers reliably fail it.

## B3. Format overlay

Formats F1-F16 from A3 apply, plus:

| # | Format ID | Example | Band |
|---|---|---|---|
| F17 | `factFamily` | Which does **not** belong to the family 3, 6, 18? `3×6=18` · `18÷3=6` · `18−6=12` · `6×3=18` | 4-10 |
| F18 | `arrayRotation` | Is `3 × 6` the same as `6 × 3`? Show why with an array | 4-6 |
| F19 | `doublingHalving` | `40 × 6 = 20 × 12` — true or false? *(true; relational)* | 7-10 |
| F20 | `divisibilitySense` | Can 18 stickers be shared equally among 4 children? | 7-10 |

## B4. Representation overlay

| Rep ID | answerType | Applies to | Example |
|---|---|---|---|
| `equalGroupsVisual` | choice | 1-3 | three bags each showing 6 plums |
| `arrayGrid` | choice / numberPad | 4-6, 12-13 | 3×6 dot grid |
| `barMultiplicative` | barModel | 7-9 | one unit bar vs a 3-unit bar |
| `areaModel` ⚠NEW | areaGrid | 12-14 | partitioned rectangle for distributive reasoning |
| `numberLineJumps` ⚠NEW | numberLine | 1-3 | three jumps of 6 |
| `symbolic` | numberPad / choice | all | `3 × 6 = ?` |

Two new widgets (`areaGrid`, `numberLine`) — `numberLine` is shared with Part A, so the real incremental
cost here is `areaGrid` alone.

## B5. Context pool

- **Containers:** bags, boxes, baskets, plates, jars, shelves, vans, tables
- **Countables:** plums, apples, stickers, marbles, cookies, pencils, chairs, books
- **Array settings:** rows of chairs, garden beds, egg cartons, tiles, stamps, seats
- **Compare settings:** prices, heights, distances, weights, ages, scores

As in A5, this is authoring vocabulary rather than a runtime multiplier — the pool exists so that 60
authored `equalGroupsProductUnknown` items don't all involve plums in bags.

## B6. Misconceptions & distractors

| Tag | Child's error | Distractor rule | Example (`3 × 6 = 18`) |
|---|---|---|---|
| `factNeighbor` | Recalls an adjacent fact | `answer ± a` or `± b` | 15, 21 |
| `operationSwap` | Adds instead of multiplying | `a + b` | 9 |
| `divisionReversed` ⚠NEW | Divides the wrong way round | `b ÷ a` instead of `a ÷ b` | 18÷3 → answers 3 |
| `partitiveQuotitiveConfusion` ⚠NEW | Reports group count when asked group size | swap the two division meanings | #2 → answers 6 not 3 |
| `remainderDropped` ⚠NEW | Ignores the remainder when it should round up | floor instead of ceiling | #11 → answers 3 |
| `compareAsAdditive` ⚠NEW | Reads "3 times as much" as "3 more" | `a + b` instead of `a × b` | #7 → answers 9 |
| `multiplierAsProduct` | On #9, multiplies rather than divides | `a × b` | 108 |

`compareAsAdditive` is the Grade 4 equivalent of Part A's `keywordTrap` and is the single most common
multiplicative-compare error.

---

# Authoring load

Under the static-authored model, almost every structure in Parts A and B carries prose and is therefore
**bank**. These are the highest-traffic modes in the app, so they also need the deepest cells.

| | Bank varieties | Generator varieties | Bank cells | 
|---|---|---|---|
| Part A (add/sub) | 14 (all structures except #9 `bothAddendsUnknown`) | #9 + all 16 formats | 14 × 3 bands = **42** |
| Part B (mult/div) | 14 (all 9 Table 2 + all 5 extensions) | all 20 formats | 14 × 2 bands = **28** |
| **Total** | **28** | | **70** |

## Tiered per-cell floors

A uniform floor is the wrong instrument — `addition` application cells get orders of magnitude more
traffic than `compareMultiplierUnknown`. Tier by traffic:

| Tier | Cells | Floor | Items |
|---|---|---|---|
| **T1** — addition & subtraction, bands 1-6 | ~28 | 100 | 2,800 |
| **T2** — add/sub band 7-10; multiplication & division bands 4-6 | ~28 | 60 | 1,680 |
| **T3** — mult/div band 7-10, Compare & extension structures | ~14 | 40 | 560 |
| **Total Part A + B** | **70** | | **~5,040 authored items** |

Phase the floors rather than authoring 5,040 before shipping anything: **Phase 1 floor 25/cell (~1,750
items)** makes every structure playable; raise T1 and T2 to full depth once real traffic shows which
cells are actually hot.

**Today: 2 addition/subtraction templates and 4 multiplication/division templates.**

## Review throughput is the constraint

LLM generation is not the bottleneck — `scripts/itemGen/` already batches. Human review is. At ~5,040
items for Parts A/B alone, at a sustained 100 reviewed items/hour, this is ~50 hours of review for the
operation modes and materially more across all 22.

Two mitigations worth deciding on:

1. **Tiered review.** Full human review for T1 and for the four Difficult structures (#3, #6, #13, #14),
   where an LLM most often silently rewrites a hard structure into an easy one. Spot-review at a fixed
   sample rate for T3.
2. **Automated pre-screening.** `validateDrafts.js` should reject before a human ever sees an item:
   wrong `structureType` for the prose, answer inconsistent with the stated numbers, prompt over 220
   chars, duplicate prompt signature, actor-name overuse within a cell. This is the highest-leverage
   engineering work in the whole bank effort.

---

# Reviewer decision points

1. **`numberLine` widget** — needed by both parts and the canonical model for Compare and Change
   Unknown. Build it, or restrict those structures to bar models? *Recommendation: build it; it unlocks
   ~10 varieties across both parts.*
2. **`areaGrid` widget** — needed for area-model multiplication (structures 12-14). Lower value than
   `numberLine`. Defer to Phase 3?
3. **Do `addition` and `subtraction` stay separate modes** given they share one taxonomy? Options:
   keep both as filtered views of Table 1 (recommended — familiar to kids), or merge into an
   "Add & Subtract" mode matching how the standards treat them.
4. **Structure 9 (`bothAddendsUnknown`) has multiple correct answers.** Needs either the `twoCorrect`
   answer mode or a "show one way" convention. Which?
5. **Level bands are 3 here; the older expansion plan proposes a 12-level G1-G4 ladder.** Reconcile
   before authoring, or the band tags will need rewriting.
6. **Remainder interpretation (#11)** is arithmetically identical to #10 but pedagogically distinct.
   Confirm it warrants separate cells.
