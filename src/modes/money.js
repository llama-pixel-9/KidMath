import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";
import { maybeApplyFormat } from "./formats";

/**
 * Money (spec part C3 — `money`).
 *
 * Before M4 this mode was two questions: total a pile of coins, or make change.
 * The structural ladder now runs
 *   band 1 (L1-3)  single coin values, counting a tray, equal-value reasoning
 *   band 2 (L4-6)  trades, fewest-coins, straightforward change, comparison
 *   band 3 (L7-10) change with the price or the payment unknown, two-item
 *                  totals, and dollar/cent notation.
 *
 * The visible CoinTray (M2) is kept for every counting item small enough to
 * read: counting mixed change is a visual skill, because a dime is worth more
 * than a nickel and is physically smaller.
 */

const { CONCEPTUAL, PROCEDURAL, APPLICATION } = ITEM_FAMILIES;

const SUBSKILLS = ["countCoins", "makeChange", "coinEquivalence", "moneyReasoning"];

// Money items are stories or coin pictures; the equality formats need a bare
// `a op b = answer`, which only the two-item total row has.
const SUPPORTED_FORMATS = ["trueFalse", "errorAnalysis"];

const COIN_VALUE = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
const COIN_NAMES = ["quarter", "dime", "nickel", "penny"];
const PLURAL = { penny: "pennies", nickel: "nickels", dime: "dimes", quarter: "quarters" };
const DENOMS = [25, 10, 5, 1];

const ACTORS = ["Mina", "Sam", "Ava", "Theo", "Nia", "Luca"];
const GOODS = ["sticker", "pencil", "bookmark", "marble", "badge", "ribbon"];

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function bandOf(level) {
  return level <= 3 ? 1 : level <= 6 ? 2 : 3;
}

/** Greedy is optimal for the US denominations, so this really is the fewest. */
function fewestCoins(cents) {
  let left = cents;
  let count = 0;
  for (const d of DENOMS) {
    count += Math.floor(left / d);
    left %= d;
  }
  return count;
}

function trayTotal(coins) {
  return coins.reduce((sum, c) => sum + COIN_VALUE[c], 0);
}

/** A random handful, capped so the tray stays countable rather than a slog. */
function randomTray(level) {
  const cap = level <= 3 ? 2 : 4;
  const counts = {
    quarter: randInt(0, cap),
    dime: randInt(0, 3),
    nickel: randInt(0, cap),
    penny: randInt(0, 4),
  };
  // An empty handful is not a question, and it also leaves `coinPhrase` with
  // nothing to say.
  if (!COIN_NAMES.some((n) => counts[n] > 0)) counts.nickel = randInt(1, 3);
  const coins = [];
  for (const name of COIN_NAMES) {
    for (let i = 0; i < counts[name]; i += 1) coins.push(name);
  }
  return { coins: shuffleArray(coins), counts };
}

function coinPhrase(counts) {
  const parts = COIN_NAMES.filter((n) => counts[n] > 0).map(
    (n) => `${counts[n]} ${counts[n] === 1 ? n : PLURAL[n]}`
  );
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

const VARIETIES = [
  // ---- band 1 --------------------------------------------------------------
  {
    id: "coinValueRecall",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["countCoins"],
    build() {
      const coin = pick(COIN_NAMES);
      return {
        answer: COIN_VALUE[coin],
        answerType: "numberPad",
        promptText: `How many cents is one ${coin} worth?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["coinValueSlip"],
      };
    },
  },
  {
    id: "countCoinsVisual",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["countCoins"],
    build(level) {
      const { coins } = randomTray(level);
      // Over-full trays are a counting slog rather than a coin-value question.
      const shown = coins.slice(0, 12);
      return {
        answer: trayTotal(shown),
        answerType: "coinTray",
        display: { coins: shown, coinMode: "count" },
        promptText: "How many cents are shown?",
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["coinValueSlip", "countCoinsNotValue", "offByOne"],
        distractorContext: { a: shown.length },
      };
    },
  },
  {
    id: "countCoinsText",
    bands: [1, 2],
    family: PROCEDURAL,
    subskills: ["countCoins"],
    build(level) {
      const { counts } = randomTray(level);
      const total = COIN_NAMES.reduce((s, n) => s + counts[n] * COIN_VALUE[n], 0);
      const actor = pick(ACTORS);
      return {
        answer: total,
        answerType: "numberPad",
        promptText: `${actor} has ${coinPhrase(counts)}. How many cents in all?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["coinValueSlip", "countCoinsNotValue"],
      };
    },
  },
  {
    id: "buildAmountTray",
    bands: [1, 2],
    family: PROCEDURAL,
    subskills: ["countCoins"],
    build(level) {
      // The child taps coins to compose the target. The tray holds the exact
      // coins for the amount plus a couple of extras, so any subset that
      // reaches the target counts — checkAnswer compares totals, not coins.
      const { coins } = randomTray(level);
      const needed = coins.slice(0, level <= 3 ? 5 : 7);
      const target = trayTotal(needed);
      const extras = [pick(COIN_NAMES), pick(COIN_NAMES)];
      return {
        answer: target,
        answerType: "coinTray",
        display: { coins: shuffleArray([...needed, ...extras]), coinMode: "build" },
        promptText: `Tap coins to make ${target}c.`,
        representation: "visual",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["coinValueSlip", "countCoinsNotValue"],
        distractorContext: { a: target },
      };
    },
  },
  {
    id: "wouldYouRatherCoins",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["coinEquivalence"],
    build() {
      // Sometimes the two piles are worth exactly the same, and noticing that
      // is the point of the row.
      const a = pick([
        { label: "2 dimes", cents: 20 },
        { label: "5 nickels", cents: 25 },
        { label: "3 dimes", cents: 30 },
        { label: "1 quarter", cents: 25 },
      ]);
      const b = pick([
        { label: "4 nickels", cents: 20 },
        { label: "1 quarter and 1 nickel", cents: 30 },
        { label: "2 dimes and 1 nickel", cents: 25 },
        { label: "6 nickels", cents: 30 },
      ]);
      const same = "They are worth the same";
      const answer = a.cents === b.cents ? same : a.cents > b.cents ? a.label : b.label;
      return {
        answer,
        answerType: "choice",
        choices: shuffleArray([a.label, b.label, same].filter((v, i, arr) => arr.indexOf(v) === i)),
        promptText: `Would you rather have ${a.label} or ${b.label}? Pick the one worth more.`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["sizeMeansValue", "coinValueSlip"],
      };
    },
  },

  // ---- band 2 --------------------------------------------------------------
  {
    id: "equalValueSwap",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["coinEquivalence"],
    build() {
      const from = pick(["dime", "quarter", "nickel"]);
      // The trade must come out whole: 3 quarters is not a number of dimes.
      const to = pick(
        COIN_NAMES.filter((c) => COIN_VALUE[c] < COIN_VALUE[from] && COIN_VALUE[from] % COIN_VALUE[c] === 0)
      );
      const count = randInt(2, 4);
      const totalCents = count * COIN_VALUE[from];
      return {
        answer: totalCents / COIN_VALUE[to],
        answerType: "numberPad",
        promptText: `How many ${PLURAL[to]} have the same value as ${count} ${PLURAL[from]}?`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["coinValueSlip", "divisionReversed"],
        distractorContext: { a: totalCents, b: COIN_VALUE[to] },
      };
    },
  },
  {
    id: "makeAmountFewest",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["coinEquivalence"],
    build() {
      const cents = randInt(2, 19) * 5;
      return {
        answer: fewestCoins(cents),
        answerType: "numberPad",
        promptText: `What is the fewest number of coins that make ${cents}c? Use quarters, dimes, nickels and pennies.`,
        representation: "symbolic",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["coinValueSlip", "offByOne"],
      };
    },
  },
  {
    id: "makeChange",
    bands: [2, 3],
    family: APPLICATION,
    subskills: ["makeChange"],
    build(level) {
      const paid = level <= 6 ? 100 : pick([100, 125, 150, 200]);
      const price = randInt(5, paid - 5);
      const actor = pick(ACTORS);
      return {
        answer: paid - price,
        answerType: "numberPad",
        promptText: `A ${pick(GOODS)} costs ${price}c. ${actor} pays with ${paid}c. How many cents change?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["changeDirection", "operationSwap"],
        distractorContext: { a: paid, b: price },
      };
    },
  },
  {
    id: "compareAmounts",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["moneyReasoning"],
    build() {
      const sets = [
        { label: "3 dimes", cents: 30 },
        { label: "1 quarter and 1 nickel", cents: 30 },
        { label: "5 nickels", cents: 25 },
        { label: "1 quarter", cents: 25 },
        { label: "2 dimes and 3 pennies", cents: 23 },
        { label: "4 dimes", cents: 40 },
        { label: "1 quarter and 2 dimes", cents: 45 },
      ];
      const a = pick(sets);
      const b = pick(sets.filter((s) => s.label !== a.label));
      return {
        answer: a.cents > b.cents ? ">" : a.cents < b.cents ? "<" : "=",
        answerType: "symbolSelect",
        promptText: `${a.label} ? ${b.label}`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["sizeMeansValue", "symbolFlip"],
      };
    },
  },
  {
    id: "canYouAfford",
    bands: [2, 3],
    family: APPLICATION,
    subskills: ["moneyReasoning"],
    build() {
      const actor = pick(ACTORS);
      const quarters = randInt(2, 4);
      const have = quarters * 25;
      const price = have + pick([-15, -5, 5, 15]);
      return {
        answer: have >= price ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: `${actor} has ${quarters} quarters. A pen costs ${price}c. Can ${actor} buy it?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["coinValueSlip", "countCoinsNotValue"],
      };
    },
  },
  {
    id: "errorAnalysisCoins",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["countCoins"],
    build() {
      const actor = pick(ACTORS);
      const dimes = randInt(1, 3);
      const pennies = randInt(1, 4);
      const total = dimes * 10 + pennies;
      return {
        answer: total,
        answerType: "numberPad",
        promptText: `${actor} counted ${dimes} ${PLURAL.dime} and ${pennies} ${PLURAL.penny} as ${dimes + pennies}c, one for each coin. What is the real total in cents?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["countCoinsNotValue", "coinValueSlip"],
        distractorContext: { a: dimes, b: pennies },
      };
    },
  },

  // ---- band 3 --------------------------------------------------------------
  {
    id: "changePriceUnknown",
    bands: [3],
    family: APPLICATION,
    subskills: ["makeChange"],
    build() {
      const actor = pick(ACTORS);
      const paid = pick([100, 125, 150]);
      const change = randInt(1, (paid - 10) / 5) * 5;
      return {
        answer: paid - change,
        answerType: "numberPad",
        promptText: `${actor} paid with ${paid}c and got ${change}c change. How many cents did the ${pick(GOODS)} cost?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["changeDirection", "startAsResult"],
        distractorContext: { a: paid, b: change },
      };
    },
  },
  {
    id: "changePaidUnknown",
    bands: [3],
    family: APPLICATION,
    subskills: ["makeChange"],
    build() {
      const actor = pick(ACTORS);
      const price = randInt(3, 18) * 5;
      const change = randInt(2, 12) * 5;
      return {
        answer: price + change,
        answerType: "numberPad",
        promptText: `A book costs ${price}c. ${actor} got ${change}c change. How many cents did ${actor} hand over?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["changeDirection", "startAsResult"],
        distractorContext: { a: price, b: change },
      };
    },
  },
  {
    id: "twoItemMultiStep",
    bands: [3],
    family: APPLICATION,
    subskills: ["makeChange"],
    build() {
      const actor = pick(ACTORS);
      const first = randInt(2, 9) * 5;
      const second = randInt(2, 9) * 5;
      const paid = first + second <= 100 ? 100 : 200;
      return {
        answer: paid - (first + second),
        answerType: "numberPad",
        promptText: `${actor} buys a ${first}c apple and a ${second}c juice, and pays ${paid}c. How many cents change?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["changeDirection", "operationSwap"],
        distractorContext: { a: paid, b: first + second },
      };
    },
  },
  {
    id: "dollarNotation",
    bands: [3],
    family: PROCEDURAL,
    subskills: ["moneyReasoning"],
    build() {
      const dollars = randInt(1, 9);
      const cents = randInt(0, 19) * 5;
      const text = `$${dollars}.${String(cents).padStart(2, "0")}`;
      return {
        answer: dollars * 100 + cents,
        answerType: "numberPad",
        promptText: `Write ${text} in cents.`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["placeValueSlip", "wrongFactor"],
        distractorContext: { factor: 100 },
      };
    },
  },
];

export const MONEY_VARIETIES = VARIETIES.map((v) => v.id);

function selectVariety(level, context) {
  const b = bandOf(level);
  let pool = VARIETIES.filter((v) => v.bands.includes(b));
  if (context.allowWordProblems === false) {
    const dry = pool.filter((v) => v.family !== APPLICATION);
    if (dry.length) pool = dry;
  }
  if (context.itemFamily) {
    // Family never wins over the band: band 1 has no application variety, and
    // the old any-band fallback handed "change from 92 cents" to level-1 kids
    // (the numberBonds level-leak class). A family miss inside the band serves
    // a sibling family instead; the bank still answers family-specific
    // requests once its rows are approved.
    const byFamily = pool.filter((v) => v.family === context.itemFamily);
    if (byFamily.length) pool = byFamily;
  }
  if (context.targetSubskill) {
    const bySubskill = pool.filter((v) => v.subskills.includes(context.targetSubskill));
    const inBandAnyFamily = VARIETIES.filter(
      (v) => v.bands.includes(b) && v.subskills.includes(context.targetSubskill)
    );
    if (bySubskill.length) pool = bySubskill;
    else if (inBandAnyFamily.length) pool = inBandAnyFamily;
  }
  return pick(pool);
}

export default {
  id: "money",
  label: "Money Magpie",
  shortLabel: "Money",
  description: "Coins & change",
  icon: "Coins",
  glyph: "¢",
  op: "money",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: Object.values(ITEM_FAMILIES),
  varieties: MONEY_VARIETIES,

  generate(level, context = {}) {
    const variety = selectVariety(level, context);
    const built = variety.build(level, context.targetSubskill);
    const itemFamily = variety.family;

    const question = {
      op: built.op || "money",
      answer: built.answer,
      answerType: built.answerType,
      level,
      display: { ...(built.display || {}), promptText: built.promptText },
    };
    if (built.a != null) question.a = built.a;
    if (built.b != null) question.b = built.b;
    if (built.choices) question.choices = built.choices;
    if (built.distractorContext) question.distractorContext = built.distractorContext;

    question.metadata = createQuestionMetadata({
      modeId: "money",
      level,
      domain: "MD",
      cluster: "Work with money",
      subskill: built.subskill || variety.subskills[0],
      itemFamily,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP1", "MP2", "MP6"],
      standardRefs: ["2.MD"],
      misconceptionTags: built.misconceptionTags,
      blueprintId: `money-${itemFamily}-${variety.id}`,
      structureType: variety.id,
    });

    return maybeApplyFormat(question, level, context, SUPPORTED_FORMATS, 0.15);
  },

  generateChoices(answer, question) {
    if (Array.isArray(question?.choices)) return question.choices;
    if (typeof answer !== "number") return null;
    return buildDistractors({
      answer,
      misconceptions: question?.metadata?.misconceptionTags || [],
      min: 0,
      ...(question?.distractorContext || {}),
    });
  },
};
