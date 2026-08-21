# time mode — UI + bank patterns

Generator: `src/modes/time.js`. Bank batch `b0821` (1,852 items; see
`docs/time-bank-design.md`). Subskills: `readClock`, `elapsedTime`,
`timeConcepts`, `calendar`. Bands: K-1 = o'clock/half past + whole hours
(word times only); 2-3 = five-minute reads + digital + within-hour; 4-5 =
to-the-minute + across-hour + spans.

## Rendering notes

- Clock faces render via `answerType: "clock"` + `display {type:"clock",
  hour, minute}` (`src/components/AnalogClock.jsx`); the child TYPES the
  minutes past the hour — the minute value must never appear in the prompt.
- Elapsed answers are computed in absolute minutes, never by digit-wise
  clock subtraction (2:40→3:25 = 85 is the distractor, not the answer).
- `selectVariety` keeps family subordinate to the band (leak fix) — don't
  restore the any-band family fallback.
- Time prompts are inherently verbal; with the word-problems toggle OFF the
  bank filters out and the generator serves (same as patterns).

## Question pattern catalog

### procedural (auto-approved)

**readClock** — `faceReadTeen` o'clock/half-past faces, worded stems ·
`handsToWords(Half)` "hour hand on three, minute hand on twelve — what
time?" · `faceReadFive`/`faceReadMinute` typed minute reads (stems rotated
so (hour, stem) never repeats) · `wordsToDigital` "quarter past three" →
3:15 · `digitalToWords` · `minutesToDigital` "23 minutes past 8 → which
digital time?"

**elapsedTime** — `wholeHoursTeen` "Start at two o'clock, finish at five
o'clock. How many hours?" · `hourLaterTeen` word-time +N hours ·
`withinHourMid` "Start 3:10, end 3:45 = ? minutes" · `acrossHourMid`
"2:40 → 3:25 counting up through the hour" · `endUnknownBig`/
`startUnknownBig` choice of times (±5, hour-slip, complement distractors)

**timeConcepts** — `unitFactTeen` "1 hour = ? minutes", "2 days = ? hours"
· `halfHourLadder` "5 half hours = ? minutes" · `hourChimeNext` ·
`mixedToMinutes` "2 hours 45 minutes = ? minutes" · `minutesToMixed`
"150 minutes = 2 hours and ? minutes" · `bigUnitCompose/Decompose`
seconds/days versions

**calendar** — `weekDaysTeen/Mid` "2 weeks and 3 days = ? days" ·
`weekdayHopTeen`/`weekdayBackMid` "Today is Friday; 4 days later?" ·
`monthLength` "How many days are in June?" · `dateSpanBig` "From March 3
to March 17 = ? days" · `laterDateBig` "9 days after March 3 is March ?"

### conceptual (reviewed; named prose)

**readClock** — `judgeOclockRead`/`judgeFiveRead`/`judgeMinuteRead` (hand
swap, off-by-five, off-by-one slips) · `whichHandHour` "which hand tells
the HOUR?" (the short hand) · `handSwapJudge` · `closerHourJudge` "is 3:50
closer to the next hour?" · `betweenHours` "3:20 sits between which two
hours?" · `minutesToNextHour` (gap to 60) · `leadingZeroReason` "8:04 not
8:4"

**elapsedTime** — `hourCountJudge` (word form) · `whichLongerTeen/Mid`
compare event spans · `oneHourLaterJudge` · `elapsedJudge_*` the
digit-subtraction misconception judged directly · `pickDuration_*` (the
decimal distractor sits in the choices) · `crossesHourJudge` "will it pass
the next o'clock?"

**timeConcepts** — `durationBenchmark` "brushing teeth ≈ 2 minutes" ·
`dayPartPick` morning/afternoon/night · `unitOrderJudge` "a minute is
longer than a second?" · `amPmPick` · `unitCompare` "90 minutes vs 1 hour"
· `smallConvJudge` · `convJudgeBig` · `bestUnitPick` "measure summer break
in weeks" · `longestDuration` mixed-unit max

**calendar** — `tomorrowPick`/`yesterdayPick` · `weekendJudge` ·
`daysInWeek` · `whichDayFirst` · `nextMonthPick`/`prevMonthPick` ·
`monthFactJudge` ("February is the shortest month") · `sevenDayCycle`
"every 7 days lands on the same weekday" · `monthsLeft` · `weeksBetween` ·
`spanJudgeBig` (the fencepost slip) · `deeperDate`

### application (reviewed)

**readClock** — `storyHandsRead` clock check before practice ·
`storyMinuteHand` "where does the minute hand point at half past?" ·
`storySameTime` · `storyBoardRead`/`storyGuideWords` schedule boards ·
`storySetClock` set the timer from words · `storyArrive`/
`storyTicketMinutes`/`storyMinutesLeft` **elapsedTime** —
`storyWholeHours`/`storyNapHours` · `storyHourPlan` leave-one-hour-earlier
· `storyTimer_*`/`storyPractice_*` kitchen and practice timers ·
`storyGameAcross` across the hour · `storyBusArrive` end time ·
`storyStartBack` work backward **timeConcepts** — `storyDayPart` routines ·
`storyBenchmark` sensible-duration guesses · `storyHalfHours` ·
`storyPassMinutes`/`storyRecipe_*` mixed conversions · `storyTimerLeft_*`
minutes remaining · `storyDaysHours` **calendar** — `storyDueDay` library
due days · `storyCountdown_*` days-to-go · `storyWeeksDays`/
`storyWeeksFeed` week↔day conversions · `storyClubDay_*` 8-12-day hops ·
`storyLaterDate`/`storyDateSpan` · `storySameWeekday`

## Traps learned building this bank

- Band-1 prompts must be digital-free ("6:30" states 30 → hard fail); use
  o'clock/half past and hour words.
- Clock-read prompts can't contain the minute (it's the typed answer) —
  uniqueness comes from (hour × stem) pairs, and stems must end in "?" or
  the answer-in-prompt check fires when hour == minute coincidences occur.
- Wrap across 12 explicitly (12:50 → 1:30 needs +720) or gap claims go
  negative.
- New display.time claim kinds must land in authorTime.js's verifier in the
  same commit — unknown kinds are hard failures.
- varietyReport signatures emoji by glyph (letter-encoded); don't revert to
  a constant "emoji" token — counting L1-3 flapped at the 25% boundary.
