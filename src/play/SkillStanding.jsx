import { motion } from "framer-motion";

const MARK = { mastered: "★", practicing: "◐", new: "○" };

// Moving up a grade is news, stated kindly either way: earned in the challenge
// (or handed over when there was nothing left to earn), not yet, or next time.
function GradeUpNote({ standing }) {
  const { gradeUp, gradeLabel, topicLabel } = standing;
  let headline;
  let detail;
  if (gradeUp.passed) {
    headline = `You finished ${gradeLabel} ${topicLabel}!`;
    detail = `${gradeUp.nextGradeLabel} is open.`;
  } else if (gradeUp.challenge) {
    headline = `${gradeUp.score} of 6 — not yet.`;
    detail = gradeUp.reearn ? "One more good practice first, then your Fledging Flight comes back." : "A little more practice, then try again.";
  } else if (gradeUp.ready) {
    headline = `Every ${gradeLabel} skill mastered!`;
    detail = `Next time: a Fledging Flight — six questions to open ${gradeUp.nextGradeLabel}.`;
  } else if (gradeUp.complete) {
    headline = `${topicLabel} complete!`;
    detail = "Every skill in every grade. Time for a new topic.";
  } else {
    return null;
  }
  return (
    <motion.div className="mb-2 rounded-2xl bg-sun-light px-4 py-3 text-ink" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <p className="text-[15px] font-extrabold">{headline}</p>
      <p className="text-[14px] font-bold text-ink/80">{detail}</p>
    </motion.div>
  );
}

/**
 * The end card's "where you stand" for a skill session — what the level bar
 * and the journey map were for the ladder. A row of the grade's skills as
 * ★ ◐ ○ pins, the count, and a line for every skill this session mastered.
 *
 * `standing` = { gradeLabel, topicLabel, skills: [{id,title,state}], mastered,
 * total, newlyMastered: [title] } (built from skills/topicState.gradeView).
 */
export default function SkillStanding({ standing, balance = null }) {
  if (!standing) return null;
  return (
    <div
      className="text-left"
      aria-label={`${standing.gradeLabel} ${standing.topicLabel}: ${standing.mastered} of ${standing.total} skills mastered`}
    >
      {standing.gradeUp && <GradeUpNote standing={standing} />}
      {standing.newlyMastered.map((title) => (
        <motion.p
          key={title}
          className="mb-2 rounded-2xl bg-seafoam px-4 py-2.5 text-[14px] font-extrabold text-ink"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ★ Skill mastered: <span className="font-bold">{title}</span>
        </motion.p>
      ))}
      <div className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
        {standing.skills.map((skill) => (
          <span
            key={skill.id}
            title={skill.title}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[15px] ${
              skill.state === "mastered" ? "bg-teal text-cream" : skill.state === "practicing" ? "bg-seafoam text-ink" : "bg-ink/10 text-ink/50"
            }`}
          >
            {MARK[skill.state]}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[14px] font-bold text-ink">
        <span>
          {standing.gradeLabel} · {standing.mastered} of {standing.total} skills mastered
        </span>
        {balance != null && <span>{balance} in the Nest</span>}
      </div>
    </div>
  );
}
