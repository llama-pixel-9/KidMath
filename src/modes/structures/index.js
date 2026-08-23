import { randInt } from "../helpers";
import { ITEM_FAMILIES } from "../itemMetadata";
import { pickContext } from "./contexts";
import {
  ADDITIVE_STRUCTURES,
  buildAdditive,
  TIERS,
  STORY_ONLY_SITUATIONS,
} from "./additiveStructures";
import { MULTIPLICATIVE_STRUCTURES, buildMultiplicative } from "./multiplicativeStructures";
import {
  structuresForLevel,
  maxTotalForLevel,
  storyShare,
  bandForLevel,
  WORD_PROBLEMS_FROM_LEVEL,
} from "./levelPolicy";

export * from "./additiveStructures";
export * from "./multiplicativeStructures";
export * from "./levelPolicy";
export * from "./contexts";

/**
 * M1.5 — family is DERIVED, not rolled.
 *
 * Previously every mode rolled `chooseFamily()` at random and wrote the result
 * to metadata; in three modes it never even branched the prompt, so items
 * tagged `application` rendered identically to `procedural` ones. A family is
 * a fact about the item that already exists once you know how it is presented:
 *
 *   story prose            -> application
 *   unknown not at the end -> conceptual (the equation itself is the lesson)
 *   plain a op b = ?       -> procedural
 */
export function deriveFamily({ asStory, promptText }) {
  if (asStory) return ITEM_FAMILIES.APPLICATION;
  // Judge the RENDERED equation, not the position in the abstract model.
  // `5 - 2 = ?` is procedural even though the model solves for a non-final
  // quantity; `3 + ? = 8` is conceptual because the unknown is embedded.
  return /=\s*\?\s*$/.test(promptText || "")
    ? ITEM_FAMILIES.PROCEDURAL
    : ITEM_FAMILIES.CONCEPTUAL;
}

/** DOK follows the tier, not the family. */
export function deriveCognitiveDemand(structure, asStory) {
  if (structure.tier === TIERS.DIFFICULT) return "DOK3";
  if (asStory || structure.tier === TIERS.MIDDLE) return "DOK2";
  return "DOK1";
}

/** Family a structure would land in when rendered symbolically. */
export function symbolicFamilyOf(structure, form = "auto") {
  const probe =
    structure.op === "/" && form !== "missingFactor"
      ? "12 / 3 = ?"
      : structure.equation(2, 3, 6);
  return /=\s*\?\s*$/.test(probe) ? ITEM_FAMILIES.PROCEDURAL : ITEM_FAMILIES.CONCEPTUAL;
}

function wantsStory(level, context, structure) {
  // An explicit family request wins: mathEngine asks for `application` when it
  // intends to consult the curated bank, and for procedural/conceptual when it
  // wants a symbolic item.
  if (context?.itemFamily === ITEM_FAMILIES.APPLICATION) return true;
  if (
    context?.itemFamily === ITEM_FAMILIES.PROCEDURAL ||
    context?.itemFamily === ITEM_FAMILIES.CONCEPTUAL
  ) {
    return false;
  }
  // Compare situations are inherently verbal (see STORY_ONLY_SITUATIONS), so
  // they stay stories even when the learner has word problems switched off —
  // the alternative is emitting a mislabelled equation.
  if (STORY_ONLY_SITUATIONS.has(structure?.situation)) return true;
  if (context?.allowWordProblems === false) return false;
  if (level < WORD_PROBLEMS_FROM_LEVEL) return false;
  return Math.random() < storyShare(level);
}

/** Pick a structure honouring an explicit request, else the level's pool. */
function selectStructure(pool, level, context, { noStory = false, form = "auto" } = {}) {
  const available = noStory
    ? pool.filter((s) => !STORY_ONLY_SITUATIONS.has(s.situation))
    : pool;
  pool = available.length ? available : pool;
  if (context?.structureType) {
    const forced = pool.find((s) => s.id === context.structureType);
    if (forced) return forced;
  }
  if (context?.targetSubskill) {
    const matching = pool.filter((s) => s.subskill === context.targetSubskill);
    if (matching.length) return matching[randInt(0, matching.length - 1)];
  }
  const weighted = structuresForLevel(pool, level);
  const candidates = weighted.length ? weighted : pool;

  const wantSymbolic =
    context?.itemFamily === ITEM_FAMILIES.PROCEDURAL ||
    context?.itemFamily === ITEM_FAMILIES.CONCEPTUAL;
  if (wantSymbolic) {
    const matching = candidates.filter(
      (s) => symbolicFamilyOf(s, form) === context.itemFamily
    );
    if (matching.length) return matching[randInt(0, matching.length - 1)];
  }
  return candidates[randInt(0, candidates.length - 1)];
}

/**
 * Three quantities for an additive item, sized to the level but never so small
 * that the structure collapses (e.g. a difference of 0).
 */
function additiveQuantities(level) {
  const max = maxTotalForLevel(level);
  const z = randInt(Math.max(3, Math.ceil(max / 3)), max);
  const x = randInt(1, z - 1);
  return { x, y: z - x, z };
}

export function generateAdditiveItem(level, context = {}, { pool = ADDITIVE_STRUCTURES } = {}) {
  const structure = selectStructure(pool, level, context, {
    noStory: context?.allowWordProblems === false,
  });
  const asStory = wantsStory(level, context, structure);
  const nums = additiveQuantities(level);
  const ctx = pickContext();
  const payload = buildAdditive(structure, nums, ctx, { asStory });

  return {
    ...payload,
    level,
    structure,
    itemFamily: deriveFamily({ asStory, promptText: payload.display.promptText }),
    asStory,
  };
}

/** `g x s = p`, sized so products stay inside the level's ceiling. */
function multiplicativeQuantities(level, { division = false } = {}) {
  const band = bandForLevel(level);
  const maxFactor = band === "K" ? 5 : band === "G1" ? 9 : 12;
  // Division keeps a one-digit divisor with growing dividends (4.NBT.6 is
  // multi-digit ÷ one-digit); multiplication grows both factors (4.NBT.5).
  if (division && level >= 8) {
    const divisor = randInt(2, 9);
    const quotient = level >= 9 ? randInt(10, 99) : randInt(10, 30);
    return { g: divisor, s: quotient, p: divisor * quotient };
  }
  if (!division && level >= 9) {
    // Two-digit × two-digit (4.NBT.5); typed answer, judged on the givens.
    const g = randInt(11, 25);
    const s = randInt(11, 25);
    return { g, s, p: g * s };
  }
  if (!division && level >= 8) {
    // Two-digit × one-digit steps in one level earlier.
    const big = randInt(10, 99);
    const small = randInt(2, 9);
    const g = Math.random() < 0.5 ? big : small;
    const s = g === big ? small : big;
    return { g, s, p: g * s };
  }
  if (division && level >= 7) {
    // Division's legacy two-digit entry at the old gate.
    const big = randInt(10, 20);
    const small = randInt(2, 9);
    return { g: small, s: big, p: small * big };
  }
  const g = randInt(2, maxFactor);
  const s = randInt(2, maxFactor);
  return { g, s, p: g * s };
}

/** Quantities for a remainder structure: p = divisor × quotient + r, r ≥ 1. */
function remainderQuantities(level) {
  const divisor = randInt(3, 9);
  const quotient = level >= 9 ? randInt(10, 30) : randInt(3, 9);
  const r = randInt(1, divisor - 1);
  // Both g and s carry the divisor role a remainder structure reads; p is the total.
  return { g: divisor, s: divisor, p: divisor * quotient + r, r };
}

export function generateMultiplicativeItem(
  level,
  context = {},
  { pool = MULTIPLICATIVE_STRUCTURES, form = "auto" } = {}
) {
  const structure = selectStructure(pool, level, context, {
    noStory: context?.allowWordProblems === false,
    form,
  });
  const asStory = wantsStory(level, context, structure);
  const isDivision = pool.length > 0 && pool.every((st) => st.op === "/");
  const nums = structure.remainder
    ? remainderQuantities(level)
    : multiplicativeQuantities(level, { division: isDivision });
  const ctx = pickContext();
  const payload = buildMultiplicative(structure, nums, ctx, { asStory, form });

  return {
    ...payload,
    level,
    structure,
    itemFamily: deriveFamily({ asStory, promptText: payload.display.promptText }),
    asStory,
  };
}
