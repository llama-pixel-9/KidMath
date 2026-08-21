/* factorsMultiples bank part 2 — factorPairs, primesAndCommon.
 * Conventions in factorsTemplates.js.
 */

import { shuffled } from "./countingTemplates.js";
import { item, nameAt, OFF, phrIdx, factorsOf, isPrime } from "./factorsTemplates.js";

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);
const pairCount = (n) => factorsOf(n).filter((f) => f * f <= n).length;

/* ================================================================== */
/* factorPairs                                                         */
/* ================================================================== */

export function factorPairsProcedural() {
  const items = [];
  let seed = 581;

  const completePhr = {
    band1: [
      (n, a) => `${a} pairs with which number to make ${n}? Type its partner.`,
      (n, a) => `In a factor pair for ${n}, ${a}'s partner = ?`,
      (n, a) => `${a} times its partner makes ${n}. Type the partner.`,
      (n, a) => `Complete the factor pair for ${n}: ${a} and ? Type the missing number.`,
    ],
    band2: [
      (n, a) => `Find ${a}'s partner in a factor pair of ${n}.`,
      (n, a) => `The factor pair of ${n} containing ${a} also contains which number? Type it.`,
      (n, a) => `${a} and ? multiply to ${n}. Type the missing factor.`,
      (n, a) => `Which number joins ${a} to form a factor pair of ${n}?`,
    ],
    band3: [
      (n, a) => `Determine ${a}'s partner in the factor pair of ${n}.`,
      (n, a) => `Exactly which number pairs with ${a} to produce ${n}? Type it.`,
      (n, a) => `Solve the pair: ${a} x ? = ${n}. Type the factor.`,
      (n, a) => `In ${n}'s factor pairs, ${a} sits beside which number?`,
    ],
  };
  const completeData = {
    band1: [[12, 3], [12, 2], [12, 6], [8, 2], [8, 4], [6, 2], [6, 3], [10, 2], [10, 5], [9, 3], [4, 2], [12, 4], [8, 1]],
    band2: [[14, 7], [15, 3], [16, 2], [18, 2], [20, 5], [24, 3], [26, 2], [28, 7], [30, 3], [21, 7], [27, 3], [22, 11], [24, 4]],
    band3: [[32, 8], [36, 4], [40, 5], [42, 7], [45, 5], [48, 4], [50, 2], [54, 6], [60, 4], [44, 11], [56, 8], [48, 3], [36, 3]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    completeData[band].forEach(([n, a], i) => {
      items.push(
        item("factorPairs", "procedural", `pairComplete_${band}`, band, {
          answer: n / a,
          answerType: "numberPad",
          display: { fm: { kind: "pairFor", n, a }, promptText: completePhr[band][phrIdx(i, 13, 4)](n, a) },
        })
      );
    });
  }

  // Letter-free: 12 = ? x 4
  const rowsPhr = [(n, a) => `${n} = ? x ${a}`, (n, a) => `? x ${a} = ${n}`];
  const rowsData = {
    band1: [[12, 4], [12, 6], [8, 4], [6, 3], [10, 5], [9, 3], [12, 3], [8, 2], [10, 2], [6, 2], [4, 2], [12, 2], [9, 9]],
    band2: [[14, 7], [15, 5], [16, 8], [18, 9], [20, 10], [24, 12], [25, 5], [28, 14], [30, 15], [21, 3], [27, 9], [22, 2], [24, 8]],
    band3: [[32, 16], [36, 18], [40, 20], [42, 21], [45, 15], [48, 24], [50, 25], [54, 27], [60, 30], [44, 22], [56, 28], [48, 12], [36, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    rowsData[band].forEach(([n, a], i) => {
      items.push(
        item("factorPairs", "procedural", `pairRows_${band}`, band, {
          answer: n / a,
          answerType: "numberPad",
          display: { fm: { kind: "pairFor", n, a }, promptText: rowsPhr[i % 2](n, a) },
        })
      );
    });
  }

  const pairPickPhr = {
    band1: [
      (n, list) => `Which pair multiplies to ${n}: ${list}? Pick it.`,
      (n, list) => `From ${list}, pick the factor pair of ${n}. Which is it?`,
      (n, list) => `One pair in ${list} makes ${n}. Which pair is it?`,
      (n, list) => `Choose the pair from ${list} whose product is ${n}. Which do you choose?`,
    ],
    band2: [
      (n, list) => `Select the factor pair of ${n} from ${list}. Which is it?`,
      (n, list) => `Which of the pairs ${list} multiplies to ${n}?`,
      (n, list) => `Exactly one of ${list} produces ${n}. Which one?`,
      (n, list) => `Find the pair with product ${n} among ${list}. Which did you find?`,
    ],
    band3: [
      (n, list) => `Identify the factor pair of ${n} within ${list}. Which is it?`,
      (n, list) => `Of the pairs ${list}, which has the product ${n}?`,
      (n, list) => `Precisely one of ${list} multiplies to ${n}. Which one is it?`,
      (n, list) => `Determine which of ${list} has a product equal to ${n}. Which does?`,
    ],
  };
  const pairPickData = {
    band1: [[12, [3, 4], [[2, 5], [3, 5], [4, 5]]], [8, [2, 4], [[2, 3], [3, 4], [2, 5]]], [6, [2, 3], [[2, 2], [3, 3], [2, 4]]], [10, [2, 5], [[2, 4], [3, 4], [5, 5]]], [9, [3, 3], [[2, 4], [3, 4], [2, 3]]], [12, [2, 6], [[2, 5], [3, 5], [4, 4]]], [4, [2, 2], [[2, 3], [1, 3], [3, 3]]], [10, [1, 10], [[2, 4], [3, 3], [2, 6]]], [8, [1, 8], [[2, 3], [3, 3], [2, 6]]], [6, [1, 6], [[2, 2], [2, 4], [3, 4]]], [12, [1, 12], [[2, 5], [3, 5], [5, 5]]], [9, [1, 9], [[2, 4], [2, 5], [4, 4]]], [4, [1, 4], [[2, 3], [3, 3], [1, 3]]]],
    band2: [[14, [2, 7], [[2, 6], [3, 5], [4, 4]]], [15, [3, 5], [[2, 7], [4, 4], [2, 8]]], [16, [2, 8], [[3, 5], [2, 7], [3, 6]]], [18, [2, 9], [[3, 5], [4, 5], [2, 8]]], [20, [4, 5], [[3, 6], [2, 9], [4, 6]]], [24, [4, 6], [[3, 7], [5, 5], [4, 5]]], [25, [5, 5], [[4, 6], [3, 8], [5, 6]]], [28, [4, 7], [[3, 9], [5, 6], [4, 6]]], [30, [5, 6], [[4, 7], [3, 9], [5, 5]]], [21, [3, 7], [[2, 10], [4, 5], [3, 6]]], [27, [3, 9], [[4, 6], [2, 13], [3, 8]]], [22, [2, 11], [[3, 7], [4, 5], [2, 10]]], [24, [3, 8], [[4, 5], [2, 11], [6, 6]]]],
    band3: [[32, [4, 8], [[3, 10], [5, 6], [4, 7]]], [36, [4, 9], [[5, 7], [3, 11], [6, 7]]], [40, [5, 8], [[4, 9], [6, 6], [5, 7]]], [42, [6, 7], [[5, 8], [4, 10], [6, 8]]], [45, [5, 9], [[6, 7], [4, 11], [5, 8]]], [48, [6, 8], [[5, 9], [7, 7], [6, 7]]], [50, [5, 10], [[6, 8], [4, 12], [5, 9]]], [54, [6, 9], [[5, 11], [7, 8], [6, 8]]], [60, [6, 10], [[7, 8], [5, 11], [6, 9]]], [44, [4, 11], [[5, 8], [6, 7], [4, 10]]], [56, [7, 8], [[6, 9], [5, 11], [7, 7]]], [48, [4, 12], [[5, 10], [6, 9], [4, 11]]], [36, [6, 6], [[4, 8], [5, 7], [6, 5]]]],
  };
  const pairLabel = ([a, b]) => `${a} x ${b}`;
  for (const band of ["band1", "band2", "band3"]) {
    pairPickData[band].forEach(([n, good, wrongs], i) => {
      const all = shuffled([pairLabel(good), ...wrongs.map(pairLabel)], (seed += 1));
      items.push(
        item("factorPairs", "procedural", `pairPick_${band}`, band, {
          answer: pairLabel(good),
          choices: all,
          display: { fm: { kind: "pairPick", n }, promptText: pairPickPhr[band][phrIdx(i, 13, 4)](n, all.join(", ")) },
        })
      );
    });
  }

  const pairCountPhr = {
    band1: [
      (n) => `How many different factor pairs make ${n}? Count them.`,
      (n) => `Count the factor pairs of ${n}. How many pairs are there?`,
      (n) => `${n} can be built from how many different factor pairs?`,
      (n) => `Type the number of factor pairs that produce ${n}.`,
    ],
    band2: [
      (n) => `Count every factor pair of ${n}. How many pairs is that?`,
      (n) => `How many factor pairs does ${n} have? Type the count.`,
      (n) => `The complete set of factor pairs for ${n} holds how many pairs?`,
      (n) => `Find all factor pairs of ${n}. How many pairs did you find?`,
    ],
    band3: [
      (n) => `Exactly how many factor pairs does ${n} have?`,
      (n) => `Determine the total count of factor pairs of ${n}.`,
      (n) => `Counting each pair once, how many factor pairs make ${n}?`,
      (n) => `The factor pairs of ${n} come to how many pairs? Type the count.`,
    ],
  };
  const pairCountData = {
    band1: [4, 6, 8, 9, 10, 12, 4, 6, 8, 9, 10, 12, 6],
    band2: [14, 15, 16, 18, 20, 24, 25, 28, 30, 21, 27, 22, 14],
    band3: [32, 36, 40, 42, 45, 48, 50, 54, 60, 44, 56, 32, 36],
  };
  for (const band of ["band1", "band2", "band3"]) {
    pairCountData[band].forEach((n, i) => {
      items.push(
        item("factorPairs", "procedural", `pairCount_${band}`, band, {
          answer: pairCount(n),
          answerType: "numberPad",
          display: { fm: { kind: "pairCount", n }, promptText: pairCountPhr[band][phrIdx(i, band === "band1" ? 6 : band === "band2" ? 12 : 11, 4)](n) },
        })
      );
    });
  }

  return items;
}

export function factorPairsConceptual() {
  const items = [];

  const pairJudgePhr = {
    band1: [
      (nm, a, b, n) => `${nm} pairs ${a} with ${b} as a factor pair of ${n}. Is ${nm} right?`,
      (nm, a, b, n) => `${a} and ${b} make a factor pair for ${n}, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, a, b, n) => `${nm} writes ${a} x ${b} in the factor-pair list for ${n}. Does it belong?`,
      (nm, a, b, n) => `According to ${nm}, ${a} and ${b} multiply to ${n}. Is ${nm} right?`,
    ],
    band3: [
      (nm, a, b, n) => `${nm} certifies (${a}, ${b}) as a factor pair of ${n}. Valid?`,
      (nm, a, b, n) => `Audit ${nm}'s pair (${a}, ${b}) for ${n}. Clean audit?`,
    ],
  };
  const pairJudgeData = {
    band1: [[3, 4, 12, true], [3, 5, 12, false], [2, 4, 8, true], [2, 3, 8, false], [2, 3, 6, true], [2, 4, 6, false], [2, 5, 10, true], [3, 4, 10, false], [3, 3, 9, true], [2, 4, 9, false], [2, 6, 12, true], [4, 5, 12, false], [2, 2, 4, true], [2, 5, 4, false], [1, 8, 8, true], [3, 3, 8, false], [1, 6, 6, true], [4, 4, 6, false]],
    band2: [[2, 7, 14, true], [3, 5, 14, false], [3, 5, 15, true], [2, 8, 15, false], [2, 8, 16, true], [3, 6, 16, false], [2, 9, 18, true], [4, 5, 18, false], [4, 5, 20, true], [3, 7, 20, false], [4, 6, 24, true], [3, 9, 24, false], [5, 5, 25, true], [4, 6, 25, false], [4, 7, 28, true], [5, 6, 28, false], [5, 6, 30, true], [4, 8, 30, false]],
    band3: [[4, 8, 32, true], [5, 6, 32, false], [4, 9, 36, true], [5, 7, 36, false], [5, 8, 40, true], [6, 7, 40, false], [6, 7, 42, true], [5, 9, 42, false], [5, 9, 45, true], [6, 8, 45, false], [6, 8, 48, true], [7, 7, 48, false], [5, 10, 50, true], [6, 9, 50, false], [6, 9, 54, true], [7, 8, 54, false], [6, 10, 60, true], [7, 9, 60, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    pairJudgeData[band].forEach(([a, b, n, ok], i) => {
      items.push(
        item("factorPairs", "conceptual", `pairJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { fm: { kind: "pairSaid", a, b, n }, promptText: pairJudgePhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), a, b, n), truth: ok },
        })
      );
    });
  }

  const sumTrapPhr = {
    band1: [
      (nm, a, b, n) => `${nm} pairs ${a} and ${b} for ${n} because ${a} + ${b} = ${n}. Is ${nm} right?`,
      (nm, a, b, n) => `Since ${a} plus ${b} makes ${n}, ${nm} calls them a factor pair of ${n}. Is that right?`,
    ],
    band2: [
      (nm, a, b, n) => `${nm} adds ${a} + ${b} = ${n} and declares (${a}, ${b}) a factor pair of ${n}. Does the logic hold?`,
      (nm, a, b, n) => `Adding to ${n} makes a factor pair, argues ${nm}, pointing at ${a} and ${b}. Is ${nm} right?`,
    ],
    band3: [
      (nm, a, b, n) => `${nm}'s rule "if they add to ${n}, they factor ${n}" blesses (${a}, ${b}). Is the rule sound?`,
      (nm, a, b, n) => `Because ${a} + ${b} = ${n}, ${nm} lists (${a}, ${b}) under ${n}'s factor pairs. Correct?`,
    ],
  };
  const sumTrapData = {
    band1: [[5, 7, 12], [3, 5, 8], [2, 4, 6], [3, 7, 10], [4, 5, 9], [8, 4, 12], [1, 3, 4], [6, 4, 10], [5, 3, 8], [2, 7, 9], [7, 5, 12], [1, 5, 6], [5, 7, 12], [3, 5, 8], [2, 4, 6], [3, 7, 10], [4, 5, 9], [8, 4, 12]],
    band2: [[6, 8, 14], [7, 8, 15], [9, 7, 16], [8, 10, 18], [11, 9, 20], [14, 10, 24], [12, 13, 25], [13, 15, 28], [17, 13, 30], [10, 11, 21], [13, 14, 27], [9, 13, 22], [6, 8, 14], [7, 8, 15], [9, 7, 16], [8, 10, 18], [11, 9, 20], [14, 10, 24]],
    band3: [[15, 17, 32], [17, 19, 36], [18, 22, 40], [20, 22, 42], [21, 24, 45], [23, 25, 48], [24, 26, 50], [25, 29, 54], [28, 32, 60], [21, 23, 44], [27, 29, 56], [15, 17, 32], [17, 19, 36], [18, 22, 40], [20, 22, 42], [21, 24, 45], [23, 25, 48], [24, 26, 50]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    sumTrapData[band].forEach(([a, b, n], i) => {
      items.push(
        item("factorPairs", "conceptual", `sumTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { fm: { kind: "trapNo" }, promptText: sumTrapPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), a, b, n), truth: false },
        })
      );
    });
  }

  const swapPhr = {
    band1: [
      (nm, a, b, n) => `${nm} says ${a} x ${b} and ${b} x ${a} count as the SAME factor pair of ${n}. Is ${nm} right?`,
      (nm, a, b, n) => `Swapping the order, says ${nm}, does not make a new factor pair of ${n}: ${a} x ${b} is ${b} x ${a}. Is that right?`,
    ],
    band2: [
      (nm, a, b, n) => `${nm} counts ${a} x ${b} and ${b} x ${a} once, not twice, among ${n}'s pairs. Is the count right?`,
      (nm, a, b, n) => `One pair or two? ${nm} says ${a} x ${b} and ${b} x ${a} are one pair of ${n}. Is ${nm} right?`,
    ],
    band3: [
      (nm, a, b, n) => `${nm} treats (${a}, ${b}) and (${b}, ${a}) as the same factor pair of ${n}. Sound treatment?`,
      (nm, a, b, n) => `In ${nm}'s tally of ${n}'s factor pairs, (${a}, ${b}) equals (${b}, ${a}). Should it?`,
    ],
  };
  const swapData = {
    band1: [[3, 4, 12], [2, 4, 8], [2, 3, 6], [2, 5, 10], [2, 6, 12], [1, 9, 9], [1, 4, 4], [1, 10, 10], [3, 4, 12], [2, 4, 8], [2, 3, 6], [2, 5, 10], [2, 6, 12], [1, 9, 9], [1, 4, 4], [1, 10, 10]],
    band2: [[2, 7, 14], [3, 5, 15], [2, 8, 16], [2, 9, 18], [4, 5, 20], [4, 6, 24], [4, 7, 28], [5, 6, 30], [3, 7, 21], [3, 9, 27], [2, 11, 22], [3, 8, 24], [2, 7, 14], [3, 5, 15], [2, 8, 16], [2, 9, 18]],
    band3: [[4, 8, 32], [4, 9, 36], [5, 8, 40], [6, 7, 42], [5, 9, 45], [6, 8, 48], [5, 10, 50], [6, 9, 54], [6, 10, 60], [4, 11, 44], [7, 8, 56], [4, 12, 48], [4, 8, 32], [4, 9, 36], [5, 8, 40], [6, 7, 42]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    swapData[band].forEach(([a, b, n], i) => {
      items.push(
        item("factorPairs", "conceptual", `swapJudge_${band}`, band, {
          answer: "Yes",
          choices: ["Yes", "No"],
          display: { fm: { kind: "authoredYes" }, promptText: swapPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), a, b, n), truth: true },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* primesAndCommon                                                     */
/* ================================================================== */

export function primesProcedural() {
  const items = [];
  let seed = 591;

  const primePickPhr = {
    band1: [
      (list) => `Which of these is a prime number: ${list}? Pick it.`,
      (list) => `Pick the prime number from ${list}. Which is it?`,
      (list) => `One of ${list} is prime. Which one?`,
      (list) => `Choose the prime number among ${list}. Which do you choose?`,
    ],
    band2: [
      (list) => `Select the prime number: ${list}. Which is it?`,
      (list) => `Which number in ${list} is prime?`,
      (list) => `Exactly one of ${list} is prime. Which?`,
      (list) => `Find the prime among ${list}. Which did you find?`,
    ],
    band3: [
      (list) => `Identify the prime number in ${list}. Which is it?`,
      (list) => `Of ${list}, which is prime?`,
      (list) => `Precisely one of ${list} is prime. Which one is it?`,
      (list) => `Determine the prime within ${list}. Which do you pick?`,
    ],
  };
  const primePickData = {
    band1: [[5, [4, 6, 9]], [7, [4, 8, 9]], [3, [4, 6, 8]], [2, [4, 6, 9]], [11, [4, 8, 12]], [13, [6, 9, 12]], [5, [6, 8, 10]], [7, [6, 10, 12]], [3, [6, 9, 10]], [2, [8, 9, 10]], [11, [6, 9, 10]], [13, [4, 10, 12]], [17, [4, 9, 15]]],
    band2: [[17, [15, 16, 18]], [19, [15, 20, 21]], [23, [21, 24, 25]], [29, [27, 28, 30]], [13, [14, 15, 16]], [11, [12, 14, 15]], [17, [14, 21, 27]], [19, [16, 22, 25]], [23, [20, 26, 28]], [29, [25, 26, 27]], [13, [12, 18, 20]], [11, [10, 16, 18]], [31, [27, 28, 30]]],
    band3: [[31, [32, 33, 34]], [37, [35, 36, 38]], [41, [39, 40, 42]], [43, [42, 44, 45]], [47, [45, 46, 48]], [53, [50, 51, 52]], [59, [55, 56, 57]], [61, [60, 62, 63]], [37, [34, 38, 39]], [41, [38, 44, 45]], [43, [40, 46, 48]], [47, [44, 49, 50]], [53, [54, 55, 56]]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    primePickData[band].forEach(([good, wrong], i) => {
      const all = shuffled([good, ...wrong], (seed += 1));
      items.push(
        item("primesAndCommon", "procedural", `primePick_${band}`, band, {
          answer: good,
          choices: all,
          display: { fm: { kind: "primePick" }, promptText: primePickPhr[band][phrIdx(i, 13, 4)](all.join(", ")) },
        })
      );
    });
  }

  const classifyPhr = {
    band1: [
      (n) => `Is ${n} prime or composite? Pick the label.`,
      (n) => `Pick the label for ${n}: prime or composite.`,
      (n) => `Classify the number ${n}: prime or composite?`,
      (n) => `The number ${n} is which kind: prime or composite?`,
    ],
    band2: [
      (n) => `Decide: is ${n} prime or composite?`,
      (n) => `Sort ${n} into the right bin: prime or composite.`,
      (n) => `Label ${n} correctly: prime or composite?`,
      (n) => `Which label fits ${n}: prime or composite?`,
    ],
    band3: [
      (n) => `Classify ${n} precisely: prime or composite?`,
      (n) => `Determine whether ${n} is prime or composite.`,
      (n) => `Judge the number ${n}: prime or composite?`,
      (n) => `Assign ${n} its label: prime or composite.`,
    ],
  };
  const classifyData = {
    band1: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15],
    band2: [14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 29],
    band3: [31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 57],
  };
  for (const band of ["band1", "band2", "band3"]) {
    classifyData[band].forEach((n, i) => {
      items.push(
        item("primesAndCommon", "procedural", `classify_${band}`, band, {
          answer: isPrime(n) ? "prime" : "composite",
          choices: ["prime", "composite"],
          display: { fm: { kind: "classify", n }, promptText: classifyPhr[band][phrIdx(i, 13, 4)](n) },
        })
      );
    });
  }

  const commonMultPhr = {
    band1: [
      (a, b) => `What is the smallest number that is a multiple of both ${a} and ${b}? Type it.`,
      (a, b) => `Count by ${a} and count by ${b}. Type the first number both counts share.`,
      (a, b) => `The lowest shared multiple of ${a} and ${b} = ?`,
      (a, b) => `Type the first number that appears in both the ${a}s count and the ${b}s count.`,
    ],
    band2: [
      (a, b) => `Find the least common multiple of ${a} and ${b}.`,
      (a, b) => `The smallest multiple shared by ${a} and ${b} = ? Type it.`,
      (a, b) => `Which number is the lowest common multiple of ${a} and ${b}?`,
      (a, b) => `Type the first common multiple of ${a} and ${b}.`,
    ],
    band3: [
      (a, b) => `Compute the least common multiple of ${a} and ${b} exactly.`,
      (a, b) => `Exactly which number is the LCM of ${a} and ${b}? Type it.`,
      (a, b) => `Determine the least common multiple of ${a} and ${b}.`,
      (a, b) => `The multiples of ${a} and of ${b} first meet at which number?`,
    ],
  };
  const commonMultData = {
    // band1 avoids nested pairs (lcm equal to an operand) — the answer would
    // be stated in the prompt and two band-1 phrasings carry no "?" marker.
    band1: [[2, 3], [2, 5], [3, 4], [2, 9], [3, 5], [4, 5], [4, 6], [2, 7], [2, 3], [3, 4], [2, 5], [4, 5], [2, 9]],
    band2: [[4, 6], [6, 8], [4, 10], [6, 9], [8, 12], [6, 10], [4, 14], [8, 10], [9, 12], [6, 14], [10, 15], [8, 14], [12, 16]],
    band3: [[12, 18], [15, 20], [12, 16], [14, 21], [16, 24], [18, 24], [15, 25], [20, 30], [12, 20], [18, 27], [16, 20], [21, 28], [24, 36]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    commonMultData[band].forEach(([a, b], i) => {
      items.push(
        item("primesAndCommon", "procedural", `commonMultiple_${band}`, band, {
          answer: lcm(a, b),
          answerType: "numberPad",
          display: { fm: { kind: "lcmOf", a, b }, promptText: commonMultPhr[band][phrIdx(i, band === "band1" ? 8 : 13, 4)](a, b) },
        })
      );
    });
  }

  const commonFacPhr = {
    band1: [
      (a, b) => `What is the greatest number that is a factor of both ${a} and ${b}? Type it.`,
      (a, b) => `Type the biggest factor shared by ${a} and ${b}.`,
      (a, b) => `The largest shared factor of ${a} and ${b} = ?`,
      (a, b) => `Which number is the greatest factor of both ${a} and ${b}? Type it.`,
    ],
    band2: [
      (a, b) => `Find the greatest common factor of ${a} and ${b}.`,
      (a, b) => `The largest factor shared by ${a} and ${b} = ? Type it.`,
      (a, b) => `Which number is the greatest common factor of ${a} and ${b}?`,
      (a, b) => `Type the biggest common factor of ${a} and ${b}.`,
    ],
    band3: [
      (a, b) => `Compute the greatest common factor of ${a} and ${b} exactly.`,
      (a, b) => `Exactly which number is the GCF of ${a} and ${b}? Type it.`,
      (a, b) => `Determine the greatest common factor of ${a} and ${b}.`,
      (a, b) => `The factor lists of ${a} and ${b} share which largest entry?`,
    ],
  };
  const commonFacData = {
    // band1 avoids nested pairs (gcf equal to an operand) for the same reason.
    band1: [[4, 6], [6, 9], [8, 12], [4, 10], [10, 4], [8, 10], [9, 12], [12, 8], [6, 10], [10, 12], [12, 10], [6, 8], [9, 6]],
    band2: [[12, 18], [14, 21], [16, 24], [15, 20], [18, 24], [20, 30], [12, 16], [14, 28], [15, 25], [16, 20], [18, 27], [21, 28], [24, 30]],
    band3: [[24, 36], [30, 45], [32, 48], [28, 42], [36, 54], [40, 60], [24, 40], [30, 50], [32, 40], [36, 48], [42, 56], [45, 60], [44, 55]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    commonFacData[band].forEach(([a, b], i) => {
      items.push(
        item("primesAndCommon", "procedural", `commonFactor_${band}`, band, {
          answer: gcd(a, b),
          answerType: "numberPad",
          display: { fm: { kind: "gcfOf", a, b }, promptText: commonFacPhr[band][phrIdx(i, 13, 4)](a, b) },
        })
      );
    });
  }

  return items;
}

export function primesConceptual() {
  const items = [];

  const primeJudgePhr = {
    band1: [
      (nm, n) => `${nm} calls ${n} a prime number. Is ${nm} right?`,
      (nm, n) => `${n} is prime, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, n) => `${nm} sorts ${n} into the prime bin. Does it belong there?`,
      (nm, n) => `According to ${nm}, ${n} has exactly two factors. Is ${nm} right?`,
    ],
    band3: [
      (nm, n) => `${nm} certifies ${n} as prime. Is the certification valid?`,
      (nm, n) => `Auditing ${nm}'s prime list: it includes ${n}. Clean audit?`,
    ],
  };
  const primeJudgeData = {
    band1: [[5, true], [9, false], [7, true], [4, false], [3, true], [6, false], [2, true], [8, false], [11, true], [10, false], [13, true], [12, false], [5, true], [15, false], [7, true], [9, false], [3, true], [4, false]],
    band2: [[17, true], [15, false], [19, true], [21, false], [23, true], [25, false], [29, true], [27, false], [13, true], [14, false], [11, true], [16, false], [17, true], [18, false], [19, true], [20, false], [23, true], [24, false]],
    band3: [[31, true], [33, false], [37, true], [35, false], [41, true], [39, false], [43, true], [45, false], [47, true], [49, false], [53, true], [51, false], [59, true], [55, false], [61, true], [57, false], [31, true], [49, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    primeJudgeData[band].forEach(([n, ok], i) => {
      items.push(
        item("primesAndCommon", "conceptual", `primeJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { fm: { kind: "primeSaid", n }, promptText: primeJudgePhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), n), truth: ok },
        })
      );
    });
  }

  const twoPhr = {
    band1: [
      (nm) => `${nm} says 2 is a prime number even though it is even. Is ${nm} right?`,
      (nm) => `${nm} says every even number is composite, including 2. Is ${nm} right?`,
    ],
    band2: [
      (nm) => `${nm} claims 2 is the only even prime number. Is the claim right?`,
      (nm) => `Evens can never be prime, argues ${nm}, so 2 is composite. Is ${nm} right?`,
    ],
    band3: [
      (nm) => `${nm} asserts that 2 belongs on the prime list as its only even member. Sound assertion?`,
      (nm) => `${nm} strikes 2 from the primes for being even. Should it be struck?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < 16; i += 1) {
      const ok = i % 2 === 0;
      items.push(
        item("primesAndCommon", "conceptual", `evenPrimeJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { fm: { kind: "authored" }, promptText: twoPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band])) + (i >= 8 ? " Think about the factors of 2." : ""), truth: ok },
        })
      );
    }
  }

  const oneTrapPhr = {
    band1: [
      (nm) => `${nm} says 1 is a prime number. Is ${nm} right?`,
      (nm) => `1 belongs on the prime list, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm) => `${nm} adds 1 to the prime list because it only divides by itself. Does 1 belong there?`,
      (nm) => `According to ${nm}, 1 counts as prime. Is ${nm} right?`,
    ],
    band3: [
      (nm) => `${nm} defends 1 as prime since its only factor is 1. Is the defense sound?`,
      (nm) => `On ${nm}'s chart, 1 sits among the primes. Should it?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < 18; i += 1) {
      items.push(
        item("primesAndCommon", "conceptual", `oneNotPrime_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { fm: { kind: "trapNo" }, promptText: oneTrapPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band])) + (i >= 12 ? " Primes need exactly two factors." : i >= 6 ? " Count the factors of 1." : ""), truth: false },
        })
      );
    }
  }

  return items;
}
