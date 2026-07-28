import { buildArithmeticDistractors } from "./distractors";
import { randInt } from "./helpers";
import { createQuestionMetadata } from "./itemMetadata";
import { maybeApplyFormat } from "./formats";
import { pickContext } from "./structures";
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
const SUPPORTED_FORMATS = ["trueFalse","equationReversed","missingOperator","factFamily","errorAnalysis"];

const SUBSKILLS = ["partitioning", "inverseFact", "unknownQuotient"];

export default {
  id: "division",
  label: "Division Derby!",
  shortLabel: "Division",
  description: "Share equally and measure out groups.",
  icon: "Divide",
  op: "/",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
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

    // Re-dress a share of plain-quotient renders: the bare "# ÷ # = ?" and
    // "# x ? = #" signatures otherwise dominate the small entry band. The
    // partitive and quotitive spoken stems are deliberately both present —
    // "shared into" vs "how many #s in" IS the structural distinction.
    if (!asStory && typeof item.a === "number" && typeof item.b === "number" && item.a * item.answer === item.b && Math.random() < 0.5) {
      // The x-form render ("3 x ? = 12") gets its own spoken stems.
      question.display = {
        promptText: ((arr) => arr[randInt(0, arr.length - 1)])([
          `${item.a} groups of what number make ${item.b}?`,
          `${item.a} times some number is ${item.b}. What is the number?`,
        ]),
      };
      question.answerType = "numberPad";
    } else if (!asStory && typeof item.a === "number" && typeof item.b === "number" && item.b !== 0 && item.a / item.b === item.answer && Math.random() < 0.6) {
      question.display = {
        promptText: ((arr) => arr[randInt(0, arr.length - 1)])([
          `What is ${item.a} divided by ${item.b}?`,
          `${item.a} shared into ${item.b} equal groups — how many are in each group?`,
          `How many ${item.b}s are in ${item.a}?`,
          `Split ${item.a} into groups of ${item.b}. How many groups do you get?`,
        ]),
      };
      question.answerType = "numberPad";
    }

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

    // Same mathematics, asked another way (M3). Story items are left alone —
    // turning prose into an equation discards the context.
    return maybeApplyFormat(
      question,
      level,
      { actor: pickContext().actor, ...context },
      SUPPORTED_FORMATS
    );
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
