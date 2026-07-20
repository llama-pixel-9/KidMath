import { BUNDLED_ITEMS } from "./bundle.js";
import { REVIEW_STATUS } from "./reviewStatus.js";
import { isVerbalPrompt } from "../modes/helpers.js";
import { levelToBand, levelRangeToBands, LEVEL_BANDS } from "../bands.js";

// Re-export REVIEW_STATUS so callers keep working without importing from the
// bundle directly.
export { REVIEW_STATUS };

export const ITEM_FAMILIES = {
  CONCEPTUAL: "conceptual",
  PROCEDURAL: "procedural",
  APPLICATION: "application",
};

const VALID_FAMILIES = new Set(Object.values(ITEM_FAMILIES));

// Level-band mapping is centralised in the dependency-free leaf src/bands.js so
// this module keeps no inbound edge to the modes layer (small cloud-hydration
// import graph). Imported (for internal use below) and re-exported so existing
// `from "./itemBank"` call sites are unchanged.
export { levelToBand, levelRangeToBands, LEVEL_BANDS };

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

/**
 * Merge items into the bank without discarding what is already loaded.
 *
 * `setBankItems` replaces wholesale, which is right for a full cloud refresh
 * but wrong for mode-scoped loading: fetching `fractions` must not evict the
 * `addition` items a child was just using. Existing items win on itemId so a
 * re-fetch is idempotent and cannot duplicate.
 *
 * Returns the number of genuinely new items added.
 */
export function addBankItems(items, source = "cloud") {
  if (!Array.isArray(items) || !items.length) return 0;
  const seen = new Set(currentBank.map((i) => i.itemId));
  const fresh = items.filter((i) => i?.itemId && !seen.has(i.itemId));
  if (!fresh.length) return 0;
  currentBank = currentBank.concat(fresh);
  currentSource = source;
  notifySubscribers();
  return fresh.length;
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

/**
 * Strip numbers, punctuation, and whitespace variation from a prompt so that
 * two prompts that differ only in their numeric values (e.g. "A jar has 8
 * marbles" vs "A jar has 12 marbles") normalize to the same signature.
 *
 * Used by the near-duplicate detector to catch template overuse at scale:
 * once we have hundreds of items per cell, two items with different numbers
 * but identical sentence structure are effectively the same item from the
 * learner's perspective.
 */
export function promptSignature(text) {
  if (typeof text !== "string" || !text.trim()) return "";
  return text
    .toLowerCase()
    .replace(/[\u00d7\u00f7\u2212]/g, " ") // unicode operators -> space
    .replace(/\d+/g, "#")
    .replace(/[^\w\s#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Default per-family caps for how many items may share a single prompt
// signature within one cell (mode x subskill x family). Procedural items
// use short symbolic prompts that are inherently templated ("# + # = ?"),
// so the cap there is effectively disabled.
export const DEFAULT_SIGNATURE_LIMITS = {
  application: 3,
  conceptual: 5,
  procedural: Infinity,
};

/**
 * Detect structural near-duplicates: items whose prompts share a signature
 * within the same (mode, subskill, family) cell beyond the family cap.
 *
 * Options:
 *   - limits: per-family override map, e.g. { application: 5 }
 *   - includeUnapproved: if true, also considers draft/reviewed items
 *
 * Returns an array of { cell, family, signature, count, itemIds }.
 */
export function findPromptOveruse(items = currentBank, options = {}) {
  const limits = { ...DEFAULT_SIGNATURE_LIMITS, ...(options.limits || {}) };
  const includeUnapproved = options.includeUnapproved === true;
  const buckets = new Map();
  for (const item of items) {
    if (!includeUnapproved && item.reviewStatus !== REVIEW_STATUS.APPROVED) continue;
    const sig = promptSignature(item?.question?.display?.promptText);
    if (!sig) continue;
    const cellKey = `${item.modeId}::${item.subskill}::${item.itemFamily}`;
    const bucketKey = `${cellKey}::${sig}`;
    const bucket =
      buckets.get(bucketKey) ||
      { cell: cellKey, family: item.itemFamily, signature: sig, itemIds: [] };
    bucket.itemIds.push(item.itemId);
    buckets.set(bucketKey, bucket);
  }
  return [...buckets.values()]
    .filter((b) => b.itemIds.length > (limits[b.family] ?? Infinity))
    .map((b) => ({ ...b, count: b.itemIds.length }));
}

export function validateBank(items = currentBank, options = {}) {
  const issues = [];
  const warnings = [];
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

  // Near-duplicate / template-overuse check. Emitted as warnings by default
  // so legacy bundles don't break; opt in to hard enforcement by passing
  // `rejectPromptOveruse: true`, which routes them through `issues` instead.
  const overuse = findPromptOveruse(items, { limits: options.signatureLimits });
  for (const row of overuse) {
    const message =
      `prompt template overused in ${row.cell}: ` +
      `"${row.signature}" appears ${row.count} times ` +
      `(limit ${DEFAULT_SIGNATURE_LIMITS[row.family]})`;
    if (options.rejectPromptOveruse) {
      issues.push({ itemId: row.itemIds.join(","), errors: [message] });
    } else {
      warnings.push({ itemId: row.itemIds.join(","), message });
    }
  }

  return { valid: issues.length === 0, issues, warnings };
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
  allowWordProblems = true,
} = {}) {
  let approved = filterApprovedCandidates({ modeId, level, family });
  if (allowWordProblems === false) {
    // Even though the scheduler routes APPLICATION away when word problems
    // are disabled, CONCEPTUAL and PROCEDURAL cells also ship items with
    // natural-language prompts ("Use near-doubles: 3 + 4 equals?"). Those
    // count as word problems from a learner's perspective, so filter them.
    approved = approved.filter(
      (item) => !isVerbalPrompt(item?.question?.display?.promptText)
    );
  }
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
