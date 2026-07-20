import { describe, it, expect } from "vitest";

import {
  computeCellStats,
  promptTextOf,
  sampleCell,
  buildReport,
  parseArgs,
  formatReport,
  MAX_SIGNATURE_SHARE_TARGET,
  DEFAULT_SAMPLES,
} from "../../scripts/varietyReport.js";
import { modeRegistry } from "../modes/index.js";

/** Minimal generated-question fixture. */
function q(promptText, meta = {}, answer = 1) {
  return { answer, display: { promptText }, metadata: meta };
}

describe("computeCellStats — signature share", () => {
  it("computes the max share from a hand-built fixture", () => {
    // 8 of 10 share the "# + # = ?" signature (digits normalize to #).
    const questions = [
      q("3 + 4 = ?"),
      q("5 + 1 = ?"),
      q("2 + 9 = ?"),
      q("7 + 7 = ?"),
      q("8 + 2 = ?"),
      q("6 + 6 = ?"),
      q("1 + 1 = ?"),
      q("9 + 3 = ?"),
      q("4 birds joined 2 birds. How many birds in all?"),
      q("What is 5 more than 8?"),
    ];
    const stats = computeCellStats(questions);
    expect(stats.samples).toBe(10);
    expect(stats.distinctSignatures).toBe(3);
    // promptSignature() digits->#, then drops non-word chars (+, =, ?).
    expect(stats.topSignature).toBe("# #");
    expect(stats.topSignatureCount).toBe(8);
    expect(stats.maxSignatureShare).toBeCloseTo(0.8, 10);
  });

  it("reports a share of 1 when every prompt is the same shape", () => {
    const stats = computeCellStats([q("1 + 1 = ?"), q("2 + 3 = ?"), q("40 + 50 = ?")]);
    expect(stats.distinctSignatures).toBe(1);
    expect(stats.maxSignatureShare).toBe(1);
  });

  it("reports a share of 1/n when every prompt differs structurally", () => {
    const stats = computeCellStats([
      q("2 + 3 = ?"),
      q("What is 4 less than 9?"),
      q("Circle the larger number."),
      q("How many tens are in 40?"),
    ]);
    expect(stats.distinctSignatures).toBe(4);
    expect(stats.maxSignatureShare).toBeCloseTo(0.25, 10);
  });

  it("bases the share on signaturable samples only", () => {
    // Two unsignaturable items must not dilute the share of the rest.
    const stats = computeCellStats([q("1 + 1 = ?"), q("2 + 2 = ?"), q(""), q("")]);
    expect(stats.signedSamples).toBe(2);
    expect(stats.maxSignatureShare).toBe(1);
  });

  it("returns zeroed stats for an empty cell", () => {
    const stats = computeCellStats([]);
    expect(stats.samples).toBe(0);
    expect(stats.distinctSignatures).toBe(0);
    expect(stats.maxSignatureShare).toBe(0);
    expect(stats.topSignature).toBeNull();
  });

  it("collects distinct structureType, subskill, itemFamily and answers", () => {
    const stats = computeCellStats([
      q("a", { structureType: "joinResultUnknown", subskill: "makeTen", itemFamily: "procedural" }, 4),
      q("b", { structureType: "joinResultUnknown", subskill: "makeTen", itemFamily: "conceptual" }, 4),
      q("c", { structureType: "compareDiffUnknown", subskill: "unknownAddend", itemFamily: "conceptual" }, 9),
    ]);
    expect(stats.structureTypes).toEqual(["compareDiffUnknown", "joinResultUnknown"]);
    expect(stats.subskills).toEqual(["makeTen", "unknownAddend"]);
    expect(stats.itemFamilies).toEqual(["conceptual", "procedural"]);
    expect(stats.distinctAnswers).toBe(2);
  });

  it("distinguishes object answers such as fractions", () => {
    const stats = computeCellStats([
      q("a", {}, { num: 1, den: 2 }),
      q("b", {}, { num: 1, den: 3 }),
      q("c", {}, { num: 1, den: 2 }),
    ]);
    expect(stats.distinctAnswers).toBe(2);
  });

  it("carries error counts through", () => {
    const stats = computeCellStats([q("1 + 1 = ?")], { errors: 3, errorSamples: ["boom"] });
    expect(stats.errors).toBe(3);
    expect(stats.errorSamples).toEqual(["boom"]);
  });
});

describe("promptTextOf", () => {
  it("prefers an explicit promptText", () => {
    expect(promptTextOf({ display: { promptText: "How many?" } })).toBe("How many?");
  });

  it("synthesizes a prompt for payload-only displays", () => {
    expect(promptTextOf({ display: { sequence: [2, 4, 6], step: 2 } })).toContain("2 4 6");
    expect(promptTextOf({ display: { emoji: "🍎", count: 5 } })).toContain("count 5");
  });

  it("falls back to the symbolic equation shape", () => {
    expect(promptTextOf({ a: 3, b: 4, op: "+" })).toBe("3 + 4 = ?");
  });

  it("returns an empty string when there is nothing to signature", () => {
    expect(promptTextOf({})).toBe("");
    expect(promptTextOf(null)).toBe("");
  });
});

describe("sampleCell — error tolerance", () => {
  it("counts throwing generators instead of crashing", () => {
    const mode = {
      generate() {
        throw new Error("needs context");
      },
    };
    const stats = sampleCell(mode, 1, 20);
    expect(stats.errors).toBe(20);
    expect(stats.samples).toBe(0);
    expect(stats.errorSamples).toContain("needs context");
  });

  it("counts null returns and keeps the good samples", () => {
    let i = 0;
    const mode = {
      generate() {
        i += 1;
        return i % 2 === 0 ? null : { answer: i, display: { promptText: `${i} + 1 = ?` } };
      },
    };
    const stats = sampleCell(mode, 1, 10);
    expect(stats.errors).toBe(5);
    expect(stats.samples).toBe(5);
    expect(stats.maxSignatureShare).toBe(1);
  });
});

describe("buildReport over real modes", () => {
  it("runs over a real mode without throwing", () => {
    const report = buildReport({ modeIds: ["addition"], samples: 25 });
    expect(report.modes).toHaveLength(1);
    expect(report.cells).toHaveLength(10);
    expect(report.summary.cells).toBe(10);
    expect(report.summary.totalErrors).toBe(0);
    for (const cell of report.cells) {
      expect(cell.samples).toBe(25);
      expect(cell.distinctSignatures).toBeGreaterThan(0);
      expect(cell.maxSignatureShare).toBeGreaterThan(0);
      expect(cell.maxSignatureShare).toBeLessThanOrEqual(1);
    }
  });

  it("runs over every registered mode without throwing", () => {
    const report = buildReport({ samples: 5 });
    expect(report.modes.length).toBe(Object.keys(modeRegistry).length);
    expect(report.cells.length).toBe(Object.keys(modeRegistry).length * 10);
    expect(report.summary.meanMaxShare).toBeGreaterThan(0);
  });

  it("sorts modes worst-first by max signature share", () => {
    const report = buildReport({ modeIds: ["addition", "fractions"], samples: 25 });
    const shares = report.modes.map((m) => m.worstShare);
    expect(shares).toEqual([...shares].sort((a, b) => b - a));
  });

  it("counts failing cells against the 25% target", () => {
    const report = buildReport({ modeIds: ["addition"], samples: 25 });
    const expected = report.cells.filter(
      (c) => c.maxSignatureShare > MAX_SIGNATURE_SHARE_TARGET,
    ).length;
    expect(report.summary.failingCells).toBe(expected);
    expect(report.summary.passingCells).toBe(report.cells.length - expected);
  });

  it("renders a text report containing the mode and summary", () => {
    const text = formatReport(buildReport({ modeIds: ["addition"], samples: 25 }));
    expect(text).toContain("VARIETY REPORT");
    expect(text).toContain("addition");
    expect(text).toContain("SUMMARY");
  });
});

describe("parseArgs", () => {
  it("defaults to every mode at the default sample count", () => {
    const opts = parseArgs([]);
    expect(opts.samples).toBe(DEFAULT_SAMPLES);
    expect(opts.json).toBe(false);
    expect(opts.modeIds.length).toBe(Object.keys(modeRegistry).length);
  });

  it("parses --samples, --mode and --json in both forms", () => {
    expect(parseArgs(["--samples", "50"]).samples).toBe(50);
    expect(parseArgs(["--samples=50"]).samples).toBe(50);
    expect(parseArgs(["--mode", "money"]).modeIds).toEqual(["money"]);
    expect(parseArgs(["--mode=money"]).modeIds).toEqual(["money"]);
    expect(parseArgs(["--json"]).json).toBe(true);
  });

  it("ignores a nonsense sample count", () => {
    expect(parseArgs(["--samples", "-4"]).samples).toBe(DEFAULT_SAMPLES);
    expect(parseArgs(["--samples", "abc"]).samples).toBe(DEFAULT_SAMPLES);
  });
});
