# Spec Part C1 — Number Sense Modes: Question Variety

Status: Draft for human review
Scope: `counting`, `skipCounting`, `placeValue`, `placeValueDiscs`, `numberBonds`, `comparing`
Companion to: `problem-variety-expansion-plan.md` (three axes), `research-k4-problem-types.md` (evidence),
`word-problem-authoring-guide.md` (style contract)

This is the authoring spec an LLM item-bank pipeline generates from. Every example below is a real,
ready-to-render question with real numbers.

---

## Sourcing model

**Items are static and individually authored. There is no templating.** Every bank item is one
hand-authored, human-reviewed question with its numbers baked in — the existing item format:

```
question: { a: 9, b: 7, answer: 16,
            display: { promptText: "Mina has 9 shells and finds 7 more. How many now?" } }
```

Parameterized templates (a single authored stem with slot-filled numbers) were **considered and
rejected**. Do not reintroduce them, and do not read any row below as licence to author one stem and
vary the numerals: an item with different numbers is a different item and needs its own review.

### Which varieties are `bank` and which are `generator`

| Row shape                                                                                      | Source                      |
| ---------------------------------------------------------------------------------------------- | --------------------------- |
| Family = `application`                                                                         | `bank` — authored, reviewed |
| Family = `conceptual` **and** the item carries prose / `verbalContext` / a written question stem | `bank` — authored, reviewed |
| Family = `conceptual`, purely symbolic or visual, no authored wording (e.g. `Compare: 3/8 ? 5/8`, a bare disc display) | `generator`                 |
| Family = `procedural` and symbolic (e.g. `27 + 45 = ?`)                                        | `generator` — no prose to review; curating these spends review budget on nothing |
| Format transform (true/false, odd-one-out, error analysis, estimation) that genuinely derives from a banked prose item | `generator (from bank item)` — inherits already-reviewed wording |

**A "format" label does not override the prose test.** Apply the three rules above to what the child
actually reads, then ask whether a transform has a prose parent:

- A symbolic or numeric transform built from numbers alone — `oddOneOutNotMultiple`
  (*"Which number would you NOT say counting by 3s? 12, 18, 22, 27"*), `trueFalseDecomposition`,
  `predictRegroupNeeded` — has no prose parent and is plain **`generator`**.
- A transform whose example carries a named character in a narrative situation — every
  `errorAnalysis*` row in this document — **is** authored prose a child reads, and is **`bank`**
  regardless of being a "format". It needs review like any other authored item.

`generator (from bank item)` therefore applies to **no row in these six modes**. The category is kept
because later modes may transform a banked word problem while reusing its exact wording; if nothing ever
does, drop it.

### Volume consequence

Static items do not amortise. One authored item is **one** item, so the old "≥8 per cell" floor is far
too low to avoid repeats. The engine makes this concrete: `SESSION_SIZE = 15` and
`RECENT_BANK_WINDOW = 8` mean a single adaptive session that homes in on one cell can exhaust a small
cell **within that one session** — the child sees a repeat before they ever leave the app.

The working floor used throughout this document is **40 authored items per `bank` variety**. That is a
floor, not a target; high-traffic cells will need more.

---

## Evidence calibration — read this before the tables

The research report's §8 is explicit:

> **[GAP] Kindergarten-specific counting/cardinality (K.CC) problem types.** Only the four K
> addition/subtraction subtypes are covered.
>
> **[GAP] Number-writing, place-value, and rounding problem type grids.** Only place-value-disc
> *question formats* (§3.4), sourced from a teacher blog, not a curriculum document.

There is **no retrieved problem-type taxonomy** for counting, place value, or rounding — no analogue of
CCSS Table 1. **The majority of this document is reasoned, not sourced.** Marking rule used throughout:


| Mark    | Means                                                                                                                                                                                                          |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[S]** | The *task itself* is named in CCSS standard text, or comes from a sourced section of the research report (§3.3 number bonds, §3.4 discs, §4.x format specs, §6 format taxonomy). The narrowest possible claim. |
| **[C]** | Constructed. Reasoned from pedagogy, analogy to Table 1, or a format transform. **No standards backing is claimed.**                                                                                           |


An [S] mark means "a standard names this kind of question." It does **not** mean a standards body
validated this as a distinct problem type, sequenced it, or ranked its difficulty. Those judgements are
ours in every row.

Where a row applies a *format* from §4/§6 (true/false, odd-one-out, error analysis, estimation,
extraneous info, multi-step, balance, Open Middle, Splat, WODB), the **format** is [S] but the
**subject-matter cell it is applied to** is [C]. Rows are marked by the weaker of the two, i.e. [C].

### Answer types

Reuse first. Existing: `numberPad`, `symbolSelect`, `placeValueDiscs`, `numberBond`, `fillBlank`,
default `choice`. Anything else is a **UI cost** and is flagged inline as `⚠ NEW`.


| New widget    | Needed by                                     | Rough cost                                                                                                        |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `numberLine`  | counting, skipCounting, comparing, placeValue | High — named in the plan §2 Axis 3 as a real gap. Single widget serves 4 of these 6 modes; highest ROI new build. |
| `multiSelect` | all 6 (two-correct-answers format)            | Low — variant of `choice` with N-of-M scoring.                                                                    |
| `imageChoice` | placeValueDiscs, counting                     | Medium — 4-panel picture grid; enables WODB and "which chart shows".                                              |
| `tapCount`    | counting                                      | Medium — child taps objects one at a time; instruments double-counting directly.                                  |
| `digitTiles`  | placeValue, comparing (Open Middle)           | Medium — drag digits into boxes + constraint checker.                                                             |
| `rangeInput`  | counting, comparing (estimation)              | Low — two number fields (too low / too high).                                                                     |


**Recommendation:** build `multiSelect` and `rangeInput` first (cheap, 6 modes), then `numberLine`.
Defer `digitTiles`, `imageChoice`, `tapCount` to a second pass.

### Difficulty by structure, not magnitude

The plan's central thesis. For these modes, the structural ladder is:

1. **Where the unknown sits.** Read a set → find the missing middle term → find the start.
2. **Canonical vs non-canonical form.** `84 = 8 tens 4 ones` vs `84 = 7 tens 14 ones`.
3. **Direction.** Forward count vs backward; symbol→model vs model→symbol.
4. **Decidability without computing.** `47 < 52` vs `4 tens 7 ones < 5 tens 2 ones` vs "is `29 + 1` more
  or less than `30`?"
5. **Whose answer is being judged.** Solve it → judge a claim → find someone's mistake.

Level bands used: **1-3** (K band), **4-6** (G1-2 band), **7-10** (G2+ band), matching `levelPolicy`.

---

## counting — Count It Up!

**Today:** 1 shape (count emoji, pick numeral), 1 word-problem template (`Count the 🍎 objects to find how many there are.`), 3 subskills (`subitizing`, `countOn`, `cardinality` — all three produce byte-identical
output; the subskill is written to metadata and never branches). Total item universe ≈ **50 × 8 emoji = 400
surface variants of 1 question**, and by prompt signature it is **1**.
**Target:** 14 varieties.

### Variety catalog


| #   | Variety ID                                            | Question form                                                    | Concrete example                                                                                              | Band | Representation / answerType  | Family      | Source    |
| --- | ----------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------- | ----------- | --------- |
| 1   | `countScatteredSet` **[S]** K.CC.5                    | Count an unordered set, give cardinality                         | 🐟🐟🐟🐟🐟🐟🐟 — *How many fish?* (7)                                                                         | 1-3  | visual / `choice`            | conceptual  | generator |
| 2   | `writeNumeralForSet` **[S]** K.CC.3                   | Set shown, type the numeral                                      | ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ — *Write the number.* (12)                                                                       | 1-3  | visual / `numberPad`         | procedural  | generator |
| 3   | `subitizeFlash` **[C]**                               | Small arranged set shown briefly, no counting time               | Die-pattern of 5 dots, 3s reveal — *How many dots?* (5)                                                       | 1-3  | visual / `choice`            | conceptual  | generator |
| 4   | `arrangementInvariance` **[S]** K.CC.4b–c             | Same count, two arrangements — is the count the same?            | 8 apples in a line and 8 apples in a circle. *Are there the same number in both groups?* (Yes)                | 1-3  | visual / `choice`            | conceptual  | generator |
| 5   | `countOnFromGiven` **[S]** K.CC.2                     | Start at n, count forward, name the end                          | *Start at 14 and count on 3 more. What number do you land on?* (17)                                           | 1-3  | verbalContext / `numberPad`  | procedural  | generator |
| 6   | `countBackFrom` **[C]**                               | Count backward from a given number                               | *Count back from 12: 12, 11, 10, ___. What comes next?* (9)                                                   | 1-3  | symbolic / `numberPad`       | procedural  | generator |
| 7   | `missingInCountSequence` **[C]**                      | Blank inside a consecutive run — unknown in a non-final position | *Fill the blank: 26, 27, ___, 29, 30.* (28)                                                                   | 4-6  | symbolic / `fillBlank`       | conceptual  | generator |
| 8   | `compareTwoSets` **[S]** K.CC.6                       | Two sets shown; which has more?                                  | Group A: 🍪🍪🍪🍪🍪🍪 · Group B: 🍪🍪🍪🍪. *Which group has more cookies?* (A)                                | 1-3  | visual / `choice`            | conceptual  | generator |
| 9   | `countToTargetGap` **[C]**                            | How many more to reach a target                                  | *There are 7 seats on the bus and 10 children. How many children have no seat?* (3)                           | 4-6  | verbalContext / `numberPad`  | application | bank      |
| 10  | `hiddenCountSplat` **[C]** (format §4.13 [S])         | Total known, some covered, find the hidden count                 | *There are 12 marbles in all. You can see 8. The rest are under the cup. How many are hidden?* (4)            | 4-6  | visual / `numberPad`         | conceptual  | bank |
| 11  | `estimateThenCount` **[C]** (format §4.12 [S])        | Give a too-low and a too-high bound before counting              | A jar of ~35 beads. *Give a number that is too low and a number that is too high.* (accept low<35<high)       | 4-6  | visual / `rangeInput` ⚠ NEW  | conceptual  | generator |
| 12  | `oddOneOutCount` **[C]** (format §4.6 [S])            | Four panels, one shows a different quantity                      | Panels: 6 dots · 6 stars · the numeral 6 · 7 hearts. *Which one does not belong?* (7 hearts)                  | 4-6  | visual / `imageChoice` ⚠ NEW | conceptual  | generator |
| 13  | `errorAnalysisDoubleCount` **[C]** (format §4.10 [S]) | A fictional child miscounts; find the mistake                    | *Nia counted 9 stickers but there are only 8. She pointed at one sticker twice. What is the real number?* (8) | 4-6  | verbalContext / `numberPad`  | conceptual  | bank |
| 14  | `countGroupsExtraneous` **[C]** (format §6 [S])       | Word problem with an unused quantity                             | *Theo has 6 red pens, 3 blue erasers, and 4 red pencils. How many red things does Theo have?* (10)            | 7-10 | verbalContext / `numberPad`  | application | bank      |


**Subskill fix required.** `subitizing`, `countOn`, `cardinality` are already declared and already
meaningless. Map them: subitizing → 3, 4, 12; countOn → 5, 6, 7, 9, 10; cardinality → 1, 2, 8, 13, 14.

### Misconceptions & distractors


| Tag                     | What the child does wrong                                                                          | Distractor generated                             | Example                               |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| `doubleCount`           | Counts one object twice while tracking a scattered set                                             | `answer + 1` (and `+2` for sets ≥ 12)            | True 8 → offer 9                      |
| `skipObject`            | Misses an object; more likely at the edge of a scatter                                             | `answer − 1`                                     | True 8 → offer 7                      |
| `lastNumberNotCardinal` | Recites the count correctly but names the *ordinal position* touched last, or restarts at 1        | `1`, or the count of a visually salient subgroup | 8 apples in 2 rows of 4 → offer `4`   |
| `countAllNotOn`         | On count-on items, recounts from 1 instead of starting at n, so answers the *change* not the total | `b` (the change) instead of `a + b`              | "Start at 14, count on 3" → offer `3` |
| `numeralReversal`       | Writes/selects the digit-reversed numeral                                                          | digit-swapped value when answer ≥ 10             | True 12 → offer 21                    |


Rule: on any item where two of these collide on the same number, drop the lower-priority tag so a wrong
answer stays diagnostic. Do not ship a distractor set where one wrong option is explainable two ways.

### Notes

- **Reviewer decision:** does `subitizeFlash` (#3) need a timed reveal? A timer changes the session model
(no re-look, no pause). If we won't build a timer, cut #3 and fold it into #1 with small arranged sets.
- **Reviewer decision:** #11 estimation has no single right answer. Confirm the engine tolerates
interval-scored items before authoring against it; otherwise cut to a 3-way `choice` ("about 10, about
35, or about 100?"), which is weaker but ships today.
- **Not standards-grounded:** #3, 6, 7, 9, 10, 11, 12, 13, 14 — 9 of 14. The only K.CC-anchored rows are
1, 2, 4, 5, 8. There is no source that says these 14 are the right 14, or that they are the *only* 14.
- Emoji sets must stay culturally neutral per the authoring guide; the current 8-emoji pool is fine but
`❤️` reads as decoration rather than a countable object for some children — consider dropping it.

**Authoring load:** 4 varieties are `bank` (#9, #10, #13, #14) → at ×40 items/variety ≈ **160 authored
items**; 10 varieties are `generator`.

---

## skipCounting — Skip Count!

**Today:** 1 shape (show 3 terms, ask the 4th), 1 word-problem template (`A pattern grows by 5. What comes next?` — which restates the answer's rule and is close to giving it away), 3 subskills (`patternRule`,
`stepInference`, `groupsToProduct` — none branch). Steps limited to 2, 5, 10, 3, 4 by level. Total item
universe ≈ **~90 distinct sequences**, 1 prompt signature.
**Target:** 13 varieties.

### Variety catalog


| #   | Variety ID                                         | Question form                                                                    | Concrete example                                                                                                       | Band | Representation / answerType | Family      | Source    |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------- | ----------- | --------- |
| 1   | `nextTermForward` **[S]** 2.NBT.2                  | Next term of a skip-count run                                                    | *5, 10, 15, ___* (20)                                                                                                  | 1-3  | symbolic / `choice`         | procedural  | generator |
| 2   | `nextTermBackward` **[C]**                         | Count backward by the step                                                       | *40, 30, 20, ___* (10)                                                                                                 | 4-6  | symbolic / `fillBlank`      | procedural  | generator |
| 3   | `missingMiddleTerm` **[C]**                        | Unknown in a non-final position                                                  | *12, ___, 20, 24* (16)                                                                                                 | 4-6  | symbolic / `fillBlank`      | conceptual  | generator |
| 4   | `missingStartTerm` **[C]**                         | Unknown at the start — the hardest position, by analogy to Table 1 Start Unknown | *___, 18, 24, 30* (12)                                                                                                 | 7-10 | symbolic / `fillBlank`      | conceptual  | generator |
| 5   | `offMultipleStart` **[C]**                         | Same step, but the run does not start on a multiple                              | *7, 10, 13, ___* (16)                                                                                                  | 7-10 | symbolic / `fillBlank`      | conceptual  | generator |
| 6   | `identifyRule` **[C]**                             | Given the run, name the step                                                     | *What is the rule? 6, 12, 18, 24* (add 6)                                                                              | 4-6  | symbolic / `choice`         | conceptual  | generator |
| 7   | `membershipTrueFalse` **[C]** (format §4.9 [S])    | Is this number in the count? — decidable without extending                       | *If you count by 5s from 0, will you say 43? True or false.* (False)                                                   | 4-6  | symbolic / `choice`         | conceptual  | generator |
| 8   | `groupsToTotal` **[C]**                            | Equal groups counted by the group size                                           | *Each hand has 5 fingers. Ava counts the fingers on 4 hands. What number does she say last?* (20)                      | 4-6  | verbalContext / `numberPad` | application | bank      |
| 9   | `predictLastCount` **[C]** (routine §4.4 [S])      | Predict the final term before counting                                           | *A class of 9 children counts by 4s, one number each, starting at 4. What number does the last child say?* (36)        | 7-10 | verbalContext / `numberPad` | application | bank      |
| 10  | `oddOneOutNotMultiple` **[C]** (format §4.6 [S])   | Which one is not in the count?                                                   | *Which number would you NOT say counting by 3s? 12, 18, 22, 27* (22)                                                   | 4-6  | symbolic / `choice`         | conceptual  | generator |
| 11  | `errorAnalysisSkipSlip` **[C]** (format §4.10 [S]) | Find the break in someone's count                                                | *Luca counted by 4s: 4, 8, 12, 15, 20. Which number is wrong?* (15)                                                    | 4-6  | symbolic / `choice`         | conceptual  | bank |
| 12  | `choralCountColumn` **[C]** (routine §4.5 [S])     | Count laid out in a grid; read down a column                                     | Counting by 3s in rows of 5: `3 6 9 12 15 / 18 21 24 27 30 / 33 36 39 42 45`. *What number is directly below 27?* (42) | 7-10 | visual / `numberPad`        | conceptual  | generator |
| 13  | `numberLineJumps` **[C]**                          | Show equal jumps on a line; name the landing point or the step                   | Number line 0–50 with 4 equal jumps landing on 40 starting from 0. *How big is each jump?* (10)                        | 4-6  | visual / `numberLine` ⚠ NEW | conceptual  | generator |


**Structural ladder here is #1 → #3 → #4 → #5**, none of which change the numbers' size. That is the
plan's thesis made concrete for this mode.

### Misconceptions & distractors


| Tag                    | What the child does wrong                                                                    | Distractor generated                           | Example                                     |
| ---------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `wrongStep`            | Applies the wrong step — usually confusing 3s with 2s, or 4s with 5s                         | `prev + (step ± 1)`                            | Counting by 4s, 12, 16 → offer 21 (used +5) |
| `patternReset`         | Continues the *digit* pattern rather than the value (e.g. after 30 counting by 10s, says 31) | ones-digit-incremented value                   | 10, 20, 30 → offer 31                       |
| `countsTermsNotValues` | Answers with the term's *position* rather than its value                                     | index of the missing term                      | *___, 18, 24, 30* → offer 1                 |
| `offMultipleReset`     | On an off-multiple run (#5), snaps back to the nearest multiple of the step                  | nearest multiple of step to the correct answer | 7, 10, 13 → offer 15                        |
| `directionIgnored`     | On a backward run, still adds                                                                | `prev + step` instead of `prev − step`         | 40, 30, 20 → offer 30                       |


`countsTermsNotValues` and `offMultipleReset` are new tags; the existing `offByOne` is not diagnostic
(it fires on almost every mode) and should be **retired for this mode** in favour of these.

### Notes

- **Reviewer decision:** the current step ladder puts 3s at level 7 and 4s at level 9, i.e. harder *steps*
are the only progression. If we adopt structural difficulty, steps and structures become two axes and
the level table must be rewritten. Confirm we want 5s/10s at level 8 with a Start-Unknown structure.
- **Reviewer decision:** #12 requires rendering a grid of numbers, which is not a current display shape.
Cheap as a `<table>` but needs a renderer branch. Keep or cut?
- **Not standards-grounded:** 12 of 13. Only #1 sits on standard text (2.NBT.2 names skip-counting by 5s,
10s, 100s — note it does **not** name 3s or 4s, which the mode already uses).
- The existing application prompt (`A pattern grows by 5. What comes next?`) should be **deleted**, not
extended — it states the rule the item is meant to test.

**Authoring load:** 3 varieties are `bank` (#8, #9, #11) → at ×40 items/variety ≈ **120 authored
items**; 10 varieties are `generator`.

---

## placeValue — Place Value!

**Today:** 4 shapes (`tens_in`, `ones_in`, `build`, `expanded`), 0 true word-problem templates (all four
are symbolic stems), 3 subskills — but subskill is *derived from* the shape, so it carries no extra
information. Total item universe ≈ **~990 numbers × 4 shapes**, 4 prompt signatures.
**Target:** 14 varieties.

### Variety catalog


| #   | Variety ID                                               | Question form                                               | Concrete example                                                                                       | Band | Representation / answerType       | Family      | Source    |
| --- | -------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---- | --------------------------------- | ----------- | --------- |
| 1   | `digitsInPlace` **[S]** 1.NBT.2                          | How many tens/hundreds                                      | *How many tens are in 47?* (4)                                                                         | 1-3  | symbolic / `numberPad`            | procedural  | generator |
| 2   | `valueOfDigit` **[S]** 2.NBT.1                           | What is a named digit *worth*                               | *In 472, what is the value of the 7?* (70)                                                             | 4-6  | symbolic / `choice`               | conceptual  | generator |
| 3   | `buildFromUnits` **[S]** 1.NBT.2                         | Assemble from a stated decomposition                        | *5 tens and 3 ones = ___* (53)                                                                         | 1-3  | symbolic / `numberPad`            | procedural  | generator |
| 4   | `standardToExpanded` **[S]** 2.NBT.3                     | Write in expanded form                                      | *Write 306 in expanded form.* (300 + 6)                                                                | 4-6  | symbolic / `choice`               | procedural  | generator |
| 5   | `expandedToStandard` **[S]** 2.NBT.3                     | Reverse direction                                           | *400 + 20 + 9 = ___* (429)                                                                             | 4-6  | symbolic / `numberPad`            | procedural  | generator |
| 6   | `wordFormToStandard` **[S]** 2.NBT.3                     | Number name → numeral                                       | *Write the number: three hundred fifteen.* (315)                                                       | 4-6  | verbalContext / `numberPad`       | procedural  | generator |
| 7   | `nonCanonicalRename` **[C]** (§3.4 [S] as a disc format) | Rename with an over-filled place — the regrouping precursor | *84 is 8 tens and 4 ones. It is also 7 tens and ___ ones.* (14)                                        | 7-10 | symbolic / `numberPad`            | conceptual  | generator |
| 8   | `tenMoreTenLess` **[S]** 1.NBT.5                         | 10 more / 10 less, mentally                                 | *What is 10 less than 63?* (53)                                                                        | 4-6  | symbolic / `numberPad`            | procedural  | generator |
| 9   | `crossingBoundary` **[C]**                               | 10 more where the hundreds digit changes                    | *What is 10 more than 195?* (205)                                                                      | 7-10 | symbolic / `numberPad`            | procedural  | generator |
| 10  | `trueFalseDecomposition` **[C]** (format §4.9 [S])       | Judge a decomposition without computing                     | *True or false: 4 tens and 12 ones is the same as 52.* (True)                                          | 7-10 | symbolic / `choice`               | conceptual  | generator |
| 11  | `oddOneOutSameValue` **[C]** (format §4.6 [S])           | Three forms of one number plus an impostor                  | *Which one is NOT 250? 200 + 50 · 2 hundreds 5 tens · 25 tens · 2 hundreds 5 ones* (2 hundreds 5 ones) | 7-10 | symbolic / `choice`               | conceptual  | generator |
| 12  | `errorAnalysisDigitReversal` **[C]** (format §4.10 [S])  | Diagnose a place-value slip                                 | *Mina wrote "sixty-two" as 26. What did Mina mix up, and what is the correct number?* (62)             | 4-6  | verbalContext / `numberPad`       | conceptual  | bank |
| 13  | `openMiddleBuildNumber` **[C]** (format §4.8 [S])        | Digit-constrained construction with an optimize objective   | *Using the digits 3, 5, and 8 once each, make the largest possible three-digit number.* (853)          | 7-10 | manipulative / `digitTiles` ⚠ NEW | conceptual  | generator |
| 14  | `placeValueInContext` **[C]**                            | Decomposition inside a story                                | *Sam packs pencils in boxes of 10. He has 74 pencils. How many full boxes can he pack?* (7)            | 7-10 | verbalContext / `numberPad`       | application | bank      |


**#7 is the single highest-value addition to this mode.** Non-canonical renaming is what makes borrowing
comprehensible, it is absent from the mode today, and it raises difficulty without raising magnitude.

### Misconceptions & distractors


| Tag             | What the child does wrong                                                  | Distractor generated                    | Example                              |
| --------------- | -------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------ |
| `digitReversal` | Reads/writes the digits in the wrong order                                 | digit-swapped value                     | *5 tens 3 ones* → offer 35           |
| `digitNotValue` | Names the digit instead of its value                                       | the bare digit where the value is asked | *value of 7 in 472* → offer 7        |
| `onesAsTens`    | Reports the ones count when tens are asked (or vice versa)                 | the other place's digit                 | *How many tens in 47?* → offer 7     |
| `zeroDropped`   | Omits a zero place when writing from words or expanded form                | value with the zero place collapsed     | *three hundred six* → offer 36       |
| `canonicalOnly` | Insists each place holds a single digit, so rejects or mis-solves renaming | on #7/#10, the canonical digit          | *84 = 7 tens and ___ ones* → offer 4 |
| `concatenation` | Glues the stated units together as text                                    | digits concatenated                     | *4 tens and 12 ones* → offer 412     |


`canonicalOnly` and `concatenation` are new and are the two that make #7 and #10 worth shipping — without
them those items have no diagnostic distractor.

### Notes

- **Reviewer decision:** #4 `standardToExpanded` has an ambiguous answer surface (`300 + 6` vs
`300 + 0 + 6` vs `3 hundreds 6 ones`). Either pin one canonical string and use `choice`, or accept a set.
Recommend `choice` — a free-text expanded form is not worth the parser.
- **Reviewer decision:** does `placeValue` own #7 (renaming) or does `placeValueDiscs`? They overlap
heavily. Recommend: **discs owns the manipulative version, placeValue owns the symbolic version**, and
the pipeline authors both so the child meets the same idea in two representations (CPA discipline).
- **Not standards-grounded:** 7, 9, 10, 11, 12, 13, 14 — 7 of 14. The [S] rows here are the strongest set
in this document because 1.NBT.2 / 2.NBT.1 / 2.NBT.3 name these tasks almost verbatim. But note again:
**no source ranks them or says these are the right structures.**
- **Rounding is deliberately absent.** §8 records no rounding problem-type grid. Do not add rounding
varieties to this mode until that research is done.

**Authoring load:** 2 varieties are `bank` (#12, #14) → at ×40 items/variety ≈ **80 authored items**;
12 varieties are `generator`.

---

## placeValueDiscs — Place Value Discs!

**Today:** 1 shape (read the discs, type the number) plus a `regroupSense` variant that only over-fills
the ones column but still asks the same question, 1 word-problem template, 2 subskills (below the
project's own ≥3 minimum). Total item universe ≈ **large numerically, 3 prompt signatures**.
**Target:** 12 varieties.

Every row below is **[C]** except where a format is cited. §3.4's disc *question formats* come from a
teacher blog (SIS4Teachers / TeachableMath), not a curriculum document — the research report says so
explicitly. Rows drawn from that list are marked **[C·b]** ("constructed, blog-attested") so a reviewer
can see the difference between "we invented this" and "a practitioner source describes this."

### Variety catalog


| #   | Variety ID                                         | Question form                                        | Concrete example                                                                                                             | Band | Representation / answerType      | Family      | Source    |
| --- | -------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------- | ----------- | --------- |
| 1   | `readDiscs` **[C·b]**                              | Read the number the chart shows                      | Chart: 2 hundreds-discs, 4 tens-discs, 6 ones-discs. *What number do these discs show?* (246)                                | 1-3  | manipulative / `placeValueDiscs` | procedural  | generator |
| 2   | `buildWithDiscs` **[C·b]**                         | Drag discs to make a stated number                   | *Drag discs onto the chart to make 305.* (3 hundreds, 0 tens, 5 ones)                                                        | 1-3  | manipulative / `placeValueDiscs` | procedural  | generator |
| 3   | `whichChartShows` **[C·b]**                        | Four charts, pick the matching one                   | *Which chart shows 405?* — panels: 4H 0T 5O · 4H 5T 0O · 4H 5O(no tens col) · 40H 5O                                         | 4-6  | visual / `imageChoice` ⚠ NEW     | conceptual  | generator |
| 4   | `missingDiscCount` **[C]**                         | Chart with one column's count hidden                 | *The chart shows 2 hundreds, ___ tens, and 3 ones. The number is 253. How many tens?* (5)                                    | 4-6  | manipulative / `numberPad`       | conceptual  | generator |
| 5   | `regroupOnesToTens` **[C·b]**                      | Over-filled ones column; perform the trade           | Chart shows 1 ten and 14 ones. *Trade 10 ones for 1 ten. What does the chart show now?* (2 tens 4 ones = 24)                 | 4-6  | manipulative / `placeValueDiscs` | conceptual  | generator |
| 6   | `renameNonCanonical` **[C·b]**                     | Rename to a non-standard split                       | *Show 84 as 7 tens and some ones. How many ones?* (14)                                                                       | 7-10 | manipulative / `numberPad`       | conceptual  | generator |
| 7   | `tradeDownForSubtraction` **[C·b]**                | Break a larger disc to make a subtraction possible   | *You have 3 hundreds and need to take away 8 ones. Trade down. How many ones will the chart show?* (10)                      | 7-10 | manipulative / `numberPad`       | conceptual  | generator |
| 8   | `predictRegroupNeeded` **[C·b]** (format §4.9 [S]) | Decide *whether* a trade is needed, before computing | *For 45 + 38, will you need to trade ones for a ten? Yes or no.* (Yes)                                                       | 4-6  | symbolic / `choice`              | conceptual  | generator |
| 9   | `midComputationNext` **[C·b]**                     | Show a chart mid-calculation; name the next action   | Chart mid-add shows 15 discs in the ones column. *What must you do next?* (Trade 10 ones for 1 ten)                          | 7-10 | visual / `choice`                | conceptual  | generator |
| 10  | `errorAnalysisNoTrade` **[C]** (format §4.10 [S])  | A worked disc solution that skipped a trade          | *Theo added 26 + 17 with discs and got 313, because he wrote 3 tens and 13 ones side by side. What is the real answer?* (43) | 7-10 | verbalContext / `numberPad`      | conceptual  | bank |
| 11  | `discsForEqualGroups` **[C·b]**                    | Repeat a disc set, then trade                        | *Lay out 2 tens and 4 ones four times. Trade the ones. What number is it?* (96)                                              | 7-10 | manipulative / `numberPad`       | procedural  | generator |
| 12  | `dealDiscsDivision` **[C·b]**                      | Deal discs into boxes; report per-box and leftover   | *Deal 7 tens and 2 ones into 3 equal boxes, trading when needed. How many in each box?* (24)                                 | 7-10 | manipulative / `numberPad`       | application | bank      |


### Misconceptions & distractors


| Tag                   | What the child does wrong                                                             | Distractor generated                            | Example                     |
| --------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------- |
| `discCountAsDigit`    | Counts *discs* rather than reading place value — treats 14 ones as the digit sequence | concatenated reading                            | 1 ten + 14 ones → offer 114 |
| `regroupMiss`         | Reads an over-filled column without trading                                           | canonical-digit misread of an over-filled chart | 3 tens 13 ones → offer 313  |
| `placeValueSlip`      | Reads a column into the wrong place                                                   | value with two place counts swapped             | 2H 4T 6O → offer 264        |
| `zeroColumnSkipped`   | Ignores an empty column and shifts everything right                                   | value with the zero place removed               | 4H 0T 5O → offer 45         |
| `tradeWrongDirection` | Trades 1 ten for 1 one (or 10 tens for 10 ones) — knows a trade happens, not the rate | result of a 1:1 trade                           | 1T 14O traded → offer 15    |


`tradeWrongDirection` is the diagnostically richest tag in this mode and is not currently implemented
anywhere in the codebase.

### Notes

- **Reviewer decision, blocking:** the current `placeValueDiscs` answer type is *read-only* — the child
types a number. Varieties 2, 5, and 7 require the child to **manipulate** discs (drag on, drag off,
trade). That is a genuine widget upgrade, not wiring. If we won't build it, cut 2/5/7 and this mode
drops to 9 varieties, most of which are "read the chart" restated.
- **Reviewer decision:** #12 division-by-dealing may be beyond this mode's scope and belongs in `division`
once that mode has a structure engine. Flagged for possible relocation.
- **Not standards-grounded:** all 12. Nine are blog-attested [C·b]; three (4, 10, plus the level
assignments of everything) are ours entirely. The mode's `standardRefs: ["1.NBT","2.NBT","4.NBT"]`
claim in code is broader than anything we can defend and should be narrowed.
- The mode has 2 subskills against a documented ≥3 minimum. Proposed: `readNumber` (1–4),
`tradeRegroup` (5–9), `discOperations` (10–12).

**Authoring load:** 2 varieties are `bank` (#10, #12) → at ×40 items/variety ≈ **80 authored items**;
10 varieties are `generator`.

---

## numberBonds — Number Bonds!

**Today:** 1 shape (whole + one part given, find the other part), 1 word-problem template (`A team of 8 splits into two groups. One group has 3. How many in the other?`), 3 subskills (`partWhole`, `missingPart`,
`decompose`) that the plan itself flags as producing identical output. Total item universe ≈ **~4,800
(whole, part) pairs, 2 prompt signatures**.
**Target:** 13 varieties.

§3.3 is one of the better-sourced sections in the research and it states the design principle directly:
**"Which node is blank should be a first-class generator parameter."** Rows 1–3 follow from that.

### Variety catalog


| #   | Variety ID                                              | Question form                                            | Concrete example                                                                                                 | Band | Representation / answerType         | Family      | Source    |
| --- | ------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------- | ----------- | --------- |
| 1   | `wholeUnknown` **[S]** K.OA.3 / §3.3                    | Both parts given, find the whole                         | Bond: parts 5 and 2, whole blank. *What is the whole?* (7)                                                       | 1-3  | visual / `numberBond`               | conceptual  | generator |
| 2   | `partUnknown` **[S]** 1.OA.4 / §3.3                     | Whole and one part given — subtraction as missing addend | Bond: whole 7, one part 4. *What is the other part?* (3)                                                         | 1-3  | visual / `numberBond`               | conceptual  | generator |
| 3   | `openDecomposition` **[S]** K.OA.3 / §3.3               | Both parts unknown; multiple correct answers             | *Show three different ways to make 8 with two parts.* (e.g. 1+7, 2+6, 3+5 — any 3 valid pairs)                   | 4-6  | visual / `numberBond` (multi-entry) | conceptual  | generator |
| 4   | `factFamily` **[C]** (§3.3 lists the format)            | One bond → four number sentences                         | Bond (4, 3, 7). *Write the two subtraction sentences this bond makes.* (7−4=3, 7−3=4)                            | 4-6  | symbolic / `multiSelect` ⚠ NEW      | conceptual  | generator |
| 5   | `threePartBond` **[S]** 1.OA.2 (three addends) / §3.3   | Whole splits into three parts                            | Bond: whole 10, parts 5, 3, and blank. *What is the third part?* (2)                                             | 4-6  | visual / `numberBond`               | conceptual  | generator |
| 6   | `makeTenBond` **[C]** (§3.3 [S] as a MiF format)        | Split one addend to bridge ten                           | *To add 7 + 6, split the 6 into 3 and ___ so you can make 10 first.* (3)                                         | 4-6  | visual / `numberBond`               | conceptual  | generator |
| 7   | `placeValueBond` **[C]** (§3.3 lists the format)        | Decompose a number by place                              | *Split 562 into hundreds, tens, and ones. Bond: 500, ___, 2.* (60)                                               | 7-10 | visual / `numberBond`               | conceptual  | generator |
| 8   | `largeMagnitudeBond` **[C]** (§3.3 lists the format)    | Bonds to 100 or 1000                                     | Bond: whole 100, one part 40. *What is the other part?* (60)                                                     | 7-10 | visual / `numberBond`               | procedural  | generator |
| 9   | `nonCanonicalPlaceBond` **[C]**                         | Place-value bond with an over-filled part                | *Split 84 into 70 and ___.* (14)                                                                                 | 7-10 | visual / `numberBond`               | conceptual  | generator |
| 10  | `trueFalseBond` **[C]** (format §4.9 [S])               | Judge a claimed bond                                     | *True or false: a whole of 12 can split into parts 5 and 8.* (False)                                             | 4-6  | symbolic / `choice`                 | conceptual  | generator |
| 11  | `errorAnalysisPartWholeSwap` **[C]** (format §4.10 [S]) | Fictional child treats a part as the whole               | *Ava saw a bond with whole 9 and part 6 and answered 15. What did Ava do wrong, and what is the other part?* (3) | 4-6  | verbalContext / `numberPad`         | conceptual  | bank |
| 12  | `bondFromStory` **[C]**                                 | Story → bond, unknown in a varying node                  | *Nia picked 15 plums. 9 were purple and the rest were green. How many were green?* (6)                           | 4-6  | verbalContext / `numberBond`        | application | bank      |
| 13  | `oddOneOutBond` **[C]** (format §4.6 [S])               | Which pair does not bond to the whole?                   | *Which pair does NOT make 10? 6 and 4 · 7 and 3 · 8 and 3 · 9 and 1* (8 and 3)                                   | 4-6  | symbolic / `choice`                 | conceptual  | generator |


### Misconceptions & distractors


| Tag               | What the child does wrong                                            | Distractor generated                   | Example                     |
| ----------------- | -------------------------------------------------------------------- | -------------------------------------- | --------------------------- |
| `partWholeSwap`   | Adds when the whole is given, treating the whole as a part           | `whole + part`                         | whole 9, part 6 → offer 15  |
| `wholeAsPart`     | Answers with the whole itself                                        | `whole`                                | whole 9, part 6 → offer 9   |
| `partEchoed`      | Answers with the given part (mirrors it into the blank node)         | `part`                                 | whole 9, part 6 → offer 6   |
| `countAllError`   | Recounts from 1 across both parts and lands one off                  | `answer ± 1`                           | true 3 → offer 2 or 4       |
| `bridgeOvershoot` | On make-ten items, splits to reach the *sum* rather than to reach 10 | the complement to the total, not to 10 | 7 + 6, split 6 → offer 6    |
| `placeDigitBond`  | On place-value bonds, splits by *digit* rather than by value         | digit instead of value                 | 562 → offer 6 instead of 60 |


`partEchoed` matters most at levels 1–3: a child who has learned "type a number that's on the screen"
scores above chance without any part-whole understanding, and only this distractor catches it.

### Notes

- **Reviewer decision, blocking:** #3 `openDecomposition` needs a **set-validating checker**, which §3.3
calls out explicitly ("multiple correct answers — needs a set-validating checker, not a single-value
check"). Today the engine compares against a single `answer`. Either build set validation or cut #3 —
and cutting it removes the only variety in this mode with more than one right answer.
- **Reviewer decision:** #4 fact families need multi-select. Confirm before authoring.
- **Reviewer decision:** the three existing subskills should be re-cut against node position, which is the
real variable: `wholeUnknown` (1), `partUnknown` (2, 8, 9, 12), `openBond` (3, 4, 5, 6), plus formats
(10, 11, 13) distributed across all three. Confirm the subskill names before the pipeline runs, because
re-tagging is the expensive part.
- **Not standards-grounded:** 6, 7, 8, 9, 10, 11, 12, 13 — 8 of 13. Rows 1–3 and 5 rest on actual standard
text (K.OA.3 names decomposing into pairs in more than one way; 1.OA.4 names subtraction as an
unknown-addend problem). The *bond diagram itself* is a Math in Focus / Eureka convention, not a
standard, and the difficulty ordering is ours.

**Authoring load:** 2 varieties are `bank` (#11, #12) → at ×40 items/variety ≈ **80 authored items**;
11 varieties are `generator`.

---

## comparing — Compare Quest!

**Today:** 1 shape (two numerals, pick `<`, `>`, or `=`), 1 word-problem template (`Choose the symbol: 8 ? 5` — which is the symbolic item with a sentence in front of it, not a word problem), 3 subskills
(`symbolSelection`, `benchmarkCompare`, `distanceCompare` — only the first is ever realised). Total item
universe ≈ **large numerically, 1 prompt signature**.
**Target:** 14 varieties.

### Variety catalog


| #   | Variety ID                                                      | Question form                                               | Concrete example                                                                                                      | Band | Representation / answerType       | Family      | Source    |
| --- | --------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------- | ----------- | --------- |
| 1   | `symbolBetweenNumerals` **[S]** 1.NBT.3 / 2.NBT.4               | Pick the comparison symbol                                  | *Choose the symbol: 47 ___ 52* (<)                                                                                    | 1-3  | symbolic / `symbolSelect`         | procedural  | generator |
| 2   | `compareObjectSets` **[S]** K.CC.6                              | Which group has more?                                       | 🍎🍎🍎🍎🍎🍎 vs 🍎🍎🍎🍎. *Which basket has more apples?* (the first)                                                 | 1-3  | visual / `choice`                 | conceptual  | generator |
| 3   | `compareExpressions` **[C]** (format §6 [S])                    | Compare two expressions, not two numerals                   | *Choose the symbol: 6 + 7 ___ 8 + 5* (=)                                                                              | 7-10 | symbolic / `symbolSelect`         | conceptual  | generator |
| 4   | `compareByPlaceValue` **[C]**                                   | Compare stated decompositions rather than numerals          | *Choose the symbol: 3 tens 8 ones ___ 4 tens 1 one* (<)                                                               | 4-6  | symbolic / `symbolSelect`         | conceptual  | generator |
| 5   | `orderThreeNumbers` **[C]**                                     | Order a set, not a pair                                     | *Put these in order from smallest to largest: 208, 82, 280.* (82, 208, 280)                                           | 4-6  | symbolic / `choice`               | procedural  | generator |
| 6   | `benchmarkCompare` **[C]**                                      | Compare against a landmark without computing                | *Is 47 closer to 40 or to 50?* (50)                                                                                   | 4-6  | symbolic / `choice`               | conceptual  | generator |
| 7   | `trueFalseInequality` **[C]** (format §4.9 [S])                 | Judge a stated comparison                                   | *True or false: 9 = 9.* (True)                                                                                        | 4-6  | symbolic / `choice`               | conceptual  | generator |
| 8   | `relationalNoCompute` **[C]** (format §4.9 [S])                 | Numbers deliberately awkward so computing is the wrong move | *Choose the symbol without adding: 37 + 48 ___ 38 + 47* (=)                                                           | 7-10 | symbolic / `symbolSelect`         | conceptual  | generator |
| 9   | `differenceUnknown` **[S]** Table 1 Compare/Difference          | How many more?                                              | *Luca has 12 shells and Mina has 7 shells. How many more shells does Luca have?* (5)                                  | 4-6  | verbalContext / `numberPad`       | application | bank      |
| 10  | `compareLanguageTrap` **[S]** Table 1 Compare/Smaller w/ "more" | Wording says "more" but the operation is subtraction        | *Ava has 4 more books than Theo. Ava has 11 books. How many books does Theo have?* (7)                                | 7-10 | verbalContext / `numberPad`       | application | bank      |
| 11  | `whatCouldItBe` **[C]** (format §4.8 [S])                       | Constraint satisfaction with a range of answers             | *Name a number that is greater than 45 and less than 50.* (46, 47, 48, or 49)                                         | 4-6  | symbolic / `numberPad`            | conceptual  | generator |
| 12  | `openMiddleMakeItTrue` **[C]** (format §4.8 [S])                | Digit placement under a constraint                          | *Using the digits 2, 5, 7, and 9 once each, fill the boxes to make it true: ▢▢ < ▢▢. Give one answer.* (e.g. 25 < 79) | 7-10 | manipulative / `digitTiles` ⚠ NEW | conceptual  | generator |
| 13  | `errorAnalysisSymbolFlip` **[C]** (format §4.10 [S])            | Diagnose a reversed symbol                                  | *Sam wrote 8 > 13 and said the open side always points right. What symbol should Sam have used?* (<)                  | 4-6  | verbalContext / `symbolSelect`    | conceptual  | bank |
| 14  | `wouldYouRather` **[C]** (format §4.14 [S])                     | Two close options; choose and the comparison is the work    | *Would you rather have 4 bags of 10 marbles or 3 bags of 14 marbles?* (3 bags of 14 — 42 vs 40)                       | 7-10 | verbalContext / `choice`          | application | bank      |


**#8 is the most important row in this mode.** A child who computes both sides of `37 + 48 ___ 38 + 47`
has missed the point; the item is decidable by compensation alone. This is the single best-documented
misconception in elementary math (§4.9) and the mode currently cannot express it.

### Misconceptions & distractors


| Tag                   | What the child does wrong                                                         | Distractor generated                               | Example                                       |
| --------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| `symbolFlip`          | Correct comparison, wrong symbol — reverses `<` and `>`                           | the opposite symbol                                | 47 < 52 → offer `>`                           |
| `equalSignMisread`    | Reads `=` as "here comes the answer", so rejects `9 = 9` and `6+7 = 8+5` as false | `false` on any true relational item                | #7, #8 → offer False                          |
| `moreDigitsMoreValue` | Compares by digit count or by leading digit only                                  | the number with more digits / bigger leading digit | 82 vs 208 → picks 82 when leading digit 8 > 2 |
| `keywordMore`         | Sees "more" and adds regardless of structure                                      | `a + b` on #10                                     | *4 more than Theo, Ava has 11* → offer 15     |
| `compareLeftmostOnly` | On equal-length numbers, stops after the first digit                              | wrong when the first digits tie                    | 348 vs 341 → coin-flips                       |
| `differenceAsLarger`  | On "how many more", answers with the larger quantity                              | `max(a, b)`                                        | 12 and 7 → offer 12                           |


`equalSignMisread` already exists as a tag in the code but has **no strategy behind it** because the mode
never generates an item where it could fire. Rows 3, 7, and 8 make the tag real.

### Notes

- **Reviewer decision:** the current 20% forced-equal rate produces `=` far more often than it appears in
any real comparison set, and combined with `symbolSelect`'s 3 options a guesser scores 33%. Recommend
dropping to ~12% and adding #7/#8 so `=` items carry conceptual weight rather than being frequency
padding.
- **Reviewer decision:** #11 and #12 have multiple correct answers — same set-validation dependency as
`numberBonds` #3. If we build the checker once, it unlocks 3 varieties across 2 modes; that is probably
the cheapest way to buy open-ended items in this whole spec.
- **Reviewer decision:** #9 and #10 arguably belong in `subtraction` once the additive structure engine
lands (Phase 1), since they are Table 1 Compare cells. Keeping them here duplicates content. Recommend
`**comparing` owns the symbol/relational items (1–8, 11–14) and hands 9–10 to the structure engine**,
but this is a scoping call, not a technical one.
- **Not standards-grounded:** 3, 4, 5, 6, 7, 8, 11, 12, 13, 14 — 10 of 14. Rows 1, 2, 9, 10 are the only
ones with standard or Table 1 backing. Note that #10's difficulty claim ("the language trap is harder")
*is* sourced — the Progressions footnote says one phrasing "directs the correct operation" and "the
other versions are more difficult." That is the one difficulty ordering in this entire document that is
not ours.

**Authoring load:** 4 varieties are `bank` (#9, #10, #13, #14) → at ×40 items/variety ≈ **160 authored
items**; 10 varieties are `generator`.

---

## Cross-mode summary


| Mode              | Today (shapes) | Today (WP templates) | Target varieties | [S]-marked   | [C]-marked           | New widgets needed                           |
| ----------------- | -------------- | -------------------- | ---------------- | ------------ | -------------------- | -------------------------------------------- |
| `counting`        | 1              | 1                    | 14               | 5            | 9                    | `rangeInput`, `imageChoice`                  |
| `skipCounting`    | 1              | 1                    | 13               | 1            | 12                   | `numberLine`                                 |
| `placeValue`      | 4              | 0                    | 14               | 7            | 7                    | `digitTiles`                                 |
| `placeValueDiscs` | 1 (+1 variant) | 1                    | 12               | 0            | 12 (9 blog-attested) | disc **manipulation** upgrade, `imageChoice` |
| `numberBonds`     | 1              | 1                    | 13               | 4            | 9                    | `multiSelect`, set-validating checker        |
| `comparing`       | 1              | 1                    | 14               | 4            | 10                   | `digitTiles`, set-validating checker         |
| **Total**         | **~10**        | **5**                | **80**           | **21 (26%)** | **59 (74%)**         |                                              |


**Three-quarters of this spec is reasoned, not sourced.** That is the honest number and it should be
visible to anyone approving these items. It is not a reason not to build them — the reasoning is
principled and the formats it applies are well documented — but no one should describe this catalog as
standards-aligned.

### Shared build dependencies, in priority order

1. **Set-validating checker** — unlocks `numberBonds` #3, `comparing` #11, #12. Cheapest open-ended win.
2. `**multiSelect` + `rangeInput`** — low cost, used across all six modes.
3. `**numberLine**` — named in the plan as a real gap; serves 4 of these 6 modes plus fractions later.
4. **Disc manipulation** — blocking for 3 of `placeValueDiscs`' 12 varieties, which are the 3 that make
  that mode more than a reading exercise.
5. `**digitTiles` / `imageChoice` / `tapCount`** — defer.

### What the pipeline must be told, beyond this table

- **Style contract is non-negotiable:** ≤220 chars, 1–2 sentences, concrete nouns, rotating names from
{Sam, Mina, Luca, Nia, Theo, Ava}, no idioms, no unused numbers except in `countGroupsExtraneous`
(#14 in counting), where the extra number is the point.
- **The validator must check that a draft matches its claimed variety**, not just its numbers. The plan
warns that the likeliest failure is a model quietly rewriting a hard structure into an easy one — here
that means `missingStartTerm` coming back as `nextTermForward`, or `compareLanguageTrap` coming back as
a plain Difference Unknown. Both are easy to detect from the rendered prompt; write the check.
- **Every generated item must carry its `varietyId`** so the `findPromptOveruse` gate in Phase 0 can be
pointed at variety distribution, not just prompt text.

---

## Authoring load summary

At the working floor of **40 authored items per `bank` variety**.

| Mode              | Bank varieties | Generator varieties | Authored items needed @40 |
| ----------------- | -------------- | ------------------- | ------------------------- |
| `counting`        | 4              | 10                  | 160                       |
| `skipCounting`    | 3              | 10                  | 120                       |
| `placeValue`      | 2              | 12                  | 80                        |
| `placeValueDiscs` | 2              | 10                  | 80                        |
| `numberBonds`     | 2              | 11                  | 80                        |
| `comparing`       | 4              | 10                  | 160                       |
| **Total**         | **17**         | **63**              | **680**                   |

680 individually authored and reviewed items for these six modes alone — that is the real cost of
dropping templating, and it is the number to plan review capacity against. Roughly a fifth of that total
is error analysis: one `errorAnalysis*` row in every mode, 240 items across the six, all of them
narrative prose about a fictional child's mistake. That is the single largest authoring line item in this
spec and the easiest one to under-budget, because the rows read like mechanical format transforms.

The rest of the bank load concentrates in `counting` and `comparing`, which hold 8 of the 17 `bank`
varieties between them. The symbolic modes (`placeValue`, `placeValueDiscs`, `numberBonds`) are still
mostly generator-served.

