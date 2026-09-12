import { randInt, shuffleArray } from "./helpers";
import { gcd } from "../fractions.js";
import { createQuestionMetadata, ITEM_FAMILIES } from "./itemMetadata";
import { buildDistractors } from "./distractors";

/**
 * fractionOps — Grade 5 fraction arithmetic (5.NF). The `fractions` mode
 * (2-4) owns meaning, equivalence and like-denominator addition; this ladder
 * owns the operations:
 *
 *   band 1 (L1-3)  bridge: like-denominator ± beyond a whole, fraction of a
 *                  whole number (4.NF.4 entry)
 *   band 2 (L4-6)  unlike-denominator ± (5.NF.1-2), fraction × whole
 *   band 3 (L7-10) fraction × fraction (5.NF.4), unit-fraction ÷ (5.NF.7),
 *                  two-step stories
 *
 * Answers ride the existing widgets only: `fraction` (value-equivalent
 * checker), `numberPad` for whole/numerator fills, `choice` for judged items.
 */

const { PROCEDURAL, CONCEPTUAL, APPLICATION } = ITEM_FAMILIES;

const SUBSKILLS = ["addSubUnlike", "multiplyFractions", "divideUnitFractions", "fractionOfWhole"];

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const bandOf = (level) => (level <= 3 ? 1 : level <= 6 ? 2 : 3);

const frac = (n, d) => `${n}/${d}`;
function simplify(n, d) {
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}

/** Unlike pairs where one denominator is a multiple of the other (5.NF entry
 *  cases: 1/2 + 1/4 …) at band 2; unrelated pairs join at band 3. */
function unlikePair(band) {
  const easy = [
    [2, 4],
    [2, 6],
    [3, 6],
    [2, 8],
    [4, 8],
    [3, 9],
    [5, 10],
    [2, 10],
    [6, 12],
    [4, 12],
    [3, 12],
  ];
  const hard = [
    [2, 3],
    [3, 4],
    [2, 5],
    [3, 5],
    [4, 6],
    [4, 5],
    [3, 8],
    [5, 6],
  ];
  return pick(band >= 3 ? [...easy, ...hard] : easy);
}

const FOOD = [
  ["pizza", "pizzas"],
  ["pan of brownies", "pans of brownies"],
  ["ribbon", "ribbons"],
  ["water jug", "water jugs"],
  ["bag of trail mix", "bags of trail mix"],
];
const KIDS = ["Maya", "Leo", "Priya", "Omar", "Zoe", "Kai", "Nora", "Diego", "Rosa", "Finn", "Ida", "Luca", "Amara", "Theo", "Nia", "Ben", "June"];

const VARIETIES = [
  // ---- band 1: bridge from grade-4 fraction work --------------------------
  {
    id: "likeAddPastWhole",
    bands: [1],
    family: PROCEDURAL,
    subskills: ["addSubUnlike"],
    build() {
      const d = pick([4, 5, 6, 8, 10]);
      const a = randInt(2, d - 1);
      const b = randInt(d - a + 1, d - 1); // forces a sum past one whole
      return {
        answer: frac(a + b, d),
        answerType: "fraction",
        promptText: pick([
          `${frac(a, d)} + ${frac(b, d)} = ?`,
          `Add the parts: ${frac(a, d)} + ${frac(b, d)} = ?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["addsDenominators"],
      };
    },
  },
  {
    id: "fractionOfWholeEntry",
    bands: [1, 2],
    family: PROCEDURAL,
    subskills: ["fractionOfWhole"],
    build(level) {
      for (let tries = 0; tries < 40; tries += 1) {
        const d = pick(bandOf(level) === 1 ? [2, 3, 4, 5] : [2, 3, 4, 5, 6, 8]);
        const maxTimes = bandOf(level) === 1 ? Math.floor(20 / d) : 6;
        const times = randInt(2, Math.max(2, maxTimes));
        const whole = d * times;
        const n = randInt(1, d - 1);
        const answer = n * times;
        // The gate rejects prompts whose stated numbers include the answer.
        if (answer === n || answer === d || answer === whole) continue;
        return {
          answer,
          answerType: "numberPad",
          promptText: pick([
            `What is ${frac(n, d)} of ${whole}?`,
            `Find ${frac(n, d)} of ${whole}.`,
            `${frac(n, d)} × ${whole} = ?`,
          ]),
          representation: "symbolic",
          cognitiveDemand: "DOK1",
          misconceptionTags: ["multipliesByDenominator"],
          distractorContext: { a: whole, b: d },
        };
      }
      return {
        answer: 6,
        answerType: "numberPad",
        promptText: `What is ${frac(2, 4)} of 12?`,
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["multipliesByDenominator"],
      };
    },
  },
  {
    id: "likeAddJudged",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["addSubUnlike"],
    build() {
      const d = pick([4, 6, 8]);
      const a = randInt(1, d - 2);
      const b = randInt(1, d - a - 1);
      const wrong = Math.random() < 0.5;
      const claim = wrong ? frac(a + b, d * 2) : frac(a + b, d);
      return {
        answer: wrong ? "No" : "Yes",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: pick([
          (k) => `${k} says ${frac(a, d)} + ${frac(b, d)} = ${claim}. Is that right?`,
          (k) => `${k} adds ${frac(a, d)} and ${frac(b, d)} and writes ${claim}. Is ${k} right?`,
          (k) => `${k} claims ${frac(a, d)} + ${frac(b, d)} makes ${claim}. Do you agree?`,
        ])(pick(KIDS)),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsDenominators"],
      };
    },
  },
  {
    id: "missingLikeAddend",
    bands: [1],
    family: PROCEDURAL,
    subskills: ["addSubUnlike"],
    build() {
      const d = pick([4, 5, 6, 8, 10, 12]);
      const total = randInt(3, d - 1);
      const known = randInt(1, total - 1);
      return {
        answer: total - known,
        answerType: "numberPad",
        promptText: pick([
          `${frac(known, d)} + ?/${d} = ${frac(total, d)}. What is the missing top number?`,
          `Fill the blank: ${frac(known, d)} + ?/${d} = ${frac(total, d)}.`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["addsDenominators"],
      };
    },
  },
  {
    id: "howManyUnitFractions",
    bands: [1, 2],
    family: CONCEPTUAL,
    subskills: ["fractionOfWhole"],
    build() {
      const d = pick([3, 4, 5, 6, 8]);
      const n = randInt(2, 2 * d - 1);
      return {
        answer: n,
        answerType: "numberPad",
        promptText: pick([
          `How many ${frac(1, d)} pieces make ${frac(n, d)}?`,
          `${frac(n, d)} is built from how many ${frac(1, d)} pieces?`,
          `Count the ${frac(1, d)} steps to reach ${frac(n, d)}. How many steps is that?`,
          `Stack up ${frac(1, d)} pieces until you have ${frac(n, d)}. How many pieces is that?`,
          `${frac(n, d)} equals how many copies of ${frac(1, d)}?`,
          `To build ${frac(n, d)} from ${frac(1, d)} pieces, how many pieces do you need?`,
          `A hop of ${frac(1, d)} at a time reaches ${frac(n, d)} in how many hops?`,
          `How many ${frac(1, d)} parts add up to ${frac(n, d)}?`,
          `${frac(n, d)} split into ${frac(1, d)} parts gives how many parts?`,
          `Think of ${frac(n, d)} as ${frac(1, d)}s. How many ${frac(1, d)}s is that?`,
          `Fill a strip to ${frac(n, d)} using ${frac(1, d)} tiles. How many tiles fit?`,
          ...[
            (nm) => `${nm} builds ${frac(n, d)} out of ${frac(1, d)} pieces. How many pieces does ${nm} use?`,
            (nm) => `${nm} hops ${frac(1, d)} at a time and lands on ${frac(n, d)}. How many hops does ${nm} take?`,
            (nm) => `${nm} stacks ${frac(1, d)} tiles until the strip shows ${frac(n, d)}. How many tiles does ${nm} stack?`,
            (nm) => `${nm} pours ${frac(1, d)} of a cup at a time to reach ${frac(n, d)} of a cup. How many pours is that?`,
            (nm) => `${nm} snaps together ${frac(1, d)} blocks to make ${frac(n, d)}. How many blocks does ${nm} snap?`,
            (nm) => `To show ${frac(n, d)}, ${nm} shades ${frac(1, d)} parts one at a time. How many parts does ${nm} shade?`,
          ].map((t) => t(pick(KIDS))),
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsDenominators"],
      };
    },
  },
  {
    id: "compareToOneJudged",
    bands: [1],
    family: CONCEPTUAL,
    subskills: ["addSubUnlike"],
    build() {
      const d = pick([4, 5, 6, 8]);
      const a = randInt(1, d - 1);
      const b = randInt(1, d - 1);
      const overOne = a + b > d;
      const claimOver = Math.random() < 0.5;
      return {
        answer: overOne === claimOver ? "Yes" : "No",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: `${pick(KIDS)} says ${frac(a, d)} + ${frac(b, d)} is ${claimOver ? "more" : "less"} than one whole. Is that right?`,
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsDenominators"],
      };
    },
  },
  {
    id: "likeAddStory",
    bands: [1],
    family: APPLICATION,
    subskills: ["addSubUnlike"],
    build() {
      const d = pick([4, 5, 6, 8]);
      const a = randInt(1, d - 2);
      const b = randInt(1, d - a - 1);
      const name = pick(KIDS);
      return {
        answer: frac(a + b, d),
        answerType: "fraction",
        promptText: pick([
          `${name} eats ${frac(a, d)} of a pizza and later ${frac(b, d)} more of it. What fraction of the pizza has ${name} eaten?`,
          `${name} paints ${frac(a, d)} of a banner, then ${frac(b, d)} more of the banner. What fraction of the banner is painted?`,
          `A jar is ${frac(a, d)} full. ${name} adds ${frac(b, d)} of a jar more. What fraction of the jar is full now?`,
          `${name} reads ${frac(a, d)} of a book on Monday and ${frac(b, d)} of the book on Tuesday. What fraction of the book is read?`,
          `${frac(a, d)} of the garden has flowers and ${name} plants ${frac(b, d)} of the garden more. What fraction of the garden has flowers?`,
          `${name} walks ${frac(a, d)} of the trail, rests, then walks ${frac(b, d)} of the trail. What fraction of the trail is done?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsDenominators"],
      };
    },
  },
  {
    id: "fractionTimesWholeStory",
    bands: [2],
    family: APPLICATION,
    subskills: ["multiplyFractions"],
    build() {
      const d = pick([2, 3, 4, 5, 6]);
      const times = randInt(2, 5);
      const whole = d * times;
      const n = randInt(1, d - 1);
      const name = pick(KIDS);
      const answer = n * times;
      if (answer === n || answer === d || answer === whole) return this.build();
      return {
        answer,
        answerType: "numberPad",
        promptText: pick([
          `${name} reads ${frac(n, d)} of a ${whole}-page comic. How many pages does ${name} read?`,
          `A team plays ${whole} games and wins ${frac(n, d)} of them. How many games does the team win?`,
          `${name} plants seeds in ${frac(n, d)} of ${whole} pots. How many pots get seeds?`,
          `Of ${whole} balloons, ${frac(n, d)} are red. How many balloons are red?`,
          `${name} uses ${frac(n, d)} of a ${whole}-sticker sheet. How many stickers does ${name} use?`,
          `A class of ${whole} kids sends ${frac(n, d)} of its students to the fair. How many kids go?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["multipliesByDenominator"],
      };
    },
  },
  {
    id: "shareStoryEntry",
    bands: [1, 2],
    family: APPLICATION,
    subskills: ["fractionOfWhole"],
    build() {
      const d = pick([2, 3, 4]);
      const times = randInt(2, 5);
      const whole = d * times;
      const [thing] = pick(FOOD);
      const name = pick(KIDS);
      return {
        answer: whole / d,
        answerType: "numberPad",
        promptText: pick([
          `${name} has ${whole} crackers and eats ${frac(1, d)} of them. How many crackers does ${name} eat?`,
          `A ${thing} recipe uses ${whole} cups of flour. ${name} makes ${frac(1, d)} of the recipe. How many cups of flour does ${name} use?`,
          `${name} owns ${whole} marbles and gives away ${frac(1, d)} of them. How many marbles does ${name} give away?`,
          `Of the ${whole} pages in ${name}'s book, ${frac(1, d)} are read. How many pages are read?`,
          `A team has ${whole} stickers and hands out ${frac(1, d)} of them. How many stickers are handed out?`,
          `${name} saves ${frac(1, d)} of ${whole} dollars. How many dollars does ${name} save?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["multipliesByDenominator"],
      };
    },
  },

  // ---- band 2: unlike denominators (5.NF.1-2), fraction × whole -----------
  {
    id: "unlikeAdd",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["addSubUnlike"],
    build(level) {
      const [d1, d2] = unlikePair(bandOf(level));
      const n1 = randInt(1, d1 - 1);
      const n2 = randInt(1, d2 - 1);
      const den = (d1 * d2) / gcd(d1, d2);
      const num = n1 * (den / d1) + n2 * (den / d2);
      return {
        answer: frac(num, den),
        answerType: "fraction",
        promptText: pick([
          `${frac(n1, d1)} + ${frac(n2, d2)} = ?`,
          `Add: ${frac(n1, d1)} + ${frac(n2, d2)} = ?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsDenominators", "addsNumeratorsOnly"],
      };
    },
  },
  {
    id: "unlikeSubtract",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["addSubUnlike"],
    build(level) {
      const [dSmall, dBig] = unlikePair(bandOf(level));
      const den = (dSmall * dBig) / gcd(dSmall, dBig);
      // Build the difference directly so it is always positive: pick the
      // result first, then the subtrahend.
      const diff = randInt(1, den - 2);
      const sub = randInt(1, den - diff - 1);
      const minuend = diff + sub;
      const [n1, d1] = simplify(minuend, den);
      const [n2, d2] = simplify(sub, den);
      if (d1 === d2) {
        // Both collapsed to the same denominator — keep one unsimplified so
        // the denominators actually differ.
        return {
          answer: frac(diff, den),
          answerType: "fraction",
          promptText: `${frac(minuend, den)} − ${frac(n2, d2)} = ?`,
          representation: "symbolic",
          cognitiveDemand: "DOK2",
          misconceptionTags: ["addsDenominators"],
        };
      }
      return {
        answer: frac(diff, den),
        answerType: "fraction",
        promptText: pick([
          `${frac(n1, d1)} − ${frac(n2, d2)} = ?`,
          `Subtract: ${frac(n1, d1)} − ${frac(n2, d2)} = ?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsDenominators"],
      };
    },
  },
  {
    id: "commonDenominatorPick",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["addSubUnlike"],
    build() {
      const [d1, d2] = unlikePair(2);
      const lcm = (d1 * d2) / gcd(d1, d2);
      const wrongs = new Set([d1 + d2, lcm * 2, Math.max(d1, d2)]);
      wrongs.delete(lcm);
      return {
        answer: lcm,
        answerType: "choice",
        choices: shuffleArray([lcm, ...[...wrongs].slice(0, 3)]),
        promptText: pick([
          `To add ${frac(1, d1)} and ${frac(1, d2)}, which denominator can both be renamed to?`,
          `Which denominator works for both ${frac(1, d1)} and ${frac(1, d2)}?`,
          `${frac(1, d1)} and ${frac(1, d2)} can both be written in which denominator?`,
          `Which denominator fits both ${frac(1, d1)} and ${frac(1, d2)} at once?`,
          `Before adding ${frac(1, d1)} and ${frac(1, d2)}, rename both to which denominator?`,
          `A common denominator for ${frac(1, d1)} and ${frac(1, d2)} is which number?`,
          `Both ${frac(1, d1)} and ${frac(1, d2)} fit evenly over which denominator?`,
          `What denominator lets you add ${frac(1, d1)} and ${frac(1, d2)} directly?`,
          `Rename ${frac(1, d1)} and ${frac(1, d2)} to share which denominator?`,
          `The smallest denominator both ${frac(1, d1)} and ${frac(1, d2)} can use is what?`,
          `Which bottom number could ${frac(1, d1)} and ${frac(1, d2)} both switch to?`,
          ...[
            (nm) => `${nm} wants to add ${frac(1, d1)} and ${frac(1, d2)}. Which denominator should ${nm} rename both to?`,
            (nm) => `${nm} is renaming ${frac(1, d1)} and ${frac(1, d2)} to match. Which denominator works for both?`,
            (nm) => `To combine ${frac(1, d1)} and ${frac(1, d2)}, ${nm} needs one shared denominator. Which number is it?`,
            (nm) => `${nm} lines up ${frac(1, d1)} and ${frac(1, d2)} over the same denominator. Which denominator does ${nm} pick?`,
            (nm) => `Before ${nm} can add ${frac(1, d1)} and ${frac(1, d2)}, both need which denominator?`,
            (nm) => `${nm} rewrites ${frac(1, d1)} and ${frac(1, d2)} with a common denominator. What is that denominator?`,
          ].map((t) => t(pick(KIDS))),
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsDenominators"],
      };
    },
  },
  {
    id: "fractionTimesWhole",
    bands: [2, 3],
    family: PROCEDURAL,
    subskills: ["multiplyFractions"],
    build() {
      const d = pick([2, 3, 4, 5, 6, 8]);
      const n = randInt(1, d - 1);
      const k = d * randInt(1, 4);
      return {
        answer: (n * k) / d,
        answerType: "numberPad",
        promptText: pick([
          `${frac(n, d)} × ${k} = ?`,
          `What is ${frac(n, d)} of ${k}?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK1",
        misconceptionTags: ["multipliesByDenominator"],
        distractorContext: { a: k, b: d },
      };
    },
  },
  {
    id: "ribbonStoryUnlike",
    bands: [2, 3],
    family: APPLICATION,
    subskills: ["addSubUnlike"],
    build(level) {
      const [d1, d2] = unlikePair(bandOf(level));
      const den = (d1 * d2) / gcd(d1, d2);
      const n1 = randInt(1, d1 - 1);
      const n2 = randInt(1, d2 - 1);
      const num = n1 * (den / d1) + n2 * (den / d2);
      const name = pick(KIDS);
      const name2 = pick(KIDS.filter((k) => k !== name));
      return {
        answer: frac(num, den),
        answerType: "fraction",
        promptText: pick([
          `${name} walks ${frac(n1, d1)} of a mile and then ${frac(n2, d2)} of a mile more. How many miles does ${name} walk in all?`,
          `${name} pours ${frac(n1, d1)} of a cup of juice and ${name2} pours ${frac(n2, d2)} of a cup. How many cups of juice is that together?`,
          `A recipe needs ${frac(n1, d1)} of a cup of oats plus ${frac(n2, d2)} of a cup of raisins. How many cups is that in all?`,
          `${name} paints ${frac(n1, d1)} of a fence before lunch and ${frac(n2, d2)} of the fence after. What fraction of the fence is painted?`,
          `${name} rides ${frac(n1, d1)} of a kilometer, rests, then rides ${frac(n2, d2)} of a kilometer. How many kilometers does ${name} ride?`,
          `Two ribbons measure ${frac(n1, d1)} of a meter and ${frac(n2, d2)} of a meter. How many meters of ribbon are there in all?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["addsDenominators"],
      };
    },
  },

  // ---- band 3: fraction × fraction (5.NF.4), unit ÷ (5.NF.7) --------------
  {
    id: "fractionTimesFraction",
    bands: [3],
    family: PROCEDURAL,
    subskills: ["multiplyFractions"],
    build() {
      const d1 = pick([2, 3, 4, 5]);
      const d2 = pick([2, 3, 4, 5, 6]);
      const n1 = randInt(1, d1 - 1);
      const n2 = randInt(1, d2 - 1);
      return {
        answer: frac(n1 * n2, d1 * d2),
        answerType: "fraction",
        promptText: pick([
          `${frac(n1, d1)} × ${frac(n2, d2)} = ?`,
          `Multiply: ${frac(n1, d1)} × ${frac(n2, d2)} = ?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["crossAdds"],
      };
    },
  },
  {
    id: "unitFractionDivide",
    bands: [3],
    family: PROCEDURAL,
    subskills: ["divideUnitFractions"],
    build() {
      if (Math.random() < 0.5) {
        // whole ÷ unit fraction: 3 ÷ 1/4 = 12
        const w = randInt(2, 6);
        const d = pick([2, 3, 4, 5, 6]);
        return {
          answer: w * d,
          answerType: "numberPad",
          promptText: pick([
            `${w} ÷ ${frac(1, d)} = ?`,
            `How many ${frac(1, d)}s are in ${w}?`,
          ]),
          representation: "symbolic",
          cognitiveDemand: "DOK2",
          misconceptionTags: ["dividesTheWrongWay"],
          distractorContext: { a: w, b: d },
        };
      }
      // unit fraction ÷ whole: 1/3 ÷ 4 = 1/12
      const d = pick([2, 3, 4, 5]);
      const w = randInt(2, 6);
      return {
        answer: frac(1, d * w),
        answerType: "fraction",
        promptText: pick([
          `${frac(1, d)} ÷ ${w} = ?`,
          `Share ${frac(1, d)} equally among ${w}. How much is each share?`,
        ]),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["dividesTheWrongWay"],
      };
    },
  },
  {
    id: "productSizeJudged",
    bands: [2, 3],
    family: CONCEPTUAL,
    subskills: ["multiplyFractions"],
    build() {
      const d = pick([2, 3, 4, 5]);
      const n = randInt(1, d - 1);
      const k = randInt(3, 9);
      const claimBigger = Math.random() < 0.5;
      return {
        answer: claimBigger ? "No" : "Yes",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: pick([
          (nm, dir) => `${nm} says ${frac(n, d)} × ${k} is ${dir} than ${k}. Is that right?`,
          (nm, dir) => `${nm} claims ${frac(n, d)} × ${k} comes out ${dir} than ${k}. Do you agree?`,
          (nm, dir) => `${nm} predicts that multiplying ${k} by ${frac(n, d)} gives a number ${dir} than ${k}. Is ${nm} right?`,
          (nm, dir) => `${nm} writes ${frac(n, d)} × ${k} and expects an answer ${dir} than ${k}. Is that right?`,
          (nm, dir) => `Without solving, ${nm} decides ${frac(n, d)} × ${k} must be ${dir} than ${k}. Do you agree?`,
          (nm, dir) => `${nm} looks at ${frac(n, d)} × ${k} and says the product is ${dir} than ${k}. Is ${nm} right?`,
        ])(pick(KIDS), claimBigger ? "bigger" : "smaller"),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["multiplicationAlwaysGrows"],
      };
    },
  },
  {
    id: "divideMeaningJudged",
    bands: [3],
    family: CONCEPTUAL,
    subskills: ["divideUnitFractions"],
    build() {
      const w = randInt(2, 6);
      const d = pick([2, 3, 4, 5]);
      const real = w * d;
      const wrong = Math.random() < 0.5;
      const claim = wrong ? Math.max(1, Math.round(w / d)) : real;
      return {
        answer: wrong ? "No" : "Yes",
        answerType: "choice",
        choices: ["Yes", "No"],
        promptText: pick([
          (nm) => `${nm} says ${w} ÷ ${frac(1, d)} asks how many ${frac(1, d)}s fit in ${w}, so it equals ${claim}. Is ${nm} right?`,
          (nm) => `${nm} works out ${w} ÷ ${frac(1, d)} = ${claim}. Is that right?`,
          (nm) => `${nm} claims dividing ${w} by ${frac(1, d)} gives ${claim}. Do you agree?`,
        ])(pick(KIDS)),
        representation: "symbolic",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["dividesTheWrongWay"],
      };
    },
  },
  {
    id: "brownieStoryMultiply",
    bands: [3],
    family: APPLICATION,
    subskills: ["multiplyFractions"],
    build() {
      const d1 = pick([2, 3, 4]);
      const d2 = pick([2, 3, 4]);
      const name = pick(KIDS);
      return {
        answer: frac(1, d1 * d2),
        answerType: "fraction",
        promptText: pick([
          `${frac(1, d1)} of a ${pick(FOOD)[0]} is left. ${name} eats ${frac(1, d2)} of that piece. What fraction of the whole does ${name} eat?`,
          `${name} has ${frac(1, d1)} of a garden bed and plants flowers on ${frac(1, d2)} of it. What fraction of the whole bed has flowers?`,
          `${name} folds ${frac(1, d1)} of a sheet of paper, then colors ${frac(1, d2)} of the folded part. What fraction of the whole sheet is colored?`,
          `A tank is ${frac(1, d1)} full. ${name} uses ${frac(1, d2)} of that water. What fraction of a full tank does ${name} use?`,
          `${frac(1, d1)} of the class stays late, and ${frac(1, d2)} of those students read. What fraction of the class reads late?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK3",
        misconceptionTags: ["crossAdds"],
      };
    },
  },
  {
    id: "servingStoryDivide",
    bands: [3],
    family: APPLICATION,
    subskills: ["divideUnitFractions"],
    build() {
      const w = randInt(2, 5);
      const d = pick([2, 3, 4]);
      const name = pick(KIDS);
      return {
        answer: w * d,
        answerType: "numberPad",
        promptText: pick([
          `${name} has ${w} sandwiches and cuts each into ${frac(1, d)}-size pieces. How many pieces does ${name} get?`,
          `A ${w}-liter jug is poured into ${frac(1, d)}-liter cups. How many cups can be filled?`,
          `${name} cuts ${w} meters of string into ${frac(1, d)}-meter pieces. How many pieces of string result?`,
          `${w} pounds of clay are split into ${frac(1, d)}-pound balls. How many balls of clay is that?`,
          `A trail is ${w} miles long with a marker every ${frac(1, d)} of a mile. How many ${frac(1, d)}-mile stretches are there?`,
        ]),
        representation: "verbalContext",
        cognitiveDemand: "DOK2",
        misconceptionTags: ["dividesTheWrongWay"],
      };
    },
  },
];

export const FRACTION_OPS_VARIETIES = VARIETIES.map((v) => v.id);

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
  id: "fractionOps",
  label: "Fraction Forge",
  shortLabel: "Fraction Ops",
  description: "Add, subtract, multiply and divide fractions.",
  icon: "PieChart",
  op: "fracops",
  subskills: SUBSKILLS,
  // Band-scoped subskills — coverage gates and targeting respect these ranges.
  maxLevel: 12,
  subskillLevels: { multiplyFractions: [4, 12], divideUnitFractions: [7, 12], fractionOfWhole: [1, 6] },
  supportedFormats: [],
  families: Object.values(ITEM_FAMILIES),
  varieties: FRACTION_OPS_VARIETIES,

  generate(level, context = {}) {
    const variety = selectVariety(level, context);
    const built = variety.build(level, context.targetSubskill);
    const itemFamily = variety.family;

    const question = {
      op: "fracops",
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
      modeId: "fractionOps",
      level,
      domain: "NF",
      cluster: "Use equivalent fractions to add, subtract, multiply and divide fractions",
      subskill: built.subskill || variety.subskills[0],
      itemFamily,
      cognitiveDemand: built.cognitiveDemand,
      representation: built.representation,
      mathPractices: ["MP1", "MP2", "MP7"],
      standardRefs: ["5.NF"],
      misconceptionTags: built.misconceptionTags,
      blueprintId: `fractionOps-${itemFamily}-${variety.id}`,
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
