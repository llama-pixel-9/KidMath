/* Worksheet skills for the 21 worded topics. PURE DATA, NO IMPORTS.
 *
 * The bank is a regular grid — topic × subskill × level band, ~100 printable
 * items a cell — so a skill here is one cell (or the pictured / un-pictured
 * half of one), titled from what `npm run worksheets:audit` shows it holds.
 * Number ranges in titles are the cell's real ceilings, not the level's
 * nominal one. Not every cell is a skill: cells whose items lean on an
 * on-screen widget, or that are too thin for three sheets, are left out.
 *
 * Layouts: P prompt · S promptShort (mostly one-liners) · F figure (charts) ·
 * FS figureSmall (clock, rectangle, cubes; disc mats and grids are F). A figure layout
 * prints only the cell's pictured items; the others only its un-pictured ones.
 *
 * `ccss` may be empty: calendars, coins below grade 2 and repeating patterns
 * have no Common Core standard, and we do not invent one.
 */

const P = "prompt";
const S = "promptShort";
const F = "figure";
const FS = "figureSmall";
const BOTH = ["procedural", "conceptual"];
const B1 = [1, 3];
const B2 = [4, 6];
const B3 = [7, 10];
const B3X = [7, 12]; // the 12-level Grade 5 ladders

function cell(mode, subskill, levels, grade, ccss, title, layout, idSuffix = "", extra = {}) {
  return {
    id: `${mode}-${subskill}-${levels[0]}${idSuffix}`.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
    grade,
    mode,
    ccss: ccss ? [ccss] : [],
    title,
    layout,
    source: { kind: "bank", families: BOTH, subskills: [subskill], levels, ...extra },
    stories: { levels, subskills: [subskill] },
    level: levels[0] + 1,
  };
}

// Two mats side by side are twice the height of everything else on the sheet.
const ONE_MAT = { excludeStructureTypes: ["compareMats", "compareMatsBig", "discWorthCompare"] };

export const PROMPT_SKILLS = [
  // ── Counting ────────────────────────────────────────────────────────────
  cell("counting", "cardinality", B1, "K", "K.CC.B.5", "Count sets of objects up to 10", P),
  cell("counting", "cardinality", B2, "K", "K.CC.B.5", "Count sets of objects up to 20", P),
  cell("counting", "cardinality", B3, "1", "1.NBT.A.1", "Count larger collections in tens and ones", P),
  cell("counting", "countOn", B1, "K", "K.CC.A.2", "Count on and back: what comes next? (within 20)", P),
  cell("counting", "countOn", B2, "K", "K.CC.A.1", "Count on and back across the tens", P),
  cell("counting", "countOn", B3, "1", "1.NBT.A.1", "Count on and back past 100", P),
  cell("counting", "subitizing", B1, "K", "K.CC.B.4", "See how many at a glance (up to 10)", P),
  cell("counting", "subitizing", B2, "K", "K.NBT.A.1", "Ten and some more: see the teen numbers", P),
  cell("counting", "subitizing", B3, "1", "1.NBT.B.2", "Rows of ten: read tens and ones at a glance", P),

  // ── Comparing numbers ───────────────────────────────────────────────────
  cell("comparing", "benchmarkCompare", B1, "K", "K.CC.C.7", "Compare numbers to 5, 10 and 20", S),
  cell("comparing", "benchmarkCompare", B2, "1", "1.NBT.B.3", "Compare 2-digit numbers to 50 and the nearest ten", S),
  cell("comparing", "benchmarkCompare", B3, "2", "2.NBT.A.4", "Compare 3-digit numbers to 100 and 500", S),
  cell("comparing", "distanceCompare", B1, "K", "K.CC.C.6", "More or fewer? Compare groups and numbers to 20", P),
  cell("comparing", "distanceCompare", B2, "1", "1.NBT.B.3", "Order 2-digit numbers; 10 more and 10 less", P),
  cell("comparing", "distanceCompare", B3, "2", "2.NBT.A.4", "Order 3-digit numbers, find halfway, 10 more and 10 less", P),
  cell("comparing", "symbolSelection", B1, "1", "1.NBT.B.3", "Compare numbers to 20 with >, < and =", P),
  cell("comparing", "symbolSelection", B2, "1", "1.NBT.B.3", "Compare 2-digit numbers with >, < and =", P),
  cell("comparing", "symbolSelection", B3, "2", "2.NBT.A.4", "Compare 3-digit and larger numbers with >, < and =", P),

  // ── Skip counting ───────────────────────────────────────────────────────
  cell("skipCounting", "groupsToProduct", B1, "1", "1.OA.C.5", "Skip count equal groups: pairs, fives and tens", P),
  cell("skipCounting", "groupsToProduct", B2, "2", "2.OA.C.4", "Skip count equal groups by 2s, 3s, 4s, 5s and 10s", P),
  cell("skipCounting", "groupsToProduct", B3, "3", "3.OA.A.1", "Skip count equal groups by bigger steps", P),
  cell("skipCounting", "patternRule", B1, "1", "1.OA.C.5", "Skip-counting runs within 20: what comes next, and does it belong?", S),
  cell("skipCounting", "patternRule", B2, "2", "2.NBT.A.2", "Skip-counting runs by 3s, 4s and 5s", S),
  cell("skipCounting", "patternRule", B3, "3", "3.OA.D.9", "Skip-counting runs with bigger steps", S),
  cell("skipCounting", "stepInference", B1, "1", "1.OA.C.5", "Find the skip-counting rule and the missing number (within 20)", S),
  cell("skipCounting", "stepInference", B2, "2", "2.NBT.A.2", "Find the skip-counting rule and the missing number (3s and 4s)", S),
  cell("skipCounting", "stepInference", B3, "3", "3.OA.D.9", "Find the skip-counting rule and the missing number (bigger steps)", S),

  // ── Place value ─────────────────────────────────────────────────────────
  cell("placeValue", "tensOnes", B1, "1", "1.NBT.B.2", "Tens and ones in the teen numbers", P),
  cell("placeValue", "tensOnes", B2, "1", "1.NBT.B.2", "Tens and ones in 2-digit numbers", P),
  cell("placeValue", "tensOnes", B3, "2", "2.NBT.A.1", "Hundreds, tens and ones in 3-digit numbers", S),
  cell("placeValue", "expandedForm", B1, "K", "K.NBT.A.1", "Teen numbers as ten and some ones", S),
  cell("placeValue", "expandedForm", B2, "1", "1.NBT.B.2", "Expanded form of 2-digit numbers", P),
  cell("placeValue", "expandedForm", B3, "2", "2.NBT.A.3", "Expanded form of 3-digit numbers", P),
  cell("placeValue", "regroupingSense", B1, "1", "1.NBT.B.2", "Trade ten ones for a ten (teen numbers)", P),
  cell("placeValue", "regroupingSense", B2, "1", "1.NBT.B.2", "Rename 2-digit numbers with extra ones", P),
  cell("placeValue", "regroupingSense", B3, "2", "2.NBT.A.1", "Rename 3-digit numbers in hundreds, tens and ones", P),
  cell("placeValue", "rounding", B2, "3", "3.NBT.A.1", "Round to the nearest ten", S),
  cell("placeValue", "rounding", B3, "4", "4.NBT.A.3", "Round large numbers to the nearest hundred", P),

  // ── Number bonds ────────────────────────────────────────────────────────
  cell("numberBonds", "decompose", B1, "K", "K.OA.A.3", "Break numbers to 10 into pairs", S),
  cell("numberBonds", "decompose", B2, "1", "1.OA.C.6", "Split a number to make ten", S),
  cell("numberBonds", "decompose", B3, "2", "2.NBT.A.1", "Split numbers by place value and to the next ten", S),
  cell("numberBonds", "missingPart", B1, "K", "K.OA.A.4", "Find the missing part (wholes to 10)", S),
  cell("numberBonds", "missingPart", B2, "1", "1.OA.D.8", "Find the missing part (wholes to 20)", S),
  cell("numberBonds", "missingPart", B3, "2", "2.NBT.B.5", "Find the missing part: partners of 100 and 1000", S),
  cell("numberBonds", "partWhole", B1, "K", "K.OA.A.1", "Put two parts together (wholes to 10)", P),
  cell("numberBonds", "partWhole", B2, "1", "1.OA.A.2", "Find the whole from two or three parts", S),
  cell("numberBonds", "partWhole", B3, "2", "2.NBT.A.1", "Build the whole from hundreds, tens and ones", S),

  // ── Place value discs ───────────────────────────────────────────────────
  cell("placeValueDiscs", "readNumber", B1, "1", "1.NBT.B.2", "Read tens and ones discs on a mat", F, "", ONE_MAT),
  cell("placeValueDiscs", "readNumber", B2, "2", "2.NBT.A.1", "Read hundreds, tens and ones discs on a mat", F, "", ONE_MAT),
  cell("placeValueDiscs", "readNumber", B3, "4", "4.NBT.A.2", "Read place value discs to the thousands", F, "", ONE_MAT),
  cell("placeValueDiscs", "discOperations", B1, "1", "1.NBT.C.5", "Add or take away one disc (numbers to 20)", P),
  cell("placeValueDiscs", "discOperations", B2, "2", "2.NBT.B.8", "Add or move tens and hundreds discs", P),
  cell("placeValueDiscs", "discOperations", B3, "4", "4.NBT.A.1", "Disc moves to the thousands, and fixing a missed trade", P),
  cell("placeValueDiscs", "tradeRegroup", B1, "1", "1.NBT.B.2", "Trade ten ones discs for a tens disc", P),
  cell("placeValueDiscs", "tradeRegroup", B2, "2", "2.NBT.B.7", "Will it need a trade? Regrouping with discs", P),
  cell("placeValueDiscs", "tradeRegroup", B3, "3", "3.NBT.A.2", "Will it need a trade? Regrouping larger numbers with discs", P),

  // ── Bar models ──────────────────────────────────────────────────────────
  cell("barModels", "partWhole", B1, "1", "1.OA.A.1", "Part-whole bar models within 20", P),
  cell("barModels", "partWhole", B2, "2", "2.OA.A.1", "Part-whole bar models within 100", P),
  cell("barModels", "partWhole", B3, "3", "3.NBT.A.2", "Part-whole bar models within 1000", P),
  cell("barModels", "comparison", B1, "1", "1.OA.A.1", "Comparison bar models within 20: more and fewer", P),
  cell("barModels", "comparison", B2, "2", "2.OA.A.1", "Comparison bar models within 100: more and fewer", P),
  cell("barModels", "comparison", B3, "3", "3.NBT.A.2", "Comparison bar models within 1000: more and fewer", P),
  cell("barModels", "multiplicative", B1, "3", "3.OA.A.3", "Times-as-many bar models within 20", P),
  cell("barModels", "multiplicative", B2, "4", "4.OA.A.2", "Times-as-many bar models within 100", P),
  cell("barModels", "multiplicative", B3, "4", "4.OA.A.2", "Times-as-many bar models within 1000", P),
  cell("barModels", "fractionBar", B1, "3", "3.NF.A.1", "Fraction-of-a-bar models: wholes to 20", P),
  cell("barModels", "fractionBar", B2, "4", "4.NF.B.4", "Fraction-of-a-bar models: wholes to 100", P),
  cell("barModels", "fractionBar", B3, "5", "5.NF.B.4", "Fraction-of-a-bar models: wholes to 1000", P),

  // ── Factors & multiples ─────────────────────────────────────────────────
  cell("factorsMultiples", "factorCount", B1, "4", "4.OA.B.4", "Is it a factor? Numbers to 12", P),
  cell("factorsMultiples", "factorCount", B2, "4", "4.OA.B.4", "Is it a factor? Numbers to 30", P),
  cell("factorsMultiples", "factorCount", B3, "4", "4.OA.B.4", "Is it a factor? Numbers to 60", P),
  cell("factorsMultiples", "factorPairs", B1, "4", "4.OA.B.4", "Factor pairs of numbers to 12", P),
  cell("factorsMultiples", "factorPairs", B2, "4", "4.OA.B.4", "Factor pairs of numbers to 30", P),
  cell("factorsMultiples", "factorPairs", B3, "4", "4.OA.B.4", "Factor pairs of numbers to 60", P),
  cell("factorsMultiples", "nthMultiple", B1, "4", "4.OA.B.4", "Multiples: is it a multiple, and what comes next? (to 20)", P),
  cell("factorsMultiples", "nthMultiple", B2, "4", "4.OA.B.4", "Multiples: is it a multiple, and what comes next? (to 50)", P),
  cell("factorsMultiples", "nthMultiple", B3, "4", "4.OA.B.4", "Multiples: is it a multiple, and what comes next? (to 110)", P),
  cell("factorsMultiples", "primesAndCommon", B1, "4", "4.OA.B.4", "Prime or composite? Numbers to 17", P),
  cell("factorsMultiples", "primesAndCommon", B2, "4", "4.OA.B.4", "Prime or composite, common factors and multiples (to 30)", P),
  cell("factorsMultiples", "primesAndCommon", B3, "4", "4.OA.B.4", "Prime or composite, common factors and multiples (to 60)", P),

  // ── Patterns ────────────────────────────────────────────────────────────
  cell("patterns", "repeatingPattern", B1, "K", null, "Repeating patterns: AB and ABB", P),
  cell("patterns", "repeatingPattern", B2, "1", null, "Repeating patterns: ABC, and what sits at a position", P),
  cell("patterns", "repeatingPattern", B3, "4", "4.OA.C.5", "Repeating patterns: predict a far position", P),
  cell("patterns", "arithmeticNext", B1, "2", "2.NBT.A.2", "Growing patterns within 20: what comes next?", P),
  cell("patterns", "arithmeticNext", B2, "3", "3.OA.D.9", "Growing patterns within 100: what comes next?", P),
  cell("patterns", "arithmeticNext", B3, "4", "4.OA.C.5", "Growing patterns with 3-digit numbers: what comes next?", P),
  cell("patterns", "missingTerm", B1, "2", "2.NBT.A.2", "Find the missing number in a pattern (within 20)", P),
  cell("patterns", "missingTerm", B2, "3", "3.OA.D.9", "Find the missing number in a pattern (within 100)", P),
  cell("patterns", "missingTerm", B3, "4", "4.OA.C.5", "Find the missing number in a pattern (3-digit numbers)", P),
  cell("patterns", "patternRule", B1, "2", "2.NBT.A.2", "Name the rule of a pattern (within 20)", P),
  cell("patterns", "patternRule", B2, "3", "3.OA.D.9", "Name the rule of a pattern (within 100)", P),
  cell("patterns", "patternRule", B3, "4", "4.OA.C.5", "Name the rule of a pattern (3-digit numbers)", P),
  cell("patterns", "geometricNext", B1, "3", "3.OA.D.9", "Doubling and halving patterns within 20", P),
  cell("patterns", "geometricNext", B2, "4", "4.OA.C.5", "Multiplying patterns: add or multiply? (to about 100)", P),
  cell("patterns", "geometricNext", B3, "5", "5.OA.B.3", "Multiplying patterns: add or multiply? (to about 1000)", P),

  // ── Fractions ───────────────────────────────────────────────────────────
  cell("fractions", "partWhole", B1, "2", "2.G.A.3", "Name halves, thirds and fourths of a whole", P),
  cell("fractions", "partWhole", B2, "3", "3.NF.A.1", "Name the fraction shaded (parts to eighths)", P),
  cell("fractions", "partWhole", B3, "4", "4.NF.A.1", "Name the fraction shaded (parts to twelfths)", P),
  cell("fractions", "fractionAsNumber", B1, "3", "3.NF.A.2", "Fractions on a number line: halves, thirds and fourths", P),
  cell("fractions", "fractionAsNumber", B2, "3", "3.NF.A.2", "Fractions on a number line: up to eighths, and fractions equal to 1", P),
  cell("fractions", "fractionAsNumber", B3, "4", "4.NF.A.2", "Fractions on a number line: tenths and twelfths", P),
  cell("fractions", "compareFractions", B1, "3", "3.NF.A.3", "Compare halves, thirds and fourths", P),
  cell("fractions", "compareFractions", B2, "3", "3.NF.A.3", "Compare fractions with the same numerator or denominator (to eighths)", P),
  cell("fractions", "compareFractions", B3, "4", "4.NF.A.2", "Compare fractions to twelfths", P),
  cell("fractions", "equivalence", B1, "3", "3.NF.A.3", "Equivalent fractions: halves, thirds, fourths and their doubles", P),
  cell("fractions", "equivalence", B2, "4", "4.NF.A.1", "Equivalent fractions: scale up and down (denominators to 16)", P),
  cell("fractions", "equivalence", B3, "4", "4.NF.A.1", "Equivalent fractions: scale up and down (denominators to 30)", P),
  cell("fractions", "addLikeDenominators", B1, "4", "4.NF.B.3", "Add and subtract fractions with like denominators (to eighths)", P),
  cell("fractions", "addLikeDenominators", B2, "4", "4.NF.B.3", "Add and subtract fractions with like denominators (to sixteenths)", P),
  cell("fractions", "addLikeDenominators", B3, "4", "4.NF.B.3", "Add and subtract fractions with like denominators (to twenty-fourths)", P),
  cell("fractions", "fractionOfSet", B1, "3", "3.NF.A.1", "Find a fraction of a set (sets to 20)", P),
  cell("fractions", "fractionOfSet", B2, "4", "4.NF.B.4", "Find a fraction of a number (to 100)", P),
  cell("fractions", "fractionOfSet", B3, "5", "5.NF.B.4", "Find a fraction of a number (to 1000)", P),

  // ── Decimals ────────────────────────────────────────────────────────────
  cell("decimals", "tenthsHundredths", B1, "4", "4.NF.C.6", "Write tenths as decimals", P),
  cell("decimals", "tenthsHundredths", B2, "4", "4.NF.C.6", "Write tenths and hundredths as decimals", P),
  cell("decimals", "tenthsHundredths", B3, "5", "5.NBT.A.3", "Tenths and hundredths past 1: read, write and trailing zeros", P),
  cell("decimals", "fractionToDecimal", B1, "4", "4.NF.C.6", "Fractions with denominator 10 as decimals", P),
  cell("decimals", "fractionToDecimal", B2, "4", "4.NF.C.6", "Fractions with denominator 100 as decimals", P),
  cell("decimals", "fractionToDecimal", B3, "5", "5.NBT.A.3", "Halves, fourths, tenths and hundredths as decimals", P),
  cell("decimals", "compareDecimals", B1, "4", "4.NF.C.7", "Compare decimals: tenths against hundredths", P),
  cell("decimals", "compareDecimals", B2, "4", "4.NF.C.7", "Compare decimals less than 1", P),
  cell("decimals", "compareDecimals", B3, "5", "5.NBT.A.3", "Compare decimals greater than 1", P),
  cell("decimals", "decimalAsNumber", B1, "4", "4.NF.C.6", "Tenths on a number line from 0 to 1", P),
  cell("decimals", "decimalAsNumber", B2, "4", "4.NF.C.6", "Hundredths on a number line from 0 to 1", P),
  cell("decimals", "decimalAsNumber", B3, "5", "5.NBT.A.3", "Place decimals on a number line: which end is closer?", P),

  // ── Measurement ─────────────────────────────────────────────────────────
  cell("measurement", "compareOrder", B1, "1", "1.MD.A.1", "Order and compare lengths (to 20)", P),
  cell("measurement", "compareOrder", B2, "4", "4.MD.A.1", "Compare measures given in different units", P),
  cell("measurement", "compareOrder", B3, "5", "5.MD.A.1", "Convert, then find the longest, shortest and the difference", P),
  cell("measurement", "lengthConvert", B1, "2", "2.MD.A.4", "Which is longer, and by how much? (centimeters to 20)", P),
  cell("measurement", "lengthConvert", B2, "4", "4.MD.A.1", "Convert lengths to a smaller unit (km, m, cm, mm)", S),
  cell("measurement", "lengthConvert", B3, "5", "5.MD.A.1", "Convert lengths up and down, and add mixed units", S),
  cell("measurement", "massVolumeConvert", B1, "3", "3.MD.A.2", "Compare masses and volumes (kg, g, L, mL to 20)", P),
  cell("measurement", "massVolumeConvert", B2, "4", "4.MD.A.1", "Convert mass and volume to a smaller unit (kg to g, L to mL)", S),
  cell("measurement", "massVolumeConvert", B3, "5", "5.MD.A.1", "Convert mass and volume up and down: is there enough?", S),
  cell("measurement", "benchmarkEstimate", B1, "2", "2.MD.A.3", "Estimate a measure and pick the right unit", P),
  cell("measurement", "benchmarkEstimate", B2, "3", "3.NBT.A.1", "Round measurements to the nearest ten", P),
  cell("measurement", "benchmarkEstimate", B3, "4", "4.NBT.A.3", "Round measurements to the nearest hundred and estimate a total", P),
  cell("measurement", "multiStepMeasure", B1, "2", "2.MD.B.5", "Join and cut lengths (to 20)", P),
  cell("measurement", "multiStepMeasure", B2, "2", "2.MD.B.5", "Two-step length problems within 100", P),
  cell("measurement", "multiStepMeasure", B3, "4", "4.MD.A.2", "Mixed units: convert, then add or subtract", P),

  // ── Money ───────────────────────────────────────────────────────────────
  cell("money", "countCoins", B1, "1", null, "Count pennies, nickels and dimes (to 20 cents)", P),
  cell("money", "countCoins", B2, "2", "2.MD.C.8", "Count coins with quarters (to 80 cents)", P),
  cell("money", "countCoins", B3, "3", null, "Write cents as dollars and cents", P),
  cell("money", "coinEquivalence", B1, "1", null, "Fair trades with pennies, nickels and dimes", P),
  cell("money", "coinEquivalence", B2, "2", "2.MD.C.8", "Fair trades with quarters, and coins for an amount", P),
  cell("money", "coinEquivalence", B3, "3", null, "Fair trades with dollars, and coins for an amount", P),
  cell("money", "makeChange", B1, "1", null, "Make change within 20 cents", P),
  cell("money", "makeChange", B2, "2", "2.MD.C.8", "Make change within 50 cents", P),
  cell("money", "makeChange", B3, "3", null, "Make change from a dollar or two", P),
  cell("money", "moneyReasoning", B1, "1", null, "Is it enough? Spending within 20 cents", P),
  cell("money", "moneyReasoning", B2, "2", "2.MD.C.8", "Is it enough? Spending within a dollar", P),
  cell("money", "moneyReasoning", B3, "3", null, "Is it enough? Spending a few dollars", P),

  // ── Telling time ────────────────────────────────────────────────────────
  cell("time", "readClock", B1, "1", "1.MD.B.3", "Read a clock to the hour and half hour", F, "-pic"),
  cell("time", "readClock", B2, "2", "2.MD.C.7", "Read a clock to five minutes", FS, "-pic"),
  cell("time", "readClock", B3, "3", "3.MD.A.1", "Read a clock to the minute", FS, "-pic"),
  cell("time", "readClock", B2, "2", "2.MD.C.7", "Times to five minutes: words, digital time, nearest hour", P),
  cell("time", "readClock", B3, "3", "3.MD.A.1", "Times to the minute: digital time and minutes to the next hour", P),
  cell("time", "elapsedTime", B1, "2", "2.MD.C.7", "Elapsed time in whole hours", P),
  cell("time", "elapsedTime", B2, "3", "3.MD.A.1", "Elapsed time in minutes, within and across the hour", P),
  cell("time", "elapsedTime", B3, "3", "3.MD.A.1", "Elapsed time: find the start or the end", P),
  cell("time", "timeConcepts", B1, "1", null, "How long does it take? Minutes, hours and parts of the day", P),
  cell("time", "timeConcepts", B2, "2", "2.MD.C.7", "Hours and minutes, a.m. and p.m.", P),
  cell("time", "timeConcepts", B3, "4", "4.MD.A.1", "Convert between minutes, hours and days", P),
  cell("time", "calendar", B1, "1", null, "Days of the week", P),
  cell("time", "calendar", B2, "2", null, "Months of the year and days back on the calendar", P),
  cell("time", "calendar", B3, "3", null, "Dates: days and weeks between", P),

  // ── Graphs & data ───────────────────────────────────────────────────────
  cell("dataGraphs", "readBar", B1, "1", "1.MD.C.4", "Read a bar graph: most, fewest and how many (to 9)", F),
  cell("dataGraphs", "readBar", B2, "2", "2.MD.D.10", "Read a bar graph: most, fewest and how many (to 14)", F),
  cell("dataGraphs", "readBar", B3, "3", "3.MD.B.3", "Read a bar graph and rank its bars (to 20)", F),
  cell("dataGraphs", "compareBars", B1, "1", "1.MD.C.4", "Compare two bars: how many more? (to 9)", F),
  cell("dataGraphs", "compareBars", B2, "2", "2.MD.D.10", "Compare bars, and two bars against one (to 12)", F),
  cell("dataGraphs", "compareBars", B3, "3", "3.MD.B.3", "Compare bars, and two bars against one (to 16)", F),
  cell("dataGraphs", "dataAnalysis", B1, "1", "1.MD.C.4", "Tally charts and totals (to 20)", F),
  cell("dataGraphs", "dataAnalysis", B2, "2", "2.MD.D.10", "True statements, totals and ties on a graph", F),
  cell("dataGraphs", "dataAnalysis", B3, "3", "3.MD.B.3", "Check claims and totals on a bar graph", F),
  cell("dataGraphs", "pictograph", B1, "2", "2.MD.D.10", "Read a picture graph: one picture is one", F),
  cell("dataGraphs", "pictograph", B2, "3", "3.MD.B.3", "Read a picture graph with a key and half pictures", F),
  cell("dataGraphs", "pictograph", B3, "3", "3.MD.B.3", "Read a picture graph with a bigger key", F),

  // ── Area & perimeter ────────────────────────────────────────────────────
  cell("areaPerimeter", "area", B1, "3", "3.MD.C.6", "Area of a rectangle by counting unit squares", FS),
  cell("areaPerimeter", "area", B2, "3", "3.MD.C.7", "Area of a rectangle: multiply the sides (to 90 square units)", FS),
  cell("areaPerimeter", "area", B3, "4", "4.MD.A.3", "Area of larger rectangles (sides to 20)", FS),
  cell("areaPerimeter", "perimeter", B1, "3", "3.MD.D.8", "Perimeter of a rectangle on a grid", FS),
  cell("areaPerimeter", "perimeter", B2, "3", "3.MD.D.8", "Perimeter of a rectangle from its sides", FS),
  cell("areaPerimeter", "perimeter", B3, "4", "4.MD.A.3", "Perimeter of larger rectangles (sides to 20)", FS),
  cell("areaPerimeter", "compositeFigures", B1, "3", "3.MD.C.7", "Join and cut rectangles: areas to 20", FS),
  cell("areaPerimeter", "compositeFigures", B2, "3", "3.MD.C.7", "Join and cut rectangles: areas to 120", FS),
  cell("areaPerimeter", "compositeFigures", B3, "4", "4.MD.A.3", "Join and cut rectangles: larger areas", FS),
  cell("areaPerimeter", "measureReasoning", B1, "3", "3.MD.D.8", "Area or perimeter? Small rectangles", FS),
  cell("areaPerimeter", "measureReasoning", B2, "3", "3.MD.D.8", "Area or perimeter? Units and same-perimeter rectangles", FS),
  cell("areaPerimeter", "measureReasoning", B3, "4", "4.MD.A.3", "Area or perimeter? Larger rectangles and their units", FS),

  // ── Angles ──────────────────────────────────────────────────────────────
  cell("angles", "measureAngle", B1, "4", "4.MD.C.5", "Angles as turns: quarter, half and full turns", P),
  cell("angles", "measureAngle", B2, "4", "4.MD.C.6", "Estimate angles in degrees (benchmarks 90, 180, 360)", P),
  cell("angles", "measureAngle", B3, "4", "4.MD.C.6", "Estimate and check angle measures to 360 degrees", P),
  cell("angles", "classifyAngle", B1, "4", "4.G.A.1", "Acute, right or obtuse? Compare to a square corner", P),
  cell("angles", "classifyAngle", B2, "4", "4.G.A.1", "Acute, right, obtuse or straight? Classify by degrees", P),
  cell("angles", "classifyAngle", B3, "4", "4.G.A.1", "Check an angle's label against its degrees", P),
  cell("angles", "angleSum", B1, "4", "4.MD.C.7", "Put turns together: quarter turns and square corners", P),
  cell("angles", "angleSum", B2, "4", "4.MD.C.7", "Add two angles (totals to 100 degrees)", P),
  cell("angles", "angleSum", B3, "4", "4.MD.C.7", "Add two angles (totals to 190 degrees)", P),
  cell("angles", "missingAngle", B1, "4", "4.MD.C.7", "Missing quarter turns in a full turn", P),
  cell("angles", "missingAngle", B2, "4", "4.MD.C.7", "Find the missing angle in a right or straight angle", P),
  cell("angles", "missingAngle", B3, "4", "4.MD.C.7", "Find the missing angle in a straight angle or full turn", P),

  // ── Lines & shapes ──────────────────────────────────────────────────────
  cell("linesShapes", "shapeSides", B1, "K", "K.G.B.4", "Sides and corners of flat shapes", P),
  cell("linesShapes", "shapeSides", B2, "2", "2.G.A.1", "Sides and vertices of named polygons", P),
  cell("linesShapes", "shapeSides", B3, "3", "3.G.A.1", "Sides and vertices: octagons to decagons", P),
  cell("linesShapes", "shapeProperties", B1, "1", "1.G.A.1", "Shape riddles: equal sides and right angles", P),
  cell("linesShapes", "shapeProperties", B2, "3", "3.G.A.1", "Shape riddles: parallel sides, right angles and diagonals", P),
  cell("linesShapes", "shapeProperties", B3, "4", "4.G.A.2", "Quadrilateral riddles: sides, angles and diagonals", P),
  cell("linesShapes", "shapeClassification", B1, "2", "2.G.A.1", "Sort shapes: every rectangle, every hexagon", P),
  cell("linesShapes", "shapeClassification", B2, "3", "3.G.A.1", "Sort quadrilaterals: is every rhombus a square?", P),
  cell("linesShapes", "shapeClassification", B3, "5", "5.G.B.3", "Classify polygons in a hierarchy", P),
  cell("linesShapes", "lineFigures", B1, "K", "K.G.B.4", "Straight or curved? Parts of letters and paths", P),
  cell("linesShapes", "lineFigures", B2, "4", "4.G.A.1", "Points, lines, segments and rays", P),
  cell("linesShapes", "lineFigures", B3, "4", "4.G.A.1", "Parallel, perpendicular and intersecting lines", P),
  cell("linesShapes", "symmetryLines", B1, "4", "4.G.A.3", "Fold and match: does it have a line of symmetry?", P),
  cell("linesShapes", "symmetryLines", B2, "4", "4.G.A.3", "Count the lines of symmetry of a shape", P),
  cell("linesShapes", "symmetryLines", B3, "4", "4.G.A.3", "Compare and add lines of symmetry", P),

  // ── Fraction operations ─────────────────────────────────────────────────
  cell("fractionOps", "addSubUnlike", B1, "4", "4.NF.B.3", "Add like fractions, past one whole", S),
  cell("fractionOps", "addSubUnlike", B2, "5", "5.NF.A.1", "Add and subtract fractions with unlike denominators", S),
  cell("fractionOps", "addSubUnlike", B3X, "5", "5.NF.A.1", "Add and subtract unlike fractions: harder denominators", S),
  cell("fractionOps", "fractionOfWhole", B1, "4", "4.NF.B.4", "Multiply a fraction by a whole number (to 20)", S),
  cell("fractionOps", "fractionOfWhole", B2, "4", "4.NF.B.4", "Find a fraction of a whole number (to 48)", S),
  cell("fractionOps", "multiplyFractions", B2, "5", "5.NF.B.5", "Fraction times a whole number: bigger or smaller?", P),
  cell("fractionOps", "multiplyFractions", B3X, "5", "5.NF.B.4", "Multiply a fraction by a fraction", S),
  cell("fractionOps", "divideUnitFractions", B3X, "5", "5.NF.B.7", "Divide a whole number by a unit fraction", S),

  // ── Decimal operations ──────────────────────────────────────────────────
  cell("decimalOps", "thousandthsSense", B1, "4", "4.NF.C.6", "Tenths: what the digit counts", S),
  cell("decimalOps", "thousandthsSense", B2, "5", "5.NBT.A.3", "Place value to thousandths: which digit is worth more?", P),
  cell("decimalOps", "addSubDecimals", B1, "5", "5.NBT.B.7", "Add and subtract tenths", S),
  cell("decimalOps", "addSubDecimals", B2, "5", "5.NBT.B.7", "Add and subtract hundredths: line up the places", S),
  cell("decimalOps", "addSubDecimals", B3X, "5", "5.NBT.B.7", "Add and subtract hundredths, and estimate the sum", S),
  cell("decimalOps", "powersOfTen", B2, "5", "5.NBT.A.2", "Multiply and divide by 10 and 100", S),
  cell("decimalOps", "powersOfTen", B3X, "5", "5.NBT.A.2", "Multiply and divide decimals by 10 and 100: which way does it shift?", S),
  cell("decimalOps", "multiplyDivideDecimals", B3X, "5", "5.NBT.B.7", "Multiply and divide a decimal by a whole number", P),

  // ── Volume & coordinates ────────────────────────────────────────────────
  cell("volumeCoordinates", "countUnitCubes", B1, "5", "5.MD.C.4", "Count unit cubes in a box (to 18)", FS),
  cell("volumeCoordinates", "countUnitCubes", B2, "5", "5.MD.C.4", "Count unit cubes in layers (to 64)", FS),
  cell("volumeCoordinates", "volumeFormula", B2, "5", "5.MD.C.5", "Volume from a layer of cubes", FS, "-pic"),
  cell("volumeCoordinates", "volumeFormula", B2, "5", "5.MD.C.5", "Volume from length, width and height", P),
  cell("volumeCoordinates", "volumeFormula", B3X, "5", "5.MD.C.5", "Volume, and finding a missing dimension", P),
  cell("volumeCoordinates", "compositeAndDistance", B3X, "5", "5.MD.C.5", "Volume of an L-shape: add the two boxes", P),
  cell("volumeCoordinates", "plotAndRead", B1, "5", "5.G.A.1", "Read points on a coordinate grid (to 5)", F),
  cell("volumeCoordinates", "plotAndRead", B2, "5", "5.G.A.1", "Read points on a coordinate grid (to 9)", F),
  cell("volumeCoordinates", "plotAndRead", B3X, "5", "5.G.A.2", "Read coordinates of plotted points", F, "-pic"),
  cell("volumeCoordinates", "plotAndRead", B3X, "5", "5.OA.B.3", "Coordinate patterns: follow the rule", P),
];
