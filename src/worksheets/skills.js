/* The worksheet skill catalog — what a parent picks.
 *
 * PURE DATA (its only import is more of the same, promptSkills.js): read by the /worksheets screen, by Node (audit, specs,
 * the SEO prerender) and by the native engine bundle, and exported to Swift as
 * JSON — so no functions in the exported values.
 *
 * A skill's `title` is a PROMISE about every problem on the sheet, and
 * worksheetSkills.spec.js holds it to that: "Subtract 3-digit numbers with
 * regrouping" may not print 380 − 35. Two kinds of source:
 *
 *   computation — bare `a op b`, built to the claim by computationSampler.js.
 *                 There is no wording to review and the number space is
 *                 unbounded, so these are the one thing not drawn from the bank.
 *   bank        — a filter over approved bank cells (see `npm run
 *                 worksheets:audit` for the menu). Everything worded.
 *
 * `grade` is the grade of `ccss[0]` where there is a standard (`ccss` may be
 * empty — calendars, early coins). CCSS codes are cited as codes only; every
 * title is our own wording. `level` is the legacy engine level — the bridge for
 * old ?mode=&level= links and the marketing catalog.
 */

import { PROMPT_SKILLS } from "./promptSkills.js";

export const GRADES = ["K", "1", "2", "3", "4", "5"];

export const GRADE_LABELS = {
  K: "Kindergarten",
  1: "Grade 1",
  2: "Grade 2",
  3: "Grade 3",
  4: "Grade 4",
  5: "Grade 5",
};

export const GRADE_SLUGS = {
  K: "kindergarten",
  1: "grade-1",
  2: "grade-2",
  3: "grade-3",
  4: "grade-4",
  5: "grade-5",
};

// Plain names a parent would search for — never the kid-facing game names.
export const TOPIC_LABELS = {
  counting: "Counting",
  comparing: "Comparing Numbers",
  skipCounting: "Skip Counting",
  placeValue: "Place Value",
  placeValueDiscs: "Place Value Discs",
  numberBonds: "Number Bonds",
  addition: "Addition",
  subtraction: "Subtraction",
  barModels: "Bar Models",
  multiplication: "Multiplication",
  division: "Division",
  factorsMultiples: "Factors & Multiples",
  patterns: "Patterns",
  fractions: "Fractions",
  fractionOps: "Fraction Operations",
  decimals: "Decimals",
  decimalOps: "Decimal Operations",
  measurement: "Measurement",
  money: "Money",
  time: "Telling Time",
  dataGraphs: "Graphs & Data",
  areaPerimeter: "Area & Perimeter",
  angles: "Angles",
  linesShapes: "Lines & Shapes",
  volumeCoordinates: "Volume & Coordinates",
};

const ONE_DIGIT = [1, 9];
const TWO_DIGIT = [10, 99];
const THREE_DIGIT = [100, 999];
const FOUR_DIGIT = [1000, 9999];

/** A bare-computation skill. `claim` is both the sampler's spec and the check. */
function drill(id, grade, mode, ccss, title, layout, claim, stories, level) {
  return { id, grade, mode, ccss: [ccss], title, layout, source: { kind: "computation", ...claim }, stories, level };
}

/** A bank-filter skill. */
function banked(id, grade, mode, ccss, title, source, stories, level, layout = "prompt") {
  return { id, grade, mode, ccss: [ccss], title, layout, source: { kind: "bank", ...source }, stories, level };
}

const BOTH = ["procedural", "conceptual"];

// The four operations: drills built to a claim, plus their worded cells.
const OPERATION_SKILLS = [
  // ── Addition ────────────────────────────────────────────────────────────
  drill("add-within-5", "K", "addition", "K.OA.A.5", "Add within 5", "horizontal",
    { op: "+", a: [1, 4], b: [1, 4], total: [2, 5], ordered: true },
    { levels: [1, 3], numbers: { max: 5 } }, 1),
  drill("add-within-10", "K", "addition", "K.OA.A.2", "Add within 10", "horizontal",
    { op: "+", a: ONE_DIGIT, b: ONE_DIGIT, total: [2, 10], ordered: true, reach: { over: 5, share: 0.4 } },
    { levels: [1, 3], numbers: { max: 10 } }, 2),
  drill("add-within-20", "1", "addition", "1.OA.C.6", "Add within 20", "horizontal",
    { op: "+", a: [2, 10], b: [2, 10], total: [4, 20], reach: { over: 10, share: 0.4 } },
    { levels: [4, 6], numbers: { min: 11, max: 20 } }, 4),
  drill("add-across-ten", "1", "addition", "1.OA.C.6", "Add two 1-digit numbers, crossing ten", "horizontal",
    { op: "+", a: [2, 9], b: [2, 9], total: [11, 18], ordered: true },
    { levels: [4, 6], numbers: { min: 11, max: 20 } }, 5),
  drill("add-2digit-1digit", "1", "addition", "1.NBT.C.4", "Add a 2-digit and a 1-digit number", "stacked",
    { op: "+", a: TWO_DIGIT, b: [2, 9], total: [12, 100] },
    { levels: [4, 10], numbers: { min: 21, max: 100 } }, 6),
  drill("add-2digit-no-regroup", "2", "addition", "2.NBT.B.5", "Add 2-digit numbers, no regrouping", "stacked",
    { op: "+", a: TWO_DIGIT, b: TWO_DIGIT, total: [20, 99], regroup: "none" },
    { levels: [7, 10], numbers: { min: 21, max: 100 }, regroup: "none" }, 7),
  drill("add-2digit-regroup", "2", "addition", "2.NBT.B.5", "Add 2-digit numbers with regrouping", "stacked",
    { op: "+", a: TWO_DIGIT, b: TWO_DIGIT, regroup: "required" },
    { levels: [7, 10], numbers: { min: 21, max: 200 }, regroup: "required" }, 7),
  drill("add-3digit-no-regroup", "2", "addition", "2.NBT.B.7", "Add 3-digit numbers, no regrouping", "stacked",
    { op: "+", a: THREE_DIGIT, b: THREE_DIGIT, total: [200, 999], regroup: "none" },
    { levels: [7, 10], numbers: { min: 101, max: 1000 }, regroup: "none" }, 9),
  drill("add-3digit-regroup", "3", "addition", "3.NBT.A.2", "Add 3-digit numbers with regrouping", "stacked",
    { op: "+", a: THREE_DIGIT, b: THREE_DIGIT, total: [200, 1000], regroup: "required" },
    { levels: [7, 10], numbers: { min: 101, max: 1000 }, regroup: "required" }, 10),
  drill("add-4digit", "4", "addition", "4.NBT.B.4", "Add 4-digit numbers", "stackedWide",
    { op: "+", a: FOUR_DIGIT, b: FOUR_DIGIT, regroup: "required" },
    { levels: [9, 10], numbers: { min: 1001, max: 20000 } }, 10),
  banked("add-missing-addend-10", "1", "addition", "1.OA.D.8", "Find the missing addend within 10",
    { families: BOTH, subskills: ["unknownAddend"], levels: [1, 3], numbers: { max: 10 } },
    { levels: [1, 3], subskills: ["unknownAddend"], numbers: { max: 10 } }, 2, "promptShort"),
  banked("add-missing-addend-20", "1", "addition", "1.OA.D.8", "Find the missing addend within 20",
    { families: BOTH, subskills: ["unknownAddend"], levels: [4, 6], numbers: { min: 11, max: 20 } },
    { levels: [4, 6], subskills: ["unknownAddend"], numbers: { min: 11, max: 20 } }, 5, "promptShort"),
  banked("add-make-ten", "1", "addition", "1.OA.C.6", "Make ten to add",
    { families: ["conceptual"], subskills: ["makeTen"], levels: [1, 6], numbers: { max: 20 } },
    { levels: [1, 6], subskills: ["makeTen"], numbers: { max: 20 } }, 4, "promptShort"),
  banked("add-missing-addend-1000", "3", "addition", "3.NBT.A.2", "Find the missing addend within 1000",
    { families: BOTH, subskills: ["unknownAddend"], levels: [7, 10], numbers: { min: 101, max: 1000 } },
    { levels: [7, 10], subskills: ["unknownAddend"], numbers: { min: 101, max: 1000 } }, 10, "promptShort"),

  // ── Subtraction ─────────────────────────────────────────────────────────
  drill("sub-within-5", "K", "subtraction", "K.OA.A.5", "Subtract within 5", "horizontal",
    { op: "-", a: [2, 5], b: [1, 4], difference: [1, 4] },
    { levels: [1, 3], numbers: { max: 5 } }, 1),
  drill("sub-within-10", "K", "subtraction", "K.OA.A.2", "Subtract within 10", "horizontal",
    { op: "-", a: [3, 10], b: [1, 9], difference: [1, 9], reach: { over: 5, share: 0.4 } },
    { levels: [1, 3], numbers: { max: 10 } }, 2),
  drill("sub-within-20", "1", "subtraction", "1.OA.C.6", "Subtract within 20", "horizontal",
    { op: "-", a: [6, 20], b: [2, 10], difference: [1, 18], reach: { over: 10, share: 0.4 } },
    { levels: [4, 6], numbers: { min: 11, max: 20 } }, 4),
  drill("sub-across-ten", "1", "subtraction", "1.OA.C.6", "Subtract from a teen number, crossing ten", "horizontal",
    { op: "-", a: [11, 18], b: [2, 9], difference: [2, 9] },
    { levels: [4, 6], numbers: { min: 11, max: 20 } }, 5),
  drill("sub-2digit-1digit", "1", "subtraction", "1.NBT.C.4", "Subtract a 1-digit number from a 2-digit number", "stacked",
    { op: "-", a: [21, 99], b: [2, 9] },
    { levels: [4, 10], numbers: { min: 21, max: 100 } }, 6),
  drill("sub-2digit-no-regroup", "2", "subtraction", "2.NBT.B.5", "Subtract 2-digit numbers, no regrouping", "stacked",
    { op: "-", a: TWO_DIGIT, b: TWO_DIGIT, difference: [1, 89], regroup: "none" },
    { levels: [7, 10], numbers: { min: 21, max: 100 }, regroup: "none" }, 7),
  drill("sub-2digit-regroup", "2", "subtraction", "2.NBT.B.5", "Subtract 2-digit numbers with regrouping", "stacked",
    { op: "-", a: TWO_DIGIT, b: TWO_DIGIT, difference: [1, 89], regroup: "required" },
    { levels: [7, 10], numbers: { min: 21, max: 100 }, regroup: "required" }, 7),
  drill("sub-3digit-no-regroup", "2", "subtraction", "2.NBT.B.7", "Subtract 3-digit numbers, no regrouping", "stacked",
    { op: "-", a: THREE_DIGIT, b: THREE_DIGIT, difference: [1, 899], regroup: "none" },
    { levels: [7, 10], numbers: { min: 101, max: 1000 }, regroup: "none" }, 9),
  drill("sub-3digit-regroup", "3", "subtraction", "3.NBT.A.2", "Subtract 3-digit numbers with regrouping", "stacked",
    { op: "-", a: THREE_DIGIT, b: THREE_DIGIT, difference: [1, 899], regroup: "required" },
    { levels: [7, 10], numbers: { min: 101, max: 1000 }, regroup: "required" }, 10),
  drill("sub-across-zeros", "3", "subtraction", "3.NBT.A.2", "Subtract across zeros", "stacked",
    { op: "-", a: THREE_DIGIT, b: [11, 999], difference: [1, 899], regroup: "required", minuendZero: true },
    { levels: [7, 10], numbers: { min: 101, max: 1000 }, regroup: "required" }, 10),
  drill("sub-4digit", "4", "subtraction", "4.NBT.B.4", "Subtract 4-digit numbers", "stackedWide",
    { op: "-", a: FOUR_DIGIT, b: FOUR_DIGIT, difference: [1, 8999], regroup: "required" },
    { levels: [9, 10], numbers: { min: 1001, max: 20000 } }, 10),
  banked("sub-missing-number-10", "1", "subtraction", "1.OA.D.8", "Find the missing number in a subtraction within 10",
    { families: BOTH, subskills: ["unknownSubtrahend"], levels: [1, 3], numbers: { max: 10 } },
    { levels: [1, 3], subskills: ["unknownSubtrahend"], numbers: { max: 10 } }, 2, "promptShort"),
  banked("sub-missing-number-20", "1", "subtraction", "1.OA.D.8", "Find the missing number in a subtraction within 20",
    { families: BOTH, subskills: ["unknownSubtrahend"], levels: [4, 6], numbers: { min: 11, max: 20 } },
    { levels: [4, 6], subskills: ["unknownSubtrahend"], numbers: { min: 11, max: 20 } }, 5, "promptShort"),
  banked("sub-how-many-more", "1", "subtraction", "1.OA.A.1", "How many more? Compare two numbers within 20",
    { families: ["conceptual"], subskills: ["differenceAsDistance"], levels: [1, 6], numbers: { max: 20 } },
    { levels: [1, 6], subskills: ["differenceAsDistance"], numbers: { max: 20 } }, 4, "promptShort"),
  banked("sub-missing-number-1000", "3", "subtraction", "3.NBT.A.2", "Find the missing number in a subtraction within 1000",
    { families: BOTH, subskills: ["unknownSubtrahend"], levels: [7, 10], numbers: { min: 101, max: 1000 } },
    { levels: [7, 10], subskills: ["unknownSubtrahend"], numbers: { min: 101, max: 1000 } }, 10, "promptShort"),

  // ── Multiplication ──────────────────────────────────────────────────────
  drill("mul-tables-2-5-10", "3", "multiplication", "3.OA.C.7", "Times tables: 2, 5 and 10", "horizontal",
    { op: "x", table: [2, 5, 10], b: [1, 10], ordered: true },
    { levels: [1, 6], table: [2, 5, 10], numbers: { max: 100 } }, 2),
  drill("mul-tables-3-4-6", "3", "multiplication", "3.OA.C.7", "Times tables: 3, 4 and 6", "horizontal",
    { op: "x", table: [3, 4, 6], b: [1, 10], ordered: true },
    { levels: [1, 10], table: [3, 4, 6], numbers: { max: 100 } }, 4),
  drill("mul-tables-7-8-9", "3", "multiplication", "3.OA.C.7", "Times tables: 7, 8 and 9", "horizontal",
    { op: "x", table: [7, 8, 9], b: [1, 10], ordered: true },
    { levels: [4, 10], table: [7, 8, 9], numbers: { max: 100 } }, 6),
  drill("mul-facts-to-100", "3", "multiplication", "3.OA.C.7", "Multiplication facts to 10 × 10", "horizontal",
    { op: "x", a: [2, 10], b: [2, 10], reach: { over: 30, share: 0.3 } },
    { levels: [4, 10], factors: { max: 10 }, numbers: { max: 100 } }, 6),
  drill("mul-by-multiples-of-10", "3", "multiplication", "3.NBT.A.3", "Multiply a 1-digit number by a multiple of 10", "horizontal",
    { op: "x", a: [2, 9], b: [10, 90], bStep: 10 },
    null, 7),
  drill("mul-2digit-by-1digit", "4", "multiplication", "4.NBT.B.5", "Multiply a 2-digit number by a 1-digit number", "stacked",
    { op: "x", a: [11, 99], b: [2, 9] },
    { levels: [7, 10], numbers: { min: 101, max: 1000 } }, 8),
  drill("mul-3digit-by-1digit", "4", "multiplication", "4.NBT.B.5", "Multiply a 3-digit number by a 1-digit number", "stacked",
    { op: "x", a: THREE_DIGIT, b: [2, 9] },
    null, 9),
  drill("mul-2digit-by-2digit", "4", "multiplication", "4.NBT.B.5", "Multiply two 2-digit numbers", "stackedWide",
    { op: "x", a: [11, 99], b: [11, 99] },
    null, 10),
  drill("mul-3digit-by-2digit", "5", "multiplication", "5.NBT.B.5", "Multiply a 3-digit number by a 2-digit number", "stackedWide",
    { op: "x", a: THREE_DIGIT, b: [11, 99] },
    null, 10),
  banked("mul-equal-groups", "3", "multiplication", "3.OA.A.1", "Equal groups: what multiplication means",
    { families: ["conceptual"], subskills: ["equalGroups"], structureTypes: ["equalGroupsTotalUnknown"], levels: [1, 6] },
    { levels: [1, 6], subskills: ["equalGroups"] }, 3, "promptShort"),
  banked("mul-arrays", "3", "multiplication", "3.OA.A.3", "Arrays: rows and columns",
    { families: ["conceptual"], subskills: ["arrayReasoning"], structureTypes: ["arrayTotalUnknown"], levels: [1, 10], numbers: { max: 100 } },
    { levels: [1, 10], subskills: ["arrayReasoning"], numbers: { max: 100 } }, 5),
  banked("mul-break-apart", "4", "multiplication", "4.NBT.B.5", "Break apart a factor to multiply",
    { families: ["conceptual"], structureTypes: ["multiDigitDistributive"], levels: [8, 10] },
    null, 9),

  // ── Division ────────────────────────────────────────────────────────────
  drill("div-facts-2-5-10", "3", "division", "3.OA.C.7", "Division facts: divide by 2, 5 and 10", "horizontal",
    { op: "/", table: [2, 5, 10], quotient: [1, 10], remainder: "none" },
    { levels: [1, 6], table: [2, 5, 10], numbers: { max: 100 } }, 2),
  drill("div-facts-3-4-6", "3", "division", "3.OA.C.7", "Division facts: divide by 3, 4 and 6", "horizontal",
    { op: "/", table: [3, 4, 6], quotient: [1, 10], remainder: "none" },
    { levels: [1, 10], table: [3, 4, 6], numbers: { max: 100 } }, 4),
  drill("div-facts-7-8-9", "3", "division", "3.OA.C.7", "Division facts: divide by 7, 8 and 9", "horizontal",
    { op: "/", table: [7, 8, 9], quotient: [1, 10], remainder: "none" },
    { levels: [4, 10], table: [7, 8, 9], numbers: { max: 100 } }, 6),
  drill("div-facts-to-100", "3", "division", "3.OA.C.7", "Division facts within 100", "horizontal",
    { op: "/", b: [2, 10], quotient: [2, 10], remainder: "none", reach: { over: 30, share: 0.3 } },
    { levels: [4, 10], factors: { max: 10 }, numbers: { max: 100 } }, 6),
  drill("div-2digit-by-1digit", "4", "division", "4.NBT.B.6", "Divide a 2-digit number by a 1-digit number, no remainder", "longDivision",
    { op: "/", b: [2, 9], quotient: [11, 49], dividend: TWO_DIGIT, remainder: "none" },
    null, 8),
  drill("div-2digit-remainder", "4", "division", "4.NBT.B.6", "Divide a 2-digit number by a 1-digit number, with remainders", "longDivision",
    { op: "/", b: [2, 9], quotient: [2, 49], dividend: TWO_DIGIT, remainder: "required" },
    null, 8),
  drill("div-3digit-by-1digit", "4", "division", "4.NBT.B.6", "Divide a 3-digit number by a 1-digit number", "longDivision",
    { op: "/", b: [2, 9], quotient: [12, 499], dividend: THREE_DIGIT, remainder: "any" },
    { levels: [7, 10], numbers: { min: 101, max: 1000 } }, 9),
  drill("div-by-2digit", "5", "division", "5.NBT.B.6", "Divide by a 2-digit number", "longDivision",
    { op: "/", b: [11, 49], quotient: [2, 89], dividend: [100, 9999], remainder: "none" },
    null, 10),
  banked("div-equal-sharing", "3", "division", "3.OA.A.2", "Equal sharing: split into equal groups",
    { families: ["conceptual"], subskills: ["partitioning"], levels: [1, 6] },
    { levels: [1, 6], numbers: { max: 100 } }, 3),
  banked("div-remainders", "4", "division", "4.NBT.B.6", "Find the quotient and the remainder",
    { families: BOTH, subskills: ["remainders"], structureTypes: ["divisionRemainderLeft", "divisionRemainderQuotient", "remainderBounded"], levels: [7, 10] },
    null, 8, "promptShort"),
];

export const WORKSHEET_SKILLS = [...OPERATION_SKILLS, ...PROMPT_SKILLS];
