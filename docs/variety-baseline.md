# Problem Variety Baseline

**Measured 2026-07-20** · 500 samples per mode/level cell · 22 modes × 10 levels = 220 cells,
110,000 generated items · produced by `npm run bank:variety`
(source: `scripts/varietyReport.js`, milestone M0.3 / plan §Phase 0).

This is the before-picture. Every later milestone is measured against these numbers.

## How to read this

For each cell we call `config.generate(level)` 500 times and normalize each prompt with the item
bank's own `promptSignature()` — it lowercases, strips punctuation, and replaces every run of digits
with `#`. So `3 + 4 = ?` and `27 + 15 = ?` both become the signature `# #`. Two items with the same
signature are the same problem wearing different numbers.

- **maxShare** — the fraction of the cell's items held by the single most common signature.
  100% means every one of the 500 items is the same problem shape. Lower is better.
- **sigs** — how many distinct signatures the cell produced. Higher is better.
- **struct** — how many distinct `structureType` values the cell emitted.

The project target, from the plan: **no mode/level cell may exceed 25% share.** Today
**32 of 220 cells (15%) meet it**; the mean cell share is **53%**.

## Headline numbers

| metric | baseline |
|---|---|
| cells within the 25% target | 32 / 220 (15%) |
| mean max-signature share | 53% |
| cells at 100% (one single prompt shape) | 36 |
| distinct `structureType` values, app-wide | **0** |
| distinct `subskill` values, app-wide | 56 |
| generator errors across 110,000 calls | 0 |

### The `structureType` finding

**No generator in the app emits a `structureType`.** The field exists in
`createQuestionMetadata()` (`src/modes/itemMetadata.js`) and defaults to `null`; grepping
`src/modes/` finds no other file that passes it. Every "distinct structures" column in the tables
below therefore reads `0`, and that is a real measurement, not a bug in the reporter.

This is precisely the gap M1 (structure engine) exists to close. Until then, **distinct signatures
is the working proxy for structural variety**, and it is the column to watch.

## Worst offenders

Seven modes have at least one level where **100% of 500 generated items share one prompt shape** —
a child at that level sees exactly one problem, forever, with the numbers swapped.

| rank | mode | worst cell | mean share | 100% levels | distinct sigs |
|---|---|---|---|---|---|
| 1 | `numberBonds` | **100%** @ L1-L6 | 94% | 1-6 | 1 → 2 |
| 2 | `counting` | **100%** @ L1-L6 | 90% | 1-6 | 1 → 2 |
| 3 | `skipCounting` | **100%** @ L1-L6 | 89% | 1-6 | 1 → 2 |
| 4 | `addition` | **100%** @ L1-L6 | 88% | 1-6 | 1 → 3 |
| 5 | `subtraction` | **100%** @ L1-L6 | 88% | 1-6 | 1 → 2 |
| 6 | `comparing` | **100%** @ L1-L6 | 88% | 1-6 | 1 → 3 |
| 7 | `placeValue` | **100%** @ L1 | 48% | 1 | 1 → 4 |

Notes on the pattern:

- **The L6/L7 cliff is an artifact of one rule, not of design.** Six of these modes jump from 100%
  to ~70% exactly at level 7, because `chooseFamily()` downgrades every `application` roll to
  `procedural` below level 7. Word problems are the only source of prompt variety these modes have,
  and they are switched off for the first six levels. Levels 1-6 are where the youngest users live.
- **`addition` confirms the plan's prediction.** It produces 3 signatures across 500 items at its
  best level and 1 at its worst — the plan predicted "~3 signatures across 500 items".
- **`numberBonds` is the worst overall** (94% mean). Its three subskills produce identical output,
  as the plan's Phase 3 notes suspected; the report confirms it quantitatively.
- **Declared subskills do not create variety.** Every mode above declares 3 subskills and emits all
  3, yet still lands at one prompt shape. Subskill is a metadata tag that does not branch rendering.

### The two modes that already pass

`dataGraphs` (4% mean) and `linesShapes` (10% mean) are the only modes with zero failing cells —
but **do not read this as health**, and do not use them as the model to copy:

| mode | sigs @ L1 | distinct answers @ L1 | sigs @ L10 | distinct answers @ L10 |
|---|---|---|---|---|
| `linesShapes` | 8 | **5** | 72 | **12** |
| `dataGraphs` | 63 | **9** | 143 | **21** |

Both score well because they phrase a very small item pool many different ways. `linesShapes` has
**5 distinct answers at level 1 and 12 at level 10** — the plan's "10 total items, `level` unused"
assessment is correct, and low signature share hides it. Signature share is a necessary metric, not
a sufficient one; **answer-pool size is the companion metric** for these modes, and the reporter
tracks it (`minDistinctAnswers` / `maxDistinctAnswers` in `--json`).

## Per-mode summary

Sorted worst-first by max signature share.

| mode | worst share | mean share | failing cells | distinct sigs (min-max) | distinct answers (min-max) | subskills | families | structs |
|---|---|---|---|---|---|---|---|---|
| `numberBonds` | 100% (L1) | 94% | 10/10 | 1-2 | 9-83 | 3 | 3 | 0 |
| `counting` | 100% (L1) | 90% | 10/10 | 1-2 | 3-41 | 3 | 3 | 0 |
| `skipCounting` | 100% (L1) | 89% | 10/10 | 1-2 | 4-11 | 3 | 3 | 0 |
| `addition` | 100% (L1) | 88% | 10/10 | 1-3 | 6-88 | 3 | 3 | 0 |
| `subtraction` | 100% (L1) | 88% | 10/10 | 1-2 | 3-41 | 3 | 3 | 0 |
| `comparing` | 100% (L1) | 88% | 10/10 | 1-2 | 3-3 | 3 | 3 | 0 |
| `placeValue` | 100% (L1) | 48% | 10/10 | 1-4 | 10-305 | 3 | 3 | 0 |
| `multiplication` | 70% (L3) | 56% | 10/10 | 2-3 | 6-431 | 3 | 3 | 0 |
| `division` | 69% (L2) | 55% | 10/10 | 2-3 | 3-12 | 3 | 3 | 0 |
| `barModels` | 58% (L6) | 45% | 10/10 | 2-4 | 29-411 | 2 | 3 | 0 |
| `angles` | 54% (L1) | 52% | 10/10 | 2-3 | 33-34 | 2 | 3 | 0 |
| `areaPerimeter` | 54% (L4) | 46% | 10/10 | 2-4 | 16-120 | 2 | 3 | 0 |
| `time` | 54% (L3) | 51% | 10/10 | 2-3 | 12-12 | 2 | 3 | 0 |
| `placeValueDiscs` | 53% (L4) | 49% | 10/10 | 2-3 | 375-493 | 2 | 3 | 0 |
| `money` | 53% (L5) | 46% | 10/10 | 2-4 | 101-174 | 2 | 3 | 0 |
| `factorsMultiples` | 51% (L6) | 46% | 10/10 | 4-6 | 34-50 | 2 | 3 | 0 |
| `patterns` | 38% (L1) | 31% | 9/10 | 3-10 | 35-57 | 3 | 3 | 0 |
| `decimals` | 37% (L1) | 32% | 8/10 | 3-6 | 12-98 | 3 | 3 | 0 |
| `measurement` | 29% (L4) | 23% | 5/10 | 5-10 | 24-55 | 2 | 3 | 0 |
| `fractions` | 28% (L3) | 24% | 6/10 | 4-8 | 14-53 | 4 | 3 | 0 |
| `linesShapes` | 19% (L3) | 10% | 0/10 | 8-77 | 5-12 | 2 | 3 | 0 |
| `dataGraphs` | 5% (L2) | 4% | 0/10 | 63-150 | 9-21 | 2 | 3 | 0 |

Ten modes declare only 2 subskills, below the project's own documented ≥3 minimum:
`barModels`, `angles`, `areaPerimeter`, `time`, `placeValueDiscs`, `money`, `factorsMultiples`,
`measurement`, `linesShapes`, `dataGraphs`.

## Per-cell detail

Each cell reads `maxShare / distinct signatures / distinct structureTypes`.
Cells at or below the 25% target are the goal; today almost none are.

| mode | L1 | L2 | L3 | L4 | L5 | L6 | L7 | L8 | L9 | L10 |
|---|---|---|---|---|---|---|---|---|---|---|
| `numberBonds` | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 86% / 2 / 0 | 86% / 2 / 0 | 88% / 2 / 0 | 85% / 2 / 0 |
| `counting` | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 73% / 2 / 0 | 75% / 2 / 0 | 77% / 2 / 0 | 78% / 2 / 0 |
| `skipCounting` | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 70% / 2 / 0 | 74% / 2 / 0 | 72% / 2 / 0 | 69% / 2 / 0 |
| `addition` | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 72% / 3 / 0 | 71% / 3 / 0 | 70% / 3 / 0 | 68% / 3 / 0 |
| `subtraction` | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 69% / 2 / 0 | 69% / 2 / 0 | 72% / 2 / 0 | 68% / 2 / 0 |
| `comparing` | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 100% / 1 / 0 | 71% / 2 / 0 | 67% / 2 / 0 | 69% / 2 / 0 | 69% / 2 / 0 |
| `placeValue` | 100% / 1 / 0 | 50% / 2 / 0 | 55% / 2 / 0 | 36% / 3 / 0 | 38% / 3 / 0 | 34% / 3 / 0 | 51% / 2 / 0 | 53% / 2 / 0 | 37% / 3 / 0 | 29% / 4 / 0 |
| `multiplication` | 68% / 2 / 0 | 65% / 2 / 0 | 70% / 2 / 0 | 66% / 2 / 0 | 66% / 2 / 0 | 66% / 2 / 0 | 40% / 3 / 0 | 38% / 3 / 0 | 39% / 3 / 0 | 38% / 3 / 0 |
| `division` | 67% / 2 / 0 | 69% / 2 / 0 | 65% / 2 / 0 | 63% / 2 / 0 | 67% / 2 / 0 | 63% / 2 / 0 | 37% / 3 / 0 | 41% / 3 / 0 | 37% / 3 / 0 | 37% / 3 / 0 |
| `barModels` | 50% / 2 / 0 | 51% / 2 / 0 | 50% / 2 / 0 | 54% / 2 / 0 | 52% / 2 / 0 | 58% / 2 / 0 | 35% / 4 / 0 | 34% / 4 / 0 | 35% / 4 / 0 | 33% / 4 / 0 |
| `angles` | 54% / 2 / 0 | 52% / 2 / 0 | 51% / 2 / 0 | 52% / 2 / 0 | 54% / 2 / 0 | 51% / 2 / 0 | 52% / 3 / 0 | 53% / 3 / 0 | 46% / 3 / 0 | 52% / 3 / 0 |
| `areaPerimeter` | 51% / 2 / 0 | 51% / 2 / 0 | 52% / 2 / 0 | 54% / 2 / 0 | 50% / 2 / 0 | 51% / 2 / 0 | 37% / 4 / 0 | 39% / 4 / 0 | 37% / 4 / 0 | 37% / 4 / 0 |
| `time` | 53% / 2 / 0 | 51% / 2 / 0 | 54% / 2 / 0 | 52% / 2 / 0 | 52% / 2 / 0 | 53% / 2 / 0 | 46% / 3 / 0 | 49% / 3 / 0 | 53% / 3 / 0 | 50% / 3 / 0 |
| `placeValueDiscs` | 50% / 2 / 0 | 51% / 2 / 0 | 52% / 2 / 0 | 53% / 2 / 0 | 53% / 2 / 0 | 52% / 2 / 0 | 45% / 3 / 0 | 42% / 3 / 0 | 49% / 3 / 0 | 46% / 3 / 0 |
| `money` | 52% / 2 / 0 | 52% / 2 / 0 | 51% / 2 / 0 | 51% / 2 / 0 | 53% / 2 / 0 | 51% / 2 / 0 | 38% / 4 / 0 | 39% / 4 / 0 | 40% / 4 / 0 | 39% / 4 / 0 |
| `factorsMultiples` | 51% / 4 / 0 | 48% / 4 / 0 | 50% / 4 / 0 | 48% / 4 / 0 | 47% / 4 / 0 | 51% / 4 / 0 | 43% / 6 / 0 | 42% / 6 / 0 | 39% / 6 / 0 | 42% / 6 / 0 |
| `patterns` | 38% / 3 / 0 | 34% / 3 / 0 | 34% / 3 / 0 | 34% / 3 / 0 | 35% / 3 / 0 | 34% / 3 / 0 | 25% / 10 / 0 | 25% / 10 / 0 | 26% / 10 / 0 | 26% / 10 / 0 |
| `decimals` | 37% / 3 / 0 | 34% / 3 / 0 | 36% / 3 / 0 | 37% / 3 / 0 | 34% / 3 / 0 | 36% / 3 / 0 | 27% / 6 / 0 | 24% / 6 / 0 | 26% / 6 / 0 | 25% / 6 / 0 |
| `measurement` | 25% / 5 / 0 | 28% / 5 / 0 | 25% / 5 / 0 | 29% / 5 / 0 | 26% / 5 / 0 | 26% / 5 / 0 | 17% / 10 / 0 | 20% / 10 / 0 | 18% / 10 / 0 | 22% / 10 / 0 |
| `fractions` | 26% / 4 / 0 | 27% / 4 / 0 | 28% / 4 / 0 | 27% / 4 / 0 | 27% / 4 / 0 | 27% / 4 / 0 | 20% / 8 / 0 | 18% / 8 / 0 | 19% / 8 / 0 | 18% / 8 / 0 |
| `linesShapes` | 18% / 8 / 0 | 17% / 8 / 0 | 19% / 8 / 0 | 8% / 17 / 0 | 8% / 17 / 0 | 11% / 17 / 0 | 4% / 76 / 0 | 5% / 74 / 0 | 5% / 77 / 0 | 5% / 72 / 0 |
| `dataGraphs` | 4% / 64 / 0 | 5% / 63 / 0 | 4% / 63 / 0 | 5% / 64 / 0 | 4% / 63 / 0 | 5% / 63 / 0 | 4% / 150 / 0 | 4% / 146 / 0 | 4% / 149 / 0 | 3% / 143 / 0 |

## Reproducing

```sh
npm run bank:variety                      # full sweep, 500 samples/cell (~15s)
npm run bank:variety -- --mode addition    # one mode
npm run bank:variety -- --samples 2000     # tighter confidence
npm run --silent bank:variety -- --json    # machine-readable
```

Generation is unseeded, so shares move by roughly ±2 percentage points between runs. Treat
differences under 5 points as noise; the 100%-share cells are stable because they are structural.

### Methodology notes

- Modes are called as `generate(level)` with **no context argument**, which is the
  worst-case-variety path a real session can take. Generators that consume `context.targetSubskill`
  or `context.itemFamily` will show more variety when the session engine steers them; this baseline
  deliberately measures the floor.
- Generators are called inside a try/catch and null returns are counted; **0 errors occurred across
  all 110,000 calls**, so no cell in this baseline is distorted by a failed generator.
- A few modes (`counting`, `skipCounting`) render from a structured payload rather than a
  `promptText`. For those the reporter synthesizes a signature from the display shape
  (`promptTextOf()`), so they are not flattered by having no text to compare.
- Share is computed over samples that produced a signature, not over all samples, so a mode that
  intermittently emits an unsignaturable payload is not credited for it.

## Next

Per the plan, add the ≤25% signature-share gate to CI as **warn-only** first — at 15% passing,
enforcing it today would fail almost every cell. Re-run this report at each milestone exit; M1's
stated exit criterion is ≥20 distinct signatures per operation mode, against the 1-3 measured here.
