/* Deterministic barModels bank items — procedural and conceptual cells for
 * partWhole, comparison, multiplicative, fractionBar.
 *
 * Procedural drills use the terse bar-reading register ("Whole 12, one part
 * 7. The other part = ?") with the barPartWhole display payload the widget
 * draws, so the bar and the numbers cannot drift. Claims ride countMath
 * ({sum}, {countBack}, {countOn}, {gap}) or display.bar claims ({unitOf},
 * {fracOf}, {timesOf}) that authorBarModels.js re-derives.
 *
 * Band scales mirror the generator: K-1 <= 20, 2-3 <= 100, 4-5 <= 1000.
 * Judged = "Is this right?" Yes/No.
 */

import { rotor, shuffled, NAMES } from "../counting/countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

export const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "barModels",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

export const nameAt = (i) => NAMES[i % NAMES.length];

/* ================================================================== */
/* partWhole                                                           */
/* ================================================================== */

export function partWholeProcedural() {
  const items = [];

  const missPhr = {
    band1: [
      (w, p) => `Whole ${w}, one part ${p}. The other part = ?`,
      (w, p) => `The bar shows a whole of ${w} with a part of ${p}. What is the missing part?`,
    ],
    band2: [
      (w, p) => `A whole of ${w} splits into ${p} and one more part. The missing part = ?`,
      (w, p) => `Bar model: whole ${w}, known part ${p}. Find the unknown part. What is it?`,
    ],
    band3: [
      (w, p) => `The bar's whole reads ${w}; one section reads ${p}. Exactly what does the blank section hold?`,
      (w, p) => `Whole ${w} minus the shown part ${p} leaves the blank part = ?`,
    ],
  };
  const missData = {
    band1: [[12, 7], [15, 9], [18, 6], [14, 8], [20, 13], [11, 4], [16, 9], [13, 5], [19, 12], [17, 8], [10, 3], [20, 6], [15, 7], [18, 11], [12, 5], [14, 9], [16, 7], [19, 4], [11, 8], [13, 6], [17, 12], [20, 9], [10, 7], [18, 5], [15, 4], [16, 11]],
    band2: [[45, 27], [62, 38], [71, 46], [53, 29], [84, 57], [66, 31], [92, 68], [58, 24], [77, 49], [63, 36], [85, 52], [49, 18], [96, 73], [67, 42], [74, 28], [88, 61], [55, 33], [91, 47], [69, 25], [82, 56], [47, 19], [93, 64], [59, 37], [76, 51], [64, 22], [87, 43]],
    band3: [[452, 267], [618, 384], [723, 456], [539, 291], [846, 572], [667, 318], [924, 683], [583, 246], [775, 491], [638, 362], [852, 527], [497, 183], [968, 734], [676, 428], [741, 285], [883, 617], [556, 338], [917, 474], [692, 253], [828, 564], [473, 192], [935, 641], [594, 376], [767, 512], [645, 228], [874, 439]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    missData[band].forEach(([w, p], i) => {
      items.push(
        item("partWhole", "procedural", `barMissingPart_${band}`, band, {
          answer: w - p,
          answerType: "barModel",
          display: { type: "barPartWhole", whole: w, part: p, counting: { kind: "countBack", start: w, back: p }, promptText: missPhr[band][i % 2](w, p) },
        })
      );
    });
  }

  const wholePhr = {
    band1: [
      (a, b) => `Parts ${a} and ${b}. The whole bar = ?`,
      (a, b) => `Two bar parts, ${a} and ${b}, join into one whole. What is the whole?`,
    ],
    band2: [
      (a, b) => `A bar joins parts of ${a} and ${b}. The whole = ?`,
      (a, b) => `Combine bar parts ${a} and ${b}. What whole do they make?`,
    ],
    band3: [
      (a, b) => `Sections of ${a} and ${b} complete one bar. Exactly what is the whole?`,
      (a, b) => `Add the bar sections ${a} and ${b}. What total does the whole show?`,
    ],
  };
  const wholeData = {
    band1: [[7, 6], [9, 8], [5, 12], [6, 11], [9, 4], [12, 7], [3, 14], [8, 5], [11, 6], [4, 13], [7, 9], [15, 3], [6, 8], [9, 7], [12, 5], [2, 16], [10, 7], [5, 9], [13, 4], [8, 8], [14, 5], [7, 11], [9, 9], [6, 13], [11, 8], [4, 15]],
    band2: [[27, 31], [38, 42], [49, 23], [54, 19], [35, 45], [28, 66], [59, 33], [42, 39], [63, 17], [30, 54], [47, 38], [52, 28], [37, 47], [66, 22], [44, 49], [58, 31], [25, 68], [39, 44], [56, 27], [32, 59], [45, 46], [63, 18], [28, 61], [49, 37], [55, 36], [21, 74]],
    band3: [[227, 331], [338, 442], [449, 223], [554, 191], [335, 445], [228, 662], [559, 333], [442, 391], [663, 172], [303, 544], [477, 382], [552, 281], [376, 471], [665, 227], [444, 493], [581, 316], [259, 683], [394, 447], [563, 274], [328, 596], [451, 464], [637, 185], [286, 618], [497, 375], [556, 367], [214, 748]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    wholeData[band].forEach(([a, b], i) => {
      items.push(
        item("partWhole", "procedural", `barWhole_${band}`, band, {
          answer: a + b,
          answerType: "numberPad",
          display: { counting: { kind: "sum", parts: [a, b] }, promptText: wholePhr[band][i % 2](a, b) },
        })
      );
    });
  }

  return items;
}

export function partWholeConceptual() {
  const items = [];
  let seed = 321;

  const judgePhr = {
    band1: [
      (nm, w, a, b) => `${nm} fills a bar: whole ${w}, parts ${a} and ${b}. Is the bar right?`,
      (nm, w, a, b) => `${nm} claims parts ${a} and ${b} make a whole of ${w}. Is ${nm} right?`,
    ],
    band2: [
      (nm, w, a, b) => `${nm} sketches whole ${w} over parts ${a} and ${b}. Does the model check out?`,
      (nm, w, a, b) => `In ${nm}'s bar model, ${a} plus ${b} should equal ${w}. Is that right?`,
    ],
    band3: [
      (nm, w, a, b) => `${nm} audits a bar: whole ${w}, sections ${a} and ${b}. Is the audit clean?`,
      (nm, w, a, b) => `${nm} balances sections ${a} and ${b} against a whole of ${w}. Is the balance right?`,
    ],
  };
  const judgeData = {
    band1: [[13, 7, 6, true], [15, 9, 5, false], [17, 9, 8, true], [14, 8, 7, false], [18, 12, 6, true], [16, 9, 6, false], [20, 13, 7, true], [12, 5, 8, false], [19, 12, 7, true], [11, 4, 6, false], [15, 7, 8, true], [18, 6, 13, false], [13, 5, 8, true], [17, 8, 8, false], [16, 7, 9, true], [20, 9, 12, false], [14, 9, 5, true], [19, 4, 14, false]],
    band2: [[58, 27, 31, true], [80, 38, 41, false], [72, 49, 23, true], [73, 54, 18, false], [80, 35, 45, true], [94, 28, 65, false], [92, 59, 33, true], [81, 42, 38, false], [80, 63, 17, true], [84, 30, 55, false], [85, 47, 38, true], [80, 52, 27, false], [84, 37, 47, true], [88, 66, 23, false], [93, 44, 49, true], [89, 58, 30, false], [93, 25, 68, true], [83, 39, 45, false]],
    band3: [[558, 227, 331, true], [780, 338, 441, false], [672, 449, 223, true], [745, 554, 190, false], [780, 335, 445, true], [890, 228, 661, false], [892, 559, 333, true], [833, 442, 390, false], [835, 663, 172, true], [847, 303, 543, false], [859, 477, 382, true], [833, 552, 280, false], [847, 376, 471, true], [892, 665, 226, false], [937, 444, 493, true], [897, 581, 315, false], [942, 259, 683, true], [841, 394, 446, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    judgeData[band].forEach(([w, a, b, ok], i) => {
      items.push(
        item("partWhole", "conceptual", `barJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { bar: { kind: "wholeSaid", w, a, b }, promptText: judgePhr[band][i % 2](nameAt(i * 3 + 1 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), w, a, b), truth: ok },
        })
      );
    });
  }

  const eqPickPhr = {
    band1: [
      (nm, w, p) => `A bar shows whole ${w} and part ${p}. Which number sentence finds the missing part? ${nm} picks one.`,
      (nm, w, p) => `${nm} must find the blank part of a whole-${w}, part-${p} bar. Which sentence does the job?`,
    ],
    band2: [
      (nm, w, p) => `To solve a whole-${w} bar with a known part of ${p}, which sentence should ${nm} write?`,
      (nm, w, p) => `${nm}'s bar model: whole ${w}, part ${p}, blank part. Which equation matches?`,
    ],
    band3: [
      (nm, w, p) => `For a bar of ${w} holding a section of ${p} and a blank, which computation does ${nm} run?`,
      (nm, w, p) => `${nm} translates a whole-${w}, part-${p} bar into arithmetic. Which sentence is faithful?`,
    ],
  };
  const eqData = {
    band1: [[12, 7], [15, 9], [18, 6], [14, 8], [20, 13], [11, 4], [16, 9], [13, 5], [19, 12], [17, 8], [10, 3], [20, 6], [15, 7], [18, 11], [12, 5], [14, 9]],
    band2: [[45, 27], [62, 38], [71, 46], [53, 29], [84, 57], [66, 31], [92, 68], [58, 24], [77, 49], [63, 36], [85, 52], [49, 18], [96, 73], [67, 42], [74, 28], [88, 61]],
    band3: [[452, 267], [618, 384], [723, 456], [539, 291], [846, 572], [667, 318], [924, 683], [583, 246], [775, 491], [638, 362], [852, 527], [497, 183], [968, 734], [676, 428], [741, 285], [883, 617]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    eqData[band].forEach(([w, p], i) => {
      const good = `${w} - ${p}`;
      items.push(
        item("partWhole", "conceptual", `eqPick_${band}`, band, {
          answer: good,
          choices: shuffled([good, `${w} + ${p}`, `${p} - ${w}`], (seed += 1)),
          display: { bar: { kind: "eqPick", w, p }, promptText: eqPickPhr[band][i % 2](nameAt(i * 3 + 2 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), w, p) },
        })
      );
    });
  }

  const threeJudgePhr = {
    band1: [
      (nm, w, a, b, c) => `${nm} splits a whole of ${w} into ${a}, ${b}, and ${c}. Does the split work?`,
      (nm, w, a, b, c) => `Three parts — ${a}, ${b}, ${c} — should rebuild ${nm}'s whole of ${w}. Do they?`,
    ],
    band2: [
      (nm, w, a, b, c) => `${nm} cuts a ${w}-bar into ${a}, ${b}, and ${c}. Is the cut exact?`,
      (nm, w, a, b, c) => `Parts ${a}, ${b}, and ${c} fill ${nm}'s bar of ${w} with nothing left over. Is that right?`,
    ],
    band3: [
      (nm, w, a, b, c) => `${nm} partitions ${w} into sections ${a}, ${b}, and ${c}. Is the partition sound?`,
      (nm, w, a, b, c) => `Sections ${a}, ${b}, and ${c} claim to total ${nm}'s whole of ${w}. Do they truly?`,
    ],
  };
  const threeData = {
    band1: [[15, 4, 5, 6, true], [16, 5, 6, 4, false], [18, 6, 5, 7, true], [17, 4, 6, 8, false], [12, 3, 4, 5, true], [14, 5, 5, 5, false], [20, 6, 7, 7, true], [19, 5, 6, 7, false], [13, 3, 4, 6, true], [15, 5, 5, 6, false], [17, 5, 6, 6, true], [20, 5, 7, 9, false], [16, 4, 5, 7, true], [18, 5, 6, 6, false], [19, 6, 6, 7, true], [12, 4, 4, 5, false]],
    band2: [[75, 24, 25, 26, true], [76, 25, 26, 24, false], [88, 26, 25, 37, true], [87, 24, 26, 38, false], [62, 13, 24, 25, true], [64, 25, 15, 25, false], [90, 26, 27, 37, true], [89, 25, 26, 37, false], [63, 13, 24, 26, true], [65, 25, 15, 26, false], [77, 25, 26, 26, true], [90, 25, 27, 39, false], [66, 14, 25, 27, true], [78, 25, 26, 26, false], [89, 26, 26, 37, true], [62, 14, 24, 25, false]],
    band3: [[675, 224, 225, 226, true], [676, 225, 226, 224, false], [788, 226, 225, 337, true], [787, 224, 226, 338, false], [562, 113, 224, 225, true], [564, 225, 115, 225, false], [890, 226, 227, 437, true], [889, 225, 226, 437, false], [563, 113, 224, 226, true], [565, 225, 115, 226, false], [677, 225, 226, 226, true], [890, 225, 227, 439, false], [566, 114, 225, 227, true], [678, 225, 226, 226, false], [889, 226, 226, 437, true], [562, 114, 224, 225, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    threeData[band].forEach(([w, a, b, c, ok], i) => {
      items.push(
        item("partWhole", "conceptual", `threePartJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { bar: { kind: "threeSaid", w, a, b, c }, promptText: threeJudgePhr[band][i % 2](nameAt(i * 3 + 3 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), w, a, b, c), truth: ok },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* comparison                                                          */
/* ================================================================== */

export function comparisonProcedural() {
  const items = [];

  const diffPhr = {
    band1: [
      (a, b) => `Long bar ${a}, short bar ${b}. The difference = ?`,
      (a, b) => `Two bars: ${a} and ${b}. How far apart are they?`,
    ],
    band2: [
      (a, b) => `Compare bars of ${a} and ${b}. What difference separates them?`,
      (a, b) => `Bars ${a} and ${b} stand side by side. The gap between them = ?`,
    ],
    band3: [
      (a, b) => `Bars of ${a} and ${b}: compute the exact difference. What is it?`,
      (a, b) => `Subtract the shorter bar ${b} from the longer bar ${a}. What remains?`,
    ],
  };
  const diffData = {
    band1: [[14, 9], [17, 8], [12, 5], [19, 11], [16, 7], [15, 6], [20, 12], [13, 4], [18, 9], [11, 3], [20, 14], [16, 9], [14, 6], [19, 13], [12, 7], [17, 4], [15, 8], [18, 5], [13, 9], [20, 7], [11, 6], [16, 3], [19, 8], [14, 11], [17, 12], [15, 2]],
    band2: [[64, 39], [72, 45], [81, 56], [59, 24], [88, 63], [67, 32], [95, 71], [53, 28], [76, 41], [69, 34], [84, 58], [48, 23], [92, 67], [61, 36], [79, 44], [87, 52], [56, 31], [93, 68], [65, 42], [82, 57], [49, 26], [91, 64], [58, 33], [74, 47], [63, 38], [86, 51]],
    band3: [[642, 397], [721, 456], [813, 568], [594, 247], [886, 631], [675, 328], [953, 718], [532, 285], [764, 419], [697, 342], [845, 587], [483, 236], [928, 673], [615, 368], [792, 447], [874, 529], [563, 316], [937, 682], [654, 427], [826, 571], [495, 268], [913, 646], [582, 337], [748, 473], [636, 389], [867, 514]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    diffData[band].forEach(([a, b], i) => {
      items.push(
        item("comparison", "procedural", `barDiff_${band}`, band, {
          answer: a - b,
          answerType: "numberPad",
          display: { counting: { kind: "gap", have: b, target: a }, promptText: diffPhr[band][i % 2](a, b) },
        })
      );
    });
  }

  const morePhr = {
    band1: [
      (b, d) => `Short bar ${b}. The long bar is ${d} more. Long bar = ?`,
      (b, d) => `A bar of ${b} plus ${d} extra makes the longer bar. What is it?`,
    ],
    band2: [
      (b, d) => `The smaller bar shows ${b}; the bigger one runs ${d} further. Bigger bar = ?`,
      (b, d) => `Start at ${b} and stretch by ${d}. The stretched bar = ?`,
    ],
    band3: [
      (b, d) => `A base bar of ${b} extended by exactly ${d}. What does the extended bar total?`,
      (b, d) => `Add a difference of ${d} onto the ${b}-bar. What is the resulting bar?`,
    ],
  };
  const moreData = {
    band1: [[9, 5], [8, 7], [5, 9], [11, 6], [7, 8], [6, 9], [12, 5], [4, 9], [9, 8], [3, 8], [14, 5], [9, 7], [6, 7], [13, 6], [7, 5], [4, 12], [8, 9], [5, 11], [9, 4], [7, 12], [6, 5], [3, 13], [8, 8], [11, 8], [12, 7], [2, 14]],
    band2: [[39, 25], [45, 27], [56, 25], [24, 35], [63, 25], [32, 35], [71, 24], [28, 25], [41, 35], [34, 35], [58, 26], [23, 25], [67, 25], [36, 25], [44, 35], [52, 35], [31, 25], [68, 25], [42, 23], [57, 25], [26, 23], [64, 27], [33, 25], [47, 27], [38, 25], [51, 35]],
    band3: [[397, 245], [456, 265], [568, 245], [247, 339], [631, 255], [328, 347], [718, 235], [285, 247], [419, 345], [342, 355], [587, 258], [236, 247], [673, 255], [368, 247], [447, 345], [529, 345], [316, 247], [682, 255], [427, 227], [571, 255], [268, 227], [646, 267], [337, 255], [473, 275], [389, 255], [514, 345]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    moreData[band].forEach(([b, d], i) => {
      items.push(
        item("comparison", "procedural", `barMore_${band}`, band, {
          answer: b + d,
          answerType: "numberPad",
          display: { counting: { kind: "countOn", start: b, more: d }, promptText: morePhr[band][i % 2](b, d) },
        })
      );
    });
  }

  return items;
}

export function comparisonConceptual() {
  const items = [];
  let seed = 331;

  const trapPhr = {
    band1: [
      (nm, a, other, d) => `${nm} has ${d} fewer stickers than ${other}, who has ${a}. How many stickers does ${nm} have? Pick the number.`,
      (nm, a, other, d) => `${other} holds ${a} marbles; ${nm} holds ${d} fewer. Which count is ${nm}'s?`,
    ],
    band2: [
      (nm, a, other, d) => `${other} scored ${a}; ${nm} scored ${d} fewer. Which is ${nm}'s score?`,
      (nm, a, other, d) => `With ${other} at ${a} and ${nm} trailing by ${d}, what is ${nm}'s count? Pick it.`,
    ],
    band3: [
      (nm, a, other, d) => `${other} collected ${a} points and ${nm} collected ${d} fewer. Which total is ${nm}'s?`,
      (nm, a, other, d) => `${nm} sits exactly ${d} below ${other}'s ${a}. Which value is ${nm} at?`,
    ],
  };
  const trapData = {
    band1: [[14, 5], [17, 8], [12, 4], [19, 6], [16, 7], [15, 9], [20, 8], [13, 6], [18, 5], [11, 4], [20, 11], [16, 8], [14, 7], [19, 12], [12, 3], [17, 9]],
    band2: [[64, 25], [72, 38], [81, 46], [59, 22], [88, 53], [67, 29], [95, 61], [53, 26], [76, 37], [69, 31], [84, 48], [48, 21], [92, 57], [61, 33], [79, 41], [87, 49]],
    band3: [[642, 257], [721, 386], [813, 468], [594, 227], [886, 531], [675, 298], [953, 617], [532, 265], [764, 379], [697, 313], [845, 487], [483, 216], [928, 572], [615, 334], [792, 418], [867, 493]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    trapData[band].forEach(([a, d], i) => {
      const nm = nameAt(i * 3 + 4 + (band === "band2" ? 7 : band === "band3" ? 13 : 0));
      const other = nameAt(i * 3 + 5 + (band === "band2" ? 7 : band === "band3" ? 13 : 0));
      const right = a - d;
      items.push(
        item("comparison", "conceptual", `fewerPick_${band}`, band, {
          answer: right,
          choices: shuffled([...new Set([right, a + d, a, right - 1])].filter((v) => v > 0), (seed += 1)).slice(0, 4),
          display: { bar: { kind: "fewerOf", a, d }, promptText: trapPhr[band][i % 2](nm, a, other, d) },
        })
      );
    });
  }

  const judgePhr = {
    band1: [
      (nm, a, b, said) => `${nm} compares bars of ${a} and ${b} and calls the gap ${said}. Is ${nm} right?`,
      (nm, a, b, said) => `Between ${a} and ${b}, ${nm} measures a difference of ${said}. Is that right?`,
    ],
    band2: [
      (nm, a, b, said) => `${nm} lines up ${a} against ${b} and reports a gap of ${said}. Does the report hold?`,
      (nm, a, b, said) => `${nm} figures ${a} beats ${b} by ${said}. Is the figure right?`,
    ],
    band3: [
      (nm, a, b, said) => `${nm} computes the spread between ${a} and ${b} as ${said}. Is the computation right?`,
      (nm, a, b, said) => `A spread of ${said} between ${a} and ${b} — ${nm} signs off. Should ${nm} have?`,
    ],
  };
  const judgeData = {
    band1: [[14, 9, 5, true], [17, 8, 8, false], [12, 5, 7, true], [19, 11, 7, false], [16, 7, 9, true], [15, 6, 8, false], [20, 12, 8, true], [13, 4, 8, false], [18, 9, 9, true], [11, 3, 7, false], [20, 14, 6, true], [16, 9, 6, false], [14, 6, 8, true], [19, 13, 5, false], [12, 7, 5, true], [17, 4, 12, false], [15, 8, 7, true], [18, 5, 14, false]],
    band2: [[64, 39, 25, true], [72, 45, 26, false], [81, 56, 25, true], [59, 24, 34, false], [88, 63, 25, true], [67, 32, 34, false], [95, 71, 24, true], [53, 28, 26, false], [76, 41, 35, true], [69, 34, 34, false], [84, 58, 26, true], [48, 23, 26, false], [92, 67, 25, true], [61, 36, 24, false], [79, 44, 35, true], [87, 52, 34, false], [56, 31, 25, true], [93, 68, 26, false]],
    band3: [[642, 397, 245, true], [721, 456, 264, false], [813, 568, 245, true], [594, 247, 346, false], [886, 631, 255, true], [675, 328, 346, false], [953, 718, 235, true], [532, 285, 246, false], [764, 419, 345, true], [697, 342, 354, false], [845, 587, 258, true], [483, 236, 246, false], [928, 673, 255, true], [615, 368, 246, false], [792, 447, 345, true], [874, 529, 344, false], [563, 316, 247, true], [937, 682, 254, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    judgeData[band].forEach(([a, b, said, ok], i) => {
      items.push(
        item("comparison", "conceptual", `diffJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { bar: { kind: "diffSaid", a, b, said }, promptText: judgePhr[band][i % 2](nameAt(i * 3 + 6 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), a, b, said), truth: ok },
        })
      );
    });
  }

  const whichModelPhr = {
    band1: [
      (nm, other, d) => `"${nm} has ${d} more than ${other}." Whose bar should be drawn LONGER?`,
      (nm, other, d) => `The story says ${nm} has ${d} fewer than ${other}. Whose bar is longer?`,
    ],
    band2: [
      (nm, other, d) => `A problem reads: ${nm} outscores ${other} by ${d}. Which bar stretches further?`,
      (nm, other, d) => `"${other} leads ${nm} by ${d}." In the model, whose bar is the long one?`,
    ],
    band3: [
      (nm, other, d) => `The data note says ${nm} trails ${other} by exactly ${d}. Whose bar dominates the model?`,
      (nm, other, d) => `With ${nm} ahead of ${other} by ${d}, which bar towers in the diagram?`,
    ],
  };
  // Truth pattern per phrasing: [0]=first name longer, [1]=second name longer, etc.
  const longerIsFirst = { band1: [true, false], band2: [true, false], band3: [false, true] };
  const whichData = {
    band1: [5, 8, 4, 6, 7, 9, 8, 6, 5, 4, 11, 8, 7, 12, 3, 9],
    band2: [25, 38, 46, 22, 53, 29, 61, 26, 37, 31, 48, 21, 57, 33, 41, 49],
    band3: [257, 386, 468, 227, 531, 298, 617, 265, 379, 313, 487, 216, 572, 334, 418, 493],
  };
  for (const band of ["band1", "band2", "band3"]) {
    whichData[band].forEach((d, i) => {
      const nm = nameAt(i * 3 + 8 + (band === "band2" ? 7 : band === "band3" ? 13 : 0));
      const other = nameAt(i * 3 + 9 + (band === "band2" ? 7 : band === "band3" ? 13 : 0));
      const p = i % 2;
      const winner = longerIsFirst[band][p] ? nm : other;
      items.push(
        item("comparison", "conceptual", `whichLonger_${band}`, band, {
          answer: winner,
          choices: shuffled([nm, other], (seed += 1)),
          display: { bar: { kind: "authoredChoice" }, promptText: whichModelPhr[band][p](nm, other, d) },
        })
      );
    });
  }

  return items;
}
