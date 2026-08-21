#!/usr/bin/env node
/**
 * Build the money bank via the shared assembler (bankAssembler.js).
 * Coin totals/change/gaps ride countMath claims; trades, fewest-coins,
 * equivalence, comparisons, and notation carry display.money claims that
 * THIS file re-derives (greedy is optimal for US denominations).
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorMoney.js
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorMoney.js --write --tag b0821
 */

import { buildDeterministicItems, COIN_VALUE } from "./moneyTemplates.js";
import { buildStoryItems } from "./moneyStories.js";
import { runAssembler } from "./bankAssembler.js";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const batchTag = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);

const fewest = (cents) => {
  let left = cents;
  let n = 0;
  for (const d of [25, 10, 5, 1]) {
    n += Math.floor(left / d);
    left %= d;
  }
  return n;
};

function expectedFromMoney(m) {
  switch (m.kind) {
    case "coinValue":
      return m.said === COIN_VALUE[m.coin] ? "Yes" : "No";
    case "countVsValue": {
      const coins = [];
      for (const [c, k] of Object.entries(m.counts)) for (let i = 0; i < k; i += 1) coins.push(c);
      const value = coins.reduce((s, c) => s + COIN_VALUE[c], 0);
      return m.said === value ? "Yes" : "No";
    }
    case "trade":
      return m.fromCents % m.per === 0 ? m.fromCents / m.per : null;
    case "fewest":
      return fewest(m.cents);
    case "eq":
      return m.av === m.bv ? "Yes" : "No";
    case "compare":
      return null; // answer is a label; verified structurally below
    case "afford":
      return m.have >= m.cost ? "Yes" : "No";
    case "anyChange":
      return m.pay > m.cost ? "Yes" : "No";
    case "changeSaid":
      return m.said === m.pay - m.cost ? "Yes" : "No";
    case "notation": {
      const [d, r] = String(m.saidD).split(".");
      return Number(d) * 100 + Number(r) === m.cents ? "Yes" : "No";
    }
    case "notationPick": {
      const d = Math.floor(m.cents / 100);
      const r = m.cents % 100;
      return `$${d}.${String(r).padStart(2, "0")}`;
    }
    case "orderInvariance":
      return "Yes";
    default:
      return undefined;
  }
}

function extraProblems(item) {
  const q = item.question;
  const d = q.display || {};
  const problems = [];

  if (Array.isArray(q.choices) && (q.answer === "Yes" || q.answer === "No")) {
    if (typeof d.truth !== "boolean") problems.push("judged item missing display.truth");
    else if ((q.answer === "Yes") !== d.truth) problems.push("judged answer disagrees with truth");
  }
  if (Array.isArray(q.choices)) {
    if (!q.choices.map(String).includes(String(q.answer))) problems.push("answer missing from choices");
    if (new Set(q.choices.map(String)).size !== q.choices.length) problems.push("duplicate choices");
  }

  // Visual coin trays: the drawn coins must sum to the answer.
  if (Array.isArray(d.coins)) {
    const total = d.coins.reduce((s, c) => s + (COIN_VALUE[c] || NaN), 0);
    if (!Number.isFinite(total)) problems.push("tray holds an unknown coin");
    else if (d.coinMode === "count" && total !== q.answer) problems.push(`tray total ${total} != answer ${q.answer}`);
    if (q.answerType !== "coinTray") problems.push("coin tray without coinTray answerType");
  }

  const m = d.money;
  if (m) {
    const expected = expectedFromMoney(m);
    if (expected === undefined) problems.push(`unknown money claim kind "${m.kind}"`);
    else if (expected === null && m.kind === "trade") problems.push(`trade ${m.fromCents} not divisible by ${m.per}`);
    else if (expected !== null && String(expected) !== String(q.answer)) {
      problems.push(`money claim "${m.kind}" gives ${expected} but answer is ${q.answer}`);
    }
    // compare claims: the winning side's value must actually be larger.
    if (m.kind === "compare" && !(m.a !== m.b)) problems.push("compare claim has equal sides");
  }

  return problems;
}

await runAssembler({
  modeId: "money",
  subskills: ["countCoins", "makeChange", "coinEquivalence", "moneyReasoning"],
  rawItems: [...buildDeterministicItems(), ...buildStoryItems()],
  extraProblems,
  batchTag,
  write: has("write"),
  showMax: Number(flag("show", 40)),
});
