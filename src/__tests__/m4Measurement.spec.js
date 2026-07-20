import { describe, it, expect } from "vitest";
import { getModeConfig } from "../modes";
import { generateQuestion, generateChoices, checkAnswer } from "../mathEngine";
import { validateQuestion } from "../modes/itemQuality";
import { ANSWER_TYPES } from "../components/widgetRegistry.js";
import { SHAPES } from "../components/kit/shapeData.js";

/**
 * M4 — measurement, money, time, areaPerimeter, angles, linesShapes, dataGraphs.
 *
 * Everything below RECOMPUTES the answer from the item's own prompt text and
 * display payload, from first principles, using tables declared in this file.
 * Nothing is imported from the generators except the generators themselves —
 * the point is to catch a generator that confidently states a wrong answer, and
 * unit conversion and elapsed time are exactly where that happens.
 */

const M4_MODES = [
  "measurement",
  "money",
  "time",
  "areaPerimeter",
  "angles",
  "linesShapes",
  "dataGraphs",
];

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SAMPLES = 40;

// --- independent reference tables -----------------------------------------

const METRIC = {
  "m>cm": 100,
  "km>m": 1000,
  "cm>mm": 10,
  "kg>g": 1000,
  "L>mL": 1000,
};
const COIN_CENTS = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
const COIN_WORDS = {
  penny: 1,
  pennies: 1,
  nickel: 5,
  nickels: 5,
  dime: 10,
  dimes: 10,
  quarter: 25,
  quarters: 25,
};

/** Factor between two metric units, positive to multiply, negative to divide. */
function metricFactor(from, to) {
  if (METRIC[`${from}>${to}`]) return METRIC[`${from}>${to}`];
  if (METRIC[`${to}>${from}`]) return -METRIC[`${to}>${from}`];
  return null;
}

function convert(amount, from, to) {
  if (from === to) return amount;
  // cm -> mm is one step, m -> mm is two; compose through the chain.
  if (from === "m" && to === "mm") return amount * 1000;
  if (from === "mm" && to === "m") return amount / 1000;
  const f = metricFactor(from, to);
  if (f == null) return null;
  return f > 0 ? amount * f : amount / -f;
}

/** Fewest US coins for an amount, by dynamic programming (not greedy). */
function fewestCoinsDP(cents) {
  const best = new Array(cents + 1).fill(Infinity);
  best[0] = 0;
  for (let i = 1; i <= cents; i += 1) {
    for (const d of [1, 5, 10, 25]) {
      if (d <= i) best[i] = Math.min(best[i], best[i - d] + 1);
    }
  }
  return best[cents];
}

const toMinutes = (h, m) => Number(h) * 60 + Number(m);
const fmtTime = (total) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;

function generateMany(mode, level, n = SAMPLES) {
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(generateQuestion(mode, level));
  return out;
}

// --- per-variety answer recomputation --------------------------------------
// Each checker takes the generated question and returns the answer it SHOULD
// have, computed from the prompt text alone. Returning undefined means "this
// item carries no independently checkable arithmetic".

const CHECKERS = {
  // ---------------- measurement -------------------------------------------
  convertDown(q) {
    const m = q.display.promptText.match(/^(\d+) (\w+) = \? (\w+)$/);
    if (!m) return undefined;
    return convert(Number(m[1]), m[2], m[3]);
  },
  convertUp(q) {
    return CHECKERS.convertDown(q);
  },
  convertMissingAmount(q) {
    const m = q.display.promptText.match(/^\? (\w+) = (\d+) (\w+)$/);
    if (!m) return undefined;
    return convert(Number(m[2]), m[3], m[1]);
  },
  convertMissingUnit(q) {
    const m = q.display.promptText.match(/^(\d+) (\w+) = (\d+) ___/);
    if (!m) return undefined;
    // The named unit must be the one that makes the equation true.
    expect(convert(Number(m[1]), m[2], q.answer)).toBe(Number(m[3]));
    return q.answer;
  },
  compareMeasures(q) {
    const m = q.display.promptText.match(/^(\d+) (\w+) \? (\d+) (\w+)$/);
    if (!m) return undefined;
    const left = convert(Number(m[1]), m[2], m[4]);
    const right = Number(m[3]);
    return left > right ? ">" : left < right ? "<" : "=";
  },
  compareSameUnit(q) {
    const m = q.display.promptText.match(/^(\d+) (\w+) \? (\d+) (\w+)$/);
    if (!m) return undefined;
    expect(m[2]).toBe(m[4]);
    return Number(m[1]) > Number(m[3]) ? ">" : Number(m[1]) < Number(m[3]) ? "<" : "=";
  },
  rulerRead(q) {
    const m = q.display.promptText.match(/starts at the (\d+) cm mark and ends at the (\d+) cm mark/);
    if (!m) return undefined;
    return Number(m[2]) - Number(m[1]);
  },
  iterateNonstandard(q) {
    const m = q.display.promptText.match(/(\d+) paperclips.*Each clip is (\d+) cm/);
    if (!m) return undefined;
    return Number(m[1]) * Number(m[2]);
  },
  addMixedUnits(q) {
    const m = q.display.promptText.match(/is (\d+) m (\d+) cm long\..*cuts off (\d+) cm/);
    if (!m) return undefined;
    return Number(m[1]) * 100 + Number(m[2]) - Number(m[3]);
  },
  twoStepConvert(q) {
    const m = q.display.promptText.match(/holds (\d+) L\..*pours out (\d+) mL (\d+) times/);
    if (!m) return undefined;
    return Number(m[1]) * 1000 - Number(m[2]) * Number(m[3]);
  },
  errorAnalysisConvert(q) {
    const m = q.display.promptText.match(/What is (\d+) (\w+) in (\w+)\?/);
    if (!m) return undefined;
    // The named child's wrong value must genuinely be wrong.
    const claimed = q.display.promptText.match(/says (\d+) \w+ = (\d+) \w+/);
    if (claimed) expect(Number(claimed[2])).not.toBe(q.answer);
    return convert(Number(m[1]), m[2], m[3]);
  },
  selectLongerThan(q) {
    const toMm = (label) => {
      const [n, unit] = label.split(" ");
      return convert(Number(n), unit, "mm");
    };
    return q.display.options.filter((o) => toMm(o) > 1000);
  },

  // ---------------- money ---------------------------------------------------
  countCoinsVisual(q) {
    return q.display.coins.reduce((s, c) => s + COIN_CENTS[c], 0);
  },
  countCoinsText(q) {
    let total = 0;
    for (const m of q.display.promptText.matchAll(/(\d+) (pennies|penny|nickels?|dimes?|quarters?)/g)) {
      total += Number(m[1]) * COIN_WORDS[m[2]];
    }
    return total;
  },
  coinValueRecall(q) {
    const m = q.display.promptText.match(/one (\w+) worth/);
    return m ? COIN_CENTS[m[1]] : undefined;
  },
  equalValueSwap(q) {
    const m = q.display.promptText.match(/How many (\w+) have the same value as (\d+) (\w+)\?/);
    if (!m) return undefined;
    return (Number(m[2]) * COIN_WORDS[m[3]]) / COIN_WORDS[m[1]];
  },
  makeAmountFewest(q) {
    const m = q.display.promptText.match(/make (\d+)c/);
    return m ? fewestCoinsDP(Number(m[1])) : undefined;
  },
  makeChange(q) {
    const m = q.display.promptText.match(/costs (\d+)c\..*pays with (\d+)c/);
    if (!m) return undefined;
    return Number(m[2]) - Number(m[1]);
  },
  changePriceUnknown(q) {
    const m = q.display.promptText.match(/paid with (\d+)c and got (\d+)c change/);
    if (!m) return undefined;
    return Number(m[1]) - Number(m[2]);
  },
  changePaidUnknown(q) {
    const m = q.display.promptText.match(/costs (\d+)c\..*got (\d+)c change/);
    if (!m) return undefined;
    return Number(m[1]) + Number(m[2]);
  },
  twoItemMultiStep(q) {
    const m = q.display.promptText.match(/a (\d+)c apple and a (\d+)c juice, and pays (\d+)c/);
    if (!m) return undefined;
    return Number(m[3]) - Number(m[1]) - Number(m[2]);
  },
  dollarNotation(q) {
    const m = q.display.promptText.match(/\$(\d+)\.(\d\d)/);
    if (!m) return undefined;
    return Number(m[1]) * 100 + Number(m[2]);
  },
  errorAnalysisCoins(q) {
    const m = q.display.promptText.match(/counted (\d+) dimes? and (\d+) (?:pennies|penny)/);
    if (!m) return undefined;
    return Number(m[1]) * 10 + Number(m[2]);
  },
  canYouAfford(q) {
    const m = q.display.promptText.match(/has (\d+) quarters\..*costs (\d+)c/);
    if (!m) return undefined;
    return Number(m[1]) * 25 >= Number(m[2]) ? "Yes" : "No";
  },

  // ---------------- time ----------------------------------------------------
  readClockHour: clockAnswer,
  readClockHalf: clockAnswer,
  readClockQuarter: clockAnswer,
  readClockFive: clockAnswer,
  readClockMinute: clockAnswer,
  elapsedWithinHour: elapsedDuration,
  elapsedAcrossHour: elapsedDuration,
  errorAnalysisElapsed(q) {
    const m = q.display.promptText.match(/from (\d+):(\d\d) to (\d+):(\d\d)/);
    if (!m) return undefined;
    const start = toMinutes(m[1], m[2]);
    const end = toMinutes(m[3], m[4]);
    // The digit-wise value quoted in the prompt must be wrong, and must be the
    // decimal-subtraction mistake.
    const quoted = q.display.promptText.match(/lasts (\d+) minutes/);
    const decimal = (Number(m[3]) * 100 + Number(m[4])) - (Number(m[1]) * 100 + Number(m[2]));
    expect(Number(quoted[1])).toBe(decimal);
    expect(Number(quoted[1])).not.toBe(end - start);
    return end - start;
  },
  elapsedEndUnknown(q) {
    const m = q.display.promptText.match(/starts at (\d+):(\d\d) and lasts (\d+) minutes/);
    if (!m) return undefined;
    return fmtTime(toMinutes(m[1], m[2]) + Number(m[3]));
  },
  elapsedStartUnknown(q) {
    const m = q.display.promptText.match(/ends at (\d+):(\d\d) after (\d+) minutes/);
    if (!m) return undefined;
    return fmtTime(toMinutes(m[1], m[2]) - Number(m[3]));
  },
  calendarDuration(q) {
    const m = q.display.promptText.match(/from \w+ (\d+) to \w+ (\d+)\. How many weeks/);
    if (!m) return undefined;
    return (Number(m[2]) - Number(m[1])) / 7;
  },
  earliestTime(q) {
    const times = [...q.display.promptText.matchAll(/(\d+):(\d\d)/g)].map((m) => toMinutes(m[1], m[2]));
    return fmtTime(Math.min(...times));
  },

  // ---------------- areaPerimeter -------------------------------------------
  areaFromGrid(q) {
    const m = q.display.promptText.match(/(\d+) rows with (\d+) squares/);
    if (!m) return undefined;
    return Number(m[1]) * Number(m[2]);
  },
  perimeterFromGrid(q) {
    const m = q.display.promptText.match(/is (\d+) units across and (\d+) units down/);
    if (!m) return undefined;
    return 2 * (Number(m[1]) + Number(m[2]));
  },
  perimeterOfSquare(q) {
    const m = q.display.promptText.match(/is (\d+) cm on every side/);
    if (!m) return undefined;
    return 4 * Number(m[1]);
  },
  areaFromDims(q) {
    const m = q.display.promptText.match(/is (\d+) cm by (\d+) cm\. What is its area/);
    if (!m) return undefined;
    return Number(m[1]) * Number(m[2]);
  },
  perimeterFromDims(q) {
    const m = q.display.promptText.match(/is (\d+) cm by (\d+) cm\. What is its perimeter/);
    if (!m) return undefined;
    return 2 * (Number(m[1]) + Number(m[2]));
  },
  missingSideFromArea(q) {
    const m = q.display.promptText.match(/area of (\d+) sq cm\. One side is (\d+) cm/);
    if (!m) return undefined;
    return Number(m[1]) / Number(m[2]);
  },
  missingSideFromPerimeter(q) {
    const m = q.display.promptText.match(/perimeter of (\d+) cm\. One side is (\d+) cm/);
    if (!m) return undefined;
    return Number(m[1]) / 2 - Number(m[2]);
  },
  compositeArea(q) {
    const m = q.display.promptText.match(/a (\d+) by (\d+) rectangle with a (\d+) by (\d+) corner cut out/);
    if (!m) return undefined;
    return Number(m[1]) * Number(m[2]) - Number(m[3]) * Number(m[4]);
  },
  compositePerimeter(q) {
    const m = q.display.promptText.match(/a (\d+) by (\d+) rectangle with a (\d+) by (\d+) corner cut out/);
    if (!m) return undefined;
    // Removing a rectangle from a CORNER leaves the perimeter unchanged.
    return 2 * (Number(m[1]) + Number(m[2]));
  },
  distributiveArea(q) {
    const m = q.display.promptText.match(/A (\d+) by (\d+) rectangle is split into a (\d+) by (\d+) part and a (\d+) by (\d+) part/);
    if (!m) return undefined;
    expect(Number(m[4]) + Number(m[6])).toBe(Number(m[2]));
    return Number(m[1]) * Number(m[2]);
  },
  compareTwoRectangles(q) {
    const m = q.display.promptText.match(/Rug A is (\d+) m by (\d+) m\. Rug B is (\d+) m by (\d+) m/);
    if (!m) return undefined;
    return Math.abs(Number(m[1]) * Number(m[2]) - Number(m[3]) * Number(m[4]));
  },
  errorAnalysisSwap(q) {
    const m = q.display.promptText.match(/of a (\d+) cm by (\d+) cm rectangle is (\d+) cm/);
    if (!m) return undefined;
    expect(Number(m[3])).toBe(Number(m[1]) * Number(m[2])); // the swap mistake
    return 2 * (Number(m[1]) + Number(m[2]));
  },
  whichCoversMore(q) {
    const m = q.display.promptText.match(/, (\d+) by (\d+) or (\d+) by (\d+)\?/);
    if (!m) return undefined;
    const a = Number(m[1]) * Number(m[2]);
    const b = Number(m[3]) * Number(m[4]);
    return a > b ? `${m[1]} by ${m[2]}` : `${m[3]} by ${m[4]}`;
  },
  sameAreaSelect(q) {
    const m = q.display.promptText.match(/area of (\d+) square cm/);
    if (!m) return undefined;
    return q.display.options.filter((o) => {
      const [w, h] = o.split(" by ").map(Number);
      return w * h === Number(m[1]);
    });
  },

  // ---------------- angles --------------------------------------------------
  measureAngleProtractor(q) {
    return q.display.degrees;
  },
  estimateAngle(q) {
    const nearest = [30, 90, 150].reduce((best, b) =>
      Math.abs(b - q.display.degrees) < Math.abs(best - q.display.degrees) ? b : best
    );
    return nearest;
  },
  angleSumAdjacent(q) {
    const m = q.display.promptText.match(/measure (\d+) degrees and (\d+) degrees/);
    if (!m) return undefined;
    return Number(m[1]) + Number(m[2]);
  },
  complementMissing(q) {
    return 90 - q.display.degrees;
  },
  supplementMissing(q) {
    return 180 - q.display.degrees;
  },
  fullTurnMissing(q) {
    const m = q.display.promptText.match(/measure (\d+) degrees and (\d+) degrees/);
    if (!m) return undefined;
    return 360 - Number(m[1]) - Number(m[2]);
  },
  clockHandsAngle(q) {
    const m = q.display.promptText.match(/at (\d+) o'clock/);
    if (!m) return undefined;
    return Math.min(Number(m[1]), 12 - Number(m[1])) * 30;
  },
  errorAnalysisProtractor(q) {
    const m = q.display.promptText.match(/read (\d+) degrees/);
    if (!m) return undefined;
    return 180 - Number(m[1]);
  },
  classifyFromMeasure(q) {
    const m = q.display.promptText.match(/measures (\d+) degrees/);
    if (!m) return undefined;
    const d = Number(m[1]);
    return d === 180 ? "straight" : d === 90 ? "right" : d < 90 ? "acute" : "obtuse";
  },
  turnsAsFractions(q) {
    const turns = {
      "a quarter turn": 90,
      "a half turn": 180,
      "three quarters of a turn": 270,
      "a full turn": 360,
    };
    const key = Object.keys(turns).find((t) => q.display.promptText.includes(`turns ${t}`));
    return key ? turns[key] : undefined;
  },

  // ---------------- linesShapes ---------------------------------------------
  countSides(q) {
    return SHAPES[q.display.shape].length;
  },
  countVertices(q) {
    return SHAPES[q.display.shape].length;
  },
  decomposeShapes(q) {
    return SHAPES[q.display.shape].length;
  },
  namedShapeSides(q) {
    const table = {
      triangle: 3,
      "right triangle": 3,
      "scalene triangle": 3,
      square: 4,
      rectangle: 4,
      rhombus: 4,
      parallelogram: 4,
      trapezoid: 4,
      pentagon: 5,
      hexagon: 6,
      heptagon: 7,
      octagon: 8,
      nonagon: 9,
      decagon: 10,
      dodecagon: 12,
    };
    const m = q.display.promptText.match(/does a (.+) have\?/);
    return m ? table[m[1]] : undefined;
  },

  // ---------------- dataGraphs ----------------------------------------------
  readBarSingle(q) {
    const m = q.display.promptText.match(/How many (\w+)\?/);
    if (!m) return undefined;
    return q.display.bars.find((b) => b.label === m[1]).value;
  },
  compareBarsAny(q) {
    const m = q.display.promptText.match(/How many more (\w+) than (\w+)\?/);
    if (!m) return undefined;
    const val = (l) => q.display.bars.find((b) => b.label === l).value;
    return val(m[1]) - val(m[2]);
  },
  compareFewer(q) {
    const m = q.display.promptText.match(/How many fewer (\w+) than (\w+)\?/);
    if (!m) return undefined;
    const val = (l) => q.display.bars.find((b) => b.label === l).value;
    return val(m[2]) - val(m[1]);
  },
  totalAcrossBars(q) {
    const m = q.display.promptText.match(/How many chose (\w+) or (\w+) altogether\?/);
    if (!m) return undefined;
    const val = (l) => q.display.bars.find((b) => b.label === l).value;
    return val(m[1]) + val(m[2]);
  },
  surveyStory(q) {
    const m = q.display.promptText.match(/How many chose (\w+) or (\w+) in all\?/);
    if (!m) return undefined;
    const val = (l) => q.display.bars.find((b) => b.label === l).value;
    return val(m[1]) + val(m[2]);
  },
  totalSurveyed(q) {
    return q.display.bars.reduce((s, b) => s + b.value, 0);
  },
  tallyRead(q) {
    const m = q.display.promptText.match(/How many chose (\w+)\?/);
    if (!m) return undefined;
    const row = q.display.promptText.match(new RegExp(`${m[1]}: ([I/ ]+?)\\.`));
    const marks = row[1];
    return marks.split("/").length - 1 === 0
      ? marks.replace(/\s/g, "").length
      : (marks.split("/").length - 1) * 5 + (marks.split("/").pop().match(/I/g) || []).length;
  },
  pictographKey1: pictographValue,
  pictographKey2: pictographValue,
  pictographKeyHalf: pictographValue,
  errorAnalysisKey: pictographValue,
  pictographCompare(q) {
    const key = Number(q.display.promptText.match(/stands for (\d+)/)[1]);
    const rows = [...q.display.promptText.matchAll(/(\w+): (●+)/g)];
    const m = q.display.promptText.match(/How many more (\w+) than (\w+)\?/);
    const count = (label) => rows.find((r) => r[1] === label)[2].length;
    return (count(m[1]) - count(m[2])) * key;
  },
  linePlotRead(q) {
    const m = q.display.promptText.match(/How many plants were (\d+) cm tall\?/);
    if (!m) return undefined;
    const row = q.display.promptText.match(new RegExp(`${m[1]} cm (X+)`));
    return row ? row[1].length : 0;
  },
  linePlotSpread(q) {
    const rows = [...q.display.promptText.matchAll(/(\d+) cm (X+|-)/g)];
    const present = rows.filter((r) => r[2] !== "-").map((r) => Number(r[1]));
    return Math.max(...present) - Math.min(...present);
  },
};

function clockAnswer(q) {
  return q.display.minute;
}

function elapsedDuration(q) {
  const m = q.display.promptText.match(/starts at (\d+):(\d\d) and ends at (\d+):(\d\d)/);
  if (!m) return undefined;
  return toMinutes(m[3], m[4]) - toMinutes(m[1], m[2]);
}

function pictographValue(q) {
  const key = Number(q.display.promptText.match(/stands for (\d+)/)[1]);
  const asked = q.display.promptText.match(/How many (\w+)/)[1];
  const row = q.display.promptText.match(new RegExp(`${asked}: (●*)(◐?)`));
  return row[1].length * key + (row[2] ? key / 2 : 0);
}

// --- the tests --------------------------------------------------------------

describe("M4 generators produce structurally valid items", () => {
  it("passes validateQuestion at every level with accurate metadata", () => {
    for (const mode of M4_MODES) {
      for (const level of LEVELS) {
        for (const q of generateMany(mode, level, 12)) {
          const { valid, errors } = validateQuestion(q);
          expect(valid, `${mode} L${level}: ${errors.join("; ")}`).toBe(true);
          expect(q.metadata.modeId).toBe(mode);
          expect(q.metadata.level).toBe(level);
          expect(q.metadata.cognitiveDemand).toMatch(/^DOK[123]$/);
          expect(q.metadata.representation).toBeTruthy();
          expect(q.metadata.misconceptionTags.length).toBeGreaterThan(0);
          expect(q.display.promptText).toBeTruthy();
          if (q.answerType) {
            expect(ANSWER_TYPES.includes(q.answerType) || q.answerType === "choice").toBe(true);
          }
        }
      }
    }
  });

  it("never emits a negative, fractional or malformed answer", () => {
    // A rope shorter than the piece cut off, a tank emptied past zero, a
    // conversion that lands on 2.5 — all of these were live bugs found here.
    for (const mode of M4_MODES) {
      for (const level of LEVELS) {
        for (const q of generateMany(mode, level, 60)) {
          const label = `${mode}/${q.metadata.structureType}: ${q.display.promptText}`;
          expect(q.display.promptText).not.toMatch(/NaN|undefined|Infinity/);
          if (typeof q.answer === "number") {
            expect(Number.isInteger(q.answer), label).toBe(true);
            expect(q.answer, label).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it("declares every subskill and family it actually emits", () => {
    for (const mode of M4_MODES) {
      const config = getModeConfig(mode);
      const subskills = new Set();
      const families = new Set();
      for (const level of LEVELS) {
        for (const q of generateMany(mode, level, 20)) {
          subskills.add(q.metadata.subskill);
          families.add(q.metadata.itemFamily);
        }
      }
      for (const s of subskills) {
        expect(config.subskills, `${mode} emits undeclared subskill ${s}`).toContain(s);
      }
      expect(families.size, `${mode} should cover all three families`).toBe(3);
      expect(config.subskills.length, `${mode} needs 3+ subskills`).toBeGreaterThanOrEqual(3);
    }
  });

  it("offers at least 8 distinct question shapes per mode", () => {
    for (const mode of M4_MODES) {
      const shapes = new Set();
      for (const level of LEVELS) {
        for (const q of generateMany(mode, level, 30)) shapes.add(q.metadata.structureType);
      }
      expect(shapes.size, `${mode} shapes: ${[...shapes].join(",")}`).toBeGreaterThanOrEqual(8);
    }
  });

  it("varies difficulty by STRUCTURE, not just by number size", () => {
    for (const mode of M4_MODES) {
      const seen = [2, 5, 9].map((level) => {
        const s = new Set();
        for (const q of generateMany(mode, level, 60)) s.add(q.metadata.structureType);
        return s;
      });
      const [easy, mid, hard] = seen;
      // Each band must offer something the easiest band never offers.
      expect([...mid].some((s) => !easy.has(s)), `${mode} L5 vs L2`).toBe(true);
      expect([...hard].some((s) => !easy.has(s)), `${mode} L9 vs L2`).toBe(true);
      expect([...hard].some((s) => !mid.has(s)), `${mode} L9 vs L5`).toBe(true);
    }
  });

  it("honours allowWordProblems: false", () => {
    for (const mode of M4_MODES) {
      for (const level of LEVELS) {
        for (let i = 0; i < 15; i += 1) {
          const q = generateQuestion(mode, level, { allowWordProblems: false });
          expect(q.metadata.itemFamily, mode).not.toBe("application");
        }
      }
    }
  });
});

describe("M4 answers are independently correct", () => {
  it("recomputes every checkable item's answer from its own prompt", () => {
    const checked = {};
    for (const mode of M4_MODES) {
      checked[mode] = new Set();
      for (const level of LEVELS) {
        for (const q of generateMany(mode, level)) {
          // Format transforms rewrite the prompt into a different item; they
          // have their own coverage in formats.spec.js.
          if (q.metadata.formatId) continue;
          const checker = CHECKERS[q.metadata.structureType];
          if (!checker) continue;
          const expected = checker(q);
          if (expected === undefined) continue;
          checked[mode].add(q.metadata.structureType);
          if (Array.isArray(expected)) {
            expect([...q.answer].sort(), `${mode}/${q.metadata.structureType}: ${q.display.promptText}`)
              .toEqual([...expected].sort());
          } else {
            expect(q.answer, `${mode}/${q.metadata.structureType}: ${q.display.promptText}`).toBe(expected);
          }
        }
      }
    }
    // The recomputation must actually be exercising most of each mode.
    for (const mode of M4_MODES) {
      expect(checked[mode].size, `${mode} recomputed shapes`).toBeGreaterThanOrEqual(4);
    }
  });

  it("keeps unit conversions exact in both directions", () => {
    // Conversion is the single easiest place to ship a wrong answer, so it is
    // hammered separately with many more samples.
    for (const level of [4, 5, 6, 7, 8, 9, 10]) {
      for (const q of generateMany("measurement", level, 120)) {
        if (q.metadata.formatId) continue;
        const type = q.metadata.structureType;
        if (!["convertDown", "convertUp", "convertMissingAmount"].includes(type)) continue;
        const expected = CHECKERS[type](q);
        expect(expected, q.display.promptText).not.toBeNull();
        expect(Number.isInteger(q.answer), q.display.promptText).toBe(true);
        expect(q.answer, q.display.promptText).toBe(expected);
      }
    }
  });

  it("keeps elapsed time exact, including across the hour", () => {
    let acrossHour = 0;
    for (const level of [7, 8, 9, 10]) {
      for (const q of generateMany("time", level, 120)) {
        const type = q.metadata.structureType;
        if (type === "elapsedAcrossHour") {
          const m = q.display.promptText.match(/starts at (\d+):(\d\d) and ends at (\d+):(\d\d)/);
          const start = toMinutes(m[1], m[2]);
          const end = toMinutes(m[3], m[4]);
          expect(Math.floor(end / 60), "must cross the hour").toBeGreaterThan(Math.floor(start / 60));
          expect(q.answer).toBe(end - start);
          acrossHour += 1;
        }
        if (type === "elapsedEndUnknown" || type === "elapsedStartUnknown") {
          expect(q.answer).toBe(CHECKERS[type](q));
          expect(q.choices).toContain(q.answer);
          expect(new Set(q.choices).size).toBe(q.choices.length);
        }
      }
    }
    expect(acrossHour).toBeGreaterThan(0);
  });

  it("gives the clock ladder a real level progression", () => {
    const minutesAt = (level) => {
      const seen = new Set();
      for (const q of generateMany("time", level, 150)) {
        if (q.answerType === "clock") seen.add(q.display.minute);
      }
      return seen;
    };
    const band1 = minutesAt(2);
    const band2 = minutesAt(5);
    const band3 = minutesAt(9);
    expect([...band1].every((m) => m === 0 || m === 30), `band1: ${[...band1]}`).toBe(true);
    expect([...band2].every((m) => m % 5 === 0), `band2: ${[...band2]}`).toBe(true);
    expect([...band3].some((m) => m % 5 !== 0), "band 3 must read to the minute").toBe(true);
  });
});

describe("M4 answer payloads score through the engine", () => {
  it("scores the stated answer as correct and a near miss as wrong", () => {
    for (const mode of M4_MODES) {
      for (const level of LEVELS) {
        for (const q of generateMany(mode, level, 10)) {
          expect(checkAnswer(q, q.answer), `${mode}: ${q.display.promptText}`).toBe(true);
          if (typeof q.answer === "number") {
            expect(checkAnswer(q, q.answer + 1)).toBe(false);
          }
        }
      }
    }
  });

  it("keeps multiSelect answers a non-empty subset of the options shown", () => {
    let seen = 0;
    for (const mode of M4_MODES) {
      for (const level of LEVELS) {
        for (const q of generateMany(mode, level, 20)) {
          if (q.answerType !== "multiSelect") continue;
          seen += 1;
          expect(Array.isArray(q.answer)).toBe(true);
          expect(q.answer.length).toBeGreaterThan(0);
          expect(new Set(q.display.options).size).toBe(q.display.options.length);
          for (const a of q.answer) expect(q.display.options).toContain(a);
          // There must always be a wrong option, or "select everything" scores.
          expect(q.answer.length, q.display.promptText).toBeLessThan(q.display.options.length);
          expect(checkAnswer(q, q.display.options)).toBe(false);
        }
      }
    }
    expect(seen, "M4 should emit multiSelect items").toBeGreaterThan(0);
  });

  it("points every shapeFigure item at a drawable shape", () => {
    for (const level of LEVELS) {
      for (const q of generateMany("linesShapes", level, 30).concat(generateMany("angles", level, 30))) {
        if (q.answerType !== "shapeFigure") continue;
        if (q.display.shapeMode === "select") {
          expect(q.display.options.length).toBeGreaterThan(1);
          for (const opt of q.display.options) expect(SHAPES[opt.shape], opt.shape).toBeTruthy();
          expect(q.display.options.map((o) => o.value)).toContain(q.answer);
        } else {
          expect(SHAPES[q.display.shape], q.display.shape).toBeTruthy();
        }
      }
    }
  });
});

describe("M4 distractors", () => {
  it("builds four unique wrong-but-plausible options for every choice item", () => {
    let numericChoiceItems = 0;
    for (const mode of M4_MODES) {
      for (const level of LEVELS) {
        for (const q of generateMany(mode, level, 20)) {
          if ((q.answerType ?? "choice") !== "choice") continue;
          const choices = generateChoices(q.answer, 4, q);
          expect(choices, `${mode}: ${q.display.promptText}`).toContain(q.answer);
          expect(new Set(choices).size).toBe(choices.length);
          expect(choices.length).toBeGreaterThanOrEqual(2);
          for (const c of choices) {
            if (c !== q.answer) expect(checkAnswer(q, c), `${mode}: ${c} must be wrong`).toBe(false);
          }
          if (typeof q.answer === "number") {
            numericChoiceItems += 1;
            expect(choices.length).toBe(4);
          }
        }
      }
    }
    // The misconception strategies only reach a child through numeric choice
    // items, so at least some must exist.
    expect(numericChoiceItems, "M4 must ship numeric multiple-choice items").toBeGreaterThan(0);
  });

  it("emits the diagnostic distractor for the swap misconceptions", () => {
    // areaPerimeterSwap: an area item must be able to offer 2(w+h), and a
    // perimeter item w*h. Both come from the width/height context the mode now
    // passes into the distractor builder.
    const config = getModeConfig("areaPerimeter");
    let sawSwap = 0;
    for (let i = 0; i < 400; i += 1) {
      const q = generateQuestion("areaPerimeter", 5);
      if ((q.answerType ?? "choice") !== "choice") continue;
      const { width: w, height: h } = q.display;
      if (w == null || h == null) continue;
      const choices = config.generateChoices(q.answer, q);
      const swap = q.answer === w * h ? 2 * (w + h) : w * h;
      if (choices.includes(swap)) sawSwap += 1;
    }
    expect(sawSwap, "areaPerimeterSwap must reach the option list").toBeGreaterThan(0);
  });
});
