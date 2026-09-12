# placeValue mode — UI + bank patterns

Generator: `src/modes/placeValue.js`. Bank batch `b0821` (1,424 items; see
`docs/placevalue-bank-design.md`). Subskills: `tensOnes`, `expandedForm`,
`regroupingSense`. Bands: K-1 levels 1-3 (teens, all numbers ≤20), 2-3
levels 4-6 (two-digit), 4-5 levels 7-10 (three-digit).

## Rendering notes

- Drills are typed (`numberPad`); teen-frame items use `answerType:
  "tenFrame"` with `frames: 2` (count mode reads, build mode taps cells —
  the submit key always reads "Go").
- Number-line locate items use `display.numberLine` `{min, max, step,
  lineMode: "locate"}`.
- Judged items render the claim as `promptText` with `subPrompt` "Is this
  right?" and Yes/No choices — never True/False.
- The targeted-subskill fallback in `chooseVariety` is band-preserving
  (level-leak fix). Don't revert to an any-band subskill match.

## Question pattern catalog

### procedural (auto-approved; symbolic registers)

**tensOnes** — `teenFrameRead` "One full frame and some more. What teen
number do the frames show?" (tenFrame) · `teenUnitCompose` "1 ten 4 ones = ?"
· `teenOnesDigit` "17 → 10 + ?" (arrow register — `17 = 10 + ?` belongs to
numberBonds) · `teenTensDigit` "Tens in 13 = ?" · `tenMoreLessTeen` "10 more
than 3 = ?" · `unitCompose` "2 tens 5 ones = ?" · `digitRead` "Tens digit of
47 = ?" · `tenMoreLess` · `digitReadBig` "Hundreds digit of 347 = ?" ·
`valueOfDigitDrill` "Value of the tens digit in 347 = ?" · `hundredMoreLess`
"100 more than 347 = ?"

**expandedForm** — `teenExpandComplete` "11 → 10 + ? ones" ·
`wordToNumeralTeen` "eleven = ?" · `teenArrowCompose` "10 + 1 → ?" ·
`numeralToWordTeen` "Which word names 12?" (choice) · `teenExpandJudge` /
`expandJudgeMid` / `expandJudgeBig` — judged claims "10 + 7 = 17",
"40 + 7 = 47", "300 + 40 + 6 = 346" (false = off-by-one in the ones) ·
`expandTwoDigit` "25 → 20 + ?" · `composeTwoDigit` "20 + 5 → ?" ·
`composeThreeDigit` "300 + 40 + 7 → ?" · `expandPartBig` "347 → ? from the
tens place"

**regroupingSense** — `onesToTeen` "10 ones + 1 one = ?" · `buildTeenFrames`
"Build 12: fill the first frame, then keep going." (tenFrame build) ·
`teenDecompose` "11 = 1 ten + ? ones" · `teenAsOnes` "11 → 10 ones + ? ones"
· `bundleCount` "1 bundle of 10 + 2 loose ones = ?" · `nonCanonicalCompose`
"2 tens 14 ones = ?" (the >9-ones rename) · `renameTens` "34 = 2 tens +
? ones" · `renameTensDigit` "47 = ? tens 7 ones" · `nonCanonicalComposeBig`
"2 hundreds 14 tens 5 ones = ?" · `renameAsTens` "340 = ? tens" ·
`renameHundredsDigit` "347 = ? hundreds 4 tens 7 ones"

### conceptual (reviewed; named prose, rotating 20-name pool)

**tensOnes** — `whichNumberTeens`/`whichNumberBuilt`/`whichNumberBuiltBig`
"Mina builds 1 ten and 3 ones. Which number did Mina build?" (choice,
digit-swap distractors) · `digitWorthTeens`/`digitWorth`/`digitWorthBig`
"Theo looks at the tens digit of 47. What is that digit worth?" ·
`reversalJudgeTeens`/`reversalJudge` "Ida says 1 ten 3 ones make 13. Is Ida
right?" (false = digit reversal; band 1 uses off-by-one to stay ≤20) ·
`unitClaimJudgeBig` "Ava says 3 hundreds 4 tens 7 ones makes 347." ·
`lineLocateTeens`/`lineLocate` "June hunts for 12. Where does 12 sit on the
line?" (numberLine)

**expandedForm** — `pickExpansionTeens`/`pickExpansion`/`pickExpansionBig`
"Which sum shows 347 the expanded way?" (choice; distractors are digit-swap
expansions, verified non-colliding) · `wordClaimJudgeTeen` "Nia reads
'fifteen' and writes 15. Is Nia right?" · `expandClaimJudge`/
`expandClaimJudgeBig` "Ava writes 25 = 20 + 5. Is Ava right?" ·
`oddOneOutForms`/`oddOneOutFormsBig` "Three of Omar's cards show 25. Which
card does NOT?" (choices mix expanded form, unit form, numeral) ·
`teenFramePlan` "Ben needs frames showing 13. Which build works?"

**regroupingSense** — `equivalenceJudgeTeen`/`equivalenceJudge` "Nia says
2 tens 14 ones is the same as 34. Is Nia right?" · `onesNameJudgeTeen`/
`onesNameJudgeBig` "Amara says 14 is the same as 14 ones." / "Priya says
200 ones make 200." · `pickRename` "Kai wants to rename 34 with extra ones.
Which way is right?" · `tradesFromOnesTeens`/`tradesFromOnes` "June holds 34
loose ones and trades every 10 for a ten. How many tens?" ·
`tensRenameJudgeBig` "Lily says 13 tens is the same as 130." · `notANameBig`
"Three of Finn's cards name 235. Which card does NOT?"

### application (reviewed; bundle contexts: straws/bundles, blocks/rods, beads/full wires, stickers/sheets)

`storyBundlesAndLoose` "Mina has 3 bundles of ten straws and 4 loose straws.
What number of straws is that?" · `storyTenMoreLess` "…gets one more bundle
of ten. How many now?" · `storyDigitOf` "Mina lives at number 347. Which
digit is in the hundreds place of 347?" · `storyDigitWorth` "Ticket 347
wins! What is the value of the tens digit?" · `storyScoreboard` "The game
shows the score as 10 + 3. What is the total score?" · `storyTensPart` /
`storyHundredsPart` "Mina writes 13 on a poster as tens plus ones. Which
number shows the tens part?" · `storyWordForm` "The sign says 'thirteen'
balloons…" · `storyPickExpansion(Mid)` "The librarian asks Theo for 25 in
expanded form." · `storyTrades(Big)` "holds 12 loose straws, trades every
ten for a bundle. How many bundles?" · `storyLeftovers(Big)` "How many
straws do not fit in a full bundle?" (mod 10) · `storyNonCanonical` "21
bundles and 14 loose — more than ten loose!" · `storyNextBundle` "How many
more straws until the next full bundle at 20?" (gap claim) · `storyCrates`
"3 crates of one hundred, 4 boxes of ten, 7 loose" (hundreds unit compose)

## Traps learned building this bank

- `decorativeContext` fires on "What is the hundreds digit of 347?" after a
  story that merely restates 347 — phrase as "Which digit is in the …" or
  make the context load-bearing.
- Pluralize pack nouns for count 1 ("1 bundle", "1 box of ten") — the
  grammar gate only knows nouns in `COUNTABLE_PLURALS` (bundle nouns now
  added). Watch naive `+ "s"` helpers: "boxs"/"boxses".
- Prompt-sheet flight logs skip the bank (`consultBankFamilies: []` in
  `generateFlightLog`) — banked non-verbal pools are smaller than a sheet.
- Band-1 false judged claims must stay ≤20: use off-by-one, not reversal
  or +10.
