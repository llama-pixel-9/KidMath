import { count, countWith } from "./contexts";

/**
 * CCSS Table 1 — addition and subtraction situations.
 * See docs/spec-part-ab-operations.md §A1 and docs/research-k4-problem-types.md §1.
 *
 * MODEL: every additive structure is a view on three quantities where
 * `x + y = z`. A structure differs only in which two are given and which is
 * asked. So the whole grid is one small model, not 15 special cases:
 *
 *   Add To            x = start,   y = change,  z = end
 *   Take From         x = taken,   y = left,    z = start
 *   Put Together      x = partA,   y = partB,   z = total
 *   Compare           x = smaller, y = difference, z = bigger
 *
 * TIERS come from the OA Progressions' solution levels, not from number size:
 *   easy       Level 1, direct modeling        — Kindergarten
 *   middle     Level 2, counting on            — Grade 1
 *   difficult  Level 3, derived facts          — G1 exposure, G2 mastery
 *
 * The defining property of `difficult`: the situation equation is the opposite
 * of the solution operation. `? + 3 = 5` reads as addition, solves by
 * subtraction. That is what makes these hard, and why they must be generated.
 *
 * `subskill` maps each structure onto the mode's existing declared subskills so
 * curated bank items (3,924 of them, keyed by subskill) keep resolving.
 */

export const TIERS = { EASY: "easy", MIDDLE: "middle", DIFFICULT: "difficult" };

/** Which of x/y/z the child solves for, given the other two. */
const SOLVE = { X: "x", Y: "y", Z: "z" };

export const ADDITIVE_STRUCTURES = [
  // ---- Add To: x = start, y = change, z = end -----------------------------
  {
    id: "addToResultUnknown",
    operands: (x, y) => [x, y],
    situation: "addTo",
    solveFor: SOLVE.Z,
    tier: TIERS.EASY,
    op: "+",
    subskill: "composeDecompose",
    equation: (x, y) => `${x} + ${y} = ?`,
    story: (ctx, { x, y }) =>
      `${count(x, ctx)} sat ${ctx.setting}. ${y} more ${ctx.joinVerb}. How many ${ctx.plural} are there now?`,
  },
  {
    id: "addToChangeUnknown",
    slots: (x) => [x, null], // x + ? = z
    situation: "addTo",
    solveFor: SOLVE.Y,
    tier: TIERS.MIDDLE,
    op: "+",
    subskill: "unknownAddend",
    equation: (x, _y, z) => `${x} + ? = ${z}`,
    story: (ctx, { x, z }) =>
      `${count(x, ctx)} sat ${ctx.setting}. Some more ${ctx.joinVerb}. Now there are ${z}. How many ${ctx.plural} ${ctx.joinVerb}?`,
  },
  {
    id: "addToStartUnknown",
    slots: (_x, y) => [null, y], // ? + y = z
    situation: "addTo",
    solveFor: SOLVE.X,
    tier: TIERS.DIFFICULT,
    op: "+",
    subskill: "unknownAddend",
    equation: (_x, y, z) => `? + ${y} = ${z}`,
    story: (ctx, { y, z }) =>
      `Some ${ctx.plural} sat ${ctx.setting}. ${y} more ${ctx.joinVerb}. Now there are ${z}. How many ${ctx.plural} were there before?`,
  },

  // ---- Take From: x = taken, y = left, z = start ---------------------------
  {
    id: "takeFromResultUnknown",
    operands: (x, _y, z) => [z, x],
    situation: "takeFrom",
    solveFor: SOLVE.Y,
    tier: TIERS.EASY,
    op: "-",
    subskill: "differenceAsDistance",
    equation: (x, _y, z) => `${z} - ${x} = ?`,
    story: (ctx, { x, z }) =>
      `${z} ${ctx.plural} were ${ctx.setting}. ${ctx.actor} ${ctx.takeVerb} ${x}. How many ${ctx.plural} are left?`,
  },
  {
    id: "takeFromChangeUnknown",
    slots: (_x, _y, z) => [z, null], // z - ? = y
    situation: "takeFrom",
    solveFor: SOLVE.X,
    tier: TIERS.MIDDLE,
    op: "-",
    subskill: "unknownSubtrahend",
    equation: (_x, y, z) => `${z} - ? = ${y}`,
    story: (ctx, { y, z }) =>
      `${z} ${ctx.plural} were ${ctx.setting}. ${ctx.actor} ${ctx.takeVerb} some. Now there are ${y}. How many ${ctx.plural} did ${ctx.actor} ${ctx.takeVerb === "ate" ? "eat" : "take"}?`,
  },
  {
    id: "takeFromStartUnknown",
    slots: (x) => [null, x], // ? - x = y
    situation: "takeFrom",
    solveFor: SOLVE.Z,
    tier: TIERS.DIFFICULT,
    op: "-",
    subskill: "unknownSubtrahend",
    equation: (x, y) => `? - ${x} = ${y}`,
    story: (ctx, { x, y }) =>
      `Some ${ctx.plural} were ${ctx.setting}. ${ctx.actor} ${ctx.takeVerb} ${x}. Now there are ${y}. How many ${ctx.plural} were there before?`,
  },

  // ---- Put Together / Take Apart: x = partA, y = partB, z = total ----------
  {
    id: "putTogetherTotalUnknown",
    operands: (x, y) => [x, y],
    situation: "putTogether",
    solveFor: SOLVE.Z,
    tier: TIERS.EASY,
    op: "+",
    subskill: "composeDecompose",
    equation: (x, y) => `${x} + ${y} = ?`,
    story: (ctx, { x, y }) =>
      `${countWith(x, ctx.attrA, ctx)} and ${countWith(y, ctx.attrB, ctx)} are ${ctx.setting}. How many ${ctx.plural} in all?`,
  },
  {
    id: "putTogetherAddendUnknown",
    slots: (x) => [x, null], // x + ? = z
    situation: "putTogether",
    solveFor: SOLVE.Y,
    tier: TIERS.MIDDLE,
    op: "+",
    subskill: "unknownAddend",
    equation: (x, _y, z) => `${x} + ? = ${z}`,
    story: (ctx, { x, z }) =>
      `${z} ${ctx.plural} are ${ctx.setting}. ${x} are ${ctx.attrA} and the rest are ${ctx.attrB}. How many ${ctx.plural} are ${ctx.attrB}?`,
  },

  // ---- Compare: x = smaller, y = difference, z = bigger --------------------
  {
    id: "compareDifferenceMore",
    operands: (x, _y, z) => [z, x],
    situation: "compare",
    solveFor: SOLVE.Y,
    tier: TIERS.MIDDLE,
    op: "-",
    subskill: "differenceAsDistance",
    equation: (x, _y, z) => `${z} - ${x} = ?`,
    story: (ctx, { x, z }) =>
      `${ctx.actor} has ${count(x, ctx)}. ${ctx.actor2} has ${z}. How many more ${ctx.plural} does ${ctx.actor2} have than ${ctx.actor}?`,
  },
  {
    id: "compareDifferenceFewer",
    operands: (x, _y, z) => [z, x],
    situation: "compare",
    solveFor: SOLVE.Y,
    tier: TIERS.MIDDLE,
    op: "-",
    subskill: "differenceAsDistance",
    equation: (x, _y, z) => `${z} - ${x} = ?`,
    story: (ctx, { x, z }) =>
      `${ctx.actor} has ${count(x, ctx)}. ${ctx.actor2} has ${z}. How many fewer ${ctx.plural} does ${ctx.actor} have than ${ctx.actor2}?`,
  },
  {
    id: "compareBiggerMore",
    operands: (x, y) => [x, y],
    situation: "compare",
    solveFor: SOLVE.Z,
    tier: TIERS.MIDDLE,
    op: "+",
    subskill: "composeDecompose",
    // Consistent language: "more" and the child adds.
    equation: (x, y) => `${x} + ${y} = ?`,
    story: (ctx, { x, y }) =>
      `${ctx.actor2} has ${y} more ${ctx.plural} than ${ctx.actor}. ${ctx.actor} has ${count(x, ctx)}. How many ${ctx.plural} does ${ctx.actor2} have?`,
  },
  {
    id: "compareBiggerFewer",
    operands: (x, y) => [x, y],
    situation: "compare",
    solveFor: SOLVE.Z,
    tier: TIERS.DIFFICULT,
    op: "+",
    subskill: "composeDecompose",
    languageTrap: true, // says "fewer", requires addition
    equation: (x, y) => `${x} + ${y} = ?`,
    story: (ctx, { x, y }) =>
      `${ctx.actor} has ${y} fewer ${ctx.plural} than ${ctx.actor2}. ${ctx.actor} has ${count(x, ctx)}. How many ${ctx.plural} does ${ctx.actor2} have?`,
  },
  {
    id: "compareSmallerMore",
    operands: (_x, y, z) => [z, y],
    situation: "compare",
    solveFor: SOLVE.X,
    tier: TIERS.DIFFICULT,
    op: "-",
    subskill: "differenceAsDistance",
    languageTrap: true, // says "more", requires subtraction
    equation: (_x, y, z) => `${z} - ${y} = ?`,
    story: (ctx, { y, z }) =>
      `${ctx.actor2} has ${y} more ${ctx.plural} than ${ctx.actor}. ${ctx.actor2} has ${z}. How many ${ctx.plural} does ${ctx.actor} have?`,
  },
  {
    id: "compareSmallerFewer",
    operands: (_x, y, z) => [z, y],
    situation: "compare",
    solveFor: SOLVE.X,
    tier: TIERS.MIDDLE,
    op: "-",
    subskill: "differenceAsDistance",
    equation: (_x, y, z) => `${z} - ${y} = ?`,
    story: (ctx, { y, z }) =>
      `${ctx.actor} has ${y} fewer ${ctx.plural} than ${ctx.actor2}. ${ctx.actor2} has ${z}. How many ${ctx.plural} does ${ctx.actor} have?`,
  },
];

/**
 * Both Addends Unknown — the one structure with many correct answers. The
 * Progressions call it "a productive variation with two unknowns", not a
 * one-unknown subtype, so it is kept separate from the grid above.
 * Needs the set-validating checker (implementation plan M2) to be answerable
 * as intended; until then it asks for one decomposition.
 */
export const BOTH_ADDENDS_UNKNOWN = {
  id: "bothAddendsUnknown",
  situation: "putTogether",
  tier: TIERS.EASY,
  op: "+",
  subskill: "composeDecompose",
  multipleAnswers: true,
};

/**
 * Compare situations must be told as stories. Rendered as a bare equation,
 * `x + y = ?` from compareBiggerMore is identical to putTogetherTotalUnknown —
 * the comparison *is* the language, so a symbolic rendering would both lose the
 * structure and mislabel the item.
 */
export const STORY_ONLY_SITUATIONS = new Set(["compare"]);

export const ADDITIVE_BY_ID = Object.fromEntries(
  [...ADDITIVE_STRUCTURES, BOTH_ADDENDS_UNKNOWN].map((s) => [s.id, s])
);

/**
 * Resolve a structure against three quantities into a question payload.
 * `x + y = z` always holds; the structure picks which one is unknown.
 */
export function buildAdditive(structure, { x, y, z }, ctx, { asStory }) {
  const answer = structure.solveFor === "x" ? x : structure.solveFor === "y" ? y : z;
  const promptText = asStory
    ? structure.story(ctx, { x, y, z })
    : structure.equation(x, y, z);

  // a/b are the RENDERED equation's operand slots, exactly as bank-authored
  // items ship them: the unknown slot is null, never a stand-in number. This
  // makes `a op b = answer` hold by construction wherever both are numbers —
  // an embedded-unknown item physically cannot be laid out as a plain sum
  // (the class that rendered "19 + 14 = ?" over an answer of 5).
  //
  // `operands` (result-position unknowns) and `slots` (embedded unknowns)
  // both declare the equation's [left, right] explicitly per structure — the
  // slot layout depends on the equation's SHAPE ("z − ? = y" puts z on the
  // left), so it is never inferred from solveFor.
  const slots = structure.operands
    ? structure.operands(x, y, z)
    : structure.slots
      ? structure.slots(x, y, z)
      : [null, null];

  // The two GIVEN numbers keep feeding prompt re-dressing and the
  // misconception distractors (sum-of-givens traps) — as `givens` now.
  const givens = [x, y, z].filter((_, i) => ["x", "y", "z"][i] !== structure.solveFor);

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
