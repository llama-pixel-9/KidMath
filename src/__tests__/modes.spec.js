import { describe, expect, it } from "vitest";
import { MODE_IDS, getModeConfig } from "../modes";
import { generateQuestion, generateChoices, generateWorksheetSet } from "../mathEngine";
import { buildQuestionFromBankItem } from "../itemBank.js";

// Values only, so the test does not depend on the widget rendering.
const COIN_VALUES = { penny: 1, nickel: 5, dime: 10, quarter: 25 };

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

  // Replaces "reserves application/story items for advanced levels", which
  // asserted no application items below level 7. That gate was the direct cause
  // of the 100% prompt-signature cells at levels 1-6 (docs/variety-baseline.md):
  // word problems were these modes' only source of prompt variety and they were
  // switched off for the youngest users. K does word problems in the standards
  // (read aloud), so the policy is now short prose and small numbers, not no
  // prose. See levelPolicy.WORD_PROBLEMS_FROM_LEVEL.
  it("offers story items at every level, including Kindergarten", () => {
    const storyModes = ["addition", "subtraction", "multiplication", "division"];
    for (const mode of storyModes) {
      for (const level of [1, 2, 3]) {
        const families = new Set();
        for (let i = 0; i < 60; i++) {
          families.add(generateQuestion(mode, level).metadata.itemFamily);
        }
        expect(families.has("application"), `${mode} L${level} should tell stories`).toBe(true);
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
    // Formats are switched off here: a format transform legitimately replaces
    // the answer type (a true/false item is a choice), and this test is about
    // the underlying generator.
    for (let i = 0; i < 40; i++) {
      const q = mult.generate(10, { noFormats: true });
      expect(q.answerType).toBe("numberPad");
      expect(q.a >= 10 || q.b >= 10).toBe(true);
      // The mode now emits missing-factor items (`? x 5 = 90`) alongside
      // product-unknown ones, so a*b == answer only holds for the latter. In
      // both cases the three quantities must satisfy g x s = p.
      const quantities = [q.a, q.b, q.answer].sort((x, y) => x - y);
      expect(quantities[0] * quantities[1]).toBe(quantities[2]);
    }
    // Early levels keep single-digit facts as multiple choice (no numberPad).
    for (let i = 0; i < 40; i++) {
      const q = mult.generate(3, { noFormats: true });
      // Small-band items are choice-based by default, but the variety
      // re-dressing may legitimately render one as a typed spoken-number or
      // picture item — never as a two-digit computation.
      expect([undefined, "numberPad"]).toContain(q.answerType);
      const quantities = [q.a, q.b, q.answer].sort((x, y) => x - y);
      expect(quantities[0] * quantities[1]).toBe(quantities[2]);
    }
  });

  // M4: comparing is no longer one shape. It spans symbol selection, set
  // comparison, expression and place-value comparison, ordering, benchmarks,
  // true/false, relational non-computables, number lines and two Table 1
  // Compare stories, so `symbolSelect` is now one answer type among several.
  // Every symbol-picking item still answers with <, > or =; see
  // m4NumberSense.spec.js for the per-variety correctness proofs.
  it("comparing symbol items answer with a comparison symbol", () => {
    const comparing = getModeConfig("comparing");
    const seenTypes = new Set();
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 20; i++) {
        const q = comparing.generate(level, { noFormats: true });
        seenTypes.add(q.answerType || "choice");
        if (q.answerType === "symbolSelect") {
          expect(["<", ">", "="]).toContain(q.answer);
        }
      }
    }
    expect(seenTypes.has("symbolSelect")).toBe(true);
    for (let i = 0; i < 20; i++) {
      const q = comparing.generate(3, { varietyId: "symbolBetweenNumerals" });
      expect(q.answerType).toBe("symbolSelect");
      expect(["<", ">", "="]).toContain(q.answer);
    }
  });

  // M4: the mode now runs 14 varieties (backward runs, missing middle/start
  // terms, off-multiple runs, rule identification, membership, number lines...),
  // so the answer type follows the variety. The next-term run keeps its old
  // contract, pinned here by varietyId.
  it("skipCounting next-term items use fillBlank at Grade 2+ and stay multiple-choice at K-1", () => {
    const skip = getModeConfig("skipCounting");
    for (let i = 0; i < 20; i++) {
      const q = skip.generate(6, { varietyId: "nextTermForward", noFormats: true });
      expect(q.answerType).toBe("fillBlank");
      // Answer is the next term after the shown 3-term sequence.
      expect(q.answer).toBe(q.display.sequence[2] + q.display.step);
    }
    for (let i = 0; i < 20; i++) {
      const q = skip.generate(2, { varietyId: "nextTermForward", noFormats: true });
      expect(q.answerType).toBeUndefined();
    }
  });

  // M4: fractions is no longer four tiers of one symbolic shape. It now spans
  // part-whole naming, fraction-as-a-number on a line, three comparison
  // strategies, equivalence, like-denominator arithmetic and fraction-of-a-set,
  // so the answerType set is correspondingly wider. Per-item correctness is
  // recomputed independently in m4Fractions.spec.js.
  it("fractions mode generates valid items across its widened answer types", () => {
    const fractions = getModeConfig("fractions");
    const seenTypes = new Set();
    for (let level = 3; level <= 10; level++) {
      for (let i = 0; i < 40; i++) {
        const q = fractions.generate(level);
        seenTypes.add(q.answerType);
        expect([
          "fraction",
          "symbolSelect",
          "fractionSet",
          "numberLine",
          "multiSelect",
          "choice",
        ]).toContain(q.answerType);
        expect(q.display.promptText).toBeTruthy();
        if (q.answerType === "symbolSelect") {
          expect(["<", ">", "="]).toContain(q.answer);
        } else if (q.answerType === "fractionSet") {
          // num/den of total, answer a whole number
          const { total, num, den } = q.display.set;
          expect(q.answer).toBe((total / den) * num);
          expect(Number.isInteger(q.answer)).toBe(true);
        } else if (q.answerType === "fraction") {
          expect(Number.isInteger(q.answer.num)).toBe(true);
          expect(q.answer.den).toBeGreaterThan(0);
        } else if (q.answerType === "multiSelect") {
          expect(Array.isArray(q.answer)).toBe(true);
          expect(q.answer.length).toBeGreaterThan(0);
        } else {
          expect(q.answer).not.toBe(null);
        }
      }
    }
    // Product call (2026-07): naming/reading/simplifying a fraction answers by
    // multiple choice, not by typing numerator and denominator.
    expect(seenTypes.has("fraction")).toBe(false);
    expect(seenTypes.has("choice")).toBe(true);
    expect(seenTypes.has("symbolSelect")).toBe(true);
    expect(seenTypes.has("fractionSet")).toBe(true);
    expect(seenTypes.has("numberLine")).toBe(true);
  });

  it("decimals mode generates valid items across its widened answer types", () => {
    const decimals = getModeConfig("decimals");
    const seenTypes = new Set();
    for (let level = 3; level <= 10; level++) {
      for (let i = 0; i < 30; i++) {
        const q = decimals.generate(level);
        seenTypes.add(q.answerType);
        expect([
          "decimal",
          "symbolSelect",
          "numberLine",
          "multiSelect",
          "choice",
        ]).toContain(q.answerType);
        expect(q.display.promptText).toBeTruthy();
        if (q.answerType === "symbolSelect") {
          expect(["<", ">", "="]).toContain(q.answer);
        } else if (q.answerType === "decimal" || q.answerType === "numberLine") {
          expect(typeof q.answer).toBe("number");
          expect(q.answer).toBeGreaterThan(0);
        }
      }
    }
    expect(seenTypes.has("decimal")).toBe(true);
    expect(seenTypes.has("symbolSelect")).toBe(true);
    expect(seenTypes.has("numberLine")).toBe(true);
  });

  // M4: which node is blank is now a generator parameter (research §3.3), so
  // the mode also produces whole-unknown, three-part, make-ten, place-value and
  // multi-answer bonds. The part-unknown bond — the one the NumberBond widget
  // draws — keeps its exact old contract.
  it("numberBonds part-unknown items put the missing part in the bond slot", () => {
    const bonds = getModeConfig("numberBonds");
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 20; i++) {
        const q = bonds.generate(level, { varietyId: "partUnknown", noFormats: true });
        expect(q.answerType).toBe("numberBond");
        expect(q.display.whole).toBeGreaterThan(q.display.part);
        expect(q.answer).toBe(q.display.whole - q.display.part);
        expect(q.answer).toBeGreaterThan(0);
      }
    }
  });

  // M4: barModels now covers all seven §3.2 schemas. Only the schemas the
  // BarModel widget can draw truthfully (part-whole with the whole known, and
  // comparison with the smaller amount plus the difference known) keep the
  // `barModel` answerType; the rest would have to print the answer inside the
  // diagram, so they are asked as typed or multiple-choice items.
  it("barModels mode draws part-whole and comparison bars with correct answers", () => {
    const bars = getModeConfig("barModels");
    const seenTypes = new Set();
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 20; i++) {
        const q = bars.generate(level, { noFormats: true });
        if (q.answerType !== "barModel") continue;
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

  // M4: the mode gained trading, renaming, regroup prediction and disc
  // operations, which are typed or chosen rather than read off a mat. Whenever
  // a chart IS drawn, its columns must still sum to the answer.
  it("placeValueDiscs mode: a drawn chart's columns sum to the answer", () => {
    const pv = getModeConfig("placeValueDiscs");
    let charts = 0;
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 20; i++) {
        const q = pv.generate(level);
        expect(q.answer).not.toBeNull();
        if (q.answerType !== "placeValueDiscs") continue;
        // A drawn chart always shows a positive number; "how many tens discs
        // do you need for 305?" legitimately answers 0, which is why the
        // positivity check belongs here and not above.
        expect(q.answer).toBeGreaterThan(0);
        charts++;
        const sum = q.display.cols.reduce((s, c) => s + c.place * c.count, 0);
        expect(sum).toBe(q.answer);
      }
    }
    expect(charts).toBeGreaterThan(0);
  });

  it("practical Grade 3-4 modes (factors/area/money) produce correct numeric answers", () => {
    // M4: factorsMultiples grew from 2 shapes to 13, so it now emits
    // multiSelect (list the factors), choice (prime or composite?) and choice
    // items alongside the original typed answers.
    const fm = getModeConfig("factorsMultiples");
    for (let i = 0; i < 40; i++) {
      const q = fm.generate(8, { noFormats: true });
      expect(["numberPad", "multiSelect", "choice"]).toContain(q.answerType);
      if (q.answerType === "numberPad") {
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThan(0);
      }
    }
    // areaPerimeter is no longer "w x h or 2(w+h) on a random rectangle" (M4):
    // it also emits grids, missing sides, composite L-shapes and reasoning
    // items. Where the item still carries a rectangle, that rectangle must
    // still explain the answer. Full per-variety recomputation lives in
    // m4Measurement.spec.js.
    const ap = getModeConfig("areaPerimeter");
    for (let i = 0; i < 40; i++) {
      const q = ap.generate(8, { noFormats: true });
      const { width: w, height: h } = q.display;
      if (typeof w !== "number" || typeof h !== "number") continue;
      if (typeof q.answer !== "number") continue;
      expect([w * h, 2 * (w + h), w, h, Math.abs(w * h - 2 * (w + h))]).toContain(q.answer);
    }
    const money = getModeConfig("money");
    for (let i = 0; i < 40; i++) {
      const q = money.generate(8);
      // Coin counting renders a visible tray (M2); make-change and over-full
      // trays stay typed. M4 added coin-value comparison (symbolSelect) and
      // reasoning items such as "can she afford it?" (choice).
      expect(["numberPad", "coinTray", "choice", "symbolSelect"]).toContain(q.answerType);
      if (typeof q.answer === "number") expect(q.answer).toBeGreaterThanOrEqual(0);
      if (q.answerType === "coinTray") {
        const total = q.display.coins.reduce((sum, c) => sum + COIN_VALUES[c], 0);
        expect(total, "tray must total the answer").toBe(q.answer);
        expect(q.display.coins.length).toBeLessThanOrEqual(12);
      }
    }
  });

  it("patterns/measurement/time modes produce valid answers", () => {
    // M4: patterns gained repeating (AB/ABC) patterns, rule identification,
    // find-the-error and a real application row, so `choice` and `numberPad`
    // join the original fillBlank.
    const patterns = getModeConfig("patterns");
    for (let i = 0; i < 40; i++) {
      const q = patterns.generate(8, { noFormats: true });
      expect(["fillBlank", "numberPad", "choice"]).toContain(q.answerType);
      if (q.answerType === "fillBlank" || q.answerType === "numberPad") {
        expect(Number.isInteger(q.answer)).toBe(true);
      }
    }
    // M4: measurement is no longer conversion-only. It now also compares
    // measures (symbolSelect), picks units and benchmarks (choice) and selects
    // measures against a threshold (multiSelect).
    const measurement = getModeConfig("measurement");
    for (let i = 0; i < 60; i++) {
      const q = measurement.generate(8, { noFormats: true });
      expect(["numberPad", "choice", "symbolSelect", "multiSelect"]).toContain(q.answerType);
      if (q.answerType === "numberPad") expect(q.answer).toBeGreaterThan(0);
      if (q.answerType === "symbolSelect") expect(["<", ">", "="]).toContain(q.answer);
    }
    // M4: time gained the clock-reading ladder and time-valued answers ("what
    // time does it end?"), which are strings, so the answer is no longer always
    // a number. The clock widget still answers minutes past the hour.
    const time = getModeConfig("time");
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      const q = time.generate(8);
      seen.add(q.answerType);
      expect(["clock", "numberPad", "choice"]).toContain(q.answerType);
      if (q.answerType === "clock") {
        expect(q.answer).toBe(q.display.minute);
        expect(q.display.hour).toBeGreaterThanOrEqual(1);
      }
      if (typeof q.answer === "number") expect(q.answer).toBeGreaterThanOrEqual(0);
    }
    expect(seen.has("clock")).toBe(true);
  });

  it("dataGraphs/angles/linesShapes modes produce valid answers", () => {
    // M4: dataGraphs now also renders pictographs, tallies and line plots as
    // text (numberPad) and asks multi-statement questions (multiSelect), so a
    // bar graph is one representation among several.
    const dg = getModeConfig("dataGraphs");
    let sawBars = false;
    for (let i = 0; i < 60; i++) {
      const q = dg.generate(8);
      expect(["barGraph", "numberPad", "choice", "multiSelect"]).toContain(q.answerType);
      if (q.answerType === "barGraph") {
        sawBars = true;
        expect(Array.isArray(q.display.bars)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
      }
    }
    expect(sawBars).toBe(true);
    // M4: the `angle` widget now also carries missing-angle items, where the
    // figure shows the KNOWN angle and the answer is the other one.
    const ang = getModeConfig("angles");
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      const q = ang.generate(8);
      seen.add(q.answerType);
      expect(["angle", "numberPad", "choice", "shapeFigure"]).toContain(q.answerType);
      if (typeof q.answer === "number") expect(q.answer).toBeGreaterThanOrEqual(0);
    }
    expect(seen.has("angle")).toBe(true);
    // M4: linesShapes gained property, hierarchy and line-figure varieties, so
    // `choice` joins the typed and drawn ones, and a figure item may now show
    // FOUR shapes to pick between (shapeMode "select") rather than one to
    // count. Counting items still never name the shape in the prompt.
    const ls = getModeConfig("linesShapes");
    for (let i = 0; i < 60; i++) {
      const q = ls.generate(8);
      expect(["numberPad", "shapeFigure", "choice", "multiSelect"]).toContain(q.answerType);
      if (q.answerType === "shapeFigure") {
        if (q.display.shapeMode === "select") {
          expect(q.display.options.length).toBeGreaterThan(1);
          expect(q.display.options.map((o) => o.value)).toContain(q.answer);
        } else {
          expect(q.display.shape, "figure items must name a drawable shape").toBeTruthy();
          expect(q.display.promptText).toContain("this shape");
          expect(Number.isInteger(q.answer)).toBe(true);
        }
      }
      // Shapes with no line of symmetry (parallelogram, scalene triangle) are
      // valid Grade-4 items, so 0 is an allowed answer.
      if (typeof q.answer === "number") expect(q.answer).toBeGreaterThanOrEqual(0);
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
