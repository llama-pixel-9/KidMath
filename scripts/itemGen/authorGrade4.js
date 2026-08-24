#!/usr/bin/env node
/**
 * Grade-4 completion batch (kid-sim curriculum plan, Phase 1): deterministic
 * bank items for the cells the coverage gate now demands and the content the
 * generators could produce but the full bank shadowed:
 *
 *   division · remainders        [7,10]  proc / conc / app   (4.OA.3, 4.NBT.6)
 *   placeValue · rounding        [4,6] + [7,10] all families (3.NBT.1, 4.NBT.3)
 *   multiplication · multi-digit [8,10]  proc / conc         (4.NBT.5)
 *   addition · multi-digit       [8,10]  proc / conc         (4.NBT.4)
 *   subtraction · multi-digit    [8,10]  proc / conc         (4.NBT.4)
 *
 * Everything is template-generated with answers re-derived here (no LLM), in
 * the b0821 style: one mode per runAssembler call, ≥50 per contributed cell,
 * gate-verified before write.
 *
 * Usage:
 *   node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorGrade4.js            dry run
 *   ... --write --tag b0823                                                                    write drafts
 */

import { runAssembler } from "./bankAssembler.js";
import { NAMES } from "./counting/countingTemplates.js";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const flag = (n, d = null) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const now = new Date();
const TAG = flag("tag", `b${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);
const nameAt = (i) => NAMES[i % NAMES.length];
const pickBy = (arr, i) => arr[i % arr.length];

const raw = { division: [], placeValue: [], multiplication: [], addition: [], subtraction: [] };
function push(modeId, itemFamily, subskill, structureType, levelRange, question) {
  raw[modeId].push({ modeId, itemFamily, subskill, structureType, levelRange, question });
}

/* ---------------- division · remainders (levelRange [7,10]) --------------- */

// (divisor, quotient, remainder) triples — varied, no repeated dividends.
const REM = [];
{
  const seen = new Set();
  let q = 4;
  for (const d of [3, 4, 5, 6, 7, 8, 9]) {
    for (let k = 0; k < 12; k += 1) {
      q = q >= 12 ? 3 : q + 1;
      const r = 1 + ((k + d) % (d - 1));
      const p = d * q + r;
      if (seen.has(p * 100 + d)) continue;
      seen.add(p * 100 + d);
      REM.push({ d, q, r, p });
    }
  }
}

// procedural — letter-free drill forms (words-off sessions serve these).
REM.slice(0, 64).forEach(({ d, q, r, p }, i) => {
  const askQuotient = i % 2 === 0;
  push("division", "procedural", "remainders", askQuotient ? "divisionRemainderQuotient" : "divisionRemainderLeft", [7, 10], {
    a: p,
    b: null,
    op: "/",
    answer: askQuotient ? q : r,
    answerType: "numberPad",
    display: { promptText: askQuotient ? `${p} ÷ ${d} = ? r ${r}` : `${p} ÷ ${d} = ${q} r ?` },
  });
});

// conceptual — judged claims and bounded-leftover reasoning.
REM.slice(0, 60).forEach(({ d, q, r, p }, i) => {
  if (i % 2 === 0) {
    const truthful = i % 4 === 0;
    const claim = truthful ? r : (r % (d - 1)) + 1 === r ? ((r + 1) % (d - 1)) + 1 : (r % (d - 1)) + 1;
    push("division", "conceptual", "remainders", "remainderJudged", [7, 10], {
      a: p,
      b: null,
      op: "/",
      answer: claim === r ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { promptText: `${nameAt(i)} says ${p} ÷ ${d} leaves ${claim} left over. Is that right?` },
    });
  } else {
    const boundedPhr = [
      (P, D) => `Split ${P} into groups of ${D}. What is left over?`,
      (P, D) => `Make groups of ${D} from ${P}. What number is left over?`,
      (P, D) => `${P} split into ${D}s — what number is left over?`,
      (P, D) => `Take ${P} and fill groups of ${D}. What is the leftover?`,
      (P, D) => `Group ${P} by ${D}. What number does not fit a full group?`,
      (P, D) => `After making every full group of ${D} from ${P}, what number remains?`,
      (P, D) => `${P} shared in ${D}s — the leftover must be under ${D}. What is it?`,
    ];
    push("division", "conceptual", "remainders", "remainderBounded", [7, 10], {
      a: p,
      b: null,
      op: "/",
      answer: r,
      answerType: "numberPad",
      display: { promptText: pickBy(boundedPhr, Math.floor(i / 2))(p, d) },
    });
  }
});

// application — shared-with-leftover and round-up stories.
const REM_NOUNS = ["stickers", "marbles", "crayons", "shells", "trading cards", "bookmarks", "acorns", "buttons"];
const REM_HOLDERS = ["boxes", "bags", "baskets", "jars"];
REM.slice(0, 60).forEach(({ d, q, r, p }, i) => {
  const noun = pickBy(REM_NOUNS, i);
  const holder = pickBy(REM_HOLDERS, i);
  const name = nameAt(i + 5);
  if (i % 2 === 0) {
    push("division", "application", "remainders", "remainderStoryLeft", [7, 10], {
      a: p,
      b: null,
      op: "/",
      answer: r,
      answerType: "numberPad",
      display: {
        promptText: `${name} shares ${p} ${noun} equally among ${d} ${holder}. How many ${noun} are left over?`,
      },
    });
  } else {
    push("division", "application", "remainders", "remainderStoryRoundUp", [7, 10], {
      a: p,
      b: null,
      op: "/",
      answer: q + 1,
      answerType: "numberPad",
      display: {
        promptText: `${name} packs ${p} ${noun} with ${d} in each of the ${holder}. Every single one must be packed. How many ${holder} does ${name} need?`,
      },
    });
  }
});

/* ---------------- placeValue · rounding ([4,6] and [7,10]) ---------------- */

const UNIT_WORDS = { 10: "ten", 100: "hundred", 1000: "thousand" };
const roundTo = (n, u) => Math.round(n / u) * u;
let neighborIdx = 0;

// Deterministic (n, unit) pools per band, midpoints avoided.
function roundingPool(band) {
  const out = [];
  if (band === 2) {
    for (let i = 0; i < 70; i += 1) {
      const n = 11 + ((i * 13) % 88);
      if (n % 10 === 5 || n % 10 === 0) continue;
      out.push({ n, u: 10 });
    }
  } else {
    for (let i = 0; i < 90; i += 1) {
      const u = [10, 100, 1000][i % 3];
      const base = [317, 4283, 61754][i % 3];
      const n = base + i * (u === 10 ? 37 : u === 100 ? 391 : 4177);
      if ((n % u) * 2 === u || n % u === 0) continue;
      out.push({ n, u });
    }
  }
  return out;
}

for (const band of [2, 3]) {
  const range = band === 2 ? [4, 6] : [7, 10];
  const pool = roundingPool(band);
  // procedural drill
  pool.slice(0, 54).forEach(({ n, u }) => {
    push("placeValue", "procedural", "rounding", "roundToNearestDrill", range, {
      a: n,
      b: null,
      op: "place",
      answer: roundTo(n, u),
      answerType: "numberPad",
      display: { promptText: `Round ${n} to the nearest ${UNIT_WORDS[u]}.` },
    });
  });
  // conceptual — neighbor pick + judged
  pool.slice(0, 54).forEach(({ n, u }, i) => {
    const low = Math.floor(n / u) * u;
    const high = low + u;
    if (i % 2 === 0) {
      push("placeValue", "conceptual", "rounding", "roundNeighborPick", range, {
        a: n,
        b: null,
        op: "place",
        answer: roundTo(n, u),
        choices: i % 4 === 0 ? [low, high] : [high, low],
        display: {
          promptText: pickBy([
            (N, L, H) => `${N} sits between ${L} and ${H} on the number line. Which is it nearer to?`,
            (N, L, H) => `On a number line, ${N} lands between ${L} and ${H}. Which one is it closer to?`,
            (N, L, H) => `Between ${L} and ${H}, where does ${N} lean — which is nearer?`,
            (N, L, H) => `${N} is somewhere between ${L} and ${H}. Which end is it closer to?`,
            (N, L, H) => `Which is ${N} nearer to: ${L} or ${H}?`,
            (N, L, H) => `Think of ${N} between ${L} and ${H}. Which neighbor is closer?`,
            (N, L, H) => `Picture ${N} on the line from ${L} to ${H}. Which mark is it closer to?`,
            (N, L, H) => `The number ${N} falls between ${L} and ${H}. Which one is closer?`,
            (N, L, H) => `From ${N}, is it a shorter hop to ${L} or to ${H}?`,
            (N, L, H) => `${L} and ${H} are the neighbors of ${N}. Which neighbor is nearest?`,
            (N, L, H) => `Closer call: does ${N} sit nearer ${L} or nearer ${H}?`,
            (N, L, H) => `Place ${N} between ${L} and ${H}. Toward which end does it sit?`,
          ], neighborIdx++)(n, low, high),
        },
      });
    } else {
      const truthful = i % 4 === 1;
      const claim = truthful ? roundTo(n, u) : roundTo(n, u) + (n % u > u / 2 ? -u : u);
      push("placeValue", "conceptual", "rounding", "roundJudged", [range[0], range[1]], {
        a: n,
        b: null,
        op: "place",
        answer: claim === roundTo(n, u) ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { promptText: `${nameAt(i)} rounds ${n} to the nearest ${UNIT_WORDS[u]} and gets ${claim}. Is that right?` },
      });
    }
  });
  // application — "about how many" estimation stories
  const R_NOUNS = ["beads", "stamps", "seeds", "pennies", "paper clips", "blocks", "leaves", "tickets"];
  pool.slice(0, 54).forEach(({ n, u }, i) => {
    const noun = pickBy(R_NOUNS, i);
    const verb = pickBy(["counted", "collected", "sorted", "packed"], i + 1);
    push("placeValue", "application", "rounding", "roundStory", range, {
      a: n,
      b: null,
      op: "place",
      answer: roundTo(n, u),
      answerType: "numberPad",
      display: {
        promptText: `${nameAt(i + 3)} ${verb} ${n} ${noun}. About how many ${noun} is that, to the nearest ${UNIT_WORDS[u]}?`,
      },
    });
  });
}

/* -------- multi-digit enrichment ([8,10]) — mult / addition / subtraction - */

// multiplication: 2-digit × 1-digit and 2-digit × 2-digit (4.NBT.5)
{
  const pairs = [];
  for (let i = 0; i < 80; i += 1) {
    const twoByTwo = i % 2 === 1;
    const a = 12 + ((i * 7) % 76); // 12..87
    const b = twoByTwo ? 11 + ((i * 5) % 14) : 3 + (i % 7); // 11..24 or 3..9
    if (pairs.some(([x, y]) => x === a && y === b)) continue;
    pairs.push([a, b]);
  }
  pairs.slice(0, 54).forEach(([a, b], i) => {
    push("multiplication", "procedural", "factFluency", "multiDigitProduct", [8, 10], {
      a,
      b,
      op: "x",
      answer: a * b,
      answerType: "numberPad",
      display: { promptText: pickBy([`${a} × ${b} = ?`, `${a} × ${b} = ?`, `What is ${a} × ${b}?`], i) },
    });
  });
  pairs.slice(0, 54).forEach(([a, b], i) => {
    push("multiplication", "conceptual", "equalGroups", "multiDigitMissingFactor", [8, 10], {
      a,
      b: null,
      op: "x",
      answer: b,
      answerType: "numberPad",
      display: {
        promptText: pickBy([
          (A, P) => `${A} × ? = ${P}`,
          (A, P) => `${A} times what number makes ${P}?`,
          (A, P) => `What number times ${A} equals ${P}?`,
          (A, P) => `${A} groups of some number make ${P}. What is the number?`,
          (A, P) => `Fill the blank: ${A} × ? = ${P}.`,
          (A, P) => `Which factor pairs with ${A} to make ${P}?`,
          (A, P) => `${P} is ${A} times what number?`,
          (A, P) => `${P} split into ${A} equal groups puts what number in each group?`,
          (A, P) => `Multiply ${A} by what to reach ${P}?`,
          (A, P) => `The missing factor in ${A} × ? = ${P} is what?`,
          (A, P) => `${A} rows with the same count make ${P}. What is the count per row?`,
        ], i)(a, a * b),
      },
    });
  });
  pairs.slice(0, 54).forEach(([a, b], i) => {
    const split = b - 10 > 0 ? 10 : 1;
    push("multiplication", "conceptual", "arrayReasoning", "multiDigitDistributive", [8, 10], {
      a,
      b,
      op: "x",
      answer: a * b,
      answerType: "numberPad",
      display: {
        promptText: pickBy([
          (A, B, S) => `${A} × ${B} = ${A} × ${S} + ${A} × ${B - S}. What is ${A} × ${B}?`,
          (A, B, S) => `Break it apart into ${A} × ${S} plus ${A} × ${B - S}. What is ${A} × ${B}?`,
          (A, B, S) => `Use ${A} × ${S} and ${A} × ${B - S} to work it out. What is ${A} × ${B}?`,
          (A, B, S) => `${A} × ${S} + ${A} × ${B - S} gives the same total. What is ${A} × ${B}?`,
          (A, B, S) => `Split ${B} into ${S} and ${B - S}, multiply each by ${A}, then add. What is ${A} × ${B}?`,
          (A, B, S) => `A grid has ${S} columns then ${B - S} more, with ${A} rows. What is ${A} × ${B}?`,
          (A, B, S) => `Two easy products, ${A} × ${S} and ${A} × ${B - S}, add up to it. What is ${A} × ${B}?`,
          (A, B, S) => `First find ${A} × ${S}, then ${A} × ${B - S}, then add. What is ${A} × ${B}?`,
          (A, B, S) => `${B} is ${S} + ${B - S}, so add the two partial products. What is ${A} × ${B}?`,
          (A, B, S) => `Think ${A} × ${S} and ${A} × ${B - S}. Together, what is ${A} × ${B}?`,
          (A, B, S) => `The two parts are ${A} × ${S} and ${A} × ${B - S}. What is ${A} × ${B}?`,
        ], i)(a, b, split),
      },
    });
  });
}

// addition / subtraction: 3-digit with regrouping (3.NBT.2 / 4.NBT.4)
{
  const sums = [];
  for (let i = 0; i < 220 && sums.length < 60; i += 1) {
    const x = 118 + ((i * 47) % 640);
    const y = 87 + ((i * 61) % 500);
    if (x + y > 999) continue;
    if ((x % 10) + (y % 10) < 10 && (Math.floor(x / 10) % 10) + (Math.floor(y / 10) % 10) < 10) continue; // require regrouping
    if (sums.some(([p, q2]) => p === x && q2 === y)) continue;
    sums.push([x, y]);
  }
  sums.slice(0, 54).forEach(([x, y], i) => {
    push("addition", "procedural", "composeDecompose", "multiDigitSum", [8, 10], {
      a: x,
      b: y,
      op: "+",
      answer: x + y,
      answerType: "numberPad",
      display: { promptText: pickBy([`${x} + ${y} = ?`, `What is ${x} + ${y}?`], i) },
    });
  });
  sums.slice(0, 54).forEach(([x, y], i2) => {
    push("addition", "conceptual", "unknownAddend", "multiDigitMissingAddend", [8, 10], {
      a: x,
      b: null,
      op: "+",
      answer: y,
      answerType: "numberPad",
      display: {
        promptText: pickBy([
          (X, Z) => `${X} + ? = ${Z}`,
          (X, Z) => `What number added to ${X} makes ${Z}?`,
          (X, Z) => `${X} plus what number equals ${Z}?`,
          (X, Z) => `How much more than ${X} is ${Z}?`,
          (X, Z) => `Fill the blank: ${X} + ? = ${Z}.`,
          (X, Z) => `Start at ${X}. How far to ${Z}?`,
          (X, Z) => `${Z} is ${X} plus what number?`,
          (X, Z) => `Which number completes ${X} + ? = ${Z}?`,
          (X, Z) => `The jump from ${X} up to ${Z} is how big?`,
          (X, Z) => `Add what to ${X} to reach ${Z}?`,
          (X, Z) => `${X} and what number together make ${Z}?`,
          (X, Z) => `From ${X}, what number gets you to ${Z}?`,
        ], i2)(x, x + y),
      },
    });
  });
  sums.slice(0, 54).forEach(([x, y], i) => {
    const z = x + y;
    push("subtraction", "procedural", "decomposeToSubtract", "multiDigitDifference", [8, 10], {
      a: z,
      b: y,
      op: "-",
      answer: x,
      answerType: "numberPad",
      display: { promptText: pickBy([`${z} − ${y} = ?`, `What is ${z} − ${y}?`], i) },
    });
  });
  sums.slice(0, 54).forEach(([x, y], i2) => {
    const z = x + y;
    push("subtraction", "conceptual", "unknownSubtrahend", "multiDigitMissingSubtrahend", [8, 10], {
      a: z,
      b: null,
      op: "-",
      answer: y,
      answerType: "numberPad",
      display: {
        promptText: pickBy([
          (Z, X) => `${Z} − ? = ${X}`,
          (Z, X) => `Take what number from ${Z} to leave ${X}?`,
          (Z, X) => `${Z} minus what number equals ${X}?`,
          (Z, X) => `How much must come off ${Z} to reach ${X}?`,
          (Z, X) => `Fill the blank: ${Z} − ? = ${X}.`,
          (Z, X) => `Which number completes ${Z} − ? = ${X}?`,
          (Z, X) => `Start at ${Z}. How far down to ${X}?`,
          (Z, X) => `${Z} drops to ${X} after subtracting what number?`,
          (Z, X) => `Subtract what from ${Z} to get ${X}?`,
          (Z, X) => `The gap between ${Z} and ${X} is what number?`,
          (Z, X) => `What number taken from ${Z} leaves ${X}?`,
          (Z, X) => `${X} is ${Z} minus what number?`,
        ], i2)(z, x)
      },
    });
  });
}

/* ---------------- re-derive every answer, then assemble ------------------- */

function expected(item) {
  const t = item.question.display.promptText;
  const nums = (t.match(/\d+/g) || []).map(Number);
  switch (item.structureType) {
    case "divisionRemainderQuotient": {
      const [p, d, r] = nums;
      return (p - r) / d;
    }
    case "divisionRemainderLeft": {
      const [p, d, q] = nums;
      return p - d * q;
    }
    case "remainderJudged": {
      const [p, d, claim] = nums;
      return p % d === claim ? "Yes" : "No";
    }
    case "remainderBounded": {
      const p = Math.max(...nums);
      const d = Math.min(...nums);
      return p % d;
    }
    case "remainderStoryLeft": {
      const [p, d] = nums;
      return p % d;
    }
    case "remainderStoryRoundUp": {
      const [p, d] = nums;
      return Math.ceil(p / d);
    }
    case "roundToNearestDrill":
    case "roundStory": {
      const [n] = nums;
      const u = t.includes("thousand") ? 1000 : t.includes("hundred") ? 100 : 10;
      return roundTo(n, u);
    }
    case "roundNeighborPick": {
      const [low, n, high] = [...nums].sort((x, y) => x - y);
      return n - low < high - n ? low : high;
    }
    case "roundJudged": {
      const [n, claim] = nums;
      const u = t.includes("thousand") ? 1000 : t.includes("hundred") ? 100 : 10;
      return roundTo(n, u) === claim ? "Yes" : "No";
    }
    case "multiDigitProduct": {
      const [a, b] = nums;
      return a * b;
    }
    case "multiDigitMissingFactor": {
      const p = Math.max(...nums);
      const a = Math.min(...nums);
      return p % a === 0 ? p / a : undefined;
    }
    case "multiDigitDistributive": {
      // Every phrasing ends "What is A × B?" — read the last two numbers.
      const b = nums[nums.length - 1];
      const a = nums[nums.length - 2];
      return a * b;
    }
    case "multiDigitSum": {
      const [x, y] = nums;
      return x + y;
    }
    case "multiDigitMissingAddend": {
      return Math.max(...nums) - Math.min(...nums);
    }
    case "multiDigitDifference": {
      const [z, y] = nums;
      return z - y;
    }
    case "multiDigitMissingSubtrahend": {
      return Math.max(...nums) - Math.min(...nums);
    }
    default:
      return undefined;
  }
}

const extraProblems = (item) => {
  const want = expected(item);
  if (want === undefined) return [`no re-derivation for ${item.structureType}`];
  if (String(want) !== String(item.question.answer)) return [`re-derived ${want} ≠ stated ${item.question.answer}`];
  if (item.question.choices && !item.question.choices.map(String).includes(String(item.question.answer))) {
    return ["answer missing from choices"];
  }
  return [];
};

const SUBSKILLS = {
  division: ["partitioning", "inverseFact", "unknownQuotient", "remainders"],
  placeValue: ["tensOnes", "expandedForm", "regroupingSense", "rounding"],
  multiplication: ["equalGroups", "arrayReasoning", "factFluency"],
  addition: ["makeTen", "composeDecompose", "unknownAddend"],
  subtraction: ["differenceAsDistance", "decomposeToSubtract", "unknownSubtrahend"],
};

for (const modeId of Object.keys(raw)) {
  // Enrichment cells already meet the 50-floor in the live bank; the floor
  // here applies to this batch's own cells (remainders, rounding).
  await runAssembler({
    modeId,
    subskills: SUBSKILLS[modeId],
    rawItems: raw[modeId],
    extraProblems,
    batchTag: TAG,
    write: WRITE,
    floor: 50,
  });
}
