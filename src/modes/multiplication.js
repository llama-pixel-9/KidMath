import { buildArithmeticDistractors } from "./distractors";
import { createQuestionMetadata } from "./itemMetadata";
import {
  MULTIPLICATIVE_STRUCTURES,
  generateMultiplicativeItem,
  deriveCognitiveDemand,
} from "./structures";

// Multiplication draws the unknown-product column of CCSS Table 2.
// Multiplicative compare ("3 times as much") is Grade 4 and sits in the
// difficult tier — children commonly read it additively as "3 more".
// Product-unknown structures give procedural facts (`3 x 4 = ?`); the
// missing-factor structures rendered in x-form give conceptual items
// (`3 x ? = 12`). Both are multiplicative reasoning — only the division
// *rendering* belongs to the division mode.
const STRUCTURES = MULTIPLICATIVE_STRUCTURES;

// Kept as the mode's declared subskills so curated bank items, which are keyed
// by subskill, keep resolving. Each structure maps onto one of these.
const SUBSKILLS = ["equalGroups", "arrayReasoning", "factFluency"];

export default {
  id: "multiplication",
  label: "Multiply Mania!",
  shortLabel: "Multiply",
  description: "Equal groups, arrays, and times-as-many.",
  icon: "X",
  op: "x",
  subskills: SUBSKILLS,
  families: ["conceptual", "procedural", "application"],
  structureTypes: STRUCTURES.map((s) => s.id),

  generate(level, context = {}) {
    const item = generateMultiplicativeItem(level, context, {
      pool: STRUCTURES,
      form: "missingFactor",
    });
    const { structure, itemFamily, asStory } = item;

    const question = {
      a: item.a,
      b: item.b,
      op: "x",
      answer: item.answer,
      level,
      display: item.display,
    };

    // Two-digit work is typed rather than chosen: four plausible options are
    // not a meaningful discrimination once products get large.
    if ((item.a ?? 0) >= 10 || (item.b ?? 0) >= 10) {
      question.answerType = "numberPad";
    }

    question.metadata = createQuestionMetadata({
      modeId: "multiplication",
      level,
      domain: "OA",
      cluster: "Multiply and divide within 100",
      subskill: structure.subskill,
      itemFamily,
      cognitiveDemand: deriveCognitiveDemand(structure, asStory),
      representation: asStory ? "verbalContext" : "symbolic",
      mathPractices: ["MP2", "MP7", "MP8"],
      standardRefs: ["3.OA", "4.OA"],
      misconceptionTags: misconceptionsFor(structure),
      blueprintId: `multiplication-${itemFamily}-${structure.id}`,
      structureType: structure.id,
    });
    return question;
  },

  generateChoices(answer, question) {
    return buildArithmeticDistractors({
      answer,
      a: question.a ?? 0,
      b: question.b ?? answer,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};

// Distractors should diagnose, so tags follow the structure rather than being a
// fixed list (spec §B6).
function misconceptionsFor(structure) {
  const tags = ["factNeighbor", "operationSwap", "offByOne"];
  if (structure.situation === "multCompare") tags.push("compareAsAdditive");
  return tags;
}
