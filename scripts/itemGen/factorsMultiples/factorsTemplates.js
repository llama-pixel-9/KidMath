/* Deterministic factorsMultiples bank items — part 1: factorCount,
 * nthMultiple. (Part 2: factorsTemplates2.js; stories: factorsStories.js.)
 *
 * All answers are integers (numberPad) or strings on choice items — the
 * generator's multiSelect varieties are NOT represented in the bank.
 * Claims ride display.fm, re-derived by authorFactors.js. Judged =
 * "Is this right?" Yes/No. Letter-free forms ("x5: 5, 10, 15, ?",
 * "12 = 3 x ?") are what the words-off session filter can serve.
 *
 * Bands mirror targetPool: K-1 {4,6,8,9,10,12}; 2-3 {12..30}; 4-5 {24..60}.
 */

import { shuffled, NAMES } from "../counting/countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };
export const OFF = { band1: 0, band2: 7, band3: 13 };
export const nameAt = (i) => NAMES[i % NAMES.length];
export const phrIdx = (i, listLen, phrCount) => (Math.floor(i / listLen) * 2 + (i % 2)) % phrCount;

export const factorsOf = (n) => {
  const out = [];
  for (let i = 1; i <= n; i += 1) if (n % i === 0) out.push(i);
  return out;
};
export const isPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i += 1) if (n % i === 0) return false;
  return true;
};

export const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "factorsMultiples",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

/* ================================================================== */
/* factorCount                                                         */
/* ================================================================== */

export function factorCountProcedural() {
  const items = [];
  let seed = 561;

  const countPhr = {
    band1: [
      (n) => `How many factors does ${n} have? Count every one.`,
      (n) => `Count all the factors of ${n}. How many factors is that?`,
      (n) => `The number ${n} has how many factors in all?`,
      (n) => `Find every factor of ${n}. Type how many factors you find.`,
    ],
    band2: [
      (n) => `Count the complete factor list of ${n}. How many factors are there?`,
      (n) => `How many factors belong to ${n}? Type the count.`,
      (n) => `List the factors of ${n} in your head. How many factors did you list?`,
      (n) => `The full factor list of ${n} holds how many numbers?`,
    ],
    band3: [
      (n) => `Exactly how many factors does ${n} have?`,
      (n) => `Determine the total number of factors of ${n}.`,
      (n) => `The factor list of ${n} contains how many entries? Type it.`,
      (n) => `Count precisely: how many factors divide ${n}?`,
    ],
  };
  const countData = {
    band1: [4, 6, 8, 9, 10, 12, 4, 6, 8, 9, 10, 12, 6],
    band2: [12, 14, 15, 16, 18, 20, 24, 25, 28, 30, 21, 27, 22],
    band3: [24, 30, 32, 36, 40, 42, 45, 48, 50, 54, 60, 44, 56],
  };
  for (const band of ["band1", "band2", "band3"]) {
    countData[band].forEach((n, i) => {
      items.push(
        item("factorCount", "procedural", `countFactors_${band}`, band, {
          answer: factorsOf(n).length,
          answerType: "numberPad",
          display: { fm: { kind: "factorCount", n }, promptText: countPhr[band][phrIdx(i, band === "band1" ? 6 : 10, 4)](n) },
        })
      );
    });
  }

  // Letter-free: 12 = 3 x ?
  const missPhr = [(n, a) => `${n} = ${a} x ?`, (n, a) => `${a} x ? = ${n}`];
  const missData = {
    band1: [[12, 3], [12, 4], [12, 6], [8, 2], [8, 4], [6, 2], [6, 3], [10, 2], [10, 5], [9, 3], [4, 2], [12, 2], [8, 8]],
    band2: [[14, 2], [15, 3], [16, 4], [18, 3], [20, 4], [24, 6], [25, 5], [28, 4], [30, 5], [21, 3], [27, 9], [22, 2], [18, 6]],
    band3: [[32, 4], [36, 6], [40, 8], [42, 6], [45, 9], [48, 6], [50, 5], [54, 6], [60, 5], [44, 4], [56, 7], [48, 8], [36, 4]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    missData[band].forEach(([n, a], i) => {
      items.push(
        item("factorCount", "procedural", `missingFactor_${band}`, band, {
          answer: n / a,
          answerType: "numberPad",
          display: { fm: { kind: "pairFor", n, a }, promptText: missPhr[i % 2](n, a) },
        })
      );
    });
  }

  const pickPhr = {
    band1: [
      (n, list) => `Which of ${list} is a factor of ${n}? Pick it.`,
      (n, list) => `From ${list}, pick the number that is a factor of ${n}. Which is it?`,
      (n, list) => `One of ${list} divides ${n} evenly. Which factor is it?`,
      (n, list) => `Choose the factor of ${n} from ${list}. Which do you choose?`,
    ],
    band2: [
      (n, list) => `Select the factor of ${n} from ${list}. Which is it?`,
      (n, list) => `Which of ${list} is a factor of ${n}?`,
      (n, list) => `Exactly one of ${list} divides ${n} with nothing left over. Which one?`,
      (n, list) => `Find the factor of ${n} among ${list}. Which did you find?`,
    ],
    band3: [
      (n, list) => `Identify the factor of ${n} within ${list}. Which is it?`,
      (n, list) => `Of ${list}, which number is a factor of ${n}?`,
      (n, list) => `Precisely one of ${list} is a factor of ${n}. Which one is it?`,
      (n, list) => `Determine which of ${list} divides ${n} evenly. Which does?`,
    ],
  };
  const pickData = {
    band1: [[12, 3, [5, 7, 11]], [8, 4, [3, 5, 6]], [6, 3, [4, 5, 7]], [10, 5, [3, 4, 6]], [9, 3, [2, 4, 5]], [12, 6, [5, 7, 9]], [4, 2, [3, 5, 6]], [8, 2, [3, 5, 7]], [10, 2, [3, 4, 7]], [6, 2, [4, 5, 7]], [12, 4, [5, 7, 10]], [9, 9, [2, 4, 5]], [10, 10, [3, 4, 6]]],
    band2: [[14, 7, [3, 4, 5]], [15, 5, [2, 4, 6]], [16, 8, [3, 5, 6]], [18, 6, [4, 5, 7]], [20, 4, [3, 6, 7]], [24, 8, [5, 7, 9]], [25, 5, [2, 3, 4]], [28, 7, [3, 5, 6]], [30, 6, [4, 7, 8]], [21, 7, [2, 4, 5]], [27, 9, [2, 4, 5]], [22, 11, [3, 4, 5]], [24, 6, [5, 7, 10]]],
    band3: [[32, 8, [3, 5, 6]], [36, 9, [5, 7, 8]], [40, 8, [3, 6, 7]], [42, 7, [4, 5, 8]], [45, 9, [2, 4, 6]], [48, 6, [5, 7, 9]], [50, 25, [3, 4, 6]], [54, 27, [4, 5, 7]], [60, 12, [7, 8, 9]], [44, 11, [3, 5, 6]], [56, 8, [3, 5, 6]], [48, 16, [5, 7, 9]], [36, 12, [5, 7, 8]]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    pickData[band].forEach(([n, good, wrong], i) => {
      const all = shuffled([good, ...wrong], (seed += 1));
      items.push(
        item("factorCount", "procedural", `pickFactor_${band}`, band, {
          answer: good,
          choices: all,
          display: { fm: { kind: "pickFactor", n }, promptText: pickPhr[band][phrIdx(i, 13, 4)](n, all.join(", ")) },
        })
      );
    });
  }

  const notPhr = {
    band1: [
      (n, list) => `Which of ${list} is NOT a factor of ${n}? Pick it.`,
      (n, list) => `From ${list}, pick the number that is NOT a factor of ${n}. Which is it?`,
      (n, list) => `One of ${list} does NOT divide ${n} evenly. Which is it?`,
      (n, list) => `Choose the number in ${list} that fails to be a factor of ${n}. Which fails?`,
    ],
    band2: [
      (n, list) => `Select the one of ${list} that is NOT a factor of ${n}. Which is it?`,
      (n, list) => `Which of ${list} is NOT a factor of ${n}?`,
      (n, list) => `Exactly one of ${list} leaves a remainder when dividing ${n}. Which one?`,
      (n, list) => `Find the non-factor of ${n} among ${list}. Which did you find?`,
    ],
    band3: [
      (n, list) => `Identify which of ${list} is NOT a factor of ${n}. Which is it?`,
      (n, list) => `Of ${list}, which number is NOT a factor of ${n}?`,
      (n, list) => `Precisely one of ${list} is not a factor of ${n}. Which one is it?`,
      (n, list) => `Determine which of ${list} does NOT divide ${n} evenly. Which does not?`,
    ],
  };
  const notData = {
    band1: [[12, 5, [2, 3, 4]], [8, 3, [1, 2, 4]], [6, 4, [1, 2, 3]], [10, 4, [1, 2, 5]], [9, 2, [1, 3, 9]], [12, 7, [3, 4, 6]], [4, 3, [1, 2, 4]], [8, 5, [2, 4, 8]], [10, 3, [2, 5, 10]], [6, 5, [2, 3, 6]], [12, 9, [2, 6, 12]], [9, 4, [1, 3, 9]], [10, 7, [1, 2, 5]]],
    band2: [[14, 4, [2, 7, 14]], [15, 4, [3, 5, 15]], [16, 3, [2, 4, 8]], [18, 4, [2, 6, 9]], [20, 3, [4, 5, 10]], [24, 5, [4, 6, 8]], [25, 3, [1, 5, 25]], [28, 3, [4, 7, 14]], [30, 4, [5, 6, 10]], [21, 6, [3, 7, 21]], [27, 6, [3, 9, 27]], [22, 4, [2, 11, 22]], [24, 7, [3, 8, 12]]],
    band3: [[32, 6, [4, 8, 16]], [36, 8, [6, 9, 12]], [40, 6, [5, 8, 10]], [42, 4, [6, 7, 14]], [45, 6, [5, 9, 15]], [48, 5, [6, 8, 16]], [50, 4, [5, 10, 25]], [54, 4, [6, 9, 27]], [60, 8, [6, 10, 12]], [44, 8, [4, 11, 22]], [56, 6, [7, 8, 14]], [48, 7, [4, 12, 24]], [36, 5, [4, 6, 18]]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    notData[band].forEach(([n, good, wrong], i) => {
      const all = shuffled([good, ...wrong], (seed += 1));
      items.push(
        item("factorCount", "procedural", `pickNonFactor_${band}`, band, {
          answer: good,
          choices: all,
          display: { fm: { kind: "pickNonFactor", n }, promptText: notPhr[band][phrIdx(i, 13, 4)](n, all.join(", ")) },
        })
      );
    });
  }

  return items;
}

export function factorCountConceptual() {
  const items = [];

  const isFactorPhr = {
    band1: [
      (nm, k, n) => `${nm} says ${k} is a factor of ${n}. Is ${nm} right?`,
      (nm, k, n) => `${k} is a factor of ${n}, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, k, n) => `${nm} lists ${k} among the factors of ${n}. Does it belong there?`,
      (nm, k, n) => `According to ${nm}, ${n} divides evenly by ${k}. Is ${nm} right?`,
    ],
    band3: [
      (nm, k, n) => `${nm} certifies ${k} as a factor of ${n}. Is the certification valid?`,
      (nm, k, n) => `Auditing ${nm}'s factor list for ${n}: it includes ${k}. Clean audit?`,
    ],
  };
  const isFactorData = {
    band1: [[3, 12, true], [5, 12, false], [4, 8, true], [3, 8, false], [2, 6, true], [4, 6, false], [5, 10, true], [3, 10, false], [3, 9, true], [2, 9, false], [6, 12, true], [7, 12, false], [2, 4, true], [3, 4, false], [2, 10, true], [4, 10, false], [2, 8, true], [5, 8, false]],
    band2: [[7, 14, true], [4, 14, false], [5, 15, true], [4, 15, false], [8, 16, true], [3, 16, false], [6, 18, true], [4, 18, false], [4, 20, true], [3, 20, false], [8, 24, true], [5, 24, false], [5, 25, true], [3, 25, false], [7, 28, true], [3, 28, false], [6, 30, true], [4, 30, false]],
    band3: [[8, 32, true], [6, 32, false], [9, 36, true], [8, 36, false], [8, 40, true], [6, 40, false], [7, 42, true], [4, 42, false], [9, 45, true], [6, 45, false], [6, 48, true], [5, 48, false], [25, 50, true], [4, 50, false], [27, 54, true], [4, 54, false], [12, 60, true], [8, 60, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    isFactorData[band].forEach(([k, n, ok], i) => {
      items.push(
        item("factorCount", "conceptual", `isFactorJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { fm: { kind: "isFactor", k, n }, promptText: isFactorPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), k, n), truth: ok },
        })
      );
    });
  }

  const rowsPhr = {
    band1: [
      (nm, n, r) => `${nm} says ${n} counters can make equal rows of ${r} with none left over. Is ${nm} right?`,
      (nm, n, r) => `Equal rows of ${r} use up ${n} counters exactly, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, n, r) => `${nm} arranges ${n} chairs into equal rows of ${r} and expects none left over. Will it work out?`,
      (nm, n, r) => `Rows of ${r} will exactly use ${n} chairs, says ${nm}. Is ${nm} right?`,
    ],
    band3: [
      (nm, n, r) => `${nm} plans equal rows of ${r} from ${n} tiles with zero remainder. Is the plan sound?`,
      (nm, n, r) => `Splitting ${n} tiles into rows of ${r} leaves nothing over, asserts ${nm}. Correct?`,
    ],
  };
  const rowsData = {
    band1: [[12, 3, true], [12, 5, false], [8, 4, true], [8, 3, false], [6, 2, true], [6, 4, false], [10, 5, true], [10, 4, false], [9, 3, true], [9, 2, false], [12, 4, true], [12, 7, false], [4, 2, true], [4, 3, false], [10, 2, true], [10, 3, false], [8, 2, true], [8, 5, false]],
    band2: [[14, 7, true], [14, 4, false], [15, 3, true], [15, 6, false], [16, 4, true], [16, 5, false], [18, 6, true], [18, 5, false], [20, 5, true], [20, 6, false], [24, 8, true], [24, 7, false], [25, 5, true], [25, 4, false], [28, 4, true], [28, 5, false], [30, 6, true], [30, 7, false]],
    band3: [[32, 8, true], [32, 5, false], [36, 9, true], [36, 7, false], [40, 8, true], [40, 7, false], [42, 6, true], [42, 8, false], [45, 9, true], [45, 7, false], [48, 8, true], [48, 9, false], [50, 25, true], [50, 8, false], [54, 9, true], [54, 8, false], [60, 12, true], [60, 9, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    rowsData[band].forEach(([n, r, ok], i) => {
      items.push(
        item("factorCount", "conceptual", `rowsJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { fm: { kind: "isFactor", k: r, n }, promptText: rowsPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), n, r), truth: ok },
        })
      );
    });
  }

  const onePhr = {
    band1: [
      (nm, n) => `${nm} says 1 is a factor of ${n}. Is ${nm} right?`,
      (nm, n) => `${nm} says ${n} is a factor of itself. Is ${nm} right?`,
    ],
    band2: [
      (nm, n) => `${nm} claims every factor list starts at 1, so 1 is a factor of ${n}. Is that right?`,
      (nm, n) => `${nm} insists a number like ${n} always counts as its own factor. Is ${nm} right?`,
    ],
    band3: [
      (nm, n) => `${nm} writes both 1 and ${n} into the factor list of ${n}. Do both belong?`,
      (nm, n) => `The factor list of ${n} must include ${n} itself, argues ${nm}. Sound argument?`,
    ],
  };
  const oneData = { band1: [4, 6, 8, 9, 10, 12, 4, 6, 8, 9, 10, 12, 4, 6, 8, 9], band2: [14, 15, 16, 18, 20, 24, 25, 28, 30, 21, 27, 22, 14, 15, 16, 18], band3: [32, 36, 40, 42, 45, 48, 50, 54, 60, 44, 56, 32, 36, 40, 42, 45] };
  for (const band of ["band1", "band2", "band3"]) {
    oneData[band].forEach((n, i) => {
      items.push(
        item("factorCount", "conceptual", `oneSelfJudge_${band}`, band, {
          answer: "Yes",
          choices: ["Yes", "No"],
          display: { fm: { kind: "authoredYes" }, promptText: onePhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), n), truth: true },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* nthMultiple                                                         */
/* ================================================================== */

const ORD = { 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th", 8: "8th", 9: "9th" };

export function nthMultipleProcedural() {
  const items = [];
  let seed = 571;

  const nthPhr = {
    band1: [
      (b, k) => `The ${ORD[k]} multiple of ${b} = ? Type it.`,
      (b, k) => `Count multiples of ${b}. What is the ${ORD[k]} multiple?`,
      (b, k) => `Type the ${ORD[k]} multiple of ${b}.`,
      (b, k) => `Skip along the multiples of ${b}. Where is the ${ORD[k]} one?`,
    ],
    band2: [
      (b, k) => `Find the ${ORD[k]} multiple of ${b}.`,
      (b, k) => `What number is the ${ORD[k]} multiple of ${b}? Type it.`,
      (b, k) => `Counting by ${b}, the ${ORD[k]} count lands on which number?`,
      (b, k) => `The ${ORD[k]} entry in the multiples of ${b} = ?`,
    ],
    band3: [
      (b, k) => `Compute the ${ORD[k]} multiple of ${b} exactly.`,
      (b, k) => `Exactly which number is the ${ORD[k]} multiple of ${b}?`,
      (b, k) => `Determine the ${ORD[k]} multiple of ${b} and type it.`,
      (b, k) => `The multiples of ${b} reach which value at position ${k}? Type it.`,
    ],
  };
  const nthData = {
    band1: [[2, 3], [2, 4], [2, 5], [3, 2], [3, 3], [3, 4], [4, 2], [4, 3], [5, 2], [5, 3], [5, 4], [2, 6], [4, 4], [2, 7], [3, 5], [2, 8]],
    band2: [[4, 6], [4, 7], [6, 4], [6, 5], [7, 3], [7, 4], [8, 3], [8, 4], [9, 3], [9, 4], [6, 6], [7, 5], [8, 5], [6, 7], [7, 6], [8, 6]],
    band3: [[6, 8], [6, 9], [7, 7], [7, 8], [8, 6], [8, 7], [9, 6], [9, 7], [12, 4], [12, 5], [11, 5], [11, 6], [12, 3], [11, 7], [12, 6], [15, 4]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    nthData[band].forEach(([b, k], i) => {
      items.push(
        item("nthMultiple", "procedural", `nthMultiple_${band}`, band, {
          answer: b * k,
          answerType: "numberPad",
          display: { fm: { kind: "nthMult", b, k }, promptText: nthPhr[band][phrIdx(i, 13, 4)](b, k) },
        })
      );
    });
  }

  // Letter-free: x5: 5, 10, 15, ?  (two windows per base; band1's 5x5 window
  // would exceed 20 and is skipped, topped up by the long-window form)
  const seqPhr = [(b) => `x${b}: ${b}, ${b * 2}, ${b * 3}, ?`, (b) => `x${b}: ${b * 2}, ${b * 3}, ${b * 4}, ?`];
  const seqData = {
    band1: [2, 3, 4, 5, 2, 3, 4, 5],
    band2: [6, 7, 8, 9, 6, 7, 8, 9],
    band3: [11, 12, 15, 20, 11, 12, 15, 20],
  };
  for (const band of ["band1", "band2", "band3"]) {
    seqData[band].forEach((b, i) => {
      const pass = Math.floor(i / 4);
      const k = pass === 0 ? 4 : 5;
      if (band === "band1" && b * k > 20) return;
      items.push(
        item("nthMultiple", "procedural", `multipleSeq_${band}`, band, {
          answer: b * k,
          answerType: "numberPad",
          display: { fm: { kind: "nthMult", b, k }, promptText: seqPhr[pass](b) },
        })
      );
    });
  }
  const seqPhr3 = (b) => `x${b}: ${b}, ${b * 2}, ${b * 3}, ${b * 4}, ?`;
  const longBases = { band1: [2, 3, 4], band2: [6, 7, 8], band3: [11, 12, 15] };
  for (const band of ["band1", "band2", "band3"]) {
    longBases[band].forEach((b) => {
      items.push(
        item("nthMultiple", "procedural", `multipleSeqLong_${band}`, band, {
          answer: b * 5,
          answerType: "numberPad",
          display: { fm: { kind: "nthMult", b, k: 5 }, promptText: seqPhr3(b) },
        })
      );
    });
  }

  const nextPhr = {
    band1: [
      (b, m) => `Which multiple of ${b} comes right after ${m}? Type it.`,
      (b, m) => `Counting by ${b}, the number after ${m} = ?`,
      (b, m) => `Type the next multiple of ${b} after ${m}.`,
      (b, m) => `After ${m}, where does the count-by-${b} land next?`,
    ],
    band2: [
      (b, m) => `Find the next multiple of ${b} after ${m}.`,
      (b, m) => `The multiple of ${b} just past ${m} = ? Type it.`,
      (b, m) => `Continuing by ${b} from ${m}, which number comes next?`,
      (b, m) => `Which multiple of ${b} follows ${m} directly?`,
    ],
    band3: [
      (b, m) => `Compute the next multiple of ${b} beyond ${m}.`,
      (b, m) => `Exactly which multiple of ${b} follows ${m}?`,
      (b, m) => `Determine the multiple of ${b} that comes right after ${m}.`,
      (b, m) => `Past ${m}, the multiples of ${b} continue with which number? Type it.`,
    ],
  };
  const nextData = {
    band1: [[2, 8], [2, 12], [3, 9], [3, 12], [4, 8], [4, 12], [5, 10], [5, 15], [2, 14], [3, 15], [4, 16], [2, 16], [3, 6]],
    band2: [[6, 24], [6, 30], [7, 28], [7, 35], [8, 32], [8, 40], [9, 36], [9, 45], [6, 42], [7, 42], [8, 48], [9, 27], [6, 36]],
    band3: [[11, 55], [11, 66], [12, 60], [12, 72], [15, 60], [15, 75], [20, 80], [20, 60], [11, 77], [12, 84], [15, 90], [20, 100], [11, 44]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    nextData[band].forEach(([b, m], i) => {
      items.push(
        item("nthMultiple", "procedural", `nextMultiple_${band}`, band, {
          answer: m + b,
          answerType: "numberPad",
          display: { fm: { kind: "nextMult", b, m }, promptText: nextPhr[band][phrIdx(i, 13, 4)](b, m) },
        })
      );
    });
  }

  const multPickPhr = {
    band1: [
      (b, list) => `Which of ${list} is a multiple of ${b}? Pick it.`,
      (b, list) => `From ${list}, pick the multiple of ${b}. Which is it?`,
      (b, list) => `One of ${list} appears when you count by ${b}. Which is it?`,
      (b, list) => `Choose the multiple of ${b} from ${list}. Which do you choose?`,
    ],
    band2: [
      (b, list) => `Select the multiple of ${b} from ${list}. Which is it?`,
      (b, list) => `Which of ${list} is a multiple of ${b}?`,
      (b, list) => `Exactly one of ${list} lands on the count-by-${b} list. Which one?`,
      (b, list) => `Find the multiple of ${b} among ${list}. Which did you find?`,
    ],
    band3: [
      (b, list) => `Identify the multiple of ${b} within ${list}. Which is it?`,
      (b, list) => `Of ${list}, which number is a multiple of ${b}?`,
      (b, list) => `Precisely one of ${list} is a multiple of ${b}. Which one is it?`,
      (b, list) => `Determine which of ${list} belongs to the multiples of ${b}. Which does?`,
    ],
  };
  const multPickData = {
    band1: [[2, 8, [5, 7, 9]], [3, 9, [4, 7, 8]], [4, 12, [6, 9, 11]], [5, 15, [7, 9, 12]], [2, 14, [9, 11, 13]], [3, 12, [8, 10, 13]], [4, 16, [9, 11, 15]], [5, 20, [9, 12, 16]], [2, 10, [7, 9, 11]], [3, 15, [7, 8, 10]], [4, 8, [3, 5, 9]], [5, 10, [7, 9, 12]], [2, 16, [9, 11, 13]]],
    band2: [[6, 24, [15, 20, 27]], [7, 28, [18, 24, 30]], [8, 32, [20, 28, 34]], [9, 36, [24, 30, 39]], [6, 30, [16, 21, 27]], [7, 35, [24, 27, 32]], [8, 40, [28, 34, 44]], [9, 45, [30, 39, 42]], [6, 42, [26, 32, 39]], [7, 42, [24, 32, 38]], [8, 48, [36, 42, 52]], [9, 27, [17, 21, 24]], [6, 36, [26, 32, 40]]],
    band3: [[11, 55, [35, 45, 52]], [12, 60, [40, 50, 56]], [15, 60, [40, 50, 55]], [20, 80, [50, 70, 90]], [11, 66, [46, 56, 61]], [12, 72, [52, 62, 70]], [15, 75, [55, 65, 70]], [20, 100, [70, 90, 110]], [11, 77, [57, 67, 72]], [12, 84, [64, 74, 80]], [15, 90, [70, 80, 85]], [20, 60, [30, 50, 70]], [11, 44, [24, 34, 42]]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    multPickData[band].forEach(([b, good, wrong], i) => {
      const all = shuffled([good, ...wrong], (seed += 1));
      items.push(
        item("nthMultiple", "procedural", `pickMultiple_${band}`, band, {
          answer: good,
          choices: all,
          display: { fm: { kind: "pickMultiple", b }, promptText: multPickPhr[band][phrIdx(i, 13, 4)](b, all.join(", ")) },
        })
      );
    });
  }

  return items;
}

export function nthMultipleConceptual() {
  const items = [];

  const isMultPhr = {
    band1: [
      (nm, k, b) => `${nm} says ${k} is a multiple of ${b}. Is ${nm} right?`,
      (nm, k, b) => `${k} shows up when counting by ${b}, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, k, b) => `${nm} marks ${k} on the count-by-${b} list. Does it belong there?`,
      (nm, k, b) => `According to ${nm}, ${k} is one of the multiples of ${b}. Is ${nm} right?`,
    ],
    band3: [
      (nm, k, b) => `${nm} certifies ${k} as a multiple of ${b}. Is the certification valid?`,
      (nm, k, b) => `Auditing ${nm}'s multiples-of-${b} list: it includes ${k}. Clean audit?`,
    ],
  };
  const isMultData = {
    band1: [[8, 2, true], [9, 2, false], [12, 3, true], [10, 3, false], [16, 4, true], [14, 4, false], [15, 5, true], [12, 5, false], [6, 2, true], [7, 2, false], [9, 3, true], [8, 3, false], [12, 4, true], [10, 4, false], [10, 5, true], [8, 5, false], [18, 3, true], [16, 3, false]],
    band2: [[24, 6, true], [26, 6, false], [28, 7, true], [30, 7, false], [32, 8, true], [36, 8, false], [36, 9, true], [39, 9, false], [30, 6, true], [33, 6, false], [35, 7, true], [38, 7, false], [40, 8, true], [42, 8, false], [45, 9, true], [48, 9, false], [42, 6, true], [44, 6, false]],
    band3: [[55, 11, true], [56, 11, false], [60, 12, true], [64, 12, false], [75, 15, true], [80, 15, false], [80, 20, true], [90, 20, false], [66, 11, true], [70, 11, false], [72, 12, true], [78, 12, false], [90, 15, true], [95, 15, false], [100, 20, true], [110, 20, false], [77, 11, true], [84, 11, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    isMultData[band].forEach(([k, b, ok], i) => {
      items.push(
        item("nthMultiple", "conceptual", `isMultipleJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { fm: { kind: "isMultiple", k, b }, promptText: isMultPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), k, b), truth: ok },
        })
      );
    });
  }

  const nthSaidPhr = {
    band1: [
      (nm, b, k, said) => `${nm} says the ${ORD[k]} multiple of ${b} is ${said}. Is ${nm} right?`,
      (nm, b, k, said) => `The ${ORD[k]} multiple of ${b} equals ${said}, writes ${nm}. Is that right?`,
    ],
    band2: [
      (nm, b, k, said) => `${nm} records ${said} as the ${ORD[k]} multiple of ${b}. Does the record hold?`,
      (nm, b, k, said) => `Check ${nm}'s claim: the ${ORD[k]} multiple of ${b} is ${said}. Right or not?`,
    ],
    band3: [
      (nm, b, k, said) => `${nm} certifies the ${ORD[k]} multiple of ${b} as ${said}. Valid?`,
      (nm, b, k, said) => `Audit: ${ORD[k]} multiple of ${b}, recorded ${said} by ${nm}. Clean?`,
    ],
  };
  const nthSaidData = {
    band1: [[2, 3, 6, true], [2, 4, 6, false], [3, 3, 9, true], [3, 4, 9, false], [4, 3, 12, true], [4, 4, 12, false], [5, 3, 15, true], [5, 2, 15, false], [2, 5, 10, true], [2, 6, 10, false], [3, 5, 15, true], [3, 6, 15, false], [4, 4, 16, true], [4, 2, 16, false], [5, 4, 20, true], [5, 3, 20, false], [2, 7, 14, true], [2, 8, 14, false]],
    band2: [[6, 4, 24, true], [6, 5, 24, false], [7, 4, 28, true], [7, 5, 28, false], [8, 4, 32, true], [8, 3, 32, false], [9, 4, 36, true], [9, 3, 36, false], [6, 6, 36, true], [6, 7, 36, false], [7, 6, 42, true], [7, 7, 42, false], [8, 5, 40, true], [8, 6, 40, false], [9, 5, 45, true], [9, 6, 45, false], [6, 8, 48, true], [6, 9, 48, false]],
    band3: [[11, 5, 55, true], [11, 6, 55, false], [12, 5, 60, true], [12, 6, 60, false], [15, 4, 60, true], [15, 5, 60, false], [20, 4, 80, true], [20, 5, 80, false], [11, 7, 77, true], [11, 8, 77, false], [12, 7, 84, true], [12, 8, 84, false], [15, 6, 90, true], [15, 7, 90, false], [20, 5, 100, true], [20, 6, 100, false], [11, 4, 44, true], [11, 3, 44, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    nthSaidData[band].forEach(([b, k, said, ok], i) => {
      items.push(
        item("nthMultiple", "conceptual", `nthSaidJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { fm: { kind: "nthSaid", b, k, said }, promptText: nthSaidPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), b, k, said), truth: ok },
        })
      );
    });
  }

  const selfPhr = {
    band1: [
      (nm, b) => `${nm} says ${b} counts as a multiple of itself. Is ${nm} right?`,
      (nm, b) => `The first multiple of ${b} is ${b}, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, b) => `${nm} starts the multiples of ${b} at ${b} itself. Should the list start there?`,
      (nm, b) => `Every number is its own first multiple, argues ${nm}, so ${b} makes the list. Is ${nm} right?`,
    ],
    band3: [
      (nm, b) => `${nm} includes ${b} in the multiples of ${b}. Does it belong?`,
      (nm, b) => `The multiples of ${b} begin with ${b}, asserts ${nm}. Sound assertion?`,
    ],
  };
  const selfData = { band1: [2, 3, 4, 5, 2, 3, 4, 5, 2, 3, 4, 5, 2, 3, 4, 5], band2: [6, 7, 8, 9, 6, 7, 8, 9, 6, 7, 8, 9, 6, 7, 8, 9], band3: [11, 12, 15, 20, 11, 12, 15, 20, 11, 12, 15, 20, 11, 12, 15, 20] };
  for (const band of ["band1", "band2", "band3"]) {
    selfData[band].forEach((b, i) => {
      items.push(
        item("nthMultiple", "conceptual", `selfMultipleJudge_${band}`, band, {
          answer: "Yes",
          choices: ["Yes", "No"],
          display: { fm: { kind: "authoredYes" }, promptText: selfPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), b), truth: true },
        })
      );
    });
  }

  return items;
}
