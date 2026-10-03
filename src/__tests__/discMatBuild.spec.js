import { describe, it, expect } from "vitest";
import {
  DISC_CAP,
  add,
  addLabel,
  breakDown,
  breakDownLabel,
  breakDownText,
  canAdd,
  canBreakDown,
  canCheck,
  canRemove,
  canTradeUp,
  feedbackLine,
  matValue,
  overfullPlace,
  placeName,
  remove,
  removeLabel,
  sameMat,
  startMat,
  statusLine,
  tradeUp,
  tradeUpLabel,
  tradeUpText,
} from "../components/discMatBuild.js";

/**
 * The tappable disc mat's rules (placeValueDiscs build mode). The iPhone
 * mirrors every one of these in DiscMatBuild.swift; a change here is a
 * change there.
 */

const mat = (...counts) => {
  const places = [1000, 100, 10, 1].slice(4 - counts.length);
  return places.map((place, i) => ({ place, count: counts[i] }));
};
const counts = (m) => m.map((c) => c.count);

describe("startMat", () => {
  it("copies display.cols, biggest place first", () => {
    const cols = [{ place: 100, count: 1 }, { place: 10, count: 1 }, { place: 1, count: 4 }];
    const m = startMat(cols);
    expect(m).toEqual(cols);
    expect(m).not.toBe(cols);
    m[0].count = 9;
    expect(cols[0].count).toBe(1); // the kid edits a copy
  });

  it("orders places biggest first whatever order the payload lists them in", () => {
    // The v1 bank writes {count, place}; order and key order must not matter.
    expect(startMat([{ count: 4, place: 1 }, { count: 2, place: 10 }])).toEqual([
      { place: 10, count: 2 },
      { place: 1, count: 4 },
    ]);
  });

  it("fills a skipped place with 0, so a trade always goes to the place 10 times bigger", () => {
    expect(startMat([{ place: 100, count: 3 }, { place: 1, count: 2 }])).toEqual([
      { place: 100, count: 3 },
      { place: 10, count: 0 },
      { place: 1, count: 2 },
    ]);
  });

  it("keeps only real places, the first of a duplicate, and whole counts 0 to the cap", () => {
    expect(
      startMat([
        { place: "100", count: 2.7 },
        { place: 100, count: 5 },
        { place: 10, count: 40 },
        { place: 1, count: -3 },
        { place: 5, count: 1 },
        { place: "tens", count: 1 },
      ])
    ).toEqual([
      { place: 100, count: 2 },
      { place: 10, count: DISC_CAP },
      { place: 1, count: 0 },
    ]);
  });

  it("gives an empty hundreds/tens/ones mat when the payload has no usable place", () => {
    const empty = [{ place: 100, count: 0 }, { place: 10, count: 0 }, { place: 1, count: 0 }];
    expect(startMat(undefined)).toEqual(empty);
    expect(startMat([])).toEqual(empty);
    expect(startMat([{ place: 7, count: 2 }])).toEqual(empty);
  });

  it("handles a thousands mat", () => {
    expect(counts(startMat([{ place: 1000, count: 1 }, { place: 100, count: 0 }, { place: 10, count: 0 }, { place: 1, count: 0 }]))).toEqual([1, 0, 0, 0]);
  });
});

describe("add / remove", () => {
  it("adds one disc to one place and returns a new mat", () => {
    const m = mat(1, 1, 4);
    const next = add(m, 2);
    expect(counts(next)).toEqual([1, 1, 5]);
    expect(counts(m)).toEqual([1, 1, 4]);
  });

  it("caps a place at 19 discs: + is off at the cap and does nothing", () => {
    expect(DISC_CAP).toBe(19);
    const full = mat(0, 19);
    expect(canAdd(full, 1)).toBe(false);
    expect(add(full, 1)).toBe(full);
    expect(canAdd(mat(0, 18), 1)).toBe(true);
  });

  it("takes one disc away; − is off at 0 and does nothing", () => {
    expect(counts(remove(mat(1, 1, 4), 0))).toEqual([0, 1, 4]);
    const zero = mat(0, 3);
    expect(canRemove(zero, 0)).toBe(false);
    expect(remove(zero, 0)).toBe(zero);
  });

  it("ignores a place that is not on the mat", () => {
    const m = mat(1, 2);
    expect(add(m, 5)).toBe(m);
    expect(remove(m, -1)).toBe(m);
    expect(canAdd(m, 2)).toBe(false);
  });
});

describe("trade up", () => {
  it("trades 10 of a place for 1 of the place to its left", () => {
    expect(counts(tradeUp(mat(1, 1, 12), 2))).toEqual([1, 2, 2]);
    expect(counts(tradeUp(mat(0, 10, 3), 1))).toEqual([1, 0, 3]);
    expect(matValue(tradeUp(mat(1, 1, 12), 2))).toBe(matValue(mat(1, 1, 12)));
  });

  it("needs 10 or more discs", () => {
    expect(canTradeUp(mat(1, 1, 9), 2)).toBe(false);
    expect(canTradeUp(mat(1, 1, 10), 2)).toBe(true);
  });

  it("has no trade up from the biggest place", () => {
    const m = mat(12, 0, 0);
    expect(canTradeUp(m, 0)).toBe(false);
    expect(tradeUp(m, 0)).toBe(m);
  });

  it("is off when the bigger place is at the cap", () => {
    const m = mat(19, 10);
    expect(canTradeUp(m, 1)).toBe(false);
    expect(tradeUp(m, 1)).toBe(m);
    expect(canTradeUp(mat(18, 10), 1)).toBe(true);
  });
});

describe("break down", () => {
  it("trades 1 of a place for 10 of the place to its right", () => {
    expect(counts(breakDown(mat(1, 1, 4), 1))).toEqual([1, 0, 14]);
    expect(counts(breakDown(mat(1, 1, 4), 0))).toEqual([0, 11, 4]);
    expect(matValue(breakDown(mat(1, 1, 4), 0))).toBe(114);
  });

  it("needs at least 1 disc", () => {
    const m = mat(0, 3, 4);
    expect(canBreakDown(m, 0)).toBe(false);
    expect(breakDown(m, 0)).toBe(m);
  });

  it("has no break down from the ones (no smaller place)", () => {
    const m = mat(1, 1, 4);
    expect(canBreakDown(m, 2)).toBe(false);
    expect(breakDown(m, 2)).toBe(m);
  });

  it("is off when it would push the smaller place past the cap", () => {
    expect(canBreakDown(mat(1, 9), 0)).toBe(true); // 9 + 10 = 19
    const m = mat(1, 10);
    expect(canBreakDown(m, 0)).toBe(false); // 10 + 10 = 20
    expect(breakDown(m, 0)).toBe(m);
  });
});

describe("value and check", () => {
  it("the mat's value is the sum of place × count", () => {
    expect(matValue(mat(1, 1, 4))).toBe(114);
    expect(matValue(mat(9, 2, 1))).toBe(921);
    expect(matValue(mat(0, 12, 15))).toBe(135);
    expect(matValue(mat(1, 0, 4, 0))).toBe(1040);
    expect(matValue([])).toBe(0);
  });

  it("Check is on only when every place holds 9 or fewer", () => {
    expect(canCheck(mat(9, 9, 9))).toBe(true);
    expect(canCheck(mat(0, 0, 0))).toBe(true);
    expect(canCheck(mat(1, 1, 10))).toBe(false);
    expect(canCheck(mat(10, 0, 0))).toBe(false);
    expect(canCheck([])).toBe(false);
  });

  it("knows when the mat is back at the start", () => {
    const start = mat(1, 1, 4);
    expect(sameMat(start, mat(1, 1, 4))).toBe(true);
    expect(sameMat(start, add(start, 2))).toBe(false);
    expect(sameMat(start, remove(add(start, 2), 2))).toBe(true);
  });

  it("a whole Grade 2 step: 114 + 807 built on the mat", () => {
    let m = startMat([{ place: 100, count: 1 }, { place: 10, count: 1 }, { place: 1, count: 4 }]);
    for (let k = 0; k < 8; k++) m = add(m, 0);
    for (let k = 0; k < 7; k++) m = add(m, 2);
    expect(counts(m)).toEqual([9, 1, 11]);
    expect(canCheck(m)).toBe(false);
    m = tradeUp(m, 2);
    expect(counts(m)).toEqual([9, 2, 1]);
    expect(canCheck(m)).toBe(true);
    expect(matValue(m)).toBe(921);
  });
});

describe("status line", () => {
  it("is empty when the mat can be checked", () => {
    expect(overfullPlace(mat(1, 1, 4))).toBeNull();
    expect(statusLine(mat(1, 1, 4))).toBe("");
  });

  it("names the overfull place and the trade that fixes it", () => {
    expect(statusLine(mat(1, 1, 12))).toBe("The ones have 12 discs. Trade 10 ones for 1 ten.");
    expect(statusLine(mat(1, 15, 2))).toBe("The tens have 15 discs. Trade 10 tens for 1 hundred.");
    expect(statusLine(mat(0, 10, 0, 0))).toBe("The hundreds have 10 discs. Trade 10 hundreds for 1 thousand.");
  });

  it("starts with the smallest place that can trade", () => {
    const m = mat(1, 11, 12);
    expect(overfullPlace(m)).toBe(2);
    expect(statusLine(m)).toBe("The ones have 12 discs. Trade 10 ones for 1 ten.");
  });

  it("skips a place whose bigger neighbour is full, for one that can trade", () => {
    const m = mat(3, 19, 12);
    expect(overfullPlace(m)).toBe(1);
    expect(statusLine(m)).toBe("The tens have 19 discs. Trade 10 tens for 1 hundred.");
  });

  it("never dead-ends: the biggest place at 10 says to take discs away", () => {
    expect(statusLine(mat(10, 2, 3))).toBe("The hundreds have 10 discs. Take some discs away.");
    // nothing can trade: the biggest overfull place is the one to fix
    const stuck = mat(19, 12);
    expect(overfullPlace(stuck)).toBe(0);
    expect(statusLine(stuck)).toBe("The tens have 19 discs. Take some discs away.");
  });
});

describe("words on the mat", () => {
  it("names places, singular for one", () => {
    expect([1000, 100, 10, 1].map((p) => placeName(p))).toEqual(["thousands", "hundreds", "tens", "ones"]);
    expect([1000, 100, 10, 1].map((p) => placeName(p, 1))).toEqual(["thousand", "hundred", "ten", "one"]);
  });

  it("labels every control in plain words", () => {
    expect(addLabel(1)).toBe("Add a one disc");
    expect(addLabel(100)).toBe("Add a hundred disc");
    expect(removeLabel(10)).toBe("Take away a ten disc");
    expect(tradeUpLabel(1)).toBe("Trade 10 ones for 1 ten");
    expect(tradeUpLabel(100)).toBe("Trade 10 hundreds for 1 thousand");
    expect(breakDownLabel(100)).toBe("Trade 1 hundred for 10 tens");
    expect(breakDownLabel(10)).toBe("Trade 1 ten for 10 ones");
  });

  it("shows the trades with an arrow", () => {
    expect(tradeUpText(1)).toBe("10 ones → 1 ten");
    expect(tradeUpText(10)).toBe("10 tens → 1 hundred");
    expect(breakDownText(10)).toBe("1 ten → 10 ones");
    expect(breakDownText(1000)).toBe("1 thousand → 10 hundreds");
  });

  it("says what the mat shows after a submit", () => {
    expect(feedbackLine(921, true)).toBe("The mat shows 921.");
    expect(feedbackLine(911, false)).toBe("Your mat shows 911.");
  });
});
