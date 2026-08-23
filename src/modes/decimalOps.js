import { randInt, shuffleArray } from "./helpers";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";

/**
 * decimalOps — Grade 5 decimal arithmetic (5.NBT). The `decimals` mode (4)
 * owns meaning and comparison; this ladder owns computation:
 *
 *   band 1 (L1-3)  bridge: tenths ± tenths, place value to thousandths
 *   band 2 (L4-6)  hundredths ± (5.NBT.7), × and ÷ by 10 / 100 (5.NBT.2)
 *   band 3 (L7-10) decimal × whole, decimal ÷ whole, money-style two-step
 *
 * All computation is done in integer tenths/hundredths and divided back, so
 * answers are exact; typed answers use the existing `decimal` widget.
 */

const { PROCEDURAL, CONCEPTUAL, APPLICATION } = ITEM_FAMILIES;

const SUBSKILLS = ["addSubDecimals", "powersOfTen", "multiplyDivideDecimals", "thousandthsSense"];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandOf = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);
const dec1 = (tenths) => (tenths / 10).toFixed(1);
const dec2 = (hundredths) => (hundredths / 100).toFixed(2);

const NAMES = ["Maya", "Leo", "Priya", "Omar", "Zoe", "Kai", "Nora", "Diego", "Rosa", "Finn", "Ida", "Luca", "Amara", "Theo", "Nia", "Ben", "June"];
const ITEMS = [
  ["juice bottle", "liters"],
  ["walking trail", "kilometers"],
  ["package", "kilograms"],
  ["plank", "meters"],
];

const VARIETIES = [
  // ---- band 1: tenths ± tenths, thousandths place sense -------------------
  {
    id: "tenthsAdd",
    bands: [1],
    family: PROCEDURAL,
    subskills: ["addSubDecimals"],
    build() {
      const a = randInt(1, 9);
      const b = randInt(1, 9);
      const sub = Math.random() < 0.4 && a > b;
      return {
        answer: sub ? dec1(a - b) : dec1(a + b),
        answerType: "decimal",
        promptText: sub ? `${dec1(a)} − ${dec1(b)} = ?` : `${dec1(a)} + ${dec1(b)} = ?`,
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["ignoresDecimalPoint"],
      };
    },
  },
  {
    id: "thousandthsPlace",
    bands: [2],
    family: PROCEDURAL,
    subskills: ["thousandthsSense"],
    build() {
      const digits = [randInt(1, 9), randInt(0, 9), randInt(0, 9), randInt(1, 9)];
      const n = `${digits[0]}.${digits[1]}${digits[2]}${digits[3]}`;
      const places = ["tenths", "hundredths", "thousandths"];
      const idx = randInt(0, 2);
      return {
        answer: digits[idx + 1],
        answerType: "numberPad",
        promptText: pick([
          `In ${n}, which digit is in the ${places[idx]} place?`,
          `Look at ${n}. What digit sits in the ${places[idx]} place?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["placeValueSlip"],
      };
    },
  },
  {
    id: "tenthsAsDecimal",
    bands: [1],
    family: PROCEDURAL,
    subskills: ["thousandthsSense"],
    build() {
      const t = randInt(1, 9);
      return {
        answer: dec1(t),
        answerType: "decimal",
        promptText: pick([
          `Write ${t} tenths as a decimal.`,
          `${t} tenths = ?`,
          `As a decimal, ${t} tenths is what?`,
          `Type ${t} tenths as a decimal number.`,
          `A strip has ${t} of its 10 parts shaded. Write that as a decimal.`,
          `${t} out of 10 equal parts — write it as a decimal.`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["placeValueSlip"],
      };
    },
  },
  {
    id: "tenthsMeaningPick",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["thousandthsSense"],
    build() {
      const t = randInt(1, 9);
      return {
        answer: "tenths",
        answerType: "choice",
        choices: shuffleArray(["tenths", "ones", "hundredths"]),
        promptText: pick([
          `In 0.${t}, the ${t} counts which kind of piece?`,
          `The ${t} in 0.${t} stands for ${t} of what?`,
          `What does the ${t} count in the number 0.${t}?`,
          `0.${t} means ${t} pieces of which size?`,
          `Look at 0.${t}. The digit ${t} is counting what?`,
          `Which piece does the ${t} in 0.${t} measure?`,
          `0.${t} is ${t} of which equal part of one whole?`,
          `The number 0.${t} counts ${t} of what kind of part?`,
          `In the decimal 0.${t}, what size piece does ${t} count?`,
          `Reading 0.${t}: the ${t} tells how many of which piece?`,
          `A whole cut into 10 parts — 0.${t} counts ${t} of them. Which parts are they?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["placeValueSlip"],
      };
    },
  },
  {
    id: "tenthsJudged",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["addSubDecimals"],
    build() {
      const a = randInt(2, 9);
      const b = randInt(1, 9);
      const wrong = Math.random() < 0.5;
      const claim = wrong ? dec1(a + b + 1) : dec1(a + b);
      return {
        answer: wrong ? "No" : "Yes",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: pick([
          (k) => `${k} says ${dec1(a)} + ${dec1(b)} = ${claim}. Is that right?`,
          (k) => `${k} adds ${dec1(a)} and ${dec1(b)} and writes ${claim}. Is ${k} right?`,
          (k) => `${k} works out ${dec1(a)} + ${dec1(b)} = ${claim}. Do you agree?`,
        ])(pick(NAMES)),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["ignoresDecimalPoint"],
      };
    },
  },
  {
    id: "tenthsMissingAddend",
    bands: [1],
    family: PROCEDURAL,
    subskills: ["addSubDecimals"],
    build() {
      const total = randInt(5, 18);
      const known = randInt(1, total - 1);
      return {
        answer: dec1(total - known),
        answerType: "decimal",
        promptText: pick([
          `${dec1(known)} + ? = ${dec1(total)}`,
          `Fill the blank: ${dec1(known)} + ? = ${dec1(total)}.`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["ignoresDecimalPoint"],
      };
    },
  },
  {
    id: "tenthsSequence",
    bands: [1],
    family: PROCEDURAL,
    subskills: ["thousandthsSense"],
    build() {
      const step = pick([1, 2, 3]);
      const down = Math.random() < 0.4;
      const span = 3 * step;
      const start = down ? randInt(span + 1, 9 + span > 18 ? 18 : 9 + Math.min(span, 9)) : randInt(1, Math.max(1, 15 - span));
      const dir = down ? -step : step;
      const seq = [start, start + dir, start + 2 * dir];
      return {
        answer: dec1(start + 3 * dir),
        answerType: "decimal",
        promptText: `${seq.map(dec1).join(", ")}, ?`,
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["ignoresDecimalPoint"],
      };
    },
  },
  {
    id: "wholePlusTenthsPick",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["addSubDecimals"],
    build() {
      const w = randInt(1, 6);
      const t = randInt(1, 9);
      const answer = `${w}.${t}`;
      const traps = [`${w + t}`, `${w}.${t}${t}`, `${t}.${w}`].filter((x) => x !== answer);
      return {
        answer,
        answerType: "choice",
        choices: shuffleArray([answer, ...new Set(traps)].slice(0, 4)),
        promptText: pick([
          `Which number is ${w} + ${t} tenths?`,
          `${w} wholes and ${t} tenths make which number?`,
          `Put together ${w} ones and ${t} tenths. Which number is that?`,
          `${t} tenths added to ${w} gives which number?`,
          `Which of these equals ${w} and ${t} tenths?`,
          `Build the number from ${w} wholes plus ${t} tenths. Which is it?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["ignoresDecimalPoint"],
      };
    },
  },
  {
    id: "decimalLabelJudged",
    bands: [1, 2],
    family: APPLICATION,
    subskills: ["thousandthsSense"],
    build() {
      const t = randInt(1, 9);
      let w = randInt(1, 9);
      if (w === t) w = (w % 9) + 1;
      const real = `${w}.${t}`;
      const wrong = Math.random() < 0.5;
      const claim = wrong ? `${t}.${w}` : real;
      const name = pick(NAMES);
      const thing = pick([["jump", "meters"], ["ribbon", "meters"], ["bottle", "liters"], ["hike", "kilometers"]]);
      return {
        answer: claim === real ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: pick([
          `${name}'s ${thing[0]} measures ${w} and ${t} tenths ${thing[1]}. ${name} writes it as ${claim}. Is that right?`,
          `The ${thing[0]} is ${w} ${thing[1]} plus ${t} tenths more. ${name} records ${claim}. Is ${name} right?`,
          `${name} measures ${w} and ${t} tenths ${thing[1]} and writes down ${claim}. Do you agree?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["placeValueSlip"],
      };
    },
  },
  {
    id: "placeWorthJudged",
    bands: [2],
    family: CONCEPTUAL,
    subskills: ["thousandthsSense"],
    build() {
      const tens = randInt(1, 9);
      let hund = randInt(1, 9);
      if (hund === tens) hund = (hund % 9) + 1;
      const n = `0.${tens}${hund}`;
      const claimBigger = Math.random() < 0.5 ? tens : hund;
      const truth = claimBigger === tens;
      return {
        answer: truth ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: pick([
          (nm) => `${nm} says the ${claimBigger} in ${n} is worth more than the other digit. Is that right?`,
          (nm) => `In ${n}, ${nm} claims the digit ${claimBigger} carries the bigger value. Do you agree?`,
          (nm) => `${nm} points at the ${claimBigger} in ${n} and calls it the more valuable digit. Is ${nm} right?`,
        ])(pick(NAMES)),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["placeValueSlip"],
      };
    },
  },
  {
    id: "scaleStory",
    bands: [2, 3],
    family: APPLICATION,
    subskills: ["powersOfTen"],
    build() {
      const tenths = randInt(11, 89);
      const n = tenths / 100;
      const factor = pick([10, 100]);
      const name = pick(NAMES);
      return {
        answer: String((tenths * factor) / 100),
        answerType: "decimal",
        promptText: pick([
          `A photo ${n} meters wide is printed ${factor} times wider. How many meters wide is the print?`,
          `${name}'s model bridge is ${n} meters long. The real bridge is ${factor} times longer. How many meters long is the real bridge?`,
          `A seedling is ${n} meters tall and the full tree grows ${factor} times as tall. How many meters tall is the tree?`,
          `${name} zooms a ${n}-meter drawing to ${factor} times its size. How many meters wide is the zoomed drawing?`,
          `One lap is ${n} kilometers. ${name} plans ${factor} laps. How many kilometers is the plan?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsZerosInstead"],
      };
    },
  },
  {
    id: "receiptStoryTenths",
    bands: [1, 2],
    family: APPLICATION,
    subskills: ["addSubDecimals"],
    build(level) {
      if (bandOf(level) === 1) {
        // K-band magnitudes: tenths only, every stated number ≤ 20.
        const a = randInt(1, 9);
        const b = randInt(1, 9);
        const name = pick(NAMES);
        return {
          answer: dec1(a + b),
          answerType: "decimal",
          promptText: pick([
            `${name} pours ${dec1(a)} of a liter of water, then ${dec1(b)} of a liter more. How many liters of water is that?`,
            `${name} walks ${dec1(a)} of a kilometer and then ${dec1(b)} of a kilometer. How many kilometers does ${name} walk?`,
            `A jug holds ${dec1(a)} liters and a bottle holds ${dec1(b)} liters. How many liters do they hold together?`,
            `${name} uses ${dec1(a)} meters of tape and ${dec1(b)} meters more. How many meters of tape is that?`,
          ]),
          representation: "verbalContext",
          cognitiveDemand: "DOK2",
          misconceptionTags: ["ignoresDecimalPoint"],
        };
      }
      const a = randInt(11, 89);
      const b = randInt(11, 89);
      const name = pick(NAMES);
      return {
        answer: dec2(a + b),
        answerType: "decimal",
        promptText: pick([
          `${name} buys a snack for $${dec2(a)} and a drink for $${dec2(b)}. How many dollars does ${name} spend in all?`,
          `${name} spends $${dec2(a)} on stickers and $${dec2(b)} on a pencil. What is the total in dollars?`,
          `A comic costs $${dec2(a)} and a bookmark costs $${dec2(b)}. ${name} buys both. How many dollars is that?`,
          `${name} pays $${dec2(a)} for fruit and $${dec2(b)} for juice. What is ${name}'s total in dollars?`,
          `Two prizes cost $${dec2(a)} and $${dec2(b)}. How many dollars do they cost together?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["ignoresDecimalPoint"],
      };
    },
  },

  // ---- band 2: hundredths ± (5.NBT.7), powers of ten (5.NBT.2) ------------
  {
    id: "hundredthsAddSub",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["addSubDecimals"],
    build() {
      const a = randInt(15, 880);
      const b = randInt(15, 880);
      const sub = Math.random() < 0.5 && a > b;
      return {
        answer: sub ? dec2(a - b) : dec2(a + b),
        answerType: "decimal",
        promptText: sub ? `${dec2(a)} − ${dec2(b)} = ?` : `${dec2(a)} + ${dec2(b)} = ?`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["misalignsPlaces"],
      };
    },
  },
  {
    id: "powersOfTenShift",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["powersOfTen"],
    build() {
      const hundredths = randInt(11, 89) * (Math.random() < 0.5 ? 1 : 10);
      const n = hundredths / 100;
      const factor = pick([10, 100]);
      const mul = Math.random() < 0.5;
      const answer = mul ? (hundredths * factor) / 100 : hundredths / factor / 100;
      return {
        answer: String(answer),
        answerType: "decimal",
        promptText: mul ? `${n} × ${factor} = ?` : `${n} ÷ ${factor} = ?`,
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["addsZerosInstead"],
      };
    },
  },
  {
    id: "shiftDirectionJudged",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["powersOfTen"],
    build() {
      const n = randInt(11, 89) / 10;
      const mul = Math.random() < 0.5;
      const claimGrows = Math.random() < 0.5;
      const truth = mul === claimGrows;
      return {
        answer: truth ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: `${pick(NAMES)} says ${n} ${mul ? "×" : "÷"} 10 gives a ${claimGrows ? "bigger" : "smaller"} number. Is that right?`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsZerosInstead"],
      };
    },
  },
  {
    id: "alignPlacesPick",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["addSubDecimals"],
    build() {
      // Exact sum among place-value traps; wrongs are built by construction
      // and deduped against the answer.
      const aH = randInt(11, 79); // hundredths
      const bH = randInt(21, 99);
      const sumH = aH + bH;
      const answer = dec2(sumH);
      const traps = [
        dec2(sumH * 10), // decimal point slipped one place
        dec2(Math.max(1, sumH - 90)), // misaligned tenths/hundredths column
        dec2(aH + bH * 10), // added a tenth as a hundredth
        dec2(sumH + 100), // whole off by one
      ].filter((t) => t !== answer);
      return {
        answer,
        answerType: "choice",
        choices: shuffleArray([answer, ...new Set(traps)].slice(0, 4)),
        promptText: pick([
          `Which is exactly ${dec2(aH)} + ${dec2(bH)}?`,
          `Add ${dec2(aH)} and ${dec2(bH)}. Which total is right?`,
          `Line up the places: ${dec2(aH)} + ${dec2(bH)} equals which of these?`,
          `${dec2(aH)} + ${dec2(bH)} — pick the correct sum.`,
          `One of these is the true sum of ${dec2(aH)} and ${dec2(bH)}. Which one?`,
          `Careful with the decimal points: what is ${dec2(aH)} + ${dec2(bH)}?`,
          `${dec2(aH)} plus ${dec2(bH)} comes to which amount?`,
          `Stack ${dec2(aH)} over ${dec2(bH)} and add. Which answer is right?`,
          `The exact total of ${dec2(aH)} and ${dec2(bH)} is which one?`,
          `Choose the true sum: ${dec2(aH)} + ${dec2(bH)}.`,
          `Adding ${dec2(aH)} and ${dec2(bH)} gives which of these?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["misalignsPlaces"],
      };
    },
  },
  {
    // Band 3 gets its own conceptual add/sub shape (alignPlacesPick's phrasing
    // capacity is shared across bands by the signature cells).
    id: "sumSizeJudged",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["addSubDecimals"],
    build() {
      const aH = randInt(105, 480);
      const bH = randInt(105, 480);
      const sum = (aH + bH) / 100;
      const bench = Math.random() < 0.5 ? Math.ceil(sum) : Math.floor(sum);
      const claimMore = Math.random() < 0.5;
      const truth = claimMore ? sum > bench : sum < bench;
      return {
        answer: truth ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: pick([
          (nm) => `${nm} says ${dec2(aH)} + ${dec2(bH)} is ${claimMore ? "more" : "less"} than ${bench}. Is that right?`,
          (nm) => `Without working it out fully, ${nm} claims ${dec2(aH)} + ${dec2(bH)} ${claimMore ? "passes" : "stays under"} ${bench}. Is ${nm} right?`,
          (nm) => `${nm} estimates that ${dec2(aH)} plus ${dec2(bH)} is ${claimMore ? "over" : "under"} ${bench}. Do you agree?`,
        ])(pick(NAMES)),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["misalignsPlaces"],
      };
    },
  },
  {
    id: "measureStoryHundredths",
    bands: [2, 3],
    family: APPLICATION,
    subskills: ["addSubDecimals"],
    build() {
      const a = randInt(105, 480);
      const b = randInt(55, 320);
      const [thing, unit] = pick(ITEMS);
      const name = pick(NAMES);
      const sub = Math.random() < 0.5 && a > b;
      return {
        answer: dec2(sub ? a - b : a + b),
        answerType: "decimal",
        promptText: sub
          ? `A ${thing} held ${dec2(a)} ${unit}. ${name} used ${dec2(b)} ${unit}. How many ${unit} are left?`
          : `${name} measures ${dec2(a)} ${unit} and then ${dec2(b)} ${unit} more. How many ${unit} is that in all?`,
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["misalignsPlaces"],
      };
    },
  },

  // ---- band 3: decimal × / ÷ whole (5.NBT.7) ------------------------------
  {
    id: "decimalTimesWhole",
    bands: [3],
    family: PROCEDURAL,
    subskills: ["multiplyDivideDecimals"],
    build() {
      const tenths = randInt(11, 49);
      const k = randInt(2, 6);
      return {
        answer: dec2(tenths * k),
        answerType: "decimal",
        promptText: pick([
          `${dec2(tenths)} × ${k} = ?`,
          `Multiply ${dec2(tenths)} by ${k}. What do you get?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["ignoresDecimalPoint"],
      };
    },
  },
  {
    id: "decimalDivideWhole",
    bands: [3],
    family: PROCEDURAL,
    subskills: ["multiplyDivideDecimals"],
    build() {
      const k = randInt(2, 6);
      const share = randInt(11, 99);
      const total = share * k;
      return {
        answer: dec2(share),
        answerType: "decimal",
        promptText: pick([
          `${dec2(total)} ÷ ${k} = ?`,
          `Split ${dec2(total)} into ${k} equal parts. How big is one part?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["ignoresDecimalPoint"],
      };
    },
  },
  {
    id: "productPlacementJudged",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["multiplyDivideDecimals"],
    build() {
      const tenths = randInt(11, 49);
      const k = randInt(2, 6);
      const real = tenths * k; // hundredths
      const wrong = Math.random() < 0.5;
      const claim = wrong ? dec2(real * 10) : dec2(real);
      return {
        answer: wrong ? "No" : "Yes",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: pick([
          (nm) => `${nm} works out ${dec2(tenths)} × ${k} = ${claim}. Is the decimal point in the right place?`,
          (nm) => `${nm} multiplies ${dec2(tenths)} by ${k} and writes ${claim}. Is that right?`,
          (nm) => `${nm} gets ${claim} for ${dec2(tenths)} × ${k}. Do you agree with the answer?`,
        ])(pick(NAMES)),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["ignoresDecimalPoint"],
      };
    },
  },
  {
    id: "moneyStoryTwoStep",
    bands: [3],
    family: APPLICATION,
    subskills: ["multiplyDivideDecimals"],
    build() {
      const price = randInt(105, 399); // cents
      const k = randInt(2, 4);
      const pay = Math.ceil((price * k) / 500) * 500;
      const name = pick(NAMES);
      return {
        answer: dec2(pay - price * k),
        answerType: "decimal",
        promptText: pick([
          `${name} buys ${k} notebooks at $${dec2(price)} each and pays with $${dec2(pay)}. How many dollars of change does ${name} get?`,
          `Tickets cost $${dec2(price)} each. ${name} buys ${k} tickets and hands over $${dec2(pay)}. What is the change in dollars?`,
          `${name} orders ${k} smoothies at $${dec2(price)} apiece, paying with $${dec2(pay)}. How many dollars come back as change?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["ignoresDecimalPoint"],
      };
    },
  },
];

export const DECIMAL_OPS_VARIETIES = VARIETIES.map((v) => v.id);

function selectVariety(level, context) {
  // QA / bank authoring: force one variety (same contract as ?qaVariety).
  if (context.varietyId || context.structureType) {
    const forced = VARIETIES.find((v) => v.id === (context.varietyId || context.structureType));
    if (forced) return forced;
  }
  const b = bandOf(level);
  let pool = VARIETIES.filter((v) => v.bands.includes(b));
  if (context.allowWordProblems === false) {
    const dry = pool.filter((v) => v.family !== APPLICATION);
    if (dry.length) pool = dry;
  }
  if (context.itemFamily) {
    const byFamily = pool.filter((v) => v.family === context.itemFamily);
    if (byFamily.length) pool = byFamily;
  }
  if (context.targetSubskill) {
    const bySubskill = pool.filter((v) => v.subskills.includes(context.targetSubskill));
    if (bySubskill.length) pool = bySubskill;
  }
  return pick(pool);
}

export default {
  id: "decimalOps",
  label: "Decimal Drift",
  shortLabel: "Decimal Ops",
  description: "Add, subtract, multiply and divide decimals.",
  icon: "Percent",
  op: "decops",
  subskills: SUBSKILLS,
  // Band-scoped subskills — coverage gates and targeting respect these ranges.
  subskillLevels: { powersOfTen: [4, 10], multiplyDivideDecimals: [7, 10], thousandthsSense: [1, 6] },
  supportedFormats: [],
  families: Object.values(ITEM_FAMILIES),
  varieties: DECIMAL_OPS_VARIETIES,

  generate(level, context = {}) {
    const variety = selectVariety(level, context);
    const built = variety.build(level, context.targetSubskill);
    const itemFamily = variety.family;

    const question = {
      op: "decops",
      answer: built.answer,
      answerType: built.answerType,
      level,
      display: { ...(built.display || {}), promptText: built.promptText },
    };
    if (built.a != null) question.a = built.a;
    if (built.b != null) question.b = built.b;
    if (built.choices) question.choices = built.choices;
    if (built.distractorContext) question.distractorContext = built.distractorContext;

    question.metadata = createQuestionMetadata({
      modeId: "decimalOps",
      level,
      domain: "NBT",
      cluster: "Perform operations with decimals to hundredths",
      subskill: built.subskill || variety.subskills[0],
      itemFamily,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP2", "MP6", "MP7"],
      standardRefs: ["5.NBT"],
      misconceptionTags: built.misconceptionTags,
      blueprintId: `decimalOps-${itemFamily}-${variety.id}`,
      structureType: variety.id,
    });
    return question;
  },

  generateChoices(answer, question) {
    if (Array.isArray(question?.choices)) return question.choices;
    if (typeof answer !== "number") return null;
    return buildDistractors({
      answer,
      misconceptions: question?.metadata?.misconceptionTags || [],
      min: 1,
      ...(question?.distractorContext || {}),
    });
  },
};
