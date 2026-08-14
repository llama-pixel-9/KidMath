import { useState, useMemo, useEffect } from "react";
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
  Printer,
} from "lucide-react";
import LarkMark from "./components/LarkMark.jsx";
import {
  generateFlightLog,
  flightLogScope,
  printOptionBank,
  isYesNoJudgment,
  MODES,
} from "./mathEngine";
import { FIGURES } from "./components/figureRegistry";
import { getModeConfig } from "./modes";
import { useTheme } from "./useTheme";

const ICON_MAP = { Plus, Minus, X, Divide, ArrowLeftRight, Hash, FastForward, Layers };

const LEVEL_GROUPS = [
  { label: "Beginner", levels: [1, 2, 3] },
  { label: "Intermediate", levels: [4, 5, 6] },
  { label: "Advanced", levels: [7, 8, 9, 10] },
];

// Question ops are ASCII; the printed sheet uses the maths symbols.
const OP_SYMBOL = { "+": "+", "-": "−", "x": "×", "/": "÷" };

// §15: every mark on a flight log is 100% black — no tints, no colour, no
// decorative glyphs. The sheet is Fredoka for the maths, Nunito for the rest.

function ItemNumber({ n }) {
  return (
    <span className="w-5 flex-none text-right text-[11px] font-bold text-black leading-[1.4] pt-[3px]">
      {n}.
    </span>
  );
}

function AnswerBox({ value = null, wide = false }) {
  return (
    <span
      className={`inline-flex items-center justify-center align-middle border-[1.5px] border-black h-[28px] ${wide ? "min-w-[64px] px-2" : "w-[44px]"} font-display font-semibold text-[16px] text-black`}
    >
      {value}
    </span>
  );
}

// Part A stacked item: both operands right-aligned in one digit column, the
// operator hanging left on the second line, one 1.5px rule, then 34px of
// clear space for the child's own writing.
function StackedItem({ question: q, number, answer = null }) {
  return (
    <div className="flex gap-1.5" style={{ breakInside: "avoid" }}>
      <ItemNumber n={number} />
      <div
        className="w-[88px] font-display font-semibold text-[20px] text-black leading-[1.25]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <div className="text-right pr-1">{q.a}</div>
        <div className="flex justify-between pr-1">
          <span>{OP_SYMBOL[q.op]}</span>
          <span>{q.b}</span>
        </div>
        <div className="border-t-[1.5px] border-black mt-[3px]" />
        <div className="h-[34px] text-right pr-1">{answer}</div>
      </div>
    </div>
  );
}

// Part B inline item: `a + b =` then the box. The box IS the blank — never a
// printed "?", never a printed answer.
function InlineItem({ question: q, number, answer = null }) {
  return (
    <div className="flex items-start gap-1.5" style={{ breakInside: "avoid" }}>
      <ItemNumber n={number} />
      <span className="font-display font-semibold text-[18px] text-black leading-[1.4]">
        {q.a} {OP_SYMBOL[q.op]} {q.b} ={" "}
      </span>
      <AnswerBox value={answer} />
    </div>
  );
}

// Prompt item for the modes without an a-op-b form (time, graphs, shapes…).
// The option bank prints only when the options ARE the question (#34) — a
// plain numeric answer gets just the blank box. Judgment items print as
// circle-Yes-or-No, and figure questions (bar graph, pictograph…) print their
// figure — a graph question without its graph is unanswerable on paper.
function PromptItem({ question: q, number, answer = null }) {
  let body = null;
  if (q.display?.promptText) {
    body = q.display.promptText;
  } else if (q.display?.sequence) {
    body = `${q.display.sequence.join(", ")}, …`;
  } else if (q.display?.emoji) {
    body = Array.from({ length: q.display.count }, () => q.display.emoji).join(" ");
  }
  const subPrompt = q.subPrompt ?? q.display?.subPrompt;
  const judgment = isYesNoJudgment(q);
  const bank = printOptionBank(q);
  const figure = q.display?.figure ? FIGURES[q.display.figure] : null;
  const monoTheme = { textPrimary: "text-black", textSecondary: "text-black", textMuted: "text-black" };
  return (
    <div className="flex items-start gap-1.5" style={{ breakInside: "avoid" }}>
      <ItemNumber n={number} />
      <div className="flex-1 text-[13px] font-semibold text-black leading-[1.45]">
        {figure && (
          <div className="max-w-[240px] mb-1.5" style={{ filter: "grayscale(1)" }}>
            <figure.Component theme={monoTheme} {...(figure.props ? figure.props(q, { settled: answer != null }) : {})} />
          </div>
        )}
        <span>{body} </span>
        {subPrompt && <span>{subPrompt} </span>}
        {bank && (
          <span className="inline-flex flex-wrap gap-1.5 align-middle mx-1">
            {bank.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center border border-black px-1.5 h-[22px] font-display font-semibold text-[13px]"
              >
                {String(c)}
              </span>
            ))}
          </span>
        )}
        {judgment ? (
          <span className="inline-flex items-center gap-2 align-middle mx-1 font-display font-semibold text-[14px]">
            <span className="mr-0.5">Circle one:</span>
            {["Yes", "No"].map((label) => (
              <span
                key={label}
                className={`inline-flex items-center justify-center rounded-full px-2.5 h-[24px] ${
                  answer === label ? "border-[2.5px] border-black" : "border border-black/40"
                }`}
              >
                {label}
              </span>
            ))}
          </span>
        ) : (
          <AnswerBox value={answer} wide />
        )}
      </div>
    </div>
  );
}

// A word problem, full width, at the end — printed only when the Include
// Word Problems toggle is on. A "pick two numbers" prompt prints the number
// bank it picks from and a structured answer line (☐ + ☐ = 6).
function WordProblem({ item, number, showAnswer = false }) {
  if (!item) return null;
  const q = item.question;
  if (item.kind === "pickTwo") {
    const pair = Array.isArray(q.answer?.[0]) ? q.answer[0] : q.answer;
    return (
      <div className="flex items-start gap-1.5">
        <ItemNumber n={number} />
        <div className="space-y-3">
          <p className="text-[14px] font-semibold text-black leading-[1.5] m-0">
            {q.display.promptText.replace("Pick two numbers", "Pick two numbers from the box")}
          </p>
          <div className="flex gap-2">
            {q.display.options.map((opt, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center border-[1.5px] border-black w-[34px] h-[30px] font-display font-semibold text-[17px] text-black"
              >
                {opt}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 font-display font-semibold text-[19px] text-black">
            <AnswerBox value={showAnswer ? pair?.[0] : null} />
            <span>+</span>
            <AnswerBox value={showAnswer ? pair?.[1] : null} />
            <span>= {q.a}</span>
          </div>
        </div>
      </div>
    );
  }

  const figure = q.display?.figure ? FIGURES[q.display.figure] : null;
  return (
    <div className="flex items-start gap-1.5" style={{ breakInside: "avoid" }}>
      <ItemNumber n={number} />
      <div className="flex-1 text-[14px] font-semibold text-black leading-[1.5]">
        {figure && (
          <div className="max-w-[240px] mb-1.5" style={{ filter: "grayscale(1)" }}>
            <figure.Component
              theme={{ textPrimary: "text-black", textSecondary: "text-black", textMuted: "text-black" }}
              {...(figure.props ? figure.props(q, { settled: showAnswer }) : {})}
            />
          </div>
        )}
        <span>{q.display?.promptText} </span>
        <AnswerBox value={showAnswer ? q.answer : null} wide />
      </div>
    </div>
  );
}

// One sheet — the log itself, or its answer key (same grid, answers in the
// boxes, "Answer key" in place of Name and Date; always a separate sheet).
function FlightLogSheet({ log, mode, level, scope, answerKey = false, logIndex, logCount, breakBefore = false }) {
  const config = getModeConfig(mode);
  let n = 0;
  const next = () => ++n;
  const answerOf = (q) => (answerKey ? q.answer : null);

  return (
    <div
      className="bg-white rounded-3xl shadow-lg p-8 print:shadow-none print:rounded-none print:p-0 text-black"
      style={breakBefore ? { pageBreakBefore: "always" } : undefined}
    >
      {/* Header: 32px black lockup, 2px rule, log name · level · scope right */}
      <div className="flex items-center gap-2.5 border-b-2 border-black pb-3">
        <LarkMark size={32} color="#000000" accent="#000000" eye="#FFFFFF" />
        <span className="font-display font-semibold text-2xl lowercase leading-none tracking-[-0.01em]">
          larkit
        </span>
        <span className="ml-auto text-[12px] font-bold text-right">
          Flight log · {config.label} · Level {level} · {scope}
          {logCount > 1 && ` · Log ${logIndex + 1} of ${logCount}`}
        </span>
      </div>

      {/* Name/Date rules — or "Answer key" on the key sheet */}
      {answerKey ? (
        <p className="text-[12px] font-semibold py-3 m-0">Answer key</p>
      ) : (
        <div className="flex gap-8 py-3 text-[12px] font-semibold">
          <label className="flex items-end gap-2 flex-1">
            Name
            <span className="inline-block border-b border-black flex-1 max-w-64" />
          </label>
          <label className="flex items-end gap-2">
            Date
            <span className="inline-block border-b border-black w-32" />
          </label>
        </div>
      )}

      {/* Stacked computations (three per row), or short prompts. No PART
          A/B/C captions (#34): the sheet is a drill, not a test paper. */}
      <div className="mt-4">
        {log.computational ? (
          <div className="grid grid-cols-3 gap-x-6" style={{ rowGap: "18px" }}>
            {log.partA.map((q, i) => (
              <StackedItem key={i} question={q} number={next()} answer={answerOf(q)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6" style={{ rowGap: "14px" }}>
            {log.partA.map((q, i) => (
              <PromptItem key={i} question={q} number={next()} answer={answerOf(q)} />
            ))}
          </div>
        )}
      </div>

      {/* Inline items, two per row */}
      <div className="mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6" style={{ rowGap: "14px" }}>
          {log.partB.map((q, i) =>
            log.computational ? (
              <InlineItem key={i} question={q} number={next()} answer={answerOf(q)} />
            ) : (
              <PromptItem key={i} question={q} number={next()} answer={answerOf(q)} />
            )
          )}
        </div>
      </div>

      {/* Word problems, full width, at the end — only when toggled on */}
      {log.wordProblems?.length > 0 && (
        <div className="mt-6 space-y-4">
          {log.wordProblems.map((item, i) => (
            <WordProblem key={i} item={item} number={next()} showAnswer={answerKey} />
          ))}
        </div>
      )}

      {/* Footer, one line */}
      <div className="mt-6 pt-2 border-t border-black flex items-center justify-between text-[10px] font-bold">
        <span>larkit.io</span>
        <span className="inline-flex items-center gap-1.5">
          Landed
          <span className="inline-block w-[14px] h-[14px] border-[1.5px] border-black align-middle" />
          of {log.itemCount}
        </span>
        <span>
          {config.label} · L{level}
        </span>
      </div>
    </div>
  );
}

export default function PrintableWorksheet() {
  const { theme } = useTheme();
  const [mode, setMode] = useState("addition");
  const [level, setLevel] = useState(1);
  const [sheetCount, setSheetCount] = useState(1);
  const [generated, setGenerated] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(true);
  const [allowWordProblems, setAllowWordProblems] = useState(true);

  const logs = useMemo(() => {
    if (!generated) return [];
    return Array.from({ length: sheetCount }, () => generateFlightLog(mode, level, { allowWordProblems }));
  }, [generated, mode, level, sheetCount, allowWordProblems]);

  const scope = flightLogScope(mode, level);

  // DEV-only QA hook: the e2e asserts sheet COMPOSITION (word problems on/off)
  // from here instead of scraping prose out of the printed DOM.
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== "undefined") {
      window.__larkitWorksheets = { logs, allowWordProblems };
    }
  }, [logs, allowWordProblems]);

  const handleGenerate = () => {
    setGenerated(false);
    setTimeout(() => setGenerated(true), 0);
  };

  const levelLabel = level <= 3 ? "Beginner" : level <= 6 ? "Intermediate" : "Advanced";

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <div className="no-print max-w-md mx-auto px-4 py-6">
        <h1 className={`text-2xl font-semibold font-display ${theme.textPrimary} mb-2`}>
          Print a Flight Log
        </h1>
        <p className={`text-sm ${theme.textSecondary} mb-6`}>
          One sheet, one skill: three parts of problems from the same levels
          the games use. The answer key prints as its own sheet.
        </p>

        <div className={`${theme.cardBg} backdrop-blur rounded-3xl shadow-lg p-6 space-y-5`}>
          {/* Math type */}
          <div>
            <p className={`text-sm font-semibold ${theme.textSecondary} mb-2 uppercase tracking-wide`}>
              Math Type
            </p>
            <div className="grid grid-cols-4 gap-2">
              {MODES.map((m) => {
                const cfg = getModeConfig(m);
                const Icon = ICON_MAP[cfg.icon] || Plus;
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
                      {cfg.shortLabel}
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
                        aria-label={`Level ${lv}`}
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

          {/* Number of logs */}
          <div>
            <p className={`text-sm font-semibold ${theme.textSecondary} mb-2 uppercase tracking-wide`}>
              Number of Logs
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  aria-label={`${n} ${n === 1 ? "log" : "logs"}`}
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

          {/* Word problems toggle — mirrors the play-screen preference (#34) */}
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${theme.textSecondary} uppercase tracking-wide`}>
              Include Word Problems
            </p>
            <button
              className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
                allowWordProblems ? "bg-teal" : "bg-gray-300"
              }`}
              onClick={() => { setAllowWordProblems(!allowWordProblems); setGenerated(false); }}
              aria-label={allowWordProblems ? "Skip word problems" : "Include word problems"}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  allowWordProblems ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Answer Key toggle */}
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${theme.textSecondary} uppercase tracking-wide`}>
              Include Answer Key
            </p>
            <button
              className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
                showAnswerKey ? "bg-teal" : "bg-gray-300"
              }`}
              onClick={() => setShowAnswerKey(!showAnswerKey)}
              aria-label={showAnswerKey ? "Skip the answer key" : "Include the answer key"}
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
              className="flex-1 h-14 bg-teal text-cream font-display font-semibold text-lg rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer"
              onClick={handleGenerate}
            >
              Generate
            </motion.button>
            {generated && (
              <motion.button
                className="flex items-center justify-center gap-2 flex-1 h-14 bg-white text-teal font-display font-semibold text-lg rounded-[18px] shadow-[0_5px_0_#14231F1a] [--press-edge:#14231F1a] btn-press cursor-pointer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => window.print()}
              >
                <Printer className="h-5 w-5" />
                Print
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* The flight logs */}
      {generated &&
        logs.map((log, i) => (
          <div key={i} className="max-w-2xl mx-auto px-4 pb-8 print:px-0 print:pb-0 print:max-w-none space-y-4 print:space-y-0">
            <FlightLogSheet
              log={log}
              mode={mode}
              level={level}
              scope={scope}
              logIndex={i}
              logCount={logs.length}
              breakBefore={i > 0}
            />
            {showAnswerKey && (
              <FlightLogSheet
                log={log}
                mode={mode}
                level={level}
                scope={scope}
                answerKey
                logIndex={i}
                logCount={logs.length}
                breakBefore
              />
            )}
          </div>
        ))}
    </div>
  );
}
