# Comparing bank — design

Built 2026-08-20 (batch tag `b0821`, 1,511 items). Same recipe as
`docs/numberbonds-bank-design.md` / `docs/counting-bank-design.md`.
Pattern catalog: `.claude/skills/comparing-mode-ui`.

## Source survey (structure only, zero copied wording)

- **GK M3 E–H**: the matching-strategy ladder (1:1 match → line up → count →
  compare numerals); more/fewer/same language; "enough?" checks; both-ways
  sentence frames; comparing sounds/sets/numerals.
- **G1 M4 Topic B**: symbol introduction sequence (greater/less words →
  alligator mouth → bare symbol, mouth eats the bigger number); digit
  reversals (13/31) and the big-digit trap (29 vs 32); mixed standard/unit
  forms; place-value-first reasoning.
- **G2 M3 F–G**: three-digit compares across standard/word/expanded/unit
  form; non-standard units (9 tens vs 88, 13 tens 2 ones vs 132); more/less
  by 1/10/100 with any slot unknown; equality as a real answer.

## Payload conventions (enforced by the `compareMath` QC check)

- Symbol answers: `op: "?"` renders the `a ? b` layout; numeric `a`/`b`
  verified by the gate; expression/unit-form sides are strings, re-derived by
  the assembler; pictured rows use `display.compare = {kind:"counts", a, b}`
  with glyph verification (numeric a/b would trip the prose-numbers rule).
- Numeric answers: `display.compare` claims — difference / gap /
  oneMoreLess / closerTo / midpoint.
- Judged items: Yes/No + `display.truth` ("Is this right?" register).
- Family rule: letter-free or pure-symbolic forms (drills, expression and
  unit-form compares, judged symbol claims) are PROCEDURAL; conceptual prose
  always carries a rotating name and/or noun (signature caps).

## Generator repairs shipped with this bank

`benchmarkCompare` had no procedural variety at any band (level-leak class):
added the `targetedOnly` `benchmarkDrill` + band-preserving subskill
fallback in `src/modes/comparing.js`.

## Verified

All 27 cells ≥ 50; level-1 no-words procedural requests 90/90 bank-served,
0 verbal; bank:variety 10/10.
