/**
 * What a Math Facts practice session asks (fact fluency plan A7, B4 item 9)
 * — pure, shared with iOS through the native engine.
 *
 *   moving on      A skill's facts run in strategy order (plus zero, plus 1
 *                  or 2, doubles ...). A fact the kid has already made fast,
 *                  or answered fast earlier today, is ready. Of the rest the
 *                  session works on a small window of ACTIVE_SIZE facts from
 *                  the next ACTIVE_GROUPS strategy groups, and steers away
 *                  from the group just asked (overall, and by the same
 *                  skill), so a session mixes groups instead of drilling one
 *                  (Sai, Oct 1: twenty "× 0" facts in a row). A strategy is
 *                  its group number, which a take-away or divide fact shares
 *                  with its partner ("Plus zero" and "Zero" are one), so a
 *                  mixed + and − session mixes too. A fact answered right
 *                  within the time limit leaves the window and the next one
 *                  comes in; a fact asked MAX_ASKS times without that waits
 *                  for the next session, so nothing is ground on.
 *   mixed review   Every REVIEW_EVERY-th question of a skill is a ready fact
 *                  (or one cleared this session), slipped, missed and slow
 *                  ones first.
 *   turnarounds    An addition or times fact asked in that review slot is
 *                  followed straight away by its turnaround: 5 + 8 right
 *                  after 8 + 5. Elsewhere a fact is asked in either order.
 *
 * Facts are tracked by trackKey (8 + 5 and 5 + 8 are one; take-away and
 * divide facts are their own), and the last few asked are skipped so a fact
 * never comes straight back. A missed fact also returns through the session's
 * mistake bank as before.
 */
import { BAND_LEVELS, FACTS, FACT_ROWS, FACT_SUBSKILL } from "./factSets.js";
import { formatsForFact } from "./factItems.js";
import { dayKey, factById, factCounts, factPriority, fastLimitMs, isFast } from "./factMarks.js";

export const FLUENCY_SESSION_SIZE = 20;
const ACTIVE_SIZE = 8;
const ACTIVE_GROUPS = 4;
const MAX_ASKS = 3;
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

/** A skill's tracked facts (one key per turnaround pair), in strategy order. */
export function trackKeysForSkill(skill) {
  return [...new Set(rowsForSkill(skill).flatMap((row) => row.facts.map((f) => f.trackKey)))];
}

const groupOfKey = (key) => FACT_ROWS.find((row) => row.id === factById(key)?.rowId)?.spec.groupName ?? null;
// A fact's strategy: its group number, shared across bands ("Plus zero" to 5
// and to 10) and with its partner operation ("Plus zero" and "Zero").
const strategyOf = (key) => factById(key)?.group ?? null;

/** Is this tracked fact ready: fast, or answered fast on `today`? */
function isReady(marks, key, today) {
  const entry = marks?.[key];
  return Boolean(entry?.fast || (today && entry?.days?.includes(today)));
}

/**
 * One skill's plan for a session: its tracked facts in strategy order, the
 * ones already ready, and the strategy group the session starts in (null
 * when every fact is ready). `today` is a dayKey; without it only fast marks
 * count as ready.
 */
export function fluencyPlan(skill, marks, today = null) {
  const keys = trackKeysForSkill(skill);
  const ready = keys.filter((key) => isReady(marks, key, today) || isFast(marks, factById(key)));
  const readySet = new Set(ready);
  const first = keys.find((key) => !readySet.has(key));
  return { keys, ready, group: first ? groupOfKey(first) : null };
}

/**
 * The fluency state a session carries — JSON-safe and small (Swift holds it
 * and passes it back each question): the plans, how much each fact is needed
 * (not the whole marks map), the time limit and what this session has done.
 */
export function initFluency(skills, marks, { now = Date.now(), grade = null } = {}) {
  const today = dayKey(now);
  const plans = Object.fromEntries(skills.map((skill) => [skill.id, fluencyPlan(skill, marks, today)]));
  const need = {};
  for (const plan of Object.values(plans)) {
    for (const key of plan.keys) need[key] = factPriority(marks, factById(key));
  }
  return {
    plans,
    need,
    limitMs: fastLimitMs(grade ?? skills[0]?.grade),
    asked: {},
    cleared: {},
    turns: {},
    recent: [],
    lastGroup: null,
    skillGroups: {},
    then: null,
  };
}

/**
 * The facts a skill is working on now: not ready, not cleared this session,
 * asked fewer than MAX_ASKS times. They come from the first ACTIVE_GROUPS
 * strategy groups that still have such facts, taken in turn (one from each
 * group, then a second from each ...) up to ACTIVE_SIZE, so a skill with
 * only two groups still gets both.
 */
export function activeKeys(fluency, skillId) {
  const plan = fluency.plans[skillId];
  if (!plan) return [];
  const ready = new Set(plan.ready);
  const byGroup = new Map();
  for (const key of plan.keys) {
    if (ready.has(key) || fluency.cleared[key] || (fluency.asked[key] || 0) >= MAX_ASKS) continue;
    const group = strategyOf(key);
    if (!byGroup.has(group)) {
      if (byGroup.size >= ACTIVE_GROUPS) continue;
      byGroup.set(group, []);
    }
    byGroup.get(group).push(key);
  }
  const lists = [...byGroup.values()];
  const picked = [];
  for (let i = 0; picked.length < ACTIVE_SIZE && lists.some((list) => i < list.length); i += 1) {
    for (const list of lists) if (i < list.length && picked.length < ACTIVE_SIZE) picked.push(list[i]);
  }
  return picked;
}

/**
 * Ready facts and the ones cleared this session, less the last few asked:
 * what review draws on. Empty early in a session, when the only cleared facts
 * were just asked; that slot then goes to the facts being worked on.
 */
function reviewKeys(fluency, skillId) {
  const plan = fluency.plans[skillId];
  if (!plan) return [];
  const ready = new Set(plan.ready);
  const recent = new Set(fluency.recent);
  return plan.keys.filter((key) => (ready.has(key) || fluency.cleared[key]) && !recent.has(key));
}

function shuffled(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The pick from a pool: not one of the last few facts, then away from the
 * strategy this skill asked last and the one asked just before (in a mixed
 * session the two differ), then the facts asked least, then the most needed.
 */
function pickKey(keys, fluency, skillId, rng) {
  const recent = new Set(fluency.recent);
  const fresh = keys.filter((key) => !recent.has(key));
  const pool = fresh.length ? fresh : keys;
  const own = fluency.skillGroups?.[skillId] ?? null;
  const repeat = (key) => (strategyOf(key) === own ? 2 : 0) + (strategyOf(key) === fluency.lastGroup ? 1 : 0);
  const asked = (key) => fluency.asked[key] || 0;
  const need = (key) => fluency.need[key] ?? 3;
  // Array sort is stable, so the shuffle breaks the ties.
  return shuffled(pool, rng).sort((x, y) => repeat(x) - repeat(y) || asked(x) - asked(y) || need(x) - need(y))[0] ?? null;
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

const turnaroundOf = (f) => ((f.op === "add" || f.op === "mul") && f.a !== f.b ? factById(`${f.op}-${f.b}-${f.a}`) : null);

/** One order of a tracked fact, either way round for addition and times. */
function orderOf(key, rng) {
  const fact = factById(key);
  const other = turnaroundOf(fact);
  return other && rng() < 0.5 ? other : fact;
}

/**
 * The next fact for a skill: `{ skillId, fact, format, then }`, where `then`
 * is a turnaround to ask next (`{ skillId, factId }`) or null. The review
 * slot counts the skill's own questions, so each skill in a mixed session
 * gets its review. A due turnaround is served by the caller before this runs.
 * With nothing left to work on, every fact of the skill is fair game.
 */
export function nextFact(fluency, skillId, rng = Math.random) {
  const plan = fluency.plans[skillId];
  if (!plan || !plan.keys.length) return null;
  const reviewSlot = ((fluency.turns[skillId] || 0) + 1) % REVIEW_EVERY === 0;
  const review = reviewSlot ? reviewKeys(fluency, skillId) : [];
  const active = activeKeys(fluency, skillId);
  const pool = review.length ? review : active.length ? active : plan.keys;
  const key = pickKey(pool, fluency, skillId, rng);
  if (!key) return null;
  const fact = orderOf(key, rng);
  const partner = review.length ? turnaroundOf(fact) : null;
  return { skillId, fact, format: pickFormat(fact, rng), then: partner ? { skillId, factId: partner.id } : null };
}

/** The turnaround due now, asked plain so the swapped order is what the kid sees. */
export function dueTurnaround(fluency) {
  const fact = fluency?.then ? factById(fluency.then.factId) : null;
  return fact ? { skillId: fluency.then.skillId, fact, format: "plain", then: null, turnaround: true } : null;
}

/**
 * Bookkeeping after a fresh answer to `served` ({ skillId, trackKey, then,
 * turnaround }): returns the NEXT fluency state. A right answer within the
 * time limit clears the fact for the rest of the session, so the next one
 * moves in. A turnaround rides on its review fact and does not take a turn,
 * so the review stays every fourth.
 */
export function recordFact(fluency, served, { correct = false, ms = 0 } = {}) {
  const key = served.trackKey;
  const turns = served.turnaround ? fluency.turns : { ...fluency.turns, [served.skillId]: (fluency.turns[served.skillId] || 0) + 1 };
  const fast = correct && ms > 0 && ms <= (fluency.limitMs || fastLimitMs(null));
  const group = strategyOf(key);
  return {
    ...fluency,
    asked: { ...fluency.asked, [key]: (fluency.asked[key] || 0) + 1 },
    cleared: fast ? { ...fluency.cleared, [key]: true } : fluency.cleared,
    turns,
    recent: [...fluency.recent, key].slice(-RECENT_FACTS),
    lastGroup: group,
    skillGroups: { ...fluency.skillGroups, [served.skillId]: group },
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
 * session works toward (the first group not yet fast).
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
