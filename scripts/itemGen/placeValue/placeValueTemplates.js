/* Deterministic placeValue bank items — procedural and conceptual cells.
 *
 * Design source: docs/placevalue-bank-design.md (the G1-M4/G2-M3 surveys
 * from the comparing/numberBonds builds). Structural inspiration only.
 *
 * Payloads ride op "count" + display.counting claims (countMath gate),
 * using the place-value kinds: {units} (hundreds/tens/ones compose),
 * {groups} (tens/ones), {digit} and {placeValueOf} (n, place), {moreLess}
 * (±1/±10/±100), {sum} (expanded form). Judged = Yes/No + display.truth.
 *
 * Band-1 prompts stay <= 20 (hard gate) — K place value IS the teens
 * (K.NBT.1: ten and some more). String-collision guards: teen composes
 * avoid "10 + 7 = ?" (addition bank) and "17 = 10 + ?" / "? = 10 + 7"
 * (numberBonds) by using the arrow register ("17 → 10 + ?").
 */

import { rotor, shuffled, NAMES } from "../counting/countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "placeValue",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const nameAt = (i) => NAMES[i % NAMES.length];
const unit = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/* ================================================================== */
/* tensOnes                                                           */
/* ================================================================== */

export function tensOnesProcedural() {
  const items = [];

  // Band 1 — teens as ten-and-ones: frames, unit form, digit reads.
  const teenFramePhr = rotor([
    "One full frame and some more. What teen number do the frames show?",
    "The top frame holds ten. What number do both frames make?",
    "Read the frames as ten and some ones. What number is that?",
    "A full ten frame plus extras below — which number is shown?",
    "Count ten, then the rest. What number do the two frames show?",
    "Ten on top, ones below. What number is it?",
    "The frames show a teen number. Which one?",
    "Say ten, then count on. What number do the frames make?",
    "How many counters do the two frames show in all?",
  ]);
  for (let n = 11; n <= 19; n += 1) {
    items.push(
      item("tensOnes", "procedural", "teenFrameRead", "band1", {
        answer: n,
        answerType: "tenFrame",
        display: { filled: n, frames: 2, frameMode: "count", counting: { kind: "groups", tens: 1, ones: n - 10 }, promptText: teenFramePhr() },
      })
    );
  }
  for (let o = 1; o <= 9; o += 1) {
    items.push(
      item("tensOnes", "procedural", "teenUnitCompose", "band1", {
        answer: 10 + o,
        answerType: "numberPad",
        display: { counting: { kind: "groups", tens: 1, ones: o }, promptText: `1 ten ${unit(o, "one")} = ?` },
      })
    );
  }
  for (let n = 11; n <= 19; n += 1) {
    items.push(
      item("tensOnes", "procedural", "teenOnesDigit", "band1", {
        answer: n - 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place: 1 }, promptText: `${n} → 10 + ?` },
      })
    );
  }
  for (const n of [13, 16, 12, 18, 15, 19, 11, 17, 14, 20]) {
    items.push(
      item("tensOnes", "procedural", "teenTensDigit", "band1", {
        answer: Math.floor(n / 10),
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place: 10 }, promptText: `Tens in ${n} = ?` },
      })
    );
  }
  // Ten more/less within 20.
  for (const [n, d] of [[3, 10], [15, -10], [7, 10], [18, -10], [9, 10], [12, -10], [5, 10], [16, -10], [4, 10], [14, -10], [8, 10], [19, -10], [2, 10], [11, -10], [6, 10], [17, -10]]) {
    items.push(
      item("tensOnes", "procedural", "tenMoreLessTeen", "band1", {
        answer: n + d,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n, delta: d }, promptText: `${d > 0 ? "10 more" : "10 less"} than ${n} = ?` },
      })
    );
  }

  // Band 2 — two-digit: unit compose, digit reads, ten more/less.
  for (const [t, o] of [[2, 5], [3, 8], [4, 1], [5, 6], [6, 3], [7, 9], [8, 2], [9, 7], [2, 4], [3, 3], [4, 9], [5, 1], [6, 8], [7, 2], [8, 6], [9, 4], [2, 7], [3, 6]]) {
    items.push(
      item("tensOnes", "procedural", "unitCompose", "band2", {
        answer: t * 10 + o,
        answerType: "numberPad",
        display: { counting: { kind: "groups", tens: t, ones: o }, promptText: `${unit(t, "ten")} ${unit(o, "one")} = ?` },
      })
    );
  }
  for (const [n, place] of [[47, 10], [83, 10], [29, 10], [65, 10], [91, 10], [38, 10], [74, 10], [56, 10], [47, 1], [83, 1], [29, 1], [65, 1], [91, 1], [38, 1], [74, 1], [56, 1], [62, 10], [62, 1]]) {
    items.push(
      item("tensOnes", "procedural", "digitRead", "band2", {
        answer: Math.floor(n / place) % 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place }, promptText: `${place === 10 ? "Tens" : "Ones"} digit of ${n} = ?` },
      })
    );
  }
  for (const [n, d] of [[47, 10], [83, -10], [29, 10], [65, -10], [38, 10], [74, -10], [56, 10], [91, -10], [23, 10], [88, -10], [35, 10], [62, -10], [49, 10], [77, -10], [51, 10], [96, -10]]) {
    items.push(
      item("tensOnes", "procedural", "tenMoreLess", "band2", {
        answer: n + d,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n, delta: d }, promptText: `${d > 0 ? "10 more" : "10 less"} than ${n} = ?` },
      })
    );
  }

  // Band 3 — hundreds: digit reads, value-of-digit, 100 more/less, boundary
  // crossings.
  for (const [n, place] of [[347, 100], [582, 100], [816, 100], [493, 100], [265, 100], [739, 100], [347, 10], [582, 10], [816, 1], [493, 1], [265, 10], [739, 1], [904, 100], [904, 10], [904, 1], [670, 100], [670, 10], [670, 1]]) {
    items.push(
      item("tensOnes", "procedural", "digitReadBig", "band3", {
        answer: Math.floor(n / place) % 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place }, promptText: `${place === 100 ? "Hundreds" : place === 10 ? "Tens" : "Ones"} digit of ${n} = ?` },
      })
    );
  }
  for (const [n, place] of [[347, 10], [582, 100], [816, 10], [493, 100], [265, 1], [739, 10], [904, 100], [670, 10], [128, 100], [356, 10], [741, 100], [869, 10], [235, 100], [517, 10], [682, 100], [493, 10]]) {
    items.push(
      item("tensOnes", "procedural", "valueOfDigitDrill", "band3", {
        answer: (Math.floor(n / place) % 10) * place,
        answerType: "numberPad",
        display: { counting: { kind: "placeValueOf", n, place }, promptText: `Value of the ${place === 100 ? "hundreds" : place === 10 ? "tens" : "ones"} digit in ${n} = ?` },
      })
    );
  }
  for (const [n, d] of [[347, 100], [582, -100], [265, 100], [739, -100], [190, 10], [301, -10], [495, 10], [608, -10], [299, 1], [500, -1], [199, 1], [400, -1], [850, 100], [123, -100], [999, 1], [710, -10]]) {
    items.push(
      item("tensOnes", "procedural", "hundredMoreLess", "band3", {
        answer: n + d,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n, delta: d }, promptText: `${Math.abs(d)} ${d > 0 ? "more" : "less"} than ${n} = ?` },
      })
    );
  }

  return items;
}

export function tensOnesConceptual() {
  const items = [];
  let seed = 11000;

  // Which number do the units make (choice; reversal distractors).
  const whichPhr = rotor([
    (nm, t, o) => `${nm} builds ${unit(t, "ten")} and ${unit(o, "one")}. Which number did ${nm} build?`,
    (nm, t, o) => `${nm} shows ${unit(t, "ten")} ${unit(o, "one")} on the mat. Which number is that?`,
    (nm, t, o) => `Help ${nm}: ${unit(t, "ten")} and ${unit(o, "one")} make which number?`,
  ]);
  const which = (structureType, band, cases) => {
    cases.forEach(([t, o], i) => {
      const n = t * 10 + o;
      const reversal = o * 10 + t;
      const wrong = [...new Set([reversal, t + o, n + 10])].filter((w) => w !== n && w > 0);
      items.push(
        item("tensOnes", "conceptual", structureType, band, {
          answer: n,
          choices: shuffled([n, ...wrong.slice(0, 3)], (seed += 1)),
          display: { promptText: whichPhr()(nameAt(i * 3 + 1), t, o) },
        })
      );
    });
  };
  which("whichNumberTeens", "band1", [[1, 3], [1, 7], [1, 5], [1, 2], [1, 8], [1, 4], [1, 9], [1, 6], [1, 3], [1, 7], [1, 5], [1, 8], [1, 2], [1, 4], [1, 9], [1, 6]]);
  which("whichNumberBuilt", "band2", [[2, 5], [3, 8], [4, 1], [5, 6], [6, 3], [7, 9], [8, 2], [9, 7], [2, 8], [3, 1], [4, 6], [5, 9], [6, 2], [7, 4], [8, 5], [9, 3], [2, 6], [3, 9]]);

  // What does the digit stand for (choice: value vs digit confusion).
  const standsPhr = rotor([
    (nm, n, place) => `${nm} looks at the ${place} digit of ${n}. What is that digit worth?`,
    (nm, n, place) => `In ${n}, what is the value of the ${place} digit? ${nm} wants to know.`,
  ]);
  const stands = (structureType, band, cases) => {
    cases.forEach(([n, place, word], i) => {
      const digit = Math.floor(n / place) % 10;
      const value = digit * place;
      const wrong = [...new Set([digit, value + place, n - value])].filter((w) => w !== value);
      items.push(
        item("tensOnes", "conceptual", structureType, band, {
          answer: value,
          choices: shuffled([value, ...wrong.slice(0, 3)], (seed += 1)),
          display: { counting: { kind: "placeValueOf", n, place }, promptText: standsPhr()(nameAt(i * 3 + 4), n, word) },
        })
      );
    });
  };
  stands("digitWorthTeens", "band1", [[14, 10, "tens"], [17, 10, "tens"], [12, 10, "tens"], [19, 10, "tens"], [13, 1, "ones"], [16, 1, "ones"], [18, 1, "ones"], [15, 1, "ones"], [11, 10, "tens"], [14, 1, "ones"], [17, 1, "ones"], [12, 1, "ones"], [19, 1, "ones"], [13, 10, "tens"], [16, 10, "tens"], [15, 10, "tens"]]);
  stands("digitWorth", "band2", [[47, 10, "tens"], [83, 10, "tens"], [29, 1, "ones"], [65, 10, "tens"], [91, 1, "ones"], [38, 10, "tens"], [74, 1, "ones"], [56, 10, "tens"], [62, 1, "ones"], [85, 10, "tens"], [23, 1, "ones"], [96, 10, "tens"], [41, 1, "ones"], [78, 10, "tens"], [59, 1, "ones"], [34, 10, "tens"], [67, 10, "tens"], [82, 1, "ones"]]);
  stands("digitWorthBig", "band3", [[347, 100, "hundreds"], [582, 100, "hundreds"], [816, 10, "tens"], [493, 100, "hundreds"], [265, 10, "tens"], [739, 100, "hundreds"], [904, 100, "hundreds"], [670, 10, "tens"], [128, 100, "hundreds"], [356, 10, "tens"], [741, 100, "hundreds"], [869, 10, "tens"], [235, 1, "ones"], [517, 100, "hundreds"], [682, 10, "tens"], [951, 100, "hundreds"], [408, 10, "tens"], [163, 100, "hundreds"]]);

  const builtBigPhr = rotor([
    (nm, h, t, o) => `${nm} builds ${unit(h, "hundred")}, ${unit(t, "ten")}, and ${unit(o, "one")}. Which number is that?`,
    (nm, h, t, o) => `${nm} shows ${unit(h, "hundred")} ${unit(t, "ten")} ${unit(o, "one")} with blocks. Which number did ${nm} build?`,
  ]);
  [[3, 4, 7], [5, 8, 2], [8, 1, 6], [4, 9, 3], [2, 6, 5], [7, 3, 9], [9, 2, 4], [6, 7, 5], [1, 2, 8], [3, 5, 6], [7, 4, 1], [8, 6, 9], [2, 3, 5], [5, 1, 7], [6, 8, 2], [9, 5, 1], [4, 3, 8], [1, 6, 3]].forEach(([h, t, o], i) => {
    const n = h * 100 + t * 10 + o;
    const wrong = [...new Set([h * 100 + o * 10 + t, o * 100 + t * 10 + h, n + 100])].filter((w) => w !== n);
    items.push(
      item("tensOnes", "conceptual", "whichNumberBuiltBig", "band3", {
        answer: n,
        choices: shuffled([n, ...wrong.slice(0, 3)], (seed += 1)),
        display: { promptText: builtBigPhr()(nameAt(i * 3 + 2), h, t, o) },
      })
    );
  });
  const unitClaimPhr = rotor([
    (nm, form, n) => `${nm} says ${form} makes ${n}. Is ${nm} right?`,
    (nm, form, n) => `${nm} reads ${form} as ${n}. Is that right?`,
  ]);
  [[3, 4, 7, true], [5, 8, 2, false], [8, 1, 6, true], [4, 9, 3, false], [2, 6, 5, true], [7, 3, 9, false], [9, 2, 4, true], [6, 7, 5, false], [1, 2, 8, true], [3, 5, 6, false], [7, 4, 1, true], [8, 6, 9, false], [2, 3, 5, true], [5, 1, 7, false], [6, 8, 2, true], [9, 5, 1, false]].forEach(([h, t, o, ok], i) => {
    const real = h * 100 + t * 10 + o;
    const claim = ok ? real : h * 100 + o * 10 + t;
    items.push(
      item("tensOnes", "conceptual", "unitClaimJudgeBig", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: unitClaimPhr()(nameAt(i * 3 + 5), `${unit(h, "hundred")} ${unit(t, "ten")} ${unit(o, "one")}`, claim), truth: ok },
      })
    );
  });

  // Judged digit-reversal claims (13 vs 31).
  const revPhr = rotor([
    (nm, t, o, claim) => `${nm} says ${unit(t, "ten")} ${unit(o, "one")} make ${claim}. Is ${nm} right?`,
    (nm, t, o, claim) => `${nm} writes ${claim} for ${unit(t, "ten")} and ${unit(o, "one")}. Is that right?`,
  ]);
  const rev = (structureType, band, cases) => {
    cases.forEach(([t, o, ok], i) => {
      const real = t * 10 + o;
      // Band 1 must stay <= 20, so the false claim is off-by-one there; the
      // true reversal trap (31 for 13) lives at band 2.
      const claim = ok ? real : band === "band1" ? real + 1 : o * 10 + t;
      items.push(
        item("tensOnes", "conceptual", structureType, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { promptText: revPhr()(nameAt(i * 3 + 7), t, o, claim), truth: ok },
        })
      );
    });
  };
  rev("reversalJudgeTeens", "band1", [[1, 3, true], [1, 7, false], [1, 5, true], [1, 2, false], [1, 8, true], [1, 4, false], [1, 9, true], [1, 6, false], [1, 2, true], [1, 3, false], [1, 4, true], [1, 5, false], [1, 6, true], [1, 7, true], [1, 8, false], [1, 9, false]]);
  rev("reversalJudge", "band2", [[2, 5, true], [3, 8, false], [4, 1, true], [5, 6, false], [6, 3, true], [7, 9, false], [8, 2, true], [9, 7, false], [2, 8, true], [3, 1, false], [4, 6, true], [5, 9, false], [6, 2, true], [7, 4, false], [8, 5, true], [9, 3, false], [2, 6, true], [3, 9, false]]);

  // Number-line locate (widget) — where does n live between the decades?
  const linePhr = rotor([
    (nm, n) => `${nm} hunts for ${n}. Where does ${n} sit on the line?`,
    (nm, n) => `Where on the number line does ${n} live? Tap it for ${nm}.`,
  ]);
  const line = (structureType, band, values, span, stepSize) => {
    values.forEach((n, i) => {
      const lo = Math.floor(n / span) * span;
      items.push(
        item("tensOnes", "conceptual", structureType, band, {
          answer: n,
          answerType: "numberLine",
          display: { promptText: linePhr()(nameAt(i * 3 + 9), n), min: lo, max: lo + span, step: stepSize, labelEvery: 5, lineMode: "locate" },
        })
      );
    });
  };
  line("lineLocateTeens", "band1", [12, 17, 14, 19, 11, 16, 13, 18, 15, 12, 17, 14, 19, 16, 11, 13], 20, 1);
  line("lineLocate", "band2", [23, 47, 65, 88, 34, 72, 56, 91, 28, 63, 45, 79, 37, 84, 52, 96, 41, 68], 10, 1);

  return items;
}

/* ================================================================== */
/* expandedForm                                                       */
/* ================================================================== */

export function expandedFormProcedural() {
  const items = [];

  // Band 1 — teen expanded completion (arrow register avoids the addition
  // and numberBonds string spaces) + word form.
  for (let n = 11; n <= 19; n += 1) {
    items.push(
      item("expandedForm", "procedural", "teenExpandComplete", "band1", {
        answer: n - 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place: 1 }, promptText: `${n} → 10 + ? ones` },
      })
    );
  }
  const WORDS = { 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen", 20: "twenty" };
  for (let n = 11; n <= 20; n += 1) {
    items.push(
      item("expandedForm", "procedural", "wordToNumeralTeen", "band1", {
        answer: n,
        answerType: "numberPad",
        display: { promptText: `${WORDS[n]} = ?` },
      })
    );
  }
  for (let n = 11; n <= 19; n += 1) {
    items.push(
      item("expandedForm", "procedural", "teenArrowCompose", "band1", {
        answer: n,
        answerType: "numberPad",
        display: { counting: { kind: "groups", tens: 1, ones: n - 10 }, promptText: `10 + ${n - 10} → ?` },
      })
    );
  }
  // Numeral -> word choice (reading practice, still procedural).
  let seed = 12000;
  for (const n of [12, 15, 17, 13, 19, 14, 18, 16, 11, 20]) {
    const wrong = Object.entries(WORDS)
      .filter(([k]) => Number(k) !== n)
      .map(([, w]) => w)
      .slice(0, 3);
    items.push(
      item("expandedForm", "procedural", "numeralToWordTeen", "band1", {
        answer: WORDS[n],
        choices: shuffled([WORDS[n], ...wrong], (seed += 1)),
        display: { promptText: `Which word names ${n}?` },
      })
    );
  }

  // Judged teen expansions ("Is this right?" register, numeric claims).
  for (const [n, ok] of [[17, true], [15, false], [12, true], [19, false], [14, true], [16, false], [11, true], [18, false], [13, true], [20, false], [16, true], [12, false], [18, true], [15, true], [19, true]]) {
    const shown = ok ? n - 10 : n - 9;
    items.push(
      item("expandedForm", "procedural", "teenExpandJudge", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        subPrompt: "Is this right?",
        display: { promptText: `10 + ${shown} = ${n}`, truth: ok },
      })
    );
  }

  // Band 2 — two-digit expanded both directions.
  for (const [t, o] of [[2, 5], [3, 8], [4, 1], [5, 6], [6, 3], [7, 9], [8, 2], [9, 7], [2, 4], [3, 3], [4, 9], [5, 1], [6, 8], [7, 2], [8, 6], [9, 4], [4, 7], [6, 5]]) {
    const n = t * 10 + o;
    items.push(
      item("expandedForm", "procedural", "expandTwoDigit", "band2", {
        answer: o,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place: 1 }, promptText: `${n} → ${t * 10} + ?` },
      })
    );
    items.push(
      item("expandedForm", "procedural", "composeTwoDigit", "band2", {
        answer: n,
        answerType: "numberPad",
        display: { counting: { kind: "groups", tens: t, ones: o }, promptText: `${t * 10} + ${o} → ?` },
      })
    );
  }

  for (const [n, ok] of [[47, true], [83, false], [29, true], [65, false], [38, true], [74, false], [56, true], [91, false], [23, true], [88, false], [35, true], [62, false], [49, true], [77, false], [51, true]]) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    const shown = ok ? `${t * 10} + ${o}` : `${t * 10} + ${o + 1}`;
    items.push(
      item("expandedForm", "procedural", "expandJudgeMid", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        subPrompt: "Is this right?",
        display: { promptText: `${shown} = ${n}`, truth: ok },
      })
    );
  }

  // Band 3 — three-digit expanded, including zero places.
  for (const [h, t, o] of [[3, 4, 7], [5, 8, 2], [8, 1, 6], [4, 9, 3], [2, 6, 5], [7, 3, 9], [9, 0, 4], [6, 7, 0], [1, 2, 8], [3, 5, 6], [7, 4, 1], [8, 6, 9], [2, 3, 5], [5, 1, 7], [6, 8, 2], [9, 5, 1], [4, 0, 8], [1, 6, 3]]) {
    const n = h * 100 + t * 10 + o;
    items.push(
      item("expandedForm", "procedural", "composeThreeDigit", "band3", {
        answer: n,
        answerType: "numberPad",
        display: { counting: { kind: "units", hundreds: h, tens: t, ones: o }, promptText: `${h * 100}${t ? ` + ${t * 10}` : ""}${o ? ` + ${o}` : ""} → ?` },
      })
    );
  }
  for (const [h, t, o, place] of [[3, 4, 7, 10], [5, 8, 2, 100], [8, 1, 6, 1], [4, 9, 3, 10], [2, 6, 5, 100], [7, 3, 9, 1], [9, 2, 4, 10], [6, 7, 5, 100], [1, 2, 8, 10], [3, 5, 6, 1], [7, 4, 1, 100], [8, 6, 9, 10], [2, 3, 5, 1], [5, 1, 7, 100], [6, 8, 2, 10], [9, 5, 1, 1], [4, 3, 8, 100], [1, 6, 3, 10]]) {
    const n = h * 100 + t * 10 + o;
    const word = place === 100 ? "hundreds" : place === 10 ? "tens" : "ones";
    items.push(
      item("expandedForm", "procedural", "expandPartBig", "band3", {
        answer: (Math.floor(n / place) % 10) * place,
        answerType: "numberPad",
        display: { counting: { kind: "placeValueOf", n, place }, promptText: `${n} → ? from the ${word} place` },
      })
    );
  }

  for (const [h, t, o, ok] of [[3, 4, 6, true], [5, 8, 3, false], [8, 1, 7, true], [4, 9, 2, false], [2, 6, 4, true], [7, 3, 8, false], [9, 2, 5, true], [6, 7, 4, false], [1, 2, 9, true], [3, 5, 7, false], [7, 4, 2, true], [8, 6, 8, false], [2, 3, 6, true], [5, 1, 8, false], [6, 8, 3, true]]) {
    const n = h * 100 + t * 10 + o;
    const shown = ok ? `${h * 100} + ${t * 10} + ${o}` : `${h * 100} + ${t * 10} + ${o + 1}`;
    items.push(
      item("expandedForm", "procedural", "expandJudgeBig", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        subPrompt: "Is this right?",
        display: { promptText: `${shown} = ${n}`, truth: ok },
      })
    );
  }

  return items;
}

export function expandedFormConceptual() {
  const items = [];
  let seed = 13000;

  const WORD_LIST = { 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen", 20: "twenty" };
  const wordClaimPhr = rotor([
    (nm, w, n) => `${nm} reads "${w}" and writes ${n}. Is ${nm} right?`,
    (nm, w, n) => `${nm} matches the word "${w}" to the numeral ${n}. Is that right?`,
  ]);
  [[15, 15, true], [17, 16, false], [12, 12, true], [19, 18, false], [14, 14, true], [16, 17, false], [11, 11, true], [18, 19, false], [13, 13, true], [20, 19, false], [16, 16, true], [12, 13, false], [18, 18, true], [15, 14, false], [19, 19, true], [13, 12, false], [17, 17, true], [11, 12, false], [14, 15, false]].forEach(([w, n, ok], i) => {
    items.push(
      item("expandedForm", "conceptual", "wordClaimJudgeTeen", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: wordClaimPhr()(nameAt(i * 3 + 3), WORD_LIST[w], n), truth: ok },
      })
    );
  });

  // Which expansion matches (choice; digit-swap distractors).
  const matchPhr = rotor([
    (nm, n) => `${nm} wants the expanded form of ${n}. Which is it?`,
    (nm, n) => `Which sum shows ${n} the expanded way? ${nm} is checking.`,
    (nm, n) => `Help ${nm} pick the expansion that makes ${n}.`,
  ]);
  const match = (structureType, band, values, expand) => {
    values.forEach((n, i) => {
      const correct = expand(n);
      const t = Math.floor(n / 10) % 10;
      const o = n % 10;
      const h = Math.floor(n / 100);
      const swap = h ? `${o * 100} + ${t * 10} + ${h}` : `${o * 10} + ${t}`;
      const offTen = h ? `${h * 100} + ${(t + 1) * 10} + ${o}` : `${(t + 1) * 10} + ${o}`;
      const digits = h ? `${h} + ${t} + ${o}` : `${t} + ${o}`;
      items.push(
        item("expandedForm", "conceptual", structureType, band, {
          answer: correct,
          choices: shuffled([...new Set([correct, swap, offTen, digits])], (seed += 1)),
          display: { promptText: matchPhr()(nameAt(i * 3 + 2), n) },
        })
      );
    });
  };
  match("pickExpansionTeens", "band1", [13, 17, 12, 19, 14, 16, 18, 15, 13, 17, 12, 19, 16, 14, 15, 18], (n) => `10 + ${n - 10}`);
  match("pickExpansion", "band2", [25, 38, 41, 56, 63, 79, 82, 97, 24, 33, 49, 51, 68, 72, 86, 94, 47, 65], (n) => `${Math.floor(n / 10) * 10} + ${n % 10}`);
  match("pickExpansionBig", "band3", [347, 582, 816, 493, 265, 739, 128, 356, 741, 869, 235, 517, 682, 951, 163, 428, 594, 376], (n) => `${Math.floor(n / 100) * 100} + ${Math.floor(n / 10) % 10 * 10} + ${n % 10}`);

  // Judged expansion claims.
  const claimPhr = rotor([
    (nm, n, claim) => `${nm} writes ${n} = ${claim}. Is ${nm} right?`,
    (nm, n, claim) => `${nm} expands ${n} as ${claim}. Is that right?`,
  ]);
  const claim = (structureType, band, cases) => {
    cases.forEach(([n, ok], i) => {
      const t = Math.floor(n / 10) % 10;
      const o = n % 10;
      const h = Math.floor(n / 100);
      const good = h ? `${h * 100} + ${t * 10} + ${o}` : `${t * 10} + ${o}`;
      const bad = h ? `${h * 100} + ${t} + ${o}` : `${t} + ${o}`;
      items.push(
        item("expandedForm", "conceptual", structureType, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { promptText: claimPhr()(nameAt(i * 3 + 5), n, ok ? good : bad), truth: ok },
        })
      );
    });
  };
  claim("expandClaimJudge", "band2", [[25, true], [38, false], [41, true], [56, false], [63, true], [79, false], [82, true], [97, false], [24, true], [33, false], [49, true], [51, false], [68, true], [72, false], [86, true], [94, false], [47, true], [65, false]]);
  claim("expandClaimJudgeBig", "band3", [[347, true], [582, false], [816, true], [493, false], [265, true], [739, false], [128, true], [356, false], [741, true], [869, false], [235, true], [517, false], [682, true], [951, false], [163, true], [428, false], [594, true], [376, false]]);

  // Which does NOT equal n (multi-form odd one out).
  const oddPhr = rotor([
    (nm, n) => `Three of ${nm}'s cards show ${n}. Which card does NOT?`,
    (nm, n) => `${nm} sorted cards for ${n}, but one is wrong. Which one?`,
  ]);
  const odd = (structureType, band, values) => {
    values.forEach((n, i) => {
      const t = Math.floor(n / 10) % 10;
      const o = n % 10;
      const good1 = `${t * 10} + ${o}`;
      const good2 = `${unit(t, "ten")} ${unit(o, "one")}`;
      const good3 = String(n);
      const bad = `${o * 10} + ${t}`;
      items.push(
        item("expandedForm", "conceptual", structureType, band, {
          answer: bad,
          choices: shuffled([good1, good2, good3, bad], (seed += 1)),
          display: { promptText: oddPhr()(nameAt(i * 3 + 8), n) },
        })
      );
    });
  };
  odd("oddOneOutForms", "band2", [25, 38, 41, 56, 63, 79, 82, 97, 24, 49, 68, 86, 47, 65, 51, 72]);

  const oddBigPhr = rotor([
    (nm, n) => `Three of ${nm}'s cards show ${n}. Which card does NOT?`,
    (nm, n) => `${nm} sorted cards for ${n}, but one is wrong. Which one is it?`,
  ]);
  [347, 582, 816, 493, 265, 739, 128, 356, 741, 869, 235, 517, 682, 951, 163].forEach((n, i) => {
    const h = Math.floor(n / 100);
    const t = Math.floor(n / 10) % 10;
    const o = n % 10;
    const good1 = `${h * 100} + ${t * 10} + ${o}`;
    const good2 = `${unit(h, "hundred")} ${unit(t, "ten")} ${unit(o, "one")}`;
    const good3 = String(n);
    const bad = `${h * 100} + ${o * 10} + ${t}`;
    items.push(
      item("expandedForm", "conceptual", "oddOneOutFormsBig", "band3", {
        answer: bad,
        choices: shuffled([good1, good2, good3, bad], (seed += 1)),
        display: { promptText: oddBigPhr()(nameAt(i * 3 + 6), n) },
      })
    );
  });

  // Teen frames: pick which pair of frames shows n (visual, choices as text).
  const framePickPhr = rotor([
    (nm, n) => `${nm} needs frames showing ${n}. Which build works: a full ten and how many more?`,
    (nm, n) => `To show ${n} with a full ten frame, how many extra counters does ${nm} add?`,
  ]);
  [13, 16, 12, 18, 14, 19, 11, 17, 15, 13, 16, 12, 18, 14, 19, 17].forEach((n, i) => {
    items.push(
      item("expandedForm", "conceptual", "teenFramePlan", "band1", {
        answer: n - 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place: 1 }, promptText: framePickPhr()(nameAt(i * 3 + 11), n) },
      })
    );
  });

  return items;
}

/* ================================================================== */
/* regroupingSense                                                    */
/* ================================================================== */

export function regroupingSenseProcedural() {
  const items = [];

  // Band 1 — trade ten ones for a ten; frames build to teens.
  for (let o = 1; o <= 9; o += 1) {
    items.push(
      item("regroupingSense", "procedural", "onesToTeen", "band1", {
        answer: 10 + o,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [10, o] }, promptText: `10 ones + ${unit(o, "one")} = ?` },
      })
    );
  }
  const buildPhrs = [
    (n) => `Build ${n}: fill the first frame, then keep going. How many counters did you place?`,
    (n) => `Show ${n} on the frames by tapping cells. How many counters is that?`,
  ];
  for (const phr of buildPhrs) {
    for (const n of [12, 15, 13, 17, 14, 18, 11, 16, 19]) {
      items.push(
        item("regroupingSense", "procedural", "buildTeenFrames", "band1", {
          answer: n,
          answerType: "tenFrame",
          display: { filled: 0, frames: 2, frameMode: "build", counting: { kind: "set", count: n }, promptText: phr(n) },
        })
      );
    }
  }
  for (let n = 11; n <= 19; n += 1) {
    items.push(
      item("regroupingSense", "procedural", "teenDecompose", "band1", {
        answer: n - 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place: 1 }, promptText: `${n} = 1 ten + ? ones` },
      })
    );
  }
  for (let n = 11; n <= 19; n += 1) {
    items.push(
      item("regroupingSense", "procedural", "teenAsOnes", "band1", {
        answer: n - 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place: 1 }, promptText: `${n} → 10 ones + ? ones` },
      })
    );
  }
  for (const [tens, extra] of [[1, 2], [1, 5], [1, 8], [1, 3], [1, 6], [1, 9], [1, 4], [1, 7], [1, 1], [2, 0]]) {
    items.push(
      item("regroupingSense", "procedural", "bundleCount", "band1", {
        answer: tens * 10 + extra,
        answerType: "numberPad",
        display: { counting: { kind: "groups", tens, ones: extra }, promptText: `${unit(tens, "bundle")} of 10 + ${unit(extra, "loose one")} = ?` },
      })
    );
  }
  // Band 2 — non-canonical composes (the heart of regrouping).
  for (const [t, o] of [[2, 14], [3, 12], [1, 16], [4, 13], [2, 17], [5, 11], [3, 15], [1, 19], [4, 18], [6, 12], [2, 11], [5, 14], [3, 17], [7, 13], [1, 15], [6, 16], [4, 12], [8, 11]]) {
    items.push(
      item("regroupingSense", "procedural", "nonCanonicalCompose", "band2", {
        answer: t * 10 + o,
        answerType: "numberPad",
        display: { counting: { kind: "groups", tens: t, ones: o }, promptText: `${unit(t, "ten")} ${unit(o, "one")} = ?` },
      })
    );
  }
  // Rename: n = k tens ? ones.
  for (const [n, k] of [[34, 2], [47, 3], [52, 4], [68, 5], [73, 6], [86, 7], [91, 8], [45, 3], [57, 4], [62, 5], [78, 6], [83, 7], [96, 8], [39, 2], [54, 4], [66, 5], [71, 6], [88, 7]]) {
    items.push(
      item("regroupingSense", "procedural", "renameTens", "band2", {
        answer: n - k * 10,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: k * 10, target: n }, promptText: `${n} = ${unit(k, "ten")} + ? ones` },
      })
    );
  }
  for (const [n] of [[47], [83], [29], [65], [38], [74], [56], [91], [23], [88], [35], [62], [49], [77], [51]]) {
    items.push(
      item("regroupingSense", "procedural", "renameTensDigit", "band2", {
        answer: Math.floor(n / 10),
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place: 10 }, promptText: `${n} = ? tens ${n % 10} ones` },
      })
    );
  }

  // Band 3 — hundreds renames and unit arithmetic.
  for (const [h, t, o] of [[2, 14, 5], [3, 12, 8], [1, 16, 3], [4, 13, 7], [2, 17, 2], [5, 11, 6], [3, 15, 1], [1, 19, 9], [4, 18, 4], [6, 12, 0], [2, 11, 8], [5, 14, 3], [3, 17, 6], [7, 13, 2], [1, 15, 5], [6, 16, 9], [4, 12, 1], [8, 11, 7]]) {
    items.push(
      item("regroupingSense", "procedural", "nonCanonicalComposeBig", "band3", {
        answer: h * 100 + t * 10 + o,
        answerType: "numberPad",
        display: { counting: { kind: "units", hundreds: h, tens: t, ones: o }, promptText: `${unit(h, "hundred")} ${unit(t, "ten")} ${unit(o, "one")} = ?` },
      })
    );
  }
  for (const [n, k] of [[340, 24], [470, 37], [520, 42], [680, 58], [730, 63], [860, 76], [910, 81], [450, 35], [570, 47], [620, 52], [780, 68], [830, 73], [960, 86], [390, 29], [540, 44], [660, 56], [710, 61], [880, 78]]) {
    items.push(
      item("regroupingSense", "procedural", "renameAsTens", "band3", {
        answer: n / 10,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: 0, target: n / 10 }, promptText: `${n} = ? tens` },
      })
    );
  }

  for (const [n] of [[347], [582], [816], [493], [265], [739], [904], [670], [128], [356], [741], [869], [235], [517], [682]]) {
    items.push(
      item("regroupingSense", "procedural", "renameHundredsDigit", "band3", {
        answer: Math.floor(n / 100),
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place: 100 }, promptText: `${n} = ? hundreds ${Math.floor(n / 10) % 10} tens ${n % 10} ones` },
      })
    );
  }

  return items;
}

export function regroupingSenseConceptual() {
  const items = [];
  let seed = 14000;

  // Judged equivalence claims (2 tens 14 ones = 34?).
  const eqPhr = rotor([
    (nm, form, n) => `${nm} says ${form} is the same as ${n}. Is ${nm} right?`,
    (nm, form, n) => `${nm} claims ${form} makes ${n}. Is that right?`,
  ]);
  const eq = (structureType, band, cases) => {
    cases.forEach(([t, o, ok], i) => {
      const real = t * 10 + o;
      // Band-1 false claims stay <= 20 (off-by-one); band 2 uses the +10 slip.
      const claim = ok ? real : band === "band1" ? real + 1 : real + 10;
      items.push(
        item("regroupingSense", "conceptual", structureType, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { promptText: eqPhr()(nameAt(i * 3 + 3), `${unit(t, "ten")} ${unit(o, "one")}`, claim), truth: ok },
        })
      );
    });
  };
  eq("equivalenceJudgeTeen", "band1", [[1, 4, true], [1, 7, false], [1, 2, true], [1, 5, false], [1, 8, true], [1, 3, false], [1, 6, true], [1, 9, false], [1, 1, true], [1, 4, false], [1, 5, true], [1, 2, false], [1, 6, false], [1, 8, false], [1, 3, true], [1, 7, true]]);
  eq("equivalenceJudge", "band2", [[2, 14, true], [3, 12, false], [1, 16, true], [4, 13, false], [2, 17, true], [5, 11, false], [3, 15, true], [1, 19, false], [4, 18, true], [6, 12, false], [2, 11, true], [5, 14, false], [3, 17, true], [7, 13, false], [1, 15, true], [6, 16, false], [4, 12, true], [8, 11, false]]);

  const onesNamePhr = rotor([
    (nm, n, k) => `${nm} says ${n} is the same as ${k} ones. Is ${nm} right?`,
    (nm, n, k) => `${nm} writes ${n} = ${k} ones. Is that right?`,
  ]);
  [[14, 14, true], [17, 16, false], [12, 12, true], [19, 18, false], [15, 15, true], [11, 12, false], [16, 16, true], [13, 14, false], [18, 18, true], [14, 15, false], [17, 17, true], [12, 13, false], [19, 19, true], [16, 15, false], [11, 11, true], [18, 17, false], [13, 13, true], [15, 16, false], [20, 20, true]].forEach(([n, k, ok], i) => {
    items.push(
      item("regroupingSense", "conceptual", "onesNameJudgeTeen", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: onesNamePhr()(nameAt(i * 3 + 15), n, k), truth: ok },
      })
    );
  });

  // Which rename is correct (choice).
  const renamePhr = rotor([
    (nm, n) => `${nm} wants to rename ${n} with extra ones. Which way is right?`,
    (nm, n) => `Which of these is another true name for ${n}? ${nm} is stuck.`,
  ]);
  const rename = (structureType, band, values) => {
    values.forEach((n, i) => {
      const t = Math.floor(n / 10);
      const o = n % 10;
      const correct = `${unit(t - 1, "ten")} ${unit(o + 10, "one")}`;
      const wrong1 = `${unit(t - 1, "ten")} ${unit(o, "one")}`;
      const wrong2 = `${unit(t, "ten")} ${unit(o + 10, "one")}`;
      const wrong3 = `${unit(t + 1, "ten")} ${unit(o + 10, "one")}`;
      items.push(
        item("regroupingSense", "conceptual", structureType, band, {
          answer: correct,
          choices: shuffled([correct, wrong1, wrong2, wrong3], (seed += 1)),
          display: { promptText: renamePhr()(nameAt(i * 3 + 6), n) },
        })
      );
    });
  };
  rename("pickRename", "band2", [34, 47, 52, 68, 73, 86, 91, 45, 57, 62, 78, 83, 96, 39, 54, 66, 71, 88]);

  // How many trades (ten ones -> a ten) can be made.
  const tradePhr = rotor([
    (nm, ones) => `${nm} holds ${ones} loose ones and trades every 10 for a ten. How many tens does ${nm} get?`,
    (nm, ones) => `With ${ones} ones on the mat, how many full trades of ten can ${nm} make?`,
  ]);
  const trade = (structureType, band, cases) => {
    cases.forEach((ones, i) => {
      items.push(
        item("regroupingSense", "conceptual", structureType, band, {
          answer: Math.floor(ones / 10),
          answerType: "numberPad",
          display: { counting: { kind: "digit", n: ones, place: 10 }, promptText: tradePhr()(nameAt(i * 3 + 9), ones) },
        })
      );
    });
  };
  trade("tradesFromOnesTeens", "band1", [12, 17, 14, 19, 11, 16, 13, 18, 15, 12, 17, 14, 19, 16, 13, 20]);
  trade("tradesFromOnes", "band2", [34, 47, 52, 68, 73, 86, 91, 45, 57, 62, 78, 83, 96, 39, 54, 66, 71, 88]);

  // Judged rename claims at hundreds (13 tens = 130).
  const bigEqPhr = rotor([
    (nm, k, n) => `${nm} says ${k} tens is the same as ${n}. Is ${nm} right?`,
    (nm, k, n) => `${nm} writes ${k} tens = ${n}. Is that right?`,
  ]);
  [[13, 130, true], [15, 105, false], [24, 240, true], [32, 302, false], [45, 450, true], [51, 501, false], [62, 620, true], [78, 708, false], [86, 860, true], [93, 903, false], [17, 170, true], [29, 209, false], [36, 360, true], [44, 404, false], [58, 580, true], [67, 607, false], [72, 720, true], [85, 805, false]].forEach(([k, n, ok], i) => {
    items.push(
      item("regroupingSense", "conceptual", "tensRenameJudgeBig", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: bigEqPhr()(nameAt(i * 3 + 12), k, n), truth: ok },
      })
    );
  });

  // Which is NOT a name for n (multi-form, hundreds).
  const notPhr = rotor([
    (nm, n) => `Three of ${nm}'s cards name ${n}. Which card does NOT?`,
    (nm, n) => `One card is not a true name for ${n}. ${nm} must find it — which is it?`,
  ]);
  [[235], [418], [352], [561], [274], [683], [497], [726], [318], [542], [469], [657], [381], [594], [713], [826], [935], [148]].forEach(([n], i) => {
    const h = Math.floor(n / 100);
    const t = Math.floor(n / 10) % 10;
    const o = n % 10;
    const good1 = `${h * 100} + ${t * 10} + ${o}`;
    const good2 = `${unit(h, "hundred")} ${unit(t, "ten")} ${unit(o, "one")}`;
    const good3 = `${unit(h - 1, "hundred")} ${unit(t + 10, "ten")} ${unit(o, "one")}`;
    const bad = `${unit(h, "hundred")} ${unit(o, "ten")} ${unit(t, "one")}`;
    items.push(
      item("regroupingSense", "conceptual", "notANameBig", "band3", {
        answer: bad,
        choices: shuffled([good1, good2, good3, bad], (seed += 1)),
        display: { promptText: notPhr()(nameAt(i * 3 + 14), n) },
      })
    );
  });

  const hundredOnesPhr = rotor([
    (nm, k, n) => `${nm} says ${k} ones make ${n}. Is ${nm} right?`,
    (nm, k, n) => `${nm} trades ${k} ones and claims they equal ${n}. Is that right?`,
  ]);
  [[200, 200, true], [300, 30, false], [400, 400, true], [500, 50, false], [600, 600, true], [700, 70, false], [800, 800, true], [900, 90, false], [250, 250, true], [350, 35, false], [450, 450, true], [550, 55, false], [650, 650, true], [750, 75, false], [850, 850, true]].forEach(([k, n, ok], i) => {
    items.push(
      item("regroupingSense", "conceptual", "onesNameJudgeBig", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: hundredOnesPhr()(nameAt(i * 3 + 17), k, n), truth: ok },
      })
    );
  });

  return items;
}

export function buildDeterministicItems() {
  return [
    ...tensOnesProcedural(),
    ...tensOnesConceptual(),
    ...expandedFormProcedural(),
    ...expandedFormConceptual(),
    ...regroupingSenseProcedural(),
    ...regroupingSenseConceptual(),
  ];
}
