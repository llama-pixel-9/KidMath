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
 * lie: bank rows tagged kind "faceRead" are digital ticket reads.
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
};

/**
 * Figure keys with a hand-verified Swift mirror (ios QuestionDisplayView).
 * modeFigures.spec asserts iOS-playable contracted modes require only these —
 * volumeCoordinates stays playable:false until cubeGrid/coordGrid get mirrors.
 */
export const IOS_MIRRORED_FIGURES = ["clockFace", "barGraph"];
export const IOS_PLAYABLE_CONTRACT_MODES = ["time", "dataGraphs"];

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

function satisfies(question, satisfier) {
  if (satisfier === "none") return true;
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
