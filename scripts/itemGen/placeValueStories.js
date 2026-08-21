/* Application (story) items for the placeValue bank.
 *
 * Situations from the G1-M4/G2-M3 surveys: straw bundles and loose ones,
 * sticker sheets of ten, block rods, trading ten ones for a ten, digit
 * meaning in house/page numbers, scoreboard expanded form. Band-1 prompts
 * stay <= 20 (teens only).
 *
 * Payloads ride op "count" + display.counting claims (groups/units/digit/
 * placeValueOf/moreLess/sum); judged = Yes/No + display.truth. Names and
 * contexts rotate signatures (cap 3/sig).
 */

import { NAMES } from "./countingTemplates.js";

const nameAt = (i) => NAMES[(i * 3 + 1) % NAMES.length];

const mk = (subskill, structureType, band, question) => ({
  modeId: "placeValue",
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
    items.push(emit(space[i % space.length], skeletons[(i + offset) % skeletons.length], nameAt(i + offset), i));
  }
  return items;
}

/* Bundle-of-ten contexts (distinct from counting's bags and numberBonds'
 * strings): straws in bundles, blocks in rods, beads on full wires. */
const BUNDLE_CONTEXTS = [
  { unit: "straws", pack: "bundle", packs: "bundles" },
  { unit: "blocks", pack: "rod", packs: "rods" },
  { unit: "beads", pack: "full wire", packs: "full wires" },
  { unit: "stickers", pack: "sheet", packs: "sheets" },
];

const packWord = (ctx, n) => (n === 1 ? ctx.pack : ctx.packs);

const BUNDLE_SKELETONS = [
  (nm, ctx, t, o) =>
    `${nm} has ${t} ${packWord(ctx, t)} of ten ${ctx.unit} and ${o} loose ${ctx.unit}. What number of ${ctx.unit} is that?`,
  (nm, ctx, t, o) =>
    `On ${nm}'s desk sit ${t} ${packWord(ctx, t)} of ten ${ctx.unit}, plus ${o} single ${ctx.unit}. How many ${ctx.unit} in all?`,
];

const TEN_MORE_SKELETONS = [
  (nm, ctx, n, d) =>
    d > 0
      ? `${nm} has ${n} ${ctx.unit} and gets one more ${ctx.pack} of ten. How many ${ctx.unit} now?`
      : `${nm} has ${n} ${ctx.unit} and gives away one ${ctx.pack} of ten. How many ${ctx.unit} are left?`,
  (nm, ctx, n, d) =>
    d > 0
      ? `A friend hands ${nm} a ${ctx.pack} of ten ${ctx.unit}. ${nm} had ${n}. What is the new count of ${ctx.unit}?`
      : `${nm} lends a ${ctx.pack} of ten ${ctx.unit} from a pile of ${n}. How many ${ctx.unit} stay?`,
];

const DIGIT_STORY_SKELETONS = [
  (nm, n, word) =>
    `${nm} lives at number ${n}. Which digit is in the ${word} place of ${n}?`,
  (nm, n, word) =>
    `Page ${n} is ${nm}'s favorite. Which digit sits in the ${word} place of ${n}?`,
];

const WORTH_STORY_SKELETONS = [
  (nm, n, word) =>
    `${nm}'s locker number is ${n}. How much is the ${word} digit of ${n} worth?`,
  (nm, n, word) =>
    `Ticket ${n} wins! What is the value of the ${word} digit in ${n}? ${nm} checks.`,
];

const SCOREBOARD_SKELETONS = [
  (nm, parts) =>
    `${nm}'s game shows the score as ${parts}. What is the total score?`,
  (nm, parts) =>
    `The board lists ${nm}'s points as ${parts}. How many points is that in all?`,
];

const TRADE_SKELETONS = [
  (nm, ctx, ones) =>
    `${nm} holds ${ones} loose ${ctx.unit} and trades every ten for a ${ctx.pack}. How many ${ctx.packs} does ${nm} make?`,
  (nm, ctx, ones) =>
    `At the trading table, ${nm} swaps each ten of ${ones} ${ctx.unit} for one ${ctx.pack}. How many ${ctx.packs} is that?`,
];

const LEFTOVER_SKELETONS = [
  (nm, ctx, ones) =>
    `${nm} bundles ${ones} ${ctx.unit} into ${ctx.packs} of ten. After bundling, how many loose ${ctx.unit} remain?`,
  (nm, ctx, ones) =>
    `${nm} fills ${ctx.packs} of ten from ${ones} ${ctx.unit}. How many ${ctx.unit} do not fit in a full ${ctx.pack}?`,
];

const NONCANON_STORY_SKELETONS = [
  (nm, ctx, t, o) =>
    `${nm} has ${t} ${ctx.packs} of ten ${ctx.unit} and ${o} loose ${ctx.unit} — more than ten loose! What total number of ${ctx.unit} is that?`,
  (nm, ctx, t, o) =>
    `${nm} counts ${t} ${ctx.packs} of ten plus ${o} single ${ctx.unit}. How many ${ctx.unit} altogether?`,
];

export function buildStoryItems() {
  const items = [];

  /* ----- tensOnes application -------------------------------------- */
  const bEmit = (band) => ([t, o, ci], sk, nm) => {
    const ctx = BUNDLE_CONTEXTS[ci % BUNDLE_CONTEXTS.length];
    return mk("tensOnes", "storyBundlesAndLoose", band, {
      answer: t * 10 + o,
      answerType: "numberPad",
      display: { counting: { kind: "groups", tens: t, ones: o }, promptText: sk(nm, ctx, t, o) },
    });
  };
  const bB1 = [[1, 3, 0], [1, 7, 1], [1, 5, 2], [1, 2, 3], [1, 8, 0], [1, 4, 1], [1, 9, 2], [1, 6, 3], [1, 1, 0], [1, 3, 1], [1, 7, 2], [1, 5, 3], [1, 2, 0], [1, 8, 1], [1, 4, 2], [1, 9, 3], [1, 6, 0]];
  const bB2 = [[2, 5, 0], [3, 8, 1], [4, 1, 2], [5, 6, 3], [6, 3, 0], [7, 9, 1], [8, 2, 2], [9, 7, 3], [2, 8, 0], [3, 1, 1], [4, 6, 2], [5, 9, 3], [6, 2, 0], [7, 4, 1], [8, 5, 2], [9, 3, 3], [2, 6, 0]];
  items.push(...cycle(17, bB1, BUNDLE_SKELETONS, 0, bEmit(B1)));
  items.push(...cycle(17, bB2, BUNDLE_SKELETONS, 1, bEmit(B2)));

  const tmEmit = (band) => ([n, d, ci], sk, nm) => {
    const ctx = BUNDLE_CONTEXTS[ci % BUNDLE_CONTEXTS.length];
    return mk("tensOnes", "storyTenMoreLess", band, {
      answer: n + d,
      answerType: "numberPad",
      display: { counting: { kind: "moreLess", n, delta: d }, promptText: sk(nm, ctx, n, d) },
    });
  };
  const tmB1 = [[7, 10, 0], [15, -10, 1], [4, 10, 2], [18, -10, 3], [9, 10, 0], [12, -10, 1], [6, 10, 2], [16, -10, 3], [3, 10, 0], [14, -10, 1], [8, 10, 2], [19, -10, 3], [5, 10, 0], [11, -10, 1], [2, 10, 2], [17, -10, 3], [10, 10, 0]];
  const tmB2 = [[47, 10, 0], [83, -10, 1], [29, 10, 2], [65, -10, 3], [38, 10, 0], [74, -10, 1], [56, 10, 2], [88, -10, 3], [23, 10, 0], [61, -10, 1], [35, 10, 2], [92, -10, 3], [49, 10, 0], [77, -10, 1], [51, 10, 2], [66, -10, 3], [44, 10, 0]];
  items.push(...cycle(17, tmB1, TEN_MORE_SKELETONS, 0, tmEmit(B1)));
  items.push(...cycle(17, tmB2, TEN_MORE_SKELETONS, 1, tmEmit(B2)));

  const dEmit = (band) => ([n, place], sk, nm) => {
    const word = place === 100 ? "hundreds" : place === 10 ? "tens" : "ones";
    return mk("tensOnes", "storyDigitOf", band, {
      answer: Math.floor(n / place) % 10,
      answerType: "numberPad",
      display: { counting: { kind: "digit", n, place }, promptText: sk(nm, n, word) },
    });
  };
  const dB3 = [[347, 100], [582, 10], [816, 1], [493, 100], [265, 10], [739, 1], [904, 100], [670, 10], [128, 1], [356, 100], [741, 10], [869, 1], [235, 100], [517, 10], [682, 1], [951, 100], [408, 10]];
  items.push(...cycle(17, dB3, DIGIT_STORY_SKELETONS, 0, dEmit(B3)));
  const wB3 = [[347, 10], [582, 100], [816, 10], [493, 1], [265, 100], [739, 10], [904, 100], [670, 10], [128, 100], [356, 10], [741, 100], [869, 10], [235, 1], [517, 100], [682, 10], [951, 100], [408, 1]];
  const wEmit = (band) => ([n, place], sk, nm) => {
    const word = place === 100 ? "hundreds" : place === 10 ? "tens" : "ones";
    return mk("tensOnes", "storyDigitWorth", band, {
      answer: (Math.floor(n / place) % 10) * place,
      answerType: "numberPad",
      display: { counting: { kind: "placeValueOf", n, place }, promptText: sk(nm, n, word) },
    });
  };
  items.push(...cycle(17, wB3, WORTH_STORY_SKELETONS, 1, wEmit(B3)));

  /* ----- expandedForm application ---------------------------------- */
  const sbEmit = (band) => (parts, sk, nm) =>
    mk("expandedForm", "storyScoreboard", band, {
      answer: parts.reduce((s, x) => s + x, 0),
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts }, promptText: sk(nm, parts.join(" + ")) },
    });
  const sbB1 = [[10, 3], [10, 7], [10, 5], [10, 2], [10, 8], [10, 4], [10, 9], [10, 6], [10, 1], [10, 3], [10, 7], [10, 5], [10, 8], [10, 2], [10, 4], [10, 6], [10, 9]];
  const sbB2 = [[20, 5], [30, 8], [40, 1], [50, 6], [60, 3], [70, 9], [80, 2], [90, 7], [20, 8], [30, 1], [40, 6], [50, 9], [60, 2], [70, 4], [80, 5], [90, 3], [20, 6]];
  const sbB3 = [[300, 40, 7], [500, 80, 2], [800, 10, 6], [400, 90, 3], [200, 60, 5], [700, 30, 9], [900, 4], [600, 70], [100, 20, 8], [300, 50, 6], [700, 40, 1], [800, 60, 9], [200, 30, 5], [500, 10, 7], [600, 80, 2], [900, 50, 1], [400, 8]];
  items.push(...cycle(17, sbB1, SCOREBOARD_SKELETONS, 0, sbEmit(B1)));
  items.push(...cycle(17, sbB2, SCOREBOARD_SKELETONS, 1, sbEmit(B2)));
  items.push(...cycle(17, sbB3, SCOREBOARD_SKELETONS, 0, sbEmit(B3)));

  // Poster split: which part shows the tens (typed value; claim-checked).
  const POSTER_SKELETONS = [
    (nm, n) => `${nm} writes ${n} on a poster as tens plus ones. Which number shows the tens part?`,
    (nm, n) => `${nm} breaks ${n} into tens and ones for the banner. What is the tens part?`,
  ];
  const pEmit = (band) => (n, sk, nm) =>
    mk("expandedForm", "storyTensPart", band, {
      answer: Math.floor(n / 10) * 10,
      answerType: "numberPad",
      display: { counting: { kind: "placeValueOf", n, place: 10 }, promptText: sk(nm, n) },
    });
  const pB1 = [13, 17, 12, 19, 14, 16, 18, 15, 11, 13, 17, 12, 19, 16, 14, 18, 15];
  const pB2 = [25, 38, 41, 56, 63, 79, 82, 97, 24, 33, 49, 51, 68, 72, 86, 94, 47];
  items.push(...cycle(17, pB1, POSTER_SKELETONS, 0, pEmit(B1)));
  items.push(...cycle(17, pB2, POSTER_SKELETONS, 1, pEmit(B2)));

  // Word-form stories (band 1: teen words in context).
  const WORDS = { 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen", 20: "twenty" };
  const WORD_SKELETONS = [
    (nm, w) => `The sign says "${w}" balloons. ${nm} writes it as a number. Which number does ${nm} write?`,
    (nm, w) => `${nm} hears "${w}" in the story and writes the numeral. What does ${nm} write?`,
  ];
  const wfEmit = (band) => (n, sk, nm) =>
    mk("expandedForm", "storyWordForm", band, {
      answer: n,
      answerType: "numberPad",
      display: { promptText: sk(nm, WORDS[n]) },
    });
  const wfB1 = [13, 17, 12, 19, 14, 16, 18, 15, 11, 20, 13, 17, 12, 19, 16, 14, 18];
  items.push(...cycle(17, wfB1, WORD_SKELETONS, 0, wfEmit(B1)));

  // Expanded pick in context (band 3 choice).
  const PICK_SKELETONS = [
    (nm, n) => `${nm} labels a box of ${n} beads with its expanded form. Which label is right?`,
    (nm, n) => `The librarian asks ${nm} for ${n} in expanded form. Which is it?`,
  ];
  const pkEmit = (band) => (n, sk, nm, i) => {
    const h = Math.floor(n / 100);
    const t = Math.floor(n / 10) % 10;
    const o = n % 10;
    const correct = `${h * 100} + ${t * 10} + ${o}`;
    const wrong1 = `${h * 100} + ${t} + ${o}`;
    const wrong2 = `${h} + ${t} + ${o}`;
    const wrong3 = `${o * 100} + ${t * 10} + ${h}`;
    return mk("expandedForm", "storyPickExpansion", band, {
      answer: correct,
      choices: [correct, wrong1, wrong2, wrong3].filter((v, ix, arr) => arr.indexOf(v) === ix),
      display: { promptText: sk(nm, n) },
    });
  };
  const pkB3 = [347, 582, 816, 493, 265, 739, 128, 356, 741, 869, 235, 517, 682, 951, 163, 428, 594];
  items.push(...cycle(17, pkB3, PICK_SKELETONS, 0, pkEmit(B3)));

  /* ----- regroupingSense application ------------------------------- */
  const trEmit = (band) => ([ones, ci], sk, nm) => {
    const ctx = BUNDLE_CONTEXTS[ci % BUNDLE_CONTEXTS.length];
    return mk("regroupingSense", "storyTrades", band, {
      answer: Math.floor(ones / 10),
      answerType: "numberPad",
      display: { counting: { kind: "digit", n: ones, place: 10 }, promptText: sk(nm, ctx, ones) },
    });
  };
  const trB1 = [[12, 0], [17, 1], [14, 2], [19, 3], [11, 0], [16, 1], [13, 2], [18, 3], [15, 0], [20, 1], [12, 2], [17, 3], [14, 0], [19, 1], [16, 2], [11, 3], [13, 0]];
  const trB2 = [[34, 0], [47, 1], [52, 2], [68, 3], [73, 0], [86, 1], [91, 2], [45, 3], [57, 0], [62, 1], [78, 2], [83, 3], [96, 0], [39, 1], [54, 2], [66, 3], [71, 0]];
  items.push(...cycle(17, trB1, TRADE_SKELETONS, 0, trEmit(B1)));
  items.push(...cycle(17, trB2, TRADE_SKELETONS, 1, trEmit(B2)));

  const loEmit = (band) => ([ones, ci], sk, nm) => {
    const ctx = BUNDLE_CONTEXTS[ci % BUNDLE_CONTEXTS.length];
    return mk("regroupingSense", "storyLeftovers", band, {
      answer: ones % 10,
      answerType: "numberPad",
      display: { counting: { kind: "digit", n: ones, place: 1 }, promptText: sk(nm, ctx, ones) },
    });
  };
  items.push(...cycle(17, trB1, LEFTOVER_SKELETONS, 1, loEmit(B1)));
  items.push(...cycle(17, trB2, LEFTOVER_SKELETONS, 0, loEmit(B2)));

  const ncEmit = (band) => ([t, o, ci], sk, nm) => {
    const ctx = BUNDLE_CONTEXTS[ci % BUNDLE_CONTEXTS.length];
    return mk("regroupingSense", "storyNonCanonical", band, {
      answer: t * 10 + o,
      answerType: "numberPad",
      display: { counting: { kind: "groups", tens: t, ones: o }, promptText: sk(nm, ctx, t, o) },
    });
  };
  const ncB3 = [[21, 14, 0], [32, 12, 1], [14, 16, 2], [43, 13, 3], [25, 17, 0], [51, 11, 1], [36, 15, 2], [12, 19, 3], [47, 18, 0], [63, 12, 1], [28, 11, 2], [55, 14, 3], [31, 17, 0], [72, 13, 1], [16, 15, 2], [64, 16, 3], [41, 12, 0]];
  items.push(...cycle(17, ncB3, NONCANON_STORY_SKELETONS, 0, ncEmit(B3)));

  // Top-ups: digit stories at bands 1-2, hundreds crates, big trades,
  // two-digit expansion picks, hundreds banner parts.
  const dB1 = [[14, 10], [17, 1], [12, 10], [19, 1], [13, 10], [16, 1], [18, 10], [15, 1], [11, 10], [14, 1], [17, 10], [12, 1], [19, 10], [16, 10], [13, 1], [18, 1], [15, 10]];
  items.push(...cycle(17, dB1, DIGIT_STORY_SKELETONS, 1, dEmit(B1)));
  const dB2 = [[47, 10], [83, 1], [29, 10], [65, 1], [38, 10], [74, 1], [56, 10], [91, 1], [23, 10], [88, 1], [35, 10], [62, 1], [49, 10], [77, 1], [51, 10], [96, 1], [44, 10]];
  items.push(...cycle(17, dB2, DIGIT_STORY_SKELETONS, 0, dEmit(B2)));

  const u = (n, w) => `${n} ${n === 1 ? w : w.endsWith("x") ? `${w}es` : `${w}s`}`;
  const CRATE_SKELETONS = [
    (nm, h, t, o) => `${nm} loads ${u(h, "crate")} of one hundred oranges, ${u(t, "box")} of ten, and ${o} loose oranges. How many oranges in all?`,
    (nm, h, t, o) => `The store gives ${nm} ${u(h, "hundred-pack")}, ${u(t, "ten-pack")}, and ${o} single oranges. What is the total number of oranges?`,
  ];
  const crEmit = (band) => ([h, t, o], sk, nm) =>
    mk("tensOnes", "storyCrates", band, {
      answer: h * 100 + t * 10 + o,
      answerType: "numberPad",
      display: { counting: { kind: "units", hundreds: h, tens: t, ones: o }, promptText: sk(nm, h, t, o) },
    });
  const crB3 = [[3, 4, 7], [5, 8, 2], [8, 1, 6], [4, 9, 3], [2, 6, 5], [7, 3, 9], [9, 0, 4], [6, 7, 0], [1, 2, 8], [3, 5, 6], [7, 4, 1], [8, 6, 9], [2, 3, 5], [5, 1, 7], [6, 8, 2], [9, 5, 1], [4, 0, 8]];
  items.push(...cycle(17, crB3, CRATE_SKELETONS, 0, crEmit(B3)));

  const pk2Emit = (band) => (n, sk, nm) => {
    const t = Math.floor(n / 10);
    const o = n % 10;
    const correct = `${t * 10} + ${o}`;
    const wrong1 = `${t} + ${o}`;
    const wrong2 = `${o * 10} + ${t}`;
    const wrong3 = `${(t + 1) * 10} + ${o}`;
    return mk("expandedForm", "storyPickExpansionMid", band, {
      answer: correct,
      choices: [correct, wrong1, wrong2, wrong3].filter((v, ix, arr) => arr.indexOf(v) === ix),
      display: { promptText: sk(nm, n) },
    });
  };
  const pkB2 = [25, 38, 41, 56, 63, 79, 82, 97, 24, 33, 49, 51, 68, 72, 86, 94, 47];
  items.push(...cycle(17, pkB2, PICK_SKELETONS, 1, pk2Emit(B2)));

  const BANNER_SKELETONS = [
    (nm, n) => `${nm} paints ${n} on a banner as hundreds, tens, and ones. What is the hundreds part?`,
    (nm, n) => `${nm} splits ${n} by place for the sign. Which number is the hundreds part?`,
  ];
  const bnEmit = (band) => (n, sk, nm) =>
    mk("expandedForm", "storyHundredsPart", band, {
      answer: Math.floor(n / 100) * 100,
      answerType: "numberPad",
      display: { counting: { kind: "placeValueOf", n, place: 100 }, promptText: sk(nm, n) },
    });
  const bnB3 = [347, 582, 816, 493, 265, 739, 128, 356, 741, 869, 235, 517, 682, 951, 163, 428, 594];
  items.push(...cycle(17, bnB3, BANNER_SKELETONS, 0, bnEmit(B3)));

  const TRADE_BIG_SKELETONS = [
    (nm, ctx, ones) => `${nm} turns ${ones} single ${ctx.unit} into ${ctx.packs} of ten. How many full ${ctx.packs} does ${nm} end up with?`,
    (nm, ctx, ones) => `The bin holds ${ones} loose ${ctx.unit}. ${nm} packs them ten to a ${ctx.pack}. How many full ${ctx.packs} is that?`,
  ];
  const tbEmit = (band) => ([ones, ci], sk, nm) => {
    const ctx = BUNDLE_CONTEXTS[ci % BUNDLE_CONTEXTS.length];
    return mk("regroupingSense", "storyTradesBig", band, {
      answer: Math.floor(ones / 10),
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: 0, target: Math.floor(ones / 10) }, promptText: sk(nm, ctx, ones) },
    });
  };
  const tbB3 = [[134, 0], [217, 1], [352, 2], [468, 3], [523, 0], [671, 1], [745, 2], [816, 3], [189, 0], [293, 1], [376, 2], [451, 3], [548, 0], [637, 1], [782, 2], [864, 3], [925, 0]];
  items.push(...cycle(17, tbB3, TRADE_BIG_SKELETONS, 0, tbEmit(B3)));

  const loBigEmit = (band) => ([ones, ci], sk, nm) => {
    const ctx = BUNDLE_CONTEXTS[ci % BUNDLE_CONTEXTS.length];
    return mk("regroupingSense", "storyLeftoversBig", band, {
      answer: ones % 10,
      answerType: "numberPad",
      display: { counting: { kind: "digit", n: ones, place: 1 }, promptText: sk(nm, ctx, ones) },
    });
  };
  items.push(...cycle(17, tbB3, LEFTOVER_SKELETONS, 1, loBigEmit(B3)));

  // Regrouping: how many more to the next full bundle (+17 at bands 1-2).
  const NEXT_BUNDLE_SKELETONS = [
    (nm, ctx, n, target) => `${nm} has ${n} ${ctx.unit} and wants full ${ctx.packs} only. How many more ${ctx.unit} until the next full ${ctx.pack} at ${target}?`,
    (nm, ctx, n, target) => `${nm}'s pile holds ${n} ${ctx.unit}. How many more ${ctx.unit} make the next full ${ctx.pack} of ${target}?`,
  ];
  const nbEmit = (band) => ([n, ci], sk, nm) => {
    const ctx = BUNDLE_CONTEXTS[ci % BUNDLE_CONTEXTS.length];
    const target = Math.ceil(n / 10) * 10;
    return mk("regroupingSense", "storyNextBundle", band, {
      answer: target - n,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: n, target }, promptText: sk(nm, ctx, n, target) },
    });
  };
  const nbB1 = [[12, 0], [17, 1], [14, 2], [19, 3], [11, 0], [16, 1], [13, 2], [18, 3], [15, 0], [12, 1], [17, 2], [14, 3], [19, 0], [16, 2], [11, 3], [13, 0], [18, 1]];
  const nbB2 = [[34, 0], [47, 1], [52, 2], [68, 3], [73, 0], [86, 1], [91, 2], [45, 3], [57, 0], [62, 1], [78, 2], [83, 3], [96, 0], [39, 1], [54, 2], [66, 3], [71, 0]];
  items.push(...cycle(17, nbB1, NEXT_BUNDLE_SKELETONS, 0, nbEmit(B1)));
  items.push(...cycle(17, nbB2, NEXT_BUNDLE_SKELETONS, 1, nbEmit(B2)));

  return items;
}
