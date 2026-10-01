import addition from "./addition";
import subtraction from "./subtraction";
import multiplication from "./multiplication";
import division from "./division";
import comparing from "./comparing";
import counting from "./counting";
import skipCounting from "./skipCounting";
import placeValue from "./placeValue";
import fractions from "./fractions";
import decimals from "./decimals";
import numberBonds from "./numberBonds";
import barModels from "./barModels";
import placeValueDiscs from "./placeValueDiscs";
import factorsMultiples from "./factorsMultiples";
import areaPerimeter from "./areaPerimeter";
import money from "./money";
import patterns from "./patterns";
import measurement from "./measurement";
import time from "./time";
import dataGraphs from "./dataGraphs";
import angles from "./angles";
import linesShapes from "./linesShapes";
import fractionOps from "./fractionOps";
import decimalOps from "./decimalOps";
import volumeCoordinates from "./volumeCoordinates";
import mathFacts from "./mathFacts";

const ALL_MODES = [
  addition,
  subtraction,
  multiplication,
  division,
  comparing,
  counting,
  skipCounting,
  placeValue,
  fractions,
  decimals,
  numberBonds,
  barModels,
  placeValueDiscs,
  factorsMultiples,
  areaPerimeter,
  money,
  patterns,
  measurement,
  time,
  dataGraphs,
  angles,
  linesShapes,
  fractionOps,
  decimalOps,
  volumeCoordinates,
  mathFacts,
];

export const modeRegistry = Object.fromEntries(ALL_MODES.map((m) => [m.id, m]));

export const MODE_IDS = ALL_MODES.map((m) => m.id);

/** Topics with no v1 rows (Math Facts): hidden until their switch serves v2. */
export const V2_ONLY_MODE_IDS = ALL_MODES.filter((m) => m.v2Only).map((m) => m.id);

// Kid-facing grouping for the home page (and any future mode picker). Every
// mode must appear in exactly one group — `modeGroups.spec.js` enforces that so
// a newly registered mode can't silently go missing from the UI.
export const MODE_GROUPS = [
  {
    id: "numbers",
    title: "Counting & Numbers",
    gradeHint: "Grades 1-2",
    modeIds: ["counting", "numberBonds", "comparing", "skipCounting", "placeValue", "placeValueDiscs"],
  },
  {
    id: "addSubtract",
    title: "Add & Subtract",
    gradeHint: "Grades 1-3",
    modeIds: ["addition", "subtraction", "barModels"],
  },
  {
    id: "multiplyDivide",
    title: "Multiply & Divide",
    gradeHint: "Grades 2-4",
    modeIds: ["multiplication", "division", "factorsMultiples", "patterns"],
  },
  {
    id: "fractionsDecimals",
    title: "Fractions & Decimals",
    gradeHint: "Grades 3-5",
    modeIds: ["fractions", "decimals", "fractionOps", "decimalOps"],
  },
  {
    id: "measureMoneyTime",
    title: "Measure, Money & Time",
    gradeHint: "Grades 1-4",
    modeIds: ["measurement", "money", "time", "areaPerimeter"],
  },
  {
    id: "shapesData",
    title: "Shapes & Data",
    gradeHint: "Grades 3-5",
    modeIds: ["linesShapes", "angles", "dataGraphs", "volumeCoordinates"],
  },
  {
    // Hidden until its version switch serves its rows (useHiddenTopics).
    id: "facts",
    title: "Math Facts",
    gradeHint: "Grades K-4",
    modeIds: ["mathFacts"],
  },
];

/** MODE_GROUPS without the hidden topics, and without a group left empty. */
export function visibleModeGroups(hidden = new Set(V2_ONLY_MODE_IDS)) {
  return MODE_GROUPS.map((g) => ({ ...g, modeIds: g.modeIds.filter((id) => !hidden.has(id)) })).filter((g) => g.modeIds.length);
}

export function getModeConfig(id) {
  const mode = modeRegistry[id];
  if (!mode) throw new Error(`Unknown mode: ${id}`);
  return mode;
}
