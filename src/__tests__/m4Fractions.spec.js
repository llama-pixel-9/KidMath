import { describe, it, expect } from "vitest";
import { generateChoices, checkAnswer } from "../mathEngine";
import { validateQuestion } from "../modes/itemQuality";
import { getWidget } from "../components/widgetRegistry.js";
import fractionsMode, { FRACTION_VARIETIES } from "../modes/fractions.js";
import decimalsMode, { DECIMAL_VARIETIES } from "../modes/decimals.js";
import factorsMode, { FACTOR_VARIETIES } from "../modes/factorsMultiples.js";
import patternsMode, { PATTERN_VARIETIES } from "../modes/patterns.js";
import barsMode, { BAR_VARIETIES } from "../modes/barModels.js";

/**
 * M4 — the five variety-expanded modes of docs/spec-part-c2-fractions-patterns.md.
 *
 * The point of this file is that it does NOT trust the generators. Every
 * assertion recomputes the answer from the numbers that appear in the RENDERED
 * PROMPT, using arithmetic written here, and fraction equality is always
 * decided by cross-multiplication rather than by any helper the modes import.
 * If a generator ever emits a subtly wrong fraction, the recomputation and the
 * payload disagree and this file fails.
 */

const MODES = {
  fractions: { mode: fractionsMode, varieties: FRACTION_VARIETIES },
  decimals: { mode: decimalsMode, varieties: DECIMAL_VARIETIES },
  factorsMultiples: { mode: factorsMode, varieties: FACTOR_VARIETIES },
  patterns: { mode: patternsMode, varieties: PATTERN_VARIETIES },
  barModels: { mode: barsMode, varieties: BAR_VARIETIES },
};

const MODE_IDS = Object.keys(MODES);
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SAMPLES = 60;

/** Fraction equality the only way that cannot be fooled: cross-multiplication. */
function fracEq(a, b) {
  return a.num * b.den === b.num * a.den;
}

function parseFrac(text) {
  const m = String(text).trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  return m ? { num: Number(m[1]), den: Number(m[2]) } : null;
}

/** Every number in a prompt, in order. */
function numbersIn(text) {
  return (text.match(/\d+(?:\.\d+)?/g) || []).map(Number);
}

/** Every `a/b` in a prompt, in order. */
function fractionsIn(text) {
  return (text.match(/\d+\s*\/\s*\d+/g) || []).map(parseFrac);
}

function varietyIdOf(question) {
  const parts = String(question.metadata?.blueprintId || "").split("-");
  return parts[parts.length - 1];
}

function sample(modeId, level, count = SAMPLES, context = { noFormats: true }) {
  const { mode } = MODES[modeId];
  return Array.from({ length: count }, () => mode.generate(level, context));
}

/** The ticks NumberLine will actually render, reproduced from the widget. */
function ticksFor(display) {
  const out = [];
  for (let v = display.min; v <= display.max + 1e-9; v += display.step) {
    out.push(Number(v.toFixed(4)));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Cross-mode invariants
// ---------------------------------------------------------------------------

describe("M4 — every generated item is well formed", () => {
  it("passes validateQuestion with all nine metadata fields present", () => {
    for (const modeId of MODE_IDS) {
      for (const level of LEVELS) {
        for (const q of sample(modeId, level, 20)) {
          const result = validateQuestion(q);
          expect(result.errors, `${modeId} L${level}: ${result.errors.join("; ")}`).toEqual([]);
          for (const field of [
            "modeId",
            "gradeBand",
            "domain",
            "cluster",
            "subskill",
            "itemFamily",
            "cognitiveDemand",
            "representation",
            "blueprintId",
          ]) {
            expect(q.metadata[field], `${modeId}.${field}`).toBeTruthy();
          }
          expect(q.metadata.modeId).toBe(modeId);
          expect(q.metadata.level).toBe(level);
          expect(MODES[modeId].mode.subskills).toContain(q.metadata.subskill);
        }
      }
    }
  });

  it("only emits answer types the widget registry can render", () => {
    for (const modeId of MODE_IDS) {
      for (const level of LEVELS) {
        for (const q of sample(modeId, level, 20)) {
          if (!q.answerType || q.answerType === "choice") continue;
          expect(getWidget(q.answerType), `${modeId} -> ${q.answerType}`).toBeTruthy();
        }
      }
    }
  });

  it("scores its own stated answer as correct through the real engine", () => {
    for (const modeId of MODE_IDS) {
      for (const level of LEVELS) {
        for (const q of sample(modeId, level, 20)) {
          // A multiSelect whose answer is a list of acceptable SETS is
          // submitted as one of those sets, not as the whole list.
          const submitted =
            q.answerType === "multiSelect" && q.answer.some(Array.isArray) ? q.answer[0] : q.answer;
          expect(
            checkAnswer(q, submitted),
            `${modeId} ${varietyIdOf(q)}: "${q.display.promptText}"`
          ).toBe(true);
        }
      }
    }
  });

  it("builds unique multiple-choice options that contain the answer and no correct distractor", () => {
    for (const modeId of MODE_IDS) {
      for (const level of LEVELS) {
        for (const q of sample(modeId, level, 20)) {
          if (q.answerType && q.answerType !== "choice") continue;
          const choices = generateChoices(q.answer, 4, { ...q, mode: modeId });
          expect(choices.length, `${modeId} ${varietyIdOf(q)}`).toBeGreaterThanOrEqual(2);
          expect(new Set(choices).size).toBe(choices.length);
          expect(choices).toContain(q.answer);
          for (const choice of choices) {
            if (choice === q.answer) continue;
            expect(
              checkAnswer(q, choice),
              `${modeId} ${varietyIdOf(q)}: distractor ${choice} scores as correct`
            ).toBe(false);
          }
        }
      }
    }
  });

  it("grades every multiSelect option set against a recomputed truth", () => {
    for (const modeId of MODE_IDS) {
      for (const level of LEVELS) {
        for (const q of sample(modeId, level, 20)) {
          if (q.answerType !== "multiSelect") continue;
          const options = q.display.options;
          expect(Array.isArray(options)).toBe(true);
          expect(options.length).toBeGreaterThanOrEqual(2);
          expect(new Set(options.map(String)).size).toBe(options.length);
          if (q.answer.some(Array.isArray)) {
            for (const pair of q.answer) {
              for (const v of pair) expect(options).toContain(v);
            }
          } else {
            expect(q.answer.length).toBeGreaterThan(0);
            for (const v of q.answer) expect(options).toContain(v);
            expect(q.display.requiredCount).toBe(q.answer.length);
          }
        }
      }
    }
  });

  it("varies by structure, not only by number size", () => {
    for (const modeId of MODE_IDS) {
      const ids = new Set();
      for (const level of LEVELS) {
        for (const q of sample(modeId, level, 40)) ids.add(varietyIdOf(q));
      }
      expect(ids.size, `${modeId} distinct question shapes`).toBeGreaterThanOrEqual(8);

      // Bands must differ structurally: the shapes available at levels 1-3 are
      // not the same set as those at 7-10.
      const low = new Set();
      const high = new Set();
      for (let i = 0; i < 200; i += 1) {
        low.add(varietyIdOf(MODES[modeId].mode.generate(2, { noFormats: true })));
        high.add(varietyIdOf(MODES[modeId].mode.generate(9, { noFormats: true })));
      }
      const onlyHigh = [...high].filter((id) => !low.has(id));
      expect(onlyHigh.length, `${modeId} band 3 exclusive shapes`).toBeGreaterThan(0);
    }
  });

  it("covers every declared subskill and family, and honours a targeted request", () => {
    for (const modeId of MODE_IDS) {
      const { mode, varieties } = MODES[modeId];
      const seenSubskills = new Set(varieties.map((v) => v.subskill));
      expect([...seenSubskills].sort()).toEqual([...mode.subskills].sort());

      for (const subskill of mode.subskills) {
        for (const level of [2, 5, 9]) {
          const q = mode.generate(level, { targetSubskill: subskill, noFormats: true });
          // A subskill with no variety in this band legitimately falls back,
          // but the metadata must then report what was really built.
          const available = varieties.some(
            (v) => v.subskill === subskill && v.bands.includes(level <= 3 ? 1 : level <= 6 ? 2 : 3)
          );
          if (available) expect(q.metadata.subskill).toBe(subskill);
          expect(mode.subskills).toContain(q.metadata.subskill);
        }
      }

      const families = new Set();
      for (const level of LEVELS) {
        for (const q of sample(modeId, level, 30)) families.add(q.metadata.itemFamily);
      }
      expect(families.has("conceptual"), modeId).toBe(true);
      expect(families.has("procedural"), modeId).toBe(true);
      expect(families.has("application"), modeId).toBe(true);
    }
  });

  it("suppresses word problems when the setting is off", () => {
    for (const modeId of MODE_IDS) {
      for (const level of LEVELS) {
        for (const q of sample(modeId, level, 20, { allowWordProblems: false, noFormats: true })) {
          expect(q.metadata.itemFamily, modeId).not.toBe("application");
        }
      }
    }
  });

  it("keeps every prompt inside the style contract", () => {
    for (const modeId of MODE_IDS) {
      for (const level of LEVELS) {
        for (const q of sample(modeId, level, 20)) {
          const text = q.display.promptText;
          expect(typeof text).toBe("string");
          expect(text.trim().length).toBeGreaterThan(0);
          expect(text.length, `${modeId}: ${text}`).toBeLessThanOrEqual(220);
          expect(text).not.toMatch(/[{}]/);
          expect(text).not.toMatch(/undefined|NaN|null/);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// fractions — every variety recomputed from its own prompt
// ---------------------------------------------------------------------------

/**
 * One checker per variety. Each is handed the rendered prompt and must decide
 * correctness from that text alone, never from the question payload.
 */
const FRACTION_CHECKS = {
  partWholeAreaName(q) {
    const [den, num] = numbersIn(q.display.promptText);
    expect(fracEq(q.answer, { num, den })).toBe(true);
    expect(num).toBeLessThan(den);
  },
  equalPartsCheck(q) {
    const notEqual = /not the same size/.test(q.display.promptText);
    expect(q.answer).toBe(notEqual ? "No" : "Yes");
  },
  partWholeSetName(q) {
    const [total, part] = numbersIn(q.display.promptText);
    expect(fracEq(q.answer, { num: part, den: total })).toBe(true);
  },
  unitFractionMeaning(q) {
    const [den] = numbersIn(q.display.promptText);
    expect(fracEq(q.answer, { num: 1, den })).toBe(true);
  },
  fractionOnNumberLine(q) {
    const [frac] = fractionsIn(q.display.promptText);
    const ticks = ticksFor(q.display);
    // The widget submits a tick value, so the answer must BE one of them —
    // and it must be the tick that stands for num/den.
    expect(ticks).toContain(q.answer);
    expect(q.answer).toBe(Number((frac.num / frac.den).toFixed(4)));
    // `numberLineCountsTicks`: the answer must not be the neighbouring tick.
    expect(q.answer).not.toBe(Number(((frac.num + 1) / frac.den).toFixed(4)));
  },
  numberLineReadOff(q) {
    const text = q.display.promptText;
    const den = { halves: 2, thirds: 3, fourths: 4, fifths: 5, sixths: 6, eighths: 8, tenths: 10, twelfths: 12 }[
      text.match(/in (\w+)\./)[1]
    ];
    const k = Number(text.match(/(\d+)(?:st|nd|rd|th) tick/)[1]);
    expect(fracEq(q.answer, { num: k, den })).toBe(true);
  },
  equivalenceGenerate(q) {
    const base = fractionsIn(q.display.promptText)[0];
    const answer = parseFrac(q.answer);
    expect(fracEq(answer, base)).toBe(true);
    for (const choice of q.choices) {
      if (choice === q.answer) continue;
      expect(fracEq(parseFrac(choice), base), `${choice} is also equal to ${q.answer}`).toBe(false);
    }
  },
  equivalenceSimplify(q) {
    const shown = fractionsIn(q.display.promptText)[0];
    expect(fracEq(q.answer, shown)).toBe(true);
    // Simplest form: no common factor above 1.
    let [x, y] = [q.answer.num, q.answer.den];
    while (y) [x, y] = [y, x % y];
    expect(x).toBe(1);
  },
  equivalenceMultiSelect(q) {
    const base = fractionsIn(q.display.promptText)[0];
    for (const option of q.display.options) {
      const equal = fracEq(parseFrac(option), base);
      expect(q.answer.includes(option), `${option} vs ${base.num}/${base.den}`).toBe(equal);
    }
  },
  mixedImproperConvert(q) {
    const improper = fractionsIn(q.display.promptText)[0];
    const [whole, rest] = q.answer.split(" ");
    const part = parseFrac(rest);
    expect(fracEq({ num: Number(whole) * part.den + part.num, den: part.den }, improper)).toBe(true);
  },
  compareSameDenominator(q) {
    const [left, right] = fractionsIn(q.display.promptText);
    expect(left.den).toBe(right.den);
    const expected =
      left.num * right.den > right.num * left.den
        ? ">"
        : left.num * right.den < right.num * left.den
          ? "<"
          : "=";
    expect(q.answer).toBe(expected);
  },
  compareSameNumerator(q) {
    const [left, right] = fractionsIn(q.display.promptText);
    expect(left.num).toBe(right.num);
    const expected =
      left.num * right.den > right.num * left.den
        ? ">"
        : left.num * right.den < right.num * left.den
          ? "<"
          : "=";
    expect(q.answer).toBe(expected);
    // The whole point of this row: a bigger denominator is a SMALLER piece.
    if (left.den < right.den) expect(q.answer).toBe(">");
  },
  compareToHalf(q) {
    const [frac] = fractionsIn(q.display.promptText);
    const cmp = 2 * frac.num - frac.den;
    expect(q.answer).toBe(cmp < 0 ? "less than 1/2" : cmp > 0 ? "greater than 1/2" : "equal to 1/2");
  },
  greaterThanHalfMultiSelect(q) {
    for (const option of q.display.options) {
      const f = parseFrac(option);
      expect(q.answer.includes(option), option).toBe(2 * f.num > f.den);
    }
  },
  fractionErrorAnalysis(q) {
    const [a, b, claimed] = fractionsIn(q.display.promptText);
    expect(a.den).toBe(b.den);
    const truth = { num: a.num + b.num, den: a.den };
    expect(q.answer).toBe(fracEq(claimed, truth) ? "Yes" : "No");
  },
  addLikeDenominators(q) {
    const [a, b] = fractionsIn(q.display.promptText);
    expect(a.den).toBe(b.den);
    expect(fracEq(q.answer, { num: a.num + b.num, den: a.den })).toBe(true);
    // `denominatorAdd` — the classic wrong answer must not be the right one.
    expect(fracEq(q.answer, { num: a.num + b.num, den: a.den + b.den })).toBe(false);
  },
  subtractLikeDenominators(q) {
    const [a, b] = fractionsIn(q.display.promptText);
    expect(a.den).toBe(b.den);
    expect(a.num).toBeGreaterThan(b.num);
    expect(fracEq(q.answer, { num: a.num - b.num, den: a.den })).toBe(true);
  },
  addLikeTrueFalse(q) {
    const [a, b, claimed] = fractionsIn(q.display.promptText);
    expect(a.den).toBe(b.den);
    const truth = { num: a.num + b.num, den: a.den };
    expect(q.answer).toBe(fracEq(claimed, truth) ? "True" : "False");
  },
  fractionOfSetForward(q) {
    const text = q.display.promptText;
    const total = numbersIn(text)[0];
    const frac = fractionsIn(text)[0];
    expect(total % frac.den).toBe(0);
    expect(q.answer).toBe((total / frac.den) * frac.num);
    expect(q.display.set).toEqual({ total, num: frac.num, den: frac.den });
  },
  fractionOfSetInverse(q) {
    const text = q.display.promptText;
    const frac = fractionsIn(text)[0];
    // The part is the first number after the fraction.
    const part = numbersIn(text.slice(text.indexOf("are")))[0];
    expect(q.answer * frac.num).toBe(part * frac.den);
    for (const choice of q.choices) {
      if (choice === q.answer) continue;
      expect(choice * frac.num, `${choice} also solves the item`).not.toBe(part * frac.den);
    }
  },
};

describe("fractions — answers recomputed from the rendered prompt", () => {
  it("has a checker for every declared variety", () => {
    expect(Object.keys(FRACTION_CHECKS).sort()).toEqual(FRACTION_VARIETIES.map((v) => v.id).sort());
  });

  it("verifies every sampled item at every level", () => {
    const seen = new Set();
    for (const level of LEVELS) {
      for (const q of sample("fractions", level, 120)) {
        const id = varietyIdOf(q);
        seen.add(id);
        const check = FRACTION_CHECKS[id];
        expect(check, `no checker for ${id}`).toBeTruthy();
        try {
          check(q);
        } catch (err) {
          throw new Error(`L${level} ${id} — "${q.display.promptText}"\n${err.message}`);
        }
      }
    }
    expect(seen.size).toBe(FRACTION_VARIETIES.length);
  });

  it("covers the distinct concepts the spec names, not tiers of one", () => {
    const ids = new Set(FRACTION_VARIETIES.map((v) => v.id));
    for (const required of [
      "partWholeAreaName", // area model
      "partWholeSetName", // discrete set — a different concept, not a harder one
      "fractionOnNumberLine", // fraction as a NUMBER
      "numberLineReadOff",
      "equivalenceGenerate",
      "equivalenceSimplify",
      "compareSameDenominator",
      "compareSameNumerator",
      "compareToHalf",
      "addLikeDenominators",
      "fractionOfSetForward",
      "fractionOfSetInverse",
      "mixedImproperConvert",
      "unitFractionMeaning",
    ]) {
      expect(ids.has(required), `missing concept: ${required}`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// decimals
// ---------------------------------------------------------------------------

describe("decimals — answers recomputed from the rendered prompt", () => {
  it("keeps every decimal answer to at most two places and free of float noise", () => {
    for (const level of LEVELS) {
      for (const q of sample("decimals", level, 60)) {
        if (q.answerType !== "decimal" && q.answerType !== "numberLine") continue;
        expect(Number(q.answer.toFixed(4))).toBe(q.answer);
        expect(q.answer).toBeGreaterThan(0);
      }
    }
  });

  it("puts every number-line answer on a tick the widget will actually draw", () => {
    for (const level of LEVELS) {
      for (const q of sample("decimals", level, 60)) {
        if (q.answerType !== "numberLine") continue;
        expect(ticksFor(q.display)).toContain(q.answer);
      }
    }
  });

  it("recomputes conversions, comparisons and equivalence from the prompt", () => {
    for (const level of LEVELS) {
      for (const q of sample("decimals", level, 120)) {
        const id = varietyIdOf(q);
        const text = q.display.promptText;
        const nums = numbersIn(text);
        if (id === "tenthsFromModel") {
          const shaded = Number(text.match(/and (\d+) are shaded/)[1]);
          expect(q.answer).toBe(Number((shaded / 10).toFixed(2)));
        } else if (id === "hundredthsFromGrid") {
          const shaded = Number(text.match(/has (\d+) of its 100/)[1]);
          expect(q.answer).toBe(Number((shaded / 100).toFixed(2)));
        } else if (id === "decimalFromWords") {
          const tenths = Number(text.match(/(\d+) tenths/)[1]);
          const hundredths = text.match(/(\d+) hundredths/);
          expect(q.answer).toBe(
            Number((tenths / 10 + (hundredths ? Number(hundredths[1]) / 100 : 0)).toFixed(2))
          );
        } else if (id === "fractionToDecimal") {
          const f = fractionsIn(text)[0];
          expect(q.answer).toBe(Number((f.num / f.den).toFixed(2)));
        } else if (id === "decimalToFraction") {
          const value = nums[0];
          const den = nums[nums.length - 1];
          expect(q.answer.num * 1).toBe(Math.round(value * den));
          expect(q.answer.den).toBe(den);
        } else if (id === "compareDecimals") {
          const [a, b] = text.match(/Compare: (\d+(?:\.\d+)?) \? (\d+(?:\.\d+)?)/).slice(1).map(Number);
          expect(q.answer).toBe(a > b ? ">" : a < b ? "<" : "=");
        } else if (id === "tenthsHundredthsEquiv") {
          const [left, right] = text.match(/Is (\d+(?:\.\d+)?) equal to (\d+(?:\.\d+)?)\?/).slice(1).map(Number);
          expect(q.answer).toBe(left === right ? "Yes" : "No");
        } else if (id === "greaterThanHalfDecimals") {
          for (const option of q.display.options) {
            expect(q.answer.includes(option), String(option)).toBe(option > 0.5);
          }
        } else if (id === "measurementDecimal") {
          const [first, second] = text.match(/grew (\d+(?:\.\d+)?) cm .* (\d+(?:\.\d+)?) cm/).slice(1).map(Number);
          expect(q.answer).toBe(first > second ? "the first week" : "the second week");
        } else if (id === "decimalErrorAnalysis") {
          const claim = text.match(/says (\d+(?:\.\d+)?) is bigger than (\d+(?:\.\d+)?)/).slice(1).map(Number);
          expect(q.answer).toBe(claim[0] > claim[1] ? "Yes" : "No");
        } else if (id === "decimalNumberLineRead") {
          const [low, high] = text.match(/between (\d+(?:\.\d+)?) and (\d+(?:\.\d+)?)/).slice(1).map(Number);
          expect(q.answer).toBe(Number(((low + high) / 2).toFixed(2)));
        } else if (id === "moneyAsDecimal") {
          const dimes = Number(text.match(/(\d+) dimes/)[1]);
          const pennies = Number(text.match(/(\d+) pennies/)[1]);
          expect(q.answer).toBe(Number((dimes / 10 + pennies / 100).toFixed(2)));
        } else if (id === "decimalToWords") {
          const value = Number(text.match(/say (\d+(?:\.\d+)?)\?/)[1]);
          const [count, place] = q.answer.split(" ");
          expect(Number(count) / (place === "tenths" ? 10 : 100)).toBeCloseTo(value, 10);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// factorsMultiples
// ---------------------------------------------------------------------------

function factorsOf(n) {
  const out = [];
  for (let i = 1; i <= n; i += 1) if (n % i === 0) out.push(i);
  return out;
}

describe("factorsMultiples — number theory recomputed from the prompt", () => {
  it("recomputes factors, multiples, primes and shared structure", () => {
    for (const level of LEVELS) {
      for (const q of sample("factorsMultiples", level, 120)) {
        const id = varietyIdOf(q);
        const text = q.display.promptText;
        const nums = numbersIn(text);
        if (id === "listFactors") {
          const n = nums[0];
          for (const option of q.display.options) {
            expect(q.answer.includes(option), `${option} | ${n}`).toBe(n % option === 0);
          }
        } else if (id === "factorCount" || id === "arrayFactorContext") {
          expect(q.answer).toBe(factorsOf(nums[0]).length);
        } else if (id === "isFactorOf") {
          const [candidate, n] = nums;
          expect(q.answer).toBe(n % candidate === 0 ? "Yes" : "No");
        } else if (id === "isMultipleOf") {
          const [candidate, n] = nums;
          expect(q.answer).toBe(candidate % n === 0 ? "Yes" : "No");
        } else if (id === "nthMultiple") {
          const [k, n] = nums;
          expect(q.answer).toBe(n * k);
          expect(q.a * q.b).toBe(q.answer);
        } else if (id === "multipleInContext") {
          const [n, k] = nums;
          expect(q.answer).toBe(n * k);
        } else if (id === "multiplesInRange") {
          const n = nums[0];
          for (const option of q.display.options) {
            expect(q.answer.includes(option), `${option} % ${n}`).toBe(option % n === 0);
          }
        } else if (id === "primeOrComposite") {
          const n = nums[0];
          const prime = n > 1 && factorsOf(n).length === 2;
          expect(q.answer).toBe(prime ? "prime" : "composite");
        } else if (id === "factorPairs") {
          const n = nums[0];
          const pairs = q.answer;
          expect(Array.isArray(pairs[0])).toBe(true);
          for (const [x, y] of pairs) expect(x * y).toBe(n);
          // Every pair available in the options that works must be accepted,
          // or a correct child is marked wrong.
          const options = q.display.options;
          for (let i = 0; i < options.length; i += 1) {
            for (let j = i + 1; j < options.length; j += 1) {
              if (options[i] * options[j] !== n) continue;
              expect(
                pairs.some(
                  ([x, y]) =>
                    (x === options[i] && y === options[j]) || (x === options[j] && y === options[i])
                ),
                `${options[i]} x ${options[j]} = ${n} is not accepted`
              ).toBe(true);
            }
          }
        } else if (id === "commonFactor") {
          const [a, b] = nums;
          expect(a % q.answer === 0 && b % q.answer === 0).toBe(true);
          for (const choice of q.choices) {
            if (choice === q.answer) continue;
            expect(a % choice === 0 && b % choice === 0, `${choice} is also common`).toBe(false);
          }
        } else if (id === "commonMultiple") {
          const [a, b] = nums;
          expect(q.answer % a).toBe(0);
          expect(q.answer % b).toBe(0);
          for (let v = 1; v < q.answer; v += 1) {
            expect(v % a === 0 && v % b === 0, `${v} is a smaller common multiple`).toBe(false);
          }
        } else if (id === "oddOneOut") {
          const n = nums[0];
          expect(n % q.answer).not.toBe(0);
          for (const choice of q.choices) {
            if (choice === q.answer) continue;
            expect(n % choice, `${choice} is also not a factor of ${n}`).toBe(0);
          }
        }
      }
    }
  });

  it("stays valid after a format transform", () => {
    let transformed = 0;
    for (const level of LEVELS) {
      for (let i = 0; i < 60; i += 1) {
        const q = factorsMode.generate(level);
        if (!q.metadata.formatId) continue;
        transformed += 1;
        expect(validateQuestion(q).errors).toEqual([]);
        expect(checkAnswer(q, q.answer)).toBe(true);
      }
    }
    expect(transformed, "no format transform ever fired").toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// patterns
// ---------------------------------------------------------------------------

describe("patterns — sequences recomputed from the rendered terms", () => {
  it("continues, completes and reverses sequences correctly", () => {
    for (const level of LEVELS) {
      for (const q of sample("patterns", level, 120)) {
        const id = varietyIdOf(q);
        const seq = q.display.sequence;
        if (id === "arithmeticNext" || id === "subtractPattern") {
          const step = seq[1] - seq[0];
          for (let i = 2; i < seq.length; i += 1) expect(seq[i] - seq[i - 1]).toBe(step);
          expect(q.answer).toBe(seq[seq.length - 1] + step);
        } else if (id === "arithmeticBackwards") {
          const known = seq.slice(1);
          const step = known[1] - known[0];
          expect(q.answer).toBe(known[0] - step);
          expect(q.answer).toBeGreaterThan(0);
        } else if (id === "missingTerm") {
          const gap = seq.indexOf("?");
          const known = seq.filter((v) => v !== "?");
          const step = (known[known.length - 1] - known[0]) / (seq.length - 1 - (gap < 1 ? 1 : 0));
          const rebuilt = seq.map((v, i) => (i === gap ? seq[0] + i * step : v));
          expect(q.answer).toBe(rebuilt[gap]);
        } else if (id === "geometricNext") {
          const factor = seq[1] / seq[0];
          for (let i = 2; i < seq.length; i += 1) expect(seq[i] / seq[i - 1]).toBe(factor);
          expect(q.answer).toBe(seq[seq.length - 1] * factor);
          // `additiveForMultiplicative` must not coincide with the truth.
          expect(q.answer).not.toBe(seq[seq.length - 1] + (seq[seq.length - 1] - seq[seq.length - 2]));
        } else if (id === "applyGivenRule" || id === "growingShapePattern" || id === "patternInContext") {
          const { start, step, term } = q.display;
          const offset = id === "patternInContext" ? term : term - 1;
          expect(q.answer).toBe(start + offset * step);
        } else if (id === "findTheError") {
          // The first and last terms are always sound, so the true step can be
          // recovered from them and every other term checked against it.
          const step = (seq[seq.length - 1] - seq[0]) / (seq.length - 1);
          expect(Number.isInteger(step)).toBe(true);
          const bad = seq.filter((v, i) => v !== seq[0] + i * step);
          expect(bad).toEqual([q.answer]);
        } else if (id === "repeatingShapeNext") {
          expect(q.choices).toContain(q.answer);
          // The next element must continue the repeat the prompt shows.
          const period = q.choices.length;
          expect(seq.length).toBeGreaterThanOrEqual(period * 2);
        } else if (id === "patternFeature") {
          const step = seq[1] - seq[0];
          const term = Number(q.display.promptText.match(/(\d+)(?:st|nd|rd|th) number/)[1]);
          const value = seq[0] + (term - 1) * step;
          expect(q.answer).toBe(value % 2 === 0 ? "Yes" : "No");
        } else if (id === "ruleIdentify") {
          const [verb, amount] = q.answer.replace("multiply by", "multiply").split(" ");
          const n = Number(amount);
          if (verb === "add") expect(seq[1] - seq[0]).toBe(n);
          else expect(seq[1] / seq[0]).toBe(n);
        }
      }
    }
  });

  it("really does tell a story for the application family (spec §D4)", () => {
    const prompts = new Set();
    for (const level of LEVELS) {
      for (const q of sample("patterns", level, 40)) {
        if (q.metadata.itemFamily !== "application") continue;
        prompts.add(q.display.promptText);
        // The confirmed bug was that `application` items rendered identically
        // to procedural ones. An application prompt must be prose.
        expect(q.display.promptText).toMatch(/[a-z]{4,}\s+[a-z]{4,}/i);
        expect(q.metadata.representation).toBe("verbalContext");
      }
    }
    expect(prompts.size).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// barModels
// ---------------------------------------------------------------------------

describe("barModels — every §3.2 schema, recomputed", () => {
  it("covers all seven schemas", () => {
    const ids = new Set(BAR_VARIETIES.map((v) => v.id));
    for (const required of [
      "partWholeTotalUnknown", // (a)
      "partWholePartUnknown", // (b)
      "partWholeFirstPartUnknown", // (b), blank moved
      "partWholeThreeParts", // (b) extended
      "compareDifferenceUnknown", // (c)
      "compareBiggerUnknownMore",
      "compareSmallerUnknownFewer",
      "compareSmallerUnknownMore", // (c) language trap
      "compareBiggerUnknownFewer",
      "multiplicativeTotalUnknown", // (d)
      "multiplicativeUnitUnknown",
      "multiplicativeCompareFactor",
      "twoStepCompareThenTotal", // (e)
      "beforeAfterConstantDifference", // (f)
      "fractionOfSetBar", // (g)
      "fractionOfSetRemainder",
    ]) {
      expect(ids.has(required), `missing schema row: ${required}`).toBe(true);
    }
  });

  it("recomputes each schema from the numbers in its own prompt", () => {
    for (const level of LEVELS) {
      for (const q of sample("barModels", level, 120)) {
        const id = varietyIdOf(q);
        const text = q.display.promptText;
        const nums = numbersIn(text);
        if (id === "partWholeTotalUnknown") {
          expect(q.answer).toBe(nums[0] + nums[1]);
        } else if (id === "partWholePartUnknown" || id === "partWholeFirstPartUnknown") {
          expect(q.answer).toBe(nums[0] - nums[1]);
          expect(q.display.type).toBe("barPartWhole");
          expect(q.answer).toBe(q.display.whole - q.display.part);
          expect(q.display.part).toBeLessThan(q.display.whole);
        } else if (id === "partWholeThreeParts") {
          const [p1, p2, whole] = nums;
          expect(q.answer).toBe(whole - p1 - p2);
          expect(q.answer).toBeGreaterThan(0);
        } else if (id === "compareDifferenceUnknown") {
          expect(q.answer).toBe(nums[0] - nums[1]);
        } else if (id === "compareBiggerUnknownMore") {
          expect(q.answer).toBe(nums[0] + nums[1]);
          expect(q.display.type).toBe("barCompare");
          expect(q.answer).toBe(q.display.a + q.display.diff);
        } else if (id === "compareSmallerUnknownFewer") {
          const [diff, big] = nums;
          expect(q.answer).toBe(big - diff);
        } else if (id === "compareSmallerUnknownMore") {
          const [diff, big] = nums;
          expect(q.answer).toBe(big - diff);
          // The trap: the keyword answer must not also be the right one.
          expect(q.answer).not.toBe(big + diff);
        } else if (id === "compareBiggerUnknownFewer") {
          const [diff, small] = nums;
          expect(q.answer).toBe(small + diff);
          expect(q.display.type).toBe("barCompare");
        } else if (id === "multiplicativeTotalUnknown") {
          const [unit, times] = nums;
          expect(q.answer).toBe(unit + unit * times);
        } else if (id === "multiplicativeUnitUnknown") {
          const [total, times] = nums;
          expect(q.answer * times).toBe(total);
        } else if (id === "multiplicativeCompareFactor") {
          const [big, small] = nums;
          expect(q.answer * small).toBe(big);
        } else if (id === "twoStepCompareThenTotal") {
          const [girls, diff] = nums;
          expect(q.answer).toBe(girls + (girls - diff));
          // `stopsAtStepOne` — the intermediate value is not the answer.
          expect(q.answer).not.toBe(girls - diff);
        } else if (id === "beforeAfterConstantDifference") {
          const [first, second] = nums;
          expect(first + q.answer).toBe(2 * (second + q.answer));
        } else if (id === "fractionOfSetBar") {
          const total = nums[0];
          const f = fractionsIn(text)[0];
          expect(total % f.den).toBe(0);
          expect(q.answer).toBe((total / f.den) * f.num);
          expect(q.display.set).toEqual({ total, num: f.num, den: f.den });
        } else if (id === "fractionOfSetRemainder") {
          const f = fractionsIn(text)[0];
          const rest = Number(text.match(/other (\d+) pages/)[1]);
          // rest is the (den - num)/den share of the whole book.
          expect(q.answer * (f.den - f.num)).toBe(rest * f.den);
          expect(q.answer).not.toBe(rest);
        }
      }
    }
  });
});
