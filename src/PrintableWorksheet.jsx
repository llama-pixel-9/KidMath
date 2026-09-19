import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Printer } from "lucide-react";
import { generateFlightLog } from "./mathEngine";
import { MODE_IDS } from "./modes";
import { addBankItems, ensureModeLoaded } from "./itemBank.js";
import { activeKidGrade } from "./kidProfiles.js";
import { gradeIndex } from "./gradeSeed.js";
import { loadAllowWordProblemsSync } from "./userPreferences.js";
import { useTheme } from "./useTheme";
import { generateWorksheet, practiceAvailability, storyAvailability } from "./worksheets/generateWorksheet.js";
import { LAYOUTS, MIXED_STORIES, PROBLEM_TYPES, STORIES_PER_SHEET } from "./worksheets/layouts.js";
import { LEGACY_SKILLS } from "./worksheets/legacySkills.js";
import { documentTitle, headerLine } from "./worksheets/skillIndex.js";
import { GRADES, GRADE_LABELS, TOPIC_LABELS, WORKSHEET_SKILLS } from "./worksheets/skills.js";
import WorksheetSheet, {
  InlineItem,
  NameDateRow,
  PromptItem,
  SHEET_FRAME,
  SheetFooter,
  SheetHeader,
  StackedItem,
  WordProblem,
} from "./worksheets/WorksheetSheet.jsx";

const ALL_SKILLS = [...WORKSHEET_SKILLS, ...LEGACY_SKILLS];
const SHEET_COUNTS = [1, 2, 3, 5];
const GRADE_KEY = "larkit-worksheet-grade";
const PROBLEM_TYPE_KEY = "larkit-worksheet-problem-type";

const PROBLEM_TYPE_ARIA = {
  practice: "Practice problems only",
  stories: "Word problems only",
  mixed: "Mixed",
};

function stored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode — the choice just is not remembered */
  }
}

// The active kid's grade when there is one, else the last grade printed for.
function initialGrade() {
  const kid = gradeIndex(activeKidGrade());
  if (kid != null) return kid === 0 ? "K" : String(Math.min(kid, 5));
  const last = stored(GRADE_KEY);
  return GRADES.includes(last) ? last : null;
}

// Last worksheet choice, else the household's play preference. This screen
// never WRITES that preference: printing a drill must not switch word problems
// off in the kid's games.
function initialProblemType() {
  const last = stored(PROBLEM_TYPE_KEY);
  if (PROBLEM_TYPES.includes(last)) return last;
  return loadAllowWordProblemsSync() ? "mixed" : "practice";
}

// Worded problems come from the bank, so the topic's items must be in memory
// before a sheet is drawn. Without Supabase (local dev, e2e) the fetch fails;
// DEV then reads the full corpus from disk. The branch is compiled out of the
// production bundle, which must never carry the corpus.
async function loadTopic(mode) {
  const result = await ensureModeLoaded(mode);
  if (result.status === "failed" && import.meta.env.DEV) {
    const { FULL_ITEMS } = await import("./itemBank/fullBank.js");
    addBankItems(FULL_ITEMS.filter((item) => item.modeId === mode), "dev-disk");
    return { ...result, status: "loaded" };
  }
  return result;
}

// What the loaded bank can fill for a skill: which problem types, how many
// sheets. Nothing is ever padded with generated filler — an option the bank
// cannot fill is switched off, with the reason.
function capacityFor(skill) {
  if (!skill) return null;
  if (skill.legacy) {
    return {
      practice: { sheets: Infinity },
      mixed: { sheets: Infinity },
      stories: { sheets: 0, reason: "Word-problem sheets for this topic are on the way." },
    };
  }
  const budget = LAYOUTS[skill.layout];
  const stories = storyAvailability(skill.id);
  const practice = practiceAvailability(skill.id);
  const thin = stories === 0
    ? "There are no word problems for this skill yet."
    : "There are not enough word problems for this skill yet.";
  const practiceSheets = Math.floor(practice / budget.practice);
  const mixedSheets = Math.min(Math.floor(practice / budget.mixed), Math.floor(stories / MIXED_STORIES));
  const storySheets = Math.floor(stories / STORIES_PER_SHEET);
  const offline = "Couldn't load this topic's problems — check your connection.";
  return {
    practice: { sheets: practiceSheets, reason: practiceSheets ? null : offline },
    mixed: { sheets: mixedSheets, reason: mixedSheets ? null : practiceSheets ? thin : offline },
    stories: { sheets: storySheets, reason: storySheets ? null : thin },
  };
}

// Bridge sheet for topics without authored skills yet (legacySkills.js): the
// old two-block drill. Goes away with the last bridge row.
function LegacySheet({ log, title, footer, answerKey = false, sheetIndex, sheetCount, breakBefore = false }) {
  let n = 0;
  const next = () => ++n;
  const answerOf = (q) => (answerKey ? q.answer : null);
  const Second = log.computational ? InlineItem : PromptItem;
  return (
    <div className={SHEET_FRAME} style={breakBefore ? { pageBreakBefore: "always" } : undefined}>
      <SheetHeader line={`${title}${sheetCount > 1 ? ` · Sheet ${sheetIndex + 1} of ${sheetCount}` : ""}`} />
      <NameDateRow answerKey={answerKey} />
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
      <div className="mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6" style={{ rowGap: "14px" }}>
          {log.partB.map((q, i) => (
            <Second key={i} question={q} number={next()} answer={answerOf(q)} />
          ))}
        </div>
      </div>
      {log.wordProblems?.length > 0 && (
        <div className="mt-6 space-y-4">
          {log.wordProblems.map((item, i) => (
            <WordProblem key={i} item={item} number={next()} showAnswer={answerKey} />
          ))}
        </div>
      )}
      <SheetFooter itemCount={log.itemCount} right={footer} />
    </div>
  );
}

export default function PrintableWorksheet() {
  const { theme } = useTheme();
  const [grade, setGrade] = useState(initialGrade);
  const [skillId, setSkillId] = useState(null);
  const [problemType, setProblemType] = useState(initialProblemType);
  const [sheetCount, setSheetCount] = useState(1);
  const [showAnswerKey, setShowAnswerKey] = useState(true);
  const [sheets, setSheets] = useState(null);
  // { mode, status: "loading" | "ready" } — the topic whose bank is in memory.
  const [topic, setTopic] = useState(null);
  const loading = useRef(null);

  const skill = useMemo(() => ALL_SKILLS.find((s) => s.id === skillId) || null, [skillId]);
  const topics = useMemo(() => {
    const inGrade = ALL_SKILLS.filter((s) => s.grade === grade);
    return MODE_IDS.map((mode) => ({ mode, skills: inGrade.filter((s) => s.mode === mode) })).filter((t) => t.skills.length);
  }, [grade]);

  const ready = skill && topic?.mode === skill.mode && topic.status === "ready";
  const capacity = useMemo(() => (ready ? capacityFor(skill) : null), [ready, skill]);
  // A remembered "Word problems" choice must not strand a skill that has none.
  const activeType = capacity && !capacity[problemType].sheets && capacity.practice.sheets ? "practice" : problemType;
  const maxSheets = capacity ? capacity[activeType].sheets : Infinity;
  const activeCount = Math.max(1, Math.min(sheetCount, maxSheets));
  const blocked = capacity && !capacity[activeType].sheets ? capacity[activeType].reason : null;

  const chooseSkill = useCallback((next) => {
    setSkillId(next.id);
    setSheets(null);
    if (next.legacy) {
      setTopic({ mode: next.mode, status: "ready" });
      return;
    }
    setTopic({ mode: next.mode, status: "loading" });
    const request = loadTopic(next.mode).then(() => {
      if (loading.current === request) setTopic({ mode: next.mode, status: "ready" });
    });
    loading.current = request;
  }, []);

  const chooseGrade = (next) => {
    setGrade(next);
    store(GRADE_KEY, next);
    if (skill && skill.grade !== next) {
      setSkillId(null);
      setSheets(null);
    }
  };

  const chooseProblemType = (next) => {
    setProblemType(next);
    store(PROBLEM_TYPE_KEY, next);
    setSheets(null);
  };

  const handleGenerate = () => {
    if (!ready || blocked) return;
    if (skill.legacy) {
      const allowWordProblems = activeType === "mixed";
      setSheets(Array.from({ length: activeCount }, () => generateFlightLog(skill.mode, skill.level, { allowWordProblems })));
      return;
    }
    // One seen-set for the whole print run, so five sheets are five different sheets.
    const seenKeys = new Set();
    setSheets(Array.from({ length: activeCount }, () => generateWorksheet(skill.id, { problemType: activeType, seenKeys })));
  };

  // The browser's default PDF filename is the document title.
  useEffect(() => {
    if (!sheets || !skill) return undefined;
    const previous = document.title;
    document.title = skill.legacy
      ? `Larkit Worksheet - ${TOPIC_LABELS[skill.mode]} (${GRADE_LABELS[skill.grade]})`
      : documentTitle(skill);
    return () => {
      document.title = previous;
    };
  }, [sheets, skill]);

  // DEV-only QA hook: the e2e asserts sheet COMPOSITION from here instead of
  // scraping prose out of the printed DOM.
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== "undefined") {
      window.__larkitWorksheets = { sheets: sheets || [], skillId, problemType: activeType };
    }
  }, [sheets, skillId, activeType]);

  const title = skill
    ? skill.legacy
      ? [TOPIC_LABELS[skill.mode], skill.title, GRADE_LABELS[skill.grade]].join(" · ")
      : headerLine(skill)
    : "";
  const footer = skill ? [TOPIC_LABELS[skill.mode], skill.ccss[0]].filter(Boolean).join(" · ") : "";
  const Sheet = skill?.legacy ? LegacySheet : WorksheetSheet;
  const sectionLabel = `text-sm font-semibold ${theme.textSecondary} mb-2 uppercase tracking-wide`;
  const chip = (active) =>
    `rounded-2xl border-2 font-bold cursor-pointer transition-colors ${
      active ? `${theme.selectedBorder} ${theme.selectedText}` : `${theme.cardBorder} bg-white ${theme.textSecondary} hover:bg-gray-50`
    }`;
  const typeLabels = {
    practice: skill?.source?.kind === "computation" ? "Computation" : "Practice",
    stories: "Word problems",
    mixed: "Mixed",
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <div className="no-print max-w-xl mx-auto px-4 py-6">
        <h1 className={`text-2xl font-semibold font-display ${theme.textPrimary} mb-2`}>Print a Worksheet</h1>
        <p className={`text-sm ${theme.textSecondary} mb-6`}>
          Pick a grade, then the skill to practice. One sheet, one skill — the answer key prints as its own sheet.
        </p>

        <div className={`${theme.cardBg} backdrop-blur rounded-3xl shadow-lg p-6 space-y-5`}>
          {/* Grade */}
          <div>
            <p className={sectionLabel}>Grade</p>
            <div className="grid grid-cols-6 gap-2" role="group" aria-label="Grade">
              {GRADES.map((g) => (
                <button
                  key={g}
                  aria-label={GRADE_LABELS[g]}
                  aria-pressed={g === grade}
                  className={`py-2.5 text-lg ${chip(g === grade)}`}
                  onClick={() => chooseGrade(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Skills for the grade, grouped by topic */}
          <div>
            <p className={sectionLabel}>What to practice</p>
            {!grade ? (
              <p className={`text-sm ${theme.textMuted}`}>Pick a grade to see its skills.</p>
            ) : (
              <div
                className={`max-h-[46vh] overflow-y-auto rounded-2xl border-2 ${theme.cardBorder} bg-white`}
                role="radiogroup"
                aria-label={`${GRADE_LABELS[grade]} skills`}
              >
                {topics.map(({ mode, skills }) => (
                  <section key={mode} aria-label={TOPIC_LABELS[mode]}>
                    <h2 className={`sticky top-0 z-10 bg-white/95 backdrop-blur px-4 pt-3 pb-1.5 text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>
                      {TOPIC_LABELS[mode]}
                    </h2>
                    {skills.map((s) => {
                      const active = s.id === skillId;
                      return (
                        <button
                          key={s.id}
                          role="radio"
                          aria-checked={active}
                          className={`w-full flex items-start gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors ${
                            active ? "bg-teal/10" : "hover:bg-gray-50"
                          }`}
                          onClick={() => chooseSkill(s)}
                        >
                          <span
                            className={`mt-1 h-4 w-4 flex-none rounded-full border-2 ${
                              active ? "border-teal bg-teal shadow-[inset_0_0_0_3px_white]" : "border-gray-300"
                            }`}
                          />
                          <span className={`flex-1 text-sm font-semibold leading-snug ${active ? theme.selectedText : theme.textPrimary}`}>
                            {s.title}
                          </span>
                          {s.ccss[0] && (
                            <span className={`flex-none pt-0.5 text-[11px] font-bold tabular-nums ${theme.textMuted}`}>{s.ccss[0]}</span>
                          )}
                        </button>
                      );
                    })}
                  </section>
                ))}
              </div>
            )}
          </div>

          {/* Problem type */}
          <div>
            <p className={sectionLabel}>Problems</p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Problem type">
              {PROBLEM_TYPES.map((type) => {
                const off = capacity && !capacity[type].sheets;
                return (
                  <button
                    key={type}
                    aria-label={PROBLEM_TYPE_ARIA[type]}
                    aria-pressed={type === activeType}
                    disabled={Boolean(off)}
                    className={`py-2.5 text-sm ${chip(type === activeType)} disabled:opacity-40 disabled:cursor-not-allowed`}
                    onClick={() => chooseProblemType(type)}
                  >
                    {typeLabels[type]}
                  </button>
                );
              })}
            </div>
            {capacity &&
              PROBLEM_TYPES.filter((type) => type !== "practice" && !capacity[type].sheets)
                .slice(0, 1)
                .map((type) => (
                  <p key={type} className={`mt-2 text-xs ${theme.textMuted}`}>{capacity[type].reason}</p>
                ))}
          </div>

          {/* Number of sheets */}
          <div>
            <p className={sectionLabel}>Number of Sheets</p>
            <div className="flex gap-2">
              {SHEET_COUNTS.map((count) => (
                <button
                  key={count}
                  aria-label={`${count} ${count === 1 ? "sheet" : "sheets"}`}
                  aria-pressed={count === activeCount}
                  disabled={count > maxSheets && count > 1}
                  className={`flex-1 py-3 text-lg ${chip(count === activeCount)} disabled:opacity-40 disabled:cursor-not-allowed`}
                  onClick={() => {
                    setSheetCount(count);
                    setSheets(null);
                  }}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Answer Key toggle */}
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${theme.textSecondary} uppercase tracking-wide`}>Include Answer Key</p>
            <button
              className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${showAnswerKey ? "bg-teal" : "bg-gray-300"}`}
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

          {blocked && (
            <p className="text-sm font-semibold text-red-700" role="alert">
              {blocked}{" "}
              <button className="underline cursor-pointer" onClick={() => chooseSkill(skill)}>
                Retry
              </button>
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <motion.button
              className="flex-1 h-14 bg-teal text-cream font-display font-semibold text-lg rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!ready || Boolean(blocked)}
              onClick={handleGenerate}
            >
              {!skill ? "Pick a skill" : ready ? "Generate" : "Loading…"}
            </motion.button>
            {sheets && (
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

      {/* The sheets */}
      {sheets &&
        sheets.map((sheet, i) => {
          const props = skill.legacy ? { log: sheet } : { sheet };
          return (
            <div key={i} className="max-w-2xl mx-auto px-4 pb-8 print:px-0 print:pb-0 print:max-w-none space-y-4 print:space-y-0">
              <Sheet {...props} title={title} footer={footer} sheetIndex={i} sheetCount={sheets.length} breakBefore={i > 0} />
              {showAnswerKey && (
                <Sheet {...props} title={title} footer={footer} answerKey sheetIndex={i} sheetCount={sheets.length} breakBefore />
              )}
            </div>
          );
        })}
    </div>
  );
}
