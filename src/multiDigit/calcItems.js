/**
 * Multi-Digit Math: the plain computing rows, built by script (calc list
 * decision 3, approved 2026-10-02). Rows 1-4 and 16-22 of
 * src/blueprints/g2AddsubCalc.json are bare computing with no words to
 * review, so this module makes their items from the row, the way
 * src/facts/factItems.js makes the Math Facts rows: every number drawn by a
 * seeded generator inside the row's rules, every key and slip computed, and
 * every item checked (checkCalcItem) before it is used.
 *
 *   row  structureType       variants
 *    1   addWithin100        no regrouping (whole tens, 2d + 1d, 2d + 2d) · regroup the ones
 *    2   subtractWithin100   no trading · trade a ten (incl. 53 − 7) · a zero in the ones (60 − 24)
 *    3   addSeveral          three numbers 10-49 · four numbers 10-29
 *    4   addSubThree         a − b + c or a − b − c
 *   16   addWithin1000       no regrouping · regroup the ones · regroup the tens
 *   17   addPast100          2d + 2d, the tens make a new hundred
 *   18   addTwoRegroups      3d + 3d · 2d + 2d (78 + 56)
 *   19   addSeveralPast100   three numbers 21-59 or four numbers 11-49, sum 101-199
 *   20   subtractWithin1000  no trading · trade a ten · trade a hundred · 2d from 101-199
 *   21   subtractTwoTrades   3d − 3d · 2d from 101-199 (132 − 57)
 *   22   subtractAcrossZero  a zero in the tens · zeros in the tens and ones · from 100-109
 *
 * 24 variants in all, as the list counts them. A second regroup or a trade
 * across a zero is its own hard row (decision 10), so a variant never adds
 * one: each variant names the regroups it allows, and the check recounts
 * them from the printed numbers.
 *
 * Slips are the row's `mistakes`, each computed from the item's numbers
 * (forgotToCarry on 68 + 25 is 83, as the row says). A slip that equals the
 * key does not apply to that item (nothing to carry when nothing
 * regroups) and is left out; the ones that apply must all differ, so each
 * typed wrong answer gets its own feedback line. `tradedOnlyOnce` (row 22)
 * names no number on the list and is not modelled.
 *
 * Pure: no network, no DOM, no JSON import (the row table below is
 * hard-coded; calcItems.spec ties it to the approved rows). Shared by the
 * mode's fallback generator, the native engine and the load script
 * (scripts/multiDigit/loadCalcItems.mjs).
 */
import { hintContainsAnswer } from "../hints/hintSchema.js";

export const MINUS = "−";
const GRADE2_LEVELS = [4, 6];

// ── Numbers ──────────────────────────────────────────────────────────────

/** Digits of n, ones first: 254 → [4, 5, 2]. */
const digitsOf = (n) => String(n).split("").reverse().map(Number);
const width = (n) => String(n).length;
const onesOf = (n) => n % 10;
const tensOf = (n) => Math.floor(n / 10) % 10;
const hundredsOf = (n) => Math.floor(n / 100) % 10;
const hasZeroDigit = (n) => String(n).includes("0");

/** Seeded generator (mulberry32), the same one the parity fixtures use. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-bit seed from text (FNV-1a). */
export function seedOf(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

/**
 * Column addition of the terms, ones first: each column's sum (with the
 * carry in), the carry out, and how many columns regrouped. Carrying 2 tens
 * out of the ones is one regroup (row 3's "one trade").
 */
export function addColumns(terms) {
  const cols = Math.max(...terms.map(width));
  const raw = [];
  const carries = [];
  let carry = 0;
  for (let p = 0; p < cols; p += 1) {
    const r = terms.reduce((sum, t) => sum + (digitsOf(t)[p] || 0), 0);
    raw.push(r);
    const total = r + carry;
    carry = Math.floor(total / 10);
    carries.push(carry);
  }
  return { raw, carries, regroups: carries.filter((c) => c > 0).length, onesSum: raw[0] };
}

/**
 * Column subtraction a − b, ones first: which columns needed a trade from
 * the next place, and whether the ones traded across a zero ten.
 */
export function subtractColumns(a, b) {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const traded = [];
  let borrow = 0;
  for (let p = 0; p < da.length; p += 1) {
    const top = da[p] - borrow;
    const need = top < (db[p] || 0);
    traded.push(need);
    borrow = need ? 1 : 0;
  }
  return {
    traded,
    trades: traded.filter(Boolean).length,
    onesTrade: traded[0],
    tensTrade: Boolean(traded[1]),
    acrossZero: traded[0] && da.length > 1 && da[1] === 0,
  };
}

/** The value of a list of terms joined by signs, left to right. */
export function evaluate(terms, ops) {
  return terms.slice(1).reduce((acc, t, i) => (ops[i] === "+" ? acc + t : acc - t), terms[0]);
}

/** "26 + 17 + 38 = ?" → { terms: [26, 17, 38], ops: ["+", "+"] }, or null. */
export function parsePrompt(text) {
  const m = /^(\d+(?: [+−] \d+)+) = \?$/.exec(text || "");
  if (!m) return null;
  const parts = m[1].split(" ");
  const terms = parts.filter((_, i) => i % 2 === 0).map(Number);
  const ops = parts.filter((_, i) => i % 2 === 1).map((s) => (s === "+" ? "+" : MINUS));
  return { terms, ops };
}

// ── Slips ────────────────────────────────────────────────────────────────

/** Each column's digit sum with no carrying: 68 + 25 → 83, 83 + 45 → 28. */
function noCarry(terms) {
  const { raw } = addColumns(terms);
  return raw.reduce((acc, r, p) => acc + (r % 10) * 10 ** p, 0);
}

/** Each column's sum written side by side: 68 + 25 → 813. */
function columnSums(terms) {
  const { raw } = addColumns(terms);
  return Number(raw.slice().reverse().join(""));
}

/** The bottom digit taken from the top one, or the top from the bottom: 81 − 47 → 46. */
function smallerFromLarger(a, b) {
  const da = digitsOf(a);
  const db = digitsOf(b);
  return da.reduce((acc, d, p) => acc + Math.abs(d - (db[p] || 0)) * 10 ** p, 0);
}

/**
 * A slip's wrong answer for one item, or null where the slip cannot happen
 * (a carry slip with nothing carried, a slip no row number pins down).
 */
export function slipValue(tag, { terms, ops, answer }) {
  const two = terms.length === 2;
  const [a, b] = terms;
  const adding = ops.every((o) => o === "+");
  const sub = two && ops[0] === MINUS;
  switch (tag) {
    case "forgotToCarry":
      return adding ? noCarry(terms) : null;
    case "placeValueSlip":
      return adding && two ? columnSums(terms) : null;
    case "misalignedPlaces": {
      // The shorter number written one place to the left: 57 + 6 → 117.
      if (!adding || !two || width(a) === width(b)) return null;
      const [long, short] = width(a) > width(b) ? [a, b] : [b, a];
      return long + short * 10;
    }
    case "offByTen":
      // Adding: the new ten from the ones never reached the tens.
      // Taking away: a ten was traded but the tens kept it.
      if (adding && two) return addColumns(terms).carries[0] > 0 ? answer - 10 : null;
      if (sub) return subtractColumns(a, b).onesTrade ? answer + 10 : null;
      return null;
    case "offByHundred":
      return sub && subtractColumns(a, b).tensTrade ? answer + 100 : null;
    case "acrossZeroSlip":
      // Made 9 tens but kept every hundred.
      return sub && subtractColumns(a, b).acrossZero ? answer + 100 : null;
    case "subtractedInsteadOfAdded":
      return adding && two ? Math.abs(a - b) : null;
    case "addedInsteadOfSubtracted":
      return sub ? a + b : null;
    case "smallerFromLarger":
      return sub ? smallerFromLarger(a, b) : null;
    case "carriedOneNotTwo": {
      // The ones made 2 tens and only 1 was carried.
      if (!adding || terms.length < 3) return null;
      return addColumns(terms).onesSum >= 20 ? answer - 10 : null;
    }
    case "leftOutAPart":
      return adding && terms.length >= 3 ? answer - terms[terms.length - 1] : null;
    case "stopsAtStepOne":
      return terms.length === 3 && !adding ? terms[0] - terms[1] : null;
    case "wrongOperationStepTwo": {
      if (terms.length !== 3 || adding) return null;
      const flipped = ops[1] === "+" ? MINUS : "+";
      return evaluate(terms, [ops[0], flipped]);
    }
    case "addedEverything":
      return terms.length === 3 && !adding ? terms[0] + terms[1] + terms[2] : null;
    default:
      return null;
  }
}

/** Kid words for each slip: no numbers, so a line can never state the key. */
export const SLIP_FEEDBACK = Object.freeze({
  forgotToCarry: "Check each place. When a place makes 10 or more, a new ten or hundred goes into the next place.",
  placeValueSlip: "Each place holds one digit. When a place makes 10 or more, trade 10 of them for 1 of the next place.",
  misalignedPlaces: "Line up the ones under the ones before you add.",
  offByTen: "Check the tens. Did the new ten go into the tens, or did the traded ten come out of them?",
  offByHundred: "You traded a hundred for tens. Did you take that hundred away from the hundreds?",
  acrossZeroSlip: "When you trade across the zero, the hundreds go down by one too.",
  subtractedInsteadOfAdded: "Look at the sign again. This one adds.",
  addedInsteadOfSubtracted: "Look at the sign again. This one takes away.",
  smallerFromLarger: "Take the bottom digit away from the top digit. When the top digit is smaller, trade first.",
  carriedOneNotTwo: "The ones made more than one new ten. Carry all of them.",
  leftOutAPart: "Did you add every number?",
  stopsAtStepOne: "That is the first step. Now do the second step.",
  wrongOperationStepTwo: "Look at the second sign again.",
  addedEverything: "Look at the signs. Not every step adds.",
});

// ── The rows ─────────────────────────────────────────────────────────────

const S_WITHIN_100 = { ccss: ["2.NBT.B.5"], tx: ["2.4B"], fl: ["MA.2.NSO.2.3"], va: ["2.CE.1b"], ga: ["2.NR.2.4"] };
const S_1000 = { ccss: ["2.NBT.B.7"], tx: [], fl: ["MA.2.NSO.2.4"], va: [], ga: [] };

/**
 * One draw: the variant's own shape for this index (variants alternate
 * shapes, and "about half" rules alternate down the list), as terms and
 * signs. `ok` says whether the draw keeps the variant's number rules.
 */
const two = (a, b, op = "+") => ({ terms: [a, b], ops: [op] });
const plus = (terms) => ({ terms, ops: terms.slice(1).map(() => "+") });
const rowOf = (n, lo, hi, rng) => Array.from({ length: n }, () => randInt(rng, lo, hi));

export const CALC_ROWS = Object.freeze([
  {
    rowId: "calc-g2-add-100",
    structureType: "addWithin100",
    subskill: "within100",
    layout: "vertical",
    standards: S_WITHIN_100,
    mistakes: ["forgotToCarry", "placeValueSlip", "misalignedPlaces"],
    variants: [
      {
        id: "noRegroup",
        difficulty: "easy",
        regroups: [0],
        // Whole tens (50 + 30), a two-digit and a one-digit number (43 + 5),
        // two two-digit numbers.
        draw: (rng, i) =>
          [
            () => two(10 * randInt(rng, 1, 8), 10 * randInt(rng, 1, 8)),
            () => two(randInt(rng, 10, 98), randInt(rng, 1, 9)),
            () => two(randInt(rng, 11, 88), randInt(rng, 11, 88)),
          ][i % 3](),
        ok: ({ terms: [a, b] }, i) => a + b <= 99 && (i % 3 !== 2 || (a % 10 !== 0 && b % 10 !== 0)),
      },
      {
        id: "regroupOnes",
        difficulty: "moderate",
        regroups: [1],
        requires: ["forgotToCarry", "placeValueSlip"],
        draw: (rng, i) => (i % 2 === 0 ? two(randInt(rng, 11, 89), randInt(rng, 11, 89)) : two(randInt(rng, 11, 98), randInt(rng, 2, 9))),
        // At most 99: a sum of 100 would make a new hundred too, a second regroup.
        ok: ({ terms: [a, b] }) => a + b <= 99 && onesOf(a) + onesOf(b) >= 10,
      },
    ],
  },
  {
    rowId: "calc-g2-sub-100",
    structureType: "subtractWithin100",
    subskill: "within100",
    layout: "vertical",
    standards: S_WITHIN_100,
    mistakes: ["smallerFromLarger", "offByTen", "addedInsteadOfSubtracted"],
    variants: [
      {
        id: "noTrade",
        difficulty: "easy",
        trades: [0],
        requires: ["addedInsteadOfSubtracted"],
        draw: (rng, i) => {
          const a = randInt(rng, 20, 99);
          return two(a, i % 2 === 0 ? randInt(rng, 10, 97) : randInt(rng, 2, 9), MINUS);
        },
        ok: ({ terms: [a, b] }) => a - b >= 2,
      },
      {
        id: "tradeTen",
        difficulty: "moderate",
        trades: [1],
        requires: ["smallerFromLarger", "offByTen", "addedInsteadOfSubtracted"],
        // Two-digit from two-digit, or a one-digit number taken across a ten (53 − 7).
        draw: (rng, i) => {
          const a = randInt(rng, 21, 99);
          return two(a, i % 2 === 0 ? randInt(rng, 12, 89) : randInt(rng, 2, 9), MINUS);
        },
        ok: ({ terms: [a, b] }) => a - b >= 2 && onesOf(a) !== 0,
      },
      {
        id: "zeroOnes",
        difficulty: "moderate",
        trades: [1],
        requires: ["smallerFromLarger", "offByTen", "addedInsteadOfSubtracted"],
        draw: (rng) => two(10 * randInt(rng, 3, 9), randInt(rng, 11, 89), MINUS),
        ok: ({ terms: [a, b] }) => a - b >= 2 && onesOf(b) !== 0,
      },
    ],
  },
  {
    rowId: "calc-g2-add-several",
    structureType: "addSeveral",
    subskill: "severalNumbers",
    layout: "horizontal",
    standards: { ccss: ["2.NBT.B.6"], tx: ["2.4B"], fl: ["MA.2.AR.2.2"], va: ["2.CE.1b"], ga: ["2.NR.2.4"] },
    mistakes: ["carriedOneNotTwo", "leftOutAPart", "forgotToCarry"],
    // The ones make 20 or more in about half the items (carrying 2 tens is
    // one trade) and 10-19 in the rest; never 30 or more.
    variants: [
      {
        id: "threeNumbers",
        difficulty: "moderate",
        regroups: [1],
        requires: ["leftOutAPart", "forgotToCarry"],
        draw: (rng) => plus(rowOf(3, 10, 49, rng)),
        ok: (d, i) => evaluate(d.terms, d.ops) <= 99 && twentyRule(d.terms, i),
      },
      {
        id: "fourNumbers",
        difficulty: "moderate",
        regroups: [1],
        requires: ["leftOutAPart", "forgotToCarry"],
        draw: (rng) => plus(rowOf(4, 10, 29, rng)),
        ok: (d, i) => evaluate(d.terms, d.ops) <= 99 && twentyRule(d.terms, i),
      },
    ],
  },
  {
    rowId: "calc-g2-add-sub-three",
    structureType: "addSubThree",
    subskill: "severalNumbers",
    layout: "horizontal",
    standards: { ccss: ["2.NBT.B.5"], tx: ["2.4B"], fl: ["MA.2.AR.2.2"], va: ["2.CE.1b"], ga: ["2.NR.2.4"] },
    mistakes: ["stopsAtStepOne", "wrongOperationStepTwo", "addedEverything"],
    variants: [
      {
        // Take away then add (58 − 23 + 7) or take away twice (64 − 21 − 8);
        // never add then take away, where two slips are the same number.
        id: "twoSteps",
        difficulty: "hard",
        regroups: [0, 1],
        requires: ["stopsAtStepOne", "wrongOperationStepTwo", "addedEverything"],
        draw: (rng, i) => {
          const ops = [MINUS, i % 2 === 0 ? "+" : MINUS];
          const a = randInt(rng, 30, 99);
          const oneDigitFirst = Math.floor(i / 4) % 2 === 1;
          const b = oneDigitFirst ? randInt(rng, 2, 9) : randInt(rng, 11, 69);
          const c = oneDigitFirst ? randInt(rng, 11, 69) : randInt(rng, 2, 9);
          return { terms: [a, b, c], ops };
        },
        ok: ({ terms: [a, b, c], ops }, i) => {
          const middle = a - b;
          const answer = evaluate([a, b, c], ops);
          if (middle < 10 || answer < 2 || answer > 99) return false;
          // About half regroup in one step.
          return stepRegroups([a, b, c], ops) === (Math.floor(i / 2) % 2 === 0 ? 1 : 0);
        },
      },
    ],
  },
  {
    rowId: "calc-g2-add-1000",
    structureType: "addWithin1000",
    subskill: "within1000",
    layout: "vertical",
    standards: S_1000,
    mistakes: ["forgotToCarry", "placeValueSlip", "misalignedPlaces"],
    variants: [
      {
        id: "noRegroup",
        difficulty: "easy",
        regroups: [0],
        // Hundreds plus hundreds (300 + 400), 3d + 3d, 3d + 2d.
        draw: (rng, i) =>
          [
            () => two(100 * randInt(rng, 1, 8), 100 * randInt(rng, 1, 8)),
            () => two(randInt(rng, 101, 888), randInt(rng, 101, 888)),
            () => two(randInt(rng, 101, 988), randInt(rng, 11, 88)),
          ][i % 3](),
        ok: ({ terms: [a, b] }, i) => a + b <= 999 && (i % 3 === 0 || (a % 100 !== 0 && b % 100 !== 0)),
      },
      {
        id: "regroupOnes",
        difficulty: "moderate",
        regroups: [1],
        requires: ["forgotToCarry", "placeValueSlip"],
        draw: (rng, i) => (i % 2 === 0 ? two(randInt(rng, 101, 888), randInt(rng, 101, 888)) : two(randInt(rng, 101, 988), randInt(rng, 11, 89))),
        ok: ({ terms }) => evaluate(terms, ["+"]) <= 999 && addColumns(terms).carries[0] > 0,
      },
      {
        id: "regroupTens",
        difficulty: "moderate",
        regroups: [1],
        requires: ["forgotToCarry", "placeValueSlip"],
        draw: (rng, i) => (i % 2 === 0 ? two(randInt(rng, 101, 888), randInt(rng, 101, 888)) : two(randInt(rng, 101, 988), randInt(rng, 11, 98))),
        ok: ({ terms }) => evaluate(terms, ["+"]) <= 999 && addColumns(terms).carries[1] > 0,
      },
    ],
  },
  {
    rowId: "calc-g2-add-past-100",
    structureType: "addPast100",
    subskill: "within1000",
    layout: "vertical",
    standards: { ccss: ["2.NBT.B.7"], tx: ["2.4B"], fl: ["MA.2.NSO.2.4"], va: ["2.CE.1b"], ga: [] },
    mistakes: ["forgotToCarry", "subtractedInsteadOfAdded"],
    variants: [
      {
        // The tens make a new hundred; the ones do not regroup (78 + 56,
        // which regroups twice, is row 18's).
        id: "pastHundred",
        difficulty: "moderate",
        regroups: [1],
        requires: ["forgotToCarry", "subtractedInsteadOfAdded"],
        draw: (rng) => two(randInt(rng, 21, 99), randInt(rng, 21, 99)),
        ok: ({ terms: [a, b] }) => a + b >= 101 && a + b <= 198 && addColumns([a, b]).carries[0] === 0,
      },
    ],
  },
  {
    rowId: "calc-g2-add-1000-two-trades",
    structureType: "addTwoRegroups",
    subskill: "within1000",
    layout: "vertical",
    standards: S_1000,
    mistakes: ["forgotToCarry", "offByTen", "placeValueSlip"],
    variants: [
      {
        id: "threeDigit",
        difficulty: "hard",
        regroups: [2],
        requires: ["forgotToCarry", "offByTen", "placeValueSlip"],
        draw: (rng) => two(randInt(rng, 101, 878), randInt(rng, 101, 878)),
        ok: ({ terms }) => evaluate(terms, ["+"]) <= 999 && addColumns(terms).carries[0] > 0 && addColumns(terms).carries[1] > 0,
      },
      {
        id: "twoDigit",
        difficulty: "hard",
        regroups: [2],
        requires: ["forgotToCarry", "offByTen", "placeValueSlip"],
        draw: (rng) => two(randInt(rng, 11, 99), randInt(rng, 11, 99)),
        ok: ({ terms }) => addColumns(terms).carries[0] > 0 && addColumns(terms).carries[1] > 0,
      },
    ],
  },
  {
    rowId: "calc-g2-add-several-past-100",
    structureType: "addSeveralPast100",
    subskill: "severalNumbers",
    layout: "horizontal",
    standards: { ccss: ["2.NBT.B.6"], tx: ["2.4B"], fl: ["MA.2.NSO.2.4"], va: ["2.CE.1b"], ga: [] },
    mistakes: ["carriedOneNotTwo", "leftOutAPart", "forgotToCarry"],
    variants: [
      {
        // Three numbers 21-59 or four 11-49; the ones regroup (to 1 or 2
        // tens) and the tens make a new hundred.
        id: "pastHundred",
        difficulty: "hard",
        regroups: [2],
        requires: ["leftOutAPart", "forgotToCarry"],
        draw: (rng, i) => plus(i % 2 === 0 ? rowOf(3, 21, 59, rng) : rowOf(4, 11, 49, rng)),
        ok: (d, i) => {
          const sum = evaluate(d.terms, d.ops);
          return sum >= 101 && sum <= 199 && addColumns(d.terms).onesSum >= 10 && twentyRule(d.terms, Math.floor(i / 2));
        },
      },
    ],
  },
  {
    rowId: "calc-g2-sub-1000",
    structureType: "subtractWithin1000",
    subskill: "within1000",
    layout: "vertical",
    standards: S_1000,
    mistakes: ["smallerFromLarger", "offByHundred", "addedInsteadOfSubtracted"],
    // No zero in the tens of the first number: a trade across a zero is row 22's.
    variants: [
      {
        id: "noTrade",
        difficulty: "easy",
        trades: [0],
        requires: ["addedInsteadOfSubtracted"],
        draw: (rng) => two(randInt(rng, 211, 999), randInt(rng, 101, 899), MINUS),
        ok: threeDigitDifference,
      },
      {
        id: "tradeTen",
        difficulty: "moderate",
        trades: [1],
        requires: ["smallerFromLarger", "addedInsteadOfSubtracted"],
        draw: (rng) => two(randInt(rng, 211, 999), randInt(rng, 101, 899), MINUS),
        ok: (d) => threeDigitDifference(d) && subtractColumns(...d.terms).onesTrade,
      },
      {
        id: "tradeHundred",
        difficulty: "moderate",
        trades: [1],
        requires: ["smallerFromLarger", "offByHundred", "addedInsteadOfSubtracted"],
        draw: (rng) => two(randInt(rng, 211, 999), randInt(rng, 101, 899), MINUS),
        ok: (d) => threeDigitDifference(d) && subtractColumns(...d.terms).tensTrade,
      },
      {
        // A two-digit number from 101-199, the answer under 100 (128 − 35):
        // the one trade is a hundred.
        id: "fromHundreds",
        difficulty: "moderate",
        trades: [1],
        requires: ["smallerFromLarger", "offByHundred", "addedInsteadOfSubtracted"],
        draw: (rng) => two(randInt(rng, 110, 199), randInt(rng, 11, 99), MINUS),
        ok: ({ terms: [a, b] }) => tensOf(a) !== 0 && a - b < 100 && a - b >= 2,
      },
    ],
  },
  {
    rowId: "calc-g2-sub-1000-two-trades",
    structureType: "subtractTwoTrades",
    subskill: "within1000",
    layout: "vertical",
    standards: S_1000,
    mistakes: ["smallerFromLarger", "offByTen", "offByHundred"],
    // The ones and the tens both trade; no zero in the first number.
    variants: [
      {
        id: "threeDigit",
        difficulty: "hard",
        trades: [2],
        requires: ["smallerFromLarger", "offByTen", "offByHundred"],
        draw: (rng) => two(randInt(rng, 211, 999), randInt(rng, 101, 899), MINUS),
        ok: (d) => !hasZeroDigit(d.terms[0]) && d.terms[0] - d.terms[1] >= 100,
      },
      {
        id: "fromHundreds",
        difficulty: "hard",
        trades: [2],
        requires: ["smallerFromLarger", "offByTen", "offByHundred"],
        draw: (rng) => two(randInt(rng, 111, 199), randInt(rng, 11, 99), MINUS),
        ok: ({ terms: [a, b] }) => !hasZeroDigit(a) && a - b < 100 && a - b >= 2,
      },
    ],
  },
  {
    rowId: "calc-g2-across-zero",
    structureType: "subtractAcrossZero",
    subskill: "within1000",
    layout: "vertical",
    standards: S_1000,
    mistakes: ["acrossZeroSlip", "smallerFromLarger", "tradedOnlyOnce"],
    variants: [
      {
        id: "zeroTens",
        difficulty: "hard",
        trades: [2],
        acrossZero: true,
        requires: ["acrossZeroSlip", "smallerFromLarger"],
        draw: (rng) => two(100 * randInt(rng, 2, 9) + randInt(rng, 1, 8), randInt(rng, 101, 899), MINUS),
        ok: ({ terms: [a, b] }) => a - b >= 100,
      },
      {
        id: "zeroTensOnes",
        difficulty: "hard",
        trades: [2],
        acrossZero: true,
        requires: ["acrossZeroSlip", "smallerFromLarger"],
        draw: (rng) => two(100 * randInt(rng, 2, 9), randInt(rng, 101, 899), MINUS),
        ok: ({ terms: [a, b] }) => a - b >= 100,
      },
      {
        // From 100-109, the answer under 100: 100 − 37, 103 − 48.
        id: "fromHundred",
        difficulty: "hard",
        trades: [2],
        acrossZero: true,
        requires: ["acrossZeroSlip", "smallerFromLarger"],
        draw: (rng) => two(randInt(rng, 100, 108), randInt(rng, 11, 99), MINUS),
        ok: ({ terms: [a, b] }) => a - b >= 2,
      },
    ],
  },
]);

/**
 * The ones of the terms make 20-29 (2 new tens) on even draws and 10-19
 * (1 new ten) on odd ones, so carrying 1 ten and carrying 2 sit side by
 * side, the contrast the carriedOneNotTwo slip is about.
 */
function twentyRule(terms, i) {
  const ones = addColumns(terms).onesSum;
  return i % 2 === 0 ? ones >= 20 && ones <= 29 : ones >= 10 && ones <= 19;
}

/** Two three-digit numbers a difference of 100 or more apart, no zero tens on top. */
function threeDigitDifference({ terms: [a, b] }) {
  return width(b) === 3 && a - b >= 100 && tensOf(a) !== 0;
}

/** Regroups across the two steps of a − b ± c. */
function stepRegroups([a, b, c], ops) {
  const middle = a - b;
  const first = subtractColumns(a, b).trades;
  const second = ops[1] === "+" ? addColumns([middle, c]).regroups : subtractColumns(middle, c).trades;
  return first + second;
}

const ROW_BY_ID = new Map(CALC_ROWS.map((r) => [r.rowId, r]));
export const calcRow = (rowId) => ROW_BY_ID.get(rowId) || null;
export const CALC_ROW_IDS = Object.freeze(CALC_ROWS.map((r) => r.rowId));
export const calcVariant = (rowId, variantId) => calcRow(rowId)?.variants.find((v) => v.id === variantId) || null;

/** How many regroups (adding) or trades (taking away) the printed numbers need. */
export function tradeCount(terms, ops) {
  if (terms.length === 3 && ops[0] === MINUS) return stepRegroups(terms, ops);
  if (ops.every((o) => o === "+")) return addColumns(terms).regroups;
  return subtractColumns(terms[0], terms[1]).trades;
}

// ── Hints ────────────────────────────────────────────────────────────────

const PLACE = ["Ones", "Tens", "Hundreds"];
const UNIT = ["ones", "tens", "hundreds"];

function addSteps(terms) {
  const cols = Math.max(...terms.map(width));
  const steps = [];
  let carry = 0;
  for (let p = 0; p < cols; p += 1) {
    const ds = terms.map((t) => digitsOf(t)[p]).filter((d) => d != null);
    const raw = ds.reduce((s, d) => s + d, 0);
    const total = raw + carry;
    if (total === 0) {
      steps.push(`${PLACE[p]}: there are no ${UNIT[p]}.`);
      continue;
    }
    let line = `${PLACE[p]}: ${ds.join(" + ")}`;
    if (carry) line += `, plus ${carry} new ${carry === 1 ? UNIT[p].replace(/s$/, "") : UNIT[p]}`;
    line += ` makes ${total} ${UNIT[p]}.`;
    const next = Math.floor(total / 10);
    if (next > 0 && p < 2) {
      line += ` Trade ${next * 10} ${UNIT[p]} for ${next} ${next === 1 ? UNIT[p + 1].replace(/s$/, "") : UNIT[p + 1]}.`;
    }
    steps.push(line);
    carry = next;
  }
  if (carry && cols === 2) steps.push(`The ${carry} new hundred goes in the hundreds place.`);
  steps.push(cols >= 3 || carry ? "Put the hundreds, tens and ones together." : "Put the tens and ones together.");
  return steps;
}

function subtractSteps(a, b, answer) {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const { acrossZero } = subtractColumns(a, b);
  const steps = [];
  let borrow = 0;
  for (let p = 0; p < da.length; p += 1) {
    const top = da[p] - borrow;
    const bottom = db[p] || 0;
    if (p === 0 && acrossZero) {
      steps.push(
        `Ones: ${da[0]} is less than ${bottom}, and there are no tens to trade. Trade 1 hundred for 10 tens, then 1 ten for 10 ones.`
      );
      steps.push(`Ones: ${top + 10} − ${bottom}.`);
      borrow = 1;
      continue;
    }
    if (p === 1 && acrossZero) {
      // 10 tens, one traded on to the ones.
      steps.push(bottom ? `Tens: 9 − ${bottom}.` : "Tens: 9 tens are left.");
      borrow = 1;
      continue;
    }
    if (p > 0 && bottom === 0 && top === 0 && p === da.length - 1) break;
    if (top < bottom) {
      steps.push(
        `${PLACE[p]}: ${top} is less than ${bottom}. Trade 1 ${UNIT[p + 1].replace(/s$/, "")} for 10 ${UNIT[p]}: ${top + 10} − ${bottom}.`
      );
      borrow = 1;
    } else {
      const one = UNIT[p].replace(/s$/, "");
      steps.push(bottom ? `${PLACE[p]}: ${top} − ${bottom}.` : `${PLACE[p]}: ${top} ${top === 1 ? `${one} is` : `${UNIT[p]} are`} left.`);
      borrow = 0;
    }
  }
  steps.push(answer >= 100 ? "Put the hundreds, tens and ones together." : "Put the tens and ones together.");
  return steps;
}

/**
 * The hint for one item: a nudge, its steps worked on its own numbers, and
 * a feedback line for each slip it can show. A line that would state the
 * key is swapped for one with no numbers (the hintNoAnswer gate).
 */
function calcHint(item, slips) {
  const { terms, ops, answer } = item;
  let nudge;
  let steps;
  if (terms.length === 3 && ops[0] === MINUS) {
    const middle = terms[0] - terms[1];
    nudge = "Work from left to right: the first sign, then the second.";
    steps = [`First: ${terms[0]} ${MINUS} ${terms[1]} = ${middle}.`, `Then: ${middle} ${ops[1]} ${terms[2]}.`];
  } else if (ops.every((o) => o === "+")) {
    nudge = tradeCount(terms, ops) > 0 ? "Add the ones first. Do they make a new ten?" : "Add the ones first, then the next place.";
    steps = addSteps(terms);
  } else {
    nudge = tradeCount(terms, ops) > 0 ? "Start with the ones. Are there enough ones to take away?" : "Take away the ones first, then the next place.";
    steps = subtractSteps(terms[0], terms[1], answer);
  }
  const SAFE = "Work this place the same way.";
  steps = steps.map((line) => (hintContainsAnswer({ steps: [line] }, answer) ? SAFE : line));
  const feedback = {};
  for (const [value, tag] of Object.entries(slips)) feedback[value] = SLIP_FEEDBACK[tag];
  return Object.keys(feedback).length ? { nudge, steps, feedback } : { nudge, steps };
}

// ── Items ────────────────────────────────────────────────────────────────

/** The slips that apply to one draw: { "83": "forgotToCarry", ... }, or null when two collide. */
function slipsFor(row, item) {
  const out = {};
  for (const tag of row.mistakes) {
    const v = slipValue(tag, item);
    if (v == null || !Number.isInteger(v) || v <= 0 || v === item.answer) continue;
    if (out[v] != null) return null;
    out[v] = tag;
  }
  return out;
}

/** Does a draw keep its row's and variant's rules? */
function keeps(row, variant, draw, index) {
  if (!variant.ok(draw, index)) return false;
  const answer = evaluate(draw.terms, draw.ops);
  if (!Number.isInteger(answer) || answer < 2) return false;
  const count = tradeCount(draw.terms, draw.ops);
  if (!(variant.regroups || variant.trades).includes(count)) return false;
  if (variant.acrossZero && !subtractColumns(draw.terms[0], draw.terms[1]).acrossZero) return false;
  return true;
}

/**
 * One item for a row and variant, from a draw: the bank row shape
 * (factBankItems' shape), with its hint and tags.
 */
function buildItem(row, variant, draw) {
  const answer = evaluate(draw.terms, draw.ops);
  const item = { ...draw, answer };
  const slips = slipsFor(row, item);
  if (!slips) return null;
  const named = new Set(Object.values(slips));
  if ((variant.requires || []).some((tag) => !named.has(tag))) return null;
  const promptText = `${draw.terms.map((t, i) => (i === 0 ? `${t}` : `${draw.ops[i - 1]} ${t}`)).join(" ")} = ?`;
  const isTwo = draw.terms.length === 2;
  const question = {
    a: isTwo ? draw.terms[0] : null,
    b: isTwo ? draw.terms[1] : null,
    op: isTwo ? draw.ops[0] : null,
    answer,
    answerType: "numberPad",
    display: { promptText, layout: row.layout },
  };
  const short = row.rowId.replace(/^calc-g2-/, "");
  const key = draw.terms.map((t, i) => (i === 0 ? `${t}` : `${draw.ops[i - 1] === "+" ? "p" : "m"}${t}`)).join("");
  return {
    itemId: `multiDigit-v2-${short}-${key}`,
    modeId: "multiDigit",
    itemFamily: "procedural",
    subskill: row.subskill,
    structureType: row.structureType,
    levelRange: [...GRADE2_LEVELS],
    reviewStatus: "approved",
    version: 2,
    blueprintId: row.rowId,
    difficulty: variant.difficulty,
    hint: calcHint(item, slips),
    tags: {
      grade: "2",
      standards: row.standards,
      difficulty: variant.difficulty,
      format: "typed",
      widget: "numberPad",
      family: "procedural",
      variant: variant.id,
      mistakes: slips,
    },
    question,
  };
}

/**
 * One random item for a row and variant (the fallback generator's draw),
 * or the item for draw `index` under a seeded `rng` (the bank build).
 * Rejection sampling: draws until one keeps every rule.
 */
export function drawCalcItem(rowId, variantId, { rng = Math.random, index = 0, taken = null } = {}) {
  const row = calcRow(rowId);
  const variant = calcVariant(rowId, variantId);
  if (!row || !variant) throw new Error(`unknown calc row or variant: ${rowId} ${variantId}`);
  for (let guard = 0; guard < 5000; guard += 1) {
    const draw = variant.draw(rng, index);
    if (!keeps(row, variant, draw, index)) continue;
    const item = buildItem(row, variant, draw);
    if (!item) continue;
    if (taken && taken.has(item.question.display.promptText)) continue;
    return item;
  }
  throw new Error(`no draw keeps the rules of ${rowId} ${variantId}`);
}

/**
 * The worked examples of the hint pane (src/hints/concepts.js, multiDigit):
 * no item and no fallback question ever uses one, so the example never
 * shows a kid's own answer (multiDigit.spec ties the two lists).
 */
export const HINT_EXAMPLE_PROMPTS = new Set([
  "56 + 27 = ?",
  "24 + 35 + 16 = ?",
  "362 + 245 = ?",
  "452 + 100 = ?",
  "36 + 18 = ? + 20",
  "995 + 10 = ?",
]);

/** Items per variant in the bank build: 24 variants, 600 items. */
export const ITEMS_PER_VARIANT = 25;

/**
 * Every item the script route makes, in row and variant order. Seeded by
 * row and variant, so a rerun makes the same ids and numbers, and every
 * prompt is unique across the set.
 */
export function calcBankItems({ perVariant = ITEMS_PER_VARIANT } = {}) {
  const items = [];
  const taken = new Set(HINT_EXAMPLE_PROMPTS);
  for (const row of CALC_ROWS) {
    for (const variant of row.variants) {
      const rng = mulberry32(seedOf(`${row.rowId}/${variant.id}`));
      for (let index = 0; index < perVariant; index += 1) {
        const item = drawCalcItem(row.rowId, variant.id, { rng, index, taken });
        taken.add(item.question.display.promptText);
        items.push(item);
      }
    }
  }
  return items;
}

// ── The checks ───────────────────────────────────────────────────────────

/**
 * The script route's own gate, run on every item before it is loaded:
 * every problem with one item, or [] when it is sound. It recomputes from
 * the printed prompt, not from the stored numbers, so a payload that drifts
 * from what the kid sees fails.
 */
export function checkCalcItem(item) {
  const problems = [];
  const row = calcRow(item?.blueprintId);
  if (!row) return [`unknown row ${item?.blueprintId}`];
  const variant = calcVariant(row.rowId, item.tags?.variant);
  if (!variant) problems.push(`unknown variant ${item.tags?.variant}`);
  const q = item.question || {};
  const parsed = parsePrompt(q.display?.promptText);
  if (!parsed) return [...problems, `prompt is not a bare number sentence: "${q.display?.promptText}"`];
  const { terms, ops } = parsed;
  const key = evaluate(terms, ops);

  // The key.
  if (q.answer !== key) problems.push(`key ${q.answer} but the prompt makes ${key}`);
  if (q.answerType !== "numberPad") problems.push("answered on the number pad");
  if (terms.length === 2 && (q.a !== terms[0] || q.b !== terms[1] || q.op !== ops[0])) {
    problems.push("a, b and op must be the printed numbers and sign, so the stacked layout shows the same question");
  }
  if (terms.length !== 2 && (q.a != null || q.b != null)) problems.push("a and b stay empty for three or more numbers");
  if (q.display?.layout !== row.layout) problems.push(`layout must be ${row.layout}`);

  // The row's identity.
  if (item.modeId !== "multiDigit") problems.push("modeId must be multiDigit");
  if (item.subskill !== row.subskill) problems.push(`subskill must be ${row.subskill}`);
  if (item.structureType !== row.structureType) problems.push(`structureType must be ${row.structureType}`);
  if (item.itemFamily !== "procedural") problems.push("family must be procedural");
  if (item.version !== 2) problems.push("version must be 2");
  if (JSON.stringify(item.levelRange) !== JSON.stringify(GRADE2_LEVELS)) problems.push("levelRange must be [4, 6]");

  // The trade counts and number rules.
  if (variant) {
    const count = tradeCount(terms, ops);
    const allowed = variant.regroups || variant.trades;
    if (!allowed.includes(count)) problems.push(`${count} regroups or trades, but ${variant.id} allows ${allowed.join(" or ")}`);
    if (variant.acrossZero && !subtractColumns(terms[0], terms[1]).acrossZero) problems.push("the ones must trade across a zero");
    if (item.difficulty !== variant.difficulty) problems.push(`difficulty must be ${variant.difficulty}`);
    const named = new Set(Object.values(item.tags?.mistakes || {}));
    for (const tag of variant.requires || []) if (!named.has(tag)) problems.push(`${variant.id} items show the ${tag} slip`);
  }
  if (key < 2) problems.push("the answer is at least 2");
  if (ROW_LIMITS[row.rowId] && !ROW_LIMITS[row.rowId](terms, ops, key)) problems.push(`numbers outside row ${row.rowId}'s range`);

  // The slips.
  const slips = item.tags?.mistakes || {};
  const feedback = item.hint?.feedback || {};
  for (const [value, tag] of Object.entries(slips)) {
    if (!row.mistakes.includes(tag)) problems.push(`slip ${tag} is not one of the row's`);
    if (Number(value) === key) problems.push(`slip ${tag} equals the key`);
    if (slipValue(tag, { terms, ops, answer: key }) !== Number(value)) problems.push(`slip ${tag} should be ${slipValue(tag, { terms, ops, answer: key })}, not ${value}`);
    if (typeof feedback[value] !== "string") problems.push(`no feedback line for ${value}`);
  }
  if (Object.keys(feedback).some((v) => !(v in slips))) problems.push("a feedback line for a slip the item does not name");

  // The hint never hands over the key.
  if (!item.hint?.nudge || !Array.isArray(item.hint?.steps) || !item.hint.steps.length) problems.push("hint needs a nudge and steps");
  if (hintContainsAnswer(item.hint, key)) problems.push("the hint states the answer");
  return problems;
}

/** Each row's number range, from the row's `numbers` note, on the printed numbers. */
const ROW_LIMITS = {
  "calc-g2-add-100": (t, o, k) => k <= 100 && t.every((n) => n >= 1 && n <= 99),
  "calc-g2-sub-100": (t, o, k) => t[0] >= 20 && t[0] <= 99 && k >= 2,
  "calc-g2-add-several": (t, o, k) =>
    k <= 100 && ((t.length === 3 && t.every((n) => n >= 10 && n <= 49)) || (t.length === 4 && t.every((n) => n >= 10 && n <= 29))),
  "calc-g2-add-sub-three": (t, o, k) =>
    t.length === 3 && o[0] === MINUS && t[0] >= 30 && t[0] <= 99 && t[0] - t[1] <= 100 && k <= 100 && t.slice(1).filter((n) => n <= 9).length === 1,
  "calc-g2-add-1000": (t, o, k) => k <= 999 && width(t[0]) === 3 && width(t[1]) >= 2,
  "calc-g2-add-past-100": (t, o, k) => t.every((n) => n >= 21 && n <= 99) && k >= 101 && k <= 198,
  "calc-g2-add-1000-two-trades": (t, o, k) => k <= 999 && width(t[0]) === width(t[1]),
  "calc-g2-add-several-past-100": (t, o, k) =>
    k >= 101 && k <= 199 && ((t.length === 3 && t.every((n) => n >= 21 && n <= 59)) || (t.length === 4 && t.every((n) => n >= 11 && n <= 49))),
  "calc-g2-sub-1000": (t, o, k) => (width(t[1]) === 3 ? k >= 100 : t[0] >= 101 && t[0] <= 199 && k < 100) && tensOf(t[0]) !== 0,
  "calc-g2-sub-1000-two-trades": (t, o, k) => !hasZeroDigit(t[0]) && (width(t[1]) === 3 ? k >= 100 : t[0] >= 101 && t[0] <= 199 && k < 100),
  "calc-g2-across-zero": (t, o, k) =>
    tensOf(t[0]) === 0 && (t[0] >= 100 && t[0] <= 109 ? k < 100 : k >= 100 && hundredsOf(t[0]) >= 2),
};
