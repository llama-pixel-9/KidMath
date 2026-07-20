import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Number patterns (Grade 3-4, 4.OA.C). Arithmetic (add a step), geometric
// (multiply), and missing-term patterns. The child types the missing value
// (fillBlank), with the sequence shown.

const SUBSKILLS = ["arithmeticNext", "geometricNext", "missingTerm"];

// Application contexts: a named actor plus a concrete repeated-quantity setting.
// Each entry builds the full word problem from the sequence and step.
const CONTEXTS = [
  (seq) => `Mina stacks books in the library cart: ${seq}. How many books in the next stack?`,
  (seq) => `Sam plants seeds in garden rows: ${seq}. How many seeds go in the next row?`,
  (seq) => `Luca counts apples packed per crate: ${seq}. How many apples in the next crate?`,
  (seq) => `Nia lines up chairs for each class: ${seq}. How many chairs for the next class?`,
];

const GAP_CONTEXTS = [
  (seq) => `Theo tracks laps run each week: ${seq}. How many laps in the missing week?`,
  (seq) => `Ava records shells found each day: ${seq}. How many shells on the missing day?`,
  (seq) => `Sam counts stickers earned each round: ${seq}. How many stickers in the missing round?`,
];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  if (roll < 0.4) return ITEM_FAMILIES.CONCEPTUAL;
  if (roll < 0.72 || level < 7) return ITEM_FAMILIES.PROCEDURAL;
  if (context?.allowWordProblems === false) return ITEM_FAMILIES.PROCEDURAL;
  return ITEM_FAMILIES.APPLICATION;
}

export default {
  id: "patterns",
  label: "Pattern Power!",
  shortLabel: "Patterns",
  description: "Find what comes next in the pattern.",
  icon: "Spline",
  op: "pattern",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];

    const isApplication = itemFamily === ITEM_FAMILIES.APPLICATION;
    let sequence;
    let answer;
    let promptText;

    if (subskill === "geometricNext") {
      const start = randInt(1, 4);
      const factor = randInt(2, 3);
      sequence = [start, start * factor, start * factor * factor, start * factor ** 3];
      answer = start * factor ** 4;
      promptText = isApplication
        ? CONTEXTS[randInt(0, CONTEXTS.length - 1)](sequence.join(", "))
        : `Pattern: ${sequence.join(", ")}, ? — each term is ×${factor}.`;
    } else if (subskill === "missingTerm") {
      const start = randInt(1, 9);
      const step = randInt(2, level <= 6 ? 5 : 9);
      const full = [start, start + step, start + 2 * step, start + 3 * step];
      answer = full[2];
      sequence = [full[0], full[1], "?", full[3]];
      promptText = isApplication
        ? GAP_CONTEXTS[randInt(0, GAP_CONTEXTS.length - 1)](sequence.join(", "))
        : `Fill the gap: ${sequence.join(", ")}.`;
    } else {
      const start = randInt(0, 9);
      const step = randInt(2, level <= 6 ? 6 : 12);
      sequence = [start, start + step, start + 2 * step, start + 3 * step];
      answer = start + 4 * step;
      promptText = isApplication
        ? CONTEXTS[randInt(0, CONTEXTS.length - 1)](sequence.join(", "))
        : `Pattern: ${sequence.join(", ")}, ? — what comes next?`;
    }

    const question = {
      op: "pattern",
      answer,
      answerType: "fillBlank",
      level,
      display: { promptText, sequence },
    };

    question.metadata = createQuestionMetadata({
      modeId: "patterns",
      level,
      domain: "OA",
      cluster: "Generate and analyze patterns",
      subskill,
      itemFamily,
      cognitiveDemand: "DOK2",
      representation: "sequence",
      mathPractices: ["MP7", "MP8"],
      standardRefs: ["4.OA"],
      misconceptionTags: ["wrongStep", "patternReset", "offByOne"],
      blueprintId: `patterns-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
