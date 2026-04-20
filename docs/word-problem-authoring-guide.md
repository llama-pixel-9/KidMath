# KidMath Item Authoring Guide

This guide governs every item in the curated item bank. The bank now covers
all three families (`conceptual`, `procedural`, `application`) across three
level bands (`K-1`, `2-3`, `4-5`), for 216 `(mode x subskill x family x band)`
cells total.

Application items live in `src/itemBank/applicationItems.js`.
Conceptual items live in `src/itemBank/conceptualItems.js`.
Procedural items live in `src/itemBank/proceduralItems.js`.
All three are aggregated by `src/itemBank/bundle.js` and delivered through
the same Supabase table (`public.item_bank`).

## Sourcing Principles

- Use public framework structures as a reference (CCSS Math Progressions,
  Illustrative Math problem types, IES practice guidance).
- Textbook patterns may inspire structure and pedagogy, but **wording must be
  original or paraphrased**. Do not lift sentences from copyrighted material.
- Each item should match a documented `structureType` (see catalog below).

## Structure Catalog

Use the closest matching `structureType` when authoring an item:

### Addition / Subtraction
- `joinResultUnknown` — start, change known, result unknown.
- `joinChangeUnknown` — start known, change unknown, result known.
- `partPartWhole` — two parts known, total unknown.
- `separateResultUnknown` — start known, take-away known, result unknown.
- `separateChangeUnknown` — start known, take-away unknown, result known.
- `compareDifferenceUnknown` — two amounts compared, difference unknown.

### Multiplication / Division
- `equalGroupsTotalUnknown` — number of groups and per-group amount known.
- `arrayTotalUnknown` — rows × columns array.
- `partitiveDivision` — total split into equal groups; per-group unknown.
- `quotitiveDivision` — total split into groups of a known size; group count unknown.

### Comparing
- `compareNumbers` — choose `<`, `>`, or `=` between two contextual amounts.

### Counting
- `countObjects` — quantity stated; student confirms cardinality.

### Skip Counting
- `patternNext` — short sequence given; ask for the next term.

### Place Value
- `buildFromUnits` — assemble a number from a stated tens/ones decomposition.

## Language and Style Rules

- Maximum prompt length: **220 characters**.
- One sentence is preferred; at most two short sentences.
- Use one clear question target. Avoid multiple questions in one item.
- Use concrete nouns (apples, baskets, books, students). Avoid abstract scenarios.
- Use proper names sparingly (Sam, Mina, Luca, Nia, Theo, Ava). Vary across items.
- Avoid pronouns that can be ambiguous (no "they had" without a clear referent).
- Avoid extra narrative: skip story decoration that does not affect the math.
- Avoid culturally narrow contexts. Prefer school, garden, library, kitchen,
  sports, and library settings.
- Numbers in the prompt must match the question payload (`a`, `b`, `answer`).
- No unresolved placeholders (no `{...}` or template tokens in `promptText`).

## Anti-Patterns (Reject)

- Hidden multi-step demands ("she then doubled it ...").
- Distractor numbers in the prompt that don't appear in the math.
- Ambiguous comparators ("more than a few", "around 20").
- Idioms or figurative language ("a ton of apples").
- Negative framing that flips the operation unexpectedly ("how many fewer
  did NOT come?").

## Required Item Fields

Every bank item must include:

```
itemId              // unique, kebab-case, e.g. "addition-app-014"
modeId              // mode id (addition | subtraction | ...)
itemFamily          // "conceptual" | "procedural" | "application"
subskill            // matches mode subskill list
structureType       // from catalog above
levelRange          // [minLevel, maxLevel] integers (K-1=1-3, 2-3=4-6, 4-5=7-10)
reviewStatus        // "draft" | "reviewed" | "approved" | "retired"
representationType  // optional, one of:
                    //   numberLine, tenFrame, array, placeValueBlocks,
                    //   decomposition, objectSet, sequence, symbolic,
                    //   verbalContext
source              // optional JSON { name, url, license, fetchedAt,
                    //                 exemplarId, generator }
question.answer
question.display    // see Display Contract per Family below
```

For arithmetic modes also set `a`, `b`, `op` consistent with the math.
Numeric consistency (`a op b === answer`) is enforced by `validateBankItem`.

## Display Contract per Family

Application items must include `display.promptText` (<=220 chars, no
unresolved `{...}` placeholders). They are delivered primarily as word
problems.

Conceptual and procedural items must include at least one of:
- `display.promptText` (same rules), or
- `display.representation` from the supported allowlist, or
- a structural shape field (`sequence`, `number`, `tens`, `array`, `count`,
  or `type`) that the corresponding renderer in `MathExplorer` /
  `PrintableWorksheet` understands.

This lets a conceptual `addition/makeTen/K-1` item render as a ten-frame,
a procedural `multiplication/equalGroups/2-3` item render as `3 x 4 = ?`,
and an application `subtraction/differenceAsDistance/4-5` item continue to
render as a word problem.

## Review Workflow

1. **Draft** — author writes the item, either in Supabase directly or via
   the LLM draft pipeline (`scripts/itemGen/`). `reviewStatus=draft`.
2. **Review** — peer pedagogical/language review in the admin Review queue;
   promote to `reviewed`.
3. **Approve** — final QA + accessibility pass; promote to `approved`.
   Approved items are the only ones the engine will deliver to learners.
4. **Retire** — items that perform poorly (very high or very low success
   across many students) move to `retired` and are excluded from delivery.

The Review queue in the admin UI sorts pending items by the cell gap they
fill, so approving the top of the queue naturally closes the thinnest
cells first.

## Coverage Targets

Phase 1 floor (required for merge after Phase 0 foundation):

- Each `(modeId, subskill, itemFamily, levelBand)` cell must have at least
  **3 approved items**. Enforced by
  `KIDMATH_ENFORCE_CELL_COVERAGE=1` on the `test:coverage` script, rolled
  out mode-by-mode via `KIDMATH_COVERAGE_MODE=<modeId>`.
- Each mode with multiple structure types (`addition`, `subtraction`,
  `multiplication`, `division`) must use at least **2 different
  `structureType`s**. Always enforced.

Phase 2 healthy threshold:

- Each cell reaches **8 approved items** for rotation + exposure cooldown.
- Single-source exposure share under **X%** of 1000-session simulation
  (threshold TBD once production analytics land).

## Quality Checks Run Automatically

- `validateBank()` in `src/itemBank/index.js` enforces:
  - required fields present
  - valid `levelRange`
  - valid `itemFamily`
  - family-appropriate display shape (promptText for application,
    representation/structural shape for conceptual/procedural)
  - numeric consistency when `a`, `b`, `op` are present
  - no duplicate `itemId` or `promptText`
- The draft pipeline (`scripts/itemGen/validateDrafts.js`) adds:
  - license allowlist check against the exemplar source,
  - batch-local duplicate prompt detection,
  - deterministic itemId minting per cell.

Coverage gates and bank validity are asserted in tests
(`src/__tests__/itemBank.spec.js` and
`src/__tests__/itemBankCoverage.spec.js`). Run the report with
`npm run bank:report` or the heatmap in the admin Coverage tab.
