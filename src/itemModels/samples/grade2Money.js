/**
 * The Grade 2 money pilot (plan section 3): five item models, one per item
 * type the spec lists, written to the v2 standard — a realistic price from
 * the context table for an object kids care about, one question, money in
 * test notation, the coins shown when coins are named, and hints in all
 * four layers with the item's own numbers.
 *
 * Standards: CCSS 2.MD.C.8 · TEKS 2.5A/B · FL MA.2.M.2.2 · VA 2.MG.1 · GA
 * has no money standard in its Grade 2 map.
 *
 * Every string is templated with the slots below; the checks in
 * itemModels.spec fill each model 200 times through the QC gate.
 */

const STANDARDS = Object.freeze({
  ccss: ["2.MD.C.8"],
  tx: ["2.5A", "2.5B"],
  fl: ["MA.2.M.2.2"],
  va: ["2.MG.1"],
  ga: [],
});

const PROVENANCE = Object.freeze({
  author: "larkit",
  checkedAgainst: ["CCSS 2.MD.C.8", "TEKS 2.5A-B", "FL B.E.S.T. MA.2.M.2.2", "VA SOL 2.MG.1"],
});

// A "buys ... at" story needs a place that sells things: an object's own
// setting when it has one with a shop word, else one of these.
const SHOP_WORDS = ["store", "shop", "sale", "stand", "market", "fair", "booth", "counter", "cafeteria", "truck", "bakery", "deli", "carnival", "arcade", "boardwalk", "mall", "place", "restaurant", "orchard", "patch", "movies", "ball game"];
const SHOPS = ["at the school store", "at the fair", "at the dollar store", "at a yard sale", "at the craft fair"];
// Things a kid can hand money over for. Songs and apps are not bought "at"
// a place, and an arcade game or claw machine is played, not bought.
const GOODS = {
  kind: "object",
  skill: "money",
  band: "2-3",
  minAppeal: 2,
  excludeCategories: ["screens-media"],
  exclude: ["arcade-game", "claw-machine", "lost-tooth", "family-photo"],
};
const SHOP = { kind: "setting", startsWith: "at ", words: SHOP_WORDS, fallback: SHOPS };

/** Easy: count coins of one kind, under 50¢. The tray is the question. */
export const countCoinsShown = {
  id: "money-g2-countCoinsShown-easy",
  modeId: "money",
  subskill: "countCoins",
  family: "conceptual",
  structureType: "trayCountOneKind",
  grade: "2",
  standards: STANDARDS,
  difficulty: "easy",
  format: "number",
  widget: "coinTray",
  representationType: "objectSet",
  template: {
    prompt: "{name} finds {howMany} coins {setting}. How many cents does {name} have?",
  },
  slots: {
    name: { kind: "name" },
    setting: { kind: "setting", options: ["in a piggy bank", "in a coat pocket", "under the couch cushions", "in a shoebox"] },
    coins: { kind: "coins", count: [2, 6], kinds: ["quarter", "dime", "nickel", "penny"], sameKind: true, maxCents: 50 },
    // Named so the hint can say the value of one coin without arithmetic.
    each: { kind: "expr", expr: "coinValue(take(coins, 1))", format: "int" },
    howMany: { kind: "expr", expr: "len(coins)", format: "int" },
    total: { kind: "expr", expr: "coinValue(coins)", format: "int" },
  },
  // A pile of pennies is worth its own count, which is also the
  // "counted coins, not value" distractor; skip those piles.
  constraints: ["coinValue(coins) != len(coins)"],
  operation: { op: "count" },
  display: {
    coins: "coins",
    coinMode: "'count'",
    counting: { kind: "sum", parts: "coinValues(coins)" },
  },
  answer: { expr: "coinValue(coins)", type: "int" },
  distractors: [
    { expr: "len(coins)", mistake: "countedCoinsNotValue" },
    { expr: "coinValue(coins) - each", mistake: "skippedACoin" },
    { expr: "coinValue(coins) + each", mistake: "countedACoinTwice" },
  ],
  hint: {
    nudge: "The question asks how many cents, not how many coins. Each coin is worth some cents.",
    steps: ["Every coin here is the same kind. One of them is worth {each} cents.", "Count by {each}s, one coin at a time.", "Touch each coin once so none is missed or counted twice."],
    picture: { kind: "coinTray", coins: "sortByValue(coins)" },
    example: "auto",
    feedback: {
      countedCoinsNotValue: "That is how many coins there are. Each coin is worth {each} cents, so count by {each}s.",
      skippedACoin: "One coin was missed. Touch each coin as you count by {each}s.",
      countedACoinTwice: "One coin was counted twice. Move each coin aside after you count it.",
    },
    solution: {
      steps: ["There are {howMany} coins, and each is worth {each} cents.", "Count by {each}s {howMany} times.", "That makes {total} cents."],
      answer: "coinValue(coins)",
    },
  },
  provenance: PROVENANCE,
};

/** Moderate: change from $1.00 for something under a dollar, counting up. */
export const changeFromOneDollar = {
  id: "money-g2-changeFromDollar-moderate",
  modeId: "money",
  subskill: "makeChange",
  family: "application",
  structureType: "changeFromDollar",
  grade: "2",
  standards: STANDARDS,
  difficulty: "moderate",
  format: "money",
  widget: null,
  representationType: "verbalContext",
  template: {
    prompt: "{name} buys {object_a} for {price} {setting}. {name} pays with a $1 bill. How much change does {name} get?",
  },
  slots: {
    name: { kind: "name" },
    object: { ...GOODS, priceCents: [26, 89] },
    setting: { ...SHOP, of: "object" },
    price: { kind: "money", of: "object" },
    paid: { kind: "money", of: 100 },
    nextTen: { kind: "expr", expr: "nextTen(price)", format: "money" },
    hop1: { kind: "expr", expr: "nextTen(price) - price", format: "int" },
    hop2: { kind: "expr", expr: "paid - nextTen(price)", format: "int" },
    change: { kind: "expr", expr: "paid - price", format: "money" },
  },
  // A price on a ten has no first hop, and the hint would name a hop that
  // is not there.
  constraints: ["price % 10 != 0"],
  operation: { a: "paid", b: "price", op: "-" },
  display: { money: { kind: "change", price: "price", paid: "paid", change: "paid - price" } },
  answer: { expr: "paid - price", type: "money" },
  distractors: [
    { expr: "paid + price", mistake: "addedInsteadOfSubtracted" },
    { expr: "paid - nextTen(price)", mistake: "skippedFirstHop" },
    { expr: "nextTen(price) - price", mistake: "stoppedAfterFirstHop" },
  ],
  hint: {
    nudge: "The question asks how much change {name} gets. Change is what is left after the price is paid.",
    steps: ["Count up from {price} to {paid}.", "Hop to {nextTen} first, then hop to {paid}.", "Add your two hops."],
    picture: { kind: "numberLine", min: "floorTen(price)", max: "paid", mark: "price" },
    example: "auto",
    feedback: {
      addedInsteadOfSubtracted: "That adds the price to the money {name} paid. Change means count up from the price to what was paid.",
      skippedFirstHop: "The first small hop is missing. Start at {price} and hop to {nextTen} first.",
      stoppedAfterFirstHop: "That is only the first hop. After {nextTen}, keep hopping up to {paid}.",
    },
    solution: {
      steps: ["{price} up to {nextTen} is {hop1} cents.", "{nextTen} up to {paid} is {hop2} cents.", "{hop1} + {hop2} = {change}."],
      answer: "paid - price",
    },
  },
  provenance: PROVENANCE,
};

/** Hard: change from $2.00 for something over a dollar. The classic slip
 * is to forget the dollar and answer $1.91 for a $1.09 price. */
export const changeFromTwoDollars = {
  id: "money-g2-changeFromTwoDollars-hard",
  modeId: "money",
  subskill: "makeChange",
  family: "application",
  structureType: "changeFromTwoDollars",
  grade: "2",
  standards: STANDARDS,
  difficulty: "hard",
  format: "money",
  widget: null,
  representationType: "verbalContext",
  template: {
    prompt: "{name} buys {object_a} for {price} {setting}. {name} pays with two $1 bills. How much change does {name} get?",
  },
  slots: {
    name: { kind: "name" },
    object: { ...GOODS, priceCents: [101, 189] },
    setting: { ...SHOP, of: "object" },
    price: { kind: "money", of: "object" },
    paid: { kind: "money", of: 200 },
    nextTen: { kind: "expr", expr: "nextTen(price)", format: "money" },
    hop1: { kind: "expr", expr: "nextTen(price) - price", format: "int" },
    hop2: { kind: "expr", expr: "paid - nextTen(price)", format: "int" },
    change: { kind: "expr", expr: "paid - price", format: "money" },
  },
  constraints: ["price % 10 != 0"],
  // The prompt writes the price as $1.09, so the payload carries only the
  // operation: the structure check reads the bare numerals of the prompt
  // and would not find 109 there.
  operation: { op: "-" },
  display: { money: { kind: "change", price: "price", paid: "paid", change: "paid - price" } },
  answer: { expr: "paid - price", type: "money" },
  distractors: [
    { expr: "paid + price", mistake: "addedInsteadOfSubtracted" },
    { expr: "paid + 100 - price", mistake: "forgotTheDollar" },
    { expr: "paid - nextTen(price)", mistake: "skippedFirstHop" },
  ],
  hint: {
    nudge: "The question asks how much change {name} gets. Start at the price and count up to what {name} paid.",
    steps: ["Count up from {price} to {paid}.", "Hop to {nextTen} first, then hop to {paid}.", "Add your two hops."],
    picture: { kind: "numberLine", min: "floorTen(price)", max: "paid", mark: "price" },
    example: "auto",
    feedback: {
      addedInsteadOfSubtracted: "That adds the price to the money {name} paid. Change means count up from the price to what was paid.",
      forgotTheDollar: "The price is more than one dollar. Count up from {price}, dollar and cents together.",
      skippedFirstHop: "The first small hop is missing. Start at {price} and hop to {nextTen} first.",
    },
    solution: {
      steps: ["{price} up to {nextTen} is {hop1} cents.", "{nextTen} up to {paid} is {hop2} cents.", "{hop1} + {hop2} = {change}."],
      answer: "paid - price",
    },
  },
  provenance: PROVENANCE,
};

/** Hard: the total of two priced things, crossing a dollar with a carry. */
export const totalOfTwoObjects = {
  id: "money-g2-totalTwoObjects-hard",
  modeId: "money",
  subskill: "moneyReasoning",
  family: "application",
  structureType: "twoPriceTotal",
  grade: "2",
  standards: STANDARDS,
  difficulty: "hard",
  format: "money",
  widget: null,
  representationType: "verbalContext",
  template: {
    prompt: "{name} buys {object1_a} for {price1} and {object2_a} for {price2} {setting}. How much money does {name} spend?",
  },
  slots: {
    name: { kind: "name" },
    object1: { ...GOODS, priceCents: [21, 99] },
    object2: { ...GOODS, priceCents: [21, 99] },
    setting: { ...SHOP, of: "object1" },
    price1: { kind: "money", of: "object1" },
    price2: { kind: "money", of: "object2" },
    tens1: { kind: "expr", expr: "tens(price1)", format: "int" },
    tens2: { kind: "expr", expr: "tens(price2)", format: "int" },
    ones1: { kind: "expr", expr: "ones(price1)", format: "int" },
    ones2: { kind: "expr", expr: "ones(price2)", format: "int" },
    tensSum: { kind: "expr", expr: "tens(price1) + tens(price2)", format: "int" },
    onesSum: { kind: "expr", expr: "ones(price1) + ones(price2)", format: "int" },
    total: { kind: "expr", expr: "price1 + price2", format: "money" },
  },
  // Crossing the dollar with a carry is what makes this hard; 50¢ twice
  // would make "dropped the dollar" equal the difference.
  constraints: ["price1 + price2 > 100", "ones(price1) + ones(price2) >= 10", "price1 != price2", "price1 != 50", "price2 != 50"],
  operation: { a: "price1", b: "price2", op: "+" },
  display: { money: { kind: "total", prices: ["price1", "price2"], total: "price1 + price2" } },
  answer: { expr: "price1 + price2", type: "money" },
  distractors: [
    { expr: "price1 + price2 - 10", mistake: "forgotToCarry" },
    { expr: "price1 + price2 - 100", mistake: "droppedTheDollar" },
    { expr: "max(price1, price2) - min(price1, price2)", mistake: "subtractedInstead" },
  ],
  hint: {
    nudge: "The question asks how much {name} spends on both things. Put the two prices together.",
    steps: ["Add the two prices, {price1} and {price2}.", "Add the tens first, then the ones.", "If the cents pass a dollar, write the answer as dollars and cents."],
    picture: { kind: "barModel", parts: ["price1", "price2"] },
    example: "auto",
    feedback: {
      forgotToCarry: "The ones add up to more than ten. Carry that ten over into the tens.",
      droppedTheDollar: "The cents passed a dollar. Keep that dollar in the answer.",
      subtractedInstead: "That takes one price away from the other. Buying both things means add the two prices.",
    },
    solution: {
      steps: ["Add the tens: {tens1} + {tens2} = {tensSum}.", "Add the ones: {ones1} + {ones2} = {onesSum}.", "{tensSum} + {onesSum} makes {total}."],
      answer: "price1 + price2",
    },
  },
  provenance: PROVENANCE,
};

/** Moderate: who has more money, when the kid with more coins has less. */
export const compareTwoAmounts = {
  id: "money-g2-compareTwoAmounts-moderate",
  modeId: "money",
  subskill: "coinEquivalence",
  family: "conceptual",
  structureType: "compareCoinPiles",
  grade: "2",
  standards: STANDARDS,
  difficulty: "moderate",
  format: "choice",
  widget: null,
  representationType: "verbalContext",
  template: {
    prompt: "{name1} has {coinsA}. {name2} has {coinsB}. Who has more money?",
  },
  slots: {
    name1: { kind: "name" },
    name2: { kind: "name" },
    coinsA: { kind: "coins", count: [1, 5], kinds: ["quarter", "dime", "nickel", "penny"], maxCents: 99 },
    coinsB: { kind: "coins", count: [1, 5], kinds: ["quarter", "dime", "nickel", "penny"], maxCents: 99 },
    valueA: { kind: "expr", expr: "coinValue(coinsA)", format: "int" },
    valueB: { kind: "expr", expr: "coinValue(coinsB)", format: "int" },
    richer: { kind: "expr", expr: "coinValue(coinsA) > coinValue(coinsB) ? name1 : name2", format: "text" },
    more: { kind: "expr", expr: "max(coinValue(coinsA), coinValue(coinsB))", format: "int" },
    less: { kind: "expr", expr: "min(coinValue(coinsA), coinValue(coinsB))", format: "int" },
  },
  // The pile with more coins is worth less: that is the misconception the
  // item is for, and it keeps "more coins" a wrong answer.
  constraints: [
    "len(coinsA) != len(coinsB)",
    "coinValue(coinsA) != coinValue(coinsB)",
    "(len(coinsA) > len(coinsB)) == (coinValue(coinsA) < coinValue(coinsB))",
  ],
  answer: { expr: "coinValue(coinsA) > coinValue(coinsB) ? name1 : name2", type: "text" },
  distractors: [
    { expr: "coinValue(coinsA) > coinValue(coinsB) ? name2 : name1", mistake: "countedCoinsNotValue" },
    { expr: "'They have the same amount'", mistake: "calledThemEqual" },
  ],
  hint: {
    nudge: "The question asks who has more money, not who has more coins. Find how many cents each pile is worth.",
    steps: ["Count the first pile by value: quarters are 25, dimes 10, nickels 5, pennies 1.", "Count the second pile the same way.", "Compare the two totals in cents."],
    picture: { kind: "coinTray", coins: "sortByValue(concat(coinsA, coinsB))" },
    example: "auto",
    feedback: {
      countedCoinsNotValue: "More coins does not mean more money. A dime is worth more than a nickel, even though it is smaller.",
      calledThemEqual: "The two piles are not worth the same. Count each pile in cents, then compare.",
    },
    solution: {
      steps: ["{coinsA} is {valueA} cents.", "{coinsB} is {valueB} cents.", "{more} is more than {less}, so {richer} has more money."],
      answer: "coinValue(coinsA) > coinValue(coinsB) ? name1 : name2",
    },
  },
  provenance: PROVENANCE,
};

/** The pilot models, in the order the review screen lists them. */
export const GRADE2_MONEY_MODELS = Object.freeze([
  countCoinsShown,
  changeFromOneDollar,
  changeFromTwoDollars,
  totalOfTwoObjects,
  compareTwoAmounts,
]);
