import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { MODE_IDS } from "./modes";
import { loadTopic } from "./itemBank/loadTopic.js";
import { activeKidGrade } from "./kidProfiles.js";
import { gradeIndex } from "./gradeSeed.js";
import { loadAllowWordProblemsSync } from "./userPreferences.js";
import { useTheme } from "./useTheme";
import { generateWorksheetRun, worksheetCapacity } from "./worksheets/generateWorksheet.js";
import { PROBLEM_TYPES } from "./worksheets/layouts.js";
import { documentTitle, headerLine, skillById, skillForModeLevel } from "./skills/index.js";
import { GRADES, GRADE_LABELS, TOPIC_LABELS, WORKSHEET_SKILLS } from "./skills/catalog.js";
import WorksheetSheet from "./worksheets/WorksheetSheet.jsx";

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

// Deep links: /worksheets?skill=<id>&type=mixed&sheets=2&key=0&go=1 — what the
// home page and the public worksheet pages link to. `skill` alone fixes the
// grade and topic; old ?mode=&level= links land on the nearest skill.
function linkedState(params) {
  const skill =
    skillById(params.get("skill")) ||
    (params.get("mode") ? skillForModeLevel(params.get("mode"), Number(params.get("level")) || 1) : null);
  const type = params.get("type");
  const count = Number(params.get("sheets"));
  return {
    skill,
    problemType: PROBLEM_TYPES.includes(type) ? type : null,
    sheetCount: SHEET_COUNTS.includes(count) ? count : null,
    answerKey: params.has("key") ? params.get("key") !== "0" : null,
    go: params.get("go") === "1",
  };
}

// What the loaded bank can fill for a skill: which problem types, how many
// sheets. Nothing is ever padded with generated filler — an option the bank
// cannot fill is switched off, with the reason.
function capacityFor(skill) {
  if (!skill) return null;
  const sheets = worksheetCapacity(skill.id);
  const offline = "Couldn't load this topic's problems — check your connection.";
  const thin = sheets.practice
    ? "There are not enough word problems for this skill yet."
    : offline;
  return {
    practice: { sheets: sheets.practice, reason: sheets.practice ? null : offline },
    mixed: { sheets: sheets.mixed, reason: sheets.mixed ? null : thin },
    stories: { sheets: sheets.stories, reason: sheets.stories ? null : thin },
  };
}

export default function PrintableWorksheet() {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [linked] = useState(() => linkedState(searchParams));
  const [grade, setGrade] = useState(() => linked.skill?.grade ?? initialGrade());
  const [topicMode, setTopicMode] = useState(linked.skill?.mode ?? null);
  const [skillId, setSkillId] = useState(linked.skill?.id ?? null);
  const [problemType, setProblemType] = useState(() => linked.problemType ?? initialProblemType());
  const [sheetCount, setSheetCount] = useState(linked.sheetCount ?? 1);
  const [showAnswerKey, setShowAnswerKey] = useState(linked.answerKey ?? true);
  const autoGenerate = useRef(linked.go);
  const [sheets, setSheets] = useState(null);
  // The topic whose bank is in memory; `attempt` re-runs a failed load.
  const [loadedMode, setLoadedMode] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const skill = useMemo(() => WORKSHEET_SKILLS.find((s) => s.id === skillId) || null, [skillId]);
  const topics = useMemo(() => {
    const inGrade = WORKSHEET_SKILLS.filter((s) => s.grade === grade);
    return MODE_IDS.map((mode) => ({ mode, skills: inGrade.filter((s) => s.mode === mode) })).filter((t) => t.skills.length);
  }, [grade]);

  const topicSkills = useMemo(() => topics.find((t) => t.mode === topicMode)?.skills || [], [topics, topicMode]);

  const ready = Boolean(skill) && loadedMode === skill.mode;
  const capacity = useMemo(() => (ready ? capacityFor(skill) : null), [ready, skill]);
  // A remembered "Word problems" choice must not strand a skill that has none.
  const activeType = capacity && !capacity[problemType].sheets && capacity.practice.sheets ? "practice" : problemType;
  const maxSheets = capacity ? capacity[activeType].sheets : Infinity;
  const activeCount = Math.max(1, Math.min(sheetCount, maxSheets));
  const blocked = capacity && !capacity[activeType].sheets ? capacity[activeType].reason : null;

  const chooseSkill = (next) => {
    setSkillId(next.id);
    setSheets(null);
  };

  const chooseGrade = (next) => {
    setGrade(next);
    store(GRADE_KEY, next);
    if (skill && skill.grade !== next) {
      setSkillId(null);
      setSheets(null);
    }
    // Keep the topic when the new grade has it too (Grade 3 → 4 Multiplication).
    if (topicMode && !WORKSHEET_SKILLS.some((s) => s.grade === next && s.mode === topicMode)) setTopicMode(null);
  };

  const chooseTopic = (next) => {
    setTopicMode(next);
    if (skill && skill.mode !== next) {
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
    setSheets(generateWorksheetRun(skill.id, { problemType: activeType, sheets: activeCount }));
  };

  // Worded problems come from the bank: load the picked skill's topic, and
  // for a go=1 deep link print as soon as it is in.
  const mode = skill?.mode;
  useEffect(() => {
    if (!mode) return undefined;
    let live = true;
    loadTopic(mode).then(() => {
      if (!live) return;
      setLoadedMode(mode);
      if (!autoGenerate.current) return;
      autoGenerate.current = false;
      const run = generateWorksheetRun(linked.skill.id, {
        problemType: linked.problemType ?? initialProblemType(),
        sheets: linked.sheetCount ?? 1,
      });
      if (run.length) setSheets(run);
    });
    return () => {
      live = false;
    };
  }, [mode, attempt, linked]);

  // Keep the address shareable: it always names what is on screen.
  useEffect(() => {
    if (!skillId) return;
    const next = { skill: skillId, type: activeType, sheets: String(activeCount) };
    if (!showAnswerKey) next.key = "0";
    setSearchParams(next, { replace: true });
  }, [skillId, activeType, activeCount, showAnswerKey, setSearchParams]);

  // The browser's default PDF filename is the document title.
  useEffect(() => {
    if (!sheets || !skill) return undefined;
    const previous = document.title;
    document.title = documentTitle(skill);
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

  const title = skill ? headerLine(skill) : "";
  const footer = skill ? `${TOPIC_LABELS[skill.mode]} · ${GRADE_LABELS[skill.grade]}` : "";
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
          Pick a grade, a topic, then the skill to practice. One sheet, one skill — the answer key prints as its own sheet.
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

          {/* Topic: the grade's high-level areas */}
          <div>
            <p className={sectionLabel}>Topic</p>
            {!grade ? (
              <p className={`text-sm ${theme.textMuted}`}>Pick a grade to see its topics.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-label={`${GRADE_LABELS[grade]} topics`}>
                {topics.map(({ mode }) => (
                  <button
                    key={mode}
                    aria-pressed={mode === topicMode}
                    className={`px-3 py-2.5 text-sm leading-tight ${chip(mode === topicMode)}`}
                    onClick={() => chooseTopic(mode)}
                  >
                    {TOPIC_LABELS[mode]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Skill: what exactly, within the topic */}
          {grade && (
            <div>
              <p className={sectionLabel}>Skill</p>
              {!topicSkills.length ? (
                <p className={`text-sm ${theme.textMuted}`}>Pick a topic to see its skills.</p>
              ) : (
                <div
                  className={`rounded-2xl border-2 ${theme.cardBorder} bg-white overflow-hidden`}
                  role="radiogroup"
                  aria-label={`${GRADE_LABELS[grade]} ${TOPIC_LABELS[topicMode]} skills`}
                >
                  {topicSkills.map((s) => {
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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
              <button className="underline cursor-pointer" onClick={() => setAttempt((n) => n + 1)}>
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
              {!grade ? "Pick a grade" : !topicMode ? "Pick a topic" : !skill ? "Pick a skill" : ready ? "Generate" : "Loading…"}
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
        sheets.map((sheet, i) => (
          <div key={i} className="max-w-2xl mx-auto px-4 pb-8 print:px-0 print:pb-0 print:max-w-none space-y-4 print:space-y-0">
            <WorksheetSheet sheet={sheet} title={title} footer={footer} sheetIndex={i} sheetCount={sheets.length} breakBefore={i > 0} />
            {showAnswerKey && (
              <WorksheetSheet sheet={sheet} title={title} footer={footer} answerKey sheetIndex={i} sheetCount={sheets.length} breakBefore />
            )}
          </div>
        ))}
    </div>
  );
}
