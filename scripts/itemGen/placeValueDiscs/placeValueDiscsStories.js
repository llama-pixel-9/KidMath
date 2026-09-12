/* placeValueDiscs application stories — real quantities modeled with discs.
 *
 * Contexts stay disjoint from placeValue's bundle nouns (straws/rods/wires/
 * sheets): here kids MODEL a counted quantity (beans, pages, laps, tokens)
 * with value discs at the math table. Claims ride the countMath kinds
 * (digit, moreLess, gap, sum) so every answer is re-derived by the gate.
 * Band-1 prompts stay <= 20; judged items are "Is this right?" Yes/No.
 */

import { rotor, NAMES } from "../counting/countingTemplates.js";
import { LEVELS } from "./placeValueDiscsTemplates.js";

const nameAt = (i) => NAMES[i % NAMES.length];
const B1 = "band1";
const B2 = "band2";
const B3 = "band3";

const mk = (structureType, band, question) => {
  if (band === B1) {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 story exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "placeValueDiscs",
    subskill: question.subskill,
    itemFamily: "application",
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", answer: question.answer, answerType: question.answerType, choices: question.choices, display: question.display },
  };
};

// Quantities kids count and then show with discs.
const CONTEXTS = [
  { thing: "beans", act: "counts" },
  { thing: "pages", act: "reads" },
  { thing: "laps", act: "runs" },
  { thing: "tokens", act: "wins" },
];

function cycle(count, space, skeletons, offset, emit) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(emit(space[i % space.length], skeletons[(i + offset) % skeletons.length], nameAt(i + offset), i));
  }
  return items;
}

export function buildStoryItems() {
  const items = [];

  /* ---------------- readNumber stories ---------------- */

  // How many discs of one place are needed to show a counted amount.
  const NEED_SKELETONS = [
    (nm, ctx, n, word) => `${nm} ${ctx.act} ${n} ${ctx.thing} and shows the number with discs. How many ${word} discs does ${nm} need?`,
    (nm, ctx, n, word) => `To show the ${n} ${ctx.thing} ${nm} ${ctx.act}, ${nm} builds ${n} on a disc mat. How many ${word} discs go on the mat?`,
  ];
  const needEmit = (band, place) => ([n, ci], sk, nm) => {
    const word = { 1: "ones", 10: "tens", 100: "hundreds" }[place];
    return mk("storyDiscsNeeded", band, {
      subskill: "readNumber",
      answer: Math.floor(n / place) % 10,
      answerType: "numberPad",
      display: { counting: { kind: "digit", n, place }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], n, word) },
    });
  };
  const nB1 = [[14, 0], [17, 1], [12, 2], [19, 3], [11, 0], [16, 1], [13, 2], [18, 3], [15, 0], [12, 1], [17, 2], [14, 3], [19, 0], [16, 2], [11, 3], [13, 1], [18, 0]];
  items.push(...cycle(17, nB1, NEED_SKELETONS, 0, needEmit(B1, 1)));
  const nB2 = [[34, 0], [47, 1], [52, 2], [68, 3], [73, 0], [86, 1], [91, 2], [45, 3], [57, 0], [62, 1], [78, 2], [83, 3], [96, 0], [39, 1], [54, 2], [66, 3], [71, 0]];
  items.push(...cycle(17, nB2, NEED_SKELETONS, 1, needEmit(B2, 10)));
  const nB3 = [[347, 0], [582, 1], [816, 2], [493, 3], [265, 0], [739, 1], [904, 2], [128, 3], [356, 0], [741, 1], [869, 2], [235, 3], [517, 0], [682, 1], [951, 2], [163, 3], [428, 0]];
  items.push(...cycle(17, nB3, NEED_SKELETONS, 2, needEmit(B3, 100)));

  // Read a friend's described mat back into the counted quantity.
  const MAT_READ_SKELETONS = [
    (nm, ctx, t, o) => `${nm} shows the ${ctx.thing} from today with ${t} tens discs and ${o} ones discs. How many ${ctx.thing} is that?`,
    (nm, ctx, t, o) => `On the mat, ${nm} tracks ${ctx.thing} with ${t} tens discs and ${o} ones discs. What number of ${ctx.thing} does the mat show?`,
  ];
  const matReadEmit = (band) => ([t, o, ci], sk, nm) =>
    mk("storyMatRead", band, {
      subskill: "readNumber",
      answer: t * 10 + o,
      answerType: "numberPad",
      display: { counting: { kind: "groups", tens: t, ones: o }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], t, o) },
    });
  const mB1 = [[1, 4, 0], [1, 7, 1], [1, 2, 2], [1, 9, 3], [1, 1, 0], [1, 6, 1], [1, 3, 2], [1, 8, 3], [1, 5, 0], [2, 0, 1], [1, 4, 2], [1, 7, 3], [1, 2, 0], [1, 9, 1], [1, 6, 2], [1, 1, 3], [1, 8, 0]];
  items.push(...cycle(17, mB1, MAT_READ_SKELETONS, 1, matReadEmit(B1)));
  const mB2 = [[3, 4, 0], [4, 7, 1], [5, 2, 2], [6, 8, 3], [7, 3, 0], [8, 6, 1], [9, 1, 2], [4, 5, 3], [5, 7, 0], [6, 2, 1], [7, 8, 2], [8, 3, 3], [9, 6, 0], [3, 9, 1], [5, 4, 2], [6, 6, 3], [7, 1, 0]];
  items.push(...cycle(17, mB2, MAT_READ_SKELETONS, 2, matReadEmit(B2)));

  // Band 3: hundreds mats read back.
  const MAT_READ_BIG_SKELETONS = [
    (nm, ctx, h, t, o) => `${nm} shows this month's ${ctx.thing} with ${h} hundreds discs, ${t} tens discs, and ${o} ones discs. How many ${ctx.thing} is that?`,
    (nm, ctx, h, t, o) => `The class mat tracks ${ctx.thing}: ${nm} placed ${h} hundreds discs, ${t} tens discs, and ${o} ones discs. What number of ${ctx.thing} does it show?`,
  ];
  const matReadBigEmit = ([h, t, o, ci], sk, nm) =>
    mk("storyMatReadBig", B3, {
      subskill: "readNumber",
      answer: h * 100 + t * 10 + o,
      answerType: "numberPad",
      display: { counting: { kind: "units", hundreds: h, tens: t, ones: o }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], h, t, o) },
    });
  const mB3 = [[3, 4, 7, 0], [5, 0, 2, 1], [2, 6, 0, 2], [4, 9, 3, 3], [1, 2, 8, 0], [7, 3, 5, 1], [6, 0, 9, 2], [8, 1, 4, 3], [2, 5, 5, 0], [9, 4, 0, 1], [3, 7, 2, 2], [5, 8, 6, 3], [1, 0, 6, 0], [4, 2, 9, 1], [6, 6, 1, 2], [7, 0, 3, 3], [2, 9, 8, 0]];
  items.push(...cycle(17, mB3, MAT_READ_BIG_SKELETONS, 0, matReadBigEmit));

  /* ---------------- tradeRegroup stories ---------------- */

  // Trade a pile of ones discs; how many stay loose (ones digit).
  const LOOSE_SKELETONS = [
    (nm, ctx, n) => `${nm} earns ${n} ones discs for ${ctx.thing} and trades every 10 for a tens disc. How many ones discs stay loose?`,
    (nm, ctx, n) => `After ${ctx.act === "reads" ? "reading" : "collecting"} ${n} ${ctx.thing}, ${nm} has ${n} ones discs and trades tens out of them. How many ones discs are left over?`,
  ];
  const looseEmit = (band) => ([n, ci], sk, nm) =>
    mk("storyLooseOnes", band, {
      subskill: "tradeRegroup",
      answer: n % 10,
      answerType: "numberPad",
      display: { counting: { kind: "digit", n, place: 1 }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], n) },
    });
  items.push(...cycle(17, nB1.map(([n, c]) => [n, (c + 1) % 4]), LOOSE_SKELETONS, 1, looseEmit(B1)));
  items.push(...cycle(17, nB2.map(([n, c]) => [n, (c + 2) % 4]), LOOSE_SKELETONS, 0, looseEmit(B2)));

  // How many tens discs come out of the trade.
  const TENS_OUT_SKELETONS = [
    (nm, ctx, n) => `${nm} turns ${n} ones discs from ${ctx.thing} into tens discs, trading every 10. How many tens discs does ${nm} get?`,
    (nm, ctx, n) => `${nm} lines up ${n} ones discs after counting ${ctx.thing}, then trades each group of 10 for a tens disc. How many tens discs is that?`,
  ];
  const tensOutEmit = (band) => ([n, ci], sk, nm) =>
    mk("storyTensOut", band, {
      subskill: "tradeRegroup",
      answer: Math.floor(n / 10),
      answerType: "numberPad",
      display: { counting: { kind: "digit", n, place: 10 }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], n) },
    });
  items.push(...cycle(17, nB1.map(([n, c]) => [n, (c + 3) % 4]), TENS_OUT_SKELETONS, 0, tensOutEmit(B1)));
  items.push(...cycle(17, nB2.map(([n, c]) => [n, (c + 1) % 4]), TENS_OUT_SKELETONS, 1, tensOutEmit(B2)));

  // Band 3: hundreds out of tens discs, and next-full-disc gaps.
  const HUNDREDS_OUT_SKELETONS = [
    (nm, ctx, t) => `${nm} saved ${t} tens discs tracking ${ctx.thing} and trades every 10 of them for a hundreds disc. How many hundreds discs does ${nm} get?`,
    (nm, ctx, t) => `The jar holds ${t} tens discs from counting ${ctx.thing}. ${nm} trades groups of 10 tens for hundreds discs. How many hundreds discs come out?`,
  ];
  const hundredsOutEmit = ([t, ci], sk, nm) =>
    mk("storyHundredsOut", B3, {
      subskill: "tradeRegroup",
      answer: Math.floor(t / 10),
      answerType: "numberPad",
      display: { counting: { kind: "digit", n: t, place: 10 }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], t) },
    });
  const hB3 = [[34, 0], [47, 1], [52, 2], [68, 3], [73, 0], [86, 1], [91, 2], [45, 3], [57, 0], [62, 1], [78, 2], [83, 3], [96, 0], [39, 1], [54, 2], [66, 3], [71, 0]];
  items.push(...cycle(17, hB3, HUNDREDS_OUT_SKELETONS, 1, hundredsOutEmit));

  const GAP_SKELETONS = [
    (nm, ctx, n, target) => `${nm} has ${n} ones discs from ${ctx.thing} and wants a full trade with no discs left loose. How many more ones discs until the next trade at ${target}?`,
    (nm, ctx, n, target) => `${nm}'s pile from counting ${ctx.thing} holds ${n} ones discs. How many more ones discs make the next full trade of ${target}?`,
  ];
  const gapEmit = ([n, ci], sk, nm) => {
    const target = Math.ceil(n / 10) * 10;
    return mk("storyNextTrade", B3, {
      subskill: "tradeRegroup",
      answer: target - n,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: n, target }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], n, target) },
    });
  };
  const gB3 = [[234, 0], [347, 1], [452, 2], [568, 3], [673, 0], [786, 1], [891, 2], [345, 3], [457, 0], [562, 1], [678, 2], [783, 3], [896, 0], [239, 1], [354, 2], [466, 3], [571, 0]];
  items.push(...cycle(17, gB3, GAP_SKELETONS, 0, gapEmit));

  /* ---------------- discOperations stories ---------------- */

  // A disc lands on / leaves the score mat.
  const SCORE_SKELETONS = [
    (nm, ctx, n, word, gain) =>
      gain
        ? `${nm}'s mat shows ${n} ${ctx.thing}. ${nm} ${ctx.act} ten more, so one more ${word} disc lands on the mat. How many ${ctx.thing} does the mat show now?`
        : `${nm}'s mat shows ${n} ${ctx.thing}. ${nm} gives back a ${word} disc's worth. How many ${ctx.thing} does the mat show now?`,
    (nm, ctx, n, word, gain) =>
      gain
        ? `The mat for ${nm}'s ${ctx.thing} shows ${n}. One more ${word} disc goes on. What is the new count of ${ctx.thing}?`
        : `The mat for ${nm}'s ${ctx.thing} shows ${n}. One ${word} disc comes off. What is the new count of ${ctx.thing}?`,
  ];
  const scoreEmit = (band, mag) => ([n, ci, gain], sk, nm) => {
    const delta = gain ? mag : -mag;
    const word = { 10: "tens", 100: "hundreds" }[mag];
    return mk("storyScoreMove", band, {
      subskill: "discOperations",
      answer: n + delta,
      answerType: "numberPad",
      display: { counting: { kind: "moreLess", n, delta }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], n, word, gain) },
    });
  };
  const sB1 = [[13, 0, true], [17, 1, false], [11, 2, true], [19, 3, false], [15, 0, true], [12, 1, false], [18, 2, true], [14, 3, false], [16, 0, true], [11, 1, false], [13, 2, false], [17, 3, true], [19, 0, true], [12, 2, true], [15, 1, false], [18, 3, false], [14, 0, true]];
  items.push(...cycle(17, sB1, SCORE_SKELETONS, 0, scoreEmit(B1, 10)));
  const sB2 = [[247, 0, true], [382, 1, false], [516, 2, true], [493, 3, false], [265, 0, true], [739, 1, false], [604, 2, true], [128, 3, false], [356, 0, true], [741, 1, false], [569, 2, false], [235, 3, true], [617, 0, true], [482, 2, true], [351, 1, false], [768, 3, false], [124, 0, true]];
  items.push(...cycle(17, sB2, SCORE_SKELETONS, 1, scoreEmit(B2, 100)));

  // Equal mats laid out for a game (repeated quantity).
  const EQUAL_SKELETONS = [
    (nm, ctx, k, t, o) => `For a game, ${nm} builds ${k} mats, each showing ${t} tens discs and ${o} ones discs of ${ctx.thing}. How many ${ctx.thing} do the mats show in all?`,
    (nm, ctx, k, t, o) => `${nm} sets up ${k} equal mats for ${ctx.thing} — ${t} tens discs and ${o} ones discs on each. What total number of ${ctx.thing} is that?`,
  ];
  const equalEmit = ([k, t, o, ci], sk, nm) => {
    const per = t * 10 + o;
    return mk("storyEqualMats", B2, {
      subskill: "discOperations",
      answer: per * k,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: Array.from({ length: k }, () => per) }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], k, t, o) },
    });
  };
  const eB2 = [[2, 3, 2, 0], [3, 2, 4, 1], [2, 4, 1, 2], [4, 1, 2, 3], [3, 3, 3, 0], [2, 2, 8, 1], [3, 1, 5, 2], [2, 5, 3, 3], [4, 2, 1, 0], [3, 4, 2, 1], [2, 1, 9, 2], [4, 3, 0, 3], [3, 5, 1, 0], [2, 6, 2, 1], [3, 6, 0, 2], [2, 7, 4, 3], [4, 4, 4, 0]];
  items.push(...cycle(17, eB2, EQUAL_SKELETONS, 1, equalEmit));

  // Band 1: combine two small mats.
  const COMBINE_SKELETONS = [
    (nm, ctx, a, b) => `${nm}'s mat shows ${a} ${ctx.thing} and a friend's mat shows ${b}. They push the discs together. How many ${ctx.thing} do the discs show?`,
    (nm, ctx, a, b) => `${nm} joins a mat of ${a} ${ctx.thing} with a mat of ${b}. What number of ${ctx.thing} do the joined discs make?`,
  ];
  const combineEmit = ([a, b, ci], sk, nm) =>
    mk("storyCombineMats", B1, {
      subskill: "discOperations",
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], a, b) },
    });
  const cB1 = [[12, 5, 0], [11, 7, 1], [14, 3, 2], [13, 6, 3], [15, 4, 0], [12, 7, 1], [16, 3, 2], [11, 4, 3], [17, 2, 0], [13, 5, 1], [14, 6, 2], [12, 3, 3], [18, 1, 0], [15, 3, 1], [11, 8, 2], [16, 2, 3], [13, 4, 0]];
  items.push(...cycle(17, cB1, COMBINE_SKELETONS, 0, combineEmit));

  // Band 1: count up as tens discs drop during a game.
  const DROP_SKELETONS = [
    (nm, ctx) => `Every lap of the game adds a tens disc for ${nm}'s ${ctx.thing}. ${nm} counts 10, 20. What number does ${nm} say for the next disc?`,
    (nm, ctx) => `${nm} tracks ${ctx.thing} by dropping tens discs and counting 10, then 20. Which number comes with the next disc?`,
  ];
  const dropEmit = ([ci], sk, nm) =>
    mk("storyDropCount", B1, {
      subskill: "discOperations",
      answer: 30,
      answerType: "numberPad",
      display: { counting: { kind: "next", sequence: [10, 20], step: 10 }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length]) },
    });
  const dB1 = [[0], [1], [2], [3], [0], [1], [2], [3], [0], [1], [2], [3], [0], [1], [2], [3], [0]];
  items.push(...cycle(17, dB1, DROP_SKELETONS, 1, dropEmit));

  // Band 3: share discs across mats, trading down when needed.
  const SHARE_SKELETONS = [
    (nm, ctx, total, k) => `${nm} shows ${total} ${ctx.thing} with discs, then deals the discs onto ${k} equal mats, trading when needed. How many ${ctx.thing} does each mat show?`,
    (nm, ctx, total, k) => `${nm} splits a disc mat of ${total} ${ctx.thing} evenly into ${k} mats, trading big discs down as needed. What number lands on each mat?`,
  ];
  const shareEmit = ([total, k, ci], sk, nm) =>
    mk("storyShareMats", B3, {
      subskill: "discOperations",
      answer: total / k,
      answerType: "numberPad",
      display: { counting: { kind: "hidden", total, seen: total - total / k }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], total, k) },
    });
  const shB3 = [[96, 2, 0], [84, 3, 1], [72, 4, 2], [90, 5, 3], [78, 2, 0], [96, 3, 1], [88, 4, 2], [85, 5, 3], [64, 2, 0], [69, 3, 1], [76, 4, 2], [95, 5, 3], [58, 2, 0], [93, 3, 1], [92, 4, 2], [80, 5, 3], [86, 2, 0]];
  items.push(...cycle(17, shB3, SHARE_SKELETONS, 0, shareEmit));

  // Band 3: big score moves with thousands discs.
  const BIG_SCORE_SKELETONS = [
    (nm, ctx, n, gain) =>
      gain
        ? `The scoreboard mat for ${nm}'s team shows ${n} ${ctx.thing}. A thousands disc is added. How many ${ctx.thing} does it show now?`
        : `The scoreboard mat for ${nm}'s team shows ${n} ${ctx.thing}. A thousands disc is taken off. How many ${ctx.thing} does it show now?`,
    (nm, ctx, n, gain) =>
      gain
        ? `${nm} watches the mat of ${ctx.thing} at ${n} as one more thousands disc lands. What is the new number of ${ctx.thing}?`
        : `${nm} watches the mat of ${ctx.thing} at ${n} as one thousands disc comes off. What is the new number of ${ctx.thing}?`,
  ];
  const bigScoreEmit = ([n, ci, gain], sk, nm) =>
    mk("storyBigScoreMove", B3, {
      subskill: "discOperations",
      answer: n + (gain ? 1000 : -1000),
      answerType: "numberPad",
      display: { counting: { kind: "moreLess", n, delta: gain ? 1000 : -1000 }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], n, gain) },
    });
  const bsB3 = [[2473, 0, true], [5816, 1, false], [1382, 2, true], [4905, 3, false], [3267, 0, true], [6738, 1, false], [1594, 2, true], [8041, 3, false], [2650, 0, true], [7129, 1, false], [3948, 2, false], [5207, 3, true], [1863, 0, true], [6470, 2, true], [2391, 1, false], [4586, 3, false], [7015, 0, true]];
  items.push(...cycle(17, bsB3, BIG_SCORE_SKELETONS, 1, bigScoreEmit));

  /* ---------------- top-ups to the 50-per-cell floor ---------------- */

  // readNumber: ones-first mat reads (B1), loose-ones needs (B2), tens needs (B3).
  const ONES_FIRST_SKELETONS = [
    (nm, ctx, t, o) => `${nm} piles ${o} ones discs first, then ${t} tens discs, to track ${ctx.thing}. How many ${ctx.thing} does the mat show?`,
    (nm, ctx, t, o) => `Ones before tens: ${nm}'s mat for ${ctx.thing} holds ${o} ones discs and ${t} tens discs. What number of ${ctx.thing} is that?`,
  ];
  const onesFirstEmit = (band) => ([t, o, ci], sk, nm) =>
    mk("storyMatReadOnesFirst", band, {
      subskill: "readNumber",
      answer: t * 10 + o,
      answerType: "numberPad",
      display: { counting: { kind: "groups", tens: t, ones: o }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], t, o) },
    });
  items.push(...cycle(17, mB1.map(([t, o, c]) => [t, o, (c + 2) % 4]), ONES_FIRST_SKELETONS, 0, onesFirstEmit(B1)));
  items.push(...cycle(17, nB2.map(([n, c]) => [n, (c + 3) % 4]), NEED_SKELETONS, 3, needEmit(B2, 1)));
  items.push(...cycle(17, nB3.map(([n, c]) => [n, (c + 1) % 4]), NEED_SKELETONS, 1, needEmit(B3, 10)));

  // tradeRegroup: next-full-trade gaps at bands 1 and 2.
  const gapEmitAt = (band) => ([n, ci], sk, nm) => {
    const target = Math.ceil(n / 10) * 10;
    return mk("storyNextTradeSmall", band, {
      subskill: "tradeRegroup",
      answer: target - n,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: n, target }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], n, target) },
    });
  };
  items.push(...cycle(17, nB1.map(([n, c]) => [n, (c + 2) % 4]), GAP_SKELETONS, 1, gapEmitAt(B1)));
  items.push(...cycle(17, nB2.map(([n, c]) => [n, (c + 1) % 4]), GAP_SKELETONS, 0, gapEmitAt(B2)));

  // discOperations: mid-band drop counts (B2) and multi-disc moves (B3).
  const DROP_MID_SKELETONS = [
    (nm, ctx, seq) => `${nm} adds a tens disc for each new ${ctx.thing.slice(0, -1)} and counts: ${seq}. What number does ${nm} say for the next disc?`,
    (nm, ctx, seq) => `Tracking ${ctx.thing} a tens disc at a time, ${nm} counts ${seq}. Which number comes next?`,
  ];
  const dropMidEmit = ([start, ci], sk, nm) => {
    const seq = [start, start + 10, start + 20];
    return mk("storyDropCountMid", B2, {
      subskill: "discOperations",
      answer: start + 30,
      answerType: "numberPad",
      display: { counting: { kind: "next", sequence: seq, step: 10 }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], seq.join(", ")) },
    });
  };
  const dmB2 = [[30, 0], [40, 1], [50, 2], [60, 3], [70, 0], [80, 1], [110, 2], [120, 3], [130, 0], [140, 1], [150, 2], [160, 3], [170, 0], [180, 1], [210, 2], [220, 3], [230, 0]];
  items.push(...cycle(17, dmB2, DROP_MID_SKELETONS, 0, dropMidEmit));

  const MULTI_MOVE_SKELETONS = [
    (nm, ctx, n, k, gain) =>
      gain
        ? `${nm}'s mat of ${ctx.thing} shows ${n}. ${nm} adds ${k} hundreds discs. How many ${ctx.thing} does the mat show now?`
        : `${nm}'s mat of ${ctx.thing} shows ${n}. ${nm} removes ${k} hundreds discs. How many ${ctx.thing} does the mat show now?`,
    (nm, ctx, n, k, gain) =>
      gain
        ? `The mat for ${nm}'s ${ctx.thing} reads ${n}, then ${k} more hundreds discs land on it. What is the new count of ${ctx.thing}?`
        : `The mat for ${nm}'s ${ctx.thing} reads ${n}, then ${k} hundreds discs come off. What is the new count of ${ctx.thing}?`,
  ];
  const multiMoveEmit = ([n, k, ci, gain], sk, nm) => {
    const delta = gain ? k * 100 : -k * 100;
    return mk("storyMultiMove", B3, {
      subskill: "discOperations",
      answer: n + delta,
      answerType: "numberPad",
      display: { counting: { kind: "moreLess", n, delta }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], n, k, gain) },
    });
  };
  const mmB3 = [[2473, 2, 0, true], [5816, 3, 1, false], [1382, 4, 2, true], [4905, 2, 3, false], [3267, 3, 0, true], [6738, 4, 1, false], [1594, 2, 2, true], [8041, 3, 3, false], [2650, 4, 0, true], [7129, 2, 1, false], [3948, 3, 2, false], [5207, 4, 3, true], [1863, 2, 0, true], [6470, 3, 2, true], [2391, 4, 1, false], [4586, 2, 3, false], [7015, 3, 0, true]];
  items.push(...cycle(17, mmB3, MULTI_MOVE_SKELETONS, 1, multiMoveEmit));

  // tradeRegroup B3: loose ones after trading a big pile.
  const LOOSE_BIG_SKELETONS = [
    (nm, ctx, n) => `${nm} collects ${n} ones discs over a season of ${ctx.thing} and trades every 10 for a tens disc. How many ones discs stay loose?`,
    (nm, ctx, n) => `A season of ${ctx.thing} leaves ${nm} with ${n} ones discs. After trading all the full tens, how many ones discs remain?`,
  ];
  const looseBigEmit = ([n, ci], sk, nm) =>
    mk("storyLooseOnesBig", B3, {
      subskill: "tradeRegroup",
      answer: n % 10,
      answerType: "numberPad",
      display: { counting: { kind: "digit", n, place: 1 }, promptText: sk(nm, CONTEXTS[ci % CONTEXTS.length], n) },
    });
  const lbB3 = [[234, 0], [347, 1], [452, 2], [568, 3], [673, 0], [786, 1], [891, 2], [345, 3], [457, 0], [562, 1], [678, 2], [783, 3], [896, 0], [239, 1], [354, 2], [466, 3], [571, 0]];
  items.push(...cycle(17, lbB3, LOOSE_BIG_SKELETONS, 1, looseBigEmit));

  return items;
}
