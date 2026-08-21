# skipCounting bank — design

Built 2026-08-20 (batch tag `b0821`, 1,414 items). Same recipe as the
numberBonds/counting/comparing builds; assembler uses the shared
`scripts/itemGen/bankAssembler.js`. Pattern catalog:
`.claude/skills/skipcounting-mode-ui`.

## Source survey (EngageNY G2-M6 + G3-M1; structure only)

Steps actually taught: 2s/5s/10s (G2), 3s/4s/6s (G3), with 25s/50s/100s as
app extensions (100s named in 2.NBT.2 but unexercised in the modules —
flagged as derived). The G3-L20 Sprint gives the difficulty ladder for
missing terms: blank-last-forward < last-backward < middle-forward <
middle-backward < first-backward < boundary-crossing. Even/odd lives in the
by-2s membership work. Equal groups → unit form ("4 twos") → skip count →
equation is the load-bearing transition chain. Clock/nickel contexts are
deferred to G2 M7-M8 — our story items using coins are labeled derived.

## Payloads

op "count" + `display.counting` claims (countMath): sequences {next},
missing middles {between} (the check was generalized to the midpoint rule so
skip gaps verify), missing starts {moreLess}, totals {sum}, two-jumps
{countOn}. Slips carry `display.pattern = {start, step, badIdx}` for the
assembler. Judged = Yes/No + display.truth.

## Hard lessons encoded

- Band-1 prompts may state nothing above 20 (bandAppropriate) — the item()
  helper throws at build time.
- "5 + 5 = ?" belongs to the addition bank; repeated addition starts at 3
  addends. Unit-form drills ("4 twos = ?") replace sequence-to-total runs,
  which collided with patternRule sequence strings.
- Number-only conceptual prose can't satisfy the 5-per-signature cap —
  every conceptual phrasing carries a rotating child name.

## Generator repairs

`targetedOnly` drills `midBlankDrill` (stepInference, bands 1-3) and
`repeatedAdditionDrill` (groupsToProduct procedural) + the band-preserving
subskill fallback in `src/modes/skipCounting.js`.

## Verified

All 27 cells ≥ 50; level-1 no-words procedural 90/90 bank-served, 0 verbal;
bank:variety 10/10.
