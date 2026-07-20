import { buildArithmeticDistractors } from "./distractors";
import { createQuestionMetadata } from "./itemMetadata";
import {
  ADDITIVE_STRUCTURES,
  generateAdditiveItem,
  deriveCognitiveDemand,
} from "./structures";

// Addition draws the "+" half of CCSS Table 1. Both this mode and subtraction
// read from the same grid — the standards treat additive situations as one
// taxonomy, and which operation a child performs depends on where the unknown
// sits, not on which mode they opened. See docs/spec-part-ab-operations.md §A1.
const STRUCTURES = ADDITIVE_STRUCTURES.filter((s) => s.op === "+");

// Kept as the mode's declared subskills so the 3,924 curated bank items, which
// are keyed by subskill, keep resolving. Each structure maps onto one of these.
const SUBSKILLS = ["makeTen", "composeDecompose", "unknownAddend"];

export default {
  id: "addition",
  label: "Addition Fun!",
  shortLabel: "Addition",
  description: "Master adding numbers from 1 all the way to 50!",
  icon: "Plus",
  op: "+",
  subskills: SUBSKILLS,
  families: ["conceptual", "procedural", "application"],
  structureTypes: STRUCTURES.map((s) => s.id),

  generate(level, context = {}) {
    const item = generateAdditiveItem(level, context, { pool: STRUCTURES });
    const { structure, itemFamily, asStory } = item;

    const question = {
      a: item.a,
      b: item.b,
      op: "+",
      answer: item.answer,
      level,
      display: item.display,
    };

    question.metadata = createQuestionMetadata({
      modeId: "addition",
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
      blueprintId: `addition-${itemFamily}-${structure.id}`,
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

// Distractors should diagnose, so the tags follow the structure rather than
// being a fixed list. `startAsResult` and `keywordTrap` are what make the hard
// structures worth generating (spec §A6).
function misconceptionsFor(structure) {
  const tags = ["operationSwap", "offByOne", "placeValueSlip"];
  if (structure.solveFor === "x") tags.push("startAsResult");
  if (structure.languageTrap) tags.push("keywordTrap");
  return tags;
}
