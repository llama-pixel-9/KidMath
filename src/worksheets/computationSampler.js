/* Bare `a op b` problems built to a skill's claim.
 *
 * The mode generators size numbers by level ceiling only — they cannot promise
 * "3-digit with regrouping" or "the 7, 8 and 9 tables" — and the bank holds a
 * few dozen bare facts per band. A drill has no wording to review and an
 * unbounded number space, so it is built here, to the claim.
 */
import { randInt, shuffleArray } from "../modes/helpers.js";
import { computationKey, isTrivialFact } from "../mathEngine.js";
import { regroups } from "./claimCheck.js";

const pick = (list) => list[randInt(0, list.length - 1)];
const inRange = (n, range) => !range || (n >= range[0] && n <= range[1]);
const digitsOf = (n) => String(n).length;

// Column by column, so a no-regrouping pair never needs a retry: 3-digit sums
// with no carry are ~1 in 7 of random pairs, differences with no borrow rarer.
function noRegroupPair(op, claim) {
  const lengthA = digitsOf(claim.a[1]);
  const lengthB = digitsOf(claim.b[1]);
  let a = 0;
  let b = 0;
  for (let place = 0; place < lengthA; place += 1) {
    const leadingA = place === lengthA - 1;
    const leadingB = place === lengthB - 1;
    const hasB = place < lengthB;
    let da;
    let db;
    if (op === "+") {
      db = hasB ? randInt(leadingB ? 1 : 0, leadingA ? 8 : 9) : 0;
      da = randInt(leadingA ? 1 : 0, 9 - db);
    } else {
      db = hasB ? randInt(leadingB ? 1 : 0, 9) : 0;
      da = randInt(Math.max(db, leadingA ? 1 : 0), 9);
    }
    a += da * 10 ** place;
    b += db * 10 ** place;
  }
  return [a, b];
}

function additive(claim) {
  const op = claim.op;
  const [a, b] =
    claim.regroup === "none" ? noRegroupPair(op, claim) : [randInt(...claim.a), randInt(...claim.b)];
  if (!inRange(a, claim.a) || !inRange(b, claim.b)) return null;
  const answer = op === "+" ? a + b : a - b;
  if (answer < 0) return null;
  if (op === "+" && !inRange(answer, claim.total)) return null;
  if (op === "-" && !inRange(answer, claim.difference)) return null;
  if (claim.regroup === "required" && !regroups(a, b, op)) return null;
  if (claim.minuendZero && !String(a).slice(1).includes("0")) return null;
  return { a, b, op, answer };
}

function minuendWithZero(claim) {
  // Random 3-digit minuends carry a zero ~1 time in 5; build one instead.
  const hundreds = randInt(1, 9);
  const a = pick([hundreds * 100, hundreds * 100 + randInt(1, 9), hundreds * 100 + randInt(1, 9) * 10]);
  return additive({ ...claim, a: [a, a] });
}

function multiplicative(claim) {
  let a;
  let b;
  if (claim.table) {
    a = pick(claim.table);
    b = randInt(...claim.b);
    if (Math.random() < 0.5) [a, b] = [b, a];
  } else {
    a = randInt(...claim.a);
    b = claim.bStep ? randInt(claim.b[0] / claim.bStep, claim.b[1] / claim.bStep) * claim.bStep : randInt(...claim.b);
  }
  return { a, b, op: "x", answer: a * b };
}

function division(claim) {
  const b = claim.table ? pick(claim.table) : randInt(...claim.b);
  const quotient = randInt(...claim.quotient);
  const remainder =
    claim.remainder === "required" ? randInt(1, b - 1) : claim.remainder === "any" && Math.random() < 0.5 ? randInt(1, b - 1) : 0;
  const a = b * quotient + remainder;
  if (!inRange(a, claim.dividend)) return null;
  return remainder ? { a, b, op: "/", answer: quotient, remainder } : { a, b, op: "/", answer: quotient };
}

function sampleOnce(claim) {
  if (claim.op === "/") return division(claim);
  if (claim.op === "x") return multiplicative(claim);
  return claim.minuendZero ? minuendWithZero(claim) : additive(claim);
}

/** One problem that satisfies `claim`, or null if the claim cannot be met. */
export function sampleComputation(claim, mode) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const built = sampleOnce(claim);
    if (!built) continue;
    return {
      ...built,
      mode,
      metadata: {
        modeId: mode,
        itemFamily: "procedural",
        subskill: "worksheetComputation",
        structureType: "worksheetComputation",
        itemSource: "worksheetSampler",
      },
    };
  }
  return null;
}

/**
 * `count` problems for one sheet: no duplicate facts, at most one identity
 * fact (n × 1, n + 0), and — only when the skill's whole fact pool is smaller
 * than a sheet ("add within 5" has ten facts) — spaced repeats to fill the
 * page, exactly as the old drill sheets did.
 */
export function sampleSheet(claim, mode, count, seenKeys = new Set()) {
  // Fact skills print 3 × 7 and 7 × 3 as different problems; computationKey
  // folds commutative pairs together, which is right for multi-digit sheets.
  const keyOf = (q) => (claim.ordered ? `${q.op}:${q.a},${q.b}` : computationKey(q));
  const out = [];
  let trivialUsed = false;
  // `reach` is part of the promise ("facts to 10 × 10" must get past 30), so it
  // is built in, not left to chance: the first share of the sheet is drawn from
  // the far side of the line, then the whole sheet is shuffled.
  const mustReach = claim.reach ? Math.ceil(claim.reach.share * count) : 0;
  const size = (q) => (q.op === "+" ? q.a + q.b : q.op === "x" ? q.a * q.b : q.a);
  for (let attempt = 0; attempt < count * 80 && out.length < count; attempt += 1) {
    const q = sampleComputation(claim, mode);
    if (!q) break;
    if (out.length < mustReach && size(q) <= claim.reach.over) continue;
    const key = keyOf(q);
    if (seenKeys.has(key)) continue;
    if (isTrivialFact(q)) {
      if (trivialUsed) continue;
      trivialUsed = true;
    }
    seenKeys.add(key);
    out.push(q);
  }
  for (let attempt = 0; attempt < count * 80 && out.length < count; attempt += 1) {
    const q = sampleComputation(claim, mode);
    if (!q) break;
    const previous = out[out.length - 1];
    // Later sheets of a run can exhaust the fresh far-side facts; repeats must
    // still keep the promise.
    if (out.length < mustReach && size(q) <= claim.reach.over) continue;
    if (isTrivialFact(q) || (previous && keyOf(q) === keyOf(previous))) continue;
    out.push(q);
  }
  return mustReach ? shuffleArray(out) : out;
}
