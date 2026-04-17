import addition from "./addition";
import subtraction from "./subtraction";
import multiplication from "./multiplication";
import division from "./division";
import comparing from "./comparing";
import counting from "./counting";
import skipCounting from "./skipCounting";
import placeValue from "./placeValue";

const ALL_MODES = [
  addition,
  subtraction,
  multiplication,
  division,
  comparing,
  counting,
  skipCounting,
  placeValue,
];

export const modeRegistry = Object.fromEntries(ALL_MODES.map((m) => [m.id, m]));

export const MODE_IDS = ALL_MODES.map((m) => m.id);

export function getModeConfig(id) {
  const mode = modeRegistry[id];
  if (!mode) throw new Error(`Unknown mode: ${id}`);
  return mode;
}
