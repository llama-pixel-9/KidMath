/* Deterministic patterns bank items — procedural and conceptual cells for all
 * five subskills (repeatingPattern, arithmeticNext, geometricNext,
 * missingTerm, patternRule).
 *
 * Numeric additive payloads ride op "count" + display.counting claims the
 * countMath gate re-derives: {next} (extend, incl. negative steps), {between}
 * (gap fills, even gaps), {countBack} (what comes first), {gap} (step-of-pair
 * for rule drills). Multiplicative, shape, apply-rule, and parity items carry
 * a display.pattern claim verified by authorPatterns.js extraProblems.
 *
 * Registers: every numeric drill starts "Pattern:" — skipCounting owns
 * "Count by Ns:" and counting owns bare comma runs, so strings stay disjoint.
 * Band-1 prompts stay <= 20 (hard gate). Judged = "Is this right?" Yes/No.
 */

import { rotor, shuffled, NAMES } from "../counting/countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "patterns",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const nameAt = (i) => NAMES[i % NAMES.length];

/* ================================================================== */
/* repeatingPattern — shape/color sequences                            */
/* ================================================================== */

const PAIRS = [
  ["circle", "square"],
  ["red", "blue"],
  ["star", "moon"],
  ["up", "down"],
  ["sun", "cloud"],
  ["heart", "diamond"],
];
const TRIOS = [
  ["circle", "square", "triangle"],
  ["red", "blue", "green"],
  ["star", "moon", "sun"],
];
const ABB = [
  ["red", "red", "blue"],
  ["circle", "circle", "square"],
];
const QUADS = [
  ["circle", "square", "triangle", "heart"],
  ["red", "blue", "green", "red"],
];
const AABB = [
  ["red", "red", "blue", "blue"],
  ["star", "star", "moon", "moon"],
];

const cyc = (core, len) => Array.from({ length: len }, (_, i) => core[i % core.length]);

const extendItem = (family, structureType, band, core, len) => {
  const shown = cyc(core, len);
  const answer = core[len % core.length];
  return item("repeatingPattern", family, structureType, band, {
    answer,
    choices: [...new Set(core)].length >= 2 ? shuffled([...new Set(core)], len + core.length) : null,
    display: { sequence: shown, pattern: { kind: "repeat", core, len }, promptText: `Pattern: ${shown.join(", ")}, ? — what comes next?` },
  });
};

const positionItem = (family, structureType, band, core, pos, phr) => {
  const shown = cyc(core, core.length * 2);
  const answer = core[(pos - 1) % core.length];
  return item("repeatingPattern", family, structureType, band, {
    answer,
    choices: shuffled([...new Set(core)], pos),
    display: { sequence: shown, pattern: { kind: "repeatPos", core, pos }, promptText: phr(shown, pos) },
  });
};

export function repeatingProcedural() {
  const items = [];
  for (const [ci, core] of PAIRS.entries()) {
    for (const len of [4, 5, 6, 7]) items.push(extendItem("procedural", "extendAB", "band1", core, len));
    items.push(
      item("repeatingPattern", "procedural", "afterShape", "band1", {
        answer: core[1],
        choices: shuffled([...core], ci + 2),
        display: { pattern: { kind: "after", core, of: core[0] }, promptText: `Pattern: ${cyc(core, 4).join(", ")}, … Which comes right after ${core[0]}?` },
      })
    );
    items.push(
      item("repeatingPattern", "procedural", "afterShapeB", "band1", {
        answer: core[0],
        choices: shuffled([...core], ci + 5),
        display: { pattern: { kind: "after", core, of: core[1] }, promptText: `Pattern: ${cyc(core, 4).join(", ")}, … Which comes right after ${core[1]}?` },
      })
    );
  }
  for (const core of ABB) for (const len of [6, 7, 8, 9]) items.push(extendItem("procedural", "extendABB", "band1", core, len));
  for (const core of TRIOS.slice(0, 2)) for (const len of [6, 7, 8, 9]) items.push(extendItem("procedural", "extendABCTeen", "band1", core, len));

  for (const core of TRIOS.slice(0, 2)) for (const len of [10, 11]) items.push(extendItem("procedural", "extendABC", "band2", core, len));
  for (const len of [6, 7, 8, 9, 10, 11]) items.push(extendItem("procedural", "extendABC", "band2", TRIOS[2], len));
  for (const core of QUADS) for (const len of [8, 9, 10, 11]) items.push(extendItem("procedural", "extendABCD", "band2", core, len));
  const posPhr = rotor([
    (shown, pos) => `Pattern: ${shown.join(", ")}, … What is shape number ${pos}?`,
    (shown, pos) => `Pattern: ${shown.join(", ")}, … Keep going. Which shape lands at position ${pos}?`,
  ]);
  for (const core of TRIOS) for (const pos of [7, 8, 10, 11]) items.push(positionItem("procedural", "shapeAtPosition", "band2", core, pos, posPhr()));
  for (const core of TRIOS.slice(0, 2)) for (const len of [12, 13]) items.push(extendItem("procedural", "extendABC", "band2", core, len));
  for (const core of QUADS) for (const pos of [9, 12]) items.push(positionItem("procedural", "shapeAtPositionQ2", "band2", core, pos, posPhr()));
  for (const target of QUADS[0]) {
    const idx = QUADS[0].indexOf(target);
    items.push(
      item("repeatingPattern", "procedural", "afterShapeQuad", "band2", {
        answer: QUADS[0][(idx + 1) % 4],
        choices: shuffled([...new Set(QUADS[0])], idx + 7),
        display: { pattern: { kind: "after", core: QUADS[0], of: target }, promptText: `Pattern: ${cyc(QUADS[0], 8).join(", ")}, … Which comes right after ${target}?` },
      })
    );
  }
  for (const [ci, core] of TRIOS.entries()) {
    for (const target of core) {
      const idx = core.indexOf(target);
      items.push(
        item("repeatingPattern", "procedural", "afterShapeTrio", "band2", {
          answer: core[(idx + 1) % core.length],
          choices: shuffled([...core], ci + idx + 3),
          display: { pattern: { kind: "after", core, of: target }, promptText: `Pattern: ${cyc(core, 6).join(", ")}, … Which comes right after ${target}?` },
        })
      );
    }
  }

  for (const core of QUADS) for (const len of [12, 13, 14, 15]) items.push(extendItem("procedural", "extendABCDLong", "band3", core, len));
  for (const core of AABB) for (const len of [8, 9, 10, 11, 12, 13, 14]) items.push(extendItem("procedural", "extendAABB", "band3", core, len));
  for (const core of QUADS) for (const pos of [14, 17, 18, 21]) items.push(positionItem("procedural", "shapeAtPositionQuad", "band3", core, pos, posPhr()));
  for (const core of TRIOS) for (const pos of [13, 15, 17, 19]) items.push(positionItem("procedural", "shapeAtPositionFar", "band3", core, pos, posPhr()));
  const countPhr = rotor([
    (shown, target, upTo) => `Pattern: ${shown.join(", ")}, … How many ${target} shapes are in the first ${upTo}?`,
    (shown, target, upTo) => `Pattern: ${shown.join(", ")}, … If the pattern runs for ${upTo} shapes, how many ${target} shapes does it use?`,
  ]);
  for (const [ci, core] of TRIOS.entries()) {
    for (const upTo of [12, 15, 18]) {
      const target = core[ci % core.length];
      const count = cyc(core, upTo).filter((s) => s === target).length;
      items.push(
        item("repeatingPattern", "procedural", "countShapeInRun", "band3", {
          answer: count,
          answerType: "numberPad",
          display: { pattern: { kind: "countIn", core, target, upTo }, promptText: countPhr()(cyc(core, core.length * 2), target, upTo) },
        })
      );
    }
  }
  return items;
}

export function repeatingConceptual() {
  const items = [];
  let seed = 31;

  const corePhr = rotor([
    (nm, shown) => `${nm} made this pattern: ${shown.join(", ")}. Which part repeats?`,
    (nm, shown) => `${nm}'s pattern goes ${shown.join(", ")}. Which chunk starts over each time?`,
  ]);
  const coreIdentify = (band, cores, reps) =>
    cores.forEach((core, i) => {
      const shown = cyc(core, core.length * reps);
      const answer = core.join(", ");
      const wrong = [
        core.slice(0, core.length - 1).join(", ") || core[0],
        [...core, core[0]].join(", "),
        [...core].reverse().join(", "),
      ].filter((w) => w !== answer);
      items.push(
        item("repeatingPattern", "conceptual", `coreIdentify_${band}`, band, {
          answer,
          choices: shuffled([answer, ...wrong.slice(0, 3)], (seed += 1)),
          display: { sequence: shown, pattern: { kind: "core", core }, promptText: corePhr()(nameAt(i * 3 + seed), shown) },
        })
      );
    });
  coreIdentify("band1", [...PAIRS, ...ABB], 3);
  coreIdentify("band2", [...TRIOS, ...QUADS, ...PAIRS.slice(0, 3), ...AABB, ...ABB], 3);
  coreIdentify("band3", [...QUADS, ...AABB, ...TRIOS, ...ABB.slice(0, 1)], 4);

  const judgePhr = rotor([
    (nm, shown, said) => `${nm} continues the pattern ${shown.join(", ")} with ${said}. Is ${nm} right?`,
    (nm, shown, said) => `The pattern goes ${shown.join(", ")}. ${nm} says ${said} comes next. Is that right?`,
  ]);
  const judgeExtend = (band, cores, lens) =>
    cores.forEach((core, i) =>
      lens.forEach((len, j) => {
        const shown = cyc(core, len);
        const truth = (i + j) % 2 === 0;
        const right = core[len % core.length];
        const said = truth ? right : [...new Set(core)].find((s) => s !== right) || right;
        items.push(
          item("repeatingPattern", "conceptual", `judgeExtend_${band}`, band, {
            answer: truth ? "Yes" : "No",
            choices: ["Yes", "No"],
            display: { sequence: shown, pattern: { kind: "repeat", core, len, said }, promptText: judgePhr()(nameAt(i * 5 + j * 3 + seed), shown, said), truth },
          })
        );
      })
    );
  judgeExtend("band1", PAIRS, [4, 5, 6, 7]);
  judgeExtend("band2", TRIOS, [6, 7, 8, 9, 10, 11]);
  judgeExtend("band3", [...QUADS, ...AABB], [8, 9, 10, 11, 12, 13]);

  const willBePhr = rotor([
    (nm, shown, pos, target) => `${nm} looks at the pattern ${shown.join(", ")}, … Will shape number ${pos} be ${target}?`,
    (nm, shown, pos, target) => `The pattern ${shown.join(", ")} keeps going. ${nm} guesses that position ${pos} holds ${target}. Is ${nm} right?`,
  ]);
  const willBe = (band, cores, positions) =>
    cores.forEach((core, i) =>
      positions.forEach((pos, j) => {
        const shown = cyc(core, core.length * 2);
        const actual = core[(pos - 1) % core.length];
        const truth = (i + j) % 2 === 0;
        const target = truth ? actual : [...new Set(core)].find((s) => s !== actual) || actual;
        items.push(
          item("repeatingPattern", "conceptual", `willBeAt_${band}`, band, {
            answer: truth ? "Yes" : "No",
            choices: ["Yes", "No"],
            display: { sequence: shown, pattern: { kind: "repeatPos", core, pos, target }, promptText: willBePhr()(nameAt(i * 7 + j * 3 + seed), shown, pos, target), truth },
          })
        );
      })
    );
  willBe("band1", PAIRS, [5, 6, 7]);
  willBe("band2", TRIOS, [7, 9, 10, 12, 13, 14, 15]);
  willBe("band3", [...QUADS, ...AABB], [13, 15, 18, 21, 23]);

  return items;
}

/* ================================================================== */
/* arithmeticNext                                                      */
/* ================================================================== */

const seqUp = (start, step, n) => Array.from({ length: n }, (_, i) => start + i * step);

const nextDrill = (structureType, band, start, step) => {
  const seq = seqUp(start, step, 3);
  return item("arithmeticNext", "procedural", structureType, band, {
    answer: start + 3 * step,
    answerType: "numberPad",
    display: { sequence: seq, step, counting: { kind: "next", sequence: seq, step }, promptText: `Pattern: ${seq.join(", ")}, ? — what comes next?` },
  });
};

export function arithmeticProcedural() {
  const items = [];

  // Band 1 — all shown terms <= 20.
  for (const [start, step] of [[2, 2], [3, 2], [1, 3], [2, 3], [4, 2], [1, 4], [3, 4], [2, 5], [5, 2], [4, 3], [1, 5], [6, 2], [5, 3], [3, 5], [7, 2], [2, 4], [6, 3], [4, 4], [8, 2], [1, 2], [5, 4], [4, 5], [7, 3], [9, 2], [6, 4], [5, 5], [8, 3], [10, 2]]) {
    items.push(nextDrill("nextTeen", "band1", start, step));
  }
  for (const [hi, step] of [[20, 2], [19, 3], [18, 2], [17, 3], [20, 4], [16, 2], [19, 4], [15, 3], [20, 5], [14, 2], [18, 5], [16, 4], [13, 3], [20, 3], [12, 2], [17, 5], [15, 4], [11, 3], [19, 2], [18, 4], [14, 3], [16, 5], [13, 4], [12, 3]]) {
    const seq = [hi, hi - step, hi - 2 * step];
    items.push(
      item("arithmeticNext", "procedural", "backTeen", "band1", {
        answer: hi - 3 * step,
        answerType: "numberPad",
        display: { sequence: seq, step: -step, counting: { kind: "next", sequence: seq, step: -step }, promptText: `Pattern: ${seq.join(", ")}, ? — what comes next?` },
      })
    );
  }

  // Band 2.
  for (const [start, step] of [[12, 6], [25, 7], [31, 8], [14, 9], [42, 6], [23, 7], [35, 8], [16, 9], [51, 6], [27, 4], [33, 5], [45, 7], [18, 8], [62, 3], [29, 9], [37, 6], [44, 5], [56, 4], [21, 8], [39, 7]]) {
    items.push(nextDrill("nextMid", "band2", start, step));
  }
  for (const [first, step] of [[23, 6], [35, 7], [41, 8], [27, 9], [52, 6], [33, 7], [45, 8], [26, 4], [61, 5], [38, 6], [47, 7], [55, 3], [29, 8], [64, 9], [31, 4], [43, 5]]) {
    const seq = ["?", first, first + step, first + 2 * step];
    items.push(
      item("arithmeticNext", "procedural", "firstMid", "band2", {
        answer: first - step,
        answerType: "numberPad",
        display: { sequence: seq, step, counting: { kind: "countBack", start: first, back: step }, promptText: `Pattern: ${seq.join(", ")} — what comes first?` },
      })
    );
  }
  for (const [hi, step] of [[80, 6], [95, 7], [72, 8], [88, 9], [64, 5], [91, 6], [77, 7], [83, 8], [69, 4], [96, 9], [58, 6], [74, 5], [87, 3], [66, 7], [92, 4], [79, 9]]) {
    const seq = [hi, hi - step, hi - 2 * step];
    items.push(
      item("arithmeticNext", "procedural", "backMid", "band2", {
        answer: hi - 3 * step,
        answerType: "numberPad",
        display: { sequence: seq, step: -step, counting: { kind: "next", sequence: seq, step: -step }, promptText: `Pattern: ${seq.join(", ")}, ? — what comes next?` },
      })
    );
  }

  // Band 3 — bigger starts and steps, including two-digit steps.
  for (const [start, step] of [[112, 11], [235, 12], [341, 15], [124, 25], [452, 11], [223, 14], [335, 21], [146, 12], [518, 13], [247, 16], [333, 22], [415, 18], [128, 24], [622, 15], [289, 17], [317, 23], [434, 19], [526, 13], [211, 26], [349, 14]]) {
    items.push(nextDrill("nextBig", "band3", start, step));
  }
  for (const [first, step] of [[123, 11], [235, 12], [341, 15], [227, 25], [352, 13], [433, 14], [545, 21], [226, 16], [361, 22], [238, 18], [447, 24], [555, 17], [329, 23], [364, 19], [231, 26], [443, 27]]) {
    const seq = ["?", first, first + step, first + 2 * step];
    items.push(
      item("arithmeticNext", "procedural", "firstBig", "band3", {
        answer: first - step,
        answerType: "numberPad",
        display: { sequence: seq, step, counting: { kind: "countBack", start: first, back: step }, promptText: `Pattern: ${seq.join(", ")} — what comes first?` },
      })
    );
  }
  for (const [hi, step] of [[480, 16], [595, 17], [372, 18], [688, 19], [564, 15], [491, 26], [377, 27], [283, 28], [569, 14], [696, 29], [458, 16], [374, 25], [587, 13], [466, 17], [592, 24], [379, 19]]) {
    const seq = [hi, hi - step, hi - 2 * step];
    items.push(
      item("arithmeticNext", "procedural", "backBig", "band3", {
        answer: hi - 3 * step,
        answerType: "numberPad",
        display: { sequence: seq, step: -step, counting: { kind: "next", sequence: seq, step: -step }, promptText: `Pattern: ${seq.join(", ")}, ? — what comes next?` },
      })
    );
  }

  return items;
}

export function arithmeticConceptual() {
  const items = [];
  let seed = 41;

  const whichPhr = rotor([
    (nm, seq) => `${nm} studies the pattern ${seq.join(", ")}. Which number comes next?`,
    (nm, seq) => `The pattern ${seq.join(", ")} keeps growing the same way. Which number does ${nm} write next?`,
  ]);
  const whichNext = (band, data) =>
    data.forEach(([start, step], i) => {
      const seq = seqUp(start, step, 3);
      const a = start + 3 * step;
      items.push(
        item("arithmeticNext", "conceptual", `whichNext_${band}`, band, {
          answer: a,
          choices: shuffled([a, a + 1, seq[2], a + step], (seed += 1)),
          display: { sequence: seq, counting: { kind: "next", sequence: seq, step }, promptText: whichPhr()(nameAt(i * 3 + seed), seq) },
        })
      );
    });
  whichNext("band1", [[2, 2], [3, 3], [1, 4], [4, 2], [2, 5], [5, 3], [1, 2], [6, 2], [3, 4], [2, 3], [4, 4], [7, 2], [5, 2], [1, 5], [4, 3], [8, 2], [6, 3], [2, 4]]);
  whichNext("band2", [[12, 6], [25, 7], [31, 8], [14, 9], [42, 6], [23, 7], [35, 8], [16, 4], [51, 5], [27, 6], [33, 7], [45, 3], [18, 8], [62, 9], [29, 4], [37, 5], [44, 6], [56, 7]]);
  whichNext("band3", [[112, 11], [235, 12], [341, 15], [124, 25], [452, 11], [223, 14], [335, 21], [146, 12], [518, 13], [247, 16], [333, 22], [415, 18], [128, 24], [622, 15], [289, 17], [317, 23], [434, 19], [526, 13]]);

  const judgePhr = rotor([
    (nm, seq, said) => `${nm} continues the pattern ${seq.join(", ")} with ${said}. Is ${nm} right?`,
    (nm, seq, said) => `After ${seq.join(", ")}, ${nm} writes ${said}. Is that right?`,
  ]);
  const judgeNext = (band, data) =>
    data.forEach(([start, step, ok], i) => {
      const seq = seqUp(start, step, 3);
      const right = start + 3 * step;
      const said = ok ? right : right + (i % 2 === 0 ? 1 : -1);
      items.push(
        item("arithmeticNext", "conceptual", `judgeNext_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { sequence: seq, pattern: { kind: "arith", start, step, said }, promptText: judgePhr()(nameAt(i * 3 + seed), seq, said), truth: ok },
        })
      );
    });
  judgeNext("band1", [[2, 2, true], [3, 3, false], [1, 4, true], [4, 2, false], [2, 5, true], [5, 3, false], [1, 2, true], [6, 2, false], [3, 4, true], [2, 3, false], [4, 4, true], [7, 2, false], [5, 2, true], [1, 5, false], [4, 3, true], [8, 2, false], [6, 3, true], [2, 4, false]]);
  judgeNext("band2", [[12, 6, true], [25, 7, false], [31, 8, true], [14, 9, false], [42, 6, true], [23, 7, false], [35, 8, true], [16, 4, false], [51, 5, true], [27, 6, false], [33, 7, true], [45, 3, false], [18, 8, true], [62, 9, false], [29, 4, true], [37, 5, false], [44, 6, true], [56, 7, false]]);
  judgeNext("band3", [[112, 11, true], [235, 12, false], [341, 15, true], [124, 25, false], [452, 11, true], [223, 14, false], [335, 21, true], [146, 12, false], [518, 13, true], [247, 16, false], [333, 22, true], [415, 18, false], [128, 24, true], [622, 15, false], [289, 17, true], [317, 23, false], [434, 19, true], [526, 13, false]]);

  const fasterPhr = rotor([
    (nm, a, b) => `${nm} compares two patterns. A: ${a.join(", ")}. B: ${b.join(", ")}. Which pattern grows faster?`,
    (nm, a, b) => `Two patterns sit in ${nm}'s notebook — A: ${a.join(", ")} and B: ${b.join(", ")}. Which one grows faster?`,
  ]);
  const faster = (band, data) =>
    data.forEach(([s1, d1, s2, d2], i) => {
      const a = seqUp(s1, d1, 3);
      const b = seqUp(s2, d2, 3);
      items.push(
        item("arithmeticNext", "conceptual", `growsFaster_${band}`, band, {
          answer: d1 > d2 ? "Pattern A" : "Pattern B",
          choices: ["Pattern A", "Pattern B"],
          display: { pattern: { kind: "faster", d1, d2 }, promptText: fasterPhr()(nameAt(i * 3 + seed), a, b) },
        })
      );
    });
  faster("band1", [[2, 5, 3, 2], [1, 2, 2, 4], [3, 3, 1, 5], [2, 2, 4, 3], [1, 4, 5, 2], [3, 5, 2, 3], [4, 2, 1, 3], [2, 4, 3, 5], [5, 3, 2, 2], [1, 5, 4, 4], [3, 2, 2, 5], [4, 3, 1, 2], [2, 3, 5, 5], [6, 4, 3, 3], [1, 3, 2, 2], [4, 5, 6, 2]]);
  faster("band2", [[12, 9, 15, 4], [21, 3, 14, 8], [33, 7, 28, 5], [16, 6, 25, 9], [42, 4, 31, 7], [27, 8, 38, 3], [19, 5, 22, 9], [35, 7, 41, 4], [24, 9, 33, 6], [45, 3, 27, 8], [31, 6, 18, 4], [26, 8, 39, 5], [14, 7, 23, 3], [37, 4, 29, 9], [22, 5, 36, 8], [43, 6, 17, 7]]);
  faster("band3", [[112, 25, 135, 12], [221, 13, 214, 28], [313, 27, 328, 15], [126, 16, 145, 29], [412, 14, 331, 27], [227, 28, 338, 13], [119, 15, 222, 29], [335, 27, 411, 14], [224, 29, 333, 16], [415, 13, 227, 28], [331, 26, 118, 14], [226, 28, 339, 15], [114, 27, 223, 13], [337, 14, 229, 29], [222, 15, 336, 28], [413, 16, 117, 27]]);

  return items;
}

/* ================================================================== */
/* geometricNext                                                       */
/* ================================================================== */

const geoSeq = (start, factor, n) => Array.from({ length: n }, (_, i) => start * factor ** i);

export function geometricProcedural() {
  const items = [];

  const doubleDrill = (structureType, band, start, factor, n) => {
    const seq = geoSeq(start, factor, n);
    return item("geometricNext", "procedural", structureType, band, {
      answer: seq[n - 1] * factor,
      answerType: "numberPad",
      display: { sequence: seq, step: factor, pattern: { kind: "geo", start, factor }, promptText: `Pattern: ${seq.join(", ")}, ? — each term is ${factor} times the one before.` },
    });
  };

  // Band 1 — doubling only, shown terms <= 20. Lengths 2 and 4 only; the
  // three-term doubling runs belong to band 2 (string dedupe across bands).
  for (let s = 1; s <= 10; s += 1) {
    items.push(doubleDrill("doubleTeen", "band1", s, 2, 2));
  }
  for (const s of [1, 2]) {
    items.push(doubleDrill("doubleTeen", "band1", s, 2, 4));
  }
  const halfPhr = (seq) => `Pattern: ${seq.join(", ")}, ? — each term is half the one before.`;
  for (const start of [16, 20, 8, 12]) {
    const seq = [start, start / 2];
    items.push(
      item("geometricNext", "procedural", "halfTeen", "band1", {
        answer: start / 4,
        answerType: "numberPad",
        display: { sequence: seq, pattern: { kind: "geoDiv", start, factor: 2 }, promptText: halfPhr(seq) },
      })
    );
  }
  // Band-1 volume: doubling with an explicit worded rule applied once.
  for (const s of [2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 12, 14, 16, 18, 20, 11, 13, 15, 17, 19, 24, 36, 48, 25, 45, 35, 27, 63, 81, 32, 64, 28]) {
    if (s <= 10) {
      items.push(
        item("geometricNext", "procedural", "doubleOnce", "band1", {
          answer: s * 2,
          answerType: "numberPad",
          display: { pattern: { kind: "geoApply", start: s, factor: 2, times: 1 }, promptText: `Double ${s}. What do you get?` },
        })
      );
    }
  }

  for (const s of [4, 6, 8, 10, 12, 14, 16, 18, 20, 2]) {
    items.push(
      item("geometricNext", "procedural", "halveOnce", "band1", {
        answer: s / 2,
        answerType: "numberPad",
        display: { pattern: { kind: "geoDiv", start: s, factor: 2, terms: 1 }, promptText: `Halve ${s}. What do you get?` },
      })
    );
  }
  for (const s of [1, 2, 3, 4, 5, 6]) {
    items.push(
      item("geometricNext", "procedural", "tripleOnce", "band1", {
        answer: s * 3,
        answerType: "numberPad",
        display: { pattern: { kind: "geoApply", start: s, factor: 3, times: 1 }, promptText: `Triple ${s}. What do you get?` },
      })
    );
  }
  for (const s of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    items.push(
      item("geometricNext", "procedural", "doubleTwice", "band1", {
        answer: s * 4,
        answerType: "numberPad",
        display: { pattern: { kind: "geoApply", start: s, factor: 2, times: 2 }, promptText: `Start at ${s} and double it, 2 times in a row. What do you get?` },
      })
    );
  }

  // Band 2 — x2 and x3 from varied starts.
  for (const [start, factor] of [[3, 2], [5, 2], [7, 2], [2, 3], [3, 3], [4, 3], [6, 2], [9, 2], [5, 3], [11, 2], [8, 2], [6, 3], [12, 2], [7, 3], [10, 2], [2, 2], [9, 3], [13, 2], [8, 3], [4, 2]]) {
    items.push(doubleDrill(`geoNext_${factor}x`, "band2", start, factor, 3));
  }
  for (const start of [96, 88, 72, 64, 56, 48, 40, 80, 104, 120, 112, 128]) {
    const seq = [start, start / 2, start / 4];
    items.push(
      item("geometricNext", "procedural", "halfMid", "band2", {
        answer: start / 8,
        answerType: "numberPad",
        display: { sequence: seq, pattern: { kind: "geoDiv", start, factor: 2, terms: 3 }, promptText: halfPhr(seq) },
      })
    );
  }
  for (const [s, k] of [[6, 2], [8, 2], [12, 2], [7, 3], [9, 3], [15, 2], [11, 3], [13, 3], [14, 2], [16, 2], [18, 2], [12, 3], [17, 2], [19, 2], [21, 2], [23, 2], [15, 3], [22, 2], [25, 2], [24, 3]]) {
    items.push(
      item("geometricNext", "procedural", "multiplyOnce", "band2", {
        answer: s * k,
        answerType: "numberPad",
        display: { pattern: { kind: "geoApply", start: s, factor: k, times: 1 }, promptText: `The rule is: multiply by ${k}. Apply it to ${s}. What do you get?` },
      })
    );
  }

  // Band 3 — x2/x3/x5 and halving chains.
  for (const [start, factor] of [[4, 5], [3, 5], [2, 5], [7, 5], [12, 3], [15, 2], [11, 3], [21, 2], [6, 5], [13, 3], [25, 2], [14, 3], [31, 2], [8, 5], [16, 3], [35, 2], [9, 5], [18, 3], [41, 2], [22, 3]]) {
    items.push(doubleDrill(`geoNextBig_${factor}x`, "band3", start, factor, 3));
  }
  for (const start of [800, 720, 960, 640, 880, 560, 480, 840, 400, 1040, 920, 760]) {
    const seq = [start, start / 2, start / 4];
    items.push(
      item("geometricNext", "procedural", "halfBig", "band3", {
        answer: start / 8,
        answerType: "numberPad",
        display: { sequence: seq, pattern: { kind: "geoDiv", start, factor: 2, terms: 3 }, promptText: halfPhr(seq) },
      })
    );
  }
  for (const [s, k, t] of [[3, 2, 3], [2, 3, 3], [5, 2, 4], [4, 3, 2], [2, 2, 5], [3, 3, 2], [6, 2, 4], [2, 5, 2], [7, 2, 3], [3, 5, 2], [4, 2, 5], [5, 3, 3], [8, 2, 4], [2, 4, 3], [9, 2, 3], [6, 3, 2], [10, 2, 4], [3, 4, 2], [11, 2, 3], [4, 5, 2]]) {
    items.push(
      item("geometricNext", "procedural", "multiplyChain", "band3", {
        answer: s * k ** t,
        answerType: "numberPad",
        display: { pattern: { kind: "geoApply", start: s, factor: k, times: t }, promptText: `Start at ${s} and multiply by ${k}, ${t} times in a row. What do you get?` },
      })
    );
  }

  return items;
}

export function geometricConceptual() {
  const items = [];
  let seed = 51;

  const rulePhr = rotor([
    (nm, seq) => `${nm} wonders how the pattern ${seq.join(", ")} grows. Which rule fits?`,
    (nm, seq) => `Look at ${seq.join(", ")} with ${nm}. Which rule makes this pattern?`,
  ]);
  const rulePick = (band, data) =>
    data.forEach(([start, factor], i) => {
      const seq = geoSeq(start, factor, 3);
      const answer = `multiply by ${factor}`;
      const wrong = [...new Set([`add ${seq[1] - seq[0]}`, `add ${factor}`, `multiply by ${factor + 1}`, `add ${factor + 1}`])].slice(0, 3);
      items.push(
        item("geometricNext", "conceptual", `geoRulePick_${band}`, band, {
          answer,
          choices: shuffled([answer, ...wrong], (seed += 1)),
          display: { sequence: seq, pattern: { kind: "geoRule", start, factor }, promptText: rulePhr()(nameAt(i * 3 + seed), seq) },
        })
      );
    });
  rulePick("band1", [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [1, 3], [2, 3], [1, 4]]);
  rulePick("band2", [[14, 2], [16, 2], [17, 2], [4, 3], [6, 2], [3, 3], [7, 2], [5, 3], [8, 2], [2, 4], [9, 2], [3, 4], [11, 2], [6, 3], [12, 2], [4, 4], [13, 2], [7, 3]]);
  rulePick("band3", [[4, 5], [3, 5], [12, 3], [15, 2], [2, 5], [11, 3], [21, 2], [6, 5], [13, 3], [25, 2], [7, 5], [14, 3], [31, 2], [8, 5], [16, 3], [35, 2], [9, 5], [18, 3]]);

  const addOrMultPhr = rotor([
    (nm, seq) => `${nm} says the pattern ${seq.join(", ")} just adds the same number each time. Is ${nm} right?`,
    (nm, seq) => `Looking at ${seq.join(", ")}, ${nm} claims each jump is the same size. Is that right?`,
  ]);
  const addOrMult = (band, data) =>
    data.forEach(([start, factor, additive], i) => {
      const seq = additive ? seqUp(start, factor, 3) : geoSeq(start, factor, 3);
      items.push(
        item("geometricNext", "conceptual", `addOrMultJudge_${band}`, band, {
          answer: additive ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { sequence: seq, pattern: { kind: "addOrMult", additive }, promptText: addOrMultPhr()(nameAt(i * 3 + seed), seq), truth: additive },
        })
      );
    });
  addOrMult("band1", [[2, 2, false], [3, 4, true], [1, 3, false], [2, 5, true], [4, 2, false], [1, 6, true], [3, 2, false], [5, 3, true], [2, 3, false], [4, 4, true], [1, 2, false], [6, 2, true], [1, 4, false], [3, 5, true], [5, 2, false], [2, 6, true], [4, 3, true], [7, 2, true]]);
  addOrMult("band2", [[3, 2, false], [12, 7, true], [5, 2, false], [21, 8, true], [2, 3, false], [14, 9, true], [4, 3, false], [33, 6, true], [6, 2, false], [16, 7, true], [3, 3, false], [42, 8, true], [7, 2, false], [27, 9, true], [5, 3, false], [19, 6, true], [8, 2, false], [35, 7, true]]);
  addOrMult("band3", [[4, 5, false], [112, 25, true], [12, 3, false], [221, 13, true], [15, 2, false], [313, 27, true], [2, 5, false], [126, 16, true], [11, 3, false], [412, 14, true], [21, 2, false], [227, 28, true], [6, 5, false], [119, 15, true], [13, 3, false], [335, 27, true], [25, 2, false], [224, 29, true]]);

  const doubleJudgePhr = rotor([
    (nm, s, said) => `${nm} says doubling ${s} gives ${said}. Is ${nm} right?`,
    (nm, s, said) => `${nm} doubles ${s} and writes ${said}. Is that right?`,
  ]);
  [[6, 12, true], [7, 15, false], [8, 16, true], [9, 17, false], [4, 8, true], [5, 12, false], [3, 6, true], [10, 19, false], [2, 4, true], [6, 13, false]].forEach(([s, said, ok], i) => {
    items.push(
      item("geometricNext", "conceptual", "doubleJudge", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { pattern: { kind: "doubleSaid", s, said }, promptText: doubleJudgePhr()(nameAt(i * 3 + seed), s, said), truth: ok },
      })
    );
  });

  const nextGeoPhr = rotor([
    (nm, seq, factor) => `${nm} knows each term of ${seq.join(", ")} is ${factor} times the one before. Which number comes next?`,
    (nm, seq, factor) => `The pattern ${seq.join(", ")} multiplies by ${factor} each time. Which number does ${nm} write next?`,
  ]);
  const whichGeoNext = (band, data) =>
    data.forEach(([start, factor], i) => {
      const seq = geoSeq(start, factor, 3);
      const a = seq[2] * factor;
      const additive = seq[2] + (seq[1] - seq[0]);
      items.push(
        item("geometricNext", "conceptual", `whichGeoNext_${band}`, band, {
          answer: a,
          choices: shuffled([...new Set([a, additive, seq[2] + factor, a + factor])], (seed += 1)),
          display: { sequence: seq, pattern: { kind: "geo", start, factor }, promptText: nextGeoPhr()(nameAt(i * 3 + seed), seq, factor) },
        })
      );
    });
  whichGeoNext("band1", [[1, 2], [2, 2], [1, 3], [1, 4], [3, 2], [5, 2], [4, 2], [2, 3], [2, 3], [4, 2], [5, 2], [3, 2], [1, 4], [1, 3], [2, 2], [1, 2]]);
  whichGeoNext("band2", [[14, 2], [16, 2], [17, 2], [4, 3], [6, 2], [3, 3], [7, 2], [5, 3], [8, 2], [2, 4], [9, 2], [3, 4], [11, 2], [6, 3], [12, 2], [13, 2], [4, 4], [7, 3]]);
  whichGeoNext("band3", [[4, 5], [3, 5], [12, 3], [15, 2], [2, 5], [11, 3], [21, 2], [6, 5], [13, 3], [25, 2], [7, 5], [14, 3], [31, 2], [8, 5], [16, 3], [35, 2], [9, 5], [18, 3]]);

  return items;
}
