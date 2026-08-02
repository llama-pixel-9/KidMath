import { describe, it, expect } from "vitest";
import { chartScale } from "../components/chartScale.js";
import dataGraphs from "../modes/dataGraphs.js";

// The chart no longer prints values on the bars, so the axis is the only way to
// read one. That makes "is every value this mode generates actually readable
// against the scale it gets drawn on" a correctness property, not a style note.

// A value is readable when it sits on a drawn line: a labelled major tick, or a
// minor gridline (which BarChart draws only while the plot stays legible).
function isReadable(value, { axisMax, step, minorStep }) {
  const minorsDrawn = step > minorStep && axisMax / minorStep <= 24;
  return minorsDrawn ? value % minorStep === 0 : value % step === 0;
}

describe("chartScale", () => {
  it("labels every unit for small counts", () => {
    expect(chartScale([3, 7, 9])).toMatchObject({ axisMax: 9, step: 1 });
  });

  it("steps by 2 past ten and rounds the axis up to a whole step", () => {
    expect(chartScale([5, 13])).toMatchObject({ axisMax: 14, step: 2 });
    expect(chartScale([11])).toMatchObject({ axisMax: 12, step: 2 });
  });

  it("steps by 5 past twenty", () => {
    expect(chartScale([22, 38])).toMatchObject({ axisMax: 40, step: 5 });
  });

  it("never returns a zero-height axis, even for an all-zero chart", () => {
    const scale = chartScale([0, 0]);
    expect(scale.axisMax).toBeGreaterThan(0);
  });

  it("keeps the tallest bar on or under the axis maximum", () => {
    for (const values of [[1], [9], [10], [14], [20], [37]]) {
      const { axisMax } = chartScale(values);
      expect(axisMax).toBeGreaterThanOrEqual(Math.max(...values));
    }
  });
});

describe("every generated bar is readable off the axis", () => {
  it("holds across levels and seeds", () => {
    let charts = 0;
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 200; i++) {
        const q = dataGraphs.generate(level);
        const bars = q.display?.bars;
        if (!bars) continue;
        charts += 1;
        const scale = chartScale(bars.map((b) => b.value));
        for (const bar of bars) {
          expect(
            isReadable(bar.value, scale),
            `L${level} ${bar.label}=${bar.value} is not on a gridline of ${JSON.stringify(scale)}`
          ).toBe(true);
        }
      }
    }
    // Guard against the assertions above passing vacuously.
    expect(charts).toBeGreaterThan(100);
  });
});
