/* decimals bank part 2 — compareDecimals, decimalAsNumber. Conventions in
 * decimalsTemplates.js.
 */

import { shuffled } from "../counting/countingTemplates.js";
import { item, nameAt, D2, OFF, phrIdx } from "./decimalsTemplates.js";

/* ================================================================== */
/* compareDecimals                                                     */
/* ================================================================== */

export function compareProcedural() {
  const items = [];
  let seed = 531;

  const symPhr = {
    band1: [
      (a, b) => `${a} ? ${b}`,
      (a, b) => `Compare the decimals ${a} and ${b}. Which symbol belongs between them?`,
      (a, b) => `Set <, >, or = between ${a} and ${b}. Which is right?`,
      (a, b) => `Pick the true symbol for ${a} ? ${b}.`,
    ],
    band2: [
      (a, b) => `${a} ? ${b}`,
      (a, b) => `Between ${a} and ${b}, which of <, >, = holds?`,
      (a, b) => `Relate ${a} to ${b} with the right symbol.`,
      (a, b) => `Which symbol makes ${a} ? ${b} true?`,
    ],
    band3: [
      (a, b) => `${a} ? ${b}`,
      (a, b) => `Exactly one symbol links ${a} and ${b}. Which one?`,
      (a, b) => `Determine the true relation between ${a} and ${b}.`,
      (a, b) => `Judge ${a} against ${b} and pick the symbol that holds.`,
    ],
  };
  const symData = {
    band1: [["0.3", "0.7"], ["0.7", "0.3"], ["0.5", "0.5"], ["0.2", "0.9"], ["0.9", "0.2"], ["0.4", "0.4"], ["0.1", "0.6"], ["0.6", "0.1"], ["0.8", "0.5"], ["0.5", "0.8"], ["0.2", "0.2"], ["0.9", "0.7"], ["0.3", "0.1"], ["0.1", "0.3"], ["0.7", "0.7"], ["0.4", "0.8"], ["0.8", "0.4"], ["0.6", "0.9"]],
    band2: [["0.5", "0.45"], ["0.45", "0.5"], ["0.30", "0.3"], ["0.7", "0.65"], ["0.08", "0.8"], ["0.8", "0.08"], ["0.25", "0.52"], ["0.52", "0.25"], ["0.60", "0.6"], ["0.09", "0.1"], ["0.1", "0.09"], ["0.33", "0.3"], ["0.3", "0.33"], ["0.75", "0.57"], ["0.57", "0.75"], ["0.40", "0.4"], ["0.06", "0.6"], ["0.9", "0.90"]],
    band3: [["3.45", "3.5"], ["3.5", "3.45"], ["2.70", "2.7"], ["1.08", "1.8"], ["1.8", "1.08"], ["5.55", "5.5"], ["5.5", "5.55"], ["4.20", "4.2"], ["6.19", "6.9"], ["6.9", "6.19"], ["7.07", "7.7"], ["7.7", "7.07"], ["8.80", "8.8"], ["2.34", "2.43"], ["2.43", "2.34"], ["9.01", "9.1"], ["9.1", "9.01"], ["3.60", "3.6"]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    symData[band].forEach(([a, b], i) => {
      const l = Number(a);
      const r = Number(b);
      const good = l > r ? ">" : l < r ? "<" : "=";
      items.push(
        item("compareDecimals", "procedural", `cmpSymbol_${band}`, band, {
          answer: good,
          choices: shuffled(["<", ">", "="], (seed += 1)),
          display: { dec: { kind: "cmpDec", a: l, b: r }, promptText: symPhr[band][phrIdx(i, 18, 4)](a, b) },
        })
      );
    });
  }

  const bigPhr = {
    band1: [
      (a, b) => `Which decimal is larger: ${a} or ${b}? Pick it.`,
      (a, b) => `Of ${a} and ${b}, pick the bigger decimal.`,
      (a, b) => `Choose the greater decimal: ${a} or ${b}.`,
      (a, b) => `Between ${a} and ${b}, which is more? Pick it.`,
    ],
    band2: [
      (a, b) => `Select the larger of ${a} and ${b}.`,
      (a, b) => `Which is greater, ${a} or ${b}? Choose it.`,
      (a, b) => `Pick whichever of ${a} and ${b} is bigger.`,
      (a, b) => `Find the greater decimal: ${a} versus ${b}.`,
    ],
    band3: [
      (a, b) => `Identify the larger decimal: ${a} or ${b}.`,
      (a, b) => `Exactly which is greater — ${a} or ${b}?`,
      (a, b) => `Determine the bigger of ${a} and ${b}.`,
      (a, b) => `Of the pair ${a} and ${b}, choose the larger.`,
    ],
  };
  const bigData = {
    band1: [["0.7", "0.3"], ["0.2", "0.8"], ["0.9", "0.4"], ["0.1", "0.5"], ["0.6", "0.2"], ["0.3", "0.9"], ["0.8", "0.6"], ["0.4", "0.1"], ["0.5", "0.7"], ["0.7", "0.3"], ["0.2", "0.8"], ["0.9", "0.4"], ["0.1", "0.5"], ["0.6", "0.2"], ["0.3", "0.9"], ["0.8", "0.6"], ["0.4", "0.1"]],
    band2: [["0.5", "0.45"], ["0.08", "0.8"], ["0.25", "0.52"], ["0.7", "0.65"], ["0.09", "0.1"], ["0.33", "0.3"], ["0.75", "0.57"], ["0.06", "0.6"], ["0.44", "0.4"], ["0.5", "0.45"], ["0.08", "0.8"], ["0.25", "0.52"], ["0.7", "0.65"], ["0.09", "0.1"], ["0.33", "0.3"], ["0.75", "0.57"], ["0.06", "0.6"]],
    band3: [["3.45", "3.5"], ["1.08", "1.8"], ["5.55", "5.5"], ["6.19", "6.9"], ["7.07", "7.7"], ["2.34", "2.43"], ["9.01", "9.1"], ["4.44", "4.4"], ["8.3", "8.29"], ["3.45", "3.5"], ["1.08", "1.8"], ["5.55", "5.5"], ["6.19", "6.9"], ["7.07", "7.7"], ["2.34", "2.43"], ["9.01", "9.1"], ["4.44", "4.4"]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    bigData[band].forEach(([a, b], i) => {
      const good = Number(a) > Number(b) ? a : b;
      items.push(
        item("compareDecimals", "procedural", `biggerPick_${band}`, band, {
          answer: good,
          choices: shuffled([a, b], (seed += 1)),
          display: { dec: { kind: "cmpPickDec", a: Number(a), b: Number(b), labels: [a, b] }, promptText: bigPhr[band][phrIdx(i, 9, 4)](a, b) },
        })
      );
    });
  }

  const smallPhr = {
    band1: [
      (x, y, z) => `Which is smallest: ${x}, ${y}, or ${z}? Pick it.`,
      (x, y, z) => `Of ${x}, ${y}, and ${z}, which decimal is least?`,
      (x, y, z) => `Pick the least of ${x}, ${y}, ${z}.`,
      (x, y, z) => `Among ${x}, ${y}, ${z}, choose the smallest decimal.`,
    ],
    band2: [
      (x, y, z) => `Find the smallest of ${x}, ${y}, and ${z}.`,
      (x, y, z) => `Among ${x}, ${y}, ${z}, which sits lowest?`,
      (x, y, z) => `Which of ${x}, ${y}, ${z} is the minimum?`,
      (x, y, z) => `Select the least decimal: ${x}, ${y}, or ${z}.`,
    ],
    band3: [
      (x, y, z) => `Exactly which of ${x}, ${y}, ${z} is least?`,
      (x, y, z) => `Rank ${x}, ${y}, ${z}: which one is the minimum?`,
      (x, y, z) => `Determine the smallest among ${x}, ${y}, and ${z}.`,
      (x, y, z) => `Of the three decimals ${x}, ${y}, ${z}, pick the least.`,
    ],
  };
  const smallData = {
    band1: [["0.2", "0.5", "0.8"], ["0.8", "0.5", "0.2"], ["0.5", "0.2", "0.8"], ["0.1", "0.9", "0.4"], ["0.9", "0.1", "0.4"], ["0.4", "0.9", "0.1"], ["0.3", "0.6", "0.7"], ["0.7", "0.3", "0.6"], ["0.6", "0.7", "0.3"], ["0.2", "0.5", "0.8"], ["0.8", "0.5", "0.2"], ["0.5", "0.2", "0.8"], ["0.1", "0.9", "0.4"], ["0.9", "0.1", "0.4"], ["0.4", "0.9", "0.1"], ["0.3", "0.6", "0.7"], ["0.7", "0.3", "0.6"]],
    band2: [["0.09", "0.9", "0.5"], ["0.9", "0.09", "0.5"], ["0.5", "0.9", "0.09"], ["0.25", "0.52", "0.2"], ["0.52", "0.2", "0.25"], ["0.2", "0.25", "0.52"], ["0.7", "0.07", "0.77"], ["0.07", "0.77", "0.7"], ["0.77", "0.7", "0.07"], ["0.09", "0.9", "0.5"], ["0.9", "0.09", "0.5"], ["0.5", "0.9", "0.09"], ["0.25", "0.52", "0.2"], ["0.52", "0.2", "0.25"], ["0.2", "0.25", "0.52"], ["0.7", "0.07", "0.77"], ["0.07", "0.77", "0.7"]],
    band3: [["3.45", "3.5", "3.05"], ["3.5", "3.05", "3.45"], ["3.05", "3.45", "3.5"], ["7.7", "7.07", "7.77"], ["7.07", "7.77", "7.7"], ["7.77", "7.7", "7.07"], ["2.34", "2.43", "2.3"], ["2.43", "2.3", "2.34"], ["2.3", "2.34", "2.43"], ["3.45", "3.5", "3.05"], ["3.5", "3.05", "3.45"], ["3.05", "3.45", "3.5"], ["7.7", "7.07", "7.77"], ["7.07", "7.77", "7.7"], ["7.77", "7.7", "7.07"], ["2.34", "2.43", "2.3"], ["2.43", "2.3", "2.34"]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    smallData[band].forEach(([x, y, z], i) => {
      const vals = [x, y, z];
      const good = vals.reduce((m, v) => (Number(v) < Number(m) ? v : m), x);
      items.push(
        item("compareDecimals", "procedural", `smallestPick_${band}`, band, {
          answer: good,
          choices: vals,
          display: { dec: { kind: "minPickDec", labels: vals }, promptText: smallPhr[band][phrIdx(i, 9, 4)](x, y, z) },
        })
      );
    });
  }

  return items;
}

export function compareConceptual() {
  const items = [];

  const longerTrapPhr = {
    band1: [
      (nm) => `${nm} says 0.15 must beat 0.7 because 15 is more than 7. Is ${nm} right?`,
      (nm) => `Because 12 is more than 4, ${nm} ranks 0.12 above 0.4. Is that right?`,
    ],
    band2: [
      (nm) => `${nm} claims 0.18 is greater than 0.6 since 18 beats 6. Does the claim hold?`,
      (nm) => `More digits means a bigger number, argues ${nm}, so 0.18 > 0.6. Is ${nm} right?`,
    ],
    band3: [
      (nm) => `${nm}'s rule "longer decimal, larger value" puts 0.125 above 0.9. Is the rule sound here?`,
      (nm) => `Applying digit-count logic, ${nm} places 0.125 over 0.9. Is that right?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < 18; i += 1) {
      items.push(
        item("compareDecimals", "conceptual", `longerTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { dec: { kind: "trapNo" }, promptText: longerTrapPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band])) + (i >= 12 ? " Think about place value." : i >= 6 ? " Check the tenths place first." : ""), truth: false },
        })
      );
    }
  }

  const cmpSaidPhr = {
    band1: [
      (nm, a, rel, b) => `${nm} writes ${a} ${rel} ${b}. Is ${nm} right?`,
      (nm, a, rel, b) => `On ${nm}'s card, the statement reads ${a} ${rel} ${b}. Is that right?`,
    ],
    band2: [
      (nm, a, rel, b) => `${nm} records the comparison ${a} ${rel} ${b}. Does it hold?`,
      (nm, a, rel, b) => `Check ${nm}'s claim: ${a} ${rel} ${b}. Right or not?`,
    ],
    band3: [
      (nm, a, rel, b) => `${nm} certifies ${a} ${rel} ${b}. Is the certification valid?`,
      (nm, a, rel, b) => `Audit the statement ${a} ${rel} ${b} from ${nm}. Clean?`,
    ],
  };
  const cmpSaidData = {
    band1: [["0.3", "<", "0.7", true], ["0.8", "<", "0.4", false], ["0.5", "=", "0.5", true], ["0.2", ">", "0.6", false], ["0.9", ">", "0.1", true], ["0.4", "=", "0.7", false], ["0.1", "<", "0.8", true], ["0.6", ">", "0.9", false], ["0.7", ">", "0.2", true], ["0.3", "=", "0.5", false], ["0.2", "<", "0.4", true], ["0.9", "<", "0.5", false], ["0.6", "=", "0.6", true], ["0.8", "<", "0.3", false], ["0.4", "<", "0.9", true], ["0.7", "=", "0.1", false], ["0.5", ">", "0.2", true], ["0.1", ">", "0.6", false]],
    band2: [["0.45", "<", "0.5", true], ["0.8", "<", "0.08", false], ["0.30", "=", "0.3", true], ["0.09", ">", "0.1", false], ["0.52", ">", "0.25", true], ["0.6", "=", "0.06", false], ["0.65", "<", "0.7", true], ["0.3", ">", "0.33", false], ["0.75", ">", "0.57", true], ["0.40", "<", "0.4", false], ["0.1", ">", "0.09", true], ["0.5", "<", "0.45", false], ["0.90", "=", "0.9", true], ["0.06", ">", "0.6", false], ["0.33", ">", "0.3", true], ["0.25", ">", "0.52", false], ["0.57", "<", "0.75", true], ["0.7", "<", "0.65", false]],
    band3: [["3.45", "<", "3.5", true], ["1.8", "<", "1.08", false], ["2.70", "=", "2.7", true], ["7.07", ">", "7.7", false], ["6.9", ">", "6.19", true], ["4.2", "=", "4.02", false], ["5.5", "<", "5.55", true], ["9.1", "<", "9.01", false], ["2.43", ">", "2.34", true], ["8.80", "<", "8.8", false], ["9.01", "<", "9.1", true], ["3.5", "<", "3.45", false], ["4.20", "=", "4.2", true], ["7.7", "<", "7.07", false], ["1.08", "<", "1.8", true], ["6.19", ">", "6.9", false], ["5.55", ">", "5.5", true], ["2.34", ">", "2.43", false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    cmpSaidData[band].forEach(([a, rel, b, ok], i) => {
      items.push(
        item("compareDecimals", "conceptual", `cmpJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { dec: { kind: "cmpSaidDec", a: Number(a), b: Number(b), rel }, promptText: cmpSaidPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), a, rel, b), truth: ok },
        })
      );
    });
  }

  const padTrapPhr = {
    band1: [
      (nm, n) => `${nm} says 0.${n}0 is bigger than 0.${n} because it is longer. Is ${nm} right?`,
      (nm, n) => `A longer decimal wins, argues ${nm}, so 0.${n}0 beats 0.${n}. Is that right?`,
    ],
    band2: [
      (nm, n) => `${nm} ranks 0.${n}0 above 0.${n} for having an extra digit. Does the ranking hold?`,
      (nm, n) => `Since 0.${n}0 shows more digits than 0.${n}, ${nm} calls it larger. Is ${nm} right?`,
    ],
    band3: [
      (nm, n) => `${nm} insists 0.${n}0 outranks 0.${n} on digit count alone. Is the insistence right?`,
      (nm, n) => `Digit-count logic tells ${nm} that 0.${n}0 exceeds 0.${n}. Sound logic?`,
    ],
  };
  const padNs = {
    band1: [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
    band2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 3, 5, 7, 9, 2, 4],
    band3: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 3, 5, 7, 9, 2, 4],
  };
  for (const band of ["band1", "band2", "band3"]) {
    padNs[band].forEach((n, i) => {
      items.push(
        item("compareDecimals", "conceptual", `padTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { dec: { kind: "trapNo" }, promptText: padTrapPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), n), truth: false },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* decimalAsNumber                                                     */
/* ================================================================== */

export function asNumberProcedural() {
  const items = [];

  const nextPhr = {
    band1: [
      (a, b, c) => `${a}, ${b}, ${c}, ?`,
      (a, b, c) => `The pattern ${a}, ${b}, ${c} climbs by one tenth. Type the next decimal.`,
      (a, b, c) => `Continue counting: ${a}, ${b}, ${c}, ? Type the next number.`,
      (a, b, c) => `After ${a}, ${b}, ${c}, which decimal comes next? Type it.`,
    ],
    band2: [
      (a, b, c) => `${a}, ${b}, ${c}, ?`,
      (a, b, c) => `Extend the tenths count ${a}, ${b}, ${c}. Type what follows.`,
      (a, b, c) => `${a}, ${b}, ${c} — keep counting by one tenth. Next = ?`,
      (a, b, c) => `Which decimal continues ${a}, ${b}, ${c}? Type it.`,
    ],
    band3: [
      (a, b, c) => `${a}, ${b}, ${c}, ?`,
      (a, b, c) => `The sequence ${a}, ${b}, ${c} steps by one hundredth. Type the next term.`,
      (a, b, c) => `Continue by hundredths: ${a}, ${b}, ${c}, ? Type it.`,
      (a, b, c) => `After ${a}, ${b}, ${c}, the hundredths count reaches which decimal? Type it.`,
    ],
  };
  const nextData = {
    band1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({ start: s / 10, step: 0.1 })),
    band2: [9, 10, 11, 14, 17, 21, 24, 27, 31, 34, 37, 41, 44, 47, 51, 54, 57, 61].map((s) => ({ start: s / 10, step: 0.1 })),
    band3: [11, 24, 37, 41, 55, 68, 72, 86, 93, 12, 25, 38, 42, 56, 69, 73, 87, 94].map((s) => ({ start: s / 100, step: 0.01 })),
  };
  for (const band of ["band1", "band2", "band3"]) {
    nextData[band].forEach(({ start, step }, i) => {
      const a = D2(start);
      const b = D2(start + step);
      const c = D2(start + 2 * step);
      const ans = D2(start + 3 * step);
      items.push(
        item("decimalAsNumber", "procedural", `countOn_${band}`, band, {
          answer: ans,
          answerType: "decimal",
          display: { dec: { kind: "countOnDec", start, step: band === "band3" ? 0.01 : 0.1, k: 3 }, promptText: nextPhr[band][phrIdx(i, band === "band1" ? 9 : 18, 4)](a, b, c) },
        })
      );
    });
  }

  const tickPhr = {
    band1: [
      (k) => `A number line runs 0 to 1 in 10 equal steps. Mark ${k} shows which decimal? Type it.`,
      (k) => `Step ${k} of 10 along a 0-1 line lands on which decimal? Type it.`,
      (k) => `On a 0-to-1 line with 10 equal steps, type the decimal at mark ${k}.`,
      (k) => `The mark after step ${k} on a 10-step 0-1 line names which decimal? Type it.`,
    ],
    band2: [
      (k) => `A 0-1 number line is cut into 10 equal steps. Type the decimal at step ${k}.`,
      (k) => `Between 0 and 1, mark ${k} of 10 sits at which decimal? Type it.`,
      (k) => `Walking 0 to 1 in 10 steps, where are you after step ${k}? Type the decimal.`,
      (k) => `Which decimal labels step ${k} on a ten-step 0-1 line? Type it.`,
    ],
    band3: [
      (k) => `A unit line is split into 100 equal steps. Type the decimal at mark ${k}.`,
      (k) => `Between 0 and 1, mark ${k} of 100 corresponds to which decimal? Type it.`,
      (k) => `Precisely which decimal sits at step ${k} of 100 on a 0-1 line? Type it.`,
      (k) => `On a hundred-step unit line, step ${k} names which decimal? Type it.`,
    ],
  };
  const tickData = {
    band1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 2, 4, 6, 8, 1, 3, 5, 7],
    band2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 2, 4, 6, 8, 1, 3, 5, 7],
    band3: [5, 15, 25, 35, 45, 55, 65, 75, 85, 95, 12, 28, 36, 52, 64, 78, 92],
  };
  for (const band of ["band1", "band2", "band3"]) {
    const den = band === "band3" ? 100 : 10;
    tickData[band].forEach((k, i) => {
      items.push(
        item("decimalAsNumber", "procedural", `tickRead_${band}`, band, {
          answer: D2(k / den),
          answerType: "decimal",
          display: { dec: { kind: "tickDec", k, den }, promptText: tickPhr[band][phrIdx(i, 9, 4)](k) },
        })
      );
    });
  }

  const addPhr = {
    band1: [
      (a, s) => `${a} + ${s} = ?`,
      (a, s) => `Add ${s} to ${a}. Type the result.`,
      (a, s) => `Start at ${a} and go up by ${s}. Where do you land? Type it.`,
      (a, s) => `The sum ${a} + ${s} equals which decimal? Type it.`,
    ],
    band2: [
      (a, s) => `${a} + ${s} = ?`,
      (a, s) => `Increase ${a} by ${s}. Type the new decimal.`,
      (a, s) => `${a} moved up by ${s} lands on which decimal? Type it.`,
      (a, s) => `Compute ${a} + ${s} and type the result.`,
    ],
    band3: [
      (a, s) => `${a} + ${s} = ?`,
      (a, s) => `The precise sum ${a} + ${s} = ? Type it.`,
      (a, s) => `Evaluate ${a} + ${s} in one step. Type the result.`,
      (a, s) => `Adding ${s} to ${a} yields which decimal? Type it.`,
    ],
  };
  const addData = {
    band1: [["0.2", "0.1"], ["0.4", "0.1"], ["0.6", "0.1"], ["0.1", "0.2"], ["0.3", "0.2"], ["0.5", "0.2"], ["0.2", "0.3"], ["0.4", "0.3"], ["0.1", "0.5"], ["0.2", "0.1"], ["0.4", "0.1"], ["0.6", "0.1"], ["0.1", "0.2"], ["0.3", "0.2"], ["0.5", "0.2"], ["0.2", "0.3"], ["0.4", "0.3"]],
    band2: [["0.45", "0.1"], ["0.32", "0.01"], ["0.67", "0.1"], ["0.28", "0.01"], ["0.53", "0.1"], ["0.76", "0.01"], ["0.14", "0.1"], ["0.89", "0.01"], ["0.61", "0.1"], ["0.45", "0.01"], ["0.32", "0.1"], ["0.67", "0.01"], ["0.28", "0.1"], ["0.53", "0.01"], ["0.76", "0.1"], ["0.14", "0.01"], ["0.89", "0.1"]],
    band3: [["3.45", "0.1"], ["2.38", "0.01"], ["5.67", "0.1"], ["1.29", "0.01"], ["4.53", "0.1"], ["6.76", "0.01"], ["7.14", "0.1"], ["8.89", "0.01"], ["9.61", "0.1"], ["3.45", "0.01"], ["2.38", "0.1"], ["5.67", "0.01"], ["1.29", "0.1"], ["4.53", "0.01"], ["6.76", "0.1"], ["7.14", "0.01"], ["8.89", "0.1"]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    addData[band].forEach(([a, s], i) => {
      items.push(
        item("decimalAsNumber", "procedural", `addSmall_${band}`, band, {
          answer: D2(Number(a) + Number(s)),
          answerType: "decimal",
          display: { dec: { kind: "addDec", a: Number(a), b: Number(s) }, promptText: addPhr[band][phrIdx(i, 9, 4)](a, s) },
        })
      );
    });
  }

  return items;
}

export function asNumberConceptual() {
  const items = [];
  let seed = 541;

  const closerPhr = {
    band1: [
      (nm, v) => `Is the decimal ${v} closer to 0 or to 1? ${nm} pictures the line.`,
      (nm, v) => `${nm} places ${v} on a 0-1 line. Which end is it nearer?`,
    ],
    band2: [
      (nm, v) => `Between 0 and 1, does ${v} sit nearer 0 or nearer 1? ${nm} decides.`,
      (nm, v) => `${nm} slides a marker to ${v}. Toward which end does it lean?`,
    ],
    band3: [
      (nm, v) => `Locate ${v} precisely: is it nearer 0 or nearer 1? ${nm} reasons it out.`,
      (nm, v) => `${nm} audits the position of ${v}. Which endpoint is closer?`,
    ],
  };
  const closerData = {
    band1: [["0.1", "0"], ["0.9", "1"], ["0.2", "0"], ["0.8", "1"], ["0.3", "0"], ["0.7", "1"], ["0.4", "0"], ["0.6", "1"], ["0.1", "0"], ["0.9", "1"], ["0.2", "0"], ["0.8", "1"], ["0.3", "0"], ["0.7", "1"], ["0.4", "0"], ["0.6", "1"], ["0.1", "0"], ["0.9", "1"]],
    band2: [["0.15", "0"], ["0.85", "1"], ["0.08", "0"], ["0.92", "1"], ["0.31", "0"], ["0.69", "1"], ["0.24", "0"], ["0.76", "1"], ["0.4", "0"], ["0.6", "1"], ["0.15", "0"], ["0.85", "1"], ["0.08", "0"], ["0.92", "1"], ["0.31", "0"], ["0.69", "1"], ["0.24", "0"], ["0.76", "1"]],
    band3: [["0.05", "0"], ["0.95", "1"], ["0.12", "0"], ["0.88", "1"], ["0.29", "0"], ["0.71", "1"], ["0.33", "0"], ["0.67", "1"], ["0.41", "0"], ["0.59", "1"], ["0.05", "0"], ["0.95", "1"], ["0.12", "0"], ["0.88", "1"], ["0.29", "0"], ["0.71", "1"], ["0.33", "0"], ["0.67", "1"]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    closerData[band].forEach(([v, good], i) => {
      items.push(
        item("decimalAsNumber", "conceptual", `closerEnd_${band}`, band, {
          answer: good,
          choices: shuffled(["0", "1"], (seed += 1)),
          display: { dec: { kind: "closerDec", v: Number(v) }, promptText: closerPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), v) },
        })
      );
    });
  }

  const betweenPhr = {
    band1: [
      (nm, v) => `${nm} says the decimal ${v} sits between 0 and 1 on the number line. Is ${nm} right?`,
      (nm, v) => `${v} lives between 0 and 1, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, v) => `${nm} plots ${v} strictly between 0 and 1. Does it belong there?`,
      (nm, v) => `According to ${nm}, ${v} falls inside the 0-to-1 stretch. Is ${nm} right?`,
    ],
    band3: [
      (nm, v) => `${nm} classifies ${v} as lying between 0 and 1. Is the classification right?`,
      (nm, v) => `On ${nm}'s line, ${v} is placed inside the unit interval. Should it be?`,
    ],
  };
  const betweenData = {
    band1: [["0.4", true], ["1.2", false], ["0.7", true], ["1.5", false], ["0.1", true], ["1.8", false], ["0.9", true], ["1.1", false], ["0.5", true], ["1.4", false], ["0.2", true], ["1.7", false], ["0.8", true], ["1.3", false], ["0.6", true], ["1.9", false], ["0.3", true], ["1.6", false]],
    band2: [["0.45", true], ["1.45", false], ["0.08", true], ["1.08", false], ["0.92", true], ["1.92", false], ["0.67", true], ["1.67", false], ["0.25", true], ["1.25", false], ["0.81", true], ["1.81", false], ["0.33", true], ["1.33", false], ["0.59", true], ["1.59", false], ["0.74", true], ["1.74", false]],
    band3: [["0.05", true], ["2.05", false], ["0.95", true], ["1.95", false], ["0.52", true], ["3.52", false], ["0.88", true], ["2.88", false], ["0.17", true], ["4.17", false], ["0.63", true], ["1.63", false], ["0.29", true], ["5.29", false], ["0.76", true], ["2.76", false], ["0.41", true], ["3.41", false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    betweenData[band].forEach(([v, ok], i) => {
      items.push(
        item("decimalAsNumber", "conceptual", `betweenJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { dec: { kind: "betweenSaid", v: Number(v) }, promptText: betweenPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), v), truth: ok },
        })
      );
    });
  }

  const beyondPhr = {
    band1: [
      (nm, v) => `${nm} claims the decimal ${v} is MORE than one whole. Is ${nm} right?`,
      (nm, v) => `Is ${v} bigger than 1, as ${nm} says?`,
    ],
    band2: [
      (nm, v) => `${nm} plots ${v} beyond the 1 mark. Does it belong there?`,
      (nm, v) => `${v} outruns one whole, according to ${nm}. Is that right?`,
    ],
    band3: [
      (nm, v) => `${nm} classifies ${v} as greater than 1. Is the classification right?`,
      (nm, v) => `Beyond 1 or not: ${nm} votes that ${v} exceeds a whole. Correct?`,
    ],
  };
  const beyondData = {
    band1: [["1.2", true], ["0.9", false], ["1.5", true], ["0.5", false], ["1.8", true], ["0.2", false], ["1.1", true], ["0.7", false], ["1.4", true], ["0.4", false], ["1.7", true], ["0.1", false], ["1.3", true], ["0.8", false], ["1.6", true], ["0.6", false]],
    band2: [["1.45", true], ["0.45", false], ["1.08", true], ["0.08", false], ["1.92", true], ["0.92", false], ["1.67", true], ["0.67", false], ["1.25", true], ["0.25", false], ["1.81", true], ["0.81", false], ["1.33", true], ["0.33", false], ["1.59", true], ["0.59", false]],
    band3: [["2.05", true], ["0.05", false], ["1.95", true], ["0.95", false], ["3.52", true], ["0.52", false], ["2.88", true], ["0.88", false], ["4.17", true], ["0.17", false], ["1.63", true], ["0.63", false], ["5.29", true], ["0.29", false], ["2.76", true], ["0.76", false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    beyondData[band].forEach(([v, ok], i) => {
      items.push(
        item("decimalAsNumber", "conceptual", `beyondOne_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { dec: { kind: "beyondSaidDec", v: Number(v) }, promptText: beyondPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), v), truth: ok },
        })
      );
    });
  }

  return items;
}
