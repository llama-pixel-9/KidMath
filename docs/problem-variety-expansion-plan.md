# Problem Variety Expansion Plan

Status: Proposed
Scope: all 22 modes
Companion to: `grade1-4-expansion-plan.md` (topic/grade coverage), `word-problem-authoring-guide.md` (authoring contract)
Evidence base: `research-k4-problem-types.md` (salvaged research; see its §8 for what is *not* covered)
Authoring spec: `item-bank-variety-spec.md` (~306 documented varieties across all 22 modes — **for review**)

That plan asked **"which topics do we cover?"**. This one asks a different question:
**"within one topic, how many genuinely different problems can we ask?"**

---

## 1. Diagnosis

Measured against the current `src/modes/` tree:

| Metric | Current |
|---|---|
| Modes | 22 |
| Declared subskills | 56 |
| Distinct question *shapes* | ~50 |
| **Distinct word-problem templates, whole codebase** | **28** |
| Word-problem templates in `addition` | **1** |
| Word-problem templates in `subtraction` | **1** |
| Modes with fewer than 3 subskills | 10 of 22 |
| Modes with zero distractor logic | 14 of 22 |
| Implemented misconception strategies | 4 |
| Total possible items in `linesShapes` | 10 |

Three root causes, in order of severity:

**C1 — One structure per operation.** `addition` can only ever ask *Add To, Result Unknown* ("2 birds joined 3 birds"). CCSS Table 1 defines a 12-cell grid — **11 one-unknown subtypes** plus Both Addends Unknown, which expand to **14 generable templates** once the Compare language variants are counted separately. We implement one. A child who has mastered `2 + 3 = ?` but freezes at `2 + ? = 5` looks identical to our engine, because we never ask the second question.

**C2 — Difficulty is numeric, not structural.** Every mode scales by making numbers bigger. `RANGES` goes from `1..3` to `10..50` and nothing else changes. But `3 + ? = 8` is harder than `30 + 40 = ?` for a 6-year-old. Real difficulty in K-4 comes from *structure* (where the unknown sits) and *representation*, not magnitude.

**C3 — The bank masks the problem unevenly.** 3,924 curated items sit behind the 8 original modes, so their generator poverty is hidden. The 14 newer modes have **zero** bank items and emit raw generator output — which is why `linesShapes` visibly repeats within ten questions.

A telling detail: `itemBank/index.js` already has a `findPromptOveruse()` guard that caps how often one prompt signature may repeat (application ≤3, conceptual ≤5). **It runs only over bank items, never over generator output.** Every generator in the codebase would fail it catastrophically. That check, pointed at the generators, is our objective definition of "enough variety."

---

## 2. The design: three orthogonal axes

Variety is currently one-dimensional (bigger numbers). Make it three-dimensional. An item is a coordinate:

```
(structure, format, representation)
```

Multiply, don't add. 14 structures × 5 formats × 3 representations is a far larger space than any list of hand-written templates, and every cell is pedagogically meaningful.

### Axis 1 — Structure (what the problem *is*)

This is the standards' problem-type taxonomy, and it is the highest-value thing missing. `structureType` **already exists** in our metadata model and the authoring guide already lists 14 values — we simply never generate against it.

**Additive structures (CCSS Table 1).** A 12-cell grid. Note the counting carefully, because the literature is inconsistent and **no source actually says "14"**: there are 11 one-unknown subtypes, plus Both Addends Unknown (which the Progressions explicitly call "not a problem subtype with one unknown… a productive variation with two unknowns"). Counting the Compare *language* variants separately yields the 14 templates a generator should implement.

| Situation | Result / Total Unknown | Change / Addend Unknown | Start / Both Unknown |
|---|---|---|---|
| **Add to** | 2 bunnies, 3 more hop over. How many now? `2+3=?` | 2 bunnies, some hop over, now 5. How many hopped? `2+?=5` | Some bunnies, 3 hop over, now 5. How many before? `?+3=5` |
| **Take from** | 5 apples, I ate 2. How many left? `5−2=?` | 5 apples, I ate some, 3 left. How many eaten? `5−?=3` | Some apples, I ate 2, 3 left. How many before? `?−2=3` |
| **Put together / Take apart** | 3 red and 2 green apples. How many? `3+2=?` | 5 apples, 3 are red. How many green? `3+?=5` | Grandma has 5 flowers, some in each of 2 vases. List the ways. `5=0+5, 1+4, …` |
| **Compare** | Lucy has 2, Julie has 5. How many more does Julie have? | Julie has 3 more than Lucy. Lucy has 2. How many has Julie? | Julie has 3 more than Lucy. Julie has 5. How many has Lucy? |

**This grid also hands us a difficulty ladder — which is the fix for C2.** The Progressions tier the subtypes by the solution method they demand, and the boundary is sharp:

| Tier | Subtypes | Expected |
|---|---|---|
| **Easy** (Level 1, direct modeling) | Add To/Result, Take From/Result, PT-TA/Total, PT-TA/Both Addends | **Kindergarten — exactly these four**, within 10 |
| **Middle difficulty** (Level 2, counting on) | Add To/Change, Take From/Change, PT-TA/Addend, Compare/Difference | Grade 1 |
| **Difficult** (Level 3, derived facts) | Add To/Start, Take From/Start, Compare/Bigger with *"fewer"*, Compare/Smaller with *"more"* | G1 exposure, **G2 mastery** |

The defining property of the hard tier, and the most useful single sentence in the research: **the situation equation is the opposite of the solution operation.** "Add To / Start Unknown" *reads* as addition (`? + 3 = 5`) but is *solved* by subtraction. Likewise the Compare language traps — "Julie has 3 **more** than Lucy, Julie has 5, how many has Lucy?" requires subtracting despite the word "more". The official footnote is explicit that one phrasing "directs the correct operation" and "the other versions are more difficult."

This is exactly what our `RANGES`-based difficulty cannot express, and exactly what a practice app should drill. It gives `levelPolicy.js` a principled definition instead of an invented one:

- **Levels 1-3 (K band):** the four Easy subtypes only, within 10.
- **Levels 4-6 (G1-2 band):** add the four Middle subtypes; introduce the Difficult four *without* requiring mastery.
- **Levels 7-10 (G2+ band):** all subtypes and both language variants; unlock two-step problems.

One constraint to respect from the Progressions: two-step problems "should not involve these [most difficult] subtypes," and should mostly use single-digit addends. Don't compose two hard structures.

**Multiplicative structures (CCSS Table 2) — 9 types.** Grade 3 for equal-groups/array; Grade 4 for multiplicative compare.

| Situation | Unknown Product | Group Size Unknown (partitive ÷) | Number of Groups Unknown (quotitive ÷) |
|---|---|---|---|
| **Equal groups** | 3 bags × 6 plums = ? | 18 plums, 3 bags equally. How many per bag? | 18 plums, 6 per bag. How many bags? |
| **Array / Area** | 3 rows of 6 chairs | 18 chairs in 3 rows. How many per row? | 18 chairs, 6 per row. How many rows? |
| **Compare** | Red hat costs 3× the $6 blue hat | Red hat is $18, 3× the blue. Blue? | Red $18, blue $6. How many times as much? |

Our bank's structure distribution shows the gap precisely: `quotitiveDivision` has **4 items** against `equalGroupsTotalUnknown`'s 933. Measurement division is essentially untaught in our app.

### Axis 2 — Format (how it's *asked*)

Same math, different question. Cheap to build, disproportionate variety gain, and each format probes a different weakness.

| Format | Example | Why it matters |
|---|---|---|
| Missing operand | `7 + ? = 12` | Algebraic thinking precursor |
| Missing operator | `7 ? 5 = 12` | Forces operation *meaning*, not execution |
| True/false equation | `8 + 5 = 13` — true? | Attacks the "=" -means-answer-comes-next misconception |
| Equation balance | `8 + 5 = ? + 4` | The single most cited K-4 misconception |
| Odd one out | Which doesn't equal 12? | Requires evaluating all options |
| Error analysis | "Sam says 27+5=72. What went wrong?" | Highest DOK per unit of build effort |
| Estimation | "About how many — 20, 50, or 100?" | Number sense; nearly absent from our app |
| Extraneous info | Story with an unused number | Blocks keyword-matching strategies |
| Multi-step | Two-operation story | Grade 3-4 expectation, we have none |
| Two correct answers | "Pick *both* that equal 12" | Kills answer-elimination guessing |

The equality/balance formats deserve emphasis. Children who only ever see `a + b = ?` tend to develop an **operational** view of "=" — it means "write the answer next" — rather than a **relational** one (equivalence). They then reject `3 = 3` and `3 + 5 = 5 + 3` as false, and answer the canonical diagnostic `8 + 4 = □ + 5` with 12 or 17. (Carpenter, Franke & Levi, *Thinking Mathematically*, 2003. A widely repeated "fewer than 10% correct at any grade" figure could not be traced to a source and is **not** relied on here.)

This is a *format* problem, not a topic problem, and we currently have no way to even express such an item. The generator should vary the **form of the equation**, not just the numbers — six buckets:

| Form | Example |
|---|---|
| `a + b = c` | canonical true/false |
| `c = a + b` | `12 = 7 + 5` — true, often called false |
| `a = a` | `9 = 9` — true, often called false |
| `a + b = b + a` | `6 + 9 = 9 + 6` |
| `a + b = c + d` | `8 + 4 = 7 + 5` (true); `8 + 4 = 9 + 5` (false) |
| `a + b = □ + d` | `8 + 4 = □ + 5` — relational; solvable *without computing* |

The last bucket is the valuable one: `37 + 48 = 38 + 47` is true by compensation, and a child who computes both sides has missed the point. Generate some items where the numbers are deliberately too awkward to compute, forcing relational reasoning.

### Axis 3 — Representation (CPA)

Math in Focus's core commitment: **Concrete → Pictorial → Abstract**, and the discipline is that the *same* concept appears in all three.

Here we're in better shape than expected. The renderer already dispatches on `answerType` with real interactive widgets: `numberPad`, `fraction`, `decimal`, `symbolSelect`, `barGraph`, `angle`, `clock`, `fractionSet`, `placeValueDiscs`, `barModel`, `numberBond`, plus default multiple choice.

**The widgets exist; the generators barely use them.** `addition` never emits a `barModel` or `numberBond` item, though both are ideal for it and both are already built. Much of Axis 3 is wiring, not new UI.

Gaps worth adding: `numberLine` (place a value / show a jump — the key Grade 2-3 model we lack) and `matchSort` (drag-to-group, already named in the existing expansion plan).

---

## 3. Implementation

### Phase 0 — Instrument before building (½ day)

Do this first. It converts "I feel like variety is low" into a number we can track.

1. Point the existing `findPromptOveruse()` / `promptSignature()` at generator output. Add `scripts/varietyReport.js`: generate 500 items per mode per level, report distinct prompt signatures, distinct `structureType`s, and the max repeat count.
2. Publish the baseline. Expect it to be bleak — `addition` will show ~3 signatures across 500 items.
3. Add a CI gate, initially warn-only: **no mode/level may exceed 25% of items sharing one prompt signature.**

This is the acceptance criterion for every phase below.

### Phase 1 — Structure engine (the core work)

This is where most of the value is. Build it once, share it across the four operation modes.

Create `src/modes/structures/` :

- `additiveStructures.js` — all 14 Table 1 types as data: unknown position, an equation shaper, phrasing variants (including the inconsistent-language compares), and a difficulty rank.
- `multiplicativeStructures.js` — all 9 Table 2 types.
- `contexts.js` — a context pool decoupled from structure: actors (rotating names, per the authoring guide), objects, containers, verbs, units. **This is the multiplier.** 14 structures × 40 contexts = 560 addition word problems from one engine, versus today's 1.
- `levelPolicy.js` — which structures unlock at which level, so difficulty finally advances structurally rather than only numerically.

Then rewrite `addition`, `subtraction`, `multiplication`, `division` against it. Their `generate()` becomes: pick a structure allowed at this level → pick a context → render → emit with an accurate `structureType`.

Fix the two confirmed bugs while here:
- `addition.js` — missing-addend fires only on `CONCEPTUAL && unknownAddend`, roughly 1 item in 9. It should be a first-class structure.
- `patterns.js`, `dataGraphs.js`, `linesShapes.js` — `chooseFamily()` is called and its result written to metadata but never branches the prompt. Items tagged `application` render identically to `procedural`. Either branch on it or stop tagging.

### Phase 2 — Format layer

`src/modes/formats/` as a transform layer: take a solved item, re-present it as a different format. `{a:7, b:5, answer:12}` becomes a true/false item, a balance item, an odd-one-out, or an error-analysis item without the mode knowing how.

Formats are declared per mode (`supportedFormats`) and unlocked by level. Written once, this benefits all 22 modes.

Error analysis is the standout: it is the highest-DOK format and it comes nearly free, because our misconception tags already describe exactly how to generate a *plausible wrong* answer to critique.

### Phase 3 — Fix the 14 starved modes

> **Evidence caveat.** Phases 1-2 rest on a well-sourced taxonomy. Phase 3 does not. The research explicitly found **no problem-type taxonomy for fractions (3.NF/4.NF), measurement, geometry, data, time, or money** — the domains covering most of these 14 modes — and none for K.CC counting or for distractor design. Tables 1 and 2 have no published analogue for these areas.
>
> So do **not** treat the per-mode lists below as standards-derived; they are reasoned proposals. Before building past the top two or three, do a focused round of research per domain (the NF Progressions and the Geometric Measurement Progressions are the obvious starting points). Budget for that rather than inventing a taxonomy and calling it aligned.

These have no bank and thin generators — the visible repetition. Roughly in order of how badly they need it:

1. `linesShapes` — 10 total items and `level` unused. Needs a real shape library (properties, angles, quadrilateral hierarchy, symmetry, sorting) and actual level scaling.
2. `measurement` — 1 shape, 5 unit pairs. Add estimation, benchmark reasoning, comparison, multi-step conversion.
3. `dataGraphs` — `compareBars` always compares bars 0 and 1. Randomize; add pictographs with a key, line plots, tallies, and "how many more/fewer/total" questions.
4. `patterns` — add shape/repeating patterns, rule identification, extend-backwards, find-the-error.
5. `numberBonds` — 3 subskills that produce identical output. Make them differ.
6. `placeValueDiscs` — add regrouping and trading actions, not just reading.
7-14. `money`, `time`, `areaPerimeter`, `factorsMultiples`, `fractions`, `decimals`, `comparing`, `counting` — each to ≥3 subskills and ≥8 structures per level band.

Also raise the 10 sub-3-subskill modes to the project's own documented ≥3 minimum, and refresh `blueprints.js`, which still covers only the original 8 modes and is imported by nothing.

### Phase 4 — Distractors

14 of 22 modes ship no `generateChoices`. Only 4 misconception strategies exist; every other tag in the codebase is decorative. Implement a real strategy per tag so that a wrong answer *diagnoses* rather than merely being wrong — that's what makes the metadata worth collecting.

### Phase 5 — Bank expansion

This phase needs more care than the others, because expanding variety **multiplies bank cells** and the naive version of this plan is unbuildable.

#### The combinatorial trap

Coverage today is `mode × subskill × family × band` = **216 cells** at a Phase-2 floor of 8 items = ~1,728 items. `scripts/itemGen/generateBatch.js` submits **one batch request per cell**, so cell count is directly a cost and latency figure.

If `structureType` is added as a *fourth* axis, addition alone becomes 14 × 3 subskills × 3 families × 3 bands = **378 cells** — more than the entire current bank's worth of cells, for one mode. Across four operation modes it is five figures of items. Do not do this.

**Three structural decisions keep it tractable:**

**1. `structureType` replaces `subskill` for the four operation modes.** They are already near-redundant — `unknownAddend` *is* Add To/Change Unknown and PT-TA/Addend Unknown wearing a different name. The current subskill names are an informal, incomplete version of the taxonomy we're adopting. Keep `subskill` for the other 18 modes, which have no Table 1/2 analogue.

**2. `family` becomes derived, not an independent axis.** A structure rendered as a story *is* application; rendered symbolically it *is* procedural. Family is a function of `(structure, format, representation)` — computing it removes an axis and, as a bonus, ends the current situation where `patterns`/`dataGraphs`/`linesShapes` tag a family that never changes the item.

**3. Formats are generator-side transforms and are never banked.** True/false, balance, odd-one-out and error-analysis items are *derived* from a solved item. Banking them would multiply the bank by the format count for zero quality gain. This is what keeps Phase 2 nearly free.

Result: addition = 14 structures × 3 bands = **42 cells**, not 378. All four operation modes land near 150 cells total.

#### The sourcing decision: static authored items

**Decided:** every prose-carrying item is individually authored and human-reviewed with fixed numbers, in
the existing bank format. Parameterized templates were considered and rejected.

| Item type | Source |
|---|---|
| `application` | **bank** — authored, reviewed |
| `conceptual` carrying prose / a written stem | **bank** |
| `conceptual`, purely symbolic or visual | generator |
| `procedural`, symbolic | generator — `27 + 45 = ?` has no prose to review |
| Format transforms (F1-F20) | generator **from a bank item** — inherits reviewed prose |

Procedural items stay generator-side deliberately. Of today's 3,924 items roughly a third are procedural
— 432 for addition alone — and that is review budget spent on items with no prose in them.

#### This makes Phase 5 the critical path

Under static authoring, **one authored item is one item** — the numbers are welded in, so it cannot be
re-instantiated. That changes the arithmetic completely:

- `SESSION_SIZE = 15` and `RECENT_BANK_WINDOW = 8`. An adaptive session targeting a child's weakest cell
  draws repeatedly from it, so **a small cell can be exhausted within one session.**
- The old floor of 8 items/cell is far too low. High-traffic cells need ~100.
- Total authored corpus lands in the **five figures**, not the ~2,000 of the earlier draft.

So Phase 5 is no longer "last and not a blocker." It is the longest pole, and **human review throughput —
not LLM generation — is the constraint.** `scripts/itemGen/` already batches; reviewers don't.

Two mitigations to decide on:

1. **Tiered review.** Full review for T1 cells and for the four Difficult additive structures, where an
   LLM most often silently rewrites a hard structure into an easy one. Fixed-rate spot review for T3.
2. **Automated pre-screening**, so a human never sees a rejectable draft. `validateDrafts.js` should
   reject: `structureType` not matching the prose, answer inconsistent with the stated numbers, >220
   chars, duplicate prompt signature within a cell, actor-name overuse. **This is the highest-leverage
   engineering work in the entire bank effort** — it multiplies reviewer throughput directly.

#### Work items

1. **Re-tag the existing 3,924 items** against the 14-structure taxonomy. They were authored under the old vocabulary and the distribution is badly skewed: `equalGroupsTotalUnknown` 933 vs `quotitiveDivision` **4**. Write `scripts/bankStructureAudit.js` to map current items onto the new taxonomy and emit a per-structure gap report. **Do this first** — it likely shows the bank is far better stocked for some new structures than we think, and it prices the rest of this phase.
2. **Retire or downgrade banked procedural items** once generators cover those cells, rather than maintaining both.
3. **Teach the pipeline structures.** `prompt.js` and `loadExemplars.js` need per-structure exemplars — a Compare/Smaller-Unknown-with-"more" item is a specific and easily-botched thing to ask an LLM for. `validateDrafts.js` must verify a draft actually *matches* its claimed structure; the most likely failure is the model quietly rewriting a hard structure into an easy one.
4. **Fill the gaps by traffic, worst first.** The four Difficult subtypes (Start Unknown ×2, the two Compare language traps) are both the highest-value and the ones an LLM most often gets wrong — prioritize human review there.
5. **Then the 14 bankless modes** — but only for application cells, and only after Phase 3 gives their generators real coverage.

#### Revised targets — tiered by traffic

A uniform floor is the wrong instrument: `addition` application cells see orders of magnitude more traffic
than `compareMultiplierUnknown`.

| Tier | Scope | Cells | Floor | Items |
|---|---|---|---|---|
| **T1** | addition & subtraction, bands 1-6 | ~28 | 100 | 2,800 |
| **T2** | add/sub band 7-10; mult & division bands 4-6 | ~28 | 60 | 1,680 |
| **T3** | mult/div upper bands, Compare & extensions | ~14 | 40 | 560 |
| **T4** | the other 18 modes, prose-carrying cells only | ~120 | 40 | ~4,800 |
| **Total** | | ~190 | | **~9,800 authored items** |

Against 3,924 today, of which ~1,300 are procedural items that will be retired to the generator. So the
real net authoring ask is roughly **7,000-8,000 new reviewed items.**

**Phase the floors.** Do not author 9,800 before shipping anything:

- **Phase 5a — floor 25/cell (~4,750 items).** Every structure playable, no empty cells.
- **Phase 5b — raise T1 and T2 to full depth**, guided by real traffic showing which cells are hot.
- **Phase 5c — T4 breadth** once Phase 3 gives those modes their generators.

Visual modes (`time`, `angles`, `linesShapes`, `dataGraphs`) skew generator-heavy under the sourcing
rule — a rendered clock face with a stock stem has no prose to review — so T4 is smaller than 18 modes
would suggest.

---

## 4. Targets

| Metric | Now | Target |
|---|---|---|
| Authored word problems | 28 templates | ~9,800 reviewed items |
| `structureType`s covered | ~3 | 29 (Tables 1 + 2 complete + extensions) |
| Formats per operation mode | 1-2 | 16-20 (generator transforms) |
| Max prompt-signature share, any mode/level | ~100% | ≤25% |
| Modes with <3 subskills | 10 | 0 |
| Modes with no distractors | 14 | 0 |
| `linesShapes` item universe | 10 | ~290 |
| Bank cells covered | 216 | ~190 (deeper, not wider) |
| Items per high-traffic cell | 8 | 100 |
| Banked procedural items | ~1,300 | 0 (retired to generator) |
| `quotitiveDivision` bank items | 4 | 60+ |
| Prose a child reads that was machine-authored | most | **none** |

---

## 5. Sequencing note

Phases 1 and 2 are the ones that matter. Phase 1 gives depth (the right problems); Phase 2 gives breadth (the right variety of asking) and is cheap once Phase 1 lands. Phase 3 is volume work that can be parallelized per mode.

**Phase 5 is now the critical path, not the tail.** Under static authoring the bank owns all prose, so a
mode is not really shipped until its cells are stocked. Start it as early as Phase 1 allows and run it
continuously alongside Phases 2-4.

Three ordering dependencies that bite:

1. **Don't run the LLM pipeline before Phase 1.** Authoring thousands of items against the old vocabulary
   reproduces the same shape at scale and we pay twice to re-tag it.
2. **Build the `validateDrafts.js` pre-screen before the first large batch**, not after. Every item it
   rejects automatically is reviewer time returned, and that is the binding constraint.
3. **Run the re-tagging audit first** (work item 1). It prices the whole phase and may show the existing
   3,924 items already cover more of the new taxonomy than the skew suggests.

The generator does not disappear — it owns procedural items, visual figures, and all format transforms,
and it remains the safety net that guarantees no empty cell ever reaches a child. What changes is that it
is no longer the *author* of anything a child reads as prose.

If only one thing gets built: **the additive structure engine**. Addition and subtraction are the most-used modes, they currently have one word problem each, and the 14-type grid is the difference between an app that drills arithmetic and one that teaches the reasoning underneath it.
