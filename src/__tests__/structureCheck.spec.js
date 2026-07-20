import { describe, it, expect } from "vitest";
import { checkStructure, STRUCTURE_CHECKS } from "../../scripts/itemGen/structureCheck.js";

/**
 * The failure this exists to catch: asked for a hard structure, a model writes
 * an easy one with the same nouns. It reads fine and validates, so it lands in
 * the bank under the wrong label — the cell looks covered while the child never
 * meets the structure.
 *
 * The bank audit makes this urgent: eight of nine difficult structures have
 * never been authored, so the first batches are all structures the model has no
 * habit of writing.
 */

const item = (structureType, promptText, q = {}) => ({
  structureType,
  question: { display: { promptText }, ...q },
});

describe("structure check accepts genuine items", () => {
  it("accepts a real Start Unknown", () => {
    const out = checkStructure(
      item("addToStartUnknown", "Some bunnies sat on the grass. 3 more hopped there. Now there are 5. How many were there before?", { a: 3, b: 5, answer: 2 })
    );
    expect(out.problems).toEqual([]);
    expect(out.ok).toBe(true);
  });

  it("accepts both Compare language traps", () => {
    const fewer = checkStructure(
      item("compareBiggerFewer", "Lucy has 3 fewer apples than Julie. Lucy has 2 apples. How many does Julie have?", { a: 2, b: 3, answer: 5 })
    );
    expect(fewer.ok).toBe(true);

    const more = checkStructure(
      item("compareSmallerMore", "Julie has 3 more apples than Lucy. Julie has 5 apples. How many does Lucy have?", { a: 5, b: 3, answer: 2 })
    );
    expect(more.ok).toBe(true);
  });

  it("accepts genuine quotitive and partitive division", () => {
    expect(
      checkStructure(item("equalGroupsNumberUnknown", "18 plums are packed 6 to a bag. How many bags are needed?", { a: 18, b: 6, answer: 3 })).ok
    ).toBe(true);
    expect(
      checkStructure(item("equalGroupsSizeUnknown", "18 plums are shared into 3 bags. How many plums are in each bag?", { a: 18, b: 3, answer: 6 })).ok
    ).toBe(true);
  });

  it("accepts multiplicative compare phrased with 'times as much'", () => {
    expect(
      checkStructure(item("compareProductUnknown", "A blue hat costs 6 cents. A red hat costs 3 times as much. How many cents is the red hat?", { a: 3, b: 6, answer: 18 })).ok
    ).toBe(true);
  });
});

describe("structure check catches the easy-rewrite failure", () => {
  it("rejects Result Unknown filed as Start Unknown", () => {
    // The classic substitution: same nouns, easy structure, hard label.
    const out = checkStructure(
      item("addToStartUnknown", "2 bunnies sat on the grass. 3 more hopped there. How many bunnies are there now?", { a: 2, b: 3, answer: 5 })
    );
    expect(out.ok).toBe(false);
    expect(out.problems.join(" ")).toMatch(/unstated|exactly 2/);
  });

  it("rejects a Start Unknown that states the starting amount", () => {
    const out = checkStructure(
      item("takeFromStartUnknown", "There were 8 apples. Ana ate 2 apples. Then there were 6. How many were there before?", { a: 2, b: 6, answer: 8 })
    );
    expect(out.ok).toBe(false);
  });

  it("rejects a language trap whose trap has been removed", () => {
    // "more" instead of "fewer" turns the difficult variant into the easy one.
    const out = checkStructure(
      item("compareBiggerFewer", "Julie has 3 more apples than Lucy. Lucy has 2 apples. How many does Julie have?", { a: 2, b: 3, answer: 5 })
    );
    expect(out.ok).toBe(false);
    expect(out.problems.join(" ")).toMatch(/fewer/);
  });

  it("rejects Compare that hedges by using both words", () => {
    const out = checkStructure(
      item("compareSmallerMore", "Julie has 3 more apples than Lucy, who has fewer. Julie has 5. How many does Lucy have?", { a: 5, b: 3, answer: 2 })
    );
    expect(out.ok).toBe(false);
  });

  it("rejects partitive prose filed as quotitive", () => {
    const out = checkStructure(
      item("equalGroupsNumberUnknown", "18 plums are shared into 3 bags. How many plums are in each bag?", { a: 18, b: 3, answer: 6 })
    );
    expect(out.ok).toBe(false);
    expect(out.problems.join(" ")).toMatch(/GROUPS/);
  });

  it("rejects multiplicative compare written additively", () => {
    // "3 more" instead of "3 times as much" — the Grade 4 error, in the item.
    const out = checkStructure(
      item("compareProductUnknown", "A blue hat costs 6 cents. A red hat costs 3 more cents. How many cents is the red hat?", { a: 3, b: 6, answer: 9 })
    );
    expect(out.ok).toBe(false);
  });

  it("rejects an item whose numbers do not appear in its prose", () => {
    const out = checkStructure(
      item("addToResultUnknown", "Mina has some shells and finds more. How many now?", { a: 7, b: 5, answer: 12 })
    );
    expect(out.ok).toBe(false);
    expect(out.problems.join(" ")).toMatch(/do not appear/);
  });

  it("rejects a draft claiming no structure at all", () => {
    expect(checkStructure(item(undefined, "Some prompt")).ok).toBe(false);
    expect(checkStructure(item("unknown", "Some prompt")).ok).toBe(false);
  });
});

describe("coverage of the checks", () => {
  it("guards every structure the audit found empty", () => {
    // These are the eight never-authored difficult structures — the ones the
    // first authoring batches will consist of, and the ones most likely to be
    // silently downgraded.
    const neverAuthored = [
      "addToStartUnknown",
      "takeFromStartUnknown",
      "compareBiggerMore",
      "compareBiggerFewer",
      "compareSmallerMore",
      "compareSmallerFewer",
      "compareProductUnknown",
      "compareSetSizeUnknown",
      "compareMultiplierUnknown",
      "arrayRowCountUnknown",
    ];
    for (const s of neverAuthored) {
      expect(STRUCTURE_CHECKS[s], `${s} is unguarded`).toBeTruthy();
    }
  });

  it("does not reject items it has no opinion about", () => {
    const out = checkStructure(
      item("putTogetherTotalUnknown", "3 red apples and 2 green apples are on the table. How many apples in all?", { a: 3, b: 2, answer: 5 })
    );
    expect(out.ok).toBe(true);
  });
});
