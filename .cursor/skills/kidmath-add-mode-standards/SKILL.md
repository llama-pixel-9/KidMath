---
name: kidmath-add-mode-standards
description: Add a new KidMath mode using the project's K-5 standards-conformance system. Use when the user asks to add a new math mode, new question type, or extend mode generation, adaptivity, distractors, docs, and tests in a standards-aligned way.
---

# KidMath Add-Mode Standards Skill

Use this skill whenever creating or extending a math mode in KidMath.

## Goal

Ship new modes that match KidMath principles:
- K-5 standards alignment
- conceptual + procedural + application balance
- cognitive-science-informed practice (spacing/interleaving)
- diagnostic adaptivity by subskill
- assessment validity and accessibility

## Required Principles (Non-Negotiable)

1. **Three item families**
   - Implement `conceptual`, `procedural`, and `application` families.
   - Keep application/story items constrained by readability policy (currently advanced levels unless user asks otherwise).

2. **Metadata-first generation**
   - Every generated item must include `metadata` via `createQuestionMetadata(...)`.
   - Include: `modeId`, `gradeBand`, `domain`, `cluster`, `subskill`, `itemFamily`, `mathPractices`, `misconceptionTags`, `blueprintId`.

3. **Subskill granularity**
   - Define at least 3 meaningful `subskills` for the mode.
   - Avoid generic subskills like `hard`/`easy`.

4. **Misconception-aware distractors**
   - Do not use only random offsets.
   - Include misconception-linked distractor logic (directly or via `src/modes/distractors.js`).

5. **Adaptive compatibility**
   - Mode must work with `mathEngine` family scheduling, weakest-subskill targeting, retry context, and word-problem toggle behavior.

6. **UI readability**
   - Prompts must be concise, grade-appropriate, and visually scannable.
   - Avoid long text blocks for early levels.

7. **Validation and tests**
   - Add/update tests so mode coverage and constraints are verifiable.
   - Ensure choices include exactly one correct answer and uniqueness.

## KidMath File Map to Update

- Mode implementation:
  - `src/modes/<newMode>.js`
  - `src/modes/index.js` (register mode)
- Mode blueprint registry:
  - `src/modes/blueprints.js`
- Metadata/quality/distractor support (if needed):
  - `src/modes/itemMetadata.js`
  - `src/modes/itemQuality.js`
  - `src/modes/distractors.js`
- Engine integration (if behavior requires):
  - `src/mathEngine.js`
- UI hooks:
  - `src/HomePage.jsx` (feature list copy if needed)
  - `src/MathExplorer.jsx` and/or `src/PrintableWorksheet.jsx` (display shape support)
- Documentation:
  - `docs/mode-coverage-map.md`
  - `docs/mode-blueprints.md`
  - `docs/standards-rubric.md` (if principle changes)
- Tests:
  - `src/__tests__/modes.spec.js`
  - `src/__tests__/sessionEngine.spec.js`

## Implementation Workflow

Copy this checklist and keep it updated:

```md
Add Mode Progress:
- [ ] Define mode intent and K-5 scope
- [ ] Define 3+ subskills
- [ ] Implement generate() with 3 item families
- [ ] Add metadata to every item
- [ ] Add/plug misconception-aware distractors
- [ ] Register mode in modes/index.js
- [ ] Support display shape in explorer/worksheet UI
- [ ] Update blueprints and coverage docs
- [ ] Add/update tests for family coverage + quality constraints
- [ ] Run lint/tests and fix failures
```

### Step 1: Mode design

Define:
- `id`, labels, icon, operator
- standards mapping (`domain`, `cluster`, refs)
- 3+ subskills
- readability policy for application items

### Step 2: Generator contract

Mode export should include:
- `subskills`
- `families`
- `generate(level, context)`
- `generateChoices(answer, question)` (when custom logic is needed)

### Step 3: Metadata contract

Use `createQuestionMetadata(...)` on each returned question object.

### Step 4: Distractor strategy

Use existing helpers first:
- `buildArithmeticDistractors`
- `buildSequenceDistractors`
- `buildComparingDistractors`

If new distractor patterns are needed, extend `src/modes/distractors.js`.

### Step 5: Engine and UI compatibility checks

Verify:
- `question.display` shape renders in `MathExplorer` and `PrintableWorksheet`.
- `itemFamily` and `subskill` are present so adaptivity works.
- story/application behavior respects settings and level policy.

### Step 6: Documentation updates

Add mode entries in:
- `docs/mode-blueprints.md`
- `docs/mode-coverage-map.md`

### Step 7: Tests

At minimum:
- mode appears in registry
- generator emits valid metadata
- all item families appear over sampling
- choices are unique and include correct answer
- settings constraints (like word-problem policy) are honored

## Acceptance Criteria

A mode is complete only when all are true:
- registered and reachable in UI
- metadata-valid items generated
- misconception-aware distractors implemented
- docs updated
- tests pass for affected suites
- no regression in adaptivity/retry behavior

## Output Format When Using This Skill

When reporting completion, provide:
1. files changed
2. principle-by-principle checklist status
3. test commands run and outcomes
4. any trade-offs or deferred items
