import { randInt } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

// Number bonds (Math in Focus signature, Grade 1-2 foundation for +/-).
// A whole splits into two parts; one part is missing. The answer is the missing
// part (numeric), entered on the interactive bond ("cherry") diagram.

const SUBSKILLS = ["partWhole", "missingPart", "decompose"];

function wholeMax(level) {
  if (level <= 2) return 10;
  if (level <= 4) return 20;
  return 100;
}

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  // Number bonds are inherently conceptual/procedural; keep application rare and
  // only at higher levels so the "reserve application for advanced" rule holds.
  const roll = Math.random();
  if (roll < 0.5) return ITEM_FAMILIES.CONCEPTUAL;
  if (roll < 0.85 || level < 7) return ITEM_FAMILIES.PROCEDURAL;
  if (context?.allowWordProblems === false) return ITEM_FAMILIES.PROCEDURAL;
  return ITEM_FAMILIES.APPLICATION;
}

export default {
  id: "numberBonds",
  label: "Number Bonds!",
  shortLabel: "Number Bonds",
  description: "Split a whole into two parts.",
  icon: "GitFork",
  op: "bond",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill && SUBSKILLS.includes(context.targetSubskill)
      ? context.targetSubskill
      : SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];

    const whole = randInt(3, wholeMax(level));
    const part = randInt(1, whole - 1);
    const answer = whole - part;

    const promptText =
      itemFamily === ITEM_FAMILIES.APPLICATION
        ? `A team of ${whole} splits into two groups. One group has ${part}. How many in the other?`
        : `Whole is ${whole}. One part is ${part}. What is the other part?`;

    const question = {
      op: "bond",
      answer,
      answerType: "numberBond",
      level,
      display: { promptText, whole, part },
    };

    question.metadata = createQuestionMetadata({
      modeId: "numberBonds",
      level,
      domain: "OA",
      cluster: "Understand addition/subtraction via part-part-whole",
      subskill,
      itemFamily,
      cognitiveDemand: itemFamily === ITEM_FAMILIES.PROCEDURAL ? "DOK1" : "DOK2",
      representation: itemFamily === ITEM_FAMILIES.APPLICATION ? "verbalContext" : "numberBond",
      mathPractices: ["MP2", "MP7"],
      standardRefs: ["K.OA", "1.OA"],
      misconceptionTags: ["partWholeSwap", "offByOne", "countAllError"],
      blueprintId: `numberBonds-${itemFamily}-${subskill}`,
    });
    return question;
  },
};
