import { createQuestionMetadata } from "./itemMetadata";
import { CALC_ROWS, HINT_EXAMPLE_PROMPTS, MINUS, drawCalcItem } from "../multiDigit/calcItems.js";

/**
 * Multi-Digit Math: adding and subtracting with two or more digits as its
 * own topic (calc list decision 1, approved by Sai 2026-10-02). The rule
 * for three topics: one digit is Math Facts; stories, and the box
 * equations of their relations, are Word Problems; everything else with two
 * or more digits is here. Multi-digit times and divide join it in later
 * grades.
 *
 * v2 only, and hidden until Sai flips it at /admin/switch: its default live
 * version is `preview` (src/itemBank/versionRules.js). Its items are v2
 * bank rows: the plain computing rows (1-4, 16-22) built by script
 * (src/multiDigit/calcItems.js), the rest from item models. None are in the
 * shipped bundle yet.
 *
 * Subskills, one per Grade 2 skill: within100 (rows 1-14, 33),
 * severalNumbers (3, 4, 15, 19), within1000 (16-25), tenOrHundred (26, 27),
 * equalSign (28-32, 34), and tenOrHundredTo1200 (row 35, Texas 2.7B), which
 * the list files as its own skill, last in the grade (decision 11).
 *
 * The generator below is the empty-cell fallback and never writes story
 * prose: one bare number sentence, answered on the number pad. For the
 * computing subskills it draws from the script rows themselves (the run-time
 * build decision 3 names for signed-out and offline kids), so a fallback
 * question keeps its row's rules and carries the row's id. For 10 or 100
 * more or less it writes 462 + 10 = ?; for the equal sign, a balance
 * sentence, 58 + 27 = ? + 25 (conceptual).
 *
 * Levels are the bank band on the Grade 1–4 axis: Grade 2 is levels 4–6,
 * read as the tiers easy, moderate and hard. Levels outside it build Grade
 * 2's nearest band.
 */

export const SUBSKILLS = ["within100", "severalNumbers", "within1000", "tenOrHundred", "equalSign", "tenOrHundredTo1200"];

/** Grade 2's levels: the band every Grade 2 skill and its rows sit in. */
export const GRADE2_LEVELS = [4, 6];

const TIERS = ["easy", "moderate", "hard"];
const TIER_FOR_LEVEL = { 4: "easy", 5: "moderate", 6: "hard" };

const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function bandLevel(level) {
  const n = Number.isFinite(level) ? Math.round(level) : GRADE2_LEVELS[0];
  return Math.min(GRADE2_LEVELS[1], Math.max(GRADE2_LEVELS[0], n));
}

/** The script rows' (row, variant) pairs per subskill. */
const SCRIPT_DRAWS = {};
for (const row of CALC_ROWS) {
  for (const variant of row.variants) (SCRIPT_DRAWS[row.subskill] ||= []).push({ row, variant });
}

/**
 * A script row's variant for a level: the hardest tier at or below the
 * level's, or the easiest there is when none is (adding three numbers has
 * no easy variant).
 */
function scriptDrawFor(subskill, level) {
  const all = SCRIPT_DRAWS[subskill];
  const want = TIERS.indexOf(TIER_FOR_LEVEL[level]);
  const rank = ({ variant }) => TIERS.indexOf(variant.difficulty);
  const below = all.filter((d) => rank(d) <= want);
  const tier = below.length ? Math.max(...below.map(rank)) : Math.min(...all.map(rank));
  return pick(all.filter((d) => rank(d) === tier));
}

const STANDARD_REFS = {
  within100: ["2.NBT.B.5"],
  severalNumbers: ["2.NBT.B.6"],
  within1000: ["2.NBT.B.7"],
  tenOrHundred: ["2.NBT.B.8"],
  equalSign: ["2.NBT.B.5", "2.NBT.B.9"],
  // Texas 2.7B only: Common Core stops at 900 (decision 11).
  tenOrHundredTo1200: [],
};

const CLUSTER = {
  within100: "Add and subtract within 100",
  severalNumbers: "Add up to four two-digit numbers",
  within1000: "Add and subtract within 1,000",
  tenOrHundred: "Mentally add or subtract 10 or 100",
  equalSign: "Explain why addition and subtraction strategies work",
  tenOrHundredTo1200: "Mentally add or subtract 10 or 100, to 1,200",
};

function withMetadata(question, { level, subskill, itemFamily, structureType, blueprintId, misconceptionTags }) {
  question.level = level;
  question.metadata = createQuestionMetadata({
    modeId: "multiDigit",
    // The numbers are Grade 2's whatever level was asked, so is the label.
    level: bandLevel(level),
    domain: "NBT",
    cluster: CLUSTER[subskill],
    subskill,
    itemFamily,
    cognitiveDemand: itemFamily === "conceptual" ? "DOK2" : "DOK1",
    representation: "symbolic",
    mathPractices: itemFamily === "conceptual" ? ["MP2", "MP7"] : ["MP7", "MP8"],
    standardRefs: STANDARD_REFS[subskill],
    misconceptionTags,
    blueprintId,
    structureType,
  });
  return question;
}

/** A script row's item as a served question, from its row's own rules. */
export function buildScriptQuestion(subskill, level) {
  const { row, variant } = scriptDrawFor(subskill, bandLevel(level));
  const item = drawCalcItem(row.rowId, variant.id, { index: randInt(0, 99), taken: HINT_EXAMPLE_PROMPTS });
  const question = { ...item.question, hint: item.hint };
  return withMetadata(question, {
    level,
    subskill,
    itemFamily: "procedural",
    structureType: row.structureType,
    blueprintId: row.rowId,
    misconceptionTags: [...new Set(Object.values(item.tags.mistakes))],
  });
}

/**
 * 10 or 100 more or less, as a bare sentence: 462 + 10 = ?. Common Core's
 * start is 100-900 (2.NBT.B.8); to 1,200 is Texas 2.7B, where the start or
 * the answer passes 1,000.
 */
export function buildTenOrHundredQuestion(level, { to1200 = false } = {}) {
  for (let guard = 0; guard < 500; guard += 1) {
    const step = pick([10, 100]);
    const op = pick(["+", MINUS]);
    const start = to1200 ? randInt(890, 1200) : randInt(100, 900);
    const answer = op === "+" ? start + step : start - step;
    const [lo, hi] = to1200 ? [800, 1200] : [100, 999];
    if (answer < lo || answer > hi) continue;
    if (to1200 && start < 1000 && answer < 1000) continue;
    const promptText = `${start} ${op} ${step} = ?`;
    if (HINT_EXAMPLE_PROMPTS.has(promptText)) continue;
    const place = step === 10 ? "tens" : "hundreds";
    const question = {
      a: start,
      b: step,
      op,
      answer,
      answerType: "numberPad",
      display: { promptText, layout: "horizontal" },
      hint: {
        nudge: `${op === "+" ? "Adding" : "Taking away"} ${step} changes the ${place} digit by one.`,
        steps: [
          `Find the ${place} digit of ${start}.`,
          `Make it one ${op === "+" ? "more" : "less"}. If it goes past 9 or below 0, the next place changes too.`,
          "Keep every other digit the same.",
        ],
      },
    };
    return withMetadata(question, {
      level,
      subskill: to1200 ? "tenOrHundredTo1200" : "tenOrHundred",
      itemFamily: "procedural",
      // Rows 26 and 35's type. The id is the generator's own, not a row's:
      // the rows ask it as a choice question, this asks a bare sentence.
      structureType: "tenOrHundredMoreLess",
      blueprintId: `multiDigit-procedural-${to1200 ? "tenOrHundredTo1200" : "tenOrHundred"}`,
      misconceptionTags: ["changedTheWrongPlace", "wentTheWrongWay"],
    });
  }
  throw new Error("no 10-or-100 sentence fits");
}

/**
 * The equal sign as a balance: 58 + 27 = ? + 25. The kid finds the number
 * that makes both sides the same amount (row 28's type), never "the answer
 * comes next".
 */
export function buildBalanceQuestion(level) {
  for (let guard = 0; guard < 500; guard += 1) {
    const a = randInt(21, 69);
    const b = randInt(12, 39);
    const total = a + b;
    const c = b + pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 10, -10]);
    const answer = total - c;
    if (total > 99 || c < 2 || answer < 10 || answer > 99) continue;
    if ([a, b, c, total].includes(answer)) continue;
    const promptText = `${a} + ${b} = ? + ${c}`;
    if (HINT_EXAMPLE_PROMPTS.has(promptText)) continue;
    const question = {
      a: null,
      b: null,
      op: null,
      answer,
      answerType: "numberPad",
      display: { promptText, layout: "horizontal" },
      hint: {
        nudge: "Both sides of = are the same amount.",
        steps: [`Find ${a} + ${b} first.`, `Then think: what number and ${c} make that much?`],
        // The total of the left side, written in the box.
        feedback: { [String(total)]: "That is the left side's total. The box and the number beside it must make that total together." },
      },
    };
    return withMetadata(question, {
      level,
      subskill: "equalSign",
      itemFamily: "conceptual",
      structureType: "balanceEquation",
      blueprintId: "multiDigit-conceptual-balance",
      misconceptionTags: ["answerComesNext", "addedEverything"],
    });
  }
  throw new Error("no balance sentence fits");
}

const BUILDERS = {
  within100: (level) => buildScriptQuestion("within100", level),
  severalNumbers: (level) => buildScriptQuestion("severalNumbers", level),
  within1000: (level) => buildScriptQuestion("within1000", level),
  tenOrHundred: (level) => buildTenOrHundredQuestion(level),
  equalSign: (level) => buildBalanceQuestion(level),
  tenOrHundredTo1200: (level) => buildTenOrHundredQuestion(level, { to1200: true }),
};

/** The subskills whose fallback writes each family. */
const BY_FAMILY = {
  procedural: SUBSKILLS.filter((s) => s !== "equalSign"),
  conceptual: ["equalSign"],
};

export default {
  id: "multiDigit",
  label: "Multi-Digit Math",
  shortLabel: "Multi-Digit",
  description: "Add and subtract with bigger numbers.",
  icon: "Plus",
  glyph: "78+",
  op: "+",
  subskills: SUBSKILLS,
  // Grade 2 only for now: every subskill lives in Grade 2's band.
  subskillLevels: Object.fromEntries(SUBSKILLS.map((s) => [s, GRADE2_LEVELS])),
  supportedFormats: [],
  // Computing drills (procedural) and the check, fix and equal-sign
  // reasoning rows (conceptual); no stories, which are Word Problems'.
  families: ["procedural", "conceptual"],
  // No v1 rows: shown only where its switch serves v2 (topicVisible). Its
  // default with no switch row is preview (DEFAULT_LIVE_VERSION).
  v2Only: true,

  // A targeted subskill is honoured; otherwise the family picks one.
  generate(level, context = {}) {
    const asked = SUBSKILLS.includes(context.targetSubskill) ? context.targetSubskill : null;
    const subskill = asked || pick(BY_FAMILY[context.itemFamily] || SUBSKILLS);
    return BUILDERS[subskill](level);
  },

  // Typed answers need no options. Where options are asked for, the wrong
  // ones are the item's own slips, then near misses.
  generateChoices(answer, question) {
    const n = Number(answer);
    const slips = Object.keys(question?.hint?.feedback || {}).map(Number);
    const near = [n + 10, n - 10, n + 1, n - 1, n + 100];
    const wrong = [...new Set([...slips, ...near])].filter((x) => Number.isInteger(x) && x >= 0 && x !== n);
    return [n, ...wrong.slice(0, 3)].sort(() => Math.random() - 0.5);
  },
};
