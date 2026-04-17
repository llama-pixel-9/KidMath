import { randInt } from "./helpers";
import { buildSequenceDistractors } from "./distractors";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";

const LEVELS = [
  { step: 2, startMax: 6 },
  { step: 2, startMax: 14 },
  { step: 5, startMax: 15 },
  { step: 5, startMax: 40 },
  { step: 10, startMax: 40 },
  { step: 10, startMax: 90 },
  { step: 3, startMax: 15 },
  { step: 3, startMax: 27 },
  { step: 4, startMax: 24 },
  { step: 4, startMax: 40 },
];

const SUBSKILLS = ["patternRule", "stepInference", "groupsToProduct"];

function chooseFamily(level, context) {
  if (context?.itemFamily) return context.itemFamily;
  const roll = Math.random();
  let family;
  if (roll < 0.4) family = ITEM_FAMILIES.CONCEPTUAL;
  else if (roll < 0.72) family = ITEM_FAMILIES.PROCEDURAL;
  else family = ITEM_FAMILIES.APPLICATION;
  if (context?.allowWordProblems === false && family === ITEM_FAMILIES.APPLICATION) {
    return ITEM_FAMILIES.PROCEDURAL;
  }
  if (level < 7 && family === ITEM_FAMILIES.APPLICATION) {
    return ITEM_FAMILIES.PROCEDURAL;
  }
  return family;
}

export default {
  id: "skipCounting",
  label: "Skip Count!",
  shortLabel: "Skip Counting",
  description: "Count by 2s, 5s, 10s and more — what comes next?",
  icon: "FastForward",
  op: "skip",
  subskills: SUBSKILLS,
  families: Object.values(ITEM_FAMILIES),

  generate(level, context = {}) {
    const cfg = LEVELS[level - 1];
    const itemFamily = chooseFamily(level, context);
    const subskill = context?.targetSubskill || SUBSKILLS[randInt(0, SUBSKILLS.length - 1)];
    const startMultiple = randInt(0, Math.floor(cfg.startMax / cfg.step));
    const start = startMultiple * cfg.step;

    const seqLen = 3;
    const sequence = [];
    for (let i = 0; i < seqLen; i++) {
      sequence.push(start + cfg.step * i);
    }
    const answer = start + cfg.step * seqLen;

    const question = {
      a: null,
      b: null,
      op: "skip",
      answer,
      level,
      display: { sequence, step: cfg.step },
    };

    if (itemFamily === ITEM_FAMILIES.APPLICATION) {
      question.display.promptText = `A pattern grows by ${cfg.step}. What comes next?`;
    }

    question.metadata = createQuestionMetadata({
      modeId: "skipCounting",
      level,
      domain: "OA",
      cluster: "Gain foundations for multiplication",
      subskill,
      itemFamily,
      cognitiveDemand: "DOK2",
      representation: "sequence",
      mathPractices: ["MP1", "MP7", "MP8"],
      standardRefs: ["2.OA", "3.OA"],
      misconceptionTags: ["wrongStep", "offByOne", "patternReset"],
      blueprintId: `skipCounting-${itemFamily}-${subskill}`,
    });
    return question;
  },

  generateChoices(answer, question) {
    return buildSequenceDistractors({ answer, step: question.display.step });
  },
};
