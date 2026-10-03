/**
 * Steps for THIS question, built from its own numbers. A hint, not a
 * solution: the steps set the kid up and stop before the final answer.
 * Pure and dependency-free (bundleable for iOS).
 */
import { hintContainsAnswer } from "./hintSchema.js";

const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
const isPlus = (op) => op === "+";
const isMinus = (op) => op === "-" || op === "−";
const isTimes = (op) => op === "x" || op === "×" || op === "*";
const isDiv = (op) => op === "/" || op === "÷";

function promptOf(q) {
  return String(q?.display?.promptText || q?.prompt || "").replace(/\s+/g, " ").trim();
}

/** Numbers that appear in the prompt, in order, deduped. */
export function numbersInPrompt(q) {
  const seen = new Set();
  const out = [];
  for (const m of promptOf(q).matchAll(/\d+(?:\.\d+)?(?:\/\d+)?/g)) {
    if (!seen.has(m[0])) {
      seen.add(m[0]);
      out.push(m[0]);
    }
  }
  return out;
}

function additionSteps(q, a, b) {
  const total = num(q.distractorContext?.b);
  if (a != null && b != null) {
    const [big, small] = a >= b ? [a, b] : [b, a];
    if (big + small <= 20 && big < 10 && small > 10 - big) {
      const need = 10 - big;
      return [
        `Start with the bigger number, ${big}. It needs ${need} more to make 10.`,
        `Take ${need} from the ${small}. That leaves ${small - need}.`,
        `Now add: 10 + ${small - need}.`,
      ];
    }
    if (small <= 5) {
      return [`Start at the bigger number, ${big}.`, `Count on ${small} more, one hop at a time.`, `The number you land on is the total.`];
    }
    if (big >= 10) {
      return [
        `Add the tens first: ${Math.floor(big / 10) * 10} + ${Math.floor(small / 10) * 10}.`,
        `Then add the ones: ${big % 10} + ${small % 10}.`,
        `Put the two answers together.`,
      ];
    }
    return [`Start at the bigger number, ${big}.`, `Count on ${small} more.`, `Where you stop is the total.`];
  }
  const known = a ?? b;
  if (known != null && total != null && total > known) {
    return [`You know one part, ${known}, and the total, ${total}.`, `Start at ${known} and count up to ${total}.`, `The number of hops is the missing part.`];
  }
  if (known != null) {
    return [`One part is ${known}. Find the total in the question.`, `Start at ${known} and count up to the total.`, `The number of hops is the missing part.`];
  }
  return null;
}

function subtractionSteps(q, a, b) {
  if (a != null && b != null) {
    if (a - b <= 3 && a - b >= 0) {
      return [`${a} and ${b} are close together.`, `Start at ${b} and count up to ${a}.`, `The hops you took is the difference.`];
    }
    if (b <= 5) {
      return [`Start at ${a}.`, `Count back ${b}, one hop at a time.`, `Where you land is what is left.`];
    }
    if (a <= 20 && b >= 10 && b < a) {
      // Take the ten first. ("Take 8 away first to get down to 10" was the
      // make-ten route run on 18 − 10, and named the answer, until 2026-10-03.)
      return b === 10
        ? [`Taking away 10 takes away 1 ten.`, `The ones stay the same.`, `Write what is left.`]
        : [`Take away 10 first: ${a} − 10.`, `Then take away ${b - 10} more.`, `Where you land is what is left.`];
    }
    if (a > 10 && a <= 20 && b < a && a % 10 !== 0 && b > a % 10) {
      const toTen = a - 10;
      return [`Take ${toTen} away first to get down to 10.`, `You still need to take away ${b - toTen} more.`, `10 minus that is your answer.`];
    }
    if (a >= 20) {
      return [`Take away the tens first: ${a} − ${Math.floor(b / 10) * 10}.`, `Then take away the ones: ${b % 10}.`, `Or count up from ${b} to ${a} in easy jumps.`];
    }
    return [`Start at ${a}.`, `Count back ${b}.`, `Where you land is what is left.`];
  }
  const start = num(q.distractorContext?.b);
  const left = a ?? b;
  if (left != null && start != null && start > left) {
    return [`You started with ${start} and have ${left} left.`, `Start at ${left} and count up to ${start}.`, `The hops are how many were taken away.`];
  }
  return [`Find the starting amount and what is left in the question.`, `Count up from what is left to the start.`, `The hops are how many were taken away.`];
}

function multiplicationSteps(q, a, b) {
  if (a != null && b != null) {
    if (a <= 10 && b <= 10) {
      // Start the count, never finish it: the last number said is the answer
      // ("Skip count by 5, 3 times: 5, 10, 15." gave 3 × 5 away until 2026-10-03).
      const seq = Array.from({ length: Math.min(a - 1, 3) }, (_, i) => b * (i + 1)).join(", ");
      return [`${a} groups with ${b} in each.`, seq ? `Skip count by ${b}, ${a} times: ${seq}, …` : `Skip count by ${b}, ${a} times.`, `The last number you say is the total.`];
    }
    // Break the two-digit factor, not a one-digit one ("Break 3 into tens
    // and ones. 34 × 0, then 34 × 3." shipped on every 34 × 3 until 2026-10-02).
    const [big, small] = b >= 10 ? [b, a] : [a, b];
    const tens = Math.floor(big / 10) * 10;
    const ones = big % 10;
    if (ones === 0) return [`${big} is ${tens / 10} tens.`, `Find ${small} × ${tens / 10}.`, `Then make it tens: put a 0 on the end.`];
    return [`Break ${big} into ${tens} and ${ones}.`, `${small} × ${tens}, then ${small} × ${ones}.`, `Add the two pieces.`];
  }
  const total = num(q.distractorContext?.b);
  const known = a ?? b;
  if (known != null && total != null) {
    return [`${known} times what makes ${total}?`, `Skip count by ${known} until you reach ${total}.`, `Count how many times you said a number.`];
  }
  return null;
}

function divisionSteps(q, a, b) {
  if (a != null && b != null && b > 0) {
    return [`Share ${a} into ${b} equal groups.`, `Ask: ${b} × ? = ${a}.`, `Skip count by ${b} until you reach ${a}; count the hops.`];
  }
  const total = num(q.distractorContext?.b);
  const known = a ?? b;
  if (known != null && total != null) {
    return [`Ask: ${known} × ? = ${total}.`, `Skip count by ${known} until you reach ${total}.`, `Count the hops.`];
  }
  return null;
}

function bondSteps(q) {
  const whole = num(q.display?.whole);
  const part = num(q.display?.part);
  if (whole != null && part != null) {
    return [`The whole is ${whole}. One part is ${part}.`, `Start at ${part} and count up to ${whole}.`, `The hops are the missing part.`];
  }
  return null;
}

function skipSteps(q) {
  const step = num(q.step);
  const seq = Array.isArray(q.display?.sequence) ? q.display.sequence : null;
  if (step != null && seq) {
    const known = seq.filter((v) => typeof v === "number");
    const last = known[known.length - 1];
    return [`Every jump is ${step}.`, last != null ? `Start at ${last} and jump ${step}.` : `Find the last number you know and jump ${step}.`, `Check: each neighbor should be ${step} apart.`];
  }
  if (step != null) return [`Count in jumps of ${step}.`, `Say ${step} once for each group.`, `Stop on the last group.`];
  return null;
}

function placeValueSteps(q) {
  const n = num(q.display?.number ?? q.a);
  if (n == null) return null;
  const d = q.display || {};
  if (d.type === "build" || String(q.answer) === String(n)) {
    // The kid builds the number, so the steps must not say it ("The number
    // is 64." on "6 tens and 4 ones make what number?" until 2026-10-03).
    const parts = [["hundreds", d.hundreds], ["tens", d.tens], ["ones", d.ones]]
      .filter(([, c]) => num(c) != null)
      .map(([name, c]) => `${c} ${Number(c) === 1 ? name.slice(0, -1) : name}`);
    return [
      parts.length ? `You have ${parts.join(" and ")}.` : `Find each place's amount in the question.`,
      num(d.tens) >= 10 ? `10 tens make 1 hundred.` : `Each ten is worth 10. Each hundred is worth 100.`,
      `Find what each place is worth, then put them together.`,
    ];
  }
  // Name the places, not the digits: "Its places: 6 tens, 4 ones." answered
  // "What is the tens digit of 64?" until 2026-10-03.
  return [`The number is ${n}.`, `From the right, the places are ones, tens, then hundreds.`, `Find the place the question asks about.`];
}

function moneySteps(q) {
  const price = num(q.distractorContext?.b);
  const paid = num(q.distractorContext?.a);
  if (q.metadata?.subskill === "makeChange" && price != null && paid != null && paid > price) {
    return [`Count up from the price, ${price}¢, to the money paid, ${paid}¢.`, `Go to the next ten first, then by tens.`, `Add up your hops.`];
  }
  return [`Turn every coin into cents first.`, `Quarters are 25, dimes 10, nickels 5, pennies 1.`, `Then work with the cents like whole numbers.`];
}

function areaSteps(q) {
  const w = num(q.display?.width ?? q.distractorContext?.width);
  const h = num(q.display?.height ?? q.distractorContext?.height);
  if (w == null || h == null) return null;
  const sub = q.metadata?.subskill;
  if (sub === "perimeter") return [`The sides are ${w} and ${h}.`, `Walk around: ${w} + ${h} + ${w} + ${h}.`, `Add all four sides.`];
  if (sub === "area") return [`The rectangle is ${w} by ${h}.`, `Area is length × width: ${w} × ${h}.`, `Count in square units.`];
  return [`The rectangle is ${w} by ${h}.`, `Area is ${w} × ${h}. Perimeter is ${w} + ${h} + ${w} + ${h}.`, `Pick the one the question asks for.`];
}

function volumeSteps(q) {
  const a = num(q.distractorContext?.a);
  const b = num(q.distractorContext?.b);
  if (q.metadata?.subskill === "volumeFormula" && a != null && b != null) {
    return [`Multiply the three sides.`, `Do the easy pair first, then multiply by the last side.`, `Count in cubic units.`];
  }
  return null;
}

function genericSteps(q) {
  const nums = numbersInPrompt(q);
  const steps = ["Read the question twice. Say what it is asking in your own words."];
  if (nums.length) steps.push(`The numbers you need: ${nums.slice(0, 4).join(", ")}.`);
  steps.push("Draw it or write it in the work space, then decide: join, take away, share, or compare?");
  return steps;
}

/** True when the prompt itself shows the key ("7:28" shows 28). */
export function promptShowsAnswer(q) {
  const key = q?.answer;
  return hintContainsAnswer({ steps: [promptOf(q)] }, key) || numbersInPrompt(q).map(String).includes(String(key));
}

/** Steps for the live question. Always returns a non-empty array. */
export function stepsFor(question) {
  if (!question) return genericSteps({});
  const mode = question.mode || question.metadata?.modeId || "";
  const a = num(question.a);
  const b = num(question.b);
  const op = question.op;
  let steps = null;
  try {
    if (isPlus(op)) steps = additionSteps(question, a, b);
    else if (isMinus(op)) steps = subtractionSteps(question, a, b);
    else if (isTimes(op)) steps = multiplicationSteps(question, a, b);
    else if (isDiv(op)) steps = divisionSteps(question, a, b);
    else if (mode === "numberBonds") steps = bondSteps(question);
    else if (mode === "skipCounting" || (mode === "patterns" && question.step != null)) steps = skipSteps(question);
    else if (mode === "placeValue") steps = placeValueSteps(question);
    else if (mode === "money") steps = moneySteps(question);
    else if (mode === "areaPerimeter") steps = areaSteps(question);
    else if (mode === "volumeCoordinates") steps = volumeSteps(question);
  } catch {
    steps = null;
  }
  if (!steps || !steps.length) return genericSteps(question);
  // Safety net: steps built from the numbers never state the key the kid is
  // asked for, unless the prompt already shows it (a strategy step such as
  // "Take 2 away first" is the answer to "How many do you take away first?").
  if (hintContainsAnswer({ steps }, question.answer) && !promptShowsAnswer(question)) {
    return genericSteps(question);
  }
  return steps;
}
