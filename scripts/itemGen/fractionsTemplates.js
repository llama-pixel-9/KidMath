/* Deterministic fractions bank items — part 1: partWhole, fractionAsNumber,
 * equivalence. (Part 2: fractionsTemplates2.js.)
 *
 * Fraction answers are STRINGS ("3/4") on choice items or integer numerators/
 * counts on typed items — never non-integer numerics (the fractionalAnswer QC
 * check hard-fails those). Claims ride display.frac, re-derived by
 * authorFractions.js: {name}, {complement}, {unitCount}, {equiv}, {simplify},
 * {cmp}, {addLike}, {subLike}, {ofSet}, judged saids of each.
 *
 * Denominator bands mirror the generator: K-1 {2,3,4}; 2-3 +{5,6,8};
 * 4-5 +{10,12}. Judged = "Is this right?" Yes/No. multiSelect and
 * numberLine payloads are deliberately not used in the bank.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

export const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "fractions",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

export const nameAt = (i) => NAMES[i % NAMES.length];
export const F = (n, d) => `${n}/${d}`;
export const DEN_WORDS = { 2: "halves", 3: "thirds", 4: "fourths", 5: "fifths", 6: "sixths", 8: "eighths", 10: "tenths", 12: "twelfths" };
export const OFF = { band1: 0, band2: 7, band3: 13 };

/* ================================================================== */
/* partWhole                                                           */
/* ================================================================== */

export function partWholeProcedural() {
  const items = [];

  const shadePhr = {
    band1: [
      (n, d) => `${n} of ${d} equal parts ${n === 1 ? "is" : "are"} shaded. The shaded fraction = ?`,
      (n, d) => `A strip has ${d} equal parts with ${n} shaded. Which fraction is shaded?`,
    ],
    band2: [
      (n, d) => `Shade ${n} out of ${d} equal parts. What fraction is that?`,
      (n, d) => `Of ${d} equal pieces, ${n} ${n === 1 ? "is" : "are"} colored. Which fraction is colored?`,
    ],
    band3: [
      (n, d) => `Exactly ${n} of the ${d} equal sections are filled. Which fraction names the filled amount?`,
      (n, d) => `A figure in ${d} equal sections shows ${n} filled. What fraction does that make?`,
    ],
  };
  const shadeData = {
    band1: [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 4? 0 : 4]].filter((r) => r[1]).concat([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]].map(([n, d]) => [n, d])),
    band2: [[2, 5], [3, 5], [4, 5], [1, 5], [1, 6], [5, 6], [3, 8], [5, 8], [7, 8], [1, 8], [2, 6? 0 : 6]].filter((r) => r[1]),
    band3: [[3, 10], [7, 10], [9, 10], [1, 10], [5, 12], [7, 12], [11, 12], [1, 12], [4, 5], [5, 6], [5, 8], [3, 4]],
  };
  // (Rebuilt cleanly below — the concat above is replaced by full lists.)
  const shadeLists = {
    band1: [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 4], [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 4]],
    band2: [[2, 5], [3, 5], [4, 5], [1, 5], [1, 6], [5, 6], [3, 8], [5, 8], [7, 8], [1, 8], [2, 6], [4, 6]],
    band3: [[3, 10], [7, 10], [9, 10], [1, 10], [5, 12], [7, 12], [11, 12], [1, 12], [4, 5], [5, 6], [5, 8], [3, 4]],
  };
  let seed = 361;
  for (const band of ["band1", "band2", "band3"]) {
    shadeLists[band].forEach(([n, d], i) => {
      const good = F(n, d);
      const wrong = [...new Set([F(d - n, d), F(n, d - n === 0 ? d + 1 : d - n), F(d, n)])].filter((x) => x !== good);
      items.push(
        item("partWhole", "procedural", `shadeName_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { frac: { kind: "name", n, d }, promptText: shadePhr[band][Math.floor(i / 6) % 2](n, d) },
        })
      );
    });
  }

  const unshadePhr = {
    band1: [
      (n, d) => `${n} of ${d} equal parts ${n === 1 ? "is" : "are"} shaded. The UNSHADED fraction = ?`,
      (n, d) => `With ${n} of ${d} parts shaded, which fraction is left unshaded?`,
    ],
    band2: [
      (n, d) => `A bar of ${d} equal parts has ${n} shaded. What fraction stays blank?`,
      (n, d) => `Out of ${d} pieces, ${n} ${n === 1 ? "is" : "are"} colored. Which fraction is NOT colored?`,
    ],
    band3: [
      (n, d) => `If ${n} of ${d} equal sections are filled, exactly which fraction remains empty?`,
      (n, d) => `A ${d}-section figure with ${n} filled leaves which fraction unfilled?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    shadeLists[band].forEach(([n, d], i) => {
      const good = F(d - n, d);
      const wrong = [...new Set([F(n, d), F(d, d - n), F(d - n, n)])].filter((x) => x !== good);
      items.push(
        item("partWhole", "procedural", `unshadeName_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { frac: { kind: "complement", n, d }, promptText: unshadePhr[band][Math.floor(i / 6) % 2](n, d) },
        })
      );
    });
  }

  const wholePartsPhr = {
    band1: [
      (d) => `How many ${DEN_WORDS[d]} make one whole?`,
      (d) => `One whole cut into ${DEN_WORDS[d]}: how many parts is that?`,
    ],
    band2: [
      (d) => `A whole split into ${DEN_WORDS[d]} gives how many equal parts?`,
      (d) => `Count the ${DEN_WORDS[d]} in one whole. How many parts are there?`,
    ],
    band3: [
      (d) => `Exactly how many ${DEN_WORDS[d]} fit in a single whole?`,
      (d) => `One whole measured in ${DEN_WORDS[d]} holds how many parts?`,
    ],
  };
  const wholeDens = { band1: [2, 3, 4, 2, 3, 4], band2: [5, 6, 8, 5, 6, 8], band3: [10, 12, 8, 10, 12, 8] };
  for (const band of ["band1", "band2", "band3"]) {
    wholeDens[band].forEach((d, i) => {
      if (i >= 4 && band !== "band3") return;
      items.push(
        item("partWhole", "procedural", `wholeParts_${band}`, band, {
          answer: d,
          answerType: "numberPad",
          display: { frac: { kind: "unitCount", d }, promptText: wholePartsPhr[band][i % 2](d) },
        })
      );
    });
  }
  // pad wholeParts band1/2 alternate phrasing pass
  for (const band of ["band1", "band2"]) {
    wholeDens[band].slice(0, 2).forEach((d, i) => {
      items.push(
        item("partWhole", "procedural", `wholePartsExtra_${band}`, band, {
          answer: d,
          answerType: "numberPad",
          display: { frac: { kind: "unitCount", d }, promptText: band === "band1" ? `A pie in ${DEN_WORDS[d]}: how many slices make the whole pie?` : `Cutting into ${DEN_WORDS[d]} produces how many equal slices per whole?${i ? " Count them." : ""}` },
        })
      );
    });
  }

  return items;
}

export function partWholeConceptual() {
  const items = [];
  let seed = 371;

  const trapPhr = {
    band1: [
      (nm, n, d) => `${nm} shades ${n} of ${d} equal parts and writes ${F(n, d - n)} — comparing shaded to unshaded. Is ${nm} right?`,
      (nm, n, d) => `For ${n} shaded parts out of ${d}, ${nm} records ${F(n, d - n)}. Is that right?`,
    ],
    band2: [
      (nm, n, d) => `${nm} colors ${n} of ${d} pieces and labels it ${F(n, d - n)}, counting only the blank pieces below the line. Is ${nm} right?`,
      (nm, n, d) => `${nm}'s label for ${n}-of-${d} shaded reads ${F(n, d - n)}. Does the label hold?`,
    ],
    band3: [
      (nm, n, d) => `Shading ${n} of ${d} sections, ${nm} declares the fraction ${F(n, d - n)}. Is the declaration right?`,
      (nm, n, d) => `${nm} confuses part-to-part with part-to-whole and writes ${F(n, d - n)} for ${n} of ${d}. Is ${nm} right anyway?`,
    ],
  };
  const trapData = {
    band1: [[1, 3], [2, 3? 0 : 3], [1, 4], [3, 4], [1, 2? 0 : 0], [2, 4? 0 : 0]].filter((r) => r[1]),
    band2: [],
    band3: [],
  };
  // Clean lists (the filter hack above yields band1 [[1,3],[1,4],[3,4]]).
  const trapLists = {
    band1: [[1, 3], [1, 4], [3, 4], [1, 3], [1, 4], [3, 4], [1, 3], [1, 4], [3, 4], [1, 3], [1, 4], [3, 4], [1, 3], [1, 4], [3, 4], [1, 3], [1, 4], [3, 4]],
    band2: [[2, 5], [3, 5], [1, 5], [1, 6], [5, 6], [3, 8], [5, 8], [1, 8], [2, 6], [4, 6], [2, 5], [3, 5], [1, 5], [1, 6], [5, 6], [3, 8], [5, 8], [1, 8]],
    band3: [[3, 10], [7, 10], [1, 10], [5, 12], [7, 12], [1, 12], [4, 5], [5, 6], [5, 8], [3, 10], [7, 10], [1, 10], [5, 12], [7, 12], [1, 12], [4, 5], [5, 6], [5, 8]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    trapLists[band].forEach(([n, d], i) => {
      items.push(
        item("partWhole", "conceptual", `partPartTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "trapNo" }, promptText: trapPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), n, d), truth: false },
        })
      );
    });
  }

  const equalPhr = {
    band1: [
      (nm, thing, ok) => `${nm} cuts ${thing}. Can the pieces fairly be called equal parts?`,
      (nm, thing, ok) => `${nm} shares ${thing}. Do the pieces count as equal parts?`,
    ],
    band2: [
      (nm, thing, ok) => `${nm} splits ${thing}. Does the split make true equal parts?`,
      (nm, thing, ok) => `For fractions to apply, ${nm}'s cut of ${thing} must give equal parts. Does it?`,
    ],
    band3: [
      (nm, thing, ok) => `${nm} partitions ${thing}. Is the partition into genuinely equal parts?`,
      (nm, thing, ok) => `Judge ${nm}'s division of ${thing}: are the parts truly equal?`,
    ],
  };
  const equalData = {
    band1: [["a sandwich into 2 matching halves", true], ["a cookie into one big piece and one crumb", false], ["a paper strip into 4 same-size parts", true], ["a pizza into 3 slices of different sizes", false], ["an apple into 2 same-size halves", true], ["a brownie into a huge piece and a sliver", false], ["a ribbon into 3 same-length parts", true], ["a cracker into unequal chunks", false], ["a pancake into 4 matching wedges", true], ["a pie into 2 wedges, one double the other", false], ["a granola bar into 2 same-size pieces", true], ["a sheet into 4 wildly different scraps", false], ["a waffle into 4 equal squares", true], ["a roll into 3 pieces where one is tiny", false], ["a fruit strip into 2 identical pieces", true], ["a bagel into lopsided halves", false], ["a cake into 4 equal slices", true], ["a tortilla into random shards", false]],
    band2: [["a garden into 5 same-size beds", true], ["a field into 6 beds where one is double", false], ["a chocolate bar along its 8 identical squares", true], ["a pan of bars into 6 uneven blocks", false], ["a poster into 5 equal columns", true], ["a page into 8 columns of different widths", false], ["a rope into 6 equal jumps", true], ["a trail into 5 stretches, one far longer", false], ["a tray into 8 matching brownies", true], ["a loaf into 6 slices thick and thin", false], ["a banner into 5 identical panels", true], ["a strip into 8 panels, edges uneven", false], ["a pizza into 6 equal slices", true], ["a quiche into 5 slices of mixed sizes", false], ["a board into 8 equal sections", true], ["a canvas into 6 sections eyeballed badly", false], ["a pie into 5 equal wedges", true], ["a flatbread into 8 wedges, one giant", false]],
    band3: [["a mural into 10 equal panels", true], ["a wall into 12 panels of drifting widths", false], ["a marathon route into 10 equal legs", true], ["a relay into 12 legs where anchors run less", false], ["a spreadsheet into 12 even rows", true], ["a chart into 10 rows squeezed at the end", false], ["a farm into 12 equal plots", true], ["an orchard into 10 plots minus a corner", false], ["a window into 10 identical panes", true], ["a mosaic into 12 tiles, borders varying", false], ["a ruler into 12 equal marks", true], ["a gauge into 10 marks crowding one side", false], ["a cake roll into 10 even coins", true], ["a baguette into 12 slices, heels thick", false], ["a film strip into 12 equal frames", true], ["a reel into 10 frames trimmed unevenly", false], ["a keyboard row into 10 same keys", true], ["a shelf into 12 slots, two doubled", false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    equalData[band].forEach(([thing, ok], i) => {
      items.push(
        item("partWhole", "conceptual", `equalPartsJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "authored" }, promptText: equalPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), thing, ok), truth: ok },
        })
      );
    });
  }

  const nameJudgePhr = {
    band1: [
      (nm, n, d, said) => `${nm} shades ${n} of ${d} equal parts and names it ${said}. Is ${nm} right?`,
      (nm, n, d, said) => `For ${n} shaded out of ${d}, ${nm} writes ${said}. Is that right?`,
    ],
    band2: [
      (nm, n, d, said) => `${nm} labels ${n}-of-${d} shaded as ${said}. Does the label check out?`,
      (nm, n, d, said) => `${nm}'s fraction for ${n} shaded of ${d} parts is ${said}. Is ${nm} right?`,
    ],
    band3: [
      (nm, n, d, said) => `${nm} records ${said} for ${n} filled of ${d} equal sections. Is the record right?`,
      (nm, n, d, said) => `Auditing ${nm}'s sheet: ${n} of ${d} shaded, written ${said}. Clean audit?`,
    ],
  };
  const nameJudgeData = {
    band1: [[1, 2, "1/2", true], [1, 3, "3/1", false], [2, 3, "2/3", true], [1, 4, "4/1", false], [3, 4, "3/4", true], [2, 4, "4/2", false], [1, 2, "2/1", false], [1, 3, "1/3", true], [2, 3, "3/2", false], [1, 4, "1/4", true], [3, 4, "4/3", false], [2, 4, "2/4", true], [1, 3, "1/2", false], [2, 3, "2/4", false], [1, 4, "1/3", false], [3, 4, "2/4", false], [1, 2, "1/4", false], [2, 4, "3/4", false]],
    band2: [[2, 5, "2/5", true], [3, 5, "5/3", false], [1, 6, "1/6", true], [5, 6, "6/5", false], [3, 8, "3/8", true], [5, 8, "8/5", false], [1, 5, "1/5", true], [4, 5, "5/4", false], [2, 6, "2/6", true], [4, 6, "6/4", false], [1, 8, "1/8", true], [7, 8, "8/7", false], [3, 5, "3/5", true], [2, 5, "5/2", false], [5, 6, "5/6", true], [1, 6, "6/1", false], [5, 8, "5/8", true], [3, 8, "8/3", false]],
    band3: [[3, 10, "3/10", true], [7, 10, "10/7", false], [5, 12, "5/12", true], [7, 12, "12/7", false], [9, 10, "9/10", true], [1, 10, "10/1", false], [11, 12, "11/12", true], [1, 12, "12/1", false], [7, 10, "7/10", true], [3, 10, "10/3", false], [7, 12, "7/12", true], [5, 12, "12/5", false], [1, 10, "1/10", true], [9, 10, "10/9", false], [1, 12, "1/12", true], [11, 12, "12/11", false], [4, 5, "4/5", true], [5, 8, "8/5", false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    nameJudgeData[band].forEach(([n, d, said, ok], i) => {
      items.push(
        item("partWhole", "conceptual", `nameJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "nameSaid", n, d, said }, promptText: nameJudgePhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), n, d, said), truth: ok },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* fractionAsNumber                                                    */
/* ================================================================== */

export function fractionAsNumberProcedural() {
  const items = [];

  const unitMeanPhr = {
    band1: [
      (d) => `The fraction ${F(1, d)} means 1 of ? equal parts`,
      (d) => `Writing ${F(1, d)} says one whole was cut into how many equal parts?`,
    ],
    band2: [
      (d) => `${F(1, d)} stands for one piece out of how many equal pieces?`,
      (d) => `In ${F(1, d)}, the bottom number counts the equal parts. How many equal parts is that?`,
    ],
    band3: [
      (d) => `Reading ${F(1, d)} as a number: the whole was partitioned how many ways?`,
      (d) => `The unit fraction ${F(1, d)} implies how many equal partitions of the whole?`,
    ],
  };
  const unitDens = { band1: [2, 3, 4, 2, 3, 4], band2: [5, 6, 8, 5, 6, 8], band3: [10, 12, 8, 10, 12, 5] };
  for (const band of ["band1", "band2", "band3"]) {
    unitDens[band].forEach((d, i) => {
      items.push(
        item("fractionAsNumber", "procedural", `unitMeaning_${band}`, band, {
          answer: d,
          answerType: "numberPad",
          display: { frac: { kind: "unitCount", d }, promptText: unitMeanPhr[band][i % 2](d) },
        })
      );
    });
  }

  const jumpsPhr = {
    band1: [
      (n, d) => `Hop from 0 in jumps of ${F(1, d)}. After ${n} hops you land on ?/${d}. What is the top number?`,
      (n, d) => `${n} jumps of ${F(1, d)} starting at 0 reach which numerator over ${d}?`,
    ],
    band2: [
      (n, d) => `Count ${n} steps of ${F(1, d)} from 0. The landing fraction is ?/${d} — top number?`,
      (n, d) => `Stacking ${n} copies of ${F(1, d)} builds ?/${d}. What is the numerator?`,
    ],
    band3: [
      (n, d) => `Exactly ${n} unit steps of ${F(1, d)} from 0 stop at ?/${d}. Which numerator is that?`,
      (n, d) => `Accumulate ${F(1, d)} a total of ${n} times. The numerator of the result = ?`,
    ],
  };
  const jumpData = {
    band1: [[1, 2], [2, 3], [1, 3], [3, 4], [1, 4], [2, 4], [1, 2? 0 : 0]].filter((r) => r[1]).slice(0, 6),
    band2: [[2, 5], [4, 5], [3, 6], [5, 6], [5, 8], [7, 8]],
    band3: [[7, 10], [9, 10], [5, 12], [11, 12], [3, 10], [7, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    jumpData[band].forEach(([n, d], i) => {
      items.push(
        item("fractionAsNumber", "procedural", `unitJumps_${band}`, band, {
          answer: n,
          answerType: "numberPad",
          display: { frac: { kind: "jumps", n, d }, promptText: jumpsPhr[band][i % 2](n, d) },
        })
      );
    });
  }

  const wholeEqPhr = {
    band1: [
      (d) => `The whole number 1 written in ${DEN_WORDS[d]} is ?/${d}. What is the top number?`,
      (d) => `How many ${DEN_WORDS[d]} equal exactly 1? Give the count.`,
    ],
    band2: [
      (d) => `One whole equals ?/${d}. Which numerator completes it?`,
      (d) => `Express 1 as a fraction over ${d}. What is the numerator?`,
    ],
    band3: [
      (d) => `Rewrite the number 1 with denominator ${d}. What numerator appears?`,
      (d) => `1 = ?/${d} exactly. What is the missing top number?`,
    ],
  };
  const wholeEqDens = { band1: [2, 3, 4, 2, 3, 4], band2: [5, 6, 8, 5, 6, 8], band3: [10, 12, 6, 10, 12, 8] };
  for (const band of ["band1", "band2", "band3"]) {
    wholeEqDens[band].forEach((d, i) => {
      if (i >= 4 && band === "band1") return;
      items.push(
        item("fractionAsNumber", "procedural", `wholeAsFrac_${band}`, band, {
          answer: d,
          answerType: "numberPad",
          display: { frac: { kind: "unitCount", d }, promptText: wholeEqPhr[band][i % 2](d) },
        })
      );
    });
  }

  const tickPhr = {
    band1: [
      (k, d) => `A 0-to-1 line has ${d} equal steps. The mark after step ${k} shows which fraction?`,
      (k, d) => `Step ${k} of ${d} along a 0-1 line lands on which fraction?`,
      (k, d) => `Walk a 0-1 path in ${d} equal steps. Where are you after step ${k}? Pick the fraction.`,
      (k, d) => `On a line cut into ${d} equal steps, which fraction sits at step ${k}?`,
    ],
    band2: [
      (k, d) => `On a number line from 0 to 1 in ${d} equal steps, step ${k} sits at which fraction?`,
      (k, d) => `The ${d}-step walk from 0 to 1 puts its mark number ${k} at which fraction?`,
      (k, d) => `Split 0-to-1 into ${d} equal steps. Which fraction labels the mark after step ${k}?`,
      (k, d) => `A ruler from 0 to 1 carries ${d} equal steps. Step ${k} points at which fraction?`,
    ],
    band3: [
      (k, d) => `Precisely where does mark ${k} of ${d} fall between 0 and 1? Name the fraction.`,
      (k, d) => `Between 0 and 1, mark number ${k} of ${d} even marks names which fraction?`,
      (k, d) => `Partition the unit interval into ${d} equal steps. Which fraction is mark ${k}?`,
      (k, d) => `Of ${d} evenly spaced marks between 0 and 1, mark ${k} corresponds to which fraction?`,
    ],
  };
  const tickData = {
    band1: [[1, 2], [1, 4], [3, 4], [2, 3], [1, 3], [2, 4], [1, 2], [1, 4], [3, 4], [2, 3], [1, 3], [2, 4]],
    band2: [[2, 5], [3, 5], [5, 6], [1, 6], [3, 8], [7, 8], [2, 5], [3, 5], [5, 6], [1, 6], [3, 8], [7, 8]],
    band3: [[3, 10], [9, 10], [5, 12], [11, 12], [7, 10], [7, 12], [3, 10], [9, 10], [5, 12], [11, 12], [7, 10], [7, 12]],
  };
  let seed = 381;
  for (const band of ["band1", "band2", "band3"]) {
    tickData[band].forEach(([k, d], i) => {
      const good = F(k, d);
      const wrong = [...new Set([F(d, k), F(k, d + 1), F(Math.max(1, k - 1), d)])].filter((x) => x !== good);
      items.push(
        item("fractionAsNumber", "procedural", `tickName_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { frac: { kind: "name", n: k, d }, promptText: tickPhr[band][Math.floor(i / 6) * 2 + (i % 2)](k, d) },
        })
      );
    });
  }

  return items;
}

export function fractionAsNumberConceptual() {
  const items = [];
  let seed = 391;

  const wholeJudgePhr = {
    band1: [
      (nm, n, d) => `${nm} says ${F(n, d)} equals exactly one whole. Is ${nm} right?`,
      (nm, n, d) => `${F(n, d)} makes a full whole, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, n, d) => `${nm} marks ${F(n, d)} as exactly 1 on the line. Does the mark belong there?`,
      (nm, n, d) => `According to ${nm}, ${F(n, d)} and 1 are the same point. Is ${nm} right?`,
    ],
    band3: [
      (nm, n, d) => `${nm} equates ${F(n, d)} with the whole number 1. Is the equation sound?`,
      (nm, n, d) => `On ${nm}'s number line, ${F(n, d)} coincides with 1. Should it?`,
    ],
  };
  const wholeJudgeData = {
    band1: [[2, 2, true], [3, 4, false], [3, 3, true], [2, 4, false], [4, 4, true], [1, 2, false], [2, 2, true], [2, 3, false], [3, 3, true], [1, 4, false], [4, 4, true], [1, 3, false], [2, 2, true], [3, 4, false], [3, 3, true], [2, 4, false], [4, 4, true], [2, 3, false]],
    band2: [[5, 5, true], [4, 5, false], [6, 6, true], [5, 6, false], [8, 8, true], [7, 8, false], [5, 5, true], [3, 5, false], [6, 6, true], [1, 6, false], [8, 8, true], [3, 8, false], [5, 5, true], [2, 5, false], [6, 6, true], [4, 6, false], [8, 8, true], [5, 8, false]],
    band3: [[10, 10, true], [9, 10, false], [12, 12, true], [11, 12, false], [10, 10, true], [7, 10, false], [12, 12, true], [5, 12, false], [10, 10, true], [3, 10, false], [12, 12, true], [7, 12, false], [10, 10, true], [1, 10, false], [12, 12, true], [1, 12, false], [10, 10, true], [9, 10, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    wholeJudgeData[band].forEach(([n, d, ok], i) => {
      items.push(
        item("fractionAsNumber", "conceptual", `wholeJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "wholeSaid", n, d }, promptText: wholeJudgePhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), n, d), truth: ok },
        })
      );
    });
  }

  const zeroOnePhr = {
    band1: [
      (nm, n, d) => `Is ${F(n, d)} closer to 0 or to 1? ${nm} pictures the line.`,
      (nm, n, d) => `${nm} places ${F(n, d)} on a 0-1 line. Which end is it nearer?`,
    ],
    band2: [
      (nm, n, d) => `Between 0 and 1, does ${F(n, d)} sit nearer 0 or nearer 1? ${nm} decides.`,
      (nm, n, d) => `${nm} slides a marker to ${F(n, d)}. Toward which end does it lean?`,
    ],
    band3: [
      (nm, n, d) => `Locate ${F(n, d)} precisely: is it nearer 0 or nearer 1? ${nm} reasons it out.`,
      (nm, n, d) => `${nm} audits the position of ${F(n, d)}. Which endpoint is closer?`,
    ],
  };
  const zeroOneData = {
    band1: [[1, 4, "0"], [3, 4, "1"], [1, 3, "0"], [2, 3, "1"], [1, 4? 0 : 0, ""], [3, 4, "1"]].filter((r) => r[1]),
    band2: [],
    band3: [],
  };
  const zeroOneLists = {
    band1: [[1, 4, "0"], [3, 4, "1"], [1, 3, "0"], [2, 3, "1"], [1, 4, "0"], [3, 4, "1"], [1, 3, "0"], [2, 3, "1"], [1, 4, "0"], [3, 4, "1"], [1, 3, "0"], [2, 3, "1"], [1, 4, "0"], [3, 4, "1"], [1, 3, "0"], [2, 3, "1"]],
    band2: [[1, 5, "0"], [4, 5, "1"], [1, 6, "0"], [5, 6, "1"], [1, 8, "0"], [7, 8, "1"], [2, 5, "0"], [5, 6, "1"], [2, 8, "0"], [7, 8, "1"], [1, 5, "0"], [4, 5, "1"], [1, 6, "0"], [5, 6, "1"], [1, 8, "0"], [6, 8, "1"]],
    band3: [[1, 10, "0"], [9, 10, "1"], [1, 12, "0"], [11, 12, "1"], [3, 10, "0"], [7, 10, "1"], [5, 12, "0"], [7, 12, "1"], [2, 10, "0"], [9, 10, "1"], [3, 12, "0"], [11, 12, "1"], [1, 10, "0"], [8, 10, "1"], [1, 12, "0"], [9, 12, "1"]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    zeroOneLists[band].forEach(([n, d, good], i) => {
      items.push(
        item("fractionAsNumber", "conceptual", `closerEnd_${band}`, band, {
          answer: good,
          choices: shuffled(["0", "1"], (seed += 1)),
          display: { frac: { kind: "closerEnd", n, d }, promptText: zeroOnePhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), n, d) },
        })
      );
    });
  }

  const beyondPhr = {
    band1: [
      (nm, n, d) => `${nm} claims ${F(n, d)} is MORE than one whole. Is ${nm} right?`,
      (nm, n, d) => `Is ${F(n, d)} bigger than 1, as ${nm} says?`,
    ],
    band2: [
      (nm, n, d) => `${nm} plots ${F(n, d)} beyond the 1 mark. Does it belong there?`,
      (nm, n, d) => `${F(n, d)} outruns one whole, according to ${nm}. Is that right?`,
    ],
    band3: [
      (nm, n, d) => `${nm} classifies ${F(n, d)} as greater than 1. Is the classification right?`,
      (nm, n, d) => `Beyond 1 or not: ${nm} votes that ${F(n, d)} exceeds a whole. Correct?`,
    ],
  };
  const beyondData = {
    band1: [[3, 2, true], [1, 2, false], [4, 3, true], [2, 3, false], [5, 4, true], [3, 4, false], [3, 2, true], [1, 3, false], [4, 3, true], [1, 4, false], [5, 4, true], [2, 4, false], [3, 2, true], [2, 3, false], [4, 3, true], [3, 4, false]],
    band2: [[6, 5, true], [4, 5, false], [7, 6, true], [5, 6, false], [9, 8, true], [7, 8, false], [8, 5, true], [3, 5, false], [8, 6, true], [1, 6, false], [10, 8, true], [5, 8, false], [7, 5, true], [2, 5, false], [11, 6, true], [4, 6, false]],
    band3: [[11, 10, true], [9, 10, false], [13, 12, true], [11, 12, false], [15, 10, true], [7, 10, false], [17, 12, true], [5, 12, false], [12, 10, true], [3, 10, false], [14, 12, true], [7, 12, false], [19, 10, true], [1, 10, false], [23, 12, true], [1, 12, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    beyondData[band].forEach(([n, d, ok], i) => {
      items.push(
        item("fractionAsNumber", "conceptual", `beyondOne_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "beyondSaid", n, d }, promptText: beyondPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), n, d), truth: ok },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* equivalence                                                         */
/* ================================================================== */

export function equivalenceProcedural() {
  const items = [];

  const scalePhr = {
    band1: [
      (a, b, d2) => `${F(a, b)} = ?/${d2}. What is the missing top number?`,
      (a, b, d2) => `Rewrite ${F(a, b)} with a bottom number of ${d2}. What top number fits?`,
    ],
    band2: [
      (a, b, d2) => `Scale ${F(a, b)} up to denominator ${d2}. The numerator becomes ?`,
      (a, b, d2) => `An equivalent of ${F(a, b)} over ${d2} carries which numerator?`,
    ],
    band3: [
      (a, b, d2) => `Convert ${F(a, b)} exactly to ?/${d2}. What numerator is required?`,
      (a, b, d2) => `The fraction ${F(a, b)} restated over ${d2} takes which top number?`,
    ],
  };
  const scaleData = {
    band1: [[1, 2, 4], [1, 2, 6? 0 : 4], [1, 3? 0 : 0, 0]].filter((r) => r[2]),
    band2: [],
    band3: [],
  };
  const scaleLists = {
    band1: [[1, 2, 4], [1, 2, 8], [1, 3, 6], [2, 3, 6], [1, 4, 8], [3, 4, 8], [1, 2, 4], [1, 2, 8], [1, 3, 6], [2, 3, 6], [1, 4, 8], [3, 4, 8]],
    band2: [[1, 2, 10], [2, 5, 10], [3, 5, 10], [1, 3, 12], [1, 6, 12], [5, 6, 12], [3, 4, 12], [1, 4, 12], [2, 3, 12], [4, 5, 10], [1, 5, 10], [1, 2, 6]],
    band3: [[3, 10, 20? 0 : 0]].filter((r) => r[2]).concat([[7, 10, 20], [3, 10, 20], [5, 12, 24], [7, 12, 24], [2, 3, 12], [5, 6, 12], [3, 8, 24], [5, 8, 24], [3, 4, 12], [9, 10, 20], [11, 12, 24], [1, 8, 24]]),
  };
  for (const band of ["band1", "band2", "band3"]) {
    scaleLists[band].forEach(([a, b, d2], i) => {
      items.push(
        item("equivalence", "procedural", `scaleUp_${band}`, band, {
          answer: (a * d2) / b,
          answerType: "numberPad",
          display: { frac: { kind: "equivNum", a, b, d2 }, promptText: scalePhr[band][Math.floor(i / 6) % 2](a, b, d2) },
        })
      );
    });
  }

  const simplifyPhr = {
    band1: [
      (a, b, d2) => `${F(a, b)} = 1/?. What is the missing bottom number?`,
      (a, b, d2) => `Shrink ${F(a, b)} to a unit fraction 1 over what?`,
    ],
    band2: [
      (a, b, d2) => `Simplify ${F(a, b)} to lowest terms 1/?. Which denominator remains?`,
      (a, b, d2) => `${F(a, b)} reduces to one over which number?`,
    ],
    band3: [
      (a, b, d2) => `In lowest terms ${F(a, b)} is 1/?. Exactly which denominator?`,
      (a, b, d2) => `Fully reduce ${F(a, b)}. The unit fraction's bottom number = ?`,
    ],
  };
  const simplifyLists = {
    band1: [[2, 4], [2, 6? 0 : 0]].filter((r) => r[1] > 0 && r[1] !== true).slice(0, 0).concat([[2, 4], [2, 8], [2, 6], [3, 6], [4, 8], [3, 12? 0 : 9]].filter((r) => r[1] <= 8 || r[1] === 9).map(([a, b]) => [a, b]).slice(0, 4)),
    band2: [],
    band3: [],
  };
  const simplifyClean = {
    band1: [[2, 4], [2, 8], [2, 6], [3, 6], [4, 8], [3, 9], [2, 4], [2, 8], [2, 6], [3, 6], [4, 8], [3, 9]],
    band2: [[2, 10], [5, 10], [2, 12], [3, 12], [4, 12], [6, 12], [2, 16], [4, 16], [5, 15], [3, 15], [2, 14], [7, 14]],
    band3: [[2, 20], [4, 20], [5, 20], [10, 20], [2, 24], [3, 24], [4, 24], [6, 24], [8, 24], [12, 24], [5, 25], [10, 30]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    simplifyClean[band].forEach(([a, b], i) => {
      items.push(
        item("equivalence", "procedural", `simplifyUnit_${band}`, band, {
          answer: b / a,
          answerType: "numberPad",
          display: { frac: { kind: "simplifyDen", a, b }, promptText: simplifyPhr[band][Math.floor(i / 6) % 2](a, b) },
        })
      );
    });
  }

  return items;
}

export function equivalenceConceptual() {
  const items = [];
  let seed = 401;

  const eqJudgePhr = {
    band1: [
      (nm, a, b, c, d) => `${nm} says ${F(a, b)} and ${F(c, d)} are the same amount. Is ${nm} right?`,
      (nm, a, b, c, d) => `${F(a, b)} equals ${F(c, d)}, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, a, b, c, d) => `${nm} pairs ${F(a, b)} with ${F(c, d)} as equivalents. Do they match?`,
      (nm, a, b, c, d) => `On ${nm}'s chart, ${F(a, b)} and ${F(c, d)} share one point. Should they?`,
    ],
    band3: [
      (nm, a, b, c, d) => `${nm} certifies ${F(a, b)} = ${F(c, d)}. Is the certification valid?`,
      (nm, a, b, c, d) => `Cross-checking ${nm}'s claim that ${F(a, b)} matches ${F(c, d)} — does it hold?`,
    ],
  };
  const eqJudgeData = {
    band1: [[1, 2, 2, 4, true], [1, 2, 3, 4, false], [1, 3, 2, 6, true], [2, 3, 3, 6, false], [1, 4, 2, 8, true], [3, 4, 5, 8, false], [2, 3, 4, 6, true], [1, 3, 2, 4, false], [1, 2, 4, 8, true], [1, 4, 2, 4, false], [3, 4, 6, 8, true], [2, 4, 3, 8, false], [1, 2, 2, 4, true], [1, 3, 3, 6, false], [2, 3, 4, 6, true], [3, 4, 7, 8, false]],
    band2: [[2, 5, 4, 10, true], [3, 5, 5, 10, false], [1, 6, 2, 12, true], [5, 6, 9, 12, false], [3, 4, 9, 12, true], [1, 4, 4, 12, false], [1, 5, 2, 10, true], [4, 5, 7, 10, false], [1, 3, 4, 12, true], [2, 3, 6, 12, false], [1, 2, 5, 10, true], [3, 8, 5, 16, false], [2, 6, 4, 12, true], [4, 6, 6, 12, false], [5, 8, 10, 16, true], [1, 8, 3, 16, false]],
    band3: [[7, 10, 14, 20, true], [9, 10, 17, 20, false], [5, 12, 10, 24, true], [7, 12, 15, 24, false], [3, 10, 6, 20, true], [1, 10, 3, 20, false], [11, 12, 22, 24, true], [1, 12, 3, 24, false], [3, 8, 9, 24, true], [5, 8, 14, 24, false], [2, 3, 8, 12, true], [5, 6, 11, 12, false], [3, 4, 15, 20, true], [4, 5, 15, 20, false], [9, 10, 18, 20, true], [7, 10, 15, 20, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    eqJudgeData[band].forEach(([a, b, c, d, ok], i) => {
      items.push(
        item("equivalence", "conceptual", `equivJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "equivSaid", a, b, c, d }, promptText: eqJudgePhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), a, b, c, d), truth: ok },
        })
      );
    });
  }

  const pickEqPhr = {
    band1: [
      (nm, a, b) => `Which fraction names the same amount as ${F(a, b)}? ${nm} hunts for it.`,
      (nm, a, b) => `${nm} needs a twin for ${F(a, b)}. Which fraction is it?`,
    ],
    band2: [
      (nm, a, b) => `Pick the equivalent of ${F(a, b)} from the choices. ${nm} checks each.`,
      (nm, a, b) => `${nm} matches ${F(a, b)} to its equal. Which option matches?`,
    ],
    band3: [
      (nm, a, b) => `Identify the exact equivalent of ${F(a, b)}. ${nm} cross-multiplies to verify.`,
      (nm, a, b) => `Only one choice equals ${F(a, b)}. Which does ${nm} certify?`,
    ],
  };
  const pickEqData = {
    band1: [[1, 2, 2, 4], [1, 3, 2, 6], [2, 3, 4, 6], [1, 4, 2, 8], [3, 4, 6, 8], [1, 2, 4, 8], [1, 3, 2, 6], [2, 3, 4, 6], [1, 4, 2, 8], [3, 4, 6, 8], [1, 2, 2, 4], [1, 3, 2, 6], [2, 3, 4, 6], [1, 4, 2, 8], [3, 4, 6, 8], [1, 2, 4, 8]],
    band2: [[2, 5, 4, 10], [3, 5, 6, 10], [1, 6, 2, 12], [5, 6, 10, 12], [3, 4, 9, 12], [1, 5, 2, 10], [4, 5, 8, 10], [1, 3, 4, 12], [2, 3, 8, 12], [1, 2, 5, 10], [3, 8, 6, 16], [5, 8, 10, 16], [2, 6, 4, 12], [4, 6, 8, 12], [1, 4, 3, 12], [1, 8, 2, 16]],
    band3: [[7, 10, 14, 20], [9, 10, 18, 20], [5, 12, 10, 24], [7, 12, 14, 24], [3, 10, 6, 20], [11, 12, 22, 24], [3, 8, 9, 24], [5, 8, 15, 24], [2, 3, 8, 12], [5, 6, 10, 12], [3, 4, 15, 20], [4, 5, 16, 20], [9, 10, 27, 30], [7, 10, 21, 30], [5, 12, 15, 36], [1, 12, 2, 24]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    pickEqData[band].forEach(([a, b, c, d], i) => {
      const good = F(c, d);
      const wrong = [...new Set([F(c + 1, d), F(c, d + b), F(a, d)])].filter((x) => x !== good);
      items.push(
        item("equivalence", "conceptual", `pickEquiv_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { frac: { kind: "equivPick", a, b, c, d }, promptText: pickEqPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), a, b) },
        })
      );
    });
  }

  const doublePhr = {
    band1: [
      (nm, a, b) => `${nm} doubles the top AND bottom of ${F(a, b)} and says the value changed. Is ${nm} right?`,
      (nm, a, b) => `Doubling both numbers of ${F(a, b)}, ${nm} expects a bigger fraction. Is that right?`,
    ],
    band2: [
      (nm, a, b) => `${nm} multiplies top and bottom of ${F(a, b)} by 2 and calls the result larger. Is ${nm} right?`,
      (nm, a, b) => `Scaling ${F(a, b)} by 2/2 should grow it, argues ${nm}. Does it?`,
    ],
    band3: [
      (nm, a, b) => `${nm} asserts that ${F(a, b)} scaled by 2/2 lands at a different point on the line. Is that right?`,
      (nm, a, b) => `Multiplying numerator and denominator of ${F(a, b)} by 2 moves the value, per ${nm}. Does it move?`,
    ],
  };
  const doubleData = {
    band1: [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 2], [2, 3], [1, 4]],
    band2: [[2, 5], [3, 5], [1, 6], [5, 6], [3, 8], [5, 8], [1, 5], [4, 5], [2, 6? 0 : 0], [1, 8]].filter((r) => r[1]).concat([[4, 6], [7, 8], [2, 5], [3, 5], [1, 6], [5, 6], [3, 8], [5, 8], [1, 5]]).slice(0, 18),
    band3: [[7, 10], [9, 10], [5, 12], [7, 12], [3, 10], [11, 12], [1, 10], [1, 12], [7, 10], [9, 10], [5, 12], [7, 12], [3, 10], [11, 12], [1, 10], [1, 12], [9, 10], [5, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    doubleData[band].forEach(([a, b], i) => {
      items.push(
        item("equivalence", "conceptual", `doubleBothJudge_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { frac: { kind: "trapNo" }, promptText: doublePhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), a, b), truth: false },
        })
      );
    });
  }

  return items;
}
