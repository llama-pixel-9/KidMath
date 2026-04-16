import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  X,
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
  MAX_LEVEL,
} from "./mathEngine";
import { saveProgress, loadProgress, mergeLocalToCloud } from "./progressStore";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";
import {
  playCorrectSound,
  playStreakSound,
  playLevelUpSound,
  playWrongSound,
  playCompleteSound,
  isMuted,
  setMuted,
} from "./sounds";

const MODE_ICONS = { addition: Plus, subtraction: Minus, multiplication: X };
const MODE_LABELS = {
  addition: "Addition Fun!",
  subtraction: "Subtraction Quest!",
  multiplication: "Multiply Mania!",
};

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

async function persistSession(mode, session) {
  await saveProgress(mode, {
    level: session.level,
    mistakeBank: session.mistakeBank,
    firstTryCorrect: session.firstTryCorrect,
  });
  const progress = await loadProgress(mode);
  return progress.lifetimeStars;
}

function ConfettiBurst() {
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const distance = 60 + Math.random() * 50;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: ["bg-yellow-400", "bg-pink-400", "bg-sky-400", "bg-lime-400", "bg-violet-400", "bg-orange-400"][i % 6],
      size: 8 + Math.random() * 10,
    };
  });

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

function SettingsPanel({ mode, onModeChange, onClose }) {
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
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const Icon = MODE_ICONS[m];
              const active = m === mode;
              return (
                <motion.button
                  key={m}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 cursor-pointer transition-colors ${
                    active ? theme.selectedBorder : `${theme.cardBorder} bg-white hover:bg-gray-50`
                  }`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onModeChange(m)}
                >
                  <Icon className={`h-7 w-7 ${active ? theme.selectedIcon : theme.textMuted}`} />
                  <span className={`text-xs font-bold capitalize ${active ? theme.selectedText : theme.textSecondary}`}>
                    {m}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <p className={`text-xs ${theme.textMuted} text-center mb-4`}>
          Difficulty adjusts automatically based on how you play!
        </p>

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

export default function MathExplorer() {
  const { theme } = useTheme();
  const { user, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState("addition");
  const [session, setSession] = useState(() => createAdaptiveSession("addition"));
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
  const questionStartTime = useRef(Date.now());
  const loginTimerRef = useRef(null);
  const questionKeyRef = useRef(0);

  const loadNextQuestion = useCallback((sess) => {
    const { question, isRetry: retry } = getNextQuestion(sess);
    setCurrentQ(question);
    setIsRetry(retry);
    questionStartTime.current = Date.now();
    questionKeyRef.current += 1;
  }, []);

  const startNewSession = useCallback((m) => {
    const newSession = createAdaptiveSession(m || mode);
    setSession(newSession);
    setFeedback(null);
    setRevealAnswer(null);
    setShowComplete(false);
    loadNextQuestion(newSession);
  }, [mode, loadNextQuestion]);

  useEffect(() => {
    loadNextQuestion(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await mergeLocalToCloud(user.id);
      const saved = await loadProgress(mode);
      const newSession = createAdaptiveSession(mode);
      newSession.level = saved.level;
      newSession.mistakeBank = saved.mistakeBank;
      setSession(newSession);
      loadNextQuestion(newSession);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user) return;
    const dismissed = sessionStorage.getItem("dismissedLoginPrompt");
    if (dismissed) return;
    loginTimerRef.current = setTimeout(() => {
      setShowLoginPrompt(true);
    }, 10 * 60 * 1000);
    return () => clearTimeout(loginTimerRef.current);
  }, [user]);

  const handleModeChange = (m) => {
    setMode(m);
    startNewSession(m);
  };

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  const finishSession = useCallback(async (sess) => {
    const lt = await persistSession(mode, sess);
    setLifetimeStars(lt);
    setShowComplete(true);
    playCompleteSound();
  }, [mode]);

  const handleAnswer = (choice) => {
    if (feedback === "correct" || feedback === "wrong") return;

    const responseTimeMs = Date.now() - questionStartTime.current;
    const result = recordAnswer(session, currentQ, choice, responseTimeMs, isRetry);
    setSession(result.session);

    if (result.correct) {
      setFeedback("correct");

      if (result.levelChanged && result.newLevel > session.level) {
        playLevelUpSound();
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 1200);
      } else if (result.session.correctStreak >= 3) {
        playStreakSound();
      } else {
        playCorrectSound();
      }

      setTimeout(() => {
        if (isSessionComplete(result.session)) {
          finishSession(result.session);
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

      setTimeout(() => {
        setFeedback(null);
        setShakenChoice(null);
        setRevealAnswer(null);

        if (isSessionComplete(result.session)) {
          finishSession(result.session);
        } else {
          loadNextQuestion(result.session);
        }
      }, 2000);
    }
  };

  const handleLoginDismiss = () => {
    setShowLoginPrompt(false);
    sessionStorage.setItem("dismissedLoginPrompt", "true");
  };

  const handleLogin = () => {
    signInWithGoogle();
    setShowLoginPrompt(false);
  };

  if (!currentQ) return null;

  const modeColor = theme.modeColors[mode];
  const ModeIcon = MODE_ICONS[mode];

  return (
    <main className={`min-h-screen ${theme.bg} flex flex-col transition-colors duration-300`}>
      <header className="no-print flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`${modeColor} p-2 rounded-xl`}>
            <ModeIcon className="h-6 w-6 text-white" />
          </div>
          <h1 className={`text-xl font-extrabold ${theme.textPrimary}`}>{MODE_LABELS[mode]}</h1>
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
            <div className={`flex items-center justify-center gap-3 text-5xl sm:text-6xl font-extrabold ${theme.textPrimary}`}>
              <span>{currentQ.a}</span>
              <span
                className={`${modeColor} text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-3xl sm:text-4xl`}
              >
                {currentQ.op}
              </span>
              <span>{currentQ.b}</span>
              <span className={theme.textMuted}>=</span>
              <span className="text-amber-400">?</span>
            </div>
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
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                animate={
                  isWrong
                    ? { x: [0, -10, 10, -10, 10, 0] }
                    : isCorrectChoice
                      ? { scale: [1, 1.1, 1] }
                      : isRevealedCorrect
                        ? { scale: [1, 1.15, 1.05] }
                        : {}
                }
                transition={isWrong ? { duration: 0.4 } : { duration: 0.3 }}
                onClick={() => handleAnswer(choice)}
                disabled={feedback === "correct" || feedback === "wrong"}
              >
                {choice}
                {isCorrectChoice && <ConfettiBurst />}
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
  );
}
