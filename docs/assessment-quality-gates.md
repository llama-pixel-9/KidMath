# Assessment Quality Gates

Release checks for question generation updates:

## Gate 1: Standards and Metadata

- 100% of generated items include required metadata fields.
- All items map to a known `itemFamily` and `subskill`.
- `mathPractices` and `standardRefs` are non-empty.

## Gate 2: Item and Distractor Quality

- Exactly one correct answer appears in choices.
- All choices are unique.
- Distractors include misconception-informed candidates.
- Item wording remains grade-appropriate and concise.

## Gate 3: Adaptive Behavior

- Retry queue preserves full item context (`display`, `metadata`, `mode`, `itemKey`).
- Adaptive targeting selects weakest subskill over a session.
- Family scheduling cycles across conceptual/procedural/application.

## Gate 4: Regression Tests

- `npm run test` passes.
- `npm run lint` passes.
- Sampling checks show family coverage in each mode.
