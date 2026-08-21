/* time bank part 2 — timeConcepts and calendar cells.
 * See timeTemplates.js for register and claim conventions.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";
import { LEVELS } from "./timeTemplates.js";

const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "time",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const nameAt = (i) => NAMES[i % NAMES.length];

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_IN = { January: 31, February: 28, March: 31, April: 30, May: 31, June: 30, July: 31, August: 31, September: 30, October: 31, November: 30, December: 31 };

/* ================================================================== */
/* timeConcepts                                                        */
/* ================================================================== */

export function timeConceptsProcedural() {
  const items = [];

  // Band 1 — unit ladder facts, all prompt numbers <= 20.
  const unitDrills1 = [
    ["1 hour = ? minutes", 60, "hour", 1, "minutes"],
    ["1 minute = ? seconds", 60, "minute", 1, "seconds"],
    ["1 day = ? hours", 24, "day", 1, "hours"],
    ["2 hours = ? minutes", 120, "hour", 2, "minutes"],
    ["Half an hour = ? minutes", 30, "halfHour", 1, "minutes"],
    ["2 minutes = ? seconds", 120, "minute", 2, "seconds"],
    ["2 days = ? hours", 48, "day", 2, "hours"],
    ["3 hours = ? minutes", 180, "hour", 3, "minutes"],
    ["Half a minute = ? seconds", 30, "halfMinute", 1, "seconds"],
    ["3 days = ? hours", 72, "day", 3, "hours"],
    ["3 minutes = ? seconds", 180, "minute", 3, "seconds"],
    ["4 hours = ? minutes", 240, "hour", 4, "minutes"],
    ["A quarter of an hour = ? minutes", 15, "quarterHour", 1, "minutes"],
    ["5 hours = ? minutes", 300, "hour", 5, "minutes"],
    ["4 minutes = ? seconds", 240, "minute", 4, "seconds"],
    ["5 minutes = ? seconds", 300, "minute", 5, "seconds"],
    ["10 hours = ? minutes", 600, "hour", 10, "minutes"],
    ["6 hours = ? minutes", 360, "hour", 6, "minutes"],
    ["4 days = ? hours", 96, "day", 4, "hours"],
    ["10 minutes = ? seconds", 600, "minute", 10, "seconds"],
    ["7 hours = ? minutes", 420, "hour", 7, "minutes"],
    ["6 minutes = ? seconds", 360, "minute", 6, "seconds"],
    ["8 hours = ? minutes", 480, "hour", 8, "minutes"],
    ["5 days = ? hours", 120, "day", 5, "hours"],
    ["9 hours = ? minutes", 540, "hour", 9, "minutes"],
    ["7 minutes = ? seconds", 420, "minute", 7, "seconds"],
  ];
  for (const [text, answer, unit, n] of unitDrills1) {
    items.push(
      item("timeConcepts", "procedural", "unitFactTeen", "band1", {
        answer,
        answerType: "numberPad",
        display: { time: { kind: "unit", unit, n }, promptText: text },
      })
    );
  }
  // Count on by whole hours across noon-free spans (word form).
  const HOURW = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const skipPhr = rotor([
    (a, b, c) => `Clock chimes: ${a} o'clock, ${b} o'clock, ${c} o'clock. Which hour chimes next?`,
    (a, b, c) => `The bell rings each hour: ${a}, ${b}, ${c}. What hour rings next?`,
  ]);
  for (const s of [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, 9)) {
    items.push(
      item("timeConcepts", "procedural", "hourChimeNext", "band1", {
        answer: s + 3,
        answerType: "numberPad",
        display: { counting: { kind: "next", sequence: [s, s + 1, s + 2], step: 1 }, promptText: skipPhr()(HOURW[s], HOURW[s + 1], HOURW[s + 2]) },
      })
    );
  }
  // (17 chime items would repeat strings; 9 distinct starts is the cap.)
  // Fill the band with half-hour ladders: n half hours = ? minutes.
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].slice(0, 17)) {
    items.push(
      item("timeConcepts", "procedural", "halfHourLadder", "band1", {
        answer: n * 30,
        answerType: "numberPad",
        display: { time: { kind: "halfHours", n }, promptText: `${n} half hours = ? minutes` },
      })
    );
  }

  // Band 2 — mixed conversions.
  const mixed2 = [
    ["1 hour 15 minutes = ? minutes", 75, 1, 15], ["1 hour 30 minutes = ? minutes", 90, 1, 30],
    ["1 hour 45 minutes = ? minutes", 105, 1, 45], ["2 hours 10 minutes = ? minutes", 130, 2, 10],
    ["2 hours 30 minutes = ? minutes", 150, 2, 30], ["2 hours 45 minutes = ? minutes", 165, 2, 45],
    ["3 hours 20 minutes = ? minutes", 200, 3, 20], ["3 hours 40 minutes = ? minutes", 220, 3, 40],
    ["1 hour 5 minutes = ? minutes", 65, 1, 5], ["1 hour 50 minutes = ? minutes", 110, 1, 50],
    ["2 hours 5 minutes = ? minutes", 125, 2, 5], ["2 hours 55 minutes = ? minutes", 175, 2, 55],
    ["3 hours 15 minutes = ? minutes", 195, 3, 15], ["4 hours 10 minutes = ? minutes", 250, 4, 10],
    ["1 hour 25 minutes = ? minutes", 85, 1, 25], ["1 hour 40 minutes = ? minutes", 100, 1, 40],
    ["2 hours 20 minutes = ? minutes", 140, 2, 20], ["2 hours 35 minutes = ? minutes", 155, 2, 35],
    ["3 hours 5 minutes = ? minutes", 185, 3, 5], ["4 hours 30 minutes = ? minutes", 270, 4, 30],
    ["1 hour 55 minutes = ? minutes", 115, 1, 55], ["3 hours 50 minutes = ? minutes", 230, 3, 50],
    ["4 hours 45 minutes = ? minutes", 285, 4, 45], ["2 hours 25 minutes = ? minutes", 145, 2, 25],
    ["3 hours 35 minutes = ? minutes", 215, 3, 35], ["4 hours 20 minutes = ? minutes", 260, 4, 20],
  ];
  for (const [text, answer, h, m] of mixed2) {
    items.push(
      item("timeConcepts", "procedural", "mixedToMinutes", "band2", {
        answer,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [h * 60, m] }, promptText: text },
      })
    );
  }
  const back2 = [
    ["75 minutes = 1 hour and ? minutes", 15, 75], ["90 minutes = 1 hour and ? minutes", 30, 90],
    ["100 minutes = 1 hour and ? minutes", 40, 100], ["130 minutes = 2 hours and ? minutes", 10, 130],
    ["150 minutes = 2 hours and ? minutes", 30, 150], ["170 minutes = 2 hours and ? minutes", 50, 170],
    ["200 minutes = 3 hours and ? minutes", 20, 200], ["185 minutes = 3 hours and ? minutes", 5, 185],
    ["65 minutes = 1 hour and ? minutes", 5, 65], ["110 minutes = 1 hour and ? minutes", 50, 110],
    ["125 minutes = 2 hours and ? minutes", 5, 125], ["145 minutes = 2 hours and ? minutes", 25, 145],
    ["195 minutes = 3 hours and ? minutes", 15, 195], ["250 minutes = 4 hours and ? minutes", 10, 250],
    ["85 minutes = 1 hour and ? minutes", 25, 85], ["160 minutes = 2 hours and ? minutes", 40, 160],
    ["215 minutes = 3 hours and ? minutes", 35, 215], ["270 minutes = 4 hours and ? minutes", 30, 270],
    ["95 minutes = 1 hour and ? minutes", 35, 95], ["140 minutes = 2 hours and ? minutes", 20, 140],
    ["230 minutes = 3 hours and ? minutes", 50, 230], ["285 minutes = 4 hours and ? minutes", 45, 285],
    ["105 minutes = 1 hour and ? minutes", 45, 105], ["155 minutes = 2 hours and ? minutes", 35, 155],
    ["225 minutes = 3 hours and ? minutes", 45, 225], ["260 minutes = 4 hours and ? minutes", 20, 260],
  ];
  for (const [text, answer, total] of back2) {
    items.push(
      item("timeConcepts", "procedural", "minutesToMixed", "band2", {
        answer,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: Math.floor(total / 60) * 60, target: total }, promptText: text },
      })
    );
  }

  // Band 3 — seconds and day conversions.
  const big3 = [
    ["2 minutes 30 seconds = ? seconds", 150, [120, 30]], ["3 minutes 15 seconds = ? seconds", 195, [180, 15]],
    ["4 minutes 45 seconds = ? seconds", 285, [240, 45]], ["5 minutes 20 seconds = ? seconds", 320, [300, 20]],
    ["2 days 6 hours = ? hours", 54, [48, 6]], ["3 days 12 hours = ? hours", 84, [72, 12]],
    ["1 day 18 hours = ? hours", 42, [24, 18]], ["4 days 3 hours = ? hours", 99, [96, 3]],
    ["6 minutes 40 seconds = ? seconds", 400, [360, 40]], ["7 minutes 25 seconds = ? seconds", 445, [420, 25]],
    ["2 days 15 hours = ? hours", 63, [48, 15]], ["5 days 9 hours = ? hours", 129, [120, 9]],
    ["8 minutes 10 seconds = ? seconds", 490, [480, 10]], ["3 minutes 55 seconds = ? seconds", 235, [180, 55]],
    ["1 day 7 hours = ? hours", 31, [24, 7]], ["6 days 2 hours = ? hours", 146, [144, 2]],
    ["9 minutes 35 seconds = ? seconds", 575, [540, 35]], ["4 minutes 5 seconds = ? seconds", 245, [240, 5]],
    ["3 days 21 hours = ? hours", 93, [72, 21]], ["7 days 11 hours = ? hours", 179, [168, 11]],
    ["5 minutes 50 seconds = ? seconds", 350, [300, 50]], ["2 minutes 45 seconds = ? seconds", 165, [120, 45]],
    ["2 days 20 hours = ? hours", 68, [48, 20]], ["4 days 16 hours = ? hours", 112, [96, 16]],
    ["6 minutes 15 seconds = ? seconds", 375, [360, 15]], ["8 minutes 55 seconds = ? seconds", 535, [480, 55]],
  ];
  for (const [text, answer, parts] of big3) {
    items.push(
      item("timeConcepts", "procedural", "bigUnitCompose", "band3", {
        answer,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts }, promptText: text },
      })
    );
  }
  const back3 = [
    ["150 seconds = 2 minutes and ? seconds", 30, 150, 120], ["195 seconds = 3 minutes and ? seconds", 15, 195, 180],
    ["285 seconds = 4 minutes and ? seconds", 45, 285, 240], ["320 seconds = 5 minutes and ? seconds", 20, 320, 300],
    ["54 hours = 2 days and ? hours", 6, 54, 48], ["84 hours = 3 days and ? hours", 12, 84, 72],
    ["42 hours = 1 day and ? hours", 18, 42, 24], ["99 hours = 4 days and ? hours", 3, 99, 96],
    ["400 seconds = 6 minutes and ? seconds", 40, 400, 360], ["445 seconds = 7 minutes and ? seconds", 25, 445, 420],
    ["63 hours = 2 days and ? hours", 15, 63, 48], ["129 hours = 5 days and ? hours", 9, 129, 120],
    ["490 seconds = 8 minutes and ? seconds", 10, 490, 480], ["235 seconds = 3 minutes and ? seconds", 55, 235, 180],
    ["31 hours = 1 day and ? hours", 7, 31, 24], ["146 hours = 6 days and ? hours", 2, 146, 144],
    ["575 seconds = 9 minutes and ? seconds", 35, 575, 540], ["245 seconds = 4 minutes and ? seconds", 5, 245, 240],
    ["93 hours = 3 days and ? hours", 21, 93, 72], ["179 hours = 7 days and ? hours", 11, 179, 168],
    ["350 seconds = 5 minutes and ? seconds", 50, 350, 300], ["165 seconds = 2 minutes and ? seconds", 45, 165, 120],
    ["68 hours = 2 days and ? hours", 20, 68, 48], ["112 hours = 4 days and ? hours", 16, 112, 96],
    ["375 seconds = 6 minutes and ? seconds", 15, 375, 360], ["535 seconds = 8 minutes and ? seconds", 55, 535, 480],
  ];
  for (const [text, answer, total, base] of back3) {
    items.push(
      item("timeConcepts", "procedural", "bigUnitDecompose", "band3", {
        answer,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: base, target: total }, promptText: text },
      })
    );
  }

  return items;
}

export function timeConceptsConceptual() {
  const items = [];
  let seed = 141;

  // Band 1 — duration benchmarks, day parts, event order.
  const BENCH = [
    ["brush your teeth", "2 minutes", ["2 seconds", "2 hours", "2 days"]],
    ["blink once", "1 second", ["1 minute", "1 hour", "1 day"]],
    ["sleep at night", "9 hours", ["9 minutes", "9 seconds", "9 days"]],
    ["eat lunch", "20 minutes", ["20 seconds", "20 hours", "20 days"]],
    ["tie a shoelace", "10 seconds", ["10 minutes", "10 hours", "10 days"]],
    ["read a picture book", "15 minutes", ["15 seconds", "15 hours", "15 days"]],
    ["sing one song", "3 minutes", ["3 seconds", "3 hours", "3 days"]],
    ["clap once", "1 second", ["1 hour", "1 day", "1 minute"]],
    ["ride the bus to school", "20 minutes", ["20 days", "20 seconds", "20 hours"]],
  ];
  const benchPhr = rotor([
    (nm, task) => `About how long does it take ${nm} to ${task}?`,
    (nm, task) => `${nm} wants to guess the time needed to ${task}. Which guess makes sense?`,
  ]);
  BENCH.forEach(([task, good, wrong], i) => {
    for (const p of [0, 1]) {
      items.push(
        item("timeConcepts", "conceptual", "durationBenchmark", "band1", {
          answer: good,
          choices: shuffled([good, ...wrong], (seed += 1)),
          display: { time: { kind: "benchmark" }, promptText: benchPhr()(nameAt(i * 3 + p * 5 + 1), task) },
        })
      );
    }
  });
  const dayPartPhr = rotor([
    (nm, event) => `${nm} ${event}. Which part of the day is that?`,
    (nm, event) => `When ${nm} ${event}, is it morning, afternoon, or night?`,
  ]);
  const DAY_PARTS = [
    ["eats breakfast", "morning"], ["packs a bag for school", "morning"], ["plays outside after lunch", "afternoon"],
    ["has a snack after school", "afternoon"], ["puts on pajamas for bed", "night"], ["looks at the stars", "night"],
    ["watches the sunrise", "morning"], ["waves goodnight to the moon", "night"], ["walks home when school ends", "afternoon"],
  ];
  DAY_PARTS.forEach(([event, part], i) => {
    for (const p of [0, 1]) {
      items.push(
        item("timeConcepts", "conceptual", "dayPartPick", "band1", {
          answer: part,
          choices: shuffled(["morning", "afternoon", "night"], (seed += 1)),
          display: { time: { kind: "dayPart", part }, promptText: dayPartPhr()(nameAt(i * 3 + p * 7 + 2), event) },
        })
      );
    }
  });

  // Band 2 — a.m./p.m. and unit comparisons.
  const AMPM = [
    ["eats breakfast", "7:30", "a.m."], ["goes to bed", "8:15", "p.m."], ["starts school", "8:45", "a.m."],
    ["eats dinner", "6:30", "p.m."], ["wakes up", "6:50", "a.m."], ["watches the sunset", "7:40", "p.m."],
    ["catches the morning bus", "7:55", "a.m."], ["brushes teeth before bed", "8:40", "p.m."], ["eats a midnight-snack apple at noon recess", "12:05", "p.m."],
  ];
  const ampmPhr = rotor([
    (nm, event, t) => `${nm} ${event} at ${t}. Is that a.m. or p.m.?`,
    (nm, event, t) => `At ${t}, ${nm} ${event}. Which label fits, a.m. or p.m.?`,
  ]);
  AMPM.forEach(([event, t, good], i) => {
    for (const p of [0, 1]) {
      items.push(
        item("timeConcepts", "conceptual", "amPmPick", "band2", {
          answer: good,
          choices: shuffled(["a.m.", "p.m."], (seed += 1)),
          display: { time: { kind: "amPm", label: good }, promptText: ampmPhr()(nameAt(i * 3 + p * 9 + 3), event, t) },
        })
      );
    }
  });
  const unitComparePhr = rotor([
    (nm, a, b) => `${nm} compares ${a} with ${b}. Which is longer?`,
    (nm, a, b) => `Which lasts longer, ${a} or ${b}? ${nm} thinks it through.`,
  ]);
  const UNIT_CMP = [
    ["90 minutes", 90, "1 hour", 60], ["1 hour", 60, "70 minutes", 70], ["2 hours", 120, "100 minutes", 100],
    ["150 minutes", 150, "2 hours", 120], ["3 hours", 180, "200 minutes", 200], ["1 hour", 60, "59 minutes", 59],
    ["2 hours", 120, "130 minutes", 130], ["95 minutes", 95, "1 hour", 60], ["4 hours", 240, "230 minutes", 230],
    ["1 hour", 60, "3600 seconds... wait", 0, null],
  ].slice(0, 9).filter((x) => x[3] !== null);
  UNIT_CMP.forEach(([a, av, b, bv], i) => {
    for (const p of [0, 1]) {
      items.push(
        item("timeConcepts", "conceptual", "unitCompare", "band2", {
          answer: av > bv ? a : b,
          choices: shuffled([a, b], (seed += 1)),
          display: { time: { kind: "longer", la: av, lb: bv }, promptText: unitComparePhr()(nameAt(i * 3 + p * 11 + 4), a, b) },
        })
      );
    }
  });

  // Band 1 top-up: which unit is longer (seconds < minutes < hours < days).
  const unitOrderPhr = rotor([
    (nm, a, b) => `${nm} says one ${a} is longer than one ${b}. Is ${nm} right?`,
    (nm, a, b) => `${nm} claims a whole ${a} lasts longer than a whole ${b}. Is that right?`,
  ]);
  const UNIT_RANK = { second: 1, minute: 2, hour: 3, day: 4, week: 5 };
  [["minute", "second", true], ["second", "minute", false], ["hour", "minute", true], ["minute", "hour", false], ["day", "hour", true], ["hour", "day", false], ["week", "day", true], ["day", "week", false], ["hour", "second", true], ["second", "hour", false], ["day", "minute", true], ["minute", "day", false], ["week", "hour", true], ["second", "day", false], ["day", "second", true], ["minute", "week", false]].forEach(([a, b, ok], i) => {
    items.push(
      item("timeConcepts", "conceptual", "unitOrderJudge", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "unitOrder", a, b, rankA: UNIT_RANK[a], rankB: UNIT_RANK[b] }, promptText: unitOrderPhr()(nameAt(i * 3 + 7), a, b), truth: ok },
      })
    );
  });

  // Band 2 top-up: judged small conversions.
  const smallConvPhr = rotor([
    (nm, claim) => `${nm} tells a friend: ${claim}. Is ${nm} right?`,
    (nm, claim) => `On the whiteboard ${nm} writes: ${claim}. Is that right?`,
  ]);
  [["1 hour is 60 minutes", true], ["1 hour is 100 minutes", false], ["half an hour is 30 minutes", true], ["half an hour is 50 minutes", false], ["1 minute is 60 seconds", true], ["1 minute is 100 seconds", false], ["a quarter of an hour is 15 minutes", true], ["a quarter of an hour is 25 minutes", false], ["1 day is 24 hours", true], ["1 day is 12 hours", false], ["2 hours is 120 minutes", true], ["2 hours is 200 minutes", false], ["90 minutes is 1 hour 30 minutes", true], ["90 minutes is 1 hour 90 minutes", false], ["45 minutes is three quarters of an hour", true], ["45 minutes is half an hour", false]].forEach(([claim, ok], i) => {
    items.push(
      item("timeConcepts", "conceptual", "smallConvJudge", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "claim" }, promptText: smallConvPhr()(nameAt(i * 3 + 8), claim), truth: ok },
      })
    );
  });

  // Band 3 top-up: which duration is longest (mixed units).
  const longestPhr = rotor([
    (nm, a, b, c) => `${nm} lines up three durations: ${a}, ${b}, ${c}. Which one is the longest?`,
    (nm, a, b, c) => `Of ${a}, ${b}, and ${c}, which lasts the longest? ${nm} converts to check.`,
  ]);
  [[["2 hours", 120], ["100 minutes", 100], ["90 minutes", 90]], [["1 day", 1440], ["20 hours", 1200], ["1000 minutes", 1000]], [["3 hours", 180], ["190 minutes", 190], ["2 hours 50 minutes", 170]], [["150 minutes", 150], ["2 hours", 120], ["2 hours 20 minutes", 140]], [["4 hours", 240], ["250 minutes", 250], ["3 hours 55 minutes", 235]], [["1 day", 1440], ["23 hours", 1380], ["1500 minutes", 1500]], [["2 hours 30 minutes", 150], ["145 minutes", 145], ["2 hours", 120]], [["5 hours", 300], ["290 minutes", 290], ["4 hours 55 minutes", 295]], [["180 minutes", 180], ["3 hours 10 minutes", 190], ["2 hours 50 minutes", 170]], [["6 hours", 360], ["350 minutes", 350], ["5 hours 45 minutes", 345]], [["2 days", 2880], ["45 hours", 2700], ["2800 minutes", 2800]], [["1 hour 55 minutes", 115], ["110 minutes", 110], ["2 hours", 120]], [["7 hours", 420], ["430 minutes", 430], ["6 hours 50 minutes", 410]], [["240 minutes", 240], ["4 hours 5 minutes", 245], ["3 hours 58 minutes", 238]], [["8 hours", 480], ["470 minutes", 470], ["7 hours 55 minutes", 475]], [["3 days", 4320], ["70 hours", 4200], ["4300 minutes", 4300]], [["1 hour 25 minutes", 85], ["80 minutes", 80], ["1 hour 20 minutes", 80? 0 : 0]]].slice(0, 16).forEach(([A, B, C], i) => {
    const trio = [A, B, C];
    const best = trio.reduce((x, y) => (y[1] > x[1] ? y : x));
    items.push(
      item("timeConcepts", "conceptual", "longestDuration", "band3", {
        answer: best[0],
        choices: shuffled(trio.map((x) => x[0]), (seed += 1)),
        display: { time: { kind: "longest", values: trio.map((x) => x[1]) }, promptText: longestPhr()(nameAt(i * 3 + 9), A[0], B[0], C[0]) },
      })
    );
  });
  // one more to hit 17
  items.push(
    item("timeConcepts", "conceptual", "longestDuration", "band3", {
      answer: "10 hours",
      choices: shuffled(["10 hours", "590 minutes", "9 hours 55 minutes"], (seed += 1)),
      display: { time: { kind: "longest", values: [600, 590, 595] }, promptText: `Rosa lines up three durations: 10 hours, 590 minutes, 9 hours 55 minutes. Which one is the longest?` },
    })
  );

  // Band 3 — judged conversions and reasoning.
  const convJudgePhr = rotor([
    (nm, claim) => `${nm} says ${claim}. Is ${nm} right?`,
    (nm, claim) => `${nm} writes down: ${claim}. Is that right?`,
  ]);
  const CONV = [
    ["2 hours is 120 minutes", true], ["90 minutes is 1 hour 30 minutes", true], ["100 minutes is 1 hour", false],
    ["3 minutes is 180 seconds", true], ["2 days is 40 hours", false], ["1 day is 24 hours", true],
    ["150 seconds is 2 minutes 30 seconds", true], ["2 hours 15 minutes is 125 minutes", false], ["300 seconds is 5 minutes", true],
    ["36 hours is 2 days", false], ["1 hour 45 minutes is 105 minutes", true], ["200 minutes is 2 hours", false],
    ["4 minutes is 240 seconds", true], ["50 hours is 2 days 2 hours", true], ["3 hours is 200 minutes", false],
    ["75 minutes is 1 hour 15 minutes", true], ["400 seconds is 6 minutes", false], ["2 days 6 hours is 54 hours", true],
  ];
  CONV.forEach(([claim, ok], i) => {
    items.push(
      item("timeConcepts", "conceptual", "convJudgeBig", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "claim" }, promptText: convJudgePhr()(nameAt(i * 3 + 5), claim), truth: ok },
      })
    );
  });
  const bestUnitPhr = rotor([
    (nm, thing) => `${nm} wants to measure ${thing}. Which unit fits best?`,
    (nm, thing) => `To time ${thing}, which unit should ${nm} pick?`,
  ]);
  const BEST_UNIT = [
    ["how long summer break lasts", "weeks", ["seconds", "minutes", "hours"]],
    ["one sneeze", "seconds", ["hours", "days", "weeks"]],
    ["a soccer match", "minutes", ["seconds", "days", "weeks"]],
    ["a night of sleep", "hours", ["seconds", "weeks", "months"]],
    ["growing a pumpkin", "months", ["seconds", "minutes", "hours"]],
    ["a school day", "hours", ["seconds", "weeks", "months"]],
    ["boiling an egg", "minutes", ["days", "weeks", "months"]],
    ["a road trip across the country", "days", ["seconds", "minutes", "months"]],
  ];
  BEST_UNIT.forEach(([thing, good, wrong], i) => {
    for (const p of [0, 1]) {
      items.push(
        item("timeConcepts", "conceptual", "bestUnitPick", "band3", {
          answer: good,
          choices: shuffled([good, ...wrong], (seed += 1)),
          display: { time: { kind: "bestUnit" }, promptText: bestUnitPhr()(nameAt(i * 3 + p * 13 + 6), thing) },
        })
      );
    }
  });

  return items;
}

/* ================================================================== */
/* calendar                                                            */
/* ================================================================== */

export function calendarProcedural() {
  const items = [];

  // Band 1 — week facts and weekday hops.
  const weekDrills = [
    ["1 week = ? days", 7, [7]], ["2 weeks = ? days", 14, [7, 7]], ["1 week and 1 day = ? days", 8, [7, 1]],
    ["1 week and 2 days = ? days", 9, [7, 2]], ["1 week and 3 days = ? days", 10, [7, 3]],
    ["2 weeks and 1 day = ? days", 15, [7, 7, 1]], ["1 week and 4 days = ? days", 11, [7, 4]],
    ["2 weeks and 2 days = ? days", 16, [7, 7, 2]], ["1 week and 5 days = ? days", 12, [7, 5]],
    ["2 weeks and 3 days = ? days", 17, [7, 7, 3]], ["1 week and 6 days = ? days", 13, [7, 6]],
    ["2 weeks and 4 days = ? days", 18, [7, 7, 4]], ["2 weeks and 5 days = ? days", 19, [7, 7, 5]],
    ["2 weeks and 6 days = ? days", 20, [7, 7, 6]],
  ];
  for (const [text, answer, parts] of weekDrills) {
    items.push(
      item("calendar", "procedural", "weekDaysTeen", "band1", {
        answer,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts }, promptText: text },
      })
    );
  }
  const hopPhr = rotor([
    (d, k) => `Today is ${d}. What day is it ${k} ${k === 1 ? "day" : "days"} later?`,
    (d, k) => `Start on ${d} and count on ${k} ${k === 1 ? "day" : "days"}. Which day do you land on?`,
  ]);
  const hops = [
    ["Monday", 1], ["Tuesday", 2], ["Wednesday", 3], ["Thursday", 1], ["Friday", 2], ["Saturday", 3], ["Sunday", 1],
    ["Monday", 4], ["Tuesday", 5], ["Wednesday", 2], ["Thursday", 6], ["Friday", 4], ["Saturday", 5], ["Sunday", 3],
    ["Monday", 2], ["Tuesday", 3], ["Wednesday", 5], ["Thursday", 4], ["Friday", 6], ["Saturday", 1], ["Sunday", 6],
    ["Monday", 6], ["Tuesday", 4], ["Wednesday", 6], ["Thursday", 2], ["Friday", 1],
    ["Saturday", 2], ["Sunday", 2], ["Monday", 3], ["Tuesday", 1], ["Wednesday", 1], ["Thursday", 5],
    ["Friday", 3], ["Saturday", 6], ["Sunday", 4], ["Monday", 5], ["Tuesday", 6],
  ];
  hops.forEach(([d, k], i) => {
    const idx = WEEKDAYS.indexOf(d);
    const good = WEEKDAYS[(idx + k) % 7];
    const wrong = [...new Set([WEEKDAYS[(idx + k + 1) % 7], WEEKDAYS[(idx + k + 6) % 7], WEEKDAYS[(idx + 7 - k) % 7]])].filter((x) => x !== good);
    items.push(
      item("calendar", "procedural", "weekdayHopTeen", "band1", {
        answer: good,
        choices: shuffled([good, ...wrong.slice(0, 3)], i + 15),
        display: { time: { kind: "weekdayHop", from: d, k }, promptText: hopPhr()(d, k) },
      })
    );
  });

  // Band 2 — week/day conversions and month lengths.
  const weekDrills2 = [
    ["3 weeks = ? days", 21, [7, 7, 7]], ["4 weeks = ? days", 28, [7, 7, 7, 7]], ["5 weeks = ? days", 35, [7, 7, 7, 7, 7]],
    ["3 weeks and 2 days = ? days", 23, [21, 2]], ["4 weeks and 3 days = ? days", 31, [28, 3]],
    ["3 weeks and 5 days = ? days", 26, [21, 5]], ["6 weeks = ? days", 42, [21, 21]],
    ["5 weeks and 4 days = ? days", 39, [35, 4]], ["4 weeks and 6 days = ? days", 34, [28, 6]],
    ["7 weeks = ? days", 49, [21, 28]], ["6 weeks and 1 day = ? days", 43, [42, 1]],
    ["8 weeks = ? days", 56, [28, 28]], ["5 weeks and 2 days = ? days", 37, [35, 2]],
  ];
  for (const [text, answer, parts] of weekDrills2) {
    items.push(
      item("calendar", "procedural", "weekDaysMid", "band2", {
        answer,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts }, promptText: text },
      })
    );
  }
  const monthLenPhr = rotor([
    (m) => `How many days are in ${m}?`,
    (m) => `${m} has ? days`,
  ]);
  for (const m of MONTHS) {
    items.push(
      item("calendar", "procedural", "monthLength", "band2", {
        answer: DAYS_IN[m],
        answerType: "numberPad",
        display: { time: { kind: "monthLen", month: m } , promptText: monthLenPhr()(m) },
      })
    );
  }
  const backHopPhr = rotor([
    (d, k) => `Today is ${d}. What day was it ${k} days ago?`,
    (d, k) => `Count back ${k} days from ${d}. Which day is that?`,
  ]);
  [["Monday", 2], ["Tuesday", 3], ["Wednesday", 4], ["Thursday", 2], ["Friday", 5], ["Saturday", 6], ["Sunday", 2], ["Monday", 5], ["Tuesday", 6], ["Wednesday", 3], ["Thursday", 5], ["Friday", 3], ["Saturday", 4], ["Sunday", 5], ["Monday", 3], ["Tuesday", 2], ["Wednesday", 6], ["Thursday", 3], ["Friday", 6], ["Saturday", 2], ["Sunday", 4], ["Monday", 4], ["Tuesday", 5], ["Wednesday", 5], ["Thursday", 6], ["Friday", 4], ["Saturday", 3]].forEach(([d, k], i) => {
    const idx = WEEKDAYS.indexOf(d);
    const good = WEEKDAYS[(idx - k + 14) % 7];
    const wrong = [...new Set([WEEKDAYS[(idx + k) % 7], WEEKDAYS[(idx - k + 13) % 7], WEEKDAYS[(idx - k + 15) % 7]])].filter((x) => x !== good);
    items.push(
      item("calendar", "procedural", "weekdayBackMid", "band2", {
        answer: good,
        choices: shuffled([good, ...wrong.slice(0, 3)], i + 17),
        display: { time: { kind: "weekdayHop", from: d, k: -k }, promptText: backHopPhr()(d, k) },
      })
    );
  });

  // Band 3 — date spans within a month.
  const spanPhr = rotor([
    (m, a, b) => `From ${m} ${a} to ${m} ${b} = ? days`,
    (m, a, b) => `Count the days from ${m} ${a} to ${m} ${b}. How many days pass?`,
  ]);
  const spans = [
    ["March", 3, 17], ["June", 5, 26], ["October", 8, 29], ["April", 2, 23], ["August", 6, 27], ["January", 4, 25],
    ["May", 9, 30], ["September", 3, 21], ["November", 7, 28], ["July", 1, 22], ["February", 5, 24], ["December", 10, 31],
    ["March", 12, 28], ["June", 11, 30], ["October", 2, 19], ["April", 9, 27], ["August", 13, 31], ["January", 6, 20],
    ["May", 4, 18], ["September", 8, 25], ["November", 12, 26], ["July", 14, 29], ["February", 3, 19], ["December", 5, 23],
    ["March", 7, 24], ["June", 2, 15],
  ];
  for (const [m, a, b] of spans) {
    items.push(
      item("calendar", "procedural", "dateSpanBig", "band3", {
        answer: b - a,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: a, target: b }, promptText: spanPhr()(m, a, b) },
      })
    );
  }
  const laterDatePhr = rotor([
    (m, a, k) => `${k} days after ${m} ${a} is ${m} ?`,
    (m, a, k) => `Start on ${m} ${a} and count on ${k} days. Which date is that?`,
  ]);
  const laterDates = [
    ["March", 3, 9], ["June", 5, 12], ["October", 8, 14], ["April", 2, 17], ["August", 6, 11], ["January", 4, 16],
    ["May", 9, 13], ["September", 3, 18], ["November", 7, 15], ["July", 1, 19], ["February", 5, 12], ["December", 10, 14],
    ["March", 12, 11], ["June", 11, 13], ["October", 2, 16], ["April", 9, 12], ["August", 13, 17], ["January", 6, 9],
    ["May", 4, 21], ["September", 8, 16], ["November", 12, 13], ["July", 14, 11], ["February", 3, 14], ["December", 5, 18],
    ["March", 7, 16], ["June", 2, 22],
  ];
  for (const [m, a, k] of laterDates) {
    items.push(
      item("calendar", "procedural", "laterDateBig", "band3", {
        answer: a + k,
        answerType: "numberPad",
        display: { counting: { kind: "countOn", start: a, more: k }, promptText: laterDatePhr()(m, a, k) },
      })
    );
  }

  return items;
}

export function calendarConceptual() {
  const items = [];
  let seed = 151;

  // Band 1 — order of days, tomorrow/yesterday, weekend reasoning.
  const tomorrowPhr = rotor([
    (nm, d) => `Today is ${d}, ${nm} says. What day is tomorrow?`,
    (nm, d) => `${nm}'s calendar shows ${d} today. Which day comes next?`,
  ]);
  WEEKDAYS.forEach((d, i) => {
    const good = WEEKDAYS[(i + 1) % 7];
    const wrong = [WEEKDAYS[(i + 6) % 7], WEEKDAYS[(i + 2) % 7], WEEKDAYS[(i + 5) % 7]];
    items.push(
      item("calendar", "conceptual", "tomorrowPick", "band1", {
        answer: good,
        choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
        display: { time: { kind: "weekdayHop", from: d, k: 1 }, promptText: tomorrowPhr()(nameAt(i * 3 + 1), d) },
      })
    );
  });
  const yesterdayPhr = rotor([
    (nm, d) => `It is ${d}. ${nm} wonders what day yesterday was. Which day was it?`,
    (nm, d) => `${nm} flips the calendar back one day from ${d}. Which day shows?`,
  ]);
  WEEKDAYS.forEach((d, i) => {
    const good = WEEKDAYS[(i + 6) % 7];
    const wrong = [WEEKDAYS[(i + 1) % 7], WEEKDAYS[(i + 5) % 7], WEEKDAYS[(i + 2) % 7]];
    items.push(
      item("calendar", "conceptual", "yesterdayPick", "band1", {
        answer: good,
        choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
        display: { time: { kind: "weekdayHop", from: d, k: -1 }, promptText: yesterdayPhr()(nameAt(i * 3 + 2), d) },
      })
    );
  });
  const weekendJudgePhr = rotor([
    (nm, d, claim) => `${nm} says ${d} is a ${claim} day. Is ${nm} right?`,
    (nm, d, claim) => `${nm} marks ${d} as a ${claim} day on the calendar. Is that right?`,
  ]);
  [["Saturday", "weekend", true], ["Monday", "weekend", false], ["Sunday", "weekend", true], ["Wednesday", "weekend", false], ["Friday", "school", true], ["Sunday", "school", false], ["Tuesday", "school", true], ["Saturday", "school", false], ["Thursday", "school", true], ["Monday", "school", true], ["Wednesday", "school", true], ["Saturday", "weekend", true], ["Tuesday", "weekend", false], ["Sunday", "weekend", true], ["Friday", "weekend", false], ["Thursday", "weekend", false]].forEach(([d, claim, ok], i) => {
    items.push(
      item("calendar", "conceptual", "weekendJudge", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "weekend", day: d, claim }, promptText: weekendJudgePhr()(nameAt(i * 3 + 3), d, claim), truth: ok },
      })
    );
  });
  const countWeekdaysPhr = rotor([
    (nm) => `${nm} counts the days in one whole week. How many days does ${nm} count?`,
    (nm) => `How many days are in a week? ${nm} checks the calendar row.`,
  ]);
  for (let i = 0; i < 13; i += 1) {
    items.push(
      item("calendar", "conceptual", "daysInWeek", "band1", {
        answer: 7,
        choices: shuffled([7, 5, 6, 10], (seed += 1)),
        display: { time: { kind: "unit", unit: "week", n: 1 }, promptText: countWeekdaysPhr()(nameAt(i * 3 + 4)) },
      })
    );
  }

  const firstDayPhr = rotor([
    (nm, a, b) => `In one school week, which comes first for ${nm}: ${a} or ${b}?`,
    (nm, a, b) => `${nm} looks at the week from Monday on. Which day arrives first, ${a} or ${b}?`,
  ]);
  [["Tuesday", "Thursday"], ["Wednesday", "Friday"], ["Monday", "Wednesday"], ["Thursday", "Saturday"], ["Tuesday", "Friday"], ["Monday", "Saturday"], ["Wednesday", "Thursday"], ["Friday", "Sunday"]].forEach(([a, b], i) => {
    const good = WEEKDAYS.indexOf(a) < WEEKDAYS.indexOf(b) ? a : b;
    items.push(
      item("calendar", "conceptual", "whichDayFirst", "band1", {
        answer: good,
        choices: shuffled([a, b], (seed += 1)),
        display: { time: { kind: "dayOrder", a, b }, promptText: firstDayPhr()(nameAt(i * 3 + 10), a, b) },
      })
    );
  });

  // Band 2 — month order and season-ish reasoning.
  const nextMonthPhr = rotor([
    (nm, m) => `${nm} crosses off ${m}. Which month comes next?`,
    (nm, m) => `After ${m} ends, which month begins? ${nm} turns the page.`,
  ]);
  MONTHS.forEach((m, i) => {
    const good = MONTHS[(i + 1) % 12];
    const wrong = [MONTHS[(i + 11) % 12], MONTHS[(i + 2) % 12], MONTHS[(i + 6) % 12]];
    items.push(
      item("calendar", "conceptual", "nextMonthPick", "band2", {
        answer: good,
        choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
        display: { time: { kind: "monthHop", from: m, k: 1 }, promptText: nextMonthPhr()(nameAt(i * 3 + 5), m) },
      })
    );
  });
  const monthCountJudgePhr = rotor([
    (nm, claim, n) => `${nm} says ${claim}. Is ${nm} right?`,
    (nm, claim, n) => `${nm} writes: ${claim}. Is that right?`,
  ]);
  [["a year has 12 months", true], ["a year has 10 months", false], ["June comes before July", true], ["March comes after April", false], ["December is the last month of the year", true], ["January is the last month of the year", false], ["a year has 52 weeks", true], ["February is the shortest month", true], ["April has 31 days", false], ["September has 30 days", true], ["a month always has 30 days", false], ["July and August are back-to-back 31-day months", true], ["November has 31 days", false], ["May has 31 days", true], ["a week has 8 days", false], ["October comes right after September", true], ["June has 31 days", false], ["January has 31 days", true]].forEach(([claim, ok], i) => {
    items.push(
      item("calendar", "conceptual", "monthFactJudge", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "claim" }, promptText: monthCountJudgePhr()(nameAt(i * 3 + 6), claim), truth: ok },
      })
    );
  });
  const sameDayPhr = rotor([
    (nm, d) => `${nm}'s club meets every 7 days, starting on a ${d}. On which day is the NEXT meeting?`,
    (nm, d) => `Every 7 days, ${nm} waters the plants. The last watering was ${d}. Which day is the next one?`,
  ]);
  WEEKDAYS.forEach((d, i) => {
    const wrong = [WEEKDAYS[(i + 1) % 7], WEEKDAYS[(i + 6) % 7], WEEKDAYS[(i + 3) % 7]];
    items.push(
      item("calendar", "conceptual", "sevenDayCycle", "band2", {
        answer: d,
        choices: shuffled([d, ...wrong.slice(0, 3)], (seed += 1)),
        display: { time: { kind: "weekdayHop", from: d, k: 7 }, promptText: sameDayPhr()(nameAt(i * 3 + 7), d) },
      })
    );
  });

  const prevMonthPhr = rotor([
    (nm, m) => `Which month comes just before ${m}? ${nm} flips back one page.`,
    (nm, m) => `${nm} looks one month earlier than ${m}. Which month is that?`,
  ]);
  MONTHS.forEach((m, i) => {
    if (i % 12 >= 12) return;
    const good = MONTHS[(i + 11) % 12];
    const wrong = [MONTHS[(i + 1) % 12], MONTHS[(i + 10) % 12], MONTHS[(i + 2) % 12]];
    items.push(
      item("calendar", "conceptual", "prevMonthPick", "band2", {
        answer: good,
        choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
        display: { time: { kind: "monthHop", from: m, k: -1 }, promptText: prevMonthPhr()(nameAt(i * 3 + 11), m) },
      })
    );
  });
  const monthsLeftPhr = rotor([
    (nm, m) => `It is ${m}. How many months are left after it until the year ends? ${nm} counts on the calendar.`,
    (nm, m) => `After ${m} finishes, how many months of the year remain? ${nm} wants to know.`,
  ]);
  [["October"], ["April"]].forEach(([m], i) => {
    const idx = MONTHS.indexOf(m);
    items.push(
      item("calendar", "conceptual", "monthsLeft", "band2", {
        answer: 11 - idx,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: idx + 1, target: 12 }, promptText: monthsLeftPhr()(nameAt(i * 3 + 12), m) },
      })
    );
  });

  // Band 3 — span reasoning with weeks.
  const weeksBetweenPhr = rotor([
    (nm, a, b, m) => `${nm} marks ${m} ${a} and ${m} ${b} on the calendar. Exactly how many WEEKS apart are they?`,
    (nm, a, b, m) => `From ${m} ${a} to ${m} ${b} — how many whole weeks is that? ${nm} counts by sevens.`,
  ]);
  [["March", 3, 24], ["June", 5, 26], ["October", 1, 29], ["April", 2, 23], ["August", 6, 27], ["January", 4, 25], ["May", 2, 30], ["September", 7, 21], ["November", 5, 26], ["July", 1, 22], ["February", 5, 19], ["December", 3, 31], ["March", 10, 24], ["June", 9, 30], ["October", 8, 22], ["April", 6, 20], ["August", 3, 31], ["January", 13, 27]].forEach(([m, a, b], i) => {
    items.push(
      item("calendar", "conceptual", "weeksBetween", "band3", {
        answer: (b - a) / 7,
        answerType: "numberPad",
        display: { time: { kind: "weeksBetween", a, b }, promptText: weeksBetweenPhr()(nameAt(i * 3 + 8), a, b, m) },
      })
    );
  });
  const spanJudgePhr = rotor([
    (nm, m, a, b, said) => `${nm} counts from ${m} ${a} to ${m} ${b} and gets ${said} days. Is ${nm} right?`,
    (nm, m, a, b, said) => `From ${m} ${a} to ${m} ${b}, ${nm} figures ${said} days. Is that right?`,
  ]);
  [["March", 3, 17, true], ["June", 5, 26, false], ["October", 8, 29, true], ["April", 2, 23, false], ["August", 6, 27, true], ["January", 4, 25, false], ["May", 9, 30, true], ["September", 3, 21, false], ["November", 7, 28, true], ["July", 1, 22, false], ["February", 5, 24, true], ["December", 10, 31, false], ["March", 12, 28, true], ["June", 11, 30, false], ["October", 2, 19, true], ["April", 9, 27, false], ["August", 13, 31, true], ["January", 6, 20, false]].forEach(([m, a, b, ok], i) => {
    const right = b - a;
    const said = ok ? right : right + 1; // the fencepost slip
    items.push(
      item("calendar", "conceptual", "spanJudgeBig", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "spanSaid", a, b, said }, promptText: spanJudgePhr()(nameAt(i * 3 + 9), m, a, b, said), truth: ok },
      })
    );
  });
  const whichFartherPhr = rotor([
    (nm, m1, a, m2, b) => `Which is farther away from the 1st of its month: ${m1} ${a} or ${m2} ${b}? ${nm} compares.`,
    (nm, m1, a, m2, b) => `${nm} compares two dates: ${m1} ${a} and ${m2} ${b}. Which sits deeper into its month?`,
  ]);
  [["March", 17, "June", 9], ["April", 6, "October", 21], ["August", 27, "January", 14], ["May", 8, "September", 23], ["November", 19, "July", 4], ["February", 24, "December", 11], ["March", 5, "June", 28], ["April", 22, "October", 7], ["August", 3, "January", 30], ["May", 26, "September", 12], ["November", 2, "July", 18], ["February", 15, "December", 29], ["March", 20, "June", 6], ["April", 11, "October", 25], ["August", 16, "January", 8]].forEach(([m1, a, m2, b], i) => {
    const good = a > b ? `${m1} ${a}` : `${m2} ${b}`;
    items.push(
      item("calendar", "conceptual", "deeperDate", "band3", {
        answer: good,
        choices: shuffled([`${m1} ${a}`, `${m2} ${b}`], (seed += 1)),
        display: { time: { kind: "compare", a, b }, promptText: whichFartherPhr()(nameAt(i * 3 + 11), m1, a, m2, b) },
      })
    );
  });

  return items;
}
