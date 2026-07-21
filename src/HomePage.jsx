import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Rocket,
  Star,
  Sparkles,
  Plus,
  Minus,
  X,
  Divide,
  ArrowLeftRight,
  Hash,
  FastForward,
  Layers,
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
  Settings,
  MousePointerClick,
  Trophy,
  FileText,
  Heart,
} from "lucide-react";
import { Lock as LockIcon } from "lucide-react";
import { useTheme } from "./useTheme";
import { MODE_IDS, MODE_GROUPS, getModeConfig } from "./modes";
import { usePremium } from "./PremiumContext";
import { isFreeMode } from "./premium";

const ICON_MAP = { Plus, Minus, X, Divide, ArrowLeftRight, Hash, FastForward, Layers, PieChart, Percent, GitFork, BarChart3, CircleDot, Sigma, Ruler, Coins, Spline, Scale, Clock, ChartColumn, Triangle, Shapes };

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5, ease: "easeOut" },
};

const MODE_COUNT = MODE_IDS.length;

// Stable colour index per mode so a card keeps its colour across renders.
const COLOR_INDEX = Object.fromEntries(MODE_IDS.map((id, i) => [id, i]));

const STEPS = [
  {
    icon: Settings,
    title: "Pick your math type",
    desc: `Choose from ${MODE_COUNT} math skills \u2014 difficulty adapts to you!`,
  },
  {
    icon: MousePointerClick,
    title: "Tap the right answer",
    desc: "Big, colorful bubble buttons make it easy to play on any device.",
  },
  {
    icon: Trophy,
    title: "Earn stars & level up",
    desc: "Collect gold stars for correct answers and level up as you improve!",
  },
];

export default function HomePage() {
  const { isPremium, loading: premiumLoading, openPaywall } = usePremium();
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    <main className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 text-center">
        <motion.div
          className="absolute top-10 left-[10%] text-yellow-400 opacity-60"
          animate={{ y: [0, -12, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Star className="h-10 w-10 fill-yellow-300" />
        </motion.div>
        <motion.div
          className="absolute top-20 right-[12%] text-pink-400 opacity-50"
          animate={{ y: [0, 14, 0], rotate: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <Sparkles className="h-8 w-8" />
        </motion.div>
        <motion.div
          className="absolute bottom-12 left-[20%] text-orange-400 opacity-50"
          animate={{ y: [0, -10, 0], x: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <Rocket className="h-9 w-9 -rotate-45" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-2xl mx-auto"
        >
          <div className={`inline-flex items-center gap-2 ${theme.cardBg} backdrop-blur rounded-full px-4 py-1.5 mb-6 shadow-sm`}>
            <span className="text-lg">{theme.emoji}</span>
            <span className={`text-sm font-semibold ${theme.textSecondary}`}>
              Free math practice for K-5
            </span>
          </div>
          <h1 className={`text-5xl sm:text-6xl font-extrabold ${theme.textPrimary} leading-tight`}>
            Kid Math{" "}
            <span className={`bg-gradient-to-r ${theme.heroGradient} bg-clip-text text-transparent`}>
              Explorer
            </span>
          </h1>
          <p className={`mt-4 text-lg sm:text-xl ${theme.textSecondary} max-w-md mx-auto`}>
            Make math your superpower! {MODE_COUNT} skills from counting to
            fractions, decimals, and shapes — with fun animations and star rewards.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              className={`px-8 py-4 bg-gradient-to-r ${theme.ctaPrimary} text-white text-xl font-bold rounded-2xl shadow-lg cursor-pointer`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                document.getElementById("modes")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Pick a Game
            </motion.button>
            <motion.button
              className={`px-6 py-4 ${theme.ctaSecondary} backdrop-blur text-lg font-bold rounded-2xl shadow border cursor-pointer`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/play")}
            >
              Quick Start
            </motion.button>
            <motion.button
              className={`px-6 py-4 ${theme.ctaSecondary} backdrop-blur text-lg font-bold rounded-2xl shadow border cursor-pointer`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/worksheets")}
            >
              Print a Worksheet
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Pick a game — grouped so kids can find a skill fast */}
      <section id="modes" className="px-4 py-16 max-w-5xl mx-auto">
        <motion.h2
          className={`text-3xl font-extrabold ${theme.textPrimary} text-center mb-2`}
          {...fadeUp}
        >
          Pick a Game
        </motion.h2>
        <motion.p
          className={`text-center ${theme.textSecondary} mb-10`}
          {...fadeUp}
        >
          {MODE_COUNT} skills, grouped by topic — tap any one to start.
        </motion.p>

        <div className="space-y-10">
          {MODE_GROUPS.map((group) => (
            <motion.div key={group.id} {...fadeUp}>
              <div className="flex items-baseline justify-between gap-3 mb-3 px-1">
                <h3 className={`text-xl font-extrabold ${theme.textPrimary}`}>
                  {group.title}
                </h3>
                <span className={`text-xs font-bold ${theme.textMuted} whitespace-nowrap`}>
                  {group.gradeHint}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {group.modeIds.map((id) => {
                  const config = getModeConfig(id);
                  const Icon = ICON_MAP[config.icon] || Plus;
                  const card =
                    theme.featureCards[COLOR_INDEX[id] % theme.featureCards.length];
                  const locked = !isFreeMode(id) && !isPremium && !premiumLoading;
                  return (
                    <motion.button
                      key={id}
                      type="button"
                      className={`relative ${card.bg} rounded-3xl p-5 text-center shadow-sm cursor-pointer min-h-[140px] flex flex-col items-center justify-start`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => (locked ? openPaywall() : navigate(`/play/${id}`))}
                      aria-label={locked ? `${config.shortLabel} (Premium)` : `Play ${config.shortLabel}`}
                    >
                      {locked && (
                        <span
                          className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/85 shadow"
                          aria-hidden="true"
                        >
                          <LockIcon className={`h-3.5 w-3.5 ${theme.textMuted}`} />
                        </span>
                      )}
                      <div
                        className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} shadow-md mb-3`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h4 className={`text-base font-extrabold ${theme.textPrimary}`}>
                        {config.shortLabel}
                      </h4>
                      <p className={`mt-1 text-xs ${theme.textSecondary} leading-relaxed`}>
                        {config.description}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-16 bg-white/30">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            className={`text-3xl font-extrabold ${theme.textPrimary} text-center mb-10`}
            {...fadeUp}
          >
            How It Works
          </motion.h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.title}
                  className="text-center"
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: i * 0.15 }}
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${theme.stepBg} mb-3`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className={`text-xs font-bold ${theme.stepLabel} uppercase tracking-wide mb-1`}>
                    Step {i + 1}
                  </div>
                  <h3 className={`text-lg font-extrabold ${theme.textPrimary}`}>
                    {s.title}
                  </h3>
                  <p className={`mt-1 text-sm ${theme.textSecondary}`}>{s.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Worksheet callout */}
      <section className="px-4 py-16 max-w-3xl mx-auto">
        <motion.div
          className={`bg-gradient-to-br ${theme.worksheetCallout} rounded-3xl p-8 sm:p-10 text-center shadow-sm`}
          {...fadeUp}
        >
          <FileText className={`h-10 w-10 ${theme.worksheetCalloutIcon} mx-auto mb-4`} />
          <h2 className={`text-2xl font-extrabold ${theme.textPrimary}`}>
            Printable Worksheets
          </h2>
          <p className={`mt-2 ${theme.textSecondary} max-w-md mx-auto`}>
            Generate kid-friendly practice sheets with playful icons, choose the
            number of problems, and print them out -- answer key included!
          </p>
          <motion.button
            className={`mt-6 px-6 py-3 bg-gradient-to-r ${theme.worksheetCalloutBtn} text-white font-bold text-lg rounded-2xl shadow-lg cursor-pointer`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/worksheets")}
          >
            Create a Worksheet
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={`px-4 py-8 text-center border-t ${theme.bg}`}>
        <button
          className={`mb-3 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${theme.ctaSecondary}`}
          onClick={() => navigate("/about")}
        >
          Why this works
        </button>
        <p className={`text-sm ${theme.textMuted} flex items-center justify-center gap-1`}>
          Made with <Heart className="h-4 w-4 text-red-400 fill-red-400" /> for
          young math explorers
        </p>
      </footer>
    </main>
  );
}
