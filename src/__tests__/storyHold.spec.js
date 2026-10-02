import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FULL_ITEMS } from "../itemBank/fullBank";
import { setBankItems } from "../itemBank";
import {
  buildBankQuestion,
  createAdaptiveSession,
  generateQuestion,
  getNextQuestion,
  isSessionComplete,
  recordAnswer,
} from "../mathEngine";
import { getModeConfig } from "../modes";
import { maxLevelForMode } from "../modeLevels.js";
import { playSkillById, playSkills, skillsForPlay, topicGrades } from "../skills/play";
import { skillServable } from "../skills/session";
import { STORIES_HELD_MODE_IDS, isHeldStory, playStoriesAllowed, storiesHeld } from "../skills/storyHold";

/**
 * Word problems are on by default (Sai, 2026-10-02), so stories show in play:
 * when practice moves through a topic's skills, and when a kid picks a skill.
 * The v1 stories of four topics stay out of play until each topic's v2
 * stories go live. The admin pin (?item=) still serves any row.
 */

vi.setConfig({ testTimeout: 60000 });
beforeAll(() => setBankItems(FULL_ITEMS, "test"));

const fresh = { level: 1, mistakeBank: [], bankItemStats: {}, recentBankItemIds: [] };
const isStory = (q) => q.metadata?.itemFamily === "application";

/** Play a session to the end, every answer right; the questions served. */
function play(mode, options, size = 15) {
  let session = createAdaptiveSession(mode, size, { savedProgress: fresh, allowWordProblems: true, ...options });
  const served = [];
  let guard = 0;
  while (!isSessionComplete(session) && guard < 200) {
    guard += 1;
    const { question, isRetry } = getNextQuestion(session);
    const submission = Array.isArray(question.answer) && Array.isArray(question.answer[0]) ? question.answer[0] : question.answer;
    session = recordAnswer(session, question, submission, 3000, isRetry).session;
    served.push(question);
  }
  return served;
}

describe("the held list", () => {
  it("is the four topics whose v1 stories Sai holds back", () => {
    expect([...STORIES_HELD_MODE_IDS].sort()).toEqual(["addition", "barModels", "numberBonds", "subtraction"]);
    expect(Object.isFrozen(STORIES_HELD_MODE_IDS)).toBe(true);
    for (const mode of STORIES_HELD_MODE_IDS) {
      expect(getModeConfig(mode), mode).toBeTruthy();
      expect(storiesHeld(mode)).toBe(true);
      expect(playStoriesAllowed(mode, true)).toBe(false);
    }
    expect(playStoriesAllowed("money", true)).toBe(true);
    expect(playStoriesAllowed("money", false)).toBe(false);
    expect(playStoriesAllowed("money", undefined)).toBe(true);
  });

  it("knows a held story when it sees one", () => {
    expect(isHeldStory({ mode: "addition", metadata: { itemFamily: "application" } })).toBe(true);
    expect(isHeldStory({ metadata: { itemFamily: "application" } }, "numberBonds")).toBe(true);
    expect(isHeldStory({ mode: "addition", metadata: { itemFamily: "procedural" } })).toBe(false);
    expect(isHeldStory({ mode: "money", metadata: { itemFamily: "application" } })).toBe(false);
  });
});

describe("stories show in play when the setting is on", () => {
  for (const skillId of ["money-count-coins-4", "time-read-clock-4"]) {
    it(`a kid who picks ${skillId} gets stories from the skill's own cell`, () => {
      const skill = playSkillById(skillId);
      expect(skill.stories, "the skill has stories").toBeTruthy();
      const served = play(skill.mode, { skillId }, 30);
      const stories = served.filter(isStory);
      expect(stories.length).toBeGreaterThan(0);
      for (const q of stories) {
        expect(q.skillId).toBe(skill.id);
        expect(q.metadata.itemSource).toBe("bank");
      }
    });
  }

  it("practice moving through a topic's skills (Larkit picks) mixes stories in", () => {
    const ids = skillsForPlay("2", "money").map((s) => s.id);
    expect(ids.length).toBeGreaterThan(1);
    const served = play("money", { skillIds: ids, grade: "2" }, 30);
    expect(served.some(isStory)).toBe(true);
  });

  it("the setting off still keeps them out", () => {
    const served = play("money", { skillId: "money-count-coins-4", allowWordProblems: false }, 30);
    expect(served.some(isStory)).toBe(false);
  });
});

describe("a held topic never serves a story, whatever the setting", () => {
  for (const mode of STORIES_HELD_MODE_IDS) {
    describe(mode, () => {
      const withStories = playSkills().filter((s) => s.mode === mode && s.stories);

      it("has skills with stories to hold (the hold is doing something)", () => {
        expect(withStories.length).toBeGreaterThan(0);
      });

      it("a picked skill: no story, and the session still fills from its own cell", () => {
        for (const skill of withStories) {
          for (const allowWordProblems of [true, false]) {
            const served = play(mode, { skillId: skill.id, allowWordProblems }, 8);
            expect(served).toHaveLength(8);
            for (const q of served) {
              expect(isStory(q), `${skill.id} served a story: ${q.metadata.itemId}`).toBe(false);
              expect(q.skillId).toBe(skill.id);
            }
          }
          expect(skillServable(skill.id), skill.id).toBe(true);
        }
      });

      it("Larkit picks and the Fledging Flight: no story in any grade", () => {
        for (const grade of topicGrades(mode)) {
          const ids = skillsForPlay(grade, mode).map((s) => s.id);
          for (const served of [
            play(mode, { skillIds: ids, grade }, 20),
            play(mode, { skillIds: ids, challenge: true }, 6),
          ]) {
            for (const q of served) expect(isStory(q), `grade ${grade}: ${q.metadata.itemId}`).toBe(false);
          }
        }
      });

      it("the plain session (no skills: the fallback when none can be built) with word problems on: no story at any level", () => {
        for (let level = 1; level <= maxLevelForMode(mode); level += 1) {
          const served = play(mode, { savedProgress: { ...fresh, level } }, 15);
          for (const q of served) expect(isStory(q), `L${level}: ${q.metadata.itemId}`).toBe(false);
        }
      });
    });
  }
});

describe("an empty story cell never falls back to a template story", () => {
  // With the bank empty every question comes from the template generator:
  // the skill session's fallback and the plain session's both.
  beforeAll(() => setBankItems([], "test"));
  afterAll(() => setBankItems(FULL_ITEMS, "test"));

  for (const mode of STORIES_HELD_MODE_IDS) {
    it(`${mode}: skill sessions and the plain session, word problems on`, () => {
      for (const skill of playSkills().filter((s) => s.mode === mode && s.source.kind !== "computation")) {
        for (const q of play(mode, { skillId: skill.id }, 6)) {
          expect(q.metadata.itemSource).not.toBe("bank");
          expect(isStory(q), `${skill.id}: ${q.display?.promptText}`).toBe(false);
        }
      }
      for (const level of [1, 4, 7, 10]) {
        for (const q of play(mode, { savedProgress: { ...fresh, level } }, 15)) {
          expect(isStory(q), `L${level}: ${q.display?.promptText}`).toBe(false);
        }
      }
    });
  }

  it("the generators the held topics fall back to never write a story when stories are off", () => {
    for (const mode of STORIES_HELD_MODE_IDS) {
      const { subskills } = getModeConfig(mode);
      for (let level = 1; level <= maxLevelForMode(mode); level += 1) {
        for (const itemFamily of [undefined, "procedural", "conceptual"]) {
          for (const targetSubskill of [undefined, ...subskills]) {
            for (let i = 0; i < 6; i += 1) {
              const q = generateQuestion(mode, level, { itemFamily, targetSubskill, allowWordProblems: false });
              expect(isStory(q), `${mode} L${level} ${itemFamily} ${targetSubskill}`).toBe(false);
            }
          }
        }
      }
    }
  });
});

describe("the admin pin (?item=) still serves the pinned row", () => {
  it("a held topic's approved story is served as itself", () => {
    for (const mode of STORIES_HELD_MODE_IDS) {
      const row = FULL_ITEMS.find((item) => item.modeId === mode && item.itemFamily === "application" && item.reviewStatus === "approved");
      expect(row, `${mode} has an approved story row`).toBeTruthy();
      // MathExplorer serves a pinned row through buildBankQuestion, never the scheduler.
      const q = buildBankQuestion(row, row.levelRange[0]);
      expect(q.metadata.itemId).toBe(row.itemId);
      expect(q.metadata.itemSource).toBe("bank");
      expect(q.mode).toBe(mode);
      expect(q.display.promptText).toBe(row.question.display.promptText);
    }
  });
});
