/**
 * The v1 add/sub word problems Sai retired on 2026-10-02 (2,376 rows).
 *
 * In addition, subtraction, Bar Models and Number Bonds that was every story:
 * those topics declare no `application` family (src/modes). In Counting and
 * Comparing it was only these structure types; their other stories stay.
 *
 * Plain data, no imports: the native engine (mathEngine) reads it to drop a
 * saved retry of a retired row, and retiredStories.spec reads it to keep the
 * rows out of the bundle and the seed.
 */
export const RETIRED_STORY_STRUCTURES = Object.freeze({
  counting: Object.freeze(["storyHiddenCount", "storyTwoSpots", "storyTargetGap"]),
  comparing: Object.freeze(["storyDifference", "storyGapToGoal", "storyLanguageTrap", "storyOneMoreLess"]),
});

/** Is this (mode, structureType) one of the retired Counting/Comparing stories? */
export function isRetiredStoryStructure(modeId, structureType) {
  return Boolean(structureType) && Boolean(RETIRED_STORY_STRUCTURES[modeId]?.includes(structureType));
}
