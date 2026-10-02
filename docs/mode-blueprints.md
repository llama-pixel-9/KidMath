# KidMath Mode Blueprints

Each mode uses three item families in every level band.

## Family Definitions

- `conceptual`: models/structure, unknowns, decomposition, pattern reasoning.
- `procedural`: direct computation or symbol selection fluency.
- `application`: contextualized word/scenario prompts.

## Blueprint Requirements

- Every generated item sets `metadata.blueprintId`.
- Every mode includes at least 3 subskills.
- Every level band (`K-1`, `2-3`, `4-5`) should be able to emit every family the
  mode declares — all three, except the topics with no word problems
  (`conceptual` and `procedural` only): Math Facts, and addition, subtraction,
  Bar Models and Number Bonds, whose v1 stories were retired on 2026-10-02.

## Mode Blueprint IDs

- `addition-{family}-{makeTen|composeDecompose|unknownAddend}`
- `subtraction-{family}-{differenceAsDistance|decomposeToSubtract|unknownSubtrahend}`
- `multiplication-{family}-{equalGroups|arrayReasoning|factFluency}`
- `division-{family}-{partitioning|inverseFact|unknownQuotient}`
- `comparing-{family}-{symbolSelection|benchmarkCompare|distanceCompare}`
- `counting-{family}-{subitizing|countOn|cardinality}`
- `skipCounting-{family}-{patternRule|stepInference|groupsToProduct}`
- `placeValue-{questionType}-{tensOnes|expandedForm|regroupingSense}`
