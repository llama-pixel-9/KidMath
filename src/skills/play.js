/* The skill catalog as PLAY sees it. Pure — imports only catalog data, so the
 * native engine can bundle it.
 *
 * Play and print read the same catalog (skillCatalogParity.spec). The only
 * differences, all deliberate:
 *   - Picture / plain TWINS are one skill. Worksheets split "Read a clock to
 *     five minutes" from its un-pictured sibling because a page cannot mix
 *     charts and one-liners; a session can, and a kid should not have to
 *     master the same cell twice.
 *   - A play skill is its WHOLE bank cell: print-only exclusions (two-mat disc
 *     items are too tall for a page) do not apply on screen.
 *   - Two remainder drills are print-only until play has a
 *     quotient-and-remainder answer widget.
 */
import { gradeIndex } from "../gradeSeed.js";
import { GRADES, WORKSHEET_SKILLS } from "./catalog.js";

// plain id (canonical) ← picture id, and the title the merged skill carries.
const TWINS = [
  ["time-read-clock-4", "time-read-clock-4-pic", "Read a clock to five minutes"],
  ["time-read-clock-7", "time-read-clock-7-pic", "Read a clock to the minute"],
  ["volume-coordinates-volume-formula-4", "volume-coordinates-volume-formula-4-pic", "Volume from layers, and from length, width and height"],
  ["volume-coordinates-plot-and-read-7", "volume-coordinates-plot-and-read-7-pic", "Read coordinates and follow coordinate patterns"],
];
export const PLAY_TWINS = TWINS.map(([id, alias, title]) => ({ id, alias, title }));

/** Remainder answers need a quotient-and-remainder widget play does not have. */
export function isPlayable(skill) {
  if (skill.source.kind !== "computation") return true;
  return skill.source.remainder == null || skill.source.remainder === "none";
}

function buildPlaySkills() {
  const aliasOf = new Map(TWINS.map(([id, alias]) => [alias, id]));
  const titleOf = new Map(TWINS.map(([id, , title]) => [id, title]));
  const aliasesOf = new Map(TWINS.map(([id, alias]) => [id, [alias]]));
  return WORKSHEET_SKILLS.filter((skill) => isPlayable(skill) && !aliasOf.has(skill.id)).map((skill) => {
    const source = { ...skill.source };
    delete source.excludeStructureTypes; // a page-fit rule, not part of the skill
    return {
      id: skill.id,
      aliases: aliasesOf.get(skill.id) || [],
      grade: skill.grade,
      mode: skill.mode,
      ccss: skill.ccss,
      title: titleOf.get(skill.id) || skill.title,
      source,
      stories: skill.stories || null,
      level: levelForSkill(skill),
    };
  });
}

/** The engine level a skill plays at: its legacy level, inside its own band. */
export function levelForSkill(skill) {
  const levels = skill.source.levels;
  if (!levels) return skill.level;
  return Math.min(Math.max(skill.level, levels[0]), levels[1]);
}

const PLAY_SKILLS = buildPlaySkills();
const BY_ID = new Map();
for (const skill of PLAY_SKILLS) {
  BY_ID.set(skill.id, skill);
  for (const alias of skill.aliases) BY_ID.set(alias, skill);
}

export function playSkills() {
  return PLAY_SKILLS;
}

/** By id — a twin's picture id resolves to the merged skill. */
export function playSkillById(id) {
  return BY_ID.get(id) || null;
}

/** A kid profile grade ('K', '1st' … '6th') or a catalog grade → "K" | "1" … "5". */
export function catalogGrade(grade) {
  const index = gradeIndex(grade);
  if (index == null) return null;
  return index === 0 ? "K" : String(Math.min(index, 5));
}

const gradeRank = (grade) => GRADES.indexOf(grade);

/** A (grade, topic)'s skills, easiest band first, then catalog order. */
export function skillsForPlay(grade, mode) {
  return PLAY_SKILLS.filter((skill) => skill.grade === grade && skill.mode === mode).sort((a, b) => a.level - b.level);
}

/** The grades a topic has playable skills in — often NOT contiguous. */
export function topicGrades(mode) {
  const present = new Set(PLAY_SKILLS.filter((skill) => skill.mode === mode).map((skill) => skill.grade));
  return GRADES.filter((grade) => present.has(grade));
}

/** Where a kid of `grade` starts in a topic: the nearest topic grade at or
 * below theirs, else the topic's lowest (a kindergartner opening Fractions). */
export function clampGrade(mode, grade) {
  const grades = topicGrades(mode);
  if (!grades.length) return null;
  const rank = gradeRank(catalogGrade(grade) ?? grades[0]);
  const atOrBelow = grades.filter((g) => gradeRank(g) <= rank);
  return atOrBelow.length ? atOrBelow[atOrBelow.length - 1] : grades[0];
}

/** The next grade the topic has skills in (skipping holes), or null at the top. */
export function nextTopicGrade(mode, grade) {
  const rank = gradeRank(grade);
  return topicGrades(mode).find((g) => gradeRank(g) > rank) || null;
}

/** Topic grades a kid may practice: everything up to the higher of what they
 * have earned (or a parent opened) and where their profile grade starts them. */
export function openGrades(mode, { gradeUnlocked = null, profileGrade = null } = {}) {
  const start = clampGrade(mode, profileGrade);
  const top = Math.max(gradeRank(gradeUnlocked ?? start), gradeRank(start));
  return topicGrades(mode).filter((g) => gradeRank(g) <= top);
}

const bandContains = (skill, level) => {
  const levels = skill.source.levels;
  return levels ? level >= levels[0] && level <= levels[1] : skill.level === level;
};

/**
 * The grade an existing engine level means in a topic — read off the CATALOG,
 * not gradeWorkForLevel (they disagree: placeValue's 4–6 band is grades 1–3).
 * The lowest grade with a skill whose band holds the level; else the grade of
 * the nearest band below; else the topic's lowest grade.
 */
export function gradeForModeLevel(mode, level) {
  const inMode = PLAY_SKILLS.filter((skill) => skill.mode === mode);
  if (!inMode.length) return null;
  const at = (l) => {
    const holding = inMode.filter((skill) => bandContains(skill, l));
    const pool = holding.length
      ? holding
      : inMode.filter((skill) => skill.level <= l).sort((x, y) => y.level - x.level).slice(0, 1);
    if (!pool.length) return gradeRank(topicGrades(mode)[0]);
    return Math.min(...pool.map((skill) => gradeRank(skill.grade)));
  };
  // Monotonic: a higher level never means a lower grade (drills sit at single
  // levels, so level 9 can otherwise read lower than level 8).
  let rank = -1;
  for (let l = 1; l <= level; l += 1) rank = Math.max(rank, at(l));
  return GRADES[rank];
}

// ── crediting attempts to skills ────────────────────────────────────────────

const PROMPT_NUMBERS = /\d+(?:\.\d+)?/g;
const BARE = /^\s*(\d+)\s*([+\-−–x×*÷/])\s*(\d+)\s*=\s*\?\s*$/;
const ASCII_OP = { "−": "-", "–": "-", "×": "x", "*": "x", "÷": "/" };

const inRange = (n, range) => !range || (n >= range[0] && n <= range[1]);

function carries(a, b, op) {
  let x = a;
  let y = b;
  if (op === "+") {
    let carry = 0;
    while (x > 0 || y > 0) {
      const sum = (x % 10) + (y % 10) + carry;
      if (sum > 9) return true;
      carry = 0;
      x = Math.floor(x / 10);
      y = Math.floor(y / 10);
    }
    return false;
  }
  while (y > 0) {
    if (x % 10 < y % 10) return true;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return false;
}

// Does a bare `a op b` satisfy a computation skill's claim? (The same reading
// of the claim as worksheets/claimCheck.js, kept here so this file stays free
// of the worksheet modules.)
function claimAccepts(claim, a, b) {
  const op = claim.op;
  if (op === "/") {
    if (b === 0 || a % b !== 0) return false;
    const quotient = a / b;
    if (claim.table ? !claim.table.includes(b) : !inRange(b, claim.b)) return false;
    return inRange(quotient, claim.quotient) && inRange(a, claim.dividend);
  }
  if (claim.table) {
    const other = claim.table.includes(a) ? b : claim.table.includes(b) ? a : null;
    if (other == null || !inRange(other, claim.b)) return false;
  } else if (!inRange(a, claim.a) || !inRange(b, claim.b)) {
    return false;
  }
  if (claim.bStep && b % claim.bStep !== 0) return false;
  if (op === "+" && !inRange(a + b, claim.total)) return false;
  if (op === "-" && (a - b < 0 || !inRange(a - b, claim.difference))) return false;
  if (claim.regroup === "required" && !carries(a, b, op)) return false;
  if (claim.regroup === "none" && carries(a, b, op)) return false;
  if (claim.minuendZero && !String(a).slice(1).includes("0")) return false;
  return true;
}

function promptWithin(prompt, numbers) {
  if (!numbers) return true;
  const found = (prompt || "").match(PROMPT_NUMBERS)?.map(Number) || [];
  if (!found.length) return true; // no evidence either way: credit the cell
  const biggest = Math.max(...found);
  return biggest >= (numbers.min ?? -Infinity) && biggest <= (numbers.max ?? Infinity);
}

/**
 * The skill an attempt counts toward, or null.
 *   1. the skill it was served for (`skillId`, new sessions);
 *   2. its bank cell — (mode, subskill, level inside the skill's band), narrowed
 *      by the skill's number size when the prompt shows numbers;
 *   3. a bare `a op b = ?` → the lowest-grade computation skill whose claim it
 *      satisfies (how drills from before skills existed are credited).
 */
export function skillForAttempt(mode, attempt) {
  if (!attempt) return null;
  if (attempt.skillId) return playSkillById(attempt.skillId);
  const inMode = PLAY_SKILLS.filter((skill) => skill.mode === mode);

  const bare = BARE.exec(attempt.prompt || "");
  if (bare) {
    const a = Number(bare[1]);
    const b = Number(bare[3]);
    const op = ASCII_OP[bare[2]] || bare[2];
    const drill = inMode
      .filter((skill) => skill.source.kind === "computation" && skill.source.op === op && claimAccepts(skill.source, a, b))
      .sort((x, y) => gradeRank(x.grade) - gradeRank(y.grade))[0];
    if (drill) return drill;
  }

  const level = attempt.level;
  const cells = inMode.filter(
    (skill) =>
      skill.source.kind === "bank" &&
      (!skill.source.subskills || skill.source.subskills.includes(attempt.subskill)) &&
      // A skill with no subskill filter is defined by its structure types, which
      // the log does not record — it can only be credited by skillId.
      skill.source.subskills &&
      level >= skill.source.levels[0] &&
      level <= skill.source.levels[1]
  );
  const sized = cells.filter((skill) => promptWithin(attempt.prompt, skill.source.numbers));
  // A prompt whose numbers fit none of the cell's skills (a within-100 missing
  // addend, when the skills are within-20 and within-1000) is credited to none.
  return sized.sort((x, y) => gradeRank(x.grade) - gradeRank(y.grade))[0] || null;
}
