# dataGraphs mode — UI + bank patterns

Generator: `src/modes/dataGraphs.js`. Bank batch `b0821` (1,836 items; see
`docs/datagraphs-bank-design.md`). Subskills: `readBar`, `compareBars`,
`pictograph`, `dataAnalysis`. Bands: K-1 = bars ≤9 (totals ≤20), key-1
pictographs; 2-3 = ≤14, keys 2/5; 4-5 = ≤20, key 10.

## Rendering notes

- Bar items: `answerType:"barGraph"` + `display.bars` (four
  distinct-valued bars — the author script hard-fails ties and non-4-bar
  graphs). Tally: `figure:"tallyChart"` + rows{label,count}. Pictograph:
  `figure:"pictograph"` + keyValue + rows{label,symbols}.
- `selectVariety` keeps family subordinate to band (leak fix) with the
  in-band subskill fallback.
- Level-1 procedural serving: 90/90 bank items (graph prompts are short
  enough to pass the verbal filter in most cases; the picture carries the
  question).

## Question pattern catalog

### procedural (auto-approved)

**readBar** — `barRead_*` "The pet fair graph: how many kittens?" (per-band
phrasings) · `barMax_*`/`barMin_*` "Find the tallest bar… How many votes
does it show?" · `barReadExtra_*`

**compareBars** — `barDiff_*`/`barDiffAlt_*` "how many more kittens than
chicks?" · `barSum_*`/`barSumAlt_*` "Add the X bar and the Y bar… How many
votes together?" · `barDiffExtra_*`

**pictograph** — `pictoRead_*` key-aware reads ("each picture means 5") ·
`pictoSymbols*` inverse ("How many pictures show 45?") ·
`pictoBothRowsTeen` two-row totals

**dataAnalysis** — `tallyRead_*`/`tallyReadBig` · `tallyTotalTeen` ·
`tallyDiff*` · `barTotal_*` graph totals · `barTotalSkipBig` leave-one-out
· `barRange*` max-minus-min

### conceptual (reviewed; named prose)

**readBar** — `mostPick_*`/`leastPick_*` "which one was chosen the most?" ·
`readJudge_*` (±1 read slips; judged bars always ≥3 so "1 apples" grammar
can't occur) · `secondPick_*` SECOND-tallest · `mostPickExtra_*`

**compareBars** — `cmpJudge_*` "says more X than Y — right?" ·
`whichMore_*`(Extra) · `diffJudge_*` (±1 gap slips) · `pairBeats_*` "do X
and Y together beat Z?"

**pictograph** — `countJudgeTeen` (key-1 counting honesty) · `rowMoreTeen`
· `keyIgnoredMid/Big` "counts 4 pictures as 4 stickers but each means 5 —
right?" (the flagship misconception, always No) · `halfSymbolMid/Big` half
a picture = half the key · `whichKeyMid/Big` "show 45 with 9 pictures —
which key?"

**dataAnalysis** — `claimJudge_*` quoted claims about max/min ·
`truePick_*`/`truePickMin_*` pick-the-true-statement · `totalJudge_*` ·
`tieGap_*` "how many more would the smallest bar need to tie?"

### application (reviewed; survey/harvest/score narratives)

`storySurveyRead_*` "surveyed the class… how many kittens does the graph
show?" · `storyWinner_*` / `storyShortest_*` (three skeletons PER BAND —
number-free prompts) · `storyMargin_*` margins of victory ·
`storyTeamUp_*`/`storyTopTwo_*` combined votes · `storySticker_*` reading/
garden/chore picture charts · `storyDraw_*` "how many pictures to draw" ·
`storyChartTotal_*` two-row chart totals · `storyAllVotes_*` turnout
totals · `storySkipTotal_*` leave-one-category-out · `storyReachGoal_*`
"how many more votes to reach 15?"

## Traps learned building this bank

- **Uniqueness must come from words**: graph prompts carry no numbers.
  Embed the graph TITLE, give each band its own phrasings, switch phrasing
  when a category set repeats, and keep per-band name offsets NOT congruent
  mod 20 (and story skeleton counts ≥3 per band) or identical strings
  appear across bands.
- Band-1 bar VALUES may be ≤9, but judged-TOTAL prompts state the sum —
  keep band-1 quadruple totals ≤20.
- Judged reads must target bars with value ≥3 or "said" hits 1 and
  grammar/pluralization breaks ("1 apples").
- (set × pair × phrasing) must be a bijection for two-row chart reads —
  24 combos exactly; a 27-item loop repeats strings.
- Label answers need distinct values (ties rejected by the verifier).
