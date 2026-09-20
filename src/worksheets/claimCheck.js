/* Does a sheet keep its title's promise? Pure — no imports.
 *
 * `checkItems(items, claim)` returns a list of human-readable violations;
 * empty means the sheet is honest. The same `claim` object drives the
 * computation sampler, so the check is an independent reading of the claim,
 * not a re-run of the code that built the items.
 */

const ASCII_OP = { "−": "-", "–": "-", "×": "x", "*": "x", "÷": "/" };

export function asciiOp(op) {
  return ASCII_OP[op] || op;
}

/** True when column arithmetic has to carry (+) or borrow (−). */
export function regroups(a, b, op) {
  let x = a;
  let y = b;
  if (asciiOp(op) === "+") {
    let carry = 0;
    while (x > 0 || y > 0) {
      if ((x % 10) + (y % 10) + carry > 9) return true;
      carry = 0;
      x = Math.floor(x / 10);
      y = Math.floor(y / 10);
    }
    return false;
  }
  while (y > 0) {
    if (x % 10 < y % 10) return true;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return false;
}

/** Every number an item shows: payload operands plus digits in the prompt. */
export function itemNumbers(q) {
  const fromPayload = [q.a, q.b, q.answer].filter((n) => typeof n === "number");
  const fromText = (q.display?.promptText || "").match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  return [...fromPayload, ...fromText];
}

export function withinNumbers(q, numbers) {
  if (!numbers) return true;
  const all = itemNumbers(q);
  if (!all.length) return false;
  const biggest = Math.max(...all);
  return biggest >= (numbers.min ?? -Infinity) && biggest <= (numbers.max ?? Infinity);
}

const inRange = (n, range) => !range || (n >= range[0] && n <= range[1]);

/** The quantity a `reach` claim is about: how big the fact is. */
function factSize(q) {
  const op = asciiOp(q.op);
  if (op === "+") return q.a + q.b;
  if (op === "x") return q.a * q.b;
  return q.a;
}

function checkComputation(q, claim, label) {
  const out = [];
  const op = asciiOp(q.op);
  if (op !== claim.op) return [`${label}: operator ${q.op}, claim is ${claim.op}`];
  if (typeof q.a !== "number" || typeof q.b !== "number") return [`${label}: not a bare computation`];

  if (op === "/") {
    const remainder = q.remainder || 0;
    if (q.b * q.answer + remainder !== q.a) out.push(`${label}: ${q.a} ÷ ${q.b} is not ${q.answer} r ${remainder}`);
    if (remainder >= q.b) out.push(`${label}: remainder ${remainder} is not smaller than the divisor`);
    if (claim.table ? !claim.table.includes(q.b) : !inRange(q.b, claim.b)) out.push(`${label}: divisor ${q.b} outside the claim`);
    if (!inRange(q.answer, claim.quotient)) out.push(`${label}: quotient ${q.answer} outside the claim`);
    if (!inRange(q.a, claim.dividend)) out.push(`${label}: dividend ${q.a} outside the claim`);
    if (claim.remainder === "none" && remainder !== 0) out.push(`${label}: has a remainder`);
    if (claim.remainder === "required" && remainder === 0) out.push(`${label}: has no remainder`);
    return out;
  }

  const expected = op === "+" ? q.a + q.b : op === "-" ? q.a - q.b : q.a * q.b;
  if (expected !== q.answer) out.push(`${label}: ${q.a} ${q.op} ${q.b} is not ${q.answer}`);

  if (claim.table) {
    const [inTable, other] = claim.table.includes(q.a) ? [q.a, q.b] : [q.b, q.a];
    if (!claim.table.includes(inTable)) out.push(`${label}: neither factor is in the ${claim.table.join("/")} tables`);
    if (!inRange(other, claim.b)) out.push(`${label}: factor ${other} outside the claim`);
  } else {
    if (!inRange(q.a, claim.a)) out.push(`${label}: ${q.a} outside the claim`);
    if (!inRange(q.b, claim.b)) out.push(`${label}: ${q.b} outside the claim`);
  }
  if (claim.bStep && q.b % claim.bStep !== 0) out.push(`${label}: ${q.b} is not a multiple of ${claim.bStep}`);
  if (op === "+" && !inRange(q.answer, claim.total)) out.push(`${label}: sum ${q.answer} outside the claim`);
  if (op === "-" && !inRange(q.answer, claim.difference)) out.push(`${label}: difference ${q.answer} outside the claim`);
  if (claim.regroup === "required" && !regroups(q.a, q.b, op)) out.push(`${label}: no regrouping`);
  if (claim.regroup === "none" && regroups(q.a, q.b, op)) out.push(`${label}: regroups`);
  if (claim.minuendZero && !String(q.a).slice(1).includes("0")) out.push(`${label}: ${q.a} has no zero to subtract across`);
  return out;
}

function checkBanked(q, claim, label) {
  const out = [];
  const meta = q.metadata || {};
  if (meta.itemSource !== "bank") out.push(`${label}: not a bank item`);
  if (claim.families && !claim.families.includes(meta.itemFamily)) out.push(`${label}: family ${meta.itemFamily}`);
  if (claim.subskills && !claim.subskills.includes(meta.subskill)) out.push(`${label}: subskill ${meta.subskill}`);
  if (claim.structureTypes && !claim.structureTypes.includes(meta.structureType)) out.push(`${label}: structure ${meta.structureType}`);
  if (claim.excludeStructureTypes?.includes(meta.structureType)) out.push(`${label}: structure ${meta.structureType} is excluded`);
  if (!withinNumbers(q, claim.numbers)) out.push(`${label}: numbers outside ${JSON.stringify(claim.numbers)}`);
  return out;
}

export function checkItems(items, claim) {
  const out = [];
  items.forEach((q, i) => {
    const label = `#${i + 1} (${q.display?.promptText || `${q.a} ${q.op} ${q.b}`})`;
    out.push(...(claim.kind === "bank" ? checkBanked(q, claim, label) : checkComputation(q, claim, label)));
  });
  // "Within 20" must actually get past 10 — a sheet can stay inside its range
  // and still be the easier skill in disguise.
  if (claim.reach && items.length) {
    const reached = items.filter((q) => factSize(q) > claim.reach.over).length;
    if (reached / items.length < claim.reach.share) {
      out.push(`only ${reached}/${items.length} problems go past ${claim.reach.over}`);
    }
  }
  return out;
}

/** Story filter for a skill's word problems: number size always; operand-level
 * claims (regrouping, tables, factor size) only where the story's payload is a
 * plain `a op b = answer`, because a change-unknown story stores its numbers
 * in other slots and must not be judged as if it did not. */
export function storyMatches(q, stories) {
  if (!withinNumbers(q, stories.numbers)) return false;
  const op = asciiOp(q.op);
  const plain = typeof q.a === "number" && typeof q.b === "number" && typeof q.answer === "number";
  if (stories.regroup && plain && (op === "+" || op === "-")) {
    const [big, small] = op === "-" ? [Math.max(q.a, q.b), Math.min(q.a, q.b)] : [q.a, q.b];
    const does = regroups(big, small, op);
    if (stories.regroup === "required" ? !does : does) return false;
  }
  if (stories.table) {
    if (!plain) return false;
    const operands = op === "/" ? [q.b, q.answer] : [q.a, q.b];
    if (!operands.some((n) => stories.table.includes(n))) return false;
    if (operands.some((n) => n > 10)) return false;
  }
  if (stories.factors) {
    if (!plain) return false;
    const operands = op === "/" ? [q.b, q.answer] : [q.a, q.b];
    if (operands.some((n) => n > stories.factors.max)) return false;
  }
  return true;
}
