import { BUNDLED_ITEMS } from "./bundle.js";
import { REVIEW_STATUS } from "./applicationItems.js";

// Re-export REVIEW_STATUS so callers keep working without importing from the
// bundle directly.
export { REVIEW_STATUS };

export const ITEM_FAMILIES = {
  CONCEPTUAL: "conceptual",
  PROCEDURAL: "procedural",
  APPLICATION: "application",
};

const VALID_FAMILIES = new Set(Object.values(ITEM_FAMILIES));

// Level-band mapping mirrors src/modes/itemMetadata.js `levelToGradeBand` but
// is duplicated here so the item bank module has no inbound dep on the modes
// layer (keeps cloud hydration import-graph small).
export function levelToBand(level) {
  if (level <= 3) return "K-1";
  if (level <= 6) return "2-3";
  return "4-5";
}

export function levelRangeToBands(levelRange) {
  if (!Array.isArray(levelRange) || levelRange.length !== 2) return [];
  const [min, max] = levelRange;
  const bands = new Set();
  for (let level = min; level <= max; level++) bands.add(levelToBand(level));
  return [...bands];
}

export const LEVEL_BANDS = ["K-1", "2-3", "4-5"];

const REQUIRED_FIELDS = [
  "itemId",
  "modeId",
  "itemFamily",
  "subskill",
  "structureType",
  "levelRange",
  "reviewStatus",
  "question",
];

// Mutable in-memory cache. Initialized from the bundled snapshot so the app
// (and tests) work synchronously before any cloud hydration happens.
let currentBank = BUNDLED_ITEMS.slice();
let currentSource = "bundle";
const subscribers = new Set();

function notifySubscribers() {
  for (const cb of subscribers) {
    try {
      cb({ items: currentBank, source: currentSource });
    } catch {
      // subscribers should not break the bank
    }
  }
}

export function getBankItems() {
  return currentBank;
}

export function getBankSource() {
  return currentSource;
}

export function setBankItems(items, source = "cloud") {
  if (!Array.isArray(items)) return;
  currentBank = items.slice();
  currentSource = source;
  notifySubscribers();
}

export function resetBankToBundle() {
  currentBank = BUNDLED_ITEMS.slice();
  currentSource = "bundle";
  notifySubscribers();
}

export function subscribeBankChanges(callback) {
  if (typeof callback !== "function") return () => {};
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function isValidLevelRange(levelRange) {
  return (
    Array.isArray(levelRange) &&
    levelRange.length === 2 &&
    Number.isInteger(levelRange[0]) &&
    Number.isInteger(levelRange[1]) &&
    levelRange[0] >= 1 &&
    levelRange[1] >= levelRange[0]
  );
}

function validateApplicationDisplay(display, errors) {
  // Application items must carry a readable prompt because they are delivered
  // primarily as word problems.
  const promptText = display?.promptText;
  if (!promptText || typeof promptText !== "string" || !promptText.trim()) {
    errors.push("question.display.promptText is required for application items");
    return;
  }
  if (promptText.length > 220) {
    errors.push("question.display.promptText exceeds 220 characters");
  }
  if (promptText.includes("{") || promptText.includes("}")) {
    errors.push("question.display.promptText contains unresolved placeholders");
  }
}

const SUPPORTED_REPRESENTATIONS = new Set([
  "numberLine",
  "tenFrame",
  "array",
  "placeValueBlocks",
  "decomposition",
  "objectSet",
  "sequence",
  "symbolic",
  "verbalContext",
]);

function validateNonApplicationDisplay(itemFamily, display, errors) {
  // Conceptual and procedural items may be symbolic or use a representation.
  // Require at least one of: `promptText`, a supported `representation`, or a
  // structural shape (`sequence`, `tens`, `number`, `array`, etc.).
  if (!display || typeof display !== "object") {
    errors.push(`question.display is required for ${itemFamily} items`);
    return;
  }
  const hasPrompt = typeof display.promptText === "string" && display.promptText.trim().length > 0;
  const hasRepresentation =
    typeof display.representation === "string" && SUPPORTED_REPRESENTATIONS.has(display.representation);
  const hasStructuralShape =
    display.sequence != null ||
    display.number != null ||
    display.tens != null ||
    display.array != null ||
    display.count != null ||
    display.type != null;
  if (!hasPrompt && !hasRepresentation && !hasStructuralShape) {
    errors.push(
      `question.display for ${itemFamily} items must include promptText, representation, or a structural shape`
    );
  }
  if (hasPrompt && display.promptText.length > 220) {
    errors.push("question.display.promptText exceeds 220 characters");
  }
  if (hasPrompt && (display.promptText.includes("{") || display.promptText.includes("}"))) {
    errors.push("question.display.promptText contains unresolved placeholders");
  }
  if (display.representation && !hasRepresentation) {
    errors.push(`unsupported representation: ${display.representation}`);
  }
}

export function validateBankItem(item) {
  const errors = [];
  if (!item || typeof item !== "object") return { valid: false, errors: ["item must be an object"] };
  for (const key of REQUIRED_FIELDS) {
    if (item[key] == null || item[key] === "") errors.push(`missing required field: ${key}`);
  }
  if (item.itemFamily && !VALID_FAMILIES.has(item.itemFamily)) {
    errors.push(`invalid itemFamily: ${item.itemFamily}`);
  }
  if (item.reviewStatus && !Object.values(REVIEW_STATUS).includes(item.reviewStatus)) {
    errors.push(`invalid reviewStatus: ${item.reviewStatus}`);
  }
  if (item.levelRange && !isValidLevelRange(item.levelRange)) {
    errors.push("levelRange must be an [min,max] integer tuple with max>=min>=1");
  }
  if (item.question) {
    if (item.question.answer == null) errors.push("question.answer is required");
    const family = item.itemFamily;
    if (family === ITEM_FAMILIES.APPLICATION) {
      validateApplicationDisplay(item.question.display, errors);
    } else if (family === ITEM_FAMILIES.CONCEPTUAL || family === ITEM_FAMILIES.PROCEDURAL) {
      validateNonApplicationDisplay(family, item.question.display, errors);
    }
    // Numeric consistency check for arithmetic items that declare a/b/op.
    const { a, b, op, answer } = item.question;
    if (op && typeof answer === "number" && typeof a === "number" && typeof b === "number") {
      const expected = computeExpected(op, a, b);
      if (expected != null && expected !== answer) {
        errors.push(`numeric inconsistency: ${a} ${op} ${b} !== ${answer}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function computeExpected(op, a, b) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
    case "\u2212": // unicode minus
      return a - b;
    case "*":
    case "\u00d7":
      return a * b;
    case "/":
    case "\u00f7":
      return b === 0 ? null : a / b;
    default:
      return null;
  }
}

export function validateBank(items = currentBank) {
  const issues = [];
  const seenIds = new Set();
  const seenPrompts = new Map();
  for (const item of items) {
    const { valid, errors } = validateBankItem(item);
    if (!valid) issues.push({ itemId: item?.itemId || "unknown", errors });
    if (item?.itemId) {
      if (seenIds.has(item.itemId)) issues.push({ itemId: item.itemId, errors: ["duplicate itemId"] });
      seenIds.add(item.itemId);
    }
    const promptText = item?.question?.display?.promptText?.trim();
    if (promptText) {
      const dupOf = seenPrompts.get(promptText);
      if (dupOf) issues.push({ itemId: item.itemId, errors: [`duplicate promptText shared with ${dupOf}`] });
      else seenPrompts.set(promptText, item.itemId);
    }
  }
  return { valid: issues.length === 0, issues };
}

function inLevelRange(level, levelRange) {
  if (!Array.isArray(levelRange) || levelRange.length !== 2) return false;
  const [min, max] = levelRange;
  return level >= min && level <= max;
}

function randomPick(items, rng = Math.random) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const index = Math.floor(rng() * items.length);
  return items[index];
}

function filterApprovedCandidates({ modeId, level, family }) {
  return currentBank.filter(
    (item) =>
      item.modeId === modeId &&
      (!family || item.itemFamily === family) &&
      item.reviewStatus === REVIEW_STATUS.APPROVED &&
      inLevelRange(level, item.levelRange)
  );
}

/**
 * Select an approved bank item for the given mode, level, and family.
 *
 * Selection priority:
 *  1) Match modeId, family, level, and reviewStatus=approved.
 *  2) Prefer items matching targetSubskill.
 *  3) Prefer items not in `recentItemIds` (exposure cooldown).
 *  4) Random tiebreak from the highest-priority bucket.
 *
 * Returns null when no candidate exists for the (mode, family, level) bucket.
 */
export function selectApprovedBankItem({
  modeId,
  level,
  family = ITEM_FAMILIES.APPLICATION,
  targetSubskill,
  recentItemIds = [],
  rng = Math.random,
} = {}) {
  const approved = filterApprovedCandidates({ modeId, level, family });
  if (approved.length === 0) return null;

  const recentSet = new Set(recentItemIds);

  const bySubskill = targetSubskill
    ? approved.filter((item) => item.subskill === targetSubskill)
    : [];
  const subskillFresh = bySubskill.filter((item) => !recentSet.has(item.itemId));
  if (subskillFresh.length > 0) return randomPick(subskillFresh, rng);
  if (bySubskill.length > 0) return randomPick(bySubskill, rng);

  const fresh = approved.filter((item) => !recentSet.has(item.itemId));
  if (fresh.length > 0) return randomPick(fresh, rng);
  return randomPick(approved, rng);
}

/**
 * Back-compat wrapper. New code should use `selectApprovedBankItem` with an
 * explicit `family`.
 */
export function selectApprovedApplicationItem(args = {}) {
  return selectApprovedBankItem({ ...args, family: ITEM_FAMILIES.APPLICATION });
}

/**
 * Convert a bank item into a question payload compatible with the engine.
 * Carries provenance via metadataOverrides which is merged by the caller.
 */
export function buildQuestionFromBankItem(bankItem, level) {
  if (!bankItem || !bankItem.question) return null;
  return {
    ...bankItem.question,
    level,
    display: bankItem.question.display ? { ...bankItem.question.display } : undefined,
    metadataOverrides: {
      itemId: bankItem.itemId,
      itemSource: "bank",
      itemFamily: bankItem.itemFamily,
      reviewStatus: bankItem.reviewStatus,
      bankSubskill: bankItem.subskill,
      structureType: bankItem.structureType,
    },
  };
}

/**
 * Coverage counts keyed by one of three granularities:
 *  - "mode-subskill"       -> `${modeId}::${subskill}`        (legacy)
 *  - "mode-subskill-family"-> `${modeId}::${subskill}::${family}`
 *  - "cell"                -> `${modeId}::${subskill}::${family}::${band}`
 *
 * The "cell" granularity expands each item across every level band its
 * levelRange covers, so e.g. an item with levelRange [1,10] contributes to
 * all three bands. This matches how the item would be delivered in practice.
 */
export function getBankCoverage(granularity = "mode-subskill") {
  const counts = new Map();
  for (const item of currentBank) {
    if (item.reviewStatus !== REVIEW_STATUS.APPROVED) continue;
    if (granularity === "mode-subskill") {
      const key = `${item.modeId}::${item.subskill}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    } else if (granularity === "mode-subskill-family") {
      const key = `${item.modeId}::${item.subskill}::${item.itemFamily}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    } else if (granularity === "cell") {
      for (const band of levelRangeToBands(item.levelRange)) {
        const key = `${item.modeId}::${item.subskill}::${item.itemFamily}::${band}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  return counts;
}
