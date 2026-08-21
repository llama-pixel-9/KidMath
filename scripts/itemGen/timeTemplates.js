/* Deterministic time bank items — procedural and conceptual cells for
 * readClock, elapsedTime, timeConcepts, calendar.
 *
 * Claims: elapsed/durations ride countMath {gap} on absolute minutes (or
 * hours) — never digit-wise clock subtraction, which is the misconception
 * the mode teaches against. Unit conversions, clock reads, word<->digital
 * matches, weekday hops, and am/pm calls carry display.time claims that
 * authorTime.js re-derives.
 *
 * Band ladder mirrors the generator: band 1 = o'clock/half past, hands in
 * words, whole-hour elapsed, day parts (NO digital notation in prompts —
 * "6:30" states 30 and the band-1 gate hard-fails numbers over 20);
 * band 2 = quarter/five-minute reads, digital notation, within-hour
 * elapsed, a.m./p.m.; band 3 = to-the-minute, across-hour elapsed,
 * end/start unknown, calendar spans. Judged = "Is this right?" Yes/No.
 *
 * Clock visuals: answerType "clock" + display {type:"clock", hour, minute};
 * the child types the minutes past the hour.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

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
const pad = (n) => String(n).padStart(2, "0");
const fmt = (h, m) => `${h}:${pad(m)}`;
export const HOUR_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/* ================================================================== */
/* readClock                                                           */
/* ================================================================== */

export function readClockProcedural() {
  const items = [];

  // Band 1 — o'clock and half-past faces; the child types minutes (0 or 30).
  const b1Stems = [
    (hw) => `The hour hand is near ${hw}. How many minutes past the hour does the clock show?`,
    (hw) => `This clock shows ${hw} o'clock or half past ${hw}. Type the minutes past the hour.`,
  ];
  for (let h = 1; h <= 12; h += 1) {
    for (const [si, minute] of [[0, h % 2 === 0 ? 0 : 30], [1, h % 2 === 0 ? 30 : 0]]) {
      items.push(
        item("readClock", "procedural", "faceReadTeen", "band1", {
          answer: minute,
          answerType: "clock",
          display: { type: "clock", hour: h, minute, time: { kind: "faceRead", minute }, promptText: b1Stems[si](HOUR_WORDS[h]) },
        })
      );
    }
  }
  const b1Extra = [
    (hw) => `A clock that reads ${hw} o'clock or half past — type the minutes past the hour.`,
    (hw) => `Look at the clock near ${hw}. How many minutes past the hour is it?`,
  ];
  for (const [h, minute, si] of [[1, 0, 0], [2, 30, 0], [1, 30, 1], [2, 0, 1]]) {
    items.push(
      item("readClock", "procedural", "faceReadTeen", "band1", {
        answer: minute,
        answerType: "clock",
        display: { type: "clock", hour: h, minute, time: { kind: "faceRead", minute }, promptText: b1Extra[si](HOUR_WORDS[h]) },
      })
    );
  }

  // Hands described in words -> which time (words, no digits over 12).
  const handsPhr = rotor([
    (hw) => `The hour hand points at ${hw} and the minute hand points straight up at twelve. What time is it?`,
    (hw) => `Both hands: the minute hand on twelve, the hour hand on ${hw}. Which time is that?`,
  ]);
  for (let h = 1; h <= 12; h += 1) {
    const good = `${HOUR_WORDS[h]} o'clock`;
    const wrong = [`half past ${HOUR_WORDS[h]}`, `${HOUR_WORDS[(h % 12) + 1]} o'clock`, `half past ${HOUR_WORDS[(h % 12) + 1]}`];
    items.push(
      item("readClock", "procedural", "handsToWords", "band1", {
        answer: good,
        choices: shuffled([good, ...wrong], h + 3),
        display: { time: { kind: "handsWords", hour: h, minute: 0 }, promptText: handsPhr()(HOUR_WORDS[h]) },
      })
    );
  }
  const halfPhr = rotor([
    (hw) => `The minute hand points straight down at six, and the hour hand is just past ${hw}. What time is it?`,
    (hw) => `Minute hand on the six, hour hand halfway past ${hw}. Which time is that?`,
  ]);
  for (let h = 1; h <= 12; h += 1) {
    const good = `half past ${HOUR_WORDS[h]}`;
    const wrong = [`${HOUR_WORDS[h]} o'clock`, `half past ${HOUR_WORDS[(h % 12) + 1]}`, `${HOUR_WORDS[(h % 12) + 1]} o'clock`];
    items.push(
      item("readClock", "procedural", "handsToWordsHalf", "band1", {
        answer: good,
        choices: shuffled([good, ...wrong], h + 7),
        display: { time: { kind: "handsWords", hour: h, minute: 30 }, promptText: halfPhr()(HOUR_WORDS[h]) },
      })
    );
  }

  // Band 2 — five-minute faces and words <-> digital.
  const b2Stems = [
    (h) => `How many minutes past ${h} o'clock is this clock showing?`,
    (h) => `Read the clock face. How many minutes past ${h}?`,
    (h) => `The hour is ${h}. What are the minutes past the hour?`,
  ];
  const b2Faces = [
    [1, 5], [2, 20], [3, 45], [4, 10], [5, 35], [6, 50], [7, 15], [8, 40], [9, 25], [10, 55], [11, 5], [12, 20],
    [1, 45], [2, 10], [3, 35], [4, 50], [5, 15], [6, 40], [7, 25], [8, 55], [9, 5], [10, 20], [11, 45], [12, 10],
  ];
  b2Faces.forEach(([h, m], i) => {
    items.push(
      item("readClock", "procedural", "faceReadFive", "band2", {
        answer: m,
        answerType: "clock",
        display: { type: "clock", hour: h, minute: m, time: { kind: "faceRead", minute: m }, promptText: b2Stems[(i + Math.floor(i / 12)) % 3](h) },
      })
    );
  });
  const WORD_MAP = [
    ["quarter past three", 3, 15], ["quarter past eight", 8, 15], ["quarter to five", 4, 45], ["quarter to ten", 9, 45],
    ["half past two", 2, 30], ["half past nine", 9, 30], ["ten past six", 6, 10], ["twenty past one", 1, 20],
    ["five past eleven", 11, 5], ["twenty-five past four", 4, 25], ["ten to seven", 6, 50], ["twenty to twelve", 11, 40],
    ["five to two", 1, 55], ["quarter past twelve", 12, 15], ["half past five", 5, 30], ["quarter to one", 12, 45],
  ];
  const wordsPhr = rotor([
    (w) => `Which digital time shows "${w}"?`,
    (w) => `Pick the digital clock that matches "${w}".`,
  ]);
  WORD_MAP.forEach(([w, h, m], i) => {
    const good = fmt(h, m);
    const wrong = [...new Set([fmt(h, (m + 30) % 60), fmt((h % 12) + 1, m), fmt(h, m === 0 ? 30 : (m + 15) % 60)])].filter((x) => x !== good);
    items.push(
      item("readClock", "procedural", "wordsToDigital", "band2", {
        answer: good,
        choices: shuffled([good, ...wrong.slice(0, 3)], i + 4),
        display: { time: { kind: "wordsDigital", hour: h, minute: m }, promptText: wordsPhr()(w) },
      })
    );
  });
  const digitalPhr = rotor([
    (t) => `Which words name the time ${t}?`,
    (t) => `Say ${t} in words. Which is right?`,
  ]);
  [["3:15", "quarter past three", 3, 15], ["8:45", "quarter to nine", 8, 45], ["2:30", "half past two", 2, 30], ["6:10", "ten past six", 6, 10], ["11:40", "twenty to twelve", 11, 40], ["5:05", "five past five", 5, 5], ["9:50", "ten to ten", 9, 50], ["1:20", "twenty past one", 1, 20], ["7:35", "twenty-five to eight", 7, 35], ["4:15", "quarter past four", 4, 15], ["10:30", "half past ten", 10, 30], ["12:45", "quarter to one", 12, 45]].forEach(([t, good, h, m], i) => {
    const wrong = ["half past " + HOUR_WORDS[h], HOUR_WORDS[h] + " o'clock", "quarter past " + HOUR_WORDS[(h % 12) + 1]].filter((x) => x !== good);
    items.push(
      item("readClock", "procedural", "digitalToWords", "band2", {
        answer: good,
        choices: shuffled([good, ...wrong.slice(0, 3)], i + 6),
        display: { time: { kind: "digitalWords", hour: h, minute: m, words: good }, promptText: digitalPhr()(t) },
      })
    );
  });

  // Band 3 — to-the-minute faces.
  const b3Stems = [
    (h) => `Read this clock to the exact minute. How many minutes past ${h}?`,
    (h) => `To the minute: how many minutes past ${h} o'clock does the clock show?`,
    (h) => `The hour hand sits after ${h}. What are the exact minutes past ${h}?`,
  ];
  const b3Faces = [
    [1, 7], [2, 23], [3, 48], [4, 11], [5, 37], [6, 52], [7, 16], [8, 41], [9, 28], [10, 57], [11, 4], [12, 22],
    [1, 46], [2, 13], [3, 38], [4, 51], [5, 17], [6, 43], [7, 26], [8, 58], [9, 9], [10, 21], [11, 47], [12, 12],
    [1, 33], [2, 56],
  ];
  b3Faces.forEach(([h, m], i) => {
    items.push(
      item("readClock", "procedural", "faceReadMinute", "band3", {
        answer: m,
        answerType: "clock",
        display: { type: "clock", hour: h, minute: m, time: { kind: "faceRead", minute: m }, promptText: b3Stems[(i + Math.floor(i / 12)) % 3](h) },
      })
    );
  });
  const NOTATE = [
    [3, 7], [8, 23], [2, 48], [6, 11], [11, 37], [5, 52], [9, 16], [1, 41], [7, 28], [12, 57], [4, 4], [10, 22],
    [3, 46], [8, 13], [2, 38], [6, 51], [11, 17], [5, 43], [9, 26], [1, 58], [7, 9], [12, 21], [4, 47], [10, 12], [2, 3], [5, 34],
  ];
  const notatePhr = rotor([
    (h, m) => `A clock shows ${m} minutes past ${h}. Which digital time is that?`,
    (h, m) => `${m} minutes after ${h} o'clock — pick the matching digital time.`,
  ]);
  NOTATE.forEach(([h, m], i) => {
    const good = fmt(h, m);
    const wrong = [...new Set([fmt(m > 12 ? h : (h % 12) + 1, m), fmt(h, 60 - m), fmt((h % 12) + 1, 60 - m)])].filter((x) => x !== good);
    items.push(
      item("readClock", "procedural", "minutesToDigital", "band3", {
        answer: good,
        choices: shuffled([good, ...wrong.slice(0, 3)], i + 8),
        display: { time: { kind: "wordsDigital", hour: h, minute: m }, promptText: notatePhr()(h, m) },
      })
    );
  });

  return items;
}

export function readClockConceptual() {
  const items = [];
  let seed = 121;

  // Band 1 — judged reads and hour-hand-vs-minute-hand reasoning.
  const judgeReadPhr = rotor([
    (nm, hw, saidW) => `The minute hand points at twelve and the hour hand at ${hw}. ${nm} says it is ${saidW}. Is ${nm} right?`,
    (nm, hw, saidW) => `${nm} reads a clock with the hour hand on ${hw} and the minute hand on twelve as ${saidW}. Is that right?`,
  ]);
  for (let i = 0; i < 18; i += 1) {
    const h = (i % 12) + 1;
    const ok = i % 2 === 0;
    const saidH = ok ? h : (h % 12) + 1;
    const saidW = `${HOUR_WORDS[saidH]} o'clock`;
    items.push(
      item("readClock", "conceptual", "judgeOclockRead", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "judgeRead", hour: h, minute: 0, saidHour: saidH, saidMinute: 0 }, promptText: judgeReadPhr()(nameAt(i * 3 + 2), HOUR_WORDS[h], saidW), truth: ok },
      })
    );
  }
  const whichHandPhr = rotor([
    (nm) => `${nm} wants the hand that tells the HOUR. Which hand is it?`,
    (nm) => `Which hand should ${nm} read first to know the hour?`,
  ]);
  for (let i = 0; i < 16; i += 1) {
    items.push(
      item("readClock", "conceptual", "whichHandHour", "band1", {
        answer: "the short hand",
        choices: shuffled(["the short hand", "the long hand"], i + 1),
        display: { time: { kind: "hourHand" }, promptText: whichHandPhr()(nameAt(i * 3 + 5)) },
      })
    );
  }
  const swapJudgePhr = rotor([
    (nm, hw) => `A clock shows half past ${hw}. ${nm} reads the LONG hand as the hour and announces six o'clock. Is ${nm} right?`,
    (nm, hw) => `${nm} swaps the hands on a half past ${hw} clock and reads it as six o'clock. Is that right?`,
  ]);
  for (let i = 0; i < 18; i += 1) {
    const h = (i % 9) + 1;
    items.push(
      item("readClock", "conceptual", "handSwapJudge", "band1", {
        answer: "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "handSwap", hour: h }, promptText: swapJudgePhr()(nameAt(i * 3 + 8), HOUR_WORDS[h]), truth: false },
      })
    );
  }

  // Band 2 — judged five-minute reads (off-by-five and hand-swap slips).
  const judgeFivePhr = rotor([
    (nm, t, said) => `${nm} reads a clock showing ${t} and writes ${said}. Is ${nm} right?`,
    (nm, t, said) => `A clock shows ${t}. ${nm} calls it ${said}. Is that right?`,
  ]);
  [[3, 15, 3, 15, true], [8, 45, 8, 40, false], [2, 30, 2, 30, true], [6, 10, 6, 15, false], [11, 40, 11, 40, true], [5, 5, 5, 10, false], [9, 50, 9, 50, true], [1, 20, 1, 15, false], [7, 35, 7, 35, true], [4, 25, 4, 20, false], [10, 55, 10, 55, true], [12, 15, 12, 20, false], [3, 40, 3, 40, true], [8, 5, 8, 10, false], [2, 50, 2, 50, true], [6, 35, 6, 30, false], [11, 10, 11, 10, true], [5, 45, 5, 50, false]].forEach(([h, m, sh, sm, ok], i) => {
    items.push(
      item("readClock", "conceptual", "judgeFiveRead", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "judgeRead", hour: h, minute: m, saidHour: sh, saidMinute: sm }, promptText: judgeFivePhr()(nameAt(i * 3 + 1), fmt(h, m), fmt(sh, sm)), truth: ok },
      })
    );
  });
  const closerPhr = rotor([
    (nm, t) => `At ${t}, is the time closer to the hour just passed or the hour coming next? ${nm} says the hour coming next. Is ${nm} right?`,
    (nm, t) => `${nm} claims ${t} is nearer the NEXT hour than the last one. Is that right?`,
  ]);
  [[3, 50, true], [8, 10, false], [2, 45, true], [6, 20, false], [11, 55, true], [5, 5, false], [9, 40, true], [1, 25, false], [7, 35, true], [4, 15, false], [10, 50, true], [12, 10, false], [3, 55, true], [8, 20, false], [2, 40, true], [6, 5, false]].forEach(([h, m, truth], i) => {
    items.push(
      item("readClock", "conceptual", "closerHourJudge", "band2", {
        answer: truth ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "closerNext", minute: m }, promptText: closerPhr()(nameAt(i * 3 + 4), fmt(h, m)), truth },
      })
    );
  });
  const betweenPhr = rotor([
    (nm, t) => `${nm} looks at a clock showing ${t}. Which two o'clock hours is that time between?`,
    (nm, t) => `The time is ${t}. Between which two hours does it sit? ${nm} wants to know.`,
  ]);
  [[3, 20], [8, 40], [2, 15], [6, 50], [11, 25], [5, 35], [9, 10], [1, 45], [7, 55], [4, 30], [10, 5], [12, 40], [3, 35], [8, 25], [2, 55], [6, 15], [11, 45], [5, 20]].forEach(([h, m], i) => {
    const next = (h % 12) + 1;
    const good = `${h} and ${next}`;
    const wrong = [`${next} and ${(next % 12) + 1}`, `${((h + 10) % 12) + 1} and ${h}`];
    items.push(
      item("readClock", "conceptual", "betweenHours", "band2", {
        answer: good,
        choices: shuffled([good, ...wrong], (seed += 1)),
        display: { time: { kind: "betweenHours", hour: h, minute: m }, promptText: betweenPhr()(nameAt(i * 3 + 7), fmt(h, m)) },
      })
    );
  });

  // Band 3 — judged to-the-minute reads and notation reasoning.
  [[3, 7, 3, 7, true], [8, 23, 8, 25, false], [2, 48, 2, 48, true], [6, 11, 6, 10, false], [11, 37, 11, 37, true], [5, 52, 5, 53, false], [9, 16, 9, 16, true], [1, 41, 1, 39, false], [7, 28, 7, 28, true], [12, 57, 12, 55, false], [4, 4, 4, 4, true], [10, 22, 10, 23, false], [3, 46, 3, 46, true], [8, 13, 8, 12, false], [2, 38, 2, 38, true], [6, 51, 6, 52, false], [11, 17, 11, 17, true], [5, 43, 5, 44, false]].forEach(([h, m, sh, sm, ok], i) => {
    items.push(
      item("readClock", "conceptual", "judgeMinuteRead", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "judgeRead", hour: h, minute: m, saidHour: sh, saidMinute: sm }, promptText: judgeFivePhr()(nameAt(i * 3 + 3), fmt(h, m), fmt(sh, sm)), truth: ok },
      })
    );
  });
  const minutesLeftPhr = rotor([
    (nm, t) => `The clock reads ${t}. ${nm} wonders: how many minutes until the next o'clock?`,
    (nm, t) => `At ${t}, how many minutes are left before the next full hour? ${nm} counts on.`,
  ]);
  [[3, 47], [8, 23], [2, 51], [6, 12], [11, 38], [5, 55], [9, 17], [1, 42], [7, 29], [12, 56], [4, 8], [10, 24], [3, 36], [8, 14], [2, 41], [6, 53]].forEach(([h, m], i) => {
    items.push(
      item("readClock", "conceptual", "minutesToNextHour", "band3", {
        answer: 60 - m,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: m, target: 60 }, promptText: minutesLeftPhr()(nameAt(i * 3 + 6), fmt(h, m)) },
      })
    );
  });
  const notationReasonPhr = rotor([
    (nm, h, m) => `${nm} writes "${h}:${m}" for ${m} minutes past ${h}. A friend says it needs a zero: "${h}:0${m}". Who is right, the friend or ${nm}?`,
    (nm, h, m) => `For ${m} minutes past ${h}, ${nm} writes "${h}:${m}" and a friend writes "${h}:0${m}". Whose time is written correctly?`,
  ]);
  [[3, 7], [8, 4], [2, 9], [6, 1], [11, 6], [5, 3], [9, 8], [1, 2], [7, 5], [12, 7], [4, 6], [10, 9], [3, 4], [8, 8], [2, 3], [6, 6]].forEach(([h, m], i) => {
    items.push(
      item("readClock", "conceptual", "leadingZeroReason", "band3", {
        answer: "the friend",
        choices: shuffled(["the friend", nameAt(i * 3 + 9)], (seed += 1)),
        display: { time: { kind: "leadingZero", hour: h, minute: m }, promptText: notationReasonPhr()(nameAt(i * 3 + 9), h, m) },
      })
    );
  });

  return items;
}

/* ================================================================== */
/* elapsedTime                                                         */
/* ================================================================== */

export function elapsedProcedural() {
  const items = [];

  // Band 1 — whole hours, o'clock to o'clock (word form only).
  const wholePhr = rotor([
    (s, e) => `Start at ${HOUR_WORDS[s]} o'clock, finish at ${HOUR_WORDS[e]} o'clock. How many hours is that?`,
    (s, e) => `From ${HOUR_WORDS[s]} o'clock to ${HOUR_WORDS[e]} o'clock = ? hours`,
  ]);
  for (const [s, e] of [[2, 5], [1, 4], [3, 7], [6, 9], [2, 8], [4, 6], [1, 3], [5, 11], [7, 10], [3, 4], [8, 12], [2, 6], [1, 7], [4, 9], [6, 10], [3, 8], [5, 7], [1, 2], [9, 12], [2, 3], [4, 10], [7, 11], [1, 6], [5, 9], [3, 10], [6, 11]]) {
    items.push(
      item("elapsedTime", "procedural", "wholeHoursTeen", "band1", {
        answer: e - s,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: s, target: e }, promptText: wholePhr()(s, e) },
      })
    );
  }
  const laterPhr = rotor([
    (hw, k) => `It is ${hw} o'clock. What hour will it be ${k === 1 ? "one hour" : `${HOUR_WORDS[k]} hours`} later? Answer with the hour number.`,
    (hw, k) => `${k === 1 ? "One hour" : `${HOUR_WORDS[k]} hours`} after ${hw} o'clock, the clock shows ? o'clock`,
  ]);
  for (const [h, k] of [[2, 1], [5, 1], [9, 1], [11, 1], [3, 2], [7, 2], [10, 2], [1, 3], [4, 3], [8, 3], [6, 1], [12, 2], [2, 3], [5, 2], [9, 3], [3, 1], [7, 1], [10, 3], [1, 2], [4, 1], [8, 2], [6, 3], [12, 1], [11, 2], [4, 2], [6, 2]]) {
    items.push(
      item("elapsedTime", "procedural", "hourLaterTeen", "band1", {
        answer: ((h + k - 1) % 12) + 1,
        answerType: "numberPad",
        display: { time: { kind: "hourLater", hour: h, delta: k }, promptText: laterPhr()(HOUR_WORDS[h], k) },
      })
    );
  }

  // Band 2 — within the hour, digital notation.
  const withinPhr = rotor([
    (s, e) => `Start ${s}, end ${e}. How many minutes passed?`,
    (s, e) => `From ${s} to ${e} = ? minutes`,
  ]);
  const withinHour = (structureType, band, data) =>
    data.forEach(([h, m1, m2]) => {
      const s = h * 60 + m1;
      const e = h * 60 + m2;
      items.push(
        item("elapsedTime", "procedural", structureType, band, {
          answer: m2 - m1,
          answerType: "numberPad",
          display: { counting: { kind: "gap", have: s, target: e }, promptText: withinPhr()(fmt(h, m1), fmt(h, m2)) },
        })
      );
    });
  withinHour("withinHourMid", "band2", [
    [3, 10, 45], [8, 5, 30], [2, 15, 50], [6, 20, 55], [11, 10, 40], [5, 25, 45], [9, 5, 35], [1, 15, 40],
    [7, 10, 25], [4, 30, 55], [10, 5, 50], [12, 20, 45], [3, 15, 35], [8, 25, 50], [2, 5, 20], [6, 10, 50],
    [11, 30, 45], [5, 5, 55], [9, 20, 40], [1, 10, 35], [7, 15, 55], [4, 5, 25], [10, 25, 40], [12, 10, 30], [2, 35, 55], [6, 25, 40],
  ]);
  const acrossPhr = rotor([
    (s, e) => `Start ${s}, end ${e}. Count up through the hour. How many minutes passed?`,
    (s, e) => `From ${s} to ${e}, going past the o'clock = ? minutes`,
  ]);
  const acrossHour = (structureType, band, data) =>
    data.forEach(([h1, m1, h2, m2]) => {
      const s = h1 * 60 + m1;
      const e = (h2 < h1 ? h2 + 12 : h2) * 60 + m2;
      items.push(
        item("elapsedTime", "procedural", structureType, band, {
          answer: e - s,
          answerType: "numberPad",
          display: { counting: { kind: "gap", have: s, target: e }, promptText: acrossPhr()(fmt(h1, m1), fmt(h2, m2)) },
        })
      );
    });
  acrossHour("acrossHourMid", "band2", [
    [2, 40, 3, 25], [5, 50, 6, 20], [8, 35, 9, 10], [11, 45, 12, 30], [3, 55, 4, 15], [6, 40, 7, 5],
    [9, 30, 10, 25], [1, 50, 2, 40], [4, 45, 5, 35], [7, 55, 8, 30], [10, 40, 11, 20], [2, 35, 3, 15],
    [5, 45, 6, 40], [8, 50, 9, 45], [11, 35, 12, 10], [3, 40, 4, 30], [6, 55, 7, 35], [9, 45, 10, 15],
    [1, 35, 2, 5], [4, 50, 5, 25], [7, 40, 8, 20], [10, 55, 11, 50], [2, 45, 3, 40], [5, 35, 6, 10], [8, 40, 9, 35], [12, 50, 1, 30],
  ]);

  // Band 3 — end unknown / start unknown.
  const endPhr = rotor([
    (s, d) => `Start at ${s} and go for ${d} minutes. Which time does it end?`,
    (s, d) => `${d} minutes after ${s} — pick the ending time.`,
  ]);
  const endUnknown = (data) =>
    data.forEach(([h, m, d], i) => {
      const total = h * 60 + m + d;
      const eh = (Math.floor(total / 60) - 1) % 12 + 1;
      const em = total % 60;
      const good = fmt(eh, em);
      const wrong = [...new Set([fmt(eh, (em + 5) % 60), fmt((eh % 12) + 1, em), fmt(eh, (em + 55) % 60)])].filter((x) => x !== good);
      items.push(
        item("elapsedTime", "procedural", "endUnknownBig", "band3", {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], i + 11),
          display: { time: { kind: "endTime", startH: h, startM: m, dur: d }, promptText: endPhr()(fmt(h, m), d) },
        })
      );
    });
  endUnknown([
    [2, 40, 45], [5, 50, 30], [8, 35, 40], [11, 45, 50], [3, 55, 25], [6, 40, 35], [9, 30, 55], [1, 50, 45],
    [4, 45, 40], [7, 55, 20], [10, 40, 45], [2, 35, 50], [5, 45, 55], [8, 50, 25], [11, 35, 40], [3, 40, 45],
    [6, 55, 30], [9, 45, 35], [1, 35, 50], [4, 50, 40], [7, 40, 55], [10, 55, 20], [2, 45, 35], [5, 35, 45], [8, 40, 50], [12, 25, 40],
  ]);
  const startPhr = rotor([
    (e, d) => `Something ends at ${e} after ${d} minutes. Which time did it start?`,
    (e, d) => `${d} minutes before ${e} — pick the starting time.`,
  ]);
  const startUnknown = (data) =>
    data.forEach(([h, m, d], i) => {
      const total = h * 60 + m - d;
      const sh = (Math.floor(total / 60) - 1 + 12) % 12 + 1;
      const sm = ((total % 60) + 60) % 60;
      const good = fmt(sh, sm);
      const wrong = [...new Set([fmt(sh, (sm + 5) % 60), fmt((sh % 12) + 1, sm), fmt(sh, (sm + 50) % 60)])].filter((x) => x !== good);
      items.push(
        item("elapsedTime", "procedural", "startUnknownBig", "band3", {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], i + 13),
          display: { time: { kind: "startTime", endH: h, endM: m, dur: d }, promptText: startPhr()(fmt(h, m), d) },
        })
      );
    });
  startUnknown([
    [3, 25, 45], [6, 20, 30], [9, 10, 40], [12, 30, 50], [4, 15, 25], [7, 5, 35], [10, 25, 55], [2, 40, 45],
    [5, 35, 40], [8, 30, 20], [11, 20, 45], [3, 15, 50], [6, 40, 55], [9, 45, 25], [12, 10, 40], [4, 30, 45],
    [7, 35, 30], [10, 15, 35], [2, 5, 50], [5, 25, 40], [8, 20, 55], [11, 50, 20], [3, 40, 35], [6, 10, 45], [9, 35, 50], [1, 30, 40],
  ]);

  return items;
}

export function elapsedConceptual() {
  const items = [];
  let seed = 131;

  // The digit-subtraction misconception, judged head-on.
  const decimalJudgePhr = rotor([
    (nm, s, e, said) => `${nm} subtracts the clock numbers to say ${s} to ${e} took ${said} minutes. Is ${nm} right?`,
    (nm, s, e, said) => `From ${s} to ${e}, ${nm} figures ${said} minutes by treating times like plain numbers. Is that right?`,
  ]);
  const judgeElapsed = (band, data) =>
    data.forEach(([h1, m1, h2, m2, ok], i) => {
      const real = h2 * 60 + m2 - (h1 * 60 + m1);
      const decimal = (h2 * 100 + m2) - (h1 * 100 + m1);
      const said = ok ? real : decimal;
      items.push(
        item("elapsedTime", "conceptual", `elapsedJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { time: { kind: "elapsedSaid", s: h1 * 60 + m1, e: h2 * 60 + m2, said }, promptText: decimalJudgePhr()(nameAt(i * 3 + seed), fmt(h1, m1), fmt(h2, m2), said), truth: ok },
        })
      );
    });
  judgeElapsed("band2", [
    [2, 40, 3, 25, false], [3, 10, 3, 45, true], [5, 50, 6, 20, false], [8, 5, 8, 30, true], [8, 35, 9, 10, false],
    [2, 15, 2, 50, true], [11, 45, 12, 30, false], [6, 20, 6, 55, true], [3, 55, 4, 15, false], [11, 10, 11, 40, true],
    [6, 40, 7, 5, false], [5, 25, 5, 45, true], [9, 30, 10, 25, false], [9, 5, 9, 35, true], [1, 50, 2, 40, false],
    [1, 15, 1, 40, true], [4, 45, 5, 35, false], [7, 10, 7, 25, true],
  ]);
  judgeElapsed("band3", [
    [7, 55, 8, 30, false], [2, 35, 3, 15, false], [10, 40, 11, 20, false], [3, 15, 3, 35, true], [5, 45, 6, 40, false],
    [8, 25, 8, 50, true], [8, 50, 9, 45, false], [2, 5, 2, 20, true], [11, 35, 12, 10, false], [6, 10, 6, 50, true],
    [3, 40, 4, 30, false], [11, 30, 11, 45, true], [6, 55, 7, 35, false], [5, 5, 5, 55, true], [9, 45, 10, 15, false],
    [9, 20, 9, 40, true], [1, 35, 2, 5, false], [4, 5, 4, 25, true],
  ]);
  // Band 1: does one hour pass? (o'clock words only)
  const hourJudgePhr = rotor([
    (nm, s, e, said) => `${nm} says from ${HOUR_WORDS[s]} o'clock to ${HOUR_WORDS[e]} o'clock is ${HOUR_WORDS[said]} ${said === 1 ? "hour" : "hours"}. Is ${nm} right?`,
    (nm, s, e, said) => `From ${HOUR_WORDS[s]} o'clock to ${HOUR_WORDS[e]} o'clock, ${nm} counts ${HOUR_WORDS[said]} ${said === 1 ? "hour" : "hours"}. Is that right?`,
  ]);
  [[2, 5, 3, true], [1, 4, 4, false], [3, 7, 4, true], [6, 9, 2, false], [2, 8, 6, true], [4, 6, 3, false], [1, 3, 2, true], [5, 11, 5, false], [7, 10, 3, true], [8, 12, 5, false], [2, 6, 4, true], [1, 7, 5, false], [4, 9, 5, true], [6, 10, 3, false], [3, 8, 5, true], [5, 7, 3, false], [9, 12, 3, true], [4, 10, 7, false]].forEach(([s, e, said, ok], i) => {
    items.push(
      item("elapsedTime", "conceptual", "hourCountJudge", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "elapsedSaid", s, e, said }, promptText: hourJudgePhr()(nameAt(i * 3 + seed), s, e, said), truth: ok },
      })
    );
  });
  // Band 1: which takes longer (whole-hour spans).
  const longerPhr = rotor([
    (nm, a1, a2, b1, b2) => `${nm} compares two events: A runs ${HOUR_WORDS[a1]} to ${HOUR_WORDS[a2]} o'clock, B runs ${HOUR_WORDS[b1]} to ${HOUR_WORDS[b2]} o'clock. Which event lasts longer?`,
    (nm, a1, a2, b1, b2) => `Event A: ${HOUR_WORDS[a1]} o'clock to ${HOUR_WORDS[a2]} o'clock. Event B: ${HOUR_WORDS[b1]} o'clock to ${HOUR_WORDS[b2]} o'clock. Which is longer? ${nm} checks.`,
  ]);
  [[2, 5, 1, 3], [1, 4, 2, 7], [3, 7, 6, 8], [6, 9, 1, 6], [2, 8, 4, 7], [4, 6, 1, 5], [1, 3, 5, 6], [5, 11, 7, 10], [7, 10, 2, 4], [3, 4, 8, 12], [2, 6, 3, 5], [1, 7, 4, 8], [4, 9, 6, 8], [6, 10, 2, 5], [3, 8, 5, 8], [5, 7, 1, 6], [9, 12, 2, 3], [2, 3, 4, 10]].forEach(([a1, a2, b1, b2], i) => {
    const la = a2 - a1;
    const lb = b2 - b1;
    items.push(
      item("elapsedTime", "conceptual", "whichLongerTeen", "band1", {
        answer: la > lb ? "Event A" : "Event B",
        choices: ["Event A", "Event B"],
        display: { time: { kind: "longer", la, lb }, promptText: longerPhr()(nameAt(i * 3 + seed), a1, a2, b1, b2) },
      })
    );
  });
  // Band 1: one more hour, judged ("does one more hour pass by ...").
  const oneMorePhr = rotor([
    (nm, s) => `It is ${HOUR_WORDS[s]} o'clock. ${nm} says in one hour it will be ${HOUR_WORDS[(s % 12) + 1]} o'clock. Is ${nm} right?`,
    (nm, s) => `${nm} claims one hour after ${HOUR_WORDS[s]} o'clock comes ${HOUR_WORDS[((s + 1) % 12) + 1]} o'clock. Is that right?`,
  ]);
  for (let i = 0; i < 16; i += 1) {
    const s = (i % 8) + 1;
    const ok = i % 2 === 0;
    items.push(
      item("elapsedTime", "conceptual", "oneHourLaterJudge", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "elapsedSaid", s, e: s + 1, said: ok ? 1 : 2 }, promptText: oneMorePhr()(nameAt(i * 3 + seed), s), truth: ok },
      })
    );
  }
  // Band 2: which activity runs longer (within-hour spans).
  const longerMidPhr = rotor([
    (nm, a1, a2, b1, b2) => `${nm} compares two activities. A: ${a1} to ${a2}. B: ${b1} to ${b2}. Which one runs longer?`,
    (nm, a1, a2, b1, b2) => `Activity A goes ${a1} to ${a2}; activity B goes ${b1} to ${b2}. Which lasts longer? ${nm} checks the clock.`,
  ]);
  [[3, 10, 3, 45, 4, 20, 4, 40], [8, 5, 8, 30, 9, 10, 9, 45], [2, 15, 2, 50, 5, 30, 5, 50], [6, 20, 6, 55, 7, 5, 7, 30], [11, 10, 11, 40, 1, 25, 1, 45], [5, 25, 5, 45, 6, 5, 6, 40], [9, 5, 9, 35, 10, 15, 10, 35], [1, 15, 1, 40, 2, 30, 2, 45], [7, 10, 7, 25, 8, 20, 8, 55], [4, 30, 4, 55, 3, 5, 3, 20], [10, 5, 10, 50, 11, 15, 11, 40], [12, 20, 12, 45, 1, 10, 1, 50], [3, 15, 3, 35, 4, 5, 4, 55], [8, 25, 8, 50, 9, 30, 9, 40], [2, 5, 2, 20, 6, 15, 6, 50], [6, 10, 6, 50, 7, 20, 7, 40], [11, 30, 11, 45, 12, 5, 12, 40]].forEach(([a1, a2, a3, a4, b1, b2, b3, b4], i) => {
    const la = a3 * 60 + a4 - (a1 * 60 + a2);
    const lb = b3 * 60 + b4 - (b1 * 60 + b2);
    items.push(
      item("elapsedTime", "conceptual", "whichLongerMid", "band2", {
        answer: la > lb ? "Activity A" : "Activity B",
        choices: ["Activity A", "Activity B"],
        display: { time: { kind: "longer", la, lb }, promptText: longerMidPhr()(nameAt(i * 3 + seed), fmt(a1, a2), fmt(a3, a4), fmt(b1, b2), fmt(b3, b4)) },
      })
    );
  });

  // Band 2/3: pick the duration (choice with the decimal distractor).
  const pickDurPhr = rotor([
    (nm, s, e) => `${nm} times an activity from ${s} to ${e}. Which duration is right?`,
    (nm, s, e) => `From ${s} to ${e} — which number of minutes fits? ${nm} counts up to check.`,
  ]);
  const pickDur = (band, data) =>
    data.forEach(([h1, m1, h2, m2], i) => {
      const real = h2 * 60 + m2 - (h1 * 60 + m1);
      const decimal = (h2 * 100 + m2) - (h1 * 100 + m1);
      const wrong = [...new Set([decimal, real + 5, real - 5])].filter((w) => w !== real && w > 0);
      items.push(
        item("elapsedTime", "conceptual", `pickDuration_${band}`, band, {
          answer: real,
          choices: shuffled([real, ...wrong.slice(0, 3)], (seed += 1)),
          display: { counting: { kind: "gap", have: h1 * 60 + m1, target: h2 * 60 + m2 }, promptText: pickDurPhr()(nameAt(i * 3 + seed), fmt(h1, m1), fmt(h2, m2)) },
        })
      );
    });
  pickDur("band2", [[3, 10, 3, 45], [8, 5, 8, 30], [2, 15, 2, 50], [6, 20, 6, 55], [11, 10, 11, 40], [5, 25, 5, 45], [9, 5, 9, 35], [1, 15, 1, 40], [7, 10, 7, 25], [4, 30, 4, 55], [10, 5, 10, 50], [12, 20, 12, 45], [3, 15, 3, 35], [8, 25, 8, 50], [2, 5, 2, 20], [6, 10, 6, 50]]);
  pickDur("band3", [[2, 40, 3, 25], [5, 50, 6, 20], [8, 35, 9, 10], [11, 45, 12, 30], [3, 55, 4, 15], [6, 40, 7, 5], [9, 30, 10, 25], [1, 50, 2, 40], [4, 45, 5, 35], [7, 55, 8, 30], [10, 40, 11, 20], [2, 35, 3, 15], [5, 45, 6, 40], [8, 50, 9, 45], [11, 35, 12, 10], [3, 40, 4, 30]]);

  // Band 3: reasoning about crossing the hour.
  const crossPhr = rotor([
    (nm, s, d) => `${nm} starts at ${s} and works for ${d} minutes. Will the clock pass the next o'clock before ${nm} stops?`,
    (nm, s, d) => `Starting at ${s} for ${d} minutes — does the time cross into the next hour? ${nm} thinks it over.`,
  ]);
  [[2, 40, 45], [3, 10, 20], [5, 50, 30], [8, 5, 40], [8, 35, 40], [2, 15, 30], [11, 45, 50], [6, 20, 25], [3, 55, 25], [11, 10, 35], [6, 40, 35], [5, 25, 20], [9, 30, 55], [9, 5, 40], [1, 50, 45], [1, 15, 30], [4, 45, 40], [7, 10, 35]].forEach(([h, m, d], i) => {
    const truth = m + d >= 60;
    items.push(
      item("elapsedTime", "conceptual", "crossesHourJudge", "band3", {
        answer: truth ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { time: { kind: "crossHour", m, d }, promptText: crossPhr()(nameAt(i * 3 + seed), fmt(h, m), d), truth },
      })
    );
  });

  return items;
}
