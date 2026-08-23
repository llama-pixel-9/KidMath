/**
 * Parent-language labels for engine subskill ids. The engine names subskills
 * for itself ("unknownAddend"); a parent needs "missing addend (3 + ? = 10)".
 * Anything not listed falls back to a de-camelCased version of the id so a new
 * subskill never renders as a bare identifier.
 */
const LABELS = {
  // addition / subtraction
  makeTen: "making ten",
  composeDecompose: "breaking numbers apart to add",
  unknownAddend: "missing addend (3 + ? = 10)",
  differenceAsDistance: "difference as distance",
  decomposeToSubtract: "breaking numbers apart to subtract",
  unknownSubtrahend: "missing number in subtraction",
  // multiplication / division
  equalGroups: "equal groups",
  arrayReasoning: "arrays (rows × columns)",
  factFluency: "multiplication facts",
  partitioning: "sharing into equal groups",
  inverseFact: "division as the inverse of multiplication",
  unknownQuotient: "finding the quotient",
  // comparing / counting
  symbolSelection: "using <, >, =",
  benchmarkCompare: "comparing with benchmarks",
  distanceCompare: "how far apart numbers are",
  subitizing: "seeing small amounts at a glance",
  countOn: "counting on",
  cardinality: "counting a set",
  // skip counting / patterns
  patternRule: "finding the pattern rule",
  stepInference: "finding the skip-count step",
  groupsToProduct: "groups to a total",
  repeatingPattern: "repeating patterns",
  arithmeticNext: "what comes next (adding)",
  geometricNext: "what comes next (multiplying)",
  missingTerm: "missing term in a pattern",
  // place value
  tensOnes: "tens and ones",
  expandedForm: "expanded form",
  regroupingSense: "regrouping",
  readNumber: "reading numbers from discs",
  tradeRegroup: "trading and regrouping",
  discOperations: "operations with place-value discs",
  // fractions / decimals
  partWhole: "part and whole",
  fractionAsNumber: "fractions as numbers",
  equivalence: "equivalent fractions",
  compareFractions: "comparing fractions",
  addLikeDenominators: "adding like fractions",
  fractionOfSet: "fraction of a set",
  tenthsHundredths: "tenths and hundredths",
  compareDecimals: "comparing decimals",
  fractionToDecimal: "fractions to decimals",
  decimalAsNumber: "decimals as numbers",
  // number bonds / bar models
  missingPart: "finding the missing part",
  decompose: "decomposing numbers",
  comparison: "comparison bar models",
  multiplicative: "multiplicative bar models",
  fractionBar: "fraction bar models",
  // factors
  factorCount: "counting factors",
  nthMultiple: "finding multiples",
  factorPairs: "factor pairs",
  primesAndCommon: "primes and common factors",
  // measurement / area
  area: "area",
  perimeter: "perimeter",
  compositeFigures: "composite shapes",
  measureReasoning: "reasoning about measurements",
  lengthConvert: "converting lengths",
  massVolumeConvert: "converting mass and volume",
  benchmarkEstimate: "estimating with benchmarks",
  compareOrder: "comparing and ordering measurements",
  multiStepMeasure: "multi-step measurement",
  // money / time
  countCoins: "counting coins",
  makeChange: "making change",
  coinEquivalence: "coin equivalence",
  moneyReasoning: "money word problems",
  readClock: "reading a clock",
  elapsedTime: "elapsed time",
  timeConcepts: "time concepts (a.m./p.m., minutes)",
  calendar: "the calendar",
  // graphs / angles / shapes
  readBar: "reading a bar graph",
  compareBars: "comparing bars",
  pictograph: "pictographs",
  dataAnalysis: "analyzing data",
  measureAngle: "measuring angles",
  angleSum: "angle sums",
  classifyAngle: "classifying angles",
  missingAngle: "finding a missing angle",
  shapeSides: "sides and corners",
  symmetryLines: "lines of symmetry",
  shapeProperties: "shape properties",
  shapeClassification: "classifying shapes",
  lineFigures: "lines, rays, and segments",
};

export function subskillLabel(id) {
  if (!id || id === "unknown" || id === "overall") return "general practice";
  if (LABELS[id]) return LABELS[id];
  return String(id)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}
