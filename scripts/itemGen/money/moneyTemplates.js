/* Deterministic money bank items — procedural and conceptual cells for
 * countCoins, makeChange, coinEquivalence, moneyReasoning.
 *
 * Claims: coin totals ride countMath {sum} with the coin values as parts;
 * change rides {countBack} (pay - cost); save-up gaps ride {gap}; add/remove
 * a coin rides {moreLess}. Trades and fewest-coin items carry a
 * display.money claim re-derived by authorMoney.js (greedy is optimal for
 * US denominations).
 *
 * Band-1 hard rule: no prompt number over 20 — so band 1 speaks pennies,
 * nickels, and dimes (a quarter's value, 25, may never be STATED at band 1;
 * the coin may still appear on a visual tray). Visual tray counts use the
 * letter-free values caption ("10 + 5 + 1 = ? c", passes the no-words filter
 * and is globally unique per coin multiset) with
 * answerType "coinTray" + display.{coins, coinMode:"count"}.
 * Judged = "Is this right?" Yes/No + display.truth.
 */

import { rotor, shuffled, NAMES } from "../counting/countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };
export const COIN_VALUE = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
const PLURAL = { penny: "pennies", nickel: "nickels", dime: "dimes", quarter: "quarters" };

const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "money",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const nameAt = (i) => NAMES[i % NAMES.length];
const coinNoun = (n, coin) => `${n} ${n === 1 ? coin : PLURAL[coin]}`;

/** counts -> flat coin list (big to small) and total. */
const trayOf = (counts) => {
  const coins = [];
  for (const c of ["quarter", "dime", "nickel", "penny"]) {
    for (let i = 0; i < (counts[c] || 0); i += 1) coins.push(c);
  }
  return { coins, total: coins.reduce((s, c) => s + COIN_VALUE[c], 0) };
};

const phrase = (counts) => {
  const parts = ["quarter", "dime", "nickel", "penny"]
    .filter((c) => counts[c] > 0)
    .map((c) => coinNoun(counts[c], c));
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
};

const fewest = (cents) => {
  let left = cents;
  let n = 0;
  for (const d of [25, 10, 5, 1]) {
    n += Math.floor(left / d);
    left %= d;
  }
  return n;
};

/* ================================================================== */
/* countCoins                                                          */
/* ================================================================== */

export function countCoinsProcedural() {
  const items = [];

  // Band 1 — symbol-ish drills and visual trays (pennies/nickels/dimes).
  const B1_DRILLS = [
    { dime: 1, penny: 3 }, { nickel: 2, penny: 4 }, { dime: 1, nickel: 1 }, { nickel: 1, penny: 7 },
    { dime: 1, penny: 8 }, { nickel: 3, penny: 2 }, { dime: 1, nickel: 1, penny: 4 }, { nickel: 2, penny: 9 },
    { dime: 1, penny: 6 }, { nickel: 1, penny: 3 }, { nickel: 3, penny: 4 }, { dime: 1, penny: 1 },
    { nickel: 2, penny: 1 }, { dime: 1, nickel: 1, penny: 2 }, { nickel: 1, penny: 9 }, { nickel: 2, penny: 6 },
    { dime: 1, penny: 5 }, { nickel: 3, penny: 1 }, { nickel: 1, penny: 6 }, { dime: 1, penny: 9 },
  ];
  for (const counts of B1_DRILLS) {
    const { coins, total } = trayOf(counts);
    items.push(
      item("countCoins", "procedural", "coinSumTeen", "band1", {
        answer: total,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: coins.map((c) => COIN_VALUE[c]) }, promptText: `${phrase(counts)} = ? cents` },
      })
    );
  }
  const B1_TRAYS = [
    { dime: 1, penny: 2 }, { nickel: 2, penny: 3 }, { dime: 1, nickel: 1, penny: 1 }, { nickel: 1, penny: 5 },
    { dime: 1, penny: 7 }, { nickel: 2 }, { penny: 6 }, { dime: 1, nickel: 1, penny: 3 },
    { nickel: 3 }, { dime: 1, penny: 4 }, { nickel: 1, penny: 8 }, { penny: 9 },
    { nickel: 2, penny: 7 }, { dime: 1, nickel: 1, penny: 5 }, { nickel: 1, penny: 2 }, { dime: 1 },
    { nickel: 2, penny: 5 }, { penny: 4 }, { nickel: 1, penny: 4 }, { dime: 1, penny: 3 },
  ];
  B1_TRAYS.forEach((counts, i) => {
    const { coins, total } = trayOf(counts);
    items.push(
      item("countCoins", "procedural", "trayCountTeen", "band1", {
        answer: total,
        answerType: "coinTray",
        display: {
          coins: shuffled(coins, i + 2),
          coinMode: "count",
          counting: { kind: "sum", parts: coins.map((c) => COIN_VALUE[c]) },
          promptText: `${coins.map((c) => COIN_VALUE[c]).join(" + ")} = ? c`,
        },
      })
    );
  });
  for (const [coin, n] of [["penny", 1], ["nickel", 1], ["dime", 1], ["penny", 5], ["nickel", 2], ["penny", 8], ["nickel", 3], ["penny", 3], ["dime", 2], ["penny", 6], ["nickel", 4], ["penny", 7]]) {
    const total = n * COIN_VALUE[coin];
    if (total > 20) continue;
    items.push(
      item("countCoins", "procedural", "singleCoinKind", "band1", {
        answer: total,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: Array.from({ length: n }, () => COIN_VALUE[coin]) }, promptText: `${coinNoun(n, coin)} = ? cents` },
      })
    );
  }

  // Band 2 — quarters join; mixed drills and trays.
  const B2_DRILLS = [
    { quarter: 1, dime: 1, penny: 3 }, { quarter: 2, nickel: 1 }, { quarter: 1, nickel: 2, penny: 4 },
    { quarter: 1, dime: 2 }, { quarter: 2, penny: 7 }, { dime: 3, nickel: 1, penny: 2 },
    { quarter: 1, dime: 1, nickel: 1, penny: 1 }, { quarter: 3 }, { dime: 4, penny: 6 },
    { quarter: 2, dime: 1, penny: 2 }, { quarter: 1, penny: 9 }, { dime: 5, nickel: 1 },
    { quarter: 2, dime: 2, nickel: 1 }, { quarter: 1, nickel: 4 }, { dime: 6, penny: 3 },
    { quarter: 3, penny: 4 }, { quarter: 1, dime: 3, penny: 1 }, { dime: 2, nickel: 3, penny: 8 },
  ];
  for (const counts of B2_DRILLS) {
    const { coins, total } = trayOf(counts);
    items.push(
      item("countCoins", "procedural", "coinSumMid", "band2", {
        answer: total,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: coins.map((c) => COIN_VALUE[c]) }, promptText: `${phrase(counts)} = ? cents` },
      })
    );
  }
  const B2_TRAYS = [
    { quarter: 1, dime: 1, penny: 1 }, { quarter: 1, nickel: 2 }, { quarter: 2, penny: 3 },
    { quarter: 1, dime: 2, nickel: 1 }, { dime: 3, penny: 4 }, { quarter: 2, dime: 1 },
    { quarter: 1, dime: 1, nickel: 1, penny: 2 }, { dime: 4, nickel: 2 }, { quarter: 2, nickel: 1, penny: 4 },
    { quarter: 1, penny: 8 }, { dime: 5, penny: 2 }, { quarter: 3, dime: 1 },
    { quarter: 1, dime: 2, penny: 5 }, { dime: 2, nickel: 4 }, { quarter: 2, dime: 2, penny: 1 },
    { quarter: 1, nickel: 3, penny: 2 },
  ];
  B2_TRAYS.forEach((counts, i) => {
    const { coins, total } = trayOf(counts);
    items.push(
      item("countCoins", "procedural", "trayCountMid", "band2", {
        answer: total,
        answerType: "coinTray",
        display: {
          coins: shuffled(coins, i + 5),
          coinMode: "count",
          counting: { kind: "sum", parts: coins.map((c) => COIN_VALUE[c]) },
          promptText: `${coins.map((c) => COIN_VALUE[c]).join(" + ")} = ? c`,
        },
      })
    );
  });
  for (const [counts, add] of [
    [{ quarter: 1, dime: 1 }, "nickel"], [{ quarter: 2 }, "nickel"], [{ dime: 3 }, "quarter"],
    [{ quarter: 1, nickel: 2 }, "dime"], [{ dime: 4, penny: 2 }, "nickel"], [{ quarter: 2, penny: 3 }, "dime"],
    [{ quarter: 1, dime: 2, nickel: 1 }, "penny"], [{ dime: 5 }, "quarter"], [{ quarter: 3 }, "dime"],
    [{ quarter: 2, dime: 1, nickel: 1 }, "nickel"], [{ dime: 2, nickel: 3 }, "quarter"], [{ quarter: 1, penny: 6 }, "dime"],
    [{ quarter: 2, dime: 2 }, "penny"], [{ dime: 6, nickel: 1 }, "quarter"], [{ quarter: 3, nickel: 1 }, "nickel"],
    [{ quarter: 1, dime: 3 }, "quarter"], [{ dime: 4, nickel: 2 }, "dime"],
  ]) {
    const { total } = trayOf(counts);
    items.push(
      item("countCoins", "procedural", "addOneCoin", "band2", {
        answer: total + COIN_VALUE[add],
        answerType: "numberPad",
        display: {
          counting: { kind: "moreLess", n: total, delta: COIN_VALUE[add] },
          promptText: `A pile is worth ${total} cents. Add 1 ${add}. Now it is worth ? cents`,
        },
      })
    );
  }

  // Band 3 — dollar notation and bigger sums.
  const B3_NOTATION = [130, 145, 160, 175, 205, 230, 255, 280, 305, 350, 115, 120, 165, 240, 190, 210, 335, 265];
  for (const cents of B3_NOTATION) {
    const dollars = Math.floor(cents / 100);
    const rest = cents % 100;
    items.push(
      item("countCoins", "procedural", "dollarToCents", "band3", {
        answer: cents,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [dollars * 100, rest] }, promptText: `$${dollars}.${String(rest).padStart(2, "0")} = ? cents` },
      })
    );
  }
  const B3_SUMS = [
    { quarter: 5, dime: 2 }, { quarter: 4, nickel: 3, penny: 4 }, { quarter: 6, penny: 8 },
    { quarter: 5, dime: 3, nickel: 1 }, { quarter: 7, dime: 1 }, { quarter: 4, dime: 4, penny: 2 },
    { quarter: 8, nickel: 2 }, { quarter: 6, dime: 2, penny: 6 }, { quarter: 5, nickel: 4, penny: 1 },
    { quarter: 9, penny: 3 }, { quarter: 7, dime: 2, nickel: 1 }, { quarter: 4, dime: 5 },
    { quarter: 8, dime: 1, penny: 9 }, { quarter: 6, nickel: 3 }, { quarter: 9, dime: 2 },
    { quarter: 5, dime: 4, penny: 7 }, { quarter: 7, nickel: 2, penny: 2 },
  ];
  for (const counts of B3_SUMS) {
    const { coins, total } = trayOf(counts);
    items.push(
      item("countCoins", "procedural", "coinSumBig", "band3", {
        answer: total,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: coins.map((c) => COIN_VALUE[c]) }, promptText: `${phrase(counts)} = ? cents` },
      })
    );
  }
  for (const cents of [130, 155, 180, 205, 245, 270, 310, 335, 365, 220, 195, 285, 140, 260, 375, 115]) {
    const dollars = Math.floor(cents / 100);
    const rest = cents % 100;
    items.push(
      item("countCoins", "procedural", "centsToDollar", "band3", {
        answer: rest,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have: dollars * 100, target: cents }, promptText: `${cents} cents = $${dollars} and ? cents` },
      })
    );
  }

  return items;
}

export function countCoinsConceptual() {
  const items = [];
  let seed = 81;

  // Band 1 — coin value judged + count-vs-value misconception.
  const valueJudgePhr = rotor([
    (nm, coin, said) => `${nm} says one ${coin} is worth ${said} cents. Is ${nm} right?`,
    (nm, coin, said) => `${nm} trades a ${coin} as if it were ${said} cents. Is that right?`,
  ]);
  [["penny", 1, true], ["nickel", 5, true], ["dime", 10, true], ["nickel", 1, false], ["dime", 5, false], ["penny", 5, false], ["dime", 10, true], ["nickel", 5, true], ["penny", 2, false], ["dime", 1, false], ["nickel", 10, false], ["penny", 1, true], ["dime", 20, false], ["nickel", 6, false], ["penny", 10, false], ["dime", 10, true], ["nickel", 5, true], ["penny", 1, true]].forEach(([coin, said, ok], i) => {
    items.push(
      item("countCoins", "conceptual", "coinValueJudge", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { money: { kind: "coinValue", coin, said }, promptText: valueJudgePhr()(nameAt(i * 3 + 1), coin, said), truth: ok },
      })
    );
  });
  const countVsValuePhr = rotor([
    (nm, counts, said) => `${nm} holds ${phrase(counts)} and says "${said} cents" after counting the coins one by one. Is ${nm} right?`,
    (nm, counts, said) => `${nm} counts ${phrase(counts)} as ${said} cents — one cent per coin. Is that right?`,
  ]);
  [
    [{ dime: 1, penny: 2 }, false], [{ nickel: 2, penny: 1 }, false], [{ penny: 4 }, true], [{ nickel: 1, penny: 3 }, false],
    [{ penny: 7 }, true], [{ dime: 1, nickel: 1 }, false], [{ penny: 2 }, true], [{ nickel: 3 }, false],
    [{ penny: 9 }, true], [{ dime: 1, penny: 5 }, false], [{ penny: 6 }, true], [{ nickel: 2, penny: 4 }, false],
    [{ penny: 3 }, true], [{ nickel: 1, penny: 6 }, false], [{ penny: 8 }, true], [{ dime: 1, penny: 8 }, false],
  ].forEach(([counts, ok], i) => {
    const { coins } = trayOf(counts);
    const said = coins.length; // the count-the-coins-not-the-value slip
    items.push(
      item("countCoins", "conceptual", "countVsValueJudge", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { money: { kind: "countVsValue", counts, said }, promptText: countVsValuePhr()(nameAt(i * 3 + 4), counts, said), truth: ok },
      })
    );
  });
  const whichTotalPhr = rotor([
    (nm, counts) => `${nm} empties a pocket: ${phrase(counts)}. Which total is right?`,
    (nm, counts) => `In ${nm}'s purse sit ${phrase(counts)}. Which amount is that?`,
  ]);
  [
    { dime: 1, penny: 4 }, { nickel: 2, penny: 2 }, { dime: 1, nickel: 1, penny: 3 }, { nickel: 1, penny: 8 },
    { dime: 1, penny: 9 }, { nickel: 3, penny: 3 }, { dime: 1, nickel: 1 }, { nickel: 2, penny: 8 },
    { dime: 1, penny: 2 }, { nickel: 1, penny: 4 }, { nickel: 3, penny: 5 }, { dime: 1, nickel: 1, penny: 5 },
    { nickel: 2, penny: 3 }, { dime: 1, penny: 6 }, { nickel: 1, penny: 1 }, { nickel: 2 },
  ].forEach((counts, i) => {
    const { coins, total } = trayOf(counts);
    const wrong = [...new Set([coins.length, total + 5, total - 1])].filter((w) => w !== total && w > 0);
    items.push(
      item("countCoins", "conceptual", "whichTotalTeen", "band1", {
        answer: total,
        choices: shuffled([total, ...wrong.slice(0, 3)], (seed += 1)),
        display: { counting: { kind: "sum", parts: coins.map((c) => COIN_VALUE[c]) }, promptText: whichTotalPhr()(nameAt(i * 3 + 7), counts) },
      })
    );
  });

  // Band 2 — quarter value judged; which-total with quarters; order of counting.
  [["quarter", 25, true], ["quarter", 20, false], ["quarter", 25, true], ["quarter", 15, false], ["quarter", 24, false], ["quarter", 25, true], ["quarter", 30, false], ["quarter", 5, false], ["quarter", 25, true], ["quarter", 35, false], ["quarter", 25, true], ["quarter", 26, false], ["quarter", 25, true], ["quarter", 10, false], ["quarter", 25, true], ["quarter", 21, false]].forEach(([coin, said, ok], i) => {
    items.push(
      item("countCoins", "conceptual", "quarterValueJudge", "band2", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { money: { kind: "coinValue", coin, said }, promptText: valueJudgePhr()(nameAt(i * 3 + 2), coin, said), truth: ok },
      })
    );
  });
  [
    { quarter: 1, dime: 1, penny: 2 }, { quarter: 2, nickel: 1 }, { quarter: 1, nickel: 2, penny: 3 },
    { quarter: 1, dime: 2, penny: 1 }, { quarter: 2, penny: 6 }, { dime: 3, nickel: 2 },
    { quarter: 1, dime: 1, nickel: 1 }, { quarter: 3, penny: 2 }, { dime: 4, penny: 5 },
    { quarter: 2, dime: 1, nickel: 1 }, { quarter: 1, penny: 7 }, { dime: 5, nickel: 2 },
    { quarter: 2, dime: 2 }, { quarter: 1, nickel: 3, penny: 1 }, { dime: 6, penny: 2 }, { quarter: 3, dime: 1, penny: 3 },
  ].forEach((counts, i) => {
    const { coins, total } = trayOf(counts);
    const wrong = [...new Set([coins.length, total + 5, total - 5])].filter((w) => w !== total && w > 0);
    items.push(
      item("countCoins", "conceptual", "whichTotalMid", "band2", {
        answer: total,
        choices: shuffled([total, ...wrong.slice(0, 3)], (seed += 1)),
        display: { counting: { kind: "sum", parts: coins.map((c) => COIN_VALUE[c]) }, promptText: whichTotalPhr()(nameAt(i * 3 + 5), counts) },
      })
    );
  });
  const orderPhr = rotor([
    (nm) => `${nm} counts a pile of mixed coins smallest first, then biggest first. Do the two counts give the same total?`,
    (nm) => `${nm} wonders: does counting coins in a different order change the total?  ${nm} says no. Is ${nm} right?`,
  ]);
  for (let i = 0; i < 18; i += 1) {
    const phrIdx = i % 2;
    items.push(
      item("countCoins", "conceptual", "orderInvariance", "band2", {
        answer: "Yes",
        choices: ["Yes", "No"],
        display: { money: { kind: "orderInvariance" }, promptText: orderPhr()(nameAt(i * 3 + 8)), truth: true },
      })
    );
  }

  // Band 3 — dollar notation judged + which-notation.
  const notationJudgePhr = rotor([
    (nm, cents, saidD) => `${nm} writes ${cents} cents as $${saidD}. Is ${nm} right?`,
    (nm, cents, saidD) => `${nm} puts ${cents} cents into dollar form: $${saidD}. Is that right?`,
  ]);
  [[130, "1.30", true], [145, "1.45", true], [160, "1.06", false], [175, "1.75", true], [205, "2.50", false], [230, "2.30", true], [255, "2.55", true], [280, "2.08", false], [305, "3.05", true], [350, "3.50", true], [115, "1.51", false], [120, "1.20", true], [165, "1.65", true], [240, "2.04", false], [190, "1.90", true], [210, "2.10", true], [335, "3.53", false], [265, "2.65", true]].forEach(([cents, saidD, ok], i) => {
    items.push(
      item("countCoins", "conceptual", "notationJudge", "band3", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { money: { kind: "notation", cents, saidD }, promptText: notationJudgePhr()(nameAt(i * 3 + 3), cents, saidD), truth: ok },
      })
    );
  });
  const whichNotationPhr = rotor([
    (nm, cents) => `${nm} needs to write ${cents} cents with a dollar sign. Which form is right?`,
    (nm, cents) => `Which dollar form shows ${cents} cents? ${nm} is labeling a price tag.`,
  ]);
  [130, 145, 160, 175, 205, 230, 255, 280, 305, 350, 115, 120, 165, 240, 190, 210].forEach((cents, i) => {
    const d = Math.floor(cents / 100);
    const r = cents % 100;
    const good = `$${d}.${String(r).padStart(2, "0")}`;
    const swap = `$${d}.${String(r).padStart(2, "0").split("").reverse().join("")}`;
    const wrong = [...new Set([`$${d + 1}.${String(r).padStart(2, "0")}`, swap, `$${d}.${String((r + 10) % 100).padStart(2, "0")}`])].filter((w) => w !== good);
    items.push(
      item("countCoins", "conceptual", "whichNotation", "band3", {
        answer: good,
        choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
        display: { money: { kind: "notationPick", cents }, promptText: whichNotationPhr()(nameAt(i * 3 + 6), cents) },
      })
    );
  });
  const biggerPilePhr = rotor([
    (nm, a, b) => `${nm} compares two jars: one holds ${a} cents, the other $1 and ${b} cents. Which jar holds more?`,
    (nm, a, b) => `Jar A holds ${a} cents. Jar B holds $1 and ${b} cents. ${nm} wants the bigger one. Which is it?`,
  ]);
  [[130, 25], [95, 10], [145, 40], [120, 30], [180, 70], [105, 15], [160, 55], [90, 5], [175, 80], [110, 20], [150, 45], [85, 0], [195, 90], [125, 35], [140, 50], [115, 25]].forEach(([a, b], i) => {
    const bTotal = 100 + b;
    items.push(
      item("countCoins", "conceptual", "compareNotation", "band3", {
        answer: a > bTotal ? "Jar A" : "Jar B",
        choices: ["Jar A", "Jar B"],
        display: { money: { kind: "compare", a, b: bTotal }, promptText: biggerPilePhr()(nameAt(i * 3 + 9), a, b) },
      })
    );
  });

  return items;
}

/* ================================================================== */
/* makeChange                                                          */
/* ================================================================== */

export function makeChangeProcedural() {
  const items = [];

  // Band 1 — change within 20 (pay with dimes/small amounts).
  const changeDrill = (structureType, band, pay, cost) =>
    item("makeChange", "procedural", structureType, band, {
      answer: pay - cost,
      answerType: "numberPad",
      display: { counting: { kind: "countBack", start: pay, back: cost }, promptText: `Pay ${pay} cents for a ${cost}-cent toy. Change = ? cents` },
    });
  for (const [pay, cost] of [[10, 7], [10, 4], [10, 8], [10, 2], [10, 6], [10, 3], [10, 9], [10, 1], [15, 12], [15, 8], [15, 11], [15, 6], [20, 17], [20, 13], [20, 15], [20, 9], [20, 18], [20, 11], [20, 6], [15, 4], [20, 14], [15, 9], [20, 16], [10, 5], [20, 12], [15, 13]]) {
    items.push(changeDrill("changeTeen", "band1", pay, cost));
  }
  for (const [have, target] of [[7, 10], [4, 10], [8, 10], [2, 10], [12, 15], [6, 15], [11, 15], [13, 20], [17, 20], [9, 20], [15, 20], [3, 10], [14, 20], [8, 15], [16, 20], [5, 10], [18, 20], [9, 15], [11, 20], [6, 10], [13, 15], [7, 20], [14, 15], [12, 20], [1, 10], [19, 20]]) {
    items.push(
      item("makeChange", "procedural", "saveUpTeen", "band1", {
        answer: target - have,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have, target }, promptText: `${have} cents saved. ? more cents make ${target} cents` },
      })
    );
  }

  // Band 2 — change from quarters and dollar halves.
  for (const [pay, cost] of [[25, 18], [25, 12], [25, 21], [25, 9], [50, 37], [50, 24], [50, 43], [50, 16], [25, 6], [50, 31], [25, 14], [50, 48], [25, 19], [50, 22], [25, 3], [50, 39], [25, 16], [50, 27], [25, 11], [50, 45], [25, 23], [50, 8], [25, 7], [50, 33], [30, 19], [40, 26]]) {
    items.push(changeDrill("changeMid", "band2", pay, cost));
  }
  for (const [have, target] of [[18, 25], [12, 25], [37, 50], [24, 50], [43, 50], [16, 25], [31, 50], [9, 25], [48, 50], [21, 25], [22, 50], [6, 25], [39, 50], [14, 25], [27, 50], [19, 25], [45, 50], [11, 25], [33, 50], [23, 25], [29, 50], [7, 25], [41, 50], [17, 25], [36, 50], [13, 25]]) {
    items.push(
      item("makeChange", "procedural", "saveUpMid", "band2", {
        answer: target - have,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have, target }, promptText: `${have} cents saved. ? more cents make ${target} cents` },
      })
    );
  }

  // Band 3 — change from a dollar and beyond.
  for (const [pay, cost] of [[100, 67], [100, 43], [100, 81], [100, 29], [100, 56], [100, 92], [100, 34], [100, 78], [200, 145], [200, 168], [200, 123], [200, 187], [100, 12], [200, 154], [100, 88], [200, 109], [100, 61], [200, 176], [100, 47], [200, 132], [100, 95], [200, 118], [100, 73], [200, 161], [100, 26], [200, 139]]) {
    items.push(changeDrill("changeBig", "band3", pay, cost));
  }
  for (const [have, target] of [[67, 100], [43, 100], [81, 100], [29, 100], [145, 200], [168, 200], [123, 200], [56, 100], [187, 200], [92, 100], [154, 200], [34, 100], [109, 200], [78, 100], [176, 200], [12, 100], [132, 200], [88, 100], [118, 200], [61, 100], [161, 200], [47, 100], [139, 200], [95, 100], [126, 200], [73, 100]]) {
    items.push(
      item("makeChange", "procedural", "saveUpBig", "band3", {
        answer: target - have,
        answerType: "numberPad",
        display: { counting: { kind: "gap", have, target }, promptText: `${have} cents saved. ? more cents make ${target} cents` },
      })
    );
  }

  return items;
}

export function makeChangeConceptual() {
  const items = [];
  let seed = 91;

  const judgePhr = rotor([
    (nm, pay, cost, said) => `${nm} pays ${pay} cents for a ${cost}-cent snack and expects ${said} cents back. Is ${nm} right?`,
    (nm, pay, cost, said) => `After paying ${pay} cents for a ${cost}-cent sticker, ${nm} counts on ${said} cents of change. Is that right?`,
  ]);
  const judgeChange = (band, data) =>
    data.forEach(([pay, cost, ok], i) => {
      const right = pay - cost;
      const said = ok ? right : right + (i % 2 === 0 ? 1 : -1);
      items.push(
        item("makeChange", "conceptual", `changeJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { money: { kind: "changeSaid", pay, cost, said }, promptText: judgePhr()(nameAt(i * 3 + seed), pay, cost, said), truth: ok },
        })
      );
    });
  judgeChange("band1", [[10, 7, true], [10, 4, false], [10, 8, true], [10, 2, false], [15, 12, true], [15, 8, false], [20, 17, true], [20, 13, false], [10, 6, true], [15, 11, false], [20, 15, true], [10, 3, false], [15, 6, true], [20, 9, false], [10, 9, true], [20, 18, false], [15, 4, true], [20, 11, false]]);
  judgeChange("band2", [[25, 18, true], [25, 12, false], [50, 37, true], [50, 24, false], [25, 21, true], [50, 43, false], [25, 9, true], [50, 16, false], [25, 6, true], [50, 31, false], [25, 14, true], [50, 48, false], [25, 19, true], [50, 22, false], [25, 16, true], [50, 39, false], [25, 11, true], [50, 27, false]]);
  judgeChange("band3", [[100, 67, true], [100, 43, false], [100, 81, true], [200, 145, false], [100, 29, true], [200, 168, false], [100, 56, true], [200, 123, false], [100, 92, true], [200, 187, false], [100, 34, true], [200, 154, false], [100, 78, true], [200, 109, false], [100, 12, true], [200, 176, false], [100, 61, true], [200, 132, false]]);

  const whichChangePhr = rotor([
    (nm, pay, cost) => `${nm} hands over ${pay} cents for a ${cost}-cent eraser. Which change is right?`,
    (nm, pay, cost) => `A ${cost}-cent charm, paid with ${pay} cents — which amount of change should ${nm} get?`,
  ]);
  const whichChange = (band, data) =>
    data.forEach(([pay, cost], i) => {
      const right = pay - cost;
      const wrong = [...new Set([right + 1, right - 1, pay + cost > right ? cost - (pay - cost) : right + 5])].filter((w) => w !== right && w > 0);
      items.push(
        item("makeChange", "conceptual", `whichChange_${band}`, band, {
          answer: right,
          choices: shuffled([right, ...wrong.slice(0, 3)], (seed += 1)),
          display: { counting: { kind: "countBack", start: pay, back: cost }, promptText: whichChangePhr()(nameAt(i * 3 + seed), pay, cost) },
        })
      );
    });
  whichChange("band1", [[10, 7], [10, 4], [10, 8], [15, 12], [15, 8], [20, 17], [20, 13], [10, 6], [15, 11], [20, 15], [10, 3], [15, 6], [20, 9], [10, 2], [20, 18], [15, 4]]);
  whichChange("band2", [[25, 18], [25, 12], [50, 37], [50, 24], [25, 21], [50, 43], [25, 9], [50, 16], [25, 6], [50, 31], [25, 14], [50, 48], [25, 19], [50, 22], [25, 16], [50, 39]]);
  whichChange("band3", [[100, 67], [100, 43], [100, 81], [200, 145], [100, 29], [200, 168], [100, 56], [200, 123], [100, 92], [200, 187], [100, 34], [200, 154], [100, 78], [200, 109], [100, 12], [200, 176]]);

  const enoughBackPhr = rotor([
    (nm, pay, cost) => `${nm} pays ${pay} cents for a ${cost}-cent item. Should ${nm} get change back at all?`,
    (nm, pay, cost) => `The toy costs ${cost} cents and ${nm} pays ${pay} cents. Does any change come back?`,
  ]);
  const enoughBack = (band, data) =>
    data.forEach(([pay, cost], i) => {
      const truth = pay > cost;
      items.push(
        item("makeChange", "conceptual", `anyChange_${band}`, band, {
          answer: truth ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { money: { kind: "anyChange", pay, cost }, promptText: enoughBackPhr()(nameAt(i * 3 + seed), pay, cost), truth },
        })
      );
    });
  enoughBack("band1", [[10, 7], [10, 10], [15, 12], [15, 15], [20, 17], [20, 20], [10, 6], [15, 15], [20, 14], [10, 10], [15, 9], [20, 20], [10, 8], [15, 15], [20, 16], [10, 10], [15, 13], [20, 19]]);
  enoughBack("band2", [[25, 18], [25, 25], [50, 37], [50, 50], [25, 21], [50, 43], [25, 25], [50, 50], [25, 9], [50, 31], [25, 25], [50, 48], [25, 19], [50, 50], [25, 16], [50, 39], [25, 25], [50, 27]]);
  enoughBack("band3", [[100, 67], [100, 100], [200, 145], [200, 200], [100, 81], [200, 168], [100, 100], [200, 123], [100, 92], [200, 200], [100, 34], [200, 154], [100, 100], [200, 109], [100, 78], [200, 200], [100, 61], [200, 176]]);

  return items;
}

/* ================================================================== */
/* coinEquivalence                                                     */
/* ================================================================== */

export function coinEquivalenceProcedural() {
  const items = [];

  const tradeDrill = (structureType, band, fromPhrase, fromCents, toCoin) => {
    const per = COIN_VALUE[toCoin];
    return item("coinEquivalence", "procedural", structureType, band, {
      answer: fromCents / per,
      answerType: "numberPad",
      display: { money: { kind: "trade", fromCents, per }, promptText: `${fromPhrase} = ? ${PLURAL[toCoin]}` },
    });
  };
  // Band 1 — dimes/nickels/pennies only, values <= 20.
  items.push(tradeDrill("tradeTeen", "band1", "1 dime", 10, "nickel"));
  items.push(tradeDrill("tradeTeen", "band1", "1 dime", 10, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "1 nickel", 5, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "2 dimes", 20, "nickel"));
  items.push(tradeDrill("tradeTeen", "band1", "2 dimes", 20, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "2 nickels", 10, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "3 nickels", 15, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "1 dime and 1 nickel", 15, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "1 dime and 1 nickel", 15, "nickel"));
  items.push(tradeDrill("tradeTeen", "band1", "4 nickels", 20, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "2 dimes", 20, "dime"));
  items.push(tradeDrill("tradeTeen", "band1", "4 nickels", 20, "dime"));
  items.push(tradeDrill("tradeTeen", "band1", "2 nickels", 10, "dime"));
  items.push(tradeDrill("tradeTeen", "band1", "10 pennies", 10, "dime"));
  items.push(tradeDrill("tradeTeen", "band1", "10 pennies", 10, "nickel"));
  items.push(tradeDrill("tradeTeen", "band1", "5 pennies", 5, "nickel"));
  items.push(tradeDrill("tradeTeen", "band1", "15 pennies", 15, "nickel"));
  items.push(tradeDrill("tradeTeen", "band1", "20 pennies", 20, "nickel"));
  items.push(tradeDrill("tradeTeen", "band1", "20 pennies", 20, "dime"));
  items.push(tradeDrill("tradeTeen", "band1", "1 dime and 2 nickels", 20, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "2 nickels and 5 pennies", 15, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "1 dime and 5 pennies", 15, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "1 dime and 10 pennies", 20, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "3 nickels and 5 pennies", 20, "penny"));
  items.push(tradeDrill("tradeTeen", "band1", "1 nickel and 5 pennies", 10, "penny"));
  // How many N-cent coins make M cents (missing count).
  for (const [target, coin] of [[10, "nickel"], [15, "nickel"], [20, "nickel"], [10, "penny"], [6, "penny"], [20, "dime"], [10, "dime"], [8, "penny"], [20, "penny"], [12, "penny"], [5, "penny"], [15, "penny"], [4, "penny"], [18, "penny"], [3, "penny"], [16, "penny"], [14, "penny"], [9, "penny"], [5, "nickel"], [11, "penny"], [17, "penny"], [2, "penny"], [13, "penny"], [7, "penny"], [19, "penny"], [1, "penny"], [20, "nickel"], [15, "nickel"], [10, "nickel"], [10, "dime"], [20, "dime"], [6, "penny"]].slice(0, 26)) {
    const per = COIN_VALUE[coin];
    if (target % per !== 0) continue;
    items.push(
      item("coinEquivalence", "procedural", "coinsForAmountTeen", "band1", {
        answer: target / per,
        answerType: "numberPad",
        display: { money: { kind: "trade", fromCents: target, per }, promptText: `? ${PLURAL[coin]} make ${target} cents` },
      })
    );
  }

  // Band 2 — quarters and half-dollar amounts.
  const B2 = [
    ["1 quarter", 25, "nickel"], ["1 quarter", 25, "penny"], ["2 quarters", 50, "dime"], ["2 quarters", 50, "nickel"],
    ["1 quarter and 1 nickel", 30, "dime"], ["1 quarter and 1 nickel", 30, "nickel"], ["3 quarters", 75, "nickel"],
    ["2 quarters", 50, "penny"], ["1 quarter and 2 nickels", 35, "nickel"], ["5 dimes", 50, "quarter"],
    ["10 nickels", 50, "quarter"], ["5 nickels", 25, "quarter"], ["2 dimes and 1 nickel", 25, "quarter"],
    ["4 quarters", 100, "dime"], ["4 quarters", 100, "nickel"], ["1 quarter and 1 dime", 35, "nickel"],
    ["3 quarters", 75, "quarter"], ["25 pennies", 25, "quarter"], ["2 quarters and 1 dime", 60, "dime"],
    ["1 quarter and 3 nickels", 40, "dime"], ["50 pennies", 50, "quarter"], ["2 quarters and 1 nickel", 55, "nickel"],
    ["6 dimes", 60, "nickel"], ["1 quarter and 1 dime and 1 nickel", 40, "nickel"], ["8 nickels", 40, "dime"], ["30 pennies", 30, "dime"],
  ];
  for (const [fromPhrase, cents, toCoin] of B2) {
    items.push(tradeDrill("tradeMid", "band2", fromPhrase, cents, toCoin));
  }
  for (const [target, coin] of [[25, "nickel"], [50, "dime"], [50, "quarter"], [75, "quarter"], [100, "quarter"], [30, "dime"], [45, "nickel"], [60, "dime"], [35, "nickel"], [80, "dime"], [55, "nickel"], [90, "dime"], [65, "nickel"], [40, "dime"], [70, "dime"], [85, "nickel"], [95, "nickel"], [100, "dime"], [75, "nickel"], [50, "nickel"], [25, "penny"], [60, "nickel"], [90, "nickel"], [30, "nickel"], [80, "nickel"], [100, "nickel"]]) {
    const per = COIN_VALUE[coin];
    if (target % per !== 0) continue;
    items.push(
      item("coinEquivalence", "procedural", "coinsForAmountMid", "band2", {
        answer: target / per,
        answerType: "numberPad",
        display: { money: { kind: "trade", fromCents: target, per }, promptText: `? ${PLURAL[coin]} make ${target} cents` },
      })
    );
  }

  // Band 3 — dollars.
  const B3 = [
    ["$1", 100, "quarter"], ["$1", 100, "dime"], ["$1", 100, "nickel"], ["$2", 200, "quarter"],
    ["$1 and 1 quarter", 125, "quarter"], ["$2", 200, "dime"], ["$1 and 2 dimes", 120, "dime"], ["$3", 300, "quarter"],
    ["$1 and 1 dime", 110, "dime"], ["$2 and 2 quarters", 250, "quarter"], ["$1 and 4 nickels", 120, "nickel"], ["$3", 300, "dime"],
    ["$1 and 1 nickel", 105, "nickel"], ["$2 and 1 dime", 210, "dime"], ["$4", 400, "quarter"], ["$1 and 3 dimes", 130, "dime"],
    ["$2 and 3 nickels", 215, "nickel"], ["$5", 500, "quarter"], ["$1 and 2 quarters", 150, "quarter"], ["$4", 400, "dime"],
    ["$2 and 4 dimes", 240, "dime"], ["$1 and 8 nickels", 140, "nickel"], ["$5", 500, "dime"], ["$3 and 1 quarter", 325, "quarter"],
    ["$2 and 2 dimes", 220, "dime"], ["$1 and 9 nickels", 145, "nickel"],
  ];
  for (const [fromPhrase, cents, toCoin] of B3) {
    items.push(tradeDrill("tradeBig", "band3", fromPhrase, cents, toCoin));
  }
  for (const [target, coin] of [[125, "quarter"], [150, "quarter"], [200, "quarter"], [110, "dime"], [130, "dime"], [175, "quarter"], [160, "dime"], [225, "quarter"], [140, "dime"], [250, "quarter"], [190, "dime"], [300, "quarter"], [210, "dime"], [275, "quarter"], [230, "dime"], [350, "quarter"], [180, "dime"], [400, "quarter"], [260, "dime"], [325, "quarter"], [170, "dime"], [375, "quarter"], [220, "dime"], [425, "quarter"], [240, "dime"], [450, "quarter"]]) {
    const per = COIN_VALUE[coin];
    if (target % per !== 0) continue;
    items.push(
      item("coinEquivalence", "procedural", "coinsForAmountBig", "band3", {
        answer: target / per,
        answerType: "numberPad",
        display: { money: { kind: "trade", fromCents: target, per }, promptText: `? ${PLURAL[coin]} make ${target} cents` },
      })
    );
  }

  return items;
}

export function coinEquivalenceConceptual() {
  const items = [];
  let seed = 101;

  const eqJudgePhr = rotor([
    (nm, a, b) => `${nm} says ${a} and ${b} are worth the same. Is ${nm} right?`,
    (nm, a, b) => `${nm} would trade ${a} for ${b} straight across. Is that a fair trade?`,
  ]);
  const eqJudge = (band, data) =>
    data.forEach(([a, av, b, bv], i) => {
      const truth = av === bv;
      items.push(
        item("coinEquivalence", "conceptual", `eqJudge_${band}`, band, {
          answer: truth ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { money: { kind: "eq", av, bv }, promptText: eqJudgePhr()(nameAt(i * 3 + seed), a, b), truth },
        })
      );
    });
  eqJudge("band1", [
    ["2 nickels", 10, "1 dime", 10], ["1 dime", 10, "8 pennies", 8], ["3 nickels", 15, "1 dime and 1 nickel", 15],
    ["1 nickel", 5, "5 pennies", 5], ["2 dimes", 20, "3 nickels", 15], ["4 nickels", 20, "2 dimes", 20],
    ["1 dime", 10, "10 pennies", 10], ["2 nickels", 10, "9 pennies", 9], ["1 dime and 1 nickel", 15, "15 pennies", 15],
    ["3 nickels", 15, "12 pennies", 12], ["2 dimes", 20, "20 pennies", 20], ["1 nickel", 5, "6 pennies", 6],
    ["2 nickels and 2 pennies", 12, "1 dime and 2 pennies", 12], ["1 dime", 10, "2 nickels", 10],
    ["4 nickels", 20, "18 pennies", 18], ["1 dime and 5 pennies", 15, "3 nickels", 15],
    ["2 dimes", 20, "4 nickels", 20], ["1 nickel and 3 pennies", 8, "8 pennies", 8],
  ]);
  eqJudge("band2", [
    ["1 quarter", 25, "5 nickels", 25], ["1 quarter", 25, "2 dimes", 20], ["2 quarters", 50, "5 dimes", 50],
    ["1 quarter and 1 nickel", 30, "3 dimes", 30], ["1 quarter", 25, "25 pennies", 25], ["2 quarters", 50, "4 dimes and 1 nickel", 45],
    ["1 quarter and 1 dime", 35, "7 nickels", 35], ["3 quarters", 75, "7 dimes", 70], ["1 quarter and 2 dimes", 45, "9 nickels", 45],
    ["2 quarters", 50, "10 nickels", 50], ["1 quarter and 1 nickel", 30, "6 nickels", 30], ["3 quarters", 75, "15 nickels", 75],
    ["1 quarter", 25, "2 dimes and 1 nickel", 25], ["2 quarters and 1 dime", 60, "6 dimes", 60],
    ["1 quarter and 3 nickels", 40, "4 dimes", 40], ["3 quarters", 75, "70 pennies", 70],
    ["2 quarters", 50, "45 pennies", 45], ["1 quarter and 1 dime and 1 nickel", 40, "8 nickels", 40],
  ]);
  eqJudge("band3", [
    ["$1", 100, "4 quarters", 100], ["$1", 100, "9 dimes", 90], ["$2", 200, "8 quarters", 200],
    ["$1 and 1 quarter", 125, "5 quarters", 125], ["$1", 100, "10 dimes", 100], ["$2", 200, "19 dimes", 190],
    ["$1 and 1 dime", 110, "11 dimes", 110], ["$3", 300, "12 quarters", 300], ["$1 and 2 quarters", 150, "6 quarters", 150],
    ["$2 and 1 dime", 210, "21 dimes", 210], ["$1", 100, "20 nickels", 100], ["$2", 200, "35 nickels", 175],
    ["$1 and 1 nickel", 105, "21 nickels", 105], ["$4", 400, "16 quarters", 400], ["$1 and 3 dimes", 130, "13 dimes", 130],
    ["$3", 300, "29 dimes", 290], ["$2 and 2 quarters", 250, "10 quarters", 250], ["$5", 500, "45 dimes", 450],
  ]);

  const ratherPhr = rotor([
    (nm, a, b) => `${nm} may keep ${a} or ${b}. Which pile is worth more?`,
    (nm, a, b) => `Two piles sit in front of ${nm}: ${a}, or ${b}. Which one is worth more?`,
  ]);
  const rather = (band, data) =>
    data.forEach(([a, av, b, bv], i) => {
      items.push(
        item("coinEquivalence", "conceptual", `whichWorthMore_${band}`, band, {
          answer: av > bv ? a : b,
          choices: shuffled([a, b], (seed += 1)),
          display: { money: { kind: "compare", a: av, b: bv }, promptText: ratherPhr()(nameAt(i * 3 + seed), a, b) },
        })
      );
    });
  rather("band1", [
    ["1 dime", 10, "7 pennies", 7], ["3 nickels", 15, "1 dime", 10], ["2 dimes", 20, "3 nickels", 15],
    ["1 nickel", 5, "4 pennies", 4], ["1 dime and 1 nickel", 15, "2 nickels", 10], ["4 nickels", 20, "1 dime and 1 nickel", 15],
    ["2 nickels", 10, "8 pennies", 8], ["1 dime", 10, "1 nickel and 3 pennies", 8], ["2 dimes", 20, "18 pennies", 18],
    ["3 nickels", 15, "13 pennies", 13], ["1 dime and 2 pennies", 12, "2 nickels", 10], ["1 nickel and 4 pennies", 9, "1 dime", 10],
    ["2 nickels and 3 pennies", 13, "1 dime and 4 pennies", 14], ["4 nickels", 20, "19 pennies", 19],
    ["1 dime and 1 nickel", 15, "16 pennies", 16], ["2 dimes", 20, "1 dime and 9 pennies", 19],
  ]);
  rather("band2", [
    ["1 quarter", 25, "2 dimes", 20], ["5 nickels", 25, "3 dimes", 30], ["2 quarters", 50, "4 dimes", 40],
    ["1 quarter and 1 nickel", 30, "2 dimes and 1 nickel", 25], ["3 dimes", 30, "1 quarter", 25],
    ["2 quarters", 50, "9 nickels", 45], ["1 quarter and 1 dime", 35, "6 nickels", 30],
    ["3 quarters", 75, "7 dimes", 70], ["1 quarter and 2 nickels", 35, "4 dimes", 40],
    ["2 quarters and 1 nickel", 55, "5 dimes", 50], ["1 quarter", 25, "5 nickels and 1 penny", 26],
    ["3 quarters", 75, "8 dimes", 80], ["2 quarters and 1 dime", 60, "11 nickels", 55],
    ["1 quarter and 3 dimes", 55, "2 quarters", 50], ["4 dimes and 3 nickels", 55, "2 quarters and 1 penny", 51],
    ["3 quarters and 1 nickel", 80, "7 dimes and 1 nickel", 75],
  ]);
  rather("band3", [
    ["$1", 100, "3 quarters and 2 dimes", 95], ["4 quarters", 100, "$1 and 1 penny", 101],
    ["$1 and 1 quarter", 125, "12 dimes", 120], ["$2", 200, "7 quarters", 175],
    ["9 dimes and 1 nickel", 95, "$1", 100], ["$1 and 2 dimes", 120, "5 quarters", 125],
    ["$2 and 1 nickel", 205, "8 quarters", 200], ["$1 and 3 quarters", 175, "17 dimes", 170],
    ["$3", 300, "11 quarters", 275], ["$1 and 1 dime", 110, "4 quarters and 1 nickel", 105],
    ["$2 and 2 dimes", 220, "9 quarters", 225], ["$1 and 4 nickels", 120, "5 quarters", 125],
    ["$3 and 1 dime", 310, "12 quarters", 300], ["$2 and 3 nickels", 215, "21 dimes", 210],
    ["$1 and 2 quarters", 150, "14 dimes and 1 nickel", 145], ["$4", 400, "15 quarters", 375],
  ]);

  const makeSamePhr = rotor([
    (nm, amount, coin) => `${nm} wants to swap ${amount} for only ${PLURAL[coin]}. Which count of ${PLURAL[coin]} matches?`,
    (nm, amount, coin) => `To trade ${amount} into ${PLURAL[coin]} alone, how many ${PLURAL[coin]} does ${nm} need? Pick the right count.`,
  ]);
  const makeSame = (band, data) =>
    data.forEach(([amount, cents, coin], i) => {
      const per = COIN_VALUE[coin];
      const right = cents / per;
      items.push(
        item("coinEquivalence", "conceptual", `pickTradeCount_${band}`, band, {
          answer: right,
          choices: shuffled([...new Set([right, right + 1, right - 1, cents])].filter((v) => v > 0), (seed += 1)).slice(0, 4),
          display: { money: { kind: "trade", fromCents: cents, per }, promptText: makeSamePhr()(nameAt(i * 3 + seed), amount, coin) },
        })
      );
    });
  makeSame("band1", [
    ["1 dime", 10, "nickel"], ["2 dimes", 20, "nickel"], ["1 nickel", 5, "penny"], ["1 dime", 10, "penny"],
    ["3 nickels", 15, "penny"], ["2 nickels", 10, "penny"], ["1 dime and 1 nickel", 15, "nickel"], ["4 nickels", 20, "dime"],
    ["2 dimes", 20, "penny"], ["1 dime and 1 nickel", 15, "penny"], ["10 pennies", 10, "nickel"], ["2 nickels", 10, "dime"],
    ["20 pennies", 20, "dime"], ["15 pennies", 15, "nickel"], ["4 nickels", 20, "penny"], ["1 dime and 2 nickels", 20, "dime"],
  ]);
  makeSame("band2", [
    ["1 quarter", 25, "nickel"], ["2 quarters", 50, "dime"], ["2 quarters", 50, "nickel"], ["1 quarter and 1 nickel", 30, "dime"],
    ["3 quarters", 75, "nickel"], ["5 dimes", 50, "quarter"], ["1 quarter", 25, "penny"], ["10 nickels", 50, "quarter"],
    ["4 quarters", 100, "dime"], ["1 quarter and 1 dime", 35, "nickel"], ["2 quarters and 1 dime", 60, "dime"], ["25 pennies", 25, "quarter"],
    ["8 nickels", 40, "dime"], ["1 quarter and 3 nickels", 40, "dime"], ["4 quarters", 100, "nickel"], ["50 pennies", 50, "quarter"],
  ]);
  makeSame("band3", [
    ["$1", 100, "quarter"], ["$1", 100, "dime"], ["$2", 200, "quarter"], ["$1 and 1 quarter", 125, "quarter"],
    ["$1", 100, "nickel"], ["$2", 200, "dime"], ["$1 and 1 dime", 110, "dime"], ["$3", 300, "quarter"],
    ["$1 and 2 quarters", 150, "quarter"], ["$2 and 1 dime", 210, "dime"], ["$4", 400, "quarter"], ["$1 and 3 dimes", 130, "dime"],
    ["$5", 500, "quarter"], ["$2 and 2 quarters", 250, "quarter"], ["$1 and 2 dimes", 120, "dime"], ["$3 and 1 quarter", 325, "quarter"],
  ]);

  return items;
}

/* ================================================================== */
/* moneyReasoning                                                      */
/* ================================================================== */

export function moneyReasoningProcedural() {
  const items = [];

  const fewestDrill = (structureType, band, cents) =>
    item("moneyReasoning", "procedural", structureType, band, {
      answer: fewest(cents),
      answerType: "numberPad",
      display: { money: { kind: "fewest", cents }, promptText: `Fewest coins for ${cents} cents = ?` },
    });
  for (const cents of [7, 12, 16, 6, 11, 17, 13, 8, 19, 14, 3, 18, 9, 2, 15, 4, 20, 10, 5, 1]) {
    items.push(fewestDrill("fewestTeen", "band1", cents));
  }
  // Two-price totals within 20.
  for (const [a, b] of [[7, 6], [8, 9], [5, 12], [6, 11], [9, 4], [12, 7], [3, 14], [8, 5], [11, 6], [4, 13], [7, 9], [15, 3], [6, 6], [9, 8], [12, 5], [2, 16], [10, 7], [5, 9], [13, 4], [8, 8], [14, 5], [7, 11], [9, 9], [6, 13], [11, 8], [4, 15], [3, 9], [5, 7], [14, 3], [17, 2]]) {
    items.push(
      item("moneyReasoning", "procedural", "twoPriceTeen", "band1", {
        answer: a + b,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [a, b] }, promptText: `${a}c toy + ${b}c toy = ? c` },
      })
    );
  }
  for (const cents of [26, 31, 37, 42, 48, 53, 59, 64, 67, 72, 78, 83, 87, 91, 94, 99, 33, 41, 57, 62, 76, 88, 29, 46, 68, 82].slice(0, 26)) {
    items.push(fewestDrill("fewestMid", "band2", cents));
  }
  for (const [a, b] of [[26, 31], [37, 42], [48, 23], [53, 19], [34, 45], [27, 66], [58, 33], [41, 39], [62, 17], [29, 54], [46, 38], [51, 28], [36, 47], [65, 22], [43, 49], [57, 31], [24, 68], [39, 44], [56, 27], [32, 59], [45, 46], [63, 18], [28, 61], [49, 37], [55, 36], [21, 74]]) {
    items.push(
      item("moneyReasoning", "procedural", "twoPriceMid", "band2", {
        answer: a + b,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [a, b] }, promptText: `${a}c toy + ${b}c toy = ? c` },
      })
    );
  }
  for (const cents of [126, 131, 158, 167, 189, 204, 237, 268, 291, 312, 345, 178, 223, 256, 289, 143, 199, 274, 307, 336, 152, 217, 248, 283, 319, 361].slice(0, 26)) {
    items.push(fewestDrill("fewestBig", "band3", cents));
  }
  for (const [a, b] of [[126, 131], [158, 67], [189, 104], [137, 168], [223, 91], [156, 178], [241, 87], [119, 154], [262, 73], [148, 186], [217, 96], [173, 159], [234, 118], [161, 145], [208, 127], [176, 192], [253, 84], [139, 176], [226, 109], [187, 143], [214, 132], [165, 181], [248, 95], [129, 197], [235, 121], [182, 164]]) {
    items.push(
      item("moneyReasoning", "procedural", "twoPriceBig", "band3", {
        answer: a + b,
        answerType: "numberPad",
        display: { counting: { kind: "sum", parts: [a, b] }, promptText: `${a}c item + ${b}c item = ? c` },
      })
    );
  }

  return items;
}

export function moneyReasoningConceptual() {
  const items = [];
  let seed = 111;

  const affordPhr = rotor([
    (nm, have, cost) => `${nm} has ${have} cents. A prize costs ${cost} cents. Can ${nm} buy it?`,
    (nm, have, cost) => `The prize costs ${cost} cents, and ${nm} holds ${have} cents. Is that enough to buy it?`,
  ]);
  const afford = (band, data) =>
    data.forEach(([have, cost], i) => {
      const truth = have >= cost;
      items.push(
        item("moneyReasoning", "conceptual", `affordJudge_${band}`, band, {
          answer: truth ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { money: { kind: "afford", have, cost }, promptText: affordPhr()(nameAt(i * 3 + seed), have, cost), truth },
        })
      );
    });
  afford("band1", [[10, 7], [8, 12], [15, 15], [9, 14], [20, 16], [11, 18], [16, 13], [6, 6], [19, 20], [14, 9], [7, 15], [18, 18], [12, 17], [20, 11], [5, 8], [17, 12], [13, 19], [10, 10]]);
  afford("band2", [[50, 37], [30, 45], [75, 75], [42, 58], [90, 66], [55, 71], [80, 49], [25, 25], [68, 92], [95, 78], [38, 61], [73, 73], [47, 84], [99, 87], [29, 43], [86, 59], [52, 96], [64, 64]]);
  afford("band3", [[200, 145], [120, 180], [250, 250], [155, 216], [310, 268], [185, 242], [275, 199], [100, 100], [230, 305], [340, 289], [140, 227], [265, 265], [175, 331], [390, 348], [110, 172], [295, 234], [160, 378], [225, 225]]);

  const worthMorePhr = rotor([
    (nm, a, b) => `${nm} checks two banks: one holds ${a} cents, the other ${b} cents. Which bank holds more?`,
    (nm, a, b) => `Bank A holds ${a} cents and bank B holds ${b} cents. Which bank should ${nm} pick for more money?`,
  ]);
  const worthMore = (band, data) =>
    data.forEach(([a, b], i) => {
      items.push(
        item("moneyReasoning", "conceptual", `whichBank_${band}`, band, {
          answer: a > b ? "Bank A" : "Bank B",
          choices: ["Bank A", "Bank B"],
          display: { money: { kind: "compare", a, b }, promptText: worthMorePhr()(nameAt(i * 3 + seed), a, b) },
        })
      );
    });
  worthMore("band1", [[12, 9], [7, 15], [18, 11], [6, 13], [20, 17], [8, 16], [14, 5], [10, 19], [16, 12], [4, 9], [17, 14], [11, 20], [13, 8], [9, 18], [15, 10], [19, 16]]);
  worthMore("band2", [[42, 39], [27, 55], [68, 61], [36, 73], [90, 87], [48, 76], [64, 45], [30, 89], [76, 52], [24, 49], [87, 74], [41, 90], [63, 38], [29, 78], [95, 60], [59, 86]]);
  worthMore("band3", [[142, 139], [127, 155], [268, 261], [136, 273], [390, 387], [148, 276], [264, 245], [130, 289], [276, 252], [124, 249], [387, 374], [141, 390], [263, 238], [129, 278], [395, 360], [259, 286]]);

  const leftOverPhr = rotor([
    (nm, have, cost) => `${nm} spends ${cost} cents from a wallet of ${have} cents. Which amount is left?`,
    (nm, have, cost) => `Out of ${have} cents, ${nm} pays ${cost} cents for a treat. How much money is left? Pick the amount.`,
  ]);
  const leftOver = (band, data) =>
    data.forEach(([have, cost], i) => {
      const right = have - cost;
      items.push(
        item("moneyReasoning", "conceptual", `leftOverPick_${band}`, band, {
          answer: right,
          choices: shuffled([...new Set([right, right + 1, right - 1, have + cost])].filter((v) => v >= 0), (seed += 1)).slice(0, 4),
          display: { counting: { kind: "countBack", start: have, back: cost }, promptText: leftOverPhr()(nameAt(i * 3 + seed), have, cost) },
        })
      );
    });
  leftOver("band1", [[10, 7], [15, 8], [20, 13], [12, 5], [18, 9], [14, 6], [16, 11], [20, 4], [13, 7], [17, 12], [19, 15], [11, 3], [15, 9], [20, 18], [16, 8], [18, 14]]);
  leftOver("band2", [[50, 37], [75, 48], [90, 66], [42, 25], [68, 39], [84, 57], [96, 71], [55, 28], [73, 46], [87, 62], [99, 75], [61, 34], [78, 53], [92, 68], [66, 41], [81, 58]]);
  leftOver("band3", [[200, 145], [250, 168], [310, 226], [185, 129], [268, 191], [334, 257], [396, 281], [225, 158], [273, 196], [387, 262], [399, 275], [261, 184], [278, 253], [392, 318], [266, 141], [381, 208]]);

  return items;
}

export function buildDeterministicItems() {
  return [
    ...countCoinsProcedural(),
    ...countCoinsConceptual(),
    ...makeChangeProcedural(),
    ...makeChangeConceptual(),
    ...coinEquivalenceProcedural(),
    ...coinEquivalenceConceptual(),
    ...moneyReasoningProcedural(),
    ...moneyReasoningConceptual(),
  ];
}
