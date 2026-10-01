/**
 * The basic facts, enumerated (fact fluency plan, Part A).
 *
 * Every addition fact with addends 0 to 10, its subtraction partner, every
 * multiplication fact with factors 0 to 12 and its division partner (never
 * dividing by 0), each placed in the first strategy group it fits and in its
 * fact band. Each (operation, group, band) is one plan row in
 * src/blueprints/factFluency.json, so every fact points at exactly one row,
 * and the row's fact count is checked against this list.
 *
 * Pure, no network or DOM: the Math Facts mode, the row generator script and
 * the native engine bundle all read it.
 */
import factFluency from "../blueprints/factFluency.json" with { type: "json" };

export const FACT_OPS = Object.freeze(["add", "sub", "mul", "div"]);

/** The sign a child sees, per operation. */
export const OP_SIGN = Object.freeze({ add: "+", sub: "−", mul: "×", div: "÷" });

/** One subskill per operation: the Math Facts mode's declared subskills. */
export const FACT_SUBSKILL = Object.freeze({ add: "addFacts", sub: "subFacts", mul: "mulFacts", div: "divFacts" });

/** The plan rows, one per operation, strategy group and fact band. */
export const FACT_ROWS = Object.freeze(factFluency.rows.filter((r) => r.track === "fluency"));

const ROW_BY_KEY = new Map(FACT_ROWS.map((r) => [`${r.spec.op}:${r.spec.group}:${r.spec.band}`, r]));

/**
 * Addition group (plan A2): the first that fits. Plus zero, plus 1 or 2,
 * doubles, ten plus, make ten, near doubles, plus 9, make ten with 8 or 7,
 * and the last few.
 */
export function addGroup(a, b) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (lo === 0) return 1;
  if (lo <= 2) return 2;
  if (a === b) return 3;
  if (hi === 10) return 4;
  if (a + b === 10) return 5;
  if (hi - lo === 1) return 6;
  if (hi === 9) return 7;
  if (hi === 8 || hi === 7) return 8;
  return 9;
}

/**
 * Multiplication group (plan A4): the first that fits either factor. In the
 * 11s and 12s band a fact belongs to times 12 when 12 is a factor, else to
 * times 11.
 */
export function mulGroup(a, b) {
  if (a > 10 || b > 10) return a === 12 || b === 12 ? 13 : 12;
  const has = (n) => a === n || b === n;
  if (has(0)) return 1;
  if (has(1)) return 2;
  if (has(2)) return 3;
  if (has(10)) return 4;
  if (has(5)) return 5;
  if (has(4)) return 6;
  if (has(9)) return 7;
  if (a === b) return 8;
  if (has(3)) return 9;
  if (has(6)) return 10;
  return 11;
}

/** Addition and subtraction bands go by the whole (the sum). */
export function additiveBand(whole) {
  if (whole <= 5) return "to5";
  if (whole <= 10) return "6to10";
  return "11to20";
}

/** Multiplication and division bands: 0 to 10 is core, 11s and 12s ext. */
export function multiplicativeBand(a, b) {
  return a > 10 || b > 10 ? "ext" : "core";
}

function fact(op, a, b, answer, group, band) {
  const row = ROW_BY_KEY.get(`${op}:${group}:${band}`);
  if (!row) throw new Error(`no plan row for ${op} group ${group} band ${band}`);
  return Object.freeze({
    id: `${op}-${a}-${b}`,
    op,
    a,
    b,
    answer,
    sign: OP_SIGN[op],
    group,
    groupName: row.spec.groupName,
    band,
    rowId: row.id,
    subskill: FACT_SUBSKILL[op],
    // 8 + 5 and 5 + 8 are one fact for tracking (plan A1); subtraction and
    // division facts are tracked one by one.
    trackKey: op === "add" || op === "mul" ? `${op}-${Math.min(a, b)}-${Math.max(a, b)}` : `${op}-${a}-${b}`,
  });
}

function enumerate() {
  const out = [];
  for (let a = 0; a <= 10; a += 1) {
    for (let b = 0; b <= 10; b += 1) {
      const band = additiveBand(a + b);
      const group = addGroup(a, b);
      out.push(fact("add", a, b, a + b, group, band));
      // Its subtraction partner: (a + b) − b = a, in the same group (plan A3).
      out.push(fact("sub", a + b, b, a, group, band));
    }
  }
  for (let a = 0; a <= 12; a += 1) {
    for (let b = 0; b <= 12; b += 1) {
      const band = multiplicativeBand(a, b);
      const group = mulGroup(a, b);
      out.push(fact("mul", a, b, a * b, group, band));
      // Its division partner: (a × b) ÷ b = a, never dividing by 0 (plan A5).
      if (b !== 0) out.push(fact("div", a * b, b, a, group, band));
    }
  }
  const order = { add: 0, sub: 1, mul: 2, div: 3 };
  return out.sort((x, y) => order[x.op] - order[y.op]);
}

/** Every fact, addition first, then subtraction, multiplication, division. */
export const FACTS = Object.freeze(enumerate());

const FACTS_BY_ROW = new Map();
for (const f of FACTS) {
  if (!FACTS_BY_ROW.has(f.rowId)) FACTS_BY_ROW.set(f.rowId, []);
  FACTS_BY_ROW.get(f.rowId).push(f);
}

/** The facts of one plan row, in enumeration order. */
export function factsForRow(rowId) {
  return FACTS_BY_ROW.get(rowId) || [];
}

/** The plan row a fact belongs to. */
export function rowForFact(f) {
  return FACT_ROWS.find((r) => r.id === f.rowId) || null;
}

/**
 * Engine levels per band (`level` is only the bank band now): sums to 5 at
 * levels 1-2, to 10 at 2-3, to 20 at 4-6, times tables to 10 x 10 at 7-8,
 * 11s and 12s at 9-10.
 */
export const BAND_LEVELS = Object.freeze({
  to5: [1, 2],
  "6to10": [2, 3],
  "11to20": [4, 6],
  core: [7, 8],
  ext: [9, 10],
});

/** Which operations a level serves: addition and subtraction to 6, then
 * multiplication and division. */
export function opsForLevel(level) {
  return level <= 6 ? ["add", "sub"] : ["mul", "div"];
}

/** Facts a level can serve, optionally for one operation. */
export function factsForLevel(level, op = null) {
  return FACTS.filter((f) => {
    if (op && f.op !== op) return false;
    const [lo, hi] = BAND_LEVELS[f.band];
    return level >= lo && level <= hi;
  });
}
