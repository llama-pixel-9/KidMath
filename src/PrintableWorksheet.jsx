import { useState, useMemo } from "react";
import { motion } from "framer-motion";
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
  Rocket,
  Heart,
  Smile,
  Trophy,
  Sparkles,
  Printer,
  Sun,
  Moon,
  Cloud,
  Rainbow,
  Flower2,
  TreePine,
  Apple,
  Cherry,
  Fish,
  Bug,
  Bird,
  Cat,
  Dog,
  Snail,
  Turtle,
  Squirrel,
  Gem,
  Crown,
  Music,
  Palette,
  Puzzle,
  Gamepad2,
  Bike,
  Plane,
  Sailboat,
  Footprints,
  Drumstick,
  IceCreamCone,
  Cookie,
  Cake,
  Candy,
  Gift,
  PartyPopper,
  Flame,
  Snowflake,
  Compass,
  Globe,
  Lightbulb,
  Zap,
} from "lucide-react";
import { generateWorksheetSet, MODES } from "./mathEngine";
import { getModeConfig } from "./modes";
import { useTheme } from "./ThemeContext";

const ICON_MAP = { Plus, Minus, X, Divide, ArrowLeftRight, Hash, FastForward, Layers };

function getWorksheetModeConfig(modeId) {
  const config = getModeConfig(modeId);
  return {
    icon: ICON_MAP[config.icon] || Plus,
    label: config.shortLabel,
    op: config.op,
  };
}

const DECO_ICONS = [
  Rocket, Star, Heart, Smile, Trophy, Sparkles,
  Sun, Moon, Cloud, Rainbow, Flower2, TreePine,
  Apple, Cherry, Fish, Bug, Bird, Cat,
  Dog, Snail, Turtle, Squirrel, Gem, Crown,
  Music, Palette, Puzzle, Gamepad2, Bike, Plane,
  Sailboat, Footprints, Drumstick, IceCreamCone, Cookie, Cake,
  Candy, Gift, PartyPopper, Flame, Snowflake, Compass,
  Globe, Lightbulb, Zap,
];
const DECO_COLORS = [
  "text-pink-400",
  "text-yellow-500",
  "text-red-400",
  "text-amber-500",
  "text-violet-400",
  "text-sky-400",
  "text-orange-400",
  "text-emerald-500",
  "text-rose-400",
  "text-teal-400",
  "text-indigo-400",
  "text-lime-500",
  "text-fuchsia-400",
  "text-cyan-500",
  "text-yellow-600",
];

const ENCOURAGEMENTS = [
  "You did it!",
  "Great job!",
  "Way to go!",
  "You're a math star!",
  "Awesome work!",
];

const LEVEL_GROUPS = [
  { label: "Beginner", levels: [1, 2, 3] },
  { label: "Intermediate", levels: [4, 5, 6] },
  { label: "Advanced", levels: [7, 8, 9, 10] },
];

function pickSheetIcons(count) {
  const shuffled = [...DECO_ICONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getDecoIcon(icons, index) {
  const Icon = icons[index % icons.length];
  const color = DECO_COLORS[index % DECO_COLORS.length];
  return <Icon className={`h-5 w-5 ${color} print:h-4 print:w-4`} />;
}

const BLANK = <span className="inline-block border-b-2 border-slate-300 w-12 print:w-14" />;

function VerticalProblem({ a, b, op, answer }) {
  const aDigits = String(a).split("");
  const bDigits = String(b).split("");
  const ansLen = answer != null ? String(answer).length : Math.max(aDigits.length, bDigits.length);
  const maxLen = Math.max(aDigits.length, bDigits.length, ansLen);
  const cols = maxLen + 1;
  const padA = cols - aDigits.length;
  const padB = cols - bDigits.length - 1;

  return (
    <span
      className="inline-grid items-center justify-items-center"
      style={{ gridTemplateColumns: `repeat(${cols}, 0.75em)`, verticalAlign: "middle", lineHeight: 1.3 }}
    >
      {Array.from({ length: padA }, (_, i) => <span key={`pa${i}`} />)}
      {aDigits.map((d, i) => <span key={`a${i}`}>{d}</span>)}

      <span className="text-[0.85em]">{op}</span>
      {Array.from({ length: padB }, (_, i) => <span key={`pb${i}`} />)}
      {bDigits.map((d, i) => <span key={`b${i}`}>{d}</span>)}

      <span className="border-t-2 border-slate-400 w-full" style={{ gridColumn: "1 / -1", marginTop: "2px" }} />

      {answer != null ? (
        <>
          {Array.from({ length: cols - String(answer).length }, (_, i) => <span key={`pc${i}`} />)}
          {String(answer).split("").map((d, i) => (
            <span key={`ans${i}`} className="text-emerald-600">{d}</span>
          ))}
        </>
      ) : (
        <span
          className="border-b-2 border-slate-300 w-full"
          style={{ gridColumn: "1 / -1", height: "1.2em" }}
        />
      )}
    </span>
  );
}

function WorksheetProblem({ question: q }) {
  if (q.display?.promptText) {
    return <>{q.display.promptText} {BLANK}</>;
  }
  if (q.display?.sequence) {
    return <>{q.display.sequence.join(", ")}, {BLANK}</>;
  }
  if (q.display?.emoji) {
    const dots = Array.from({ length: q.display.count }, () => q.display.emoji).join(" ");
    return <>{dots} = {BLANK}</>;
  }
  if (q.op === "?") {
    return <>{q.a} {BLANK} {q.b}</>;
  }
  if ((q.op === "+" || q.op === "−") && (q.a >= 10 || q.b >= 10)) {
    return <VerticalProblem a={q.a} b={q.b} op={q.op} />;
  }
  return <>{q.a} {q.op} {q.b} = {BLANK}</>;
}

function AnswerKeyProblem({ question: q }) {
  if (q.display?.promptText) {
    return <>{q.display.promptText} <span className="text-emerald-600">{q.answer}</span></>;
  }
  if (q.display?.sequence) {
    return <>{q.display.sequence.join(", ")}, <span className="text-emerald-600">{q.answer}</span></>;
  }
  if (q.op === "?") {
    return <>{q.a} <span className="text-emerald-600">{q.answer}</span> {q.b}</>;
  }
  if ((q.op === "+" || q.op === "−") && (q.a >= 10 || q.b >= 10)) {
    return <VerticalProblem a={q.a} b={q.b} op={q.op} answer={q.answer} />;
  }
  return <>{q.a} {q.op} {q.b} = <span className="text-emerald-600">{q.answer}</span></>;
}

export default function PrintableWorksheet() {
  const { theme } = useTheme();
  const [mode, setMode] = useState("addition");
  const [level, setLevel] = useState(1);
  const [problemCount, setProblemCount] = useState(20);
  const [sheetCount, setSheetCount] = useState(1);
  const [generated, setGenerated] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(true);

  const sheets = useMemo(() => {
    if (!generated) return [];
    return Array.from({ length: sheetCount }, () => ({
      problems: generateWorksheetSet(mode, level, problemCount),
      encouragement: ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)],
      icons: pickSheetIcons(10),
    }));
  }, [generated, mode, level, problemCount, sheetCount]);

  const handleGenerate = () => {
    setGenerated(false);
    setTimeout(() => setGenerated(true), 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const levelLabel = level <= 3 ? "Beginner" : level <= 6 ? "Intermediate" : "Advanced";

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <div className="no-print max-w-md mx-auto px-4 py-6">
        <h1 className={`text-2xl font-extrabold ${theme.textPrimary} mb-6`}>
          Print a Worksheet
        </h1>

        <div className={`${theme.cardBg} backdrop-blur rounded-3xl shadow-lg p-6 space-y-5`}>
          {/* Math type */}
          <div>
            <p className={`text-sm font-semibold ${theme.textSecondary} mb-2 uppercase tracking-wide`}>
              Math Type
            </p>
            <div className="grid grid-cols-4 gap-2">
              {MODES.map((m) => {
                const cfg = getWorksheetModeConfig(m);
                const Icon = cfg.icon;
                const active = m === mode;
                return (
                  <button
                    key={m}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 cursor-pointer transition-colors ${
                      active ? theme.selectedBorder : `${theme.cardBorder} bg-white hover:bg-gray-50`
                    }`}
                    onClick={() => { setMode(m); setGenerated(false); }}
                  >
                    <Icon className={`h-6 w-6 ${active ? theme.selectedIcon : theme.textMuted}`} />
                    <span className={`text-[10px] font-bold ${active ? theme.selectedText : theme.textSecondary} leading-tight text-center`}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level selector */}
          <div>
            <p className={`text-sm font-semibold ${theme.textSecondary} mb-2 uppercase tracking-wide`}>
              Level ({levelLabel})
            </p>
            <div className="space-y-2">
              {LEVEL_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className={`text-xs ${theme.textMuted} mb-1 font-medium`}>{group.label}</p>
                  <div className="flex gap-1.5">
                    {group.levels.map((lv) => (
                      <button
                        key={lv}
                        className={`flex-1 py-2 rounded-xl border-2 font-bold text-sm cursor-pointer transition-colors ${
                          lv === level
                            ? theme.selectedBorder + " " + theme.selectedText
                            : `${theme.cardBorder} bg-white ${theme.textSecondary} hover:bg-gray-50`
                        }`}
                        onClick={() => { setLevel(lv); setGenerated(false); }}
                      >
                        {lv}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Problem count */}
          <div>
            <p className={`text-sm font-semibold ${theme.textSecondary} mb-2 uppercase tracking-wide`}>
              Number of Problems
            </p>
            <div className="flex gap-2">
              {[20, 30, 40].map((n) => (
                <button
                  key={n}
                  className={`flex-1 py-3 rounded-2xl border-2 font-bold text-lg cursor-pointer transition-colors ${
                    n === problemCount
                      ? theme.selectedBorder + " " + theme.selectedText
                      : `${theme.cardBorder} bg-white ${theme.textSecondary} hover:bg-gray-50`
                  }`}
                  onClick={() => { setProblemCount(n); setGenerated(false); }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Number of sheets */}
          <div>
            <p className={`text-sm font-semibold ${theme.textSecondary} mb-2 uppercase tracking-wide`}>
              Number of Sheets
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  className={`flex-1 py-3 rounded-2xl border-2 font-bold text-lg cursor-pointer transition-colors ${
                    n === sheetCount
                      ? theme.selectedBorder + " " + theme.selectedText
                      : `${theme.cardBorder} bg-white ${theme.textSecondary} hover:bg-gray-50`
                  }`}
                  onClick={() => { setSheetCount(n); setGenerated(false); }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Answer Key toggle */}
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${theme.textSecondary} uppercase tracking-wide`}>
              Include Answer Key
            </p>
            <button
              className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
                showAnswerKey ? "bg-emerald-400" : "bg-gray-300"
              }`}
              onClick={() => setShowAnswerKey(!showAnswerKey)}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  showAnswerKey ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <motion.button
              className={`flex-1 py-3 bg-gradient-to-r ${theme.ctaPrimary} text-white font-bold text-lg rounded-2xl shadow-lg cursor-pointer`}
              whileTap={{ scale: 0.95 }}
              onClick={handleGenerate}
            >
              Generate
            </motion.button>
            {generated && (
              <motion.button
                className={`flex items-center justify-center gap-2 flex-1 py-3 bg-gradient-to-r ${theme.worksheetCalloutBtn} text-white font-bold text-lg rounded-2xl shadow-lg cursor-pointer`}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handlePrint}
              >
                <Printer className="h-5 w-5" />
                Print
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Printable worksheets */}
      {generated && sheets.length > 0 && sheets.map((sheet, sheetIdx) => (
        <div
          key={sheetIdx}
          className="max-w-2xl mx-auto px-4 pb-8 print:px-0 print:pb-0 print:max-w-none"
          style={sheetIdx > 0 ? { pageBreakBefore: "always" } : undefined}
        >
          <div className="bg-white rounded-3xl shadow-lg p-8 print:shadow-none print:rounded-none print:p-4">
            <div className="flex items-center justify-center gap-3 mb-1 print:mb-0">
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-400 print:h-5 print:w-5" />
              <h2 className="text-3xl font-extrabold text-slate-700 print:text-xl">
                Math Worksheet
                {sheets.length > 1 && (
                  <span className="text-lg text-slate-400 font-bold ml-2 print:text-sm">
                    ({sheetIdx + 1}/{sheets.length})
                  </span>
                )}
              </h2>
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-400 print:h-5 print:w-5" />
            </div>

            <div className="flex justify-between items-center mb-1 text-sm text-slate-500 print:text-xs print:mb-0">
              <span className="font-semibold">
                {getWorksheetModeConfig(mode).label} &middot; Level {level} ({levelLabel})
              </span>
            </div>

            <div className="flex gap-6 mb-4 border-b-2 border-dashed border-slate-200 pb-3 print:mb-2 print:pb-2">
              <label className="flex items-end gap-2 text-slate-600 font-medium pt-3 print:pt-1 print:text-sm">
                Name:
                <span className="inline-block border-b-2 border-slate-300 w-40 print:w-36" />
              </label>
              <label className="flex items-end gap-2 text-slate-600 font-medium pt-3 print:pt-1 print:text-sm">
                Date:
                <span className="inline-block border-b-2 border-slate-300 w-32 print:w-28" />
              </label>
            </div>

            <div className={`grid ${problemCount <= 20 ? "grid-cols-2 gap-x-8 gap-y-5 print:gap-y-3" : problemCount <= 30 ? "grid-cols-3 gap-x-6 gap-y-4 print:gap-x-4 print:gap-y-2" : "grid-cols-4 gap-x-4 gap-y-3 print:gap-x-3 print:gap-y-1.5"}`}>
              {sheet.problems.map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`font-bold text-slate-400 text-right ${problemCount <= 20 ? "text-sm w-6" : problemCount <= 30 ? "text-xs w-6" : "text-[10px] w-5"}`}>
                    {i + 1})
                  </span>
                  <span className={`font-bold text-slate-700 tracking-wide ${problemCount <= 20 ? "text-xl print:text-lg" : problemCount <= 30 ? "text-lg print:text-base" : "text-base print:text-sm"}`}>
                    <WorksheetProblem question={q} />
                  </span>
                  {i % 5 === 2 && problemCount <= 20 && problemCount < 40 && (
                    <span className="ml-auto print:hidden">{getDecoIcon(sheet.icons, i)}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-2 border-t-2 border-dashed border-slate-200 flex items-center justify-center gap-3 print:mt-2 print:pt-1">
              <Trophy className="h-5 w-5 text-yellow-500 fill-yellow-400 print:h-4 print:w-4" />
              <p className="text-base font-extrabold text-slate-600 print:text-sm">
                {sheet.encouragement}
              </p>
              <Trophy className="h-5 w-5 text-yellow-500 fill-yellow-400 print:h-4 print:w-4" />
            </div>
          </div>

          {showAnswerKey && (
            <div
              className="bg-white rounded-3xl shadow-lg p-8 mt-4 print:shadow-none print:rounded-none print:p-6"
              style={{ pageBreakBefore: "always" }}
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <Sparkles className="h-6 w-6 text-violet-400 print:h-5 print:w-5" />
                <h2 className="text-2xl font-extrabold text-slate-700 print:text-xl">
                  Answer Key
                  {sheets.length > 1 && (
                    <span className="text-lg text-slate-400 font-bold ml-2">
                      ({sheetIdx + 1}/{sheets.length})
                    </span>
                  )}
                </h2>
                <Sparkles className="h-6 w-6 text-violet-400 print:h-5 print:w-5" />
              </div>
              <p className="text-sm text-slate-400 text-center mb-4">
                {getWorksheetModeConfig(mode).label} &middot; Level {level} ({levelLabel})
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-6 gap-y-3">
                {sheet.problems.map((q, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-400 w-6 text-right">
                      {i + 1})
                    </span>
                    <span className="text-base font-bold text-slate-600">
                      <AnswerKeyProblem question={q} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
