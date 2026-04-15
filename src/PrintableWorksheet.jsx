import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Minus,
  X,
  Star,
  Rocket,
  Heart,
  Smile,
  Trophy,
  Sparkles,
  Printer,
} from "lucide-react";
import { generateWorksheetSet, MODES, MAX_LEVEL } from "./mathEngine";
import { useTheme } from "./ThemeContext";

const MODE_CONFIG = {
  addition: { icon: Plus, label: "Addition", op: "+" },
  subtraction: { icon: Minus, label: "Subtraction", op: "−" },
  multiplication: { icon: X, label: "Multiplication", op: "×" },
};

const DECO_ICONS = [Rocket, Star, Heart, Smile, Trophy, Sparkles];
const DECO_COLORS = [
  "text-pink-400",
  "text-yellow-500",
  "text-red-400",
  "text-amber-500",
  "text-yellow-500",
  "text-violet-400",
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

function getDecoIcon(index) {
  const Icon = DECO_ICONS[index % DECO_ICONS.length];
  const color = DECO_COLORS[index % DECO_COLORS.length];
  return <Icon className={`h-5 w-5 ${color} print:h-4 print:w-4`} />;
}

export default function PrintableWorksheet() {
  const { theme } = useTheme();
  const [mode, setMode] = useState("addition");
  const [level, setLevel] = useState(1);
  const [problemCount, setProblemCount] = useState(15);
  const [generated, setGenerated] = useState(false);

  const problems = useMemo(() => {
    if (!generated) return [];
    return generateWorksheetSet(mode, level, problemCount);
  }, [generated, mode, level, problemCount]);

  const encouragement = useMemo(
    () => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)],
    [generated]
  );

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
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => {
                const cfg = MODE_CONFIG[m];
                const Icon = cfg.icon;
                const active = m === mode;
                return (
                  <button
                    key={m}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 cursor-pointer transition-colors ${
                      active ? theme.selectedBorder : `${theme.cardBorder} bg-white hover:bg-gray-50`
                    }`}
                    onClick={() => { setMode(m); setGenerated(false); }}
                  >
                    <Icon className={`h-7 w-7 ${active ? theme.selectedIcon : theme.textMuted}`} />
                    <span className={`text-xs font-bold capitalize ${active ? theme.selectedText : theme.textSecondary}`}>
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
              {[10, 15, 20].map((n) => (
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

      {/* Printable worksheet */}
      {generated && problems.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 pb-8 print:px-0 print:pb-0 print:max-w-none">
          <div className="bg-white rounded-3xl shadow-lg p-8 print:shadow-none print:rounded-none print:p-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-400 print:h-6 print:w-6" />
              <h2 className="text-3xl font-extrabold text-slate-700 print:text-2xl">
                Math Worksheet
              </h2>
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-400 print:h-6 print:w-6" />
            </div>

            <div className="flex justify-between items-center mb-1 text-sm text-slate-500">
              <span className="font-semibold">
                {MODE_CONFIG[mode].label} &middot; Level {level} ({levelLabel})
              </span>
            </div>

            <div className="flex gap-6 mb-6 border-b-2 border-dashed border-slate-200 pb-4">
              <label className="flex items-center gap-2 text-slate-600 font-medium">
                Name:
                <span className="inline-block border-b-2 border-slate-300 w-40 print:w-48" />
              </label>
              <label className="flex items-center gap-2 text-slate-600 font-medium">
                Date:
                <span className="inline-block border-b-2 border-slate-300 w-32 print:w-36" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {problems.map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-400 w-6 text-right">
                    {i + 1})
                  </span>
                  <span className="text-xl font-bold text-slate-700 tracking-wide">
                    {q.a} {q.op} {q.b} ={" "}
                    <span className="inline-block border-b-2 border-slate-300 w-12 print:w-14" />
                  </span>
                  {i % 3 === 1 && (
                    <span className="ml-auto">{getDecoIcon(i)}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-200 flex items-center justify-center gap-3">
              <Trophy className="h-6 w-6 text-yellow-500 fill-yellow-400" />
              <p className="text-lg font-extrabold text-slate-600">
                {encouragement}
              </p>
              <Trophy className="h-6 w-6 text-yellow-500 fill-yellow-400" />
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200">
              <div className="rotate-180">
                <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                  <span className="font-semibold">Answer Key: </span>
                  {problems.map((q, i) => `${i + 1}) ${q.answer}`).join("  ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
