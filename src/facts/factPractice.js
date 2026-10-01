/**
 * What a Math Facts practice session asks (fact fluency plan A7, B4 item 9)
 * — pure, shared with iOS through the native engine.
 *
 *   current group   A skill's plan rows run in strategy order (plus zero,
 *                   plus 1 or 2, doubles ...). The session works on the first
 *                   rows whose facts are not all fast yet, at least
 *                   FOCUS_FACTS facts' worth, so a small group brings the
 *                   next one in with it.
 *   mixed review    Every REVIEW_EVERY-th question of a skill is a fact from the rows
 *                   before the current one (the current group's own when
 *                   there are none yet), and the facts that slipped, were
 *                   missed or were slow come first.
 *   turnarounds     An addition or times fact asked in that review slot is
 *                   followed straight away by its turnaround: 5 + 8 right
 *                   after 8 + 5.
 *
 * Inside each pool the facts asked least this session come first, then the
 * ones the kid needs most (factPriority), with a shuffle between equals, and
 * the last few facts asked are skipped so a fact never comes straight back.
 * A missed fact also returns through the session's mistake bank as before.
 */
import { BAND_LEVELS, FACTS, FACT_ROWS, FACT_SUBSKILL } from "./factSets.js";
import { formatsForFact } from "./factItems.js";
import { factById, factCounts, factPriority, isFast } from "./factMarks.js";

export const FLUENCY_SESSION_SIZE = 20;
const FOCUS_FACTS = 8;
const REVIEW_EVERY = 4;
const RECENT_FACTS = 3;

// Mostly typed recall; pictures and true or false now and then.
const FORMAT_WEIGHTS = { plain: 4, stacked: 2, missing: 2, trueFalse: 1, tenFrame: 1, takeAway: 1, hop: 1, array: 1 };

const OP_OF_SUBSKILL = Object.fromEntries(Object.entries(FACT_SUBSKILL).map(([op, subskill]) => [subskill, op]));

const wholeOf = (f) => (f.op === "add" || f.op === "mul" ? f.answer : f.a);

/** The facts a Math Facts skill practises: its operation, level band and number cap. */
export function factsForSkill(skill) {
  const op = OP_OF_SUBSKILL[skill?.source?.subskills?.[0]];
  if (!op) return [];
  const [lo, hi] = skill.source.levels;
  const max = skill.source.numbers?.max;
  return FACTS.filter((f) => {
    if (f.op !== op) return false;
    const [bandLo, bandHi] = BAND_LEVELS[f.band];
    return bandLo <= hi && bandHi >= lo && (max == null || wholeOf(f) <= max);
  });
}

/** A skill's facts by plan row, in strategy order. */
export function rowsForSkill(skill) {
  const facts = factsForSkill(skill);
  return FACT_ROWS.map((row) => ({ rowId: row.id, groupName: row.spec.groupName, facts: facts.filter((f) => f.rowId === row.id) })).filter(
    (row) => row.facts.length
  );
}

/**
 * One skill's plan for a session: the fact ids of the current group(s) and of
 * the rows before them. A skill whose every fact is fast reviews all of them.
 */
export function fluencyPlan(skill, marks) {
  const rows = rowsForSkill(skill);
  const first = rows.findIndex((row) => row.facts.some((f) => !isFast(marks, f)));
  if (first < 0) {
    const all = rows.flatMap((row) => row.facts.map((f) => f.id));
    return { focus: all, review: [], group: null };
  }
  const focus = [];
  for (let i = first; i < rows.length && focus.length < FOCUS_FACTS; i += 1) focus.push(...rows[i].facts.map((f) => f.id));
  return { focus, review: rows.slice(0, first).flatMap((row) => row.facts.map((f) => f.id)), group: rows[first].groupName };
}

/**
 * The fluency state a session carries — JSON-safe and small (Swift holds it
 * and passes it back each question): the plans, and how much each planned
 * fact is needed rather than the whole marks map.
 */
export function initFluency(skills, marks) {
  const plans = Object.fromEntries(skills.map((skill) => [skill.id, fluencyPlan(skill, marks)]));
  const need = {};
  for (const plan of Object.values(plans)) {
    for (const f of [...plan.focus, ...plan.review].map(factById)) need[f.trackKey] = factPriority(marks, f);
  }
  return {
    plans,
    need,
    asked: {},
    turns: {},
    recent: [],
    then: null,
  };
}

function shuffled(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickFrom(ids, fluency, rng) {
  const recent = new Set(fluency.recent);
  const facts = ids.map(factById).filter(Boolean);
  const fresh = facts.filter((f) => !recent.has(f.trackKey));
  const pool = fresh.length ? fresh : facts;
  const asked = (f) => fluency.asked[f.trackKey] || 0;
  // Array sort is stable, so the shuffle breaks the ties.
  const need = (f) => fluency.need[f.trackKey] ?? 3;
  return shuffled(pool, rng).sort((x, y) => asked(x) - asked(y) || need(x) - need(y))[0];
}

function pickFormat(f, rng) {
  const formats = formatsForFact(f);
  const total = formats.reduce((sum, fmt) => sum + (FORMAT_WEIGHTS[fmt] || 1), 0);
  let roll = rng() * total;
  for (const fmt of formats) {
    roll -= FORMAT_WEIGHTS[fmt] || 1;
    if (roll < 0) return fmt;
  }
  return formats[0];
}

const turnaroundOf = (f) => (f.op === "add" || f.op === "mul") && f.a !== f.b ? factById(`${f.op}-${f.b}-${f.a}`) : null;

/**
 * The next fact for a skill: `{ skillId, fact, format, then }`, where `then`
 * is a turnaround to ask next (`{ skillId, factId }`) or null. The review
 * slot counts the skill's own questions, so each skill in a mixed session
 * gets its review. A due turnaround is served by the caller before this runs.
 */
export function nextFact(fluency, skillId, rng = Math.random) {
  const plan = fluency.plans[skillId];
  if (!plan) return null;
  const reviewSlot = ((fluency.turns[skillId] || 0) + 1) % REVIEW_EVERY === 0;
  const pool = reviewSlot && plan.review.length ? plan.review : plan.focus;
  const fact = pickFrom(pool, fluency, rng);
  if (!fact) return null;
  const partner = reviewSlot ? turnaroundOf(fact) : null;
  return { skillId, fact, format: pickFormat(fact, rng), then: partner ? { skillId, factId: partner.id } : null };
}

/** The turnaround due now, asked plain so the swapped order is what the kid sees. */
export function dueTurnaround(fluency) {
  const fact = fluency?.then ? factById(fluency.then.factId) : null;
  return fact ? { skillId: fluency.then.skillId, fact, format: "plain", then: null, turnaround: true } : null;
}

/**
 * Bookkeeping after a fresh answer to `served` ({ skillId, trackKey, then,
 * turnaround }): returns the NEXT fluency state. A turnaround rides on its
 * review fact and does not take a turn, so the review stays every fourth.
 */
export function recordFact(fluency, served) {
  const key = served.trackKey;
  const turns = served.turnaround ? fluency.turns : { ...fluency.turns, [served.skillId]: (fluency.turns[served.skillId] || 0) + 1 };
  return {
    ...fluency,
    asked: { ...fluency.asked, [key]: (fluency.asked[key] || 0) + 1 },
    turns,
    recent: [...fluency.recent, key].slice(-RECENT_FACTS),
    then: served.then || null,
  };
}

const factWord = (n) => (n === 1 ? "fact" : "facts");

/** "14 of 36 facts fast" for one skill (the topic sheet and the parent report). */
export function skillFactLine(skill, marks) {
  const { fast, total } = factCounts(marks, factsForSkill(skill));
  return { fast, total, text: `${fast} of ${total} facts fast` };
}

/**
 * The end card's fact line for a finished session's skills: how many facts
 * are fast now, how many turned fast in this session, and the group the next
 * session works on.
 */
export function factStanding(skills, before, after) {
  const facts = skills.flatMap(factsForSkill);
  const now = factCounts(after, facts);
  const earlier = factCounts(before, facts);
  const newlyFast = Math.max(0, now.fast - earlier.fast);
  const group = skills.map((skill) => fluencyPlan(skill, after).group).find(Boolean) || null;
  return {
    fast: now.fast,
    total: now.total,
    newlyFast,
    line: `${now.fast} of ${now.total} facts fast`,
    newLine: newlyFast ? `${newlyFast} ${factWord(newlyFast)} got fast today!` : null,
    nextGroup: group,
  };
}
