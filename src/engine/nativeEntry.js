/**
 * Native engine entry point (JavaScriptCore / iOS).
 *
 * esbuild bundles this into KidMathEngine.bundle.js (an IIFE) that a Swift
 * EngineBridge loads into a JSContext. It exposes the SAME generation/scoring
 * engine the web app and the 354-item JS test suite use — one shared brain.
 *
 * Only the pure core is reachable from here: mathEngine + modes + itemBank/index
 * + bands + fractions. Browser/network modules (supabaseClient, progressStore,
 * cloudLoader, modeLoader, components) are NOT imported, so the bundle stays
 * free of window/fetch/import.meta.
 *
 * Contract with Swift:
 *   - Bank items are INJECTED, never fetched: call KidMath.setBankItems(json).
 *   - Saved progress is INJECTED per session via options.savedProgress.
 *   - Everything crosses as plain JSON-serialisable values.
 */

import {
  generateQuestion,
  checkAnswer,
  generateChoices,
  createAdaptiveSession,
  getNextQuestion,
  recordAnswer,
  isSessionComplete,
  summarizeFlight,
  generateWorksheetSet,
  generateFlightLog,
  flightLogScope,
  printOptionBank,
  isYesNoJudgment,
  questionAnswerType,
} from "../mathEngine.js";
import {
  setBankItems,
  getBankItems,
  getBankSource,
  addBankItems,
  resetBankToBundle,
} from "../itemBank/index.js";
import { normalizeBankRow } from "../itemBank/normalize.js";
import { MODE_IDS } from "../modes/index.js";
import { startingLevelFor, gradeFitFor } from "../gradeSeed.js";
import { areaFigureSpec } from "../figures/areaFigureSpec.js";
import consentNoticeMd from "../legal/parental-consent-notice.md";
import { fillTokens } from "../legal/entity.js";
import { LEGAL_VERSIONS } from "../legal/versions.js";
import {
  openSessionRecord,
  appendAttempt,
  closeSessionRecord,
  toRow as sessionRecordToRow,
  fromRow as sessionRecordFromRow,
} from "../analytics/sessionRecord.js";
import { buildReport, headline as reportHeadline } from "../analytics/reportModel.js";
import {
  DAILY_GOAL,
  applySessionEnd,
  applySpend,
  starBalance,
  starsToday,
  currentStreak,
  isFirstWeek,
  isLanguageTrapWin,
} from "../engagement/engagementRules.js";
import { BADGES, newlyEarnedBadges } from "../engagement/badges.js";
import { STICKERS } from "../engagement/stickers.js";
import { scaffoldFor, scaffoldHint } from "../scaffold.js";
import { speakableText } from "../speakable.js";
import { masterySummary, masteryLine } from "../analytics/masterySummary.js";
import { getModeConfig } from "../modes";
import { hintFor } from "../hints/index.js";
import { SCENERY as MEADOW_SCENERY } from "../engagement/meadow/scenery.js";
// Bird-world data (§13 roster, §05/§06 zones + perches + placement). Pure
// data modules with no browser imports — safe in JavaScriptCore, and keeping
// them here means iOS and web can never disagree on a price or a perch.
import { SPECIES, SPECIES_BY_ID, TIERS } from "../engagement/roster.js";
import { ZONES, PERCHES, PLAY_SPOTS, choosePerch } from "../engagement/perches.js";

// JavaScriptCore has no console. A bare shim keeps the lone console.warn in
// mathEngine (and anything else) from throwing; Swift can override it to pipe
// logs into os_log if desired.
const g = typeof globalThis !== "undefined" ? globalThis : this;
if (typeof g.console === "undefined") {
  const noop = () => {};
  g.console = { log: noop, warn: noop, error: noop, info: noop, debug: noop };
}

/**
 * The Swift-facing API. Kept deliberately flat and JSON-in/JSON-out so the
 * bridge marshals with JSValue/Codable and nothing leaks a live JS object.
 */
g.KidMath = {
  // Metadata
  version: 1,
  modes: () => MODE_IDS.slice(),

  // Bank injection (Swift fetches approved items from Supabase, passes them here)
  setBankItems: (items) => setBankItems(Array.isArray(items) ? items : [], "native"),
  getBankItems: () => getBankItems(),
  getBankSource: () => getBankSource(),
  bankCount: () => getBankItems().length,
  // Raw PostgREST rows from Swift -> normalized (same mapping as the web's
  // cloud loaders) -> merged into the seeded bank. Returns how many were new.
  addBankRows: (rows) =>
    addBankItems(
      (Array.isArray(rows) ? rows : []).map(normalizeBankRow).filter(Boolean),
      "native-cloud"
    ),
  resetBankToBundle: () => resetBankToBundle(),

  // Stateless generation + scoring
  generateQuestion: (mode, level, context) => generateQuestion(mode, level, context ?? null),
  generateChoices: (answer, count, question) => generateChoices(answer, count ?? 4, question ?? null),
  checkAnswer: (question, submitted) => checkAnswer(question, submitted),
  questionAnswerType: (question) => questionAnswerType(question),
  // Flight logs (the printable sheets): same three-part draw as
  // PrintableWorksheet.jsx — parts A/B skip the bank, word problems only when
  // the parent allows them. Swift lays the result out on a Letter page.
  generateFlightLog: (mode, level, options) => generateFlightLog(mode, level, options ?? {}),
  flightLogScope: (mode, level) => flightLogScope(mode, level),
  printOptionBank: (question) => printOptionBank(question),
  isYesNoJudgment: (question) => isYesNoJudgment(question),
  generateWorksheetSet: (mode, level, size, options) =>
    generateWorksheetSet(mode, level, size, options ?? {}),

  // Adaptive session. Swift owns persistence and passes savedProgress in.
  createAdaptiveSession: (mode, sessionSize, options) =>
    createAdaptiveSession(mode, sessionSize, options ?? {}),
  getNextQuestion: (session) => getNextQuestion(session),
  recordAnswer: (session, question, chosenAnswer, responseTimeMs, wasRetry) =>
    recordAnswer(session, question, chosenAnswer, responseTimeMs, wasRetry),
  isSessionComplete: (session) => isSessionComplete(session),
  // §01 flight payout. Swift may ignore this until the iOS bird-world port;
  // the field is additive and pure.
  summarizeFlight: (session) => summarizeFlight(session),

  // Grade → starting level for a never-played mode (src/gradeSeed.js); Swift
  // ProgressStore calls this so both platforms seed identically.
  startingLevelFor: (mode, grade) => startingLevelFor(mode, grade),
  gradeFitFor: (mode, grade) => gradeFitFor(mode, grade),

  // Area & perimeter figure spec (src/components/areaFigureSpec.js) — pure,
  // regex-heavy normalisation of bank/generator/prose payloads into one
  // drawable spec. Shared so the iOS AreaFigureView draws exactly what the
  // web draws; null when the item has nothing to draw.
  areaFigureSpec: (question) => areaFigureSpec(question),

  // The COPPA direct notice, tokens filled, plus the versions recorded on the
  // consent event — what KidProfilesService sends to request-consent. Same
  // bytes the web sends (src/kidProfiles.js requestParentalConsent).
  // The practice log record (src/analytics/sessionRecord.js) and the parent
  // report built from it (reportModel.js) — pure, shared verbatim so an iPad
  // session is the same row and the same report as a web session.
  openSessionRecord: (args) => openSessionRecord(args ?? {}),
  appendAttempt: (record, args) => appendAttempt(record, args ?? {}),
  closeSessionRecord: (record, session, args) => closeSessionRecord(record, session ?? null, args ?? {}),
  sessionRecordToRow: (record, userId) => sessionRecordToRow(record, userId),
  sessionRecordFromRow: (row) => sessionRecordFromRow(row),
  buildReport: (sessions, options) => buildReport(sessions ?? [], options ?? {}),
  reportHeadline: (report, kidName) => reportHeadline(report, kidName ?? null),

  // Engagement rules (src/engagement/engagementRules.js) — the session-end
  // transition (streak, daily goal, badges, egg warmth), sticker spend, and
  // the badge/sticker catalogues, shared verbatim with the web.
  applySessionEnd: (state, starsEarned, dayKey, facts) => applySessionEnd(state ?? {}, starsEarned ?? 0, dayKey, facts ?? {}),
  applySpend: (state, sticker) => applySpend(state ?? {}, sticker) ?? null,
  newlyEarnedBadges: (state) => newlyEarnedBadges(state ?? {}).map(({ id, emoji, name, blurb }) => ({ id, emoji, name, blurb })),
  badges: () => BADGES.map(({ id, emoji, name, blurb }) => ({ id, emoji, name, blurb })),
  stickers: () => STICKERS.map(({ id, emoji, name, cost }) => ({ id, emoji, name, cost })),
  dailyGoal: () => DAILY_GOAL,
  starBalance: (state) => starBalance(state ?? {}),
  starsToday: (state, dayKey) => starsToday(state ?? {}, dayKey),
  currentStreak: (state, dayKey) => currentStreak(state ?? {}, dayKey),
  isFirstWeek: (state, dayKey) => isFirstWeek(state ?? {}, dayKey),
  isLanguageTrapWin: (question, isRetry) => isLanguageTrapWin(question, Boolean(isRetry)),

  // Teach-don't-grade: the second-chance scaffold (src/scaffold.js), the
  // read-aloud text (src/speakable.js), and the mastery line over the
  // practice log (src/analytics/masterySummary.js).
  // Per-question hint (src/hints): concept idea, steps built from the live
  // item's numbers (never the answer), the picture, a worked example.
  hintFor: (question) => hintFor(question),
  scaffoldFor: (question) => scaffoldFor(question),
  scaffoldHint: (scaffold) => scaffoldHint(scaffold),
  speakableText: (promptText, noun) => speakableText(promptText, noun ? { noun } : {}),
  masterySummary: (sessions, mode, declared) => masterySummary(sessions ?? [], mode, declared ?? []),
  masteryLine: (summary) => masteryLine(summary) ?? null,
  modeSubskills: (mode) => (getModeConfig(mode)?.subskills ?? []).slice(),

  parentalConsentNotice: () => ({
    markdown: fillTokens(consentNoticeMd),
    version: LEGAL_VERSIONS["parental-consent"],
    termsVersion: LEGAL_VERSIONS.terms,
    privacyVersion: LEGAL_VERSIONS.privacy,
  }),

  // §04–§13 bird-world data + placement, shared verbatim with the web.
  // §04 zone furniture: prop id, base-centre (x, y) in zone px, target height.
  meadowScenery: () => MEADOW_SCENERY,
  roster: () => SPECIES,
  rosterTiers: () => TIERS,
  zones: () => ZONES,
  perches: () => PERCHES,
  playSpots: () => PLAY_SPOTS,
  // Returns the chosen perch id or null. `birds` is the persisted flock
  // ([{ speciesId, perchId, ... }]); Swift owns the engagement blob.
  choosePerch: (birds, speciesId, viewedZoneId, earnedZoneIds) => {
    const species = SPECIES_BY_ID[speciesId];
    if (!species) return null;
    return choosePerch(
      Array.isArray(birds) ? birds : [],
      species,
      viewedZoneId,
      Array.isArray(earnedZoneIds) ? earnedZoneIds : ["meadow"]
    );
  },
};

// Also export for tooling/tests that import this module directly.
export const KidMath = g.KidMath;
