---
name: robot-kid-e2e
description: The Playwright robot-kid smoke matrix (e2e/) — how to run it, how the kid oracle and widget drivers work, why it reads pixels instead of engine answers, and the traps (AnimatePresence stale cards, glyph mismatch, bank-vs-generator payloads). Use when running, extending, or debugging e2e tests, or adding a new answer widget.
---

# Robot-kid e2e suite

## What it is and how to run it

```bash
npm run test:e2e                                  # full matrix: 22 modes × L1/L5, ~90s
npx playwright test --grep "addition L5"          # one cell
npx playwright test --grep "money" --repeat-each=4  # stochastic hunting
```

44 tests: every mode × levels 1 and 5, one full 15-question session each,
answered through the REAL rendered widgets in headless Chromium. Files:
`e2e/robotKid.spec.js` (matrix + oracles + assertions), `e2e/drivers.js`
(per-answerType widget drivers), `playwright.config.js` (6 workers, reuses a
running dev server on 5173 or starts one).

**Dev server only, by design.** The suite depends on DEV-gated hooks that are
stripped from production builds (`import.meta.env.DEV`). Never try to point it
at a prod build or Vercel URL.

## The four assertions per session

1. **Render**: every question puts something visible in front of the kid
   (text in the question card, or an svg/img/canvas in main).
2. **Kid oracle** — the load-bearing one: when the question card's rendered
   DOM text forms a pure symbolic claim ("19+14?" vertical grid, "? + 7 = 11",
   "5 ? 3 = 8", bare "24?42" comparisons), the robot computes the answer FROM
   THE PIXELS like a human and submits that. The app must score it correct. A
   kid-computed answer missing from the choice grid is its own failure.
3. **Plumbing fallback**: word problems / figures (letters in the claim →
   oracle abstains) submit the engine's own answer through the widget; it must
   score correct. This catches widget input plumbing and broken choice sets —
   but can NEVER catch display-vs-scoring divergence (the engine agrees with
   itself by construction). That asymmetry is the whole reason the kid oracle
   exists; Sai called it out and he was right.
4. **Hygiene**: session completes (retries included), zero pageerrors, zero
   console.error (Supabase anonymous 401/403 and vite chatter are ignored).

## The DEV hooks (src/MathExplorer.jsx)

- `?qaFeedbackMs=120` — shortens the 1.2s/2s feedback pauses; a session drops
  from ~40s to ~5s. Never ship a session at real timing in this suite.
- `window.__kidmathQA` — mirrors `{ question, isRetry, seq, result: {correct,
  submitted, count}, done }`. Updated in loadNextQuestion / submitAnswer /
  finishSession via `qaUpdate()`.
- `data-qa-seq` attribute on the question card (the `motion.section` with
  aria-label "Math question") — see the AnimatePresence trap below.

## Traps learned the hard way (do not relearn these)

**AnimatePresence stale cards.** The question card uses
`AnimatePresence mode="wait"`: the EXITING card — previous question PLUS its
revealed answer — stays in the DOM while the new card waits to enter. Reading
"the question card" naively returns junk like "12 − 5" + reveal "7" →
"12−57". Also, the QA hook updates seq synchronously in loadNextQuestion,
BEFORE React commits. Both races are closed the same way: the card is stamped
with `data-qa-seq={seq}` at render, and the spec waits for
`[aria-label="Math question"][data-qa-seq="${seq}"]` to exist and reads
exactly that node. If you add another animated question surface, stamp it.

**Glyph normalization.** The kid computes "−" (U+2212); a button may render
"-" (hyphen). `normalizeLabel()` in drivers.js folds −/–/- before comparing.
The kid oracle likewise normalizes −×÷ and treats _/■ as the unknown mark.

**Widget input is not uniform.** Most typed widgets share the kit digit pad
(buttons "0"–"9" + "Submit answer"), but coinTray count mode and shapeFigure
count mode use TEXTBOXES ("Total in cents", "Your answer"), shapeFigure
select needs a "Check" press after picking, numberLine ticks are transparent
SVG circles clicked by geometry (viewBox 320×96, PAD 18, x = 18 + t·284,
baseY 62), and coinTray build mode needs exact subset-sum over the tray.
When adding a widget: give its controls real aria-labels, then add a driver
case; the generic submit finder tries "Submit answer", "Check", "Go".

**Bank vs generator payloads (why one green run proves little).** Bank
unknown-slot items ship `b: null`; only template-GENERATOR fallback items
(served when a bank cell is thin) carry both a/b numeric with answer ≠ a op b
— the "19 + 14 → 5" class. A handful of sessions may never draw one, so a
green matrix does not clear that class by itself. The layers that do:
the isVertical unit test (deterministic), simulateKid's display-consistency
check (sweeps the generator headlessly), and this suite whenever such an item
is served.

## Extending

- New mode → add its id to MODES in robotKid.spec.js (mirrors
  src/modes/index.js MODE_IDS; there is no import because the spec runs
  without the app's resolve hook).
- New answer widget → aria-labels first, driver case second, then run
  `--grep` on a mode that serves it. A stuck session + error-context
  snapshot in test-results/ shows exactly which widget the driver
  couldn't operate.
- New symbolic prompt shape → extend kidOracle() patterns; keep the
  letters-present → null guard, it is what keeps the oracle honest on word
  problems.

## Sibling harnesses

`npm run test` (490 unit) · `scripts/simulateKid.mjs` (headless persona sim +
bank audit + drift; see scripts header for flags) · `npm run test:engine`
(web↔iOS engine parity). iOS UI has NO robot kid — engine parity only.
