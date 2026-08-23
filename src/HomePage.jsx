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
import { useEffect, useState, useMemo } from "react";
import { useTheme } from "./useTheme";
import LarkMark from "./components/LarkMark";
import { MODE_IDS, MODE_GROUPS, getModeConfig } from "./modes";
import { loadProgressSync } from "./progressStore";
import { loadEngagement, starBalance, currentStreak, starsToday } from "./engagement/engagementStore";
import { getNomination } from "./engagement/fledging.js";
import { fledgingEnabled, meadowEnabled } from "./gamificationFlags.js";
import EngagementBar from "./engagement/EngagementBar.jsx";
import StickerBook from "./engagement/StickerBook.jsx";
import GrownUpsPanel from "./engagement/GrownUpsPanel.jsx";
import { usePremium } from "./PremiumContext";
import { useAuth } from "./useAuth";
import { isFreeMode } from "./premium";
import { activeKidId, activeKidGrade, fetchKids } from "./kidProfiles";
import { gradeIndex, gradeFitFor } from "./gradeSeed.js";

const ICON_MAP = { Plus, Minus, X, Divide, ArrowLeftRight, Hash, FastForward, Layers, PieChart, Percent, GitFork, BarChart3, CircleDot, Sigma, Ruler, Coins, Spline, Scale, Clock, ChartColumn, Triangle, Shapes };

// §14 card glyph: one Ink math mark in the cream well — Fredoka 600/20px where
// the face carries the character; minus and the clock are drawn (never a
// substituted system-font character). Modes without a `glyph` fall back to
// their lucide icon until the drawn 32px game-glyph set lands.
function ModeGlyph({ config }) {
  if (config.glyph === "feather:minus") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
        <path d="M5 12h14" fill="none" />
      </svg>
    );
  }
  if (config.glyph === "feather:clock") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  }
  if (config.glyph) {
    return <span className="font-display font-semibold text-xl leading-none">{config.glyph}</span>;
  }
  const Icon = ICON_MAP[config.icon] || Plus;
  return <Icon className="h-5 w-5" />;
}

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

/**
 * Order the topic groups for a kid: groups with at least one mode at their
 * grade first (in MODE_GROUPS order), then groups they have outgrown, and
 * groups entirely above their grade folded away. Unknown grade → as authored.
 */
function groupsForGrade(grade) {
  if (gradeIndex(grade) == null) return { mainGroups: MODE_GROUPS, moreGroups: [] };
  const fit = (g) => {
    const fits = g.modeIds.map((id) => gradeFitFor(id, grade));
    return fits.includes("in") ? 0 : fits.every((f) => f === "above") ? 2 : 1;
  };
  const ranked = MODE_GROUPS.map((g, i) => ({ g, i, rank: fit(g) })).sort((a, b) => a.rank - b.rank || a.i - b.i);
  return {
    mainGroups: ranked.filter((x) => x.rank < 2).map((x) => x.g),
    moreGroups: ranked.filter((x) => x.rank === 2).map((x) => x.g),
  };
}

/** Quick Start: the in-grade mode with the lowest level — the most room to grow. */
function quickStartFor(grade) {
  if (gradeIndex(grade) == null) return null;
  const inGrade = MODE_GROUPS.flatMap((g) => g.modeIds).filter((id) => gradeFitFor(id, grade) === "in");
  if (!inGrade.length) return null;
  return inGrade
    .map((id) => ({ id, level: loadProgressSync(id)?.level || 1 }))
    .sort((a, b) => a.level - b.level)[0].id;
}

function greetingLine(user, balance, kidName) {
  const hour = new Date().getHours();
  const dayPart = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  // The kid is the one playing — greet them, not the parent's e-mail.
  const first = kidName || user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0];
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

  // §20 returning path: a signed-in family with kid profiles and no active
  // kid lands on the profile picker, never a login form. A signed-in account
  // with NO profiles (pre-profiles signups) gets a nudge instead — without it
  // there was no route to the add-kid wizard at all.
  const [needsKid, setNeedsKid] = useState(false);
  // The active kid (name + grade) drives the greeting, the group order and
  // Quick Start. Grade is cached beside the pointer so first paint has it.
  const [kid, setKid] = useState(() => {
    const grade = activeKidGrade();
    return grade ? { grade } : null;
  });
  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchKids(user.id).then((kids) => {
      if (!alive) return;
      if (kids.length === 0) setNeedsKid(true);
      else if (!activeKidId()) navigate("/profiles");
      else {
        const active = kids.find((k) => k.id === activeKidId());
        if (active) setKid({ name: active.first_name, grade: active.grade });
      }
    });
    return () => { alive = false; };
  }, [user, navigate]);

  // Groups at the kid's grade first; groups entirely above it fold under
  // "Explore more" so a kindergartner isn't handed decimals on tile one.
  const { mainGroups, moreGroups } = useMemo(() => groupsForGrade(kid?.grade), [kid?.grade]);
  const [showMore, setShowMore] = useState(false);
  const quickStartMode = useMemo(() => quickStartFor(kid?.grade), [kid?.grade]);

  const renderGroup = (group) => (
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
                  const tint = CARD_TINTS[COLOR_INDEX[id] % CARD_TINTS.length];
                  const locked = !isFreeMode(id) && !isPremium && !premiumLoading;
                  const lv = loadProgressSync(id)?.level || 1;
                  // §03 step 3: the nomination survives leaving the app as a
                  // Sun pill on the mode's card (Ink text — cream on Sun is
                  // forbidden).
                  const nominated = fledgingEnabled() && !locked && Boolean(getNomination(engagement, id));
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`relative ${tint.bg} ${tint.edge} btn-press rounded-[20px] p-[18px] text-left cursor-pointer min-h-[150px] flex flex-col gap-2.5`}
                      onClick={() => (locked ? openPaywall() : navigate(`/play/${id}`))}
                      aria-label={locked ? `${config.label} (Premium)` : `Play ${config.label}`}
                    >
                      {/* Glyph in a 38px cream well, top-left. Locked cards keep
                          full opacity and swap the glyph for the lock at 40%. */}
                      <div
                        className={`inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-cream/60 self-start text-ink ${locked ? "opacity-40" : ""}`}
                      >
                        {locked ? <Feather name="lock" size={20} /> : <ModeGlyph config={config} />}
                      </div>
                      {nominated && (
                        <span className="absolute top-[18px] right-[18px] bg-sun text-ink text-[12px] font-display font-semibold rounded-full px-2.5 py-[3px] whitespace-nowrap">
                          Ready to fledge
                        </span>
                      )}
                      <div className="flex-1" />
                      <h4 className="text-xl font-display font-semibold text-ink leading-[1.15]">
                        {config.label}
                      </h4>
                      {/* Scope line + level badge share one baseline. Scope is
                          solid Ink — Ink 60% fails contrast on Sun Light. */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-ink leading-tight">
                          {config.description}
                        </span>
                        {!locked && (
                          <span className="text-[13px] font-display text-ink bg-cream rounded-full px-2.5 py-[3px] whitespace-nowrap flex-none">
                            {lv > 1 ? `Level ${lv}` : "New"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
  );

  return (
    <main className="min-h-screen">
      {needsKid && (
        <div className="bg-white border-b-[1.5px] border-ink/10 px-4 py-3 text-center text-sm font-semibold text-ink">
          Set up a profile for your kid so their levels, stars and progress report are their own.{" "}
          <button
            type="button"
            onClick={() => navigate("/onboarding?add=1")}
            className="ml-2 px-3 h-9 rounded-xl bg-teal text-white font-bold cursor-pointer hover:bg-deep-teal"
          >
            Add a kid
          </button>
        </div>
      )}
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
              // The Meadow replaces the sticker book as the tap-target behind
              // the star chip (§04); the book stays only while the flag is off.
              onOpenStickers={() => (meadowEnabled() ? navigate("/meadow") : setStickersOpen(true))}
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
            <button className={BTN_SECONDARY} onClick={() => navigate(quickStartMode ? `/play/${quickStartMode}` : "/play")}>
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
          {greetingLine(user, starBalance(engagement), kid?.name)}
        </motion.h2>
        <motion.p
          className={`text-center ${theme.textSecondary} mb-10`}
          {...fadeUp}
        >
          {MODE_COUNT} skills, grouped by topic — tap any one to start.
        </motion.p>

        <div className="space-y-10">
          {mainGroups.map(renderGroup)}
          {moreGroups.length > 0 && (
            <div className="text-center">
              <button
                type="button"
                className="px-5 h-11 rounded-xl bg-white border-[1.5px] border-ink/10 font-bold text-ink cursor-pointer"
                onClick={() => setShowMore((v) => !v)}
                aria-expanded={showMore}
              >
                {showMore ? "Hide the bigger-kid topics" : `Explore more — ${moreGroups.length} topic${moreGroups.length === 1 ? "" : "s"} for bigger kids`}
              </button>
              {showMore && <div className="space-y-10 mt-8 text-left">{moreGroups.map(renderGroup)}</div>}
            </div>
          )}

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
                  const tint = CARD_TINTS[COLOR_INDEX[id] % CARD_TINTS.length];
                  const locked = !isFreeMode(id) && !isPremium && !premiumLoading;
                  const lv = loadProgressSync(id)?.level || 1;
                  // §03 step 3: the nomination survives leaving the app as a
                  // Sun pill on the mode's card (Ink text — cream on Sun is
                  // forbidden).
                  const nominated = fledgingEnabled() && !locked && Boolean(getNomination(engagement, id));
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`relative ${tint.bg} ${tint.edge} btn-press rounded-[20px] p-[18px] text-left cursor-pointer min-h-[150px] flex flex-col gap-2.5`}
                      onClick={() => (locked ? openPaywall() : navigate(`/play/${id}`))}
                      aria-label={locked ? `${config.label} (Premium)` : `Play ${config.label}`}
                    >
                      {/* Glyph in a 38px cream well, top-left. Locked cards keep
                          full opacity and swap the glyph for the lock at 40%. */}
                      <div
                        className={`inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-cream/60 self-start text-ink ${locked ? "opacity-40" : ""}`}
                      >
                        {locked ? <Feather name="lock" size={20} /> : <ModeGlyph config={config} />}
                      </div>
                      {nominated && (
                        <span className="absolute top-[18px] right-[18px] bg-sun text-ink text-[12px] font-display font-semibold rounded-full px-2.5 py-[3px] whitespace-nowrap">
                          Ready to fledge
                        </span>
                      )}
                      <div className="flex-1" />
                      <h4 className="text-xl font-display font-semibold text-ink leading-[1.15]">
                        {config.label}
                      </h4>
                      {/* Scope line + level badge share one baseline. Scope is
                          solid Ink — Ink 60% fails contrast on Sun Light. */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-ink leading-tight">
                          {config.description}
                        </span>
                        {!locked && (
                          <span className="text-[13px] font-display text-ink bg-cream rounded-full px-2.5 py-[3px] whitespace-nowrap flex-none">
                            {lv > 1 ? `Level ${lv}` : "New"}
                          </span>
                        )}
                      </div>
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
