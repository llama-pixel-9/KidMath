import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import {
  Plus,
  Minus,
  X,
  Divide,
  ArrowLeftRight,
  Hash,
  FastForward,
  Layers,
  Star,
  Settings,
  Trophy,
  Sparkles,
  LogIn,
  Volume2,
  VolumeX,
  Zap,
  PieChart,
  Percent,
  GitFork,
  BarChart3,
  CircleDot,
  Sigma,
  Ruler,
  Coins,
  Spline,
  Scale,
  Clock,
  ChartColumn,
  Triangle,
  Shapes,
} from "lucide-react";
import {
  createAdaptiveSession,
  getNextQuestion,
  recordAnswer,
  isSessionComplete,
  summarizeFlight,
  MODES,
  buildBankQuestion,
} from "./mathEngine";
import { getBankItems } from "./itemBank/index.js";
import { fetchBankItemById } from "./itemBank/cloudLoader.js";
import { flightReportEnabled, fledgingEnabled, meadowEnabled } from "./gamificationFlags.js";
import { recordEnsureStarter } from "./engagement/flock.js";
import {
  recordFlightEnd,
  recordFledgingResult,
  nominationFor,
  FLEDGING_QUESTIONS,
  FLEDGING_PASS,
} from "./engagement/fledging.js";
import { getModeConfig } from "./modes";
import { ensureModeLoaded } from "./itemBank.js";
import { FIGURE_COLORS, useAnswerKeys, KeyHint } from "./components/kit";
import { saveProgress, loadProgress, mergeLocalToCloud } from "./progressStore";
import { recordSessionEnd, currentStreak, starsToday, starBalance, isFirstWeek } from "./engagement/engagementStore";
import JourneyMap from "./engagement/JourneyMap.jsx";
import FlightReport from "./engagement/FlightReport.jsx";

// The two CCSS compare structures whose wording points at the WRONG operation
// — the difficult-tier trap the Word Detective badge rewards beating.
const LANGUAGE_TRAP_STRUCTURES = new Set(["compareBiggerFewer", "compareSmallerMore"]);
import { useAuth } from "./useAuth";
import { useTheme } from "./useTheme";
import {
  playCorrectSound,
  playStreakSound,
  playLevelUpSound,
  playWrongSound,
  playCompleteSound,
  isMuted,
  setMuted,
} from "./sounds";
import { createRuntimeDiagnostics } from "./runtimeDiagnostics";
import { getTelemetry } from "./telemetry/telemetryClient";
import {
  loadAllowWordProblems,
  loadAllowWordProblemsSync,
  saveAllowWordProblems,
  loadCalmMode,
  saveCalmMode,
} from "./userPreferences";
import ConfettiBurst from "./components/ConfettiBurst.jsx";
import Feather from "./components/feather.jsx";
import ConfettiRain from "./components/ConfettiRain.jsx";
import LarkMark from "./components/LarkMark.jsx";
import QuestionStage from "./components/QuestionStage.jsx";
import { getWidget } from "./components/widgetRegistry.js";

const ICON_MAP = { Plus, Minus, X, Divide, ArrowLeftRight, Hash, FastForward, Layers, PieChart, Percent, GitFork, BarChart3, CircleDot, Sigma, Ruler, Coins, Spline, Scale, Clock, ChartColumn, Triangle, Shapes };

function getModeIcon(modeId) {
  const config = getModeConfig(modeId);
  return ICON_MAP[config.icon] || Plus;
}

function getModeLabel(modeId) {
  return getModeConfig(modeId).label;
}


// One ring color at every level: progress is always Lark Teal on its Ink
// track — the level is told by the number, not a rainbow hue.
const LEVEL_RING_COLORS = ["stroke-teal"];

function isLikelyLowEndDevice() {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("simulateDevice") === "ipad") return true;
  } catch {
    // Ignore malformed URL params.
  }
  const ua = navigator.userAgent || "";
  const iPadUA = /iPad/.test(ua);
  const iPadDesktopUA = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const lowCores = (navigator.hardwareConcurrency || 8) <= 4;
  const lowMemory = (navigator.deviceMemory || 8) <= 4;
  return iPadUA || iPadDesktopUA || lowCores || lowMemory;
}

async function persistSession(mode, session, starsEarned, levelOverride) {
  await saveProgress(mode, {
    level: levelOverride ?? session.level,
    mistakeBank: session.mistakeBank,
    firstTryCorrect: session.firstTryCorrect,
    // §01 flight payout; when undefined progressStore falls back to the
    // historical one-star-per-first-try formula.
    starsEarned,
    bankItemStats: session.bankItemStats || {},
    recentBankItemIds: session.recentBankItemIds || [],
  });
  const progress = await loadProgress(mode);
  return progress.lifetimeStars;
}

// Dev/QA override: `?input=numberpad` forces the number-pad answer format on
// every question so the new AnswerInput dispatch can be exercised on existing
// content without changing the default experience. Phase 0.2 proof only.
function getForcedInputType() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search || "");
    const map = {
      numberpad: "numberPad",
      fillblank: "fillBlank",
      symbolselect: "symbolSelect",
      decimal: "decimal",
      fraction: "fraction",
      numberbond: "numberBond",
      barmodel: "barModel",
      pvdiscs: "placeValueDiscs",
      fractionset: "fractionSet",
      clock: "clock",
      bargraph: "barGraph",
      angle: "angle",
    };
    return map[params.get("input")] || null;
  } catch {
    // Ignore malformed URL params.
  }
  return null;
}

// Dev/QA hooks for the e2e robot kid (DEV builds only, stripped from prod):
// `?qaFeedbackMs=120` shortens the answer-feedback pauses so a full-session
// smoke run stays fast, and the current question + last scoring result are
// mirrored on `window.__kidmathQA` so drivers operate the real widgets with
// a known target instead of re-deriving answers from pixels.
const QA_HOOKS = import.meta.env.DEV && typeof window !== "undefined";

function getQaFeedbackMs() {
  if (!QA_HOOKS) return null;
  try {
    const raw = new URLSearchParams(window.location.search || "").get("qaFeedbackMs");
    const ms = raw === null ? NaN : Number(raw);
    return Number.isFinite(ms) && ms >= 0 ? ms : null;
  } catch {
    return null;
  }
}

function qaUpdate(patch) {
  if (!QA_HOOKS) return;
  window.__kidmathQA = { ...(window.__kidmathQA || {}), ...patch };
}

// `?qaVariety=tenFrameBuild` forces every fresh question onto one generator
// variety (bank lookups skipped), so a reported item shape can be reproduced
// deterministically instead of replaying sessions until the RNG serves it.
function getQaVariety() {
  if (!QA_HOOKS) return null;
  try {
    return new URLSearchParams(window.location.search || "").get("qaVariety") || null;
  } catch {
    return null;
  }
}
const QA_VARIETY = typeof window === "undefined" ? null : getQaVariety();

// `/play/<mode>?item=<itemId>` pins one bank row: every question in the
// session is that item, rendered through the normal stage. Reviewers use it
// ("Open in play" in /admin) to see an item exactly as a kid would, with
// feedback, keyboard and sounds. Not DEV-gated — review happens on prod.
function getPinnedItemId() {
  try {
    return new URLSearchParams(window.location.search || "").get("item") || null;
  } catch {
    return null;
  }
}
const PINNED_ITEM_ID = typeof window === "undefined" ? null : getPinnedItemId();

function CircularProgress({ current, total, level }) {
  const { theme } = useTheme();
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? current / total : 0;
  const dashOffset = circumference * (1 - progress);
  const ringColor = LEVEL_RING_COLORS[Math.min(level - 1, 9)];

  return (
    <section className="flex items-center justify-center gap-3 py-2 px-4" aria-label="Progress">
      <div className="relative progress-ring flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            className="stroke-ink/10"
            strokeWidth="6"
          />
          <motion.circle
            cx="48" cy="48" r={radius}
            fill="none"
            className={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-extrabold ${theme.textPrimary}`}>
            {current}/{total}
          </span>
        </div>
      </div>
      <motion.div
        className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${theme.ctaPrimary} text-cream text-sm font-bold shadow-[0_3px_0_#064A41]`}
        key={level}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        Lv. {level}
      </motion.div>
    </section>
  );
}

function StarRow({ count }) {
  return (
    <section className="flex items-center justify-center gap-1 py-2" aria-label="Stars earned">
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: [0, 1.3, 1], rotate: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4, type: "spring" }}
        >
          <span className="block w-4.5 h-4.5 bg-sun rotate-45 rounded-[4px]" />
        </motion.div>
      ))}
    </section>
  );
}

// Fledging (§17): the between-levels moment — the lark on an Apricot disc
// (the teal ring belongs to the end card), a flight word, no confetti here.
function LevelUpToast() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white px-8 py-5 rounded-3xl shadow-[0_8px_0_#14231F14] flex items-center gap-4"
        initial={{ scale: 0, y: 30 }}
        animate={{ scale: [0, 1.15, 1], y: 0 }}
        exit={{ scale: 0, y: -30, opacity: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <span className="flex items-center justify-center w-14 h-14 rounded-full bg-apricot">
          <LarkMark size={30} />
        </span>
        <span className="text-2xl font-display font-semibold text-ink">
          You&rsquo;ve fledged — level up!
        </span>
      </motion.div>
    </motion.div>
  );
}

// §03 step 4: the Fledging Flight offered at take-off. Declining costs
// nothing and is plain text at body size — never a shrunken escape hatch.
function FledgingOffer({ level, onAccept, onDecline }) {
  return (
    <motion.div
      data-blocks-keys="" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative bg-white rounded-3xl shadow-[0_8px_0_#14231F14] p-8 mx-4 max-w-sm w-full text-center"
        initial={{ scale: 0.6, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      >
        <span className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-seafoam">
          <LarkMark size={34} />
        </span>
        <h2 className="text-2xl font-display font-semibold text-ink mt-4">
          Ready for higher skies?
        </h2>
        <p className="text-[15px] font-semibold text-ink/80 mt-2">
          Six questions, five to pass — and Level {Math.min(level + 1, 10)} is yours. No stars
          ride on this one.
        </p>
        <button
          autoFocus
          className="mt-5 w-full h-14 bg-teal text-cream text-xl font-display font-semibold rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer"
          onClick={onAccept}
        >
          Take the Fledging Flight
        </button>
        <button
          className="mt-3 text-[15px] font-semibold text-ink/80 cursor-pointer"
          onClick={onDecline}
        >
          Just a normal flight today
        </button>
      </motion.div>
    </motion.div>
  );
}

// §17 fledging moment: lark on the Apricot disc, a flight word, the level bar
// filling over 600ms, one button, auto-advance at 4s. No confetti — that
// belongs to the end of a run only. The miss copy is kind and keeps the door open.
function FledgingCeremony({ passed, level, onContinue }) {
  useEffect(() => {
    const t = setTimeout(onContinue, 4000);
    return () => clearTimeout(t);
  }, [onContinue]);
  return (
    <motion.div
      data-blocks-keys="" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative bg-white rounded-3xl shadow-[0_8px_0_#14231F14] p-8 mx-4 max-w-sm w-full text-center"
        initial={{ scale: 0.6, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      >
        <span className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-apricot">
          <LarkMark size={42} />
        </span>
        <h2 className="text-3xl font-display font-semibold text-ink mt-4">
          {passed ? "You’ve fledged!" : "Almost there"}
        </h2>
        <p className="text-[15px] font-semibold text-ink/80 mt-2">
          {passed
            ? `Level ${level} skies are yours now.`
            : "A little more practice and you’ll be soaring."}
        </p>
        <div className="mt-4 h-2.5 rounded-full bg-ink/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-teal"
            initial={{ width: `${((passed ? level - 1 : level) / 10) * 100}%` }}
            animate={{ width: `${(level / 10) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <button
          className="mt-5 w-full h-14 bg-teal text-cream text-xl font-display font-semibold rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer"
          onClick={onContinue}
        >
          Fly on
        </button>
      </motion.div>
    </motion.div>
  );
}

// The end card (§11): the lark sits inside the score ring so one object
// carries both the celebration and the result; everything below it is
// information. Headlines are bird puns, never a score judgement.
const END_CARD_PUNS = [
  "Talon-ted!",
  "Nice flying!",
  "Owl be impressed!",
  "Toucan-t stop you!",
  "Wing it again?",
  "Egg-cellent!",
  "That soared!",
  "Feather in your cap!",
];

function SetCompleteOverlay({ firstTryCorrect, retriesMastered, total, level, lifetimeStars, engagement, lowMotionMode = false, onPlayAgain }) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const ratio = total > 0 ? firstTryCorrect / total : 0;
  // Rotate the pun deterministically so replays cycle through the set.
  const headline = END_CARD_PUNS[(lifetimeStars + total) % END_CARD_PUNS.length];

  return (
    <motion.div
      data-blocks-keys="" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Calm mode counts as reduced motion here too — the star stays, the
          confetti goes. */}
      {!lowMotionMode && <ConfettiRain />}
      <motion.div
        className="relative bg-white rounded-3xl shadow-[0_8px_0_#14231F14] p-8 mx-4 max-w-sm w-full text-center"
        initial={{ scale: 0.5, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {/* Score ring: Lark Teal fill = percent first-try correct, on an Ink
            8% track; the lark is the reward and appears here only. */}
        <div className="relative w-[148px] h-[148px] mx-auto">
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ background: `conic-gradient(#0B7A6A ${Math.max(ratio * 100, 3)}%, #14231F14 0)` }}
          >
            <div className="w-[120px] h-[120px] rounded-full bg-white flex items-center justify-center">
              <LarkMark size={58} />
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-ink text-cream rounded-full px-3.5 py-1 font-display font-semibold text-[15px] whitespace-nowrap">
            {firstTryCorrect} / {total}
          </div>
        </div>
        <h2 className={`text-3xl font-display font-semibold ${theme.textPrimary} mt-5`}>
          {headline}
        </h2>
        {/* Stat strip on Apricot: star, +N stars, divider, streak. */}
        <div className="mt-3 inline-flex items-center gap-2.5 bg-apricot rounded-2xl px-4 py-2.5">
          <span className="w-4 h-4 bg-sun rotate-45 rounded-[3px] shrink-0" aria-hidden="true" />
          <span className="text-[15px] font-bold text-ink">
            +{firstTryCorrect} {firstTryCorrect === 1 ? "star" : "stars"}
          </span>
          {engagement?.streak > 1 && (
            <>
              <span className="w-px h-[18px] bg-ink/20 shrink-0" aria-hidden="true" />
              <span className="text-[15px] font-bold text-ink">
                {engagement.streak} days in a row
              </span>
            </>
          )}
        </div>
        {retriesMastered > 0 && (
          <motion.p
            className="text-sm font-bold text-deep-teal mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            You mastered {retriesMastered} tricky {retriesMastered === 1 ? "one" : "ones"} today!
          </motion.p>
        )}
        <div className="mt-3">
          <JourneyMap level={level} compact />
        </div>
        {engagement?.goalJustMet && (
          <motion.p
            className="text-sm font-bold text-deep-teal mt-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            Daily goal done — {engagement.todayStars} stars today!
          </motion.p>
        )}
        {(engagement?.newBadges || []).map((b, i) => (
          <motion.p
            key={b.id}
            className="text-sm font-bold text-teal mt-1"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: [0.6, 1.2, 1] }}
            transition={{ delay: 0.8 + i * 0.2 }}
          >
            {b.emoji} New badge: {b.name}!
          </motion.p>
        ))}
        {lifetimeStars > firstTryCorrect && (
          <motion.p
            className={`text-xs ${theme.textMuted} mt-2`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {lifetimeStars} stars earned all-time!
          </motion.p>
        )}
        <button
          className="mt-6 w-full h-14 bg-teal text-cream text-xl font-display font-semibold rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer"
          onClick={onPlayAgain}
        >
          Play again
        </button>
        <button
          className="mt-3 text-[15px] font-bold text-teal cursor-pointer hover:underline underline-offset-2"
          onClick={() => navigate("/")}
        >
          Back to the nest
        </button>
      </motion.div>
    </motion.div>
  );
}

function SettingsPanel({ mode, allowWordProblems, onAllowWordProblemsChange, calmMode, onCalmModeChange, onModeChange, onClose }) {
  const { theme } = useTheme();
  return (
    <motion.div
      data-blocks-keys="" className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 w-full max-w-sm"
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`text-2xl font-extrabold ${theme.textPrimary} text-center mb-5`}>Settings</h2>

        <div className="mb-5">
          <p className={`text-sm font-semibold ${theme.textSecondary} mb-2 uppercase tracking-wide`}>Mode</p>
          <div className="grid grid-cols-4 gap-2">
            {MODES.map((m) => {
              const Icon = getModeIcon(m);
              const config = getModeConfig(m);
              const active = m === mode;
              return (
                <motion.button
                  key={m}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 cursor-pointer transition-colors ${
                    active ? theme.selectedBorder : `${theme.cardBorder} bg-white hover:bg-cream`
                  }`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onModeChange(m)}
                >
                  <Icon className={`h-6 w-6 ${active ? theme.selectedIcon : theme.textMuted}`} />
                  <span className={`text-[10px] font-bold ${active ? theme.selectedText : theme.textSecondary} leading-tight text-center`}>
                    {config.shortLabel}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <p className={`text-xs ${theme.textMuted} text-center mb-4`}>
          Difficulty adjusts automatically based on how you play!
        </p>

        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-cream px-4 py-3">
          <div>
            <p className={`text-sm font-bold ${theme.textPrimary}`}>Allow Word Problems</p>
            <p className={`text-xs ${theme.textMuted}`}>
              Story questions for stronger readers.
            </p>
          </div>
          <button
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
              allowWordProblems ? "bg-teal" : "bg-ink/20"
            }`}
            onClick={() => onAllowWordProblemsChange(!allowWordProblems)}
            aria-label={allowWordProblems ? "Disable word problems" : "Enable word problems"}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                allowWordProblems ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-cream px-4 py-3">
          <div>
            <p className={`text-sm font-bold ${theme.textPrimary}`}>Calm Mode</p>
            <p className={`text-xs ${theme.textMuted}`}>
              No confetti or shaking — stars and levels stay.
            </p>
          </div>
          <button
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
              calmMode ? "bg-teal" : "bg-ink/20"
            }`}
            onClick={() => onCalmModeChange(!calmMode)}
            aria-label={calmMode ? "Turn calm mode off" : "Turn calm mode on"}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                calmMode ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <motion.button
          className={`w-full py-3 bg-gradient-to-r ${theme.ctaPrimary} text-cream font-display font-semibold text-lg rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer`}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
        >
          Let's Go!
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function LoginPromptModal({ onLogin, onDismiss }) {
  const { theme } = useTheme();
  return (
    <motion.div
      data-blocks-keys="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-3xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center"
        initial={{ scale: 0.5, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <div className="flex justify-center gap-2 mb-3">
          <Sparkles className="h-10 w-10 text-sun" />
          <Trophy className="h-10 w-10 text-sun fill-sun" />
          <Sparkles className="h-10 w-10 text-sun" />
        </div>
        <h2 className={`text-2xl font-extrabold ${theme.textPrimary}`}>
          You're doing amazing!
        </h2>
        <p className={`${theme.textSecondary} mt-2 text-lg`}>
          Want to save your stars and track your progress?
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <motion.button
            className={`flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r ${theme.worksheetCalloutBtn} text-cream font-display font-semibold text-lg rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogin}
          >
            <LogIn className="h-5 w-5" />
            Log In / Sign Up
          </motion.button>
          <button
            className={`w-full py-3 ${theme.textMuted} font-medium text-base cursor-pointer hover:opacity-80 transition-colors`}
            onClick={onDismiss}
          >
            Maybe Later
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MathExplorer({ initialMode }) {
  const startMode = initialMode || "addition";
  const { theme } = useTheme();
  const { user, signInWithGoogle } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [lowEndDevice] = useState(() => isLikelyLowEndDevice());
  const [forcedInputType] = useState(() => getForcedInputType());
  const [qaFeedbackMs] = useState(() => getQaFeedbackMs());
  const [mode, setMode] = useState(startMode);
  const [session, setSession] = useState(() =>
    createAdaptiveSession(startMode, undefined, {
      allowWordProblems: loadAllowWordProblemsSync(),
      fledging: fledgingEnabled(),
      qaVariety: QA_VARIETY,
    })
  );
  const [currentQ, setCurrentQ] = useState(null);
  const [isRetry, setIsRetry] = useState(false);
  const [feedback, setFeedback] = useState(null); // "correct" | "wrong" | null
  const [showSettings, setShowSettings] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [shakenChoice, setShakenChoice] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [revealAnswer, setRevealAnswer] = useState(null);
  const [lifetimeStars, setLifetimeStars] = useState(0);
  const [engagement, setEngagement] = useState(null);
  // §01/§02/§03 rollout: resolved once per mount so a session settles consistently.
  const [gamFlightReport] = useState(() => flightReportEnabled());
  const [gamFledging] = useState(() => fledgingEnabled());
  const [flightPayout, setFlightPayout] = useState(null);
  // §03 take-off state: the offer overlay, whether the current session IS a
  // Fledging Flight (ref for async handlers + state for render), and the
  // post-flight ceremony/kind-copy card.
  const [fledgingOffer, setFledgingOffer] = useState(false);
  const fledgingRunRef = useRef(false);
  const [fledgingActive, setFledgingActive] = useState(false);
  const [fledgingResult, setFledgingResult] = useState(null);
  // Per-session badge inputs the engine doesn't aggregate itself.
  const sessionFactsRef = useRef({ trapWins: 0 });
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const [allowWordProblems, setAllowWordProblems] = useState(() => loadAllowWordProblemsSync());
  const [calmMode, setCalmMode] = useState(() => loadCalmMode());
  const questionStartTime = useRef(Date.now());
  const loginTimerRef = useRef(null);
  const questionKeyRef = useRef(0);
  const timeoutIdsRef = useRef([]);
  const answerLockRef = useRef(false);
  const diagnosticsRef = useRef(createRuntimeDiagnostics("math-explorer"));
  const telemetryRef = useRef(getTelemetry());

  const clearQueuedTimeouts = useCallback(() => {
    diagnosticsRef.current.mark("timeoutsCleared", timeoutIdsRef.current.length);
    timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    timeoutIdsRef.current = [];
  }, []);

  const scheduleTimeout = useCallback((fn, delayMs) => {
    diagnosticsRef.current.mark("timeoutsScheduled");
    diagnosticsRef.current.mark("timeoutMsTotal", delayMs);
    const id = setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((timerId) => timerId !== id);
      diagnosticsRef.current.mark("timeoutsFired");
      fn();
    }, delayMs);
    timeoutIdsRef.current.push(id);
    diagnosticsRef.current.setMax("maxPendingTimeouts", timeoutIdsRef.current.length);
    return id;
  }, []);

  const pinnedItemRef = useRef(null);
  const loadNextQuestion = useCallback((sess) => {
    const { question, isRetry: retry } = pinnedItemRef.current
      ? { question: buildBankQuestion(pinnedItemRef.current, sess.level), isRetry: false }
      : getNextQuestion(sess);
    qaUpdate({
      question,
      isRetry: retry,
      seq: (typeof window !== "undefined" && window.__kidmathQA?.seq + 1) || 1,
      done: false,
    });
    setCurrentQ(question);
    setIsRetry(retry);
    questionStartTime.current = Date.now();
    questionKeyRef.current += 1;
    answerLockRef.current = false;
    diagnosticsRef.current.mark("questionsLoaded");
    if (retry) diagnosticsRef.current.mark("retryQuestionsLoaded");
    telemetryRef.current.inc("questionsLoaded");
    if (retry) telemetryRef.current.inc("retryQuestionsLoaded");
  }, []);

  const startNewSession = useCallback((m, allowWordProblemsOverride = allowWordProblems, { offer = true } = {}) => {
    clearQueuedTimeouts();
    answerLockRef.current = false;
    fledgingRunRef.current = false;
    setFledgingActive(false);
    const targetMode = m || mode;
    const newSession = createAdaptiveSession(targetMode, undefined, {
      allowWordProblems: allowWordProblemsOverride,
      fledging: gamFledging,
      qaVariety: QA_VARIETY,
    });
    setSession(newSession);
    setFeedback(null);
    setRevealAnswer(null);
    setShowComplete(false);
    loadNextQuestion(newSession);
    // §03 step 4: a pending nomination is offered at take-off — except right
    // after a Fledging Flight, when the normal session simply begins.
    if (offer && gamFledging && nominationFor(targetMode)) setFledgingOffer(true);
  }, [mode, allowWordProblems, gamFledging, loadNextQuestion, clearQueuedTimeouts]);

  useEffect(() => {
    loadNextQuestion(session);
    if (gamFledging && nominationFor(mode)) setFledgingOffer(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Accepting the offer swaps the fresh normal session for the challenge set:
  // six questions at the CURRENT level, rotating through the weakest subskills
  // recorded when the lark nominated. No stars ride on it.
  const startFledgingFlight = useCallback(() => {
    const nomination = nominationFor(mode);
    clearQueuedTimeouts();
    answerLockRef.current = false;
    const challenge = createAdaptiveSession(mode, FLEDGING_QUESTIONS, {
      allowWordProblems,
      fledging: true,
      challengeSubskills: nomination?.weakSubskills || [],
      savedProgress: { level: session.level },
    });
    fledgingRunRef.current = true;
    setFledgingActive(true);
    setFledgingOffer(false);
    setSession(challenge);
    setFeedback(null);
    setRevealAnswer(null);
    loadNextQuestion(challenge);
  }, [mode, allowWordProblems, session.level, loadNextQuestion, clearQueuedTimeouts]);

  // Fetch this mode's items on entry. The app ships only a seed (a few items
  // per cell) so first paint is fast; the rest of a mode arrives when the child
  // actually opens it, and we never pay for the 21 modes they did not pick.
  //
  // Deliberately not awaited: the seed is already playable, so questions start
  // immediately and the fetched items widen variety as soon as they land.
  useEffect(() => {
    ensureModeLoaded(mode);
  }, [mode]);

  // Keyed on the user's id, not the user object: the auth provider re-emits
  // on tab refocus, and a mid-session rebuild here is a kid losing their 7/15.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      await mergeLocalToCloud(userId);
      const [saved, cloudAllowWordProblems] = await Promise.all([
        loadProgress(mode),
        loadAllowWordProblems(userId),
      ]);
      if (cancelled) return;
      if (cloudAllowWordProblems !== allowWordProblems) {
        setAllowWordProblems(cloudAllowWordProblems);
      }
      // Never stomp a Fledging Flight in progress with the cloud rebuild.
      if (fledgingRunRef.current) return;
      const newSession = createAdaptiveSession(mode, undefined, {
        allowWordProblems: cloudAllowWordProblems,
        fledging: gamFledging,
        qaVariety: QA_VARIETY,
      });
      newSession.level = saved.level;
      newSession.mistakeBank = saved.mistakeBank;
      setSession(newSession);
      loadNextQuestion(newSession);
    })();
    return () => {
      cancelled = true;
    };
    // `allowWordProblems` is intentionally omitted: this effect seeds it from
    // the cloud on login; subsequent toggle changes rebuild the session
    // directly in handleAllowWordProblemsChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mode, loadNextQuestion]);

  useEffect(() => {
    if (user) return;
    const dismissed = sessionStorage.getItem("dismissedLoginPrompt");
    if (dismissed) return;
    loginTimerRef.current = setTimeout(() => {
      telemetryRef.current.recordEvent("login_modal_shown");
      setShowLoginPrompt(true);
    }, 10 * 60 * 1000);
    return () => clearTimeout(loginTimerRef.current);
  }, [user]);

  useEffect(() => {
    telemetryRef.current.setUser(user?.id || null);
  }, [user]);

  useEffect(() => {
    const diagnostics = diagnosticsRef.current;
    return () => {
      clearQueuedTimeouts();
      diagnostics.dispose();
    };
  }, [clearQueuedTimeouts]);

  const handleModeChange = (m) => {
    telemetryRef.current.inc("modeChanges");
    telemetryRef.current.recordEvent("mode_change", { from: mode, to: m });
    setMode(m);
    startNewSession(m);
  };

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  const handleAllowWordProblemsChange = (value) => {
    setAllowWordProblems(value);
    // Fire-and-forget: the local mirror inside saveAllowWordProblems writes
    // synchronously so reloads stay consistent even if the cloud upsert is
    // still in flight.
    saveAllowWordProblems(user?.id || null, value).catch((err) => {
      console.warn("Failed to persist allowWordProblems preference", err);
    });
    startNewSession(mode, value);
  };

  const finishSession = useCallback(async (sess) => {
    qaUpdate({ done: true });
    // §03: a Fledging Flight settles its own way — no stars, no report. Pass
    // (≥ 5/6 first-try) fledges now; a miss keeps the nomination (three misses
    // clear it) and the normal flight follows either way.
    if (fledgingRunRef.current) {
      fledgingRunRef.current = false;
      const passed = (sess.firstTryCorrect ?? 0) >= FLEDGING_PASS;
      recordFledgingResult(mode, passed);
      const newLevel = passed ? Math.min(sess.level + 1, 10) : sess.level;
      await saveProgress(mode, {
        level: newLevel,
        mistakeBank: sess.mistakeBank,
        firstTryCorrect: sess.firstTryCorrect,
        starsEarned: 0,
        bankItemStats: sess.bankItemStats || {},
        recentBankItemIds: sess.recentBankItemIds || [],
      });
      setFledgingActive(false);
      setFledgingResult({ passed, newLevel });
      if (passed) playLevelUpSound();
      return;
    }

    // §01: the four-part settlement replaces one-star-per-first-try when the
    // Flight Report is on. Quitting mid-flight never reaches here, so an
    // unfinished flight pays nothing either way.
    const payout = gamFlightReport ? summarizeFlight(sess) : null;
    const starsEarned = payout ? payout.total : sess.firstTryCorrect ?? 0;
    // §03 bookkeeping at flight end: nominations set on the engine's signal,
    // rough flights (< 40% precision) clear them silently, and two consecutive
    // rough flights glide the level down one — persisted with the session.
    const fledgeOutcome = gamFledging
      ? recordFlightEnd(mode, {
          precisionRatio:
            sess.questionsAnswered > 0 ? (sess.firstTryCorrect ?? 0) / sess.questionsAnswered : 0,
          nominated: Boolean(sess.nominated),
          weakSubskills: sess.nominationWeakSubskills || [],
        })
      : null;
    const levelAfter = fledgeOutcome?.glideDown ? Math.max(1, sess.level - 1) : sess.level;
    const lt = await persistSession(
      mode,
      sess,
      payout ? payout.total : undefined,
      fledgeOutcome?.glideDown ? levelAfter : undefined
    );
    setLifetimeStars(lt);
    setFlightPayout(payout);
    // The engagement loop: bank today's stars, roll the day streak, and hand
    // the report the moments worth celebrating.
    const { state: eng, events } = recordSessionEnd(starsEarned, {
      perfect: sess.questionsAnswered > 0 && sess.firstTryCorrect === sess.questionsAnswered,
      comebacks: sess.retriesMastered ?? 0,
      trapWins: sessionFactsRef.current.trapWins,
      levelReached: sess.level,
    });
    sessionFactsRef.current = { trapWins: 0 };
    // §13: the Skylark arrives with the kid's first finished flight.
    if (meadowEnabled()) recordEnsureStarter();
    setEngagement({
      streak: currentStreak(eng),
      streakExtended: events.streakExtended,
      goalJustMet: events.goalJustMet,
      todayStars: starsToday(eng),
      newBadges: events.newBadges,
      balance: starBalance(eng),
      firstWeek: isFirstWeek(eng),
      // §02 state 2 / §03: the Seafoam note and the glide-down level for the bar.
      nomination: fledgeOutcome?.nomination ?? null,
      glideDown: Boolean(fledgeOutcome?.glideDown),
      levelAfter,
    });
    setShowComplete(true);
    telemetryRef.current.inc("setsCompleted");
    telemetryRef.current.recordEvent("set_complete", {
      mode,
      firstTryCorrect: sess.firstTryCorrect,
      starsEarned,
      flightReport: Boolean(payout),
      streakDays: currentStreak(eng),
      dailyGoalMet: starsToday(eng) >= 10,
    });
    playCompleteSound();
  }, [mode, gamFlightReport, gamFledging]);

  // The single answer-commit path. Every answer format (bubble tap, number pad,
  // and future builders) routes its value through here so the answer lock,
  // telemetry, mistake bank, and motion/sound feedback stay identical (plan §6b).
  const submitAnswer = (value) => {
    diagnosticsRef.current.mark("answerAttempts");
    telemetryRef.current.inc("answerAttempts");
    if (feedback === "correct" || feedback === "wrong" || answerLockRef.current) {
      diagnosticsRef.current.mark("answerAttemptDropped");
      telemetryRef.current.inc("answerAttemptDropped");
      return;
    }
    answerLockRef.current = true;
    diagnosticsRef.current.mark("answerProcessed");
    telemetryRef.current.inc("answerProcessed");

    try {
      const responseTimeMs = Date.now() - questionStartTime.current;
      const result = recordAnswer(session, currentQ, value, responseTimeMs, isRetry);
      setSession(result.session);
      qaUpdate({
        result: {
          correct: result.correct,
          submitted: value,
          count: ((typeof window !== "undefined" && window.__kidmathQA?.result?.count) || 0) + 1,
        },
      });

      if (result.correct) {
        setFeedback("correct");
        setRevealAnswer(currentQ.answer);

        // A first-try win on a language-trap structure ("3 fewer... so ADD")
        // feeds the Word Detective badge.
        if (!isRetry && LANGUAGE_TRAP_STRUCTURES.has(currentQ.metadata?.structureType)) {
          sessionFactsRef.current.trapWins += 1;
        }

        if (result.levelChanged && result.newLevel > session.level) {
          playLevelUpSound();
          setShowLevelUp(true);
          scheduleTimeout(() => setShowLevelUp(false), 1200);
        } else if (result.session.correctStreak >= 3) {
          playStreakSound();
        } else {
          playCorrectSound();
        }

        scheduleTimeout(() => {
          if (isSessionComplete(result.session)) {
            finishSession(result.session);
            answerLockRef.current = false;
          } else {
            setFeedback(null);
            setRevealAnswer(null);
            loadNextQuestion(result.session);
          }
        }, qaFeedbackMs ?? 1200);
      } else {
        setFeedback("wrong");
        setShakenChoice(value);
        setRevealAnswer(currentQ.answer);
        playWrongSound();

        scheduleTimeout(() => {
          setFeedback(null);
          setShakenChoice(null);
          setRevealAnswer(null);

          if (isSessionComplete(result.session)) {
            finishSession(result.session);
            answerLockRef.current = false;
          } else {
            loadNextQuestion(result.session);
          }
        }, qaFeedbackMs ?? 2000);
      }
    } catch (error) {
      answerLockRef.current = false;
      console.error("Failed to process answer", error);
    }
  };

  // Keyboard for the multiple-choice bubbles (every other answerType is a
  // registered widget that owns its own keys). Numeric choices are matched by
  // VALUE — a child pressing "3" means the number 3, never "the third tile" —
  // typed digits accumulate and submit as soon as they name exactly one
  // choice (or on Enter). Word choices use 1-4 by position, with badges.
  const choiceKeysActive =
    !!currentQ && !getWidget(forcedInputType || currentQ.answerType || "choice") && !feedback;
  const choiceList = currentQ?.choices || [];
  const numericChoices =
    choiceList.length > 0 && choiceList.every((c) => /^-?\d+(\.\d+)?$/.test(String(c)));
  const typedChoiceRef = useRef("");
  useAnswerKeys((e) => {
    if (!numericChoices) {
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= choiceList.length) {
        submitAnswer(choiceList[Number(e.key) - 1]);
        return true;
      }
      return false;
    }
    if (e.key === "Backspace") { typedChoiceRef.current = typedChoiceRef.current.slice(0, -1); return true; }
    if (e.key === "Enter") {
      const hit = choiceList.find((c) => String(c) === typedChoiceRef.current);
      typedChoiceRef.current = "";
      if (hit !== undefined) submitAnswer(hit);
      return true;
    }
    if (!/^[0-9.-]$/.test(e.key)) return false;
    const typed = typedChoiceRef.current + e.key;
    const matches = choiceList.filter((c) => String(c).startsWith(typed));
    if (matches.length === 0) return true; // ignore a stray key, keep the buffer
    typedChoiceRef.current = typed;
    if (matches.length === 1 && String(matches[0]) === typed) {
      typedChoiceRef.current = "";
      submitAnswer(matches[0]);
    }
    return true;
  }, choiceKeysActive);
  useEffect(() => { typedChoiceRef.current = ""; }, [currentQ]);

  // Resolve the pinned item (bundle first, then the cloud row) and replace
  // whatever question the session opened with.
  useEffect(() => {
    if (!PINNED_ITEM_ID) return undefined;
    let cancelled = false;
    const apply = (item) => {
      if (cancelled || !item || item.modeId !== mode) return;
      pinnedItemRef.current = item;
      if (session) loadNextQuestion(session);
    };
    const local = getBankItems().find((it) => it.itemId === PINNED_ITEM_ID);
    if (local) apply(local);
    else fetchBankItemById(PINNED_ITEM_ID).then(apply);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoginDismiss = () => {
    telemetryRef.current.recordEvent("login_modal_dismissed");
    setShowLoginPrompt(false);
    sessionStorage.setItem("dismissedLoginPrompt", "true");
  };

  const handleLogin = () => {
    signInWithGoogle();
    setShowLoginPrompt(false);
  };

  // Nesting (§16): while the first question loads, the question card is
  // already present and fills with Ink-tint blocks in the real card's shape —
  // no layout shift, no spinner, nothing that looks broken while thinking.
  if (!currentQ) {
    return (
      <main className={`flex-1 ${theme.playBg} flex flex-col`}>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-[0_6px_0_#14231F0f] p-7 flex flex-col gap-4">
            <div className="skeleton-block h-6 w-3/4" />
            <div className="skeleton-block h-10" />
            <div className="flex gap-3">
              <div className="skeleton-block h-9 flex-1" />
              <div className="skeleton-block h-9 flex-1" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const modeColor = theme.modeColors[mode];
  const ModeIcon = getModeIcon(mode);
  // Calm mode is the parent-facing switch for the same behavior the OS-level
  // reduced-motion setting drives: no confetti, no shake, star stays.
  const lowMotionMode = Boolean(prefersReducedMotion) || calmMode;
  // "choice" (multiple-choice bubbles) is the default; the dev flag or an item's
  // own answerType selects a different input control via the dispatch below.
  const answerType = forcedInputType || currentQ.answerType || "choice";

  return (
    <MotionConfig reducedMotion={lowMotionMode ? "always" : "never"}>
      <main className={`flex-1 ${theme.playBg} flex flex-col`}>
      <header className="no-print flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`${modeColor} p-2 rounded-xl`}>
            <ModeIcon className="h-6 w-6 text-ink" />
          </div>
          <h1 className={`text-xl font-display font-semibold ${theme.textPrimary}`}>{getModeLabel(mode)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            className={`p-2 rounded-xl ${theme.cardBg} shadow cursor-pointer`}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <Feather name="soundOff" size={20} className={theme.textSecondary} label="sound off" />
            ) : (
              <Feather name="soundOn" size={20} className={theme.textSecondary} label="sound on" />
            )}
          </motion.button>
          <motion.button
            className={`p-2 rounded-xl ${theme.cardBg} shadow cursor-pointer`}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSettings(true)}
          >
            <Feather name="settings" size={24} className={theme.textSecondary} label="settings" />
          </motion.button>
        </div>
      </header>

      <CircularProgress
        current={session.questionsAnswered}
        total={session.sessionSize}
        level={session.level}
      />

      {fledgingActive && (
        <div className="flex justify-center -mt-1 mb-1">
          <span className="bg-seafoam text-ink text-[13px] font-display font-semibold rounded-full px-3 py-1">
            Fledging Flight · {FLEDGING_PASS} of {FLEDGING_QUESTIONS} to pass
          </span>
        </div>
      )}

      {session.correctStreak >= 3 && (
        <motion.div
          className="flex items-center justify-center gap-1 -mt-1 mb-1"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          key={session.correctStreak}
        >
          <Feather name="streak" size={16} className="text-sun" />
          <span className="text-xs font-bold text-ember">
            {session.correctStreak} streak!
          </span>
          <Feather name="streak" size={16} className="text-sun" />
        </motion.div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
        <QuestionStage
          question={currentQ}
          questionKey={questionKeyRef.current}
          theme={theme}
          modeColor={modeColor}
          feedback={feedback}
          revealAnswer={revealAnswer}
          shakenChoice={shakenChoice}
          isRetry={isRetry}
          answerType={answerType}
          lowMotionMode={lowMotionMode}
          lowEndDevice={lowEndDevice}
          numericChoices={numericChoices}
          onSubmit={submitAnswer}
          qaSeq={QA_HOOKS ? window.__kidmathQA?.seq ?? 0 : null}
        />

        {feedback === "wrong" && revealAnswer !== null && (
          <motion.p
            className="text-center text-lg font-bold text-deep-teal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            The answer is {revealAnswer}!
          </motion.p>
        )}

        <StarRow count={session.firstTryCorrect} />
      </div>

      <AnimatePresence>
        {showLevelUp && <LevelUpToast />}
      </AnimatePresence>

      <AnimatePresence>
        {fledgingOffer && !showComplete && (
          <FledgingOffer
            level={session.level}
            onAccept={startFledgingFlight}
            onDecline={() => setFledgingOffer(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fledgingResult && (
          <FledgingCeremony
            passed={fledgingResult.passed}
            level={fledgingResult.newLevel}
            onContinue={() => {
              setFledgingResult(null);
              startNewSession(undefined, undefined, { offer: false });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            mode={mode}
            allowWordProblems={allowWordProblems}
            onAllowWordProblemsChange={handleAllowWordProblemsChange}
            calmMode={calmMode}
            onCalmModeChange={(value) => {
              setCalmMode(value);
              saveCalmMode(value);
            }}
            onModeChange={handleModeChange}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComplete &&
          (gamFlightReport && flightPayout ? (
            <FlightReport
              payout={flightPayout}
              total={session.questionsAnswered}
              level={session.level}
              engagement={engagement}
              nomination={gamFledging ? engagement?.nomination ?? null : null}
              lifetimeStars={lifetimeStars}
              lowMotionMode={lowMotionMode}
              onPlayAgain={() => startNewSession()}
            />
          ) : (
            <SetCompleteOverlay
              firstTryCorrect={session.firstTryCorrect}
              retriesMastered={session.retriesMastered}
              total={session.questionsAnswered}
              level={session.level}
              lifetimeStars={lifetimeStars}
              engagement={engagement}
              lowMotionMode={lowMotionMode}
              onPlayAgain={() => startNewSession()}
            />
          ))}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginPrompt && (
          <LoginPromptModal onLogin={handleLogin} onDismiss={handleLoginDismiss} />
        )}
      </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
