# KidMath Word-Problem Authoring Guide

This guide governs every item in the curated word-problem item bank
(`src/itemBank/applicationItems.js`). All `application` family items shipped
to students should originate from this bank.

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
itemId         // unique, kebab-case, e.g. "addition-app-014"
modeId         // mode id (addition | subtraction | ...)
itemFamily     // "application"
subskill       // matches mode subskill list
structureType  // from catalog above
levelRange     // [minLevel, maxLevel] integers (currently 7-10)
reviewStatus   // "draft" | "reviewed" | "approved" | "retired"
question.answer
question.display.promptText
```

For arithmetic modes also set `a`, `b`, `op` consistent with the math.

## Review Workflow

1. **Draft** — author writes the item with `reviewStatus: "draft"`.
2. **Review** — peer pedagogical/language review; promote to `reviewed`.
3. **Approve** — final QA + accessibility pass; promote to `approved`.
4. **Retire** — items that perform poorly (very high or very low success
   across many students) move to `retired` and are excluded from delivery.

## Coverage Targets (Phase 1)

- Each `(modeId, subskill)` pair must have at least **3 approved items**.
- Each mode should have at least **2 different `structureType`s** represented
  across its approved items.
- Validation script asserts the above before merge.

## Quality Checks Run Automatically

- `validateBank()` in `src/itemBank/index.js` enforces:
  - required fields present
  - valid `levelRange`
  - non-empty, in-bounds `promptText`
  - no duplicate `itemId` or `promptText`

Coverage gates and bank validity are also asserted in tests
(`src/__tests__/itemBank.spec.js`).
