import { buildArithmeticDistractors } from "./distractors";
import { createQuestionMetadata } from "./itemMetadata";
import {
  ADDITIVE_STRUCTURES,
  generateAdditiveItem,
  deriveCognitiveDemand,
} from "./structures";

// Subtraction draws the "-" half of CCSS Table 1. Note that several of these
// structures *read* as addition (`? - 2 = 3`) — that mismatch between situation
// and solution operation is exactly what makes them the difficult tier.
const STRUCTURES = ADDITIVE_STRUCTURES.filter((s) => s.op === "-");

// Kept as the mode's declared subskills so curated bank items, which are keyed
// by subskill, keep resolving. Each structure maps onto one of these.
const SUBSKILLS = ["differenceAsDistance", "decomposeToSubtract", "unknownSubtrahend"];

export default {
  id: "subtraction",
  label: "Subtraction Quest!",
  shortLabel: "Subtraction",
  description: "Take away and find the difference.",
  icon: "Minus",
  op: "-",
  subskills: SUBSKILLS,
  families: ["conceptual", "procedural", "application"],
  structureTypes: STRUCTURES.map((s) => s.id),

  generate(level, context = {}) {
    const item = generateAdditiveItem(level, context, { pool: STRUCTURES });
    const { structure, itemFamily, asStory } = item;

    const question = {
      a: item.a,
      b: item.b,
      op: "-",
      answer: item.answer,
      level,
      display: item.display,
    };

    question.metadata = createQuestionMetadata({
      modeId: "subtraction",
      level,
      domain: "OA",
      cluster: "Add and subtract within 20 and beyond",
      subskill: structure.subskill,
      itemFamily,
      cognitiveDemand: deriveCognitiveDemand(structure, asStory),
      representation: asStory ? "verbalContext" : "symbolic",
      mathPractices: ["MP1", "MP2", "MP7"],
      standardRefs: ["K.OA", "1.OA", "2.OA"],
      misconceptionTags: misconceptionsFor(structure),
      blueprintId: `subtraction-${itemFamily}-${structure.id}`,
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
// fixed list (spec §A6).
function misconceptionsFor(structure) {
  const tags = ["operationSwap", "offByOne", "placeValueSlip"];
  if (structure.solveFor === "z") tags.push("startAsResult");
  if (structure.languageTrap) tags.push("keywordTrap");
  return tags;
}
