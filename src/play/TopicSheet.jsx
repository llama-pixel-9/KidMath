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
import { topicSheetModel } from "../skills/flow.js";

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

// Where a skill stands, as a badge a kid can read without words: a play
// button (not started), a ring filling toward mastery, a star.
function SkillBadge({ skill }) {
  const { right, goal } = skill;
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
          strokeDashoffset={around * (1 - right / goal)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-teal">{right}</span>
    </span>
  );
}

function SkillStatus({ skill }) {
  const { theme } = useTheme();
  return (
    <span className={`block mt-0.5 text-xs font-semibold ${skill.state === "mastered" ? "text-teal" : theme.textMuted}`}>{skill.statusText}</span>
  );
}

export default function TopicSheet({ mode }) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const profileGrade = activeKidGrade();
  const [progress, setProgress] = useState(() => loadProgressSync(mode));
  const [sessions, setSessions] = useState(loadSessionsSync);
  const [shownGrade, setShownGrade] = useState(null);
  // What the sheet shows is skills/flow.js's — the same model iOS renders.
  const sheet = useMemo(
    () => topicSheetModel(mode, progress, { profileGrade, sessions }, shownGrade),
    [mode, progress, profileGrade, sessions, shownGrade]
  );
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
  const pending = sheet ? JSON.stringify(sheet.toSave) : "{}";
  useEffect(() => {
    if (pending !== "{}") saveTopicState(mode, JSON.parse(pending)).catch(() => {});
  }, [mode, pending]);

  if (!sheet) return null;
  const { grade, flight } = sheet;
  const request = sheet.practiceRequest;
  const start = (query) => navigate(`/play/${mode}?${query}`);

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <div className="max-w-sm mx-auto px-4 py-6">
        <Link to="/" className={`text-sm font-bold ${theme.textSecondary}`}>← Topics</Link>
        <h1 className={`mt-3 text-3xl font-semibold font-display ${theme.textPrimary}`}>{sheet.topicLabel}</h1>
        <p className={`text-sm font-semibold ${theme.textSecondary}`}>{sheet.gradeLabel}</p>

        {sheet.open.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Grade">
            {sheet.open.map((g) => (
              <button
                key={g.grade}
                aria-pressed={g.grade === grade}
                aria-label={g.label}
                className={`h-9 min-w-9 px-3 rounded-full border-2 text-sm font-bold cursor-pointer ${
                  g.grade === grade ? `${theme.selectedBorder} ${theme.selectedText}` : `${theme.cardBorder} bg-white ${theme.textSecondary}`
                }`}
                onClick={() => setShownGrade(g.grade)}
              >
                {g.grade}
              </button>
            ))}
          </div>
        )}

        {flight && (
          <div className="mt-5 rounded-2xl bg-sun-light px-4 py-3 text-ink">
            <p className="text-[15px] font-extrabold">{flight.headline}</p>
            <p className="text-[14px] font-bold text-ink/80">{flight.detail}</p>
            {!flight.needsPractice && (
              <button
                className="mt-2 w-full h-12 rounded-[14px] bg-ink text-cream font-display font-semibold text-lg cursor-pointer"
                onClick={() => start("challenge=1")}
              >
                {flight.button}
              </button>
            )}
          </div>
        )}

        <button
          className="mt-5 w-full h-16 bg-teal text-cream font-display font-semibold text-xl rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer"
          onClick={() => start(request.skill ? `skill=${request.skill}` : `mix=1&grade=${request.grade}`)}
        >
          ▶ {sheet.practiceLabel}
        </button>
        <p className={`mt-2 text-xs font-semibold text-center ${theme.textMuted}`}>{sheet.practiceNote}</p>

        <h2 className={`mt-7 mb-2 text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Or pick a skill</h2>
        <ul className="space-y-2">
          {sheet.skills.map((skill) => (
            <li
              key={skill.id}
              className={`flex items-stretch rounded-2xl border-2 ${theme.cardBorder} bg-white shadow-[0_3px_0_rgba(6,74,65,0.08)] overflow-hidden`}
            >
              <button
                className="flex-1 min-w-0 flex items-center gap-3 pl-3 pr-2 py-3 text-left cursor-pointer btn-press hover:bg-seafoam/20"
                aria-label={`${skill.title} — ${skill.stateLabel}`}
                onClick={() => start(`skill=${skill.id}`)}
              >
                <SkillBadge skill={skill} />
                <span className="flex-1 min-w-0">
                  <span className={`block text-[15px] font-bold leading-snug ${theme.textPrimary}`}>{skill.title}</span>
                  <SkillStatus skill={skill} />
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

        <p className={`mt-4 text-sm font-bold text-center ${theme.textSecondary}`}>{sheet.footer}</p>
        {sheet.completeNote && <p className={`mt-1 text-xs font-semibold text-center ${theme.textMuted}`}>{sheet.completeNote}</p>}
      </div>
    </div>
  );
}
