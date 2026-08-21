import { describe, it, expect } from "vitest";

import counting from "../modes/counting.js";
import skipCounting from "../modes/skipCounting.js";
import placeValue from "../modes/placeValue.js";
import placeValueDiscs from "../modes/placeValueDiscs.js";
import numberBonds from "../modes/numberBonds.js";
import comparing from "../modes/comparing.js";
import { validateQuestion } from "../modes/itemQuality.js";
import { checkAnswer } from "../mathEngine.js";
import { isVerbalPrompt } from "../modes/helpers.js";

/**
 * M4 — number-sense variety expansion.
 *
 * The point of this file is NOT to check that the generator agrees with itself.
 * Every assertion below RE-DERIVES the answer from what the child actually
 * sees — the rendered prompt text, the emoji, the disc columns, the sequence —
 * using arithmetic written here, independently of the generator. A generator
 * that computes its own answer wrongly and stores it consistently would pass a
 * naive test and fail this one.
 */

const MODES = { counting, skipCounting, placeValue, placeValueDiscs, numberBonds, comparing };
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SAMPLES = 30;

// --- parsing helpers (shared, deliberately dumb) ---------------------------

const promptOf = (q) => q.display?.promptText || "";
/** Every integer in a string, in order. */
const numsIn = (s) => (String(s).match(/-?\d+/g) || []).map(Number);
/** Grapheme count: the emoji in this app are single code points. */
const glyphs = (s) => [...s].length;
/** How many pictographic glyphs (emoji) appear anywhere in a string. */
const emojiCount = (s) => [...s].filter((ch) => /\p{Extended_Pictographic}/u.test(ch)).length;
const symbolFor = (x, y) => (x > y ? ">" : x < y ? "<" : "=");
const digitAt = (n, place) =>
  place === "ones" ? n % 10 : place === "tens" ? Math.floor(n / 10) % 10 : Math.floor(n / 100) % 10;
/** Sum an "a + b + c" string. */
const sumExpr = (s) => numsIn(s).reduce((t, n) => t + n, 0);

const WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** Independent word-form parser: "three hundred fifteen" -> 315. */
function wordsToNumber(text) {
  const tokens = text.toLowerCase().replace(/[.,"]/g, "").split(/[\s-]+/).filter(Boolean);
  let total = 0;
  let current = 0;
  for (const token of tokens) {
    if (token === "hundred") {
      current *= 100;
      total += current;
      current = 0;
      continue;
    }
    if (!(token in WORDS)) return null;
    current += WORDS[token];
  }
  return total + current;
}

// --- per-variety verifiers -------------------------------------------------
// Each returns the answer the item SHOULD have, recomputed from the rendering.

const COUNTING = {
  subitizeDrill: (q) => q.display.count,
  bigSetWriteDrill: (q) => q.display.count,
  countScatteredSet: (q) => q.display.count,
  writeNumeralForSet: (q) => q.display.count,
  subitizeSmallSet: (q) => q.display.count,
  // Ten-frame varieties: the frame state IS the item, so the answer re-derives
  // from `filled` (and the build prompt's stated target).
  tenFrameCount: (q) => q.display.filled,
  tenFrameEmpty: (q) => 10 - q.display.filled,
  tenFrameBuild: (q) => numsIn(promptOf(q))[0],
  tenFrameMakeTen: (q) => 10 - q.display.filled,
  teenFrameCount: (q) => q.display.filled,
  arrangementInvariance: (q) => {
    const m = promptOf(q).match(/Group A: (\S+) Group B: (\S+)/);
    return glyphs(m[1]) === glyphs(m[2]) ? "Yes" : "No";
  },
  countOnFromGiven: (q) => {
    const [start, jump] = numsIn(promptOf(q));
    return start + jump;
  },
  countBackFrom: (q) => q.display.sequence[2] - 1,
  missingInCountSequence: (q) => {
    const parts = promptOf(q).replace("Fill the blank: ", "").split(", ");
    const index = parts.indexOf("___");
    const anchor = index === 0 ? Number(parts[1]) - 1 : Number(parts[index - 1]) + 1;
    return anchor;
  },
  compareTwoSets: (q) => {
    const m = promptOf(q).match(/Group A: (\S+) Group B: (\S+)/);
    return glyphs(m[1]) > glyphs(m[2]) ? "Group A" : "Group B";
  },
  countToTargetGap: (q) => {
    const [seats, kids] = numsIn(promptOf(q));
    return kids - seats;
  },
  hiddenCountSplat: (q) => {
    const [total, visible] = numsIn(promptOf(q));
    return total - visible;
  },
  estimateThenCount: (q) => {
    const beads = promptOf(q).match(/beads: (\S+) About/)[1];
    return Math.round(glyphs(beads) / 10) * 10;
  },
  oddOneOutCount: (q) => {
    const target = numsIn(promptOf(q))[0];
    // The odd option is the only one that does not show `target`.
    const odd = q.choices.filter((c) => {
      const asNumber = Number(c);
      return Number.isFinite(asNumber) && String(asNumber) === c ? asNumber !== target : glyphs(c) !== target;
    });
    expect(odd).toHaveLength(1);
    return odd[0];
  },
  errorAnalysisDoubleCount: (q) => {
    const [claimed, real] = numsIn(promptOf(q));
    expect(claimed).toBe(real + 1);
    return real;
  },
  countGroupsExtraneous: (q) => {
    const m = promptOf(q).match(/(\d+) red pens, (\d+) blue erasers, and (\d+) red pencils/);
    return Number(m[1]) + Number(m[3]);
  },
};

const SKIP = {
  midBlankDrill: (q) => {
    // Three shown terms of a 4-term run, one interior blank: the larger of
    // the two visible gaps straddles the blank.
    const nums = (q.display.promptText.match(/\d+/g) || []).map(Number);
    const d1 = nums[1] - nums[0];
    const d2 = nums[2] - nums[1];
    return d1 > d2 ? nums[0] + d2 : nums[1] + d1;
  },
  repeatedAdditionDrill: (q) => {
    const nums = (q.display.promptText.match(/\d+/g) || []).map(Number);
    return nums.reduce((s, x) => s + x, 0);
  },
  nextTermForward: (q) => q.display.sequence[2] + q.display.step,
  nextTermBackward: (q) => {
    const [x, y, z] = q.display.sequence;
    expect(y - x).toBe(z - y);
    return z + (y - x);
  },
  missingMiddleTerm: (q) => {
    const parts = promptOf(q).split(", ");
    const index = parts.indexOf("___");
    const known = parts.map(Number);
    const step = index === 1 ? known[3] - known[2] : known[1] - known[0];
    return index === 1 ? known[0] + step : known[1] + step;
  },
  missingStartTerm: (q) => {
    const [x, y] = numsIn(promptOf(q));
    return x - (y - x);
  },
  offMultipleStart: (q) => {
    const [x, y, z] = numsIn(promptOf(q));
    expect(y - x).toBe(z - y);
    return z + (y - x);
  },
  identifyRule: (q) => {
    const seq = numsIn(promptOf(q));
    return `add ${seq[1] - seq[0]}`;
  },
  membershipTrueFalse: (q) => {
    const m = promptOf(q).match(/count by (\d+)s from 0, will you say (\d+)/);
    return Number(m[2]) % Number(m[1]) === 0 ? "Yes" : "No";
  },
  groupsToTotal: (q) => {
    const [per, boxes] = numsIn(promptOf(q));
    return per * boxes;
  },
  groupsToTotalSymbolic: (q) => {
    const [groups, size] = numsIn(promptOf(q));
    return groups * size;
  },
  predictLastCount: (q) => {
    const [children, step] = numsIn(promptOf(q));
    return children * step;
  },
  oddOneOutNotMultiple: (q) => {
    const step = numsIn(promptOf(q))[0];
    const odd = q.choices.filter((c) => c % step !== 0);
    expect(odd).toHaveLength(1);
    return odd[0];
  },
  errorAnalysisSkipSlip: (q) => {
    const nums = numsIn(promptOf(q));
    const step = nums[0];
    const run = nums.slice(1);
    // The wrong term is the one that breaks the constant difference.
    const bad = run.filter((n, i) => i > 0 && n - run[i - 1] !== step);
    expect(bad.length).toBeGreaterThan(0);
    return bad[0];
  },
  choralCountColumn: (q) => {
    const text = promptOf(q);
    const step = numsIn(text)[0];
    const grid = text
      .slice(text.indexOf(":") + 1, text.indexOf("."))
      .split("/")
      .map((row) => numsIn(row));
    const target = numsIn(text.slice(text.indexOf("below")))[0];
    const r = grid.findIndex((row) => row.includes(target));
    const c = grid[r].indexOf(target);
    expect(step).toBeGreaterThan(0);
    return grid[r + 1][c];
  },
  numberLineJumps: (q) => {
    const m = promptOf(q).match(/make (\d+) jumps of (\d+)/);
    return Number(m[1]) * Number(m[2]);
  },
  // The socks/mittens/shoes ARE drawn in the prompt: counting the emoji is the
  // answer, no trust in the stated pair count needed.
  pairsOfObjects: (q) => emojiCount(promptOf(q)),
  // One hand emoji = 5 fingers, one dime emoji = 10 cents; the per-object value
  // is restated in the prompt, so it is read from there rather than assumed.
  fingersByFives: (q) => emojiCount(promptOf(q)) * numsIn(promptOf(q))[0],
  dimesToCents: (q) => emojiCount(promptOf(q)) * numsIn(promptOf(q))[0],
  countSongNext: (q) => {
    // numsIn -> [step, t1, t2, t3]; extend the sung run by its own difference.
    const run = numsIn(promptOf(q)).slice(1);
    expect(run[1] - run[0]).toBe(run[2] - run[1]);
    return run[2] + (run[1] - run[0]);
  },
  decadeCountBack: (q) => {
    // numsIn -> [10, top, top-10, top-20]; the run's own (negative) step rules.
    const run = numsIn(promptOf(q)).slice(1);
    expect(run[1] - run[0]).toBe(run[2] - run[1]);
    return run[2] + (run[1] - run[0]);
  },
  whichNotInCount: (q) => {
    const step = numsIn(promptOf(q))[0];
    const odd = q.choices.filter((c) => c % step !== 0);
    expect(odd).toHaveLength(1);
    return odd[0];
  },
  pairsStory: (q) => {
    const [pairs, perPair] = numsIn(promptOf(q));
    return pairs * perPair;
  },
  tenFrameTwos: (q) => q.display.filled,
};

const PLACE_VALUE = {
  digitsInPlace: (q) => {
    const m = promptOf(q).match(/How many (\w+) in (\d+)\?/);
    return digitAt(Number(m[2]), m[1]);
  },
  valueOfDigit: (q) => {
    const [number, digit] = numsIn(promptOf(q));
    const place = digitAt(number, "ones") === digit ? 1 : digitAt(number, "tens") === digit ? 10 : 100;
    return digit * place;
  },
  buildFromUnits: (q) => {
    const text = promptOf(q);
    const nums = numsIn(text);
    return text.includes("hundreds")
      ? nums[0] * 100 + nums[1] * 10 + nums[2]
      : nums[0] * 10 + nums[1];
  },
  standardToExpanded: (q) => {
    const number = numsIn(promptOf(q))[0];
    const correct = q.choices.filter((c) => sumExpr(c) === number);
    expect(correct).toHaveLength(1);
    return correct[0];
  },
  expandedToStandard: (q) => sumExpr(promptOf(q).replace(" = ?", "")),
  wordFormToStandard: (q) => wordsToNumber(promptOf(q).replace("Write the number: ", "")),
  nonCanonicalRename: (q) => {
    const [number, , , keptTens] = numsIn(promptOf(q));
    return number - keptTens * 10;
  },
  tenMoreTenLess: (q) => {
    const number = numsIn(promptOf(q))[1];
    return promptOf(q).includes("more than") ? number + 10 : number - 10;
  },
  crossingBoundary: (q) => numsIn(promptOf(q))[1] + 10,
  trueFalseDecomposition: (q) => {
    const [tens, ones, claimed] = numsIn(promptOf(q));
    return tens * 10 + ones === claimed ? "Yes" : "No";
  },
  oddOneOutSameValue: (q) => {
    const number = numsIn(promptOf(q))[0];
    const valueOfOption = (text) => {
      const n = numsIn(text);
      if (text.includes("hundreds") && text.includes("tens")) return n[0] * 100 + n[1] * 10;
      if (text.includes("hundreds") && text.includes("ones")) return n[0] * 100 + n[1];
      if (text.includes("tens")) return n[0] * 10;
      return sumExpr(text);
    };
    const wrong = q.choices.filter((c) => valueOfOption(c) !== number);
    expect(wrong).toHaveLength(1);
    return wrong[0];
  },
  errorAnalysisDigitReversal: (q) => {
    const words = promptOf(q).match(/"([^"]+)"/)[1];
    return wordsToNumber(words);
  },
  openMiddleBuildNumber: (q) => {
    const text = promptOf(q);
    const digits = numsIn(text.slice(0, text.indexOf("once each")));
    const sorted = [...digits].sort((a, b) => (text.includes("largest") ? b - a : a - b));
    return Number(sorted.join(""));
  },
  placeValueInContext: (q) => {
    const pencils = numsIn(promptOf(q))[1];
    return Math.floor(pencils / 10);
  },
  numberLineLocate: (q) => {
    const digit = numsIn(promptOf(q))[0];
    return digit * (promptOf(q).includes("hundreds") ? 100 : 10);
  },
  // The two frames render `filled` counters; that count IS the teen number.
  teenTenFrames: (q) => q.display.filled,
  teenTenAndOnes: (q) => numsIn(promptOf(q))[0] - 10,
  tensMakeNumber: (q) => numsIn(promptOf(q))[0] / 10,
  digitMeaning: (q) => {
    const [number, digit] = numsIn(promptOf(q));
    // The asked-about digit must actually sit in the tens place of the number.
    expect(digitAt(number, "tens")).toBe(digit);
    return digit * 10;
  },
};

const DISCS = {
  readDiscs: (q) => q.display.cols.reduce((s, c) => s + c.place * c.count, 0),
  regroupOnesToTens: (q) => q.display.cols.reduce((s, c) => s + c.place * c.count, 0),
  buildWithDiscs: (q) => {
    const number = numsIn(promptOf(q))[0];
    const place = promptOf(q).match(/many (\w+) discs/)[1];
    if (place === "thousands") return Math.floor(number / 1000) % 10;
    return digitAt(number, place);
  },
  whichChartShows: (q) => {
    const number = numsIn(promptOf(q))[0];
    const valueOf = (text) => {
      const [h, t, o] = numsIn(text);
      return h * 100 + t * 10 + o;
    };
    const right = q.choices.filter((c) => valueOf(c) === number);
    expect(right).toHaveLength(1);
    return right[0];
  },
  missingDiscCount: (q) => {
    const text = promptOf(q);
    const number = Number(text.match(/The number is (\d+)/)[1]);
    const place = text.match(/How many (\w+)\?/)[1];
    if (place === "thousands") return Math.floor(number / 1000) % 10;
    return digitAt(number, place);
  },
  renameNonCanonical: (q) => {
    const [number, tens] = numsIn(promptOf(q));
    return number - tens * 10;
  },
  tradeDownForSubtraction: (q) => {
    const [, ones] = numsIn(promptOf(q));
    return ones + 10;
  },
  predictRegroupNeeded: (q) => {
    const [a, b] = numsIn(promptOf(q));
    return (a % 10) + (b % 10) >= 10 ? "Yes" : "No";
  },
  midComputationNext: () => "Trade 10 ones for 1 ten",
  errorAnalysisNoTrade: (q) => {
    const m = promptOf(q).match(/added (\d+) \+ (\d+)/);
    return Number(m[1]) + Number(m[2]);
  },
  discsForEqualGroups: (q) => {
    const [tens, ones, times] = numsIn(promptOf(q));
    return (tens * 10 + ones) * times;
  },
  dealDiscsDivision: (q) => {
    const [tens, ones, boxes] = numsIn(promptOf(q));
    const total = tens * 10 + ones;
    expect(total % boxes).toBe(0);
    return total / boxes;
  },
  countTensDiscs: (q) => q.display.cols.reduce((s, c) => s + c.place * c.count, 0),
  whichNumberShown: (q) => {
    const [tens, ones] = numsIn(promptOf(q));
    return tens * 10 + ones;
  },
  makeNumberFromDiscs: (q) => {
    const [tens, ones] = numsIn(promptOf(q));
    return tens * 10 + ones;
  },
  oneMoreDisc: (q) => {
    const number = numsIn(promptOf(q))[0];
    return number + (/1 more tens disc/.test(promptOf(q)) ? 10 : 1);
  },
  oneLessDisc: (q) => {
    const [tens, ones] = numsIn(promptOf(q));
    return tens * 10 + ones - (/Take away 1 tens disc/.test(promptOf(q)) ? 10 : 1);
  },
  tradeTenOnesForTens: (q) => {
    // numsIn -> [total ones, 10 per trade, 1 ten received].
    const [total, perTrade] = numsIn(promptOf(q));
    expect(total % perTrade).toBe(0);
    return total / perTrade;
  },
  compareTwoMats: (q) => {
    const [t1, o1, t2, o2] = numsIn(promptOf(q));
    return t1 * 10 + o1 > t2 * 10 + o2 ? "Mat A" : "Mat B";
  },
  nextDiscCount: (q) => {
    const run = numsIn(promptOf(q));
    expect(run[1] - run[0]).toBe(run[2] - run[1]);
    return run[2] + (run[1] - run[0]);
  },
};

const BONDS = {
  wholeUnknown: (q) => {
    const [p1, p2] = numsIn(promptOf(q));
    return p1 + p2;
  },
  // The three targetedOnly drills, re-derived from the symbolic prompt.
  wholeDrill: (q) => {
    const [p1, p2] = numsIn(promptOf(q)); // "? = 4 + 5"
    return p1 + p2;
  },
  partnerDrill: (q) => {
    const [whole, part] = numsIn(promptOf(q)); // "9 = 4 + ?"
    return whole - part;
  },
  splitDrill: (q) => {
    const text = promptOf(q);
    let m = text.match(/^(\d+) = \d+ \+ \d+, so \d+ = (\d+) \+ \?$/); // pattern step
    if (m) return Number(m[1]) - Number(m[2]);
    m = text.match(/^\d+ \+ (\d+) = \d+ \+ (\d+) \+ \?$/); // make ten
    if (m) return Number(m[1]) - Number(m[2]);
    m = text.match(/^(\d+) \+ (\d+) = (\d+) \+ \?$/); // make next ten
    if (m) return Number(m[1]) + Number(m[2]) - Number(m[3]);
    return NaN;
  },
  partUnknown: (q) => q.display.whole - q.display.part,
  largeMagnitudeBond: (q) => q.display.whole - q.display.part,
  bondFromStory: (q) => {
    const [whole, part] = numsIn(promptOf(q));
    return whole - part;
  },
  openDecomposition: (q) => {
    const whole = numsIn(promptOf(q))[0];
    const right = q.display.options.filter((o) => sumExpr(o) === whole);
    expect(right).toHaveLength(2);
    return right;
  },
  factFamily: (q) => {
    const holds = (sentence) => {
      const [left, right, result] = numsIn(sentence);
      return left - right === result;
    };
    const right = q.display.options.filter(holds);
    expect(right).toHaveLength(2);
    return right;
  },
  threePartBond: (q) => {
    const [whole, p1, p2] = numsIn(promptOf(q));
    return whole - p1 - p2;
  },
  makeTenBond: (q) => {
    const [a, b, , toTen] = numsIn(promptOf(q));
    expect(a + toTen).toBe(10);
    return b - toTen;
  },
  placeValueBond: (q) => {
    const [number, hundreds, ones] = numsIn(promptOf(q));
    return number - hundreds - ones;
  },
  nonCanonicalPlaceBond: (q) => {
    const [number, part] = numsIn(promptOf(q));
    return number - part;
  },
  trueFalseBond: (q) => {
    const [whole, p1, p2] = numsIn(promptOf(q));
    return p1 + p2 === whole ? "Yes" : "No";
  },
  errorAnalysisPartWholeSwap: (q) => {
    const [whole, part] = numsIn(promptOf(q));
    return whole - part;
  },
  oddOneOutBond: (q) => {
    const whole = numsIn(promptOf(q))[0];
    const odd = q.choices.filter((c) => sumExpr(c) !== whole);
    expect(odd).toHaveLength(1);
    return odd[0];
  },
  bondSentence: (q) => {
    // "___ and part make whole" -> numsIn gives [part, whole].
    const [part, whole] = numsIn(promptOf(q));
    return whole - part;
  },
  makeTenFrameBond: (q) => 10 - q.display.filled,
  doublesBond: (q) => {
    const [x, y] = numsIn(promptOf(q));
    expect(x).toBe(y);
    return x + y;
  },
  storyWholeUnknown: (q) => {
    const [p1, p2] = numsIn(promptOf(q));
    return p1 + p2;
  },
  whichPairMakesWhole: (q) => {
    const whole = numsIn(promptOf(q))[0];
    const right = q.choices.filter((c) => sumExpr(c) === whole);
    expect(right).toHaveLength(1);
    return right[0];
  },
};

const COMPARING = {
  benchmarkDrill: (q) => symbolFor(q.a, q.b),
  symbolBetweenNumerals: (q) => symbolFor(q.a, q.b),
  compareObjectSets: (q) => {
    const m = promptOf(q).match(/Basket A: (\S+) Basket B: (\S+)/);
    return glyphs(m[1]) > glyphs(m[2]) ? "Basket A" : "Basket B";
  },
  compareExpressions: (q) => symbolFor(sumExpr(q.a), sumExpr(q.b)),
  relationalNoCompute: (q) => symbolFor(sumExpr(q.a), sumExpr(q.b)),
  compareByPlaceValue: (q) => {
    const value = (text) => {
      const [t, o] = numsIn(text);
      return t * 10 + o;
    };
    return symbolFor(value(q.a), value(q.b));
  },
  orderThreeNumbers: (q) =>
    numsIn(promptOf(q))
      .sort((a, b) => a - b)
      .join(", "),
  benchmarkCompare: (q) => {
    const [n, lower, upper] = numsIn(promptOf(q));
    return Math.abs(n - lower) < Math.abs(n - upper) ? lower : upper;
  },
  trueFalseInequality: (q) => {
    const text = promptOf(q);
    const symbol = text.match(/[<>=]/)[0];
    const [a, b] = numsIn(text);
    return symbolFor(a, b) === symbol ? "Yes" : "No";
  },
  differenceUnknown: (q) => {
    const [big, small] = numsIn(promptOf(q));
    return big - small;
  },
  compareLanguageTrap: (q) => {
    const [diff, total] = numsIn(promptOf(q));
    return total - diff;
  },
  whatCouldItBe: (q) => {
    const [lo, hi] = numsIn(promptOf(q));
    const inside = q.choices.filter((c) => c > lo && c < hi);
    expect(inside).toHaveLength(1);
    return inside[0];
  },
  openMiddleMakeItTrue: (q) => {
    const trueOnes = q.display.options.filter((s) => {
      const [a, b] = numsIn(s);
      return a < b;
    });
    expect(trueOnes).toHaveLength(2);
    return trueOnes;
  },
  errorAnalysisSymbolFlip: (q) => symbolFor(q.a, q.b),
  whichSetFewer: (q) => {
    const m = promptOf(q).match(/Tray A: (\S+) Tray B: (\S+)/);
    return glyphs(m[1]) < glyphs(m[2]) ? "Tray A" : "Tray B";
  },
  oneMoreOneLess: (q) => {
    const n = numsIn(promptOf(q))[0];
    return promptOf(q).includes("one more") ? n + 1 : n - 1;
  },
  tenFrameGapToTen: (q) => 10 - q.display.filled,
  storyWhoHasFewer: (q) => {
    const m = promptOf(q).match(/(\w+) has (\d+) \w+\. (\w+) has (\d+)/);
    return Number(m[2]) < Number(m[4]) ? m[1] : m[3];
  },
  wouldYouRather: (q) => {
    const [bagsA, perA, bagsB, perB] = numsIn(promptOf(q));
    return bagsA * perA > bagsB * perB ? `${bagsA} bags of ${perA}` : `${bagsB} bags of ${perB}`;
  },
  numberLineBetween: (q) => (q.display.min + q.display.max) / 2,
};

const VERIFIERS = {
  counting: COUNTING,
  skipCounting: SKIP,
  placeValue: PLACE_VALUE,
  placeValueDiscs: DISCS,
  numberBonds: BONDS,
  comparing: COMPARING,
};

// --- the tests -------------------------------------------------------------

describe("M4 number-sense modes: every stated answer is actually correct", () => {
  for (const [modeId, mode] of Object.entries(MODES)) {
    it(`${modeId} — answers re-derived from the rendered item`, () => {
      const seen = new Set();
      for (const level of LEVELS) {
        for (let i = 0; i < SAMPLES; i++) {
          // Formats are switched off: a format transform legitimately replaces
          // the question, and this test is about the underlying generator.
          const q = mode.generate(level, { noFormats: true });
          const varietyId = q.metadata.structureType;
          seen.add(varietyId);

          const verify = VERIFIERS[modeId][varietyId];
          expect(verify, `${modeId}: no verifier for variety ${varietyId}`).toBeTypeOf("function");

          const expected = verify(q);
          if (Array.isArray(expected)) {
            expect(new Set(q.answer.map(String)), `${modeId}/${varietyId} L${level}`).toEqual(
              new Set(expected.map(String))
            );
            // And the engine agrees the stated answer scores as correct.
            expect(checkAnswer(q, q.answer)).toBe(true);
          } else {
            expect(q.answer, `${modeId}/${varietyId} L${level}: ${promptOf(q)}`).toBe(expected);
          }
        }
      }
      // `targetedOnly` drill varieties only join the pool when the context
      // carries a family/subskill (as real session requests always do) — a
      // separate targeted pass reaches and verifies them without diluting
      // the unconditioned sampling above.
      for (const level of LEVELS) {
        for (const s of mode.subskills || []) {
          for (let i = 0; i < 3; i++) {
            const q = mode.generate(level, { noFormats: true, itemFamily: "procedural", targetSubskill: s });
            const varietyId = q.metadata.structureType;
            seen.add(varietyId);
            const verify = VERIFIERS[modeId][varietyId];
            expect(verify, `${modeId}: no verifier for variety ${varietyId}`).toBeTypeOf("function");
            const expected = verify(q);
            if (!Array.isArray(expected)) {
              expect(q.answer, `${modeId}/${varietyId} targeted L${level}`).toBe(expected);
            }
          }
        }
      }
      // Every declared variety must actually be reachable.
      expect([...mode.varieties].sort()).toEqual([...seen].sort());
    });
  }
});

describe("M4 number-sense modes: distractors are wrong and options are sound", () => {
  for (const [modeId, mode] of Object.entries(MODES)) {
    it(`${modeId} — no option set contains a second correct answer`, () => {
      for (const level of LEVELS) {
        for (let i = 0; i < SAMPLES; i++) {
          const q = mode.generate(level, { noFormats: true });
          const answerType = q.answerType || "choice";

          if (Array.isArray(q.choices)) {
            expect(new Set(q.choices).size, `${modeId} duplicate choices`).toBe(q.choices.length);
            expect(q.choices).toContain(q.answer);
            for (const choice of q.choices) {
              if (choice === q.answer) continue;
              expect(checkAnswer(q, choice), `${modeId}/${q.metadata.structureType}: ${choice}`).toBe(
                false
              );
            }
            continue;
          }

          if (answerType === "multiSelect") {
            // Any strict subset or superset must score wrong.
            const options = q.display.options;
            expect(options.length).toBeGreaterThan(q.answer.length);
            expect(checkAnswer(q, options)).toBe(false);
            expect(checkAnswer(q, [q.answer[0]])).toBe(false);
            continue;
          }

          if (answerType === "choice" && mode.generateChoices) {
            const choices = mode.generateChoices(q.answer, q);
            expect(choices, `${modeId} produced no choices`).toBeTruthy();
            expect(choices.length).toBeGreaterThanOrEqual(2);
            expect(new Set(choices).size).toBe(choices.length);
            expect(choices).toContain(q.answer);
            for (const choice of choices) {
              if (choice === q.answer) continue;
              expect(checkAnswer(q, choice)).toBe(false);
            }
          }
        }
      }
    });
  }
});

describe("M4 number-sense modes: metadata is complete and honest", () => {
  const REQUIRED = [
    "modeId",
    "gradeBand",
    "domain",
    "cluster",
    "subskill",
    "itemFamily",
    "cognitiveDemand",
    "representation",
    "blueprintId",
  ];

  for (const [modeId, mode] of Object.entries(MODES)) {
    it(`${modeId} — passes validateQuestion and tags representation accurately`, () => {
      for (const level of LEVELS) {
        for (let i = 0; i < SAMPLES; i++) {
          const q = mode.generate(level, { noFormats: true });
          const result = validateQuestion(q);
          expect(result.errors, `${modeId} L${level}`).toEqual([]);
          for (const field of REQUIRED) expect(q.metadata[field]).toBeTruthy();
          expect(mode.subskills).toContain(q.metadata.subskill);

          const rep = q.metadata.representation;
          // A symbolic item must never claim prose, and a prose item must
          // never be filed as symbolic.
          if (rep === "verbalContext") {
            expect(isVerbalPrompt(promptOf(q)), `${modeId}/${q.metadata.structureType}`).toBe(true);
          }
          if (rep === "numberLine") expect(q.answerType).toBe("numberLine");
          if (rep === "placeValueBlocks") expect(Array.isArray(q.display.cols)).toBe(true);
          if (rep === "objectSet") {
            // Countable objects must actually be on screen — in the emoji
            // payload, the prompt, or the options the child chooses between.
            const pictures = [promptOf(q), ...(q.choices || [])].join(" ");
            expect(
              Boolean(q.display.emoji) || /\p{Extended_Pictographic}/u.test(pictures),
              `${modeId}/${q.metadata.structureType}`
            ).toBe(true);
          }
          if (q.answerType === "numberLine") {
            const { min, max, step } = q.display;
            expect(q.answer).toBeGreaterThanOrEqual(min);
            expect(q.answer).toBeLessThanOrEqual(max);
            // The answer has to sit on a tick, or the child cannot tap it.
            expect((q.answer - min) % step).toBe(0);
          }
        }
      }
    });

    it(`${modeId} — declares at least 3 subskills and 8 varieties`, () => {
      expect(mode.subskills.length).toBeGreaterThanOrEqual(3);
      expect(mode.varieties.length).toBeGreaterThanOrEqual(8);
    });
  }
});

describe("M4 number-sense modes: context contract", () => {
  for (const [modeId, mode] of Object.entries(MODES)) {
    it(`${modeId} — honours varietyId, targetSubskill and allowWordProblems`, () => {
      for (const varietyId of mode.varieties) {
        const q = mode.generate(7, { varietyId, noFormats: true });
        expect(q.metadata.structureType, modeId).toBe(varietyId);
      }
      for (const subskill of mode.subskills) {
        for (const level of LEVELS) {
          const q = mode.generate(level, { targetSubskill: subskill, noFormats: true });
          expect(q.metadata.subskill, `${modeId} L${level}`).toBe(subskill);
        }
      }
      for (const level of LEVELS) {
        for (let i = 0; i < 20; i++) {
          const q = mode.generate(level, { allowWordProblems: false, noFormats: true });
          expect(q.metadata.itemFamily).not.toBe("application");
        }
      }
    });
  }
});

describe("M4 number-sense modes: format transforms stay valid", () => {
  for (const [modeId, mode] of Object.entries(MODES)) {
    it(`${modeId} — items survive maybeApplyFormat`, () => {
      const formats = new Set();
      for (const level of LEVELS) {
        for (let i = 0; i < 60; i++) {
          const q = mode.generate(level);
          expect(validateQuestion(q).errors, `${modeId} L${level}`).toEqual([]);
          if (!q.metadata.formatId) continue;
          formats.add(q.metadata.formatId);
          // A transform re-presents the item symbolically; the tag must follow.
          expect(q.metadata.representation).toBe("symbolic");
          expect(mode.supportedFormats).toContain(q.metadata.formatId);
        }
      }
      // Modes that declare formats must actually reach them.
      if (mode.supportedFormats?.length) expect(formats.size).toBeGreaterThan(0);
    });
  }
});

describe("M4 number-sense modes: difficulty varies by structure, not just size", () => {
  for (const [modeId, mode] of Object.entries(MODES)) {
    it(`${modeId} — each band offers a different mix of structures`, () => {
      const byBand = { 1: new Set(), 2: new Set(), 3: new Set() };
      for (const [band, levels] of [
        [1, [1, 2, 3]],
        [2, [4, 5, 6]],
        [3, [7, 8, 9, 10]],
      ]) {
        for (const level of levels) {
          for (let i = 0; i < 60; i++) {
            byBand[band].add(mode.generate(level, { noFormats: true }).metadata.structureType);
          }
        }
      }
      // Bands must not be the same catalog with bigger numbers. K carries the
      // fewest structures by design (the spec puts most rows at 4-6 / 7-10).
      expect(byBand[1].size).toBeGreaterThanOrEqual(2);
      expect(byBand[2].size).toBeGreaterThanOrEqual(4);
      expect(byBand[3].size).toBeGreaterThanOrEqual(5);
      const onlyInBand3 = [...byBand[3]].filter((id) => !byBand[1].has(id));
      expect(onlyInBand3.length).toBeGreaterThan(0);
    });
  }
});
