/* measurement bank part 2 — benchmarkEstimate, compareOrder,
 * multiStepMeasure cells. See measurementTemplates.js for conventions.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";
import { LEVELS, FACTORS } from "./measurementTemplates.js";

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

/* ================================================================== */
/* benchmarkEstimate                                                   */
/* ================================================================== */

export function benchmarkProcedural() {
  const items = [];

  // Band 1 — magnitude picks between two scales (numbers <= 20 in prompt).
  const magPhr = rotor([
    (obj, v, u1, u2) => `${obj}: about ${v} ${u1} or ${v} ${u2}?`,
    (obj, v, u1, u2) => `Pick the better measure for ${obj}: ${v} ${u1} or ${v} ${u2}?`,
  ]);
  const B1_MAG = [
    ["a pencil", 18, "cm", "m", "cm"], ["a door", 2, "m", "cm", "m"], ["an ant", 4, "mm", "m", "mm"],
    ["a bed", 2, "m", "mm", "m"], ["a book", 20, "cm", "km", "cm"], ["a swing set", 3, "m", "mm", "m"],
    ["a button", 1, "cm", "m", "cm"], ["a slide", 4, "m", "mm", "m"], ["a leaf", 6, "cm", "km", "cm"],
    ["a bridge", 12, "m", "mm", "m"], ["a seed", 2, "mm", "m", "mm"], ["a rug", 2, "m", "km", "m"],
    ["a spoon", 15, "cm", "km", "cm"], ["a flag pole", 6, "m", "cm", "m"], ["a bee", 12, "mm", "m", "mm"],
    ["a park path", 1, "km", "cm", "km"], ["a juice bottle", 1, "L", "mL", "L"], ["a raindrop", 1, "mL", "L", "mL"],
    ["a pumpkin", 5, "kg", "g", "kg"], ["a crayon", 8, "g", "kg", "g"], ["a backpack", 4, "kg", "g", "kg"],
    ["a soup pot", 3, "L", "mL", "L"], ["a marble", 5, "g", "kg", "g"], ["a fish bowl", 4, "L", "mL", "L"],
    ["a watermelon", 6, "kg", "g", "kg"], ].slice(0, 25);
  B1_MAG.forEach(([obj, v, u1, u2, good], i) => {
    items.push(
      item("benchmarkEstimate", "procedural", "magnitudePickTeen", "band1", {
        answer: `${v} ${good}`,
        choices: shuffled([`${v} ${u1}`, `${v} ${u2}`], i + 3),
        display: { measure: { kind: "pickLabel" }, promptText: magPhr()(obj, v, u1, u2) },
      })
    );
  });
  // Benchmark matches: object -> its rough size.
  const benchPhr = rotor([
    (obj) => `About how long is ${obj}?`,
    (obj) => `Which measure fits ${obj} best?`,
  ]);
  const B1_BENCH = [
    ["a paperclip", "3 cm", ["3 m", "3 km", "3 mm"]], ["a fingernail", "1 cm", ["1 m", "1 km", "1 mm"]],
    ["a door's width", "1 m", ["1 cm", "1 km", "1 mm"]], ["a doorway's height", "2 m", ["2 cm", "2 km", "2 mm"]],
    ["a school bus", "10 m", ["10 cm", "10 km", "10 mm"]], ["a walk to the shops", "1 km", ["1 cm", "1 m", "1 mm"]],
    ["a pencil tip", "1 mm", ["1 m", "1 km", "1 cm"]], ["a skateboard", "80 cm", ["80 m", "80 km", "80 mm"]],
    ["a giraffe", "5 m", ["5 cm", "5 km", "5 mm"]], ["a grain of rice", "6 mm", ["6 m", "6 km", "6 cm"]],
    ["a soccer field", "100 m", ["100 cm", "100 km", "100 mm"]], ["a phone", "15 cm", ["15 m", "15 km", "15 mm"]],
    ["a bathtub", "150 L", ["150 mL", "150 kg", "150 g"]],
  ];
  B1_BENCH.forEach(([obj, good, wrong], i) => {
    for (const p of [0, 1]) {
      items.push(
        item("benchmarkEstimate", "procedural", "benchmarkPickTeen", "band1", {
          answer: good,
          choices: shuffled([good, ...wrong], i * 2 + p + 5),
          display: { measure: { kind: "pickLabel" }, promptText: benchPhr()(obj) },
        })
      );
    }
  });

  // Band 2 — round-number estimates typed from context clues.
  const nearPhr = rotor([
    (a, b) => `A rope is a bit longer than ${a} m and a bit shorter than ${b} m. A whole-number estimate = ? m`,
    (a, b) => `The tank holds more than ${a} L but less than ${b} L. The whole number between = ? L`,
  ]);
  for (const [a, b] of [[3, 5], [6, 8], [9, 11], [12, 14], [4, 6], [7, 9], [10, 12], [15, 17], [5, 7], [8, 10], [13, 15], [16, 18], [2, 4], [11, 13], [14, 16], [17, 19], [18, 20], [19, 21], [20, 22], [22, 24], [24, 26], [26, 28], [28, 30], [30, 32], [32, 34], [34, 36]]) {
    items.push(
      item("benchmarkEstimate", "procedural", "betweenEstimateMid", "band2", {
        answer: a + 1,
        answerType: "numberPad",
        display: { counting: { kind: "between", before: a, after: b }, promptText: nearPhr()(a, b) },
      })
    );
  }
  // Round to the nearest ten (cm) drills.
  for (const n of [23, 48, 67, 82, 35, 71, 56, 94, 12, 39, 65, 88, 27, 53, 76, 91, 44, 62, 18, 85, 31, 59, 73, 97, 46, 64]) {
    const rounded = Math.round(n / 10) * 10;
    items.push(
      item("benchmarkEstimate", "procedural", "roundTenMid", "band2", {
        answer: rounded,
        answerType: "numberPad",
        display: { measure: { kind: "roundTen", n }, promptText: `A stick measures ${n} cm. To the nearest ten, that is ? cm` },
      })
    );
  }

  // Band 3 — round to the nearest hundred, and sum-then-estimate.
  for (const n of [234, 481, 672, 828, 351, 719, 564, 947, 128, 393, 655, 882, 273, 536, 764, 915, 442, 621, 187, 858, 316, 592, 731, 976, 468, 649]) {
    const rounded = Math.round(n / 100) * 100;
    items.push(
      item("benchmarkEstimate", "procedural", "roundHundredBig", "band3", {
        answer: rounded,
        answerType: "numberPad",
        display: { measure: { kind: "roundHundred", n }, promptText: `A trail measures ${n} m. To the nearest hundred, that is ? m` },
      })
    );
  }
  for (const [a, b] of [[190, 210], [280, 310], [390, 420], [480, 520], [170, 230], [270, 320], [380, 410], [470, 540], [180, 220], [290, 330], [370, 430], [460, 530], [160, 240], [260, 340], [360, 440], [490, 510], [140, 260], [240, 360], [340, 460], [440, 560], [150, 250], [250, 350], [350, 450], [450, 550], [130, 270], [230, 370]]) {
    const mid = (a + b) / 2;
    items.push(
      item("benchmarkEstimate", "procedural", "midEstimateBig", "band3", {
        answer: mid,
        answerType: "numberPad",
        display: { counting: { kind: "between", before: a, after: b }, promptText: `A path is between ${a} m and ${b} m long. The halfway estimate = ? m` },
      })
    );
  }

  return items;
}

export function benchmarkConceptual() {
  const items = [];
  let seed = 181;

  // Band 1 — sense judgments about picks.
  const judgePhr = rotor([
    (nm, obj, guess) => `${nm} estimates ${obj} at ${guess}. Does that estimate make sense?`,
    (nm, obj, guess) => `${nm} writes "${guess}" next to ${obj}. Is that a sensible estimate?`,
  ]);
  [["a goldfish", "5 cm", true], ["a goldfish", "5 m", false], ["a park bench", "2 m", true], ["a park bench", "2 mm", false], ["a housefly", "8 mm", true], ["a housefly", "8 m", false], ["a kite string", "10 m", true], ["a kite string", "10 mm", false], ["a juice glass", "1 cm", false], ["a hallway", "12 m", true], ["a crumb", "2 mm", true], ["a crumb", "2 km", false], ["a bicycle", "1 m", true], ["a bicycle", "1 km", false], ["a snail", "4 cm", true], ["a snail", "4 m", false], ["a football pitch", "10 cm", false], ["a shoelace", "1 m", true]].forEach(([obj, guess, ok], i) => {
    items.push(
      item("benchmarkEstimate", "conceptual", "estimateJudgeTeen", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "claim" }, promptText: judgePhr()(nameAt(i * 3 + 1), obj, guess), truth: ok },
      })
    );
  });
  const bestToolPhr = rotor([
    (nm, thing) => `${nm} wants to measure ${thing}. Which unit fits best?`,
    (nm, thing) => `To measure ${thing}, which unit should ${nm} use?`,
  ]);
  [["the length of an eyelash", "mm", ["m", "km", "cm"]], ["the width of a desk", "cm", ["km", "mm", "m"]], ["the height of a tree", "m", ["mm", "km", "cm"]], ["the road to the beach", "km", ["mm", "cm", "m"]], ["the mass of a strawberry", "g", ["kg", "L", "mL"]], ["the mass of a bicycle", "kg", ["g", "mL", "L"]], ["the medicine in a dropper", "mL", ["L", "kg", "g"]], ["the water in a paddling pool", "L", ["mL", "g", "kg"]], ["the length of a caterpillar", "cm", ["km", "m", "mm"]], ["the mass of a school bag", "kg", ["g", "mL", "L"]], ["the juice in a tiny cup", "mL", ["L", "kg", "g"]], ["the length of a playground", "m", ["mm", "km", "cm"]], ["the mass of a coin", "g", ["kg", "L", "mL"]], ["the length of a shoe", "cm", ["km", "m", "mm"]], ["the water in a big fish tank", "L", ["mL", "g", "kg"]], ["a trip between two towns", "km", ["mm", "cm", "m"]]].forEach(([thing, good, wrong], i) => {
    items.push(
      item("benchmarkEstimate", "conceptual", "bestUnitPickTeen", "band1", {
        answer: good,
        choices: shuffled([good, ...wrong], (seed += 1)),
        display: { measure: { kind: "pickLabel" }, promptText: bestToolPhr()(nameAt(i * 3 + 3), thing) },
      })
    );
  });
  const closerPhr = rotor([
    (nm, obj, a, b) => `Is ${obj} closer to ${a} or to ${b}? ${nm} thinks about its real size.`,
    (nm, obj, a, b) => `${nm} pictures ${obj}. Which is it closer to: ${a} or ${b}?`,
  ]);
  [["a juice box", "1 L", "10 L", "1 L"], ["a pencil", "20 cm", "2 m", "20 cm"], ["a cat", "4 kg", "4 g", "4 kg"], ["a bath", "2 L", "20 L", "20 L"], ["a door", "2 m", "2 cm", "2 m"], ["an apple", "2 g", "20 kg", "2 g"], ["a spoon", "15 cm", "15 m", "15 cm"], ["a fish tank", "20 L", "1 L", "20 L"], ["a stamp", "2 cm", "2 m", "2 cm"], ["a dog", "20 kg", "1 kg", "20 kg"], ["a straw", "20 cm", "20 mm", "20 cm"], ["a puddle", "2 L", "2 mL", "2 L"], ["a book", "1 kg", "20 kg", "1 kg"]].forEach(([obj, a, b, good], i) => {
    items.push(
      item("benchmarkEstimate", "conceptual", "closerToPickTeen", "band1", {
        answer: good,
        choices: shuffled([a, b], (seed += 1)),
        display: { measure: { kind: "pickLabel" }, promptText: closerPhr()(nameAt(i * 3 + 5), obj, a, b) },
      })
    );
  });
  // pad band1 conceptual to the floor with four more judgments
  [["a ruler", "15 cm", true], ["a ruler", "15 km", false], ["a milk jug", "2 L", true], ["a milk jug", "2 mL", false]].forEach(([obj, guess, ok], i) => {
    items.push(
      item("benchmarkEstimate", "conceptual", "estimateJudgeTeen", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "claim" }, promptText: judgePhr()(nameAt(i * 3 + 12), obj, guess), truth: ok },
      })
    );
  });

  // Band 2 — rounding judged and estimate-vs-exact reasoning.
  const roundJudgePhr = rotor([
    (nm, n, said) => `${nm} rounds ${n} cm to the nearest ten and gets ${said} cm. Is ${nm} right?`,
    (nm, n, said) => `Rounding ${n} cm to the nearest ten, ${nm} writes ${said}. Is that right?`,
  ]);
  [[23, 20, true], [48, 40, false], [67, 70, true], [82, 80, true], [35, 30, false], [71, 70, true], [56, 60, true], [94, 100, false], [12, 10, true], [39, 30, false], [65, 70, true], [88, 90, true], [27, 20, false], [53, 50, true], [76, 80, true], [91, 100, false], [44, 40, true], [62, 70, false]].forEach(([n, said, ok], i) => {
    items.push(
      item("benchmarkEstimate", "conceptual", "roundJudgeMid", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "roundSaid", n, said, place: 10 }, promptText: roundJudgePhr()(nameAt(i * 3 + 2), n, said), truth: ok },
      })
    );
  });
  const estimateWhenPhr = rotor([
    (nm, task, needExact) => `${nm} is ${task}. Does ${nm} need an EXACT measure, or is an estimate enough? ${nm} says an estimate is enough. Is ${nm} right?`,
    (nm, task, needExact) => `While ${task}, ${nm} decides a rough estimate will do. Is that the right call?`,
  ]);
  [["cutting a shelf to fit a gap", true, false], ["guessing how far the park is", false, true], ["measuring medicine for a baby", true, false], ["packing a suitcase under a weight limit", true, false], ["deciding if a couch fits through a door", true, false], ["telling a friend how tall a sunflower grew", false, true], ["mixing juice for a picnic", false, true], ["fitting glass into a window frame", true, false], ["judging how heavy a pumpkin feels", false, true], ["sewing a costume to size", true, false], ["choosing a box for mailing a mug", false, true], ["marking a race finish line at exactly 100 m", true, false], ["filling a watering can for flowers", false, true], ["weighing flour for a bakery order", true, false], ["guessing the length of a slug", false, true], ["lining up a picture frame on a nail", true, false]].forEach(([task, needExact, estOk], i) => {
    items.push(
      item("benchmarkEstimate", "conceptual", "estimateOrExactMid", "band2", {
        answer: estOk ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "claim" }, promptText: estimateWhenPhr()(nameAt(i * 3 + 4), task, needExact), truth: estOk },
      })
    );
  });
  [["a hallway", "9 m", true], ["a hallway", "9 km", false], ["a cherry", "5 g", true], ["a cherry", "5 kg", false], ["a teapot", "1 L", true], ["a teapot", "100 L", false], ["a whiteboard", "2 m", true], ["a whiteboard", "2 cm", false], ["a ladder", "3 m", true], ["a ladder", "30 m", false], ["a soup spoonful", "10 mL", true], ["a soup spoonful", "10 L", false], ["a watermelon", "5 kg", true], ["a watermelon", "50 kg", false], ["a classroom", "9 m", true], ["a classroom", "90 m", false], ["a candle", "15 cm", true], ["a candle", "15 km", false]].forEach(([obj, guess, ok], i) => {
    items.push(
      item("benchmarkEstimate", "conceptual", "estimateJudgeMid", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "claim" }, promptText: judgePhr()(nameAt(i * 3 + 6), obj, guess), truth: ok },
      })
    );
  });

  // Band 3 — rounding to hundreds judged + which-estimate-closest.
  [[234, 200, true], [481, 400, false], [672, 700, true], [828, 800, true], [351, 300, false], [719, 700, true], [564, 600, true], [947, 1000, false], [128, 100, true], [393, 300, false], [655, 700, true], [882, 900, true], [273, 200, false], [536, 500, true], [764, 800, true], [915, 1000, false], [442, 400, true], [621, 700, false]].forEach(([n, said, ok], i) => {
    items.push(
      item("benchmarkEstimate", "conceptual", "roundJudgeBig", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "roundSaid", n, said, place: 100 }, promptText: roundJudgePhr()(nameAt(i * 3 + 3), n, said).replace("nearest ten", "nearest hundred"), truth: ok },
      })
    );
  });
  const closestSumPhr = rotor([
    (nm, a, b) => `${nm} joins a ${a} cm board and a ${b} cm board. Which estimate is closest to the total?`,
    (nm, a, b) => `Two planks, ${a} cm and ${b} cm, laid end to end — which total estimate is closest? ${nm} rounds to check.`,
  ]);
  [[198, 305], [287, 412], [395, 209], [489, 316], [178, 224], [267, 338], [359, 445], [468, 129], [186, 219], [278, 327], [368, 439], [457, 148], [196, 411], [289, 217], [377, 328], [466, 239], [158, 343], [249, 456]].forEach(([a, b], i) => {
    const exact = a + b;
    const good = Math.round(exact / 100) * 100;
    const wrong = [...new Set([good + 100, good - 100, good + 200])];
    items.push(
      item("benchmarkEstimate", "conceptual", "closestSumBig", "band3", {
        answer: good,
        choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
        display: { measure: { kind: "closestSum", a, b }, promptText: closestSumPhr()(nameAt(i * 3 + 5), a, b) },
      })
    );
  });
  [["a stadium field", "100 m", true], ["a stadium field", "100 km", false], ["an elephant", "3000 kg", true], ["an elephant", "3 kg", false], ["a swimming pool", "50000 L", true], ["a swimming pool", "50 L", false], ["a skyscraper", "300 m", true], ["a skyscraper", "300 cm", false], ["a bowling ball", "5 kg", true], ["a bowling ball", "5 g", false], ["a rain barrel", "200 L", true], ["a rain barrel", "200 mL", false], ["a city block", "100 m", true], ["a city block", "1 m", false], ["a whale", "30000 kg", true], ["a whale", "30 kg", false]].forEach(([obj, guess, ok], i) => {
    items.push(
      item("benchmarkEstimate", "conceptual", "estimateJudgeBig", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "claim" }, promptText: judgePhr()(nameAt(i * 3 + 7), obj, guess), truth: ok },
      })
    );
  });

  return items;
}

/* ================================================================== */
/* compareOrder                                                        */
/* ================================================================== */

export function compareOrderProcedural() {
  const items = [];

  // Band 1 — same-unit compares and differences.
  const cmpPhr = rotor([
    (a, b, u) => `Which is more: ${a} ${u} or ${b} ${u}?`,
    (a, b, u) => `${a} ${u} or ${b} ${u} — pick the larger measure.`,
  ]);
  const B1_CMP = [
    [12, 9, "cm"], [7, 15, "cm"], [18, 11, "m"], [6, 13, "m"], [20, 17, "g"], [8, 16, "g"], [14, 5, "kg"], [10, 19, "kg"],
    [16, 12, "L"], [4, 9, "L"], [17, 14, "mL"], [11, 20, "mL"], [13, 8, "mm"], [9, 18, "mm"], [15, 10, "cm"], [19, 16, "m"],
    [5, 12, "g"], [20, 7, "L"], [3, 11, "kg"], [16, 6, "mm"], [2, 13, "cm"], [18, 4, "m"], [7, 17, "g"], [12, 3, "L"],
    [9, 19, "mL"], [14, 2, "kg"],
  ];
  B1_CMP.forEach(([a, b, u], i) => {
    items.push(
      item("compareOrder", "procedural", "sameUnitPickTeen", "band1", {
        answer: `${Math.max(a, b)} ${u}`,
        choices: shuffled([`${a} ${u}`, `${b} ${u}`], i + 3),
        display: { measure: { kind: "cmp", a, b, pickLarger: true }, promptText: cmpPhr()(a, b, u) },
      })
    );
  });
  for (const [a, b, u] of [[15, 8, "cm"], [18, 9, "m"], [12, 5, "g"], [20, 11, "L"], [16, 7, "kg"], [14, 6, "mm"], [19, 12, "cm"], [17, 8, "m"], [13, 4, "g"], [11, 2, "L"], [20, 14, "kg"], [18, 13, "mm"], [16, 9, "cm"], [15, 4, "m"], [19, 6, "g"], [12, 7, "L"], [17, 10, "kg"], [14, 9, "mm"], [20, 5, "cm"], [13, 6, "m"], [18, 7, "g"], [16, 3, "L"], [19, 10, "kg"], [15, 12, "mm"], [20, 8, "m"], [17, 6, "cm"]]) {
    items.push(
      item("compareOrder", "procedural", "differenceTeen", "band1", {
        answer: a - b,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: b, target: a }, promptText: `${a} ${u} is more than ${b} ${u} by ? ${u}` },
      })
    );
  }

  // Band 2 — cross-unit compares (choice).
  const crossPhr = rotor([
    (a, b) => `Which is more: ${a} or ${b}?`,
    (a, b) => `${a} or ${b} — pick the larger measure.`,
  ]);
  const B2_CROSS = [
    ["2 m", 200, "180 cm", 180], ["250 cm", 250, "2 m", 200], ["1 km", 1000, "800 m", 800], ["1300 m", 1300, "1 km", 1000],
    ["3 cm", 30, "25 mm", 25], ["45 mm", 45, "4 cm", 40], ["2 kg", 2000, "1700 g", 1700], ["2400 g", 2400, "2 kg", 2000],
    ["3 L", 3000, "2600 mL", 2600], ["3500 mL", 3500, "3 L", 3000], ["4 m", 400, "370 cm", 370], ["430 cm", 430, "4 m", 400],
    ["5 kg", 5000, "4400 g", 4400], ["5600 g", 5600, "5 kg", 5000], ["6 L", 6000, "5800 mL", 5800], ["6300 mL", 6300, "6 L", 6000],
    ["2 km", 2000, "1600 m", 1600], ["2700 m", 2700, "2 km", 2000], ["7 cm", 70, "62 mm", 62], ["88 mm", 88, "8 cm", 80],
    ["7 kg", 7000, "6900 g", 6900], ["7100 g", 7100, "7 kg", 7000], ["8 L", 8000, "7500 mL", 7500], ["8800 mL", 8800, "8 L", 8000],
    ["9 m", 900, "860 cm", 860], ["940 cm", 940, "9 m", 900],
  ];
  B2_CROSS.forEach(([a, av, b, bv], i) => {
    items.push(
      item("compareOrder", "procedural", "crossUnitPickMid", "band2", {
        answer: av > bv ? a : b,
        choices: shuffled([a, b], i + 5),
        display: { measure: { kind: "cmp", a: av, b: bv }, promptText: crossPhr()(a, b) },
      })
    );
  });

  for (const [a, b, u] of [[84, 47, "cm"], [72, 35, "cm"], [91, 58, "m"], [63, 26, "m"], [95, 49, "g"], [82, 37, "g"], [77, 44, "kg"], [68, 23, "kg"], [86, 51, "L"], [74, 39, "L"], [93, 66, "mL"], [81, 28, "mL"], [79, 42, "mm"], [67, 34, "mm"], [88, 55, "cm"], [96, 61, "m"], [73, 46, "g"], [85, 32, "L"], [92, 57, "kg"], [64, 29, "mm"], [87, 43, "cm"], [76, 31, "m"], [94, 69, "g"], [83, 48, "L"], [71, 36, "mL"], [89, 52, "kg"]]) {
    items.push(
      item("compareOrder", "procedural", "differenceMid", "band2", {
        answer: a - b,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: b, target: a }, promptText: `${a} ${u} is more than ${b} ${u} by ? ${u}` },
      })
    );
  }

  // Band 3 — order three measures (pick the longest / heaviest).
  const longestPhr = rotor([
    (a, b, c) => `Which is the longest: ${a}, ${b}, or ${c}?`,
    (a, b, c) => `Of ${a}, ${b}, and ${c}, pick the longest.`,
  ]);
  const B3_TRIPLE = [
    ["2 m", 200, "180 cm", 180, "1500 mm", 150], ["3 km", 3000, "2800 m", 2800, "2900 m", 2900],
    ["4 m", 400, "4200 mm", 420, "410 cm", 410], ["1 km", 1000, "950 m", 950, "99000 cm", 990],
    ["5 cm", 50, "48 mm", 48, "4 cm", 40], ["6 m", 600, "590 cm", 590, "6100 mm", 610],
    ["2 kg", 2000, "1900 g", 1900, "2100 g", 2100], ["3 L", 3000, "3200 mL", 3200, "2900 mL", 2900],
    ["7 m", 700, "710 cm", 710, "6900 mm", 690], ["8 km", 8000, "7900 m", 7900, "8100 m", 8100],
    ["9 cm", 90, "88 mm", 88, "93 mm", 93], ["4 kg", 4000, "4100 g", 4100, "3900 g", 3900],
    ["5 L", 5000, "5300 mL", 5300, "4800 mL", 4800], ["6 km", 6000, "6200 m", 6200, "5900 m", 5900],
    ["3 m", 300, "310 cm", 310, "2900 mm", 290], ["7 kg", 7000, "6800 g", 6800, "7200 g", 7200],
    ["8 L", 8000, "8100 mL", 8100, "7900 mL", 7900], ["2 cm", 20, "22 mm", 22, "19 mm", 19],
    ["9 km", 9000, "9100 m", 9100, "8900 m", 8900], ["1 m", 100, "120 cm", 120, "900 mm", 90],
    ["4 km", 4000, "4300 m", 4300, "3800 m", 3800], ["5 kg", 5000, "5100 g", 5100, "4900 g", 4900],
    ["6 cm", 60, "63 mm", 63, "58 mm", 58], ["7 L", 7000, "7300 mL", 7300, "6800 mL", 6800],
    ["8 m", 800, "830 cm", 830, "7700 mm", 770], ["9 kg", 9000, "9200 g", 9200, "8700 g", 8700],
  ];
  B3_TRIPLE.forEach(([a, av, b, bv, c, cv], i) => {
    const best = av >= bv && av >= cv ? a : bv >= cv ? b : c;
    items.push(
      item("compareOrder", "procedural", "pickLongestBig", "band3", {
        answer: best,
        choices: shuffled([a, b, c], i + 7),
        display: { measure: { kind: "cmp3", values: [av, bv, cv] }, promptText: longestPhr()(a, b, c) },
      })
    );
  });

  for (const [m, cm] of [[3, 250], [4, 320], [2, 140], [5, 430], [3, 180], [6, 510], [4, 260], [7, 620], [5, 340], [2, 60], [8, 710], [6, 450], [3, 90], [9, 840], [7, 530], [4, 170], [8, 640], [5, 280], [9, 760], [6, 380], [2, 110], [7, 460], [3, 220], [8, 550], [4, 30], [9, 680]]) {
    items.push(
      item("compareOrder", "procedural", "diffAfterConvertBig", "band3", {
        answer: m * 100 - cm,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: cm, target: m * 100 }, promptText: `${m} m is longer than ${cm} cm by ? cm` },
      })
    );
  }

  return items;
}

export function compareOrderConceptual() {
  const items = [];
  let seed = 191;

  // Band 1 — transitive and unit-anchored reasoning.
  const transPhr = rotor([
    (nm, x, y, z) => `${nm} knows the ${x} is longer than the ${y}, and the ${y} is longer than the ${z}. Which is the longest of the three?`,
    (nm, x, y, z) => `The ${x} beats the ${y} in length, and the ${y} beats the ${z}. ${nm} lines them up. Which one is longest?`,
  ]);
  [["rope", "scarf", "ribbon"], ["snake", "lizard", "worm"], ["slide", "bench", "stool"], ["ladder", "broom", "spoon"], ["canoe", "sled", "skate"], ["train", "truck", "cart"], ["river", "creek", "puddle"], ["pole", "stick", "twig"], ["banner", "flag", "badge"], ["scarf", "sock", "button"], ["board", "book", "card"], ["hose", "leash", "shoelace... wait", ""], ["path", "porch", "step"], ["kayak", "surfboard", "skateboard"], ["fence", "gate", "latch"], ["dragon kite", "paper plane", "pebble"]].slice(0, 16).map((t) => t.slice(0, 3)).forEach(([x, y, z], i) => {
    items.push(
      item("compareOrder", "conceptual", "transitiveTeen", "band1", {
        answer: `the ${x}`,
        choices: shuffled([`the ${x}`, `the ${y}`, `the ${z}`], (seed += 1)),
        display: { measure: { kind: "pickLabel" }, promptText: transPhr()(nameAt(i * 3 + 1), x, y, z) },
      })
    );
  });
  const judgeCmpPhr = rotor([
    (nm, a, b, u) => `${nm} says ${a} ${u} is more than ${b} ${u}. Is ${nm} right?`,
    (nm, a, b, u) => `${nm} claims the ${a} ${u} side beats the ${b} ${u} side. Is that right?`,
  ]);
  [[12, 9, "cm", true], [7, 15, "cm", false], [18, 11, "m", true], [6, 13, "m", false], [20, 17, "g", true], [8, 16, "g", false], [14, 5, "kg", true], [10, 19, "kg", false], [16, 12, "L", true], [4, 9, "L", false], [17, 14, "mL", true], [11, 20, "mL", false], [13, 8, "mm", true], [9, 18, "mm", false], [15, 10, "cm", true], [16, 19, "m", false], [12, 5, "g", true], [7, 20, "L", false]].forEach(([a, b, u, ok], i) => {
    items.push(
      item("compareOrder", "conceptual", "cmpJudgeTeen", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "cmpSaid", a, b, saidLarger: true }, promptText: judgeCmpPhr()(nameAt(i * 3 + 3), a, b, u), truth: ok },
      })
    );
  });
  const tallerPhr = rotor([
    (nm, x, dx, y, dy) => `The ${x} is ${dx} cm tall and the ${y} is ${dy} cm tall. Which is shorter? ${nm} checks.`,
    (nm, x, dx, y, dy) => `${nm} measures the ${x} at ${dx} cm and the ${y} at ${dy} cm. Which one is shorter?`,
  ]);
  [["fern", 12, "cactus", 9], ["tulip", 7, "daisy", 15], ["sprout", 3, "sapling", 18], ["mushroom", 6, "sunflower", 20], ["herb", 8, "bush", 16], ["seedling", 4, "reed", 14], ["clover", 5, "lily", 13], ["moss", 2, "vine", 19], ["daffodil", 11, "rose", 17], ["weed", 9, "corn stalk", 20], ["basil", 10, "lavender", 6], ["mint", 13, "sage", 7], ["ivy", 15, "dandelion", 8], ["poppy", 14, "thistle", 5], ["orchid", 18, "pansy", 4], ["bamboo", 20, "buttercup", 3]].forEach(([x, dx, y, dy], i) => {
    const shorter = dx < dy ? `the ${x}` : `the ${y}`;
    items.push(
      item("compareOrder", "conceptual", "whichShorterTeen", "band1", {
        answer: shorter,
        choices: shuffled([`the ${x}`, `the ${y}`], (seed += 1)),
        display: { measure: { kind: "cmp", a: dx, b: dy, pickLarger: false }, promptText: tallerPhr()(nameAt(i * 3 + 5), x, dx, y, dy) },
      })
    );
  });

  // Band 2 — the bigger-number trap across units.
  const trapPhr = rotor([
    (nm, a, b) => `${nm} says ${a} must be more than ${b} because its number is bigger. Is ${nm} right?`,
    (nm, a, b) => `Since the number is bigger, ${nm} claims ${a} beats ${b}. Is that right?`,
  ]);
  [["300 cm", 300, "2 m", 200, true], ["150 cm", 150, "2 m", 200, false], ["1800 m", 1800, "1 km", 1000, true], ["900 m", 900, "1 km", 1000, false], ["45 mm", 45, "5 cm", 50, false], ["65 mm", 65, "6 cm", 60, true], ["2500 g", 2500, "2 kg", 2000, true], ["1500 g", 1500, "2 kg", 2000, false], ["3400 mL", 3400, "3 L", 3000, true], ["2600 mL", 2600, "3 L", 3000, false], ["420 cm", 420, "4 m", 400, true], ["380 cm", 380, "4 m", 400, false], ["5600 g", 5600, "5 kg", 5000, true], ["4300 g", 4300, "5 kg", 5000, false], ["6500 mL", 6500, "6 L", 6000, true], ["5500 mL", 5500, "6 L", 6000, false], ["95 mm", 95, "9 cm", 90, true], ["82 mm", 82, "9 cm", 90, false]].forEach(([a, av, b, bv, truth], i) => {
    items.push(
      item("compareOrder", "conceptual", "bigNumberTrapMid", "band2", {
        answer: truth ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "cmpSaid", a: av, b: bv, saidLarger: true }, promptText: trapPhr()(nameAt(i * 3 + 2), a, b), truth },
      })
    );
  });
  const middlePhr = rotor([
    (nm, a, b, c) => `${nm} orders ${a}, ${b}, and ${c} from shortest to longest. Which one lands in the MIDDLE?`,
    (nm, a, b, c) => `Sorting ${a}, ${b}, and ${c} by size, which is the middle measure? ${nm} converts first.`,
  ]);
  [["2 m", 200, "150 cm", 150, "3 m", 300], ["1 km", 1000, "800 m", 800, "1200 m", 1200], ["4 cm", 40, "35 mm", 35, "5 cm", 50], ["2 kg", 2000, "1500 g", 1500, "3 kg", 3000], ["3 L", 3000, "2500 mL", 2500, "4 L", 4000], ["5 m", 500, "450 cm", 450, "6 m", 600], ["2 km", 2000, "1700 m", 1700, "2300 m", 2300], ["7 cm", 70, "65 mm", 65, "8 cm", 80], ["4 kg", 4000, "3600 g", 3600, "5 kg", 5000], ["6 L", 6000, "5500 mL", 5500, "7 L", 7000], ["3 m", 300, "280 cm", 280, "330 cm", 330], ["8 cm", 80, "85 mm", 85, "7 cm", 70], ["5 kg", 5000, "5200 g", 5200, "4800 g", 4800], ["2 L", 2000, "2200 mL", 2200, "1800 mL", 1800], ["9 m", 900, "870 cm", 870, "9300 mm", 930], ["6 km", 6000, "5800 m", 5800, "6100 m", 6100]].forEach(([a, av, b, bv, c, cv], i) => {
    const arr = [[a, av], [b, bv], [c, cv]].sort((x, y) => x[1] - y[1]);
    items.push(
      item("compareOrder", "conceptual", "middleMeasureMid", "band2", {
        answer: arr[1][0],
        choices: shuffled([a, b, c], (seed += 1)),
        display: { measure: { kind: "cmp3mid", values: [av, bv, cv] }, promptText: middlePhr()(nameAt(i * 3 + 4), a, b, c) },
      })
    );
  });

  const lessJudgePhr = rotor([
    (nm, a, b) => `${nm} says ${a} is LESS than ${b}. Is ${nm} right?`,
    (nm, a, b) => `${nm} ranks ${a} below ${b}. Is that right?`,
  ]);
  [["150 cm", 150, "2 m", 200, true], ["300 cm", 300, "2 m", 200, false], ["900 m", 900, "1 km", 1000, true], ["1800 m", 1800, "1 km", 1000, false], ["45 mm", 45, "5 cm", 50, true], ["65 mm", 65, "6 cm", 60, false], ["1500 g", 1500, "2 kg", 2000, true], ["2500 g", 2500, "2 kg", 2000, false], ["2600 mL", 2600, "3 L", 3000, true], ["3400 mL", 3400, "3 L", 3000, false], ["380 cm", 380, "4 m", 400, true], ["420 cm", 420, "4 m", 400, false], ["4300 g", 4300, "5 kg", 5000, true], ["5600 g", 5600, "5 kg", 5000, false], ["5500 mL", 5500, "6 L", 6000, true], ["6500 mL", 6500, "6 L", 6000, false], ["82 mm", 82, "9 cm", 90, true]].forEach(([a, av, b, bv, truth], i) => {
    items.push(
      item("compareOrder", "conceptual", "lessJudgeMid", "band2", {
        answer: truth ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "cmpSaid", a: av, b: bv, saidLarger: false }, promptText: lessJudgePhr()(nameAt(i * 3 + 8), a, b), truth },
      })
    );
  });

  // Band 3 — near-tie compares and equality traps.
  const tiePhr = rotor([
    (nm, a, b) => `${nm} says ${a} and ${b} are exactly the same length. Is ${nm} right?`,
    (nm, a, b) => `${nm} calls ${a} and ${b} equal. Is that right?`,
  ]);
  [["2 m", 200, "200 cm", 200, true], ["3 m", 300, "330 cm", 330, false], ["1 km", 1000, "1000 m", 1000, true], ["2 km", 2000, "2100 m", 2100, false], ["5 cm", 50, "50 mm", 50, true], ["6 cm", 60, "66 mm", 66, false], ["4 kg", 4000, "4000 g", 4000, true], ["5 kg", 5000, "5500 g", 5500, false], ["7 L", 7000, "7000 mL", 7000, true], ["8 L", 8000, "8800 mL", 8800, false], ["9 m", 900, "900 cm", 900, true], ["1 m", 100, "110 cm", 110, false], ["3 kg", 3000, "3000 g", 3000, true], ["6 kg", 6000, "6600 g", 6600, false], ["2 L", 2000, "2000 mL", 2000, true], ["4 L", 4000, "4400 mL", 4400, false], ["8 cm", 80, "80 mm", 80, true], ["7 km", 7000, "7700 m", 7700, false]].forEach(([a, av, b, bv, truth], i) => {
    items.push(
      item("compareOrder", "conceptual", "equalTrapBig", "band3", {
        answer: truth ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "eqSaid", a: av, b: bv }, promptText: tiePhr()(nameAt(i * 3 + 6), a, b), truth },
      })
    );
  });
  const shortestPhr = rotor([
    (nm, a, b, c) => `Which is the SHORTEST: ${a}, ${b}, or ${c}? ${nm} converts everything first.`,
    (nm, a, b, c) => `${nm} hunts for the smallest of ${a}, ${b}, and ${c}. Which is it?`,
  ]);
  [["2 m", 200, "180 cm", 180, "2100 mm", 210], ["3 km", 3000, "3200 m", 3200, "2900 m", 2900], ["5 cm", 50, "48 mm", 48, "52 mm", 52], ["2 kg", 2000, "2100 g", 2100, "1900 g", 1900], ["4 L", 4000, "3800 mL", 3800, "4200 mL", 4200], ["6 m", 600, "610 cm", 610, "5900 mm", 590], ["1 km", 1000, "990 m", 990, "1010 m", 1010], ["8 cm", 80, "83 mm", 83, "78 mm", 78], ["5 kg", 5000, "4900 g", 4900, "5100 g", 5100], ["7 L", 7000, "7100 mL", 7100, "6900 mL", 6900], ["9 m", 900, "890 cm", 890, "9100 mm", 910], ["4 km", 4000, "4100 m", 4100, "3900 m", 3900], ["3 cm", 30, "32 mm", 32, "28 mm", 28], ["6 kg", 6000, "6100 g", 6100, "5900 g", 5900], ["2 L", 2000, "1900 mL", 1900, "2100 mL", 2100], ["7 m", 700, "690 cm", 690, "7100 mm", 710]].forEach(([a, av, b, bv, c, cv], i) => {
    const arr = [[a, av], [b, bv], [c, cv]].sort((x, y) => x[1] - y[1]);
    items.push(
      item("compareOrder", "conceptual", "pickShortestBig", "band3", {
        answer: arr[0][0],
        choices: shuffled([a, b, c], (seed += 1)),
        display: { measure: { kind: "cmp3min", values: [av, bv, cv] }, promptText: shortestPhr()(nameAt(i * 3 + 8), a, b, c) },
      })
    );
  });

  const longestSaidPhr = rotor([
    (nm, x, a, b, c) => `Of ${a}, ${b}, and ${c}, ${nm} calls ${x} the longest. Is ${nm} right?`,
    (nm, x, a, b, c) => `${nm} lines up ${a}, ${b}, ${c} and crowns ${x} the longest. Is that right?`,
  ]);
  [["2 m", 200, "180 cm", 180, "2100 mm", 210, "2 m", false], ["3 km", 3000, "3200 m", 3200, "2900 m", 2900, "3200 m", true], ["5 cm", 50, "48 mm", 48, "52 mm", 52, "52 mm", true], ["2 kg", 2000, "2100 g", 2100, "1900 g", 1900, "2 kg", false], ["4 L", 4000, "3800 mL", 3800, "4200 mL", 4200, "4200 mL", true], ["6 m", 600, "610 cm", 610, "5900 mm", 590, "6 m", false], ["1 km", 1000, "990 m", 990, "1010 m", 1010, "1010 m", true], ["8 cm", 80, "83 mm", 83, "78 mm", 78, "83 mm", true], ["5 kg", 5000, "4900 g", 4900, "5100 g", 5100, "4900 g", false], ["7 L", 7000, "7100 mL", 7100, "6900 mL", 6900, "7100 mL", true], ["9 m", 900, "890 cm", 890, "9100 mm", 910, "890 cm", false], ["4 km", 4000, "4100 m", 4100, "3900 m", 3900, "4100 m", true], ["3 cm", 30, "32 mm", 32, "28 mm", 28, "28 mm", false], ["6 kg", 6000, "6100 g", 6100, "5900 g", 5900, "6100 g", true], ["2 L", 2000, "1900 mL", 1900, "2100 mL", 2100, "1900 mL", false], ["7 m", 700, "690 cm", 690, "7100 mm", 710, "7100 mm", true], ["9 kg", 9000, "9200 g", 9200, "8700 g", 8700, "9 kg", false]].forEach(([a, av, b, bv, c, cv, said, truth], i) => {
    items.push(
      item("compareOrder", "conceptual", "longestSaidBig", "band3", {
        answer: truth ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "maxSaid", values: [av, bv, cv], labels: [a, b, c], said }, promptText: longestSaidPhr()(nameAt(i * 3 + 9), said, a, b, c), truth },
      })
    );
  });

  return items;
}

/* ================================================================== */
/* multiStepMeasure                                                    */
/* ================================================================== */

export function multiStepProcedural() {
  const items = [];

  // Band 1 — join and take-away lengths within 20.
  for (const [a, b] of [[7, 6], [8, 9], [5, 12], [6, 11], [9, 4], [12, 7], [3, 14], [8, 5], [11, 6], [4, 13], [7, 9], [15, 3], [6, 8], [9, 8], [12, 5], [2, 16], [10, 7], [5, 9], [13, 4], [8, 8], [14, 5], [7, 11], [9, 9], [6, 13], [11, 8], [4, 15]]) {
    items.push(
      item("multiStepMeasure", "procedural", "joinLengthsTeen", "band1", {
        answer: a + b,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [a, b] }, promptText: `A ${a} cm strip taped to a ${b} cm strip = ? cm` },
      })
    );
  }
  for (const [start, cut] of [[15, 8], [18, 9], [12, 5], [20, 11], [16, 7], [14, 6], [19, 12], [17, 8], [13, 4], [11, 2], [20, 14], [18, 13], [16, 9], [15, 4], [19, 6], [12, 7], [17, 10], [14, 9], [20, 5], [13, 6], [18, 7], [16, 3], [19, 10], [15, 12], [20, 8], [17, 6]]) {
    items.push(
      item("multiStepMeasure", "procedural", "cutLengthTeen", "band1", {
        answer: start - cut,
        answerType: "numberPad",
        display: { counting: { kind: "countBack", start, back: cut }, promptText: `Cut ${cut} cm off a ${start} cm string. ? cm remain` },
      })
    );
  }

  // Band 2 — join then compare / two joins.
  for (const [a, b, c] of [[34, 27, 0], [45, 38, 0], [52, 29, 0], [63, 18, 0], [27, 46, 0], [38, 55, 0], [49, 24, 0], [56, 37, 0], [23, 68, 0], [64, 19, 0], [35, 48, 0], [47, 26, 0], [58, 33, 0], [29, 54, 0], [66, 25, 0], [37, 44, 0], [48, 35, 0], [59, 22, 0], [25, 57, 0], [67, 14, 0], [36, 45, 0], [43, 28, 0], [54, 39, 0], [28, 63, 0], [65, 16, 0], [39, 42, 0]]) {
    items.push(
      item("multiStepMeasure", "procedural", "joinLengthsMid", "band2", {
        answer: a + b,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [a, b] }, promptText: `A ${a} cm board joined to a ${b} cm board = ? cm` },
      })
    );
  }
  for (const [total, used] of [[90, 37], [80, 24], [100, 43], [75, 16], [95, 31], [85, 48], [70, 22], [100, 56], [90, 14], [80, 39], [95, 27], [75, 33], [85, 19], [100, 62], [70, 45], [90, 53], [80, 17], [95, 44], [75, 28], [85, 36], [100, 71], [70, 13], [90, 66], [80, 47], [95, 58], [75, 41]]) {
    items.push(
      item("multiStepMeasure", "procedural", "usedFromRollMid", "band2", {
        answer: total - used,
        answerType: "numberPad",
        display: { counting: { kind: "countBack", start: total, back: used }, promptText: `A ${total} cm roll of tape loses ${used} cm. ? cm remain` },
      })
    );
  }

  // Band 3 — mixed-unit joins and convert-then-add.
  for (const [m, cm1, cm2] of [[1, 30, 45], [2, 25, 38], [1, 55, 27], [3, 15, 49], [2, 45, 36], [1, 65, 18], [3, 35, 52], [2, 5, 67], [1, 75, 41], [4, 25, 33], [2, 65, 24], [3, 55, 16], [1, 85, 29], [4, 45, 12], [2, 85, 43], [3, 5, 78], [1, 95, 22], [4, 65, 31], [2, 35, 59], [3, 75, 14], [5, 15, 26], [1, 45, 63], [5, 35, 17], [2, 55, 48], [4, 5, 84], [3, 25, 66]]) {
    items.push(
      item("multiStepMeasure", "procedural", "convertThenAddBig", "band3", {
        answer: m * 100 + cm1 + cm2,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [m * 100, cm1, cm2] }, promptText: `${m} m ${cm1} cm of rope plus ${cm2} cm more = ? cm` },
      })
    );
  }
  for (const [kg, g1, g2] of [[1, 300, 450], [2, 250, 380], [1, 550, 270], [3, 150, 490], [2, 450, 360], [1, 650, 180], [3, 350, 520], [2, 50, 670], [1, 750, 410], [4, 250, 330], [2, 650, 240], [3, 550, 160], [1, 850, 290], [4, 450, 120], [2, 850, 430], [3, 50, 780], [1, 950, 220], [4, 650, 310], [2, 350, 590], [3, 750, 140], [5, 150, 260], [1, 450, 630], [5, 350, 170], [2, 550, 480], [4, 50, 840], [3, 250, 660]]) {
    items.push(
      item("multiStepMeasure", "procedural", "convertThenAddMassBig", "band3", {
        answer: kg * 1000 + g1 + g2,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [kg * 1000, g1, g2] }, promptText: `${kg} kg ${g1} g of sand plus ${g2} g more = ? g` },
      })
    );
  }

  return items;
}

export function multiStepConceptual() {
  const items = [];
  let seed = 201;

  // Band 1 — which plan / judged joins.
  const planPhr = rotor([
    (nm, a, b) => `${nm} tapes a ${a} cm strip to a ${b} cm strip. Which number sentence finds the new length?`,
    (nm, a, b) => `To find the length of a ${a} cm piece joined with a ${b} cm piece, which sentence should ${nm} use?`,
  ]);
  [[7, 6], [8, 9], [5, 12], [6, 11], [9, 4], [12, 7], [3, 14], [8, 5], [11, 6], [4, 13], [7, 9], [15, 3], [6, 8], [9, 8], [12, 5], [2, 16]].forEach(([a, b], i) => {
    const good = `${a} + ${b}`;
    items.push(
      item("multiStepMeasure", "conceptual", "joinPlanTeen", "band1", {
        answer: good,
        choices: shuffled([good, `${a} - ${b}`, `${b} - ${a}`], (seed += 1)),
        display: { measure: { kind: "plan", op: "+", a, b }, promptText: planPhr()(nameAt(i * 3 + 1), a, b) },
      })
    );
  });
  const judgeJoinPhr = rotor([
    (nm, a, b, said) => `${nm} joins ${a} cm and ${b} cm of ribbon and says the total is ${said} cm. Is ${nm} right?`,
    (nm, a, b, said) => `After taping ${a} cm to ${b} cm, ${nm} measures ${said} cm. Is that right?`,
  ]);
  [[7, 6, 13, true], [8, 9, 16, false], [5, 12, 17, true], [6, 11, 18, false], [9, 4, 13, true], [12, 7, 18, false], [3, 14, 17, true], [8, 5, 14, false], [11, 6, 17, true], [4, 13, 16, false], [7, 9, 16, true], [15, 3, 19, false], [6, 8, 14, true], [9, 8, 18, false], [12, 5, 17, true], [2, 16, 17, false], [10, 7, 17, true], [5, 9, 15, false]].forEach(([a, b, said, ok], i) => {
    items.push(
      item("multiStepMeasure", "conceptual", "joinJudgeTeen", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "joinSaid", a, b, said }, promptText: judgeJoinPhr()(nameAt(i * 3 + 3), a, b, said), truth: ok },
      })
    );
  });
  const cutPlanPhr = rotor([
    (nm, start, cut) => `${nm} snips ${cut} cm off a ${start} cm straw. Which sentence finds what is left?`,
    (nm, start, cut) => `A ${start} cm straw loses ${cut} cm. Which number sentence shows the rest? ${nm} decides.`,
  ]);
  [[15, 8], [18, 9], [12, 5], [20, 11], [16, 7], [14, 6], [19, 12], [17, 8], [13, 4], [11, 2], [20, 14], [18, 13], [16, 9], [15, 4], [19, 6], [12, 7]].forEach(([start, cut], i) => {
    const good = `${start} - ${cut}`;
    items.push(
      item("multiStepMeasure", "conceptual", "cutPlanTeen", "band1", {
        answer: good,
        choices: shuffled([good, `${start} + ${cut}`, `${cut} - ${start}`], (seed += 1)),
        display: { measure: { kind: "plan", op: "-", a: start, b: cut }, promptText: cutPlanPhr()(nameAt(i * 3 + 5), start, cut) },
      })
    );
  });

  // Band 2 — judged two-step results.
  const twoStepJudgePhr = rotor([
    (nm, a, b, c, said) => `${nm} joins boards of ${a} cm and ${b} cm, then cuts off ${c} cm, and reports ${said} cm. Is ${nm} right?`,
    (nm, a, b, c, said) => `After adding ${a} cm and ${b} cm of fabric and trimming ${c} cm, ${nm} counts ${said} cm. Is that right?`,
  ]);
  [[34, 27, 15, 46, true], [45, 38, 20, 60, false], [52, 29, 18, 63, true], [63, 18, 25, 60, false], [27, 46, 12, 61, true], [38, 55, 30, 60, false], [49, 24, 16, 57, true], [56, 37, 40, 50, false], [23, 68, 22, 69, true], [64, 19, 35, 45, false], [35, 48, 14, 69, true], [47, 26, 28, 42, false], [58, 33, 26, 65, true], [29, 54, 32, 48, false], [66, 25, 44, 47, true], [37, 44, 24, 54, false], [48, 35, 36, 47, true], [59, 22, 34, 44, false]].forEach(([a, b, c, said, ok], i) => {
    items.push(
      item("multiStepMeasure", "conceptual", "twoStepJudgeMid", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "twoStepSaid", a, b, c, said }, promptText: twoStepJudgePhr()(nameAt(i * 3 + 2), a, b, c, said), truth: ok },
      })
    );
  });
  const stepOrderPhr = rotor([
    (nm, a, b, c) => `${nm} must join ${a} cm and ${b} cm of wire, then remove ${c} cm. Does the answer change if ${nm} removes the ${c} cm FIRST and joins after?`,
    (nm, a, b, c) => `Join ${a} cm and ${b} cm, then cut ${c} cm — or cut first, join after. ${nm} says both give the same length. Is ${nm} right?`,
  ]);
  for (let i = 0; i < 16; i += 1) {
    const [a, b, c] = [[34, 27, 15], [45, 38, 20], [52, 29, 18], [63, 18, 25], [27, 46, 12], [38, 55, 30], [49, 24, 16], [56, 37, 40], [23, 68, 22], [64, 19, 35], [35, 48, 14], [47, 26, 28], [58, 33, 26], [29, 54, 32], [66, 25, 44], [37, 44, 24]][i];
    items.push(
      item("multiStepMeasure", "conceptual", "orderInvarianceMid", "band2", {
        answer: "Yes",
        choices: ["Yes", "No"],
        display: { measure: { kind: "claim" }, promptText: stepOrderPhr()(nameAt(i * 3 + 4), a, b, c), truth: true },
      })
    );
  }
  const whichStepPhr = rotor([
    (nm, m, cm) => `${nm} wants ${m} m ${cm} cm in centimetres. Which step comes FIRST?`,
    (nm, m, cm) => `To write ${m} m ${cm} cm as centimetres, what does ${nm} do first?`,
  ]);
  [[1, 30], [2, 25], [1, 55], [3, 15], [2, 45], [1, 65], [3, 35], [2, 5], [1, 75], [4, 25], [2, 65], [3, 55], [1, 85], [4, 45], [2, 85], [3, 5], [1, 95], [4, 65]].forEach(([m, cm], i) => {
    const good = `change ${m} m into centimetres`;
    items.push(
      item("multiStepMeasure", "conceptual", "firstStepPickMid", "band2", {
        answer: good,
        choices: shuffled([good, `add ${m} and ${cm}`, `change ${cm} cm into metres`], (seed += 1)),
        display: { measure: { kind: "pickLabel" }, promptText: whichStepPhr()(nameAt(i * 3 + 6), m, cm) },
      })
    );
  });

  // Band 3 — judged mixed-unit sums (the add-the-numbers slip).
  const mixedJudgePhr = rotor([
    (nm, m, cm, said) => `${nm} converts ${m} m ${cm} cm and writes ${said} cm. Is ${nm} right?`,
    (nm, m, cm, said) => `Turning ${m} m ${cm} cm into centimetres, ${nm} gets ${said}. Is that right?`,
  ]);
  [[2, 40, 240, true], [3, 25, 28, false], [1, 80, 180, true], [4, 15, 19, false], [2, 55, 255, true], [5, 30, 35, false], [3, 70, 370, true], [1, 45, 46, false], [4, 90, 490, true], [2, 35, 37, false], [5, 60, 560, true], [3, 5, 8, false], [1, 95, 195, true], [4, 50, 54, false], [2, 85, 285, true], [5, 10, 15, false], [3, 65, 365, true], [1, 25, 26, false]].forEach(([m, cm, said, ok], i) => {
    items.push(
      item("multiStepMeasure", "conceptual", "mixedSlipJudgeBig", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "mixedSaid", m, cm, said }, promptText: mixedJudgePhr()(nameAt(i * 3 + 3), m, cm, said), truth: ok },
      })
    );
  });
  const leftoverPickPhr = rotor([
    (nm, mTotal, used) => `From a ${mTotal} m roll, ${nm} uses ${used} cm. Which amount is left?`,
    (nm, mTotal, used) => `${nm} cuts ${used} cm from a ${mTotal} m roll of ribbon. How much remains? Pick the amount.`,
  ]);
  [[2, 40], [3, 125], [1, 45], [4, 215], [2, 155], [5, 130], [3, 370], [1, 65], [4, 490], [2, 105], [5, 265], [3, 210], [6, 145], [1, 30], [4, 385], [2, 60], [6, 415], [3, 90]].forEach(([mTotal, used], i) => {
    const right = mTotal * 100 - used;
    items.push(
      item("multiStepMeasure", "conceptual", "rollLeftoverBig", "band3", {
        answer: `${right} cm`,
        choices: shuffled([`${right} cm`, `${mTotal * 100 + used} cm`, `${Math.abs(mTotal - used)} cm`, `${right + 100} cm`], (seed += 1)),
        display: { measure: { kind: "rollLeft", mTotal, used }, promptText: leftoverPickPhr()(nameAt(i * 3 + 5), mTotal, used) },
      })
    );
  });
  const capacityPhr = rotor([
    (nm, L, pour) => `A ${L} L jug is full. ${nm} pours out ${pour} mL. Does MORE than half the jug remain?`,
    (nm, L, pour) => `${nm} tips ${pour} mL out of a full ${L} L jug. Is more than half still inside?`,
  ]);
  [[2, 700], [1, 600], [3, 1800], [2, 1200], [4, 1500], [1, 300], [3, 900], [2, 400], [4, 2500], [1, 700], [3, 2000], [2, 1100], [4, 1200], [1, 200], [3, 1400], [2, 800]].forEach(([L, pour], i) => {
    const truth = L * 1000 - pour > (L * 1000) / 2;
    items.push(
      item("multiStepMeasure", "conceptual", "halfJugJudgeBig", "band3", {
        answer: truth ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { measure: { kind: "halfLeft", L, pour }, promptText: capacityPhr()(nameAt(i * 3 + 7), L, pour), truth },
      })
    );
  });

  return items;
}
