/* Application (story) items for the comparing bank.
 *
 * Situations from the EngageNY survey (docs/comparing-bank-design.md):
 * who-has-more/fewer, difference unknown, "enough?" checks, threshold and
 * written-sign judgments, closer-to and gap-to-goal benchmarks, and the
 * compare language trap (Progressions: "more" wording, smaller unknown).
 *
 * Payloads: op "vs"; numeric answers carry display.compare claims so the
 * compareMath gate verifies them; symbol answers carry numeric a/b; judged
 * answers carry display.truth. Names+nouns rotate signatures (cap 3/sig).
 */

import { NAMES } from "./countingTemplates.js";

const NOUNS = ["marbles", "stickers", "blocks", "crayons", "shells", "cards", "beads", "buttons", "acorns", "stamps", "coins", "leaves"];

const nameAt = (i) => NAMES[(i * 3 + 2) % NAMES.length];
const name2At = (i) => NAMES[(i * 7 + 5) % NAMES.length];
const nounAt = (i) => NOUNS[(i * 5 + 1) % NOUNS.length];
const sym = (x, y) => (x > y ? ">" : x < y ? "<" : "=");

const mk = (subskill, structureType, band, question) => ({
  modeId: "comparing",
  subskill,
  itemFamily: "application",
  structureType,
  levelRange: band,
  question: { a: null, b: null, op: "vs", ...question },
});

const B1 = [1, 3];
const B2 = [4, 6];
const B3 = [7, 10];

function cycle(count, space, skeletons, offset, emit) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const nums = space[i % space.length];
    const sk = skeletons[(i + offset) % skeletons.length];
    let n2 = name2At(i + offset);
    const n1 = nameAt(i + offset);
    if (n2 === n1) n2 = NAMES[(NAMES.indexOf(n1) + 3) % NAMES.length];
    items.push(emit(nums, sk, n1, n2, nounAt(i + offset)));
  }
  return items;
}

/* ----- distanceCompare stories ------------------------------------- */

const WHO_MORE_SKELETONS = [
  (n1, n2, noun, a, b) =>
    `${n1} has ${a} ${noun}. ${n2} has ${b} ${noun}. Who has more ${noun}?`,
  (n1, n2, noun, a, b) =>
    `${n1} collects ${a} ${noun} and ${n2} collects ${b} ${noun}. Who collects fewer ${noun}?`,
  (n1, n2, noun, a, b) =>
    `At the fair, ${n1} wins ${a} ${noun} and ${n2} wins ${b} ${noun}. Who wins more ${noun}?`,
];

const DIFF_SKELETONS = [
  (n1, n2, noun, big, small) =>
    `${n1} has ${big} ${noun} and ${n2} has ${small} ${noun}. How many more ${noun} does ${n1} have?`,
  (n1, n2, noun, big, small) =>
    `${n1} saves ${big} ${noun}; ${n2} saves ${small} ${noun}. How many fewer ${noun} does ${n2} have?`,
  (n1, n2, noun, big, small) =>
    `${n1} counts ${big} ${noun} and ${n2} counts ${small} ${noun}. How many ${noun} apart are they?`,
];

const TRAP_SKELETONS = [
  (n1, n2, noun, bigger, diff) =>
    `${n1} has ${diff} more ${noun} than ${n2}. ${n1} has ${bigger} ${noun}. How many ${noun} does ${n2} have?`,
  (n1, n2, noun, bigger, diff) =>
    `${n2} has ${diff} fewer ${noun} than ${n1}. ${n1} has ${bigger} ${noun}. How many ${noun} does ${n2} have?`,
];

const ONE_MORE_STORY_SKELETONS = [
  (n1, n2, noun, n, delta) =>
    `${n1} has ${n} ${noun}. ${n2} has ${delta > 0 ? "one more" : "one less"} than ${n1}. How many ${noun} does ${n2} have?`,
  (n1, n2, noun, n, delta) =>
    `${n1} counts ${n} ${noun}. ${n2}'s pile has ${delta > 0 ? "one extra" : "one missing"}. How many ${noun} are in ${n2}'s pile?`,
];

/* ----- benchmarkCompare stories ------------------------------------ */

const ENOUGH_SKELETONS = [
  (n1, noun, need, have) =>
    `${n1} needs ${need} ${noun} for the game. ${n1} has ${have} ${noun}. Does ${n1} have enough ${noun}?`,
  (n1, noun, need, have) =>
    `The craft takes ${need} ${noun}. ${n1} brings ${have} ${noun}. Did ${n1} bring enough ${noun}?`,
];

const CLOSER_STORY_SKELETONS = [
  (n1, noun, n, lo, hi) =>
    `${n1} counts ${n} ${noun}. Is that closer to ${lo} ${noun} or to ${hi} ${noun}?`,
  (n1, noun, n, lo, hi) =>
    `${n1}'s jar holds ${n} ${noun}. Is the jar nearer ${lo} or ${hi} ${noun}?`,
];

const GAP_TO_GOAL_SKELETONS = [
  (n1, noun, have, target) =>
    `${n1} wants ${target} ${noun} in the album. So far there are ${have} ${noun}. How many more ${noun} does ${n1} need?`,
  (n1, noun, have, target) =>
    `A full box holds ${target} ${noun}. ${n1} packs ${have} ${noun}. How many more ${noun} fit in the box?`,
];

/* ----- symbolSelection stories ------------------------------------- */

const SYMBOL_STORY_SKELETONS = [
  (n1, n2, noun, a, b) =>
    `${n1} scores ${a} points and ${n2} scores ${b} points. Choose the symbol that compares ${a} and ${b}.`,
  (n1, n2, noun, a, b) =>
    `${n1} reads ${a} pages; ${n2} reads ${b} pages. Which symbol goes between ${a} and ${b}?`,
  (n1, n2, noun, a, b) =>
    `${n1} stacks ${a} ${noun} and ${n2} stacks ${b} ${noun}. Pick the sign comparing ${a} to ${b}.`,
];

const CLAIM_JUDGE_SKELETONS = [
  (n1, noun, a, b) =>
    `${n1} says ${a} ${noun} are more than ${b} ${noun}. Is ${n1} right?`,
  (n1, noun, a, b) =>
    `${n1} claims a pile of ${a} ${noun} beats a pile of ${b} ${noun}. Is that right?`,
];

const WROTE_SIGN_SKELETONS = [
  (n1, a, s, b) => `${n1} writes ${a} ${s} ${b} on the board. Is that right?`,
  (n1, a, s, b) => `In the game, ${n1} claims ${a} ${s} ${b}. Is ${n1} right?`,
  (n1, a, s, b) => `${n1} checks a card that says ${a} ${s} ${b}. Is the card right?`,
  (n1, a, s, b) => `${n1} compares and writes down ${a} ${s} ${b}. Did ${n1} get it right?`,
];

export function buildStoryItems() {
  const items = [];

  /* ----- distanceCompare application ------------------------------- */
  const whoEmit = (band) => ([a, b], sk, n1, n2, noun) => {
    const text = sk(n1, n2, noun, a, b);
    const wantMore = /more/.test(text) && !/fewer/.test(text);
    return mk("distanceCompare", "storyWhoMoreFewer", band, {
      answer: (a > b) === wantMore ? n1 : n2,
      choices: [n1, n2],
      display: { promptText: text },
    });
  };
  const whoB1 = [[5, 3], [4, 7], [8, 6], [3, 6], [9, 7], [6, 4], [7, 9], [5, 8], [10, 8], [4, 5], [12, 9], [8, 11], [13, 15], [16, 14], [11, 18], [19, 17], [6, 10]];
  const whoB2 = [[24, 42], [35, 28], [46, 51], [57, 49], [63, 66], [72, 68], [85, 88], [91, 87], [29, 32], [44, 41], [56, 65], [78, 73], [82, 89], [37, 33], [65, 62], [93, 96], [48, 52]];
  const whoB3 = [[203, 302], [415, 451], [326, 263], [540, 504], [617, 671], [289, 298], [98, 102], [730, 703], [846, 864], [152, 125], [479, 497], [368, 386], [925, 952], [214, 241], [583, 538], [190, 109], [455, 545]];
  items.push(...cycle(17, whoB1, WHO_MORE_SKELETONS, 0, whoEmit(B1)));
  items.push(...cycle(17, whoB2, WHO_MORE_SKELETONS, 1, whoEmit(B2)));
  items.push(...cycle(17, whoB3, WHO_MORE_SKELETONS, 2, whoEmit(B3)));

  const diffEmit = (band) => ([big, small], sk, n1, n2, noun) =>
    mk("distanceCompare", "storyDifference", band, {
      answer: big - small,
      answerType: "numberPad",
      display: {
        compare: { kind: "difference", bigger: big, smaller: small },
        promptText: sk(n1, n2, noun, big, small),
      },
    });
  const diffB2 = [[34, 21], [46, 32], [58, 43], [67, 51], [75, 62], [83, 71], [92, 78], [29, 16], [47, 35], [56, 44], [64, 49], [73, 58], [88, 76], [95, 81], [38, 27], [52, 39], [61, 48]];
  const diffB3 = [[230, 180], [345, 290], [460, 395], [520, 470], [615, 580], [740, 690], [850, 795], [925, 880], [310, 260], [435, 390], [560, 515], [680, 640], [795, 745], [870, 830], [945, 905], [280, 235], [405, 365]];
  items.push(...cycle(17, diffB2, DIFF_SKELETONS, 1, diffEmit(B2)));
  items.push(...cycle(17, diffB3, DIFF_SKELETONS, 2, diffEmit(B3)));

  const trapEmit = (band) => ([bigger, diff], sk, n1, n2, noun) =>
    mk("distanceCompare", "storyLanguageTrap", band, {
      answer: bigger - diff,
      answerType: "numberPad",
      display: {
        compare: { kind: "difference", bigger, smaller: diff },
        promptText: sk(n1, n2, noun, bigger, diff),
      },
    });
  const trapB2 = [[15, 4], [18, 6], [12, 3], [17, 5], [19, 7], [14, 6], [16, 9], [13, 4], [20, 8], [11, 2], [18, 9], [15, 7], [19, 4], [12, 5], [16, 3], [14, 8], [20, 6]];
  const trapB3 = [[45, 12], [62, 25], [78, 33], [54, 18], [91, 36], [67, 29], [83, 41], [39, 14], [72, 26], [58, 22], [96, 43], [44, 17], [69, 31], [87, 38], [51, 19], [76, 28], [93, 45]];
  items.push(...cycle(17, trapB2, TRAP_SKELETONS, 0, trapEmit(B2)));
  items.push(...cycle(17, trapB3, TRAP_SKELETONS, 1, trapEmit(B3)));

  const oneMoreEmit = (band) => ([n, delta], sk, n1, n2, noun) =>
    mk("distanceCompare", "storyOneMoreLess", band, {
      answer: n + delta,
      answerType: "numberPad",
      display: { compare: { kind: "oneMoreLess", n, delta }, promptText: sk(n1, n2, noun, n, delta) },
    });
  const omB1 = [[6, 1], [9, -1], [4, 1], [12, -1], [7, 1], [15, -1], [3, 1], [11, -1], [8, 1], [17, -1], [5, 1], [14, -1], [10, 1], [19, -1], [13, 1], [16, -1], [18, 1]];
  items.push(...cycle(17, omB1, ONE_MORE_STORY_SKELETONS, 0, oneMoreEmit(B1)));
  const diffB1 = [[7, 4], [9, 5], [8, 3], [10, 6], [6, 2], [9, 4], [12, 8], [15, 9], [11, 7], [14, 8], [13, 5], [16, 12], [18, 11], [17, 13], [19, 12], [10, 3], [8, 5]];
  items.push(...cycle(17, diffB1, DIFF_SKELETONS, 0, diffEmit(B1)));

  /* ----- benchmarkCompare application ------------------------------ */
  const enoughEmit = (band) => ([need, have], sk, n1, n2, noun) =>
    mk("benchmarkCompare", "storyEnough", band, {
      answer: have >= need ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { promptText: sk(n1, noun, need, have), truth: have >= need },
    });
  const enoughB1 = [[7, 9], [8, 6], [10, 10], [5, 3], [9, 12], [6, 6], [12, 10], [4, 7], [11, 8], [15, 16], [13, 13], [8, 11], [14, 12], [7, 5], [10, 13], [16, 14], [9, 9]];
  const enoughB2 = [[25, 30], [40, 35], [32, 32], [48, 51], [55, 49], [63, 70], [72, 66], [80, 80], [37, 42], [59, 54], [66, 71], [45, 41], [78, 83], [84, 79], [29, 33], [52, 52], [68, 62]];
  const enoughB3 = [[250, 300], [400, 385], [520, 520], [610, 640], [730, 715], [845, 860], [910, 905], [180, 210], [340, 335], [465, 480], [575, 570], [690, 705], [820, 810], [935, 950], [290, 285], [415, 430], [560, 560]];
  items.push(...cycle(17, enoughB1, ENOUGH_SKELETONS, 0, enoughEmit(B1)));
  items.push(...cycle(17, enoughB2, ENOUGH_SKELETONS, 1, enoughEmit(B2)));
  items.push(...cycle(17, enoughB3, ENOUGH_SKELETONS, 0, enoughEmit(B3)));

  const closerEmit = (band) => ([n, lo, hi], sk, n1, n2, noun) =>
    mk("benchmarkCompare", "storyCloserTo", band, {
      answer: n - lo < hi - n ? lo : hi,
      choices: [lo, hi],
      display: { compare: { kind: "closerTo", n, lo, hi }, promptText: sk(n1, noun, n, lo, hi) },
    });
  const closerB1 = [[13, 10, 20], [17, 10, 20], [12, 10, 20], [18, 10, 20], [14, 10, 20], [16, 10, 20], [11, 10, 20], [19, 10, 20], [7, 5, 10], [8, 5, 10], [6, 5, 10], [9, 5, 10], [13, 10, 20], [17, 10, 20], [12, 10, 20], [18, 10, 20], [16, 10, 20]];
  const closerB2 = [[23, 20, 30], [27, 20, 30], [41, 40, 50], [48, 40, 50], [62, 60, 70], [69, 60, 70], [74, 70, 80], [76, 70, 80], [83, 80, 90], [88, 80, 90], [31, 30, 40], [39, 30, 40], [52, 50, 60], [58, 50, 60], [91, 90, 100], [97, 90, 100], [24, 20, 30]];
  const closerB3 = [[47, 40, 50], [83, 80, 90], [62, 60, 70], [128, 120, 130], [256, 250, 260], [341, 340, 350], [479, 470, 480], [512, 510, 520], [694, 690, 700], [738, 730, 740], [861, 860, 870], [917, 910, 920], [154, 150, 160], [272, 270, 280], [388, 380, 390], [426, 420, 430], [569, 560, 570]];
  items.push(...cycle(17, closerB1, CLOSER_STORY_SKELETONS, 1, closerEmit(B1)));
  items.push(...cycle(17, closerB2, CLOSER_STORY_SKELETONS, 0, closerEmit(B2)));
  items.push(...cycle(17, closerB3, CLOSER_STORY_SKELETONS, 0, closerEmit(B3)));

  const goalEmit = (band) => ([have, target], sk, n1, n2, noun) =>
    mk("benchmarkCompare", "storyGapToGoal", band, {
      answer: target - have,
      answerType: "numberPad",
      display: { compare: { kind: "gap", have, target }, promptText: sk(n1, noun, have, target) },
    });
  const goalB1 = [[6, 10], [4, 10], [7, 10], [3, 5], [8, 10], [2, 5], [12, 15], [9, 15], [13, 20], [11, 20], [5, 10], [14, 20], [16, 20], [7, 15], [4, 5], [18, 20], [6, 15]];
  const goalB2 = [[35, 50], [42, 50], [28, 40], [56, 70], [63, 80], [71, 90], [47, 60], [84, 100], [39, 50], [52, 70], [66, 80], [23, 30], [77, 90], [88, 100], [31, 40], [59, 70], [45, 60]];
  const goalB3 = [[230, 300], [345, 400], [460, 500], [520, 600], [615, 700], [740, 800], [850, 900], [925, 1000], [310, 400], [435, 500], [560, 600], [680, 700], [795, 800], [270, 300], [590, 600], [880, 900], [195, 200]];
  items.push(...cycle(17, goalB1, GAP_TO_GOAL_SKELETONS, 0, goalEmit(B1)));
  items.push(...cycle(17, goalB2, GAP_TO_GOAL_SKELETONS, 1, goalEmit(B2)));
  items.push(...cycle(17, goalB3, GAP_TO_GOAL_SKELETONS, 1, goalEmit(B3)));

  /* ----- symbolSelection application ------------------------------- */
  const symEmit = (band) => ([a, b], sk, n1, n2, noun) =>
    mk("symbolSelection", "storyChooseSymbol", band, {
      a,
      b,
      answer: sym(a, b),
      answerType: "symbolSelect",
      display: { promptText: sk(n1, n2, noun, a, b) },
    });
  const symB1 = [[5, 8], [9, 4], [7, 7], [3, 6], [10, 2], [6, 9], [8, 8], [4, 1], [12, 15], [16, 13], [11, 11], [18, 14], [13, 19], [17, 17], [15, 10], [19, 16], [14, 12]];
  const symB2 = [[24, 42], [35, 53], [67, 27], [58, 55], [46, 46], [79, 82], [91, 19], [63, 66], [88, 84], [37, 73], [50, 50], [29, 92], [75, 71], [44, 47], [82, 82], [16, 61], [96, 69]];
  const symB3 = [[203, 302], [415, 451], [98, 102], [540, 504], [667, 667], [289, 298], [730, 703], [152, 125], [846, 864], [479, 497], [925, 925], [214, 241], [583, 538], [190, 109], [368, 386], [455, 545], [700, 700]];
  items.push(...cycle(17, symB1, SYMBOL_STORY_SKELETONS, 0, symEmit(B1)));
  items.push(...cycle(17, symB2, SYMBOL_STORY_SKELETONS, 1, symEmit(B2)));
  items.push(...cycle(17, symB3, SYMBOL_STORY_SKELETONS, 2, symEmit(B3)));

  const claimEmit = (band) => ([a, b], sk, n1, n2, noun) =>
    mk("symbolSelection", "storyMoreClaimJudge", band, {
      answer: a > b ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { promptText: sk(n1, noun, a, b), truth: a > b },
    });
  const claimB1 = [[8, 5], [4, 9], [10, 7], [3, 8], [6, 2], [9, 12], [12, 9], [5, 11], [15, 13], [11, 16], [18, 12], [7, 14], [13, 10], [16, 19], [20, 15], [2, 6], [17, 11]];
  const claimB2 = [[42, 24], [35, 53], [67, 27], [49, 94], [58, 55], [79, 82], [91, 19], [63, 66], [88, 84], [37, 73], [29, 92], [75, 71], [44, 47], [16, 61], [96, 69], [22, 25], [51, 45]];
  items.push(...cycle(17, claimB1, CLAIM_JUDGE_SKELETONS, 0, claimEmit(B1)));
  items.push(...cycle(17, claimB2, CLAIM_JUDGE_SKELETONS, 1, claimEmit(B2)));

  const wroteEmit = (band) => ([a, s, b], sk, n1) =>
    mk("symbolSelection", "storyWroteSign", band, {
      answer: sym(a, b) === s ? "Yes" : "No",
      choices: ["Yes", "No"],
      subPrompt: undefined,
      display: { promptText: sk(n1, a, s, b), truth: sym(a, b) === s },
    });
  // skelPair picks which two skeletons a call uses; nameOffset keeps the
  // (name, skeleton) buckets across calls at <= 2 shared items (cap 3).
  const cycleSign = (space, band, skelPair, nameOffset) => {
    for (let i = 0; i < 17; i += 1) {
      const sk = WROTE_SIGN_SKELETONS[skelPair * 2 + (i % 2)];
      items.push(wroteEmit(band)(space[i % space.length], sk, nameAt(i + nameOffset)));
    }
  };
  cycleSign([[7, ">", 4], [3, ">", 9], [5, "=", 5], [8, "<", 6], [12, "<", 15], [10, ">", 4], [6, "=", 9], [14, "<", 18], [9, ">", 9], [11, "<", 15], [7, "=", 7], [16, "<", 13], [6, ">", 2], [13, "=", 18], [5, "<", 10], [18, ">", 18], [12, "<", 14]], B1, 0, 0);
  cycleSign([[24, "<", 42], [53, ">", 35], [67, "<", 27], [49, "<", 94], [58, ">", 55], [79, ">", 82], [91, ">", 19], [63, "=", 66], [88, ">", 84], [37, ">", 73], [29, "<", 92], [75, ">", 71], [44, "<", 47], [61, ">", 16], [96, ">", 69], [25, "=", 25], [51, "<", 45]], B2, 1, 0);
  cycleSign([[98, "<", 102], [302, "<", 203], [415, "=", 415], [199, ">", 200], [560, ">", 506], [321, ">", 312], [644, "<", 646], [105, "<", 95], [780, ">", 78], [432, "<", 423], [999, "<", 1000], [217, "=", 217], [853, ">", 858], [364, "<", 436], [508, ">", 580], [129, "<", 192], [925, "=", 925]], B3, 0, 10);
  cycleSign([[846, "<", 864], [152, ">", 125], [479, "<", 497], [368, ">", 386], [700, "=", 700], [214, "<", 241], [583, ">", 538], [190, ">", 109], [455, "<", 545], [312, "<", 321], [640, ">", 604], [235, "<", 253], [871, ">", 817], [409, "<", 490], [128, "<", 182], [667, "=", 667], [356, "<", 365]], B3, 1, 10);

  return items;
}
