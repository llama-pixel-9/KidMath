/* barModels application stories — the classic Singapore-style word problems
 * the mode exists for. Claims ride countMath ({sum}, {countBack},
 * {countOn}, {gap}) or display.bar claims ({unitOf}, {fracOf}, {timesOf})
 * verified by authorBarModels.js. Band scales: <=20 / <=100 / <=1000.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";
import { LEVELS, nameAt } from "./barModelsTemplates.js";

const B1 = "band1";
const B2 = "band2";
const B3 = "band3";

const mk = (subskill, structureType, band, question) => {
  if (band === B1) {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 story exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "barModels",
    subskill,
    itemFamily: "application",
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const THINGS = ["seashells", "trading cards", "acorns", "bottle caps"];

function cycle(count, space, skeletons, offset, emit) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(emit(space[i % space.length], skeletons[(i + offset) % skeletons.length], nameAt(i + offset), i));
  }
  return items;
}

export function buildStoryItems() {
  const items = [];
  const OFF = { band1: 0, band2: 7, band3: 13 };
  const TAG = { band1: "", band2: " Sketch the bar if it helps.", band3: " A bar model makes it clear." };

  /* partWhole stories: join, missing part, three parts. */
  const JOIN_SKELETONS = [
    (nm, other, a, b, t) => `${nm} gathers ${a} ${t} and ${other} gathers ${b}. How many ${t} do they gather altogether?`,
    (nm, other, a, b, t) => `${nm}'s jar holds ${a} ${t}; ${other}'s jar holds ${b}. Poured together, how many ${t} fill one jar?`,
    (nm, other, a, b, t) => `Between them, ${nm} brings ${a} ${t} and ${other} brings ${b}. What is their combined count of ${t}?`,
  ];
  const joinEmit = (band) => ([a, b, ti], sk, nm, i) => {
    const other = nameAt(i + 10 + OFF[band]);
    return mk("partWhole", `storyJoin_${band}`, band, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(nm, other, a, b, THINGS[ti % 4]) + TAG[band] },
    });
  };
  items.push(...cycle(17, [[7, 6, 0], [8, 9, 1], [5, 12, 2], [6, 11, 3], [9, 4, 0], [12, 7, 1], [3, 14, 2], [8, 5, 3], [11, 6, 0], [4, 13, 1], [7, 9, 2], [15, 3, 3], [6, 8, 0], [9, 8, 1], [12, 5, 2], [2, 16, 3], [10, 7, 0]], JOIN_SKELETONS, 0, joinEmit(B1)));
  items.push(...cycle(17, [[27, 31, 0], [38, 42, 1], [49, 23, 2], [54, 19, 3], [35, 45, 0], [28, 66, 1], [59, 33, 2], [42, 39, 3], [63, 17, 0], [30, 54, 1], [47, 38, 2], [52, 28, 3], [37, 47, 0], [66, 22, 1], [44, 49, 2], [58, 31, 3], [25, 68, 0]], JOIN_SKELETONS, 1, joinEmit(B2)));
  items.push(...cycle(17, [[227, 331, 0], [338, 442, 1], [449, 223, 2], [554, 191, 3], [335, 445, 0], [228, 662, 1], [559, 333, 2], [442, 391, 3], [663, 172, 0], [303, 544, 1], [477, 382, 2], [552, 281, 3], [376, 471, 0], [665, 227, 1], [444, 493, 2], [581, 316, 3], [259, 683, 0]], JOIN_SKELETONS, 2, joinEmit(B3)));

  const LEFT_SKELETONS = [
    (nm, w, p, t) => `${nm} starts with ${w} ${t} and gives away ${p}. How many ${t} does ${nm} still have?`,
    (nm, w, p, t) => `Of ${nm}'s ${w} ${t}, ${p} get traded away. What number of ${t} remains?`,
    (nm, w, p, t) => `A pouch of ${w} ${t} loses ${p} through a hole. How many ${t} stay in ${nm}'s pouch?`,
  ];
  const leftEmit = (band) => ([w, p, ti], sk, nm) =>
    mk("partWhole", `storyLeft_${band}`, band, {
      answer: w - p,
      answerType: "barModel",
      display: { type: "barPartWhole", whole: w, part: p, counting: { kind: "countBack", start: w, back: p }, promptText: sk(nm, w, p, THINGS[ti % 4]) + TAG[band] },
    });
  items.push(...cycle(17, [[12, 7, 0], [15, 9, 1], [18, 6, 2], [14, 8, 3], [20, 13, 0], [11, 4, 1], [16, 9, 2], [13, 5, 3], [19, 12, 0], [17, 8, 1], [10, 3, 2], [20, 6, 3], [15, 7, 0], [18, 11, 1], [12, 5, 2], [14, 9, 3], [16, 7, 0]], LEFT_SKELETONS, 1, leftEmit(B1)));
  items.push(...cycle(17, [[45, 27, 0], [62, 38, 1], [71, 46, 2], [53, 29, 3], [84, 57, 0], [66, 31, 1], [92, 68, 2], [58, 24, 3], [77, 49, 0], [63, 36, 1], [85, 52, 2], [49, 18, 3], [96, 73, 0], [67, 42, 1], [74, 28, 2], [88, 61, 3], [55, 33, 0]], LEFT_SKELETONS, 2, leftEmit(B2)));
  items.push(...cycle(17, [[452, 267, 0], [618, 384, 1], [723, 456, 2], [539, 291, 3], [846, 572, 0], [667, 318, 1], [924, 683, 2], [583, 246, 3], [775, 491, 0], [638, 362, 1], [852, 527, 2], [497, 183, 3], [968, 734, 0], [676, 428, 1], [741, 285, 2], [883, 617, 3], [556, 338, 0]], LEFT_SKELETONS, 0, leftEmit(B3)));

  const THREE_SKELETONS = [
    (nm, a, b, c, t) => `${nm} sorts ${t} into three boxes: ${a}, ${b}, and ${c}. How many ${t} are there in all?`,
    (nm, a, b, c, t) => `Three shelves hold ${nm}'s ${t}: ${a} on top, ${b} in the middle, ${c} below. What is the total count of ${t}?`,
    (nm, a, b, c, t) => `${nm} packs ${a}, then ${b}, then ${c} ${t}. Altogether, how many ${t} get packed?`,
  ];
  const threeEmit = (band) => ([a, b, c, ti], sk, nm) =>
    mk("partWhole", `storyThree_${band}`, band, {
      answer: a + b + c,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b, c] }, promptText: sk(nm, a, b, c, THINGS[ti % 4]) + TAG[band] },
    });
  items.push(...cycle(17, [[4, 5, 6, 0], [5, 6, 4, 1], [6, 5, 7, 2], [4, 6, 8, 3], [3, 4, 5, 0], [5, 5, 6, 1], [6, 7, 7, 2], [5, 6, 7, 3], [3, 4, 6, 0], [5, 5, 7, 1], [5, 6, 6, 2], [5, 7, 8, 3], [4, 5, 7, 0], [5, 6, 6, 1], [6, 6, 7, 2], [4, 4, 5, 3], [2, 5, 6, 0]], THREE_SKELETONS, 2, threeEmit(B1)));
  items.push(...cycle(17, [[24, 25, 26, 0], [25, 26, 24, 1], [26, 25, 37, 2], [24, 26, 38, 3], [13, 24, 25, 0], [25, 15, 25, 1], [26, 27, 37, 2], [25, 26, 37, 3], [13, 24, 26, 0], [25, 15, 26, 1], [25, 26, 26, 2], [25, 27, 39, 3], [14, 25, 27, 0], [25, 26, 26, 1], [26, 26, 37, 2], [14, 24, 25, 3], [12, 25, 26, 0]], THREE_SKELETONS, 0, threeEmit(B2)));
  items.push(...cycle(17, [[224, 225, 226, 0], [225, 226, 224, 1], [226, 225, 337, 2], [224, 226, 338, 3], [113, 224, 225, 0], [225, 115, 225, 1], [226, 227, 437, 2], [225, 226, 437, 3], [113, 224, 226, 0], [225, 115, 226, 1], [225, 226, 226, 2], [225, 227, 439, 3], [114, 225, 227, 0], [225, 226, 226, 1], [226, 226, 437, 2], [114, 224, 225, 3], [112, 225, 226, 0]], THREE_SKELETONS, 1, threeEmit(B3)));

  /* comparison stories: difference, more-than, fewer-than. */
  const DIFF_SKELETONS = [
    (nm, other, a, b, t) => `${nm} counts ${a} ${t}; ${other} counts ${b}. How many more ${t} does the leader have?`,
    (nm, other, a, b, t) => `With ${a} ${t} against ${other}'s ${b}, how far ahead is ${nm}?`,
    (nm, other, a, b, t) => `${nm} has ${a} ${t} and ${other} has ${b}. What is the difference in their ${t}?`,
  ];
  const diffEmit = (band) => ([a, b, ti], sk, nm, i) => {
    const other = nameAt(i + 11 + OFF[band]);
    return mk("comparison", `storyDiff_${band}`, band, {
      answer: a - b,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: b, target: a }, promptText: sk(nm, other, a, b, THINGS[ti % 4]) + TAG[band] },
    });
  };
  items.push(...cycle(17, [[14, 9, 0], [17, 8, 1], [12, 5, 2], [19, 11, 3], [16, 7, 0], [15, 6, 1], [20, 12, 2], [13, 4, 3], [18, 9, 0], [11, 3, 1], [20, 14, 2], [16, 9, 3], [14, 6, 0], [19, 13, 1], [12, 7, 2], [17, 4, 3], [15, 8, 0]], DIFF_SKELETONS, 0, diffEmit(B1)));
  items.push(...cycle(17, [[64, 39, 0], [72, 45, 1], [81, 56, 2], [59, 24, 3], [88, 63, 0], [67, 32, 1], [95, 71, 2], [53, 28, 3], [76, 41, 0], [69, 34, 1], [84, 58, 2], [48, 23, 3], [92, 67, 0], [61, 36, 1], [79, 44, 2], [87, 52, 3], [56, 31, 0]], DIFF_SKELETONS, 1, diffEmit(B2)));
  items.push(...cycle(17, [[642, 397, 0], [721, 456, 1], [813, 568, 2], [594, 247, 3], [886, 631, 0], [675, 328, 1], [953, 718, 2], [532, 285, 3], [764, 419, 0], [697, 342, 1], [845, 587, 2], [483, 236, 3], [928, 673, 0], [615, 368, 1], [792, 447, 2], [874, 529, 3], [563, 316, 0]], DIFF_SKELETONS, 2, diffEmit(B3)));

  const MORE_SKELETONS = [
    (nm, other, b, d, t) => `${other} finds ${b} ${t}. ${nm} finds ${d} more than ${other}. How many ${t} does ${nm} find?`,
    (nm, other, b, d, t) => `${nm} beats ${other}'s pile of ${b} ${t} by ${d}. What is ${nm}'s pile of ${t}?`,
    (nm, other, b, d, t) => `${other} stacks ${b} ${t}, and ${nm} stacks ${d} on top of that count. How many ${t} does ${nm} stack?`,
  ];
  const moreEmit = (band) => ([b, d, ti], sk, nm, i) => {
    const other = nameAt(i + 12 + OFF[band]);
    return mk("comparison", `storyMore_${band}`, band, {
      answer: b + d,
      answerType: "numberPad",
      display: { counting: { kind: "countOn", start: b, more: d }, promptText: sk(nm, other, b, d, THINGS[ti % 4]) + TAG[band] },
    });
  };
  items.push(...cycle(17, [[9, 5, 0], [8, 7, 1], [5, 9, 2], [11, 6, 3], [7, 8, 0], [6, 9, 1], [12, 5, 2], [4, 9, 3], [9, 8, 0], [3, 8, 1], [14, 5, 2], [9, 7, 3], [6, 7, 0], [13, 6, 1], [7, 5, 2], [4, 12, 3], [8, 9, 0]], MORE_SKELETONS, 1, moreEmit(B1)));
  items.push(...cycle(17, [[39, 25, 0], [45, 27, 1], [56, 25, 2], [24, 35, 3], [63, 25, 0], [32, 35, 1], [71, 24, 2], [28, 25, 3], [41, 35, 0], [34, 35, 1], [58, 26, 2], [23, 25, 3], [67, 25, 0], [36, 25, 1], [44, 35, 2], [52, 35, 3], [31, 25, 0]], MORE_SKELETONS, 2, moreEmit(B2)));
  items.push(...cycle(17, [[397, 245, 0], [456, 265, 1], [568, 245, 2], [247, 339, 3], [631, 255, 0], [328, 347, 1], [718, 235, 2], [285, 247, 3], [419, 345, 0], [342, 355, 1], [587, 258, 2], [236, 247, 3], [673, 255, 0], [368, 247, 1], [447, 345, 2], [529, 345, 3], [316, 247, 0]], MORE_SKELETONS, 0, moreEmit(B3)));

  const FEWER_SKELETONS = [
    (nm, other, a, d, t) => `${other} spots ${a} ${t}. ${nm} spots ${d} fewer. How many ${t} does ${nm} spot?`,
    (nm, other, a, d, t) => `${nm} trails ${other}'s ${a} ${t} by ${d}. What is ${nm}'s count of ${t}?`,
    (nm, other, a, d, t) => `From ${other}'s total of ${a} ${t}, ${nm} sits ${d} below. How many ${t} does ${nm} hold?`,
  ];
  const fewerEmit = (band) => ([a, d, ti], sk, nm, i) => {
    const other = nameAt(i + 14 + OFF[band]);
    return mk("comparison", `storyFewer_${band}`, band, {
      answer: a - d,
      answerType: "numberPad",
      display: { counting: { kind: "countBack", start: a, back: d }, promptText: sk(nm, other, a, d, THINGS[ti % 4]) + TAG[band] },
    });
  };
  items.push(...cycle(17, [[14, 5, 0], [17, 8, 1], [12, 4, 2], [19, 6, 3], [16, 7, 0], [15, 9, 1], [20, 8, 2], [13, 6, 3], [18, 5, 0], [11, 4, 1], [20, 11, 2], [16, 8, 3], [14, 7, 0], [19, 12, 1], [12, 3, 2], [17, 9, 3], [15, 4, 0]], FEWER_SKELETONS, 2, fewerEmit(B1)));
  items.push(...cycle(17, [[64, 25, 0], [72, 38, 1], [81, 46, 2], [59, 22, 3], [88, 53, 0], [67, 29, 1], [95, 61, 2], [53, 26, 3], [76, 37, 0], [69, 31, 1], [84, 48, 2], [48, 21, 3], [92, 57, 0], [61, 33, 1], [79, 41, 2], [87, 49, 3], [56, 27, 0]], FEWER_SKELETONS, 0, fewerEmit(B2)));
  items.push(...cycle(17, [[642, 257, 0], [721, 386, 1], [813, 468, 2], [594, 227, 3], [886, 531, 0], [675, 298, 1], [953, 617, 2], [532, 265, 3], [764, 379, 0], [697, 313, 1], [845, 487, 2], [483, 216, 3], [928, 572, 0], [615, 334, 1], [792, 418, 2], [867, 493, 3], [563, 247, 0]], FEWER_SKELETONS, 1, fewerEmit(B3)));

  /* multiplicative stories. */
  const TIMES_SKELETONS = [
    (nm, other, k, u, t) => `${other} saves ${u} ${t}; ${nm} saves ${k} times as many. How many ${t} does ${nm} save?`,
    (nm, other, k, u, t) => `${nm}'s haul of ${t} is ${k} of ${other}'s piles of ${u} stacked together. How many ${t} is that?`,
    (nm, other, k, u, t) => `Whatever ${other} collects, ${nm} collects ${k} times over. ${other} has ${u} ${t}. What does ${nm} have?`,
  ];
  const timesEmit = (band) => ([k, u, ti], sk, nm, i) => {
    const other = nameAt(i + 15 + OFF[band]);
    return mk("multiplicative", `storyTimes_${band}`, band, {
      answer: k * u,
      answerType: "numberPad",
      display: { bar: { kind: "timesOf", k, u }, promptText: sk(nm, other, k, u, THINGS[ti % 4]) + TAG[band] },
    });
  };
  items.push(...cycle(17, [[2, 6, 0], [3, 4, 1], [2, 7, 2], [3, 5, 3], [2, 8, 0], [4, 3, 1], [2, 9, 2], [3, 6, 3], [4, 4, 0], [2, 5, 1], [5, 3, 2], [3, 3, 3], [4, 5, 0], [2, 10, 1], [5, 4, 2], [6, 3, 3], [2, 4, 0]], TIMES_SKELETONS, 0, timesEmit(B1)));
  items.push(...cycle(17, [[3, 21, 0], [4, 17, 1], [5, 14, 2], [6, 12, 3], [3, 26, 0], [4, 19, 1], [5, 16, 2], [6, 13, 3], [3, 24, 0], [4, 22, 1], [5, 18, 2], [7, 11, 3], [3, 29, 0], [4, 23, 1], [5, 19, 2], [7, 12, 3], [3, 27, 0]], TIMES_SKELETONS, 1, timesEmit(B2)));
  items.push(...cycle(17, [[3, 214, 0], [4, 173, 1], [5, 146, 2], [6, 124, 3], [3, 267, 0], [4, 192, 1], [5, 163, 2], [6, 137, 3], [3, 243, 0], [4, 226, 1], [5, 184, 2], [7, 118, 3], [3, 292, 0], [4, 234, 1], [5, 197, 2], [7, 121, 3], [3, 275, 0]], TIMES_SKELETONS, 2, timesEmit(B3)));

  const SHARE_SKELETONS = [
    (nm, w, k, t) => `${nm} deals ${w} ${t} evenly into ${k} gift bags. How many ${t} go in each bag?`,
    (nm, w, k, t) => `A crate of ${w} ${t} splits fairly across ${k} tables for ${nm}'s party. How many ${t} per table?`,
    (nm, w, k, t) => `${nm} lines up ${w} ${t} in ${k} equal rows. How many ${t} fill one row?`,
  ];
  const shareEmit = (band) => ([w, k, ti], sk, nm) =>
    mk("multiplicative", `storyShare_${band}`, band, {
      answer: w / k,
      answerType: "numberPad",
      display: { bar: { kind: "unitOf", w, k }, promptText: sk(nm, w, k, THINGS[ti % 4]) + TAG[band] },
    });
  items.push(...cycle(17, [[12, 2, 0], [12, 3, 1], [12, 4, 2], [15, 3, 3], [16, 2, 0], [16, 4, 1], [18, 2, 2], [18, 3, 3], [20, 2, 0], [20, 4, 1], [14, 2, 2], [10, 2, 3], [9, 3, 0], [8, 2, 1], [8, 4, 2], [6, 2, 3], [20, 5, 0]], SHARE_SKELETONS, 1, shareEmit(B1)));
  items.push(...cycle(17, [[84, 3, 0], [76, 4, 1], [95, 5, 2], [72, 6, 3], [87, 3, 0], [92, 4, 1], [85, 5, 2], [78, 6, 3], [96, 3, 0], [88, 4, 1], [75, 5, 2], [84, 6, 3], [93, 3, 0], [68, 4, 1], [90, 5, 2], [66, 6, 3], [81, 3, 0]], SHARE_SKELETONS, 2, shareEmit(B2)));
  items.push(...cycle(17, [[846, 3, 0], [764, 4, 1], [955, 5, 2], [726, 6, 3], [873, 3, 0], [928, 4, 1], [855, 5, 2], [786, 6, 3], [963, 3, 0], [884, 4, 1], [755, 5, 2], [846, 6, 3], [939, 3, 0], [688, 4, 1], [905, 5, 2], [666, 6, 3], [813, 3, 0]], SHARE_SKELETONS, 0, shareEmit(B3)));

  const ROWS_SKELETONS = [
    (nm, k, u, t) => `${nm} plants ${k} rows of ${u} seedlings. How many seedlings stand in ${nm}'s garden?`,
    (nm, k, u, t) => `Each of ${nm}'s ${k} trays carries ${u} muffins. How many muffins bake in all?`,
    (nm, k, u, t) => `${nm} clips ${k} strings of ${u} beads. How many beads hang altogether?`,
  ];
  const rowsEmit = (band) => ([k, u], sk, nm) =>
    mk("multiplicative", `storyRows_${band}`, band, {
      answer: k * u,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: Array.from({ length: k }, () => u) }, promptText: sk(nm, k, u, null) + TAG[band] },
    });
  items.push(...cycle(17, [[2, 6], [3, 4], [2, 7], [3, 5], [2, 8], [4, 3], [2, 9], [3, 6], [4, 4], [2, 5], [5, 3], [3, 3], [4, 5], [2, 10], [5, 4], [6, 3], [5, 2]], ROWS_SKELETONS, 2, rowsEmit(B1)));
  items.push(...cycle(17, [[3, 21], [4, 17], [5, 14], [6, 12], [3, 26], [4, 19], [5, 16], [6, 13], [3, 24], [4, 22], [5, 18], [7, 11], [3, 29], [4, 23], [5, 19], [7, 12], [8, 11]], ROWS_SKELETONS, 0, rowsEmit(B2)));
  items.push(...cycle(17, [[3, 214], [4, 173], [5, 146], [6, 124], [3, 267], [4, 192], [5, 163], [6, 137], [3, 243], [4, 226], [5, 184], [7, 118], [3, 292], [4, 234], [5, 197], [7, 121], [8, 116]], ROWS_SKELETONS, 1, rowsEmit(B3)));

  /* fractionBar stories. */
  const FRAC_SKELETONS = [
    (nm, num, den, w, t) => `${nm} bakes ${w} rolls and shares ${num === 1 ? `one ${["", "", "half", "third", "quarter", "fifth", "sixth"][den]}` : `${num} of the ${den} equal shares`} with neighbors. How many rolls go to the neighbors?`,
    (nm, num, den, w, t) => `Of ${nm}'s ${w}-page comic, ${num} of the ${den} equal chapters are finished. How many pages are finished?`,
    (nm, num, den, w, t) => `${nm} pours a ${w}-cup batch into ${den} equal jars and hands over ${num}. How many cups get handed over?`,
  ];
  const fracEmit = (band) => ([num, den, w], sk, nm) =>
    mk("fractionBar", `storyFrac_${band}`, band, {
      answer: (w / den) * num,
      answerType: "numberPad",
      display: { bar: { kind: "fracOf", num, den, w }, promptText: sk(nm, num, den, w, null) + TAG[band] },
    });
  items.push(...cycle(17, [[1, 2, 12], [1, 2, 16], [1, 4, 12], [1, 4, 16], [1, 2, 20], [1, 3, 12], [1, 3, 15], [3, 4, 12], [2, 3, 12], [1, 2, 10], [1, 4, 20], [1, 3, 18], [3, 4, 16], [2, 3, 15], [1, 2, 18], [1, 2, 14], [1, 4, 8]], FRAC_SKELETONS, 0, fracEmit(B1)));
  items.push(...cycle(17, [[1, 4, 84], [3, 4, 76], [2, 5, 95], [5, 6, 72], [1, 3, 87], [3, 4, 92], [4, 5, 85], [1, 6, 78], [2, 3, 96], [1, 4, 88], [3, 5, 75], [5, 6, 84], [1, 3, 93], [1, 4, 68], [2, 5, 90], [1, 6, 66], [2, 3, 81]], FRAC_SKELETONS, 1, fracEmit(B2)));
  items.push(...cycle(17, [[1, 4, 848], [3, 4, 764], [2, 5, 955], [5, 6, 726], [1, 3, 873], [3, 4, 928], [4, 5, 855], [1, 6, 786], [2, 3, 963], [1, 4, 884], [3, 5, 755], [5, 6, 846], [1, 3, 939], [1, 4, 688], [2, 5, 905], [1, 6, 666], [2, 3, 813]], FRAC_SKELETONS, 2, fracEmit(B3)));

  const HALFLEFT_SKELETONS = [
    (nm, w, t) => `${nm} reads half of a ${w}-page book on the trip. How many pages has ${nm} read?`,
    (nm, w, t) => `Half of ${nm}'s ${w} balloons float away. How many balloons drift off?`,
    (nm, w, t) => `${nm} freezes half of ${w} juice pops for later. How many pops go in the freezer?`,
  ];
  const halfEmit = (band) => ([w], sk, nm) =>
    mk("fractionBar", `storyHalf_${band}`, band, {
      answer: w / 2,
      answerType: "numberPad",
      display: { bar: { kind: "fracOf", num: 1, den: 2, w }, promptText: sk(nm, w, null) + TAG[band] },
    });
  items.push(...cycle(17, [[12], [16], [20], [14], [18], [10], [8], [6], [4], [12], [16], [20], [14], [18], [10], [8], [6]], HALFLEFT_SKELETONS, 1, halfEmit(B1)));
  items.push(...cycle(17, [[84], [76], [94], [68], [92], [88], [96], [72], [86], [78], [90], [64], [82], [98], [74], [66], [80]], HALFLEFT_SKELETONS, 2, halfEmit(B2)));
  items.push(...cycle(17, [[848], [764], [946], [688], [928], [886], [968], [726], [864], [786], [906], [644], [824], [986], [744], [666], [808]], HALFLEFT_SKELETONS, 0, halfEmit(B3)));

  const REBUILD_SKELETONS = [
    (nm, den, piece, t) => `One of the ${den} equal ribbons from ${nm}'s spool measures ${piece}. How long was the whole spool?`,
    (nm, den, piece, t) => `${nm} split a bag evenly into ${den} pouches of ${piece} beads each. How many beads filled the bag?`,
    (nm, den, piece, t) => `Each of the ${den} equal slices of ${nm}'s fruit bar weighs ${piece} grams. What did the whole bar weigh?`,
  ];
  const rebuildEmit = (band) => ([den, piece], sk, nm) =>
    mk("fractionBar", `storyRebuild_${band}`, band, {
      answer: den * piece,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: Array.from({ length: den }, () => piece) }, promptText: sk(nm, den, piece, null) + TAG[band] },
    });
  items.push(...cycle(17, [[2, 6], [2, 7], [2, 8], [3, 4], [3, 5], [3, 6], [4, 3], [4, 4], [4, 5], [5, 2], [5, 3], [2, 9], [2, 10], [3, 3], [4, 2], [5, 4], [6, 2]], REBUILD_SKELETONS, 0, rebuildEmit(B1)));
  items.push(...cycle(17, [[3, 28], [4, 19], [5, 19], [6, 12], [3, 29], [4, 23], [5, 17], [6, 13], [3, 32], [4, 22], [5, 15], [6, 14], [3, 31], [4, 17], [5, 18], [6, 11], [3, 27]], REBUILD_SKELETONS, 1, rebuildEmit(B2)));
  items.push(...cycle(17, [[3, 282], [4, 191], [5, 191], [6, 121], [3, 291], [4, 232], [5, 171], [6, 131], [3, 321], [4, 221], [5, 151], [6, 141], [3, 313], [4, 172], [5, 181], [6, 111], [3, 271]], REBUILD_SKELETONS, 2, rebuildEmit(B3)));

  return items;
}
