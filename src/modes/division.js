import { buildArithmeticDistractors } from "./distractors";
import { createQuestionMetadata } from "./itemMetadata";
import {
  DIVISION_STRUCTURES,
  generateMultiplicativeItem,
  deriveCognitiveDemand,
} from "./structures";

// Division draws BOTH division meanings from CCSS Table 2:
//   partitive  — "shared equally into 3 bags"  (group size unknown)
//   quotitive  — "packed 6 to a bag"           (number of groups unknown)
// The bank has 933 equal-groups-product items and 4 quotitive ones, so the
// measurement meaning has been effectively untaught.
const STRUCTURES = DIVISION_STRUCTURES;

// Kept as the mode's declared subskills so curated bank items, which are keyed
// by subskill, keep resolving. Each structure maps onto one of these.
const SUBSKILLS = ["partitioning", "inverseFact", "unknownQuotient"];

export default {
  id: "division",
  label: "Division Derby!",
  shortLabel: "Division",
  description: "Share equally and measure out groups.",
  icon: "Divide",
  op: "/",
  subskills: SUBSKILLS,
  families: ["conceptual", "procedural", "application"],
  structureTypes: STRUCTURES.map((s) => s.id),

  generate(level, context = {}) {
    const item = generateMultiplicativeItem(level, context, { pool: STRUCTURES, form: "auto" });
    const { structure, itemFamily, asStory } = item;

    const question = {
      a: item.a,
      b: item.b,
      op: "/",
      answer: item.answer,
      level,
      display: item.display,
    };

    question.metadata = createQuestionMetadata({
      modeId: "division",
      level,
      domain: "OA",
      cluster: "Multiply and divide within 100",
      subskill: structure.subskill,
      itemFamily,
      cognitiveDemand: deriveCognitiveDemand(structure, asStory),
      representation: asStory ? "verbalContext" : "symbolic",
      mathPractices: ["MP1", "MP2", "MP7"],
      standardRefs: ["3.OA", "4.OA"],
      misconceptionTags: misconceptionsFor(structure),
      blueprintId: `division-${itemFamily}-${structure.id}`,
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
  const tags = ["factNeighbor", "operationSwap", "divisionReversed"];
  if (structure.division === "quotitive") tags.push("partitiveQuotitiveConfusion");
  if (structure.situation === "multCompare") tags.push("compareAsAdditive");
  return tags;
}
