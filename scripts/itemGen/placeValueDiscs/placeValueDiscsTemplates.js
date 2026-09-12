/* Deterministic placeValueDiscs bank items — procedural and conceptual cells.
 *
 * Design source: docs/placevaluediscs-bank-design.md. Payloads ride op
 * "count" + display.counting claims (countMath gate): {groups} for
 * tens/ones mats (works for over-filled ones too), {units} for
 * hundreds mats, {sum} for thousands mats and equal-mat repeats,
 * {digit}/{placeValueOf} for disc-count reads, {moreLess} for
 * add/remove-a-disc, {next} for disc drop counts, {gap} for renames.
 *
 * Registers: every prose prompt says "disc(s)"/"mat" so nothing collides
 * with placeValue's unit form ("2 tens 5 ones = ?") or bundles. Visual
 * mat reads use the letter-free disc-notation caption ("10 10 | 1 1 = ?",
 * <= 5 letters) so they pass the no-word-problems filter and serve at the
 * numbers-only early levels; the mat itself renders via
 * answerType "placeValueDiscs" + display.cols.
 *
 * Band-1 prompts stay <= 20 (hard gate); band-1 mats stay within tens+ones.
 */

import { rotor, shuffled, NAMES } from "../counting/countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "placeValueDiscs",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const nameAt = (i) => NAMES[i % NAMES.length];
const discs = (n) => `${n} ${n === 1 ? "disc" : "discs"}`;

/** cols -> [{place, count}] high place first, zero-count columns dropped
 *  from the caption but kept on the mat (the widget draws empty columns). */
const colsOf = (spec) =>
  Object.entries(spec)
    .map(([place, count]) => ({ place: Number(place), count }))
    .sort((a, b) => b.place - a.place);

const caption = (cols, { reversed = false } = {}) => {
  const groups = (reversed ? [...cols].reverse() : cols)
    .filter((c) => c.count > 0)
    .map((c) => Array.from({ length: c.count }, () => String(c.place)).join(" "));
  return `${groups.join(" | ")} = ?`;
};

const matValue = (cols) => cols.reduce((s, c) => s + c.place * c.count, 0);

const mat = (subskill, family, structureType, band, spec, claim, opts) => {
  const cols = colsOf(spec);
  return item(subskill, family, structureType, band, {
    answer: matValue(cols),
    answerType: "placeValueDiscs",
    display: { type: "discs", cols, counting: claim, promptText: caption(cols, opts) },
  });
};

/* ================================================================== */
/* readNumber                                                         */
/* ================================================================== */

export function readNumberProcedural() {
  const items = [];

  // Band 1 — tens+ones mats, letter-free captions.
  for (let o = 1; o <= 9; o += 1) {
    items.push(mat("readNumber", "procedural", "matReadTeens", "band1", { 10: 1, 1: o }, { kind: "groups", tens: 1, ones: o }));
  }
  for (let t = 2; t <= 4; t += 1) {
    for (let o = 0; o <= 9; o += 1) {
      items.push(mat("readNumber", "procedural", "matRead", "band1", { 10: t, 1: o }, { kind: "groups", tens: t, ones: o }));
    }
  }
  // Ones listed first — reading order must not matter.
  for (let t = 1; t <= 4; t += 1) {
    for (let o = 1; o <= 4; o += 1) {
      items.push(
        mat("readNumber", "procedural", "matReadReversed", "band1", { 10: t, 1: o }, { kind: "groups", tens: t, ones: o }, { reversed: true })
      );
    }
  }

  // Band 2 — hundreds mats + disc-count builds.
  const B2_MATS = [
    [3, 4, 7], [5, 0, 2], [2, 6, 0], [4, 9, 3], [1, 2, 8], [7, 3, 5], [6, 0, 9],
    [8, 1, 4], [2, 5, 5], [9, 4, 0], [3, 7, 2], [5, 8, 6], [1, 0, 6], [4, 2, 9],
    [6, 6, 1], [7, 0, 3], [2, 9, 8], [8, 5, 0], [3, 1, 4], [9, 7, 7], [1, 8, 2],
    [5, 3, 0], [6, 2, 7], [4, 4, 4], [7, 9, 1],
  ];
  for (const [h, t, o] of B2_MATS) {
    items.push(mat("readNumber", "procedural", "matReadHundreds", "band2", { 100: h, 10: t, 1: o }, { kind: "units", hundreds: h, tens: t, ones: o }));
  }
  const buildPlace = rotor([[100, "hundreds"], [10, "tens"], [1, "ones"]]);
  for (const n of [347, 582, 816, 493, 265, 739, 904, 670, 128, 356, 741, 869, 235, 517, 682, 951, 163, 428]) {
    const [place, word] = buildPlace();
    items.push(
      item("readNumber", "procedural", "buildDiscCount", "band2", {
        answer: Math.floor(n / place) % 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place }, promptText: `Build ${n} with discs: ${word} discs = ?` },
      })
    );
  }
  for (let t = 10; t <= 19; t += 1) {
    items.push(mat("readNumber", "procedural", "tensOnlyBig", "band2", { 10: t, 1: 0 }, { kind: "groups", tens: t, ones: 0 }));
  }

  // Band 3 — thousands mats + builds + disc worth.
  const B3_MATS = [
    [2, 4, 7, 3], [1, 0, 5, 8], [3, 6, 2, 0], [4, 1, 9, 5], [1, 8, 0, 2], [2, 3, 3, 7],
    [5, 0, 0, 4], [1, 2, 6, 9], [3, 9, 1, 1], [2, 7, 8, 6], [4, 5, 4, 0], [1, 6, 3, 3],
    [3, 0, 7, 2], [2, 8, 5, 5], [5, 2, 0, 8], [1, 4, 4, 6], [4, 7, 2, 1], [2, 0, 9, 9],
    [3, 5, 6, 4], [1, 1, 1, 7], [5, 9, 8, 0], [2, 2, 4, 2], [4, 3, 0, 6], [1, 9, 7, 5], [3, 8, 9, 8],
  ];
  for (const [th, h, t, o] of B3_MATS) {
    items.push(
      mat("readNumber", "procedural", "matReadThousands", "band3", { 1000: th, 100: h, 10: t, 1: o }, { kind: "sum", parts: [th * 1000, h * 100, t * 10, o] })
    );
  }
  const buildPlaceBig = rotor([[1000, "thousands"], [100, "hundreds"], [10, "tens"]]);
  for (const n of [2473, 5816, 1382, 4905, 3267, 6738, 1594, 8041, 2650, 7129, 3948, 5207, 1863, 6470, 2391, 4586, 7015, 3724]) {
    const [place, word] = buildPlaceBig();
    items.push(
      item("readNumber", "procedural", "buildDiscCountBig", "band3", {
        answer: Math.floor(n / place) % 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n, place }, promptText: `Build ${n} with discs: ${word} discs = ?` },
      })
    );
  }
  for (const n of [2473, 5816, 4905, 3267, 8041, 7129, 5207, 6470, 4586, 3724]) {
    items.push(
      item("readNumber", "procedural", "discWorth", "band3", {
        answer: (Math.floor(n / 100) % 10) * 100,
        answerType: "numberPad",
        display: { counting: { kind: "placeValueOf", n, place: 100 }, promptText: `In ${n}, all the hundreds discs together are worth ?` },
      })
    );
  }

  return items;
}

export function readNumberConceptual() {
  const items = [];
  let seed = 11;

  // Band 1 — which number does the mat make (disc-count-as-digit distractors).
  const whichPhr = rotor([
    (nm, t, o) => `${nm} puts ${discs(t)} of ten and ${discs(o)} of one on the mat. Which number is that?`,
    (nm, t, o) => `${nm}'s mat holds ${discs(t)} worth ten each and ${discs(o)} worth one each. Which number does the mat make?`,
  ]);
  const B1_WHICH = [[1, 3], [2, 4], [3, 1], [4, 2], [1, 8], [2, 7], [3, 5], [4, 6], [1, 5], [2, 9], [3, 8], [4, 1], [2, 3], [1, 6], [3, 2], [4, 9]];
  B1_WHICH.forEach(([t, o], i) => {
    const n = t * 10 + o;
    const wrong = [...new Set([o * 10 + t, t + o, n + 10])].filter((w) => w !== n);
    items.push(
      item("readNumber", "conceptual", "whichNumberMat", "band1", {
        answer: n,
        choices: shuffled([n, ...wrong.slice(0, 3)], (seed += 1)),
        display: { promptText: whichPhr()(nameAt(i * 3 + 1), t, o) },
      })
    );
  });

  // Band 1 — judged reads: disc-count-as-digit is the classic slip.
  const readJudgePhr = rotor([
    (nm, t, o, said) => `${nm} sees ${discs(t)} of ten and ${discs(o)} of one, and says the mat shows ${said}. Is ${nm} right?`,
    (nm, t, o, said) => `${nm} counts a mat of ${discs(t)} of ten and ${discs(o)} of one as ${said}. Is that right?`,
  ]);
  const B1_JUDGE = [
    [1, 3, true], [1, 4, false], [1, 7, true], [1, 2, false], [1, 9, true], [1, 5, false],
    [1, 6, true], [1, 8, false], [1, 1, true], [1, 3, false], [1, 5, true], [1, 9, false],
    [1, 2, true], [1, 7, false], [1, 8, true], [1, 6, false], [1, 4, true], [1, 1, false],
  ];
  B1_JUDGE.forEach(([t, o, ok], i) => {
    const n = t * 10 + o;
    const said = ok ? n : t + o; // false read: counted discs, ignored their values
    items.push(
      item("readNumber", "conceptual", "readJudge", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: readJudgePhr()(nameAt(i * 3 + 4), t, o, said), truth: ok },
      })
    );
  });

  // Band 1 — compare two described mats (tens beat a pile of ones).
  const comparePhr = rotor([
    (nm, a, b) => `${nm} compares two mats. Mat A shows ${a}. Mat B shows ${b}. Which mat shows the bigger number?`,
    (nm, a, b) => `${nm} checks two mats: A holds ${a}, B holds ${b}. Which mat makes the bigger number?`,
  ]);
  const matDesc = (t, o) => `${discs(t)} of ten and ${discs(o)} of one`;
  const B1_CMP = [
    [1, 9, 2, 1], [2, 8, 3, 0], [1, 5, 2, 2], [3, 1, 2, 9], [4, 0, 3, 8], [1, 7, 2, 0],
    [2, 4, 1, 9], [3, 6, 4, 1], [2, 2, 1, 8], [4, 3, 3, 9], [1, 1, 2, 0], [3, 5, 2, 7],
    [2, 6, 3, 2], [4, 8, 4, 2], [1, 4, 1, 8], [3, 3, 4, 0], [2, 5, 2, 9], [4, 7, 3, 4],
  ];
  B1_CMP.forEach(([t1, o1, t2, o2], i) => {
    items.push(
      item("readNumber", "conceptual", "compareMats", "band1", {
        answer: t1 * 10 + o1 > t2 * 10 + o2 ? "Mat A" : "Mat B",
        choices: ["Mat A", "Mat B"],
        display: { promptText: comparePhr()(nameAt(i * 3 + 9), matDesc(t1, o1), matDesc(t2, o2)) },
      })
    );
  });

  // Band 2 — hundreds versions.
  const whichBigPhr = rotor([
    (nm, h, t, o) => `${nm} lays out ${discs(h)} of one hundred, ${discs(t)} of ten, and ${discs(o)} of one. Which number is that?`,
    (nm, h, t, o) => `${nm}'s mat: ${discs(h)} worth one hundred, ${discs(t)} worth ten, ${discs(o)} worth one. Which number does it show?`,
  ]);
  [[3, 4, 7], [5, 8, 2], [8, 1, 6], [4, 9, 3], [2, 6, 5], [7, 3, 9], [9, 2, 4], [6, 7, 5], [1, 2, 8], [3, 5, 6], [7, 4, 1], [8, 6, 9], [2, 3, 5], [5, 1, 7], [6, 8, 2], [9, 5, 1], [4, 3, 8], [1, 6, 3]].forEach(([h, t, o], i) => {
    const n = h * 100 + t * 10 + o;
    const wrong = [...new Set([h * 100 + o * 10 + t, t * 100 + h * 10 + o, h + t + o])].filter((w) => w !== n);
    items.push(
      item("readNumber", "conceptual", "whichNumberMatBig", "band2", {
        answer: n,
        choices: shuffled([n, ...wrong.slice(0, 3)], (seed += 1)),
        display: { promptText: whichBigPhr()(nameAt(i * 3 + 2), h, t, o) },
      })
    );
  });
  const readJudgeBigPhr = rotor([
    (nm, d, said) => `${nm} reads a mat of ${d} as ${said}. Is ${nm} right?`,
    (nm, d, said) => `A mat holds ${d}. ${nm} writes ${said}. Is that right?`,
  ]);
  [[3, 4, 7, true], [5, 8, 2, false], [8, 1, 6, true], [4, 9, 3, false], [2, 6, 5, true], [7, 3, 9, false], [9, 2, 4, true], [6, 7, 5, false], [1, 2, 8, true], [3, 5, 6, false], [7, 4, 1, true], [8, 6, 9, false], [2, 3, 5, true], [5, 1, 7, false], [6, 8, 2, true], [9, 5, 1, false]].forEach(([h, t, o, ok], i) => {
    const n = h * 100 + t * 10 + o;
    const said = ok ? n : h * 100 + o * 10 + t;
    const d = `${discs(h)} of one hundred, ${discs(t)} of ten, and ${discs(o)} of one`;
    items.push(
      item("readNumber", "conceptual", "readJudgeBig", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: readJudgeBigPhr()(nameAt(i * 3 + 6), d, said), truth: ok },
      })
    );
  });
  const B2_CMP = [
    [1, 9, 5, 2, 1, 0], [2, 8, 3, 3, 0, 1], [4, 1, 7, 3, 9, 8], [2, 2, 6, 1, 9, 9],
    [5, 0, 4, 4, 9, 8], [3, 6, 2, 3, 5, 9], [6, 1, 0, 5, 9, 9], [2, 7, 4, 3, 0, 0],
    [7, 3, 2, 7, 2, 9], [1, 8, 6, 2, 0, 3], [4, 4, 4, 4, 5, 0], [8, 0, 5, 7, 9, 9],
    [3, 2, 8, 3, 3, 1], [5, 6, 7, 6, 0, 2], [2, 9, 9, 3, 0, 4], [6, 5, 1, 6, 4, 8],
    [1, 3, 7, 1, 4, 2], [7, 8, 0, 8, 0, 1],
  ];
  B2_CMP.forEach(([h1, t1, o1, h2, t2, o2], i) => {
    const d1 = `${discs(h1)} of one hundred, ${discs(t1)} of ten, ${discs(o1)} of one`;
    const d2 = `${discs(h2)} of one hundred, ${discs(t2)} of ten, ${discs(o2)} of one`;
    items.push(
      item("readNumber", "conceptual", "compareMatsBig", "band2", {
        answer: h1 * 100 + t1 * 10 + o1 > h2 * 100 + t2 * 10 + o2 ? "Mat A" : "Mat B",
        choices: ["Mat A", "Mat B"],
        display: { promptText: comparePhr()(nameAt(i * 3 + 12), d1, d2) },
      })
    );
  });

  // Band 3 — thousands which-number + zero-column judgments.
  const whichThPhr = rotor([
    (nm, d) => `${nm} builds ${d} with discs. Which number is that?`,
    (nm, d) => `On ${nm}'s mat sit ${d}. Which number does the mat show?`,
  ]);
  [[2, 4, 7, 3], [1, 0, 5, 8], [3, 6, 2, 0], [4, 1, 9, 5], [1, 8, 0, 2], [2, 3, 3, 7], [5, 0, 0, 4], [1, 2, 6, 9], [3, 9, 1, 1], [2, 7, 8, 6], [4, 5, 4, 0], [1, 6, 3, 3], [3, 0, 7, 2], [2, 8, 5, 5], [5, 2, 0, 8], [1, 4, 4, 6], [4, 7, 2, 1], [2, 0, 9, 9]].forEach(([th, h, t, o], i) => {
    const n = th * 1000 + h * 100 + t * 10 + o;
    const d = `${discs(th)} of one thousand, ${discs(h)} of one hundred, ${discs(t)} of ten, and ${discs(o)} of one`;
    const wrong = [...new Set([th * 1000 + h * 100 + o * 10 + t, h * 1000 + th * 100 + t * 10 + o, n + 1000])].filter((w) => w !== n);
    items.push(
      item("readNumber", "conceptual", "whichNumberMatTh", "band3", {
        answer: n,
        choices: shuffled([n, ...wrong.slice(0, 3)], (seed += 1)),
        display: { promptText: whichThPhr()(nameAt(i * 3 + 3), d) },
      })
    );
  });
  const zeroPhr = rotor([
    (nm, h, o, said) => `A mat shows ${discs(h)} of one hundred and ${discs(o)} of one — no tens discs. ${nm} writes ${said}. Is ${nm} right?`,
    (nm, h, o, said) => `${nm}'s mat holds ${discs(h)} of one hundred, an empty tens column, and ${discs(o)} of one. ${nm} reads it as ${said}. Is that right?`,
  ]);
  [[4, 7, false], [3, 5, true], [2, 9, false], [6, 1, true], [5, 4, false], [8, 2, true], [1, 8, false], [7, 6, true], [9, 3, false], [2, 5, true], [4, 1, false], [3, 9, true], [6, 7, false], [5, 8, true], [8, 4, false], [7, 2, true], [1, 6, false], [9, 9, true]].forEach(([h, o, ok], i) => {
    const n = h * 100 + o;
    const said = ok ? n : h * 10 + o; // the zero-column skip
    items.push(
      item("readNumber", "conceptual", "zeroColumnJudge", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: zeroPhr()(nameAt(i * 3 + 8), h, o, said), truth: ok },
      })
    );
  });
  const worthCmpPhr = rotor([
    (nm) => `${nm} holds one thousands disc. A friend holds 9 hundreds discs. Who holds more value, ${nm} or the friend?`,
    (nm) => `${nm} has one thousands disc and a friend has 9 hundreds discs. Whose discs are worth more, ${nm}'s or the friend's?`,
  ]);
  for (let i = 0; i < 16; i += 1) {
    const nm = nameAt(i * 3 + 9);
    items.push(
      item("readNumber", "conceptual", "discWorthCompare", "band3", {
        answer: nm,
        choices: [nm, "the friend"],
        display: { promptText: worthCmpPhr()(nm) },
      })
    );
  }

  return items;
}

/* ================================================================== */
/* tradeRegroup                                                       */
/* ================================================================== */

export function tradeRegroupProcedural() {
  const items = [];

  // Band 1 — over-filled ones mats (value unchanged by the trade).
  for (let t = 0; t <= 3; t += 1) {
    for (let o = 11; o <= 18; o += 1) {
      items.push(mat("tradeRegroup", "procedural", "overfullMat", "band1", { 10: t, 1: o }, { kind: "groups", tens: t, ones: o }));
    }
  }
  for (let x = 11; x <= 19; x += 1) {
    items.push(
      item("tradeRegroup", "procedural", "tradeOnesDrill", "band1", {
        answer: x - 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n: x, place: 1 }, promptText: `${x} ones discs = 1 tens disc + ? ones discs` },
      })
    );
  }
  for (const x of [10, 20]) {
    items.push(
      item("tradeRegroup", "procedural", "tensFromOnes", "band1", {
        answer: x / 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n: x, place: 10 }, promptText: `${x} ones discs = ? tens discs` },
      })
    );
  }
  for (const t of [1, 2]) {
    items.push(
      item("tradeRegroup", "procedural", "onesFromTens", "band1", {
        answer: t * 10,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: 0, target: t * 10 }, promptText: `${t} tens ${t === 1 ? "disc" : "discs"} = ? ones discs` },
      })
    );
  }
  for (let o = 11; o <= 17; o += 1) {
    items.push(
      mat("tradeRegroup", "procedural", "overfullMatReversed", "band1", { 10: 4, 1: o }, { kind: "groups", tens: 4, ones: o }, { reversed: true })
    );
  }

  // Band 2 — renames and tens-for-hundreds trades.
  for (const n of [34, 47, 52, 68, 73, 86, 91, 45, 57, 62, 78, 83, 96, 39, 54]) {
    const keep = Math.floor(n / 10) - 1;
    items.push(
      item("tradeRegroup", "procedural", "renameDrill", "band2", {
        answer: n - keep * 10,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: keep * 10, target: n }, promptText: `${n} = ${keep} tens discs + ? ones discs` },
      })
    );
  }
  for (const n of [340, 520, 780, 210, 460, 930, 650, 870, 190, 240, 590, 720, 810, 380, 960]) {
    items.push(
      item("tradeRegroup", "procedural", "asTensDrill", "band2", {
        answer: n / 10,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: 0, target: n / 10 }, promptText: `${n} = ? tens discs` },
      })
    );
  }
  const B2_OVER = [
    [1, 12, 4], [2, 14, 0], [3, 11, 7], [1, 15, 2], [4, 13, 5], [2, 16, 8], [3, 12, 1],
    [1, 18, 6], [5, 11, 3], [2, 13, 9], [4, 15, 0], [3, 17, 4], [1, 14, 8], [5, 16, 2], [2, 12, 6],
  ];
  for (const [h, t, o] of B2_OVER) {
    items.push(mat("tradeRegroup", "procedural", "overfullMatBig", "band2", { 100: h, 10: t, 1: o }, { kind: "sum", parts: [h * 100, t * 10, o] }));
  }
  for (const x of [10, 20, 30, 40, 50, 60, 70, 80]) {
    items.push(
      item("tradeRegroup", "procedural", "tradeTensDrill", "band2", {
        answer: x / 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n: x, place: 10 }, promptText: `${x} tens discs = ? hundreds discs` },
      })
    );
  }

  // Band 3 — hundreds renames and thousands trades.
  for (const n of [2400, 1300, 3700, 5200, 4600, 6100, 2900, 7800, 1500, 3200, 5900, 4100, 6700, 8300, 2100]) {
    items.push(
      item("tradeRegroup", "procedural", "renameHundredsDrill", "band3", {
        answer: n / 100,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: 0, target: n / 100 }, promptText: `${n} = ? hundreds discs` },
      })
    );
  }
  const B3_MIX = [
    [3, 24], [5, 17], [2, 38], [7, 12], [4, 29], [6, 15], [1, 46], [8, 13], [3, 31],
    [5, 22], [2, 47], [9, 11], [4, 35], [6, 28], [1, 19], [7, 26], [8, 32], [2, 21],
  ];
  for (const [h, t] of B3_MIX) {
    items.push(
      item("tradeRegroup", "procedural", "mixedRenameDrill", "band3", {
        answer: h * 100 + t * 10,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [h * 100, t * 10] }, promptText: `${h} hundreds discs + ${t} tens discs = ?` },
      })
    );
  }
  const B3_OVER = [
    [1, 12, 3, 4], [2, 10, 5, 0], [1, 14, 0, 7], [3, 11, 2, 5], [2, 13, 7, 1], [1, 16, 4, 8],
    [4, 10, 1, 2], [2, 15, 8, 6], [3, 12, 6, 9], [1, 11, 9, 3], [4, 14, 2, 0], [2, 17, 0, 5],
  ];
  for (const [th, h, t, o] of B3_OVER) {
    items.push(
      mat("tradeRegroup", "procedural", "overfullMatThousands", "band3", { 1000: th, 100: h, 10: t, 1: o }, { kind: "sum", parts: [th * 1000, h * 100, t * 10, o] })
    );
  }
  for (const x of [10, 20, 30, 40, 50, 60, 70, 80]) {
    items.push(
      item("tradeRegroup", "procedural", "tradeHundredsDrill", "band3", {
        answer: x / 10,
        answerType: "numberPad",
        display: { counting: { kind: "digit", n: x, place: 10 }, promptText: `${x} hundreds discs = ? thousands discs` },
      })
    );
  }

  return items;
}

export function tradeRegroupConceptual() {
  const items = [];

  // Band 1 — can a trade happen?
  const canTradePhr = rotor([
    (nm, o) => `${nm} has ${o} ones discs. Can ${nm} trade 10 of them for a tens disc?`,
    (nm, o) => `${nm} holds ${o} ones discs. Is there enough to trade ten of them for one tens disc?`,
  ]);
  [[14, true], [8, false], [17, true], [6, false], [11, true], [9, false], [20, true], [3, false], [12, true], [7, false], [16, true], [4, false], [19, true], [5, false], [10, true], [2, false], [13, true], [18, true]].forEach(([o, ok], i) => {
    items.push(
      item("tradeRegroup", "conceptual", "canTradeJudge", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: canTradePhr()(nameAt(i * 3 + 2), o), truth: ok },
      })
    );
  });

  // Band 1 — the trade keeps the value.
  const valuePhr = rotor([
    (nm, n, said) => `${nm} trades 10 ones discs for 1 tens disc on a mat showing ${n}. ${nm} says the mat now shows ${said}. Is ${nm} right?`,
    (nm, n, said) => `A mat shows ${n}. ${nm} swaps 10 ones discs for 1 tens disc and says it shows ${said}. Is that right?`,
  ]);
  [[16, 16, true], [14, 4, false], [18, 18, true], [12, 2, false], [15, 15, true], [17, 7, false], [13, 13, true], [19, 9, false], [11, 11, true], [16, 6, false], [12, 12, true], [18, 8, false], [14, 14, true], [15, 5, false], [19, 19, true], [11, 1, false]].forEach(([n, said, ok], i) => {
    items.push(
      item("tradeRegroup", "conceptual", "valueUnchangedJudge", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: valuePhr()(nameAt(i * 3 + 5), n, said), truth: ok },
      })
    );
  });

  // Band 1 — which trade fixes an over-filled ones column.
  const whichTradePhr = rotor([
    (nm, o) => `${nm}'s ones column holds ${o} discs. Which trade fixes it?`,
    (nm, o) => `${nm} sees ${o} discs crowding the ones column. Which trade should ${nm} make?`,
  ]);
  for (let i = 0; i < 18; i += 1) {
    const o = 11 + (i % 8);
    const correct = "Trade 10 ones for 1 ten";
    items.push(
      item("tradeRegroup", "conceptual", "whichTrade", "band1", {
        answer: correct,
        choices: [correct, "Trade 1 one for 1 ten", "Trade 1 ten for 10 ones", "No trade is needed"],
        display: { promptText: whichTradePhr()(nameAt(i * 3 + 7), o) },
      })
    );
  }

  // Band 2 — predict whether addition needs a trade (do not compute).
  const predictPhr = rotor([
    (nm, a, b) => `${nm} will add ${a} + ${b} with discs. Will the ones column need a trade?`,
    (nm, a, b) => `Before adding ${a} + ${b} with discs, ${nm} checks the ones. Will they need to trade ones for a ten?`,
  ]);
  [[26, 38], [41, 27], [35, 45], [52, 16], [47, 29], [63, 24], [58, 33], [72, 15], [39, 43], [24, 68], [55, 22], [67, 18], [31, 49], [46, 42], [73, 19], [28, 51], [64, 27], [37, 56]].forEach(([a, b], i) => {
    const needs = (a % 10) + (b % 10) >= 10;
    items.push(
      item("tradeRegroup", "conceptual", "predictTradeJudge", "band2", {
        answer: needs ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: predictPhr()(nameAt(i * 3 + 1), a, b), subPrompt: "Decide without adding.", truth: needs },
      })
    );
  });

  // Band 2 — value unchanged, two-digit; and which trade for crowded tens.
  const valueBigPhr = rotor([
    (nm, n, said) => `A mat shows ${n} with too many ones discs. ${nm} trades 10 ones for 1 ten and says the mat shows ${said}. Is ${nm} right?`,
    (nm, n, said) => `${nm} regroups the ones on a mat showing ${n} and reads it as ${said}. Is that right?`,
  ]);
  [[34, 34, true], [47, 37, false], [52, 52, true], [68, 58, false], [73, 73, true], [86, 76, false], [45, 45, true], [91, 81, false], [57, 57, true], [62, 52, false], [78, 78, true], [83, 73, false], [96, 96, true], [39, 29, false], [54, 54, true], [66, 56, false]].forEach(([n, said, ok], i) => {
    items.push(
      item("tradeRegroup", "conceptual", "valueUnchangedBig", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: valueBigPhr()(nameAt(i * 3 + 4), n, said), truth: ok },
      })
    );
  });
  const whichTradeBigPhr = rotor([
    (nm, t) => `${nm}'s tens column holds ${t} discs. Which trade fixes it?`,
    (nm, t) => `${nm} counts ${t} discs in the tens column — too many. Which trade should ${nm} make?`,
  ]);
  for (let i = 0; i < 18; i += 1) {
    const t = 11 + (i % 8);
    const correct = "Trade 10 tens for 1 hundred";
    items.push(
      item("tradeRegroup", "conceptual", "whichTradeBig", "band2", {
        answer: correct,
        choices: [correct, "Trade 1 ten for 1 hundred", "Trade 1 hundred for 10 tens", "No trade is needed"],
        display: { promptText: whichTradeBigPhr()(nameAt(i * 3 + 6), t) },
      })
    );
  }

  // Band 3 — predict trades in 3-digit addition; tens-only plans; trade keeps value.
  const predictBigPhr = rotor([
    (nm, a, b) => `${nm} will add ${a} + ${b} with discs. Will the tens column need a trade?`,
    (nm, a, b) => `Before adding ${a} + ${b} with discs, ${nm} checks the tens column. Will ten tens pile up there?`,
  ]);
  [[264, 381], [173, 254], [356, 271], [428, 190], [547, 262], [615, 234], [382, 445], [291, 373], [436, 182], [524, 293], [167, 351], [645, 172], [273, 464], [318, 291], [456, 273], [582, 145], [239, 382], [364, 253]].forEach(([a, b], i) => {
    const needs = (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) + (((a % 10) + (b % 10) >= 10) ? 1 : 0) >= 10;
    items.push(
      item("tradeRegroup", "conceptual", "predictTradeBig", "band3", {
        answer: needs ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: predictBigPhr()(nameAt(i * 3 + 3), a, b), subPrompt: "Decide without adding.", truth: needs },
      })
    );
  });
  const tensOnlyPhr = rotor([
    (nm, n) => `${nm} wants to show ${n} using only tens discs. Which count of tens discs works?`,
    (nm, n) => `${nm} empties the hundreds column and shows ${n} with tens discs alone. Which count is right?`,
  ]);
  [340, 520, 780, 210, 460, 930, 650, 870, 190, 240, 590, 720, 810, 380, 960, 130].forEach((n, i) => {
    const a = n / 10;
    items.push(
      item("tradeRegroup", "conceptual", "tensOnlyPlan", "band3", {
        answer: a,
        choices: shuffled([a, n, a + 10, Math.floor(a / 10)], i + 3),
        display: { promptText: tensOnlyPhr()(nameAt(i * 3 + 5), n) },
      })
    );
  });
  const bigValuePhr = rotor([
    (nm, n) => `${nm} trades 10 tens discs for 1 hundreds disc on a mat showing ${n}, then says the number changed. Is ${nm} right?`,
    (nm, n) => `After swapping 10 tens discs for 1 hundreds disc, ${nm} claims the mat showing ${n} now shows a different number. Is that right?`,
  ]);
  [458, 372, 561, 293, 647, 184, 736, 425, 519, 268, 843, 357, 692, 174, 926, 481, 235, 763].forEach((n, i) => {
    items.push(
      item("tradeRegroup", "conceptual", "tradeKeepsValueBig", "band3", {
        answer: "No",
        choices: ["Yes", "No"],
        display: { promptText: bigValuePhr()(nameAt(i * 3 + 8), n), truth: false },
      })
    );
  });

  return items;
}

/* ================================================================== */
/* discOperations                                                     */
/* ================================================================== */

export function discOperationsProcedural() {
  const items = [];

  // Band 1 — add/remove discs from a teen mat (prose stays <= 20).
  for (let x = 11; x <= 19; x += 1) {
    items.push(
      item("discOperations", "procedural", "plusTenDisc", "band1", {
        answer: x + 10,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n: x, delta: 10 }, promptText: `${x} + 1 tens disc = ?` },
      })
    );
    items.push(
      item("discOperations", "procedural", "plusOneDisc", "band1", {
        answer: x + 1,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n: x, delta: 1 }, promptText: `${x} + 1 ones disc = ?` },
      })
    );
    items.push(
      item("discOperations", "procedural", "minusOneDisc", "band1", {
        answer: x - 1,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n: x, delta: -1 }, promptText: `${x} - 1 ones disc = ?` },
      })
    );
    items.push(
      item("discOperations", "procedural", "minusTenDisc", "band1", {
        answer: x - 10,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n: x, delta: -10 }, promptText: `${x} - 1 tens disc = ?` },
      })
    );
    items.push(
      item("discOperations", "procedural", "plusTwoOnesDiscs", "band1", {
        answer: x + 2,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n: x, delta: 2 }, promptText: `${x} + 2 ones discs = ?` },
      })
    );
    items.push(
      item("discOperations", "procedural", "plusTwoTensDiscs", "band1", {
        answer: x + 20,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n: x, delta: 20 }, promptText: `${x} + 2 tens discs = ?` },
      })
    );
  }

  // Band 2 — two/three-digit disc moves, disc drop sequences, equal mats.
  const B2_NS = [47, 83, 29, 65, 38, 74, 56, 91, 23, 88, 35, 62, 49, 77, 51];
  B2_NS.forEach((n, i) => {
    const delta = [10, -10, 100][i % 3];
    const word = Math.abs(delta) === 10 ? "tens" : "hundreds";
    const sign = delta > 0 ? "+" : "-";
    items.push(
      item("discOperations", "procedural", "discMove", "band2", {
        answer: n + delta,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n, delta }, promptText: `${n} ${sign} 1 ${word} disc = ?` },
      })
    );
  });
  [347, 582, 816, 493, 265, 739, 904, 128, 356, 741].forEach((n, i) => {
    const delta = i % 2 === 0 ? -100 : 30;
    const phrase = delta === -100 ? "- 1 hundreds disc" : "+ 3 tens discs";
    items.push(
      item("discOperations", "procedural", "discMoveBig", "band2", {
        answer: n + delta,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n, delta }, promptText: `${n} ${phrase} = ?` },
      })
    );
  });
  for (const start of [30, 40, 50, 60, 20, 70, 80, 110]) {
    const seq = [start, start + 10, start + 20];
    items.push(
      item("discOperations", "procedural", "discDropSeq", "band2", {
        answer: start + 30,
        answerType: "numberPad",
        display: { counting: { kind: "next", sequence: seq, step: 10 }, promptText: `Discs: ${seq.join(", ")} → ?` },
      })
    );
  }
  const B2_EQ = [
    [2, 3, 2], [3, 2, 4], [2, 4, 1], [4, 1, 2], [3, 3, 3], [2, 2, 8], [3, 1, 5],
    [2, 5, 3], [4, 2, 1], [3, 4, 2], [2, 1, 9], [4, 3, 0], [3, 5, 1], [2, 6, 2],
    [4, 4, 4], [3, 6, 0], [2, 7, 4], [4, 5, 2], [3, 7, 3], [2, 8, 1],
  ];
  for (const [k, t, o] of B2_EQ) {
    const per = t * 10 + o;
    items.push(
      item("discOperations", "procedural", "equalMats", "band2", {
        answer: per * k,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: Array.from({ length: k }, () => per) }, promptText: `${k} mats each show ${t} tens discs and ${o} ones discs. All the mats together = ?` },
      })
    );
  }

  // Band 3 — thousands moves, 100s sequences, big equal mats, multi-disc moves.
  const B3_NS = [2473, 5816, 1382, 4905, 3267, 6738, 1594, 8041, 2650, 7129, 3948, 5207, 1863, 6470, 2391];
  B3_NS.forEach((n, i) => {
    const delta = [1000, -1000, -100][i % 3];
    const word = Math.abs(delta) === 1000 ? "thousands" : "hundreds";
    const sign = delta > 0 ? "+" : "-";
    items.push(
      item("discOperations", "procedural", "discMoveThousands", "band3", {
        answer: n + delta,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n, delta }, promptText: `${n} ${sign} 1 ${word} disc = ?` },
      })
    );
  });
  for (const start of [300, 400, 500, 600, 200, 700, 1100, 2400]) {
    const seq = [start, start + 100, start + 200];
    items.push(
      item("discOperations", "procedural", "discDropSeqBig", "band3", {
        answer: start + 300,
        answerType: "numberPad",
        display: { counting: { kind: "next", sequence: seq, step: 100 }, promptText: `Discs: ${seq.join(", ")} → ?` },
      })
    );
  }
  const B3_EQ = [
    [2, 2, 3, 4], [3, 1, 2, 5], [2, 3, 1, 2], [4, 1, 1, 3], [3, 2, 0, 6], [2, 4, 2, 0],
    [3, 3, 4, 1], [2, 1, 5, 7], [4, 2, 2, 2], [3, 4, 1, 0], [2, 5, 0, 8], [4, 3, 3, 1],
    [3, 5, 2, 2], [2, 6, 4, 3], [4, 4, 0, 5], [3, 6, 1, 4], [2, 7, 2, 1], [3, 7, 0, 3], [2, 8, 3, 0], [4, 5, 1, 1],
  ];
  for (const [k, h, t, o] of B3_EQ) {
    const per = h * 100 + t * 10 + o;
    items.push(
      item("discOperations", "procedural", "equalMatsBig", "band3", {
        answer: per * k,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: Array.from({ length: k }, () => per) }, promptText: `${k} mats each show ${h} hundreds, ${t} tens, and ${o} ones discs. All the mats together = ?` },
      })
    );
  }
  [347, 582, 816, 493, 265, 739, 904, 128, 356, 741].forEach((n, i) => {
    const delta = i % 2 === 0 ? 300 : -20;
    const phrase = delta === 300 ? "+ 3 hundreds discs" : "- 2 tens discs";
    items.push(
      item("discOperations", "procedural", "multiDiscMove", "band3", {
        answer: n + delta,
        answerType: "numberPad",
        display: { counting: { kind: "moreLess", n, delta }, promptText: `${n} ${phrase} = ?` },
      })
    );
  });

  return items;
}

export function discOperationsConceptual() {
  const items = [];
  let seed = 21;

  // Band 1 — which number after adding/removing one disc.
  const plusWhichPhr = rotor([
    (nm, n, word) => `${nm}'s mat shows ${n}. ${nm} adds 1 ${word} disc. Which number does the mat show now?`,
    (nm, n, word) => `A mat in front of ${nm} shows ${n}. One more ${word} disc lands on it. Which number is it now?`,
  ]);
  [[15, 10], [12, 1], [17, 10], [14, 1], [11, 10], [18, 1], [13, 10], [16, 1], [19, 10], [12, 10], [15, 1], [17, 1], [11, 1], [14, 10], [18, 10], [13, 1], [16, 10], [19, 1]].forEach(([n, d], i) => {
    const a = n + d;
    const wrongDelta = d === 10 ? 1 : 10;
    items.push(
      item("discOperations", "conceptual", "plusDiscWhich", "band1", {
        answer: a,
        choices: shuffled([a, n + wrongDelta, n, a + 1], (seed += 1)),
        display: { counting: { kind: "moreLess", n, delta: d }, promptText: plusWhichPhr()(nameAt(i * 3 + 1), n, d === 10 ? "tens" : "ones") },
      })
    );
  });
  const minusWhichPhr = rotor([
    (nm, n, word) => `${nm}'s mat shows ${n}. ${nm} takes away 1 ${word} disc. Which number is left?`,
    (nm, n, word) => `A mat shows ${n}. ${nm} lifts off one ${word} disc. Which number does the mat show now?`,
  ]);
  [[15, -10], [12, -1], [17, -10], [14, -1], [11, -10], [18, -1], [13, -10], [16, -1], [19, -10], [12, -10], [15, -1], [17, -1], [11, -1], [14, -10], [18, -10], [13, -1]].forEach(([n, d], i) => {
    const a = n + d;
    const wrongDelta = d === -10 ? -1 : -10;
    items.push(
      item("discOperations", "conceptual", "minusDiscWhich", "band1", {
        answer: a,
        choices: shuffled([a, n + wrongDelta, n, a - 1], (seed += 1)),
        display: { counting: { kind: "moreLess", n, delta: d }, promptText: minusWhichPhr()(nameAt(i * 3 + 4), n, d === -10 ? "tens" : "ones") },
      })
    );
  });
  const dropPhr = rotor([
    (nm, a, b) => `${nm} drops tens discs onto the mat one at a time and counts: ${a}, ${b}. What number does ${nm} say for the next disc?`,
    (nm, a, b) => `Each tens disc ${nm} drops adds ten. ${nm} counts ${a}, ${b}. What number comes with the next disc?`,
  ]);
  for (let i = 0; i < 18; i += 1) {
    // Band 1 keeps every prompt number <= 20, so the spoken run is always 10, 20.
    items.push(
      item("discOperations", "conceptual", "nextDiscCount", "band1", {
        answer: 30,
        answerType: "numberPad",
        display: { counting: { kind: "next", sequence: [10, 20], step: 10 }, promptText: dropPhr()(nameAt(i * 3 + 6), 10, 20) },
      })
    );
  }

  // Band 2 — disc moves as choices; planned equal mats.
  const moveWhichPhr = rotor([
    (nm, n, phrase) => `${nm}'s mat shows ${n}. ${nm} ${phrase}. Which number does the mat show now?`,
    (nm, n, phrase) => `A mat shows ${n}. Then ${nm} ${phrase}. Which number is it now?`,
  ]);
  [[47, 10], [83, -10], [29, 100], [65, 10], [38, -10], [74, 100], [56, -10], [91, 10], [23, 100], [88, -10], [35, 10], [62, 100], [49, -10], [77, 10], [51, 100], [66, -10], [42, 10], [59, 100]].forEach(([n, d], i) => {
    const a = n + d;
    const word = Math.abs(d) === 100 ? "hundreds" : "tens";
    const phrase = d > 0 ? `adds 1 ${word} disc` : `takes away 1 ${word} disc`;
    const wrong = d > 0 ? n + 1 : n - 1;
    items.push(
      item("discOperations", "conceptual", "moveWhichMid", "band2", {
        answer: a,
        choices: shuffled([a, wrong, n, a + (d > 0 ? d : -d) ], (seed += 1)).filter((v, idx, arr) => arr.indexOf(v) === idx),
        display: { counting: { kind: "moreLess", n, delta: d }, promptText: moveWhichPhr()(nameAt(i * 3 + 2), n, phrase) },
      })
    );
  });
  const eqPlanPhr = rotor([
    (nm, k, t, o) => `${nm} lays out ${k} mats, each with ${t} tens discs and ${o} ones discs. What total do the mats show?`,
    (nm, k, t, o) => `${nm} builds the same mat ${k} times: ${t} tens discs, ${o} ones discs. What is the total?`,
  ]);
  [[2, 3, 2], [3, 2, 4], [2, 4, 1], [4, 1, 2], [3, 3, 3], [2, 2, 8], [3, 1, 5], [2, 5, 3], [4, 2, 1], [3, 4, 2], [2, 1, 9], [4, 3, 0], [3, 5, 1], [2, 6, 2], [3, 6, 0], [2, 7, 4]].forEach(([k, t, o], i) => {
    const per = t * 10 + o;
    items.push(
      item("discOperations", "conceptual", "equalMatsPlan", "band2", {
        answer: per * k,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: Array.from({ length: k }, () => per) }, promptText: eqPlanPhr()(nameAt(i * 3 + 5), k, t, o) },
      })
    );
  });
  const dropMidPhr = rotor([
    (nm, seq) => `${nm} drops hundreds discs one at a time and counts: ${seq}. What number does ${nm} say next?`,
    (nm, seq) => `Counting a hundreds disc at a time, ${nm} says ${seq}. What comes next?`,
  ]);
  [100, 200, 300, 400, 500, 600, 150, 250, 350, 450, 550, 650, 120, 220, 320, 420, 520, 620].forEach((start, i) => {
    const seq = [start, start + 100, start + 200];
    items.push(
      item("discOperations", "conceptual", "nextDiscCountMid", "band2", {
        answer: start + 300,
        answerType: "numberPad",
        display: { counting: { kind: "next", sequence: seq, step: 100 }, promptText: dropMidPhr()(nameAt(i * 3 + 7), seq.join(", ")) },
      })
    );
  });

  // Band 3 — side-by-side error analysis and thousand moves.
  const errPhr = rotor([
    (nm, a, b, t, o) => `${nm} added ${a} + ${b} with discs and wrote ${t} tens and ${o} ones side by side. What is the real answer?`,
    (nm, a, b, t, o) => `Adding ${a} + ${b} with discs, ${nm} skipped the trade and wrote ${t} tens ${o} ones as one number. What is the correct sum?`,
  ]);
  [[47, 38], [29, 56], [65, 27], [38, 45], [74, 19], [56, 37], [23, 68], [88, 15], [35, 49], [62, 29], [49, 34], [77, 16], [51, 39], [66, 28], [42, 59], [59, 33]].forEach(([a, b], i) => {
    const t = Math.floor(a / 10) + Math.floor(b / 10);
    const o = (a % 10) + (b % 10);
    items.push(
      item("discOperations", "conceptual", "errorNoTrade", "band3", {
        answer: a + b,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [a, b] }, promptText: errPhr()(nameAt(i * 3 + 3), a, b, t, o) },
      })
    );
  });
  const bigMovePhr = rotor([
    (nm, n, phrase) => `${nm}'s mat shows ${n}. ${nm} ${phrase}. Which number does the mat show now?`,
    (nm, n, phrase) => `A mat shows ${n}. Then ${nm} ${phrase}. Which number is it after that?`,
  ]);
  [[2473, 1000], [5816, -1000], [1382, 1000], [4905, -100], [3267, 1000], [6738, -1000], [1594, -100], [8041, -1000], [2650, 1000], [7129, -100], [3948, -1000], [5207, 1000], [1863, -100], [6470, -1000], [2391, 1000], [4586, -100], [7015, -1000], [3724, 1000]].forEach(([n, d], i) => {
    const a = n + d;
    const word = Math.abs(d) === 1000 ? "thousands" : "hundreds";
    const phrase = d > 0 ? `adds 1 ${word} disc` : `takes away 1 ${word} disc`;
    const wrongMag = Math.abs(d) === 1000 ? 100 : 1000;
    const wrong = n + (d > 0 ? wrongMag : -wrongMag);
    items.push(
      item("discOperations", "conceptual", "moveWhichThousands", "band3", {
        answer: a,
        choices: shuffled([a, wrong, n, a + 10], (seed += 1)),
        display: { counting: { kind: "moreLess", n, delta: d }, promptText: bigMovePhr()(nameAt(i * 3 + 9), n, phrase) },
      })
    );
  });
  const shareRotor = rotor([
    (nm, t, o, k) => `${nm} deals a mat of ${t} tens discs and ${o} ones discs into ${k} equal shares, trading when needed. What number does each share show?`,
    (nm, t, o, k) => `${nm} splits ${t} tens discs and ${o} ones discs evenly among ${k} mats, trading discs as needed. How much lands on each mat?`,
  ]);
  [[6, 9, 3], [8, 4, 2], [9, 6, 2], [7, 2, 4], [5, 4, 2], [9, 3, 3], [8, 8, 4], [6, 4, 2], [7, 5, 3], [9, 0, 2], [8, 1, 3], [6, 0, 4], [9, 8, 7], [7, 8, 2], [8, 7, 3], [5, 7, 3], [9, 9, 9], [6, 3, 7]].forEach(([t, o, k], i) => {
    const total = t * 10 + o;
    if (total % k !== 0) throw new Error(`share not whole: ${total}/${k}`);
    items.push(
      item("discOperations", "conceptual", "dealShares", "band3", {
        answer: total / k,
        answerType: "numberPad",
        display: { counting: { kind: "hidden", total, seen: total - total / k }, promptText: shareRotor()(nameAt(i * 3 + 11), t, o, k) },
      })
    );
  });

  return items;
}

export function buildDeterministicItems() {
  return [
    ...readNumberProcedural(),
    ...readNumberConceptual(),
    ...tradeRegroupProcedural(),
    ...tradeRegroupConceptual(),
    ...discOperationsProcedural(),
    ...discOperationsConceptual(),
  ];
}
