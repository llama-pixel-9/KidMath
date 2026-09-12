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

## Question pattern catalog (bank batch b0821 — every structureType, by family)

Bank design: `docs/counting-bank-design.md`. Bands: K-1 counts ≤20 ·
2-3 teens/decades · 4-5 to 120.

### Procedural — letter-free drills (numeric-first; serve in the no-words path)

| structureType | Bands | Asks | Example |
|---|---|---|---|
| `smallSetRead` / `fiveGroupRead` | K-1 | read a small set / a 5-group at a glance | `🟠🟠🟠 = ?` · `🟠🟠🟠🟠🟠 🟠 = ?` |
| `tenFrameRead` / `twoFrameRead` | K-1 / 2-3 | how many counters in the frame(s) | frame widget + pad |
| `tenAndMoreRead` / `doubleFiveRead` | 2-3 | teen as a full ten-row + extras / two five-rows | `🟠×10 \| 🟠🟠 = ?` |
| `tensRowsRead` | 4-5 | count rows of ten + rest, to 50 | 3 rows + 4 = 34 |
| `setCountWrite` / `teenSetWrite` / `bigSetWrite` | K-1/2-3/4-5 | count the pictured set, type the numeral | `🍎🍎🍎🍎 = ?` |
| `countOutOnFrame` / `countOutTeenOnFrames` | K-1 / 2-3 | PRODUCTION: match pictured objects 1:1 on the frame | build-mode frame |
| `arrayCount` | 4-5 | equal rows counted | 4 rows of 6 emoji |
| `nextNumber` / `countBackNext` | K-1 | next in a ±1 run | `8, 9, 10, ?` |
| `nextAcrossDecade` / `backAcrossDecade` | 2-3 | decade seam both ways | `28, 29, 30, ?` |
| `nextWithinDecade` / `backWithinDecade` | 2-3 | inside-decade runs | `22, 23, 24, ?` |
| `nextAcrossHundred` / `backAcrossHundred` | 4-5 | the 100/110/120 seams | `99, 100, 101, ?` |
| `countOnFromGiven` / `countOnFromTwoDigit` / `countOnBigJump` | all | count on n from a start (number-line scaffold) | "Start at 37 and count on 6 more…" |
| `subitizeDrill` / `bigSetWriteDrill` (generator, targetedOnly) | all / 4-5 | in-band figure reads for scheduled requests | figure + pad |

### Conceptual — pictured judgment & reasoning (wording rotates; ≤5/signature)

| structureType | Bands | Asks | Example |
|---|---|---|---|
| `sameNumberJudge` | K-1 | conservation: two arrangements, same count? | "Group A … Group B … same number of dots?" |
| `whichShowsN` / `whichShowsTeen` | K-1 / 2-3 | pick the card showing N | choices are emoji runs |
| `claimCountJudge` / `claimTeenJudge` / `claimTensRowsJudge` | K-1→4-5 | a child claims a count of the pictured set — right? | "Sam says 5 dots: 🟠🟠🟠🟠🟠 Is Sam right?" |
| `fiveAndMoreSee` / `tenAndMoreSee` / `tensAndOnesSee` | K-1→4-5 | structured reads (5+n, 10+n, tens+ones) | "A full ten of stars and some more: …" |
| `estimateThenCount(Big)` | 2-3 / 4-5 | about how many (choices are tens) | jar of pictured dots |
| `oddOneOutCount` / `oddOneOutTeen` | 2-3 / 4-5 | which card does NOT show N | 3 representations + 1 off-by-one |
| `rowsToNumeral` | 4-5 | rows of ten → numeral choice | distractors ±10, ±1 |
| `missingInRun` / `missingAcrossDecade` / `missingAcrossHundred` | all | beep! the blank moves through the run | "96, 97, 98, ___, 100" |
| `oneMore/oneLess(Decade/Hundred)` | all | ±1 at plain numbers, then at seams | "1 more than 99?" |
| `betweenTwo/Decade/Hundred` | all | the number between | "99, ___, 101" |
| `tenFrameMakeTen` | K-1 | build to 10, submit how many you added | build-mode frame |
| `countOnJudge` / `decadeCrossingJudge` / `centuryCrossingJudge` | all | is this count right? (recount-from-1, 29→40, 109→120 slips) | "Ben counts: 27, 28, 29, 30. Is that right?" |
| `countSet` / `countTeenSet` / `lastNumberSaid` / `rearrangedSet` | K-1 / 2-3 | how many; last number said IS the count; conservation | "…What number does Mina say last?" |
| `compareTwoSets/TeenSets/BigSets` | all | which group has more/fewer (pictured) | two emoji groups |
| `tenFrameEmpty` | K-1 | empty cells = complement | frame + pad |
| `doubleCountError` / `skippedOneError` (+`Big`) | 2-3 / 4-5 | fix a double-count / skip (picture present, then reasoned) | "counted one twice — really?" |
| `mixedSetCount` | 4-5 | count only the target kind in a mixed run | "Only count the apples: 🍎🎈🍎…" |
| `bigCountJudge` | 4-5 | judge a claimed big count | rows of ten pictured |

### Application — stories (≤3/signature; names+nouns rotate)

| structureType | Bands | Situation |
|---|---|---|
| `storyCountOn` | all | had N, counted M more — what number now |
| `storyTargetGap` | all | needs T, has H — how many more |
| `storyHiddenCount` | all | T in all, S visible — how many hidden |
| `storyTwoSpots` / `storyCountAllKinds` | all / K-1 | count across two places / count everything on the mat |
| `storyExtraneous` | K-1→4-5 | count only the named kind (a number must NOT be used) |
| `storyBagsOfTen` | 2-3, 4-5 | bags of ten + loose ones |
| `storyQuickLook` / `storyDicePair` / `storyFlashCard` / `storyDotCards` | K-1 / 2-3 | subitize-in-context: five-stacks, dice, flashed cards |
| `storyQuickRows` | 2-3, 4-5 | ten-strips seen at a glance + singles |
