# Item Bank Variety Spec — Index & Review

Status: **For review**
Parent: `problem-variety-expansion-plan.md` · Evidence: `research-k4-problem-types.md`

This is the documented question variety the item bank will be authored from. Four parts:


| Part                                       | Scope                          | Modes                                                                       | Varieties                      |
| ------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------- | ------------------------------ |
| [A & B](spec-part-ab-operations.md)        | Operations (CCSS Tables 1 & 2) | addition, subtraction, multiplication, division                             | **29 structures + 20 formats** |
| [C1](spec-part-c1-number-sense.md)         | Number sense                   | counting, skipCounting, placeValue, placeValueDiscs, numberBonds, comparing | **80**                         |
| [C2](spec-part-c2-fractions-patterns.md)   | Fractions & structure          | fractions, decimals, factorsMultiples, patterns, barModels                  | **73**                         |
| [C3](spec-part-c3-measurement-geometry.md) | Measurement, geometry, data    | measurement, money, time, areaPerimeter, angles, linesShapes, dataGraphs    | **124**                        |


**Total: ~306 documented varieties across all 22 modes**, each with a ready-to-screen example.
Baseline today: ~50 question shapes and **28** word-problem templates.

---

## 1. Read this first — evidence footing

The four parts do **not** rest on equal evidence, and the difference is large enough that it should
change how you review them.


| Part      | Grounding                                                                                               | How to read it                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **A & B** | Mostly **[S]** — CCSS Tables 1 & 2 and the OA Progressions, verbatim examples, official grade placement | Review for *engineering* fit. The taxonomy is settled; we are implementing it, not inventing it. |
| **C1**    | 26% [S] / 74% [C]                                                                                       | Review the [C] rows on pedagogical merit.                                                        |
| **C2**    | 16 [S] / 57 [C] — **every fraction and decimal row is [C]**                                             | Same.                                                                                            |
| **C3**    | ~15 borrowed formats, ~90 constructed. **Zero sourced problem-type taxonomies**                         | Review closely. This is our judgment throughout.                                                 |


The research (§8) found no published problem-type taxonomy — no analogue of Table 1 — for fractions,
measurement, geometry, data, time, money, or counting. Part C is therefore *reasoned*, and is marked as
such row by row.

**Consequence for user-facing copy:** Part A/B may be described as standards-aligned. Part C may not,
unless we commission the NF and Geometric Measurement Progressions research pass first. Level-band
assignments are our judgment everywhere, including on [S] rows, since no source tiers these by difficulty.

---

## 2. The decision that gates everything: widgets

Every part independently hit the same wall. Counting mentions across all four specs:


| Widget                                     | Mentions | Unlocks                                                                                              | Verdict                                                                                              |
| ------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `**multiSelect`** / set-validating checker | 23       | `bothAddendsUnknown`, numberBonds "3 ways to make 8", comparing, fraction ordering, Open Middle rows | **Build.** Cheapest unlock, widest reach.                                                            |
| `**shapeFigure`**                          | 18       | Nearly all of `linesShapes`                                                                          | **Build.** A geometry mode that never draws a shape is a weak product; 10 → 290 items depends on it. |
| `**numberLine`**                           | 17       | Compare & Change Unknown (A), jumps (B), fraction-as-a-number (C2)                                   | **Build.** The canonical G2-3 model, and fraction-as-a-number is inexpressible without it.           |
| `pictograph`                               | 9        | dataGraphs keys of 2/4/5 — where children actually fail                                              | Build in Phase 3.                                                                                    |
| `orderStrip`                               | 4        | ordering fractions/decimals                                                                          | Defer — `multiSelect` covers some cases.                                                             |
| `areaGrid`                                 | 3        | area-model multiplication                                                                            | Defer to Phase 3.                                                                                    |
| `rulerRead`                                | 3        | measurement                                                                                          | Defer.                                                                                               |


**The top three are load-bearing.** They are not per-mode costs — each serves several modes, which is
why they should be scheduled as infrastructure alongside Phase 1 rather than inside any one mode's work.

A related engine change: `multiSelect` requires the answer checker to validate a *set*, not compare a
single `answer` value. Several varieties across four modes are blocked on that alone. There are also
varieties (range estimates, open constructions, Which One Doesn't Belong) that have **no scoring path at
all** today, and one — WODB — has no answer key by design. Decide whether such items are in scope.

---

## 2b. Sourcing model — static authored items

**Decided.** Every prose-carrying item is individually authored and human-reviewed with fixed numbers, in
the existing bank format. Parameterized templates were considered and **rejected**.

| Item type | Source |
|---|---|
| `application` | **bank** |
| Any family, carrying narrative prose (named characters, real-world context) | **bank** |
| Purely symbolic or visual, no authored wording | generator |
| `procedural`, symbolic | generator — `27 + 45 = ?` has no prose to review |
| Format transform over a banked item | generator **from bank item** — inherits reviewed prose |
| Format transform over a symbolic item | generator — no prose parent to inherit |

The operative test, applied consistently across all four parts: **narrative context vs. bare mathematical
instruction.** "Nia counted 9 stickers but pointed at one twice" is authored prose and needs review, even
though it is a format transform. "Using digits 3, 5, 8 once each…" is an instruction and does not.

### Authoring load

| Part | Bank varieties | Generator varieties | Authored items |
|---|---|---|---|
| **A & B** — operations | 28 | 1 + 20 formats | **~5,040** (tiered 100/60/40) |
| **C1** — number sense | 17 | 63 | **680** |
| **C2** — fractions & structure | 28 | 45 | **1,120** |
| **C3** — measurement, geometry, data | 41 | 77 | **1,640** |
| **Total** | **114** | **~206** | **~8,480** |

Against 3,924 items today, of which ~1,300 are procedural and get retired to the generator, the **net ask
is roughly 6,900 new reviewed items.**

Two things this table shows that were not obvious before authoring the specs:

- **Operations dominate — 60% of the bill.** They are also the highest-traffic modes, so they carry the
  deeper tiered floors (100/cell for addition and subtraction bands 1-6). The C parts sit at a flat 40.
- **The visual and number-sense modes are cheap.** C1 and C3 are 64% generator, because a rendered clock
  face, angle, disc board, or shape figure carries no wording to review. That skew is correct, not a gap.
- **Error analysis is the easiest line to under-budget.** These rows *look* like mechanical format
  transforms but every one is narrative prose about a named child making a specific mistake — in C1 alone
  they are 240 of 680 items. They need full review, not spot review: an error-analysis item whose stated
  mistake doesn't match its numbers teaches the misconception instead of correcting it.

### Review throughput is the binding constraint

Not LLM generation — `scripts/itemGen/` already batches. At ~8,480 items and a sustained 100 reviewed
items/hour, this is on the order of **85 hours of human review**. Two mitigations:

1. **Tiered review** — full review for T1 cells and the four Difficult additive structures, where an LLM
   most often silently rewrites a hard structure into an easy one; fixed-rate spot review for T3/T4.
2. **Automated pre-screening in `validateDrafts.js`** — reject before a human sees it: `structureType`
   not matching the prose, answer inconsistent with the stated numbers, >220 chars, duplicate prompt
   signature within a cell, actor-name overuse. **Highest-leverage engineering in the whole effort.**

**Phase the floors.** Phase 5a at 25/cell (~2,850 items) makes every variety playable; raise the hot
cells once real traffic shows which they are.

---

## 3. Second decision: how varieties map onto bank cells

The combinatorial trap from the plan (§Phase 5) applies here too. If all ~306 varieties become
`subskill` values, cell count explodes — `fractions` alone would go to 54 cells.

**Recommendation, consistent across the specs:** add a `varietyId` field *underneath* the existing
subskill/structure axis rather than replacing it.

- Operation modes: `structureType` replaces `subskill` (already decided).
- Other 18 modes: keep current subskills; `varietyId` is a tag, not a coverage axis.

`fractions` then stays at ~12 cells instead of 54, and the bank stays near the ~2,000-item target.
`varietyId` still drives generator coverage and the variety report — it just doesn't multiply the bank.

---

## 4. Overlaps to resolve before authoring

The specs were written in parallel and three genuine collisions surfaced:

1. `**comparing` #9/#10 are CCSS Table 1 Compare cells** and would duplicate Phase 1's additive structure
  engine. *Recommendation: hand them to the structure engine; `comparing` keeps symbol-selection and
   relational/no-compute items.*
2. `**barModels` is a representation, not a topic.** Its 16 varieties are seven bar-model schemas serving
  *other* modes. Treating it as a shared service is an architectural commitment — decide now, because
   the alternative (each mode owning its bar rendering) is much harder to unwind later.
3. `**clockHandsAngle`** could live in `angles` or `time`. Pick one owner.

---

## 5. Free wins — do these regardless

Confirmed bugs, each roughly a one-line fix, independent of everything above:

- `dataGraphs` — `const [i, j] = [0, 1]`; every comparison item compares the same two bars.
- `money` — the generator has **no nickels** at all.
- `patterns`, `dataGraphs`, `linesShapes` — `chooseFamily()` result is written to metadata but never
branches the prompt, so `application` items render identically to `procedural`. Either branch on it or
stop emitting the tag.
- `addition` — missing-addend fires only on `CONCEPTUAL && unknownAddend`, roughly 1 item in 9.
- `linesShapes` — `level` is ignored entirely.
- `skipCounting` — the prompt states the rule, giving away the answer.
- `blueprints.js` — covers only the original 8 modes and is imported by nothing.

---

## 6. Reviewer checklist

**Blocking — needed before authoring starts:**

- **Widgets:** approve `multiSelect`, `shapeFigure`, `numberLine` as Phase 1 infrastructure? (Cutting all new widgets drops C2 alone from 73 → 59 varieties.)
- **Set-validating checker:** in or out? Gates multi-answer items across four modes.
- `**varietyId` as a tag, not a coverage axis** (§3) — confirm.
- **Part C evidence footing** (§1): accept as reasoned, or commission the Progressions research pass first?
- `**barModels` as a shared service** (§4.2).

**Scoping:**

- Do `addition` and `subtraction` remain separate modes given they share one taxonomy?
- Customary units as well as metric? US-only coins? 3-D shapes in `linesShapes`?
- Is Grade 5 content (unlike denominators, decimal arithmetic) in or out?
- Reconcile 3 level bands here against the 12-level G1-G4 ladder in `grade1-4-expansion-plan.md` — otherwise every band tag needs rewriting later.
- Does the clock widget accept input (draggable hands)?

**Per-part detail:** each spec closes with its own decision list; the above are only the cross-cutting ones.

---

## 7. What this changes


|                                    | Today      | Spec'd                                 |
| ---------------------------------- | ---------- | -------------------------------------- |
| Word-problem templates             | 28         | 500+                                   |
| Documented varieties               | ~50 shapes | ~306                                   |
| `structureType`s generated         | ~3         | 29                                     |
| Addition/subtraction templates     | 2          | 540+ items                             |
| Mult/division templates            | 4          | 320+ items                             |
| `linesShapes` item universe        | 10         | ~290                                   |
| Modes with implemented distractors | 8          | 22                                     |
| Curated bank items                 | 3,924      | ~2,000 (procedural moves to generator) |


The bank gets *smaller* while variety grows by an order of magnitude, because coverage moves to the
generator and curation is reserved for prose quality.