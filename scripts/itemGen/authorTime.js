#!/usr/bin/env node
/**
 * Build the time bank via the shared assembler (bankAssembler.js).
 * Elapsed/durations ride countMath {gap} on absolute minutes; everything
 * clock-and-calendar-shaped carries a display.time claim that THIS file
 * re-derives (word times, hand reads, weekday hops, month lengths,
 * end/start-unknown, the digit-subtraction misconception).
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorTime.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorTime.js --write --tag b0821
 */

import { readClockProcedural, readClockConceptual, elapsedProcedural, elapsedConceptual, HOUR_WORDS } from "./timeTemplates.js";
import { timeConceptsProcedural, timeConceptsConceptual, calendarProcedural, calendarConceptual, WEEKDAYS, MONTHS } from "./timeTemplates2.js";
import { buildStoryItems } from "./timeStories.js";
import { runAssembler } from "./bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const pad = (n) => String(n).padStart(2, "0");
const fmt = (h, m) => `${h}:${pad(m)}`;
const wrapH = (n) => ((n % 12) + 12 - 1) % 12 + 1;
const DAYS_IN = { January: 31, February: 28, March: 31, April: 30, May: 31, June: 30, July: 31, August: 31, September: 30, October: 31, November: 30, December: 31 };
const UNIT_TABLE = { hour: 60, minute: 60, day: 24, halfHour: 30, halfMinute: 30, quarterHour: 15, week: 7 };

function expectedFromTime(t, q) {
  switch (t.kind) {
    case "faceRead":
      return t.minute;
    case "handsWords":
      return t.minute === 0 ? `${HOUR_WORDS[t.hour]} o'clock` : `half past ${HOUR_WORDS[t.hour]}`;
    case "wordsDigital":
      return fmt(t.hour, t.minute);
    case "digitalWords":
      return t.words;
    case "judgeRead":
      return t.saidHour === t.hour && t.saidMinute === t.minute ? "Yes" : "No";
    case "hourLater":
      return wrapH(t.hour + t.delta + 24);
    case "endTime": {
      const total = t.startH * 60 + t.startM + t.dur;
      return fmt(wrapH(Math.floor(total / 60)), total % 60);
    }
    case "startTime": {
      const total = t.endH * 60 + t.endM - t.dur;
      return fmt(wrapH(Math.floor(total / 60) + 24), ((total % 60) + 60) % 60);
    }
    case "elapsedSaid":
      return t.said === t.e - t.s ? "Yes" : "No";
    case "crossHour":
      return t.m + t.d >= 60 ? "Yes" : "No";
    case "closerNext":
      return t.minute > 30 ? "Yes" : "No";
    case "betweenHours":
      return `${t.hour} and ${(t.hour % 12) + 1}`;
    case "unit":
      return UNIT_TABLE[t.unit] != null ? UNIT_TABLE[t.unit] * t.n : undefined;
    case "halfHours":
      return t.n * 30;
    case "monthLen":
      return DAYS_IN[t.month];
    case "weekdayHop": {
      const idx = WEEKDAYS.indexOf(t.from);
      return idx === -1 ? undefined : WEEKDAYS[(((idx + t.k) % 7) + 7) % 7];
    }
    case "monthHop": {
      const idx = MONTHS.indexOf(t.from);
      return idx === -1 ? undefined : MONTHS[(((idx + t.k) % 12) + 12) % 12];
    }
    case "weekend": {
      const isWeekend = t.day === "Saturday" || t.day === "Sunday";
      return (t.claim === "weekend" ? isWeekend : !isWeekend) ? "Yes" : "No";
    }
    case "weeksBetween":
      return (t.b - t.a) % 7 === 0 ? (t.b - t.a) / 7 : undefined;
    case "spanSaid":
      return t.said === t.b - t.a ? "Yes" : "No";
    case "dayPart":
      return t.part;
    case "amPm":
      return t.label;
    case "longer":
      return t.la === t.lb ? undefined : null; // labels; just reject ties
    case "compare":
      return t.a === t.b ? undefined : null;
    case "handSwap":
      return "No";
    case "hourHand":
      return "the short hand";
    case "leadingZero":
      return "the friend";
    case "unitOrder":
      return t.rankA > t.rankB ? "Yes" : "No";
    case "dayOrder": {
      const ia = WEEKDAYS.indexOf(t.a);
      const ib = WEEKDAYS.indexOf(t.b);
      return ia === -1 || ib === -1 ? undefined : ia < ib ? t.a : t.b;
    }
    case "minuteHandDir":
      return t.minute === 30 ? "straight down at the six" : "straight up at the twelve";
    case "longest": {
      // Label answers; verify the max is unique so the item has one right choice.
      const max = Math.max(...t.values);
      return t.values.filter((v) => v === max).length === 1 ? null : undefined;
    }
    case "benchmark":
    case "bestUnit":
    case "claim":
      return null; // human-authored truth; judged consistency still checked
    default:
      return undefined;
  }
}

function extraProblems(item) {
  const q = item.question;
  const d = q.display || {};
  const problems = [];

  if (Array.isArray(q.choices) && (q.answer === "Yes" || q.answer === "No")) {
    if (typeof d.truth !== "boolean") problems.push("judged item missing display.truth");
    else if ((q.answer === "Yes") !== d.truth) problems.push("judged answer disagrees with truth");
  }
  if (Array.isArray(q.choices)) {
    if (!q.choices.map(String).includes(String(q.answer))) problems.push("answer missing from choices");
    if (new Set(q.choices.map(String)).size !== q.choices.length) problems.push("duplicate choices");
  }

  if (d.type === "clock") {
    if (!(Number.isInteger(d.hour) && d.hour >= 1 && d.hour <= 12)) problems.push(`bad clock hour ${d.hour}`);
    if (!(Number.isInteger(d.minute) && d.minute >= 0 && d.minute <= 59)) problems.push(`bad clock minute ${d.minute}`);
    if (q.answerType !== "clock") problems.push("clock face without clock answerType");
    if (q.answer !== d.minute) problems.push(`clock answer ${q.answer} != shown minute ${d.minute}`);
  }

  const t = d.time;
  if (t) {
    const expected = expectedFromTime(t, q);
    if (expected === undefined) problems.push(`bad time claim "${t.kind}"`);
    else if (expected !== null && String(expected) !== String(q.answer)) {
      problems.push(`time claim "${t.kind}" gives ${expected} but answer is ${q.answer}`);
    }
  }

  return problems;
}

await runAssembler({
  modeId: "time",
  subskills: ["readClock", "elapsedTime", "timeConcepts", "calendar"],
  rawItems: [
    ...readClockProcedural(),
    ...readClockConceptual(),
    ...elapsedProcedural(),
    ...elapsedConceptual(),
    ...timeConceptsProcedural(),
    ...timeConceptsConceptual(),
    ...calendarProcedural(),
    ...calendarConceptual(),
    ...buildStoryItems(),
  ],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
