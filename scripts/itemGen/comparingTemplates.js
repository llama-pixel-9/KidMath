/* Deterministic comparing bank items — procedural and conceptual cells.
 *
 * Design source: docs/comparing-bank-design.md (EngageNY GK-M3 E-H, G1-M4,
 * G2-M3 survey). Structural inspiration only — all wording original.
 *
 * Payload conventions (enforced by the `compareMath` QC check):
 *   - symbol answers: op "?" (renders the `a ? b` layout), numeric a/b; the
 *     promptText mirrors "a ? b" for uniqueness. Expression sides are
 *     strings; the assembler re-derives their totals.
 *   - numeric answers: op "vs" + display.compare claim {kind, ...givens}
 *     (difference / gap / oneMoreLess / closerTo / midpoint).
 *   - judged items: Yes/No + display.truth.
 *
 * Family rule of thumb (signature caps: conceptual 5/sig, procedural ∞):
 * anything letter-free or pure-symbolic (symbol drills, expression compares,
 * unit-form compares, judged symbol claims) is PROCEDURAL; conceptual prose
 * always carries a rotating child name and/or object noun.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

const item = (subskill, family, structureType, band, question) => ({
  modeId: "comparing",
  subskill,
  itemFamily: family,
  structureType,
  levelRange: LEVELS[band],
  question: { a: null, b: null, op: "vs", ...question },
});

const nameAt = (i) => NAMES[i % NAMES.length];
const sym = (x, y) => (x > y ? ">" : x < y ? "<" : "=");

export const CMP_OBJECTS = [
  { emoji: "🍎", noun: "apples" },
  { emoji: "⭐", noun: "stars" },
  { emoji: "🐟", noun: "fish" },
  { emoji: "🌸", noun: "flowers" },
  { emoji: "🍪", noun: "cookies" },
  { emoji: "🐢", noun: "turtles" },
  { emoji: "🎈", noun: "balloons" },
  { emoji: "🍓", noun: "berries" },
];
const run = (emoji, n) => emoji.repeat(n);

const symbolDrill = (subskill, structureType, band, a, b) =>
  item(subskill, "procedural", structureType, band, {
    a,
    b,
    op: "?",
    answer: sym(a, b),
    answerType: "symbolSelect",
    display: { promptText: `${a} ? ${b}` },
  });

/* ================================================================== */
/* symbolSelection                                                    */
/* ================================================================== */

export function symbolSelectionProcedural() {
  const items = [];

  // Band 1 — relations within 10, equals included (GK-M3 Topic H).
  // Second operand never 5/10/15/20 — those strings belong to the
  // benchmarkCompare landmark drills.
  const b1 = [[7, 4], [2, 8], [9, 6], [1, 4], [6, 9], [8, 3], [4, 4], [10, 7], [2, 6], [9, 9], [7, 1], [3, 9], [6, 2], [4, 7], [8, 8], [1, 6], [9, 2], [5, 3], [2, 2], [6, 6], [3, 1], [4, 9], [8, 6], [1, 1], [7, 7], [2, 9], [6, 4], [5, 1], [3, 3], [10, 2], [4, 6], [1, 8], [9, 4], [7, 3], [3, 6], [10, 8], [4, 2], [8, 9], [1, 3], [6, 3], [5, 2], [10, 4], [2, 7], [9, 8], [3, 8], [7, 6], [5, 9], [10, 1], [4, 8], [6, 7], [8, 2], [9, 1], [2, 4]];
  for (const [a, b] of b1) items.push(symbolDrill("symbolSelection", "symbolWithin10", "band1", a, b));

  // Judged symbol claims within 20 ("Is this right?" register).
  const judge = (structureType, band, a, s, b) =>
    item("symbolSelection", "procedural", structureType, band, {
      answer: sym(a, b) === s ? "Yes" : "No",
      choices: ["Yes", "No"],
      subPrompt: "Is this right?",
      display: { promptText: `${a} ${s} ${b}`, truth: sym(a, b) === s },
    });
  const j1 = [[7, ">", 4], [3, "<", 9], [5, "=", 5], [8, "<", 6], [2, ">", 7], [10, ">", 4], [6, "=", 9], [4, "<", 8], [9, ">", 9], [1, "<", 5], [7, "=", 7], [10, "<", 3], [6, ">", 2], [3, "=", 8], [5, "<", 10], [8, ">", 8], [2, "<", 4], [12, "=", 12], [4, ">", 6], [10, "=", 10], [1, ">", 3], [6, "<", 7], [8, "=", 5], [3, ">", 2], [7, "<", 5], [5, ">", 1]];
  for (const [a, s, b] of j1) items.push(judge("symbolClaimJudge", "band1", a, s, b));

  // Band 2 — two-digit traps: digit reversals (13/31), same tens, same ones,
  // equals (G1-M4 comparison symbols).
  const b2 = [[13, 31], [24, 42], [35, 53], [46, 64], [57, 75], [68, 86], [79, 97], [12, 21], [23, 32], [45, 54], [27, 24], [56, 59], [83, 87], [61, 68], [92, 95], [34, 74], [48, 28], [67, 27], [85, 45], [19, 91], [33, 33], [50, 50], [76, 76], [44, 47], [70, 30], [25, 52], [38, 83], [49, 94], [58, 55], [66, 69], [71, 17], [82, 82], [15, 51], [26, 62], [37, 73], [93, 39], [40, 44], [59, 95], [63, 36], [88, 84], [29, 92], [77, 71], [16, 61], [43, 34], [96, 69], [22, 25], [51, 55], [30, 33], [78, 87], [14, 41], [65, 65]];
  for (const [a, b] of b2) items.push(symbolDrill("symbolSelection", "symbolTwoDigit", "band2", a, b));

  // Expression compares — the drill IS the reasoning (1.OA equality work).
  const expr = (structureType, band, a1, a2, b1, b2) =>
    item("symbolSelection", "procedural", structureType, band, {
      a: `${a1} + ${a2}`,
      b: `${b1} + ${b2}`,
      op: "?",
      answer: sym(a1 + a2, b1 + b2),
      answerType: "symbolSelect",
      display: { promptText: `${a1} + ${a2} ? ${b1} + ${b2}` },
    });
  const e1 = [[3, 4, 5, 2], [2, 6, 4, 4], [5, 3, 2, 7], [4, 4, 3, 6], [6, 2, 5, 4], [3, 5, 6, 2], [7, 2, 4, 5], [2, 3, 3, 2], [5, 5, 6, 4], [4, 2, 2, 4], [6, 3, 3, 6], [2, 7, 5, 3], [3, 3, 4, 2], [5, 2, 3, 5], [4, 6, 7, 3], [6, 4, 8, 2], [2, 2, 1, 3], [7, 3, 5, 5], [3, 6, 4, 4], [5, 4, 2, 8], [4, 3, 6, 1], [8, 2, 4, 6], [2, 5, 3, 4], [6, 6, 7, 5], [3, 2, 2, 3]];
  for (const [a1, a2, b1, b2] of e1) items.push(expr("expressionCompare", "band2", a1, a2, b1, b2));

  // Unit-form compares (place-value-first reasoning as a drill).
  const unit = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const pvData = [[2, 5, 3, 1], [4, 0, 3, 9], [5, 2, 5, 7], [1, 8, 2, 3], [6, 4, 6, 4], [7, 1, 1, 7], [3, 6, 6, 3], [8, 2, 8, 5], [4, 9, 5, 0], [2, 2, 2, 2], [9, 3, 3, 9], [5, 5, 4, 8], [6, 0, 5, 9], [1, 4, 4, 1], [7, 7, 7, 3], [3, 3, 3, 8], [8, 6, 6, 8], [2, 9, 9, 2], [4, 4, 4, 4], [6, 7, 7, 6], [5, 1, 1, 5], [9, 0, 8, 9], [3, 2, 2, 8], [7, 5, 5, 7], [8, 8, 8, 8]];
  for (const [t1, o1, t2, o2] of pvData) {
    items.push(
      item("symbolSelection", "procedural", "placeValueCompare", "band2", {
        a: `${unit(t1, "ten")} ${unit(o1, "one")}`,
        b: `${unit(t2, "ten")} ${unit(o2, "one")}`,
        op: "?",
        answer: sym(t1 * 10 + o1, t2 * 10 + o2),
        answerType: "symbolSelect",
        display: { promptText: `${unit(t1, "ten")} ${unit(o1, "one")} ? ${unit(t2, "ten")} ${unit(o2, "one")}` },
      })
    );
  }

  // Band 3 — three-digit: different digit COUNTS (98 vs 102), hundreds
  // reversals (G2-M3), compensation pairs to decide WITHOUT computing.
  const b3 = [[98, 102], [99, 100], [199, 201], [89, 111], [95, 105], [203, 302], [415, 451], [326, 362], [540, 504], [617, 671], [289, 298], [730, 703], [846, 864], [152, 125], [479, 497], [368, 386], [925, 952], [214, 241], [583, 538], [667, 667], [700, 700], [808, 880], [190, 109], [455, 545], [312, 321], [96, 106], [978, 987], [640, 604], [235, 253], [871, 817], [409, 490], [128, 182], [356, 365], [742, 724], [518, 581], [293, 239], [684, 648], [107, 98], [950, 905], [161, 116]];
  for (const [a, b] of b3) items.push(symbolDrill("symbolSelection", "symbolThreeDigit", "band3", a, b));
  const e3 = [[37, 48, 38, 47], [25, 64, 26, 63], [53, 29, 54, 28], [46, 35, 45, 36], [62, 19, 61, 20], [74, 18, 75, 16], [29, 56, 30, 57], [45, 27, 44, 26], [58, 33, 59, 34], [67, 24, 66, 22], [39, 42, 40, 41], [51, 36, 52, 35], [28, 65, 27, 64], [43, 38, 44, 39], [76, 15, 75, 14], [34, 57, 35, 56], [69, 22, 70, 21], [47, 44, 46, 45], [55, 26, 56, 27], [63, 28, 62, 29]];
  for (const [a1, a2, b1, b2] of e3) items.push(expr("relationalNoCompute", "band3", a1, a2, b1, b2));
  const j3 = [[98, "<", 102], [230, ">", 203], [415, "=", 415], [199, ">", 200], [560, "<", 506], [321, ">", 312], [644, "=", 646], [105, "<", 95], [780, ">", 78], [432, "<", 423], [999, "<", 1000], [217, "=", 217], [853, ">", 858], [364, "<", 436], [508, ">", 580], [129, "<", 192], [676, "=", 667], [945, ">", 495]].map((x) => x);
  for (const [a, s, b] of j3) items.push(judge("bigSymbolClaimJudge", "band3", a, s, b));

  return items;
}

export function symbolSelectionConceptual() {
  const items = [];
  let seed = 4000;

  // Band 1 — pictured rows, choose the symbol relating Row A to Row B.
  const rowSymPhr = rotor([
    (o, A, B) => `Row A: ${A} Row B: ${B} Choose the symbol that compares Row A to Row B counting ${o.noun}.`,
    (o, A, B) => `Row A: ${A} Row B: ${B} Which symbol goes between the counts of ${o.noun}?`,
    (o, A, B) => `Row A: ${A} Row B: ${B} Compare the two rows of ${o.noun} and pick the sign.`,
    (o, A, B) => `Row A: ${A} Row B: ${B} What sign fits between the two counts of ${o.noun}?`,
  ]);
  const rowSym = (structureType, band, pairs, painter, stride = 1, shift = 0) => {
    pairs.forEach(([a, b], i) => {
      const o = CMP_OBJECTS[(i * stride + shift) % CMP_OBJECTS.length];
      items.push(
        item("symbolSelection", "conceptual", structureType, band, {
          answer: sym(a, b),
          answerType: "symbolSelect",
          display: {
            compare: { kind: "counts", a, b },
            promptText: rowSymPhr()(o, painter(o.emoji, a), painter(o.emoji, b)),
          },
        })
      );
    });
  };
  rowSym("rowsChooseSymbol", "band1", [[5, 3], [4, 7], [8, 6], [3, 3], [9, 7], [6, 4], [7, 9], [5, 5], [10, 8], [4, 5], [6, 9], [8, 8], [3, 5], [9, 6], [7, 4], [5, 10], [8, 3], [4, 4], [10, 7], [6, 2], [9, 9], [2, 4], [7, 10], [3, 8], [6, 6], [8, 5]], run);
  const paintRows = (emoji, n) => {
    const r = [];
    for (let s = 0; s < n; s += 10) r.push(run(emoji, Math.min(10, n - s)));
    return r.join(" | ");
  };
  rowSym("rowsChooseSymbolTeen", "band2", [[12, 14], [15, 13], [11, 16], [18, 17], [13, 13], [16, 12], [14, 15], [19, 18], [17, 11], [12, 12], [15, 18], [13, 11], [16, 19]], paintRows, 3, 1);

  // Alligator-mouth reasoning, worded (the mouth eats the bigger number).
  const gatorPhr = rotor([
    (nm, a, b) => `${nm} remembers: the open mouth eats the bigger number. Which symbol goes between ${a} and ${b}?`,
    (nm, a, b) => `${nm} draws the hungry mouth facing the larger number. Comparing ${a} and ${b}, which symbol is it?`,
    (nm, a, b) => `Help ${nm} pick the sign for ${a} and ${b}. Remember which way the mouth opens!`,
  ]);
  const gator = (structureType, band, pairs) => {
    pairs.forEach(([a, b], i) => {
      items.push(
        item("symbolSelection", "conceptual", structureType, band, {
          a,
          b,
          answer: sym(a, b),
          answerType: "symbolSelect",
          display: { promptText: gatorPhr()(nameAt(i * 3 + 1), a, b) },
        })
      );
    });
  };
  gator("mouthReasoning", "band1", [[6, 9], [8, 2], [4, 10], [7, 5], [3, 6], [9, 1], [5, 8], [10, 4], [2, 7], [6, 3], [8, 10], [1, 4], [9, 5], [4, 8], [7, 2]]);
  gator("mouthReasoningTeen", "band2", [[13, 31], [26, 19], [40, 44], [58, 55], [62, 26], [37, 41], [79, 82], [24, 20], [95, 59], [46, 48], [51, 15], [68, 86], [72, 27], [83, 88], [94, 49]]);

  // Multi-select: choose BOTH true statements.
  const bothTruePhr = rotor([
    (nm) => `${nm} wrote four comparisons; two are true. Choose BOTH true ones.`,
    (nm) => `Two of ${nm}'s statements are true. Select both.`,
    (nm) => `Check ${nm}'s work: pick the two comparisons that are correct.`,
  ]);
  const bothTrue = (structureType, band, sets, offset = 0) => {
    sets.forEach(([t1, t2, f1, f2], i) => {
      items.push(
        item("symbolSelection", "conceptual", structureType, band, {
          answer: [t1, t2],
          answerType: "multiSelect",
          display: { promptText: bothTruePhr()(nameAt(i * 3 + 6 + offset)), options: shuffled([t1, t2, f1, f2], (seed += 1)), requiredCount: 2 },
        })
      );
    });
  };
  // Statements are pre-authored (true, true, false, false).
  bothTrue("bothTrueWithin10", "band1", [
    ["3 < 5", "9 > 4", "6 > 8", "2 > 7"],
    ["7 > 2", "4 < 9", "10 < 3", "5 > 6"],
    ["8 > 1", "3 < 10", "6 < 2", "9 < 5"],
    ["2 < 6", "10 > 7", "4 > 9", "1 > 8"],
    ["5 < 7", "8 > 3", "2 > 10", "7 < 4"],
    ["6 > 4", "1 < 9", "10 < 5", "3 > 7"],
    ["9 > 6", "2 < 8", "7 > 10", "5 < 1"],
    ["4 < 10", "8 > 5", "3 > 9", "6 < 2"],
    ["10 > 2", "5 < 8", "9 < 3", "4 > 7"],
    ["1 < 6", "7 > 3", "2 > 9", "8 < 4"],
    ["3 < 8", "10 > 1", "5 > 10", "6 < 3"],
    ["9 > 7", "4 < 6", "8 < 2", "10 < 9"],
    ["2 < 5", "6 > 1", "7 < 3", "9 > 10"],
    ["8 > 4", "3 < 7", "1 > 5", "10 < 6"],
    ["5 > 2", "9 < 10", "4 > 8", "7 < 6"],
  ]);
  bothTrue("bothTrueBig", "band3", [
    ["98 < 102", "310 > 301", "205 > 250", "467 < 447"],
    ["540 > 504", "89 < 111", "620 < 602", "333 > 353"],
    ["199 < 201", "875 > 857", "410 < 401", "766 > 776"],
    ["102 > 89", "556 < 565", "930 < 903", "241 > 421"],
    ["617 > 176", "384 < 438", "509 > 590", "722 < 227"],
    ["95 < 105", "648 > 486", "270 < 207", "853 < 835"],
    ["300 > 289", "715 < 751", "460 > 640", "928 < 892"],
    ["136 < 163", "594 > 549", "807 < 780", "251 > 512"],
    ["672 > 627", "108 < 180", "365 > 635", "944 < 494"],
    ["489 < 498", "820 > 802", "157 > 175", "603 < 360"],
    ["234 < 243", "961 > 916", "578 < 557", "342 > 432"],
    ["705 > 570", "129 < 291", "886 < 868", "417 > 471"],
    ["350 < 503", "692 > 629", "148 > 184", "775 < 757"],
    ["816 > 618", "263 < 326", "590 < 509", "934 > 943"],
    ["471 < 714", "358 < 385", "266 > 626", "180 < 108"],
  ], 1);

  // Error analysis: the flipped symbol (names rotate signatures).
  const flipPhr = rotor([
    (nm, a, wrote, b) => `${nm} wrote ${a} ${wrote} ${b}, saying the open side always points right. Which symbol belongs between ${a} and ${b}?`,
    (nm, a, wrote, b) => `${nm} compared ${a} and ${b} and picked ${wrote}. The hungry mouth should eat the bigger number! Which symbol is correct?`,
    (nm, a, wrote, b) => `To compare ${a} and ${b}, ${nm} chose ${wrote}. Check ${nm}'s work — which symbol makes it true?`,
  ]);
  const flip = (structureType, band, pairs) => {
    pairs.forEach(([a, b], i) => {
      const correct = sym(a, b);
      const wrote = correct === "<" ? ">" : "<";
      items.push(
        item("symbolSelection", "conceptual", structureType, band, {
          a,
          b,
          answer: correct,
          answerType: "symbolSelect",
          display: { promptText: flipPhr()(nameAt(i * 3 + 2), a, wrote, b) },
        })
      );
    });
  };
  flip("symbolFlipFix", "band2", [[24, 42], [57, 39], [63, 81], [18, 45], [76, 58], [31, 47], [92, 68], [49, 71], [85, 53], [27, 60], [54, 36], [66, 90], [43, 25], [70, 82], [38, 61], [95, 77], [12, 34], [59, 88], [80, 46], [23, 50], [67, 41], [74, 96], [35, 19], [88, 62], [51, 73], [42, 24], [39, 57]]);
  flip("symbolFlipFixBig", "band3", [[203, 302], [415, 451], [326, 263], [540, 504], [617, 671], [289, 298], [730, 703], [98, 102], [846, 864], [152, 125], [479, 497], [368, 386], [925, 952], [214, 241], [583, 538], [190, 109], [455, 545], [312, 321], [640, 604], [235, 253]]);

  // Digit-count trap, worded (more digits wins — 98 vs 102).
  const digitPhr = rotor([
    (nm, a, b) => `${nm} says ${a} must be greater because it starts with a bigger digit. Compare ${a} and ${b} — which symbol is right?`,
    (nm, a, b) => `${nm} thinks a number that starts with 9 always wins. Choose the true symbol for ${a} and ${b}.`,
  ]);
  [[98, 102], [95, 105], [89, 111], [97, 103], [96, 106], [99, 100], [92, 120], [94, 104], [91, 110], [93, 130], [88, 108], [90, 101], [87, 107], [86, 112], [85, 115]].forEach(([a, b], i) => {
    items.push(
      item("symbolSelection", "conceptual", "digitCountTrap", "band3", {
        a,
        b,
        answer: sym(a, b),
        answerType: "symbolSelect",
        display: { promptText: digitPhr()(nameAt(i * 3 + 5), a, b) },
      })
    );
  });

  return items;
}

/* ================================================================== */
/* benchmarkCompare                                                   */
/* ================================================================== */

export function benchmarkCompareProcedural() {
  const items = [];
  // Landmark drills: the benchmark is the second operand.
  for (let n = 0; n <= 10; n += 1) items.push(symbolDrill("benchmarkCompare", "vsFive", "band1", n, 5));
  for (let n = 0; n <= 20; n += 1) items.push(symbolDrill("benchmarkCompare", "vsTen", "band1", n, 10));
  for (let n = 11; n <= 19; n += 1) items.push(symbolDrill("benchmarkCompare", "vsTwenty", "band1", n, 20));
  items.push(symbolDrill("benchmarkCompare", "vsTwenty", "band1", 20, 20));
  for (let n = 11; n <= 19; n += 1) items.push(symbolDrill("benchmarkCompare", "vsFifteen", "band1", n, 15));
  for (const n of [12, 23, 34, 45, 56, 67, 78, 89, 21, 32, 43, 54, 65, 76, 87, 98, 19, 28, 37, 46, 55, 64, 73, 82, 91, 41]) {
    items.push(symbolDrill("benchmarkCompare", "vsFifty", "band2", n, 50));
  }
  for (const n of [25, 35, 43, 55, 65, 75, 85, 92, 33, 68, 42, 57, 71, 86, 94, 29, 62, 79, 24, 27, 36, 49, 53, 81, 97]) {
    const bench = Math.round(n / 10) * 10;
    items.push(symbolDrill("benchmarkCompare", "vsNearestDecade", "band2", n, bench));
  }
  for (const n of [98, 102, 96, 101, 110, 90, 150, 75, 125, 87, 113, 95, 105, 100, 140, 60, 175, 82, 118, 93, 107, 111, 89, 130, 70, 160]) {
    items.push(symbolDrill("benchmarkCompare", "vsHundred", "band3", n, 100));
  }
  for (const n of [499, 501, 450, 550, 505, 495, 510, 490, 525, 475, 530, 470, 500, 560, 440, 585, 415, 502, 498, 545, 455, 515, 485, 570, 430]) {
    items.push(symbolDrill("benchmarkCompare", "vsFiveHundred", "band3", n, 500));
  }
  return items;
}

export function benchmarkCompareConceptual() {
  const items = [];
  let seed = 5000;

  // Closer-to choices (child name keeps signatures apart).
  const closerPhr = rotor([
    (nm, n, lo, hi) => `${nm} stands at ${n} on the number path. Is ${n} closer to ${lo} or to ${hi}?`,
    (nm, n, lo, hi) => `${nm} wonders: does ${n} sit nearer ${lo} or ${hi}?`,
    (nm, n, lo, hi) => `Help ${nm}: which is the shorter hop from ${n} — down to ${lo} or up to ${hi}?`,
  ]);
  const closer = (structureType, band, ns) => {
    ns.forEach((n, i) => {
      const lo = Math.floor(n / 10) * 10;
      const hi = lo + 10;
      const answer = n - lo < hi - n ? lo : hi;
      items.push(
        item("benchmarkCompare", "conceptual", structureType, band, {
          answer,
          choices: shuffled([lo, hi], (seed += 1)),
          display: { compare: { kind: "closerTo", n, lo, hi }, promptText: closerPhr()(nameAt(i * 3), n, lo, hi) },
        })
      );
    });
  };
  closer("closerToTen", "band1", [11, 13, 17, 19, 12, 18, 14, 16]);
  closer("closerToDecade", "band2", [23, 27, 41, 48, 62, 69, 74, 76, 83, 88, 31, 39, 52, 58, 91, 97, 24, 47, 63, 86]);
  closer("closerToDecadeBig", "band3", [104, 108, 213, 217, 341, 348, 472, 479, 526, 533, 654, 668, 781, 789, 892, 897, 913, 946]);

  // Ten-frame gap to the benchmark (visual).
  const framePhr = rotor([
    (f) => `The frame holds ${f} counters. Compare it to a full ten — how many counters are missing?`,
    (f) => `A full frame takes 10 counters; this one shows ${f}. How many more counters would fill it?`,
    (f) => `${f} counters sit in the frame. How far from a full ten is that?`,
  ]);
  for (const f of [3, 4, 5, 6, 7, 8, 9, 2]) {
    items.push(
      item("benchmarkCompare", "conceptual", "frameGapToTen", "band1", {
        answer: 10 - f,
        answerType: "tenFrame",
        display: { filled: f, frames: 1, frameMode: "count", compare: { kind: "gap", have: f, target: 10 }, promptText: framePhr()(f) },
      })
    );
  }

  // Which number fits between the bounds (constraint choice, named).
  const fitsPhr = rotor([
    (nm, lo, hi) => `${nm} needs a number greater than ${lo} and less than ${hi}. Which one works?`,
    (nm, lo, hi) => `Help ${nm} find the number between ${lo} and ${hi}.`,
    (nm, lo, hi) => `${nm} hunts for a number bigger than ${lo} but smaller than ${hi}. Pick it.`,
  ]);
  const fits = (structureType, band, bounds) => {
    bounds.forEach(([lo, hi], i) => {
      const correct = Math.floor((lo + hi) / 2);
      const wrong = [...new Set([lo - 1, hi + 1, hi + 3])].filter((w) => w >= 0 && (w <= lo || w >= hi));
      items.push(
        item("benchmarkCompare", "conceptual", structureType, band, {
          answer: correct,
          choices: shuffled([correct, ...wrong], (seed += 1)),
          display: { promptText: fitsPhr()(nameAt(i * 3 + 7), lo, hi) },
        })
      );
    });
  };
  fits("fitsBetween", "band1", [[3, 7], [5, 9], [2, 6], [6, 10], [4, 8], [7, 11], [3, 9], [5, 11], [8, 12], [2, 8], [6, 12], [4, 10], [1, 5], [9, 13], [7, 13]]);
  fits("fitsBetweenTwoDigit", "band2", [[20, 30], [45, 55], [60, 70], [15, 25], [75, 85], [30, 40], [85, 95], [50, 60], [10, 20], [65, 75], [25, 35], [40, 50], [70, 80], [55, 65], [35, 45]]);
  fits("fitsBetweenBig", "band3", [[100, 120], [250, 270], [480, 500], [340, 360], [600, 620], [750, 770], [190, 210], [530, 550], [820, 840], [410, 430], [660, 680], [900, 920], [140, 160], [290, 310], [570, 590]]);

  // Threshold judgments (named; Yes/No).
  const threshPhr = rotor([
    (nm, n, bench) => `${nm} needs more than ${bench}. Is ${n} more than ${bench}?`,
    (nm, n, bench) => `${nm} asks: does ${n} come after ${bench} when counting up?`,
    (nm, n, bench) => `${nm} guesses that ${n} beats ${bench}. Is that right?`,
  ]);
  const thresh = (structureType, band, pairs) => {
    pairs.forEach(([n, bench], i) => {
      items.push(
        item("benchmarkCompare", "conceptual", structureType, band, {
          answer: n > bench ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { promptText: threshPhr()(nameAt(i * 3 + 4), n, bench), truth: n > bench },
        })
      );
    });
  };
  thresh("moreThanBenchmark", "band1", [[7, 5], [4, 5], [12, 10], [9, 10], [15, 10], [3, 5], [18, 20], [6, 5], [11, 10], [20, 15], [8, 10], [13, 15], [16, 15], [19, 20], [2, 5], [14, 10], [17, 15], [5, 10], [10, 5], [15, 20]]);
  thresh("moreThanBenchmarkBig", "band3", [[104, 100], [97, 100], [512, 500], [488, 500], [305, 300], [299, 300], [750, 700], [680, 700], [901, 900], [889, 900], [120, 100], [95, 100], [405, 400], [396, 400], [610, 600]]);

  // How far from the benchmark (numeric, claim-checked, named).
  const farPhr = rotor([
    (nm, n, bench) => `${nm} counts the steps from ${n} to ${bench}. How many steps is that?`,
    (nm, n, bench) => `${nm} hops from ${n} to ${bench} one number at a time. How many hops?`,
    (nm, n, bench) => `${nm} asks: what is the distance between ${n} and ${bench}?`,
  ]);
  const far = (structureType, band, pairs) => {
    pairs.forEach(([n, bench], i) => {
      const [lo, hi] = n < bench ? [n, bench] : [bench, n];
      items.push(
        item("benchmarkCompare", "conceptual", structureType, band, {
          answer: hi - lo,
          answerType: "numberPad",
          display: { compare: { kind: "difference", bigger: hi, smaller: lo }, promptText: farPhr()(nameAt(i * 3 + 9), n, bench) },
        })
      );
    });
  };
  far("distanceFromTen", "band2", [[7, 10], [13, 10], [16, 20], [24, 20], [37, 40], [42, 40], [55, 50], [48, 50], [61, 60], [78, 80], [83, 80], [96, 100], [29, 30], [34, 30], [17, 20], [72, 70]]);
  far("distanceFromHundred", "band3", [[93, 100], [108, 100], [188, 200], [214, 200], [297, 300], [312, 300], [485, 500], [521, 500], [694, 700], [711, 700], [890, 900], [908, 900], [96, 100], [104, 100], [195, 200], [309, 300]]);

  // Frame vs frame: which is nearer full (visual benchmark reasoning).
  const twoFramePhr = rotor([
    (nm, a, b) => `${nm} sees two frames: one with ${a} counters, one with ${b}. Which count is closer to a full ten: ${a} or ${b}?`,
    (nm, a, b) => `Frame one holds ${a} counters, frame two holds ${b}. ${nm} asks: which is nearer ten — ${a} or ${b}?`,
  ]);
  [[7, 4], [8, 3], [9, 5], [6, 2], [8, 5], [9, 3], [7, 2], [6, 9], [4, 8], [5, 9], [3, 7], [2, 6]].forEach(([a, b], i) => {
    const answer = 10 - a < 10 - b ? a : b;
    items.push(
      item("benchmarkCompare", "conceptual", "nearerToFull", "band1", {
        answer,
        choices: shuffled([a, b], (seed += 1)),
        display: { promptText: twoFramePhr()(nameAt(i * 3 + 11), a, b) },
      })
    );
  });

  return items;
}

/* ================================================================== */
/* distanceCompare                                                    */
/* ================================================================== */

export function distanceCompareProcedural() {
  const items = [];
  let seed = 6000;

  const orderPhr = rotor([
    (list) => `Order from smallest to largest: ${list}.`,
    (list) => `Line these up, littlest first: ${list}.`,
  ]);
  const order = (structureType, band, triples) => {
    triples.forEach((nums) => {
      const sorted = [...nums].sort((x, y) => x - y);
      const correct = sorted.join(", ");
      const wrong = [
        [sorted[1], sorted[0], sorted[2]],
        [sorted[2], sorted[1], sorted[0]],
        [sorted[0], sorted[2], sorted[1]],
      ].map((a) => a.join(", "));
      items.push(
        item("distanceCompare", "procedural", structureType, band, {
          answer: correct,
          choices: shuffled([...new Set([correct, ...wrong])], (seed += 1)),
          display: { promptText: orderPhr()(nums.join(", ")) },
        })
      );
    });
  };
  order("orderWithin10", "band1", [[4, 9, 2], [7, 3, 8], [1, 6, 5], [9, 5, 10], [2, 7, 4], [8, 1, 6], [3, 10, 5], [6, 2, 9], [5, 8, 1], [10, 4, 7], [3, 6, 1], [9, 2, 5], [7, 10, 8], [4, 1, 3], [6, 9, 8], [2, 5, 3], [8, 4, 10], [1, 7, 2]]);
  order("orderTwoDigit", "band2", [[34, 43, 24], [67, 76, 66], [51, 15, 55], [89, 98, 88], [23, 32, 22], [45, 54, 44], [71, 17, 77], [92, 29, 99], [36, 63, 33], [58, 85, 55], [12, 21, 11], [47, 74, 44], [69, 96, 66], [83, 38, 88], [25, 52, 22], [61, 16, 66], [94, 49, 99], [37, 73, 33]]);
  order("orderThreeDigit", "band3", [[203, 302, 230], [415, 451, 145], [326, 362, 263], [540, 504, 450], [617, 671, 176], [289, 298, 829], [730, 703, 370], [846, 864, 468], [152, 125, 521], [479, 497, 794], [368, 386, 638], [925, 952, 259], [214, 241, 412], [583, 538, 358], [667, 676, 766], [98, 102, 89], [190, 109, 910], [455, 545, 454]]);

  const pickPhr = rotor([
    (list) => `Which is the smallest: ${list}?`,
    (list) => `Which is the largest: ${list}?`,
  ]);
  const pickOne = (structureType, band, triples) => {
    triples.forEach((nums) => {
      const text = pickPhr()(nums.join(", "));
      const wantSmall = /smallest/.test(text);
      const answer = wantSmall ? Math.min(...nums) : Math.max(...nums);
      items.push(
        item("distanceCompare", "procedural", structureType, band, {
          answer,
          choices: shuffled([...nums], (seed += 1)),
          display: { promptText: text },
        })
      );
    });
  };
  pickOne("pickExtremeWithin10", "band1", [[3, 8, 5], [9, 2, 6], [1, 7, 4], [10, 6, 8], [2, 5, 9], [7, 4, 10], [6, 1, 3], [8, 10, 2], [5, 9, 7], [4, 2, 8], [9, 6, 1], [3, 7, 10], [8, 4, 6], [10, 1, 5], [2, 9, 3], [6, 8, 4]]);
  pickOne("pickExtremeTwoDigit", "band2", [[34, 43, 40], [67, 76, 70], [51, 15, 50], [89, 98, 90], [23, 32, 30], [45, 54, 50], [71, 17, 70], [92, 29, 90], [36, 63, 60], [58, 85, 80], [12, 21, 20], [47, 74, 70], [69, 96, 90], [83, 38, 80], [25, 52, 50], [61, 16, 60]]);
  pickOne("pickExtremeThreeDigit", "band3", [[203, 302, 230], [415, 451, 145], [326, 362, 263], [540, 504, 450], [617, 671, 176], [289, 298, 829], [730, 703, 370], [846, 864, 468], [152, 125, 521], [479, 497, 794], [368, 386, 638], [925, 952, 259], [214, 241, 412], [583, 538, 358], [98, 102, 89], [667, 676, 766]]);

  // One/ten more/less, typed (claim-checked).
  const stepPhr = rotor([
    (n, w) => `What number is ${w} than ${n}?`,
    (n, w) => `Say the number that is ${w} than ${n}.`,
  ]);
  const step = (structureType, band, data) => {
    data.forEach(([n, delta]) => {
      const w = `${Math.abs(delta) === 1 ? "one" : "ten"} ${delta > 0 ? "more" : "less"}`;
      items.push(
        item("distanceCompare", "procedural", structureType, band, {
          answer: n + delta,
          answerType: "numberPad",
          display: { compare: { kind: "oneMoreLess", n, delta }, promptText: stepPhr()(n, w) },
        })
      );
    });
  };
  step("oneMoreLess", "band1", [[4, 1], [7, -1], [9, 1], [12, -1], [15, 1], [18, -1], [6, 1], [11, -1], [14, 1], [19, -1], [3, 1], [8, -1], [16, 1], [13, -1], [17, 1], [5, -1], [10, 1], [20, -1]]);
  step("tenMoreLess", "band2", [[23, 10], [45, -10], [67, 10], [89, -10], [34, 10], [56, -10], [78, 10], [12, 10], [90, -10], [41, 10], [63, -10], [85, 10], [27, -10], [59, 10], [72, -10], [38, 10]]);
  step("tenMoreLessBig", "band3", [[104, 10], [217, -10], [341, 10], [472, -10], [526, 10], [654, -10], [781, 10], [892, -10], [913, 10], [190, -10], [305, 10], [488, -10], [601, 10], [750, -10], [837, 10], [946, -10]]);

  return items;
}

export function distanceCompareConceptual() {
  const items = [];
  let seed = 7000;

  // Which row has more/fewer — matched rows (GK-M3 E-F).
  const morePhr = rotor([
    (o, A, B) => `Row A: ${A} Row B: ${B} Which row has more ${o.noun}?`,
    (o, A, B) => `Row A: ${A} Row B: ${B} Which row has fewer ${o.noun}?`,
    (o, A, B) => `Top: ${A} Bottom: ${B} Which row shows more ${o.noun}?`,
    (o, A, B) => `Top: ${A} Bottom: ${B} Which row shows fewer ${o.noun}?`,
  ]);
  const rows = (structureType, band, pairs, painter) => {
    pairs.forEach(([a, b], i) => {
      const o = CMP_OBJECTS[i % CMP_OBJECTS.length];
      const text = morePhr()(o, painter(o.emoji, a), painter(o.emoji, b));
      const wantMore = /more/.test(text);
      const A = /Row A/.test(text) ? "Row A" : "Top row";
      const B = /Row A/.test(text) ? "Row B" : "Bottom row";
      items.push(
        item("distanceCompare", "conceptual", structureType, band, {
          answer: (a > b) === wantMore ? A : B,
          choices: [A, B],
          display: { promptText: text },
        })
      );
    });
  };
  const paint = (emoji, n) => {
    const rowsArr = [];
    for (let s = 0; s < n; s += 10) rowsArr.push(run(emoji, Math.min(10, n - s)));
    return rowsArr.join(" | ");
  };
  rows("rowsMoreFewer", "band1", [[5, 3], [4, 7], [8, 6], [3, 6], [9, 7], [6, 4], [7, 9], [5, 8], [10, 8], [4, 5], [6, 9], [8, 5], [3, 5], [9, 6], [7, 4], [5, 10], [8, 3], [4, 6], [10, 7], [6, 2], [9, 5], [2, 4], [7, 10], [3, 8], [2, 5], [6, 3], [9, 2], [4, 8], [10, 3], [5, 7], [8, 4], [3, 7], [7, 2], [6, 10]], run);
  rows("rowsMoreFewerTeen", "band2", [[12, 14], [15, 13], [11, 16], [18, 17], [13, 19], [16, 12], [14, 15], [19, 18], [17, 11], [12, 13], [15, 18], [13, 11], [16, 19], [18, 14], [11, 12], [19, 15]], paint);

  // Which is closer to the target (named).
  const closerWhoPhr = rotor([
    (nm, t, x, y) => `${nm} aims for ${t}. Which is closer to ${t}: ${x} or ${y}?`,
    (nm, t, x, y) => `${nm} compares ${x} and ${y}. Which one sits nearer ${t}?`,
  ]);
  const closerWho = (structureType, band, triples) => {
    triples.forEach(([t, x, y], i) => {
      const answer = Math.abs(t - x) < Math.abs(t - y) ? x : y;
      items.push(
        item("distanceCompare", "conceptual", structureType, band, {
          answer,
          choices: shuffled([x, y], (seed += 1)),
          display: { promptText: closerWhoPhr()(nameAt(i * 3 + 6), t, x, y) },
        })
      );
    });
  };
  closerWho("closerToTarget", "band2", [[20, 17, 26], [30, 24, 33], [50, 46, 57], [40, 35, 43], [60, 52, 63], [70, 66, 78], [80, 74, 83], [90, 85, 97], [25, 21, 31], [45, 42, 51], [65, 58, 68], [35, 29, 38], [55, 49, 59], [75, 71, 82], [15, 11, 21], [85, 79, 89], [95, 91, 99], [10, 7, 14]]);
  closerWho("closerToTargetBig", "band3", [[200, 187, 220], [300, 285, 310], [500, 480, 515], [400, 393, 412], [600, 570, 620], [700, 690, 725], [800, 780, 815], [900, 870, 920], [250, 235, 260], [450, 440, 465], [650, 630, 665], [350, 340, 370], [550, 530, 565], [750, 735, 770], [150, 135, 160], [850, 830, 870]]);

  // Halfway point on the number line (widget; named).
  const midPhr = rotor([
    (nm, lo, hi) => `${nm} hops from ${lo} to ${hi}. Tap the number halfway between them.`,
    (nm, lo, hi) => `Show ${nm} the middle of ${lo} and ${hi} on the line.`,
  ]);
  const mid = (structureType, band, pairs, stepSize) => {
    pairs.forEach(([lo, hi], i) => {
      items.push(
        item("distanceCompare", "conceptual", structureType, band, {
          answer: (lo + hi) / 2,
          answerType: "numberLine",
          display: {
            compare: { kind: "midpoint", lo, hi },
            promptText: midPhr()(nameAt(i * 3 + 8), lo, hi),
            min: lo,
            max: hi,
            step: stepSize,
            labelEvery: 5,
            lineMode: "locate",
          },
        })
      );
    });
  };
  mid("lineMidpoint", "band2", [[2, 12], [4, 14], [6, 16], [10, 20], [12, 22], [16, 26], [20, 30], [24, 34], [8, 18], [14, 24], [18, 28], [22, 32], [26, 36], [30, 40], [34, 44], [38, 48]], 1);
  mid("lineMidpointBig", "band3", [[10, 60], [20, 70], [30, 80], [40, 90], [50, 100], [0, 50], [60, 110], [70, 120], [15, 65], [25, 75], [35, 85], [45, 95], [55, 105], [5, 55], [65, 115], [75, 125]], 5);

  // How many more (pictured difference).
  const diffPhr = rotor([
    (o, A, B) => `Row A: ${A} Row B: ${B} How many more ${o.noun} does the longer row have?`,
    (o, A, B) => `Row A: ${A} Row B: ${B} How many extra ${o.noun} are in the bigger row?`,
  ]);
  [[5, 3], [7, 4], [8, 6], [6, 2], [9, 5], [4, 3], [10, 6], [7, 5], [8, 3], [9, 7], [6, 4], [10, 8], [5, 2], [7, 6], [9, 4], [8, 5]].forEach(([a, b], i) => {
    const o = CMP_OBJECTS[(i + 3) % CMP_OBJECTS.length];
    const [hi, lo] = a > b ? [a, b] : [b, a];
    items.push(
      item("distanceCompare", "conceptual", "rowsHowManyMore", "band1", {
        answer: hi - lo,
        answerType: "numberPad",
        display: {
          compare: { kind: "difference", bigger: hi, smaller: lo },
          promptText: diffPhr()(o, run(o.emoji, a), run(o.emoji, b)),
        },
      })
    );
  });

  // Judged distance claims (named).
  const distJudgePhr = rotor([
    (nm, x, y, t) => `${nm} says ${x} is closer to ${t} than ${y} is. Is ${nm} right?`,
    (nm, x, y, t) => `${nm} claims that ${x} sits nearer ${t} than ${y} does. Is that right?`,
  ]);
  [[17, 26, 20], [24, 33, 30], [46, 57, 50], [35, 43, 40], [52, 63, 60], [66, 78, 70], [74, 83, 80], [85, 97, 90], [21, 31, 25], [42, 51, 45], [58, 68, 65], [29, 38, 35], [104, 121, 110], [215, 190, 200], [317, 288, 300], [489, 520, 500], [640, 575, 600], [705, 682, 700]].forEach(([x, y, t], i) => {
    const truth = Math.abs(t - x) < Math.abs(t - y);
    items.push(
      item("distanceCompare", "conceptual", "closerClaimJudge", "band3", {
        answer: truth ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: distJudgePhr()(nameAt(i * 3 + 4), x, y, t), truth },
      })
    );
  });

  return items;
}

export function buildDeterministicItems() {
  return [
    ...symbolSelectionProcedural(),
    ...symbolSelectionConceptual(),
    ...benchmarkCompareProcedural(),
    ...benchmarkCompareConceptual(),
    ...distanceCompareProcedural(),
    ...distanceCompareConceptual(),
  ];
}
