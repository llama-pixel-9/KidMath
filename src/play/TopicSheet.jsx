import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Volume2 } from "lucide-react";
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

const MARK = { mastered: "★", practicing: "◐", new: "○" };

function stateLabel(skill, mastery) {
  if (skill.state === "mastered") return skill.needsReview ? "mastered · worth a review" : "mastered";
  if (skill.state === "new") return "new";
  const right = (mastery[skill.id]?.recent || "").split("").filter((c) => c === "1").length;
  return `${Math.min(right, MASTERY_RULE.minAttempts)} of ${MASTERY_RULE.minAttempts}`;
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

        <h2 className={`mt-6 mb-2 text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Or pick a skill</h2>
        <ul className={`rounded-2xl border-2 ${theme.cardBorder} bg-white overflow-hidden divide-y divide-slate-100`}>
          {view.skills.map((skill) => (
            <li key={skill.id} className="flex items-stretch">
              <button
                className="flex-1 flex items-start gap-3 px-4 py-3 text-left cursor-pointer hover:bg-gray-50"
                aria-label={`${skill.title} — ${stateLabel(skill, topic.mastery)}`}
                onClick={() => start(`skill=${skill.id}`)}
              >
                <span className={`text-lg leading-none pt-0.5 ${skill.state === "mastered" ? "text-teal" : "text-slate-400"}`} aria-hidden="true">
                  {MARK[skill.state]}
                </span>
                <span className={`flex-1 text-sm font-semibold leading-snug ${theme.textPrimary}`}>{skill.title}</span>
                <span className={`flex-none pt-0.5 text-[11px] font-bold ${theme.textMuted}`}>{stateLabel(skill, topic.mastery)}</span>
              </button>
              {readAloud && (
                <button className="px-3 text-teal cursor-pointer" aria-label={`Read aloud: ${skill.title}`} onClick={() => speak(skill.title)}>
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
