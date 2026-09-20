/* One printed sheet for one skill.
 *
 * Bank-first: every worded problem is an approved bank item, drawn without
 * replacement from the cells the skill names — the wording a parent sees on
 * paper is wording that was reviewed. Only bare `a op b` drills are built
 * (computationSampler.js). There is NO generator fallback: a pool too small
 * for the sheet comes back short, with `shortfall` saying by how much, and
 * the screen disables what the loaded bank cannot fill.
 *
 * Callers must have the mode's bank loaded (`ensureModeLoaded(skill.mode)`);
 * with only the offline seed in memory most bank skills come back short.
 */
import { getBankItems } from "../itemBank/index.js";
import { APPROVED } from "../itemBank/reviewStatus.js";
import { buildBankQuestion, isPrintablePrompt, printableWording, promptKey } from "../mathEngine.js";
import { areaFigureSpec } from "../figures/areaFigureSpec.js";
import { isVerbalPrompt, shuffleArray } from "../modes/helpers.js";
import { asciiOp, storyMatches, withinNumbers } from "./claimCheck.js";
import { sampleSheet } from "./computationSampler.js";
import {
  LAYOUTS,
  MIXED_STORIES,
  MIXED_STORIES_FIGURE,
  PROBLEM_TYPES,
  STORIES_PER_FIGURE_SHEET,
  STORIES_PER_SHEET,
  isFigureLayout,
} from "./layouts.js";
import { skillById } from "./skillIndex.js";

const overlaps = (range, levels) => Array.isArray(range) && range[0] <= levels[1] && range[1] >= levels[0];

function cellMatches(item, mode, filter) {
  if (item.modeId !== mode || item.reviewStatus !== APPROVED) return false;
  if (!filter.families.includes(item.itemFamily)) return false;
  if (filter.subskills && !filter.subskills.includes(item.subskill)) return false;
  if (filter.structureTypes && !filter.structureTypes.includes(item.structureType)) return false;
  if (filter.excludeStructureTypes?.includes(item.structureType)) return false;
  return overlaps(item.levelRange, filter.levels);
}

/** The figure a question prints with: the authored `display.figure`, or the
 * rectangle the areaPerimeter bank implies through its dimensions (same
 * inference the question card makes — figureRegistry.getFigure). */
export function paperFigureKey(q) {
  if (q.display?.figure) return q.display.figure;
  const mode = q.mode || q.metadata?.modeId;
  return mode === "areaPerimeter" && areaFigureSpec(q) ? "areaFigure" : null;
}

// "Looking at this chart…" with no chart on the page cannot be answered with a
// pencil: on screen the answer widget drew it; paper has no widget.
const POINTS_AT_A_PICTURE = /\bthis (clock|chart|graph|mat|grid|picture|pictograph|tally)\b|\b(shown|pictured)\b/i;

// The render-ready, print-worded question for a bank item — or null when the
// paper rules reject it (screen verbs, answer printed in its own prompt…).
function printableFromBank(item, skill, { story = false } = {}) {
  const level = Math.min(Math.max(skill.level, item.levelRange[0]), item.levelRange[1]);
  let q;
  try {
    q = buildBankQuestion(item, level);
  } catch {
    return null;
  }
  // finalizeQuestion keeps the generator scaffold's family; the bank row's is
  // the true one.
  q.metadata.itemFamily = item.itemFamily;
  q = printableWording({ ...q, op: asciiOp(q.op) });
  if (!isPrintablePrompt(q)) return null;
  const drawn = Boolean(paperFigureKey(q));
  // One sheet, one kind of practice item: a page budget cannot hold for a mix
  // of charts and one-liners. (Stories are sorted by storyPlan instead.)
  if (!story && drawn !== isFigureLayout(skill.layout)) return null;
  if (!drawn && POINTS_AT_A_PICTURE.test(q.display?.promptText || "")) return null;
  return q;
}

function bankPool(skill, filter, accept, options) {
  const out = [];
  for (const item of getBankItems()) {
    if (!cellMatches(item, skill.mode, filter)) continue;
    const q = printableFromBank(item, skill, options);
    if (q && accept(q)) out.push(q);
  }
  return out;
}

function practicePool(skill) {
  return bankPool(skill, skill.source, (q) => withinNumbers(q, skill.source.numbers));
}

function storyPool(skill) {
  if (!skill.stories) return [];
  const filter = { ...skill.stories, families: ["application"] };
  return bankPool(
    skill,
    filter,
    (q) => isVerbalPrompt(q.display?.promptText) && storyMatches(q, skill.stories),
    { story: true }
  );
}

/**
 * A skill's word problems, and how many fit a page. Stories that draw a chart
 * or a rectangle need three times the room of plain ones, and a page budget
 * cannot hold for a mix — so a skill prints whichever kind it has more of.
 */
export function storyPlan(skillId) {
  const skill = skillById(skillId);
  const all = skill ? storyPool(skill) : [];
  const pictured = all.filter((q) => paperFigureKey(q));
  const usePictured = pictured.length > all.length - pictured.length;
  const pool = usePictured ? pictured : all.filter((q) => !paperFigureKey(q));
  return {
    pool,
    perSheet: usePictured ? STORIES_PER_FIGURE_SHEET : STORIES_PER_SHEET,
    perMixedSheet: usePictured ? MIXED_STORIES_FIGURE : MIXED_STORIES,
  };
}

// Without replacement, and never the same sentence twice across the sheets of
// one print run (`seenKeys` is shared by the caller).
function take(pool, count, seenKeys) {
  const out = [];
  for (const q of shuffleArray([...pool])) {
    if (out.length >= count) break;
    const key = `prompt:${promptKey(q)}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    out.push(q);
  }
  return out;
}

/** How many printable word problems the LOADED bank holds for a skill — the
 * screen disables "Word problems" / "Mixed" and caps the sheet count on this. */
export function storyAvailability(skillId) {
  return storyPlan(skillId).pool.length;
}

/** Same, for the practice problems of a bank-sourced skill. Computation
 * skills are unbounded. */
export function practiceAvailability(skillId) {
  const skill = skillById(skillId);
  if (!skill) return 0;
  return skill.source.kind === "bank" ? practicePool(skill).length : Infinity;
}

// "Unbounded" as a number, so the answer survives JSON on its way to Swift.
const UNBOUNDED_SHEETS = 99;

/**
 * How many sheets of each problem type the LOADED bank can fill for a skill.
 * Nothing is ever padded with generated filler: a type the bank cannot fill
 * reports 0 and the screen (web and iOS) switches it off.
 */
export function worksheetCapacity(skillId) {
  const skill = skillById(skillId);
  if (!skill) return { practice: 0, mixed: 0, stories: 0 };
  const budget = LAYOUTS[skill.layout];
  const plan = storyPlan(skillId);
  const stories = plan.pool.length;
  const practice = practiceAvailability(skillId);
  const sheetsOf = (pool, perSheet) => (pool === Infinity ? UNBOUNDED_SHEETS : Math.floor(pool / perSheet));
  return {
    practice: sheetsOf(practice, budget.practice),
    mixed: Math.min(sheetsOf(practice, budget.mixed), Math.floor(stories / plan.perMixedSheet)),
    stories: Math.floor(stories / plan.perSheet),
  };
}

/**
 * The sheets of one print run, clamped to what the loaded bank can fill (a
 * problem type it cannot fill falls back to practice). One seen-set for the
 * whole run, so five sheets are five different sheets. Empty when the bank
 * can fill nothing.
 */
export function generateWorksheetRun(skillId, { problemType = "practice", sheets = 1 } = {}) {
  const capacity = worksheetCapacity(skillId);
  const type = capacity[problemType] ? problemType : "practice";
  const count = Math.min(sheets, capacity[type]);
  const seenKeys = new Set();
  return Array.from({ length: Math.max(0, count) }, () => generateWorksheet(skillId, { problemType: type, seenKeys }));
}

/**
 * @param {string} skillId
 * @param {{problemType?: "practice"|"stories"|"mixed", seenKeys?: Set<string>}} options
 *   Pass one `seenKeys` set across the sheets of a print run so they differ.
 */
export function generateWorksheet(skillId, { problemType = "practice", seenKeys = new Set() } = {}) {
  const skill = skillById(skillId);
  if (!skill) throw new Error(`Unknown worksheet skill: ${skillId}`);
  if (!PROBLEM_TYPES.includes(problemType)) throw new Error(`Unknown problem type: ${problemType}`);

  const budget = LAYOUTS[skill.layout];
  const plan = problemType === "practice" ? null : storyPlan(skillId);
  const wantItems = problemType === "stories" ? 0 : budget[problemType];
  const wantStories = !plan ? 0 : problemType === "stories" ? plan.perSheet : plan.perMixedSheet;

  const items = !wantItems
    ? []
    : skill.source.kind === "computation"
      ? sampleSheet(skill.source, skill.mode, wantItems, seenKeys)
      : take(practicePool(skill), wantItems, seenKeys);
  const wordProblems = wantStories
    ? take(plan.pool, wantStories, seenKeys).map((question) => ({ kind: "story", question }))
    : [];

  const requested = wantItems + wantStories;
  const itemCount = items.length + wordProblems.length;
  return {
    skillId,
    mode: skill.mode,
    layout: problemType === "stories" ? "stories" : skill.layout,
    problemType,
    items,
    wordProblems,
    itemCount,
    requested,
    shortfall: requested - itemCount,
  };
}
