---
name: worksheets
description: How printable worksheets are generated, laid out and printed — the skill catalog, the bank-first draw, the title-is-a-promise rule, paper rules, measured page-fit budgets, and the tests that guard them. Use when changing worksheet generation, the /worksheets screen, the skill catalog, print CSS, or anything a sheet renders.
---

# Worksheets

Premium launch feature (#34). User-facing name is **"worksheets"**, never
"flight log" — parents search for worksheets (`worksheetRename.spec.js`
guards the copy). The old mode + level generator (`generateFlightLog`) is
gone on both platforms.

A parent picks **grade → topic → skill → problem type → sheets** (Sai
asked for the topic step explicitly: one long grouped list was too much to
scan). There is no mode
grid and no "Level" anywhere, on screen or on paper. One sheet = one skill
= **one layout**.

## The skill catalog (`src/worksheets/`)

- `skills.js` + `promptSkills.js` — pure data, ~294 skills across all 25
  topics, K–5. Each: `id, grade, mode, ccss[], title, layout, source,
  stories, level`. `grade` is the grade of `ccss[0]`; `ccss` may be empty
  (calendars, early coins, repeating patterns — we never invent a code).
  CCSS is cited by code only; every title is our own wording.
  `TOPIC_LABELS` are plain names ("Subtraction"), never game names.
- **A title is a promise about every problem on the sheet.**
  `worksheetSkills.spec.js` holds each skill to it, across all three
  problem types. "Subtract 3-digit numbers with regrouping" may not print
  380 − 35 (the original level-10 sheet did).
- Two source kinds:
  - `bank` — a filter over approved bank cells (`families, subskills,
    structureTypes, levels, numbers`). **Everything worded comes from the
    bank**, drawn without replacement, never generated, no fallback: a
    thin pool returns `shortfall` and the screen disables the option.
    Worksheets were the last surface still on the generators.
  - `computation` — bare `a op b`, built to the claim by
    `computationSampler.js` (digits, regrouping column by column, tables,
    remainders, across zeros). The one exception to bank-first: neither the
    generators nor the bank can promise "3-digit with regrouping", there is
    no wording to review, and the number space is unbounded.
- `claimCheck.js` — `checkItems(items, claim)`: the independent honesty
  check, plus `storyMatches` (number size always; regrouping/tables only
  when the story payload is a plain `a op b = answer` — change-unknown
  stories keep their numbers in other slots).
- `generateWorksheet(skillId, { problemType, seenKeys })` →
  `{ layout, items, wordProblems, itemCount, requested, shortfall }`.
  `problemType`: `practice` | `stories` | `mixed`. Share one `seenKeys`
  across a print run so five sheets are five different sheets.
- **Authoring a skill**: run `npm run worksheets:audit` (every bank cell:
  printable count, how it lands on a sheet, number sizes, avg prompt
  length, samples → `docs/worksheet-skill-audit.md` with `--md`). Read
  the skill off the table — never guess a title. Pool must cover 3 sheets.

## Layouts and budgets (`layouts.js`) — measured, not guessed

| layout | grid | practice | mixed | for |
|---|---|---|---|---|
| `stacked` | 4 col | 24 | 16 | ≤3-digit ±, n-digit × 1-digit |
| `stackedWide` | 3 col | 12 | 9 | 4-digit, 2×2-digit (partial-product room) |
| `horizontal` | 3 col | 36 | 24 | facts: `7 × 8 = ☐` |
| `longDivision` | 3 col | 12 | 6 | bracket + work space — never stacked like a subtraction |
| `prompt` | 2 col | 10 | 8 | worded, 2–3 lines, option banks |
| `promptShort` | 2 col | 16 | 10 | worded one-liners (audit avg chars ≲ 45) |
| `figure` | 2 col | 4 | 2 | bar graph, pictograph, tally, disc mat, coordinate grid |
| `figureSmall` | 2 col | 6 | 4 | clock face, rectangle, cube stack |
| `stories` | 2×3 boxes | 6 | — | word problems only (2, one column, if pictured) |

`layoutForClaim` fixes the layout of computation skills (multi-digit
stacks, facts go sideways, division gets a bracket). **A figure layout
prints only pictured items; every other layout only un-pictured ones** —
a budget cannot hold for a mix. Stories likewise print all-pictured or
all-plain (`storyPlan`). `workSpace`/`rowGap` are part of the fit: a
sheet should FILL its page, not strand the bottom third.

The budgets are validated by Chromium's own print pipeline:
`e2e/worksheets.spec.js` renders via `page.pdf()` and asserts N sheets +
N keys = exactly 2N pages. `WORKSHEETS_E2E_ALL=1` prints every skill ×
problem type (~900 cases, minutes) — run it after ANY change to a
layout, an item component, or the catalog. If a sheet spills, shrink the
budget or the layout; never delete the assertion.

## The paper rules

- **No screen verbs.** `printableWording` ("Tap the number…" → "Write the
  number…"); anything still carrying tap/press/drag/swipe is rejected.
- **No degenerate prompts.** A numeric answer printed in its own prompt
  ("Mark 0.7 on the number line") is unprintable.
- **No pointing at a missing picture.** An un-pictured item that says
  "this clock / this chart / shown" is rejected — on screen the answer
  widget drew it; paper has no widget.
- **Figures print** (`getPaperFigure`: `display.figure`, or the rectangle
  the areaPerimeter bank implies). Grayscale with the contrast pushed
  (on-screen tints print as pale ghosts otherwise), ≤240px. Two-mat disc
  items are excluded (`ONE_MAT`): twice the height of everything else.
- **Clocks print numbered** (`ClockFace numbered`, passed via `ctx.paper`;
  iOS `ClockFaceView(numbered:)`): numerals, minute track, black hands. The
  on-screen dotted face is unreadable on paper — no way to tell which dot is
  12, and the minute hand's tip reads as a thirteenth dot.
- **Option banks only where the options ARE the question**
  (`printOptionBank`); judgment items print "Circle one: Yes / No".
- §15 brand rule: every mark on a sheet is 100% black.

## The screen (`src/PrintableWorksheet.jsx`)

Grade chips (default: active kid's grade, else last used) → topic tiles
(plain names, only the grade's topics) → that topic's skills, each row
title + CCSS code →
Problems (Computation|Practice · Word problems · Mixed) → sheets → answer
key → Generate → Print. Picking a skill calls `ensureModeLoaded`; Generate
waits for it. `capacityFor` disables what the LOADED bank cannot fill,
with the reason. `document.title` is set to the skill so the PDF is named
for it. The screen reads the household word-problem preference as a
default and **never writes it**. DEV exposes `window.__larkitWorksheets =
{ sheets, skillId, problemType }`. `WorksheetSheet.jsx` is exported piece
by piece so the public worksheet pages can share the renderer.

## Tests

- `worksheetSkills.spec.js` — catalog integrity + every skill × 3 problem
  types keeps its promise AND the paper rules, pools cover 3 sheets, one
  kind of item a sheet.
- `computationSampler.spec.js`, `worksheetRename.spec.js`.
- iOS: `ios/KidMath/Views/WorksheetView.swift` (same picker) and
  `WorksheetPDF.swift` (same layouts, web CSS px × 548/744 so the measured
  budgets hold; `naturalHeight` is the page-fit check). Both go through
  `worksheetCatalog` / `worksheetCapacity` / `generateWorksheetRun` in
  `nativeEntry.js`. Topics iOS cannot play (volumeCoordinates) are hidden.
  `WorksheetTests.swift` pins layout, claim, remainders-on-key, page fit and
  orientation (ImageRenderer draws straight into PDF space — do NOT flip).
- Deep links: `/worksheets?skill=<id>&type=practice|stories|mixed&sheets=N&key=0&go=1`;
  old `?mode=&level=` lands on the nearest skill (`skillForModeLevel`). The
  screen rewrites the address as choices change, so it is always shareable.
- `e2e/worksheets.spec.js` — real UI + PDF page counts. Headless-only.
  `KIDMATH_E2E_PORT=5199 npx playwright test worksheets`.
- All new specs are in the hand-maintained `npm run test` list.

## Traps

- Without Supabase (local dev, e2e) the mode fetch fails; DEV then reads
  `fullBank.js` from disk through a dynamic import that is compiled out of
  production. The production bundle must never carry the corpus — check
  `dist/` after touching `loadTopic`.
- `finalizeQuestion` keeps the generator scaffold's `itemFamily`; the bank
  draw re-stamps the bank row's.
- Bank story `op` is Unicode (`−`, `×`, `÷`); normalize with `asciiOp`.
- The paywall is OFF in dev (`VITE_PAYWALL_ENABLED` unset) — that's why
  e2e can reach /worksheets anonymously. Don't "fix" that.
- The answer key prints as its OWN sheet (`breakBefore`), same grid.
- `page.pdf()` needs `preferCSSPageSize: true` or `@page letter` is ignored.
- The unmerged marketing branch has its own `src/worksheets/catalog.js` +
  `SeoSheet.jsx`; it should adopt this catalog and `WorksheetSheet.jsx`.
  Stay off its filenames.
