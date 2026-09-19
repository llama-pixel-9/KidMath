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
} from "./layouts.js";
import { skillById } from "./skillIndex.js";

const overlaps = (range, levels) => Array.isArray(range) && range[0] <= levels[1] && range[1] >= levels[0];

function cellMatches(item, mode, filter) {
  if (item.modeId !== mode || item.reviewStatus !== APPROVED) return false;
  if (!filter.families.includes(item.itemFamily)) return false;
  if (filter.subskills && !filter.subskills.includes(item.subskill)) return false;
  if (filter.structureTypes && !filter.structureTypes.includes(item.structureType)) return false;
  return overlaps(item.levelRange, filter.levels);
}

// The render-ready, print-worded question for a bank item — or null when the
// paper rules reject it (screen verbs, answer printed in its own prompt…).
function printableFromBank(item, skill) {
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
  return isPrintablePrompt(q) ? q : null;
}

function bankPool(skill, filter, accept) {
  const out = [];
  for (const item of getBankItems()) {
    if (!cellMatches(item, skill.mode, filter)) continue;
    const q = printableFromBank(item, skill);
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
  return bankPool(skill, filter, (q) => {
    if (!isVerbalPrompt(q.display?.promptText)) return false;
    return storyMatches(q, skill.stories);
  });
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
  const skill = skillById(skillId);
  return skill ? storyPool(skill).length : 0;
}

/** Same, for the practice problems of a bank-sourced skill. Computation
 * skills are unbounded. */
export function practiceAvailability(skillId) {
  const skill = skillById(skillId);
  if (!skill) return 0;
  return skill.source.kind === "bank" ? practicePool(skill).length : Infinity;
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
  const figureSheet = skill.layout === "figure";
  const wantItems = problemType === "stories" ? 0 : budget[problemType];
  const wantStories =
    problemType === "stories"
      ? figureSheet ? STORIES_PER_FIGURE_SHEET : STORIES_PER_SHEET
      : problemType === "mixed"
        ? figureSheet ? MIXED_STORIES_FIGURE : MIXED_STORIES
        : 0;

  const items = !wantItems
    ? []
    : skill.source.kind === "computation"
      ? sampleSheet(skill.source, skill.mode, wantItems, seenKeys)
      : take(practicePool(skill), wantItems, seenKeys);
  const wordProblems = wantStories
    ? take(storyPool(skill), wantStories, seenKeys).map((question) => ({ kind: "story", question }))
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
