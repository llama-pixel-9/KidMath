import { describe, expect, it } from "vitest";
import { MODE_IDS, getModeConfig } from "../modes";
import { generateQuestion, generateChoices, generateWorksheetSet } from "../mathEngine";
import { buildQuestionFromBankItem } from "../itemBank.js";

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
        // generateChoices only applies to multiple-choice questions; typed /
        // symbol / fraction formats are judged by checkAnswer, not choices.
        if (q.answerType && q.answerType !== "choice") continue;
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
    // placeValue uses the BUILD type; fractions/decimals/numberBonds are new
    // modes with no bank content yet.
    const bankless = new Set([
      "placeValue",
      "fractions",
      "decimals",
      "numberBonds",
      "barModels",
      "placeValueDiscs",
      "factorsMultiples",
      "areaPerimeter",
      "money",
      "patterns",
      "measurement",
      "time",
      "dataGraphs",
      "angles",
      "linesShapes",
    ]);
    const modesWithApplicationContext = MODE_IDS.filter((mode) => !bankless.has(mode));
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

  it("multiplication mode generates 2-digit, typed-answer questions at Grade 4 levels", () => {
    const mult = getModeConfig("multiplication");
    // Level 10 uses two-digit factors -> numberPad; the product is the answer.
    for (let i = 0; i < 40; i++) {
      const q = mult.generate(10);
      expect(q.answerType).toBe("numberPad");
      expect(q.a >= 10 || q.b >= 10).toBe(true);
      expect(q.a * q.b).toBe(q.answer);
    }
    // Early levels keep single-digit facts as multiple choice (no numberPad).
    for (let i = 0; i < 40; i++) {
      const q = mult.generate(3);
      expect(q.answerType).toBeUndefined();
    }
  });

  it("comparing generates symbolSelect questions whose answer is a comparison symbol", () => {
    const comparing = getModeConfig("comparing");
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 20; i++) {
        const q = comparing.generate(level);
        expect(q.answerType).toBe("symbolSelect");
        expect(["<", ">", "="]).toContain(q.answer);
      }
    }
  });

  it("skipCounting uses fillBlank at Grade 2+ and stays multiple-choice at K-1", () => {
    const skip = getModeConfig("skipCounting");
    for (let i = 0; i < 20; i++) {
      const q = skip.generate(6);
      expect(q.answerType).toBe("fillBlank");
      // Answer is the next term after the shown 3-term sequence.
      expect(q.answer).toBe(q.display.sequence[2] + q.display.step);
    }
    for (let i = 0; i < 20; i++) {
      const q = skip.generate(2);
      expect(q.answerType).toBeUndefined();
    }
  });

  it("fractions mode generates valid fraction/symbolSelect/fractionSet items", () => {
    const fractions = getModeConfig("fractions");
    const seenTypes = new Set();
    for (let level = 3; level <= 10; level++) {
      for (let i = 0; i < 40; i++) {
        const q = fractions.generate(level);
        seenTypes.add(q.answerType);
        expect(["fraction", "symbolSelect", "fractionSet"]).toContain(q.answerType);
        expect(q.display.promptText).toBeTruthy();
        if (q.answerType === "symbolSelect") {
          expect(["<", ">", "="]).toContain(q.answer);
        } else if (q.answerType === "fractionSet") {
          // num/den of total, answer a whole number
          const { total, num, den } = q.display.set;
          expect(q.answer).toBe((total / den) * num);
          expect(Number.isInteger(q.answer)).toBe(true);
        } else {
          expect(Number.isInteger(q.answer.num)).toBe(true);
          expect(q.answer.den).toBeGreaterThan(0);
        }
      }
    }
    expect(seenTypes.has("fraction")).toBe(true);
    expect(seenTypes.has("symbolSelect")).toBe(true);
    expect(seenTypes.has("fractionSet")).toBe(true);
  });

  it("decimals mode generates valid decimal/symbolSelect items", () => {
    const decimals = getModeConfig("decimals");
    const seenTypes = new Set();
    for (let level = 3; level <= 10; level++) {
      for (let i = 0; i < 30; i++) {
        const q = decimals.generate(level);
        seenTypes.add(q.answerType);
        expect(["decimal", "symbolSelect"]).toContain(q.answerType);
        expect(q.display.promptText).toBeTruthy();
        if (q.answerType === "symbolSelect") {
          expect(["<", ">", "="]).toContain(q.answer);
        } else {
          expect(typeof q.answer).toBe("number");
          expect(q.answer).toBeGreaterThan(0);
        }
      }
    }
    expect(seenTypes.has("decimal")).toBe(true);
    expect(seenTypes.has("symbolSelect")).toBe(true);
  });

  it("numberBonds mode generates part-whole items with the missing part as answer", () => {
    const bonds = getModeConfig("numberBonds");
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 20; i++) {
        const q = bonds.generate(level);
        expect(q.answerType).toBe("numberBond");
        expect(q.display.whole).toBeGreaterThan(q.display.part);
        expect(q.answer).toBe(q.display.whole - q.display.part);
        expect(q.answer).toBeGreaterThan(0);
      }
    }
  });

  it("barModels mode generates part-whole and comparison bars with correct answers", () => {
    const bars = getModeConfig("barModels");
    const seenTypes = new Set();
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 20; i++) {
        const q = bars.generate(level);
        expect(q.answerType).toBe("barModel");
        seenTypes.add(q.display.type);
        if (q.display.type === "barCompare") {
          expect(q.answer).toBe(q.display.a + q.display.diff);
        } else {
          expect(q.display.type).toBe("barPartWhole");
          expect(q.answer).toBe(q.display.whole - q.display.part);
        }
      }
    }
    expect(seenTypes.has("barCompare")).toBe(true);
    expect(seenTypes.has("barPartWhole")).toBe(true);
  });

  it("placeValueDiscs mode: disc columns sum to the answer", () => {
    const pv = getModeConfig("placeValueDiscs");
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 20; i++) {
        const q = pv.generate(level);
        expect(q.answerType).toBe("placeValueDiscs");
        const sum = q.display.cols.reduce((s, c) => s + c.place * c.count, 0);
        expect(sum).toBe(q.answer);
        expect(q.answer).toBeGreaterThan(0);
      }
    }
  });

  it("practical Grade 3-4 modes (factors/area/money) produce correct numeric answers", () => {
    const fm = getModeConfig("factorsMultiples");
    for (let i = 0; i < 40; i++) {
      const q = fm.generate(8);
      expect(q.answerType).toBe("numberPad");
      expect(Number.isInteger(q.answer)).toBe(true);
      expect(q.answer).toBeGreaterThan(0);
    }
    const ap = getModeConfig("areaPerimeter");
    for (let i = 0; i < 40; i++) {
      const q = ap.generate(8);
      const { width: w, height: h } = q.display;
      expect([w * h, 2 * (w + h)]).toContain(q.answer);
    }
    const money = getModeConfig("money");
    for (let i = 0; i < 40; i++) {
      const q = money.generate(8);
      expect(q.answerType).toBe("numberPad");
      expect(q.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it("patterns/measurement/time modes produce valid answers", () => {
    const patterns = getModeConfig("patterns");
    for (let i = 0; i < 40; i++) {
      const q = patterns.generate(8);
      expect(q.answerType).toBe("fillBlank");
      expect(Number.isInteger(q.answer)).toBe(true);
    }
    const measurement = getModeConfig("measurement");
    for (let i = 0; i < 40; i++) {
      const q = measurement.generate(8);
      expect(q.answerType).toBe("numberPad");
      expect(q.answer).toBeGreaterThan(0);
    }
    const time = getModeConfig("time");
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      const q = time.generate(8);
      seen.add(q.answerType);
      expect(["clock", "numberPad"]).toContain(q.answerType);
      if (q.answerType === "clock") {
        expect(q.answer).toBe(q.display.minute);
        expect(q.display.hour).toBeGreaterThanOrEqual(1);
      }
      expect(q.answer).toBeGreaterThanOrEqual(0);
    }
    expect(seen.has("clock")).toBe(true);
  });

  it("dataGraphs/angles/linesShapes modes produce valid answers", () => {
    const dg = getModeConfig("dataGraphs");
    for (let i = 0; i < 40; i++) {
      const q = dg.generate(8);
      expect(q.answerType).toBe("barGraph");
      expect(Array.isArray(q.display.bars)).toBe(true);
      expect(q.answer).toBeGreaterThanOrEqual(0);
    }
    const ang = getModeConfig("angles");
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      const q = ang.generate(8);
      seen.add(q.answerType);
      expect(["angle", "numberPad"]).toContain(q.answerType);
      if (q.answerType === "angle") expect(q.answer).toBe(q.display.degrees);
      expect(q.answer).toBeGreaterThan(0);
    }
    expect(seen.has("angle")).toBe(true);
    const ls = getModeConfig("linesShapes");
    for (let i = 0; i < 40; i++) {
      const q = ls.generate(8);
      expect(q.answerType).toBe("numberPad");
      expect(Number.isInteger(q.answer)).toBe(true);
      // Shapes with no line of symmetry (parallelogram, scalene triangle) are
      // valid Grade-4 items, so 0 is an allowed answer for symmetryLines.
      if (q.metadata.subskill === "symmetryLines") {
        expect(q.answer).toBeGreaterThanOrEqual(0);
      } else {
        expect(q.answer).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("carries answerType from a bank item payload through to the question", () => {
    // Proves Grade-4 bank content can be typed-answer: the numberPad flag on an
    // item's question payload survives buildQuestionFromBankItem end to end.
    const q = buildQuestionFromBankItem(
      {
        itemId: "multiplication-proc-numberpad-demo",
        itemFamily: "procedural",
        subskill: "factFluency",
        reviewStatus: "approved",
        question: { a: 47, b: 38, op: "×", answer: 1786, answerType: "numberPad" },
      },
      10
    );
    expect(q.answerType).toBe("numberPad");
    expect(q.answer).toBe(1786);
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
