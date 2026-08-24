/* barModels bank part 2 — multiplicative and fractionBar cells.
 * See barModelsTemplates.js for conventions.
 */

import { rotor, shuffled, NAMES } from "../counting/countingTemplates.js";
import { LEVELS, item, nameAt } from "./barModelsTemplates.js";

/* ================================================================== */
/* multiplicative                                                      */
/* ================================================================== */

export function multiplicativeProcedural() {
  const items = [];

  const totalPhr = {
    band1: [
      (k, u) => `${k} equal bar parts of ${u} each. The whole = ?`,
      (k, u) => `A bar holds ${k} equal parts, each worth ${u}. What is the whole?`,
    ],
    band2: [
      (k, u) => `${k} equal sections of ${u} line up in one bar. The whole = ?`,
      (k, u) => `Each of ${k} equal sections carries ${u}. What does the bar total?`,
    ],
    band3: [
      (k, u) => `A bar of ${k} equal units, ${u} apiece. Exactly what is the whole?`,
      (k, u) => `Multiply out the bar: ${k} units of ${u}. What total does it show?`,
    ],
  };
  const totalData = {
    band1: [[2, 6], [3, 4], [2, 7], [3, 5], [2, 8], [4, 3], [2, 9], [3, 6], [4, 4], [2, 5], [5, 3], [3, 3], [4, 5], [2, 10], [5, 4], [6, 3], [3, 2], [4, 2], [5, 2], [6, 2], [2, 4], [2, 3], [7, 2], [8, 2], [9, 2], [10, 2]],
    band2: [[3, 21], [4, 17], [5, 14], [6, 12], [3, 26], [4, 19], [5, 16], [6, 13], [3, 24], [4, 22], [5, 18], [7, 11], [3, 29], [4, 23], [5, 19], [7, 12], [3, 27], [4, 21], [6, 14], [8, 11], [3, 25], [4, 18], [6, 15], [8, 12], [5, 17], [7, 13]],
    band3: [[3, 214], [4, 173], [5, 146], [6, 124], [3, 267], [4, 192], [5, 163], [6, 137], [3, 243], [4, 226], [5, 184], [7, 118], [3, 292], [4, 234], [5, 197], [7, 121], [3, 275], [4, 218], [6, 143], [8, 116], [3, 258], [4, 187], [6, 152], [8, 123], [5, 178], [7, 132]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    totalData[band].forEach(([k, u], i) => {
      items.push(
        item("multiplicative", "procedural", `unitsTotal_${band}`, band, {
          answer: k * u,
          answerType: "numberPad",
          display: { counting: { kind: "sum", parts: Array.from({ length: k }, () => u) }, promptText: totalPhr[band][i % 2](k, u) },
        })
      );
    });
  }

  const unitPhr = {
    band1: [
      (w, k) => `A bar of ${w} splits into ${k} equal parts. Each part = ?`,
      (w, k) => `Split ${w} into ${k} equal bar parts. What does one part hold?`,
    ],
    band2: [
      (w, k) => `Divide a ${w}-bar into ${k} equal sections. One section = ?`,
      (w, k) => `${k} equal sections share a whole of ${w}. Each section carries ?`,
    ],
    band3: [
      (w, k) => `Partition ${w} into ${k} identical units. Exactly what is one unit?`,
      (w, k) => `A whole of ${w} spread over ${k} equal units leaves each unit = ?`,
    ],
  };
  const unitData = {
    band1: [[12, 2], [12, 3], [12, 4], [15, 3], [16, 2], [16, 4], [18, 2], [18, 3], [20, 2], [20, 4], [14, 2], [10, 2], [9, 3], [8, 2], [8, 4], [6, 2], [6, 3], [20, 5], [15, 5], [10, 5], [18, 6], [12, 6], [14, 7], [16, 8], [18, 9], [20, 10]],
    band2: [[84, 3], [76, 4], [95, 5], [72, 6], [87, 3], [92, 4], [85, 5], [78, 6], [96, 3], [88, 4], [75, 5], [84, 6], [93, 3], [68, 4], [90, 5], [66, 6], [81, 3], [64, 4], [80, 5], [96, 6], [99, 3], [56, 4], [65, 5], [54, 6], [63, 7], [72, 8]],
    band3: [[846, 3], [764, 4], [955, 5], [726, 6], [873, 3], [928, 4], [855, 5], [786, 6], [963, 3], [884, 4], [755, 5], [846, 6], [939, 3], [688, 4], [905, 5], [666, 6], [813, 3], [644, 4], [805, 5], [966, 6], [999, 3], [568, 4], [655, 5], [546, 6], [637, 7], [728, 8]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    unitData[band].forEach(([w, k], i) => {
      items.push(
        item("multiplicative", "procedural", `unitOf_${band}`, band, {
          answer: w / k,
          answerType: "numberPad",
          display: { bar: { kind: "unitOf", w, k }, promptText: unitPhr[band][i % 2](w, k) },
        })
      );
    });
  }

  return items;
}

export function multiplicativeConceptual() {
  const items = [];
  let seed = 341;

  const timesPhr = {
    band1: [
      (nm, other, k, u) => `${nm} has ${k} times as many shells as ${other}, who has ${u}. How many shells does ${nm} have? Pick the count.`,
      (nm, other, k, u) => `${other} keeps ${u} stamps; ${nm} keeps ${k} times as many. Which count is ${nm}'s?`,
    ],
    band2: [
      (nm, other, k, u) => `${other} saved ${u}; ${nm} saved ${k} times as much. Which amount is ${nm}'s?`,
      (nm, other, k, u) => `${nm}'s collection is ${k} of ${other}'s bars of ${u} laid end to end. What does it total? Pick it.`,
    ],
    band3: [
      (nm, other, k, u) => `${other} logged ${u} points; ${nm} logged ${k} times that. Which total is ${nm}'s?`,
      (nm, other, k, u) => `${nm}'s bar repeats ${other}'s ${u}-bar ${k} times over. Which value does it reach?`,
    ],
  };
  const timesData = {
    band1: [[2, 6], [3, 4], [2, 7], [3, 5], [2, 8], [4, 3], [2, 9], [3, 6], [4, 4], [2, 5], [5, 3], [3, 3], [4, 5], [2, 10], [5, 4], [6, 3]],
    band2: [[3, 21], [4, 17], [5, 14], [6, 12], [3, 26], [4, 19], [5, 16], [6, 13], [3, 24], [4, 22], [5, 18], [7, 11], [3, 29], [4, 23], [5, 19], [7, 12]],
    band3: [[3, 214], [4, 173], [5, 146], [6, 124], [3, 267], [4, 192], [5, 163], [6, 137], [3, 243], [4, 226], [5, 184], [7, 118], [3, 292], [4, 234], [5, 197], [7, 121]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    timesData[band].forEach(([k, u], i) => {
      const nm = nameAt(i * 3 + 1 + (band === "band2" ? 7 : band === "band3" ? 13 : 0));
      const other = nameAt(i * 3 + 2 + (band === "band2" ? 7 : band === "band3" ? 13 : 0));
      const right = k * u;
      items.push(
        item("multiplicative", "conceptual", `timesPick_${band}`, band, {
          answer: right,
          choices: shuffled([...new Set([right, u + k, right + u, right - u])].filter((v) => v > 0), (seed += 1)).slice(0, 4),
          display: { bar: { kind: "timesOf", k, u }, promptText: timesPhr[band][i % 2](nm, other, k, u) },
        })
      );
    });
  }

  const equalJudgePhr = {
    band1: [
      (nm, w, k, u) => `${nm} cuts a ${w}-bar into ${k} equal parts of ${u}. Does the cut work?`,
      (nm, w, k, u) => `${k} parts of ${u} each should rebuild ${nm}'s whole of ${w}. Do they?`,
    ],
    band2: [
      (nm, w, k, u) => `${nm} claims ${k} equal sections of ${u} exactly fill a ${w}-bar. Is that right?`,
      (nm, w, k, u) => `A ${w}-bar divided by ${nm} into ${k} sections of ${u} — is the division exact?`,
    ],
    band3: [
      (nm, w, k, u) => `${nm} partitions ${w} into ${k} units of ${u}. Is the partition exact?`,
      (nm, w, k, u) => `${k} units of ${u} claim to total ${nm}'s ${w}. Do they truly?`,
    ],
  };
  const equalData = {
    band1: [[12, 3, 4, true], [12, 3, 5, false], [15, 3, 5, true], [16, 4, 5, false], [16, 4, 4, true], [18, 3, 5, false], [18, 3, 6, true], [20, 4, 4, false], [20, 4, 5, true], [14, 2, 6, false], [14, 2, 7, true], [10, 2, 4, false], [10, 2, 5, true], [9, 3, 4, false], [9, 3, 3, true], [8, 4, 3, false], [8, 4, 2, true], [6, 2, 4, false]],
    band2: [[84, 3, 28, true], [84, 3, 27, false], [76, 4, 19, true], [76, 4, 18, false], [95, 5, 19, true], [95, 5, 18, false], [72, 6, 12, true], [72, 6, 13, false], [87, 3, 29, true], [87, 3, 28, false], [92, 4, 23, true], [92, 4, 24, false], [85, 5, 17, true], [85, 5, 16, false], [78, 6, 13, true], [78, 6, 12, false], [96, 3, 32, true], [96, 3, 31, false]],
    band3: [[846, 3, 282, true], [846, 3, 281, false], [764, 4, 191, true], [764, 4, 190, false], [955, 5, 191, true], [955, 5, 190, false], [726, 6, 121, true], [726, 6, 122, false], [873, 3, 291, true], [873, 3, 290, false], [928, 4, 232, true], [928, 4, 233, false], [855, 5, 171, true], [855, 5, 170, false], [786, 6, 131, true], [786, 6, 130, false], [963, 3, 321, true], [963, 3, 320, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    equalData[band].forEach(([w, k, u, ok], i) => {
      items.push(
        item("multiplicative", "conceptual", `equalJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { bar: { kind: "equalSaid", w, k, u }, promptText: equalJudgePhr[band][i % 2](nameAt(i * 3 + 3 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), w, k, u), truth: ok },
        })
      );
    });
  }

  const howManyUnitsPhr = {
    band1: [
      (nm, w, u) => `${nm} tiles a ${w}-bar with equal parts of ${u}. How many parts fit?`,
      (nm, w, u) => `How many ${u}-parts fill ${nm}'s bar of ${w}? Count the units.`,
    ],
    band2: [
      (nm, w, u) => `${nm} lays units of ${u} along a ${w}-bar. How many units complete it?`,
      (nm, w, u) => `A ${w}-bar swallows units of ${u} whole. How many units does ${nm} place?`,
    ],
    band3: [
      (nm, w, u) => `Exactly how many ${u}-units make up ${nm}'s ${w}-bar?`,
      (nm, w, u) => `${nm} measures a ${w}-bar in strides of ${u}. How many strides is that?`,
    ],
  };
  const unitCountData = {
    band1: [[12, 4], [12, 3], [15, 5], [16, 4], [18, 6], [20, 5], [14, 7], [10, 5], [9, 3], [8, 4], [18, 3], [16, 8], [20, 4], [12, 6], [15, 3], [20, 10]],
    band2: [[84, 28], [76, 19], [95, 19], [72, 12], [87, 29], [92, 23], [85, 17], [78, 13], [96, 32], [88, 22], [75, 15], [84, 12], [93, 31], [68, 17], [90, 18], [66, 11]],
    band3: [[846, 282], [764, 191], [955, 191], [726, 121], [873, 291], [928, 232], [855, 171], [786, 131], [963, 321], [884, 221], [755, 151], [846, 141], [939, 313], [688, 172], [905, 181], [666, 111]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    unitCountData[band].forEach(([w, u], i) => {
      items.push(
        item("multiplicative", "conceptual", `unitCount_${band}`, band, {
          answer: w / u,
          answerType: "numberPad",
          display: { bar: { kind: "unitCount", w, u }, promptText: howManyUnitsPhr[band][i % 2](nameAt(i * 3 + 5 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), w, u) },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* fractionBar                                                         */
/* ================================================================== */

export function fractionBarProcedural() {
  const items = [];

  const fracPhr = {
    band1: [
      (num, den, w) => `A bar of ${w} is cut into ${den} equal pieces. ${num === 1 ? "One piece" : `${num} pieces`} = ?`,
      (num, den, w) => `Cut ${w} into ${den} equal bar pieces and take ${num}. How much is taken?`,
    ],
    band2: [
      (num, den, w) => `Shade ${num} of the ${den} equal parts of a ${w}-bar. What value is shaded?`,
      (num, den, w) => `A ${w}-bar in ${den} equal parts: ${num} of them together = ?`,
    ],
    band3: [
      (num, den, w) => `Take exactly ${num} of the ${den} equal sections of a ${w}-bar. What amount is that?`,
      (num, den, w) => `Of a ${w}-bar split ${den} ways, claim ${num} sections. What do they total?`,
    ],
  };
  const fracData = {
    band1: [[1, 2, 12], [1, 2, 16], [1, 2, 20], [1, 4, 12], [1, 4, 16], [1, 4, 20], [1, 2, 10], [1, 2, 18], [1, 4, 8], [1, 3, 12], [1, 3, 15], [1, 3, 18], [3, 4, 12], [3, 4, 16], [2, 3, 12], [2, 3, 15], [1, 2, 14], [1, 2, 8], [3, 4, 20], [2, 3, 18], [1, 3, 9], [1, 4, 4], [1, 2, 6], [1, 2, 4], [1, 3, 6], [1, 4, 16? 16 : 16]],
    band2: [[1, 4, 84], [3, 4, 76], [2, 5, 95], [5, 6, 72], [1, 3, 87], [3, 4, 92], [4, 5, 85], [1, 6, 78], [2, 3, 96], [1, 4, 88], [3, 5, 75], [5, 6, 84], [1, 3, 93], [1, 4, 68], [2, 5, 90], [1, 6, 66], [2, 3, 81], [3, 4, 64], [4, 5, 80], [5, 6, 96], [1, 3, 99], [1, 4, 56], [3, 5, 65], [1, 6, 54], [2, 7, 63], [3, 8, 72]],
    band3: [[1, 4, 848], [3, 4, 764], [2, 5, 955], [5, 6, 726], [1, 3, 873], [3, 4, 928], [4, 5, 855], [1, 6, 786], [2, 3, 963], [1, 4, 884], [3, 5, 755], [5, 6, 846], [1, 3, 939], [1, 4, 688], [2, 5, 905], [1, 6, 666], [2, 3, 813], [3, 4, 644], [4, 5, 805], [5, 6, 966], [1, 3, 999], [1, 4, 568], [3, 5, 655], [1, 6, 546], [2, 7, 637], [3, 8, 728]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    fracData[band].forEach(([num, den, w], i) => {
      items.push(
        item("fractionBar", "procedural", `fracOf_${band}`, band, {
          answer: (w / den) * num,
          answerType: "numberPad",
          display: { bar: { kind: "fracOf", num, den, w }, promptText: fracPhr[band][i % 2](num, den, w) },
        })
      );
    });
  }

  const wholeBackPhr = {
    band1: [
      (den, piece) => `One of ${den} equal bar pieces holds ${piece}. The whole bar = ?`,
      (den, piece) => `Each of ${den} equal pieces is ${piece}. What is the whole?`,
    ],
    band2: [
      (den, piece) => `A single one of ${den} equal sections shows ${piece}. The full bar = ?`,
      (den, piece) => `If one of ${den} equal sections is ${piece}, what does the whole bar hold?`,
    ],
    band3: [
      (den, piece) => `One of ${den} identical sections carries ${piece}. Exactly what is the whole?`,
      (den, piece) => `Rebuild the bar: ${den} sections, ${piece} apiece. What whole results?`,
    ],
  };
  const wholeBackData = {
    band1: [[2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [3, 4], [3, 5], [3, 6], [4, 3], [4, 4], [4, 5], [5, 2], [5, 3], [5, 4], [2, 5], [3, 3], [4, 2], [6, 2], [6, 3], [2, 4], [3, 2], [7, 2], [8, 2], [9, 2], [10, 2], [2, 3]],
    band2: [[3, 28], [4, 19], [5, 19], [6, 12], [3, 29], [4, 23], [5, 17], [6, 13], [3, 32], [4, 22], [5, 15], [6, 14], [3, 31], [4, 17], [5, 18], [6, 11], [3, 27], [4, 16], [5, 16], [6, 16], [3, 33], [4, 14], [5, 13], [6, 9], [7, 9], [8, 9]],
    band3: [[3, 282], [4, 191], [5, 191], [6, 121], [3, 291], [4, 232], [5, 171], [6, 131], [3, 321], [4, 221], [5, 151], [6, 141], [3, 313], [4, 172], [5, 181], [6, 111], [3, 271], [4, 161], [5, 161], [6, 161], [3, 333], [4, 142], [5, 131], [6, 91], [7, 91], [8, 91]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    wholeBackData[band].forEach(([den, piece], i) => {
      items.push(
        item("fractionBar", "procedural", `wholeFromPiece_${band}`, band, {
          answer: den * piece,
          answerType: "numberPad",
          display: { counting: { kind: "sum", parts: Array.from({ length: den }, () => piece) }, promptText: wholeBackPhr[band][i % 2](den, piece) },
        })
      );
    });
  }

  return items;
}

export function fractionBarConceptual() {
  const items = [];
  let seed = 351;

  const halfJudgePhr = {
    band1: [
      (nm, w, said) => `${nm} says half of a ${w}-bar is ${said}. Is ${nm} right?`,
      (nm, w, said) => `Half of ${w}, according to ${nm}, is ${said}. Is that right?`,
    ],
    band2: [
      (nm, w, said) => `${nm} halves a ${w}-bar and writes ${said}. Does the halving hold up?`,
      (nm, w, said) => `A ${w}-bar folded in half should show ${said}, says ${nm}. Is ${nm} right?`,
    ],
    band3: [
      (nm, w, said) => `${nm} computes half of ${w} as ${said}. Is the computation right?`,
      (nm, w, said) => `Half of a ${w}-bar equals ${said} — ${nm} stakes the claim. Does it stand?`,
    ],
  };
  const halfData = {
    band1: [[12, 6, true], [16, 7, false], [20, 10, true], [14, 8, false], [18, 9, true], [10, 6, false], [8, 4, true], [6, 4, false], [4, 2, true], [12, 5, false], [16, 8, true], [20, 11, false], [14, 7, true], [18, 8, false], [10, 5, true], [8, 5, false], [6, 3, true], [4, 3, false]],
    band2: [[84, 42, true], [76, 39, false], [94, 47, true], [68, 35, false], [92, 46, true], [88, 45, false], [96, 48, true], [72, 37, false], [86, 43, true], [78, 40, false], [90, 45, true], [64, 33, false], [82, 41, true], [98, 50, false], [74, 37, true], [66, 34, false], [80, 40, true], [70, 36, false]],
    band3: [[848, 424, true], [764, 383, false], [946, 473, true], [688, 345, false], [928, 464, true], [886, 444, false], [968, 484, true], [726, 364, false], [864, 432, true], [786, 394, false], [906, 453, true], [644, 323, false], [824, 412, true], [986, 494, false], [744, 372, true], [666, 334, false], [808, 404, true], [706, 354, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    halfData[band].forEach(([w, said, ok], i) => {
      items.push(
        item("fractionBar", "conceptual", `halfJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { bar: { kind: "fracSaid", num: 1, den: 2, w, said }, promptText: halfJudgePhr[band][i % 2](nameAt(i * 3 + 1 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), w, said), truth: ok },
        })
      );
    });
  }

  const biggerPiecePhr = {
    band1: [
      (nm, w) => `From a ${w}-bar, would ${nm} get more with one half or one quarter?`,
      (nm, w) => `${nm} picks a piece of a ${w}-bar: a half or a quarter. Which piece is bigger?`,
    ],
    band2: [
      (nm, w) => `Cutting a ${w}-bar, is one third or one sixth the larger share? ${nm} chooses.`,
      (nm, w) => `${nm} weighs one third of ${w} against one sixth of ${w}. Which share wins?`,
    ],
    band3: [
      (nm, w) => `Of a ${w}-bar, which is larger: one fourth or one fifth? ${nm} reasons it out.`,
      (nm, w) => `${nm} contrasts a fourth of ${w} with a fifth of ${w}. Which piece is larger?`,
    ],
  };
  const pieceChoices = {
    band1: ["one half", "one quarter"],
    band2: ["one third", "one sixth"],
    band3: ["one fourth", "one fifth"],
  };
  const biggerData = {
    band1: [12, 16, 20, 8, 4, 12, 16, 20, 8, 4, 12, 16, 20, 8, 4, 12],
    band2: [84, 96, 72, 66, 90, 78, 84, 96, 72, 66, 90, 78, 84, 96, 72, 66],
    band3: [840, 960, 720, 660, 900, 780, 840, 960, 720, 660, 900, 780, 840, 960, 720, 660],
  };
  for (const band of ["band1", "band2", "band3"]) {
    biggerData[band].forEach((w, i) => {
      items.push(
        item("fractionBar", "conceptual", `biggerPiece_${band}`, band, {
          answer: pieceChoices[band][0],
          choices: shuffled([...pieceChoices[band]], (seed += 1)),
          display: { bar: { kind: "biggerPiece" }, promptText: biggerPiecePhr[band][i % 2](nameAt(i * 3 + 3 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), w) },
        })
      );
    });
  }

  const sharePickPhr = {
    band1: [
      (nm, w, den) => `${nm} shares a ${w}-bar equally among ${den} friends. Which amount does each friend get?`,
      (nm, w, den) => `A ${w}-bar split fairly ${den} ways gives each of ${nm}'s friends how much? Pick the amount.`,
    ],
    band2: [
      (nm, w, den) => `${nm} deals a ${w}-bar into ${den} fair shares. Which value is one share?`,
      (nm, w, den) => `Divide ${w} fairly by ${den} for ${nm}'s group. Which share size is right?`,
    ],
    band3: [
      (nm, w, den) => `${nm} allocates a ${w}-bar across ${den} equal claims. Which amount is one claim?`,
      (nm, w, den) => `A fair ${den}-way split of ${w} hands ${nm} which amount? Choose it.`,
    ],
  };
  const shareData = {
    band1: [[12, 2], [12, 3], [12, 4], [16, 2], [16, 4], [18, 2], [18, 3], [20, 2], [20, 4], [15, 3], [10, 2], [8, 4], [9, 3], [14, 2], [20, 5], [6, 3]],
    band2: [[84, 4], [76, 4], [95, 5], [72, 6], [87, 3], [92, 4], [85, 5], [78, 6], [96, 3], [88, 4], [75, 5], [84, 6], [93, 3], [68, 4], [90, 5], [66, 6]],
    band3: [[848, 4], [764, 4], [955, 5], [726, 6], [873, 3], [928, 4], [855, 5], [786, 6], [963, 3], [884, 4], [755, 5], [846, 6], [939, 3], [688, 4], [905, 5], [666, 6]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    shareData[band].forEach(([w, den], i) => {
      const right = w / den;
      items.push(
        item("fractionBar", "conceptual", `sharePick_${band}`, band, {
          answer: right,
          choices: shuffled([...new Set([right, right + 1, right - 1, w - den])].filter((v) => v > 0), (seed += 1)).slice(0, 4),
          display: { bar: { kind: "unitOf", w, k: den }, promptText: sharePickPhr[band][i % 2](nameAt(i * 3 + 5 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), w, den) },
        })
      );
    });
  }

  return items;
}
