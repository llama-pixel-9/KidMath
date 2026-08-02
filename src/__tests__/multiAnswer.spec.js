import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { checkAnswer } from "../mathEngine";
import { WIDGETS, getWidget } from "../components/widgetRegistry.js";
import { COINS } from "../components/kit/coins.js";
import { SHAPES, SHAPE_META } from "../components/kit/shapeData.js";

const multi = (answer) => ({ answerType: "multiSelect", answer });

describe("set-validating answer checker (M2)", () => {
  it("accepts the required values in any order", () => {
    expect(checkAnswer(multi([3, 5]), [3, 5])).toBe(true);
    expect(checkAnswer(multi([3, 5]), [5, 3])).toBe(true);
  });

  it("rejects a partial selection", () => {
    expect(checkAnswer(multi([3, 5]), [3])).toBe(false);
  });

  it("rejects a superset — selecting everything must not score", () => {
    expect(checkAnswer(multi([3, 5]), [3, 5, 7])).toBe(false);
  });

  it("rejects the wrong values", () => {
    expect(checkAnswer(multi([3, 5]), [4, 6])).toBe(false);
  });

  it("ignores duplicate taps", () => {
    expect(checkAnswer(multi([3, 5]), [3, 5, 3])).toBe(true);
  });

  it("accepts any one of several valid decompositions", () => {
    // Both Addends Unknown: 5 = 1+4 or 2+3, either is correct.
    const q = multi([
      [1, 4],
      [2, 3],
    ]);
    expect(checkAnswer(q, [1, 4])).toBe(true);
    expect(checkAnswer(q, [2, 3])).toBe(true);
    expect(checkAnswer(q, [4, 1])).toBe(true);
    expect(checkAnswer(q, [1, 3])).toBe(false);
  });

  it("handles a single submitted value against a one-element set", () => {
    expect(checkAnswer(multi([7]), 7)).toBe(true);
    expect(checkAnswer(multi([7]), [7])).toBe(true);
    expect(checkAnswer(multi([7]), 8)).toBe(false);
  });

  it("rejects empty and null submissions", () => {
    expect(checkAnswer(multi([3]), [])).toBe(false);
    expect(checkAnswer(multi([3]), [null])).toBe(false);
    expect(checkAnswer(multi([3]), undefined)).toBe(false);
  });

  it("does not disturb single-answer scoring", () => {
    expect(checkAnswer({ answerType: "choice", answer: 12 }, 12)).toBe(true);
    expect(checkAnswer({ answerType: "numberPad", answer: 12 }, "12")).toBe(true);
    expect(checkAnswer({ answerType: "choice", answer: 12 }, [12])).toBe(false);
  });
});

describe("new widgets score through the engine", () => {
  it("judges numberLine, shapeFigure and coinTray numerically", () => {
    for (const type of ["numberLine", "shapeFigure", "coinTray"]) {
      expect(checkAnswer({ answerType: type, answer: 40 }, 40)).toBe(true);
      expect(checkAnswer({ answerType: type, answer: 40 }, "40")).toBe(true);
      expect(checkAnswer({ answerType: type, answer: 40 }, 41)).toBe(false);
    }
  });
});

describe("M2 widget registration", () => {
  it("registers all four approved widgets", () => {
    for (const t of ["multiSelect", "numberLine", "shapeFigure", "coinTray"]) {
      expect(getWidget(t), t).toBeTruthy();
    }
  });

  it("maps display payloads onto props", () => {
    const q = {
      display: {
        options: [1, 2],
        requiredCount: 2,
        min: 0,
        max: 20,
        step: 2,
        from: 4,
        to: 10,
        labelEvery: 2,
        lineMode: "jump",
        shape: "hexagon",
        rotate: 30,
        showSymmetry: true,
        shapeMode: "select",
        coins: ["dime", "penny"],
        coinMode: "build",
      },
    };
    expect(WIDGETS.multiSelect.props(q)).toEqual({ options: [1, 2], requiredCount: 2 });
    expect(WIDGETS.numberLine.props(q)).toMatchObject({ min: 0, max: 20, from: 4, to: 10, mode: "jump" });
    expect(WIDGETS.shapeFigure.props(q)).toMatchObject({ shape: "hexagon", mode: "select" });
    expect(WIDGETS.coinTray.props(q)).toEqual({ coins: ["dime", "penny"], mode: "build" });
  });

  it("supplies safe defaults for an empty question", () => {
    for (const t of ["multiSelect", "numberLine", "shapeFigure", "coinTray"]) {
      expect(() => WIDGETS[t].props({}, {}), t).not.toThrow();
    }
    expect(WIDGETS.numberLine.props({}).max).toBe(10);
    expect(WIDGETS.coinTray.props({}).coins).toEqual([]);
  });
});

describe("coin data", () => {
  it("uses real US coin values", () => {
    expect(COINS.penny.value).toBe(1);
    expect(COINS.nickel.value).toBe(5);
    expect(COINS.dime.value).toBe(10);
    expect(COINS.quarter.value).toBe(25);
  });

  it("draws a dime smaller than a nickel despite being worth more", () => {
    // This is the whole point of drawing coins to scale: the size/value
    // mismatch is exactly where children go wrong counting mixed change.
    expect(COINS.dime.value).toBeGreaterThan(COINS.nickel.value);
    expect(COINS.dime.r).toBeLessThan(COINS.nickel.r);
  });

  it("orders the remaining coins by real diameter", () => {
    expect(COINS.quarter.r).toBeGreaterThan(COINS.nickel.r);
    expect(COINS.penny.r).toBeGreaterThan(COINS.dime.r);
  });

  it("ships the artwork every coin points at", () => {
    // The tray shows photographs with no value on the face, so a missing file
    // is not a cosmetic bug — the child would have nothing to count.
    for (const [name, spec] of Object.entries(COINS)) {
      expect(spec.src, `${name} needs artwork`).toMatch(/^\/coins\/\w+\.png$/);
      const file = path.join(process.cwd(), "public", spec.src);
      expect(existsSync(file), `${spec.src} is missing from public/`).toBe(true);
    }
  });
});

describe("shape data", () => {
  it("gives every shape geometry and properties", () => {
    for (const key of Object.keys(SHAPES)) {
      expect(SHAPE_META[key], `${key} needs metadata`).toBeTruthy();
      expect(SHAPES[key].length, `${key} needs points`).toBeGreaterThanOrEqual(3);
    }
  });

  it("records side counts that match the drawn geometry", () => {
    for (const [key, meta] of Object.entries(SHAPE_META)) {
      if (key === "openFigure") continue; // not a polygon; sides recorded as 0
      expect(SHAPES[key].length, key).toBe(meta.sides);
    }
  });

  it("includes irregular variants, not just the prototypical picture", () => {
    // A child who only ever sees an equilateral triangle learns the picture,
    // not the property.
    const triangles = Object.entries(SHAPE_META).filter(([, m]) => m.sides === 3);
    expect(triangles.length).toBeGreaterThanOrEqual(3);
    expect(triangles.some(([, m]) => m.symmetry === 0)).toBe(true);
  });

  it("carries shapes with zero lines of symmetry", () => {
    expect(SHAPE_META.parallelogram.symmetry).toBe(0);
    expect(SHAPE_META.square.symmetry).toBe(4);
  });

  it("keeps all points inside the unit box", () => {
    for (const [key, pts] of Object.entries(SHAPES)) {
      for (const [x, y] of pts) {
        expect(x, key).toBeGreaterThanOrEqual(0);
        expect(x, key).toBeLessThanOrEqual(1);
        expect(y, key).toBeGreaterThanOrEqual(0);
        expect(y, key).toBeLessThanOrEqual(1);
      }
    }
  });
});
