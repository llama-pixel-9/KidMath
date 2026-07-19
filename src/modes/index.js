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
];

export const modeRegistry = Object.fromEntries(ALL_MODES.map((m) => [m.id, m]));

export const MODE_IDS = ALL_MODES.map((m) => m.id);

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
    gradeHint: "Grades 3-4",
    modeIds: ["fractions", "decimals"],
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
    gradeHint: "Grades 3-4",
    modeIds: ["linesShapes", "angles", "dataGraphs"],
  },
];

export function getModeConfig(id) {
  const mode = modeRegistry[id];
  if (!mode) throw new Error(`Unknown mode: ${id}`);
  return mode;
}
