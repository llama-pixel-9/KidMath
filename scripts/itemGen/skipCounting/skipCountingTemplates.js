/* Deterministic skipCounting bank items — procedural and conceptual cells.
 *
 * Design source: docs/skipcounting-bank-design.md (EngageNY G2-M6 + G3-M1
 * survey). Structural inspiration only — all wording original.
 *
 * Payloads ride the counting conventions (op "count" + display.counting →
 * countMath gate): sequences {kind:"next"}, missing middles {kind:"between"}
 * (midpoint holds for any arithmetic gap), missing starts {kind:"moreLess"},
 * group totals {kind:"sum"}, two-jumps {kind:"countOn"}. Judged = Yes/No +
 * display.truth.
 *
 * HARD CONSTRAINT: band-1 prompts may not state any number above 20
 * (bandAppropriate fails otherwise) — every band-1 builder enforces it.
 * Sprint difficulty ladder (G3-L20): blank-last-forward < last-backward <
 * middle-forward < middle-backward < first-backward < boundary-crossing.
 */

import { rotor, shuffled, NAMES } from "../counting/countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "skipCounting",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const nameAt = (i) => NAMES[i % NAMES.length];
const seqOf = (start, step, terms) => Array.from({ length: terms }, (_, i) => start + step * i);

/* ================================================================== */
/* patternRule                                                        */
/* ================================================================== */

const nextItem = (structureType, band, start, step, terms = 3) => {
  const sequence = seqOf(start, step, terms);
  return item("patternRule", "procedural", structureType, band, {
    answer: sequence[terms - 1] + step,
    answerType: "numberPad",
    display: {
      sequence,
      step,
      counting: { kind: "next", sequence, step },
      promptText: `${sequence.join(", ")}, ?`,
    },
  });
};

const backItem = (structureType, band, top, step, terms = 3) => {
  const sequence = Array.from({ length: terms }, (_, i) => top - step * i);
  return item("patternRule", "procedural", structureType, band, {
    answer: top - terms * step,
    answerType: "numberPad",
    display: {
      sequence,
      step: -step,
      counting: { kind: "next", sequence, step: -step },
      promptText: `${sequence.join(", ")}, ?`,
    },
  });
};

export function patternRuleProcedural() {
  const items = [];

  // Band 1 — 2s/5s/10s with every prompt number <= 20; runs of 2-4 terms
  // multiply the space (distinct strings).
  for (let start = 0; start <= 14; start += 2) items.push(nextItem("nextTermForward", "band1", start, 2, 3));
  for (let start = 0; start <= 12; start += 2) items.push(nextItem("nextTermForward", "band1", start, 2, 4));
  for (let start = 2; start <= 16; start += 2) items.push(nextItem("nextTermForward", "band1", start, 2, 2));
  for (const start of [0, 5, 10]) items.push(nextItem("nextTermForward", "band1", start, 5, 2));
  items.push(nextItem("nextTermForward", "band1", 0, 5, 3));
  items.push(nextItem("nextTermForward", "band1", 5, 5, 3));
  items.push(nextItem("nextTermForward", "band1", 0, 10, 2));
  for (let top = 6; top <= 20; top += 2) items.push(backItem("nextTermBackward", "band1", top, 2, 3));
  for (const top of [15, 20]) items.push(backItem("nextTermBackward", "band1", top, 5, 3));
  items.push(backItem("nextTermBackward", "band1", 20, 10, 2));
  for (let top = 10; top <= 20; top += 2) items.push(backItem("nextTermBackward", "band1", top, 2, 4));
  items.push(nextItem("nextTermForward", "band1", 0, 5, 4));
  items.push(backItem("nextTermBackward", "band1", 20, 5, 4));
  items.push(nextItem("nextTermForward", "band1", 15, 5, 2));
  items.push(backItem("nextTermBackward", "band1", 10, 2, 2));
  items.push(backItem("nextTermBackward", "band1", 16, 2, 2));

  // Band 2 — 3s/4s and longer 5s/10s runs.
  for (let k = 0; k <= 12; k += 1) items.push(nextItem("nextTermThreesFours", "band2", k * 3 % 27, 3, 3 + (k % 2)));
  for (let k = 0; k <= 12; k += 1) items.push(nextItem("nextTermThreesFours", "band2", k * 4 % 36, 4, 3 + ((k + 1) % 2)));
  for (const [start, terms] of [[10, 3], [15, 3], [20, 3], [25, 3], [30, 3], [35, 3], [10, 4], [20, 4], [30, 4]]) items.push(nextItem("fivesRun", "band2", start, 5, terms));
  for (const [start, terms] of [[10, 3], [20, 3], [30, 3], [40, 3], [50, 3], [10, 4], [30, 4]]) items.push(nextItem("tensRun", "band2", start, 10, terms));
  for (const [top, step, terms] of [[21, 3, 3], [24, 3, 3], [27, 3, 3], [30, 3, 3], [24, 4, 3], [28, 4, 3], [32, 4, 3], [36, 4, 3], [40, 5, 3], [45, 5, 3], [60, 10, 3], [80, 10, 3], [33, 3, 4], [40, 4, 4], [50, 5, 4], [100, 10, 4]]) {
    items.push(backItem("backTermThreesFours", "band2", top, step, terms));
  }

  // Band 3 — 6s/25s/50s/100s and off-multiple runs.
  for (const [start, step, terms] of [[0, 6, 3], [6, 6, 3], [12, 6, 3], [18, 6, 3], [24, 6, 3], [30, 6, 3], [0, 25, 3], [25, 25, 3], [50, 25, 3], [75, 25, 3], [100, 25, 3], [0, 50, 3], [50, 50, 3], [100, 50, 3], [150, 50, 3], [0, 100, 3], [100, 100, 3], [200, 100, 3], [300, 100, 3], [0, 6, 4], [0, 25, 4], [0, 50, 4], [0, 100, 4], [36, 6, 3], [125, 25, 3], [400, 100, 3]]) {
    items.push(nextItem("nextTermBigSteps", "band3", start, step, terms));
  }
  for (const [start, step] of [[3, 10], [7, 10], [4, 10], [8, 10], [6, 10], [9, 10], [13, 10], [17, 10], [2, 10], [16, 10], [5, 100], [45, 100], [12, 100], [67, 100], [23, 100], [88, 100], [34, 100], [56, 100], [78, 100], [11, 100], [26, 10], [39, 10], [47, 100], [21, 10], [92, 100], [33, 10]]) {
    items.push(nextItem("offMultipleRun", "band3", start, step, 3));
  }

  return items;
}

export function patternRuleConceptual() {
  const items = [];
  let seed = 8000;

  const memberPhr = rotor([
    (nm, n, s) => `${nm} counts by ${s}s from ${s}. Does ${nm} ever say ${n}?`,
    (nm, n, s) => `${nm} thinks ${n} is one of the numbers in the count by ${s}s. Is ${nm} right?`,
    (nm, n, s) => `${nm} chants the ${s}s count: ${s}, ${s * 2}… Will ${nm} hit ${n}?`,
  ]);
  const member = (structureType, band, cases) => {
    cases.forEach(([n, s], i) => {
      const truth = n % s === 0;
      items.push(
        item("patternRule", "conceptual", structureType, band, {
          answer: truth ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { promptText: memberPhr()(nameAt(i * 3 + 2), n, s), truth },
        })
      );
    });
  };
  member("membershipJudge", "band1", [[8, 2], [7, 2], [15, 5], [12, 5], [20, 10], [15, 10], [14, 2], [9, 2], [20, 5], [18, 5], [10, 10], [16, 10], [16, 2], [11, 2], [10, 5], [13, 5], [18, 2], [19, 2]]);
  member("membershipJudgeThrees", "band2", [[12, 3], [14, 3], [16, 4], [18, 4], [21, 3], [22, 3], [24, 4], [26, 4], [27, 3], [25, 3], [32, 4], [30, 4], [15, 3], [20, 3], [28, 4], [34, 4], [33, 3], [35, 3]]);
  member("membershipJudgeBig", "band3", [[42, 6], [40, 6], [75, 25], [80, 25], [150, 50], [175, 50], [300, 100], [350, 100], [54, 6], [50, 6], [125, 25], [130, 25], [250, 50], [260, 50], [600, 100], [650, 100], [66, 6], [64, 6]]);

  const oddPhr = rotor([
    (nm, s, list) => `${nm} wrote ${list} while counting by ${s}s. Which number is NOT in that count?`,
    (nm, s, list) => `One of ${nm}'s numbers ${list} does not belong to the ${s}s count. Which one?`,
  ]);
  const odd = (structureType, band, cases) => {
    cases.forEach(([s, k], oi) => {
      const good = [s * k, s * (k + 1), s * (k + 2)];
      const bad = s * (k + 1) + (s > 2 ? Math.max(1, Math.floor(s / 2)) : 1);
      const choices = shuffled([...good, bad], (seed += 1));
      items.push(
        item("patternRule", "conceptual", structureType, band, {
          answer: bad,
          choices,
          display: { promptText: oddPhr()(nameAt(oi * 3 + 7), s, choices.join(", ")) },
        })
      );
    });
  };
  odd("oddOneOutNotMultiple", "band1", [[2, 1], [5, 1], [2, 3], [5, 2], [2, 5], [2, 2], [2, 4], [2, 6], [2, 7], [2, 8], [5, 1], [2, 1], [5, 2], [2, 3], [2, 5], [2, 7]]);
  odd("oddOneOutThreesFours", "band2", [[3, 2], [4, 2], [3, 4], [4, 3], [3, 5], [4, 4], [3, 3], [4, 5], [3, 6], [4, 6], [3, 7], [4, 7], [3, 8], [4, 8], [3, 9], [4, 9]]);
  odd("oddOneOutBig", "band3", [[6, 2], [25, 2], [50, 2], [100, 2], [6, 4], [25, 3], [50, 3], [100, 3], [6, 5], [25, 4], [50, 4], [100, 4], [6, 6], [25, 5], [50, 5], [100, 5]]);

  const claimPhr = rotor([
    (nm, run, next) => `${nm} counts ${run} and says ${next} comes next. Is ${nm} right?`,
    (nm, run, next) => `${nm} continues the count ${run} with ${next}. Is that right?`,
  ]);
  const claim = (structureType, band, cases) => {
    cases.forEach(([start, step, ok], i) => {
      const sequence = seqOf(start, step, 3);
      const next = ok ? sequence[2] + step : sequence[2] + step + (step > 2 ? 2 : 1);
      items.push(
        item("patternRule", "conceptual", structureType, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { promptText: claimPhr()(nameAt(i * 3 + 4), sequence.join(", "), next), truth: ok },
        })
      );
    });
  };
  claim("nextClaimJudge", "band1", [[2, 2, true], [4, 2, false], [0, 5, true], [0, 5, false], [0, 2, true], [6, 2, false], [8, 2, true], [10, 2, false], [12, 2, true], [3, 2, false], [1, 2, true], [5, 2, false], [7, 2, true], [9, 2, false], [11, 2, true], [2, 5, false], [13, 2, true], [12, 2, false]]);
  claim("nextClaimJudgeMid", "band2", [[3, 3, true], [6, 3, false], [4, 4, true], [8, 4, false], [9, 3, true], [12, 4, false], [0, 3, true], [0, 4, false], [12, 3, true], [16, 4, false], [15, 3, true], [20, 4, false], [18, 3, true], [24, 4, false], [21, 3, true], [28, 4, false]]);
  claim("nextClaimJudgeBig", "band3", [[6, 6, true], [12, 6, false], [25, 25, true], [50, 25, false], [50, 50, true], [100, 50, false], [100, 100, true], [200, 100, false], [18, 6, true], [75, 25, false], [150, 50, true], [300, 100, false], [24, 6, true], [125, 25, false], [200, 50, true], [400, 100, false], [30, 6, true], [36, 6, false]]);

  return items;
}

/* ================================================================== */
/* stepInference                                                      */
/* ================================================================== */

const midItem = (structureType, band, start, step, blank, terms = 4) => {
  const sequence = seqOf(start, step, terms);
  const shown = sequence.map((n, i) => (i === blank ? "___" : n)).join(", ");
  return item("stepInference", "procedural", structureType, band, {
    answer: sequence[blank],
    answerType: "fillBlank",
    display: {
      counting: { kind: "between", before: sequence[blank] - step, after: sequence[blank] + step },
      promptText: `${shown}`,
    },
  });
};

const startItem = (structureType, band, start, step, terms = 4) => {
  const sequence = seqOf(start, step, terms);
  const shown = ["___", ...sequence.slice(1)].join(", ");
  return item("stepInference", "procedural", structureType, band, {
    answer: start,
    answerType: "fillBlank",
    display: {
      counting: { kind: "moreLess", n: sequence[1], delta: -step },
      promptText: `${shown}`,
    },
  });
};

export function stepInferenceProcedural() {
  const items = [];

  // Band 1 — sequences fully within 20; blanks in middle then first
  // position (the Sprint ladder).
  for (let start = 0; start <= 14; start += 2) items.push(midItem("missingMiddleTerm", "band1", start, 2, 1));
  for (let start = 0; start <= 14; start += 2) items.push(midItem("missingMiddleTerm", "band1", start, 2, 2));
  items.push(midItem("missingMiddleTerm", "band1", 0, 5, 1));
  items.push(midItem("missingMiddleTerm", "band1", 5, 5, 1, 3));
  items.push(midItem("missingMiddleTerm", "band1", 0, 5, 2, 3));
  for (let start = 2; start <= 12; start += 2) items.push(startItem("missingStartTerm", "band1", start, 2));
  for (let start = 0; start <= 14; start += 2) items.push(midItem("missingMiddleShort", "band1", start, 2, 1, 3));
  items.push(midItem("missingMiddleShort", "band1", 0, 5, 1, 3));
  items.push(midItem("missingMiddleShort", "band1", 10, 5, 1, 3));
  for (const start of [0, 2, 4, 6]) items.push(midItem("missingMiddleLong", "band1", start, 2, 3, 5));
  for (const [start, step, terms] of [[5, 5, 3], [0, 5, 3], [10, 5, 3], [10, 2, 3], [14, 2, 3], [12, 2, 3], [4, 2, 3], [8, 2, 3], [6, 2, 3], [0, 2, 3], [2, 2, 3], [16, 2, 3]]) {
    items.push(startItem("missingStartSmall", "band1", start, step, terms));
  }

  // Band 2 — 3s/4s middles and starts.
  for (const [start, step, blank] of [[3, 3, 1], [6, 3, 2], [4, 4, 1], [8, 4, 2], [9, 3, 1], [12, 4, 2], [12, 3, 1], [16, 4, 1], [15, 3, 2], [20, 4, 1], [18, 3, 1], [24, 4, 2], [21, 3, 2], [28, 4, 1], [24, 3, 1], [32, 4, 2], [0, 3, 1], [0, 4, 2], [27, 3, 1], [36, 4, 1], [30, 3, 2], [40, 4, 2], [33, 3, 1], [44, 4, 1], [36, 3, 2], [48, 4, 2]]) {
    items.push(midItem("missingMiddleThreesFours", "band2", start, step, blank));
  }
  for (const [start, step] of [[3, 3], [4, 4], [6, 3], [8, 4], [9, 3], [12, 4], [15, 3], [16, 4], [18, 3], [20, 4], [21, 3], [24, 4], [12, 3], [28, 4], [24, 3], [32, 4], [27, 3], [36, 4], [30, 3], [40, 4], [15, 5], [20, 5], [25, 5], [30, 10], [40, 10], [50, 10]]) {
    items.push(startItem("missingStartThreesFours", "band2", start, step));
  }

  // Band 3 — big steps, both blank positions.
  for (const [start, step, blank] of [[6, 6, 1], [12, 6, 2], [25, 25, 1], [50, 25, 2], [50, 50, 1], [100, 50, 2], [100, 100, 1], [200, 100, 2], [18, 6, 1], [75, 25, 2], [150, 50, 1], [300, 100, 2], [0, 6, 1], [0, 25, 2], [0, 50, 1], [0, 100, 2], [24, 6, 2], [100, 25, 1], [200, 50, 2], [400, 100, 1], [30, 6, 1], [125, 25, 2], [250, 50, 1], [500, 100, 2], [36, 6, 2], [150, 25, 1]]) {
    items.push(midItem("missingMiddleBigSteps", "band3", start, step, blank));
  }
  for (const [start, step] of [[6, 6], [25, 25], [50, 50], [100, 100], [12, 6], [18, 6], [75, 25], [150, 50], [200, 100], [24, 6], [125, 25], [250, 50], [300, 100], [30, 6], [175, 25], [350, 50], [400, 100], [36, 6], [225, 25], [450, 50], [500, 100], [42, 6], [275, 25], [550, 50], [600, 100], [48, 6]]) {
    items.push(startItem("missingStartBig", "band3", start, step));
  }

  return items;
}

export function stepInferenceConceptual() {
  const items = [];
  let seed = 9000;

  const rulePhr = rotor([
    (nm, run) => `${nm} counts ${run}. What is ${nm}'s skip-count rule?`,
    (nm, run) => `${nm} writes ${run} — by how much does ${nm}'s count grow each time?`,
    (nm, run) => `How big is each of ${nm}'s jumps: ${run}?`,
  ]);
  const rule = (structureType, band, cases) => {
    cases.forEach(([start, step], ri) => {
      const sequence = seqOf(start, step, 4);
      const wrong = [...new Set([step + 1, step - 1, step * 2])].filter((w) => w > 0 && w !== step).slice(0, 3);
      items.push(
        item("stepInference", "conceptual", structureType, band, {
          answer: step,
          choices: shuffled([step, ...wrong], (seed += 1)),
          display: { promptText: rulePhr()(nameAt(ri * 3 + 9), sequence.join(", ")) },
        })
      );
    });
  };
  rule("identifyRule", "band1", [[2, 2], [0, 5], [0, 2], [4, 2], [5, 5], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2], [1, 2], [3, 2], [5, 2], [7, 2], [9, 2], [11, 2], [13, 2], [2, 5]]);
  rule("identifyRuleThreesFours", "band2", [[3, 3], [4, 4], [6, 3], [8, 4], [9, 3], [12, 4], [0, 3], [0, 4], [12, 3], [16, 4], [15, 3], [20, 4], [18, 3], [24, 4], [21, 3], [28, 4], [24, 3], [32, 4]]);
  rule("identifyRuleBig", "band3", [[6, 6], [25, 25], [50, 50], [100, 100], [12, 6], [50, 25], [100, 50], [200, 100], [0, 6], [0, 25], [18, 6], [75, 25], [150, 50], [300, 100], [24, 6], [100, 25], [0, 50], [0, 100]]);

  const slipPhr = rotor([
    (nm, shown) => `${nm} skip-counts: ${shown}. One number is wrong. Which one?`,
    (nm, shown) => `Something slipped in ${nm}'s count: ${shown}. Which number is wrong?`,
  ]);
  const slip = (structureType, band, cases) => {
    cases.forEach(([start, step, badIdx], i) => {
      const sequence = seqOf(start, step, 4);
      const wrongVal = sequence[badIdx] + (step > 2 ? 2 : 1);
      const shownArr = sequence.map((n, j) => (j === badIdx ? wrongVal : n));
      items.push(
        item("stepInference", "conceptual", structureType, band, {
          answer: wrongVal,
          choices: shuffled([...shownArr], (seed += 1)),
          display: {
            pattern: { start, step, badIdx },
            promptText: slipPhr()(nameAt(i * 3 + 6), shownArr.join(", ")),
          },
        })
      );
    });
  };
  slip("errorSkipSlip", "band1", [[2, 2, 2], [0, 5, 1], [0, 2, 3], [4, 2, 1], [5, 5, 2], [6, 2, 2], [8, 2, 3], [10, 2, 1], [12, 2, 2], [0, 2, 1], [2, 2, 3], [4, 2, 2], [6, 2, 1], [8, 2, 2], [10, 2, 3], [0, 5, 2]]);
  slip("errorSkipSlipMid", "band2", [[3, 3, 1], [4, 4, 2], [6, 3, 3], [8, 4, 1], [9, 3, 2], [12, 4, 3], [0, 3, 1], [0, 4, 2], [12, 3, 3], [16, 4, 1], [15, 3, 2], [20, 4, 3], [18, 3, 1], [24, 4, 2], [21, 3, 3], [28, 4, 1], [10, 5, 2], [20, 10, 3]]);
  slip("errorSkipSlipBig", "band3", [[6, 6, 2], [25, 25, 1], [50, 50, 2], [100, 100, 1], [12, 6, 3], [50, 25, 2], [100, 50, 3], [200, 100, 2], [18, 6, 1], [75, 25, 3], [0, 50, 1], [0, 100, 3], [24, 6, 2], [100, 25, 1], [150, 50, 2], [300, 100, 1], [30, 6, 3], [0, 25, 2]]);

  const twoJumpPhr = rotor([
    (nm, n, s) => `${nm} starts at ${n} and makes two jumps of ${s}. Where does ${nm} land?`,
    (nm, n, s) => `${nm} takes two hops of ${s} from ${n}. What number does ${nm} reach?`,
  ]);
  const twoJump = (structureType, band, cases) => {
    cases.forEach(([n, s], ti) => {
      items.push(
        item("stepInference", "conceptual", structureType, band, {
          answer: n + 2 * s,
          answerType: "numberPad",
          display: { counting: { kind: "countOn", start: n, more: 2 * s }, promptText: twoJumpPhr()(nameAt(ti * 3 + 5), n, s) },
        })
      );
    });
  };
  twoJump("twoJumps", "band1", [[2, 2], [0, 5], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [5, 5], [0, 2], [14, 2], [16, 2], [1, 2], [3, 2], [10, 5], [0, 10], [7, 2]]);
  twoJump("twoJumpsMid", "band2", [[3, 3], [6, 3], [9, 3], [4, 4], [8, 4], [12, 4], [0, 3], [0, 4], [12, 3], [16, 4], [15, 3], [20, 4], [18, 3], [24, 4]]);
  twoJump("twoJumpsBig", "band3", [[6, 6], [25, 25], [50, 50], [100, 100], [12, 6], [50, 25], [100, 50], [200, 100], [18, 6], [75, 25], [150, 50], [0, 100], [24, 6], [0, 25], [0, 50], [300, 100]]);

  return items;
}

/* ================================================================== */
/* groupsToProduct                                                    */
/* ================================================================== */

const GROUP_OBJECTS = [
  { emoji: "🧦", noun: "socks", per: 2 },
  { emoji: "🧤", noun: "mittens", per: 2 },
  { emoji: "✋", noun: "fingers", per: 5 },
  { emoji: "🪙", noun: "cents", per: 10 },
];

export function groupsToProductProcedural() {
  const items = [];

  const repItem = (structureType, band, step, groups) =>
    item("groupsToProduct", "procedural", structureType, band, {
      answer: step * groups,
      answerType: "numberPad",
      display: {
        counting: { kind: "sum", parts: Array.from({ length: groups }, () => step) },
        promptText: `${Array.from({ length: groups }, () => step).join(" + ")} = ?`,
      },
    });
  // Band 1 — every 2s/5s/10s repeated-addition shape (prompt numbers are the
  // step, always <= 10).
  for (let g = 3; g <= 10; g += 1) items.push(repItem("repeatedAddition", "band1", 2, g));
  for (let g = 3; g <= 10; g += 1) items.push(repItem("repeatedAddition", "band1", 5, g));
  for (let g = 3; g <= 10; g += 1) items.push(repItem("repeatedAddition", "band1", 10, g));
  // Unit-form drills ("4 twos = ?") — G3 register, letter-light, and
  // string-distinct from the patternRule sequences.
  const UNIT_WORDS = { 2: "twos", 3: "threes", 4: "fours", 5: "fives", 6: "sixes", 10: "tens", 25: "twenty-fives", 50: "fifties", 100: "hundreds" };
  const unitDrill = (structureType, band, step, groups) =>
    item("groupsToProduct", "procedural", structureType, band, {
      answer: step * groups,
      answerType: "numberPad",
      display: {
        counting: { kind: "sum", parts: Array.from({ length: groups }, () => step) },
        promptText: `${groups} ${UNIT_WORDS[step]} = ?`,
      },
    });
  for (const [step, groups] of [[2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [5, 4], [10, 2], [5, 2], [5, 3], [10, 3], [2, 3], [2, 2], [10, 4]]) {
    unitDrill; // keep unitDrill referenced
    items.push(unitDrill("unitFormSmall", "band1", step, groups));
  }
  for (let g = 11; g <= 16; g += 1) items.push(repItem("repeatedAddition", "band1", 2, g));
  for (let g = 11; g <= 14; g += 1) items.push(repItem("repeatedAddition", "band1", 5, g));
  for (let g = 11; g <= 12; g += 1) items.push(repItem("repeatedAddition", "band1", 10, g));

  // Band 2 — 3s/4s/6s repeated addition + longer 5s/10s.
  for (let g = 3; g <= 10; g += 1) items.push(repItem("repeatedAdditionThreesFours", "band2", 3, g));
  for (let g = 3; g <= 10; g += 1) items.push(repItem("repeatedAdditionThreesFours", "band2", 4, g));
  for (let g = 3; g <= 8; g += 1) items.push(repItem("repeatedAdditionThreesFours", "band2", 6, g));
  for (const [step, groups] of [[3, 4], [3, 5], [3, 6], [3, 7], [4, 4], [4, 5], [4, 6], [5, 5], [5, 6], [5, 7], [10, 5], [10, 6], [4, 7], [3, 8], [4, 8], [5, 8], [10, 7], [3, 9], [4, 9], [5, 9], [10, 8], [3, 10], [4, 10], [5, 10], [10, 9], [10, 10], [3, 3], [4, 3], [6, 3], [3, 2]]) {
    items.push(unitDrill("unitFormMid", "band2", step, groups));
  }

  // Band 3 — big-step runs and repeated addition.
  for (const [step, groups] of [[6, 4], [25, 4], [50, 4], [100, 4], [6, 5], [25, 5], [50, 5], [100, 5], [6, 6], [25, 6], [50, 6], [100, 6], [6, 7], [25, 7], [50, 7], [100, 7], [6, 8], [25, 8], [50, 8], [100, 8], [6, 9], [25, 9], [6, 10], [50, 9], [100, 9], [50, 10]]) {
    items.push(unitDrill("unitFormBig", "band3", step, groups));
  }
  for (let g = 3; g <= 10; g += 1) items.push(repItem("repeatedAdditionBig", "band3", 25, g));
  for (let g = 3; g <= 10; g += 1) items.push(repItem("repeatedAdditionBig", "band3", 50, g));
  for (let g = 3; g <= 10; g += 1) items.push(repItem("repeatedAdditionBig", "band3", 100, g));

  return items;
}

export function groupsToProductConceptual() {
  const items = [];
  let seed = 9500;

  const pairPhr = rotor([
    (nm, o, G, s) => `${nm} counts the ${o.noun} by ${s}s: ${G} How many ${o.noun} does ${nm} count?`,
    (nm, o, G, s) => `${G} ${nm} skip counts by ${s}s. How many ${o.noun} does ${nm} see?`,
  ]);
  const groupsPic = (structureType, band, cases) => {
    cases.forEach(([oi, groups], gi) => {
      const o = GROUP_OBJECTS[oi];
      const G = Array.from({ length: groups }, () => (o.per === 2 ? o.emoji.repeat(2) : o.emoji)).join("  ");
      items.push(
        item("groupsToProduct", "conceptual", structureType, band, {
          answer: o.per * groups,
          answerType: "numberPad",
          display: {
            counting: { kind: "sum", parts: Array.from({ length: groups }, () => o.per) },
            promptText: pairPhr()(nameAt(gi * 3 + 3), o, G, o.per),
          },
        })
      );
    });
  };
  // Band 1 caps: 2s to 10 pairs? totals unchecked but prompt numbers are the
  // step (2/5/10) — safe; keep totals <= 20 for K anyway.
  groupsPic("pairsHandsDimes", "band1", [[0, 2], [1, 3], [2, 2], [3, 2], [0, 4], [1, 5], [2, 3], [0, 3], [1, 2], [2, 4], [0, 5], [1, 4], [0, 6], [1, 6], [0, 7], [1, 7], [0, 8], [1, 8], [0, 9], [1, 9], [0, 10], [1, 10], [2, 6], [3, 6], [2, 5], [3, 4]]);
  groupsPic("pairsHandsDimesMore", "band2", [[2, 6], [3, 6], [2, 7], [3, 7], [2, 8], [3, 8], [2, 9], [3, 9], [2, 10], [3, 10], [2, 5], [3, 5], [2, 4], [3, 4], [2, 3], [3, 3], [2, 6], [3, 6], [2, 7], [3, 7], [2, 8], [3, 8], [2, 9], [3, 9], [2, 10], [3, 10]]);

  const lastPhr = rotor([
    (nm, g, s) => `${nm} counts ${g} groups by ${s}s. What is the last number ${nm} says?`,
    (nm, g, s) => `${nm} skip counts ${g} jumps of ${s}. Which number does ${nm} end on?`,
  ]);
  const last = (structureType, band, cases) => {
    cases.forEach(([g, s], i) => {
      const ans = g * s;
      items.push(
        item("groupsToProduct", "conceptual", structureType, band, {
          answer: ans,
          choices: shuffled([ans, ans + s, ans - s, ans + 1], (seed += 1)),
          display: { promptText: lastPhr()(nameAt(i * 3 + 8), g, s) },
        })
      );
    });
  };
  last("predictLastSmall", "band1", [[3, 2], [4, 2], [5, 2], [2, 5], [3, 5], [2, 10], [6, 2], [7, 2], [4, 5], [8, 2], [2, 2], [9, 2], [10, 2], [5, 2], [3, 2], [4, 2]]);
  last("predictLastCount", "band2", [[3, 3], [4, 4], [5, 3], [6, 4], [4, 3], [3, 4], [7, 3], [5, 4], [6, 3], [8, 4], [8, 3], [7, 4], [9, 3], [9, 4], [10, 3], [10, 4], [5, 5], [6, 5], [7, 5], [8, 5], [4, 10], [5, 10], [6, 10], [7, 10], [9, 5], [8, 10]]);
  last("predictLastCountBig", "band3", [[4, 6], [4, 25], [4, 50], [4, 100], [5, 6], [5, 25], [5, 50], [5, 100], [6, 6], [6, 25], [6, 50], [6, 100], [7, 6], [7, 25], [8, 6], [3, 100], [7, 50], [8, 25], [9, 6], [8, 50], [9, 25], [10, 6], [7, 100], [9, 50], [10, 25], [8, 100]]);

  const groupClaimPhr = rotor([
    (nm, g, s, t) => `${nm} says ${g} groups of ${s} make ${t} when you skip count. Is ${nm} right?`,
    (nm, g, s, t) => `${nm} counts ${g} jumps of ${s} and lands on ${t}. Is that right?`,
  ]);
  const groupClaim = (structureType, band, cases) => {
    cases.forEach(([g, s, ok], i) => {
      const t = ok ? g * s : g * s + s;
      items.push(
        item("groupsToProduct", "conceptual", structureType, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { promptText: groupClaimPhr()(nameAt(i * 3 + 11), g, s, t), truth: ok },
        })
      );
    });
  };
  // Band 1 claims: stated total (true or false variant) stays <= 20.
  groupClaim("groupsClaimJudge", "band1", [[3, 2, true], [4, 2, false], [3, 5, true], [2, 5, false], [2, 10, true], [5, 2, false], [6, 2, true], [2, 2, false], [7, 2, true], [3, 2, false], [8, 2, true], [4, 2, true], [9, 2, true], [6, 2, false], [10, 2, true], [7, 2, false], [4, 5, true], [3, 5, false]]);
  groupClaim("groupsClaimJudgeMid", "band2", [[3, 3, true], [4, 3, false], [3, 4, true], [4, 4, false], [5, 6, true], [10, 4, false], [3, 5, true], [4, 5, false], [10, 5, true], [5, 7, false], [3, 6, true], [4, 6, false], [10, 6, true], [5, 8, false], [3, 7, true], [4, 7, false], [10, 7, true], [6, 6, false]]);
  groupClaim("groupsClaimJudgeBig", "band3", [[4, 6, true], [5, 6, false], [4, 25, true], [5, 25, false], [4, 50, true], [3, 50, false], [3, 100, true], [4, 100, false], [6, 6, true], [7, 6, false], [6, 25, true], [3, 25, false], [5, 50, true], [6, 50, false], [5, 100, true], [6, 100, false], [8, 6, true], [9, 6, false], [7, 25, true], [8, 25, false], [7, 50, true], [8, 50, false], [7, 100, true], [8, 100, false]]);

  return items;
}

export function buildDeterministicItems() {
  return [
    ...patternRuleProcedural(),
    ...patternRuleConceptual(),
    ...stepInferenceProcedural(),
    ...stepInferenceConceptual(),
    ...groupsToProductProcedural(),
    ...groupsToProductConceptual(),
  ];
}
