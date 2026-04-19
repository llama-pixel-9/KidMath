import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import {
  createAdaptiveSession,
  getNextQuestion,
  recordAnswer,
  isSessionComplete,
  MODES,
} from "./mathEngine";
import { getModeConfig } from "./modes";
import { saveProgress, loadProgress, mergeLocalToCloud } from "./progressStore";
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

const ICON_MAP = { Plus, Minus, X, Divide, ArrowLeftRight, Hash, FastForward, Layers };

function getModeIcon(modeId) {
  const config = getModeConfig(modeId);
  return ICON_MAP[config.icon] || Plus;
}

function getModeLabel(modeId) {
  return getModeConfig(modeId).label;
}

const WORD_PROBLEM_PREF_KEY = "kidmath-allow-word-problems";

function loadAllowWordProblemsPreference() {
  try {
    const raw = localStorage.getItem(WORD_PROBLEM_PREF_KEY);
    if (raw == null) return false;
    return raw === "true";
  } catch {
    return false;
  }
}

function saveAllowWordProblemsPreference(value) {
  try {
    localStorage.setItem(WORD_PROBLEM_PREF_KEY, String(value));
  } catch {
    // Ignore localStorage issues and keep runtime preference.
  }
}

const CONFETTI_PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const distance = 70 + (i % 4) * 12;
  return {
    id: i,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    color: ["bg-yellow-400", "bg-pink-400", "bg-sky-400", "bg-lime-400", "bg-violet-400", "bg-orange-400"][i % 6],
    size: 10 + (i % 3) * 3,
  };
});

const LEVEL_RING_COLORS = [
  "stroke-sky-300",
  "stroke-sky-400",
  "stroke-teal-400",
  "stroke-emerald-400",
  "stroke-lime-400",
  "stroke-yellow-400",
  "stroke-amber-400",
  "stroke-orange-400",
  "stroke-red-400",
  "stroke-pink-500",
];

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

async function persistSession(mode, session) {
  await saveProgress(mode, {
    level: session.level,
    mistakeBank: session.mistakeBank,
    firstTryCorrect: session.firstTryCorrect,
    bankItemStats: session.bankItemStats || {},
    recentBankItemIds: session.recentBankItemIds || [],
  });
  const progress = await loadProgress(mode);
  return progress.lifetimeStars;
}

function ConfettiBurst({ intensity = "normal" }) {
  const particles = intensity === "light" ? CONFETTI_PARTICLES.slice(0, 6) : CONFETTI_PARTICLES;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.color}`}
          style={{ width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.2 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function CircularProgress({ current, total, level }) {
  const { theme } = useTheme();
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? current / total : 0;
  const dashOffset = circumference * (1 - progress);
  const ringColor = LEVEL_RING_COLORS[Math.min(level - 1, 9)];

  return (
    <section className="flex items-center justify-center gap-3 py-2 px-4" aria-label="Progress">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            className="stroke-gray-200"
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
        className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${theme.ctaPrimary} text-white text-sm font-bold shadow`}
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
          <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
        </motion.div>
      ))}
    </section>
  );
}

function LevelUpToast() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3"
        initial={{ scale: 0, y: 30 }}
        animate={{ scale: [0, 1.3, 1], y: 0 }}
        exit={{ scale: 0, y: -30, opacity: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <Zap className="h-8 w-8" />
        <span className="text-2xl font-extrabold">Level Up!</span>
        <Zap className="h-8 w-8" />
      </motion.div>
    </motion.div>
  );
}

function SetCompleteOverlay({ firstTryCorrect, retriesMastered, total, level, lifetimeStars, onPlayAgain }) {
  const { theme } = useTheme();
  const ratio = total > 0 ? firstTryCorrect / total : 0;

  let subtitle = "Great job practicing!";
  if (ratio >= 0.9) subtitle = "Amazing — you're a math superstar!";
  else if (ratio >= 0.7) subtitle = "Awesome work — you're getting stronger!";
  else if (ratio >= 0.5) subtitle = "Nice effort — keep practicing!";
  else subtitle = "Great job sticking with it!";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
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
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.4, 1] }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Trophy className="h-16 w-16 text-yellow-500 fill-yellow-400 mx-auto" />
        </motion.div>
        <h2 className={`text-3xl font-extrabold ${theme.textPrimary} mt-4`}>
          {theme.completeMsg}
        </h2>
        <p className={`text-lg ${theme.textSecondary} mt-2`}>
          You earned{" "}
          <span className="font-bold text-yellow-600">{firstTryCorrect}</span>{" "}
          {firstTryCorrect === 1 ? "star" : "stars"}!
        </p>
        <p className={`text-sm ${theme.textMuted} mt-1`}>{subtitle}</p>
        {retriesMastered > 0 && (
          <motion.p
            className="text-sm font-bold text-emerald-600 mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            You mastered {retriesMastered} tricky {retriesMastered === 1 ? "one" : "ones"} today!
          </motion.p>
        )}
        <p className={`text-xs ${theme.textMuted} mt-1`}>
          Reached Level {level}
        </p>
        <div className="flex justify-center gap-1 mt-3 flex-wrap">
          {Array.from({ length: Math.min(firstTryCorrect, 15) }, (_, i) => (
            <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
          ))}
        </div>
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
        <motion.button
          className={`mt-6 px-8 py-3 bg-gradient-to-r ${theme.ctaPrimary} text-white text-xl font-bold rounded-2xl shadow-lg cursor-pointer`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlayAgain}
        >
          Play Again!
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function SettingsPanel({ mode, allowWordProblems, onAllowWordProblemsChange, onModeChange, onClose }) {
  const { theme } = useTheme();
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm"
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
                    active ? theme.selectedBorder : `${theme.cardBorder} bg-white hover:bg-gray-50`
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

        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <p className={`text-sm font-bold ${theme.textPrimary}`}>Allow Word Problems</p>
            <p className={`text-xs ${theme.textMuted}`}>
              Story questions for stronger readers.
            </p>
          </div>
          <button
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
              allowWordProblems ? "bg-emerald-400" : "bg-gray-300"
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

        <motion.button
          className={`w-full py-3 bg-gradient-to-r ${theme.ctaPrimary} text-white font-bold text-lg rounded-2xl shadow-lg cursor-pointer`}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
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
          <Sparkles className="h-10 w-10 text-yellow-500" />
          <Trophy className="h-10 w-10 text-yellow-500 fill-yellow-400" />
          <Sparkles className="h-10 w-10 text-yellow-500" />
        </div>
        <h2 className={`text-2xl font-extrabold ${theme.textPrimary}`}>
          You're doing amazing!
        </h2>
        <p className={`${theme.textSecondary} mt-2 text-lg`}>
          Want to save your stars and track your progress?
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <motion.button
            className={`flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r ${theme.worksheetCalloutBtn} text-white font-bold text-lg rounded-2xl shadow-lg cursor-pointer`}
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

function AnswerSlot({ feedback, revealAnswer }) {
  if (feedback === "correct" && revealAnswer != null) {
    return (
      <motion.span
        className="text-emerald-500"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: [0, 1.4, 1], rotate: 0 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
      >
        {revealAnswer}
      </motion.span>
    );
  }
  if (feedback === "wrong" && revealAnswer != null) {
    return (
      <motion.span
        className="text-emerald-500"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {revealAnswer}
      </motion.span>
    );
  }
  return <span className="text-amber-400">?</span>;
}

function QuestionDisplay({ question, modeColor, feedback, revealAnswer }) {
  const { theme } = useTheme();
  const q = question;
  const showAnswer = feedback && revealAnswer != null;

  if (q.display?.emoji) {
    const items = Array.from({ length: q.display.count }, (_, i) => (
      <span key={i} className="text-3xl sm:text-4xl">{q.display.emoji}</span>
    ));
    return (
      <div className="text-center">
        <p className={`text-sm font-bold ${theme.textMuted} mb-3 uppercase tracking-wide`}>How many?</p>
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-[280px] mx-auto">
          {items}
        </div>
      </div>
    );
  }

  if (q.display?.sequence) {
    return (
      <div className="text-center">
        <p className={`text-sm font-bold ${theme.textMuted} mb-3 uppercase tracking-wide`}>What comes next?</p>
        <div className={`flex items-center justify-center gap-2 text-3xl sm:text-4xl font-extrabold ${theme.textPrimary}`}>
          {q.display.sequence.map((n, i) => (
            <span key={i}>
              {i > 0 && <span className={`${theme.textMuted} mx-1`}>,</span>}
              {n}
            </span>
          ))}
          <span className={`${theme.textMuted} mx-1`}>,</span>
          <AnswerSlot feedback={feedback} revealAnswer={revealAnswer} />
        </div>
      </div>
    );
  }

  if (q.display?.promptText) {
    const promptLines = q.display.promptText
      .split(/(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const isStoryProblem = q.metadata?.itemFamily === "application";
    return (
      <div className="text-center space-y-2">
        {isStoryProblem && (
          <p className={`text-xs sm:text-sm font-bold uppercase tracking-wide ${theme.textMuted}`}>
            Story problem
          </p>
        )}
        <div className="space-y-1">
          {(promptLines.length > 0 ? promptLines : [q.display.promptText]).map((line, index, arr) => (
            <p
              key={`${line}-${index}`}
              className={`${
                index === arr.length - 1 ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
              } font-extrabold ${theme.textPrimary} leading-snug`}
            >
              {line}
            </p>
          ))}
        </div>
        {showAnswer && (
          <div className="mt-2 text-4xl sm:text-5xl font-extrabold">
            <AnswerSlot feedback={feedback} revealAnswer={revealAnswer} />
          </div>
        )}
      </div>
    );
  }

  if (q.op === "?") {
    return (
      <div className={`flex items-center justify-center gap-4 text-5xl sm:text-6xl font-extrabold ${theme.textPrimary}`}>
        <span>{q.a}</span>
        <span
          className={`${modeColor} text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-3xl sm:text-4xl`}
        >
          {showAnswer ? <AnswerSlot feedback={feedback} revealAnswer={revealAnswer} /> : "?"}
        </span>
        <span>{q.b}</span>
      </div>
    );
  }

  // Vertical form for addition/subtraction with double-digit numbers
  const isVertical = (q.op === "+" || q.op === "−") && (q.a >= 10 || q.b >= 10);

  if (isVertical) {
    const aDigits = String(q.a).split("");
    const bDigits = String(q.b).split("");
    const ansLen = String(q.answer).length;
    const maxLen = Math.max(aDigits.length, bDigits.length, ansLen);
    const cols = maxLen + 1; // +1 for operator column
    const padA = cols - aDigits.length;
    const padB = cols - bDigits.length - 1; // -1 because operator takes first cell

    return (
      <div className="flex justify-center">
        <div
          className={`inline-grid items-center justify-items-center font-extrabold ${theme.textPrimary}`}
          style={{
            gridTemplateColumns: `repeat(${cols}, 0.75em)`,
            fontSize: "clamp(2.5rem, 8vw, 3.5rem)",
            lineHeight: 1.4,
          }}
        >
          {Array.from({ length: padA }, (_, i) => <span key={`pa${i}`} />)}
          {aDigits.map((d, i) => <span key={`a${i}`}>{d}</span>)}

          <span className="text-[0.85em]">{q.op}</span>
          {Array.from({ length: padB }, (_, i) => <span key={`pb${i}`} />)}
          {bDigits.map((d, i) => <span key={`b${i}`}>{d}</span>)}

          <span className="border-b-4 border-slate-400 w-full my-1" style={{ gridColumn: "1 / -1" }} />

          {showAnswer ? (
            <>
              {Array.from({ length: cols - String(revealAnswer).length }, (_, i) => <span key={`pans${i}`} />)}
              {String(revealAnswer).split("").map((d, i) => (
                <motion.span
                  key={`ans${i}`}
                  className="text-emerald-500"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: [0, 1.4, 1], rotate: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4, type: "spring", stiffness: 300 }}
                >
                  {d}
                </motion.span>
              ))}
            </>
          ) : (
            <>
              {Array.from({ length: cols - 1 }, (_, i) => <span key={`pq${i}`} />)}
              <span className="text-amber-400">?</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // Default horizontal: a op b = ?
  return (
    <div className={`flex items-center justify-center gap-3 text-5xl sm:text-6xl font-extrabold ${theme.textPrimary}`}>
      <span>{q.a}</span>
      <span
        className={`${modeColor} text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-3xl sm:text-4xl`}
      >
        {q.op}
      </span>
      <span>{q.b}</span>
      <span className={theme.textMuted}>=</span>
      <AnswerSlot feedback={feedback} revealAnswer={revealAnswer} />
    </div>
  );
}

export default function MathExplorer({ initialMode }) {
  const startMode = initialMode || "addition";
  const { theme } = useTheme();
  const { user, signInWithGoogle } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [lowEndDevice] = useState(() => isLikelyLowEndDevice());
  const [mode, setMode] = useState(startMode);
  const [session, setSession] = useState(() =>
    createAdaptiveSession(startMode, undefined, {
      allowWordProblems: loadAllowWordProblemsPreference(),
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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const [allowWordProblems, setAllowWordProblems] = useState(() => loadAllowWordProblemsPreference());
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

  const loadNextQuestion = useCallback((sess) => {
    const { question, isRetry: retry } = getNextQuestion(sess);
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

  const startNewSession = useCallback((m, allowWordProblemsOverride = allowWordProblems) => {
    clearQueuedTimeouts();
    answerLockRef.current = false;
    const newSession = createAdaptiveSession(m || mode, undefined, {
      allowWordProblems: allowWordProblemsOverride,
    });
    setSession(newSession);
    setFeedback(null);
    setRevealAnswer(null);
    setShowComplete(false);
    loadNextQuestion(newSession);
  }, [mode, allowWordProblems, loadNextQuestion, clearQueuedTimeouts]);

  useEffect(() => {
    loadNextQuestion(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await mergeLocalToCloud(user.id);
      const saved = await loadProgress(mode);
      const newSession = createAdaptiveSession(mode, undefined, { allowWordProblems });
      newSession.level = saved.level;
      newSession.mistakeBank = saved.mistakeBank;
      setSession(newSession);
      loadNextQuestion(newSession);
    })();
  }, [user, allowWordProblems, mode, loadNextQuestion]);

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
    saveAllowWordProblemsPreference(value);
    startNewSession(mode, value);
  };

  const finishSession = useCallback(async (sess) => {
    const lt = await persistSession(mode, sess);
    setLifetimeStars(lt);
    setShowComplete(true);
    telemetryRef.current.inc("setsCompleted");
    telemetryRef.current.recordEvent("set_complete", { mode, firstTryCorrect: sess.firstTryCorrect });
    playCompleteSound();
  }, [mode]);

  const handleAnswer = (choice) => {
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
      const result = recordAnswer(session, currentQ, choice, responseTimeMs, isRetry);
      setSession(result.session);

      if (result.correct) {
        setFeedback("correct");
        setRevealAnswer(currentQ.answer);

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
        }, 1200);
      } else {
        setFeedback("wrong");
        setShakenChoice(choice);
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
        }, 2000);
      }
    } catch (error) {
      answerLockRef.current = false;
      console.error("Failed to process answer", error);
    }
  };

  const handleLoginDismiss = () => {
    telemetryRef.current.recordEvent("login_modal_dismissed");
    setShowLoginPrompt(false);
    sessionStorage.setItem("dismissedLoginPrompt", "true");
  };

  const handleLogin = () => {
    signInWithGoogle();
    setShowLoginPrompt(false);
  };

  if (!currentQ) return null;

  const modeColor = theme.modeColors[mode];
  const ModeIcon = getModeIcon(mode);
  const lowMotionMode = Boolean(prefersReducedMotion);

  return (
    <MotionConfig reducedMotion={lowMotionMode ? "always" : "never"}>
      <main className={`min-h-screen ${theme.bg} flex flex-col transition-colors duration-300`}>
      <header className="no-print flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`${modeColor} p-2 rounded-xl`}>
            <ModeIcon className="h-6 w-6 text-white" />
          </div>
          <h1 className={`text-xl font-extrabold ${theme.textPrimary}`}>{getModeLabel(mode)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            className={`p-2 rounded-xl ${theme.cardBg} shadow cursor-pointer`}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <VolumeX className={`h-5 w-5 ${theme.textSecondary}`} />
            ) : (
              <Volume2 className={`h-5 w-5 ${theme.textSecondary}`} />
            )}
          </motion.button>
          <motion.button
            className={`p-2 rounded-xl ${theme.cardBg} shadow cursor-pointer`}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSettings(true)}
          >
            <Settings className={`h-6 w-6 ${theme.textSecondary}`} />
          </motion.button>
        </div>
      </header>

      <CircularProgress
        current={session.questionsAnswered}
        total={session.sessionSize}
        level={session.level}
      />

      {session.correctStreak >= 3 && (
        <motion.div
          className="flex items-center justify-center gap-1 -mt-1 mb-1"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          key={session.correctStreak}
        >
          <Zap className="h-4 w-4 text-orange-400" />
          <span className="text-xs font-bold text-orange-500">
            {session.correctStreak} streak!
          </span>
          <Zap className="h-4 w-4 text-orange-400" />
        </motion.div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        <AnimatePresence mode="wait">
          <motion.section
            key={questionKeyRef.current}
            className={`${theme.cardBg} backdrop-blur rounded-3xl shadow-lg p-6 sm:p-8 w-full max-w-sm`}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            aria-label="Math question"
          >
            {isRetry && (
              <p className={`text-center text-xs font-bold ${theme.textMuted} mb-2 uppercase tracking-wide`}>
                Let's try this one again!
              </p>
            )}
            <QuestionDisplay question={currentQ} modeColor={modeColor} feedback={feedback} revealAnswer={revealAnswer} />
          </motion.section>
        </AnimatePresence>

        <section className="grid grid-cols-2 gap-3 w-full max-w-sm" aria-label="Answer choices">
          {currentQ.choices.map((choice, i) => {
            const isCorrectChoice = feedback === "correct" && choice === currentQ.answer;
            const isRevealedCorrect = feedback === "wrong" && choice === revealAnswer;
            const isWrong = shakenChoice === choice;
            return (
              <motion.button
                key={`${questionKeyRef.current}-${choice}`}
                className={`relative min-h-[80px] min-w-[80px] rounded-3xl bg-gradient-to-br ${theme.bubbleColors[i % theme.bubbleColors.length]} text-white text-3xl font-extrabold shadow-lg cursor-pointer select-none ${
                  isCorrectChoice || isRevealedCorrect ? "ring-4 ring-green-400" : ""
                } ${isWrong ? "ring-4 ring-red-400" : ""}`}
                whileHover={lowMotionMode ? undefined : { scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                animate={
                  isWrong
                    ? { x: lowEndDevice ? [0, -6, 6, 0] : [0, -10, 10, -10, 10, 0] }
                    : isCorrectChoice
                      ? { scale: [1, 1.1, 1] }
                      : isRevealedCorrect
                        ? { scale: [1, 1.15, 1.05] }
                        : {}
                }
                transition={isWrong ? { duration: lowEndDevice ? 0.22 : 0.4 } : { duration: 0.3 }}
                onClick={() => handleAnswer(choice)}
                disabled={feedback === "correct" || feedback === "wrong"}
              >
                {choice}
                {isCorrectChoice && !lowMotionMode && (
                  <ConfettiBurst intensity={lowEndDevice ? "light" : "normal"} />
                )}
              </motion.button>
            );
          })}
        </section>

        {feedback === "wrong" && revealAnswer !== null && (
          <motion.p
            className="text-center text-lg font-bold text-emerald-600"
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
        {showSettings && (
          <SettingsPanel
            mode={mode}
            allowWordProblems={allowWordProblems}
            onAllowWordProblemsChange={handleAllowWordProblemsChange}
            onModeChange={handleModeChange}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComplete && (
          <SetCompleteOverlay
            firstTryCorrect={session.firstTryCorrect}
            retriesMastered={session.retriesMastered}
            total={session.questionsAnswered}
            level={session.level}
            lifetimeStars={lifetimeStars}
            onPlayAgain={() => startNewSession()}
          />
        )}
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
