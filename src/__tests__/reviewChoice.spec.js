import { describe, it, expect } from "vitest";
import { choiceList, payloadWithChoice, itemWithChoice, promptOptionsOf } from "../admin/reviewChoice.js";

/**
 * The reword pipeline stores ranked prose options on an item; the Review queue
 * lets the reviewer pick one and approval must write EXACTLY the pick into
 * promptText with the options stripped — an approved payload is what a child
 * sees, so options must never leak through approval.
 */

const item = (over = {}) => ({
  itemId: "x",
  payload: {
    a: 8,
    b: 35,
    op: "+",
    answer: 27,
    display: {
      promptText: "Some fish swam in Maria's tank. 8 more joined. Now there are 35. How many fish were there before?",
      promptOptions: [
        "Maria's fish tank had some fish. She added 8 more fish. Now there are 35 fish. How many fish were in the tank at the start?",
        "Maria had some fish. She got 8 more fish. Now she has 35 fish. How many fish did she have at first?",
      ],
      ...over,
    },
  },
});

describe("review prompt choices", () => {
  it("lists ranked options first and the original last", () => {
    const list = choiceList(item());
    expect(list).toHaveLength(3);
    expect(list[0]).toMatch(/^Maria's fish tank/);
    expect(list[2]).toMatch(/^Some fish swam/);
  });

  it("applies the chosen wording and strips the options", () => {
    const chosen = choiceList(item())[1];
    const payload = payloadWithChoice(item().payload, chosen);
    expect(payload.display.promptText).toBe(chosen);
    expect(payload.display.promptOptions).toBeUndefined();
    // The math is untouched.
    expect(payload).toMatchObject({ a: 8, b: 35, op: "+", answer: 27 });
  });

  it("keeping the original still strips the options", () => {
    const original = item().payload.display.promptText;
    const payload = payloadWithChoice(item().payload, original);
    expect(payload.display.promptText).toBe(original);
    expect(payload.display.promptOptions).toBeUndefined();
  });

  it("items without options have no choice list and pass through unchanged", () => {
    const plain = item({ promptOptions: undefined });
    expect(promptOptionsOf(plain)).toEqual([]);
    expect(choiceList(plain)).toEqual([]);
    expect(itemWithChoice(plain, null)).toBe(plain);
  });

  it("itemWithChoice swaps the wording for QC without mutating the item", () => {
    const base = item();
    const chosen = choiceList(base)[0];
    const effective = itemWithChoice(base, chosen);
    expect(effective.payload.display.promptText).toBe(chosen);
    expect(base.payload.display.promptText).toMatch(/^Some fish swam/);
  });
});
