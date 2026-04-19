import { describe, expect, it } from "vitest";
import { MODE_IDS, getModeConfig } from "../modes";
import { generateQuestion, generateChoices, generateWorksheetSet } from "../mathEngine";

describe("mode generation coverage", () => {
  it("generates valid metadata for every mode", () => {
    for (const mode of MODE_IDS) {
      const q = generateQuestion(mode, 5);
      expect(q.mode).toBe(mode);
      expect(q.metadata).toBeTruthy();
      expect(q.metadata.modeId).toBe(mode);
      expect(q.metadata.itemFamily).toMatch(/conceptual|procedural|application/);
      expect(Array.isArray(q.metadata.mathPractices)).toBe(true);
      expect(q.metadata.mathPractices.length).toBeGreaterThan(0);
      expect(Array.isArray(q.metadata.misconceptionTags)).toBe(true);
    }
  });

  it("covers all item families in each mode over repeated sampling", () => {
    const targetFamilies = new Set(["conceptual", "procedural", "application"]);
    for (const mode of MODE_IDS) {
      const modeConfig = getModeConfig(mode);
      const seen = new Set();
      for (let level = 1; level <= 10; level++) {
        for (let i = 0; i < 24; i++) {
          const q = generateQuestion(mode, level);
          seen.add(q.metadata.itemFamily);
          if (seen.size === targetFamilies.size) break;
        }
      }
      for (const expected of modeConfig.families || targetFamilies) {
        expect(seen.has(expected)).toBe(true);
      }
    }
  });

  it("always includes the correct answer in generated choices", () => {
    for (const mode of MODE_IDS) {
      for (let i = 0; i < 30; i++) {
        const q = generateQuestion(mode, 4);
        const choices = generateChoices(q.answer, 4, q);
        expect(choices.includes(q.answer)).toBe(true);
        expect(new Set(choices).size).toBe(choices.length);
      }
    }
  });

  it("reserves application/story items for advanced levels", () => {
    const storyModes = [
      "addition",
      "subtraction",
      "multiplication",
      "division",
      "comparing",
      "counting",
      "skipCounting",
    ];
    for (const mode of storyModes) {
      for (let level = 1; level <= 6; level++) {
        for (let i = 0; i < 20; i++) {
          const q = generateQuestion(mode, level);
          expect(q.metadata.itemFamily).not.toBe("application");
        }
      }
    }
  });

  it("supports disabling word problems through generation context", () => {
    const storyModes = [
      "addition",
      "subtraction",
      "multiplication",
      "division",
      "comparing",
      "counting",
      "skipCounting",
    ];
    for (const mode of storyModes) {
      for (let i = 0; i < 40; i++) {
        const q = generateQuestion(mode, 10, { allowWordProblems: false });
        expect(q.metadata.itemFamily).not.toBe("application");
      }
    }
  });

  it("sources application items from the approved bank", () => {
    const modesWithApplicationContext = MODE_IDS.filter((mode) => mode !== "placeValue");
    for (const mode of modesWithApplicationContext) {
      const q = generateQuestion(mode, 10, {
        itemFamily: "application",
        allowWordProblems: true,
      });
      expect(q.metadata.itemFamily).toBe("application");
      expect(q.metadata.itemSource).toBe("bank");
      expect(q.metadata.itemId).toBeTruthy();
      expect(q.display?.promptText).toBeTruthy();
    }

    const placeValueQuestion = generateQuestion("placeValue", 10, {
      itemFamily: "application",
      questionType: "build",
      allowWordProblems: true,
    });
    expect(placeValueQuestion.metadata.itemFamily).toBe("application");
    expect(placeValueQuestion.metadata.itemSource).toBe("bank");
    expect(placeValueQuestion.metadata.itemId).toBeTruthy();
    expect(placeValueQuestion.display?.promptText).toBeTruthy();
  });

  it("respects worksheet word-problem toggle", () => {
    const storyModes = [
      "addition",
      "subtraction",
      "multiplication",
      "division",
      "comparing",
      "counting",
      "skipCounting",
    ];
    for (const mode of storyModes) {
      const set = generateWorksheetSet(mode, 10, 25, { allowWordProblems: false });
      for (const q of set) {
        expect(q.metadata.itemFamily).not.toBe("application");
      }
    }
  });
});
