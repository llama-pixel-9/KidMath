---
name: counting-mode-ui
description: How Counting Chicks (counting) presents questions on screen — object-set figures, emoji-run prompts, ten frames, sequence number lines, and the QA hooks for reproducing a reported item. Use when changing how counting (or any emoji-run / judgment-format item) renders.
---

# Counting mode UI

Shaped by issues #29 (PR #30) and #32 (PR #33). The generator is
`src/modes/counting.js` (variety catalog); everything visual happens in
`src/MathExplorer.jsx` `QuestionDisplay` + widgets.

## Display payload shapes and where they render

| Payload | Renderer | Rules learned |
|---|---|---|
| `display.{emoji,count}` | emoji-figure branch | Rows of TEN with a five-and-five split (`ml-3` on index 5) — never a free-wrapping cloud. Sai: "always show groups of ten." Subitize mixes dots (🟠) with `OBJECTS` icons — all-dots reads monotonous. |
| `display.{sequence,step}` | sequence branch + `SequenceNumberLine` | Unit-step sequences (±1) draw a static SVG number line: shown numbers plotted (accent), target ringed (warm) labeled "?" until reveal. Skip-counting/patterns are EXCLUDED on purpose — non-unit jumps need arc arrows to read honestly. |
| `display.numberLine.marks` | verbal branch + `SequenceNumberLine` | Count-on items ("Start at 6 and count on 5 more") draw the same line: start plotted, landing ringed "?". Format transforms replace `display` wholesale, so re-dressed items correctly lose the line. |
| emoji runs inside `promptText` ("Group A: 🍪🍪…") | `src/promptLayout.js` → verbal branch | Question sentences render ABOVE; object lines below as the picture; labels start at the same x (`w-fit mx-auto text-left`); runs chunk into rows of ≤10 keeping authored sub-groups; run glyphs get `letterSpacing: 0.18em` so objects don't touch. Renderer-side so bank items are covered too. |
| `display.subPrompt` | resolved as `q.subPrompt ?? q.display?.subPrompt` | Format transforms put the instruction in `display`. Reading only the top-level field silently dropped "Is this right?" on EVERY judgment item (#32's worst bug). |
| `answerType: "tenFrame"` | `src/components/TenFrame.jsx` | Count mode has a `pad-display` readout; the submit key ALWAYS reads "Go" (it used to echo the typed entry / "(N added)", which leaked answers). Both Go buttons use kit `PAD_GO`. |

## Language rules

- Judgment items ask **"Is this right?"** with **Yes/No** — never
  "True or false?" (not first-grader language). App-wide: the format
  cluster + numberBonds/skipCounting/comparing/placeValue/fractions.
- Changing these strings changes engine output → regenerate parity
  fixtures (`scripts/generateParityFixtures.mjs`) and update
  `formats.spec.js` / `m4*.spec.js` oracles.

## Reproducing a reported item

- `?qaVariety=<varietyId>` (DEV) forces one generator variety AND skips
  the bank — without it the bundled bank preempts most varieties and you
  can replay sessions forever without seeing the reported shape.
  Threaded via `createAdaptiveSession({qaVariety})` → `getNextQuestion`.
- Regression + screenshot spec: `e2e/issue29Screens.spec.js`
  (`npx playwright test issue29Screens`); shots land in
  `test-results/issue29/`.

## Traps

- **e2e port**: `playwright.config.js` reuses ANY server on the port —
  including another checkout's (the open-world worktree usually holds
  5173). Run `KIDMATH_E2E_PORT=5199 npm run test:e2e` to guarantee you
  test THIS checkout.
- **Choice grids**: the e2e driver fails the run if the engine's answer
  is missing from the rendered grid (`missingFromChoices`) — don't
  weaken that; it's the only screen-level guard for broken option sets.
- An engine-side sweep for "answer missing from choices" already exists
  conceptually: generate with forced varieties and assert
  `q.choices.some(c => checkAnswer(q, c))`. The bank equivalent must
  paginate (supabase caps at 1,000 rows).
