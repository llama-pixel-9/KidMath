# Implementation Plan

Status: Proposed
Companions: `problem-variety-expansion-plan.md` (why) · `item-bank-variety-spec.md` (what) · this doc (how & when)

---

## Sequencing principle

Ship playable value at every milestone. Nothing waits on the full ~8,480-item bank, and no milestone
leaves the app in a worse state than it started.

Two hard dependencies drive the order:

1. **Component extraction before new widgets.** `MathExplorer.jsx` is 2,092 lines containing 7 inline
   visual components. The spec adds 7-10 more. Extracting first is not tidying — it is the difference
   between a tractable and an intractable widget workstream.
2. **Structure engine before any authoring.** Running the LLM pipeline against the old vocabulary would
   produce thousands of items we'd pay to re-tag.

---

## M0 — Foundations (~1 week)

No user-visible change. Everything downstream depends on it.

**0.1 Extract components.** `MathExplorer.jsx` → `src/components/`: `NumberBond`, `BarModel`,
`AnalogClock`, `FractionSet`, `PlaceValueDiscs`, `DataGraph`, `AngleFigure`. Each takes the same props
contract it has today (`onSubmit`, `feedback`, `theme`, `lowMotionMode`, `lowEndDevice`, + payload).
Pure refactor, no behaviour change.

**0.2 Widget registry.** Replace the ~90-line `answerType` ternary chain in `MathExplorer.jsx` with a
lookup: `answerType → component`. Adding a widget becomes a one-line registration.

**0.3 Variety instrumentation** (plan §Phase 0). `scripts/varietyReport.js`: generate 500 items per
mode per level; report distinct prompt signatures, distinct `structureType`s, max repeat share. Point
the existing `findPromptOveruse()` / `promptSignature()` at generator output. Publish the baseline —
it will be bleak, which is the point — and add a warn-only CI gate at ≤25% signature share.

**0.4 Free bug fixes** (spec index §5). `dataGraphs` hard-coded `[0,1]`; `money` missing nickels;
`chooseFamily` computed-then-discarded in `patterns`/`dataGraphs`/`linesShapes`; `addition`
missing-addend firing 1-in-9; `linesShapes` ignoring `level`; `skipCounting` giving away the rule.

**Exit:** components extracted, registry live, baseline variety numbers published, six bugs closed.

---

## M1 — Structure engine (~2 weeks)

The highest-value milestone. Turns 2 addition templates into the full Table 1 grid.

**1.1** `src/modes/structures/additiveStructures.js` — the 15 templates from spec §A1 as data: unknown
position, equation shaper, phrasing variants (including both Compare language versions), difficulty tier.

**1.2** `src/modes/structures/multiplicativeStructures.js` — the 14 from spec §B1-B2.

**1.3** `src/modes/structures/levelPolicy.js` — which structures unlock at which level, per the
Progressions gating in spec §A2. K = the four Easy subtypes only; the four Difficult subtypes at 7-10;
never compose two Difficult structures in a two-step item.

**1.4** Rewrite `addition`, `subtraction`, `multiplication`, `division` against it. `generate()` becomes:
pick an allowed structure → pick a context → render → emit accurate `structureType`.

**1.5** `family` derived from `(structure, format, representation)` rather than rolled (plan §Phase 5).

**Exit:** all 29 structures generating; `varietyReport` shows ≥20 distinct signatures per operation mode
where it showed ~3.

---

## M2 — Visual & interaction layer (~3 weeks)

**This is the workstream that makes it feel good to a child**, and it was missing from the earlier plan.

### 2.1 Design decisions

**Inline SVG, not images.** Every existing component is SVG; your themes are Tailwind class strings, so
widgets must theme through that system. Bitmaps can't — they'd break in dark mode and look foreign next
to the current components. SVG also scales crisply, animates with the `framer-motion` already in use,
costs no network requests, and sidesteps asset licensing.

**Coins specifically.** Stylized but *dimensionally accurate*: correct relative sizes, silver vs. copper,
a readable profile and denomination. Relative size is not decoration — **a dime is worth more than a
nickel but is physically smaller**, which is exactly where children go wrong. A coin set drawn at uniform
size would teach the misconception. Render as a scatterable tray with tap-to-select and a running total.

**A shared visual kit** (`src/components/kit/`) so widgets look like one product: consistent stroke
weight, corner radius, palette hooks off `theme`, shared tap/selected/correct/incorrect states, one
animation vocabulary, and `lowMotionMode` / `lowEndDevice` respected everywhere.

### 2.2 Widget build order — by varieties unlocked, not by mode

| Order | Widget | Unlocks | Notes |
|---|---|---|---|
| 1 | **`multiSelect`** + set-validating checker | ~23 varieties across 5 modes | Engine change: checker compares a *set*, not one `answer`. Cheapest, widest. |
| 2 | **`numberLine`** | ~17 — Compare & Change Unknown (A), jumps (B), fraction-as-a-number (C2) | Canonical G2-3 model. Fraction-as-a-number is inexpressible without it. |
| 3 | **`shapeFigure`** | ~18 — nearly all of `linesShapes` | Needs a ~24-entry shape property table. 10 → ~290 items depends on it. |
| 4 | **`coinTray`** | money #2, #6, #15 | Per 2.1. Highest "feels nice" payoff per unit effort. |
| 5 | `pictograph` | dataGraphs — keys of 2/4/5, where children actually fail | |
| 6 | `areaGrid`, `orderStrip`, `rulerRead`, `rangeInput` | remainder | Defer; re-rank once 1-5 ship. |

### 2.3 Scoring paths that don't exist yet

Several spec varieties have no way to be answered today. Decide scope before building the widgets that
assume them: **set answers** (multiple correct), **range answers** (estimation: too-low/too-high bounds),
**open constructions** (Open Middle — many valid answers), and **Which One Doesn't Belong**, which has no
answer key by design and may simply be out of scope.

**Exit:** top 4 widgets shipped in the kit, set-validation live, `money` and `linesShapes` visibly
transformed.

---

## M3 — Format layer (~1 week)

Cheap once M1 lands, and it multiplies every mode.

`src/modes/formats/` as a transform over a solved item: `{a:7, b:5, answer:12}` → true/false, balance,
odd-one-out, error analysis, estimation. Modes declare `supportedFormats`; level policy gates unlock.

Two rules from the spec: a transform over a **banked** item inherits its reviewed prose; a transform over
a **symbolic** item is plain generator. And error-analysis items with narrative prose are *authored*, not
generated — they're bank items that happen to look like transforms.

**Exit:** 16-20 formats live across the operation modes.

---

## M4 — The 18 remaining modes (~4 weeks, parallelizable)

Per spec parts C1/C2/C3, worst-first: `linesShapes` (10 items today), `measurement`, `dataGraphs`,
`patterns`, `numberBonds`, `placeValueDiscs`, then the rest. Each mode to ≥3 subskills and its spec'd
variety count. Refresh `blueprints.js`, which still covers only the original 8 modes and is imported by
nothing.

Parallelizable per mode once M0-M3 are in.

---

## M5 — Distractors (~1 week)

14 of 22 modes ship no `generateChoices`; only 4 misconception strategies exist and every other tag is
decorative. Implement one strategy per tag so a wrong answer *diagnoses*. Priority: the new diagnostic
tags from spec §A6/§B6 — `keywordTrap`, `startAsResult`, `equalsMeansCompute`, `compareAsAdditive` —
which are what make the hard structures worth having.

---

## M6 — Bank authoring (continuous from M1; the critical path)

~8,480 authored items, net ~6,900 new. **Human review is the constraint, not generation.**

**6.1 Re-tagging audit — DONE. `npm run bank:audit`.**

The result changes how M6 should be prioritised. Mapping the 3,924 curated
items onto the 29-structure taxonomy, with ambiguous old tags resolved
automatically from each item's own payload (which cut manual re-tagging from
847 items to 239):

| Tier | Structures | Bank items | Empty |
|---|---|---|---|
| easy | 6 | **2,467** | 1 |
| middle | 9 | 869 | 3 |
| **difficult** | **9** | **4** | **8** |

**The difficult tier has 4 items across 9 structures, and 8 of the 9 are
completely empty.** Never authored: both Start Unknown structures, all four
Compare language variants, Both Addends Unknown, and all three multiplicative
Compare structures.

So "3,924 curated items" overstates real coverage badly. The bank is deep on
exactly the content the generator finds easiest and absent on the content that
distinguishes mathematical reasoning from arithmetic recall — which is the
whole reason for adopting the taxonomy.

Two consequences:

1. **Authoring priority inverts.** Do not top up the easy tier. The first
   authoring batches should be the 8 empty difficult structures, where the
   marginal item is worth most.
2. **Review tiering matters more, not less.** These are precisely the items an
   LLM most often gets wrong — the usual failure is quietly rewriting a hard
   structure into an easy one, which produces a plausible item filed under the
   wrong label. `validateDrafts` must check the structure claim against the
   prose, not just the schema.

**6.1b Original text — do this first.** `scripts/bankStructureAudit.js` maps the existing 3,924 items
onto the 29-structure taxonomy and emits a per-structure gap report. It prices the whole phase and may
show better existing coverage than the skew suggests (`equalGroupsTotalUnknown` 933 vs
`quotitiveDivision` 4).

**6.2 Pre-screening before the first large batch.** `validateDrafts.js` must auto-reject: `structureType`
not matching the prose, answer inconsistent with stated numbers, >220 chars, duplicate prompt signature
within a cell, actor-name overuse. **Highest-leverage engineering in the entire effort** — every
auto-rejection is reviewer time returned.

**6.3 Structure-aware prompts.** `prompt.js` / `loadExemplars.js` need per-structure exemplars. A
Compare/Smaller-Unknown-with-"more" item is specific and easily botched; the common failure is the model
quietly rewriting a hard structure into an easy one.

**6.4 status — the empty difficult tier is authored (drafts).** `authorStructures.js`
generated 120 items (12 each) across the ten never-authored structures — both Start
Unknowns, all four Compare language variants, the three multiplicative Compares, and
array row-count. 100% cleared checkStructure + the QC gate and were written as
`review_status='draft'` to Supabase, awaiting review in the queue. Model: Haiku, on the
Claude subscription (no API cost). The language traps verify correct: "Emma has 15 fewer
than Marcus, Emma has 34, how many does Marcus have?" = 49 (adds despite "fewer").

**6.4 Authoring order.** Phase 5a at 25/cell (~2,850 items) makes everything playable → raise T1/T2 to
full depth guided by real traffic → T4 breadth last.

**6.5 Review tiering.** Full review for T1 cells, the four Difficult additive structures, and **all
error-analysis items** — an error-analysis item whose stated mistake doesn't match its numbers teaches
the misconception. Fixed-rate spot review for T3/T4.

**6.6 Retire banked procedural items** (~1,300) once generators cover those cells.

---

## M6b — The data pipeline: what exists, what breaks at scale

**The path to production already exists end to end.** Nothing here needs inventing:

```
generateDrafts --provider claudeCode   author via `claude -p` (subscription,
                                        no API key); KIDMATH_ITEMGEN_MODEL=haiku
                                        for cheap bulk → parseCandidates
  → validateDrafts + structureCheck     quality + structure-match gate
  → writeDrafts.js         upsert to Supabase, review_status='draft'
  → src/admin/ReviewQueue  human review with inline QC; approve blocked on fail
  → npm run bank:qc        two-pass audit (deterministic + `claude -p` judgment)
  → cloudLoader / modeLoader  runtime hydration, per mode
  → npm run bank:export    snapshot approved rows back into src/itemBank/items/
```

**Authoring runs on the Claude subscription, not the API.** The `claudeCode`
provider and the QC judgment pass both shell out to `claude -p`, so the whole
loop — generate, review, QC — needs no `ANTHROPIC_API_KEY` and adds no
per-token bill. Haiku is the default for bulk generation: it clears the same QC
gate as any other model, and a wrong item is caught by the gate, not by paying
more for the author. The raw Batch API path still exists for anyone who wants
its async 50%-off pricing and will pay API charges for it.

`public.item_bank` already has `structure_type`, `level_band`, `representation_type`, `source`,
versioning, `updated_at` triggers, and RLS policies separating public read-approved from admin
insert/update. There is an admin UI (`ReviewQueue`, `ItemEditor`, `AdminItemsPage`, `CoverageHeatmap`)
and a `retired` status for M6.6. This is a well-built pipeline.

**But it was built for ~4,000 items, and five things break on the way to ~8,500:**

### 1. Bundle size — the serious one

`src/itemBank/items/` is **1.4 MB for 3,924 items**, and `dist/assets/index-*.js` is already **1.9 MB**.
At 8,480 items the bundled bank alone approaches **3 MB**, pushing the bundle past 4 MB. For a children's
app on school wifi or a shared tablet, that is a bad first load.

**Fix: invert the default.** Bundle a small seed — enough that the app works offline and on first paint,
say 5-10 items per cell — and let `cloudLoader` hydrate the full bank in the background. The hot-swap
machinery (`setBankItems`, `subscribeBankChanges`) already supports exactly this; only the snapshot
policy changes. Decide this *before* authoring at volume, because it determines what `bank:export`
should write.

### 2. Schema needs two columns

No `variety_id` (spec index §3) and no `format` column. Without them the ~306 varieties and the format
transforms can't be tracked, targeted, or coverage-reported. One migration, best done at M1.

### 3. `writeDrafts` posts every row in a single request

Fine for a few hundred; it will hit payload limits at thousands. Needs chunking (~500/request) with
per-chunk retry, so one failure doesn't lose a whole batch.

### 4. The review queue is the throughput constraint, and it's 276 lines

`ReviewQueue.jsx` is built for reviewing tens of items. At ~6,900 new items it is *the* bottleneck —
this is where the 85-hour review estimate is actually spent. It needs: keyboard-driven review
(approve/reject/edit without touching the mouse), bulk approve for a validated cell, side-by-side
duplicate detection within a cell, and filtering by structure/variety/tier.

**Improving this UI buys more throughput than any other engineering in M6.** A reviewer moving from 60
to 150 items/hour halves the calendar time of the critical path.

### 5. No re-tagging script yet

M6.1's `bankStructureAudit.js` is unwritten. It's the first thing to build.

---

## Timeline

| Milestone | Effort | Depends on |
|---|---|---|
| M0 Foundations | 1 wk | — |
| M1 Structure engine | 2 wk | M0 |
| M2 Visual layer | 3 wk | M0 (parallel with M1) |
| M3 Format layer | 1 wk | M1 |
| M4 18 modes | 4 wk | M0-M3 |
| M5 Distractors | 1 wk | M1 |
| M6 Bank authoring | continuous | M1 for structures; own critical path |

**~10-12 weeks of engineering** with M1 and M2 in parallel. M6 runs alongside from M1 onward and is the
long pole — start it early.

---

## Open decisions blocking a start

From spec index §6, the ones that gate M2 in particular:

- [ ] Approve `multiSelect`, `numberLine`, `shapeFigure`, `coinTray` as M2 scope
- [ ] Set-validating checker: in or out? Gates multi-answer items across 5 modes
- [ ] Range answers, open constructions, WODB: in scope or out? (§2.3)
- [ ] `barModels` as a shared service — now also the most expensive single mode (640 items)
- [ ] Reconcile 3 level bands against the 12-level G1-G4 ladder in `grade1-4-expansion-plan.md`
- [ ] `addition`/`subtraction` separate modes or merged, given they share one taxonomy
- [ ] **Bundling policy** (M6b.1): keep bundling the full bank, or ship a seed and hydrate from cloud?
      Determines what `bank:export` writes and needs deciding before authoring at volume.
