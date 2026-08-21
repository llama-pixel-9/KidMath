/* fractions bank part 3 — extra procedural drills that lift each
 * subskill's procedural cells to the 50-item floor. Conventions in
 * fractionsTemplates.js.
 */

import { shuffled } from "./countingTemplates.js";
import { item, F, DEN_WORDS } from "./fractionsTemplates.js";

const phrAt = (phrs, i, listLen) => phrs[(Math.floor(i / listLen) * 2 + (i % 2)) % phrs.length];

/* partWhole: read the numerator / denominator off a written fraction. */
export function partWholeExtraProcedural() {
  const items = [];
  const pairs = {
    band1: [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 4], [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 4]],
    band2: [[2, 5], [3, 5], [1, 5], [4, 5], [1, 6], [5, 6], [2, 6], [3, 8], [5, 8], [7, 8], [1, 8], [4, 6]],
    band3: [[3, 10], [7, 10], [9, 10], [1, 10], [5, 12], [7, 12], [11, 12], [1, 12], [4, 5], [5, 6], [5, 8], [3, 4]],
  };
  const denPhr = {
    band1: [
      (n, d) => `In the fraction ${F(n, d)}, the bottom number = ?`,
      (n, d) => `Look at ${F(n, d)}. How many equal parts does its bottom number show?`,
      (n, d) => `The fraction ${F(n, d)} splits the whole into how many equal parts?`,
      (n, d) => `Read ${F(n, d)}: the number under the line = ?`,
    ],
    band2: [
      (n, d) => `The denominator of ${F(n, d)} = ?`,
      (n, d) => `In ${F(n, d)}, how many equal parts make the whole?`,
      (n, d) => `Which number is the denominator of ${F(n, d)}? Type it.`,
      (n, d) => `${F(n, d)} cuts its whole into how many equal parts?`,
    ],
    band3: [
      (n, d) => `What is the denominator of ${F(n, d)}?`,
      (n, d) => `Exactly how many equal parts does ${F(n, d)} declare in its denominator?`,
      (n, d) => `The bottom term of ${F(n, d)} equals what number?`,
      (n, d) => `${F(n, d)} partitions its whole into how many parts? Type the denominator.`,
    ],
  };
  const numPhr = {
    band1: [
      (n, d) => `In the fraction ${F(n, d)}, the top number = ?`,
      (n, d) => `Look at ${F(n, d)}. How many parts does its top number count?`,
      (n, d) => `The fraction ${F(n, d)} takes how many of the equal parts?`,
      (n, d) => `Read ${F(n, d)}: the number above the line = ?`,
    ],
    band2: [
      (n, d) => `The numerator of ${F(n, d)} = ?`,
      (n, d) => `In ${F(n, d)}, how many parts are being counted?`,
      (n, d) => `Which number is the numerator of ${F(n, d)}? Type it.`,
      (n, d) => `${F(n, d)} claims how many of the equal parts?`,
    ],
    band3: [
      (n, d) => `What is the numerator of ${F(n, d)}?`,
      (n, d) => `Exactly how many parts does ${F(n, d)} count in its numerator?`,
      (n, d) => `The top term of ${F(n, d)} equals what number?`,
      (n, d) => `Of the equal parts, ${F(n, d)} selects how many? Type the numerator.`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    const L = band === "band1" ? 6 : 12;
    pairs[band].forEach(([n, d], i) => {
      items.push(
        item("partWhole", "procedural", `readDen_${band}`, band, {
          answer: d,
          answerType: "numberPad",
          display: { frac: { kind: "denOf", n, d }, promptText: phrAt(denPhr[band], i, L)(n, d) },
        })
      );
      items.push(
        item("partWhole", "procedural", `readNum_${band}`, band, {
          answer: n,
          answerType: "numberPad",
          display: { frac: { kind: "numOf", n, d }, promptText: phrAt(numPhr[band], i, L)(n, d) },
        })
      );
    });
  }
  return items;
}

/* fractionAsNumber: unit-fraction composition drills. */
export function fractionAsNumberExtraProcedural() {
  const items = [];
  const tuples = {
    band1: [[2, 2], [2, 3], [3, 3], [2, 4], [3, 4], [4, 4], [2, 2], [2, 3], [3, 3], [2, 4], [3, 4], [4, 4]],
    band2: [[3, 5], [4, 5], [5, 5], [4, 6], [5, 6], [6, 6], [3, 8], [5, 8], [7, 8], [8, 8], [2, 5], [2, 6]],
    band3: [[7, 10], [9, 10], [10, 10], [5, 12], [7, 12], [11, 12], [12, 12], [3, 10], [4, 12], [6, 10], [8, 12], [9, 12]],
  };
  const countPhr = {
    band1: [
      (n, d) => `How many copies of ${F(1, d)} make ${F(n, d)}? Count them.`,
      (n, d) => `${F(n, d)} is built from how many pieces of size ${F(1, d)}?`,
      (n, d) => `To build ${F(n, d)}, how many ${F(1, d)} pieces do you stack?`,
      (n, d) => `Break ${F(n, d)} into ${F(1, d)} pieces. How many pieces is that?`,
    ],
    band2: [
      (n, d) => `${F(n, d)} equals how many copies of ${F(1, d)}?`,
      (n, d) => `Counting by ${F(1, d)}, how many counts reach ${F(n, d)}?`,
      (n, d) => `How many unit pieces of ${F(1, d)} compose ${F(n, d)}?`,
      (n, d) => `Decompose ${F(n, d)} into ${F(1, d)} units. How many units appear?`,
    ],
    band3: [
      (n, d) => `Exactly how many copies of ${F(1, d)} sum to ${F(n, d)}?`,
      (n, d) => `The fraction ${F(n, d)} decomposes into how many ${F(1, d)} units?`,
      (n, d) => `Express ${F(n, d)} as repeated ${F(1, d)}. How many repeats are needed?`,
      (n, d) => `A stack of ${F(1, d)} pieces totals ${F(n, d)}. How many pieces are in the stack?`,
    ],
  };
  const buildPhr = {
    band1: [
      (n, d) => `${n} copies of ${F(1, d)} make which fraction?`,
      (n, d) => `Stack ${n} pieces of size ${F(1, d)}. Which fraction do you get?`,
      (n, d) => `Put ${n} of the ${F(1, d)} pieces together. Pick the fraction they form.`,
      (n, d) => `${n} pieces, each worth ${F(1, d)}, together equal which fraction?`,
    ],
    band2: [
      (n, d) => `Combining ${n} units of ${F(1, d)} gives which fraction?`,
      (n, d) => `Count ${n} steps of ${F(1, d)}. Which fraction is the total?`,
      (n, d) => `${n} copies of the unit fraction ${F(1, d)} add up to which fraction?`,
      (n, d) => `Gather ${n} pieces of ${F(1, d)} each. Which fraction results?`,
    ],
    band3: [
      (n, d) => `Exactly ${n} copies of ${F(1, d)} compose which fraction?`,
      (n, d) => `The sum of ${n} unit fractions ${F(1, d)} is which fraction?`,
      (n, d) => `Accumulating ${F(1, d)} exactly ${n} times produces which fraction?`,
      (n, d) => `A total built from ${n} pieces of ${F(1, d)} names which fraction?`,
    ],
  };
  let seed = 461;
  for (const band of ["band1", "band2", "band3"]) {
    const L = band === "band1" ? 6 : 12;
    tuples[band].forEach(([n, d], i) => {
      items.push(
        item("fractionAsNumber", "procedural", `countUnits_${band}`, band, {
          answer: n,
          answerType: "numberPad",
          display: { frac: { kind: "jumps", n, d }, promptText: phrAt(countPhr[band], i, L)(n, d) },
        })
      );
      const good = F(n, d);
      const wrong = [...new Set([F(d, n), F(n, d + 1), F(n + 1, d)])].filter((x) => x !== good);
      items.push(
        item("fractionAsNumber", "procedural", `unitsBuild_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { frac: { kind: "name", n, d }, promptText: phrAt(buildPhr[band], i, L)(n, d) },
        })
      );
    });
  }
  return items;
}

/* equivalence: missing-denominator and scale-down drills. */
export function equivalenceExtraProcedural() {
  const items = [];

  const denPhr = {
    band1: [
      (a, b, c) => `${F(a, b)} = ${c}/?. What is the missing bottom number?`,
      (a, b, c) => `Complete the pair: ${F(a, b)} equals ${c} over what?`,
    ],
    band2: [
      (a, b, c) => `Fill in the denominator: ${F(a, b)} = ${c}/?.`,
      (a, b, c) => `${F(a, b)} rewritten with numerator ${c} needs which denominator?`,
    ],
    band3: [
      (a, b, c) => `Solve for the denominator: ${F(a, b)} = ${c}/? exactly.`,
      (a, b, c) => `An equivalent of ${F(a, b)} carrying numerator ${c} has which bottom number?`,
    ],
  };
  const denData = {
    band1: [[1, 2, 2], [1, 2, 3], [1, 2, 4], [1, 3, 2], [1, 4, 2], [2, 3, 4], [3, 4, 6], [2, 4, 3], [1, 3, 3], [1, 2, 5], [1, 2, 6], [1, 4, 3], [1, 2, 7]],
    band2: [[2, 5, 4], [3, 5, 6], [1, 6, 2], [5, 6, 10], [3, 4, 9], [1, 5, 3], [4, 5, 8], [2, 3, 10], [1, 8, 2], [3, 8, 6], [5, 8, 10], [1, 6, 3], [2, 5, 6]],
    band3: [[7, 10, 14], [3, 10, 9], [5, 12, 10], [7, 12, 21], [9, 10, 18], [11, 12, 22], [2, 3, 8], [5, 6, 15], [3, 8, 9], [5, 8, 15], [3, 4, 18], [4, 5, 16], [9, 10, 27]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    denData[band].forEach(([a, b, c], i) => {
      items.push(
        item("equivalence", "procedural", `missingDen_${band}`, band, {
          answer: (c * b) / a,
          answerType: "numberPad",
          display: { frac: { kind: "equivDen", a, b, c }, promptText: denPhr[band][i % 2](a, b, c) },
        })
      );
    });
  }

  const downPhr = {
    band1: [
      (a, b, d2) => `${F(a, b)} = ?/${d2}. What top number fits the smaller bottom?`,
      (a, b, d2) => `Shrink ${F(a, b)} to a bottom number of ${d2}. What is the top number?`,
    ],
    band2: [
      (a, b, d2) => `Reduce ${F(a, b)} to denominator ${d2}. The numerator becomes ?`,
      (a, b, d2) => `${F(a, b)} written over ${d2} carries which numerator?`,
    ],
    band3: [
      (a, b, d2) => `Scale ${F(a, b)} down to ?/${d2} exactly. Which numerator is required?`,
      (a, b, d2) => `Rewriting ${F(a, b)} with denominator ${d2} gives which top number?`,
    ],
  };
  const downData = {
    band1: [[2, 4, 2], [2, 6, 3], [4, 6, 3], [2, 8, 4], [4, 8, 4], [6, 8, 4], [4, 8, 2], [3, 9, 3], [6, 9, 3], [2, 10, 5], [4, 10, 5], [5, 10, 2], [8, 10, 5]],
    band2: [[4, 10, 5], [6, 10, 5], [8, 10, 5], [2, 12, 6], [10, 12, 6], [4, 12, 6], [8, 12, 6], [6, 12, 4], [9, 12, 4], [10, 16, 8], [6, 16, 8], [14, 16, 8], [12, 16, 4]],
    band3: [[10, 20, 10], [14, 20, 10], [15, 20, 4], [16, 20, 5], [18, 24, 12], [10, 24, 12], [22, 24, 12], [20, 24, 6], [9, 24, 8], [21, 24, 8], [15, 24, 8], [18, 30, 10], [24, 30, 5]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    downData[band].forEach(([a, b, d2], i) => {
      items.push(
        item("equivalence", "procedural", `scaleDown_${band}`, band, {
          answer: (a * d2) / b,
          answerType: "numberPad",
          display: { frac: { kind: "equivNum", a, b, d2 }, promptText: downPhr[band][i % 2](a, b, d2) },
        })
      );
    });
  }

  return items;
}

/* compareFractions: pick the smallest of three like fractions. */
export function compareExtraProcedural() {
  const items = [];
  const phr = {
    band1: [
      (x, y, z, d) => `Which is smallest: ${F(x, d)}, ${F(y, d)}, or ${F(z, d)}? Pick it.`,
      (x, y, z, d) => `Of ${F(x, d)}, ${F(y, d)}, and ${F(z, d)}, which fraction is the least?`,
    ],
    band2: [
      (x, y, z, d) => `Find the smallest of ${F(x, d)}, ${F(y, d)}, and ${F(z, d)}.`,
      (x, y, z, d) => `Among ${F(x, d)}, ${F(y, d)}, ${F(z, d)}, which sits lowest?`,
    ],
    band3: [
      (x, y, z, d) => `Exactly which of ${F(x, d)}, ${F(y, d)}, ${F(z, d)} is least?`,
      (x, y, z, d) => `Rank ${F(x, d)}, ${F(y, d)}, ${F(z, d)}: which one is the minimum?`,
    ],
  };
  const data = {
    band1: [[1, 2, 3, 4], [1, 3, 2, 4], [2, 1, 3, 4], [2, 3, 1, 4], [3, 1, 2, 4], [3, 2, 1, 4], [1, 2, 3, 3], [1, 3, 2, 3], [2, 1, 3, 3], [2, 3, 1, 3], [3, 1, 2, 3], [3, 2, 1, 3], [2, 3, 4, 4], [2, 4, 3, 4], [3, 2, 4, 4], [4, 2, 3, 4]],
    band2: [[1, 3, 5, 5], [3, 1, 5, 5], [5, 1, 3, 5], [2, 4, 5, 6], [4, 2, 5, 6], [5, 4, 2, 6], [1, 5, 3, 6], [3, 5, 7, 8], [5, 3, 7, 8], [7, 3, 5, 8], [1, 4, 6, 8], [4, 1, 6, 8], [6, 4, 1, 8], [2, 3, 4, 5], [3, 4, 2, 5], [4, 3, 2, 5]],
    band3: [[3, 7, 9, 10], [7, 3, 9, 10], [9, 7, 3, 10], [1, 5, 9, 10], [5, 1, 9, 10], [9, 5, 1, 10], [5, 7, 11, 12], [7, 5, 11, 12], [11, 7, 5, 12], [1, 6, 10, 12], [6, 1, 10, 12], [10, 6, 1, 12], [2, 4, 8, 10], [4, 8, 2, 10], [3, 9, 6, 12], [9, 3, 6, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    data[band].forEach(([x, y, z, d], i) => {
      const min = Math.min(x, y, z);
      items.push(
        item("compareFractions", "procedural", `smallestPick_${band}`, band, {
          answer: F(min, d),
          choices: [F(x, d), F(y, d), F(z, d)],
          display: { frac: { kind: "minPick", ns: [x, y, z], d }, promptText: phr[band][i % 2](x, y, z, d) },
        })
      );
    });
  }
  return items;
}

/* addLikeDenominators: three like addends, and subtract-from-one. */
export function addLikeExtraProcedural() {
  const items = [];
  let seed = 471;

  const threePhr = {
    band1: [
      (a, b, c, d) => `${F(a, d)} + ${F(b, d)} + ${F(c, d)} = ? Pick the total.`,
      (a, b, c, d) => `Add the three fractions ${F(a, d)}, ${F(b, d)}, and ${F(c, d)}. What is the sum?`,
      (a, b, c, d) => `Join ${F(a, d)}, ${F(b, d)}, and ${F(c, d)} into one fraction. Which is it?`,
      (a, b, c, d) => `Together, ${F(a, d)} + ${F(b, d)} + ${F(c, d)} make which fraction?`,
    ],
    band2: [
      (a, b, c, d) => `Sum all three: ${F(a, d)} + ${F(b, d)} + ${F(c, d)}. What do you get?`,
      (a, b, c, d) => `The three like fractions ${F(a, d)}, ${F(b, d)}, ${F(c, d)} total which fraction?`,
      (a, b, c, d) => `Work out ${F(a, d)} + ${F(b, d)} + ${F(c, d)} in one go. Pick the sum.`,
      (a, b, c, d) => `Adding ${F(a, d)}, ${F(b, d)}, and ${F(c, d)} together gives which fraction?`,
    ],
    band3: [
      (a, b, c, d) => `Compute exactly: ${F(a, d)} + ${F(b, d)} + ${F(c, d)}. Which fraction results?`,
      (a, b, c, d) => `The precise total of ${F(a, d)} + ${F(b, d)} + ${F(c, d)} is which fraction?`,
      (a, b, c, d) => `Evaluate the three-addend sum ${F(a, d)} + ${F(b, d)} + ${F(c, d)}.`,
      (a, b, c, d) => `Combining ${F(a, d)}, ${F(b, d)}, and ${F(c, d)} yields exactly which fraction?`,
    ],
  };
  const threeData = {
    band1: [[1, 1, 1, 3], [1, 1, 1, 4], [1, 1, 2, 4], [1, 2, 1, 4], [2, 1, 1, 4], [1, 1, 1, 3], [1, 1, 1, 4], [1, 1, 2, 4], [1, 2, 1, 4], [2, 1, 1, 4]],
    band2: [[1, 2, 1, 5], [2, 1, 1, 5], [1, 1, 2, 5], [2, 2, 1, 6], [1, 2, 2, 6], [2, 1, 3, 6], [1, 3, 1, 6], [3, 2, 2, 8], [2, 3, 1, 8], [1, 2, 4, 8], [4, 1, 2, 8], [3, 1, 3, 8]],
    band3: [[2, 3, 4, 10], [3, 2, 4, 10], [4, 3, 2, 10], [1, 5, 3, 10], [5, 1, 2, 10], [3, 3, 3, 10], [2, 4, 5, 12], [4, 2, 5, 12], [5, 4, 2, 12], [1, 6, 4, 12], [6, 1, 3, 12], [3, 5, 3, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    const L = band === "band1" ? 5 : 12;
    threeData[band].forEach(([a, b, c, d], i) => {
      const s = a + b + c;
      const good = F(s, d);
      const wrong = [...new Set([F(s, d * 3), F(s + 1, d), F(s - 1, d)])].filter((x) => x !== good);
      items.push(
        item("addLikeDenominators", "procedural", `addThree_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { frac: { kind: "addLike3", a, b, c, d }, promptText: threePhr[band][(Math.floor(i / L) * 2 + (i % 2)) % 4](a, b, c, d) },
        })
      );
    });
  }

  const onePhr = {
    band1: [
      (a, d) => `1 - ${F(a, d)} = ? Pick the difference.`,
      (a, d) => `Take ${F(a, d)} away from one whole. Which fraction is left?`,
    ],
    band2: [
      (a, d) => `Subtract ${F(a, d)} from 1. What fraction remains?`,
      (a, d) => `A whole minus ${F(a, d)} leaves which fraction?`,
    ],
    band3: [
      (a, d) => `Compute exactly: 1 - ${F(a, d)}. Which fraction remains?`,
      (a, d) => `Removing ${F(a, d)} from one whole leaves precisely which fraction?`,
    ],
  };
  const oneData = {
    band1: [[1, 2], [1, 3], [2, 3], [1, 4], [2, 4], [3, 4]],
    band2: [[2, 5], [3, 5], [1, 6], [5, 6], [3, 8], [5, 8]],
    band3: [[3, 10], [7, 10], [5, 12], [7, 12], [9, 10], [11, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    oneData[band].forEach(([a, d], i) => {
      const good = F(d - a, d);
      const wrong = [...new Set([F(a, d), F(d - a + 1, d), F(d - a, d * 2)])].filter((x) => x !== good);
      items.push(
        item("addLikeDenominators", "procedural", `subFromOne_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { frac: { kind: "complement", n: a, d }, promptText: onePhr[band][i % 2](a, d) },
        })
      );
    });
  }

  return items;
}

/* fractionOfSet: choice-form of-drills. */
export function ofSetExtraProcedural() {
  const items = [];
  let seed = 481;
  const phr = {
    band1: [
      (n, d, w) => `Which number is ${F(n, d)} of ${w}? Pick it.`,
      (n, d, w) => `Choose the value of ${F(n, d)} of ${w}.`,
    ],
    band2: [
      (n, d, w) => `Select the number equal to ${F(n, d)} of ${w}.`,
      (n, d, w) => `${F(n, d)} of ${w} — which number is it?`,
    ],
    band3: [
      (n, d, w) => `Identify exactly ${F(n, d)} of ${w} among the choices.`,
      (n, d, w) => `Which choice equals ${F(n, d)} of ${w} precisely?`,
    ],
  };
  const data = {
    band1: [[1, 2, 18], [1, 3, 12], [1, 4, 16], [1, 2, 14], [1, 3, 15], [1, 4, 20], [1, 2, 20], [1, 3, 18], [1, 4, 12], [1, 2, 16]],
    band2: [[1, 5, 55], [2, 5, 55], [1, 6, 48], [5, 6, 48], [3, 8, 56], [5, 8, 56], [1, 5, 70], [4, 5, 70], [1, 6, 90], [1, 8, 72]],
    band3: [[1, 10, 350], [3, 10, 350], [1, 12, 300], [5, 12, 300], [7, 10, 420], [9, 10, 420], [7, 12, 600], [1, 10, 430], [3, 10, 890], [11, 12, 132]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    data[band].forEach(([n, d, w], i) => {
      const good = (w / d) * n;
      const wrong = [...new Set([good + 1, Math.max(1, good - 1), good + 2])].filter((x) => x !== good);
      items.push(
        item("fractionOfSet", "procedural", `ofSetPick_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { frac: { kind: "ofSet", n, d, w }, promptText: phr[band][i % 2](n, d, w) },
        })
      );
    });
  }
  return items;
}
