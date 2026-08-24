/* patterns application stories — patterns met in the world.
 *
 * Contexts by subskill (disjoint from other modes' story nouns):
 * repeating = bead necklaces / flag strings / dance steps / tile borders;
 * arithmetic = sticker albums, tower rows, savings jars; geometric =
 * doubling (lily pads, bounce games); missingTerm = smudged house numbers,
 * torn raffle tickets; patternRule = plants growing, ladders, book pages.
 * Numeric additive claims ride countMath (between/gap); the rest carry
 * display.pattern claims verified by authorPatterns.js. Band-1 <= 20.
 */

import { rotor, shuffled, NAMES } from "../counting/countingTemplates.js";
import { LEVELS } from "./patternsTemplates.js";

const nameAt = (i) => NAMES[i % NAMES.length];
const B1 = "band1";
const B2 = "band2";
const B3 = "band3";
const seqUp = (start, step, n) => Array.from({ length: n }, (_, i) => start + i * step);

const mk = (subskill, structureType, band, question) => {
  if (band === B1) {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 story exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "patterns",
    subskill,
    itemFamily: "application",
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

function cycle(count, space, skeletons, offset, emit) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(emit(space[i % space.length], skeletons[(i + offset) % skeletons.length], nameAt(i + offset), i));
  }
  return items;
}

/* ---------------- repeatingPattern stories ---------------- */

const REPEAT_CONTEXTS = [
  { items: "beads", act: "strings", thing: "necklace" },
  { items: "flags", act: "hangs", thing: "party string" },
  { items: "tiles", act: "lays", thing: "border" },
  { items: "stamps", act: "sticks", thing: "card" },
];
const REPEAT_CORES = [
  ["red", "blue"],
  ["gold", "silver"],
  ["green", "yellow"],
  ["red", "red", "blue"],
  ["blue", "green", "yellow"],
  ["gold", "gold", "silver", "silver"],
];
const cyc = (core, len) => Array.from({ length: len }, (_, i) => core[i % core.length]);

function repeatingStories() {
  const items = [];
  const NEXT_SKELETONS = [
    (nm, ctx, shown) => `${nm} ${ctx.act} ${ctx.items} on a ${ctx.thing}: ${shown.join(", ")}. Which color comes next?`,
    (nm, ctx, shown) => `The ${ctx.thing} ${nm} is making goes ${shown.join(", ")}. Which color ${ctx.items.slice(0, -1)} does ${nm} add next?`,
  ];
  const nextEmit = (band, coreIdx, lens) => ([len, ci], sk, nm, i) => {
    const core = REPEAT_CORES[coreIdx[i % coreIdx.length]];
    const shown = cyc(core, len);
    return mk("repeatingPattern", `storyNextColor_${band}`, band, {
      answer: core[len % core.length],
      choices: shuffled([...new Set(core)].length >= 2 ? [...new Set(core)] : core, i + len),
      display: { pattern: { kind: "repeat", core, len }, promptText: sk(nm, REPEAT_CONTEXTS[ci % 4], shown) },
    });
  };
  const lensFor = (band) => (band === B1 ? [4, 5, 6] : band === B2 ? [6, 7, 8] : [8, 9, 10, 11]);
  const coreFor = (band) => (band === B1 ? [0, 1, 2] : band === B2 ? [3, 4, 0] : [5, 3, 4]);
  for (const band of [B1, B2, B3]) {
    const space = [];
    for (const len of lensFor(band)) for (let c = 0; c < 4; c += 1) space.push([len, c]);
    items.push(...cycle(17, space, NEXT_SKELETONS, band === B1 ? 0 : band === B2 ? 1 : 2, nextEmit(band, coreFor(band), lensFor(band))));
  }

  const POSITION_SKELETONS = [
    (nm, ctx, shown, pos) => `${nm}'s ${ctx.thing} repeats like this: ${shown.join(", ")}, … Which color is ${ctx.items.slice(0, -1)} number ${pos}?`,
    (nm, ctx, shown, pos) => `${nm} keeps the ${ctx.thing} going: ${shown.join(", ")}, … What color lands at position ${pos}?`,
  ];
  const posEmit = (band, coreIdx) => ([pos, ci], sk, nm, i) => {
    const core = REPEAT_CORES[coreIdx[i % coreIdx.length]];
    const shown = cyc(core, core.length * 2);
    return mk("repeatingPattern", `storyColorAt_${band}`, band, {
      answer: core[(pos - 1) % core.length],
      choices: shuffled([...new Set(core)], i + pos),
      display: { pattern: { kind: "repeatPos", core, pos }, promptText: sk(nm, REPEAT_CONTEXTS[ci % 4], shown, pos) },
    });
  };
  const posFor = (band) => (band === B1 ? [5, 6, 7, 8] : band === B2 ? [7, 9, 10, 11] : [13, 15, 17, 19]);
  for (const band of [B1, B2, B3]) {
    const space = [];
    for (const pos of posFor(band)) for (let c = 0; c < 4; c += 1) space.push([pos, c]);
    items.push(...cycle(17, space, POSITION_SKELETONS, band === B1 ? 1 : band === B2 ? 2 : 0, posEmit(band, coreFor(band))));
  }

  const HOWMANY_SKELETONS = [
    (nm, ctx, shown, target, upTo) => `${nm}'s ${ctx.thing} repeats ${shown.join(", ")}, … out to ${upTo} ${ctx.items}. How many ${target} ${ctx.items} does ${nm} use?`,
    (nm, ctx, shown, target, upTo) => `To finish the ${ctx.thing}, ${nm} needs ${upTo} ${ctx.items} in the pattern ${shown.join(", ")}, … How many ${target} ${ctx.items} is that?`,
  ];
  const howManyEmit = (band, coreIdx) => ([upTo, ci], sk, nm, i) => {
    const core = REPEAT_CORES[coreIdx[i % coreIdx.length]];
    const shown = cyc(core, core.length * 2);
    const target = core[i % core.length];
    const count = cyc(core, upTo).filter((s) => s === target).length;
    return mk("repeatingPattern", `storyColorCount_${band}`, band, {
      answer: count,
      answerType: "numberPad",
      display: { pattern: { kind: "countIn", core, target, upTo }, promptText: sk(nm, REPEAT_CONTEXTS[ci % 4], shown, target, upTo) },
    });
  };
  const upToFor = (band) => (band === B1 ? [8, 10, 12] : band === B2 ? [12, 15, 18] : [20, 24, 30]);
  for (const band of [B1, B2, B3]) {
    const space = [];
    for (const upTo of upToFor(band)) for (let c = 0; c < 4; c += 1) space.push([upTo, c]);
    items.push(...cycle(17, space, HOWMANY_SKELETONS, band === B1 ? 2 : band === B2 ? 0 : 1, howManyEmit(band, coreFor(band))));
  }
  return items;
}

/* ---------------- arithmeticNext stories ---------------- */

const GROW_CONTEXTS = [
  { thing: "shells", place: "jar" },
  { thing: "cards", place: "album" },
  { thing: "blocks", place: "tower" },
  { thing: "books", place: "shelf" },
];

function arithmeticStories() {
  const items = [];
  const GROW_SKELETONS = [
    (nm, ctx, seq) => `${nm}'s ${ctx.place} of ${ctx.thing} grows the same way each day: ${seq.join(", ")}. How many ${ctx.thing} come next?`,
    (nm, ctx, seq) => `Day by day ${nm} counts the ${ctx.thing}: ${seq.join(", ")}. If the pattern holds, how many ${ctx.thing} on the next day?`,
  ];
  const growEmit = (band) => ([start, step, ci], sk, nm) => {
    const seq = seqUp(start, step, 3);
    return mk("arithmeticNext", `storyGrow_${band}`, band, {
      answer: start + 3 * step,
      answerType: "numberPad",
      display: { counting: { kind: "next", sequence: seq, step }, promptText: sk(nm, GROW_CONTEXTS[ci % 4], seq) },
    });
  };
  items.push(...cycle(17, [[2, 2, 0], [3, 3, 1], [1, 4, 2], [4, 2, 3], [2, 5, 0], [5, 3, 1], [1, 2, 2], [6, 2, 3], [3, 4, 0], [2, 3, 1], [4, 4, 2], [7, 2, 3], [5, 2, 0], [1, 5, 1], [4, 3, 2], [8, 2, 3], [6, 3, 0]], GROW_SKELETONS, 0, growEmit(B1)));
  items.push(...cycle(17, [[12, 6, 0], [25, 7, 1], [31, 8, 2], [14, 9, 3], [42, 6, 0], [23, 7, 1], [35, 8, 2], [16, 4, 3], [51, 5, 0], [27, 6, 1], [33, 7, 2], [45, 3, 3], [18, 8, 0], [62, 9, 1], [29, 4, 2], [37, 5, 3], [44, 6, 0]], GROW_SKELETONS, 1, growEmit(B2)));
  items.push(...cycle(17, [[112, 11, 0], [235, 12, 1], [341, 15, 2], [124, 25, 3], [452, 11, 0], [223, 14, 1], [335, 21, 2], [146, 12, 3], [518, 13, 0], [247, 16, 1], [333, 22, 2], [415, 18, 3], [128, 24, 0], [622, 15, 1], [289, 17, 2], [317, 23, 3], [434, 19, 0]], GROW_SKELETONS, 2, growEmit(B3)));

  const SHRINK_SKELETONS = [
    (nm, ctx, seq) => `${nm} gives away ${ctx.thing} the same way each day: ${seq.join(", ")}. How many ${ctx.thing} will there be next?`,
    (nm, ctx, seq) => `The pile of ${ctx.thing} in ${nm}'s ${ctx.place} shrinks evenly: ${seq.join(", ")}. What count comes next?`,
  ];
  const shrinkEmit = (band) => ([hi, step, ci], sk, nm) => {
    const seq = [hi, hi - step, hi - 2 * step];
    return mk("arithmeticNext", `storyShrink_${band}`, band, {
      answer: hi - 3 * step,
      answerType: "numberPad",
      display: { counting: { kind: "next", sequence: seq, step: -step }, promptText: sk(nm, GROW_CONTEXTS[ci % 4], seq) },
    });
  };
  items.push(...cycle(17, [[20, 2, 0], [19, 3, 1], [18, 2, 2], [17, 3, 3], [20, 4, 0], [16, 2, 1], [19, 4, 2], [15, 3, 3], [20, 5, 0], [14, 2, 1], [18, 5, 2], [16, 4, 3], [13, 3, 0], [20, 3, 1], [12, 2, 2], [17, 5, 3], [15, 4, 0]], SHRINK_SKELETONS, 1, shrinkEmit(B1)));
  items.push(...cycle(17, [[80, 6, 0], [95, 7, 1], [72, 8, 2], [88, 9, 3], [64, 5, 0], [91, 6, 1], [77, 7, 2], [83, 8, 3], [69, 4, 0], [96, 9, 1], [58, 6, 2], [74, 5, 3], [87, 3, 0], [66, 7, 1], [92, 4, 2], [79, 9, 3], [85, 5, 0]], SHRINK_SKELETONS, 2, shrinkEmit(B2)));
  items.push(...cycle(17, [[480, 16, 0], [595, 17, 1], [372, 18, 2], [688, 19, 3], [564, 15, 0], [491, 26, 1], [377, 27, 2], [283, 28, 3], [569, 14, 0], [696, 29, 1], [458, 16, 2], [374, 25, 3], [587, 13, 0], [466, 17, 1], [592, 24, 2], [379, 19, 3], [481, 15, 0]], SHRINK_SKELETONS, 0, shrinkEmit(B3)));

  const AFTER_SKELETONS = [
    (nm, ctx, start, step, days) => `${nm} starts with ${start} ${ctx.thing} and adds ${step} more each day. How many ${ctx.thing} after ${days} days of adding?`,
    (nm, ctx, start, step, days) => `The ${ctx.place} starts at ${start} ${ctx.thing}, and ${nm} puts in ${step} more every day. How many ${ctx.thing} are there after ${days} days?`,
  ];
  const afterEmit = (band) => ([start, step, days, ci], sk, nm) =>
    mk("arithmeticNext", `storyAfterDays_${band}`, band, {
      answer: start + step * days,
      answerType: "numberPad",
      display: { pattern: { kind: "applyRule", start, step, term: days + 1 }, promptText: sk(nm, GROW_CONTEXTS[ci % 4], start, step, days) },
    });
  items.push(...cycle(17, [[2, 2, 3, 0], [3, 3, 2, 1], [9, 4, 3, 2], [4, 2, 4, 3], [2, 5, 2, 0], [5, 3, 3, 1], [10, 2, 4, 2], [6, 2, 3, 3], [3, 4, 4, 0], [2, 3, 3, 1], [4, 4, 4, 2], [7, 2, 4, 3], [5, 2, 4, 0], [11, 5, 3, 1], [4, 3, 3, 2], [8, 2, 4, 3], [6, 3, 3, 0]], AFTER_SKELETONS, 2, afterEmit(B1)));
  items.push(...cycle(17, [[12, 6, 5, 0], [25, 7, 6, 1], [31, 8, 5, 2], [14, 9, 6, 3], [42, 6, 7, 0], [23, 7, 5, 1], [35, 8, 6, 2], [16, 4, 7, 3], [51, 5, 5, 0], [27, 6, 6, 1], [33, 7, 7, 2], [45, 3, 5, 3], [18, 8, 6, 0], [62, 9, 5, 1], [29, 4, 7, 2], [37, 5, 6, 3], [44, 6, 5, 0]], AFTER_SKELETONS, 0, afterEmit(B2)));
  items.push(...cycle(17, [[112, 11, 6, 0], [235, 12, 7, 1], [341, 15, 6, 2], [124, 25, 7, 3], [452, 11, 8, 0], [223, 14, 6, 1], [335, 21, 7, 2], [146, 12, 8, 3], [518, 13, 6, 0], [247, 16, 7, 1], [333, 22, 8, 2], [415, 18, 6, 3], [128, 24, 7, 0], [622, 15, 8, 1], [289, 17, 6, 2], [317, 23, 7, 3], [434, 19, 8, 0]], AFTER_SKELETONS, 1, afterEmit(B3)));
  return items;
}

/* ---------------- geometricNext stories ---------------- */

const DOUBLE_CONTEXTS = [
  { thing: "lily pads", place: "pond" },
  { thing: "bubbles", place: "tub" },
  { thing: "sprouts", place: "garden box" },
  { thing: "paper cranes", place: "mobile" },
];

function geometricStories() {
  const items = [];
  const DOUBLE_SKELETONS = [
    (nm, ctx, seq) => `${nm} watches the ${ctx.thing} in the ${ctx.place} double each day: ${seq.join(", ")}. How many ${ctx.thing} come next?`,
    (nm, ctx, seq) => `Every day the ${ctx.thing} double. ${nm} counts ${seq.join(", ")}. What is the next count of ${ctx.thing}?`,
  ];
  const doubleEmit = (band) => ([start, n, ci], sk, nm) => {
    const seq = Array.from({ length: n }, (_, i) => start * 2 ** i);
    return mk("geometricNext", `storyDouble_${band}`, band, {
      answer: seq[n - 1] * 2,
      answerType: "numberPad",
      display: { sequence: seq, pattern: { kind: "geo", start, factor: 2 }, promptText: sk(nm, DOUBLE_CONTEXTS[ci % 4], seq) },
    });
  };
  items.push(...cycle(17, [[1, 3, 0], [2, 3, 1], [1, 4, 2], [3, 2, 3], [4, 2, 0], [5, 2, 1], [2, 2, 2], [1, 2, 3], [3, 3, 0], [2, 4, 1], [3, 2, 2], [4, 3, 3], [6, 2, 0], [7, 2, 1], [8, 2, 2], [9, 2, 3], [10, 2, 0]], DOUBLE_SKELETONS, 0, doubleEmit(B1)));
  items.push(...cycle(17, [[3, 3, 0], [5, 3, 1], [7, 3, 2], [6, 3, 3], [9, 3, 0], [11, 3, 1], [12, 3, 2], [13, 3, 3], [4, 4, 0], [5, 4, 1], [3, 4, 2], [6, 4, 3], [10, 3, 0], [8, 3, 1], [14, 3, 2], [15, 3, 3], [2, 5, 0]], DOUBLE_SKELETONS, 1, doubleEmit(B2)));
  items.push(...cycle(17, [[25, 3, 0], [35, 3, 1], [45, 3, 2], [55, 3, 3], [65, 3, 0], [75, 3, 1], [85, 3, 2], [95, 3, 3], [105, 3, 0], [115, 3, 1], [21, 4, 2], [31, 4, 3], [41, 4, 0], [51, 4, 1], [61, 4, 2], [71, 4, 3], [81, 4, 0]], DOUBLE_SKELETONS, 2, doubleEmit(B3)));

  const TRIPLE_SKELETONS = [
    (nm, ctx, start, times) => `The ${ctx.thing} in ${nm}'s ${ctx.place} triple every week. This week there are ${start}. How many ${ctx.thing} after ${times} weeks of tripling?`,
    (nm, ctx, start, times) => `${nm} counts ${start} ${ctx.thing} now. Each week the number triples. What is the count of ${ctx.thing} after ${times} weeks?`,
  ];
  const tripleEmit = (band) => ([start, times, ci], sk, nm) =>
    mk("geometricNext", `storyTriple_${band}`, band, {
      answer: start * 3 ** times,
      answerType: "numberPad",
      display: { pattern: { kind: "geoApply", start, factor: 3, times }, promptText: sk(nm, DOUBLE_CONTEXTS[ci % 4], start, times) },
    });
  items.push(...cycle(17, [[1, 2, 0], [2, 2, 1], [1, 1, 2], [2, 1, 3], [3, 1, 0], [4, 1, 1], [5, 1, 2], [6, 1, 3], [3, 2, 0], [1, 3, 1], [4, 2, 2], [7, 1, 0], [8, 1, 1], [9, 1, 2], [10, 1, 3], [5, 2, 0], [2, 3, 1]], TRIPLE_SKELETONS, 1, tripleEmit(B1)));
  items.push(...cycle(17, [[2, 3, 0], [3, 3, 1], [4, 3, 2], [5, 3, 3], [6, 3, 0], [7, 3, 1], [8, 3, 2], [9, 3, 3], [10, 3, 0], [11, 3, 1], [6, 2, 2], [12, 3, 3], [13, 3, 0], [14, 3, 1], [15, 3, 2], [16, 3, 3], [17, 3, 0]], TRIPLE_SKELETONS, 2, tripleEmit(B2)));
  items.push(...cycle(17, [[2, 5, 0], [3, 5, 1], [4, 5, 2], [5, 5, 3], [2, 6, 0], [6, 5, 1], [7, 5, 2], [3, 6, 3], [8, 5, 0], [9, 5, 1], [4, 6, 2], [10, 5, 3], [11, 5, 0], [12, 5, 1], [5, 6, 2], [13, 5, 3], [14, 5, 0]], TRIPLE_SKELETONS, 0, tripleEmit(B3)));

  const HALF_SKELETONS = [
    (nm, ctx, seq) => `Each day half the ${ctx.thing} in ${nm}'s ${ctx.place} float away: ${seq.join(", ")}. How many ${ctx.thing} will be left next?`,
    (nm, ctx, seq) => `${nm} sees the ${ctx.thing} halve day by day: ${seq.join(", ")}. What is the next count of ${ctx.thing}?`,
  ];
  const halfEmit = (band) => ([start, ci], sk, nm) => {
    const seq = [start, start / 2];
    return mk("geometricNext", `storyHalf_${band}`, band, {
      answer: start / 4,
      answerType: "numberPad",
      display: { pattern: { kind: "geoDiv", start, factor: 2, terms: 2 }, promptText: sk(nm, DOUBLE_CONTEXTS[ci % 4], seq) },
    });
  };
  items.push(...cycle(17, [[16, 0], [20, 1], [8, 2], [12, 3], [16, 1], [20, 2], [8, 3], [12, 0], [4, 1], [16, 2], [20, 3], [8, 0], [12, 1], [4, 2], [16, 3], [20, 0], [4, 3]], HALF_SKELETONS, 2, halfEmit(B1)));
  items.push(...cycle(17, [[96, 0], [88, 1], [72, 2], [64, 3], [56, 0], [48, 1], [40, 2], [80, 3], [104, 0], [120, 1], [68, 2], [92, 3], [76, 0], [84, 1], [60, 2], [52, 3], [44, 0]], HALF_SKELETONS, 0, halfEmit(B2)));
  items.push(...cycle(17, [[800, 0], [720, 1], [960, 2], [640, 3], [880, 0], [560, 1], [480, 2], [840, 3], [400, 0], [1040, 1], [920, 2], [760, 3], [680, 0], [600, 1], [1120, 2], [520, 3], [440, 0]], HALF_SKELETONS, 1, halfEmit(B3)));
  return items;
}

/* ---------------- missingTerm stories ---------------- */

const GAP_CONTEXTS = [
  { thing: "house numbers", surface: "street sign" },
  { thing: "raffle tickets", surface: "ticket roll" },
  { thing: "locker numbers", surface: "hallway list" },
  { thing: "page numbers", surface: "photo album" },
];

function missingTermStories() {
  const items = [];
  const SMUDGE_SKELETONS = [
    (nm, ctx, shown) => `${nm} reads ${ctx.thing} in order, but one is smudged: ${shown.join(", ")}. What is the smudged number?`,
    (nm, ctx, shown) => `On the ${ctx.surface}, ${nm} reads ${ctx.thing} running ${shown.join(", ")} — one is too faded to read. Which number is missing?`,
  ];
  const smudgeEmit = (band) => ([start, step, g, ci], sk, nm) => {
    const full = seqUp(start, step, 4);
    const shown = full.map((v, k) => (k === g ? "?" : v));
    return mk("missingTerm", `storySmudge_${band}`, band, {
      answer: full[g],
      answerType: "numberPad",
      display: { counting: { kind: "between", before: full[g - 1], after: full[g + 1] }, promptText: sk(nm, GAP_CONTEXTS[ci % 4], shown) },
    });
  };
  items.push(...cycle(17, [[2, 2, 1, 0], [3, 2, 2, 1], [1, 3, 1, 2], [2, 3, 2, 3], [4, 2, 1, 0], [1, 4, 2, 1], [3, 4, 1, 2], [2, 5, 1, 3], [5, 2, 2, 0], [4, 3, 1, 1], [1, 5, 1, 2], [6, 2, 1, 3], [5, 3, 2, 0], [3, 5, 2, 1], [7, 2, 2, 2], [2, 4, 1, 3], [6, 3, 1, 0]], SMUDGE_SKELETONS, 0, smudgeEmit(B1)));
  items.push(...cycle(17, [[12, 6, 1, 0], [25, 7, 2, 1], [31, 8, 1, 2], [14, 9, 2, 3], [42, 6, 1, 0], [23, 7, 2, 1], [35, 8, 1, 2], [16, 9, 1, 3], [51, 6, 2, 0], [27, 4, 1, 1], [33, 5, 2, 2], [45, 7, 1, 3], [18, 8, 2, 0], [62, 3, 1, 1], [29, 9, 2, 2], [37, 6, 1, 3], [44, 5, 2, 0]], SMUDGE_SKELETONS, 1, smudgeEmit(B2)));
  items.push(...cycle(17, [[112, 11, 1, 0], [235, 12, 2, 1], [341, 15, 1, 2], [124, 25, 2, 3], [452, 11, 1, 0], [223, 14, 2, 1], [335, 21, 1, 2], [146, 12, 2, 3], [518, 13, 1, 0], [247, 16, 2, 1], [333, 22, 1, 2], [415, 18, 2, 3], [128, 24, 1, 0], [622, 15, 2, 1], [289, 17, 1, 2], [317, 23, 2, 3], [434, 19, 1, 0]], SMUDGE_SKELETONS, 2, smudgeEmit(B3)));

  const FIRST_SKELETONS = [
    (nm, ctx, shown) => `The first of ${nm}'s ${ctx.thing} tore off: ${shown.join(", ")}. What was the first number?`,
    (nm, ctx, shown) => `${nm} finds ${ctx.thing} reading ${shown.join(", ")}, but the one before them is gone. Which number is missing at the front?`,
  ];
  const firstEmit = (band) => ([first, step, ci], sk, nm) => {
    const shown = ["?", first, first + step, first + 2 * step];
    return mk("missingTerm", `storyFirstGone_${band}`, band, {
      answer: first - step,
      answerType: "numberPad",
      display: { counting: { kind: "countBack", start: first, back: step }, promptText: sk(nm, GAP_CONTEXTS[ci % 4], shown) },
    });
  };
  items.push(...cycle(17, [[4, 2, 0], [5, 3, 1], [6, 2, 2], [7, 3, 3], [8, 4, 0], [5, 2, 1], [9, 3, 2], [6, 4, 3], [10, 2, 0], [7, 2, 1], [11, 3, 2], [8, 2, 3], [12, 4, 0], [9, 4, 1], [13, 2, 2], [10, 5, 3], [14, 3, 0]], FIRST_SKELETONS, 1, firstEmit(B1)));
  items.push(...cycle(17, [[23, 6, 0], [35, 7, 1], [41, 8, 2], [27, 9, 3], [52, 6, 0], [33, 7, 1], [45, 8, 2], [26, 4, 3], [61, 5, 0], [38, 6, 1], [47, 7, 2], [55, 3, 3], [29, 8, 0], [64, 9, 1], [31, 4, 2], [43, 5, 3], [58, 7, 0]], FIRST_SKELETONS, 2, firstEmit(B2)));
  items.push(...cycle(17, [[123, 11, 0], [235, 12, 1], [341, 15, 2], [227, 25, 3], [352, 13, 0], [433, 14, 1], [545, 21, 2], [226, 16, 3], [361, 22, 0], [238, 18, 1], [447, 24, 2], [555, 17, 3], [329, 23, 0], [364, 19, 1], [231, 26, 2], [443, 27, 3], [126, 28, 0]], FIRST_SKELETONS, 0, firstEmit(B3)));

  const BETWEEN_SKELETONS = [
    (nm, ctx, lo, hi) => `${nm}'s ${ctx.thing} skip evenly from ${lo} to ${hi} with one number between. What is the number between them?`,
    (nm, ctx, lo, hi) => `Two of ${nm}'s ${ctx.thing} read ${lo} and ${hi}, with one missing halfway between. Which number is it?`,
  ];
  const betweenEmit = (band) => ([lo, step, ci], sk, nm) => {
    const hi = lo + 2 * step;
    return mk("missingTerm", `storyBetween_${band}`, band, {
      answer: lo + step,
      answerType: "numberPad",
      display: { counting: { kind: "between", before: lo, after: hi }, promptText: sk(nm, GAP_CONTEXTS[ci % 4], lo, hi) },
    });
  };
  items.push(...cycle(17, [[2, 2, 0], [3, 3, 1], [1, 4, 2], [4, 2, 3], [2, 5, 0], [5, 3, 1], [1, 2, 2], [6, 2, 3], [3, 4, 0], [2, 3, 1], [4, 4, 2], [7, 2, 3], [5, 2, 0], [1, 5, 1], [4, 3, 2], [8, 2, 3], [6, 3, 0]], BETWEEN_SKELETONS, 2, betweenEmit(B1)));
  items.push(...cycle(17, [[12, 6, 0], [25, 7, 1], [31, 8, 2], [14, 9, 3], [42, 6, 0], [23, 7, 1], [35, 8, 2], [16, 4, 3], [51, 5, 0], [27, 6, 1], [33, 7, 2], [45, 3, 3], [18, 8, 0], [62, 9, 1], [29, 4, 2], [37, 5, 3], [44, 6, 0]], BETWEEN_SKELETONS, 0, betweenEmit(B2)));
  items.push(...cycle(17, [[112, 11, 0], [235, 12, 1], [341, 15, 2], [124, 25, 3], [452, 11, 0], [223, 14, 1], [335, 21, 2], [146, 12, 3], [518, 13, 0], [247, 16, 1], [333, 22, 2], [415, 18, 3], [128, 24, 0], [622, 15, 1], [289, 17, 2], [317, 23, 3], [434, 19, 0]], BETWEEN_SKELETONS, 1, betweenEmit(B3)));
  return items;
}

/* ---------------- patternRule stories ---------------- */

const RULE_CONTEXTS = [
  { thing: "bean plant", unit: "leaves" },
  { thing: "brick path", unit: "bricks" },
  { thing: "puzzle", unit: "pieces placed" },
  { thing: "scarf", unit: "rows knitted" },
];

function patternRuleStories() {
  const items = [];
  const RATE_SKELETONS = [
    (nm, ctx, seq) => `${nm} tracks the ${ctx.unit} on the ${ctx.thing} each day: ${seq.join(", ")}. How many ${ctx.unit} are added each day?`,
    (nm, ctx, seq) => `Day after day the ${ctx.thing} grows evenly — ${nm} records ${seq.join(", ")} ${ctx.unit}. By how many ${ctx.unit} does it grow each day?`,
  ];
  const rateEmit = (band) => ([start, step, ci], sk, nm) => {
    const seq = seqUp(start, step, 3);
    return mk("patternRule", `storyRate_${band}`, band, {
      answer: step,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: start, target: start + step }, promptText: sk(nm, RULE_CONTEXTS[ci % 4], seq) },
    });
  };
  items.push(...cycle(17, [[2, 2, 0], [3, 3, 1], [1, 4, 2], [4, 2, 3], [2, 5, 0], [5, 3, 1], [1, 2, 2], [6, 2, 3], [3, 4, 0], [2, 3, 1], [4, 4, 2], [7, 2, 3], [5, 2, 0], [1, 5, 1], [4, 3, 2], [8, 2, 3], [6, 3, 0]], RATE_SKELETONS, 0, rateEmit(B1)));
  items.push(...cycle(17, [[12, 6, 0], [25, 7, 1], [31, 8, 2], [14, 9, 3], [42, 6, 0], [23, 7, 1], [35, 8, 2], [16, 4, 3], [51, 5, 0], [27, 6, 1], [33, 7, 2], [45, 3, 3], [18, 8, 0], [62, 9, 1], [29, 4, 2], [37, 5, 3], [44, 6, 0]], RATE_SKELETONS, 1, rateEmit(B2)));
  items.push(...cycle(17, [[112, 11, 0], [235, 12, 1], [341, 15, 2], [124, 25, 3], [452, 11, 0], [223, 14, 1], [335, 21, 2], [146, 12, 3], [518, 13, 0], [247, 16, 1], [333, 22, 2], [415, 18, 3], [128, 24, 0], [622, 15, 1], [289, 17, 2], [317, 23, 3], [434, 19, 0]], RATE_SKELETONS, 2, rateEmit(B3)));

  const PROJECT_SKELETONS = [
    (nm, ctx, start, step, term) => `${nm}'s ${ctx.thing} follows a rule: start with ${start} ${ctx.unit} and add ${step} each day. How many ${ctx.unit} on day ${term}?`,
    (nm, ctx, start, step, term) => `The rule for ${nm}'s ${ctx.thing} is ${start} ${ctx.unit} on day 1, then ${step} more each day. What is the count of ${ctx.unit} on day ${term}?`,
  ];
  const projEmit = (band) => ([start, step, term, ci], sk, nm) =>
    mk("patternRule", `storyProject_${band}`, band, {
      answer: start + (term - 1) * step,
      answerType: "numberPad",
      display: { pattern: { kind: "applyRule", start, step, term }, promptText: sk(nm, RULE_CONTEXTS[ci % 4], start, step, term) },
    });
  items.push(...cycle(17, [[2, 2, 3, 0], [3, 2, 4, 1], [1, 3, 3, 2], [2, 3, 4, 3], [4, 2, 3, 0], [1, 4, 4, 1], [3, 4, 3, 2], [2, 5, 3, 3], [5, 2, 4, 0], [4, 3, 4, 1], [1, 5, 3, 2], [6, 2, 3, 3], [5, 3, 3, 0], [3, 5, 4, 1], [7, 2, 4, 2], [2, 4, 4, 3], [6, 3, 4, 0]], PROJECT_SKELETONS, 1, projEmit(B1)));
  items.push(...cycle(17, [[12, 6, 5, 0], [25, 7, 6, 1], [31, 8, 5, 2], [14, 9, 6, 3], [42, 6, 7, 0], [23, 7, 5, 1], [35, 8, 6, 2], [16, 9, 7, 3], [51, 6, 5, 0], [27, 4, 6, 1], [33, 5, 7, 2], [45, 7, 5, 3], [18, 8, 6, 0], [62, 3, 5, 1], [29, 9, 7, 2], [37, 6, 6, 3], [44, 5, 5, 0]], PROJECT_SKELETONS, 2, projEmit(B2)));
  items.push(...cycle(17, [[112, 11, 6, 0], [235, 12, 7, 1], [341, 15, 6, 2], [124, 25, 7, 3], [452, 11, 8, 0], [223, 14, 6, 1], [335, 21, 7, 2], [146, 12, 8, 3], [518, 13, 6, 0], [247, 16, 7, 1], [333, 22, 8, 2], [415, 18, 6, 3], [128, 24, 7, 0], [622, 15, 8, 1], [289, 17, 6, 2], [317, 23, 7, 3], [434, 19, 8, 0]], PROJECT_SKELETONS, 0, projEmit(B3)));

  const WRONG_SKELETONS = [
    (nm, ctx, shown) => `${nm} logged the ${ctx.unit} on the ${ctx.thing} as ${shown.join(", ")}, but one entry breaks the even pattern. Which entry is wrong?`,
    (nm, ctx, shown) => `The log for ${nm}'s ${ctx.thing} reads ${shown.join(", ")} ${ctx.unit}. One number does not follow the rule. Which number is it?`,
  ];
  const wrongEmit = (band) => ([start, step, badIdx, drift, ci], sk, nm) => {
    const full = seqUp(start, step, 4);
    const broken = full[badIdx] + drift;
    const shown = full.map((v, k) => (k === badIdx ? broken : v));
    return mk("patternRule", `storyWrongEntry_${band}`, band, {
      answer: broken,
      answerType: "numberPad",
      display: { sequence: shown, pattern: { kind: "slip", start, step, badIdx }, promptText: sk(nm, RULE_CONTEXTS[ci % 4], shown) },
    });
  };
  items.push(...cycle(17, [[2, 2, 1, 1, 0], [3, 2, 2, -1, 1], [1, 3, 1, 1, 2], [2, 3, 2, -1, 3], [4, 2, 3, 1, 0], [1, 4, 1, -1, 1], [3, 4, 2, 1, 2], [2, 5, 1, -1, 3], [5, 2, 3, 1, 0], [4, 3, 2, -1, 1], [1, 5, 2, 1, 2], [6, 2, 1, -1, 3], [5, 3, 3, 1, 0], [3, 5, 1, -1, 1], [7, 2, 2, 1, 2], [2, 4, 3, -1, 3], [6, 3, 2, 1, 0]], WRONG_SKELETONS, 2, wrongEmit(B1)));
  items.push(...cycle(17, [[12, 6, 1, 1, 0], [25, 7, 2, -1, 1], [31, 8, 3, 1, 2], [14, 9, 1, -1, 3], [42, 6, 2, 1, 0], [23, 7, 3, -1, 1], [35, 8, 1, 1, 2], [16, 9, 2, -1, 3], [51, 6, 3, 1, 0], [27, 4, 1, -1, 1], [33, 5, 2, 1, 2], [45, 7, 3, -1, 3], [18, 8, 1, 1, 0], [62, 3, 2, -1, 1], [29, 9, 3, 1, 2], [37, 6, 1, -1, 3], [44, 5, 2, 1, 0]], WRONG_SKELETONS, 0, wrongEmit(B2)));
  items.push(...cycle(17, [[112, 11, 1, 1, 0], [235, 12, 2, -1, 1], [341, 15, 3, 1, 2], [124, 25, 1, -1, 3], [452, 11, 2, 1, 0], [223, 14, 3, -1, 1], [335, 21, 1, 1, 2], [146, 12, 2, -1, 3], [518, 13, 3, 1, 0], [247, 16, 1, -1, 1], [333, 22, 2, 1, 2], [415, 18, 3, -1, 3], [128, 24, 1, 1, 0], [622, 15, 2, -1, 1], [289, 17, 3, 1, 2], [317, 23, 1, -1, 3], [434, 19, 2, 1, 0]], WRONG_SKELETONS, 1, wrongEmit(B3)));
  return items;
}

export function buildStoryItems() {
  return [
    ...repeatingStories(),
    ...arithmeticStories(),
    ...geometricStories(),
    ...missingTermStories(),
    ...patternRuleStories(),
  ];
}
