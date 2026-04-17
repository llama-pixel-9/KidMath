# KidMath K-5 Hybrid Standards Rubric

This rubric operationalizes KidMath question generation requirements across content, pedagogy, cognitive science, adaptivity, and assessment quality.

## Standards Inputs

- CCSS Math Progressions (2023), with emphasis on `CC`, `OA`, and `NBT` strands for K-5.
- NCTM Effective Mathematics Teaching Practices (reasoning, representation, discourse prompts, purposeful questioning, evidence use).
- IES WWC elementary mathematics practice guidance (systematic instruction, representations, cumulative review, word-problem structure support).

## Required Design Principles

1. **Conceptual + Procedural + Application Balance**
   - Each mode must include all three item families.
   - Session-level family distribution target: conceptual 25-40%, procedural 30-50%, application 20-35%.
2. **Mathematical Practice Evidence**
   - Every generated item must carry `mathPractices` metadata with at least one of: `MP1`, `MP2`, `MP4`, `MP6`, `MP7`.
3. **Representation Connections**
   - Every mode must support at least two representation types across families (symbolic, verbal context, sequence, object model, decomposition).
4. **Diagnostic Usefulness**
   - Each item must be tagged with a `subskill` and `misconceptionTags`.
   - Distractors must be misconception-linked, not random-only.
5. **Adaptive Integrity**
   - Progression decisions must account for subskill mastery, not only streak and response speed.
   - Review items must preserve full item context and support spaced re-exposure.
6. **Assessment Quality**
   - One unambiguously correct answer.
   - Plausible distractors with at least two misconception-based options.
   - Grade-appropriate language and no construct-irrelevant complexity.

## Item Metadata Requirements

Each generated question must provide:

- `metadata.modeId`
- `metadata.itemFamily` (`conceptual`, `procedural`, `application`)
- `metadata.gradeBand` (`K-1`, `2-3`, `4-5`)
- `metadata.domain` and `metadata.cluster`
- `metadata.subskill`
- `metadata.mathPractices[]`
- `metadata.representation`
- `metadata.cognitiveDemand`
- `metadata.misconceptionTags[]`
- `metadata.blueprintId`
- `metadata.itemKey` (deterministic retry identity)

## Release Gates

A mode is release-ready only if all are true:

1. Family coverage present across sampled generation runs.
2. Item metadata is complete and valid for every sampled item.
3. Distractors pass plausibility checks and contain misconception-linked candidates.
4. Retry delivery preserves original prompt/display fidelity.
5. Weakest-subskill targeting appears in adaptive selection logs.
