/* Deterministic measurement bank items — procedural and conceptual cells for
 * lengthConvert, massVolumeConvert, benchmarkEstimate, compareOrder,
 * multiStepMeasure.
 *
 * Ladder mirrors the generator: band 1 = NO conversion (benchmarks, unit
 * sense, same-unit compares, tiny iterations — every prompt number <= 20);
 * band 2 = one conversion larger->smaller (m->cm, km->m, cm->mm, kg->g,
 * L->mL) and cross-unit compares; band 3 = the reverse direction, unknown
 * on the left, mixed units, and two-step conversions.
 *
 * Claims: additive work rides countMath ({sum}, {gap}); conversions carry
 * display.measure claims ({convert}, {convertUp}, {cmp} with values
 * normalized to the small unit) that authorMeasurement.js re-derives.
 * Judged = "Is this right?" Yes/No + display.truth.
 */

import { rotor, shuffled, NAMES } from "../counting/countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "measurement",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const nameAt = (i) => NAMES[i % NAMES.length];

export const FACTORS = { "m>cm": 100, "km>m": 1000, "cm>mm": 10, "kg>g": 1000, "L>mL": 1000 };

/* ================================================================== */
/* lengthConvert                                                       */
/* ================================================================== */

export function lengthConvertProcedural() {
  const items = [];

  // Band 1 — same-unit length work only (<= 20).
  for (const [a, b] of [[12, 7], [15, 9], [9, 4], [18, 11], [14, 6], [16, 8], [11, 3], [20, 13], [13, 5], [17, 12], [10, 2], [19, 14], [8, 3], [15, 6], [12, 4], [20, 9], [16, 11], [14, 8], [18, 5], [11, 7], [13, 9], [17, 4], [19, 8], [10, 6], [20, 16], [15, 2]]) {
    items.push(
      item("lengthConvert", "procedural", "longerByTeen", "band1", {
        answer: a - b,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: b, target: a }, promptText: `A ${a} cm ribbon and a ${b} cm ribbon. The first is longer by ? cm` },
      })
    );
  }
  for (const [n, per] of [[4, 3], [5, 2], [3, 5], [6, 3], [2, 8], [4, 4], [5, 3], [3, 6], [6, 2], [2, 9], [4, 5], [3, 4], [2, 7], [5, 4], [6, 1], [3, 3], [2, 6], [4, 2], [2, 10], [3, 2], [5, 1], [2, 5], [7, 2], [8, 2], [9, 2], [10, 2]]) {
    items.push(
      item("lengthConvert", "procedural", "iterateTeen", "band1", {
        answer: n * per,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: Array.from({ length: n }, () => per) }, promptText: `${n} paperclips, each ${per} cm long, laid end to end = ? cm` },
      })
    );
  }

  // Band 2 — larger -> smaller.
  const convDrill = (subskill, structureType, band, amount, pair, text) =>
    item(subskill, "procedural", structureType, band, {
      answer: amount * FACTORS[pair],
      answerType: "numberPad",
      display: { measure: { kind: "convert", amount, pair }, promptText: text },
    });
  for (const [amount, pair] of [[3, "m>cm"], [5, "m>cm"], [2, "km>m"], [4, "cm>mm"], [7, "m>cm"], [3, "km>m"], [6, "cm>mm"], [9, "m>cm"], [5, "km>m"], [8, "cm>mm"], [2, "m>cm"], [7, "km>m"], [3, "cm>mm"], [6, "m>cm"], [4, "km>m"], [9, "cm>mm"], [4, "m>cm"], [6, "km>m"], [5, "cm>mm"], [8, "m>cm"], [8, "km>m"], [7, "cm>mm"], [10, "m>cm"], [9, "km>m"], [2, "cm>mm"], [12, "m>cm"]]) {
    const [from, to] = pair.split(">");
    items.push(convDrill("lengthConvert", "convertDownMid", "band2", amount, pair, `${amount} ${from} = ? ${to}`));
  }
  for (const [whole, part] of [[1, 25], [1, 40], [2, 15], [1, 65], [2, 30], [3, 10], [1, 85], [2, 55], [3, 45], [1, 5], [2, 70], [3, 25], [4, 15], [1, 95], [2, 5], [3, 60], [4, 35], [1, 50], [2, 85], [3, 75], [4, 60], [5, 20], [1, 15], [2, 40], [5, 45], [3, 90]]) {
    items.push(
      item("lengthConvert", "procedural", "mixedToSmallMid", "band2", {
        answer: whole * 100 + part,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [whole * 100, part] }, promptText: `${whole} m ${part} cm = ? cm` },
      })
    );
  }

  // Band 3 — the reverse direction, unknown amounts, two-step.
  for (const [total, pair] of [[300, "m>cm"], [500, "m>cm"], [2000, "km>m"], [40, "cm>mm"], [700, "m>cm"], [3000, "km>m"], [60, "cm>mm"], [900, "m>cm"], [5000, "km>m"], [80, "cm>mm"], [200, "m>cm"], [7000, "km>m"], [30, "cm>mm"], [600, "m>cm"], [4000, "km>m"], [90, "cm>mm"], [400, "m>cm"], [6000, "km>m"], [50, "cm>mm"], [800, "m>cm"], [8000, "km>m"], [70, "cm>mm"], [1000, "m>cm"], [9000, "km>m"], [20, "cm>mm"], [1200, "m>cm"]]) {
    const [from, to] = pair.split(">");
    items.push(
      item("lengthConvert", "procedural", "convertUpBig", "band3", {
        answer: total / FACTORS[pair],
        answerType: "numberPad",
        display: { measure: { kind: "convertUp", total, pair }, promptText: `${total} ${to} = ? ${from}` },
      })
    );
  }
  for (const [m, cm] of [[2, 340], [3, 125], [1, 480], [4, 215], [2, 555], [5, 130], [3, 370], [1, 645], [4, 490], [2, 705], [5, 265], [3, 810], [6, 145], [1, 930], [4, 385], [2, 260], [6, 415], [3, 590], [5, 340], [7, 120], [1, 275], [4, 650], [2, 835], [6, 275], [3, 460], [7, 350]]) {
    items.push(
      item("lengthConvert", "procedural", "addMixedBig", "band3", {
        answer: m * 100 + cm,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [m * 100, cm] }, promptText: `${m} m + ${cm} cm = ? cm` },
      })
    );
  }

  return items;
}

export function lengthConvertConceptual() {
  const items = [];
  let seed = 161;

  // Band 1 — which is longer (same unit), plus unit-scale judged.
  const longerPhr = rotor([
    (nm, a, b) => `${nm} holds a ${a} cm straw and a ${b} cm straw. Which straw is longer?`,
    (nm, a, b) => `Two sticks lie on ${nm}'s desk: ${a} cm and ${b} cm. Which stick is longer?`,
  ]);
  [[12, 9], [7, 15], [18, 11], [6, 13], [20, 17], [8, 16], [14, 5], [10, 19], [16, 12], [4, 9], [17, 14], [11, 20], [13, 8], [9, 18], [15, 10], [19, 16], [5, 12], [20, 7]].forEach(([a, b], i) => {
    items.push(
      item("lengthConvert", "conceptual", "whichLongerTeen", "band1", {
        answer: `the ${Math.max(a, b)} cm one`,
        choices: shuffled([`the ${a} cm one`, `the ${b} cm one`], (seed += 1)),
        display: { measure: { kind: "cmp", a, b, pickLarger: true }, promptText: longerPhr()(nameAt(i * 3 + 1), a, b) },
      })
    );
  });
  const doorPhr = rotor([
    (nm, obj, v, unit) => `${nm} says ${obj} is about ${v} ${unit} long. Is ${nm} right?`,
    (nm, obj, v, unit) => `${nm} guesses ${obj} measures about ${v} ${unit}. Is that a sensible guess?`,
  ]);
  [["a new crayon", 9, "cm", true], ["a new crayon", 9, "m", false], ["a ladybird", 6, "mm", true], ["a ladybird", 6, "m", false], ["a jump rope", 2, "m", true], ["a jump rope", 2, "mm", false], ["a shoe", 20, "cm", true], ["a shoe", 20, "m", false], ["a bed", 2, "m", true], ["a bed", 2, "cm", false], ["an eraser", 4, "cm", true], ["an eraser", 4, "km", false], ["a garden slide", 3, "m", true], ["a garden slide", 3, "mm", false], ["a postage stamp", 2, "cm", true], ["a postage stamp", 2, "km", false], ["a lunch tray", 14, "cm", false], ["a toothbrush", 17, "cm", true]].forEach(([obj, v, unit, ok], i) => {
    items.push(
      item("lengthConvert", "conceptual", "unitScaleJudgeTeen", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "claim" }, promptText: doorPhr()(nameAt(i * 3 + 3), obj, v, unit), truth: ok },
      })
    );
  });
  const gapReasonPhr = rotor([
    (nm, a, b) => `${nm}'s plant grew from ${a} cm to ${b} cm. Which number sentence finds the growth?`,
    (nm, a, b) => `The vine stretched from ${a} cm to ${b} cm. Which sentence shows how much it grew? ${nm} picks one.`,
  ]);
  [[7, 12], [9, 15], [4, 9], [11, 18], [6, 14], [8, 16], [3, 11], [13, 20], [5, 13], [12, 17], [2, 10], [14, 19], [3, 8], [6, 15], [4, 12], [9, 20]].forEach(([a, b], i) => {
    const good = `${b} - ${a}`;
    items.push(
      item("lengthConvert", "conceptual", "growthSentence", "band1", {
        answer: good,
        choices: shuffled([good, `${b} + ${a}`, `${a} - ${b}`], (seed += 1)),
        display: { measure: { kind: "growth", a, b }, promptText: gapReasonPhr()(nameAt(i * 3 + 5), a, b) },
      })
    );
  });

  // Band 2 — conversion judged and which-is-longer across units.
  const convJudgePhr = rotor([
    (nm, claim) => `${nm} writes: ${claim}. Is ${nm} right?`,
    (nm, claim) => `On the worksheet ${nm} answers ${claim}. Is that right?`,
  ]);
  [["3 m is 300 cm", true], ["3 m is 30 cm", false], ["2 km is 2000 m", true], ["2 km is 200 m", false], ["5 cm is 50 mm", true], ["5 cm is 500 mm", false], ["7 m is 700 cm", true], ["7 m is 70 cm", false], ["4 km is 4000 m", true], ["4 km is 400 m", false], ["9 cm is 90 mm", true], ["9 cm is 9 mm", false], ["6 m is 600 cm", true], ["6 m is 6000 cm", false], ["8 km is 8000 m", true], ["8 km is 800 m", false], ["1 m is 100 cm", true], ["1 m is 1000 cm", false]].forEach(([claim, ok], i) => {
    items.push(
      item("lengthConvert", "conceptual", "convJudgeMid", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "claim" }, promptText: convJudgePhr()(nameAt(i * 3 + 2), claim), truth: ok },
      })
    );
  });
  const crossPhr = rotor([
    (nm, a, b) => `${nm} compares ${a} with ${b}. Which is longer?`,
    (nm, a, b) => `Which stretch is longer, ${a} or ${b}? ${nm} converts to check.`,
  ]);
  const crossLonger = (band, data) =>
    data.forEach(([a, av, b, bv], i) => {
      items.push(
        item("lengthConvert", "conceptual", `crossLonger_${band}`, band, {
          answer: av > bv ? a : b,
          choices: shuffled([a, b], (seed += 1)),
          display: { measure: { kind: "cmp", a: av, b: bv }, promptText: crossPhr()(nameAt(i * 3 + 4), a, b) },
        })
      );
    });
  crossLonger("band2", [
    ["2 m", 200, "150 cm", 150], ["300 cm", 300, "2 m", 200], ["1 km", 1000, "900 m", 900], ["1500 m", 1500, "1 km", 1000],
    ["4 cm", 40, "35 mm", 35], ["55 mm", 55, "5 cm", 50], ["3 m", 300, "280 cm", 280], ["420 cm", 420, "4 m", 400],
    ["2 km", 2000, "1800 m", 1800], ["2500 m", 2500, "2 km", 2000], ["7 cm", 70, "65 mm", 65], ["85 mm", 85, "8 cm", 80],
    ["5 m", 500, "480 cm", 480], ["620 cm", 620, "6 m", 600], ["3 km", 3000, "2900 m", 2900], ["95 mm", 95, "9 cm", 90],
    ["9 m", 900, "870 cm", 870], ["1100 m", 1100, "1 km", 1000],
  ]);

  const factorPickPhr = rotor([
    (nm, from, to) => `To change ${from} into ${to}, what does ${nm} multiply by?`,
    (nm, from, to) => `${nm} converts ${from} to ${to}. Which factor is right?`,
  ]);
  [["metres", "centimetres", 100], ["kilometres", "metres", 1000], ["centimetres", "millimetres", 10], ["metres", "centimetres", 100], ["kilometres", "metres", 1000], ["centimetres", "millimetres", 10], ["metres", "centimetres", 100], ["kilometres", "metres", 1000], ["centimetres", "millimetres", 10], ["metres", "centimetres", 100], ["kilometres", "metres", 1000], ["centimetres", "millimetres", 10], ["metres", "centimetres", 100], ["kilometres", "metres", 1000], ["centimetres", "millimetres", 10]].forEach(([from, to, factor], i) => {
    items.push(
      item("lengthConvert", "conceptual", "factorPickMid", "band2", {
        answer: factor,
        choices: shuffled([10, 100, 1000].filter((v, k, arr) => arr.indexOf(v) === k), (seed += 1)),
        display: { measure: { kind: "factorPick", factor }, promptText: factorPickPhr()(nameAt(i * 3 + 10), from, to) },
      })
    );
  });

  // Band 3 — factor-slip error analysis and unknown-side reasoning.
  const slipPhr = rotor([
    (nm, amount, from, to, said) => `${nm} converts ${amount} ${from} and writes ${said} ${to}. Is ${nm} right?`,
    (nm, amount, from, to, said) => `Converting ${amount} ${from} to ${to}, ${nm} gets ${said}. Is that right?`,
  ]);
  [[3, "m>cm", 300, true], [5, "m>cm", 50, false], [2, "km>m", 2000, true], [4, "km>m", 400, false], [6, "cm>mm", 60, true], [8, "cm>mm", 800, false], [7, "m>cm", 700, true], [9, "m>cm", 90, false], [3, "km>m", 3000, true], [6, "km>m", 600, false], [5, "cm>mm", 50, true], [7, "cm>mm", 7, false], [4, "m>cm", 400, true], [2, "m>cm", 2000, false], [8, "km>m", 8000, true], [9, "km>m", 90000, false], [9, "cm>mm", 90, true], [3, "cm>mm", 3, false]].forEach(([amount, pair, said, ok], i) => {
    const [from, to] = pair.split(">");
    items.push(
      item("lengthConvert", "conceptual", "factorSlipJudge", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "convertSaid", amount, pair, said }, promptText: slipPhr()(nameAt(i * 3 + 6), amount, from, to, said), truth: ok },
      })
    );
  });
  const whichAmountPhr = rotor([
    (nm, total, to, from) => `${nm} needs ? ${from} to make ${total} ${to}. Which amount fits?`,
    (nm, total, to, from) => `How many ${from} make ${total} ${to}? ${nm} picks the amount.`,
  ]);
  [[300, "m>cm"], [2000, "km>m"], [40, "cm>mm"], [700, "m>cm"], [5000, "km>m"], [80, "cm>mm"], [500, "m>cm"], [3000, "km>m"], [60, "cm>mm"], [900, "m>cm"], [7000, "km>m"], [30, "cm>mm"], [400, "m>cm"], [6000, "km>m"], [90, "cm>mm"], [1000, "m>cm"]].forEach(([total, pair], i) => {
    const [from, to] = pair.split(">");
    const right = total / FACTORS[pair];
    items.push(
      item("lengthConvert", "conceptual", "whichAmountBig", "band3", {
        answer: right,
        choices: shuffled([...new Set([right, right * 10, total, right + 1])], (seed += 1)).slice(0, 4),
        display: { measure: { kind: "convertUp", total, pair }, promptText: whichAmountPhr()(nameAt(i * 3 + 8), total, to, from) },
      })
    );
  });

  const mmJudgePhr = rotor([
    (nm, claim) => `${nm} works a two-step conversion and writes: ${claim}. Is ${nm} right?`,
    (nm, claim) => `After converting twice, ${nm} claims ${claim}. Is that right?`,
  ]);
  [["1 m is 1000 mm", true], ["2 m is 2000 mm", true], ["3 m is 300 mm", false], ["4 m is 4000 mm", true], ["5 m is 500 mm", false], ["6 m is 6000 mm", true], ["7 m is 70 mm", false], ["8 m is 8000 mm", true], ["9 m is 900 mm", false], ["2 m is 200 mm", false], ["1 km is 100000 cm", true], ["3 m is 3000 mm", true], ["1 km is 1000 cm", false], ["5 m is 5000 mm", true], ["2 km is 200000 cm", true], ["7 m is 7000 mm", true], ["4 m is 400 mm", false]].forEach(([claim, ok], i) => {
    items.push(
      item("lengthConvert", "conceptual", "twoStepJudgeBig", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "claim" }, promptText: mmJudgePhr()(nameAt(i * 3 + 11), claim), truth: ok },
      })
    );
  });

  return items;
}

/* ================================================================== */
/* massVolumeConvert                                                   */
/* ================================================================== */

export function massVolumeProcedural() {
  const items = [];

  // Band 1 — same-unit mass/volume work (<= 20).
  for (const [a, b] of [[12, 7], [15, 9], [9, 4], [18, 11], [14, 6], [16, 8], [11, 3], [20, 13], [13, 5], [17, 12], [10, 2], [19, 14], [8, 3], [15, 6], [12, 4], [20, 9], [16, 11], [14, 8], [18, 5], [11, 7], [13, 9], [17, 4], [19, 8], [10, 6], [20, 16], [15, 2]]) {
    items.push(
      item("massVolumeConvert", "procedural", "heavierByTeen", "band1", {
        answer: a - b,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: b, target: a }, promptText: `A ${a} kg box and a ${b} kg box. The first is heavier by ? kg` },
      })
    );
  }
  for (const [a, b] of [[8, 7], [12, 5], [6, 9], [14, 3], [10, 8], [7, 11], [15, 4], [9, 6], [13, 2], [5, 12], [11, 9], [16, 3], [4, 13], [10, 5], [8, 9], [17, 2], [6, 12], [14, 5], [9, 10], [12, 6], [3, 15], [11, 4], [16, 4], [7, 8], [13, 6], [5, 14]].slice(0, 26)) {
    items.push(
      item("massVolumeConvert", "procedural", "pourTogether", "band1", {
        answer: a + b,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [a, b] }, promptText: `Pour ${a} L and ${b} L into one tub. The tub holds ? L` },
      })
    );
  }

  // Band 2 — kg->g and L->mL.
  for (const [amount, pair] of [[2, "kg>g"], [3, "kg>g"], [5, "kg>g"], [1, "kg>g"], [4, "L>mL"], [2, "L>mL"], [6, "kg>g"], [3, "L>mL"], [7, "kg>g"], [5, "L>mL"], [8, "kg>g"], [1, "L>mL"], [9, "kg>g"], [6, "L>mL"], [4, "kg>g"], [7, "L>mL"], [10, "kg>g"], [8, "L>mL"], [12, "kg>g"], [9, "L>mL"], [15, "kg>g"], [10, "L>mL"], [11, "kg>g"], [12, "L>mL"], [20, "kg>g"], [15, "L>mL"]]) {
    const [from, to] = pair.split(">");
    items.push(
      item("massVolumeConvert", "procedural", "convertDownMassMid", "band2", {
        answer: amount * FACTORS[pair],
        answerType: "numberPad",
        display: { measure: { kind: "convert", amount, pair }, promptText: `${amount} ${from} = ? ${to}` },
      })
    );
  }

  for (const [L, mL] of [[1, 250], [2, 400], [1, 750], [3, 150], [2, 650], [1, 500], [3, 350], [2, 850], [1, 100], [4, 250], [2, 150], [3, 550], [1, 900], [4, 450], [2, 300], [3, 700], [1, 600], [4, 650], [2, 950], [3, 50], [1, 350], [4, 800], [2, 500], [3, 250], [1, 800], [4, 100]]) {
    items.push(
      item("massVolumeConvert", "procedural", "mixedVolumeMid", "band2", {
        answer: L * 1000 + mL,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [L * 1000, mL] }, promptText: `${L} L ${mL} mL = ? mL` },
      })
    );
  }

  // Band 3 — reverse, mixed, two-step-ish.
  for (const [total, pair] of [[2000, "kg>g"], [3000, "L>mL"], [5000, "kg>g"], [1000, "L>mL"], [4000, "kg>g"], [6000, "L>mL"], [7000, "kg>g"], [8000, "L>mL"], [9000, "kg>g"], [2000, "L>mL"], [3000, "kg>g"], [4000, "L>mL"], [6000, "kg>g"], [5000, "L>mL"], [8000, "kg>g"], [7000, "L>mL"], [1000, "kg>g"], [9000, "L>mL"], [10000, "kg>g"], [12000, "L>mL"], [11000, "kg>g"], [15000, "L>mL"], [13000, "kg>g"], [10000, "L>mL"], [14000, "kg>g"], [20000, "L>mL"]]) {
    const [from, to] = pair.split(">");
    items.push(
      item("massVolumeConvert", "procedural", "convertUpMassBig", "band3", {
        answer: total / FACTORS[pair],
        answerType: "numberPad",
        display: { measure: { kind: "convertUp", total, pair }, promptText: `${total} ${to} = ? ${from}` },
      })
    );
  }
  for (const [kg, g] of [[2, 340], [3, 125], [1, 480], [4, 215], [2, 555], [5, 130], [3, 370], [1, 645], [4, 490], [2, 705], [5, 265], [3, 810], [6, 145], [1, 930], [4, 385], [2, 260], [6, 415], [3, 590], [5, 340], [7, 120], [1, 275], [4, 650], [2, 835], [6, 275], [3, 460], [7, 350]]) {
    items.push(
      item("massVolumeConvert", "procedural", "mixedMassBig", "band3", {
        answer: kg * 1000 + g,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [kg * 1000, g] }, promptText: `${kg} kg ${g} g = ? g` },
      })
    );
  }

  return items;
}

export function massVolumeConceptual() {
  const items = [];
  let seed = 171;

  // Band 1 — heavier/lighter sense and container sense.
  const heavierPhr = rotor([
    (nm, a, b) => `${nm} lifts a ${a} kg bag and a ${b} kg bag. Which bag is heavier?`,
    (nm, a, b) => `Two crates: ${a} kg and ${b} kg. Which crate is heavier? ${nm} checks the labels.`,
  ]);
  [[12, 9], [7, 15], [18, 11], [6, 13], [20, 17], [8, 16], [14, 5], [10, 19], [16, 12], [4, 9], [17, 14], [11, 20], [13, 8], [9, 18], [15, 10], [19, 16], [5, 12], [20, 7]].forEach(([a, b], i) => {
    items.push(
      item("massVolumeConvert", "conceptual", "whichHeavierTeen", "band1", {
        answer: `the ${Math.max(a, b)} kg one`,
        choices: shuffled([`the ${a} kg one`, `the ${b} kg one`], (seed += 1)),
        display: { measure: { kind: "cmp", a, b, pickLarger: true }, promptText: heavierPhr()(nameAt(i * 3 + 1), a, b) },
      })
    );
  });
  const sensePhr = rotor([
    (nm, obj, v, unit) => `${nm} says ${obj} holds about ${v} ${unit}. Is ${nm} right?`,
    (nm, obj, v, unit) => `${nm} guesses ${obj} is about ${v} ${unit}. Does that guess make sense?`,
  ]);
  const B1_SENSE = [["a teaspoon", 5, "mL", true], ["a teaspoon", 5, "L", false], ["a watering can", 5, "L", true], ["a watering can", 5, "mL", false], ["a grape", 5, "g", true], ["a grape", 5, "kg", false], ["a big dog", 20, "kg", true], ["a big dog", 20, "g", false], ["a bag of rice", 2, "kg", true], ["a bag of rice", 2, "g", false], ["a fish tank", 20, "L", true], ["a fish tank", 20, "mL", false], ["a feather", 1, "g", true], ["a feather", 1, "kg", false], ["a swimming pool", 2, "L", false], ["a kitten", 2, "kg", true], ["a soup pot", 4, "L", true], ["a coin", 5, "g", true]];
  B1_SENSE.forEach(([obj, v, unit, ok], i) => {
    items.push(
      item("massVolumeConvert", "conceptual", "massSenseJudgeTeen", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "claim" }, promptText: sensePhr()(nameAt(i * 3 + 3), obj, v, unit), truth: ok },
      })
    );
  });
  const fillPhr = rotor([
    (nm, a, b) => `${nm} fills a ${a} L bucket and a ${b} L bucket. Which bucket holds more water?`,
    (nm, a, b) => `Two jugs on ${nm}'s table: ${a} L and ${b} L. Which jug holds more?`,
  ]);
  [[8, 5], [3, 9], [12, 7], [6, 14], [10, 4], [2, 11], [15, 9], [7, 16], [13, 6], [4, 10], [18, 12], [5, 13], [9, 2], [11, 17], [14, 8], [3, 12]].forEach(([a, b], i) => {
    items.push(
      item("massVolumeConvert", "conceptual", "whichHoldsMoreTeen", "band1", {
        answer: `the ${Math.max(a, b)} L one`,
        choices: shuffled([`the ${a} L one`, `the ${b} L one`], (seed += 1)),
        display: { measure: { kind: "cmp", a, b, pickLarger: true }, promptText: fillPhr()(nameAt(i * 3 + 5), a, b) },
      })
    );
  });

  // Band 2 — conversion judged, cross-unit heavier.
  const convJudgePhr = rotor([
    (nm, claim) => `${nm} writes: ${claim}. Is ${nm} right?`,
    (nm, claim) => `${nm} tells the class: ${claim}. Is that right?`,
  ]);
  [["2 kg is 2000 g", true], ["2 kg is 200 g", false], ["3 L is 3000 mL", true], ["3 L is 300 mL", false], ["5 kg is 5000 g", true], ["5 kg is 500 g", false], ["1 L is 1000 mL", true], ["1 L is 100 mL", false], ["7 kg is 7000 g", true], ["7 kg is 70 g", false], ["4 L is 4000 mL", true], ["4 L is 40000 mL", false], ["6 kg is 6000 g", true], ["6 kg is 60000 g", false], ["9 L is 9000 mL", true], ["9 L is 900 mL", false], ["8 kg is 8000 g", true], ["10 L is 1000 mL", false]].forEach(([claim, ok], i) => {
    items.push(
      item("massVolumeConvert", "conceptual", "convJudgeMassMid", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "claim" }, promptText: convJudgePhr()(nameAt(i * 3 + 2), claim), truth: ok },
      })
    );
  });
  const crossHeavyPhr = rotor([
    (nm, a, b) => `Which is heavier, ${a} or ${b}? ${nm} converts to compare.`,
    (nm, a, b) => `${nm} weighs ${a} against ${b}. Which side is heavier?`,
  ]);
  [["2 kg", 2000, "1500 g", 1500], ["2500 g", 2500, "2 kg", 2000], ["3 kg", 3000, "2800 g", 2800], ["3300 g", 3300, "3 kg", 3000], ["1 kg", 1000, "900 g", 900], ["1200 g", 1200, "1 kg", 1000], ["5 kg", 5000, "4700 g", 4700], ["5400 g", 5400, "5 kg", 5000], ["4 kg", 4000, "3600 g", 3600], ["4800 g", 4800, "4 kg", 4000], ["7 kg", 7000, "6500 g", 6500], ["7700 g", 7700, "7 kg", 7000], ["6 kg", 6000, "5800 g", 5800], ["6200 g", 6200, "6 kg", 6000], ["8 kg", 8000, "7900 g", 7900], ["9100 g", 9100, "9 kg", 9000], ["9 kg", 9000, "8600 g", 8600], ["2 kg", 2000, "1999 g", 1999]].forEach(([a, av, b, bv], i) => {
    items.push(
      item("massVolumeConvert", "conceptual", "crossHeavierMid", "band2", {
        answer: av > bv ? a : b,
        choices: shuffled([a, b], (seed += 1)),
        display: { measure: { kind: "cmp", a: av, b: bv }, promptText: crossHeavyPhr()(nameAt(i * 3 + 4), a, b) },
      })
    );
  });

  const lessMassPhr = rotor([
    (nm, a, b) => `${nm} says ${a} is LESS than ${b}. Is ${nm} right?`,
    (nm, a, b) => `${nm} ranks ${a} below ${b}. Is that right?`,
  ]);
  [["1500 g", 1500, "2 kg", 2000, true], ["2500 g", 2500, "2 kg", 2000, false], ["800 mL", 800, "1 L", 1000, true], ["1300 mL", 1300, "1 L", 1000, false], ["2700 g", 2700, "3 kg", 3000, true], ["3300 g", 3300, "3 kg", 3000, false], ["3600 mL", 3600, "4 L", 4000, true], ["4500 mL", 4500, "4 L", 4000, false], ["4400 g", 4400, "5 kg", 5000, true], ["5600 g", 5600, "5 kg", 5000, false], ["5500 mL", 5500, "6 L", 6000, true], ["6300 mL", 6300, "6 L", 6000, false], ["6800 g", 6800, "7 kg", 7000, true], ["7400 g", 7400, "7 kg", 7000, false], ["7500 mL", 7500, "8 L", 8000, true]].forEach(([a, av, b, bv, truth], i) => {
    items.push(
      item("massVolumeConvert", "conceptual", "lessJudgeMassMid", "band2", {
        answer: truth ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "cmpSaid", a: av, b: bv, saidLarger: false }, promptText: lessMassPhr()(nameAt(i * 3 + 12), a, b), truth },
      })
    );
  });

  // Band 3 — factor slips and pour reasoning.
  const slipPhr = rotor([
    (nm, amount, from, to, said) => `${nm} converts ${amount} ${from} and writes ${said} ${to}. Is ${nm} right?`,
    (nm, amount, from, to, said) => `Turning ${amount} ${from} into ${to}, ${nm} gets ${said}. Is that right?`,
  ]);
  [[2, "kg>g", 2000, true], [3, "kg>g", 300, false], [4, "L>mL", 4000, true], [5, "L>mL", 500, false], [6, "kg>g", 6000, true], [7, "kg>g", 700, false], [8, "L>mL", 8000, true], [9, "L>mL", 90, false], [3, "kg>g", 3000, true], [2, "kg>g", 20000, false], [5, "L>mL", 5000, true], [6, "L>mL", 60000, false], [7, "kg>g", 7000, true], [4, "kg>g", 40, false], [9, "L>mL", 9000, true], [1, "L>mL", 10, false], [1, "kg>g", 1000, true], [8, "kg>g", 80, false]].forEach(([amount, pair, said, ok], i) => {
    const [from, to] = pair.split(">");
    items.push(
      item("massVolumeConvert", "conceptual", "factorSlipMassJudge", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "convertSaid", amount, pair, said }, promptText: slipPhr()(nameAt(i * 3 + 6), amount, from, to, said), truth: ok },
      })
    );
  });
  const fitPhr = rotor([
    (nm, need, have) => `A recipe needs ${need} mL of milk. ${nm}'s carton holds ${have} L. Is there enough milk?`,
    (nm, need, have) => `${nm} must pour ${need} mL, and the ${have} L bottle is full. Does the bottle hold enough?`,
  ]);
  [[1500, 2, true], [2500, 2, false], [800, 1, true], [1200, 1, false], [2800, 3, true], [3400, 3, false], [3700, 4, true], [4600, 4, false], [900, 1, true], [1050, 1, false], [4800, 5, true], [5300, 5, false], [1900, 2, true], [2100, 2, false], [5600, 6, true], [6800, 6, false], [2900, 3, true], [7500, 7, false]].forEach(([need, have, ok], i) => {
    items.push(
      item("massVolumeConvert", "conceptual", "enoughVolumeJudge", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "enough", need, haveSmall: have * 1000 }, promptText: fitPhr()(nameAt(i * 3 + 8), need, have), truth: ok },
      })
    );
  });

  const heaviestSaidPhr = rotor([
    (nm, x, a, b, c) => `Of ${a}, ${b}, and ${c}, ${nm} calls ${x} the heaviest. Is ${nm} right?`,
    (nm, x, a, b, c) => `${nm} weighs ${a}, ${b}, ${c} and crowns ${x} the heaviest. Is that right?`,
  ]);
  [["2 kg", 2000, "1800 g", 1800, "2100 g", 2100, "2 kg", false], ["3 kg", 3000, "3200 g", 3200, "2900 g", 2900, "3200 g", true], ["1 kg", 1000, "900 g", 900, "1100 g", 1100, "1100 g", true], ["4 kg", 4000, "4300 g", 4300, "3800 g", 3800, "4 kg", false], ["5 kg", 5000, "4800 g", 4800, "5100 g", 5100, "5100 g", true], ["2 kg", 2000, "2200 g", 2200, "1900 g", 1900, "1900 g", false], ["6 kg", 6000, "5900 g", 5900, "6100 g", 6100, "6100 g", true], ["3 kg", 3000, "2800 g", 2800, "3100 g", 3100, "2800 g", false], ["7 kg", 7000, "7200 g", 7200, "6800 g", 6800, "7200 g", true], ["4 kg", 4000, "3900 g", 3900, "4100 g", 4100, "4 kg", false], ["8 kg", 8000, "7800 g", 7800, "8300 g", 8300, "8300 g", true], ["5 kg", 5000, "5200 g", 5200, "4900 g", 4900, "5200 g", true], ["9 kg", 9000, "9100 g", 9100, "8800 g", 8800, "9 kg", false], ["6 kg", 6000, "6200 g", 6200, "5800 g", 5800, "6200 g", true], ["1 kg", 1000, "1200 g", 1200, "800 g", 800, "800 g", false]].forEach(([a, av, b, bv, c, cv, said, truth], i) => {
    items.push(
      item("massVolumeConvert", "conceptual", "heaviestSaidBig", "band3", {
        answer: truth ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "maxSaid", values: [av, bv, cv], labels: [a, b, c], said }, promptText: heaviestSaidPhr()(nameAt(i * 3 + 13), said, a, b, c), truth },
      })
    );
  });

  return items;
}
