import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Number patterns (Grade 3-4, 4.OA.C). Arithmetic (add a step), geometric
// (multiply), and missing-term patterns. The child types the missing value
// (fillBlank), with the sequence shown.

const SUBSKILLS = ["arithmeticNext", "geometricNext", "missingTerm"];

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

    let sequence;
    let answer;
    let promptText;

    if (subskill === "geometricNext") {
      const start = randInt(1, 4);
      const factor = randInt(2, 3);
      sequence = [start, start * factor, start * factor * factor, start * factor ** 3];
      answer = start * factor ** 4;
      promptText = `Pattern: ${sequence.join(", ")}, ? — each term is ×${factor}.`;
    } else if (subskill === "missingTerm") {
      const start = randInt(1, 9);
      const step = randInt(2, level <= 6 ? 5 : 9);
      const full = [start, start + step, start + 2 * step, start + 3 * step];
      answer = full[2];
      sequence = [full[0], full[1], "?", full[3]];
      promptText = `Fill the gap: ${sequence.join(", ")}.`;
    } else {
      const start = randInt(0, 9);
      const step = randInt(2, level <= 6 ? 6 : 12);
      sequence = [start, start + step, start + 2 * step, start + 3 * step];
      answer = start + 4 * step;
      promptText = `Pattern: ${sequence.join(", ")}, ? — what comes next?`;
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
