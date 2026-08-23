# grade-4 completion bank design (batch b0823)

886 authored items closing the Grade-4 holes the 2026-08-23 curriculum
assessment found (kid-sim plan, Phase 1). Deterministic, no LLM; every answer
re-derived by `scripts/itemGen/authorGrade4.js` from the rendered prompt via
`expected()`, assembled and gated by the shared `bankAssembler.js`.

```bash
node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorGrade4.js --tag b0823 [--write]
```

| Mode | Cell | levelRange | proc / conc / app |
|---|---|---|---|
| division | **remainders** (new subskill, 4.OA.3 / 4.NBT.6) | [7,10] | 64 / 60 / 60 |
| placeValue | **rounding** (new subskill, 3.NBT.1 / 4.NBT.3) | [4,6] + [7,10] | 108 / 108 / 108 |
| multiplication | multi-digit (4.NBT.5) into factFluency / equalGroups / arrayReasoning | [8,10] | 54 / 108 / — |
| addition | multi-digit with regrouping (4.NBT.4) into composeDecompose / unknownAddend | [8,10] | 54 / 54 / — |
| subtraction | multi-digit (4.NBT.4) into decomposeToSubtract / unknownSubtrahend | [8,10] | 54 / 54 / — |

## Registers & conventions

- **Remainders keep single-number answers** (no new widget): letter-free drills
  `86 ÷ 5 = ? r 1` / `86 ÷ 5 = 17 r ?`, judged claims ("…leaves 3 left over.
  Is that right?"), bounded-leftover reasoning, and two story shapes — leftover
  (`answer = p mod d`) and round-up (`answer = ⌈p ÷ d⌉`, the vans/boxes
  interpretation the OA Progressions calls out). `b` is null in the payload so
  the position-agnostic trio rule never misreads `p = d·q + r`.
- **Rounding avoids midpoints** (the tie convention is taught, not tested
  here); band 2 is tens within 99, band 3 rounds up to six digits to tens /
  hundreds / thousands. No comma grouping in prompts — every `\d+` parser in
  the QC toolchain would split "31,355".
- **Multi-digit ± requires regrouping** by construction (ones or tens column
  carries); sums stay ≤ 999.
- Conceptual cells carry ≥ 11 phrasings each (signature cap is 5 per cell);
  application phrasings vary by name × noun × holder.
- The generator mirrors all of this at L7–10 (remainder structures in
  `multiplicativeStructures.js`, `multiplicativeQuantities` two-digit bands,
  `MAX_TOTAL` to 1000, placeValue rounding varieties) as the fallback and the
  worksheets source; the bank rows above are what sessions actually serve.

## Structural inspirations (no verbatim text)

CCSS 4.OA.3, 4.NBT.3–6, 3.NBT.1–2; EngageNY G4 M1/M3 and G3 M1/M2 (structure
only, wording original); OA Progressions on remainder interpretation.

## Review

Procedural, conceptual and application were all auto-approved with the batch
(deterministic templates, gate-verified, answers re-derived) — flagged in the
PR for Sai's spot-check; per-item Retire in `/admin` is the rollback.
