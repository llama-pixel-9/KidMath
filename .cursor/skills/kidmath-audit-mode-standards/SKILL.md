---
name: kidmath-audit-mode-standards
description: Audit an existing KidMath mode against the project's K-5 standards-conformance principles. Use when reviewing mode quality, checking regressions, or deciding if a mode is release-ready.
---

# KidMath Audit-Mode Standards Skill

Use this skill to evaluate an existing mode and produce an actionable audit.

## Goal

Determine whether a mode is compliant with KidMath standards and identify exact fixes needed before release.

## Audit Dimensions

Score each dimension from `0-2`:
- `0` = missing / broken
- `1` = partial / inconsistent
- `2` = complete / reliable

Dimensions:
1. Standards alignment
2. Family balance (conceptual/procedural/application)
3. Subskill quality
4. Metadata completeness
5. Distractor quality (misconception-aware)
6. Adaptive engine compatibility
7. Accessibility/readability
8. Test coverage and enforceability

## Required Checks

1. **Registry and discoverability**
   - Mode is registered in `src/modes/index.js`
   - Appears in UI flows where expected

2. **Generator contract**
   - Mode exports `generate(level, context)`
   - Declares `subskills` and `families`
   - Produces stable question shape

3. **Metadata integrity**
   - Uses `createQuestionMetadata(...)`
   - Includes required fields and valid values

4. **Question-family behavior**
   - All 3 families appear over sampling
   - Application/story policy follows readability settings/level constraints

5. **Distractors**
   - Choices are unique
   - Correct answer included
   - Distractors reflect plausible misconceptions, not only random noise

6. **Adaptive compatibility**
   - Subskills can be tracked by `mathEngine`
   - Retry context works without dropping display/metadata fidelity

7. **UI rendering**
   - Prompt/display renders correctly in:
     - `src/MathExplorer.jsx`
     - `src/PrintableWorksheet.jsx`

8. **Tests**
   - Mode is covered by:
     - `src/__tests__/modes.spec.js`
     - `src/__tests__/sessionEngine.spec.js` (when applicable)

## KidMath Files to Inspect

- `src/modes/<mode>.js`
- `src/modes/index.js`
- `src/modes/blueprints.js`
- `src/modes/itemMetadata.js`
- `src/modes/itemQuality.js`
- `src/modes/distractors.js`
- `src/mathEngine.js`
- `src/MathExplorer.jsx`
- `src/PrintableWorksheet.jsx`
- `docs/mode-blueprints.md`
- `docs/mode-coverage-map.md`
- `src/__tests__/modes.spec.js`
- `src/__tests__/sessionEngine.spec.js`

## Audit Workflow

Copy and fill:

```md
Mode Audit Progress:
- [ ] Collect mode and registry files
- [ ] Sample generation output across levels
- [ ] Validate metadata and family coverage
- [ ] Inspect distractor quality
- [ ] Verify adaptivity/retry compatibility
- [ ] Verify UI display compatibility
- [ ] Review docs and tests alignment
- [ ] Produce scored report + fix list
```

### Sampling Guidance

- Generate at least 60 items across levels (`1-10`) for family/subskill checks.
- Explicitly verify lower levels for readability and word-problem policy.

## Output Format

Return this exact structure:

1. **Verdict**
   - `PASS`, `PASS WITH RISKS`, or `FAIL`

2. **Scorecard**
   - One line per audit dimension with `score/2`

3. **Critical Findings**
   - Highest-risk issues first
   - Include file paths and concrete evidence

4. **Required Fixes Before Release**
   - Numbered, actionable list

5. **Optional Improvements**
   - Nice-to-have enhancements

6. **Validation Plan**
   - Tests/commands needed to confirm fixes

## Pass Criteria

A mode passes only if:
- no dimension is `0`
- total score is at least `13/16`
- tests exist for family coverage and choice correctness
- no accessibility/readability blocker remains
