import { motion } from "framer-motion";

const MARK = { mastered: "★", practicing: "◐", new: "○" };

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
