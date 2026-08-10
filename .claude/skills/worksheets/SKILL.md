---
name: worksheets
description: How flight-log worksheets are generated, laid out and printed — the paper rules, page-fit budgets, print pipeline, and the tests that guard them. Use when changing worksheet generation, the /worksheets screen, print CSS, or anything a sheet renders.
---

# Flight-log worksheets

Premium launch feature (#34). One sheet = one skill: Part A (warm up),
Part B (write the answer), Part C (one thought problem). Generation is
`generateFlightLog` in `src/mathEngine.js` (shared with iOS); layout is
`src/PrintableWorksheet.jsx`; print CSS is the `@media print` block in
`src/index.css` (US Letter portrait, 0.375in margins).

## The paper rules (engine-enforced)

- **No screen verbs.** Every drawn question passes `printableWording`
  ("Tap the number…" → "Write the number…"); anything still carrying
  tap/press/drag/swipe after rewording is rejected. Rewording happens
  BEFORE dedupe keying.
- **No degenerate prompts.** A numeric answer appearing verbatim in its
  own prompt ("Mark 0.7 on the number line") is unprintable — the widget
  was the question.
- **Option banks only where the options ARE the question**
  (`printOptionBank`): non-numeric answers, "which…/NOT…" items, and
  estimation ("About how many") keep their bank; plain numeric answers
  get only the blank box.
- **Judgment items** (Yes/No choices, `isYesNoJudgment`) print as
  "Circle one: Yes / No" — no bank, no box. The answer key thickens the
  correct circle.
- **Figures print.** Any item with `display.figure` draws its chart
  (grayscale, ≤240px) — Part C included; a graph question without its
  graph is unanswerable on paper.
- **Template variety**: prompt sheets cap each `structureType` at 2 per
  sheet (`capStructures` in `drawUnique`); computation sheets are exempt
  (a page of stacked sums shares one structure by design).

## Page-fit budgets (measured, not guessed)

| Sheet kind | Part A | Part B | Why |
|---|---|---|---|
| Computational (`+ − × ÷`) | 6 stacked | 4 inline | one line each |
| Prompt modes | 4 | 4 | prompts run 2–3 lines |
| Figure modes (`dataGraphs`) | 2 | 2 | a chart is ~15 lines tall |

`log.itemCount` is the real total — the footer's "Landed ☐ of N" and any
copy must use it, never a hard-coded 11. **The budgets are validated by
Chromium's own print pipeline**: `e2e/worksheets.spec.js` renders via
`page.pdf()` and asserts N logs + N keys = exactly 2N PDF pages. If a
layout change makes a sheet spill, that test fails — shrink the budget
or the layout, don't delete the assertion.

## Generate screen

Mode grid → level (aria-label "Level N") → number of logs (aria-label
"N logs") → **Include Word Problems** (threads
`{ allowWordProblems }` into `generateFlightLog`; off = no story Part C
and no application items) → Include Answer Key → Generate → Print
(`window.print()`).

## Tests

- `src/__tests__/worksheets.spec.js` (in the `npm run test` list): paper
  rules across all 22 modes × L1/5/10 — screen verbs, answer-reveals,
  bank policy, budgets, story exclusion, figure presence, dedupe.
- `e2e/worksheets.spec.js`: real-UI generation + PDF page counts +
  language sweep. Headless-only (`page.pdf`). Run with
  `KIDMATH_E2E_PORT=5199 npx playwright test worksheets`.

## Traps

- The paywall is OFF in dev (`VITE_PAYWALL_ENABLED` unset) — that's why
  e2e can reach /worksheets anonymously. Don't "fix" that.
- §15 brand rule: every mark on a sheet is 100% black. Figures get
  `filter: grayscale(1)`; keep new marks black.
- The answer key prints as its OWN sheet (`breakBefore`), same grid.
- `page.pdf()` needs `preferCSSPageSize: true` or the `@page letter`
  rule is ignored.
