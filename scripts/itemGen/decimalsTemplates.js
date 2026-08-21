/* Deterministic decimals bank items — part 1: tenthsHundredths,
 * fractionToDecimal. (Part 2: decimalsTemplates2.js; stories:
 * decimalsStories.js.)
 *
 * Typed answers are decimal NUMBERS via answerType "decimal" (the
 * fractionalAnswer QC check exempts /decimal|fraction/ modes). Fraction
 * labels are strings ("7/10"). Claims ride display.dec, re-derived by
 * authorDecimals.js. Judged = "Is this right?" Yes/No. numberLine,
 * symbolSelect and multiSelect payloads are deliberately absent.
 *
 * Bands: K-1 tenths only (0.1-0.9); 2-3 tenths + hundredths (< 1);
 * 4-5 hundredths with whole parts (to 9.99).
 */

import { shuffled, NAMES } from "./countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };
export const OFF = { band1: 0, band2: 7, band3: 13 };
export const nameAt = (i) => NAMES[i % NAMES.length];
export const D2 = (x) => Number(x.toFixed(2));
export const TENTH_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

export const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    // Decimals count by their whole part ("0.30" is not a 30).
    const cleaned = String(question.display?.promptText).replace(/\d+\.\d+/g, (m) => m.split(".")[0]);
    const nums = (cleaned.match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "decimals",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "dec", ...question },
  };
};

/* phrasing index: tuples repeat across passes; each pass shifts to a fresh
 * phrasing pair so repeated tuples never repeat a string. */
export const phrIdx = (i, listLen, phrCount) => (Math.floor(i / listLen) * 2 + (i % 2)) % phrCount;

/* ================================================================== */
/* tenthsHundredths                                                    */
/* ================================================================== */

export function tenthsProcedural() {
  const items = [];

  const writePhr = {
    band1: [
      (n) => `Write ${TENTH_WORDS[n]} ${n === 1 ? "tenth" : "tenths"} as a decimal.`,
      (n) => `${TENTH_WORDS[n]} ${n === 1 ? "tenth" : "tenths"}, written as a decimal = ?`,
      (n) => `The number ${TENTH_WORDS[n]} ${n === 1 ? "tenth" : "tenths"} looks like which decimal? Type it.`,
      (n) => `Type the decimal that means ${TENTH_WORDS[n]} ${n === 1 ? "tenth" : "tenths"}.`,
    ],
    band2: [
      (t, h) => `Write ${t} tenths and ${h} hundredths as one decimal.`,
      (t, h) => `${t} tenths plus ${h} hundredths, as a decimal = ?`,
      (t, h) => `Combine ${t} tenths with ${h} hundredths. Type the decimal.`,
      (t, h) => `Which decimal holds ${t} in the tenths place and ${h} in the hundredths place? Type it.`,
    ],
    band3: [
      (w, t, h) => `Write ${w} ones, ${t} tenths, and ${h} hundredths as a decimal.`,
      (w, t, h) => `${w} ones + ${t} tenths + ${h} hundredths = ? Type the decimal.`,
      (w, t, h) => `Compose the decimal with ${w} in the ones place, ${t} in the tenths, ${h} in the hundredths.`,
      (w, t, h) => `Which decimal has ones digit ${w}, tenths digit ${t}, and hundredths digit ${h}? Type it.`,
    ],
  };
  const writeData = {
    band1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4],
    band2: [[1, 5], [2, 3], [3, 7], [4, 1], [5, 9], [6, 2], [7, 4], [8, 6], [9, 8], [2, 5], [4, 7], [6, 3], [8, 1]],
    band3: [[1, 2, 5], [2, 4, 3], [3, 6, 7], [4, 8, 1], [5, 1, 9], [6, 3, 2], [7, 5, 4], [8, 7, 6], [9, 9, 8], [2, 6, 5], [3, 8, 7], [5, 2, 3], [7, 4, 9]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    writeData[band].forEach((row, i) => {
      let answer, claim, prompt;
      if (band === "band1") {
        const n = row;
        answer = D2(n / 10);
        claim = { kind: "tenths", n };
        prompt = writePhr.band1[phrIdx(i, 9, 4)](n);
      } else if (band === "band2") {
        const [t, h] = row;
        answer = D2(t / 10 + h / 100);
        claim = { kind: "hundredths", t, h };
        prompt = writePhr.band2[phrIdx(i, 12, 4)](t, h);
      } else {
        const [w, t, h] = row;
        answer = D2(w + t / 10 + h / 100);
        claim = { kind: "compose", w, t, h };
        prompt = writePhr.band3[phrIdx(i, 12, 4)](w, t, h);
      }
      items.push(
        item("tenthsHundredths", "procedural", `writeDecimal_${band}`, band, {
          answer,
          answerType: "decimal",
          display: { dec: claim, promptText: prompt },
        })
      );
    });
  }

  const shadePhr = {
    band1: [
      (n) => `A strip has 10 equal parts. Exactly ${n} ${n === 1 ? "part is" : "parts are"} colored. The decimal for the colored amount = ?`,
      (n) => `Out of 10 equal pieces, ${n} ${n === 1 ? "is" : "are"} colored in. Type that amount as a decimal.`,
      (n) => `${n} of 10 equal sections ${n === 1 ? "is" : "are"} colored. Which decimal is that? Type it.`,
      (n) => `Color ${n} of 10 equal boxes. Type the decimal the coloring shows.`,
    ],
    band2: [
      (h) => `A 10-by-10 grid has exactly ${h} of its 100 small squares colored. The decimal for the colored part = ?`,
      (h) => `Out of 100 grid squares, ${h} ${h === 1 ? "is" : "are"} colored. Type that as a decimal.`,
      (h) => `${h} of the 100 squares in a grid are colored. Which decimal is that? Type it.`,
      (h) => `Color ${h} squares on a 100-square grid. Type the decimal the coloring shows.`,
    ],
    band3: [
      (h) => `A hundred-square chart shows ${h} of 100 squares filled. Type the filled amount as a decimal.`,
      (h) => `Exactly ${h} of a chart's 100 equal squares are filled. The decimal = ?`,
      (h) => `Filling ${h} squares out of 100 represents which decimal? Type it.`,
      (h) => `A grid of 100 squares has ${h} filled. Type the decimal for the filled part.`,
    ],
  };
  const shadeData = {
    band1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 4, 5, 6],
    band2: [5, 12, 25, 34, 41, 58, 66, 73, 87, 92, 19, 48],
    band3: [7, 15, 23, 36, 44, 52, 61, 78, 85, 99, 31, 69],
  };
  const shadeExtra = { band1: [7], band2: [77], band3: [57] };
  for (const band of ["band1", "band2", "band3"]) shadeData[band].push(...shadeExtra[band]);
  for (const band of ["band1", "band2", "band3"]) {
    shadeData[band].forEach((n, i) => {
      const answer = band === "band1" ? D2(n / 10) : D2(n / 100);
      const claim = band === "band1" ? { kind: "tenths", n } : { kind: "gridShade", h: n };
      items.push(
        item("tenthsHundredths", "procedural", `shadeDecimal_${band}`, band, {
          answer,
          answerType: "decimal",
          display: { dec: claim, promptText: shadePhr[band][phrIdx(i, band === "band1" ? 9 : 10, 4)](n) },
        })
      );
    });
  }

  const digitPhr = {
    band1: [
      (v, n) => `In the decimal 0.${n}, the tenths digit = ?`,
      (v, n) => `Look at 0.${n}. Which digit sits in the tenths place? Type it.`,
      (v, n) => `The decimal 0.${n} keeps which digit in its tenths place?`,
      (v, n) => `Read 0.${n}: the digit right after the decimal point = ?`,
    ],
    band2: [
      (t, h, which) => `In the decimal 0.${t}${h}, the ${which} digit = ?`,
      (t, h, which) => `Look at 0.${t}${h}. Which digit is in the ${which} place? Type it.`,
      (t, h, which) => `The decimal 0.${t}${h} carries which digit in its ${which} place?`,
      (t, h, which) => `Read 0.${t}${h} and type its ${which} digit.`,
    ],
    band3: [
      (w, t, h, which) => `In the decimal ${w}.${t}${h}, the ${which} digit = ?`,
      (w, t, h, which) => `Look at ${w}.${t}${h}. Which digit fills the ${which} place? Type it.`,
      (w, t, h, which) => `The decimal ${w}.${t}${h} holds which digit in its ${which} place?`,
      (w, t, h, which) => `Read ${w}.${t}${h} and type the ${which} digit.`,
    ],
  };
  const digitData = {
    band1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 7, 8, 9, 6],
    band2: [[1, 5, "tenths"], [2, 3, "hundredths"], [3, 7, "tenths"], [4, 1, "hundredths"], [5, 9, "tenths"], [6, 2, "hundredths"], [7, 4, "tenths"], [8, 6, "hundredths"], [9, 8, "tenths"], [2, 5, "hundredths"], [4, 7, "tenths"], [6, 3, "hundredths"], [9, 2, "tenths"]],
    band3: [[1, 2, 5, "ones"], [2, 4, 3, "tenths"], [3, 6, 7, "hundredths"], [4, 8, 1, "ones"], [5, 1, 9, "tenths"], [6, 3, 2, "hundredths"], [7, 5, 4, "ones"], [8, 7, 6, "tenths"], [9, 9, 8, "hundredths"], [2, 6, 5, "tenths"], [3, 8, 7, "ones"], [5, 2, 3, "hundredths"], [4, 1, 6, "tenths"]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    digitData[band].forEach((row, i) => {
      let answer, claim, prompt;
      if (band === "band1") {
        const n = row;
        answer = n;
        claim = { kind: "digitOf", digits: [0, n], place: "tenths" };
        prompt = digitPhr.band1[phrIdx(i, 9, 4)](0, n);
      } else if (band === "band2") {
        const [t, h, which] = row;
        answer = which === "tenths" ? t : h;
        claim = { kind: "digitOf", digits: [t, h], place: which };
        prompt = digitPhr.band2[phrIdx(i, 12, 4)](t, h, which);
      } else {
        const [w, t, h, which] = row;
        answer = which === "ones" ? w : which === "tenths" ? t : h;
        claim = { kind: "digitOf3", digits: [w, t, h], place: which };
        prompt = digitPhr.band3[phrIdx(i, 12, 4)](w, t, h, which);
      }
      items.push(
        item("tenthsHundredths", "procedural", `readDigit_${band}`, band, {
          answer,
          answerType: "numberPad",
          display: { dec: claim, promptText: prompt },
        })
      );
    });
  }

  const countTenthsPhr = {
    band1: [
      (n) => `How many tenths are in the decimal 0.${n}? Type the count.`,
      (n) => `The decimal 0.${n} is made of how many tenths?`,
      (n) => `Count the tenths that build 0.${n}. How many tenths is that?`,
      (n) => `0.${n} equals how many tenths?`,
    ],
    band2: [
      (t, h) => `How many hundredths are in the decimal 0.0${h > 9 ? h : h}? Type the count.`,
      (t, h) => `The decimal 0.${t}${h} equals how many hundredths in all?`,
      (t, h) => `Count 0.${t}${h} in hundredths. How many hundredths is that?`,
      (t, h) => `0.${t}${h} is built from how many hundredths?`,
    ],
    band3: [
      (t, h) => `Express 0.${t}${h} entirely in hundredths. How many hundredths is that?`,
      (t, h) => `The decimal 0.${t}${h} decomposes into how many hundredths?`,
      (t, h) => `How many hundredths make 0.${t}${h}? Type the count.`,
      (t, h) => `Counting by hundredths, how many counts reach 0.${t}${h}?`,
    ],
  };
  const countTenthsData = {
    band1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 2, 5, 8, 3],
    band2: [[1, 5], [2, 3], [3, 7], [4, 1], [5, 9], [6, 2], [7, 4], [8, 6], [9, 8], [1, 2], [3, 4], [5, 6], [7, 8]],
    band3: [[1, 7], [2, 9], [3, 1], [4, 3], [5, 5], [6, 7], [7, 9], [8, 1], [9, 3], [2, 4], [4, 6], [6, 8], [8, 2]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    countTenthsData[band].forEach((row, i) => {
      let answer, claim, prompt;
      if (band === "band1") {
        const n = row;
        answer = n;
        claim = { kind: "jumpsDec", n };
        prompt = countTenthsPhr.band1[phrIdx(i, 9, 4)](n);
      } else {
        const [t, h] = row;
        answer = t * 10 + h;
        claim = { kind: "asHundredths", t, h };
        const phrs = countTenthsPhr[band];
        const pi = phrIdx(i, 12, 4);
        prompt = (band === "band2" && pi === 0 ? phrs[1] : phrs[pi])(t, h);
      }
      items.push(
        item("tenthsHundredths", "procedural", `countUnits_${band}`, band, {
          answer,
          answerType: "numberPad",
          display: { dec: claim, promptText: prompt },
        })
      );
    });
  }

  // Letter-free numerator fills — these are what the words-off session filter
  // can serve (isVerbalPrompt counts total letters; prose drills never pass).
  const fillPhr = {
    band1: [(n) => `0.${n} = ?/10`, (n) => `?/10 = 0.${n}`],
    band2: [(t, h) => `0.${t}${h} = ?/100`, (t, h) => `?/100 = 0.${t}${h}`],
    band3: [(w, t, h) => `${w}.${t}${h} = ?/100`, (w, t, h) => `?/100 = ${w}.${t}${h}`],
  };
  const fillData = {
    band1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4],
    band2: [[1, 5], [2, 3], [3, 7], [4, 1], [5, 9], [6, 2], [7, 4], [8, 6], [9, 8], [2, 5], [4, 7], [6, 3], [8, 1]],
    band3: [[1, 2, 5], [2, 4, 3], [3, 6, 7], [4, 8, 1], [5, 1, 9], [6, 3, 2], [7, 5, 4], [8, 7, 6], [9, 9, 8], [2, 6, 5], [3, 8, 7], [5, 2, 3], [7, 4, 9]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    fillData[band].forEach((row, i) => {
      let answer, claim, prompt;
      if (band === "band1") {
        const n = row;
        answer = n;
        claim = { kind: "jumpsDec", n };
        prompt = fillPhr.band1[phrIdx(i, 9, 2)](n);
      } else if (band === "band2") {
        const [t, h] = row;
        answer = t * 10 + h;
        claim = { kind: "asHundredths", t, h };
        prompt = fillPhr.band2[phrIdx(i, 12, 2)](t, h);
      } else {
        const [w, t, h] = row;
        answer = w * 100 + t * 10 + h;
        claim = { kind: "asHundredthsAll", w, t, h };
        prompt = fillPhr.band3[phrIdx(i, 12, 2)](w, t, h);
      }
      items.push(
        item("tenthsHundredths", "procedural", `fillNumerator_${band}`, band, {
          answer,
          answerType: "numberPad",
          display: { dec: claim, promptText: prompt },
        })
      );
    });
  }

  return items;
}

export function tenthsConceptual() {
  const items = [];

  const tw = (n) => `${TENTH_WORDS[n]} ${n === 1 ? "tenth" : "tenths"}`;
  const wordTrapPhr = {
    band1: [
      (nm, n) => `${nm} writes 0.0${n} for ${tw(n)}. Is ${nm} right?`,
      (nm, n) => `For ${tw(n)}, ${nm} records 0.0${n}. Is that right?`,
    ],
    band2: [
      (nm, n) => `${nm} turns ${tw(n)} into the decimal 0.0${n}. Does the conversion hold?`,
      (nm, n) => `Writing ${tw(n)}, ${nm} puts the ${n} in the hundredths place: 0.0${n}. Is ${nm} right?`,
    ],
    band3: [
      (nm, n) => `${nm} claims ${tw(n)} and 0.0${n} are the same number. Is the claim right?`,
      (nm, n) => `On ${nm}'s worksheet, ${tw(n)} is written 0.0${n}. Clean work?`,
    ],
  };
  const wordTrapData = { band1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9], band2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9], band3: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
  for (const band of ["band1", "band2", "band3"]) {
    wordTrapData[band].forEach((n, i) => {
      items.push(
        item("tenthsHundredths", "conceptual", `placeTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { dec: { kind: "trapNo" }, promptText: wordTrapPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), n), truth: false },
        })
      );
    });
  }

  const zeroEquivPhr = {
    band1: [
      (nm, n) => `${nm} says 0.${n}0 names the same amount as 0.${n}. Is ${nm} right?`,
      (nm, n) => `0.${n} and 0.${n}0 are the same amount, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, n) => `${nm} marks 0.${n}0 and 0.${n} at the same point on a number line. Should they share the point?`,
      (nm, n) => `According to ${nm}, adding a zero at the end turns 0.${n} into a different number: 0.${n}0. Is ${nm} right?`,
    ],
    band3: [
      (nm, n) => `${nm} certifies that 0.${n}0 = 0.${n} exactly. Is the certification valid?`,
      (nm, n) => `${nm} argues 0.${n}0 must beat 0.${n} because it has more digits. Is ${nm} right?`,
    ],
  };
  const zeroEquivTruth = {
    band1: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    band2: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    band3: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
  };
  // band1 keeps 0.X0 strings within the ≤20 rule: only 0.10 and 0.20 exist there.
  const zeroEquivN = { band1: [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2], band2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 3, 5, 7, 9, 2, 4], band3: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 3, 5, 7, 9, 2, 4] };
  for (const band of ["band1", "band2", "band3"]) {
    zeroEquivN[band].forEach((n, i) => {
      // band1 uses only the two always-true phrasings; bands 2-3 alternate a
      // truthy phrasing (i even) with a trap phrasing (i odd).
      const ok = zeroEquivTruth[band][i];
      items.push(
        item("tenthsHundredths", "conceptual", `trailingZero_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { dec: { kind: "authored" }, promptText: zeroEquivPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), n), truth: ok },
        })
      );
    });
  }

  const shadeJudgePhr = {
    band1: [
      (nm, n, said) => `A strip of 10 equal parts has ${n} colored. ${nm} writes the decimal ${said}. Is ${nm} right?`,
      (nm, n, said) => `For ${n} colored parts out of 10, ${nm} records ${said}. Is that right?`,
    ],
    band2: [
      (nm, n, said) => `A 100-square grid shows ${n} squares colored, and ${nm} writes ${said}. Does the decimal match?`,
      (nm, n, said) => `${nm} labels ${n}-of-100 colored squares as ${said}. Is ${nm} right?`,
    ],
    band3: [
      (nm, n, said) => `${nm} records ${said} for ${n} filled squares on a hundred-grid. Is the record right?`,
      (nm, n, said) => `Auditing ${nm}'s chart: ${n} of 100 filled, decimal written ${said}. Clean audit?`,
    ],
  };
  const shadeJudgeData = {
    band1: [[3, "0.3", true], [7, "0.07", false], [5, "0.5", true], [2, "0.02", false], [9, "0.9", true], [4, "0.04", false], [1, "0.1", true], [8, "0.08", false], [6, "0.6", true], [3, "0.03", false], [2, "0.2", true], [7, "0.7", true], [4, "0.4", true], [9, "0.09", false], [8, "0.8", true], [1, "0.01", false], [5, "0.05", false], [6, "0.06", false]],
    band2: [[25, "0.25", true], [7, "0.7", false], [40, "0.40", true], [63, "0.36", false], [8, "0.08", true], [50, "0.5", true], [17, "0.17", true], [90, "0.09", false], [33, "0.33", true], [4, "0.4", false], [75, "0.75", true], [12, "0.21", false], [66, "0.66", true], [30, "0.03", false], [55, "0.55", true], [9, "0.9", false], [81, "0.81", true], [20, "0.02", false]],
    band3: [[45, "0.45", true], [6, "0.6", false], [70, "0.70", true], [28, "0.82", false], [3, "0.03", true], [60, "0.6", true], [37, "0.37", true], [80, "0.08", false], [52, "0.52", true], [5, "0.5", false], [94, "0.94", true], [16, "0.61", false], [77, "0.77", true], [40, "0.04", false], [68, "0.68", true], [2, "0.2", false], [83, "0.83", true], [10, "0.01", false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    shadeJudgeData[band].forEach(([n, said, ok], i) => {
      const den = band === "band1" ? 10 : 100;
      items.push(
        item("tenthsHundredths", "conceptual", `shadeJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { dec: { kind: "shadeSaid", n, den, said }, promptText: shadeJudgePhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), n, said), truth: ok },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* fractionToDecimal                                                   */
/* ================================================================== */

export function fracToDecProcedural() {
  const items = [];
  let seed = 511;

  const toDecPhr = {
    band1: [
      (n, d) => `${n}/${d} = ?`,
      (n, d) => `${n}/${d} as a decimal = ? Type it.`,
      (n, d) => `Turn ${n}/${d} into decimal form. What do you type?`,
      (n, d) => `The fraction ${n}/${d} names which decimal? Type it.`,
    ],
    band2: [
      (n, d) => `${n}/${d} = ?`,
      (n, d) => `As a decimal, ${n}/${d} = ? Type it.`,
      (n, d) => `Rewrite the fraction ${n}/${d} in decimal notation.`,
      (n, d) => `Which decimal equals ${n}/${d}? Type it.`,
    ],
    band3: [
      (n, d) => `${n}/${d} = ?`,
      (n, d) => `Express ${n}/${d} in decimal form. Type the result.`,
      (n, d) => `The precise decimal for ${n}/${d} = ?`,
      (n, d) => `Translate ${n}/${d} into its decimal. What is it?`,
    ],
  };
  const toDecData = {
    band1: [[1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [2, 10], [5, 10], [8, 10], [3, 10], [6, 10], [9, 10], [1, 10], [4, 10]],
    band2: [[25, 100], [50, 100], [75, 100], [7, 100], [13, 100], [40, 100], [62, 100], [88, 100], [5, 100], [31, 100], [99, 100], [16, 100], [25, 100], [50, 100], [75, 100], [7, 100], [13, 100]],
    band3: [[45, 100], [70, 100], [3, 100], [58, 100], [92, 100], [27, 100], [64, 100], [81, 100], [36, 100], [19, 100], [73, 100], [55, 100], [45, 100], [70, 100], [3, 100], [58, 100], [92, 100]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    toDecData[band].forEach(([n, d], i) => {
      items.push(
        item("fractionToDecimal", "procedural", `fracToDec_${band}`, band, {
          answer: D2(n / d),
          answerType: "decimal",
          display: { dec: { kind: "fromFraction", n, d }, promptText: toDecPhr[band][phrIdx(i, band === "band1" ? 9 : 12, 4)](n, d) },
        })
      );
    });
  }

  const toFracPhr = {
    band1: [
      (v) => `The decimal ${v} equals which fraction? Pick it.`,
      (v) => `Pick the fraction that names the same amount as ${v}.`,
      (v) => `Which fraction matches the decimal ${v}?`,
      (v) => `${v} written as a fraction is which choice?`,
    ],
    band2: [
      (v) => `Choose the fraction equal to the decimal ${v}.`,
      (v) => `${v} converts to which fraction?`,
      (v) => `Which fraction is exactly ${v}?`,
      (v) => `Select the fraction form of ${v}.`,
    ],
    band3: [
      (v) => `Identify the exact fraction for the decimal ${v}.`,
      (v) => `${v} corresponds to which fraction below?`,
      (v) => `Precisely which fraction equals ${v}?`,
      (v) => `Match ${v} to its fraction form.`,
    ],
  };
  const toFracData = {
    band1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 3, 6, 9, 1, 4, 7, 2, 5],
    band2: [[25, 100], [50, 100], [7, 100], [75, 100], [13, 100], [40, 100], [62, 100], [5, 100], [88, 100], [31, 100], [16, 100], [99, 100], [25, 100], [50, 100], [7, 100], [75, 100], [13, 100]],
    band3: [[45, 100], [70, 100], [3, 100], [58, 100], [92, 100], [27, 100], [64, 100], [81, 100], [36, 100], [19, 100], [73, 100], [55, 100], [45, 100], [70, 100], [3, 100], [58, 100], [92, 100]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    toFracData[band].forEach((row, i) => {
      let v, good, wrong, claim;
      if (band === "band1") {
        const n = row;
        v = `0.${n}`;
        good = `${n}/10`;
        wrong = [`${n}/100`, `10/${n}`, `${n}/${n === 1 ? 2 : 1}`];
        claim = { kind: "toFraction", n, d: 10 };
      } else {
        const [n, d] = row;
        v = D2(n / d).toString();
        good = `${n}/${d}`;
        wrong = [`${n}/10`, `${d}/${n}`, `${n + 1}/${d}`];
        claim = { kind: "toFraction", n, d };
      }
      items.push(
        item("fractionToDecimal", "procedural", `decToFrac_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...[...new Set(wrong)].filter((x) => x !== good).slice(0, 3)], (seed += 1)),
          display: { dec: claim, promptText: toFracPhr[band][phrIdx(i, band === "band1" ? 9 : 12, 4)](v) },
        })
      );
    });
  }

  const decPickPhr = {
    band1: [
      (n, d) => `Which decimal equals ${n}/${d}? Pick it.`,
      (n, d) => `Pick the decimal that names ${n}/${d}.`,
      (n, d) => `${n}/${d} matches which decimal below?`,
      (n, d) => `Choose the decimal form of ${n}/${d}.`,
    ],
    band2: [
      (n, d) => `Select the decimal equal to ${n}/${d}.`,
      (n, d) => `${n}/${d} is which decimal? Choose it.`,
      (n, d) => `Which decimal expresses ${n}/${d}?`,
      (n, d) => `Find the decimal that equals ${n}/${d}.`,
    ],
    band3: [
      (n, d) => `Identify the decimal equal to ${n}/${d} exactly.`,
      (n, d) => `Exactly which decimal represents ${n}/${d}?`,
      (n, d) => `${n}/${d} corresponds to which decimal choice?`,
      (n, d) => `Pick the precise decimal for ${n}/${d}.`,
    ],
  };
  const decPickData = {
    band1: [[1, 10], [3, 10], [5, 10], [7, 10], [9, 10], [2, 10], [4, 10], [6, 10], [8, 10], [3, 10], [7, 10], [1, 10], [5, 10], [9, 10], [2, 10], [6, 10], [8, 10]],
    band2: [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [9, 10], [25, 100], [75, 100], [50, 100], [1, 2], [1, 4], [3, 4], [1, 5], [2, 5]],
    band3: [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 20], [3, 20], [7, 20], [1, 25], [12, 25], [1, 2], [1, 4], [3, 4], [1, 20], [3, 20]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    decPickData[band].forEach(([n, d], i) => {
      const good = D2(n / d);
      const wrong = [...new Set([D2(good / 10), D2(good + 0.1), D2(Math.max(0.01, good - 0.1))])].filter((x) => x !== good);
      items.push(
        item("fractionToDecimal", "procedural", `fracDecPick_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { dec: { kind: "fromFraction", n, d }, promptText: decPickPhr[band][phrIdx(i, band === "band1" ? 9 : 12, 4)](n, d) },
        })
      );
    });
  }

  return items;
}

export function fracToDecConceptual() {
  const items = [];
  let seed = 521;

  const saidPhr = {
    band1: [
      (nm, n, d, said) => `${nm} says the fraction ${n}/${d} equals the decimal ${said}. Is ${nm} right?`,
      (nm, n, d, said) => `${n}/${d} = ${said}, writes ${nm}. Is that right?`,
    ],
    band2: [
      (nm, n, d, said) => `${nm} converts ${n}/${d} and gets ${said}. Does the conversion hold?`,
      (nm, n, d, said) => `On ${nm}'s card, ${n}/${d} is matched with ${said}. Is the match right?`,
    ],
    band3: [
      (nm, n, d, said) => `${nm} certifies ${n}/${d} = ${said}. Is the certification valid?`,
      (nm, n, d, said) => `Cross-checking ${nm}'s claim that ${n}/${d} equals ${said} — does it hold?`,
    ],
  };
  const saidData = {
    band1: [[3, 10, "0.3", true], [7, 10, "0.07", false], [5, 10, "0.5", true], [2, 10, "0.02", false], [9, 10, "0.9", true], [4, 10, "0.4", true], [1, 10, "0.01", false], [8, 10, "0.8", true], [6, 10, "0.06", false], [3, 10, "3.0", false], [2, 10, "0.2", true], [7, 10, "0.7", true], [5, 10, "5.0", false], [1, 10, "0.1", true], [9, 10, "0.09", false], [6, 10, "0.6", true], [4, 10, "4.0", false], [8, 10, "0.08", false]],
    band2: [[25, 100, "0.25", true], [7, 100, "0.7", false], [50, 100, "0.50", true], [13, 100, "0.31", false], [75, 100, "0.75", true], [5, 100, "0.5", false], [40, 100, "0.40", true], [88, 100, "0.88", true], [62, 100, "0.26", false], [31, 100, "0.31", true], [16, 100, "0.61", false], [99, 100, "0.99", true], [9, 100, "0.9", false], [66, 100, "0.66", true], [20, 100, "0.02", false], [55, 100, "0.55", true], [3, 100, "0.3", false], [80, 100, "0.80", true]],
    band3: [[1, 2, "0.5", true], [1, 4, "0.4", false], [3, 4, "0.75", true], [1, 5, "0.15", false], [2, 5, "0.4", true], [3, 5, "0.35", false], [4, 5, "0.8", true], [1, 20, "0.05", true], [3, 20, "0.3", false], [7, 20, "0.35", true], [1, 25, "0.4", false], [12, 25, "0.48", true], [1, 4, "0.25", true], [1, 2, "0.2", false], [3, 4, "0.34", false], [2, 5, "0.25", false], [4, 5, "0.45", false], [1, 5, "0.2", true]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    saidData[band].forEach(([n, d, said, ok], i) => {
      items.push(
        item("fractionToDecimal", "conceptual", `fracDecJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { dec: { kind: "fracSaid", n, d, said }, promptText: saidPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), n, d, said), truth: ok },
        })
      );
    });
  }

  const halfPhr = {
    band1: [
      (nm, v, ok) => `${nm} claims the decimal ${v} is exactly one half. Is ${nm} right?`,
      (nm, v, ok) => `${v} equals a half, says ${nm}. Is that right?`,
    ],
    band2: [
      (nm, v, ok) => `${nm} marks ${v} at the halfway point between 0 and 1. Does it belong there?`,
      (nm, v, ok) => `According to ${nm}, ${v} and 1/2 are the same number. Is ${nm} right?`,
    ],
    band3: [
      (nm, v, ok) => `${nm} equates ${v} with 1/2 exactly. Is the equation sound?`,
      (nm, v, ok) => `On ${nm}'s number line, ${v} sits exactly at 1/2. Should it?`,
    ],
  };
  const halfData = {
    band1: [["0.5", true], ["0.2", false], ["0.5", true], ["0.7", false], ["0.5", true], ["0.1", false], ["0.5", true], ["0.9", false], ["0.5", true], ["0.4", false], ["0.5", true], ["0.6", false], ["0.5", true], ["0.3", false], ["0.5", true], ["0.8", false]],
    band2: [["0.50", true], ["0.05", false], ["0.5", true], ["0.25", false], ["0.50", true], ["0.15", false], ["0.5", true], ["0.55", false], ["0.50", true], ["0.45", false], ["0.5", true], ["0.75", false], ["0.50", true], ["0.35", false], ["0.5", true], ["0.65", false]],
    band3: [["0.50", true], ["0.05", false], ["0.5", true], ["0.52", false], ["0.50", true], ["0.48", false], ["0.5", true], ["0.55", false], ["0.50", true], ["0.05", false], ["0.5", true], ["0.51", false], ["0.50", true], ["0.49", false], ["0.5", true], ["0.15", false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    halfData[band].forEach(([v, ok], i) => {
      items.push(
        item("fractionToDecimal", "conceptual", `halfJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { dec: { kind: "halfSaid", v: Number(v) }, promptText: halfPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), v, ok), truth: ok },
        })
      );
    });
  }

  const tenHundPhr = {
    band1: [
      (nm, n) => `${nm} says 0.${n} and ${n}/10 name the same amount. Is ${nm} right?`,
      (nm, n) => `${nm} says 0.${n} and 10/${n} name the same amount. Is ${nm} right?`,
    ],
    band2: [
      (nm, n) => `${nm} pairs ${n}/10 with ${n * 10}/100 as equal amounts. Do they match?`,
      (nm, n) => `${nm} says ${n}/10 is MORE than ${n * 10}/100 because hundredths are smaller. Is ${nm} right?`,
    ],
    band3: [
      (nm, n) => `${nm} certifies ${n}/10 = ${n * 10}/100 = 0.${n}0. Is the chain valid?`,
      (nm, n) => `${nm} insists ${n * 10}/100 must beat ${n}/10 since ${n * 10} > ${n}. Is ${nm} right?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    const ns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    ns.forEach((n, i) => {
      const ok = i % 2 === 0;
      items.push(
        item("fractionToDecimal", "conceptual", `tenHundredJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { dec: { kind: "authored" }, promptText: tenHundPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), n), truth: ok },
        })
      );
    });
  }

  return items;
}
