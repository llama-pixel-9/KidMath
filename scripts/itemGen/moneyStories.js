/* money application stories — coins spent, saved, traded, and counted.
 *
 * Contexts: class-fair prize booth, lemonade stand, school book sale, and a
 * trading post / coin machine. Claims ride countMath ({sum}, {countBack},
 * {gap}, {moreLess}) or display.money claims ({trade}, {fewest}) verified in
 * authorMoney.js. Band-1 prompts stay <= 20 cents everywhere.
 */

import { rotor, NAMES } from "./countingTemplates.js";
import { LEVELS, COIN_VALUE } from "./moneyTemplates.js";

const nameAt = (i) => NAMES[i % NAMES.length];
const B1 = "band1";
const B2 = "band2";
const B3 = "band3";

const mk = (subskill, structureType, band, question) => {
  if (band === B1) {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 story exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "money",
    subskill,
    itemFamily: "application",
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const GOODS = ["sticker", "bookmark", "badge", "ribbon"];
const PLACES = ["prize booth", "lemonade stand", "book sale", "craft table"];

function cycle(count, space, skeletons, offset, emit) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(emit(space[i % space.length], skeletons[(i + offset) % skeletons.length], nameAt(i + offset), i));
  }
  return items;
}

export function buildStoryItems() {
  const items = [];

  /* ---------------- countCoins stories ---------------- */

  const POCKET_SKELETONS = [
    (nm, parts) => `${nm} empties a pocket at the ${PLACES[parts.length % 4]}: coins worth ${parts.join(", ")} cents. How many cents does ${nm} have?`,
    (nm, parts) => `${nm} lines up coins worth ${parts.join(", ")} cents. What is the total number of cents?`,
  ];
  const pocketEmit = (band) => ([parts], sk, nm) =>
    mk("countCoins", `storyPocket_${band}`, band, {
      answer: parts.reduce((s, x) => s + x, 0),
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts }, promptText: sk(nm, parts) },
    });
  const pkB1 = [[[10, 5, 1]], [[5, 5, 1, 1]], [[10, 1, 1, 1]], [[5, 1, 1]], [[10, 5, 1, 1]], [[5, 5, 5]], [[10, 5]], [[5, 5, 1]], [[10, 1]], [[5, 1, 1, 1]], [[10, 5, 5]], [[10, 10]], [[5, 5, 5, 1]], [[10, 1, 1]], [[10, 5, 1, 1, 1]], [[5, 5, 1, 1, 1]], [[10, 10, 1? 0 : 0]]];
  // (the last entry is replaced below — see pkB1Fixed)
  const pkB1Fixed = pkB1.slice(0, 16).concat([[[10, 5, 5, 1]]]);
  items.push(...cycle(17, pkB1Fixed, POCKET_SKELETONS, 0, pocketEmit(B1)));
  const pkB2 = [[[25, 10, 1]], [[25, 25, 5]], [[25, 10, 10, 1]], [[25, 5, 5, 1]], [[25, 25, 10]], [[10, 10, 10, 5, 1]], [[25, 25, 25]], [[25, 10, 5]], [[25, 25, 1, 1]], [[10, 10, 10, 10]], [[25, 5, 1, 1]], [[25, 25, 10, 5]], [[25, 10, 10, 10]], [[25, 25, 25, 5]], [[10, 10, 5, 5, 5]], [[25, 10, 1, 1, 1]], [[25, 25, 10, 10]]];
  items.push(...cycle(17, pkB2, POCKET_SKELETONS, 1, pocketEmit(B2)));
  const pkB3 = [[[100, 25, 10]], [[100, 100, 25]], [[100, 25, 25, 5]], [[100, 10, 10, 1]], [[100, 100, 10, 5]], [[100, 25, 5, 1]], [[100, 100, 100, 25]], [[100, 25, 25, 25]], [[100, 100, 5, 1]], [[100, 10, 5, 5]], [[100, 100, 25, 10]], [[100, 25, 10, 10]], [[100, 100, 100, 5]], [[100, 25, 25, 10]], [[100, 100, 10, 10]], [[100, 25, 1, 1]], [[100, 100, 25, 25]]];
  items.push(...cycle(17, pkB3, POCKET_SKELETONS, 2, pocketEmit(B3)));

  const EARN_SKELETONS = [
    (nm, have, coin) => `${nm}'s jar holds ${have} cents. ${nm} earns one more ${coin} for helping. How many cents are in the jar now?`,
    (nm, have, coin) => `With ${have} cents saved, ${nm} drops one more ${coin} into the jar. What is the new total of cents?`,
  ];
  const earnEmit = (band) => ([have, coin], sk, nm) =>
    mk("countCoins", `storyEarnCoin_${band}`, band, {
      answer: have + COIN_VALUE[coin],
      answerType: "numberPad",
      display: { counting: { kind: "moreLess", n: have, delta: COIN_VALUE[coin] }, promptText: sk(nm, have, coin) },
    });
  const eB1 = [[7, "nickel"], [12, "penny"], [9, "dime"], [4, "nickel"], [15, "penny"], [6, "dime"], [11, "nickel"], [3, "penny"], [8, "dime"], [13, "nickel"], [5, "penny"], [10, "dime"], [14, "nickel"], [2, "penny"], [7, "dime"], [15, "nickel"], [16, "penny"]];
  items.push(...cycle(17, eB1, EARN_SKELETONS, 1, earnEmit(B1)));
  const eB2 = [[37, "quarter"], [52, "dime"], [46, "nickel"], [61, "quarter"], [28, "dime"], [73, "nickel"], [44, "quarter"], [59, "dime"], [67, "nickel"], [31, "quarter"], [78, "dime"], [55, "nickel"], [42, "quarter"], [69, "dime"], [36, "nickel"], [58, "quarter"], [47, "dime"]];
  items.push(...cycle(17, eB2, EARN_SKELETONS, 0, earnEmit(B2)));
  const eB3 = [[137, "quarter"], [252, "dime"], [146, "quarter"], [261, "nickel"], [128, "quarter"], [273, "dime"], [144, "quarter"], [259, "nickel"], [167, "quarter"], [231, "dime"], [178, "quarter"], [255, "nickel"], [142, "quarter"], [269, "dime"], [136, "quarter"], [258, "nickel"], [147, "quarter"]];
  items.push(...cycle(17, eB3, EARN_SKELETONS, 2, earnEmit(B3)));

  const COMBINE_SKELETONS = [
    (nm, a, b) => `${nm} pours two banks together: one holds ${a} cents, the other ${b} cents. How many cents in all?`,
    (nm, a, b) => `${nm}'s two pouches hold ${a} cents and ${b} cents. What is the total number of cents?`,
  ];
  const combineEmit = (band) => ([a, b], sk, nm) =>
    mk("countCoins", `storyCombine_${band}`, band, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(nm, a, b) },
    });
  const cbB1 = [[7, 6], [8, 9], [5, 12], [6, 11], [9, 4], [12, 7], [3, 14], [8, 5], [11, 6], [4, 13], [7, 9], [15, 3], [6, 8], [9, 8], [12, 5], [2, 16], [10, 7]];
  items.push(...cycle(17, cbB1, COMBINE_SKELETONS, 2, combineEmit(B1)));
  const cbB2 = [[26, 31], [37, 42], [48, 23], [53, 19], [34, 45], [27, 66], [58, 33], [41, 39], [62, 17], [29, 54], [46, 38], [51, 28], [36, 47], [65, 22], [43, 49], [57, 31], [24, 68]]
    .map(([a, b]) => [a + 1, b]); // offset so strings never collide with the twoPriceMid drills
  items.push(...cycle(17, cbB2, COMBINE_SKELETONS, 0, combineEmit(B2)));
  const cbB3 = [[127, 131], [159, 67], [190, 104], [138, 168], [224, 91], [157, 178], [242, 87], [120, 154], [263, 73], [149, 186], [218, 96], [174, 159], [235, 118], [162, 145], [209, 127], [177, 192], [254, 84]];
  items.push(...cycle(17, cbB3, COMBINE_SKELETONS, 1, combineEmit(B3)));

  /* ---------------- makeChange stories ---------------- */

  const SHOP_SKELETONS = [
    (nm, pay, cost, good) => `At the ${PLACES[(pay + cost) % 4]}, ${nm} pays ${pay} cents for a ${cost}-cent ${good}. How many cents come back as change?`,
    (nm, pay, cost, good) => `${nm} hands ${pay} cents to the seller for a ${good} that costs ${cost} cents. How many cents of change does ${nm} get?`,
  ];
  const shopEmit = (band) => ([pay, cost, gi], sk, nm) =>
    mk("makeChange", `storyShop_${band}`, band, {
      answer: pay - cost,
      answerType: "numberPad",
      display: { counting: { kind: "countBack", start: pay, back: cost }, promptText: sk(nm, pay, cost, GOODS[gi % 4]) },
    });
  const shB1 = [[10, 7, 0], [10, 4, 1], [15, 12, 2], [15, 8, 3], [20, 17, 0], [20, 13, 1], [10, 6, 2], [15, 11, 3], [20, 15, 0], [10, 3, 1], [15, 6, 2], [20, 9, 3], [10, 8, 0], [20, 18, 1], [15, 4, 2], [20, 11, 3], [10, 2, 0]];
  items.push(...cycle(17, shB1, SHOP_SKELETONS, 0, shopEmit(B1)));
  const shB2 = [[25, 18, 0], [25, 12, 1], [50, 37, 2], [50, 24, 3], [25, 21, 0], [50, 43, 1], [25, 9, 2], [50, 16, 3], [25, 6, 0], [50, 31, 1], [25, 14, 2], [50, 48, 3], [25, 19, 0], [50, 22, 1], [25, 16, 2], [50, 39, 3], [25, 11, 0]];
  items.push(...cycle(17, shB2, SHOP_SKELETONS, 1, shopEmit(B2)));
  const shB3 = [[100, 67, 0], [100, 43, 1], [100, 81, 2], [200, 145, 3], [100, 29, 0], [200, 168, 1], [100, 56, 2], [200, 123, 3], [100, 92, 0], [200, 187, 1], [100, 34, 2], [200, 154, 3], [100, 78, 0], [200, 109, 1], [100, 12, 2], [200, 176, 3], [100, 61, 0]];
  items.push(...cycle(17, shB3, SHOP_SKELETONS, 2, shopEmit(B3)));

  const SAVE_SKELETONS = [
    (nm, have, target, good) => `${nm} saved ${have} cents toward a ${target}-cent ${good}. How many more cents does ${nm} need?`,
    (nm, have, target, good) => `A ${good} costs ${target} cents, and ${nm} has ${have} cents so far. How many cents are still missing?`,
  ];
  const saveEmit = (band) => ([have, target, gi], sk, nm) =>
    mk("makeChange", `storySaveUp_${band}`, band, {
      answer: target - have,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have, target }, promptText: sk(nm, have, target, GOODS[gi % 4]) },
    });
  const svB1 = [[7, 10, 0], [4, 10, 1], [12, 15, 2], [8, 15, 3], [17, 20, 0], [13, 20, 1], [6, 10, 2], [11, 15, 3], [15, 20, 0], [3, 10, 1], [9, 15, 2], [14, 20, 3], [8, 10, 0], [18, 20, 1], [4, 15, 2], [11, 20, 3], [2, 10, 0]];
  items.push(...cycle(17, svB1, SAVE_SKELETONS, 1, saveEmit(B1)));
  const svB2 = [[18, 25, 0], [12, 25, 1], [37, 50, 2], [24, 50, 3], [21, 25, 0], [43, 50, 1], [9, 25, 2], [16, 50, 3], [6, 25, 0], [31, 50, 1], [14, 25, 2], [48, 50, 3], [19, 25, 0], [22, 50, 1], [16, 25, 2], [39, 50, 3], [11, 25, 0]];
  items.push(...cycle(17, svB2, SAVE_SKELETONS, 2, saveEmit(B2)));
  const svB3 = [[67, 100, 0], [43, 100, 1], [145, 200, 2], [81, 100, 3], [168, 200, 0], [29, 100, 1], [123, 200, 2], [56, 100, 3], [187, 200, 0], [92, 100, 1], [154, 200, 2], [34, 100, 3], [109, 200, 0], [78, 100, 1], [176, 200, 2], [12, 100, 3], [132, 200, 0]];
  items.push(...cycle(17, svB3, SAVE_SKELETONS, 0, saveEmit(B3)));

  const TWO_COIN_PAY_SKELETONS = [
    (nm, c1, c2, cost) => `${nm} pays with a ${c1} and a ${c2} for a ${cost}-cent treat. How many cents come back?`,
    (nm, c1, c2, cost) => `A treat costs ${cost} cents. ${nm} hands over a ${c1} and a ${c2}. What change in cents does ${nm} receive?`,
  ];
  const twoCoinEmit = (band) => ([c1, c2, cost], sk, nm) => {
    const pay = COIN_VALUE[c1] + COIN_VALUE[c2];
    return mk("makeChange", `storyTwoCoinPay_${band}`, band, {
      answer: pay - cost,
      answerType: "numberPad",
      display: { counting: { kind: "countBack", start: pay, back: cost }, promptText: sk(nm, c1, c2, cost) },
    });
  };
  const tcB1 = [["dime", "nickel", 12], ["dime", "nickel", 9], ["dime", "dime", 16], ["dime", "penny", 8], ["nickel", "nickel", 7], ["dime", "dime", 13], ["dime", "nickel", 11], ["nickel", "penny", 4], ["dime", "penny", 6], ["dime", "dime", 18], ["nickel", "nickel", 6], ["dime", "nickel", 14], ["dime", "penny", 9], ["dime", "dime", 11], ["nickel", "penny", 2], ["dime", "nickel", 8], ["nickel", "nickel", 9]];
  items.push(...cycle(17, tcB1, TWO_COIN_PAY_SKELETONS, 2, twoCoinEmit(B1)));
  const tcB2 = [["quarter", "dime", 28], ["quarter", "quarter", 42], ["quarter", "nickel", 22], ["quarter", "dime", 31], ["quarter", "quarter", 37], ["quarter", "nickel", 17], ["quarter", "dime", 26], ["quarter", "quarter", 46], ["quarter", "nickel", 24], ["quarter", "dime", 33], ["quarter", "quarter", 29], ["quarter", "nickel", 13], ["quarter", "dime", 24], ["quarter", "quarter", 44], ["quarter", "nickel", 26], ["quarter", "dime", 19], ["quarter", "quarter", 33]];
  items.push(...cycle(17, tcB2, TWO_COIN_PAY_SKELETONS, 0, twoCoinEmit(B2)));
  const tcB3 = [["quarter", "quarter", 12], ["quarter", "quarter", 8], ["quarter", "dime", 6], ["quarter", "quarter", 21], ["quarter", "dime", 14], ["quarter", "quarter", 17], ["quarter", "dime", 9], ["quarter", "quarter", 26], ["quarter", "dime", 22], ["quarter", "quarter", 31], ["quarter", "dime", 27], ["quarter", "quarter", 36], ["quarter", "dime", 18], ["quarter", "quarter", 41], ["quarter", "dime", 31], ["quarter", "quarter", 46], ["quarter", "dime", 33]];
  items.push(...cycle(17, tcB3, TWO_COIN_PAY_SKELETONS, 1, twoCoinEmit(B3)));

  /* ---------------- coinEquivalence stories ---------------- */

  const MACHINE_SKELETONS = [
    (nm, from, cents, coin, plural) => `The coin machine takes ${nm}'s ${from} and gives back only ${plural}. How many ${plural} slide out?`,
    (nm, from, cents, coin, plural) => `${nm} feeds ${from} into the change machine set to ${plural}. How many ${plural} does it return?`,
  ];
  const PLURALS = { penny: "pennies", nickel: "nickels", dime: "dimes", quarter: "quarters" };
  const machineEmit = (band) => ([from, cents, coin], sk, nm) =>
    mk("coinEquivalence", `storyMachine_${band}`, band, {
      answer: cents / COIN_VALUE[coin],
      answerType: "numberPad",
      display: { money: { kind: "trade", fromCents: cents, per: COIN_VALUE[coin] }, promptText: sk(nm, from, cents, coin, PLURALS[coin]) },
    });
  const mcB1 = [["1 dime", 10, "nickel"], ["1 nickel", 5, "penny"], ["1 dime", 10, "penny"], ["2 dimes", 20, "nickel"], ["2 nickels", 10, "penny"], ["1 dime and 1 nickel", 15, "nickel"], ["3 nickels", 15, "penny"], ["2 dimes", 20, "penny"], ["1 dime and 1 nickel", 15, "penny"], ["4 nickels", 20, "dime"], ["2 nickels", 10, "dime"], ["1 dime and 2 nickels", 20, "penny"], ["2 dimes", 20, "dime"], ["10 pennies", 10, "nickel"], ["15 pennies", 15, "nickel"], ["20 pennies", 20, "dime"], ["1 dime", 10, "nickel"]];
  items.push(...cycle(17, mcB1.slice(0, 16).concat([["5 pennies", 5, "nickel"]]), MACHINE_SKELETONS, 0, machineEmit(B1)));
  const mcB2 = [["1 quarter", 25, "nickel"], ["2 quarters", 50, "dime"], ["1 quarter", 25, "penny"], ["2 quarters", 50, "nickel"], ["1 quarter and 1 nickel", 30, "dime"], ["3 quarters", 75, "nickel"], ["5 dimes", 50, "quarter"], ["10 nickels", 50, "quarter"], ["4 quarters", 100, "dime"], ["1 quarter and 1 dime", 35, "nickel"], ["2 quarters and 1 dime", 60, "dime"], ["5 nickels", 25, "quarter"], ["8 nickels", 40, "dime"], ["4 quarters", 100, "nickel"], ["1 quarter and 3 nickels", 40, "dime"], ["25 pennies", 25, "quarter"], ["6 dimes", 60, "nickel"]];
  items.push(...cycle(17, mcB2, MACHINE_SKELETONS, 1, machineEmit(B2)));
  const mcB3 = [["$1", 100, "quarter"], ["$1", 100, "dime"], ["$2", 200, "quarter"], ["$1 and 1 quarter", 125, "quarter"], ["$1", 100, "nickel"], ["$2", 200, "dime"], ["$1 and 1 dime", 110, "dime"], ["$3", 300, "quarter"], ["$1 and 2 quarters", 150, "quarter"], ["$2 and 1 dime", 210, "dime"], ["$4", 400, "quarter"], ["$1 and 3 dimes", 130, "dime"], ["$5", 500, "quarter"], ["$2 and 2 quarters", 250, "quarter"], ["$1 and 2 dimes", 120, "dime"], ["$3 and 1 quarter", 325, "quarter"], ["$2", 200, "nickel"]];
  items.push(...cycle(17, mcB3, MACHINE_SKELETONS, 2, machineEmit(B3)));

  const SWAP_SKELETONS = [
    (nm, give, get, fair) => `At the trading post, ${nm} offers ${give} for a friend's ${get}. Is that a fair trade?`,
    (nm, give, get, fair) => `${nm} suggests swapping ${give} for ${get}, value for value. Is the trade fair?`,
  ];
  const swapEmit = (band) => ([give, gv, get, tv], sk, nm) => {
    const fair = gv === tv;
    return mk("coinEquivalence", `storySwap_${band}`, band, {
      answer: fair ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { money: { kind: "eq", av: gv, bv: tv }, promptText: sk(nm, give, get, fair), truth: fair },
    });
  };
  const swB1 = [["2 nickels", 10, "1 dime", 10], ["1 dime", 10, "9 pennies", 9], ["3 nickels", 15, "1 dime and 1 nickel", 15], ["1 nickel", 5, "4 pennies", 4], ["4 nickels", 20, "2 dimes", 20], ["2 dimes", 20, "3 nickels", 15], ["1 dime", 10, "10 pennies", 10], ["2 nickels", 10, "1 dime and 1 penny", 11], ["3 nickels", 15, "15 pennies", 15], ["1 dime and 1 nickel", 15, "2 nickels", 10], ["2 dimes", 20, "20 pennies", 20], ["1 nickel", 5, "5 pennies", 5], ["4 nickels", 20, "1 dime and 1 nickel", 15], ["1 dime", 10, "2 nickels", 10], ["2 dimes", 20, "19 pennies", 19], ["3 nickels", 15, "1 dime and 4 pennies", 14], ["1 dime and 5 pennies", 15, "3 nickels", 15]];
  items.push(...cycle(17, swB1, SWAP_SKELETONS, 1, swapEmit(B1)));
  const swB2 = [["1 quarter", 25, "5 nickels", 25], ["1 quarter", 25, "2 dimes", 20], ["2 quarters", 50, "5 dimes", 50], ["1 quarter and 1 nickel", 30, "3 dimes", 30], ["2 quarters", 50, "9 nickels", 45], ["1 quarter", 25, "2 dimes and 1 nickel", 25], ["3 quarters", 75, "7 dimes", 70], ["1 quarter and 1 dime", 35, "7 nickels", 35], ["2 quarters", 50, "10 nickels", 50], ["3 quarters", 75, "15 nickels", 75], ["1 quarter and 2 dimes", 45, "8 nickels", 40], ["2 quarters and 1 dime", 60, "6 dimes", 60], ["1 quarter", 25, "24 pennies", 24], ["1 quarter and 3 nickels", 40, "4 dimes", 40], ["2 quarters", 50, "48 pennies", 48], ["3 quarters", 75, "70 pennies", 70], ["1 quarter and 1 dime and 1 nickel", 40, "8 nickels", 40]];
  items.push(...cycle(17, swB2, SWAP_SKELETONS, 0, swapEmit(B2)));
  const swB3 = [["$1", 100, "4 quarters", 100], ["$1", 100, "9 dimes", 90], ["$2", 200, "8 quarters", 200], ["$1 and 1 quarter", 125, "5 quarters", 125], ["$1", 100, "10 dimes", 100], ["$2", 200, "19 dimes", 190], ["$1 and 1 dime", 110, "11 dimes", 110], ["$3", 300, "12 quarters", 300], ["$1 and 2 quarters", 150, "6 quarters", 150], ["$2 and 1 dime", 210, "20 dimes", 200], ["$1", 100, "20 nickels", 100], ["$4", 400, "16 quarters", 400], ["$1 and 1 nickel", 105, "21 nickels", 105], ["$3", 300, "29 dimes", 290], ["$1 and 3 dimes", 130, "13 dimes", 130], ["$5", 500, "20 quarters", 500], ["$2 and 2 quarters", 250, "24 dimes", 240]];
  items.push(...cycle(17, swB3, SWAP_SKELETONS, 2, swapEmit(B3)));

  const NEED_COINS_SKELETONS = [
    (nm, target, coin, plural) => `The sticker machine only takes ${plural}. A sticker costs ${target} cents. How many ${plural} does ${nm} drop in?`,
    (nm, target, coin, plural) => `${nm} pays a ${target}-cent fare using only ${plural}. How many ${plural} is that?`,
  ];
  const needCoinsEmit = (band) => ([target, coin], sk, nm) =>
    mk("coinEquivalence", `storyNeedCoins_${band}`, band, {
      answer: target / COIN_VALUE[coin],
      answerType: "numberPad",
      display: { money: { kind: "trade", fromCents: target, per: COIN_VALUE[coin] }, promptText: sk(nm, target, coin, PLURALS[coin]) },
    });
  const ncB1 = [[10, "nickel"], [15, "nickel"], [20, "nickel"], [10, "penny"], [20, "dime"], [8, "penny"], [10, "dime"], [12, "penny"], [5, "penny"], [15, "penny"], [20, "penny"], [6, "penny"], [5, "nickel"], [14, "penny"], [18, "penny"], [16, "penny"], [9, "penny"]];
  items.push(...cycle(17, ncB1, NEED_COINS_SKELETONS, 2, needCoinsEmit(B1)));
  const ncB2 = [[25, "nickel"], [50, "dime"], [50, "quarter"], [75, "quarter"], [100, "quarter"], [30, "dime"], [45, "nickel"], [60, "dime"], [35, "nickel"], [80, "dime"], [55, "nickel"], [90, "dime"], [65, "nickel"], [40, "dime"], [70, "dime"], [85, "nickel"], [100, "dime"]];
  items.push(...cycle(17, ncB2, NEED_COINS_SKELETONS, 0, needCoinsEmit(B2)));
  const ncB3 = [[125, "quarter"], [150, "quarter"], [200, "quarter"], [110, "dime"], [130, "dime"], [175, "quarter"], [160, "dime"], [225, "quarter"], [140, "dime"], [250, "quarter"], [190, "dime"], [300, "quarter"], [210, "dime"], [275, "quarter"], [230, "dime"], [350, "quarter"], [180, "dime"]];
  items.push(...cycle(17, ncB3, NEED_COINS_SKELETONS, 1, needCoinsEmit(B3)));

  /* ---------------- moneyReasoning stories ---------------- */

  const SPEND_SKELETONS = [
    (nm, have, cost, good) => `${nm} takes ${have} cents to the fair and buys a ${cost}-cent ${good}. How many cents does ${nm} still have?`,
    (nm, have, cost, good) => `After buying a ${good} for ${cost} cents out of ${have} cents, how many cents are left in ${nm}'s pocket?`,
  ];
  const spendEmit = (band) => ([have, cost, gi], sk, nm) =>
    mk("moneyReasoning", `storySpend_${band}`, band, {
      answer: have - cost,
      answerType: "numberPad",
      display: { counting: { kind: "countBack", start: have, back: cost }, promptText: sk(nm, have, cost, GOODS[gi % 4]) },
    });
  const spB1 = [[10, 7, 0], [15, 8, 1], [20, 13, 2], [12, 5, 3], [18, 9, 0], [14, 6, 1], [16, 11, 2], [20, 4, 3], [13, 7, 0], [17, 12, 1], [19, 15, 2], [11, 3, 3], [15, 9, 0], [20, 18, 1], [16, 8, 2], [18, 14, 3], [12, 6, 0]];
  items.push(...cycle(17, spB1, SPEND_SKELETONS, 0, spendEmit(B1)));
  const spB2 = [[50, 37, 0], [75, 48, 1], [90, 66, 2], [42, 25, 3], [68, 39, 0], [84, 57, 1], [96, 71, 2], [55, 28, 3], [73, 46, 0], [87, 62, 1], [99, 75, 2], [61, 34, 3], [78, 53, 0], [92, 68, 1], [66, 41, 2], [81, 58, 3], [70, 45, 0]];
  items.push(...cycle(17, spB2, SPEND_SKELETONS, 1, spendEmit(B2)));
  const spB3 = [[200, 145, 0], [250, 168, 1], [310, 226, 2], [185, 129, 3], [268, 191, 0], [334, 257, 1], [396, 281, 2], [225, 158, 3], [273, 196, 0], [387, 262, 1], [399, 275, 2], [261, 184, 3], [278, 153, 0], [392, 318, 1], [266, 141, 2], [381, 208, 3], [329, 254, 0]];
  items.push(...cycle(17, spB3, SPEND_SKELETONS, 2, spendEmit(B3)));

  const TWO_ITEM_SKELETONS = [
    (nm, a, b, g1, g2) => `${nm} buys a ${a}-cent ${g1} and a ${b}-cent ${g2}. How many cents does ${nm} spend in all?`,
    (nm, a, b, g1, g2) => `A ${g1} costs ${a} cents and a ${g2} costs ${b} cents. ${nm} buys both. What is the total cost in cents?`,
  ];
  const twoItemEmit = (band) => ([a, b, gi], sk, nm) =>
    mk("moneyReasoning", `storyTwoItems_${band}`, band, {
      answer: a + b,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [a, b] }, promptText: sk(nm, a, b, GOODS[gi % 4], GOODS[(gi + 1) % 4]) },
    });
  const tiB1 = [[7, 6, 0], [8, 9, 1], [5, 12, 2], [6, 11, 3], [9, 4, 0], [12, 7, 1], [3, 14, 2], [8, 5, 3], [11, 6, 0], [4, 13, 1], [7, 9, 2], [15, 3, 3], [6, 8, 0], [9, 8, 1], [12, 5, 2], [2, 16, 3], [10, 7, 0]];
  items.push(...cycle(17, tiB1, TWO_ITEM_SKELETONS, 1, twoItemEmit(B1)));
  const tiB2 = [[27, 31, 0], [38, 42, 1], [49, 23, 2], [54, 19, 3], [35, 45, 0], [28, 66, 1], [59, 33, 2], [42, 39, 3], [63, 17, 0], [30, 54, 1], [47, 38, 2], [52, 28, 3], [37, 47, 0], [66, 22, 1], [44, 49, 2], [58, 31, 3], [25, 68, 0]];
  items.push(...cycle(17, tiB2, TWO_ITEM_SKELETONS, 2, twoItemEmit(B2)));
  const tiB3 = [[128, 131, 0], [160, 67, 1], [191, 104, 2], [139, 168, 3], [225, 91, 0], [158, 178, 1], [243, 87, 2], [121, 154, 3], [264, 73, 0], [150, 186, 1], [219, 96, 2], [175, 159, 3], [236, 118, 0], [163, 145, 1], [210, 127, 2], [178, 192, 3], [255, 84, 0]];
  items.push(...cycle(17, tiB3, TWO_ITEM_SKELETONS, 0, twoItemEmit(B3)));

  const EXACT_COINS_SKELETONS = [
    (nm, cents) => `${nm} wants to pay ${cents} cents exactly, carrying as few coins as possible. How many coins is that?`,
    (nm, cents) => `To pay a ${cents}-cent fare with the fewest coins, how many coins does ${nm} hand over?`,
  ];
  const exactEmit = (band) => ([cents], sk, nm) => {
    let left = cents;
    let n = 0;
    for (const d of [25, 10, 5, 1]) {
      n += Math.floor(left / d);
      left %= d;
    }
    return mk("moneyReasoning", `storyFewest_${band}`, band, {
      answer: n,
      answerType: "numberPad",
      display: { money: { kind: "fewest", cents }, promptText: sk(nm, cents) },
    });
  };
  const exB1 = [[7], [12], [16], [6], [11], [17], [13], [8], [19], [14], [3], [18], [9], [2], [15], [4], [20]];
  items.push(...cycle(17, exB1, EXACT_COINS_SKELETONS, 2, exactEmit(B1)));
  const exB2 = [[26], [31], [37], [42], [48], [53], [59], [64], [67], [72], [78], [83], [87], [91], [94], [99], [33]];
  items.push(...cycle(17, exB2, EXACT_COINS_SKELETONS, 0, exactEmit(B2)));
  const exB3 = [[126], [131], [158], [167], [189], [204], [237], [268], [291], [312], [345], [178], [223], [256], [289], [143], [199]];
  items.push(...cycle(17, exB3, EXACT_COINS_SKELETONS, 1, exactEmit(B3)));

  return items;
}
