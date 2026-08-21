/* fractions bank part 2 — compareFractions, addLikeDenominators,
 * fractionOfSet. See fractionsTemplates.js for conventions.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";
import { LEVELS, item, nameAt, F, DEN_WORDS, OFF } from "./fractionsTemplates.js";

/* ================================================================== */
/* compareFractions                                                    */
/* ================================================================== */

export function compareProcedural() {
  const items = [];
  let seed = 411;

  const sameDenPhr = {
    band1: [
      (a, b, c) => `Which symbol fits: ${F(a, c)} ? ${F(b, c)} — pick <, >, or =.`,
      (a, b, c) => `Compare ${F(a, c)} with ${F(b, c)}. Which symbol belongs between them?`,
    ],
    band2: [
      (a, b, c) => `Same bottoms: ${F(a, c)} versus ${F(b, c)}. Choose <, >, or =.`,
      (a, b, c) => `Set the right symbol between ${F(a, c)} and ${F(b, c)}. Which is it?`,
    ],
    band3: [
      (a, b, c) => `Precisely relate ${F(a, c)} to ${F(b, c)}. Which of <, >, = is true?`,
      (a, b, c) => `Between ${F(a, c)} and ${F(b, c)}, exactly one symbol holds. Which?`,
    ],
  };
  const sameDenData = {
    band1: [[1, 2, 3], [2, 1, 3], [1, 3, 4], [3, 1, 4], [2, 3, 4], [3, 2, 4], [1, 2, 4], [2, 2, 4], [1, 1, 3], [2, 3, 3? 0 : 0]].filter((r) => r[2]).concat([[3, 2, 4], [1, 2, 3], [2, 1, 4], [1, 3, 3? 0 : 0]].filter((r) => r[2])),
    band2: [],
    band3: [],
  };
  const sameDenLists = {
    band1: [[1, 2, 3], [2, 1, 3], [1, 1, 3], [2, 2, 3], [1, 3, 4], [3, 1, 4], [2, 3, 4], [3, 2, 4], [1, 2, 4], [2, 1, 4], [2, 2, 4], [3, 3, 4]],
    band2: [[2, 4, 5], [4, 2, 5], [1, 5, 6], [5, 1, 6], [3, 5, 8], [5, 3, 8], [2, 2, 5], [3, 3, 6], [1, 4, 5], [4, 4, 8], [2, 5, 6], [7, 3, 8]],
    band3: [[3, 7, 10], [7, 3, 10], [5, 11, 12], [11, 5, 12], [9, 1, 10], [1, 9, 10], [7, 7, 12], [5, 5, 10], [11, 1, 12], [3, 9, 10], [5, 7, 12], [9, 9, 10]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    sameDenLists[band].forEach(([a, b, c], i) => {
      const good = a > b ? ">" : a < b ? "<" : "=";
      items.push(
        item("compareFractions", "procedural", `sameDenCmp_${band}`, band, {
          answer: good,
          choices: shuffled(["<", ">", "="], (seed += 1)),
          display: { frac: { kind: "cmp", a, b: c, c: b, d: c }, promptText: sameDenPhr[band][i % 2](a, b, c) },
        })
      );
    });
  }

  const sameNumPhr = {
    band1: [
      (n, b, d) => `Same tops: ${F(n, b)} ? ${F(n, d)}. Pick <, >, or =.`,
      (n, b, d) => `Compare ${F(n, b)} with ${F(n, d)}. Which symbol is right?`,
    ],
    band2: [
      (n, b, d) => `${F(n, b)} against ${F(n, d)} — bigger pieces win. Which symbol holds?`,
      (n, b, d) => `Choose the true symbol between ${F(n, b)} and ${F(n, d)}.`,
    ],
    band3: [
      (n, b, d) => `Exactly relate ${F(n, b)} to ${F(n, d)}. Which symbol is correct?`,
      (n, b, d) => `One symbol truly links ${F(n, b)} and ${F(n, d)}. Which one?`,
    ],
  };
  const sameNumLists = {
    band1: [[1, 2, 3], [1, 3, 2], [1, 2, 4], [1, 4, 2], [1, 3, 4], [1, 4, 3], [2, 3, 4], [2, 4, 3], [3, 4, 4? 0 : 0], [1, 2, 2]].filter((r) => r[2]).concat([[2, 3, 4], [1, 4, 3]]),
    band2: [[1, 5, 6], [1, 6, 5], [2, 5, 8], [2, 8, 5], [3, 6, 8], [3, 8, 6], [1, 5, 8], [1, 8, 5], [4, 5, 6], [4, 6, 5], [5, 6, 8], [5, 8, 6]],
    band3: [[3, 10, 12], [3, 12, 10], [7, 10, 12], [7, 12, 10], [1, 10, 12], [1, 12, 10], [5, 10, 12], [5, 12, 10], [9, 10, 12], [9, 12, 10], [11, 12, 12? 0 : 0], [2, 10, 12]].filter((r) => r[2]).concat([[2, 12, 10]]),
  };
  for (const band of ["band1", "band2", "band3"]) {
    sameNumLists[band].forEach(([n, b, d], i) => {
      const good = b < d ? ">" : b > d ? "<" : "=";
      items.push(
        item("compareFractions", "procedural", `sameNumCmp_${band}`, band, {
          answer: good,
          choices: shuffled(["<", ">", "="], (seed += 1)),
          display: { frac: { kind: "cmp", a: n, b, c: n, d }, promptText: sameNumPhr[band][i % 2](n, b, d) },
        })
      );
    });
  }

  const halfPhr = {
    band1: [
      (a, b) => `Is ${F(a, b)} less than, equal to, or greater than one half? Pick the answer.`,
      (a, b) => `Place ${F(a, b)} against 1/2. Which relation is true?`,
    ],
    band2: [
      (a, b) => `Benchmark ${F(a, b)} against a half. Less, equal, or greater?`,
      (a, b) => `Where does ${F(a, b)} stand next to 1/2? Choose the relation.`,
    ],
    band3: [
      (a, b) => `Precisely benchmark ${F(a, b)} at the half mark. Which relation holds?`,
      (a, b) => `Against the 1/2 benchmark, ${F(a, b)} lands where? Pick the relation.`,
    ],
  };
  const halfLists = {
    band1: [[1, 3], [2, 3], [1, 4], [3, 4], [2, 4], [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 4], [1, 2]],
    band2: [[2, 5], [3, 5], [1, 6], [5, 6], [3, 8], [5, 8], [4, 8], [3, 6], [1, 5], [4, 5], [2, 6], [4, 6]],
    band3: [[3, 10], [7, 10], [5, 12], [7, 12], [5, 10], [6, 12], [1, 10], [9, 10], [1, 12], [11, 12], [4, 10], [8, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    halfLists[band].forEach(([a, b], i) => {
      const cmp = a * 2 - b;
      const good = cmp < 0 ? "less than 1/2" : cmp === 0 ? "equal to 1/2" : "greater than 1/2";
      items.push(
        item("compareFractions", "procedural", `halfBenchmark_${band}`, band, {
          answer: good,
          choices: shuffled(["less than 1/2", "equal to 1/2", "greater than 1/2"], (seed += 1)),
          display: { frac: { kind: "halfCmp", a, b }, promptText: halfPhr[band][Math.floor(i / 6) % 2](a, b) },
        })
      );
    });
  }

  return items;
}

export function compareConceptual() {
  const items = [];
  let seed = 421;

  const bigDenTrapPhr = {
    band1: [
      (nm, n, b, d) => `${nm} says ${F(n, d)} beats ${F(n, b)} because ${d} is bigger than ${b}. Is ${nm} right?`,
      (nm, n, b, d) => `Bigger bottom means bigger fraction, argues ${nm}, so ${F(n, d)} > ${F(n, b)}. Is that right?`,
    ],
    band2: [
      (nm, n, b, d) => `${nm} ranks ${F(n, d)} above ${F(n, b)} since ${d} > ${b}. Does the ranking hold?`,
      (nm, n, b, d) => `Because denominators grew, ${nm} claims ${F(n, d)} outweighs ${F(n, b)}. Is ${nm} right?`,
    ],
    band3: [
      (nm, n, b, d) => `${nm}'s rule "larger denominator, larger fraction" makes ${F(n, d)} > ${F(n, b)}. Is the rule sound here?`,
      (nm, n, b, d) => `Applying denominator-size logic, ${nm} puts ${F(n, d)} over ${F(n, b)}. Is that right?`,
    ],
  };
  const bigDenData = {
    band1: [[1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4], [1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4], [1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4], [1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4], [1, 2, 3], [1, 2, 4]],
    band2: [[1, 5, 6], [2, 5, 8], [3, 6, 8], [1, 5, 8], [4, 5, 6], [5, 6, 8], [1, 5, 6], [2, 5, 8], [3, 6, 8], [1, 5, 8], [4, 5, 6], [5, 6, 8], [1, 5, 6], [2, 5, 8], [3, 6, 8], [1, 5, 8], [4, 5, 6], [5, 6, 8]],
    band3: [[3, 10, 12], [7, 10, 12], [1, 10, 12], [5, 10, 12], [9, 10, 12], [2, 10, 12], [3, 10, 12], [7, 10, 12], [1, 10, 12], [5, 10, 12], [9, 10, 12], [2, 10, 12], [3, 10, 12], [7, 10, 12], [1, 10, 12], [5, 10, 12], [9, 10, 12], [2, 10, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    bigDenData[band].forEach(([n, b, d], i) => {
      items.push(
        item("compareFractions", "conceptual", `bigDenTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "trapNo" }, promptText: bigDenTrapPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), n, b, d), truth: false },
        })
      );
    });
  }

  const whichBiggerPhr = {
    band1: [
      (nm, a, b, c, d) => `Which is more pie: ${F(a, b)} of it or ${F(c, d)} of it? ${nm} decides.`,
      (nm, a, b, c, d) => `${nm} weighs ${F(a, b)} against ${F(c, d)}. Which fraction is larger?`,
    ],
    band2: [
      (nm, a, b, c, d) => `${nm} compares ${F(a, b)} with ${F(c, d)}. Which one wins?`,
      (nm, a, b, c, d) => `Pick the larger of ${F(a, b)} and ${F(c, d)}. ${nm} shows the work.`,
    ],
    band3: [
      (nm, a, b, c, d) => `Exactly which is greater: ${F(a, b)} or ${F(c, d)}? ${nm} cross-multiplies.`,
      (nm, a, b, c, d) => `${nm} settles ${F(a, b)} versus ${F(c, d)} for good. Which is greater?`,
    ],
  };
  const whichBiggerData = {
    band1: [[2, 3, 1, 3], [3, 4, 2, 4], [1, 2, 1, 3], [1, 2, 1, 4], [2, 3, 2, 4], [3, 4, 1, 2], [2, 4, 1, 4], [1, 3, 1, 4], [2, 3, 1, 2], [3, 4, 2, 3? 0 : 3]].filter((r) => r[3]).concat([[2, 3, 1, 4], [3, 4, 1, 3], [1, 2, 2, 4? 0 : 0]].filter((r) => r[3]).slice(0, 2)).concat([[2, 3, 1, 3], [3, 4, 2, 4], [1, 2, 1, 3], [1, 2, 1, 4]]),
    band2: [[4, 5, 2, 5], [5, 6, 1, 6], [5, 8, 3, 8], [1, 5, 1, 6], [2, 5, 2, 8], [3, 6, 3, 8], [4, 5, 4, 6], [5, 6, 5, 8], [3, 5, 1, 2], [5, 8, 1, 2], [1, 2, 2, 5], [3, 4, 5, 8], [5, 6, 3, 4], [2, 3, 3, 5], [7, 8, 5, 6], [4, 5, 3, 4]],
    band3: [[7, 10, 3, 10], [11, 12, 5, 12], [9, 10, 7, 10], [3, 10, 3, 12], [7, 10, 7, 12], [1, 10, 1, 12], [9, 10, 9, 12], [5, 10, 5, 12], [7, 10, 1, 2], [7, 12, 1, 2], [3, 4, 7, 10], [5, 6, 9, 12], [11, 12, 9, 10], [2, 3, 7, 12], [4, 5, 7, 10], [5, 8, 7, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    whichBiggerData[band].forEach(([a, b, c, d], i) => {
      if (a * d === c * b) return;
      const good = a * d > c * b ? F(a, b) : F(c, d);
      items.push(
        item("compareFractions", "conceptual", `whichBigger_${band}`, band, {
          answer: good,
          choices: shuffled([F(a, b), F(c, d)], (seed += 1)),
          display: { frac: { kind: "cmpPick", a, b, c, d }, promptText: whichBiggerPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), a, b, c, d) },
        })
      );
    });
  }

  const sameWholePhr = {
    band1: [
      (nm) => `${nm} compares half of a small cookie with half of a giant cookie and calls them equal amounts. Is ${nm} right?`,
      (nm) => `Half of a big pizza and half of a tiny pizza are the same amount of food, says ${nm}. Is that right?`,
    ],
    band2: [
      (nm) => `${nm} claims 1/3 of a garden bed always equals 1/3 of a park. Is ${nm} right?`,
      (nm) => `A third of a juice box matches a third of a jug, argues ${nm}. Does the argument hold?`,
    ],
    band3: [
      (nm) => `${nm} states that 3/4 of any two different wholes are always equal amounts. Is the statement right?`,
      (nm) => `Comparing 3/4 of a small field to 3/4 of a stadium, ${nm} calls them identical areas. Is that right?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < 17; i += 1) {
      items.push(
        item("compareFractions", "conceptual", `sameWholeTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "trapNo" }, promptText: sameWholePhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band])) + (i >= 10 ? " Think about the wholes." : ""), truth: false },
        })
      );
    }
  }

  return items;
}

/* ================================================================== */
/* addLikeDenominators                                                 */
/* ================================================================== */

export function addLikeProcedural() {
  const items = [];
  let seed = 431;

  const addPhr = {
    band1: [
      (a, b, d) => `${F(a, d)} + ${F(b, d)} = ? Pick the sum.`,
      (a, b, d) => `Add ${F(a, d)} and ${F(b, d)}. Which fraction results?`,
      (a, b, d) => `Join ${F(a, d)} with ${F(b, d)}. Which fraction do they make together?`,
      (a, b, d) => `Put ${F(a, d)} and ${F(b, d)} together. Pick the total fraction.`,
    ],
    band2: [
      (a, b, d) => `Sum the like fractions ${F(a, d)} + ${F(b, d)}. What do you get?`,
      (a, b, d) => `${F(a, d)} plus ${F(b, d)} totals which fraction?`,
      (a, b, d) => `Work out ${F(a, d)} + ${F(b, d)}. Which fraction is the total?`,
      (a, b, d) => `Combine ${F(a, d)} and ${F(b, d)}. Which fraction is the combined amount?`,
    ],
    band3: [
      (a, b, d) => `Compute exactly: ${F(a, d)} + ${F(b, d)}. Which fraction is the sum?`,
      (a, b, d) => `The precise sum of ${F(a, d)} and ${F(b, d)} is which fraction?`,
      (a, b, d) => `Evaluate ${F(a, d)} + ${F(b, d)} in one step. Which fraction results?`,
      (a, b, d) => `Adding ${F(a, d)} to ${F(b, d)} yields exactly which fraction?`,
    ],
  };
  const addLists = {
    band1: [[1, 1, 2], [1, 1, 3], [1, 2, 3], [2, 1, 3], [1, 1, 4], [1, 2, 4], [2, 1, 4], [1, 3, 4], [3, 1, 4], [2, 2, 4], [1, 1, 2], [1, 1, 3]],
    band2: [[2, 2, 5], [1, 3, 5], [2, 3, 6], [1, 4, 6], [3, 4, 8], [2, 5, 8], [1, 2, 5], [3, 2, 6], [5, 2, 8], [1, 3, 6], [3, 1, 5], [4, 3, 8]],
    band3: [[3, 4, 10], [2, 7, 10], [5, 4, 12], [3, 7, 12], [1, 8, 10], [5, 6, 12], [4, 5, 10], [7, 4, 12], [2, 6, 10], [1, 9, 12], [6, 3, 10], [8, 3, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    addLists[band].forEach(([a, b, d], i) => {
      const good = F(a + b, d);
      const wrong = [...new Set([F(a + b, d * 2), F(a + b + 1, d), F(Math.abs(a - b) || a + b + 2, d)])].filter((x) => x !== good);
      items.push(
        item("addLikeDenominators", "procedural", `addLike_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { frac: { kind: "addLike", a, b, d }, promptText: addPhr[band][Math.floor(i / 10) * 2 + (i % 2)](a, b, d) },
        })
      );
    });
  }

  const subPhr = {
    band1: [
      (a, b, d) => `${F(a, d)} - ${F(b, d)} = ? Pick the difference.`,
      (a, b, d) => `Take ${F(b, d)} away from ${F(a, d)}. Which fraction is left?`,
      (a, b, d) => `Start at ${F(a, d)} and remove ${F(b, d)}. Which fraction remains?`,
      (a, b, d) => `From ${F(a, d)}, subtract ${F(b, d)}. Pick what is left.`,
    ],
    band2: [
      (a, b, d) => `Subtract the like fractions: ${F(a, d)} - ${F(b, d)}. What remains?`,
      (a, b, d) => `${F(a, d)} minus ${F(b, d)} leaves which fraction?`,
      (a, b, d) => `Work out ${F(a, d)} - ${F(b, d)}. Which fraction is the difference?`,
      (a, b, d) => `Reduce ${F(a, d)} by ${F(b, d)}. Which fraction is left over?`,
    ],
    band3: [
      (a, b, d) => `Compute exactly: ${F(a, d)} - ${F(b, d)}. Which fraction remains?`,
      (a, b, d) => `The precise difference ${F(a, d)} - ${F(b, d)} is which fraction?`,
      (a, b, d) => `Evaluate ${F(a, d)} - ${F(b, d)} in one step. Which fraction results?`,
      (a, b, d) => `Subtracting ${F(b, d)} from ${F(a, d)} yields exactly which fraction?`,
    ],
  };
  const subLists = {
    band1: [[2, 1, 2], [2, 1, 3], [3, 1, 3], [3, 2, 3], [2, 1, 4], [3, 1, 4], [3, 2, 4], [4, 1, 4], [4, 2, 4], [4, 3, 4], [2, 1, 2], [2, 1, 3]],
    band2: [[4, 2, 5], [3, 1, 5], [5, 3, 6], [4, 1, 6], [7, 4, 8], [5, 2, 8], [4, 1, 5], [5, 2, 6], [7, 5, 8], [3, 2, 6], [4, 3, 5], [6, 1, 8]],
    band3: [[7, 4, 10], [9, 2, 10], [9, 4, 12], [11, 7, 12], [8, 1, 10], [11, 6, 12], [9, 5, 10], [11, 4, 12], [6, 2, 10], [10, 9, 12], [9, 6, 10], [11, 8, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    subLists[band].forEach(([a, b, d], i) => {
      const good = F(a - b, d);
      const wrong = [...new Set([F(a - b, d * 2), F(a + b, d), F(a - b + 1, d)])].filter((x) => x !== good);
      items.push(
        item("addLikeDenominators", "procedural", `subLike_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { frac: { kind: "subLike", a, b, d }, promptText: subPhr[band][Math.floor(i / 10) * 2 + (i % 2)](a, b, d) },
        })
      );
    });
  }

  const missingPhr = {
    band1: [
      (a, s, d) => `${F(a, d)} + ?/${d} = ${F(s, d)}. What is the missing top number?`,
      (a, s, d) => `What numerator over ${d} completes ${F(a, d)} + ?/${d} = ${F(s, d)}?`,
      (a, s, d) => `${F(a, d)} needs how many more ${DEN_WORDS[d]} to reach ${F(s, d)}? Give the count.`,
      (a, s, d) => `Find the missing top number: ${F(a, d)} + ?/${d} makes ${F(s, d)}.`,
    ],
    band2: [
      (a, s, d) => `Fill the blank: ${F(a, d)} + ?/${d} = ${F(s, d)}. Which numerator?`,
      (a, s, d) => `${F(a, d)} needs ?/${d} more to reach ${F(s, d)}. What is the top number?`,
      (a, s, d) => `Which numerator over ${d} bridges ${F(a, d)} up to ${F(s, d)}?`,
      (a, s, d) => `Complete the equation ${F(a, d)} + ?/${d} = ${F(s, d)} with the right numerator.`,
    ],
    band3: [
      (a, s, d) => `Solve exactly: ${F(a, d)} + ?/${d} = ${F(s, d)}. The missing numerator = ?`,
      (a, s, d) => `To climb from ${F(a, d)} to ${F(s, d)}, add ?/${d}. Which numerator?`,
      (a, s, d) => `Determine the numerator: ${F(a, d)} + ?/${d} lands exactly on ${F(s, d)}.`,
      (a, s, d) => `The gap between ${F(a, d)} and ${F(s, d)} is ?/${d}. What is the top number?`,
    ],
  };
  const missLists = {
    band1: [[1, 2, 2], [1, 2, 3], [1, 3, 3], [2, 3, 3], [1, 2, 4], [1, 3, 4], [1, 4, 4], [2, 3, 4], [2, 4, 4], [3, 4, 4], [1, 2, 2], [1, 2, 3]],
    band2: [[2, 4, 5], [1, 4, 5], [3, 5, 6], [1, 5, 6], [3, 7, 8], [2, 7, 8], [1, 3, 5], [2, 5, 6], [5, 7, 8], [2, 3, 6], [1, 4, 8], [3, 4, 5], [4, 5, 6], [1, 6, 8]],
    band3: [[3, 7, 10], [2, 9, 10], [5, 9, 12], [7, 11, 12], [1, 8, 10], [5, 11, 12], [4, 9, 10], [4, 11, 12], [2, 6, 10], [9, 10, 12], [6, 9, 10], [8, 11, 12], [3, 9, 10], [7, 10, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    missLists[band].forEach(([a, s, d], i) => {
      items.push(
        item("addLikeDenominators", "procedural", `missingAddend_${band}`, band, {
          answer: s - a,
          answerType: "numberPad",
          display: { frac: { kind: "missingAddend", a, s, d }, promptText: missingPhr[band][Math.floor(i / 10) * 2 + (i % 2)](a, s, d) },
        })
      );
    });
  }

  return items;
}

export function addLikeConceptual() {
  const items = [];
  let seed = 441;

  const denTrapPhr = {
    band1: [
      (nm, a, b, d) => `${nm} adds ${F(a, d)} + ${F(b, d)} and gets ${F(a + b, d + d)} by adding the bottoms too. Is ${nm} right?`,
      (nm, a, b, d) => `For ${F(a, d)} + ${F(b, d)}, ${nm} writes ${F(a + b, d + d)}. Is that right?`,
    ],
    band2: [
      (nm, a, b, d) => `${nm} sums ${F(a, d)} and ${F(b, d)} as ${F(a + b, d + d)}, doubling the denominator. Does the sum hold?`,
      (nm, a, b, d) => `Adding tops AND bottoms, ${nm} turns ${F(a, d)} + ${F(b, d)} into ${F(a + b, d + d)}. Is ${nm} right?`,
    ],
    band3: [
      (nm, a, b, d) => `${nm}'s worked answer for ${F(a, d)} + ${F(b, d)} reads ${F(a + b, d + d)}. Is the work sound?`,
      (nm, a, b, d) => `${nm} defends ${F(a + b, d + d)} as the total of ${F(a, d)} + ${F(b, d)}. Should the defense stand?`,
    ],
  };
  const denTrapData = {
    band1: [[1, 1, 3], [1, 2, 4], [1, 1, 4], [2, 1, 4], [1, 1, 3], [1, 2, 4], [1, 1, 4], [2, 1, 4], [1, 1, 3], [1, 2, 4], [1, 1, 4], [2, 1, 4], [1, 1, 3], [1, 2, 4], [1, 1, 4], [2, 1, 4], [1, 1, 3], [1, 2, 4]],
    band2: [[2, 2, 5], [1, 3, 5], [2, 3, 6], [1, 4, 6], [3, 4, 8], [2, 5, 8], [1, 2, 5], [3, 2, 6], [5, 2, 8], [1, 3, 6], [3, 1, 5], [4, 3, 8], [2, 2, 5], [1, 3, 5], [2, 3, 6], [1, 4, 6], [3, 4, 8], [2, 5, 8]],
    band3: [[3, 4, 10], [2, 7, 10], [5, 4, 12], [3, 7, 12], [1, 8, 10], [5, 6, 12], [4, 5, 10], [7, 4, 12], [2, 6, 10], [1, 9, 12], [6, 3, 10], [8, 3, 12], [3, 4, 10], [2, 7, 10], [5, 4, 12], [3, 7, 12], [1, 8, 10], [5, 6, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    denTrapData[band].forEach(([a, b, d], i) => {
      items.push(
        item("addLikeDenominators", "conceptual", `denTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "trapNo" }, promptText: denTrapPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), a, b, d), truth: false },
        })
      );
    });
  }

  const sumJudgePhr = {
    band1: [
      (nm, a, b, d, saidN) => `${nm} totals ${F(a, d)} + ${F(b, d)} as ${F(saidN, d)}. Is ${nm} right?`,
      (nm, a, b, d, saidN) => `The sum ${F(a, d)} + ${F(b, d)} equals ${F(saidN, d)}, per ${nm}. Is that right?`,
    ],
    band2: [
      (nm, a, b, d, saidN) => `${nm} reports ${F(saidN, d)} for ${F(a, d)} + ${F(b, d)}. Does the report hold?`,
      (nm, a, b, d, saidN) => `Check ${nm}'s sum: ${F(a, d)} + ${F(b, d)} = ${F(saidN, d)}. Right or not?`,
    ],
    band3: [
      (nm, a, b, d, saidN) => `${nm} certifies ${F(a, d)} + ${F(b, d)} = ${F(saidN, d)}. Is the certification valid?`,
      (nm, a, b, d, saidN) => `Audit the sum ${F(a, d)} + ${F(b, d)} = ${F(saidN, d)} from ${nm}. Clean?`,
    ],
  };
  const sumJudgeData = {
    band1: [[1, 1, 3, 2, true], [1, 2, 4, 4, false], [1, 1, 4, 2, true], [2, 1, 4, 4, false], [1, 2, 4, 3, true], [1, 1, 3, 3, false], [2, 1, 4, 3, true], [1, 1, 4, 3, false], [1, 1, 3, 2, true], [1, 2, 4, 2, false], [1, 1, 4, 2, true], [2, 1, 4, 2, false], [1, 2, 4, 3, true], [1, 1, 3, 1, false], [2, 1, 4, 3, true], [1, 1, 4, 1, false], [1, 1, 3, 2, true], [1, 2, 4, 4, false]],
    band2: [[2, 2, 5, 4, true], [1, 3, 5, 5, false], [2, 3, 6, 5, true], [1, 4, 6, 6, false], [3, 4, 8, 7, true], [2, 5, 8, 8, false], [1, 2, 5, 3, true], [3, 2, 6, 6, false], [5, 2, 8, 7, true], [1, 3, 6, 5, false], [3, 1, 5, 4, true], [4, 3, 8, 8, false], [2, 2, 5, 5, false], [1, 3, 5, 4, true], [2, 3, 6, 6, false], [1, 4, 6, 5, true], [3, 4, 8, 8, false], [2, 5, 8, 7, true]],
    band3: [[3, 4, 10, 7, true], [2, 7, 10, 10, false], [5, 4, 12, 9, true], [3, 7, 12, 11, false], [1, 8, 10, 9, true], [5, 6, 12, 12, false], [4, 5, 10, 9, true], [7, 4, 12, 12, false], [2, 6, 10, 8, true], [1, 9, 12, 11, false], [6, 3, 10, 9, true], [8, 3, 12, 12, false], [3, 4, 10, 8, false], [2, 7, 10, 9, true], [5, 4, 12, 10, false], [3, 7, 12, 10, true], [1, 8, 10, 8, false], [5, 6, 12, 11, true]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    sumJudgeData[band].forEach(([a, b, d, saidN, ok], i) => {
      items.push(
        item("addLikeDenominators", "conceptual", `sumJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "sumSaid", a, b, d, saidN }, promptText: sumJudgePhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), a, b, d, saidN), truth: ok },
        })
      );
    });
  }

  const buildWholePhr = {
    band1: [
      (nm, a, d) => `${nm} has ${F(a, d)} of a sticker sheet. What fraction more makes one whole sheet? Pick it.`,
      (nm, a, d) => `From ${F(a, d)}, which fraction must ${nm} add to reach exactly 1?`,
    ],
    band2: [
      (nm, a, d) => `${nm} sits at ${F(a, d)}. Which like fraction lifts ${nm} to one whole?`,
      (nm, a, d) => `To complete the whole from ${F(a, d)}, which fraction does ${nm} need?`,
    ],
    band3: [
      (nm, a, d) => `Exactly which fraction added to ${F(a, d)} produces 1? ${nm} works it out.`,
      (nm, a, d) => `${nm} tops up ${F(a, d)} to a full whole. Which fraction is the top-up?`,
    ],
  };
  const buildLists = {
    band1: [[1, 3], [2, 3], [1, 4], [3, 4], [2, 4], [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 4], [1, 2], [1, 3], [2, 3], [1, 4], [3, 4]],
    band2: [[2, 5], [3, 5], [1, 6], [5, 6], [3, 8], [5, 8], [1, 5], [4, 5], [2, 6], [4, 6], [1, 8], [7, 8], [2, 5], [3, 5], [1, 6], [5, 6]],
    band3: [[3, 10], [7, 10], [5, 12], [7, 12], [1, 10], [9, 10], [1, 12], [11, 12], [2, 10], [8, 10], [4, 12], [8, 12], [3, 10], [7, 10], [5, 12], [7, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    buildLists[band].forEach(([a, d], i) => {
      const good = F(d - a, d);
      const wrong = [...new Set([F(a, d), F(d - a + 1, d), F(d - a, d * 2)])].filter((x) => x !== good);
      items.push(
        item("addLikeDenominators", "conceptual", `completeWhole_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { frac: { kind: "complement", n: a, d }, promptText: buildWholePhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), a, d) },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* fractionOfSet                                                       */
/* ================================================================== */

export function ofSetProcedural() {
  const items = [];

  const ofPhr = {
    band1: [
      (n, d, w) => `${F(n, d)} of ${w} = ?`,
      (n, d, w) => `Find ${F(n, d)} of ${w}. What number is that?`,
    ],
    band2: [
      (n, d, w) => `Take ${F(n, d)} of the number ${w}. What do you get?`,
      (n, d, w) => `${F(n, d)} of ${w} works out to what number?`,
    ],
    band3: [
      (n, d, w) => `Compute exactly ${F(n, d)} of ${w}. What is the result?`,
      (n, d, w) => `The precise value of ${F(n, d)} of ${w} = ?`,
    ],
  };
  const ofData = {
    band1: [[1, 2, 12], [1, 2, 16], [1, 2, 20], [1, 3, 12], [1, 3, 15], [1, 3, 18], [1, 4, 12], [1, 4, 16], [1, 4, 20], [1, 2, 10], [1, 2, 18], [1, 4, 8], [1, 3, 9], [1, 2, 14], [1, 2, 8], [1, 4, 4], [1, 2, 6], [1, 3, 6], [1, 2, 4], [1, 4, 12? 0 : 0], [3, 4, 12], [2, 3, 12], [3, 4, 16], [2, 3, 15], [3, 4, 20], [2, 3, 18]].filter((r) => r[2]),
    band2: [[1, 5, 45], [2, 5, 45], [1, 6, 54], [5, 6, 54], [3, 8, 64], [5, 8, 64], [1, 5, 60], [4, 5, 60], [1, 6, 72], [2, 6, 72? 0 : 72]].filter((r) => r[2]).concat([[1, 8, 96], [7, 8, 96], [2, 5, 75], [3, 5, 75], [1, 6, 66], [5, 6, 66], [3, 8, 88], [5, 8, 88], [1, 5, 85], [4, 5, 85], [1, 4, 92], [3, 4, 92], [2, 3, 96], [1, 3, 96], [1, 2, 98], [5, 6, 84]]),
    band3: [[1, 10, 240], [7, 10, 240], [1, 12, 240], [5, 12, 240], [3, 10, 460], [9, 10, 460], [7, 12, 360], [11, 12, 360], [1, 10, 550], [3, 10, 550], [5, 12, 480], [1, 12, 480], [7, 10, 620], [9, 10, 620], [11, 12, 600], [5, 12, 600], [3, 10, 730], [1, 10, 730], [7, 12, 840], [1, 12, 840], [9, 10, 810], [7, 10, 810], [11, 12, 960], [5, 12, 960], [3, 10, 990], [9, 10, 990]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    ofData[band].forEach(([n, d, w], i) => {
      items.push(
        item("fractionOfSet", "procedural", `ofSet_${band}`, band, {
          answer: (w / d) * n,
          answerType: "numberPad",
          display: { frac: { kind: "ofSet", n, d, w }, promptText: ofPhr[band][i % 2](n, d, w) },
        })
      );
    });
  }

  const backPhr = {
    band1: [
      (d, part) => `${F(1, d)} of a number is ${part}. The number = ?`,
      (d, part) => `If one ${DEN_WORDS[d].slice(0, -1)} of a number is ${part}, what is the number?`,
    ],
    band2: [
      (d, part) => `A number's ${F(1, d)} equals ${part}. What is the whole number?`,
      (d, part) => `${F(1, d)} of ? = ${part}. Find the missing whole.`,
    ],
    band3: [
      (d, part) => `Exactly ${F(1, d)} of some number is ${part}. What number is it?`,
      (d, part) => `Reverse it: ${F(1, d)} of the mystery number gives ${part}. The number = ?`,
    ],
  };
  const backLists = {
    band1: [[2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [3, 4], [3, 5], [3, 6], [4, 3], [4, 4], [4, 5], [2, 5], [3, 3], [4, 2], [2, 4], [3, 2], [4, 1? 0 : 1], [2, 3]].filter((r) => r[1]),
    band2: [[5, 9], [5, 12], [6, 9], [6, 11], [8, 8], [8, 11], [5, 14], [6, 13], [8, 12], [5, 16], [6, 14], [8, 9], [5, 17], [6, 15], [8, 10], [5, 19], [6, 16], [8, 12? 0 : 0]].filter((r) => r[1]),
    band3: [[10, 24], [10, 46], [12, 20], [12, 30], [10, 55], [12, 40], [10, 62], [12, 50], [10, 73], [12, 70], [10, 81], [12, 80], [10, 99], [12, 45], [10, 37], [12, 35], [10, 58], [12, 65]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    backLists[band].forEach(([d, part], i) => {
      items.push(
        item("fractionOfSet", "procedural", `wholeFromUnit_${band}`, band, {
          answer: d * part,
          answerType: "numberPad",
          display: { frac: { kind: "wholeFromUnit", d, part }, promptText: backPhr[band][i % 2](d, part) },
        })
      );
    });
  }

  return items;
}

export function ofSetConceptual() {
  const items = [];
  let seed = 451;

  const judgePhr = {
    band1: [
      (nm, n, d, w, said) => `${nm} figures ${F(n, d)} of ${w} as ${said}. Is ${nm} right?`,
      (nm, n, d, w, said) => `${F(n, d)} of ${w} comes to ${said}, says ${nm}. Is that right?`,
    ],
    band2: [
      (nm, n, d, w, said) => `${nm} computes ${F(n, d)} of ${w} and lands on ${said}. Does it check out?`,
      (nm, n, d, w, said) => `Check ${nm}'s value of ${said} for ${F(n, d)} of ${w}. Right or wrong?`,
    ],
    band3: [
      (nm, n, d, w, said) => `${nm} certifies ${F(n, d)} of ${w} = ${said}. Is the certification valid?`,
      (nm, n, d, w, said) => `Audit: ${F(n, d)} of ${w} recorded as ${said} by ${nm}. Clean audit?`,
    ],
  };
  const judgeData = {
    band1: [[1, 2, 12, 6, true], [1, 2, 16, 7, false], [1, 3, 12, 4, true], [1, 3, 15, 6, false], [1, 4, 12, 3, true], [1, 4, 16, 5, false], [1, 2, 20, 10, true], [1, 2, 10, 6, false], [1, 3, 18, 6, true], [1, 3, 9, 4, false], [1, 4, 20, 5, true], [1, 4, 8, 3, false], [1, 2, 18, 9, true], [1, 2, 14, 8, false], [1, 3, 6, 2, true], [1, 4, 4, 2, false], [1, 2, 8, 4, true], [1, 2, 6, 2, false]],
    band2: [[1, 5, 45, 9, true], [2, 5, 45, 20, false], [1, 6, 54, 9, true], [5, 6, 54, 44, false], [3, 8, 64, 24, true], [5, 8, 64, 42, false], [1, 5, 60, 12, true], [4, 5, 60, 46, false], [1, 8, 96, 12, true], [7, 8, 96, 82, false], [2, 5, 75, 30, true], [3, 5, 75, 46, false], [1, 6, 66, 11, true], [5, 6, 66, 54, false], [3, 8, 88, 33, true], [5, 8, 88, 56, false], [1, 5, 85, 17, true], [4, 5, 85, 70, false]],
    band3: [[1, 10, 240, 24, true], [7, 10, 240, 170, false], [1, 12, 240, 20, true], [5, 12, 240, 105, false], [3, 10, 460, 138, true], [9, 10, 460, 410, false], [7, 12, 360, 210, true], [11, 12, 360, 320, false], [1, 10, 550, 55, true], [3, 10, 550, 160, false], [5, 12, 480, 200, true], [1, 12, 480, 45, false], [7, 10, 620, 434, true], [9, 10, 620, 552, false], [11, 12, 600, 550, true], [5, 12, 600, 245, false], [3, 10, 730, 219, true], [1, 10, 730, 78, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    judgeData[band].forEach(([n, d, w, said, ok], i) => {
      items.push(
        item("fractionOfSet", "conceptual", `ofSetJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "ofSetSaid", n, d, w, said }, promptText: judgePhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), n, d, w, said), truth: ok },
        })
      );
    });
  }

  const morePhr = {
    band1: [
      (nm, w) => `Which is more of ${w} things: half of them or a quarter of them? ${nm} decides.`,
      (nm, w) => `${nm} may take 1/2 or 1/4 of ${w} marbles. Which share is bigger?`,
    ],
    band2: [
      (nm, w) => `Of ${w} items, is 1/3 or 1/6 the larger take? ${nm} chooses.`,
      (nm, w) => `${nm} weighs 1/3 of ${w} against 1/6 of ${w}. Which is larger?`,
    ],
    band3: [
      (nm, w) => `From ${w} things, which claim is bigger: 1/4 of them or 1/5 of them? ${nm} reasons.`,
      (nm, w) => `${nm} contrasts a fourth of ${w} with a fifth of ${w}. Which amount wins?`,
    ],
  };
  const morePieces = { band1: ["1/2", "1/4"], band2: ["1/3", "1/6"], band3: ["1/4", "1/5"] };
  const moreData = { band1: [12, 16, 20, 8, 4, 12, 16, 20, 8, 4, 12, 16, 20, 8, 4, 12], band2: [66, 90, 78, 84, 96, 72, 66, 90, 78, 84, 96, 72, 66, 90, 78, 84], band3: [640, 960, 720, 660, 900, 780, 640, 960, 720, 660, 900, 780, 640, 960, 720, 660] };
  for (const band of ["band1", "band2", "band3"]) {
    moreData[band].forEach((w, i) => {
      items.push(
        item("fractionOfSet", "conceptual", `biggerShare_${band}`, band, {
          answer: morePieces[band][0],
          choices: shuffled([...morePieces[band]], (seed += 1)),
          display: { frac: { kind: "biggerShare" }, promptText: morePhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), w) },
        })
      );
    });
  }

  const remainderPhr = {
    band1: [
      (nm, d, w) => `${nm} gives away ${F(1, d)} of ${w} stickers. How many stickers does ${nm} KEEP?`,
      (nm, d, w) => `After handing over ${F(1, d)} of ${w} cards, how many cards stay with ${nm}?`,
    ],
    band2: [
      (nm, d, w) => `${nm} spends ${F(1, d)} of ${w} tokens. How many tokens remain with ${nm}?`,
      (nm, d, w) => `Giving up ${F(1, d)} of ${w} points, ${nm} keeps how many points?`,
    ],
    band3: [
      (nm, d, w) => `${nm} donates exactly ${F(1, d)} of ${w} beads. How many beads does ${nm} retain?`,
      (nm, d, w) => `After releasing ${F(1, d)} of ${w} entries, ${nm} holds how many entries?`,
    ],
  };
  const remainderData = {
    band1: [[2, 12], [2, 16], [2, 20], [3, 12], [3, 15], [3, 18], [4, 12], [4, 16], [4, 20], [2, 10], [2, 18], [4, 8], [3, 9], [2, 14], [2, 8], [3, 6]],
    band2: [[5, 45], [6, 54], [8, 64], [5, 60], [6, 72], [8, 96], [5, 75], [6, 66], [8, 88], [5, 85], [4, 92], [3, 96], [2, 98], [6, 84], [5, 90], [8, 72]],
    band3: [[10, 240], [12, 240], [10, 460], [12, 360], [10, 550], [12, 480], [10, 620], [12, 600], [10, 730], [12, 840], [10, 810], [12, 960], [10, 990], [12, 720], [10, 380], [12, 264]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    remainderData[band].forEach(([d, w], i) => {
      items.push(
        item("fractionOfSet", "conceptual", `keepRest_${band}`, band, {
          answer: w - w / d,
          answerType: "numberPad",
          display: { frac: { kind: "keepRest", d, w }, promptText: remainderPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), d, w) },
        })
      );
    });
  }

  return items;
}
