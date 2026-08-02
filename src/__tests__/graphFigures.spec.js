import { describe, it, expect } from "vitest";
import dataGraphs, { DATA_GRAPH_VARIETIES } from "../modes/dataGraphs.js";
import { FIGURES, getFigure } from "../components/figureRegistry.js";

// The mode's whole claim is that the child reads a chart. Two ways that claim
// quietly breaks: a variety ships no figure at all, or it ships one but ALSO
// spells the data out in the prompt, which lets the child skip the chart. Both
// are regressions this file exists to catch — the mode shipped in exactly that
// state before (`Cats 5, Dogs 4, Birds 8, Fish 3. Which one was chosen the
// most?`), and it looked fine to every test that only checked the answer.

function generate(level, n = 40) {
  return Array.from({ length: n }, () => dataGraphs.generate(level));
}

const ALL = Array.from({ length: 10 }, (_, i) => generate(i + 1)).flat();

describe("every graph item ships a figure", () => {
  it("names a figure the registry can draw", () => {
    for (const q of ALL) {
      const key = q.display?.figure;
      expect(key, `${q.metadata.structureType} has no display.figure`).toBeTruthy();
      expect(FIGURES, `unknown figure "${key}"`).toHaveProperty(key);
    }
  });

  it("covers every variety, so no variety is silently exempt", () => {
    const seen = new Set(ALL.map((q) => q.metadata.structureType));
    for (const variety of DATA_GRAPH_VARIETIES) {
      expect(seen.has(variety), `${variety} never generated`).toBe(true);
    }
  });

  it("ships a payload the figure component can actually render", () => {
    const shapes = {
      barGraph: (d) => d.bars?.length > 0 && d.bars.every((b) => b.label && Number.isFinite(b.value)),
      pictograph: (d) =>
        Number.isFinite(d.keyValue) &&
        d.rows?.length > 0 &&
        d.rows.every((r) => r.label && Number.isInteger(r.symbols) && r.symbols >= 0),
      tallyChart: (d) =>
        d.rows?.length > 0 && d.rows.every((r) => r.label && Number.isInteger(r.count) && r.count > 0),
      linePlot: (d) =>
        d.points?.length > 0 &&
        d.points.every((p) => Number.isFinite(p.value) && Number.isInteger(p.count) && p.count >= 0),
    };
    for (const q of ALL) {
      const ok = shapes[q.display.figure](q.display);
      expect(ok, `${q.metadata.structureType}: bad ${q.display.figure} payload`).toBe(true);
    }
  });
});

describe("the prompt asks the question and nothing else", () => {
  // Markers of the data having been transcribed into the prompt.
  const LEAKS = [
    [/●|◐/, "pictograph symbols in the prompt"],
    [/IIII/, "tally marks in the prompt"],
    [/stands for/, "the key spelled out in the prompt"],
    [/X{2,}/, "line-plot marks in the prompt"],
    [/\b\w+ \d+, \w+ \d+/, "a label/value list in the prompt"],
  ];

  it("never transcribes the figure's data", () => {
    for (const q of ALL) {
      const text = q.display.promptText;
      for (const [pattern, why] of LEAKS) {
        expect(pattern.test(text), `${q.metadata.structureType}: ${why} — "${text}"`).toBe(false);
      }
    }
  });
});

describe("getFigure", () => {
  it("stays quiet when the answer widget draws the figure itself", () => {
    // barGraph answerType == the DataGraph widget, which renders its own chart;
    // drawing it in the question card too would show the child two charts.
    const q = ALL.find((x) => x.answerType === "barGraph");
    expect(q, "no barGraph-answered item generated").toBeTruthy();
    expect(getFigure(q)).toBeNull();
  });

  it("returns a component for figures the answer widget does not draw", () => {
    const q = ALL.find((x) => x.answerType !== "barGraph");
    expect(getFigure(q)?.Component).toBeTruthy();
  });

  it("returns null for a question with no figure at all", () => {
    expect(getFigure({ display: {} })).toBeNull();
    expect(getFigure({})).toBeNull();
    expect(getFigure(null)).toBeNull();
  });
});
