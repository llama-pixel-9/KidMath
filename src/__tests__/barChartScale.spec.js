import { describe, it, expect } from "vitest";
import { chartScale } from "../components/chartScale.js";
import dataGraphs from "../modes/dataGraphs.js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Pictograph from "../components/Pictograph.jsx";
import { ITEMS as DATA_GRAPH_ITEMS } from "../itemBank/items/dataGraphs.js";

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

// Same property for the pictograph: every symbol of every bank row has to be
// on the chart. A fixed 24-unit gap cut rows of 11 to 18 symbols off after 10
// and a half, so 10 items keyed 110-180 could not be counted (2026-10-03).
describe("Pictograph", () => {
  const symbolsOutside = (rows) => {
    const html = renderToStaticMarkup(createElement(Pictograph, { rows, keyValue: 10 }));
    const width = Number(html.match(/viewBox="0 0 (\d+(?:\.\d+)?)/)[1]);
    return [...html.matchAll(/<circle cx="([\d.]+)"[^>]* r="([\d.]+)"/g)].filter((m) => Number(m[1]) + Number(m[2]) > width).length;
  };

  it("keeps a long row inside the chart and leaves a short one as it was", () => {
    expect(symbolsOutside([{ label: "Stars", symbols: 18 }])).toBe(0);
    expect(symbolsOutside([{ label: "Stars", symbols: 17, half: true }])).toBe(0);
    const short = renderToStaticMarkup(createElement(Pictograph, { rows: [{ label: "Cats", symbols: 4 }], keyValue: 2 }));
    expect(short).toContain('r="9"');
  });

  it("draws every symbol of every bank pictograph", () => {
    const charts = DATA_GRAPH_ITEMS.filter((x) => x.question.display?.figure === "pictograph");
    expect(charts.length).toBeGreaterThan(0);
    const cut = charts.filter((x) => symbolsOutside(x.question.display.rows) > 0).map((x) => x.itemId);
    expect(cut).toEqual([]);
  });
});
