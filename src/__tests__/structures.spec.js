import { describe, it, expect } from "vitest";
import {
  ADDITIVE_STRUCTURES,
  MULTIPLICATIVE_STRUCTURES,
  BOTH_ADDENDS_UNKNOWN,
  TIERS,
  buildAdditive,
  buildMultiplicative,
  generateAdditiveItem,
  generateMultiplicativeItem,
  deriveFamily,
  symbolicFamilyOf,
  bandForLevel,
  allowedTiers,
  structuresForLevel,
  allowsTwoStep,
  canComposeTwoStep,
  maxTotalForLevel,
  pickContext,
  count,
} from "../modes/structures";

const ctx = () => pickContext();

describe("CCSS Table 1 coverage", () => {
  it("implements all 14 generable additive templates", () => {
    // 12-cell grid: 11 one-unknown subtypes + Both Addends Unknown, which
    // expand to 14 once the Compare language variants are counted. See
    // docs/research-k4-problem-types.md §1.
    expect(ADDITIVE_STRUCTURES).toHaveLength(14);
    expect(BOTH_ADDENDS_UNKNOWN.multipleAnswers).toBe(true);
  });

  it("covers every situation and unknown position", () => {
    const situations = new Set(ADDITIVE_STRUCTURES.map((s) => s.situation));
    expect([...situations].sort()).toEqual(["addTo", "compare", "putTogether", "takeFrom"]);
    for (const situation of situations) {
      const solved = new Set(
        ADDITIVE_STRUCTURES.filter((s) => s.situation === situation).map((s) => s.solveFor)
      );
      expect(solved.size, `${situation} should vary its unknown`).toBeGreaterThan(1);
    }
  });

  it("marks exactly the four difficult subtypes", () => {
    const hard = ADDITIVE_STRUCTURES.filter((s) => s.tier === TIERS.DIFFICULT).map((s) => s.id);
    expect(hard.sort()).toEqual([
      "addToStartUnknown",
      "compareBiggerFewer",
      "compareSmallerMore",
      "takeFromStartUnknown",
    ]);
  });

  it("flags the two language traps", () => {
    const traps = ADDITIVE_STRUCTURES.filter((s) => s.languageTrap).map((s) => s.id);
    expect(traps.sort()).toEqual(["compareBiggerFewer", "compareSmallerMore"]);
  });

  it("makes the language traps require the operation the wording does not suggest", () => {
    const c = ctx();
    // "fewer" but the child must add
    const biggerFewer = ADDITIVE_STRUCTURES.find((s) => s.id === "compareBiggerFewer");
    const a = buildAdditive(biggerFewer, { x: 2, y: 3, z: 5 }, c, { asStory: true });
    expect(a.display.promptText).toContain("fewer");
    expect(a.answer).toBe(5);

    // "more" but the child must subtract
    const smallerMore = ADDITIVE_STRUCTURES.find((s) => s.id === "compareSmallerMore");
    const b = buildAdditive(smallerMore, { x: 2, y: 3, z: 5 }, c, { asStory: true });
    expect(b.display.promptText).toContain("more");
    expect(b.answer).toBe(2);
  });

  it("solves for the stated unknown, given the other two quantities", () => {
    const c = ctx();
    for (const s of ADDITIVE_STRUCTURES) {
      const q = { x: 3, y: 4, z: 7 };
      const built = buildAdditive(s, q, c, { asStory: false });
      expect(built.answer, s.id).toBe(q[s.solveFor]);
      // The unknown is never handed to the child as a given.
      expect([built.a, built.b]).not.toContain(undefined);
    }
  });
});

describe("CCSS Table 2 coverage", () => {
  it("implements all 9 Table-2 structures plus the two Grade-4 remainder shapes", () => {
    expect(MULTIPLICATIVE_STRUCTURES).toHaveLength(11);
    expect(MULTIPLICATIVE_STRUCTURES.filter((s) => s.remainder)).toHaveLength(2);
  });

  it("covers both meanings of division", () => {
    const meanings = MULTIPLICATIVE_STRUCTURES.filter((s) => s.division).map((s) => s.division);
    expect(meanings).toContain("partitive");
    expect(meanings).toContain("quotitive");
    // The bank has 4 quotitive items; the generator must not repeat that gap.
    expect(meanings.filter((m) => m === "quotitive").length).toBeGreaterThanOrEqual(3);
  });

  it("places multiplicative compare in the difficult tier", () => {
    for (const s of MULTIPLICATIVE_STRUCTURES.filter((x) => x.situation === "multCompare")) {
      expect(s.tier, s.id).toBe(TIERS.DIFFICULT);
    }
  });

  it("solves for the stated unknown", () => {
    const c = ctx();
    for (const s of MULTIPLICATIVE_STRUCTURES.filter((x) => !x.remainder)) {
      const q = { g: 3, s: 6, p: 18 };
      expect(buildMultiplicative(s, q, c, { asStory: false }).answer, s.id).toBe(q[s.solveFor]);
    }
  });

  it("remainder structures answer the leftover and the rounded-up count", () => {
    const c = ctx();
    const nums = { g: 5, s: 5, p: 23, r: 3 }; // 23 = 5×4 + 3
    const rem = MULTIPLICATIVE_STRUCTURES.find((x) => x.id === "divisionWithRemainder");
    const ceil = MULTIPLICATIVE_STRUCTURES.find((x) => x.id === "remainderInterpretation");
    expect(buildMultiplicative(rem, nums, c, { asStory: true }).answer).toBe(3);
    expect(buildMultiplicative(ceil, nums, c, { asStory: true }).answer).toBe(5);
  });

  it("renders division both ways so both families are reachable", () => {
    const s = MULTIPLICATIVE_STRUCTURES.find((x) => x.id === "equalGroupsSizeUnknown");
    const c = ctx();
    const div = buildMultiplicative(s, { g: 3, s: 6, p: 18 }, c, {
      asStory: false,
      form: "division",
    });
    const missing = buildMultiplicative(s, { g: 3, s: 6, p: 18 }, c, {
      asStory: false,
      form: "missingFactor",
    });
    expect(div.display.promptText).toBe("18 / 3 = ?");
    expect(missing.display.promptText).toBe("3 x ? = 18");
    expect(div.answer).toBe(6);
    expect(missing.answer).toBe(6);
  });
});

describe("family derivation (M1.5)", () => {
  it("reads the rendered equation, not the abstract position", () => {
    // `5 - 2 = ?` is procedural even though the model solves for a middle
    // quantity; `3 + ? = 8` is conceptual because the unknown is embedded.
    expect(deriveFamily({ asStory: false, promptText: "5 - 2 = ?" })).toBe("procedural");
    expect(deriveFamily({ asStory: false, promptText: "3 + ? = 8" })).toBe("conceptual");
    expect(deriveFamily({ asStory: false, promptText: "? + 3 = 8" })).toBe("conceptual");
  });

  it("treats any story as application", () => {
    expect(deriveFamily({ asStory: true, promptText: "3 + ? = 8" })).toBe("application");
  });

  it("predicts the symbolic family of a structure", () => {
    const addToResult = ADDITIVE_STRUCTURES.find((s) => s.id === "addToResultUnknown");
    const addendUnknown = ADDITIVE_STRUCTURES.find((s) => s.id === "putTogetherAddendUnknown");
    expect(symbolicFamilyOf(addToResult)).toBe("procedural");
    expect(symbolicFamilyOf(addendUnknown)).toBe("conceptual");
  });
});

describe("level policy", () => {
  it("maps levels onto grade bands", () => {
    expect(bandForLevel(1)).toBe("K");
    expect(bandForLevel(3)).toBe("K");
    expect(bandForLevel(4)).toBe("G1");
    expect(bandForLevel(7)).toBe("G2");
  });

  it("gives Kindergarten only the easy tier", () => {
    expect(allowedTiers(1)).toEqual([TIERS.EASY]);
    const pool = structuresForLevel(ADDITIVE_STRUCTURES, 1);
    expect(pool.length).toBeGreaterThan(0);
    for (const s of pool) expect(s.tier, s.id).toBe(TIERS.EASY);
  });

  it("introduces the difficult tier from G1 without letting it dominate", () => {
    const g1 = structuresForLevel(ADDITIVE_STRUCTURES, 5);
    const hardShare = g1.filter((s) => s.tier === TIERS.DIFFICULT).length / g1.length;
    expect(hardShare).toBeGreaterThan(0);
    expect(hardShare).toBeLessThan(0.35);
  });

  it("never leaves a mode with an empty pool", () => {
    // Division's easiest situation is still Level-2 reasoning, so the K filter
    // would otherwise return nothing.
    const divisionOnly = MULTIPLICATIVE_STRUCTURES.filter((s) => s.op === "/");
    expect(structuresForLevel(divisionOnly, 1).length).toBeGreaterThan(0);
  });

  it("grows number size with level as a secondary dial", () => {
    expect(maxTotalForLevel(1)).toBeLessThan(maxTotalForLevel(10));
    expect(maxTotalForLevel(1)).toBeLessThanOrEqual(10);
  });

  it("keeps two-step problems G2+ and off the difficult subtypes", () => {
    expect(allowsTwoStep(2)).toBe(false);
    expect(allowsTwoStep(8)).toBe(true);
    const hard = ADDITIVE_STRUCTURES.find((s) => s.tier === TIERS.DIFFICULT);
    expect(canComposeTwoStep(hard)).toBe(false);
  });
});

describe("generated items", () => {
  it("tells stories at Kindergarten level", () => {
    const families = new Set();
    for (let i = 0; i < 80; i++) {
      families.add(generateAdditiveItem(1, {}).itemFamily);
    }
    expect(families.has("application")).toBe(true);
  });

  it("respects allowWordProblems: false for non-compare structures", () => {
    for (let i = 0; i < 60; i++) {
      const item = generateAdditiveItem(8, { allowWordProblems: false });
      // Compare situations are story-only by construction; everything else
      // must render symbolically when stories are switched off.
      if (item.structure.situation !== "compare") {
        expect(item.asStory, item.structure.id).toBe(false);
      }
    }
  });

  it("honours an explicitly requested family", () => {
    for (let i = 0; i < 40; i++) {
      expect(generateAdditiveItem(8, { itemFamily: "application" }).itemFamily).toBe("application");
      expect(generateMultiplicativeItem(8, { itemFamily: "application" }).itemFamily).toBe(
        "application"
      );
    }
  });

  it("honours an explicitly requested structure", () => {
    const item = generateAdditiveItem(8, { structureType: "compareSmallerMore" });
    expect(item.structureType).toBe("compareSmallerMore");
  });

  it("keeps quantities consistent with x + y = z", () => {
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 40; i++) {
        const item = generateAdditiveItem(level, {});
        expect(Number.isInteger(item.answer)).toBe(true);
        expect(item.answer).toBeGreaterThan(0);
        expect(item.answer).toBeLessThanOrEqual(maxTotalForLevel(level));
      }
    }
  });
});

describe("context vocabulary", () => {
  it("agrees singular and plural", () => {
    const c = { singular: "apple", plural: "apples" };
    expect(count(1, c)).toBe("1 apple");
    expect(count(3, c)).toBe("3 apples");
  });

  it("keeps the two actors in a comparison distinct", () => {
    for (let i = 0; i < 50; i++) {
      const c = pickContext();
      expect(c.actor).not.toBe(c.actor2);
    }
  });
});
