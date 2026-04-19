import { APPLICATION_ITEM_BANK as BUNDLED_ITEMS, REVIEW_STATUS } from "./applicationItems.js";

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

export function validateBankItem(item) {
  const errors = [];
  if (!item || typeof item !== "object") return { valid: false, errors: ["item must be an object"] };
  for (const key of REQUIRED_FIELDS) {
    if (item[key] == null || item[key] === "") errors.push(`missing required field: ${key}`);
  }
  if (item.reviewStatus && !Object.values(REVIEW_STATUS).includes(item.reviewStatus)) {
    errors.push(`invalid reviewStatus: ${item.reviewStatus}`);
  }
  if (item.levelRange && !isValidLevelRange(item.levelRange)) {
    errors.push("levelRange must be an [min,max] integer tuple with max>=min>=1");
  }
  if (item.question) {
    if (item.question.answer == null) errors.push("question.answer is required");
    const promptText = item.question.display?.promptText;
    if (!promptText || typeof promptText !== "string" || !promptText.trim()) {
      errors.push("question.display.promptText is required for application items");
    } else if (promptText.length > 220) {
      errors.push("question.display.promptText exceeds 220 characters");
    } else if (promptText.includes("{") || promptText.includes("}")) {
      errors.push("question.display.promptText contains unresolved placeholders");
    }
  }
  return { valid: errors.length === 0, errors };
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

function filterApprovedByModeLevel(modeId, level) {
  return currentBank.filter(
    (item) =>
      item.modeId === modeId &&
      item.itemFamily === "application" &&
      item.reviewStatus === REVIEW_STATUS.APPROVED &&
      inLevelRange(level, item.levelRange)
  );
}

/**
 * Select an approved application bank item.
 *
 * Selection priority:
 *  1) Match modeId, level, and reviewStatus=approved.
 *  2) Prefer items matching targetSubskill.
 *  3) Prefer items not in `recentItemIds` (exposure cooldown).
 *  4) Random tiebreak from the highest-priority bucket.
 *
 * Returns null when no candidate exists for the (mode, level) bucket.
 */
export function selectApprovedApplicationItem({
  modeId,
  level,
  targetSubskill,
  recentItemIds = [],
  rng = Math.random,
} = {}) {
  const approved = filterApprovedByModeLevel(modeId, level);
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
      reviewStatus: bankItem.reviewStatus,
      bankSubskill: bankItem.subskill,
      structureType: bankItem.structureType,
    },
  };
}

export function getBankCoverage() {
  const counts = new Map();
  for (const item of currentBank) {
    if (item.reviewStatus !== REVIEW_STATUS.APPROVED) continue;
    const key = `${item.modeId}::${item.subskill}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}
