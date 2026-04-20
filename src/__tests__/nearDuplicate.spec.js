import { describe, expect, it } from "vitest";
import {
  promptSignature,
  findPromptOveruse,
  validateBank,
  DEFAULT_SIGNATURE_LIMITS,
} from "../itemBank.js";
import { BUNDLED_ITEMS } from "../itemBank/bundle.js";

// These tests cover the structural near-duplicate detector used to flag
// template overuse as the bank scales toward 50+ items per cell. The
// detector replaces numbers in the prompt with `#` so two items that differ
// only in their numeric values collapse to the same signature.

describe("promptSignature", () => {
  it("returns empty string for missing or blank input", () => {
    expect(promptSignature(undefined)).toBe("");
    expect(promptSignature(null)).toBe("");
    expect(promptSignature("")).toBe("");
    expect(promptSignature("   ")).toBe("");
  });

  it("normalizes casing, punctuation, and whitespace", () => {
    expect(promptSignature("  Hello, World!  ")).toBe("hello world");
    expect(promptSignature("Hello\n\tworld")).toBe("hello world");
  });

  it("replaces every number with a single # placeholder", () => {
    expect(promptSignature("A jar has 8 marbles")).toBe("a jar has # marbles");
    expect(promptSignature("A jar has 12 marbles")).toBe("a jar has # marbles");
    // Operators and punctuation collapse to whitespace, leaving just the
    // number placeholders. "7 + 3 = ?" and "42 - 19 = ?" share signature.
    expect(promptSignature("7 + 3 = ?")).toBe("# #");
    expect(promptSignature("42 - 19 = ?")).toBe("# #");
  });

  it("treats unicode math operators as structural whitespace", () => {
    expect(promptSignature("12 − 7 = ?")).toBe("# #");
    expect(promptSignature("4 × 5 = ?")).toBe("# #");
    expect(promptSignature("12 ÷ 3 = ?")).toBe("# #");
  });
});

describe("findPromptOveruse", () => {
  function mkItem(overrides) {
    return {
      itemId: "test-001",
      modeId: "addition",
      itemFamily: "application",
      subskill: "makeTen",
      structureType: "joinResultUnknown",
      levelRange: [1, 3],
      reviewStatus: "approved",
      question: {
        a: 1,
        b: 1,
        op: "+",
        answer: 2,
        display: { promptText: "A jar has 1 marble and gets 1 more." },
      },
      ...overrides,
    };
  }

  it("flags application cells where the same template is used more than 3 times", () => {
    const items = [];
    for (let i = 0; i < 5; i++) {
      items.push(
        mkItem({
          itemId: `ov-${i}`,
          question: {
            a: i,
            b: i,
            op: "+",
            answer: i * 2,
            display: { promptText: `A jar has ${i} marbles and gets ${i} more.` },
          },
        })
      );
    }
    const overuse = findPromptOveruse(items);
    expect(overuse).toHaveLength(1);
    expect(overuse[0].family).toBe("application");
    expect(overuse[0].count).toBe(5);
    expect(overuse[0].itemIds).toEqual(["ov-0", "ov-1", "ov-2", "ov-3", "ov-4"]);
  });

  it("does not flag templates that repeat across different cells", () => {
    const items = [
      mkItem({ itemId: "a-1" }),
      mkItem({ itemId: "a-2", subskill: "composeDecompose" }),
      mkItem({ itemId: "a-3", subskill: "unknownAddend" }),
      mkItem({ itemId: "a-4", modeId: "subtraction" }),
    ];
    expect(findPromptOveruse(items)).toEqual([]);
  });

  it("lets procedural templates repeat by default (short symbolic prompts are inherently templated)", () => {
    const items = [];
    for (let i = 0; i < 30; i++) {
      items.push(
        mkItem({
          itemId: `p-${i}`,
          itemFamily: "procedural",
          question: { a: i, b: 1, op: "+", answer: i + 1, display: { promptText: `${i} + 1 = ?` } },
        })
      );
    }
    expect(findPromptOveruse(items)).toEqual([]);
  });

  it("ignores unapproved items by default", () => {
    const items = [];
    for (let i = 0; i < 10; i++) {
      items.push(
        mkItem({
          itemId: `d-${i}`,
          reviewStatus: "draft",
          question: {
            a: i,
            b: i,
            op: "+",
            answer: i * 2,
            display: { promptText: `A jar has ${i} marbles and gets ${i} more.` },
          },
        })
      );
    }
    expect(findPromptOveruse(items)).toEqual([]);
    // But we can opt in:
    const opted = findPromptOveruse(items, { includeUnapproved: true });
    expect(opted).toHaveLength(1);
    expect(opted[0].count).toBe(10);
  });

  it("accepts custom limits per family", () => {
    const items = [];
    for (let i = 0; i < 6; i++) {
      items.push(
        mkItem({
          itemId: `c-${i}`,
          itemFamily: "conceptual",
          question: {
            a: i,
            b: null,
            op: "+",
            answer: i,
            display: { promptText: `What number plus ${i} makes 10?` },
          },
        })
      );
    }
    // Default conceptual limit is 5, so 6 triggers.
    expect(findPromptOveruse(items)).toHaveLength(1);
    // Tighten to 3, still triggers:
    expect(findPromptOveruse(items, { limits: { conceptual: 3 } })).toHaveLength(1);
    // Loosen to 10, no longer triggers:
    expect(findPromptOveruse(items, { limits: { conceptual: 10 } })).toEqual([]);
  });
});

describe("validateBank + overuse integration", () => {
  it("emits warnings (not issues) by default and stays valid", () => {
    const result = validateBank(BUNDLED_ITEMS);
    expect(result.valid).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("routes overuse through issues when rejectPromptOveruse is set", () => {
    const items = [];
    for (let i = 0; i < 5; i++) {
      items.push({
        itemId: `seed-${i}`,
        modeId: "addition",
        itemFamily: "application",
        subskill: "makeTen",
        structureType: "joinResultUnknown",
        levelRange: [1, 3],
        reviewStatus: "approved",
        question: {
          a: i,
          b: i,
          op: "+",
          answer: i * 2,
          display: { promptText: `A can has ${i} cups and gets ${i} more.` },
        },
      });
    }
    const result = validateBank(items, { rejectPromptOveruse: true });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => /template overused/.test(i.errors.join(" ")))).toBe(true);
  });

  it("exposes per-family default limits", () => {
    expect(DEFAULT_SIGNATURE_LIMITS.application).toBe(3);
    expect(DEFAULT_SIGNATURE_LIMITS.conceptual).toBe(5);
    expect(DEFAULT_SIGNATURE_LIMITS.procedural).toBe(Infinity);
  });
});
