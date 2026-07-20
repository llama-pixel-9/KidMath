import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";

/**
 * Time (spec part C3 — `time`).
 *
 * The single biggest defect here was that `level` affected NOTHING: a level-1
 * learner and a level-10 learner got the same clock face and the same
 * within-the-hour elapsed problem. The conventional ladder costs nothing but a
 * minute constraint per band, so it is the first thing this rewrite ships:
 *
 *   band 1 (L1-3)  o'clock and half past; duration benchmarks; words -> digital
 *   band 2 (L4-6)  quarter past/to, five-minute reads, a.m./p.m., elapsed
 *                  duration inside one hour
 *   band 3 (L7-10) reads to the minute, elapsed ACROSS the hour, end-unknown
 *                  and start-unknown, calendar spans, error analysis
 *
 * Every elapsed answer is computed in absolute minutes, never by subtracting
 * clock faces digit-wise — that arithmetic (2:40 to 3:25 = 85) is precisely the
 * mistake the mode is meant to catch, and it lives in the distractors.
 */

const { CONCEPTUAL, PROCEDURAL, APPLICATION } = ITEM_FAMILIES;

const SUBSKILLS = ["readClock", "elapsedTime", "timeConcepts", "calendar"];

const ACTORS = ["Mina", "Sam", "Ava", "Theo", "Nia", "Luca"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function bandOf(level) {
  return level <= 3 ? 1 : level <= 6 ? 2 : 3;
}

/** Minutes since midnight -> a 12-hour clock label. */
function fmt(total) {
  const h = Math.floor(total / 60);
  return `${h}:${pad(total % 60)}`;
}

/** The digit-wise subtraction a child does when they treat times as decimals. */
function decimalMinutes(startTotal, endTotal) {
  const s = Math.floor(startTotal / 60) * 100 + (startTotal % 60);
  const e = Math.floor(endTotal / 60) * 100 + (endTotal % 60);
  return e - s;
}

/** Four unique options with the correct one guaranteed present. */
function optionSet(correct, wrongs, fallback) {
  const out = [correct];
  for (const w of wrongs) {
    if (out.length >= 4) break;
    if (w != null && !out.includes(w)) out.push(w);
  }
  let i = 0;
  while (out.length < 4 && i < fallback.length) {
    if (!out.includes(fallback[i])) out.push(fallback[i]);
    i += 1;
  }
  return shuffleArray(out);
}

const WORD_TIMES = [
  { words: "half past three", time: "3:30", near: ["3:15", "2:30", "3:45"] },
  { words: "half past seven", time: "7:30", near: ["7:15", "6:30", "7:45"] },
  { words: "quarter past seven", time: "7:15", near: ["7:45", "6:45", "7:25"] },
  { words: "quarter past two", time: "2:15", near: ["2:45", "1:45", "2:25"] },
  { words: "quarter to five", time: "4:45", near: ["5:15", "4:15", "5:45"] },
  { words: "quarter to nine", time: "8:45", near: ["9:15", "8:15", "9:45"] },
  { words: "ten past six", time: "6:10", near: ["6:50", "10:06", "6:20"] },
  { words: "twenty to four", time: "3:40", near: ["4:20", "3:20", "4:40"] },
];

const DURATION_SENSE = [
  { task: "brush your teeth", answer: "2 minutes", others: ["2 seconds", "2 hours", "2 days"] },
  { task: "blink once", answer: "1 second", others: ["1 minute", "1 hour", "1 day"] },
  { task: "sleep at night", answer: "9 hours", others: ["9 minutes", "9 seconds", "9 days"] },
  { task: "eat lunch", answer: "20 minutes", others: ["20 seconds", "20 hours", "20 days"] },
  { task: "watch a film", answer: "2 hours", others: ["2 minutes", "2 seconds", "2 weeks"] },
  { task: "tie a shoelace", answer: "10 seconds", others: ["10 minutes", "10 hours", "10 days"] },
];

const AM_PM = [
  { event: "eats breakfast", time: "7:30", answer: "a.m." },
  { event: "goes to bed", time: "8:15", answer: "p.m." },
  { event: "starts school", time: "8:45", answer: "a.m." },
  { event: "eats dinner", time: "6:30", answer: "p.m." },
  { event: "wakes up", time: "6:50", answer: "a.m." },
  { event: "watches the sunset", time: "7:40", answer: "p.m." },
];

/** A clock-reading row: the widget shows the face, the child types minutes. */
function clockRead(minutes, demand) {
  const hour = randInt(1, 12);
  const minute = pick(minutes);
  return {
    answer: minute,
    answerType: "clock",
    display: { type: "clock", hour, minute },
    promptText: `How many minutes past ${hour} o'clock is this clock showing?`,
    representation: "visual",
    cognitiveDemand: demand,
    misconceptionTags: ["hourMinuteSwap", "clockDirection", "offByFive"],
    distractorContext: { hour, minute },
  };
}

const FIVES = Array.from({ length: 12 }, (_, i) => i * 5);
const EVERY_MINUTE = Array.from({ length: 60 }, (_, i) => i);

const VARIETIES = [
  // ---- band 1 --------------------------------------------------------------
  {
    id: "readClockHour",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["readClock"],
    build: () => clockRead([0], "DOK1"),
  },
  {
    id: "readClockHalf",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["readClock"],
    build: () => clockRead([0, 30], "DOK1"),
  },
  {
    id: "durationBenchmark",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["timeConcepts"],
    build() {
      const item = pick(DURATION_SENSE);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: shuffleArray([item.answer, ...item.others]),
        promptText: `About how long does it take to ${item.task}?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["unitDirection"],
      };
    },
  },
  {
    id: "matchWordsToDigital",
    bands: [1, 2],
    family: PROCEDURAL,
    subskills: ["timeConcepts"],
    build() {
      const item = pick(WORD_TIMES);
      return {
        answer: item.time,
        answerType: "choice",
        choices: shuffleArray([item.time, ...item.near]),
        promptText: `Which time is "${item.words}"?`,
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["hourMinuteSwap", "clockDirection"],
      };
    },
  },

  // ---- band 2 --------------------------------------------------------------
  {
    id: "readClockQuarter",
    bands: [2],
    family: CONCEPTUAL,
    subskills: ["readClock"],
    build: () => clockRead([0, 15, 30, 45], "DOK2"),
  },
  {
    id: "readClockFive",
    bands: [2],
    family: PROCEDURAL,
    subskills: ["readClock"],
    build: () => clockRead(FIVES, "DOK2"),
  },
  {
    id: "amPmReasoning",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["timeConcepts"],
    build() {
      const item = pick(AM_PM);
      const actor = pick(ACTORS);
      return {
        answer: item.answer,
        answerType: "choice",
        choices: ["a.m.", "p.m."],
        promptText: `${actor} ${item.event} at ${item.time}. Is that a.m. or p.m.?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["hourMinuteSwap"],
      };
    },
  },
  {
    id: "earliestTime",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["timeConcepts"],
    build() {
      // Three distinct times on the same morning; ordering them needs the
      // hour AND the minutes, not just the bigger-looking number.
      const totals = [];
      while (totals.length < 3) {
        const t = randInt(8 * 60, 11 * 60 + 55);
        if (!totals.includes(t)) totals.push(t);
      }
      const earliest = Math.min(...totals);
      return {
        answer: fmt(earliest),
        answerType: "choice",
        choices: shuffleArray(totals.map(fmt)),
        promptText: `Which time is earliest? ${totals.map(fmt).join(", ")}`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["hourMinuteSwap"],
      };
    },
  },
  {
    id: "elapsedWithinHour",
    bands: [2, 3],
    family: APPLICATION,
    subskills: ["elapsedTime"],
    build() {
      const hour = randInt(1, 11);
      const startM = randInt(0, 9) * 5;
      const duration = randInt(1, Math.max(1, Math.floor((55 - startM) / 5))) * 5;
      const actor = pick(ACTORS);
      const start = hour * 60 + startM;
      return {
        answer: duration,
        answerType: "numberPad",
        promptText: `${actor}'s recess starts at ${fmt(start)} and ends at ${fmt(start + duration)}. How many minutes long is recess?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["offByFive", "operationSwap"],
        distractorContext: { a: startM, b: startM + duration },
      };
    },
  },

  // ---- band 3 --------------------------------------------------------------
  {
    id: "readClockMinute",
    bands: [3],
    family: PROCEDURAL,
    subskills: ["readClock"],
    build: () => clockRead(EVERY_MINUTE, "DOK2"),
  },
  {
    id: "elapsedAcrossHour",
    bands: [3],
    family: APPLICATION,
    subskills: ["elapsedTime"],
    build() {
      // Start at :35 or later and run at least 25 minutes, so the interval
      // ALWAYS crosses the hour — that is the structural difficulty here.
      const start = randInt(1, 9) * 60 + randInt(7, 11) * 5;
      const duration = randInt(5, 18) * 5;
      const end = start + duration;
      const actor = pick(ACTORS);
      const wrong = decimalMinutes(start, end);
      return {
        answer: duration,
        // Asked as multiple choice often enough that the decimal-subtraction
        // answer is on screen to be rejected.
        answerType: Math.random() < 0.4 ? "choice" : "numberPad",
        choices:
          wrong === duration
            ? null
            : optionSet(duration, [wrong, duration + 5, duration - 5], [duration + 10, duration + 15]),
        promptText: `${actor}'s film starts at ${fmt(start)} and ends at ${fmt(end)}. How many minutes long is it?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["decimalTimeArithmetic", "offByFive"],
        distractorContext: { a: start, b: end },
      };
    },
  },
  {
    id: "elapsedEndUnknown",
    bands: [3],
    family: APPLICATION,
    subskills: ["elapsedTime"],
    build() {
      const start = randInt(2, 8) * 60 + randInt(0, 11) * 5;
      const duration = randInt(3, 18) * 5;
      const end = start + duration;
      const actor = pick(ACTORS);
      return {
        answer: fmt(end),
        answerType: "choice",
        choices: optionSet(
          fmt(end),
          // Adding the duration to the minutes without carrying the hour, and
          // an hour either side.
          [fmt(start + duration + 60), fmt(start + duration - 60), fmt(start + duration + 5)],
          [fmt(start + duration + 10), fmt(start + duration + 15)]
        ),
        promptText: `${actor}'s swim class starts at ${fmt(start)} and lasts ${duration} minutes. What time does it end?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["decimalTimeArithmetic", "offByFive"],
      };
    },
  },
  {
    id: "elapsedStartUnknown",
    bands: [3],
    family: APPLICATION,
    subskills: ["elapsedTime"],
    build() {
      const duration = randInt(3, 12) * 5;
      const start = randInt(2, 8) * 60 + randInt(0, 11) * 5;
      const end = start + duration;
      const actor = pick(ACTORS);
      return {
        answer: fmt(start),
        answerType: "choice",
        choices: optionSet(
          fmt(start),
          // The commonest error is adding the duration instead of subtracting.
          [fmt(end + duration), fmt(start + 60), fmt(start - 60)],
          [fmt(start + 5), fmt(start + 10)]
        ),
        promptText: `${actor}'s band practice ends at ${fmt(end)} after ${duration} minutes. What time did it start?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["startAsResult", "decimalTimeArithmetic"],
      };
    },
  },
  {
    id: "calendarDuration",
    bands: [3],
    family: APPLICATION,
    subskills: ["calendar"],
    build() {
      const month = pick(["June", "July", "March", "May"]);
      const startDay = randInt(1, 8);
      const weeks = randInt(1, 3);
      return {
        answer: weeks,
        answerType: "numberPad",
        promptText: `Camp runs from ${month} ${startDay} to ${month} ${startDay + weeks * 7}. How many weeks is that?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["wrongFactor", "offByOne"],
        distractorContext: { a: weeks * 7, b: 7 },
      };
    },
  },
  {
    id: "errorAnalysisElapsed",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["elapsedTime"],
    build() {
      const start = randInt(1, 9) * 60 + randInt(7, 11) * 5;
      const duration = randInt(5, 15) * 5;
      const end = start + duration;
      const actor = pick(ACTORS);
      return {
        answer: duration,
        answerType: "numberPad",
        promptText: `${actor} says a show from ${fmt(start)} to ${fmt(end)} lasts ${decimalMinutes(start, end)} minutes, by subtracting the digits. How many minutes is it really?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["decimalTimeArithmetic"],
        distractorContext: { a: start, b: end },
      };
    },
  },
];

export const TIME_VARIETIES = VARIETIES.map((v) => v.id);

function selectVariety(level, context) {
  const b = bandOf(level);
  let pool = VARIETIES.filter((v) => v.bands.includes(b));
  if (context.allowWordProblems === false) {
    const dry = pool.filter((v) => v.family !== APPLICATION);
    if (dry.length) pool = dry;
  }
  if (context.itemFamily) {
    const byFamily = pool.filter((v) => v.family === context.itemFamily);
    const anyBand = VARIETIES.filter((v) => v.family === context.itemFamily);
    pool = byFamily.length ? byFamily : anyBand.length ? anyBand : pool;
  }
  if (context.targetSubskill) {
    const bySubskill = pool.filter((v) => v.subskills.includes(context.targetSubskill));
    if (bySubskill.length) pool = bySubskill;
  }
  return pick(pool);
}

export default {
  id: "time",
  label: "Clock Stop!",
  shortLabel: "Time",
  description: "Read clocks and work with elapsed time.",
  icon: "Clock",
  op: "time",
  subskills: SUBSKILLS,
  // Every item here is a clock face or a story; none carries an `a op b`
  // relation, so no format transform applies.
  supportedFormats: [],
  families: Object.values(ITEM_FAMILIES),
  varieties: TIME_VARIETIES,

  generate(level, context = {}) {
    const variety = selectVariety(level, context);
    const built = variety.build(level, context.targetSubskill);
    const itemFamily = variety.family;

    const question = {
      op: "time",
      answer: built.answer,
      answerType: built.answerType,
      level,
      display: { ...(built.display || {}), promptText: built.promptText },
    };
    if (built.choices) question.choices = built.choices;
    if (built.distractorContext) question.distractorContext = built.distractorContext;

    question.metadata = createQuestionMetadata({
      modeId: "time",
      level,
      domain: "MD",
      cluster: "Tell and write time; measure time intervals",
      subskill: built.subskill || variety.subskills[0],
      itemFamily,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP2", "MP6"],
      standardRefs: ["1.MD", "2.MD", "3.MD"],
      misconceptionTags: built.misconceptionTags,
      blueprintId: `time-${itemFamily}-${variety.id}`,
      structureType: variety.id,
    });
    return question;
  },

  generateChoices(answer, question) {
    if (Array.isArray(question?.choices)) return question.choices;
    if (typeof answer !== "number") return null;
    return buildDistractors({
      answer,
      misconceptions: question?.metadata?.misconceptionTags || [],
      min: 0,
      ...(question?.distractorContext || {}),
    });
  },
};
