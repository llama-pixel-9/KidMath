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

  // §04–§13 bird-world data + placement, shared verbatim with the web.
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
