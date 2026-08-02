import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
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
import Feather from "./components/feather.jsx";
import { useState } from "react";
import { useTheme } from "./useTheme";
import LarkMark from "./components/LarkMark";
import { MODE_IDS, MODE_GROUPS, getModeConfig } from "./modes";
import { loadProgressSync } from "./progressStore";
import { loadEngagement, starBalance, currentStreak, starsToday } from "./engagement/engagementStore";
import EngagementBar from "./engagement/EngagementBar.jsx";
import StickerBook from "./engagement/StickerBook.jsx";
import GrownUpsPanel from "./engagement/GrownUpsPanel.jsx";
import { rankForLevel } from "./engagement/ranks.js";
import { usePremium } from "./PremiumContext";
import { useAuth } from "./useAuth";
import { isFreeMode } from "./premium";

const ICON_MAP = { Plus, Minus, X, Divide, ArrowLeftRight, Hash, FastForward, Layers, PieChart, Percent, GitFork, BarChart3, CircleDot, Sigma, Ruler, Coins, Spline, Scale, Clock, ChartColumn, Triangle, Shapes };

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5, ease: "easeOut" },
};

const MODE_COUNT = MODE_IDS.length;

// Stable colour index per mode so a card keeps its tint across renders.
// The aviary rule: the four tile tints alternate in reading order.
const COLOR_INDEX = Object.fromEntries(MODE_IDS.map((id, i) => [id, i]));

// The four answer-surface tints with their bottom edges — same physics as an
// answer tile, so a game card is obviously tappable.
const CARD_TINTS = [
  { bg: "bg-seafoam", edge: "shadow-[0_5px_0_#7FCFBE]" },
  { bg: "bg-apricot", edge: "shadow-[0_5px_0_#F0A47A]" },
  { bg: "bg-teal-mid", edge: "shadow-[0_5px_0_#3E9E8E]" },
  { bg: "bg-sun-light", edge: "shadow-[0_5px_0_#E8895A]" },
];

// The standard larkit button: flat Lark Teal over a Deep Teal edge.
const BTN_PRIMARY =
  "px-8 h-14 bg-teal text-cream font-display font-semibold text-xl rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer";
const BTN_SECONDARY =
  "px-6 h-14 bg-white text-teal font-display font-semibold text-lg rounded-[18px] shadow-[0_5px_0_#14231F1a] [--press-edge:#14231F1a] btn-press cursor-pointer";

const STEPS = [
  {
    icon: Settings,
    title: "Pick your math type",
    desc: `Choose from ${MODE_COUNT} math skills — difficulty adapts to you!`,
  },
  {
    icon: MousePointerClick,
    title: "Tap the right answer",
    desc: "Big, friendly answer tiles make it easy to play on any device.",
  },
  {
    icon: Trophy,
    title: "Earn stars & level up",
    desc: "Collect stars for correct answers and level up as you improve!",
  },
];

// §14: one greeting line above the aviary — time of day, first name when we
// know it, and the star balance. No exclamation stacking, no streak pressure.
function greetingLine(user, balance) {
  const hour = new Date().getHours();
  const dayPart = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const first = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0];
  const who = first ? `, ${first}` : "";
  const stars = balance > 0 ? ` — ${balance} ${balance === 1 ? "star" : "stars"} in the nest.` : " — pick a game.";
  return `${dayPart}${who}${stars}`;
}

export default function HomePage() {
  const { isPremium, loading: premiumLoading, openPaywall } = usePremium();
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [stickersOpen, setStickersOpen] = useState(false);
  const [grownUpsOpen, setGrownUpsOpen] = useState(false);
  // Read-once snapshot per mount; the book updates its own copy while open.
  const [engagement] = useState(loadEngagement);

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 text-center">
        {/* Math-mark layer — marketing pages only. Fredoka, teal or sun,
            30–50% opacity, small rotations, behind content. */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none font-display select-none">
          <span className="absolute top-10 left-[8%] text-5xl text-sun opacity-50 rotate-[-9deg]">π</span>
          <span className="absolute top-24 right-[10%] text-3xl text-teal opacity-40 rotate-[4deg]">45°</span>
          <span className="absolute bottom-16 left-[16%] text-4xl text-teal opacity-40 rotate-[6deg]">½</span>
          <span className="absolute bottom-10 right-[18%] text-4xl text-sun opacity-45 rotate-[-12deg]">×</span>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 mb-3 shadow-sm">
            <LarkMark size={16} />
            <span className={`text-sm font-semibold ${theme.textSecondary}`}>
              Free math practice for K-5
            </span>
          </div>
          <div className="mb-6">
            <EngagementBar
              balance={starBalance(engagement)}
              streak={currentStreak(engagement)}
              today={starsToday(engagement)}
              onOpenStickers={() => setStickersOpen(true)}
            />
          </div>
          <h1 className="flex items-center justify-center gap-4">
            <LarkMark size={56} />
            <span className="font-display font-semibold lowercase tracking-[-0.01em] text-6xl sm:text-7xl text-teal leading-none">
              larkit
            </span>
          </h1>
          <p className="mt-4 font-display font-medium text-2xl sm:text-3xl text-ink">
            Math that feels like play.
          </p>
          <p className={`mt-3 text-lg ${theme.textSecondary} max-w-md mx-auto`}>
            {MODE_COUNT} skills from counting to fractions, decimals, and shapes
            — adaptive practice with star rewards, no timers, no pressure.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              className={BTN_PRIMARY}
              onClick={() =>
                document.getElementById("modes")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Pick a Game
            </button>
            <button className={BTN_SECONDARY} onClick={() => navigate("/play")}>
              Quick Start
            </button>
            <button className={BTN_SECONDARY} onClick={() => navigate("/worksheets")}>
              Print a Flight Log
            </button>
          </div>
        </motion.div>
      </section>

      {/* Pick a game — grouped so kids can find a skill fast */}
      <section id="modes" className="px-4 py-16 max-w-5xl mx-auto">
        <motion.h2
          className={`text-[26px] font-semibold font-display ${theme.textPrimary} text-center mb-2`}
          {...fadeUp}
        >
          {greetingLine(user, starBalance(engagement))}
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
                <h3 className={`text-xl font-semibold font-display ${theme.textPrimary}`}>
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
                  const tint = CARD_TINTS[COLOR_INDEX[id] % CARD_TINTS.length];
                  const locked = !isFreeMode(id) && !isPremium && !premiumLoading;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`relative ${tint.bg} ${tint.edge} btn-press rounded-[20px] p-5 text-left cursor-pointer min-h-[150px] flex flex-col`}
                      onClick={() => (locked ? openPaywall() : navigate(`/play/${id}`))}
                      aria-label={locked ? `${config.shortLabel} (Premium)` : `Play ${config.shortLabel}`}
                    >
                      {/* Glyph in a cream well, top-left (aviary card rules) */}
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] bg-cream/70 mb-3 self-start">
                        <Icon className="h-5 w-5 text-ink" />
                      </div>
                      {locked && (
                        <Feather
                          name="lock"
                          size={16}
                          className="absolute top-3 right-3 text-ink opacity-40"
                        />
                      )}
                      <h4 className="text-base font-display font-semibold text-ink leading-tight">
                        {config.shortLabel}
                      </h4>
                      <p className="mt-1 text-xs font-semibold text-ink/60 leading-relaxed">
                        {config.description}
                      </p>
                      {(() => {
                        // The journey pin: where this child stands in the mode.
                        const lv = loadProgressSync(id)?.level || 1;
                        if (lv <= 1) return null;
                        const rank = rankForLevel(lv);
                        return (
                          <span className="mt-auto pt-2 self-start text-[11px] font-display font-semibold text-ink bg-cream rounded-full px-2.5 py-0.5">
                            Lv {lv} · {rank.name}
                          </span>
                        );
                      })()}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="text-center pb-2 -mt-8">
        <button
          type="button"
          className="text-xs font-semibold text-teal underline underline-offset-2 cursor-pointer"
          onClick={() => setGrownUpsOpen(true)}
        >
          For grown-ups: progress report
        </button>
      </div>

      <StickerBook open={stickersOpen} onClose={() => setStickersOpen(false)} />
      <GrownUpsPanel open={grownUpsOpen} onClose={() => setGrownUpsOpen(false)} />

      {/* How It Works */}
      <section className="px-4 py-16 bg-white/50">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            className={`text-3xl font-semibold font-display ${theme.textPrimary} text-center mb-10`}
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
                  <h3 className={`text-lg font-semibold font-display ${theme.textPrimary}`}>
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
          className="bg-white rounded-3xl border-[1.5px] border-ink/10 p-8 sm:p-10 text-center"
          {...fadeUp}
        >
          <FileText className="h-10 w-10 text-teal mx-auto mb-4" />
          <h2 className={`text-2xl font-semibold font-display ${theme.textPrimary}`}>
            Flight Logs — printable worksheets
          </h2>
          <p className={`mt-2 ${theme.textSecondary} max-w-md mx-auto`}>
            Generate kid-friendly practice sheets from the same levels the games
            use, choose the number of problems, and print — answer key included!
          </p>
          <button
            className={`mt-6 ${BTN_PRIMARY} text-lg`}
            onClick={() => navigate("/worksheets")}
          >
            Print a Flight Log
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center border-t border-ink/10">
        <button
          className="mb-3 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer text-teal hover:bg-ink/5"
          onClick={() => navigate("/about")}
        >
          Why this works
        </button>
        <p className={`text-sm ${theme.textMuted} flex items-center justify-center gap-1`}>
          Made with <Heart className="h-4 w-4 text-ember fill-ember" /> by larkit
        </p>
      </footer>
    </main>
  );
}
