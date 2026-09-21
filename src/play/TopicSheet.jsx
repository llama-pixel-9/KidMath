import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Play, Star, Volume2 } from "lucide-react";
import { useTheme } from "../useTheme";
import { activeKidGrade } from "../kidProfiles";
import { gradeIndex } from "../gradeSeed.js";
import { loadProgress, loadProgressSync, saveTopicState } from "../progressStore";
import { loadSessions, loadSessionsSync } from "../analytics/sessionLog.js";
import { loadTopic } from "../itemBank/loadTopic.js";
import { speak, speechAvailable } from "../speech.js";
import { GRADE_LABELS, TOPIC_LABELS } from "../skills/catalog.js";
import { MASTERY_RULE, STATES, stateOf } from "../skills/mastery.js";
import { playSkillById } from "../skills/play.js";
import { GRADE_UP, advanceGrade, gradeUpStatus, gradeView, resolveTopic } from "../skills/topicState.js";

/**
 * What a kid sees after tapping a topic: one big default — "Practice — Larkit
 * picks", an adaptive mix across their grade's skills, weakest first — and
 * under it the grade's skills with where they stand, each tappable. No levels.
 *
 * The grade is never asked: it comes from the kid's profile (and, for a kid
 * who has played, from where they already are). Earlier grades are always
 * open; a later grade opens when this one is mastered, or when a parent opens
 * it. The same skills, with the same names, are what /worksheets prints.
 */

const rightCount = (skill, mastery) =>
  Math.min((mastery[skill.id]?.recent || "").split("").filter((c) => c === "1").length, MASTERY_RULE.minAttempts);

function stateLabel(skill, mastery) {
  if (skill.state === "mastered") return skill.needsReview ? "mastered · worth a review" : "mastered";
  if (skill.state === "new") return "new";
  return `${rightCount(skill, mastery)} of ${MASTERY_RULE.minAttempts}`;
}

// Where a skill stands, as a badge a kid can read without words: a play
// button (not started), a ring filling toward mastery, a star.
function SkillBadge({ skill, right }) {
  if (skill.state === "mastered") {
    return (
      <span className="flex-none h-10 w-10 rounded-full bg-teal flex items-center justify-center" aria-hidden="true">
        <Star className="h-5 w-5 text-sun fill-sun" />
      </span>
    );
  }
  if (skill.state === "new") {
    return (
      <span className="flex-none h-10 w-10 rounded-full bg-seafoam/50 flex items-center justify-center" aria-hidden="true">
        <Play className="h-4 w-4 text-teal fill-teal translate-x-px" />
      </span>
    );
  }
  const radius = 17;
  const around = 2 * Math.PI * radius;
  return (
    <span className="relative flex-none h-10 w-10" aria-hidden="true">
      <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
        <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="4" className="stroke-ink/10" />
        <circle
          cx="20" cy="20" r={radius} fill="none" strokeWidth="4" strokeLinecap="round"
          className="stroke-teal"
          strokeDasharray={around}
          strokeDashoffset={around * (1 - right / MASTERY_RULE.minAttempts)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-teal">{right}</span>
    </span>
  );
}

function SkillStatus({ skill, right }) {
  const { theme } = useTheme();
  const text =
    skill.state === "mastered"
      ? skill.needsReview ? "Mastered · worth a review" : "Mastered"
      : skill.state === "new"
        ? "Not started"
        : `${right} of ${MASTERY_RULE.minAttempts} right — keep going`;
  return (
    <span className={`block mt-0.5 text-xs font-semibold ${skill.state === "mastered" ? "text-teal" : theme.textMuted}`}>{text}</span>
  );
}

export default function TopicSheet({ mode }) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const profileGrade = activeKidGrade();
  const [progress, setProgress] = useState(() => loadProgressSync(mode));
  const [sessions, setSessions] = useState(loadSessionsSync);
  const topic = useMemo(() => {
    const resolved = resolveTopic(mode, progress, { profileGrade, sessions });
    // A finished grade whose next grade is already open (or that was a single
    // skill) has nothing left to earn: the focus moves up, and that is saved
    // along with anything else the store was missing.
    const status = resolved ? gradeUpStatus(resolved) : null;
    if (status?.kind !== "advance" && status?.kind !== "auto") return resolved;
    const patch = advanceGrade(resolved, status.nextGrade);
    const moved = resolveTopic(mode, { ...progress, ...resolved.toSave, ...patch }, { profileGrade, sessions });
    return { ...moved, toSave: { ...resolved.toSave, ...patch } };
  }, [mode, progress, profileGrade, sessions]);
  const [shownGrade, setShownGrade] = useState(null);
  const grade = shownGrade && topic?.open.includes(shownGrade) ? shownGrade : topic?.grade;
  const view = useMemo(() => (topic ? gradeView(topic, grade) : null), [topic, grade]);
  // Skill names are parent wording; the littlest kids get them read aloud.
  const readAloud = speechAvailable() && (gradeIndex(profileGrade) ?? 9) <= 1;

  // Signed-in families keep progress and the practice log in the cloud; the
  // sync reads above are this device's copy and paint first.
  useEffect(() => {
    let live = true;
    Promise.all([loadProgress(mode), loadSessions()])
      .then(([cloudProgress, log]) => {
        if (!live) return;
        setProgress(cloudProgress);
        setSessions(log.sessions);
      })
      .catch(() => {});
    // The session draws from the skill's own bank rows — have them ready.
    loadTopic(mode);
    return () => {
      live = false;
    };
  }, [mode]);

  // Write down what a kid who played before skills was missing (their grade,
  // mastery rebuilt from the log). Never the level.
  const pending = topic ? JSON.stringify(topic.toSave) : "{}";
  useEffect(() => {
    if (pending !== "{}") saveTopicState(mode, JSON.parse(pending)).catch(() => {});
  }, [mode, pending]);

  const status = useMemo(() => (topic ? gradeUpStatus(topic) : null), [topic]);

  if (!topic || !view) return null;
  const challenge = status?.kind === "challenge" && grade === topic.grade ? status : null;

  // A grown-up's pin wins whatever grade is showing — until it is mastered.
  const pinned =
    topic.pinnedSkillId && stateOf(topic.mastery, topic.pinnedSkillId) !== STATES.MASTERED ? playSkillById(topic.pinnedSkillId) : null;
  const start = (query) => navigate(`/play/${mode}?${query}`);

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <div className="max-w-sm mx-auto px-4 py-6">
        <Link to="/" className={`text-sm font-bold ${theme.textSecondary}`}>← Topics</Link>
        <h1 className={`mt-3 text-3xl font-semibold font-display ${theme.textPrimary}`}>{TOPIC_LABELS[mode]}</h1>
        <p className={`text-sm font-semibold ${theme.textSecondary}`}>{GRADE_LABELS[grade]}</p>

        {topic.open.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Grade">
            {topic.open.map((g) => (
              <button
                key={g}
                aria-pressed={g === grade}
                aria-label={GRADE_LABELS[g]}
                className={`h-9 min-w-9 px-3 rounded-full border-2 text-sm font-bold cursor-pointer ${
                  g === grade ? `${theme.selectedBorder} ${theme.selectedText}` : `${theme.cardBorder} bg-white ${theme.textSecondary}`
                }`}
                onClick={() => setShownGrade(g)}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {challenge && (
          <div className="mt-5 rounded-2xl bg-sun-light px-4 py-3 text-ink">
            <p className="text-[15px] font-extrabold">Every {GRADE_LABELS[grade]} skill mastered!</p>
            {challenge.needsPractice ? (
              <p className="text-[14px] font-bold text-ink/80">One more good practice first, then the {GRADE_LABELS[challenge.nextGrade]} challenge comes back.</p>
            ) : (
              <>
                <p className="text-[14px] font-bold text-ink/80">
                  {GRADE_UP.questions} questions, {GRADE_UP.pass} to pass — and {GRADE_LABELS[challenge.nextGrade]} opens. No stars ride on it.
                </p>
                <button
                  className="mt-2 w-full h-12 rounded-[14px] bg-ink text-cream font-display font-semibold text-lg cursor-pointer"
                  onClick={() => start("challenge=1")}
                >
                  Take the {GRADE_LABELS[challenge.nextGrade]} challenge
                </button>
              </>
            )}
          </div>
        )}

        <button
          className="mt-5 w-full h-16 bg-teal text-cream font-display font-semibold text-xl rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer"
          onClick={() => start(pinned ? `skill=${pinned.id}` : `mix=1&grade=${grade}`)}
        >
          ▶ Practice — {pinned ? pinned.title : "Larkit picks"}
        </button>
        <p className={`mt-2 text-xs font-semibold text-center ${theme.textMuted}`}>
          {pinned ? "Picked by a grown-up." : "A mix of these skills — the ones you need most come first."}
        </p>

        <h2 className={`mt-7 mb-2 text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Or pick a skill</h2>
        <ul className="space-y-2">
          {view.skills.map((skill) => (
            <li
              key={skill.id}
              className={`flex items-stretch rounded-2xl border-2 ${theme.cardBorder} bg-white shadow-[0_3px_0_rgba(6,74,65,0.08)] overflow-hidden`}
            >
              <button
                className="flex-1 min-w-0 flex items-center gap-3 pl-3 pr-2 py-3 text-left cursor-pointer btn-press hover:bg-seafoam/20"
                aria-label={`${skill.title} — ${stateLabel(skill, topic.mastery)}`}
                onClick={() => start(`skill=${skill.id}`)}
              >
                <SkillBadge skill={skill} right={rightCount(skill, topic.mastery)} />
                <span className="flex-1 min-w-0">
                  <span className={`block text-[15px] font-bold leading-snug ${theme.textPrimary}`}>{skill.title}</span>
                  <SkillStatus skill={skill} right={rightCount(skill, topic.mastery)} />
                </span>
                {!readAloud && <ChevronRight className="flex-none h-5 w-5 text-ink/30" aria-hidden="true" />}
              </button>
              {readAloud && (
                <button
                  className="flex-none px-3 border-l-2 border-ink/5 text-teal cursor-pointer hover:bg-seafoam/20"
                  aria-label={`Read aloud: ${skill.title}`}
                  onClick={() => speak(skill.title)}
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              )}
            </li>
          ))}
        </ul>

        <p className={`mt-4 text-sm font-bold text-center ${theme.textSecondary}`}>
          {view.mastered} of {view.total} {GRADE_LABELS[grade]} skills mastered
        </p>
        {view.complete && (
          <p className={`mt-1 text-xs font-semibold text-center ${theme.textMuted}`}>
            {view.nextGrade ? `Every ${GRADE_LABELS[grade]} skill here is mastered.` : `${TOPIC_LABELS[mode]} complete!`}
          </p>
        )}
      </div>
    </div>
  );
}
