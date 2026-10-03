/**
 * Per-mode render contracts: which item classes MUST put a visual in front of
 * the kid, and which are legitimately verbal.
 *
 * This is the gate the clock incident was missing. Every existing check asked
 * "is what this item renders correct?" — none asked "should this item have
 * rendered MORE than it did?". Text describing a visual ("the hour hand on
 * six...") is not the visual; a contract line here is how a mode says so once,
 * and every gate reads the same declaration:
 *
 *   - qc/checks.js `missingRequiredFigure` — which via bankAssembler is the
 *     authoring-time gate, the admin Review gate, and `bank:qc`, all at once
 *   - src/__tests__/modeFigures.spec.js — generator sweep + full-bank sweep +
 *     declaration coverage (a NEW class with no line here fails CI)
 *   - e2e/robotKid.spec.js and scripts/simulateKid.mjs — pixel-level backstop
 *
 * Classes are keyed by structureType (bank rows carry it top-level, generated
 * questions in metadata.structureType). NOT display.time.kind — kind names
 * lie: bank rows tagged kind "faceRead" are digital ticket reads. The v2
 * topics built from blueprint rows (wordProblems, multiDigit) key by row id first, since
 * a picture row and a words-only row can share a structureType.
 *
 * Satisfier vocabulary:
 *   "figure:<key>"  display.figure === key (key must exist in figureRegistry)
 *   "widget:<key>"  answerType === key or display.type === key, for answer
 *                   widgets that draw the visual themselves (AnalogClock)
 *   "any-figure"    any declared display.figure (or self-drawing widget)
 *   "none"          verbal is the point; explicitly declared, never inferred
 *
 * Dependency-free leaf (like bands.js/modeLevels.js): pure JS, zero imports,
 * loadable by checks, specs, node scripts and Playwright alike.
 */

const FACE = { satisfiedBy: ["figure:clockFace"] };
const FACE_OR_WIDGET = { satisfiedBy: ["figure:clockFace", "widget:clock"] };
const VERBAL = { satisfiedBy: ["none"] };

// Time classes where words are legitimately the whole item: digital-notation
// reads, words<->digital conversions, calendar hops, durations, unit facts —
// and the hands-as-subject items where SHOWING the face would hand over the
// answer (whichHandHour "which hand tells the hour?", storyMinuteHand "which
// way does the minute hand point?").
const TIME_VERBAL = [
  // bank structureTypes
  "acrossHourMid", "amPmPick", "bestUnitPick", "betweenHours", "bigUnitCompose",
  "bigUnitDecompose", "closerHourJudge", "convJudgeBig", "crossesHourJudge",
  "dateSpanBig", "dayPartPick", "daysInWeek", "deeperDate", "digitalToWords",
  "durationBenchmark", "elapsedJudge_band2", "elapsedJudge_band3",
  "endUnknownBig", "halfHourLadder", "hourChimeNext", "hourCountJudge",
  "hourLaterTeen", "laterDateBig", "leadingZeroReason", "longestDuration",
  "minutesToDigital", "minutesToMixed", "minutesToNextHour", "mixedToMinutes",
  "monthFactJudge", "monthLength", "monthsLeft", "nextMonthPick",
  "oneHourLaterJudge", "pickDuration_band2", "pickDuration_band3",
  "prevMonthPick", "sevenDayCycle", "smallConvJudge", "spanJudgeBig",
  "startUnknownBig", "storyArrive", "storyBenchmark", "storyBoardRead",
  "storyBusArrive", "storyClubDay_band2", "storyCountdown_band1",
  "storyCountdown_band2", "storyDateSpan", "storyDayPart", "storyDaysHours",
  "storyDueDay_band1", "storyGameAcross", "storyGuideWords", "storyHalfHours",
  "storyHourPlan", "storyLaterDate", "storyMinuteHand", "storyMinutesLeft",
  "storyNapHours", "storyPassMinutes", "storyPractice_band2",
  "storyRecipe_band2", "storyRecipe_band3", "storySameTime",
  "storySameWeekday", "storySetClock", "storyStartBack", "storyTicketMinutes",
  "storyTimerLeft_band2", "storyTimerLeft_band3", "storyTimer_band2",
  "storyTimer_band3", "storyWeeksDays_band2", "storyWeeksFeed",
  "storyWholeHours", "tomorrowPick", "unitCompare", "unitFactTeen",
  "unitOrderJudge", "weekDaysMid", "weekDaysTeen", "weekdayBackMid",
  "weekdayHopTeen", "weekendJudge", "weeksBetween", "whichDayFirst",
  "whichHandHour", "whichLongerMid", "whichLongerTeen", "wholeHoursTeen",
  "withinHourMid", "wordsToDigital", "yesterdayPick",
  // generator-only varieties
  "matchWordsToDigital", "matchDigitalToWords", "hourLaterEarlier",
  "beforeAfterHour", "dayPartEvent", "dailyEventOrder", "wholeHoursElapsed",
  "amPmReasoning", "earliestTime", "elapsedWithinHour", "elapsedAcrossHour",
  "elapsedEndUnknown", "elapsedStartUnknown", "calendarDuration",
  "errorAnalysisElapsed",
];


// dataGraphs classes that reference a specific chart's contents (bank
// structureTypes + generator varieties) — each must ship a figure.
const GRAPH_VISUAL = [
  "barDiffAlt_band1", "barDiffAlt_band2", "barDiffAlt_band3",
  "barDiffExtra_band1", "barDiffExtra_band2", "barDiffExtra_band3",
  "barDiff_band1", "barDiff_band2", "barDiff_band3", "barMax_band1",
  "barMax_band2", "barMax_band3", "barMin_band1", "barMin_band2",
  "barMin_band3", "barRangeBig", "barRangeMid", "barReadExtra_band1",
  "barReadExtra_band2", "barReadExtra_band3", "barRead_band1",
  "barRead_band2", "barRead_band3", "barSumAlt_band1", "barSumAlt_band2",
  "barSumAlt_band3", "barSum_band1", "barSum_band2", "barSum_band3",
  "barTotalSkipBig", "barTotal_band2", "barTotal_band3", "claimJudge_band1",
  "claimJudge_band2", "claimJudge_band3", "cmpJudge_band1", "cmpJudge_band2",
  "cmpJudge_band3", "countJudgeTeen", "diffJudge_band1", "diffJudge_band2",
  "diffJudge_band3", "halfSymbolBig", "halfSymbolMid", "keyIgnoredBig",
  "keyIgnoredMid", "leastPick_band1", "leastPick_band2", "leastPick_band3",
  "mostPickExtra_band1", "mostPickExtra_band2", "mostPickExtra_band3",
  "mostPick_band1", "mostPick_band2", "mostPick_band3", "pairBeats_band1",
  "pairBeats_band2", "pairBeats_band3", "pictoBothRowsTeen",
  "pictoRead_band1", "pictoRead_band2", "pictoRead_band3", "readJudge_band1",
  "readJudge_band2", "readJudge_band3", "rowMoreTeen", "secondPick_band1",
  "secondPick_band2", "secondPick_band3", "storyAllVotes_band1",
  "storyAllVotes_band2", "storyAllVotes_band3", "storyChartTotal_band1",
  "storyChartTotal_band2", "storyChartTotal_band3", "storyMargin_band1",
  "storyMargin_band2", "storyMargin_band3", "storyReachGoal_band1",
  "storyReachGoal_band2", "storyReachGoal_band3", "storyShortest_band1",
  "storyShortest_band2", "storyShortest_band3", "storySkipTotal_band1",
  "storySkipTotal_band2", "storySkipTotal_band3", "storySticker_band1",
  "storySticker_band2", "storySticker_band3", "storySurveyRead_band1",
  "storySurveyRead_band2", "storySurveyRead_band3", "storyTeamUp_band1",
  "storyTeamUp_band2", "storyTeamUp_band3", "storyTopTwo_band1",
  "storyTopTwo_band2", "storyTopTwo_band3", "storyWinner_band1",
  "storyWinner_band2", "storyWinner_band3", "tallyDiffBig", "tallyDiffMid",
  "tallyDiffTeen", "tallyReadBig", "tallyRead_band1", "tallyRead_band2",
  "tallyTotalTeen", "tieGap_band1", "tieGap_band2", "tieGap_band3",
  "totalJudge_band1", "totalJudge_band2", "totalJudge_band3",
  "truePickMin_band1", "truePickMin_band2", "truePickMin_band3",
  "truePick_band1", "truePick_band2", "truePick_band3",
  "whichMoreExtra_band1", "whichMoreExtra_band2", "whichMoreExtra_band3",
  "whichMore_band1", "whichMore_band2", "whichMore_band3", "readBarSingle",
  "mostLeastIdentify", "tallyRead", "pictographKey1", "compareBarsAny",
  "compareFewer", "totalAcrossBars", "pictographKey2", "linePlotRead",
  "totalSurveyed", "pictographKeyHalf", "pictographCompare",
  "whichStatementTrue", "linePlotSpread", "errorAnalysisKey", "surveyStory",
];

// Hypothetical key-conversion classes: all numbers stated, nothing described.
const GRAPH_VERBAL = [
  "pictoSymbolsBig", "pictoSymbolsMid", "pictoSymbolsMid5",
  "pictoSymbolsTeen", "storyDraw_band1", "storyDraw_band2",
  "storyDraw_band3", "whichKeyBig", "whichKeyMid",
];


// counting classes whose visual is the emoji run itself (in the prompt or the
// choices) or a rendered payload (ten frames, display.counting/emoji) — the
// mode's deliberate design: the run IS the figure.
const COUNTING_VISUAL = [
  "storyCountOn", "storyTargetGap", "storyHiddenCount", "storyTwoSpots",
  "storyCountAllKinds", "storyExtraneous", "storyBagsOfTen",
  "storyQuickLook", "storyDicePair", "storyFlashCard", "storyDotCards",
  "storyQuickRows", "sameNumberJudge", "whichShowsN", "claimCountJudge",
  "fiveAndMoreSee", "estimateThenCount", "oddOneOutCount", "claimTeenJudge",
  "tenAndMoreSee", "whichShowsTeen", "estimateThenCountBig", "oddOneOutTeen",
  "claimTensRowsJudge", "tensAndOnesSee", "rowsToNumeral", "missingInRun",
  "oneMore", "oneLess", "betweenTwo", "tenFrameMakeTen",
  "missingAcrossDecade", "oneMoreDecade", "oneLessDecade", "betweenDecade",
  "missingAcrossHundred", "oneMoreHundred",
  "oneLessHundred", "betweenHundred", "hiddenCountBig", "countSet",
  "compareTwoSets", "lastNumberSaid", "tenFrameEmpty", "rearrangedSet",
  "countTeenSet", "compareTeenSets", "teenFrameCount", "doubleCountError",
  "skippedOneError", "doubleCountErrorBig", "skippedOneErrorBig",
  "mixedSetCount", "compareBigSets", "bigCountJudge", "smallSetRead",
  "fiveGroupRead", "tenFrameRead", "tenAndMoreRead", "doubleFiveRead",
  "twoFrameRead", "tensRowsRead", "nextNumber", "countBackNext",
  "nextAcrossDecade", "backAcrossDecade",
  "nextWithinDecade", "backWithinDecade", "countOnFromTwoDigit",
  "nextAcrossHundred", "backAcrossHundred", "countOnBigJump",
  "setCountWrite", "countOutOnFrame", "teenSetWrite", "countOutTeenOnFrames",
  "bigSetWrite", "arrayCount", "countScatteredSet", "writeNumeralForSet",
  "subitizeSmallSet", "arrangementInvariance", "tenFrameCount",
  "tenFrameBuild", "subitizeDrill", "bigSetWriteDrill",
];

// counting classes that are genuine word problems or verbal sequence work —
// nothing pictured is described.
const COUNTING_VERBAL = [
  "countOnFromGiven", "countBackFrom", "missingInCountSequence", "hiddenCountSplat", "errorAnalysisDoubleCount",
  "countObjects", "countToTargetGap", "countGroupsExtraneous",
  "countOnJudge", "decadeCrossingJudge", "centuryCrossingJudge",
];


// placeValueDiscs: mat-DESCRIBING classes show a DiscMat; trade/value
// reasoning classes are legitimately verbal; everything else renders through
// the interactive discs widget.
const DISCS_MAT = [
  "whichNumberMat", "whichNumberMatBig", "whichNumberMatTh", "readJudge",
  "readJudgeBig", "zeroColumnJudge", "compareMats", "compareMatsBig",
  // generator varieties
  "whichNumberShown", "makeNumberFromDiscs", "compareTwoMats", "oneMoreDisc",
  "oneLessDisc", "whichChartShows",
];
const DISCS_VERBAL = [
  "canTradeJudge", "whichTrade", "whichTradeBig", "predictTradeJudge",
  "predictTradeBig", "tradeKeepsValueBig", "discWorthCompare",
  "valueUnchangedJudge", "valueUnchangedBig", "tensOnlyPlan",
  // generator varieties: construction/trade reasoning, all givens stated
  "buildWithDiscs", "regroupOnesToTens", "renameNonCanonical",
  "tradeDownForSubtraction", "predictRegroupNeeded", "midComputationNext",
  "errorAnalysisNoTrade", "discsForEqualGroups", "dealDiscsDivision",
  "tradeTenOnesForTens", "nextDiscCount", "missingDiscCount",
];
const DISCS_RENDERED = [
  "storyDiscsNeeded", "storyMatRead", "storyMatReadBig", "storyLooseOnes",
  "storyTensOut", "storyHundredsOut", "storyNextTrade", "storyScoreMove",
  "storyEqualMats", "storyCombineMats", "storyDropCount", "storyShareMats",
  "storyBigScoreMove", "storyMatReadOnesFirst", "storyNextTradeSmall",
  "storyDropCountMid", "storyMultiMove", "storyLooseOnesBig", "plusDiscWhich",
  "minusDiscWhich", "moveWhichMid", "equalMatsPlan", "nextDiscCountMid",
  "errorNoTrade", "moveWhichThousands", "dealShares", "matReadTeens",
  "matRead", "matReadReversed", "matReadHundreds", "buildDiscCount",
  "tensOnlyBig", "matReadThousands", "buildDiscCountBig", "discWorth",
  "overfullMat", "tradeOnesDrill", "tensFromOnes", "onesFromTens",
  "overfullMatReversed", "renameDrill", "asTensDrill", "overfullMatBig",
  "tradeTensDrill", "renameHundredsDrill", "mixedRenameDrill",
  "overfullMatThousands", "tradeHundredsDrill", "plusTenDisc", "plusOneDisc",
  "minusOneDisc", "minusTenDisc", "plusTwoOnesDiscs", "plusTwoTensDiscs",
  "discMove", "discMoveBig", "discDropSeq", "equalMats", "discMoveThousands",
  "discDropSeqBig", "equalMatsBig", "multiDiscMove",
  // generator varieties served through the widget
  "readDiscs", "countTensDiscs",
];

// Word Problems (Grade 2 blueprint rows, src/blueprints/g2AddsubWp.json,
// approved 2026-10-02). A picture row SHARES its structureType with a
// words-only row (row 16 "picture-tens-ones" is addToResultUnknown, like
// row 1), and a model copies its row's structureType, so these classify by
// the item's blueprint row id first (byRowThenStructure below). Every row id
// is declared, from the row's `picture` field; modeFigures.spec ties the
// lists to the rows, so a new row with no line fails CI.
const DISC_MAT = { satisfiedBy: ["figure:discMat"] };
const BAR_MODEL = { satisfiedBy: ["widget:barModel"] };
const NUMBER_LINE = { satisfiedBy: ["widget:numberLine"] };
// "Choose the tape diagram": the four choices ARE the pictures. No choice
// widget draws tape diagrams yet (a build item), so the row needs a figure
// of its own before any model for it can pass.
const PICTURE_CHOICES = { satisfiedBy: ["any-figure"] };

const WP_ROW_CLASSES = {
  // place-value disc mat showing only the first amount
  "wp-g2-picture-tens-ones": DISC_MAT,
  "wp-g2-two-step-picture": DISC_MAT,
  // a tape diagram the kid fills in, typed into the barModel widget
  "wp-g2-tape-missing-part": BAR_MODEL,
  "wp-g2-tape-compare-bigger-fewer": BAR_MODEL,
  // a number line with one hop, the hop length typed into the widget
  "wp-g2-number-line-compare": NUMBER_LINE,
  "wp-g2-box-number-line": NUMBER_LINE,
  // four tape diagrams to choose from
  "wp-g2-two-step-tape-choice": PICTURE_CHOICES,
};
// Rows whose picture is "none, words only" (or "none, numbers only").
const WP_VERBAL_ROWS = [
  "wp-g2-add-to-result", "wp-g2-take-from-result", "wp-g2-put-together-total",
  "wp-g2-add-to-change", "wp-g2-take-from-change", "wp-g2-take-apart-part",
  "wp-g2-compare-difference-more", "wp-g2-compare-difference-fewer",
  "wp-g2-compare-bigger-more", "wp-g2-compare-smaller-fewer",
  "wp-g2-add-to-start", "wp-g2-take-from-start", "wp-g2-compare-bigger-fewer",
  "wp-g2-compare-smaller-more", "wp-g2-both-parts-unknown",
  "wp-g2-choose-equation", "wp-g2-choose-two-equations", "wp-g2-box-middle",
  "wp-g2-box-start", "wp-g2-two-step-take-take", "wp-g2-two-step-take-add",
  "wp-g2-two-step-more-then-total", "wp-g2-two-step-total-then-compare",
  "wp-g2-two-step-two-part", "wp-g2-two-step-choose-equation",
  "wp-g2-tx-fl-story-for-equation", "wp-g2-va-estimate",
  "wp-g2-two-step-box-second-step", "wp-g2-tx-1000-put-together-total",
  "wp-g2-tx-1000-take-from-result", "wp-g2-tx-1000-take-apart-part",
  "wp-g2-tx-1000-compare-more", "wp-g2-tx-1000-two-step",
  "wp-g2-tx-1000-story-for-equation", "wp-g2-va-ga-200-put-together-total",
];
// The fallback for an item with no row id: its structureType. A structure
// some words-only row uses stays verbal here (the row id is what tells the
// picture row apart); twoStepCompareFewerTotal is row 30's alone.
const WP_VERBAL_STRUCTURES = [
  "addToResultUnknown", "takeFromResultUnknown", "putTogetherTotalUnknown",
  "addToChangeUnknown", "takeFromChangeUnknown", "putTogetherAddendUnknown",
  "compareDifferenceMore", "compareDifferenceFewer", "compareBiggerMore",
  "compareSmallerFewer", "addToStartUnknown", "takeFromStartUnknown",
  "compareBiggerFewer", "compareSmallerMore", "bothAddendsUnknown",
  "equationUnknownMiddle", "equationUnknownFirst", "twoStepTakeTake",
  "twoStepTakeAdd", "twoStepCompareMoreTotal", "twoStepJoinCompare",
  "twoStepAddTake", "chooseStoryForEquation", "twoStepEquationSecondStep",
  // generator-only: the bare box sentences (src/modes/wordProblems.js SHAPES)
  "box-add-change", "box-add-start", "box-sub-change", "box-sub-start",
];

// Multi-Digit Math (src/blueprints/g2AddsubCalc.json, approved 2026-10-02):
// the same row-id-first rule. Its picture rows have structureTypes of their
// own, so the structure fallback for those is strict too.
const CALC_ROW_CLASSES = {
  // a place-value disc mat (rows 14, 23, 24, 27; row 32 shows two mats)
  "calc-g2-which-trade": DISC_MAT,
  "calc-g2-add-discs": DISC_MAT,
  "calc-g2-across-zero-discs": DISC_MAT,
  "calc-g2-ten-hundred-discs": DISC_MAT,
  "calc-g2-equal-mats": DISC_MAT,
  // a number line answered in the widget. Row 9 (several hops, the landing
  // point typed) needs build work first (calc decision 7); row 10 works today.
  "calc-g2-add-number-line": NUMBER_LINE,
  "calc-g2-sub-number-line": NUMBER_LINE,
};
const CALC_VERBAL_ROWS = [
  "calc-g2-add-100", "calc-g2-sub-100", "calc-g2-add-several",
  "calc-g2-add-sub-three", "calc-g2-make-ten", "calc-g2-tens-then-ones",
  "calc-g2-equal-sum", "calc-g2-equal-difference", "calc-g2-check",
  "calc-g2-find-mistake", "calc-g2-missing-digit", "calc-g2-group-ten",
  "calc-g2-add-1000", "calc-g2-add-past-100", "calc-g2-add-1000-two-trades",
  "calc-g2-add-several-past-100", "calc-g2-sub-1000",
  "calc-g2-sub-1000-two-trades", "calc-g2-across-zero", "calc-g2-rename-zero",
  "calc-g2-ten-hundred", "calc-g2-both-sides", "calc-g2-which-true",
  "calc-g2-true-false", "calc-g2-true-false-both-sides", "calc-g2-va-estimate",
  "calc-g2-va-not-equal", "calc-g2-tx-ten-hundred-1200",
];
const CALC_STRUCTURES = {
  addOnNumberLine: NUMBER_LINE,
  subtractOnNumberLine: NUMBER_LINE,
  whichTrade: DISC_MAT,
  addWithDiscs: DISC_MAT,
  subtractWithDiscs: DISC_MAT,
  tenOrHundredOnMat: DISC_MAT,
  sameValueTwoMats: DISC_MAT,
};
// Every words-only row's structure; the fallback generator writes only these
// (the script rows' types, tenOrHundredMoreLess and balanceEquation).
const CALC_VERBAL_STRUCTURES = [
  "addWithin100", "subtractWithin100", "addSeveral", "addSubThree",
  "makeTenStep", "placeValueStep", "compensateAdd", "compensateSubtract",
  "checkWithInverse", "findTheMistake", "missingDigit", "groupToMakeTen",
  "addWithin1000", "addPast100", "addTwoRegroups", "addSeveralPast100",
  "subtractWithin1000", "subtractTwoTrades", "subtractAcrossZero",
  "renameToSubtract", "tenOrHundredMoreLess", "balanceEquation",
  "chooseTrueEquation", "trueFalseEquation", "trueFalseBothSides",
  "estimateSumDifference", "equalOrNotEqual",
];

/**
 * Classify by the item's blueprint row id when it names one of this mode's
 * rows (a bank row or a filled model carries `blueprintId` top-level; a
 * generated question in metadata), else by structureType.
 */
function byRowThenStructure(prefix) {
  return (question, meta) => {
    const row = meta?.blueprintId ?? question?.metadata?.blueprintId ?? null;
    if (typeof row === "string" && row.startsWith(prefix)) return row;
    return meta?.structureType ?? question?.metadata?.structureType ?? null;
  };
}

export const FIGURE_CONTRACTS = {
  time: {
    classify: (question, meta) =>
      meta?.structureType ?? question?.metadata?.structureType ?? null,
    classes: {
      // --- the kid reads (or judges a reading of) an analog face: show it ---
      faceReadTeen: FACE_OR_WIDGET,
      faceReadFive: FACE_OR_WIDGET,
      faceReadMinute: FACE_OR_WIDGET,
      readClockHour: FACE_OR_WIDGET,
      readClockHalf: FACE_OR_WIDGET,
      readClockQuarter: FACE_OR_WIDGET,
      readClockFive: FACE_OR_WIDGET,
      readClockMinute: FACE_OR_WIDGET,
      handsToWords: FACE,
      handsToWordsHalf: FACE,
      storyHandsRead: FACE,
      judgeOclockRead: FACE,
      judgeFiveRead: FACE,
      judgeMinuteRead: FACE,
      handSwapJudge: FACE,
      verbalClockHands: FACE,
      whichClockShowsHour: FACE,
      // --- legitimately verbal, each declared on purpose ---
      ...Object.fromEntries(TIME_VERBAL.map((st) => [st, VERBAL])),
    },
    unlisted: "fail",
  },

  counting: {
    // 21 varieties across bands/families — 40 gens/level misses the rare ones
    specGenerations: 120,
    classify: (question, meta) =>
      meta?.structureType ?? question?.metadata?.structureType ?? null,
    classes: {
      ...Object.fromEntries(COUNTING_VISUAL.map((st) => [st, { satisfiedBy: ["emoji", "rendered"] }])),
      ...Object.fromEntries(COUNTING_VERBAL.map((st) => [st, VERBAL])),
    },
    unlisted: "fail",
  },

  placeValueDiscs: {
    specGenerations: 120,
    classify: (question, meta) =>
      meta?.structureType ?? question?.metadata?.structureType ?? null,
    classes: {
      ...Object.fromEntries(DISCS_MAT.map((st) => [st, { satisfiedBy: ["figure:discMat"] }])),
      ...Object.fromEntries(DISCS_VERBAL.map((st) => [st, VERBAL])),
      ...Object.fromEntries(DISCS_RENDERED.map((st) => [st, { satisfiedBy: ["rendered"] }])),
    },
    unlisted: "fail",
  },

  dataGraphs: {
    classify: (question, meta) =>
      meta?.structureType ?? question?.metadata?.structureType ?? null,
    classes: {
      // The mode's claim is that the child reads a chart — every class that
      // references a specific chart's contents shows one.
      ...Object.fromEntries(GRAPH_VISUAL.map((st) => [st, { satisfiedBy: ["any-figure", "widget:barGraph"] }])),
      // Hypothetical key arithmetic ("one picture stands for 5 — how many
      // pictures show 10?"): every number is in the prompt, no chart state is
      // described, so words are the whole item.
      ...Object.fromEntries(GRAPH_VERBAL.map((st) => [st, VERBAL])),
    },
    unlisted: "fail",
  },

  wordProblems: {
    classify: byRowThenStructure("wp-"),
    classes: {
      ...WP_ROW_CLASSES,
      ...Object.fromEntries(WP_VERBAL_ROWS.map((id) => [id, VERBAL])),
      twoStepCompareFewerTotal: PICTURE_CHOICES,
      ...Object.fromEntries(WP_VERBAL_STRUCTURES.map((st) => [st, VERBAL])),
    },
    unlisted: "fail",
  },

  multiDigit: {
    classify: byRowThenStructure("calc-"),
    classes: {
      ...CALC_ROW_CLASSES,
      ...Object.fromEntries(CALC_VERBAL_ROWS.map((id) => [id, VERBAL])),
      ...CALC_STRUCTURES,
      ...Object.fromEntries(CALC_VERBAL_STRUCTURES.map((st) => [st, VERBAL])),
    },
    unlisted: "fail",
  },
};

/**
 * Figure keys with a hand-verified Swift mirror (ios QuestionDisplayView).
 * modeFigures.spec asserts iOS-playable contracted modes require only these —
 * volumeCoordinates stays playable:false until cubeGrid/coordGrid get mirrors.
 */
export const IOS_MIRRORED_FIGURES = ["clockFace", "barGraph", "discMat", "pictograph", "tallyChart", "linePlot", "areaFigure"];
export const IOS_PLAYABLE_CONTRACT_MODES = ["time", "dataGraphs", "counting", "placeValueDiscs", "wordProblems", "multiDigit"];

/**
 * Display keys that actually put pixels on screen (mirror of what
 * figureRegistry/widgetRegistry props() and QuestionDisplay read — parity is
 * asserted in modeFigures.spec). display.time / display.truth /
 * display.compare are deliberately ABSENT: structured data nothing renders.
 * `clock` renders only alongside figure:"clockFace" or answerType:"clock";
 * see rendersAnything().
 */
export const RENDERED_DISPLAY_KEYS = [
  "figure", "emoji", "counting", "tenFrame", "bars", "rows", "points", "set",
  "cols", "degrees", "sequence", "ap", "cube", "coord",
];

/**
 * Answer widgets that draw the visual themselves (from their display payload)
 * — a tenFrame item's frames, a coinTray's pile, a shapeFigure's shape. Items
 * answered through these DO put pixels in front of the kid even with no
 * question-side figure key. Mirror of widgetRegistry; parity-checked in
 * modeFigures.spec.
 */
export const VISUAL_ANSWER_TYPES = [
  "clock", "tenFrame", "numberBond", "shapeFigure", "coinTray", "barGraph",
  "angle", "numberLine", "fractionSet", "placeValueDiscs", "barModel",
];

/** Does this question put any pixels beyond text in front of the kid? */
export function rendersAnything(question) {
  const d = question?.display || {};
  if (VISUAL_ANSWER_TYPES.includes(question?.answerType)) return true;
  if (RENDERED_DISPLAY_KEYS.some((k) => d[k] != null)) return true;
  if (d.clock != null && (d.figure === "clockFace" || d.type === "clock")) return true;
  if (d.type === "clock") return true;
  return false;
}

const EMOJI_RUN_RX = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

function satisfies(question, satisfier) {
  if (satisfier === "none") return true;
  if (satisfier === "emoji") {
    if (EMOJI_RUN_RX.test(question?.display?.promptText || "")) return true;
    return (question?.choices || question?.display?.choices || []).some(
      (c) => typeof c === "string" && EMOJI_RUN_RX.test(c)
    );
  }
  if (satisfier === "rendered") return rendersAnything(question);
  if (satisfier === "any-figure") return Boolean(question?.display?.figure);
  if (satisfier.startsWith("figure:")) return question?.display?.figure === satisfier.slice(7);
  if (satisfier.startsWith("widget:")) {
    const key = satisfier.slice(7);
    return question?.answerType === key || question?.display?.type === key;
  }
  return false;
}

export function figureSatisfies(question, satisfiers) {
  return (satisfiers || []).some((s) => satisfies(question, s));
}

/**
 * The satisfiers a question MUST meet, or null when nothing visual is
 * required (no contract for the mode, or the class is declared "none").
 */
export function requiredSatisfiers(modeId, question, meta) {
  const c = FIGURE_CONTRACTS[modeId];
  if (!c) return null;
  if (meta?.formatId ?? question?.metadata?.formatId) return null;
  const entry = c.all || c.classes?.[c.classify(question, meta)] || null;
  if (!entry || entry.satisfiedBy.includes("none")) return null;
  return entry.satisfiedBy;
}

/**
 * Full verdict for the QC check and the spec:
 *   { covered:false }                              — mode has no contract
 *   { covered:true, ok:true, cls }                 — satisfied (or verbal)
 *   { covered:true, ok:false, cls, reason:"undeclared" }
 *   { covered:true, ok:false, cls, reason:"missing", satisfiedBy }
 */
export function contractVerdict(modeId, question, meta) {
  const c = FIGURE_CONTRACTS[modeId];
  if (!c) return { covered: false };
  // The formats layer (src/modes/formats) deliberately re-dresses items into
  // bare symbolic drill forms ("10 = 20 — is this right?") — drills are
  // drills; a format-applied question is exempt from its class's figure rule.
  if (meta?.formatId ?? question?.metadata?.formatId) return { covered: true, ok: true, cls: "(format)" };
  const cls = c.classify(question, meta);
  const entry = c.all || (cls != null ? c.classes?.[cls] : null) || null;
  if (!entry) {
    return c.unlisted === "fail"
      ? { covered: true, ok: false, cls, reason: "undeclared" }
      : { covered: true, ok: true, cls };
  }
  const ok = figureSatisfies(question, entry.satisfiedBy);
  return ok
    ? { covered: true, ok: true, cls }
    : { covered: true, ok: false, cls, reason: "missing", satisfiedBy: entry.satisfiedBy };
}
