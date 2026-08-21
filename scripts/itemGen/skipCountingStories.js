/* Application (story) items for the skipCounting bank.
 *
 * Situations from the EngageNY G2-M6/G3-M1 survey: equal groups in the
 * world (wheels, legs, hands, coin values, packs, rows), step inference
 * from a real pattern (per-week savings, floors between stops), and
 * count-total predictions. Stories always ask a REAL quantity, never "what
 * comes next in the pattern" (drills are drills).
 *
 * Payloads ride op "count" + display.counting claims (sum/countOn); judged
 * items carry display.truth. Names+nouns rotate signatures (cap 3/sig).
 */

import { NAMES } from "./countingTemplates.js";

const nameAt = (i) => NAMES[(i * 3 + 1) % NAMES.length];

const mk = (subskill, structureType, band, question) => ({
  modeId: "skipCounting",
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

/* Grouped-object contexts keyed by step size. */
const STEP_CONTEXTS = {
  2: [
    { unit: "wheels", holder: "bike", holders: "bikes" },
    { unit: "socks", holder: "pair", holders: "pairs" },
    { unit: "mittens", holder: "pair", holders: "pairs" },
  ],
  5: [
    { unit: "fingers", holder: "hand", holders: "hands" },
    { unit: "cents", holder: "nickel", holders: "nickels" },
    { unit: "petals", holder: "flower", holders: "flowers" },
  ],
  10: [
    { unit: "cents", holder: "dime", holders: "dimes" },
    { unit: "crayons", holder: "box", holders: "boxes" },
    { unit: "beads", holder: "string", holders: "strings" },
  ],
  3: [
    { unit: "wheels", holder: "tricycle", holders: "tricycles" },
    { unit: "leaves", holder: "clover", holders: "clovers" },
  ],
  4: [
    { unit: "legs", holder: "dog", holders: "dogs" },
    { unit: "wheels", holder: "wagon", holders: "wagons" },
  ],
  6: [
    { unit: "legs", holder: "ant", holders: "ants" },
    { unit: "eggs", holder: "half-carton", holders: "half-cartons" },
  ],
  25: [{ unit: "cents", holder: "quarter", holders: "quarters" }],
  50: [{ unit: "cents", holder: "half-dollar", holders: "half-dollars" }],
  100: [{ unit: "cents", holder: "dollar coin", holders: "dollar coins" }],
};

const GROUP_SKELETONS = [
  (nm, ctx, g, s) =>
    `${nm} lines up ${g} ${ctx.holders}. Each ${ctx.holder} has ${s} ${ctx.unit}. Skip counting, how many ${ctx.unit} in all?`,
  (nm, ctx, g, s) =>
    `Each ${ctx.holder} brings ${s} ${ctx.unit}. ${nm} counts by ${s}s over ${g} ${ctx.holders}. How many ${ctx.unit} is that?`,
  (nm, ctx, g, s) =>
    `${nm} sees ${g} ${ctx.holders} with ${s} ${ctx.unit} each. How many ${ctx.unit} does ${nm} count altogether?`,
];

const STEP_STORY_SKELETONS = [
  (nm, noun, run) =>
    `${nm} saves the same amount each week. The totals go ${run}. How many ${noun} does ${nm} add each week?`,
  (nm, noun, run) =>
    `${nm} stacks ${noun} in equal layers. After each layer the pile shows ${run}. How many ${noun} are in one layer?`,
];

const LANDING_SKELETONS = [
  (nm, ctx, g, s) =>
    `${nm} drops ${ctx.holders} into a jar one at a time — ${s} ${ctx.unit} each — and says the total after each. After ${g} ${ctx.holders}, what total does ${nm} say?`,
  (nm, ctx, g, s) =>
    `${nm} counts the ${ctx.unit} of ${g} ${ctx.holders}, ${s} at a time. What is the last number ${nm} says?`,
];

const CLAIM_SKELETONS = [
  (nm, ctx, g, s, t) =>
    `${nm} says ${g} ${ctx.holders} with ${s} ${ctx.unit} each make ${t} ${ctx.unit}. Is ${nm} right?`,
  (nm, ctx, g, s, t) =>
    `${nm} skip counts the ${ctx.unit} on ${g} ${ctx.holders} and gets ${t}. Is that right?`,
];

export function buildStoryItems() {
  const items = [];

  /* ----- groupsToProduct application ------------------------------- */
  const gEmit = (band) => ([s, g, ci], sk, nm) => {
    const ctx = STEP_CONTEXTS[s][ci % STEP_CONTEXTS[s].length];
    return mk("groupsToProduct", "storyEqualGroups", band, {
      answer: s * g,
      answerType: "numberPad",
      display: {
        counting: { kind: "sum", parts: Array.from({ length: g }, () => s) },
        promptText: sk(nm, ctx, g, s),
      },
    });
  };
  const gB1 = [[2, 3, 0], [5, 2, 0], [10, 2, 0], [2, 4, 1], [5, 3, 1], [2, 5, 2], [5, 4, 2], [10, 2, 1], [2, 6, 0], [2, 2, 1], [5, 2, 2], [10, 2, 2], [2, 7, 2], [5, 3, 0], [2, 8, 0], [5, 4, 1], [2, 9, 1]];
  const gB2 = [[3, 3, 0], [4, 3, 0], [3, 4, 1], [4, 4, 1], [5, 6, 0], [10, 4, 1], [3, 5, 0], [4, 5, 0], [10, 5, 2], [5, 7, 1], [3, 6, 1], [4, 6, 1], [10, 6, 0], [5, 8, 2], [3, 7, 0], [4, 7, 0], [10, 7, 1]];
  const gB3 = [[6, 4, 0], [25, 4, 0], [6, 5, 1], [25, 3, 0], [100, 4, 0], [6, 6, 0], [25, 5, 0], [100, 3, 0], [6, 7, 1], [25, 6, 0], [100, 5, 0], [6, 8, 0], [25, 7, 0], [100, 6, 0], [6, 9, 1], [25, 8, 0], [100, 7, 0]];
  items.push(...cycle(17, gB1, GROUP_SKELETONS, 0, gEmit(B1)));
  items.push(...cycle(17, gB2, GROUP_SKELETONS, 1, gEmit(B2)));
  items.push(...cycle(17, gB3, GROUP_SKELETONS, 2, gEmit(B3)));

  const lEmit = (band) => ([s, g, ci], sk, nm) => {
    const ctx = STEP_CONTEXTS[s][ci % STEP_CONTEXTS[s].length];
    return mk("groupsToProduct", "storyLastCount", band, {
      answer: s * g,
      answerType: "numberPad",
      display: {
        counting: { kind: "sum", parts: Array.from({ length: g }, () => s) },
        promptText: sk(nm, ctx, g, s),
      },
    });
  };
  items.push(...cycle(17, gB1, LANDING_SKELETONS, 0, lEmit(B1)));
  items.push(...cycle(17, gB2, LANDING_SKELETONS, 1, lEmit(B2)));
  items.push(...cycle(17, gB3, LANDING_SKELETONS, 0, lEmit(B3)));

  const cEmit = (band) => ([s, g, ci, ok], sk, nm) => {
    const ctx = STEP_CONTEXTS[s][ci % STEP_CONTEXTS[s].length];
    const t = ok ? s * g : s * g + s;
    return mk("groupsToProduct", "storyGroupsClaim", band, {
      answer: ok ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { promptText: sk(nm, ctx, g, s, t), truth: ok },
    });
  };
  const cB1 = [[2, 3, 0, true], [5, 2, 0, false], [10, 2, 0, true], [2, 4, 1, false], [5, 3, 1, true], [2, 5, 2, false], [5, 4, 2, true], [2, 8, 1, false], [2, 6, 0, true], [2, 2, 1, false], [5, 2, 2, true], [2, 7, 2, false], [2, 7, 2, true], [5, 3, 0, false], [2, 8, 0, true], [2, 6, 1, false], [2, 9, 1, true]];
  const cB2 = [[3, 3, 0, true], [4, 3, 0, false], [3, 4, 1, true], [4, 4, 1, false], [5, 6, 0, true], [10, 4, 1, false], [3, 5, 0, true], [4, 5, 0, false], [10, 5, 2, true], [5, 7, 1, false], [3, 6, 1, true], [4, 6, 1, false], [10, 6, 0, true], [5, 8, 2, false], [3, 7, 0, true], [4, 7, 0, false], [10, 7, 1, true]];
  items.push(...cycle(17, cB1, CLAIM_SKELETONS, 0, cEmit(B1)));
  items.push(...cycle(17, cB2, CLAIM_SKELETONS, 1, cEmit(B2)));

  /* ----- stepInference application --------------------------------- */
  const NOUN_UNITS = ["pennies", "shells", "stickers", "blocks", "pages", "beads", "cards", "stars"];
  const sEmit = (band) => ([start, step, terms], sk, nm, i) => {
    const runArr = Array.from({ length: terms }, (_, k) => start + step * (k + 1));
    return mk("stepInference", "storyFindStep", band, {
      answer: step,
      answerType: "numberPad",
      display: {
        counting: { kind: "hidden", total: runArr[1], seen: runArr[0] },
        promptText: sk(nm, NOUN_UNITS[i % NOUN_UNITS.length], runArr.join(", "), step),
      },
    });
  };
  const sB1 = [[0, 2, 3], [0, 5, 3], [0, 10, 2], [0, 2, 4], [0, 5, 4], [10, 5, 2], [2, 2, 3], [5, 5, 3], [4, 2, 4], [0, 5, 2], [0, 10, 2], [6, 2, 3], [4, 2, 3], [8, 2, 3], [0, 2, 5], [2, 2, 4], [6, 2, 4]];
  const sB2 = [[0, 3, 3], [0, 4, 3], [0, 3, 4], [0, 4, 4], [3, 3, 3], [4, 4, 3], [0, 3, 3], [0, 4, 4], [6, 3, 3], [8, 4, 3], [0, 3, 4], [0, 4, 3], [9, 3, 3], [12, 4, 3], [0, 3, 3], [0, 4, 4], [12, 3, 3]];
  const sB3 = [[0, 6, 3], [0, 25, 3], [0, 50, 3], [0, 100, 3], [0, 6, 4], [0, 25, 4], [0, 50, 4], [0, 100, 4], [6, 6, 3], [25, 25, 3], [50, 50, 3], [100, 100, 3], [0, 6, 3], [0, 25, 3], [0, 50, 4], [0, 100, 3], [12, 6, 3]];
  items.push(...cycle(17, sB1, STEP_STORY_SKELETONS, 0, sEmit(B1)));
  items.push(...cycle(17, sB2, STEP_STORY_SKELETONS, 1, sEmit(B2)));
  items.push(...cycle(17, sB3, STEP_STORY_SKELETONS, 0, sEmit(B3)));

  // How many jumps to the target (count the hops, G1-M6/G2-M3 pattern).
  const JUMP_SKELETONS = [
    (nm, noun, start, target, step) =>
      `${nm} starts at ${start} ${noun} and adds ${step} ${noun} at a time until reaching ${target}. How many times does ${nm} add?`,
    (nm, noun, start, target, step) =>
      `A jar holds ${start} ${noun}. ${nm} drops in ${step} ${noun} per scoop until it holds ${target}. How many scoops is that?`,
  ];
  const jEmit = (band) => ([start, step, jumps], sk, nm, i) =>
    mk("stepInference", "storyCountJumps", band, {
      answer: jumps,
      answerType: "numberPad",
      display: {
        counting: { kind: "gap", have: 0, target: jumps },
        promptText: sk(nm, NOUN_UNITS[(i + 3) % NOUN_UNITS.length], start, start + step * jumps, step),
      },
    });
  const jB1 = [[0, 2, 3], [0, 5, 2], [0, 10, 2], [2, 2, 4], [5, 5, 3], [0, 2, 5], [0, 5, 4], [10, 10, 1], [4, 2, 3], [0, 10, 2], [0, 2, 6], [5, 5, 2], [6, 2, 4], [0, 5, 3], [10, 5, 2], [2, 2, 5], [0, 2, 7]];
  const jB2 = [[0, 3, 4], [0, 4, 3], [3, 3, 3], [4, 4, 4], [0, 3, 5], [0, 4, 5], [6, 3, 4], [8, 4, 3], [0, 3, 6], [0, 4, 6], [9, 3, 3], [12, 4, 4], [0, 3, 7], [0, 4, 7], [12, 3, 4], [16, 4, 3], [0, 3, 8]];
  const jB3 = [[0, 6, 4], [0, 25, 3], [0, 50, 4], [0, 100, 3], [6, 6, 3], [25, 25, 4], [50, 50, 3], [100, 100, 4], [0, 6, 5], [0, 25, 5], [0, 50, 5], [0, 100, 5], [12, 6, 4], [50, 25, 3], [100, 50, 4], [200, 100, 3], [0, 6, 6]];
  items.push(...cycle(17, jB1, JUMP_SKELETONS, 0, jEmit(B1)));
  items.push(...cycle(17, jB2, JUMP_SKELETONS, 1, jEmit(B2)));
  items.push(...cycle(17, jB3, JUMP_SKELETONS, 0, jEmit(B3)));

  /* ----- patternRule application ----------------------------------- */
  // Clock minutes, rows of seats, page numbers — the rule lives in the
  // world; the question asks a real quantity reached by the rule.
  const RULE_SKELETONS = [
    (nm, g, s) =>
      `The minute hand hops ${s} minutes at each mark. ${nm} watches it hop ${g} times from the top. How many minutes have passed?`,
    (nm, g, s) =>
      `Chairs come in rows of ${s}. ${nm} fills ${g} rows. Counting by ${s}s, how many chairs are filled?`,
    (nm, g, s) =>
      `${nm} climbs a staircase ${s} steps at a time and takes ${g} climbs. How many steps has ${nm} climbed?`,
  ];
  const rEmit = (band) => ([s, g], sk, nm) =>
    mk("patternRule", "storyRuleInWorld", band, {
      answer: s * g,
      answerType: "numberPad",
      display: {
        counting: { kind: "sum", parts: Array.from({ length: g }, () => s) },
        promptText: sk(nm, g, s),
      },
    });
  const rB1 = [[5, 2], [10, 2], [2, 4], [5, 3], [2, 5], [10, 2], [2, 3], [5, 4], [2, 6], [5, 2], [2, 7], [10, 2], [2, 8], [5, 3], [2, 9], [5, 4], [2, 10]];
  const rB2 = [[5, 6], [10, 4], [3, 4], [4, 4], [5, 7], [10, 5], [3, 5], [4, 5], [5, 8], [10, 6], [3, 6], [4, 6], [5, 9], [10, 7], [3, 7], [4, 7], [5, 10]];
  const rB3 = [[6, 4], [25, 4], [50, 4], [100, 4], [6, 5], [25, 5], [50, 5], [100, 5], [6, 6], [25, 6], [50, 6], [100, 6], [6, 7], [25, 7], [50, 7], [100, 7], [6, 8]];
  items.push(...cycle(17, rB1, RULE_SKELETONS, 0, rEmit(B1)));
  items.push(...cycle(17, rB2, RULE_SKELETONS, 1, rEmit(B2)));
  items.push(...cycle(17, rB3, RULE_SKELETONS, 2, rEmit(B3)));

  // Judged rule claims in context.
  const RULE_CLAIM_SKELETONS = [
    (nm, g, s, t) =>
      `${nm} says ${g} rows of ${s} seats hold ${t} seats when you count by ${s}s. Is ${nm} right?`,
    (nm, g, s, t) =>
      `${nm} counts ${g} hops of ${s} on the number path and lands on ${t}. Is that right?`,
  ];
  const rcEmit = (band) => ([s, g, ok], sk, nm) => {
    const t = ok ? s * g : s * g + s;
    return mk("patternRule", "storyRuleClaim", band, {
      answer: ok ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { promptText: sk(nm, g, s, t), truth: ok },
    });
  };
  const rcB1 = [[2, 3, true], [5, 2, false], [10, 2, true], [2, 4, false], [5, 3, true], [2, 5, false], [5, 4, true], [2, 9, false], [2, 6, true], [2, 2, false], [2, 8, true], [2, 5, true], [2, 7, true], [5, 2, true], [2, 8, false], [2, 6, false], [2, 9, true]];
  const rcB2 = [[3, 3, true], [4, 3, false], [3, 4, true], [4, 4, false], [5, 6, true], [10, 6, false], [3, 5, true], [4, 5, false], [3, 6, true], [4, 6, false], [5, 7, true], [10, 7, false], [3, 7, true], [4, 7, false], [3, 8, true], [4, 8, false], [5, 8, true]];
  const rcB3 = [[6, 4, true], [25, 4, false], [50, 4, true], [100, 4, false], [6, 5, true], [25, 5, false], [50, 5, true], [100, 5, false], [6, 6, true], [25, 6, false], [50, 6, true], [100, 6, false], [6, 7, true], [25, 7, false], [50, 7, true], [100, 7, false], [6, 8, true]];
  items.push(...cycle(17, rcB1, RULE_CLAIM_SKELETONS, 0, rcEmit(B1)));
  items.push(...cycle(17, rcB2, RULE_CLAIM_SKELETONS, 1, rcEmit(B2)));
  items.push(...cycle(17, rcB3, RULE_CLAIM_SKELETONS, 0, rcEmit(B3)));

  const PAGES_SKELETONS = [
    (nm, s, g) => `${nm} reads ${s} pages every day. After ${g} days, how many pages has ${nm} read?`,
    (nm, s, g) => `${nm} plants ${s} seeds each morning for ${g} mornings. How many seeds does ${nm} plant in all?`,
  ];
  const pgEmit = (band) => ([s, g], sk, nm) =>
    mk("patternRule", "storyPerDay", band, {
      answer: s * g,
      answerType: "numberPad",
      display: {
        counting: { kind: "sum", parts: Array.from({ length: g }, () => s) },
        promptText: sk(nm, s, g),
      },
    });
  const pgB1 = [[2, 3], [5, 2], [2, 4], [5, 3], [2, 5], [10, 2], [2, 6], [5, 4], [2, 7], [2, 2], [2, 8], [5, 5], [2, 9], [10, 1], [2, 10], [3, 3], [4, 3]];
  const pgB2 = [[3, 3], [4, 3], [3, 4], [4, 4], [5, 6], [10, 4], [3, 5], [4, 5], [10, 5], [5, 7], [3, 6], [4, 6], [10, 6], [5, 8], [3, 7], [4, 7], [10, 7]];
  const pgB3 = [[6, 4], [25, 4], [50, 4], [100, 4], [6, 5], [25, 5], [50, 5], [100, 5], [6, 6], [25, 6], [50, 6], [100, 6], [6, 7], [25, 7], [50, 7], [100, 7], [6, 8]];
  items.push(...cycle(17, pgB1, PAGES_SKELETONS, 0, pgEmit(B1)));
  items.push(...cycle(17, pgB2, PAGES_SKELETONS, 1, pgEmit(B2)));
  items.push(...cycle(17, pgB3, PAGES_SKELETONS, 0, pgEmit(B3)));

  const LAND_SKELETONS = [
    (nm, s, g) => `${nm} hops along the path ${s} tiles at a time and makes ${g} hops from the start. Which tile does ${nm} land on?`,
    (nm, s, g) => `${nm} climbs ${s} rungs per move and makes ${g} moves up the ladder. Which rung is ${nm} on?`,
  ];
  const ldEmit = (band) => ([s, g], sk, nm) =>
    mk("stepInference", "storyLandOn", band, {
      answer: s * g,
      answerType: "numberPad",
      display: {
        counting: { kind: "countOn", start: 0, more: s * g },
        promptText: sk(nm, s, g),
      },
    });
  items.push(...cycle(17, pgB1, LAND_SKELETONS, 1, ldEmit(B1)));
  items.push(...cycle(17, pgB2, LAND_SKELETONS, 0, ldEmit(B2)));
  items.push(...cycle(17, pgB3, LAND_SKELETONS, 1, ldEmit(B3)));

  const cB3x = [[6, 4, true], [25, 4, false], [50, 4, true], [100, 4, false], [6, 5, true], [25, 5, false], [50, 5, true], [100, 5, false], [6, 6, true], [25, 6, false], [50, 6, true], [100, 6, false], [6, 7, true], [25, 7, false], [50, 7, true], [100, 7, false], [6, 8, true]].map(([s, g, ok]) => [s, g, 0, ok]);
  items.push(...cycle(17, cB3x, CLAIM_SKELETONS, 0, cEmit(B3)));

  return items;
}
