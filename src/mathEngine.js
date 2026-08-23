import { MODE_IDS, getModeConfig } from "./modes";
import { maxTotalForLevel } from "./modes/structures/levelPolicy";
import { shuffleArray, isVerbalPrompt } from "./modes/helpers";
import { buildItemKey, ITEM_FAMILIES } from "./modes/itemMetadata";
import { validateChoices, validateQuestion } from "./modes/itemQuality";
import { buildQuestionFromBankItem, selectApprovedBankItem } from "./itemBank/index.js";
import { fractionsEqual } from "./fractions.js";

export const SESSION_SIZE = 15;
export const MAX_LEVEL = 10;
export const STARTING_LEVEL = 1;
export const MODES = MODE_IDS;

export { shuffleArray };

const RETRY_SPACING = 5;
const REVIEW_INTERVALS = [4, 8, 16];
const MAX_REVIEW_ITEMS = 20;
const RECENT_BANK_WINDOW = 8;
// Level-1–3 cells are the smallest, and the kids there need fresh practice
// the most — a struggling kid saw "2 × 3 = ?" 126 times in 30 sessions when the
// window was 8 everywhere (kid-sim QA). Wider window low, the old window high.
const RECENT_BANK_WINDOW_LOW = 24;
const LOW_LEVEL_MAX = 3;
export function recentBankWindow(level) {
  return level <= LOW_LEVEL_MAX ? RECENT_BANK_WINDOW_LOW : RECENT_BANK_WINDOW;
}
// Ladder v2: the fast promotion path compares the kid to THEMSELVES (2.5× their
// own median response time) instead of an absolute 8.5 s, so a slow-but-right
// kid is not parked at level 1; demotion waits for the third miss.
const LADDER_V2_SPEED_RATIO = 2.5;
const LADDER_V2_MIN_SAMPLES = 5;
const LADDER_V2_MISSES_TO_DEMOTE = 3;
const MAX_BANK_ITEM_STATS = 200;

function clampLevel(level) {
  return Math.max(1, Math.min(MAX_LEVEL, level));
}

function createSkillMastery(modeConfig) {
  const skills = modeConfig.subskills || ["overall"];
  return Object.fromEntries(
    skills.map((skill) => [
      skill,
      { attempts: 0, correct: 0, streak: 0, mastery: 0, lastSeenAt: -1, lastCorrectAt: -1 },
    ])
  );
}

function getSkillMasteryRate(entry) {
  if (!entry || entry.attempts === 0) return 0.5;
  return entry.correct / entry.attempts;
}

function getWeakestSubskill(session, modeConfig) {
  const skills = modeConfig.subskills || Object.keys(session.skillMastery || {});
  if (skills.length === 0) return "overall";
  let weakest = skills[0];
  let weakestScore = Number.POSITIVE_INFINITY;
  for (const skill of skills) {
    const score = getSkillMasteryRate(session.skillMastery?.[skill]);
    if (score < weakestScore) {
      weakestScore = score;
      weakest = skill;
    }
  }
  return weakest;
}

function getMasterySnapshot(session, modeConfig) {
  // Level moves are judged over the subskills actually SERVED this session.
  // Unserved subskills default to 0.5, and not every subskill is generatable
  // at every level — counting them meant the weakest score could never reach
  // the 0.8 promotion gate, holding a kid at the level forever (money, time,
  // angles and five other modes were permanently capped at level 1).
  // Targeting deliberately still uses the full list (getWeakestSubskill), so
  // unserved subskills keep getting requested from the generator.
  const skills = (modeConfig.subskills || Object.keys(session.skillMastery || {})).filter(
    (skill) => (session.skillMastery?.[skill]?.attempts ?? 0) > 0
  );
  if (skills.length === 0) {
    return { weakestSubskill: getWeakestSubskill(session, modeConfig), weakestScore: 0.5 };
  }
  let weakestSubskill = skills[0];
  let weakestScore = Number.POSITIVE_INFINITY;
  for (const skill of skills) {
    const score = getSkillMasteryRate(session.skillMastery?.[skill]);
    if (score < weakestScore) {
      weakestScore = score;
      weakestSubskill = skill;
    }
  }
  return { weakestSubskill, weakestScore };
}

/** The n weakest subskills by observed rate — a Fledging Flight targets these. */
function weakestSubskillList(session, modeConfig, n = 3) {
  const skills = modeConfig.subskills || Object.keys(session.skillMastery || {});
  return [...skills]
    .sort(
      (a, b) =>
        getSkillMasteryRate(session.skillMastery?.[a]) - getSkillMasteryRate(session.skillMastery?.[b])
    )
    .slice(0, n);
}

function getNextFamily(session, modeConfig) {
  const families = modeConfig.families || Object.values(ITEM_FAMILIES);
  const cursor = session.familyCursor ?? 0;
  return { nextFamily: families[cursor % families.length], nextCursor: cursor + 1 };
}

function cloneQuestionForReview(question, dueAt) {
  return {
    ...question,
    // Choices are rebuilt fresh when the retry is served (new shuffle, new
    // distractors). Keep the originals as `reviewChoices`: non-numeric choice
    // answers ("2/3", "No", "18 cm") can't be rebuilt from the answer alone,
    // and regeneration throwing used to crash the session — with the poison
    // item persisted in the saved mistake bank.
    choices: undefined,
    reviewChoices:
      Array.isArray(question.choices) && question.choices.length >= 2
        ? question.choices
        : question.reviewChoices,
    dueAt,
    retryCount: (question.retryCount || 0) + 1,
    itemKey: question.itemKey || buildItemKey(question),
    mode: question.mode,
  };
}

function updateSkillMastery(session, question, correct) {
  const subskill = question.metadata?.subskill || "overall";
  const current = session.skillMastery[subskill] || {
    attempts: 0,
    correct: 0,
    streak: 0,
    mastery: 0,
    lastSeenAt: -1,
    lastCorrectAt: -1,
  };
  const attempts = current.attempts + 1;
  const hit = current.correct + (correct ? 1 : 0);
  const mastery = hit / attempts;
  return {
    ...session.skillMastery,
    [subskill]: {
      attempts,
      correct: hit,
      streak: correct ? current.streak + 1 : 0,
      mastery,
      lastSeenAt: session.questionsAnswered,
      lastCorrectAt: correct ? session.questionsAnswered : current.lastCorrectAt,
    },
  };
}

function logAnalyticsEvent(session, payload) {
  return [...(session.analyticsEvents || []), payload].slice(-200);
}

// Module-level observability: increments whenever a bank-eligible item is
// requested, broken down by family. Exposed for analytics/sampling tools so
// we can monitor the itemSource=bank vs itemSource=generated rate over time.
//
// Top-level keys (`applicationRequested`, `bankServed`, `fallbackToGenerated`)
// are kept for back-compat with the pre-Phase-0 observer contract. Per-family
// substats live under `byFamily`.
function emptyFamilyStats() {
  return { requested: 0, bankServed: 0, fallbackToGenerated: 0 };
}

const bankFallbackStats = {
  applicationRequested: 0,
  bankServed: 0,
  fallbackToGenerated: 0,
  byFamily: {
    [ITEM_FAMILIES.APPLICATION]: emptyFamilyStats(),
    [ITEM_FAMILIES.CONCEPTUAL]: emptyFamilyStats(),
    [ITEM_FAMILIES.PROCEDURAL]: emptyFamilyStats(),
  },
};
const warnedFallbackKeys = new Set();

function recordBankStat(family, event) {
  const family_ = bankFallbackStats.byFamily[family];
  if (family_) family_[event] = (family_[event] || 0) + 1;
  if (event === "requested" && family === ITEM_FAMILIES.APPLICATION) {
    bankFallbackStats.applicationRequested += 1;
  }
  if (event === "bankServed") bankFallbackStats.bankServed += 1;
  if (event === "fallbackToGenerated") bankFallbackStats.fallbackToGenerated += 1;
}

export function getBankFallbackStats() {
  return {
    applicationRequested: bankFallbackStats.applicationRequested,
    bankServed: bankFallbackStats.bankServed,
    fallbackToGenerated: bankFallbackStats.fallbackToGenerated,
    byFamily: {
      [ITEM_FAMILIES.APPLICATION]: { ...bankFallbackStats.byFamily[ITEM_FAMILIES.APPLICATION] },
      [ITEM_FAMILIES.CONCEPTUAL]: { ...bankFallbackStats.byFamily[ITEM_FAMILIES.CONCEPTUAL] },
      [ITEM_FAMILIES.PROCEDURAL]: { ...bankFallbackStats.byFamily[ITEM_FAMILIES.PROCEDURAL] },
    },
  };
}

export function resetBankFallbackStats() {
  bankFallbackStats.applicationRequested = 0;
  bankFallbackStats.bankServed = 0;
  bankFallbackStats.fallbackToGenerated = 0;
  for (const family of Object.values(ITEM_FAMILIES)) {
    bankFallbackStats.byFamily[family] = emptyFamilyStats();
  }
  warnedFallbackKeys.clear();
}

export function generateQuestion(mode, level, context = null) {
  const config = getModeConfig(mode);
  const targetLevel = clampLevel(level);
  const q = config.generate(targetLevel, context || undefined);
  const generatedFamily = q.metadata?.itemFamily;
  const isApplication = generatedFamily === ITEM_FAMILIES.APPLICATION;
  const allowWordProblems = context?.allowWordProblems ?? true;
  const requireBankForApplication = context?.requireBankForApplication === true;
  const requireBank = context?.requireBank === true || requireBankForApplication;
  // `consultBankFamilies` controls which families attempt a bank lookup before
  // accepting the dynamically generated question. Defaults to all three so
  // newly-authored conceptual/procedural items reach learners as soon as they
  // exist; cells with no approved items return null from the selector and the
  // engine falls back to the dynamic generator (same behavior as today for
  // any unauthored cell).
  const consultBankFamilies = new Set(
    context?.consultBankFamilies || [
      ITEM_FAMILIES.APPLICATION,
      ITEM_FAMILIES.PROCEDURAL,
      ITEM_FAMILIES.CONCEPTUAL,
    ]
  );
  const eligibleForBank =
    consultBankFamilies.has(generatedFamily) &&
    (generatedFamily !== ITEM_FAMILIES.APPLICATION || allowWordProblems);

  let bankQuestion = null;
  if (eligibleForBank) {
    recordBankStat(generatedFamily, "requested");
    const bankItem = selectApprovedBankItem({
      modeId: mode,
      level: targetLevel,
      family: generatedFamily,
      targetSubskill: context?.targetSubskill || q.metadata?.subskill,
      recentItemIds: context?.recentBankItemIds || [],
      allowWordProblems,
    });
    bankQuestion = buildQuestionFromBankItem(bankItem, targetLevel);
    if (bankQuestion) {
      recordBankStat(generatedFamily, "bankServed");
    } else {
      recordBankStat(generatedFamily, "fallbackToGenerated");
      if (requireBankForApplication && isApplication) {
        throw new Error(
          `Bank-required application item missing for mode=${mode} level=${targetLevel} subskill=${context?.targetSubskill || q.metadata?.subskill}`
        );
      }
      if (requireBank) {
        throw new Error(
          `Bank-required ${generatedFamily} item missing for mode=${mode} level=${targetLevel} subskill=${context?.targetSubskill || q.metadata?.subskill}`
        );
      }
      const subskill = context?.targetSubskill || q.metadata?.subskill;
      const warnKey = `${generatedFamily}::${mode}::${targetLevel}::${subskill}`;
      if (!warnedFallbackKeys.has(warnKey)) {
        warnedFallbackKeys.add(warnKey);
        console.warn(
          `[itemBank] No approved ${generatedFamily} item for mode=${mode} level=${targetLevel} subskill=${subskill}; falling back to generated.`
        );
      }
    }
  }
  return finalizeQuestion(mode, bankQuestion, q);
}

/** Fold a bank payload (or the generated question when there is none) into
 * the render-ready shape: mode stamped, metadata flattened, itemKey, validated. */
function finalizeQuestion(mode, bankQuestion, q) {
  const bankMetadata = bankQuestion?.metadataOverrides || null;
  const bankPayload = bankQuestion ? { ...bankQuestion } : null;
  if (bankPayload) delete bankPayload.metadataOverrides;
  const effectiveQuestion = bankQuestion
    ? {
        ...bankPayload,
        mode,
        metadata: {
          ...(q.metadata || {}),
          subskill: bankMetadata?.bankSubskill || q.metadata?.subskill,
          itemId: bankMetadata?.itemId,
          itemSource: bankMetadata?.itemSource,
          reviewStatus: bankMetadata?.reviewStatus,
          structureType: bankMetadata?.structureType || q.metadata?.structureType || null,
        },
      }
    : q;
  effectiveQuestion.mode = mode;
  effectiveQuestion.metadata = effectiveQuestion.metadata || {};
  effectiveQuestion.metadata.modeId = effectiveQuestion.metadata.modeId || mode;
  effectiveQuestion.itemKey = effectiveQuestion.itemKey || buildItemKey(effectiveQuestion);
  const quality = validateQuestion(effectiveQuestion);
  if (!quality.valid) {
    throw new Error(`Invalid question for mode ${mode}: ${quality.errors.join("; ")}`);
  }
  return effectiveQuestion;
}

/**
 * One specific bank item, render-ready — exactly what a kid would see if the
 * selector served it: same merge as generateQuestion, choices attached. Used
 * by the admin preview pane and the `/play/<mode>?item=<id>` pin; any status
 * is accepted (reviewers preview drafts), unlike the session selector.
 */
export function buildBankQuestion(bankItem, level = null) {
  const mode = bankItem.modeId;
  const targetLevel = clampLevel(level ?? bankItem.levelRange?.[0] ?? 1);
  const bankQuestion = buildQuestionFromBankItem(bankItem, targetLevel);
  // The generator's question supplies the full metadata scaffold (gradeBand,
  // domain, practices...) exactly as it does on the session path.
  const scaffold = getModeConfig(mode).generate(targetLevel);
  const question = finalizeQuestion(mode, bankQuestion, scaffold);
  if (questionAnswerType(question) === "choice") {
    question.choices = generateChoices(question.answer, 4, question);
  }
  return question;
}

export function generateChoices(answer, count = 4, question = null) {
  // A generator may supply its own option set. Format transforms depend on
  // this: true/false, odd-one-out and missing-operator items have a fixed set
  // of options that numeric distractors would make nonsense of.
  if (Array.isArray(question?.choices) && question.choices.length >= 2) {
    return question.choices;
  }
  if (question?.mode) {
    try {
      const config = getModeConfig(question.mode);
      if (config.generateChoices) {
        const customChoices = config.generateChoices(answer, question);
        const validation = validateChoices(question, customChoices);
        if (!validation.valid) throw new Error(validation.errors.join("; "));
        return customChoices;
      }
    } catch {
      // fall through to default
    }
  }

  const choices = new Set([answer]);
  const spread = Math.max(3, Math.ceil(Math.abs(answer) * 0.3));

  let attempts = 0;
  while (choices.size < count && attempts < 128) {
    attempts++;
    const offset = (Math.floor(Math.random() * spread) + 1) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + offset;
    if (candidate >= 0 && candidate !== answer) choices.add(candidate);
  }
  let fillerOffset = 1;
  while (choices.size < count && fillerOffset < 256) {
    const candidate = answer + fillerOffset;
    if (candidate >= 0 && candidate !== answer) choices.add(candidate);
    fillerOffset++;
  }
  fillerOffset = 1;
  while (choices.size < count && fillerOffset < 256) {
    const candidate = answer - fillerOffset;
    if (candidate >= 0 && candidate !== answer) choices.add(candidate);
    fillerOffset++;
  }

  const finalChoices = shuffleArray([...choices]);
  const validation = validateChoices(question || { answer }, finalChoices);
  if (!validation.valid) {
    throw new Error(`Invalid choices: ${validation.errors.join("; ")}`);
  }
  return finalChoices;
}

// A question with no explicit answerType is a multiple-choice ("choice")
// question — the historical default. Only "choice" questions carry `choices`.
export function questionAnswerType(question) {
  return question?.answerType ?? "choice";
}

/**
 * Set equality for multi-answer items (implementation plan M2).
 *
 * Some structures genuinely have more than one correct answer — Both Addends
 * Unknown ("how many in the red vase and how many in the blue?"), "show three
 * ways to make 8", "pick every expression equal to 12". Judging those against a
 * single `answer` was impossible, which is why those varieties could not ship.
 *
 * `question.answer` is an array of the values that must ALL be selected. Order
 * is irrelevant; duplicates are ignored; a superset is wrong (selecting
 * everything must not score as correct).
 */
function setEquals(submitted, answer) {
  if (!Array.isArray(answer)) return false;
  const submittedList = Array.isArray(submitted) ? submitted : [submitted];
  if (submittedList.some((v) => v === null || v === undefined)) return false;

  const want = new Set(answer.map((v) => String(v)));
  const got = new Set(submittedList.map((v) => String(v)));
  if (want.size !== got.size) return false;
  for (const v of want) if (!got.has(v)) return false;
  return true;
}

/**
 * Answer sets where several distinct selections are each acceptable — e.g.
 * decomposing 5 as 1+4 OR 2+3. `question.answer` is an array of arrays; the
 * submission must match any one of them.
 */
function anySetEquals(submitted, answer) {
  if (!Array.isArray(answer)) return false;
  if (!answer.some(Array.isArray)) return setEquals(submitted, answer);
  return answer.some((option) => setEquals(submitted, option));
}

function numericEquals(submitted, answer, epsilon = 0) {
  if (submitted === null || submitted === undefined || submitted === "") return false;
  const s = Number(submitted);
  const a = Number(answer);
  if (!Number.isFinite(s) || !Number.isFinite(a)) return false;
  return epsilon > 0 ? Math.abs(s - a) < epsilon : s === a;
}

// Type-aware correctness check. This is the single scoring authority: every
// answer format is judged here, and recordAnswer routes through it. The default
// "choice" branch is byte-for-byte the historical `submitted === question.answer`
// so existing multiple-choice behavior is unchanged.
export function checkAnswer(question, submitted) {
  switch (questionAnswerType(question)) {
    // Typed integer entry: a plain number pad, a number pad bound to a blank in
    // an equation (fillBlank), or the missing part of a number bond. All judge
    // by numeric value.
    case "numberPad":
    case "fillBlank":
    case "numberBond":
    case "barModel":
    case "placeValueDiscs":
    case "fractionSet":
    case "clock":
    case "barGraph":
    case "angle":
    case "numberLine":
    case "shapeFigure":
    case "coinTray":
    case "tenFrame":
      return numericEquals(submitted, question.answer);
    // Multi-answer items: every required value must be selected and nothing
    // extra. `answer` may be a list of values, or a list of acceptable lists
    // when several different selections are each correct.
    case "multiSelect":
      return anySetEquals(submitted, question.answer);
    // Decimal entry (tenths/hundredths): numeric with a small tolerance so
    // 0.5 == .50 and float noise never fails a correct answer.
    case "decimal":
      return numericEquals(submitted, question.answer, 1e-9);
    // Fraction entry: value equivalence (3/4 == 6/8), accepting {num,den} or
    // an "a/b" string on either side.
    case "fraction":
      return fractionsEqual(submitted, question.answer);
    // Symbol picker (<, >, =) and multiple choice both judge by strict equality
    // of the selected value against the answer.
    case "symbolSelect":
    case "choice":
    default:
      return submitted === question.answer;
  }
}

// --- Adaptive Session Engine ---

// Saved-progress access is INJECTED, not imported, so the engine core stays
// free of browser/network code (progressStore -> supabaseClient -> import.meta).
// The web app wires the real loader at startup via setProgressLoader; a native
// host (JavaScriptCore) injects `options.savedProgress` instead. Default is a
// blank slate so the engine is fully usable with neither.
const DEFAULT_PROGRESS = Object.freeze({
  level: 1,
  mistakeBank: [],
  totalSessions: 0,
  lifetimeStars: 0,
  bankItemStats: {},
  recentBankItemIds: [],
});

let progressLoader = () => ({ ...DEFAULT_PROGRESS });

/** Wire a saved-progress source (web: loadProgressSync). Falls back to blank. */
export function setProgressLoader(fn) {
  progressLoader = typeof fn === "function" ? fn : () => ({ ...DEFAULT_PROGRESS });
}

export function createAdaptiveSession(mode, sessionSize = SESSION_SIZE, options = {}) {
  const saved = options.savedProgress ?? progressLoader(mode);
  const modeConfig = getModeConfig(mode);
  const allowWordProblems = options.allowWordProblems ?? false;
  return {
    mode,
    level: saved.level,
    // §03 fledging: when true, promotion signals nominate instead of changing
    // the level, and mid-session demotion is off. challengeSubskills marks a
    // Fledging Flight itself: a short set at fixed level rotating through the
    // nominating flight's weakest subskills.
    fledging: Boolean(options.fledging),
    challengeSubskills:
      Array.isArray(options.challengeSubskills) && options.challengeSubskills.length
        ? options.challengeSubskills.slice()
        : undefined,
    questionsAnswered: 0,
    firstTryCorrect: 0,
    retriesMastered: 0,
    correctStreak: 0,
    mistakesAtLevel: 0,
    mistakeBank: (saved.mistakeBank || []).slice(-MAX_REVIEW_ITEMS),
    responseTimesMs: [],
    sessionSize,
    questionsSinceRetry: 0,
    familyCursor: 0,
    skillMastery: createSkillMastery(modeConfig),
    analyticsEvents: [],
    allowWordProblems,
    recentBankItemIds: Array.isArray(saved.recentBankItemIds) ? saved.recentBankItemIds.slice(-recentBankWindow(Number(saved.level) || STARTING_LEVEL)) : [],
    // Ladder v2 keeps every response time this session for the kid's own median.
    ...(options.ladderV2 ? { ladderV2: true, allResponseTimesMs: [] } : {}),
    bankItemStats: saved.bankItemStats && typeof saved.bankItemStats === "object" ? saved.bankItemStats : {},
    // QA-only: force one generator variety and skip the bank, so a reported
    // item shape can be reproduced deterministically (`?qaVariety=` on web).
    ...(options.qaVariety ? { qaVariety: options.qaVariety } : {}),
  };
}

export function getNextQuestion(session) {
  const suppressWordProblems = session.allowWordProblems === false;
  const dueReview = session.mistakeBank.find(
    (q) =>
      (q.dueAt ?? RETRY_SPACING) <= session.questionsAnswered &&
      !(
        suppressWordProblems &&
        (q.metadata?.itemFamily === ITEM_FAMILIES.APPLICATION ||
          isVerbalPrompt(q.display?.promptText))
      )
  );
  if (dueReview && session.questionsSinceRetry >= RETRY_SPACING) {
    const retryQ = { ...dueReview, mode: dueReview.mode || session.mode };
    retryQ.itemKey = retryQ.itemKey || buildItemKey(retryQ);
    if (questionAnswerType(retryQ) === "choice") {
      try {
        retryQ.choices = generateChoices(retryQ.answer, 4, retryQ);
      } catch {
        // Regeneration can't rebuild options around a non-numeric answer.
        // Reshuffle the originals saved at mistake time instead of crashing.
        retryQ.choices =
          Array.isArray(retryQ.reviewChoices) && retryQ.reviewChoices.length >= 2
            ? shuffleArray([...retryQ.reviewChoices])
            : null;
      }
    }
    if (questionAnswerType(retryQ) !== "choice" || retryQ.choices) {
      return { question: retryQ, isRetry: true };
    }
    // Legacy poison entry (persisted before reviewChoices existed): options
    // can't be rebuilt at all — fall through and serve a fresh question.
  }

  const modeConfig = getModeConfig(session.mode);
  const { nextFamily, nextCursor } = getNextFamily(session, modeConfig);
  const scheduledFamily =
    session.allowWordProblems === false && nextFamily === ITEM_FAMILIES.APPLICATION
      ? ITEM_FAMILIES.PROCEDURAL
      : nextFamily;
  const targetSubskill = session.challengeSubskills?.length
    ? session.challengeSubskills[session.questionsAnswered % session.challengeSubskills.length]
    : getWeakestSubskill(session, modeConfig);
  const q = generateQuestion(session.mode, session.level, {
    itemFamily: scheduledFamily,
    targetSubskill,
    allowWordProblems: session.allowWordProblems !== false,
    recentBankItemIds: session.recentBankItemIds || [],
    ...(session.qaVariety ? { varietyId: session.qaVariety, consultBankFamilies: [] } : {}),
  });
  q.scheduler = { targetSubskill, itemFamily: scheduledFamily };
  q.nextFamilyCursor = nextCursor;
  if (questionAnswerType(q) === "choice") {
    q.choices = generateChoices(q.answer, 4, q);
  }
  return { question: q, isRetry: false };
}

function updateBankItemStats(session, question, correct, responseTimeMs) {
  const itemId = question.metadata?.itemId;
  if (!itemId || question.metadata?.itemSource !== "bank") return session.bankItemStats || {};
  const current = session.bankItemStats?.[itemId] || {
    attempts: 0,
    firstTryCorrect: 0,
    correct: 0,
    totalResponseMs: 0,
    lastSeenAt: -1,
  };
  const next = {
    attempts: current.attempts + 1,
    firstTryCorrect: current.firstTryCorrect + (correct && current.attempts === 0 ? 1 : 0),
    correct: current.correct + (correct ? 1 : 0),
    totalResponseMs: current.totalResponseMs + (responseTimeMs || 0),
    lastSeenAt: session.questionsAnswered,
  };
  const merged = { ...(session.bankItemStats || {}), [itemId]: next };
  const keys = Object.keys(merged);
  if (keys.length <= MAX_BANK_ITEM_STATS) return merged;
  // Drop the least-recently seen items to bound size.
  const sorted = keys
    .map((id) => [id, merged[id].lastSeenAt ?? -1])
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_BANK_ITEM_STATS);
  return Object.fromEntries(sorted.map(([id]) => [id, merged[id]]));
}

function appendRecentBankItemId(recent, itemId, level = MAX_LEVEL) {
  if (!itemId) return recent;
  const next = [...(recent || []).filter((id) => id !== itemId), itemId];
  return next.slice(-recentBankWindow(level));
}

function weakestScoreWithEvidence(session, minAttempts) {
  let weakest = 1;
  for (const m of Object.values(session.skillMastery || {})) {
    if (!m || (m.attempts || 0) < minAttempts) continue;
    weakest = Math.min(weakest, m.correct / m.attempts);
  }
  return weakest;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function recordAnswer(session, question, chosenAnswer, responseTimeMs, wasRetry) {
  const correct = checkAnswer(question, chosenAnswer);
  const next = { ...session };
  next.skillMastery = updateSkillMastery(session, question, correct);
  next.analyticsEvents = logAnalyticsEvent(session, {
    mode: session.mode,
    level: session.level,
    wasRetry,
    correct,
    responseTimeMs,
    itemId: question.metadata?.itemId || null,
    itemSource: question.metadata?.itemSource || "generated",
    itemFamily: question.metadata?.itemFamily || "unknown",
    subskill: question.metadata?.subskill || "unknown",
  });

  if (wasRetry) {
    next.questionsSinceRetry = 0;
    next.bankItemStats = updateBankItemStats(session, question, correct, responseTimeMs);

    if (correct) {
      next.correctStreak = session.correctStreak + 1;
      next.retriesMastered = session.retriesMastered + 1;
      next.mistakeBank = session.mistakeBank.filter((q) => q.itemKey !== question.itemKey);
    } else {
      next.correctStreak = 0;
      // v2: a missed retry is evidence at this level too.
      if (session.ladderV2) next.mistakesAtLevel = session.mistakesAtLevel + 1;
      next.mistakeBank = session.mistakeBank.map((q) => {
        if (q.itemKey !== question.itemKey) return q;
        const index = Math.min(REVIEW_INTERVALS.length - 1, q.retryCount || 0);
        return cloneQuestionForReview(q, next.questionsAnswered + REVIEW_INTERVALS[index]);
      });
    }

    return { session: next, correct, levelChanged: false, newLevel: next.level };
  }

  // --- New (non-retry) question ---
  next.questionsAnswered = session.questionsAnswered + 1;
  next.questionsSinceRetry = session.questionsSinceRetry + 1;
  if (question.nextFamilyCursor != null) next.familyCursor = question.nextFamilyCursor;
  next.bankItemStats = updateBankItemStats(session, question, correct, responseTimeMs);
  next.recentBankItemIds = appendRecentBankItemId(
    session.recentBankItemIds,
    question.metadata?.itemSource === "bank" ? question.metadata?.itemId : null,
    session.level
  );
  if (session.ladderV2) next.allResponseTimesMs = [...(session.allResponseTimesMs || []), responseTimeMs];

  if (correct) {
    next.correctStreak = session.correctStreak + 1;
    next.firstTryCorrect = session.firstTryCorrect + 1;
    next.responseTimesMs = [...session.responseTimesMs.slice(-4), responseTimeMs];

    let levelChanged = false;
    const avgTime = next.responseTimesMs.reduce((a, b) => a + b, 0) / next.responseTimesMs.length;
    const { weakestScore } = getMasterySnapshot(next, getModeConfig(session.mode));
    // v1: an absolute 8.5 s gate. v2: relative to the kid's own median this
    // session (no gate until there are enough samples to have one).
    const all = next.allResponseTimesMs || [];
    const quickEnough = session.ladderV2
      ? all.length < LADDER_V2_MIN_SAMPLES || avgTime <= LADDER_V2_SPEED_RATIO * median(all)
      : avgTime < 8500;
    const promotionSignal =
      (next.correctStreak >= 4 && quickEnough && weakestScore >= 0.8) ||
      (next.correctStreak >= 7 && weakestScore >= 0.72);

    if (session.fledging) {
      // §03: the signal nominates — nothing interrupts the round, the level
      // holds, and the Fledging Flight is offered at the next take-off. A
      // challenge set never nominates (it IS the test).
      if (promotionSignal && !next.challengeSubskills && !next.nominated && next.level < MAX_LEVEL) {
        next.nominated = true;
        next.nominationWeakSubskills = weakestSubskillList(next, getModeConfig(session.mode));
      }
      return { session: next, correct: true, levelChanged: false, newLevel: next.level };
    }

    if (promotionSignal && next.level < MAX_LEVEL) {
      next.level = next.level + 1;
      next.correctStreak = 0;
      next.mistakesAtLevel = 0;
      levelChanged = true;
    }

    return { session: next, correct: true, levelChanged, newLevel: next.level };
  }

  // Incorrect on a new question
  next.correctStreak = 0;
  next.mistakesAtLevel = session.mistakesAtLevel + 1;

  const alreadyInBank = session.mistakeBank.some((q) => q.itemKey === question.itemKey);
  if (!alreadyInBank) {
    next.mistakeBank = [
      ...session.mistakeBank,
      cloneQuestionForReview(question, next.questionsAnswered + RETRY_SPACING),
    ].slice(-MAX_REVIEW_ITEMS);
  }

  // §03: mid-session demotion is off under fledging — two consecutive rough
  // flights glide a kid down instead (engagement/fledging.js).
  let levelChanged = false;
  if (!session.fledging) {
    const { weakestScore } = getMasterySnapshot(next, getModeConfig(session.mode));
    const missesToDemote = session.ladderV2 ? LADDER_V2_MISSES_TO_DEMOTE : 2;
    // v2: the mastery floor needs evidence — one miss on a just-served
    // subskill is 0/1 and used to demote on its own.
    const floorScore = session.ladderV2 ? weakestScoreWithEvidence(next, LADDER_V2_MIN_SAMPLES - 2) : weakestScore;
    if ((next.mistakesAtLevel >= missesToDemote || floorScore < 0.45) && next.level > 1) {
      next.level = next.level - 1;
      next.mistakesAtLevel = 0;
      levelChanged = true;
    }
  }

  return { session: next, correct: false, levelChanged, newLevel: next.level };
}

export function isSessionComplete(session) {
  return session.questionsAnswered >= session.sessionSize;
}

// --- Flight payout (gamification spec §01, "The economy") ---
//
// Four payouts, settled once at the end card. Precision is the bulk — one star
// per first-try correct — so a kid who answers ten questions carefully
// out-earns a kid who rushes twenty. All numbers are playtest-tunable; the
// invariant to protect is that accuracy dominates volume and altitude.

export const LANDING_BONUS = 2;
// Altitude by band: Fledgling (1–3) +0 · Flier (4–6) +2 · Skymaster (7–10) +4.
export const ALTITUDE_BONUS = [0, 2, 4];
export const CIRCLE_BACK_CAP = 2;

export function levelBandIndex(level) {
  return level >= 7 ? 2 : level >= 4 ? 1 : 0;
}

/**
 * Pure settlement for a flight. An unfinished flight pays nothing at all
 * (mistake-bank writes still happen through recordAnswer) — callers settle
 * only when isSessionComplete, but the rule is encoded here too.
 */
export function summarizeFlight(session) {
  const finished = session.questionsAnswered >= session.sessionSize;
  const landing = finished ? LANDING_BONUS : 0;
  const precision = finished ? session.firstTryCorrect ?? 0 : 0;
  const altitude = finished ? ALTITUDE_BONUS[levelBandIndex(session.level)] : 0;
  const circleBack = finished ? Math.min(session.retriesMastered ?? 0, CIRCLE_BACK_CAP) : 0;
  return {
    finished,
    landing,
    precision,
    altitude,
    circleBack,
    total: landing + precision + altitude + circleBack,
    level: session.level,
    bandIndex: levelBandIndex(session.level),
    questions: session.questionsAnswered,
    firstTryCorrect: session.firstTryCorrect ?? 0,
    retriesMastered: session.retriesMastered ?? 0,
  };
}

// --- Worksheet generation (fixed level, batch) ---

export function generateWorksheetSet(mode, level, size = SESSION_SIZE, options = {}) {
  const questions = [];
  const context = {
    allowWordProblems: options.allowWordProblems ?? false,
  };
  for (let i = 0; i < size; i++) {
    const q = generateQuestion(mode, level, context);
    if (questionAnswerType(q) === "choice") {
      q.choices = generateChoices(q.answer, 4, q);
    }
    questions.push(q);
  }
  return questions;
}

// --- Flight logs (§15): eleven items in three fixed blocks ---
//
// A flight log is one printed sheet: Part A (6 stacked computations),
// Part B (4 inline computations), Part C (one thought problem). The blocks
// never interleave, and the generator — not the layout — is responsible for
// the sheet being printable: operands inside the level range, the result slot
// always the blank, no duplicate items or wording, at most one zero-fact.

// Budgets are sized to FILL one US Letter page — not spill onto a second and
// not strand half a page of white (#34 both ways). The print e2e renders the
// real PDF and pins every sheet to exactly one page.
export const FLIGHT_LOG_PART_A = 12;
export const FLIGHT_LOG_PART_B = 6;
export const FLIGHT_LOG_ITEMS = FLIGHT_LOG_PART_A + FLIGHT_LOG_PART_B + 1;
// Prompt items run two to three lines where a stacked sum runs one, so the
// prompt modes get a smaller budget.
export const FLIGHT_LOG_PROMPT_PART_A = 6;
export const FLIGHT_LOG_PROMPT_PART_B = 6;
// Figure sheets budget lower still: a bar chart is ~15 text lines tall, and
// eight of them cannot share one page (measured by the print e2e).
export const FLIGHT_LOG_FIGURE_PART_A = 2;
export const FLIGHT_LOG_FIGURE_PART_B = 2;
const FIGURE_MODES = new Set(["dataGraphs", "volumeCoordinates"]);

const ARITH_OPS = { "+": (a, b) => a + b, "-": (a, b) => a - b, "x": (a, b) => a * b, "/": (a, b) => a / b };

function isPureComputation(q) {
  const fn = ARITH_OPS[q.op];
  if (!fn) return false;
  if (typeof q.a !== "number" || typeof q.b !== "number" || typeof q.answer !== "number") return false;
  // The blank must be the result slot. A question whose answer is not a op b
  // (missing addend, true/false, error analysis…) prints as a filled result
  // with an empty blank — the "3 + 1 = 5 ___" fault.
  if (fn(q.a, q.b) !== q.answer) return false;
  if (!Number.isInteger(q.answer) || q.answer < 0) return false;
  return true;
}

// Level range: the additive ceiling is the level policy's total ceiling.
// Multiplicative modes size their own factors, so only the computed result is
// sanity-checked; an additive operand above the ceiling is a bug, not stretch.
function withinLevelRange(q, level) {
  const cap = maxTotalForLevel(level);
  if (q.op === "+" || q.op === "-") {
    return q.a <= cap && q.b <= cap && q.answer <= cap;
  }
  return true;
}

// Identity/zero facts (n + 0, n − 0, n × 1, n ÷ 1…) are capped at one per
// sheet; a page of them teaches nothing.
function isTrivialFact(q) {
  if (q.op === "+" || q.op === "-") return q.a === 0 || q.b === 0;
  if (q.op === "x") return q.a <= 1 || q.b <= 1;
  if (q.op === "/") return q.b === 1 || q.answer === 0;
  return false;
}

// Duplicate key: commutative ops treat 4+3 and 3+4 as the same item.
function computationKey(q) {
  const pair = q.op === "+" || q.op === "x" ? [q.a, q.b].sort((x, y) => x - y) : [q.a, q.b];
  return `${q.op}:${pair.join(",")}`;
}

function normalizedPrompt(q) {
  const text = q.display?.promptText;
  return typeof text === "string" ? text.trim().toLowerCase() : null;
}

// --- Print-safe wording (#34) ----------------------------------------------
// Screen verbs don't survive paper: "Tap the number that is 9 hundreds" makes
// no sense on a sheet a child answers with a pencil. Every drawn flight-log
// question is reworded BEFORE dedupe keying, so the printed prompt is also the
// deduped prompt.
const PRINT_REWORDS = [
  [/\btap where you land\b/gi, "what number do you land on?"],
  [/\. what number do you land on\?\.?$/i, ". What number do you land on?"],
  [/\bTap the\b/g, "Write the"],
  [/\btap the\b/g, "write the"],
  [/\bTap\b/g, "Write"],
  [/\btap\b/g, "write"],
];
const SCREEN_VERBS = /\b(tap|press|drag|swipe|click|touch)\b/i;

function printableWording(q) {
  const text = q.display?.promptText;
  if (typeof text !== "string" || !SCREEN_VERBS.test(text)) return q;
  let out = text;
  for (const [re, rep] of PRINT_REWORDS) out = out.replace(re, rep);
  return { ...q, display: { ...q.display, promptText: out } };
}

function isPrintablePrompt(q) {
  if (q.answerType === "multiSelect" || q.answerType === "tenFrame") return false;
  const text = q.display?.promptText;
  if (text) {
    const t = typeof q.answer;
    if (t !== "number" && t !== "string") return false;
    // A prompt that still carries a screen verb after rewording cannot be
    // answered with a pencil ("press Go", coin taps).
    if (SCREEN_VERBS.test(text)) return false;
    // Degenerate on paper: the answer is printed inside the prompt ("Mark 0.7
    // on the number line" — the widget was the question; the sheet is not).
    if (t === "number" && new RegExp(`\\b${String(q.answer).replace(/\./g, "\\.")}\\b`).test(text)) {
      return false;
    }
    return true;
  }
  return Boolean(q.display?.sequence || q.display?.emoji);
}

/**
 * The option bank prints only when the options ARE the question (#34):
 * identify-among-options items ("Which one shows 780 in expanded form?"),
 * non-numeric answers, and estimation items whose choices define the
 * granularity ("About how many…"). A plain numeric answer gets a blank box —
 * printing four candidate numbers next to "What is 10 more than 68?" just
 * turns writing into guessing.
 */
export function printOptionBank(q) {
  if (questionAnswerType(q) !== "choice") return null;
  const choices = Array.isArray(q.choices) && q.choices.length > 1 ? q.choices : null;
  if (!choices) return null;
  if (isYesNoJudgment(q)) return null; // printed as "circle Yes / No" instead
  const numericAnswer =
    typeof q.answer === "number" ||
    (typeof q.answer === "string" && /^-?\d+([./]\d+)?$/.test(q.answer.trim()));
  const text = q.display?.promptText || "";
  if (!numericAnswer) return choices;
  return /\bwhich\b|\bNOT\b|\babout\b/i.test(text) ? choices : null;
}

/** Judgment items ("8 = 9 — Is this right?") print as circle-Yes-or-No. */
export function isYesNoJudgment(q) {
  return (
    Array.isArray(q.choices) &&
    q.choices.length === 2 &&
    q.choices.every((c) => c === "Yes" || c === "No")
  );
}

function promptKey(q) {
  return normalizedPrompt(q) || (q.display?.sequence ? `seq:${q.display.sequence.join(",")}` : `emoji:${q.display?.count}`);
}

// Draw questions until `accept` says yes, `count` times, without repeating a
// key. Relaxation order on starvation: first admit trivial facts beyond the
// cap, then (drill sheets only) admit repeats of already-used facts — a small
// fact pool (multiplication L1 has ten non-trivial facts) must still fill its
// page, and "3 × 4" appearing twice on a drill sheet is unremarkable. Worded
// prompts never repeat: the same sentence twice reads as a misprint.
function drawUnique({ mode, level, context, count, accept, keyOf, seenKeys, state, capStructures = false, allowRepeatsOnStarvation = false }) {
  const out = [];
  let attempts = 0;
  const maxAttempts = count * 60;
  while (out.length < count && attempts < maxAttempts) {
    attempts += 1;
    let q;
    try {
      q = generateQuestion(mode, level, context);
    } catch {
      continue;
    }
    q = printableWording(q);
    if (!accept(q)) continue;
    if (isTrivialFact(q)) {
      if (state.trivialUsed) continue;
      state.trivialUsed = true;
    }
    const key = keyOf(q);
    if (seenKeys.has(key)) continue;
    const prompt = normalizedPrompt(q);
    if (prompt && seenKeys.has(`prompt:${prompt}`)) continue;
    // Same template thrice on one sheet ("Every hand shows 5 fingers…" ×3)
    // reads as a copy-paste job even when the numbers differ. Prompt sheets
    // only — a page of stacked sums shares one structure by design.
    const structure = capStructures ? q.metadata?.structureType : null;
    if (structure) {
      const used = state.structureCounts?.[structure] || 0;
      if (used >= 2) continue;
      state.structureCounts = { ...(state.structureCounts || {}), [structure]: used + 1 };
    }
    seenKeys.add(key);
    if (prompt) seenKeys.add(`prompt:${prompt}`);
    out.push(q);
  }
  if (allowRepeatsOnStarvation && out.length < count) {
    const usedKeys = new Set(out.map(keyOf));
    let repeatAttempts = 0;
    let lastKey = null;
    while (out.length < count && repeatAttempts < count * 60) {
      repeatAttempts += 1;
      let q;
      try {
        q = generateQuestion(mode, level, context);
      } catch {
        continue;
      }
      q = printableWording(q);
      if (!accept(q) || isTrivialFact(q)) continue;
      const key = keyOf(q);
      // Spread the repeats: never the same fact back-to-back in the draw.
      if (key === lastKey) continue;
      lastKey = key;
      usedKeys.add(key);
      out.push(q);
    }
  }
  return out;
}

// The word-problems block at the end of the sheet — the whole point of the
// Include Word Problems toggle (#34): OFF is a pure fact-fluency sheet with
// NOTHING worded on it (a "pick two numbers…" item counts as worded — serving
// one with the toggle off is why the toggle looked broken); ON guarantees the
// sheet visibly carries stories. Stories are preferred; pick-two fills in
// when a mode's story pool runs dry. No computation fallback — a drill sheet
// short one word problem beats a "word problem" that is secretly a sum.
function drawWordProblems({ mode, level, seenKeys, count }) {
  const context = { allowWordProblems: true };
  const out = [];
  for (let attempts = 0; attempts < count * 60 && out.length < count; attempts += 1) {
    let q;
    try {
      q = generateQuestion(mode, level, context);
    } catch {
      continue;
    }
    q = printableWording(q);
    const prompt = normalizedPrompt(q);
    if (!prompt || seenKeys.has(`prompt:${prompt}`)) continue;

    const isStory = q.metadata?.itemFamily === ITEM_FAMILIES.APPLICATION && isVerbalPrompt(q.display?.promptText);
    if (isStory && (typeof q.answer === "number" || typeof q.answer === "string")) {
      seenKeys.add(`prompt:${prompt}`);
      out.push({ kind: "story", question: q });
    }
  }
  // Pick-two prompts carry their bank in display.options and a list-of-lists
  // answer; anything multiSelect without a bank is unprintable.
  for (let attempts = 0; attempts < 60 && out.length < count; attempts += 1) {
    let q;
    try {
      q = generateQuestion(mode, level, context);
    } catch {
      continue;
    }
    q = printableWording(q);
    const prompt = normalizedPrompt(q);
    if (!prompt || seenKeys.has(`prompt:${prompt}`)) continue;
    if (q.answerType !== "multiSelect") continue;
    if (!Array.isArray(q.display?.options) || q.display.options.length === 0) continue;
    seenKeys.add(`prompt:${prompt}`);
    out.push({ kind: "pickTwo", question: q });
  }
  return out;
}

/**
 * Generate one flight log: `{ partA, partB, partC, computational }`.
 * `partC` is `{ kind: "pickTwo" | "story" | "computation", question }`.
 * `computational` is false for modes without an a-op-b form (time, graphs…),
 * whose Parts A/B hold short prompt items instead of stacked/inline sums.
 */
export function generateFlightLog(mode, level, options = {}) {
  const { allowWordProblems = true } = options;
  const config = getModeConfig(mode);
  const computational = Object.prototype.hasOwnProperty.call(ARITH_OPS, config.op);
  const seenKeys = new Set();
  const state = { trivialUsed: false };
  const figureMode = FIGURE_MODES.has(mode);
  const partACount = computational
    ? FLIGHT_LOG_PART_A
    : figureMode
      ? FLIGHT_LOG_FIGURE_PART_A
      : FLIGHT_LOG_PROMPT_PART_A;
  const partBCount = computational
    ? FLIGHT_LOG_PART_B
    : figureMode
      ? FLIGHT_LOG_FIGURE_PART_B
      : FLIGHT_LOG_PROMPT_PART_B;

  let partA;
  let partB;
  if (computational) {
    // Parts A/B skip the item bank: bank prose belongs in Part C, and the
    // computation blocks must be exactly `a op b = ☐`.
    const context = { allowWordProblems: false, consultBankFamilies: [] };
    const accept = (q) => isPureComputation(q) && withinLevelRange(q, level);
    const items = drawUnique({
      mode,
      level,
      context,
      count: partACount + partBCount,
      accept,
      keyOf: computationKey,
      seenKeys,
      state,
      allowRepeatsOnStarvation: true,
    });
    partA = items.slice(0, partACount);
    partB = items.slice(partACount, partACount + partBCount);
  } else {
    // Prompt sheets skip the bank for the same reason the computation blocks
    // do: bank prose belongs in Part C, and a banked cell's non-verbal pool
    // can be smaller than a sheet (placeValue L2 starved partB to zero).
    const context = { allowWordProblems: false, consultBankFamilies: [] };
    const items = drawUnique({
      mode,
      level,
      context,
      count: partACount + partBCount,
      accept: isPrintablePrompt,
      keyOf: promptKey,
      seenKeys,
      state,
      capStructures: true,
    });
    // Prompt items may need their option bank to be answerable on paper.
    for (const q of items) {
      if (questionAnswerType(q) === "choice") {
        q.choices = generateChoices(q.answer, 4, q);
      }
    }
    partA = items.slice(0, partACount);
    partB = items.slice(partACount, partACount + partBCount);
  }

  const wordProblems = allowWordProblems
    ? drawWordProblems({ mode, level, seenKeys, count: figureMode ? 1 : 2 })
    : [];
  const itemCount = partA.length + partB.length + wordProblems.length;
  return { partA, partB, wordProblems, computational, itemCount };
}

/**
 * The scope phrase in the sheet header — level-aware for the additive modes
 * ("Sums to 10" on a Level 1 log), the mode's card scope line otherwise.
 */
export function flightLogScope(mode, level) {
  const config = getModeConfig(mode);
  const cap = maxTotalForLevel(level);
  if (config.op === "+") return `Sums to ${cap}`;
  if (config.op === "-") return `Take away to ${cap}`;
  return config.description;
}
