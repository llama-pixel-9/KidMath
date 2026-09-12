/**
 * Kid-facing mastery (kid-sim fix plan, PR D): "Level N of 10" is an engine
 * number; what a child (and a parent at a glance) can act on is which SKILLS
 * in a mode are solid. Derived from the practice log the same way the report
 * does it — first-try accuracy per subskill over the last attempts — so the
 * tile and the report never disagree.
 */

const MIN_ATTEMPTS = 4;
const SOLID = 0.9;

/** subskill → { attempts, correct } from first-try attempts of the given sessions. */
export function subskillStats(sessions, modeId) {
  const out = {};
  for (const s of sessions || []) {
    if (s.mode !== modeId || s.kind === "fledging") continue;
    for (const a of s.attempts || []) {
      if (a.retry) continue;
      const k = a.subskill || "unknown";
      const row = out[k] || (out[k] = { attempts: 0, correct: 0 });
      row.attempts += 1;
      if (a.correct) row.correct += 1;
    }
  }
  return out;
}

/**
 * { solid, tried, total } for a mode: `solid` = subskills at ≥90% over ≥4 tries,
 * `tried` = subskills with ≥4 tries, `total` = the mode's declared subskills.
 */
export function masterySummary(sessions, modeId, declaredSubskills = []) {
  const stats = subskillStats(sessions, modeId);
  const ids = new Set([...declaredSubskills, ...Object.keys(stats).filter((k) => k !== "unknown")]);
  let solid = 0;
  let tried = 0;
  for (const id of ids) {
    const st = stats[id];
    if (!st || st.attempts < MIN_ATTEMPTS) continue;
    tried += 1;
    if (st.correct / st.attempts >= SOLID) solid += 1;
  }
  return { solid, tried, total: ids.size };
}

/** Short tile line, or null when there is nothing to say yet. */
export function masteryLine(summary) {
  if (!summary || summary.tried === 0) return null;
  return `${summary.solid} of ${summary.total} skills solid`;
}
