/* patterns bank part 2 — missingTerm and patternRule cells.
 * See patternsTemplates.js for register and claim conventions.
 */

import { rotor, shuffled, NAMES } from "../counting/countingTemplates.js";
import { LEVELS } from "./patternsTemplates.js";

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
const seqUp = (start, step, n) => Array.from({ length: n }, (_, i) => start + i * step);

/* ================================================================== */
/* missingTerm                                                         */
/* ================================================================== */

const gapDrill = (structureType, band, start, step, gapIdx) => {
  const full = seqUp(start, step, 4);
  const shown = full.map((v, i) => (i === gapIdx ? "?" : v));
  return item("missingTerm", "procedural", structureType, band, {
    answer: full[gapIdx],
    answerType: "numberPad",
    display: {
      sequence: shown,
      step,
      counting: { kind: "between", before: full[gapIdx - 1], after: full[gapIdx + 1] },
      promptText: `Fill the gap: ${shown.join(", ")}.`,
    },
  });
};

const firstDrill = (structureType, band, first, step) => {
  const shown = ["?", first, first + step, first + 2 * step];
  return item("missingTerm", "procedural", structureType, band, {
    answer: first - step,
    answerType: "numberPad",
    display: {
      sequence: shown,
      step,
      counting: { kind: "countBack", start: first, back: step },
      promptText: `Fill the gap: ${shown.join(", ")}.`,
    },
  });
};

export function missingTermProcedural() {
  const items = [];

  // Band 1 — every shown term <= 20.
  for (const [start, step, g] of [[2, 2, 1], [3, 2, 2], [1, 3, 1], [2, 3, 2], [4, 2, 1], [1, 4, 2], [3, 4, 1], [2, 5, 1], [5, 2, 2], [4, 3, 1], [1, 5, 1], [6, 2, 1], [5, 3, 2], [3, 5, 2], [7, 2, 2], [2, 4, 1], [6, 3, 1], [4, 4, 2], [8, 2, 1], [1, 2, 2], [5, 4, 1], [7, 3, 1], [9, 2, 2], [6, 4, 1], [8, 3, 2], [10, 2, 1], [2, 6, 1], [3, 3, 2]]) {
    items.push(gapDrill("gapTeen", "band1", start, step, g));
  }
  for (const [first, step] of [[4, 2], [5, 3], [6, 2], [7, 3], [8, 4], [5, 2], [9, 3], [6, 4], [10, 2], [7, 2], [11, 3], [8, 2], [12, 4], [9, 4], [13, 2], [10, 5], [14, 3], [6, 5], [15, 2], [8, 5], [7, 4], [11, 2], [9, 2], [12, 3]]) {
    items.push(firstDrill("firstTeen", "band1", first, step));
  }

  // Band 2.
  for (const [start, step, g] of [[12, 6, 1], [25, 7, 2], [31, 8, 1], [14, 9, 2], [42, 6, 1], [23, 7, 2], [35, 8, 1], [16, 9, 1], [51, 6, 2], [27, 4, 1], [33, 5, 2], [45, 7, 1], [18, 8, 2], [62, 3, 1], [29, 9, 2], [37, 6, 1], [44, 5, 2], [56, 4, 1], [21, 8, 2], [39, 7, 1], [24, 6, 2], [47, 3, 2], [53, 4, 1], [36, 9, 2], [19, 5, 1], [28, 7, 1]]) {
    items.push(gapDrill("gapMid", "band2", start, step, g));
  }
  for (const [first, step] of [[23, 6], [35, 7], [41, 8], [27, 9], [52, 6], [33, 7], [45, 8], [26, 4], [61, 5], [38, 6], [47, 7], [55, 3], [29, 8], [64, 9], [31, 4], [43, 5], [58, 7], [36, 8], [49, 9], [67, 4], [24, 5], [51, 8], [39, 3], [46, 6], [63, 7], [28, 9]]) {
    items.push(firstDrill("firstMidGap", "band2", first, step));
  }

  // Band 3.
  for (const [start, step, g] of [[112, 11, 1], [235, 12, 2], [341, 15, 1], [124, 25, 2], [452, 11, 1], [223, 14, 2], [335, 21, 1], [146, 12, 2], [518, 13, 1], [247, 16, 2], [333, 22, 1], [415, 18, 2], [128, 24, 1], [622, 15, 2], [289, 17, 1], [317, 23, 2], [434, 19, 1], [526, 13, 2], [211, 26, 1], [349, 14, 2], [136, 27, 1], [253, 28, 2], [364, 29, 1], [441, 21, 2], [157, 22, 1], [268, 23, 2]]) {
    items.push(gapDrill("gapBig", "band3", start, step, g));
  }
  for (const [first, step] of [[123, 11], [235, 12], [341, 15], [227, 25], [352, 13], [433, 14], [545, 21], [226, 16], [361, 22], [238, 18], [447, 24], [555, 17], [329, 23], [364, 19], [231, 26], [443, 27], [126, 28], [257, 29], [338, 12], [449, 11], [162, 13], [273, 14], [384, 15], [495, 16], [116, 17], [217, 18]]) {
    items.push(firstDrill("firstBigGap", "band3", first, step));
  }

  return items;
}

export function missingTermConceptual() {
  const items = [];
  let seed = 61;

  const whichPhr = rotor([
    (nm, shown) => `${nm} sees the pattern ${shown.join(", ")}. Which number fills the gap?`,
    (nm, shown) => `One number of ${nm}'s pattern is hidden: ${shown.join(", ")}. Which number belongs in the gap?`,
  ]);
  const whichFills = (band, data) =>
    data.forEach(([start, step, g], i) => {
      const full = seqUp(start, step, 4);
      const shown = full.map((v, k) => (k === g ? "?" : v));
      const a = full[g];
      items.push(
        item("missingTerm", "conceptual", `whichFills_${band}`, band, {
          answer: a,
          choices: shuffled([...new Set([a, a + 1, a - 1, a + step])], (seed += 1)),
          display: { sequence: shown, counting: { kind: "between", before: full[g - 1], after: full[g + 1] }, promptText: whichPhr()(nameAt(i * 3 + seed), shown) },
        })
      );
    });
  whichFills("band1", [[2, 2, 1], [3, 2, 2], [1, 3, 1], [2, 3, 2], [4, 2, 1], [1, 4, 2], [3, 4, 1], [2, 5, 1], [5, 2, 2], [4, 3, 1], [1, 5, 1], [6, 2, 1], [5, 3, 2], [3, 5, 2], [7, 2, 2], [2, 4, 1], [6, 3, 1], [4, 4, 2]]);
  whichFills("band2", [[12, 6, 1], [25, 7, 2], [31, 8, 1], [14, 9, 2], [42, 6, 1], [23, 7, 2], [35, 8, 1], [16, 9, 1], [51, 6, 2], [27, 4, 1], [33, 5, 2], [45, 7, 1], [18, 8, 2], [62, 3, 1], [29, 9, 2], [37, 6, 1], [44, 5, 2], [56, 4, 1]]);
  whichFills("band3", [[112, 11, 1], [235, 12, 2], [341, 15, 1], [124, 25, 2], [452, 11, 1], [223, 14, 2], [335, 21, 1], [146, 12, 2], [518, 13, 1], [247, 16, 2], [333, 22, 1], [415, 18, 2], [128, 24, 1], [622, 15, 2], [289, 17, 1], [317, 23, 2], [434, 19, 1], [526, 13, 2]]);

  const judgePhr = rotor([
    (nm, shown, said) => `${nm} fills the gap in ${shown.join(", ")} with ${said}. Is ${nm} right?`,
    (nm, shown, said) => `The pattern reads ${shown.join(", ")}. ${nm} writes ${said} in the gap. Is that right?`,
  ]);
  const judgeFill = (band, data) =>
    data.forEach(([start, step, g, ok], i) => {
      const full = seqUp(start, step, 4);
      const shown = full.map((v, k) => (k === g ? "?" : v));
      const right = full[g];
      const said = ok ? right : right + (i % 2 === 0 ? 1 : -1);
      items.push(
        item("missingTerm", "conceptual", `judgeFill_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { sequence: shown, pattern: { kind: "fill", start, step, g, said }, promptText: judgePhr()(nameAt(i * 3 + seed), shown, said), truth: ok },
        })
      );
    });
  judgeFill("band1", [[2, 2, 1, true], [3, 2, 2, false], [1, 3, 1, true], [2, 3, 2, false], [4, 2, 1, true], [1, 4, 2, false], [3, 4, 1, true], [2, 5, 1, false], [5, 2, 2, true], [4, 3, 1, false], [1, 5, 1, true], [6, 2, 1, false], [5, 3, 2, true], [3, 5, 2, false], [7, 2, 2, true], [2, 4, 1, false], [6, 3, 1, true], [4, 4, 2, false]]);
  judgeFill("band2", [[12, 6, 1, true], [25, 7, 2, false], [31, 8, 1, true], [14, 9, 2, false], [42, 6, 1, true], [23, 7, 2, false], [35, 8, 1, true], [16, 9, 1, false], [51, 6, 2, true], [27, 4, 1, false], [33, 5, 2, true], [45, 7, 1, false], [18, 8, 2, true], [62, 3, 1, false], [29, 9, 2, true], [37, 6, 1, false], [44, 5, 2, true], [56, 4, 1, false]]);
  judgeFill("band3", [[112, 11, 1, true], [235, 12, 2, false], [341, 15, 1, true], [124, 25, 2, false], [452, 11, 1, true], [223, 14, 2, false], [335, 21, 1, true], [146, 12, 2, false], [518, 13, 1, true], [247, 16, 2, false], [333, 22, 1, true], [415, 18, 2, false], [128, 24, 1, true], [622, 15, 2, false], [289, 17, 1, true], [317, 23, 2, false], [434, 19, 1, true], [526, 13, 2, false]]);

  const twoGapPhr = rotor([
    (nm, shown) => `Two numbers of ${nm}'s pattern are hidden: ${shown.join(", ")}. Which number fills the FIRST gap?`,
    (nm, shown) => `${nm}'s pattern lost two numbers: ${shown.join(", ")}. What belongs in the first gap?`,
  ]);
  const twoGap = (band, data) =>
    data.forEach(([start, step], i) => {
      const full = seqUp(start, step, 5);
      const shown = full.map((v, k) => (k === 1 || k === 3 ? "?" : v));
      items.push(
        item("missingTerm", "conceptual", `twoGaps_${band}`, band, {
          answer: full[1],
          answerType: "numberPad",
          display: { sequence: shown, counting: { kind: "between", before: full[0], after: full[2] }, promptText: twoGapPhr()(nameAt(i * 3 + seed), shown) },
        })
      );
    });
  twoGap("band1", [[2, 2], [1, 3], [3, 2], [2, 4], [1, 2], [4, 2], [3, 3], [1, 4], [5, 2], [2, 3], [6, 2], [4, 3], [7, 2], [9, 2], [8, 2], [5, 3]]);
  twoGap("band2", [[12, 6], [25, 7], [31, 8], [14, 9], [42, 6], [23, 7], [35, 8], [16, 4], [51, 5], [27, 6], [33, 7], [45, 3], [18, 8], [62, 9], [29, 4], [37, 5]]);
  twoGap("band3", [[112, 11], [235, 12], [341, 15], [124, 25], [452, 11], [223, 14], [335, 21], [146, 12], [518, 13], [247, 16], [333, 22], [415, 18], [128, 24], [622, 15], [289, 17], [317, 23]]);

  return items;
}

/* ================================================================== */
/* patternRule                                                         */
/* ================================================================== */

export function patternRuleProcedural() {
  const items = [];

  // Step drills: state the rule of a shown additive pattern.
  const stepDrill = (structureType, band, start, step) => {
    const seq = seqUp(start, step, 3);
    return item("patternRule", "procedural", structureType, band, {
      answer: step,
      answerType: "numberPad",
      display: { sequence: seq, counting: { kind: "gap", have: start, target: start + step }, promptText: `Pattern: ${seq.join(", ")}. Rule: add ? each time.` },
    });
  };
  for (const [start, step] of [[2, 2], [3, 2], [1, 3], [2, 3], [4, 2], [1, 4], [3, 4], [2, 5], [5, 2], [4, 3], [1, 5], [6, 2], [5, 3], [3, 5], [7, 2], [2, 4], [6, 3], [4, 4], [8, 2], [1, 2], [5, 4], [4, 5], [7, 3], [9, 2], [6, 4], [5, 5], [8, 3], [10, 2]]) {
    items.push(stepDrill("stepTeen", "band1", start, step));
  }
  for (const [start, step] of [[12, 6], [25, 7], [31, 8], [14, 9], [42, 6], [23, 7], [35, 8], [16, 9], [51, 6], [27, 4], [33, 5], [45, 7], [18, 8], [62, 3], [29, 9], [37, 6], [44, 5], [56, 4], [21, 8], [39, 7], [24, 6], [47, 3], [53, 4], [36, 9], [19, 5], [28, 7]]) {
    items.push(stepDrill("stepMid", "band2", start, step));
  }
  for (const [start, step] of [[112, 11], [235, 12], [341, 15], [124, 25], [452, 11], [223, 14], [335, 21], [146, 12], [518, 13], [247, 16], [333, 22], [415, 18], [128, 24], [622, 15], [289, 17], [317, 23], [434, 19], [526, 13], [211, 26], [349, 14], [136, 27], [253, 28], [364, 29], [441, 12], [157, 21]]) {
    items.push(stepDrill("stepBig", "band3", start, step));
  }

  // Apply a stated rule N terms out.
  const applyDrill = (structureType, band, start, step, term) =>
    item("patternRule", "procedural", structureType, band, {
      answer: start + (term - 1) * step,
      answerType: "numberPad",
      display: { pattern: { kind: "applyRule", start, step, term }, promptText: `Rule: start at ${start} and add ${step} each time. What is number ${term} in the pattern?` },
    });
  for (const [start, step, term] of [[2, 2, 3], [3, 2, 4], [1, 3, 3], [2, 3, 4], [4, 2, 3], [1, 4, 4], [3, 4, 3], [2, 5, 3], [5, 2, 4], [4, 3, 4], [1, 5, 3], [6, 2, 3], [5, 3, 3], [3, 5, 4], [7, 2, 4], [2, 4, 4], [6, 3, 4], [4, 4, 3], [8, 2, 3], [1, 2, 4], [5, 4, 4], [9, 2, 4], [2, 2, 4], [10, 2, 4]]) {
    items.push(applyDrill("applyTeen", "band1", start, step, term));
  }
  for (const [start, step, term] of [[12, 6, 4], [25, 7, 5], [31, 8, 4], [14, 9, 5], [42, 6, 4], [23, 7, 5], [35, 8, 4], [16, 9, 6], [51, 6, 5], [27, 4, 6], [33, 5, 4], [45, 7, 5], [18, 8, 6], [62, 3, 5], [29, 9, 4], [37, 6, 5], [44, 5, 6], [56, 4, 4], [21, 8, 5], [39, 7, 6], [24, 6, 5], [47, 3, 6], [53, 4, 5], [36, 9, 6], [19, 5, 5], [28, 7, 4]]) {
    items.push(applyDrill("applyMid", "band2", start, step, term));
  }
  for (const [start, step, term] of [[112, 11, 5], [235, 12, 6], [341, 15, 5], [124, 25, 6], [452, 11, 5], [223, 14, 6], [335, 21, 5], [146, 12, 7], [518, 13, 6], [247, 16, 7], [333, 22, 5], [415, 18, 6], [128, 24, 7], [622, 15, 5], [289, 17, 6], [317, 23, 7], [434, 19, 5], [526, 13, 6], [211, 26, 7], [349, 14, 5], [136, 27, 6], [253, 28, 5], [364, 29, 6], [441, 21, 7], [157, 22, 6], [268, 23, 5]]) {
    items.push(applyDrill("applyBig", "band3", start, step, term));
  }

  return items;
}

export function patternRuleConceptual() {
  const items = [];
  let seed = 71;

  const rulePickPhr = rotor([
    (nm, seq) => `${nm} studies the pattern ${seq.join(", ")}. What is the rule?`,
    (nm, seq) => `Which rule makes the pattern ${seq.join(", ")}? ${nm} wants to know.`,
  ]);
  const rulePick = (band, data) =>
    data.forEach(([start, step], i) => {
      const seq = seqUp(start, step, 4);
      const answer = `add ${step}`;
      const wrong = [`add ${step + 1}`, `subtract ${step}`, `multiply by ${step}`];
      items.push(
        item("patternRule", "conceptual", `rulePick_${band}`, band, {
          answer,
          choices: shuffled([answer, ...wrong], (seed += 1)),
          display: { sequence: seq, counting: null, pattern: { kind: "rule", start, step }, promptText: rulePickPhr()(nameAt(i * 3 + seed), seq) },
        })
      );
    });
  rulePick("band1", [[2, 2], [3, 3], [1, 4], [4, 2], [2, 5], [5, 3], [1, 2], [6, 2], [3, 4], [2, 3], [4, 4], [7, 2], [5, 2], [1, 5], [4, 3], [8, 2], [6, 3], [2, 4]]);
  rulePick("band2", [[12, 6], [25, 7], [31, 8], [14, 9], [42, 6], [23, 7], [35, 8], [16, 4], [51, 5], [27, 6], [33, 7], [45, 3], [18, 8], [62, 9], [29, 4], [37, 5], [44, 6], [56, 7]]);
  rulePick("band3", [[112, 11], [235, 12], [341, 15], [124, 25], [452, 11], [223, 14], [335, 21], [146, 12], [518, 13], [247, 16], [333, 22], [415, 18], [128, 24], [622, 15], [289, 17], [317, 23], [434, 19], [526, 13]]);

  const errPhr = rotor([
    (nm, shown) => `${nm} wrote ${shown.join(", ")}, but one number breaks the pattern. Which number is wrong?`,
    (nm, shown) => `One number in ${nm}'s pattern ${shown.join(", ")} does not fit. Which one?`,
  ]);
  const findError = (band, data) =>
    data.forEach(([start, step, badIdx, drift], i) => {
      const full = seqUp(start, step, 5);
      const broken = full[badIdx] + drift;
      const shown = full.map((v, k) => (k === badIdx ? broken : v));
      items.push(
        item("patternRule", "conceptual", `findError_${band}`, band, {
          answer: broken,
          choices: shuffled([...new Set(shown)].slice(0, 4).includes(broken) ? [...new Set(shown)].slice(0, 4) : [broken, ...[...new Set(shown)].filter((v) => v !== broken).slice(0, 3)], (seed += 1)),
          display: { sequence: shown, pattern: { kind: "slip", start, step, badIdx }, promptText: errPhr()(nameAt(i * 3 + seed), shown) },
        })
      );
    });
  findError("band1", [[2, 2, 1, 1], [3, 2, 2, -1], [1, 3, 1, 1], [2, 3, 2, -1], [4, 2, 3, 1], [1, 4, 1, -1], [3, 4, 2, 1], [9, 2, 1, -1], [5, 2, 3, 1], [4, 3, 2, -1], [10, 2, 2, 1], [6, 2, 1, -1], [5, 3, 3, 1], [8, 3, 1, -1], [7, 2, 2, 1], [2, 4, 3, -1], [6, 3, 2, 1], [4, 4, 1, -1]]);
  findError("band2", [[12, 6, 1, 1], [25, 7, 2, -1], [31, 8, 3, 1], [14, 9, 1, -1], [42, 6, 2, 1], [23, 7, 3, -1], [35, 8, 1, 1], [16, 9, 2, -1], [51, 6, 3, 1], [27, 4, 1, -1], [33, 5, 2, 1], [45, 7, 3, -1], [18, 8, 1, 1], [62, 3, 2, -1], [29, 9, 3, 1], [37, 6, 1, -1], [44, 5, 2, 1], [56, 4, 3, -1]]);
  findError("band3", [[112, 11, 1, 1], [235, 12, 2, -1], [341, 15, 3, 1], [124, 25, 1, -1], [452, 11, 2, 1], [223, 14, 3, -1], [335, 21, 1, 1], [146, 12, 2, -1], [518, 13, 3, 1], [247, 16, 1, -1], [333, 22, 2, 1], [415, 18, 3, -1], [128, 24, 1, 1], [622, 15, 2, -1], [289, 17, 3, 1], [317, 23, 1, -1], [434, 19, 2, 1], [526, 13, 3, -1]]);

  const parityPhr = rotor([
    (nm, seq, step, term) => `The pattern ${seq.join(", ")} keeps adding ${step}. ${nm} says number ${term} in the pattern will be even. Is ${nm} right?`,
    (nm, seq, step, term) => `${nm} follows the pattern ${seq.join(", ")} (add ${step} each time) out to number ${term}. Will that number be even?`,
  ]);
  const parity = (band, data) =>
    data.forEach(([start, step, term], i) => {
      const seq = seqUp(start, step, 3);
      const value = start + (term - 1) * step;
      const even = value % 2 === 0;
      items.push(
        item("patternRule", "conceptual", `parityAt_${band}`, band, {
          answer: even ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { sequence: seq, pattern: { kind: "parity", start, step, term }, promptText: parityPhr()(nameAt(i * 3 + seed), seq, step, term), truth: even },
        })
      );
    });
  parity("band1", [[2, 2, 5], [3, 2, 6], [1, 3, 4], [2, 3, 5], [4, 2, 6], [1, 4, 4], [3, 4, 5], [2, 5, 4], [5, 2, 5], [4, 3, 6], [1, 5, 4], [6, 2, 5], [5, 3, 4], [3, 5, 5], [7, 2, 6], [2, 4, 5]]);
  parity("band2", [[12, 6, 8], [25, 7, 9], [31, 8, 8], [14, 9, 9], [42, 6, 10], [23, 7, 8], [35, 8, 9], [16, 9, 10], [51, 6, 8], [27, 4, 9], [33, 5, 10], [45, 7, 8], [18, 8, 9], [62, 3, 10], [29, 9, 8], [37, 6, 9]]);
  parity("band3", [[112, 11, 12], [235, 12, 11], [341, 15, 12], [124, 25, 11], [452, 11, 12], [223, 14, 11], [335, 21, 12], [146, 12, 11], [518, 13, 12], [247, 16, 11], [333, 22, 12], [415, 18, 11], [128, 24, 12], [622, 15, 11], [289, 17, 12], [317, 23, 11]]);

  return items;
}
