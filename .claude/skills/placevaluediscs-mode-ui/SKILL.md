# placeValueDiscs mode — UI + bank patterns

Generator: `src/modes/placeValueDiscs.js`. Bank batch `b0821` (1,406 items;
see `docs/placevaluediscs-bank-design.md`). Subskills: `readNumber`,
`tradeRegroup`, `discOperations`. Band magnitudes: K-1 = tens+ones mats,
prose ≤20; 2-3 = hundreds; 4-5 = thousands.

## Rendering notes

- The disc mat renders via `answerType: "placeValueDiscs"` +
  `display.cols: [{place, count}, …]` (`src/components/PlaceValueDiscs.jsx`
  through `widgetRegistry.js`). The widget is READ-ONLY — the child types
  the value; there is no drag interaction.
- Visual mat items use the letter-free caption register
  (`10 10 | 1 1 = ?`) so they pass `isVerbalPrompt` (<6 letters) and serve
  when word problems are filtered out (the numbers-only early levels).
- `topPlace` is banded 10/100/1000 — do not restore the old `level<=3 →
  100` mapping (level-1 kids drew 999 mats). The `chooseVariety` targeted
  fallback is band-preserving; keep it that way.

## Question pattern catalog

### procedural (auto-approved)

**readNumber** — `matReadTeens`/`matRead` visual mats, caption
"10 10 | 1 1 = ?" · `matReadReversed` ones listed first ("1 1 | 10 10 = ?")
· `matReadHundreds` "100 100 | 10 | 1 1 = ?" · `tensOnlyBig` ten+ tens
discs, no ones · `matReadThousands` with 1000-discs · `buildDiscCount(Big)`
"Build 347 with discs: hundreds discs = ?" · `discWorth` "In 2473, all the
hundreds discs together are worth ?"

**tradeRegroup** — `overfullMat(Reversed/Big/Thousands)` visual mats whose
ones (or tens) column holds >9 discs — reading them IS the regroup ·
`tradeOnesDrill` "14 ones discs = 1 tens disc + ? ones discs" ·
`tensFromOnes` "20 ones discs = ? tens discs" · `onesFromTens` "2 tens
discs = ? ones discs" · `renameDrill` "34 = 2 tens discs + ? ones discs" ·
`asTensDrill` "340 = ? tens discs" · `tradeTensDrill` "30 tens discs = ?
hundreds discs" · `renameHundredsDrill` "2400 = ? hundreds discs" ·
`mixedRenameDrill` "3 hundreds discs + 24 tens discs = ?" ·
`tradeHundredsDrill` "40 hundreds discs = ? thousands discs"

**discOperations** — `plusTenDisc`/`plusOneDisc`/`minusOneDisc`/
`minusTenDisc`/`plusTwoOnesDiscs`/`plusTwoTensDiscs` "14 + 1 tens disc = ?"
· `discMove(Big/Thousands)`/`multiDiscMove` "347 - 1 hundreds disc = ?",
"493 + 3 tens discs = ?" · `discDropSeq(Big)` "Discs: 40, 50, 60 → ?"
(distinct string register from skipCounting's "Count by 10s:") ·
`equalMats(Big)` "3 mats each show 2 tens discs and 4 ones discs. All the
mats together = ?"

### conceptual (reviewed; named prose)

**readNumber** — `whichNumberMat(Big/Th)` "Mina puts 3 discs of ten and 4
discs of one on the mat. Which number is that?" (digit-swap +
disc-count-as-digit distractors) · `readJudge(Big)` "Kai counts a mat of 1
disc of ten and 3 discs of one as 4. Is Kai right?" (false read = counted
discs, ignored values) · `compareMats(Big)` "Ava compares two mats. Mat A
shows …. Which mat shows the bigger number?" (tens must beat a pile of
ones) · `zeroColumnJudge` "…no tens discs. Theo writes 47. Is Theo right?"
(No — 407; the zero-column skip) · `discWorthCompare` "one thousands disc
vs 9 hundreds discs — who holds more value?"

**tradeRegroup** — `canTradeJudge` "Nia has 14 ones discs. Can Nia trade 10
of them for a tens disc?" · `valueUnchangedJudge(Big)` "…trades 10 ones for
1 ten on a mat showing 16 and says it now shows 6. Is that right?" (the
trade keeps the value) · `whichTrade(Big)` "The ones column holds 13 discs.
Which trade fixes it?" (choices incl. wrong-direction trades) ·
`predictTradeJudge(Big)` "Before adding 26 + 38 with discs — will the ones
need a trade? Decide without adding." · `tensOnlyPlan` "show 340 using only
tens discs — which count works?" · `tradeKeepsValueBig` "says the number
changed after a ten-for-hundred trade. Is that right?" (No)

**discOperations** — `plusDiscWhich`/`minusDiscWhich`/`moveWhichMid`/
`moveWhichThousands` "mat shows 15, adds 1 tens disc — which number now?"
(wrong-place distractor) · `nextDiscCount(Mid)` "drops tens discs and
counts 10, 20 — what number for the next disc?" · `equalMatsPlan` "builds
the same mat 3 times — what total?" · `errorNoTrade` "wrote 7 tens 15 ones
side by side — what is the real answer?" · `dealShares` "deals 69 into 3
equal shares, trading when needed"

### application (reviewed; beans/pages/laps/tokens modeled with discs)

`storyDiscsNeeded(±Ones/Tens)` "Sam counts 14 beans and shows the number
with discs. How many ones discs does Sam need?" · `storyMatRead(OnesFirst/
Big)` "shows today's laps with 3 tens discs and 4 ones discs — how many
laps?" · `storyLooseOnes(Big)` "earns 47 ones discs, trades every 10 — how
many stay loose?" · `storyTensOut` "…how many tens discs does she get?" ·
`storyHundredsOut` tens→hundreds trades · `storyNextTrade(Small)` "has 234
ones discs — how many more until the next full trade at 240?" ·
`storyScoreMove`/`storyBigScoreMove`/`storyMultiMove` "the mat shows 247
beans; one more hundreds disc goes on" · `storyCombineMats` "pushes a mat
of 12 and a mat of 5 together" · `storyDropCount(Mid)` counting up by
disc drops · `storyEqualMats` game setups · `storyShareMats` dealing a mat
into equal mats

## Traps learned building this bank

- The mat caption must stay under 6 letters or the item stops serving in
  no-words mode — the author script hard-fails captions with ≥6 letters.
- Band-1 disc-drop counts can only speak "10, 20" (answer 30 is fine; a
  spoken 30 is not).
- `nounlessQuestion` rejects "How many in each share?" — name the thing
  ("What number does each share show?").
- Un-named compare prompts blow the conceptual signature cap (names are
  what differentiate signatures) — every conceptual phrasing carries a
  rotating child name.
- Band-2 prose stating 3-digit numbers draws advisory `bandAppropriate`
  warnings; accepted deliberately (matches the generator and 2.NBT).
