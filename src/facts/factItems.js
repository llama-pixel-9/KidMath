/**
 * A fact, asked in each of its formats (fact fluency plan A6), with its hint.
 *
 * Every format but true-or-false is answered on the keypad, so the child
 * recalls the answer instead of recognising it among choices:
 *
 *   plain       8 + 5 = ?                          all facts
 *   stacked     8 over + 5 (layout flag)           addition, subtraction, times tables to 10
 *   missing     8 + ? = 13 · 13 − ? = 5 · 8 × ? = 56 · 56 ÷ ? = 7
 *   trueFalse   8 + 5 = 12, Is this right?         a third of the facts
 *   tenFrame    5 red and 3 blue counters          addition to 10 (Grades K-1)
 *   takeAway    8 counters, 3 crossed out          subtraction to 10 (Grades K-1)
 *   hop         9 − 7 with the hop from 7 to 9     subtraction with an answer of 1 or 2
 *   array       4 rows of 6 dots                   times tables to 10, groups x2 to x9
 *
 * The hint is the plan row's strategy line. A line that would state the
 * answer of the fact being shown is swapped for one worked on other numbers,
 * then for a line with no numbers at all — a hint never hands over the answer
 * (the hintNoAnswer gate). Pure: shared by the mode, the row script and the
 * native engine.
 */
import { FACTS, FACT_ROWS, BAND_LEVELS } from "./factSets.js";
import { hintContainsAnswer } from "../hints/hintSchema.js";

export const FACT_FORMATS = Object.freeze([
  "plain",
  "stacked",
  "missing",
  "trueFalse",
  "tenFrame",
  "takeAway",
  "hop",
  "array",
]);

/** Families by format: an unknown that is not at the end is conceptual. */
export const FORMAT_FAMILY = Object.freeze({
  plain: "procedural",
  stacked: "procedural",
  missing: "conceptual",
  trueFalse: "conceptual",
  tenFrame: "procedural",
  takeAway: "procedural",
  hop: "procedural",
  array: "procedural",
});

// ── Which facts get which format ─────────────────────────────────────────

// True or false is "a few per session": every third fact of each plan row.
function everyThird(f) {
  const row = FACTS.filter((x) => x.rowId === f.rowId);
  return row.indexOf(f) % 3 === 0;
}

/** Does this format apply to this fact? */
export function formatApplies(f, format) {
  switch (format) {
    case "plain":
      return true;
    case "stacked":
      return f.op === "add" || f.op === "sub" || (f.op === "mul" && f.band === "core");
    case "missing":
      // "0 × ? = 0" and "0 ÷ ? = 0" have no single answer.
      if (f.op === "mul") return f.a !== 0;
      if (f.op === "div") return f.a !== 0;
      return true;
    case "trueFalse":
      return everyThird(f);
    case "tenFrame":
      return f.op === "add" && f.a >= 1 && f.b >= 1 && f.answer <= 10;
    case "takeAway":
      return f.op === "sub" && f.b >= 1 && f.a <= 10;
    case "hop":
      return f.op === "sub" && f.b >= 1 && (f.answer === 1 || f.answer === 2);
    case "array":
      return f.op === "mul" && f.band === "core" && f.a >= 1 && f.b >= 1 && f.group >= 2 && f.group <= 7;
    default:
      return false;
  }
}

/** The formats a fact is asked in. */
export function formatsForFact(f) {
  return FACT_FORMATS.filter((fmt) => formatApplies(f, fmt));
}

// ── Hint lines ───────────────────────────────────────────────────────────
//
// Per operation and group: the plan's line first, then a line worked on other
// numbers, then one with no numbers. `reveals` lists results a line states in
// words ("fourteen") that the number check cannot see.

const LINES = {
  add: {
    1: ["Adding zero adds nothing. The number stays the same."],
    2: ["Start at the bigger number and count on 1 (or 2).", "Start at the bigger number and count on."],
    3: [
      "Doubles: think of a picture you know. 6 + 6 is two egg rows of 6: 12.",
      "Doubles: think of a picture you know. 5 + 5 is the fingers on two hands: 10.",
      "Doubles: think of a picture you know, like two hands or two rows of eggs.",
    ],
    4: [
      { text: "Ten and 4 more is fourteen. Say the teen number.", reveals: [14] },
      { text: "Ten and 6 more is sixteen. Say the teen number.", reveals: [16] },
      "Ten and some more is a teen number. Say it.",
    ],
    // Every make-ten fact is 10, so no line may say 10: the picture shows the
    // full frame instead.
    5: ["Think of a ten frame. Do the two numbers fill it?"],
    6: [
      "6 + 7 is next to 6 + 6. Double 6 is 12, then 1 more: 13.",
      "4 + 5 is next to 4 + 4. Double 4 is 8, then 1 more: 9.",
      "Find the double that is next to it, then add 1 more.",
    ],
    7: [
      "9 is almost 10. 9 + 5 is 10 + 5 minus 1: 14. Or give 1 to the 9 to make 10.",
      "9 is almost 10. 9 + 3 is 10 + 3 minus 1: 12. Or give 1 to the 9 to make 10.",
      "9 is almost 10. Add 10, then take 1 away.",
    ],
    8: [
      "Make a ten first. 8 + 5: 8 needs 2 to make 10, 5 gives 2 and keeps 3. 10 + 3 is 13.",
      "Make a ten first. 7 + 4: 7 needs 3 to make 10, 4 gives 3 and keeps 1. 10 + 1 is 11.",
      "Make a ten first, then add what is left.",
    ],
    9: [
      "Count on from the bigger number: 5, then 6, 7, 8.",
      "Count on from the bigger number: 4, then 5, 6, 7.",
      "Count on from the bigger number.",
    ],
  },
  sub: {
    1: [
      "Take away 0 and nothing changes. Take away all of it and 0 is left.",
      "Taking away nothing changes nothing. Taking away all of it leaves none.",
    ],
    2: [
      "Count back 1 or 2. For 9 − 7, count up from 7 to 9: 2.",
      "Count back 1 or 2. For 8 − 6, count up from 6 to 8: 2.",
      "Count back, or count up from the smaller number.",
    ],
    3: [
      "Which double makes 14? 7 + 7. So 14 − 7 is 7.",
      "Which double makes 12? 6 + 6. So 12 − 6 is 6.",
      "Which double makes the bigger number?",
    ],
    4: [
      "16 is 10 and 6. Take the 6 and 10 is left. Take the 10 and 6 is left.",
      "14 is 10 and 4. Take the 4 and 10 is left. Take the 10 and 4 is left.",
      "A teen number is a ten and some ones. Take the ones away, or take the ten away.",
    ],
    5: [
      "What goes with 3 to make 10? 7.",
      "What goes with 4 to make 10? 6.",
      "What goes with the smaller number to make ten?",
    ],
    // The plan's line names its fact in a side column; on screen it leads.
    6: [
      "13 − 6: 6 + 6 is 12. One more is 13, so 6 + 7. The answer is 7.",
      "9 − 4: 4 + 4 is 8. One more is 9, so 4 + 5. The answer is 5.",
      "Find the double next to it. Then think addition.",
    ],
    7: [
      "Take away 10 instead, then give 1 back. 14 − 10 is 4, plus 1 is 5.",
      "Take away 10 instead, then give 1 back. 16 − 10 is 6, plus 1 is 7.",
      "Take away 10 instead, then give 1 back.",
    ],
    8: [
      "Take 3 to get to 10, then 2 more. 13 − 5 is 8.",
      "Take 1 to get to 10, then 3 more. 11 − 4 is 7.",
      "Take away enough to get to 10, then take away the rest.",
    ],
    9: ["Think addition: 5 and 3 make 8.", "Think addition: 6 and 3 make 9.", "Think addition: what goes with the smaller number?"],
  },
  mul: {
    1: ["Zero groups, or groups of zero, make zero."],
    2: ["One group of 9 is 9.", "One group of 6 is 6.", "One group of a number is that number."],
    3: [
      "Times 2 is a double. 2 × 7 is 7 + 7: 14.",
      "Times 2 is a double. 2 × 6 is 6 + 6: 12.",
      "Times 2 is a double. Add the number to itself.",
    ],
    4: ["6 tens is 60.", "8 tens is 80.", "Ten times a number: say it as tens."],
    5: [
      "Half of ten times. 10 × 8 is 80, half is 40.",
      "Half of ten times. 10 × 6 is 60, half is 30.",
      "Find ten times, then take half.",
    ],
    6: [
      "Double, then double again. 7 doubled is 14, doubled again is 28.",
      "Double, then double again. 6 doubled is 12, doubled again is 24.",
      "Double it, then double again.",
    ],
    7: [
      "One group less than ten times. 10 × 6 is 60, take away 6: 54.",
      "One group less than ten times. 10 × 7 is 70, take away 7: 63.",
      "Find ten times, then take away one group.",
    ],
    8: [
      "Split it. 7 × 7 is 5 sevens and 2 sevens: 35 + 14 = 49.",
      "Split it. 8 × 8 is 5 eights and 3 eights: 40 + 24 = 64.",
      "Split it into 5 groups and the rest.",
    ],
    9: [
      "Double it, then one more group. 8 doubled is 16, plus 8 is 24.",
      "Double it, then one more group. 7 doubled is 14, plus 7 is 21.",
      "Double it, then add one more group.",
    ],
    10: [
      "Five groups and one more. 5 × 7 is 35, plus 7 is 42.",
      "Five groups and one more. 5 × 8 is 40, plus 8 is 48.",
      "Five groups, then one more group.",
    ],
    11: ["Double the fours. 4 × 7 is 28, doubled is 56.", "Double the fours: find 4 × 7, then double it."],
    12: ["10 groups and 1 more. 40 + 4 is 44.", "10 groups and 1 more. 70 + 7 is 77.", "10 groups and 1 more group."],
    13: ["10 groups and 2 more. 60 + 12 is 72.", "10 groups and 2 more. 50 + 10 is 60.", "10 groups and 2 more groups."],
  },
};

// Division hints are built from the fact itself (plan A5: "56 ÷ 8: 8 times
// what is 56?") plus the row's "Use the ... fact." sentence.
const DIV_FACT_NAME = new Map(
  FACT_ROWS.filter((r) => r.spec.op === "div").map((r) => [r.spec.group, (r.spec.hint.match(/Use the .+ fact\.$/) || [""])[0]])
);

function asLine(entry) {
  return typeof entry === "string" ? { text: entry, reveals: [] } : entry;
}

function lineGivesAway(line, answer) {
  return line.reveals.includes(answer) || hintContainsAnswer({ nudge: line.text }, answer);
}

function divisionLines(f) {
  const ask = `${f.a} ÷ ${f.b}: ${f.b} times what is ${f.a}?`;
  const name = DIV_FACT_NAME.get(f.group) || "";
  return [
    f.a === 0 ? "0 ÷ 5 is 0, but you can't divide by 0." : name ? `${ask} ${name}` : ask,
    ask,
    f.b === 1 ? "Dividing by 1 leaves the number as it is." : null,
    f.a === f.b * f.b ? "Think of a number times itself." : null,
    f.a === 0 ? "Zero shared into groups leaves zero in each group." : null,
    "Think multiplication: what times the number you divide by makes the big number?",
  ].filter(Boolean);
}

// A missing-number item asks for an operand, so its hint is about the
// operation that finds it, on the item's own numbers: count up to the total,
// think addition, count by the factor, think multiplication.
function missingLines(f) {
  if (f.op === "add") return [`Count up from ${f.a} to ${f.answer}.`, "Count up from the first number to the total."];
  if (f.op === "sub") return [`Think addition: ${f.answer} and what make ${f.a}?`, "Think addition to find the missing number."];
  if (f.op === "mul") {
    return [`Count by ${f.a}s until you reach ${f.answer}.`, "Count by the first number until you reach the total."];
  }
  return [`Think multiplication: ${f.answer} times what is ${f.a}?`, "Think multiplication to find the missing number."];
}

/**
 * The strategy line for a fact asked in a format: the first line that does
 * not state what the child is asked for (the missing number, or the total a
 * true-or-false claim is judged against).
 */
export function factNudge(f, format = "plain") {
  const asked = format === "missing" ? f.b : f.answer;
  const entries = format === "missing" ? missingLines(f) : f.op === "div" ? divisionLines(f) : LINES[f.op][f.group];
  const lines = entries.map(asLine);
  const ok = lines.find((l) => !lineGivesAway(l, asked));
  // The last line of every group has no numbers; the zero rules state the
  // rule itself ("make zero"), which is the strategy.
  return (ok || lines[lines.length - 1]).text;
}

// ── Steps ("Try this") ───────────────────────────────────────────────────
//
// The group's strategy as two or three steps on the fact's own numbers. The
// app's generic steps are written for stories and multi-digit work ("find the
// total in the story", "skip count by 0, 0 times"), so fact rows carry their
// own. A step never says the number the child is asked for: a list that would
// falls back to the operation's steps with no numbers.

const NUMBERLESS_STEPS = {
  add: ["Start at the bigger number.", "Count on the smaller number, one at a time."],
  sub: ["Start at the first number.", "Count back the second number, one at a time.", "Where you land is what is left."],
  mul: ["Skip count by one of the numbers.", "Stop when you have counted it the other number of times."],
  div: ["Think multiplication.", "What times the number you divide by makes the first number?"],
};

const MISSING_NUMBERLESS = {
  add: ["Start at the first number.", "Count up to the total.", "The hops are the missing number."],
  sub: ["Start at what is left.", "Count up to the first number.", "The hops are the missing number."],
  mul: ["Count by the first number until you reach the total.", "Count how many times you counted."],
  div: ["Think multiplication: the answer times what makes the first number?", "That number is the one missing."],
};

function addSteps({ a, b, group }) {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  switch (group) {
    case 1:
      return a === b ? ["Zero and zero.", "Nothing and nothing is still nothing."] : ["Adding zero changes nothing.", "The answer is the number that is not zero."];
    case 2:
      return [`Start at ${big}.`, small === 1 ? "Say the next number." : "Say the next two numbers."];
    case 3:
      return [`${a} + ${a} is a double.`, `Use a double you know, or count on ${a} from ${a}.`];
    case 4:
      return [`10 + ${small} is ten and ${small} more.`, "Say the teen number."];
    case 5:
      return [`Put ${a} and ${b} in a ten frame.`, "Is the frame full?"];
    case 6:
      return [`${small} + ${small} is a double you know.`, `${big} is one more than ${small}, so add 1 more.`];
    case 7:
      return [`9 is one less than 10.`, `Find 10 + ${small}, then take 1 away.`];
    case 8: {
      const need = 10 - big;
      return [`${big} needs ${need} more to make 10.`, `Take ${need} from the ${small}. That leaves ${small - need}.`, `Now add: 10 + ${small - need}.`];
    }
    default:
      return [`Start at ${big}.`, `Count on ${small}, one at a time.`];
  }
}

function subSteps({ a, b, group }) {
  switch (group) {
    case 1:
      return b === 0 ? ["Taking away zero changes nothing.", "Say the number you started with."] : ["Everything is taken away.", "How many are left?"];
    case 2:
      if (b <= 2) return [`Start at ${a}.`, b === 1 ? "Say the number just before it." : "Say the two numbers just before it."];
      return [`${b} is close to ${a}.`, `Count up from ${b} to ${a}.`, "Count the hops."];
    case 3:
      return [`Which double makes ${a}?`, "Half of it is the answer."];
    case 4:
      return b === 10
        ? [`${a} is a ten and some ones.`, "Take the ten away.", "Say how many ones are left."]
        : [`${a} is a ten and ${b} ones.`, `Take away the ${b} ones.`, "Say what is left."];
    case 5:
      return [`Think of a full ten frame and take ${b} away.`, `Or ask: what goes with ${b} to make 10?`];
    case 6:
      return [`${a} is one more than a double.`, `Think addition: ${b} and what make ${a}?`];
    case 7:
      return b === 9
        ? [`Take away 10 instead: ${a} − 10.`, "Then give 1 back."]
        : [`Think addition: ${b} and what make ${a}?`, `Count up from ${b} to 10, then on to ${a}.`];
    case 8: {
      const toTen = a - 10;
      return toTen > 0 && b > toTen
        ? [`Take ${toTen} away to get down to 10.`, `Then take ${b - toTen} more.`, "Say where you land."]
        : [`Think addition: ${b} and what make ${a}?`, `Count up from ${b} to ${a}.`];
    }
    default:
      return [`Think addition: ${b} and what make ${a}?`, `Count up from ${b} to ${a}.`];
  }
}

function mulSteps({ a, b, group }) {
  if (a === 0 || b === 0) return ["One of the numbers is zero.", "Zero groups, or groups with nothing in them, make nothing."];
  const other = (n) => (a === n ? b : a);
  switch (group) {
    case 2:
      return ["Times 1 leaves a number just as it is.", "Say the other number."];
    case 3:
      return ["Times 2 is a double.", `Add ${other(2)} + ${other(2)}.`];
    case 4:
      return [`Count by 10s, ${other(10)} times.`, `Or say it as ${other(10)} tens.`];
    case 5:
      return [`Count by 5s, ${other(5)} times.`, `Or find 10 × ${other(5)} and take half.`];
    case 6:
      return [`Double ${other(4)}.`, "Then double that number again."];
    case 7:
      return [`Find 10 × ${other(9)} first.`, `Then take away one ${other(9)}.`];
    case 8:
      return [`${a} rows of ${a}.`, `Count by ${a}s, ${a} times.`];
    case 9:
      return [`Double ${other(3)}.`, `Then add one more ${other(3)}.`];
    case 10:
      return [`Find 5 × ${other(6)} first.`, `Then add one more ${other(6)}.`];
    case 11:
      return [`Find 4 × ${other(8)} first.`, "Then double it."];
    case 12:
      return [`Find 10 × ${other(11)}.`, `Then add one more ${other(11)}.`];
    case 13:
      return [`Find 10 × ${other(12)} and 2 × ${other(12)}.`, "Add the two together."];
    default:
      return [`Count by ${b}s, ${a} times.`];
  }
}

function divSteps({ a: p, b }) {
  if (p === 0) return ["There is nothing to share.", "Zero shared into groups leaves nothing in each group."];
  if (b === 1) return ["Dividing by 1 leaves the number as it is.", "One group gets all of it."];
  if (p === b) return [`How many groups of ${b} fit in ${p}?`, "Count the groups."];
  return [`Think multiplication: ${b} times what is ${p}?`, `Count by ${b}s until you reach ${p}.`, `Count how many ${b}s you said.`];
}

function missingSteps(f) {
  if (f.op === "add") return f.a === 0 ? ["Zero plus a number is that number.", "Say the total."] : [`Start at ${f.a}.`, `Count up to ${f.answer}.`, "The hops are the missing number."];
  if (f.op === "sub") {
    if (f.b === 0) return ["The number did not change.", "What can you take away and change nothing?"];
    if (f.answer === 0) return ["Nothing is left.", "So everything was taken away."];
    return [`Start at ${f.answer}.`, `Count up to ${f.a}.`, "The hops are the missing number."];
  }
  if (f.op === "mul") return [`Count by ${f.a}s until you reach ${f.answer}.`, `Count how many ${f.a}s you said.`];
  return [`Think: ${f.answer} times what is ${f.a}?`, `Count by ${f.answer}s until you reach ${f.a}.`, `Count how many ${f.answer}s you said.`];
}

const STEPS_BY_OP = { add: addSteps, sub: subSteps, mul: mulSteps, div: divSteps };

/** The steps for a fact asked in a format (see above). */
export function factSteps(f, format = "plain") {
  // True or false is judged: work it out, then compare. No numbers, and no
  // "yes" or "no" in the wording.
  if (format === "trueFalse") return ["Work out the fact on your own first.", "Then compare your answer with the number after the = sign."];
  if (format === "array") {
    const rows = [`${f.a} rows of ${f.b} dots.`, `Count by ${f.b}s, one row at a time.`];
    return hintContainsAnswer({ steps: rows }, f.answer) ? ["Count the rows.", "Then count across each row."] : rows;
  }
  if (format === "hop") {
    const hop = [`Look at the hop from ${f.b} to ${f.a}.`, "Count the jumps between them."];
    return hintContainsAnswer({ steps: hop }, f.answer) ? ["Look at the hop on the line.", "Count the jumps."] : hop;
  }
  const missing = format === "missing";
  const asked = missing ? f.b : f.answer;
  const steps = missing ? missingSteps(f) : STEPS_BY_OP[f.op](f);
  if (!hintContainsAnswer({ steps }, asked)) return steps;
  return (missing ? MISSING_NUMBERLESS : NUMBERLESS_STEPS)[f.op];
}

/** The hint picture, where the group's strategy has a better one than the
 * number-based default (dots for small sums, arrays for times tables). */
export function factPicture(f) {
  if (f.op === "add") {
    const big = Math.max(f.a, f.b);
    const small = Math.min(f.a, f.b);
    if (f.group === 2 || f.group === 9) return { kind: "numberLine", min: 0, max: f.answer <= 10 ? 10 : 20, mark: big };
    if (f.group === 4 || f.group === 5 || f.group === 7 || f.group === 8) {
      return { kind: "tenFrame", filled: big, filledB: small, frames: f.answer > 10 ? 2 : 1 };
    }
    return null;
  }
  if (f.op === "sub") {
    if (f.group === 2) return { kind: "numberLine", min: 0, max: f.a <= 10 ? 10 : 20, mark: f.a };
    if (f.group === 4 || f.group === 5 || f.group === 7 || f.group === 8) {
      return { kind: "tenFrame", filled: f.a, takeAway: f.b, frames: f.a > 10 ? 2 : 1 };
    }
    return null;
  }
  // Times tables: the array the number-based default draws, stated here so a
  // missing-number item (whose b slot is empty) still gets it.
  if (f.op === "mul" && f.a >= 1 && f.b >= 1 && f.a <= 12 && f.b <= 12) return { kind: "array", rows: f.a, cols: f.b };
  if (f.op === "div" && f.answer >= 1 && f.b <= 12 && f.answer <= 12) return { kind: "array", rows: f.b, cols: f.answer };
  return null;
}

function missingPicture(f) {
  if (f.op === "add") return { kind: "numberLine", min: 0, max: f.answer <= 10 ? 10 : 20, mark: f.a };
  if (f.op === "sub") return { kind: "numberLine", min: 0, max: f.a <= 10 ? 10 : 20, mark: f.answer };
  return null;
}

export function factHint(f, format = "plain") {
  const nudge = factNudge(f, format);
  const steps = factSteps(f, format);
  // True or false is judged, not computed: a picture would count it out. A
  // missing number gets a line to count up on, never the fact's own picture
  // (8 red and 5 blue counters would show the 5 it asks for).
  const picture =
    format === "trueFalse"
      ? null
      : format === "missing"
        ? missingPicture(f)
        : factPicture(f);
  return picture ? { nudge, steps, picture } : { nudge, steps };
}

// ── Questions ────────────────────────────────────────────────────────────

/** A wrong total for true-or-false: one off, or the neighbouring product. */
function nearMiss(f) {
  if (f.op === "mul") return f.answer === 0 ? f.a + f.b || 1 : f.a * (f.b + 1);
  return f.answer === 0 ? 1 : f.answer + (f.a % 2 === 0 ? 1 : -1);
}

/**
 * The question for one fact in one format: the payload a bank row carries
 * and the generator serves. `truthy` picks a true or a false claim for
 * true-or-false.
 */
export function factQuestion(f, format, { truthy = true } = {}) {
  const plain = `${f.a} ${f.sign} ${f.b} = ?`;
  const base = { a: f.a, b: f.b, op: f.sign, answer: f.answer, answerType: "numberPad", hint: factHint(f, format) };
  switch (format) {
    case "plain":
      // Sideways even for a teen fact, which would otherwise stack.
      return { ...base, display: { promptText: plain, layout: "horizontal" } };
    case "stacked":
      return { ...base, display: { promptText: plain, layout: "vertical" } };
    case "missing": {
      // The rendered equation's slots, bank-style: the unknown slot is null.
      const promptText =
        f.op === "add"
          ? `${f.a} + ? = ${f.answer}`
          : f.op === "sub"
            ? `${f.a} − ? = ${f.answer}`
            : f.op === "mul"
              ? `${f.a} × ? = ${f.answer}`
              : `${f.a} ÷ ? = ${f.answer}`;
      return { ...base, b: null, answer: f.b, display: { promptText } };
    }
    case "trueFalse": {
      const shown = truthy ? f.answer : nearMiss(f);
      return {
        a: f.a,
        b: f.b,
        op: f.sign,
        answer: truthy ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        display: { promptText: `${f.a} ${f.sign} ${f.b} = ${shown}`, subPrompt: "Is this right?" },
        hint: factHint(f, format),
      };
    }
    case "tenFrame":
      return {
        ...base,
        answerType: "tenFrame",
        display: { promptText: "How many counters in all?", filled: f.a, filledB: f.b, frames: 1, frameMode: "count" },
      };
    case "takeAway":
      return {
        ...base,
        answerType: "tenFrame",
        display: { promptText: "How many counters are left?", filled: f.a, takeAway: f.b, frames: 1, frameMode: "count" },
      };
    case "hop": {
      const max = f.a <= 10 ? 10 : 20;
      return {
        ...base,
        answerType: "numberLine",
        display: { promptText: plain, min: 0, max, step: 1, labelEvery: max > 10 ? 2 : 1, from: f.b, to: f.a, lineMode: "jump" },
      };
    }
    case "array":
      return { ...base, display: { promptText: plain, figure: "array", array: { rows: f.a, cols: f.b } } };
    default:
      throw new Error(`unknown fact format: ${format}`);
  }
}

/**
 * Every row the bank carries for the facts: one per fact and format, with
 * the plan row it serves. Ids are stable (`mathFacts-v2-<op>-<a>-<b>-<format>`)
 * so a rerun updates rows instead of adding new ones.
 */
export function factBankItems() {
  const items = [];
  for (const f of FACTS) {
    for (const format of formatsForFact(f)) {
      // Alternate true and false claims down each row's list.
      const truthy = format !== "trueFalse" || Math.floor(FACTS.filter((x) => x.rowId === f.rowId).indexOf(f) / 3) % 2 === 0;
      const question = factQuestion(f, format, { truthy });
      const { hint, ...payload } = question;
      items.push({
        itemId: `mathFacts-v2-${f.id}-${format}`,
        modeId: "mathFacts",
        itemFamily: FORMAT_FAMILY[format],
        subskill: f.subskill,
        structureType: `${f.op}-${format}`,
        levelRange: [...BAND_LEVELS[f.band]],
        reviewStatus: "approved",
        version: 2,
        blueprintId: f.rowId,
        hint,
        question: payload,
      });
    }
  }
  return items;
}
