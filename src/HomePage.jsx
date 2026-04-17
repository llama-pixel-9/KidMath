import { motion } from "framer-motion";
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
  Settings,
  MousePointerClick,
  Trophy,
  FileText,
  Heart,
} from "lucide-react";
import { useTheme } from "./useTheme";
import { MODE_IDS, getModeConfig } from "./modes";

const ICON_MAP = { Plus, Minus, X, Divide, ArrowLeftRight, Hash, FastForward, Layers };

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5, ease: "easeOut" },
};

const FEATURES = MODE_IDS.map((id) => {
  const config = getModeConfig(id);
  return {
    id,
    icon: ICON_MAP[config.icon] || Plus,
    title: config.shortLabel,
    desc: config.description,
  };
});

const STEPS = [
  {
    icon: Settings,
    title: "Pick your math type",
    desc: "Choose from 8 different math skills \u2014 difficulty adapts to you!",
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

export default function HomePage({ onNavigate }) {
  const { theme } = useTheme();

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
            Make math your superpower! 8 skills from counting to place value,
            with fun animations and star rewards.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              className={`px-8 py-4 bg-gradient-to-r ${theme.ctaPrimary} text-white text-xl font-bold rounded-2xl shadow-lg cursor-pointer`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate("game")}
            >
              Start Playing
            </motion.button>
            <motion.button
              className={`px-6 py-4 ${theme.ctaSecondary} backdrop-blur text-lg font-bold rounded-2xl shadow border cursor-pointer`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate("worksheet")}
            >
              Print a Worksheet
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 max-w-5xl mx-auto">
        <motion.h2
          className={`text-3xl font-extrabold ${theme.textPrimary} text-center mb-10`}
          {...fadeUp}
        >
          8 Ways to Practice
        </motion.h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const card = theme.featureCards[i % theme.featureCards.length];
            return (
              <motion.div
                key={f.title}
                className={`${card.bg} rounded-3xl p-5 text-center shadow-sm cursor-pointer`}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.06 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate("game", f.id)}
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} shadow-md mb-3`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className={`text-base font-extrabold ${theme.textPrimary}`}>
                  {f.title}
                </h3>
                <p className={`mt-1 text-xs ${theme.textSecondary} leading-relaxed`}>
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
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
            onClick={() => onNavigate("worksheet")}
          >
            Create a Worksheet
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={`px-4 py-8 text-center border-t ${theme.bg}`}>
        <button
          className={`mb-3 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${theme.ctaSecondary}`}
          onClick={() => onNavigate("about")}
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
