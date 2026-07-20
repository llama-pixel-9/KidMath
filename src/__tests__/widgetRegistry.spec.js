import { describe, it, expect } from "vitest";
import { WIDGETS, ANSWER_TYPES, getWidget } from "../components/widgetRegistry.js";

// The registry replaced a ~100-line ternary chain in MathExplorer. These guard
// the contract that chain used to encode implicitly (implementation plan M0.2).

describe("widget registry", () => {
  it("registers every answerType the modes emit", () => {
    // Types the generators/bank can set. `choice` is the unregistered default.
    const emitted = [
      "numberPad",
      "fillBlank",
      "decimal",
      "fraction",
      "barGraph",
      "angle",
      "clock",
      "fractionSet",
      "placeValueDiscs",
      "barModel",
      "numberBond",
      "symbolSelect",
    ];
    for (const t of emitted) {
      expect(getWidget(t), `${t} should be registered`).toBeTruthy();
    }
  });

  it("falls back to the choice grid for unregistered types", () => {
    expect(getWidget("choice")).toBeNull();
    expect(getWidget(undefined)).toBeNull();
    expect(getWidget("notAWidget")).toBeNull();
  });

  it("gives every entry a component", () => {
    for (const [type, entry] of Object.entries(WIDGETS)) {
      expect(typeof entry.Component, `${type} Component`).toBe("function");
      if (entry.props) expect(typeof entry.props, `${type} props`).toBe("function");
    }
  });

  it("maps question payloads onto widget props", () => {
    const q = {
      display: {
        bars: [1, 2],
        degrees: 45,
        hour: 3,
        minute: 15,
        set: { num: 1, den: 2 },
        cols: [10, 1],
        whole: 8,
        part: 3,
      },
    };
    const ctx = { revealAnswer: 7, shakenChoice: 4 };

    expect(WIDGETS.barGraph.props(q, ctx)).toEqual({ bars: [1, 2] });
    expect(WIDGETS.angle.props(q, ctx)).toEqual({ degrees: 45 });
    expect(WIDGETS.clock.props(q, ctx)).toEqual({ hour: 3, minute: 15 });
    expect(WIDGETS.fractionSet.props(q, ctx)).toEqual({ set: { num: 1, den: 2 } });
    expect(WIDGETS.placeValueDiscs.props(q, ctx)).toEqual({ cols: [10, 1] });
    expect(WIDGETS.numberBond.props(q, ctx)).toEqual({ whole: 8, part: 3 });
    expect(WIDGETS.barModel.props(q, ctx)).toEqual({ spec: q.display });
    expect(WIDGETS.decimal.props(q, ctx)).toEqual({ allowDecimal: true });
    expect(WIDGETS.symbolSelect.props(q, ctx)).toEqual({ revealAnswer: 7, shakenChoice: 4 });
  });

  it("shares one component across numberPad, fillBlank and decimal", () => {
    expect(WIDGETS.fillBlank.Component).toBe(WIDGETS.numberPad.Component);
    expect(WIDGETS.decimal.Component).toBe(WIDGETS.numberPad.Component);
  });

  it("tolerates a question with no display payload", () => {
    for (const [type, entry] of Object.entries(WIDGETS)) {
      if (!entry.props) continue;
      expect(() => entry.props({}, {}), `${type} on empty question`).not.toThrow();
    }
  });

  it("exports the answer type list", () => {
    expect(ANSWER_TYPES).toEqual(Object.keys(WIDGETS));
    expect(ANSWER_TYPES).toContain("numberBond");
  });
});
