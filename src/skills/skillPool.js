/* Which bank rows belong to a skill. Pure — shared by the printed sheet
 * (generateWorksheet.js) and the play session, so a skill means the same rows
 * on paper and on screen.
 */
import { APPROVED } from "../itemBank/reviewStatus.js";

export { storyMatches, withinNumbers } from "../worksheets/claimCheck.js";

export const overlaps = (range, levels) =>
  Array.isArray(range) && Array.isArray(levels) && range[0] <= levels[1] && range[1] >= levels[0];

/**
 * A bank row sits in a skill's cell: approved, same mode, one of the skill's
 * families, its subskill / structure filters, and a level range that overlaps
 * the skill's band. (`numbers` is a payload test, applied after the row is
 * built — see withinNumbers.)
 */
export function cellMatches(item, mode, filter) {
  if (item.modeId !== mode || item.reviewStatus !== APPROVED) return false;
  if (!filter.families.includes(item.itemFamily)) return false;
  if (filter.subskills && !filter.subskills.includes(item.subskill)) return false;
  if (filter.structureTypes && !filter.structureTypes.includes(item.structureType)) return false;
  if (filter.excludeStructureTypes?.includes(item.structureType)) return false;
  return overlaps(item.levelRange, filter.levels);
}
