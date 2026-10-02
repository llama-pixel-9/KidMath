import { describe, expect, it } from "vitest";
import { generateQuestion } from "../mathEngine";
import { setBankItems } from "../itemBank";
import { FULL_ITEMS } from "../itemBank/fullBank";
import { RETIRED_STORY_STRUCTURES } from "../itemBank/retiredStories";
import { SEED_ITEMS } from "../itemBank/seedItems";
import { getModeConfig } from "../modes";
import { WORKSHEET_SKILLS } from "../skills/catalog";
import { playSkills } from "../skills/play";
import { skillServable } from "../skills/session";

// On 2026-10-02 Sai retired every v1 addition and subtraction word problem
// (2,376 rows): all the stories of addition, subtraction, Bar Models and
// Number Bonds, plus the add/sub story structures of Counting and Comparing,
// which keep their other stories. This spec keeps the retire from coming back
// quietly: through a mode that declares stories again, a skill that offers
// them, or a `bank:export` / seed rebuild that writes the rows back.
const STORYLESS = ["addition", "subtraction", "barModels", "numberBonds"];
const RETIRED_STRUCTURES = RETIRED_STORY_STRUCTURES;

describe("retired add/sub word problems (2026-10-02)", () => {
  it("addition, subtraction, Bar Models and Number Bonds declare no word-problem family", () => {
    for (const mode of STORYLESS) expect(getModeConfig(mode).families, mode).toEqual(["conceptual", "procedural"]);
    for (const mode of Object.keys(RETIRED_STRUCTURES)) expect(getModeConfig(mode).families, mode).toContain("application");
  });

  it("no bundled row brings a retired story back (full bundle and seed)", () => {
    const retired = (item) =>
      (STORYLESS.includes(item.modeId) && item.itemFamily === "application") ||
      Boolean(RETIRED_STRUCTURES[item.modeId]?.includes(item.structureType));
    expect(FULL_ITEMS.filter(retired).map((item) => item.itemId)).toEqual([]);
    expect(SEED_ITEMS.filter(retired).map((item) => item.itemId)).toEqual([]);
  });

  it("the retired Counting and Comparing structures are the seven the retire named", () => {
    expect(RETIRED_STRUCTURES).toEqual({
      counting: ["storyHiddenCount", "storyTwoSpots", "storyTargetGap"],
      comparing: ["storyDifference", "storyGapToGoal", "storyLanguageTrap", "storyOneMoreLess"],
    });
  });

  // generateQuestion keeps the application family out of these topics, but the
  // Bar Models generator writes EVERY family as a named-character story ("Sam
  // has 16 marbles. Kaia has 4. …", labelled conceptual). So no generated Bar
  // Models question may reach a kid at all: the shipped seed alone must serve
  // every ladder cell and every play skill from bank rows, words on and off.
  it("Bar Models is served from bank rows by the seed alone, never by its generator", () => {
    const { families, subskills } = getModeConfig("barModels");
    const top = getModeConfig("barModels").maxLevel ?? 10;
    setBankItems(SEED_ITEMS, "test");
    try {
      for (let level = 1; level <= top; level++) {
        for (const itemFamily of families) {
          for (const targetSubskill of subskills) {
            for (const allowWordProblems of [true, false]) {
              const q = generateQuestion("barModels", level, { itemFamily, targetSubskill, allowWordProblems });
              expect(q.metadata.itemSource, `L${level} ${itemFamily} ${targetSubskill} words=${allowWordProblems}`).toBe("bank");
            }
          }
        }
      }
      const skills = playSkills().filter((skill) => skill.mode === "barModels");
      expect(skills.length).toBeGreaterThan(0);
      for (const skill of skills) {
        expect(skillServable(skill.id, { allowWordProblems: true }), skill.id).toBe(true);
        expect(skillServable(skill.id, { allowWordProblems: false }), skill.id).toBe(true);
      }
    } finally {
      setBankItems(SEED_ITEMS, "test");
    }
  });

  it("their skills offer no stories, on paper or in play", () => {
    const skills = [...WORKSHEET_SKILLS, ...playSkills()].filter((skill) => STORYLESS.includes(skill.mode));
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) expect(skill.stories, skill.id).toBeNull();
  });
});
