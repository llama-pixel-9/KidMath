import { TIERS } from "./additiveStructures";

/**
 * CCSS Table 2 — multiplication and division situations.
 * See docs/spec-part-ab-operations.md §B1-B2 and research §2.
 *
 * MODEL, mirroring the additive one: three quantities where `g x s = p`
 * (groups x size = product). A structure differs only in which is unknown.
 *
 *   Equal Groups   g = number of groups, s = group size,  p = total
 *   Array/Area     g = rows,             s = per row,     p = total
 *   Compare        g = multiplier,       s = smaller set, p = bigger set
 *
 * The two division meanings fall out of which unknown is asked:
 *   partitive  (group size unknown)   — "shared equally into 3 bags"
 *   quotitive  (number of groups)     — "packed 6 to a bag"
 * The bank has 933 equal-groups-product items and 4 quotitive ones, so the
 * measurement meaning of division is effectively untaught today.
 *
 * Grade placement: Equal Groups and Array are Grade 3; multiplicative Compare
 * is Grade 4, hence the `difficult` tier on the Compare rows.
 */

const SOLVE = { GROUPS: "g", SIZE: "s", PRODUCT: "p" };

export const MULTIPLICATIVE_STRUCTURES = [
  // ---- Equal groups -------------------------------------------------------
  {
    id: "equalGroupsProductUnknown",
    situation: "equalGroups",
    solveFor: SOLVE.PRODUCT,
    tier: TIERS.EASY,
    op: "x",
    subskill: "equalGroups",
    equation: (g, s) => `${g} x ${s} = ?`,
    story: (ctx, { g, s }) =>
      `There are ${g} bags with ${s} ${ctx.plural} in each bag. How many ${ctx.plural} are there in all?`,
  },
  {
    id: "equalGroupsSizeUnknown",
    situation: "equalGroups",
    solveFor: SOLVE.SIZE,
    tier: TIERS.MIDDLE,
    op: "/",
    subskill: "partitioning",
    division: "partitive",
    equation: (g, _s, p) => `${g} x ? = ${p}`,
    story: (ctx, { g, p }) =>
      `${p} ${ctx.plural} are shared equally into ${g} bags. How many ${ctx.plural} are in each bag?`,
  },
  {
    id: "equalGroupsNumberUnknown",
    situation: "equalGroups",
    solveFor: SOLVE.GROUPS,
    tier: TIERS.DIFFICULT,
    op: "/",
    subskill: "unknownQuotient",
    division: "quotitive",
    equation: (_g, s, p) => `? x ${s} = ${p}`,
    story: (ctx, { s, p }) =>
      `${p} ${ctx.plural} are packed ${s} to a bag. How many bags are needed?`,
  },

  // ---- Array / area -------------------------------------------------------
  {
    id: "arrayProductUnknown",
    situation: "array",
    solveFor: SOLVE.PRODUCT,
    tier: TIERS.EASY,
    op: "x",
    subskill: "arrayReasoning",
    equation: (g, s) => `${g} x ${s} = ?`,
    story: (ctx, { g, s }) =>
      `There are ${g} rows of ${ctx.plural} with ${s} in each row. How many ${ctx.plural} are there?`,
  },
  {
    id: "arrayRowSizeUnknown",
    situation: "array",
    solveFor: SOLVE.SIZE,
    tier: TIERS.MIDDLE,
    op: "/",
    subskill: "partitioning",
    division: "partitive",
    equation: (g, _s, p) => `${g} x ? = ${p}`,
    story: (ctx, { g, p }) =>
      `${p} ${ctx.plural} are arranged into ${g} equal rows. How many ${ctx.plural} are in each row?`,
  },
  {
    id: "arrayRowCountUnknown",
    situation: "array",
    solveFor: SOLVE.GROUPS,
    tier: TIERS.DIFFICULT,
    op: "/",
    subskill: "unknownQuotient",
    division: "quotitive",
    equation: (_g, s, p) => `? x ${s} = ${p}`,
    story: (ctx, { s, p }) =>
      `${p} ${ctx.plural} are arranged into rows of ${s}. How many rows will there be?`,
  },

  // ---- Multiplicative compare (Grade 4) -----------------------------------
  {
    id: "compareProductUnknown",
    situation: "multCompare",
    solveFor: SOLVE.PRODUCT,
    tier: TIERS.DIFFICULT,
    op: "x",
    subskill: "equalGroups",
    equation: (g, s) => `${g} x ${s} = ?`,
    story: (ctx, { g, s }) =>
      `A blue ${ctx.singular} costs ${s} cents. A red ${ctx.singular} costs ${g} times as much. How many cents is the red one?`,
  },
  {
    id: "compareSetSizeUnknown",
    situation: "multCompare",
    solveFor: SOLVE.SIZE,
    tier: TIERS.DIFFICULT,
    op: "/",
    subskill: "partitioning",
    division: "partitive",
    equation: (g, _s, p) => `${g} x ? = ${p}`,
    story: (ctx, { g, p }) =>
      `A red ${ctx.singular} costs ${p} cents, which is ${g} times as much as a blue one. How many cents is the blue one?`,
  },
  {
    id: "compareMultiplierUnknown",
    situation: "multCompare",
    solveFor: SOLVE.GROUPS,
    tier: TIERS.DIFFICULT,
    op: "/",
    subskill: "unknownQuotient",
    division: "quotitive",
    equation: (_g, s, p) => `? x ${s} = ${p}`,
    story: (ctx, { s, p }) =>
      `A red ${ctx.singular} costs ${p} cents and a blue one costs ${s} cents. How many times as much is the red one?`,
  },

  // ---- Division with remainders (4.OA.3 / 4.NBT.6) ------------------------
  // Not in Table 2, but required by Grade 4 (spec-part-ab §B2 #10-11). Both
  // keep single-number answers so no new widget is needed: one asks for the
  // leftover, the other for the rounded-up group count — same arithmetic,
  // different interpretation, which is exactly the G4 lesson.
  {
    id: "divisionWithRemainder",
    situation: "equalGroups",
    solveFor: "r",
    tier: TIERS.DIFFICULT,
    minLevel: 7,
    remainder: true,
    op: "/",
    subskill: "remainders",
    division: "partitive",
    equation: (g, _s, p) => `${p} ÷ ${g} — how many are left over?`,
    story: (ctx, { g, p }) =>
      `${p} ${ctx.plural} are shared equally into ${g} bags. How many ${ctx.plural} are left over?`,
  },
  {
    id: "remainderInterpretation",
    situation: "remainderStory",
    solveFor: "ceil",
    tier: TIERS.DIFFICULT,
    minLevel: 7,
    remainder: true,
    op: "/",
    subskill: "remainders",
    division: "quotitive",
    equation: (_g, s, p) => `Boxes hold ${s} each. How many boxes are needed for ${p}?`,
    story: (ctx, { s, p }) =>
      `${p} ${ctx.plural} are packed ${s} to a box. Every single one must be packed. How many boxes are needed?`,
  },
];

export const MULTIPLICATIVE_BY_ID = Object.fromEntries(
  MULTIPLICATIVE_STRUCTURES.map((s) => [s.id, s])
);

/** Structures whose answer is produced by dividing. */
export const DIVISION_STRUCTURES = MULTIPLICATIVE_STRUCTURES.filter((s) => s.op === "/");
export const MULTIPLICATION_STRUCTURES = MULTIPLICATIVE_STRUCTURES.filter((s) => s.op === "x");

/**
 * The same structure has two legitimate symbolic renderings, and which one is
 * shown decides the item's family:
 *
 *   missingFactor  `3 x ? = 18`   unknown embedded -> conceptual
 *   division       `18 / 3 = ?`   unknown at the end -> procedural
 *
 * Without both, `division` could never emit a procedural item and
 * `multiplication` could never emit a conceptual one.
 */
export function divisionEquation(structure, { g, s, p }) {
  const divisor = structure.solveFor === "s" ? g : s;
  return `${p} / ${divisor} = ?`;
}

/** Resolve against `g x s = p`. `form` picks the symbolic rendering. */
export function buildMultiplicative(structure, { g, s, p, r = 0 }, ctx, { asStory, form = "auto" }) {
  // Remainder structures: `p = divisor × quotient + r`, r ≥ 1. solveFor "r"
  // asks for the leftover; "ceil" asks for the rounded-up container count.
  if (structure.remainder) {
    const divisor = g;
    const answer = structure.solveFor === "ceil" ? Math.ceil(p / divisor) : r;
    const promptText = asStory ? structure.story(ctx, { g, s, p, r }) : structure.equation(g, s, p);
    return {
      a: p,
      b: divisor,
      op: structure.op,
      answer,
      display: { promptText },
      givens: { a: p, b: divisor },
      structureType: structure.id,
    };
  }
  const answer = structure.solveFor === "g" ? g : structure.solveFor === "s" ? s : p;
  const useDivision =
    structure.op === "/" && (form === "division" || (form === "auto" && Math.random() < 0.5));
  const promptText = asStory
    ? structure.story(ctx, { g, s, p })
    : useDivision
      ? divisionEquation(structure, { g, s, p })
      : structure.equation(g, s, p);
  // a/b are the RENDERED equation's operand slots, bank-style: the unknown
  // slot is null, so `a op b = answer` holds by construction wherever both
  // are numbers. A division rendering is "p / divisor = ?" (relation holds);
  // a missing-factor rendering "g × ? = p" gets a null in the unknown slot
  // instead of smuggling the product in as if it were a factor.
  const slots = useDivision
    ? [p, structure.solveFor === "s" ? g : s]
    : structure.solveFor === "p"
      ? [g, s]
      : structure.solveFor === "g"
        ? [null, s]
        : [g, null];

  // The given numbers still feed the misconception distractors through their
  // own channel.
  const givens = useDivision
    ? [p, structure.solveFor === "s" ? g : s]
    : [g, s, p].filter((_, i) => ["g", "s", "p"][i] !== structure.solveFor);

  return {
    a: slots[0],
    b: slots[1],
    op: structure.op,
    answer,
    display: { promptText },
    givens: { a: givens[0], b: givens[1] },
    structureType: structure.id,
  };
}
