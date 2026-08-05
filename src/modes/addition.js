import { buildArithmeticDistractors } from "./distractors";
import { createQuestionMetadata } from "./itemMetadata";
import { maybeApplyFormat } from "./formats";
import { pickContext } from "./structures";
import {
  ADDITIVE_STRUCTURES,
  generateAdditiveItem,
  deriveCognitiveDemand,
} from "./structures";
import { randInt, shuffleArray } from "./helpers";
import { bandForLevel, BANDS } from "./structures/levelPolicy";

// Addition draws the "+" half of CCSS Table 1. Both this mode and subtraction
// read from the same grid — the standards treat additive situations as one
// taxonomy, and which operation a child performs depends on where the unknown
// sits, not on which mode they opened. See docs/spec-part-ab-operations.md §A1.
const STRUCTURES = ADDITIVE_STRUCTURES.filter((s) => s.op === "+");

// Kept as the mode's declared subskills so the 3,924 curated bank items, which
// are keyed by subskill, keep resolving. Each structure maps onto one of these.
const SUPPORTED_FORMATS = ["trueFalse","equationReversed","reflexive","commutative","balanceBothSides","balanceOpen","relationalNonComputable","missingOperator","oddOneOut","twoCorrect","errorAnalysis","estimation"];

const SUBSKILLS = ["makeTen", "composeDecompose", "unknownAddend"];

export default {
  id: "addition",
  label: "Addition Acorns",
  shortLabel: "Addition",
  description: "Sums to 20",
  icon: "Plus",
  glyph: "+",
  op: "+",
  subskills: SUBSKILLS,
  supportedFormats: SUPPORTED_FORMATS,
  families: ["conceptual", "procedural", "application"],
  structureTypes: STRUCTURES.map((s) => s.id),

  generate(level, context = {}) {
    // Kindergarten's own subtype, Put Together / Both Addends Unknown
    // ("5 is 2 and 3, 1 and 4, …"), has no single-unknown rendering, so the
    // structure engine cannot emit it — it lives here as a K-band draw.
    if (bandForLevel(level) === BANDS.K && !context.varietyId && Math.random() < 0.15) {
      return bothAddendsQuestion(level, context);
    }

    const item = generateAdditiveItem(level, context, { pool: STRUCTURES });
    const { structure, itemFamily, asStory } = item;

    const question = {
      a: item.a,
      b: item.b,
      op: "+",
      answer: item.answer,
      level,
      display: item.display,
      // The two GIVEN numbers (a/b hold null for an embedded unknown) — feeds
      // the misconception distractor builders.
      distractorContext: item.givens,
    };

    // A symbolic sum has one prompt signature ("# + # = ?") no matter the
    // numbers, which lets it dominate every band's repetition budget. Re-dress
    // a share of them: two-color ten frames while sums fit a frame, and
    // spoken-number stems at any size. Same math, same metadata; only the
    // picture changes.
    if (!asStory && typeof item.a === "number" && typeof item.b === "number" && item.structure?.solveFor !== "x" && item.structure?.solveFor !== "y") {
      const dress = Math.random();
      const fitsFrames = item.answer <= 20 && bandForLevel(level) !== BANDS.G2;
      if (dress < 0.35 && fitsFrames) {
        question.answerType = "tenFrame";
        question.display = {
          filled: item.a,
          filledB: item.b,
          frames: item.answer > 10 ? 2 : 1,
          frameMode: "count",
          promptText: pick([
            "Red counters and blue counters — how many counters in all?",
            "Count all the counters in the frame. How many are there?",
            `${item.a} red and ${item.b} blue. How many counters altogether?`,
          ]),
        };
      } else if (dress < 0.6) {
        question.display = {
          promptText: pick([
            `What is ${item.a} plus ${item.b}?`,
            `Add ${item.a} and ${item.b}. What do you get?`,
            `Put ${item.a} and ${item.b} together. What number do they make?`,
            item.a === item.b ? `Double ${item.a}! What is ${item.a} plus ${item.a}?` : `${item.a} and ${item.b} more. What number is that?`,
          ]),
        };
        question.answerType = "numberPad";
      }
    } else if (
      // Missing-addend renders ("4 + ? = 9") share one signature too; spoken
      // stems keep the unknown exactly where the structure puts it. The known
      // addend and the total come from the GIVENS — a/b hold null for the
      // unknown slot and cannot phrase this prompt.
      !asStory && item.givens &&
      item.givens.a + item.answer === item.givens.b && Math.random() < 0.45
    ) {
      question.display = {
        promptText: pick([
          `${item.givens.a} plus what number makes ${item.givens.b}?`,
          `${item.givens.a} and how many more make ${item.givens.b}?`,
          `Fill it in: ${item.givens.a} plus what equals ${item.givens.b}?`,
        ]),
      };
      question.answerType = "numberPad";
    }

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
    // The GIVEN numbers for misconception strategies come from
    // distractorContext (a/b are rendered-equation slots and may hold null
    // for the unknown). The fallback keeps items persisted before that
    // change — old mistake-bank clones — building sane options.
    const givens = question.distractorContext || { a: question.a ?? 0, b: question.b ?? answer };
    return buildArithmeticDistractors({
      answer,
      a: givens.a ?? 0,
      b: givens.b ?? answer,
      misconceptions: question.metadata?.misconceptionTags || [],
      min: 0,
    });
  },
};

const pick = (arr) => arr[randInt(0, arr.length - 1)];

// Put Together / Both Addends Unknown: several decompositions are each right,
// so the child picks the PAIR — any pair summing to the whole is accepted
// (multiSelect judges against a list of acceptable sets).
function bothAddendsQuestion(level) {
  const whole = randInt(4, 10);
  // Distinct-part pairs only: duplicate option values ([3,3]) make a set-based
  // picker ambiguous.
  const pairs = [];
  for (let x = 0; x < whole - x; x += 1) pairs.push([x, whole - x]);
  const good = pick(pairs);
  // Options: the correct pair's two numbers plus two that do NOT make the whole.
  const wrongPool = shuffleArray(
    [...new Set([whole + 1, whole - 1, good[0] + 1, good[1] + 2])]
      .filter((n) => n >= 0 && n !== good[0] && n !== good[1])
  );
  const options = shuffleArray([...good, ...wrongPool.slice(0, 2)]);
  const acceptable = pairs.filter(([x, y]) => options.includes(x) && options.includes(y));

  const question = {
    a: whole,
    b: null,
    op: "+",
    answer: acceptable.length ? acceptable : [good],
    level,
    answerType: "multiSelect",
    display: {
      promptText: `Pick two numbers that make ${whole} together.`,
      options,
      requiredCount: 2,
    },
  };
  question.metadata = createQuestionMetadata({
    modeId: "addition",
    level,
    domain: "OA",
    cluster: "Add and subtract within 20 and beyond",
    subskill: "composeDecompose",
    itemFamily: "conceptual",
    cognitiveDemand: "DOK2",
    representation: "symbolic",
    mathPractices: ["MP2", "MP7"],
    standardRefs: ["K.OA.3"],
    misconceptionTags: ["offByOne"],
    blueprintId: "addition-conceptual-bothAddendsUnknown",
    structureType: "bothAddendsUnknown",
  });
  return question;
}

// Distractors should diagnose, so the tags follow the structure rather than
// being a fixed list. `startAsResult` and `keywordTrap` are what make the hard
// structures worth generating (spec §A6).
function misconceptionsFor(structure) {
  const tags = ["operationSwap", "offByOne", "placeValueSlip"];
  if (structure.solveFor === "x") tags.push("startAsResult");
  if (structure.languageTrap) tags.push("keywordTrap");
  return tags;
}
