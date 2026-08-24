/* Application (story) items for the counting bank.
 *
 * Register per docs/word-problem-authoring-guide.md; situations from the
 * EngageNY survey (docs/counting-bank-design.md): count on in context,
 * how-many-more-to-target, hidden counts, count-only-the-target-kind
 * (extraneous information), bags-of-ten collections, and quick-look
 * (subitizing) contexts. All wording original.
 *
 * Payloads follow the counting convention: op "count", claim in
 * display.counting so the countMath gate verifies every story, and every
 * claim given is stated in the prose (the assembler's givensVisible assert).
 * Signature caps (3 per subskill::application bucket, bands shared) are kept
 * by rotating skeleton x name x noun. All stated numbers >= 2; answers never
 * equal a stated number.
 */

import { NAMES, CARD_OBJECTS } from "./countingTemplates.js";

const nameAt = (i) => NAMES[(i * 3 + 1) % NAMES.length];
const nounAt = (i) => CARD_OBJECTS[(i * 5 + 2) % CARD_OBJECTS.length];

const mk = (subskill, structureType, band, question) => ({
  modeId: "counting",
  subskill,
  itemFamily: "application",
  structureType,
  levelRange: band,
  question: { a: null, b: null, op: "count", ...question },
});

const B1 = [1, 3];
const B2 = [4, 6];
const B3 = [7, 10];

function cycle(count, space, skeletons, offset, emit) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const nums = space[i % space.length];
    const sk = skeletons[(i + offset) % skeletons.length];
    items.push(emit(nums, sk, nameAt(i + offset), nounAt(i + offset)));
  }
  return items;
}

/* ----- countOn: count on / target gap / hidden --------------------- */

const COUNT_ON_SKELETONS = [
  (n, s, start, more) =>
    `${n} counts ${start} ${s.noun}, then ${more} more ${s.noun} arrive. How many ${s.noun} does ${n} count now?`,
  (n, s, start, more) =>
    `${n} already has ${start} ${s.noun} in a row. ${n} adds ${more} more ${s.noun} to the row. How many ${s.noun} are in the row?`,
  (n, s, start, more) =>
    `A basket starts with ${start} ${s.noun}. ${n} drops in ${more} more ${s.noun}, counting on. How many ${s.noun} are in the basket?`,
  (n, s, start, more) =>
    `${n} says "${start}" for the ${s.noun} counted so far, then counts ${more} more ${s.noun}. What number does ${n} say last?`,
];

const TARGET_GAP_SKELETONS = [
  (n, s, have, target) =>
    `${n} needs ${target} ${s.noun} for a game. ${n} has ${have} ${s.noun}. How many more ${s.noun} does ${n} need?`,
  (n, s, have, target) =>
    `A tray fits ${target} ${s.noun}. ${n} sets down ${have} ${s.noun}. How many more ${s.noun} fit on the tray?`,
  (n, s, have, target) =>
    `${n} wants a full line of ${target} ${s.noun} and has placed ${have} ${s.noun}. How many ${s.noun} are still missing?`,
];

const HIDDEN_SKELETONS = [
  (n, s, total, seen) =>
    `${n} owns ${total} ${s.noun}. Only ${seen} ${s.noun} are out on the rug; the rest sit in a box. How many ${s.noun} are in the box?`,
  (n, s, total, seen) =>
    `There are ${total} ${s.noun} in all. ${n} can spot ${seen} ${s.noun}; a blanket covers the others. How many ${s.noun} are covered?`,
  (n, s, total, seen) =>
    `${n} brought ${total} ${s.noun} to school and hands out ${seen} ${s.noun}. How many ${s.noun} does ${n} still hold?`,
];

/* ----- cardinality: pick-out counts, collections, bags of ten ------ */

const PICK_OUT_SKELETONS = [
  (n, s, o2, a, b) =>
    `${n} tips out a tub: ${a} ${s.noun} and ${b} ${o2.noun}. ${n} counts only the ${s.noun}. Then ${n} counts the ${o2.noun}. How many things did ${n} count in all?`,
  (n, s, o2, a, b) =>
    `On the mat lie ${a} ${s.noun} and ${b} ${o2.noun}. ${n} counts every single thing on the mat. What number does ${n} reach?`,
];

const TWO_SPOT_SKELETONS = [
  (n, s, a, b) =>
    `${n} keeps ${a} ${s.noun} on a shelf and ${b} ${s.noun} in a drawer. Counting both spots, how many ${s.noun} does ${n} have?`,
  (n, s, a, b) =>
    `${n} counts ${a} ${s.noun} outside, then ${b} ${s.noun} inside. How many ${s.noun} did ${n} count altogether?`,
];

const EXTRANEOUS_SKELETONS = [
  (n, s, o2, a, b, c) =>
    `${n} collects ${a} big ${s.noun}, ${c} ${o2.noun}, and ${b} small ${s.noun}. How many ${s.noun} does ${n} collect?`,
  (n, s, o2, a, b, c) =>
    `A shelf holds ${a} red ${s.noun}, ${b} blue ${s.noun}, and ${c} ${o2.noun}. ${n} counts just the ${s.noun}. How many ${s.noun} are on the shelf?`,
];

const BAGS_OF_TEN_SKELETONS = [
  (n, s, tens, ones) =>
    `${n} fills ${tens} bags with ten ${s.noun} each and has ${ones} loose ${s.noun}. How many ${s.noun} does ${n} have in all?`,
  (n, s, tens, ones) =>
    `${n} counts by tens over ${tens} full boxes of ${s.noun}, then counts on ${ones} single ${s.noun}. What number does ${n} reach?`,
];

/* ----- subitizing: quick-look contexts ----------------------------- */

const QUICK_LOOK_SKELETONS = [
  (n, s, a, b) =>
    `${n} peeks for one second: a five-stack of ${s.noun} and ${b} more ${s.noun} — ${a} in the stack. How many ${s.noun} did ${n} see?`,
  (n, s, a, b) =>
    `Without counting one by one, ${n} sees a full hand of ${a} ${s.noun} and ${b} extra ${s.noun}. How many ${s.noun} is that?`,
];

const DICE_SKELETONS = [
  (n, s, a, b) =>
    `${n} rolls two dice. One die shows ${a} dots, the other shows ${b} dots. ${n} knows both at a glance — how many dots in all?`,
  (n, s, a, b) =>
    `Two dot cards flash for a second: one card has ${a} dots, the other has ${b} dots. How many dots did ${n} just see?`,
];

const FLASH_CARD_SKELETONS = [
  (n, s, a, b) =>
    `${n} flashes a card: ${a} dots on top and ${b} dots below. In one blink, how many dots did ${n} show?`,
  (n, s, a, b) =>
    `A card pops up for ${n}: ${a} dots in one corner and ${b} dots in the other. How many dots does ${n} see on the card?`,
];

const BIG_DOT_CARDS_SKELETONS = [
  (n, s, a, b) =>
    `${n} snaps a look at two dot cards: one holds ${a} dots, the other ${b} dots. How many dots did ${n} see in all?`,
  (n, s, a, b) =>
    `Two cards flip over for ${n}: a card of ${a} dots and a card of ${b} dots. Before counting by ones, ${n} knows — how many dots is that?`,
];

const QUICK_ROWS_SKELETONS = [
  (n, s, tens, ones) =>
    `${n} glances at ${tens} full rows of ten ${s.noun} and ${ones} extra ${s.noun}. Without counting by ones, how many ${s.noun} does ${n} see?`,
  (n, s, tens, ones) =>
    `In one look ${n} spots ${tens} ten-strips of ${s.noun} plus ${ones} single ${s.noun}. How many ${s.noun} is that?`,
];

export function buildStoryItems() {
  const items = [];
  const N = 51;

  /* ----- countOn application --------------------------------------- */
  // (start, more): answer never equals a given; band1 totals <= 20.
  const coB1 = [[5, 3], [7, 2], [8, 4], [6, 5], [9, 3], [11, 4], [12, 3], [7, 6], [13, 2], [8, 5], [14, 3], [6, 2], [15, 4], [9, 4], [11, 2], [12, 5], [16, 3]];
  const coB2 = [[17, 4], [22, 3], [28, 5], [34, 2], [19, 6], [26, 3], [38, 4], [43, 3], [21, 5], [36, 2], [47, 4], [29, 3], [52, 5], [58, 2], [63, 4], [24, 6], [55, 3]];
  const coB3 = [[68, 5], [77, 4], [86, 6], [95, 3], [98, 4], [104, 3], [97, 6], [109, 2], [113, 4], [88, 7], [79, 5], [96, 8], [107, 5], [114, 3], [92, 9], [99, 4], [117, 2]];
  const coEmit = (band) => ([start, more], sk, name, set) =>
    mk("countOn", "storyCountOn", band, {
      answer: start + more,
      answerType: "numberPad",
      display: { counting: { kind: "countOn", start, more }, promptText: sk(name, set, start, more) },
    });
  items.push(...cycle(17, coB1, COUNT_ON_SKELETONS, 0, coEmit(B1)));
  items.push(...cycle(17, coB2, COUNT_ON_SKELETONS, 2, coEmit(B2)));
  items.push(...cycle(17, coB3, COUNT_ON_SKELETONS, 1, coEmit(B3)));

  const tgB1 = [[4, 7], [6, 10], [3, 8], [7, 12], [5, 9], [8, 15], [11, 14], [6, 13], [9, 16], [4, 10], [12, 18], [7, 11]];
  const tgB2 = [[14, 20], [17, 25], [12, 21], [19, 30], [16, 24], [23, 31], [26, 35], [18, 27], [31, 40], [22, 28], [35, 42], [27, 33]];
  const tgB3 = [[42, 50], [57, 63], [64, 70], [78, 85], [83, 90], [92, 100], [96, 103], [104, 110], [113, 120], [87, 95], [98, 106], [109, 115]];
  const tgEmit = (band) => ([have, target], sk, name, set) =>
    mk("countOn", "storyTargetGap", band, {
      answer: target - have,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have, target }, promptText: sk(name, set, have, target) },
    });
  items.push(...cycle(17, tgB1, TARGET_GAP_SKELETONS, 0, tgEmit(B1)));
  items.push(...cycle(17, tgB2, TARGET_GAP_SKELETONS, 1, tgEmit(B2)));
  items.push(...cycle(17, tgB3, TARGET_GAP_SKELETONS, 2, tgEmit(B3)));

  const hdB1 = [[9, 5], [12, 8], [10, 6], [14, 9], [11, 4], [15, 11], [13, 6], [16, 12], [17, 9], [18, 13], [12, 5], [19, 14], [10, 3], [16, 7], [14, 5], [20, 15], [11, 8]];
  const hdB2 = [[22, 15], [25, 18], [28, 19], [24, 16], [30, 21], [26, 17], [32, 23], [27, 20], [35, 26], [23, 14], [31, 24], [29, 18], [34, 27], [21, 12], [33, 25], [36, 28], [38, 29]];
  const hdB3 = [[45, 32], [52, 38], [48, 35], [56, 41], [63, 47], [58, 42], [67, 51], [72, 55], [64, 48], [76, 59], [82, 65], [54, 37], [88, 71], [92, 74], [68, 49], [78, 61], [86, 69]];
  const hdEmit = (band) => ([total, seen], sk, name, set) =>
    mk("countOn", "storyHiddenCount", band, {
      answer: total - seen,
      answerType: "numberPad",
      display: { counting: { kind: "hidden", total, seen }, promptText: sk(name, set, total, seen) },
    });
  items.push(...cycle(N - 34, hdB1, HIDDEN_SKELETONS, 0, hdEmit(B1)));
  items.push(...cycle(N - 34, hdB2, HIDDEN_SKELETONS, 1, hdEmit(B2)));
  items.push(...cycle(N - 34, hdB3, HIDDEN_SKELETONS, 2, hdEmit(B3)));

  /* ----- cardinality application ----------------------------------- */
  const other = (set) => CARD_OBJECTS[(CARD_OBJECTS.indexOf(set) + 4) % CARD_OBJECTS.length];

  // Two-spot collections (put-together counting).
  const tsB1 = [[4, 3], [5, 2], [6, 4], [7, 3], [8, 2], [5, 4], [9, 3], [6, 5], [7, 4], [8, 3], [4, 2], [9, 5], [6, 3], [7, 5], [8, 4], [5, 3], [9, 4]];
  const tsB2 = [[8, 5], [9, 6], [7, 6], [12, 5], [11, 4], [13, 6], [9, 8], [14, 5], [12, 7], [11, 6], [15, 4], [13, 5], [16, 3], [12, 8], [14, 7], [11, 8], [15, 6]];
  const tsB3 = [[22, 13], [25, 14], [31, 16], [27, 12], [34, 15], [28, 13], [36, 12], [23, 18], [32, 17], [26, 15], [38, 14], [24, 19], [35, 13], [29, 16], [33, 12], [37, 15], [21, 17]];
  const tsEmit = (band) => ([a, b], sk, name, set) =>
    mk("cardinality", "storyTwoSpots", band, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(name, set, a, b) },
    });
  items.push(...cycle(17, tsB1, TWO_SPOT_SKELETONS, 0, tsEmit(B1)));
  items.push(...cycle(17, tsB2, TWO_SPOT_SKELETONS, 1, tsEmit(B2)));
  items.push(...cycle(17, tsB3, TWO_SPOT_SKELETONS, 0, tsEmit(B3)));

  // Count everything on the mat (two kinds).
  const poB1 = [[5, 3], [6, 2], [4, 4], [7, 3], [8, 2], [5, 4], [6, 3], [7, 2], [9, 3], [4, 3], [8, 4], [6, 4], [5, 2], [9, 2], [7, 4], [8, 3], [4, 2]];
  const poEmit = (band) => ([a, b], sk, name, set) =>
    mk("cardinality", "storyCountAllKinds", band, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(name, set, other(set), a, b) },
    });
  items.push(...cycle(17, poB1, PICK_OUT_SKELETONS, 0, poEmit(B1)));

  // Extraneous information: count only the named kind (G1 error-proofing).
  const exB2 = [[7, 4, 5], [8, 3, 6], [6, 5, 4], [9, 4, 3], [7, 6, 5], [8, 5, 2], [6, 4, 6], [9, 3, 5], [7, 5, 3], [8, 6, 4], [6, 3, 2], [9, 5, 6], [7, 3, 4], [8, 4, 5], [9, 6, 2], [6, 6, 3], [7, 2, 6]];
  const exB3 = [[17, 14, 5], [23, 12, 6], [19, 15, 4], [26, 13, 3], [21, 16, 5], [28, 12, 2], [16, 14, 6], [29, 13, 5], [27, 15, 3], [18, 16, 4], [26, 12, 2], [19, 14, 6], [24, 13, 4], [18, 15, 5], [29, 16, 2], [26, 16, 3], [17, 12, 6]];
  const exB1 = [[4, 3, 2], [5, 2, 3], [3, 4, 2], [6, 2, 4], [4, 5, 3], [5, 3, 2], [6, 3, 4], [3, 5, 2], [4, 2, 5], [5, 4, 3], [6, 2, 2], [3, 3, 4], [4, 4, 2], [5, 2, 4], [6, 3, 3], [3, 2, 2], [4, 3, 5]];
  const exEmit = (band) => ([a, b, c], sk, name, set) =>
    mk("cardinality", "storyExtraneous", band, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(name, set, other(set), a, b, c) },
    });
  items.push(...cycle(17, exB1, EXTRANEOUS_SKELETONS, 0, exEmit(B1)));
  items.push(...cycle(17, exB2, EXTRANEOUS_SKELETONS, 0, exEmit(B2)));
  items.push(...cycle(17, exB3, EXTRANEOUS_SKELETONS, 1, exEmit(B3)));

  // Bags of ten + loose ones (G1-M6 quick tens; band2 stays under 100 warn).
  const btB2 = [[2, 3], [3, 4], [2, 7], [4, 3], [3, 6], [4, 8], [2, 5], [5, 3], [3, 2], [4, 6], [5, 7], [2, 9], [5, 4], [3, 8], [4, 2], [5, 9], [3, 5]];
  const btB3 = [[6, 4], [7, 3], [8, 6], [9, 2], [10, 5], [11, 3], [6, 8], [9, 7], [10, 9], [11, 6], [7, 8], [8, 3], [9, 4], [10, 1], [11, 9], [6, 7], [8, 9]];
  const btEmit = (band) => ([tens, ones], sk, name, set) =>
    mk("cardinality", "storyBagsOfTen", band, {
      answer: tens * 10 + ones,
      answerType: "numberPad",
      display: { counting: { kind: "groups", tens, ones }, promptText: sk(name, set, tens, ones) },
    });
  items.push(...cycle(17, btB2, BAGS_OF_TEN_SKELETONS, 0, btEmit(B2)));
  items.push(...cycle(17, btB3, BAGS_OF_TEN_SKELETONS, 1, btEmit(B3)));

  /* ----- subitizing application ------------------------------------ */
  // Quick look: a five-stack plus extras (5-group structure told, not drawn).
  const qlB1 = [[5, 2], [5, 3], [5, 4], [5, 1], [5, 2], [5, 3], [5, 4], [5, 1], [5, 2], [5, 3], [5, 4], [5, 2], [5, 3], [5, 1], [5, 4], [5, 3], [5, 2]];
  const qlEmit = (band) => ([a, b], sk, name, set) =>
    mk("subitizing", "storyQuickLook", band, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(name, set, a, b) },
    });
  items.push(...cycle(17, qlB1, QUICK_LOOK_SKELETONS, 0, qlEmit(B1)));

  // Dice / dot-card pairs (perceptual subitizing, then combine).
  const dcB1 = [[3, 2], [4, 3], [5, 2], [6, 3], [4, 2], [5, 4], [6, 2], [3, 3], [5, 3], [6, 4], [4, 4], [6, 5], [2, 3], [3, 4], [2, 5], [4, 5], [2, 6]];
  const dcEmit = (band, st) => ([a, b], sk, name, set) =>
    mk("subitizing", st, band, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(name, set, a, b) },
    });
  items.push(...cycle(17, dcB1, DICE_SKELETONS, 0, dcEmit(B1, "storyDicePair")));
  items.push(...cycle(17, dcB1, FLASH_CARD_SKELETONS, 5, dcEmit(B1, "storyFlashCard")));
  const bigCards = [[7, 5], [8, 4], [7, 6], [9, 3], [8, 6], [7, 4], [9, 5], [8, 7], [7, 7], [9, 6], [8, 5], [9, 4], [7, 3], [8, 8], [9, 7], [7, 8], [9, 8]];
  items.push(...cycle(34, bigCards, BIG_DOT_CARDS_SKELETONS, 1, dcEmit(B2, "storyDotCards")));

  // Quick rows of ten (structured subitizing at magnitude).
  const qrB2 = [[1, 4], [1, 6], [1, 8], [1, 3], [1, 7], [1, 5], [1, 9], [1, 2], [1, 6], [1, 4], [1, 8], [1, 3], [1, 5], [1, 9], [1, 7], [1, 2], [1, 6]];
  const qrB3 = [[2, 4], [3, 6], [4, 3], [5, 7], [2, 8], [3, 2], [4, 6], [5, 4], [6, 3], [2, 9], [3, 7], [4, 8], [5, 2], [6, 6], [7, 4], [3, 3], [4, 5]];
  const qrEmit = (band) => ([tens, ones], sk, name, set) =>
    mk("subitizing", "storyQuickRows", band, {
      answer: tens * 10 + ones,
      answerType: "numberPad",
      display: { counting: { kind: "groups", tens, ones }, promptText: sk(name, set, tens, ones) },
    });
  items.push(...cycle(17, qrB2, QUICK_ROWS_SKELETONS, 0, qrEmit(B2)));
  items.push(...cycle(N, qrB3, QUICK_ROWS_SKELETONS, 1, qrEmit(B3)));

  return items;
}
