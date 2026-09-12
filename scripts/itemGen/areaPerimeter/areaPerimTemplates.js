/* Deterministic areaPerimeter bank items — part 1: area, perimeter.
 * (Part 2: areaPerimTemplates2.js; stories: areaPerimStories.js.)
 *
 * Integer answers (numberPad) or string choices. Claims ride display.ap,
 * re-derived by authorAreaPerim.js. Judged = "Is this right?" Yes/No.
 * Letter-free-ish forms ("Area: 5 x 3 = ?", "Perim: 5 + 3 + 5 + 3 = ?"
 * — 5 letters, under the 6-letter verbal threshold) serve the words-off
 * path. Bands: K-1 dims 2-6 (unit squares); 2-3 dims 3-12 (cm/m);
 * 4-5 dims to 15 + missing sides.
 */

import { shuffled, NAMES } from "../counting/countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };
export const OFF = { band1: 0, band2: 7, band3: 13 };
export const nameAt = (i) => NAMES[i % NAMES.length];
export const phrIdx = (i, listLen, phrCount) => (Math.floor(i / listLen) * 2 + (i % 2)) % phrCount;

export const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "areaPerimeter",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

/* ================================================================== */
/* area                                                                */
/* ================================================================== */

export function areaProcedural() {
  const items = [];
  let seed = 611;

  const dimsPhr = {
    band1: [
      (w, h) => `A rectangle of unit squares has ${h} rows with ${w} squares in each row. How many unit squares is its area?`,
      (w, h) => `Grid paper shows a rectangle ${w} squares wide and ${h} squares tall. How many unit squares does it cover?`,
      (w, h) => `A tile patch is ${w} squares across and ${h} squares up. How many square tiles fill the patch?`,
      (w, h) => `Count the unit squares: ${h} rows, ${w} in each row. How many unit squares are there in all?`,
    ],
    band2: [
      (w, h) => `A rectangle is ${w} cm long and ${h} cm wide. What is its area in square cm?`,
      (w, h) => `Find the area of a ${w} cm by ${h} cm rectangle in square cm.`,
      (w, h) => `A card measures ${w} cm by ${h} cm. How many square cm is its area?`,
      (w, h) => `Compute the area in square cm of a rectangle ${w} cm by ${h} cm.`,
    ],
    band3: [
      (w, h) => `A rectangle measures ${w} m by ${h} m. Compute its area in square m.`,
      (w, h) => `Exactly how many square m cover a ${w} m by ${h} m rectangle?`,
      (w, h) => `Determine the area of a ${w} m by ${h} m rectangle in square m.`,
      (w, h) => `The area of a rectangle ${w} m long and ${h} m wide is how many square m?`,
    ],
  };
  const dimsData = {
    band1: [[2, 3], [3, 4], [2, 5], [4, 5], [3, 6], [2, 6], [5, 6], [4, 4], [3, 3], [2, 4], [5, 5], [6, 6], [4, 6], [6, 3], [6, 4], [5, 3]],
    band2: [[7, 4], [8, 5], [9, 3], [10, 6], [11, 4], [12, 5], [7, 6], [8, 8], [9, 7], [10, 10], [11, 6], [12, 3], [9, 9], [8, 4], [10, 4], [12, 6]],
    band3: [[12, 8], [13, 6], [14, 5], [15, 4], [12, 12], [13, 9], [14, 7], [15, 8], [12, 11], [13, 13], [14, 10], [15, 15], [14, 14], [15, 6], [13, 7], [12, 9]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    dimsData[band].forEach(([w, h], i) => {
      items.push(
        item("area", "procedural", `areaDims_${band}`, band, {
          answer: w * h,
          answerType: "numberPad",
          display: { ap: { kind: "areaOf", w, h }, promptText: dimsPhr[band][phrIdx(i, 13, 4)](w, h) },
        })
      );
    });
  }

  // Letter-free ("Area" + "x" = 5 letters, below the verbal threshold).
  const lfPhr = [(w, h) => `Area: ${w} x ${h} = ?`, (w, h) => `${w} x ${h} = ? (area)`];
  for (const band of ["band1", "band2", "band3"]) {
    dimsData[band].forEach(([w, h], i) => {
      items.push(
        item("area", "procedural", `areaLF_${band}`, band, {
          answer: w * h,
          answerType: "numberPad",
          display: { ap: { kind: "areaOf", w, h }, promptText: lfPhr[i % 2](w, h) },
        })
      );
    });
  }

  const sqPhr = {
    band1: [
      (s) => `A square of unit squares is ${s} on each side. How many unit squares is its area?`,
      (s) => `Each side of a square holds ${s} unit squares. How many unit squares cover the square?`,
      (s) => `A square patch is ${s} squares across and ${s} squares up. How many square tiles fill it?`,
      (s) => `Count the unit squares in a ${s}-by-${s} square. How many unit squares is that?`,
    ],
    band2: [
      (s) => `A square has ${s} cm sides. What is its area in square cm?`,
      (s) => `Find the area of a square with side ${s} cm in square cm.`,
      (s) => `A square sticker measures ${s} cm on a side. How many square cm is its area?`,
      (s) => `Compute the area in square cm of a ${s} cm square.`,
    ],
    band3: [
      (s) => `A square measures ${s} m on each side. Compute its area in square m.`,
      (s) => `Exactly how many square m fill a square of side ${s} m?`,
      (s) => `Determine the area of a square with ${s} m sides in square m.`,
      (s) => `The area of a ${s} m square is how many square m?`,
    ],
  };
  const sqData = { band1: [2, 3, 4, 5, 6, 2, 3, 4, 5, 6], band2: [7, 8, 9, 10, 11, 7, 8, 9, 10, 11], band3: [11, 12, 13, 14, 15, 11, 12, 13, 14, 15] };
  for (const band of ["band1", "band2", "band3"]) {
    sqData[band].forEach((s, i) => {
      items.push(
        item("area", "procedural", `squareArea_${band}`, band, {
          answer: s * s,
          answerType: "numberPad",
          display: { ap: { kind: "areaOf", w: s, h: s }, promptText: sqPhr[band][phrIdx(i, 5, 4)](s) },
        })
      );
    });
  }

  const pickPhr = {
    band1: [
      (w, h) => `Pick the area of a rectangle ${w} unit squares wide and ${h} tall.`,
      (w, h) => `A grid rectangle is ${w} across and ${h} up. Which number of unit squares covers it?`,
      (w, h) => `Which choice is the area, in unit squares, of a ${w}-by-${h} rectangle?`,
      (w, h) => `Choose the count of unit squares filling a ${w}-by-${h} rectangle.`,
    ],
    band2: [
      (w, h) => `Select the area in square cm of a ${w} cm by ${h} cm rectangle.`,
      (w, h) => `Which choice equals the area of a ${w} cm by ${h} cm rectangle?`,
      (w, h) => `The area of a ${w} cm by ${h} cm card is which number of square cm?`,
      (w, h) => `Find the area of the ${w} by ${h} rectangle among the choices.`,
    ],
    band3: [
      (w, h) => `Identify the area in square m of a ${w} m by ${h} m rectangle.`,
      (w, h) => `Which value is the area of a ${w} m by ${h} m rectangle?`,
      (w, h) => `Precisely which choice equals the area of a ${w} by ${h} rectangle?`,
      (w, h) => `Determine the area of the ${w} m by ${h} m rectangle from the choices.`,
    ],
  };
  const pickData = {
    band1: [[2, 3], [3, 4], [2, 5], [4, 5], [3, 6], [2, 6], [5, 6], [4, 4], [3, 3], [2, 4], [5, 5], [6, 6], [4, 6], [6, 3], [6, 4], [5, 3]],
    band2: [[7, 4], [8, 5], [9, 3], [10, 6], [11, 4], [12, 5], [7, 6], [8, 8], [9, 7], [10, 10], [11, 6], [12, 3], [9, 9], [8, 4], [10, 4], [12, 6]],
    band3: [[12, 8], [13, 6], [14, 5], [15, 4], [12, 12], [13, 9], [14, 7], [15, 8], [12, 11], [13, 13], [14, 10], [15, 15], [14, 14], [15, 6], [13, 7], [12, 9]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    pickData[band].forEach(([w, h], i) => {
      const good = w * h;
      const wrong = [...new Set([2 * (w + h), w + h, good + w])].filter((x) => x !== good);
      items.push(
        item("area", "procedural", `areaPick_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { ap: { kind: "areaOf", w, h }, promptText: pickPhr[band][phrIdx(i, 13, 4)](w, h) },
        })
      );
    });
  }

  return items;
}

export function areaConceptual() {
  const items = [];

  const addTrapPhr = {
    band1: [
      (nm, w, h) => `${nm} finds the area of a ${w}-by-${h} rectangle by adding: ${w} + ${h} = ${w + h} unit squares. Is ${nm} right?`,
      (nm, w, h) => `For a ${w}-by-${h} grid rectangle, ${nm} says the area is ${w} + ${h} = ${w + h}. Is that right?`,
    ],
    band2: [
      (nm, w, h) => `${nm} computes the area of a ${w} cm by ${h} cm rectangle as ${w} + ${h} = ${w + h} square cm. Does the work hold?`,
      (nm, w, h) => `Adding the sides, ${nm} reports ${w + h} square cm for a ${w} by ${h} rectangle's area. Is ${nm} right?`,
    ],
    band3: [
      (nm, w, h) => `${nm}'s worked area for a ${w} m by ${h} m rectangle reads ${w} + ${h} = ${w + h} square m. Is the work sound?`,
      (nm, w, h) => `${nm} defends ${w + h} square m as the area of a ${w} by ${h} rectangle. Should the defense stand?`,
    ],
  };
  const addTrapData = {
    band1: [[2, 3], [3, 4], [2, 5], [4, 5], [3, 6], [2, 6], [5, 6], [4, 4], [3, 3], [2, 4], [5, 5], [6, 6], [4, 6], [2, 3], [3, 4], [2, 5], [4, 5], [3, 6]],
    band2: [[7, 4], [8, 5], [9, 3], [10, 6], [11, 4], [12, 5], [7, 6], [8, 8], [9, 7], [10, 10], [11, 6], [12, 3], [9, 9], [7, 4], [8, 5], [9, 3], [10, 6], [11, 4]],
    band3: [[12, 8], [13, 6], [14, 5], [15, 4], [12, 12], [13, 9], [14, 7], [15, 8], [12, 11], [13, 13], [14, 10], [15, 15], [14, 14], [12, 8], [13, 6], [14, 5], [15, 4], [12, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    addTrapData[band].forEach(([w, h], i) => {
      items.push(
        item("area", "conceptual", `areaAddTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { ap: { kind: "trapNo" }, promptText: addTrapPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), w, h), truth: false },
        })
      );
    });
  }

  const saidPhr = {
    band1: [
      (nm, w, h, said) => `${nm} says a ${w}-by-${h} rectangle covers ${said} unit squares. Is ${nm} right?`,
      (nm, w, h, said) => `A ${w}-by-${h} grid rectangle covers ${said} unit squares, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, w, h, said) => `${nm} records ${said} square cm for a ${w} cm by ${h} cm rectangle. Does the record hold?`,
      (nm, w, h, said) => `Check ${nm}'s area of ${said} square cm for a ${w} by ${h} rectangle. Right or not?`,
    ],
    band3: [
      (nm, w, h, said) => `${nm} certifies ${said} square m as the area of a ${w} m by ${h} m rectangle. Valid?`,
      (nm, w, h, said) => `Audit ${nm}'s sheet: a ${w} by ${h} rectangle, area written ${said}. Clean audit?`,
    ],
  };
  const saidData = {
    band1: [[2, 3, 6, true], [3, 4, 14, false], [2, 5, 10, true], [4, 5, 18, false], [3, 6, 18, true], [2, 6, 16, false], [4, 4, 16, true], [3, 3, 12, false], [2, 4, 8, true], [5, 5, 20, false], [3, 4, 12, true], [2, 3, 10, false], [4, 5, 20, true], [2, 5, 7, false], [2, 6, 12, true], [3, 6, 9, false], [3, 3, 9, true], [4, 4, 8, false]],
    band2: [[7, 4, 28, true], [8, 5, 45, false], [9, 3, 27, true], [10, 6, 66, false], [11, 4, 44, true], [12, 5, 65, false], [7, 6, 42, true], [8, 8, 60, false], [9, 7, 63, true], [10, 10, 90, false], [11, 6, 66, true], [12, 3, 30, false], [9, 9, 81, true], [7, 4, 24, false], [8, 5, 40, true], [9, 3, 21, false], [10, 6, 60, true], [11, 4, 40, false]],
    band3: [[12, 8, 96, true], [13, 6, 84, false], [14, 5, 70, true], [15, 4, 64, false], [12, 12, 144, true], [13, 9, 121, false], [14, 7, 98, true], [15, 8, 115, false], [12, 11, 132, true], [13, 13, 168, false], [14, 10, 140, true], [15, 15, 220, false], [14, 14, 196, true], [12, 8, 88, false], [13, 6, 78, true], [14, 5, 75, false], [15, 4, 60, true], [12, 12, 124, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    saidData[band].forEach(([w, h, said, ok], i) => {
      items.push(
        item("area", "conceptual", `areaSaidJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ap: { kind: "areaSaid", w, h, said }, promptText: saidPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), w, h, said), truth: ok },
        })
      );
    });
  }

  const turnPhr = {
    band1: [
      (nm, w, h) => `${nm} turns a ${w}-by-${h} rectangle on its side and says it now covers a different number of unit squares. Is ${nm} right?`,
      (nm, w, h) => `Turning a ${w}-by-${h} card sideways changes how much table it covers, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, w, h) => `${nm} rotates a ${w} cm by ${h} cm rectangle and expects its area to change. Will it change?`,
      (nm, w, h) => `A ${w} by ${h} rectangle covers more after a quarter turn, argues ${nm}. Is ${nm} right?`,
    ],
    band3: [
      (nm, w, h) => `${nm} asserts a ${w} m by ${h} m rectangle's area shifts when the rectangle is rotated. Is the assertion right?`,
      (nm, w, h) => `Rotation changes area, per ${nm}, so a ${w} by ${h} rectangle covers differently on its side. Correct?`,
    ],
  };
  const turnData = {
    band1: [[2, 3], [3, 4], [2, 5], [4, 5], [3, 6], [2, 6], [5, 6], [4, 4], [3, 3], [2, 4], [5, 5], [6, 6], [4, 6], [2, 3], [3, 4], [2, 5]],
    band2: [[7, 4], [8, 5], [9, 3], [10, 6], [11, 4], [12, 5], [7, 6], [8, 8], [9, 7], [10, 10], [11, 6], [12, 3], [9, 9], [7, 4], [8, 5], [9, 3]],
    band3: [[12, 8], [13, 6], [14, 5], [15, 4], [12, 12], [13, 9], [14, 7], [15, 8], [12, 11], [13, 13], [14, 10], [15, 15], [14, 14], [12, 8], [13, 6], [14, 5]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    turnData[band].forEach(([w, h], i) => {
      items.push(
        item("area", "conceptual", `turnJudge_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { ap: { kind: "trapNo" }, promptText: turnPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), w, h), truth: false },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* perimeter                                                           */
/* ================================================================== */

export function perimeterProcedural() {
  const items = [];
  let seed = 621;

  const dimsPhr = {
    band1: [
      (w, h) => `A rectangle is ${w} units across and ${h} units down. How many units is the trip all the way around it?`,
      (w, h) => `Walk the edge of a ${w}-unit by ${h}-unit rectangle. How many units long is the walk around?`,
      (w, h) => `A grid rectangle is ${w} units wide and ${h} units tall. How many units is its border in all?`,
      (w, h) => `Trace around a rectangle ${w} units by ${h} units. How many units does the trace cover?`,
    ],
    band2: [
      (w, h) => `A rectangle is ${w} cm long and ${h} cm wide. What is its perimeter in cm?`,
      (w, h) => `Find the perimeter of a ${w} cm by ${h} cm rectangle in cm.`,
      (w, h) => `A frame measures ${w} cm by ${h} cm. How many cm is its perimeter?`,
      (w, h) => `Compute the perimeter in cm of a rectangle ${w} cm by ${h} cm.`,
    ],
    band3: [
      (w, h) => `A rectangle measures ${w} m by ${h} m. Compute its perimeter in m.`,
      (w, h) => `Exactly how many m is the perimeter of a ${w} m by ${h} m rectangle?`,
      (w, h) => `Determine the perimeter of a ${w} m by ${h} m rectangle in m.`,
      (w, h) => `The perimeter of a rectangle ${w} m long and ${h} m wide is how many m?`,
    ],
  };
  const dimsData = {
    band1: [[2, 3], [3, 4], [2, 5], [4, 5], [3, 6], [2, 6], [5, 6], [4, 4], [3, 3], [2, 4], [5, 5], [6, 6], [4, 6], [6, 3], [6, 4], [5, 3]],
    band2: [[7, 4], [8, 5], [9, 3], [10, 6], [11, 4], [12, 5], [7, 6], [8, 8], [9, 7], [10, 10], [11, 6], [12, 3], [9, 9], [8, 4], [10, 4], [12, 6]],
    band3: [[12, 8], [13, 6], [14, 5], [15, 4], [12, 12], [13, 9], [14, 7], [15, 8], [12, 11], [13, 13], [14, 10], [15, 15], [14, 14], [15, 6], [13, 7], [12, 9]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    dimsData[band].forEach(([w, h], i) => {
      items.push(
        item("perimeter", "procedural", `perimDims_${band}`, band, {
          answer: 2 * (w + h),
          answerType: "numberPad",
          display: { ap: { kind: "perimOf", w, h }, promptText: dimsPhr[band][phrIdx(i, 13, 4)](w, h) },
        })
      );
    });
  }

  // Letter-free ("Perim" = 5 letters).
  const lfPhr = [(w, h) => `Perim: ${w} + ${h} + ${w} + ${h} = ?`, (w, h) => `${w} + ${h} + ${w} + ${h} = ? (perim)`];
  for (const band of ["band1", "band2", "band3"]) {
    dimsData[band].forEach(([w, h], i) => {
      items.push(
        item("perimeter", "procedural", `perimLF_${band}`, band, {
          answer: 2 * (w + h),
          answerType: "numberPad",
          display: { ap: { kind: "perimOf", w, h }, promptText: lfPhr[i % 2](w, h) },
        })
      );
    });
  }

  const sqPhr = {
    band1: [
      (s) => `A square is ${s} units on each side. How many units is the trip around it?`,
      (s) => `Walk around a square with ${s}-unit sides. How many units long is the walk?`,
      (s) => `Each side of a square is ${s} units. How many units is its whole border?`,
      (s) => `Trace a square ${s} units on a side. How many units does the trace cover?`,
    ],
    band2: [
      (s) => `A square has ${s} cm sides. What is its perimeter in cm?`,
      (s) => `Find the perimeter of a square with side ${s} cm in cm.`,
      (s) => `A square coaster measures ${s} cm on a side. How many cm is its perimeter?`,
      (s) => `Compute the perimeter in cm of a ${s} cm square.`,
    ],
    band3: [
      (s) => `A square measures ${s} m on each side. Compute its perimeter in m.`,
      (s) => `Exactly how many m is the perimeter of a square of side ${s} m?`,
      (s) => `Determine the perimeter of a square with ${s} m sides in m.`,
      (s) => `The perimeter of a ${s} m square is how many m?`,
    ],
  };
  const sqData = { band1: [2, 3, 4, 5, 6, 2, 3, 4, 5, 6], band2: [7, 8, 9, 10, 11, 7, 8, 9, 10, 11], band3: [11, 12, 13, 14, 15, 11, 12, 13, 14, 15] };
  for (const band of ["band1", "band2", "band3"]) {
    sqData[band].forEach((s, i) => {
      items.push(
        item("perimeter", "procedural", `squarePerim_${band}`, band, {
          answer: 4 * s,
          answerType: "numberPad",
          display: { ap: { kind: "perimOf", w: s, h: s }, promptText: sqPhr[band][phrIdx(i, 5, 4)](s) },
        })
      );
    });
  }

  const missPhr = {
    band1: [
      (p, w) => `A rectangle's border is ${p} units in all, and one side is ${w} units. How many units is the other side?`,
      (p, w) => `Going all the way around a rectangle takes ${p} units. One side is ${w} units long. How long is the other side, in units?`,
      (p, w) => `The whole border of a rectangle is ${p} units, with one side of ${w} units. Type the other side's length in units.`,
      (p, w) => `A rectangle uses ${p} units of border and has a ${w}-unit side. How many units long is the other side?`,
    ],
    band2: [
      (p, w) => `A rectangle's perimeter is ${p} cm and one side is ${w} cm. What is the other side in cm?`,
      (p, w) => `With perimeter ${p} cm and a ${w} cm side, a rectangle's other side is how many cm?`,
      (p, w) => `Find the missing side: perimeter ${p} cm, one side ${w} cm.`,
      (p, w) => `A ${p} cm perimeter wraps a rectangle with one ${w} cm side. Type the other side in cm.`,
    ],
    band3: [
      (p, w) => `A rectangle has perimeter ${p} m and one side of ${w} m. Compute the other side in m.`,
      (p, w) => `Exactly how many m is the other side of a rectangle with perimeter ${p} m and a ${w} m side?`,
      (p, w) => `Determine the missing side of a rectangle: perimeter ${p} m, known side ${w} m.`,
      (p, w) => `Solve for the other side: perimeter ${p} m, one side ${w} m.`,
    ],
  };
  const missData = {
    band1: [[10, 2], [14, 3], [12, 2], [16, 5], [18, 4], [14, 5], [16, 2], [12, 4], [18, 6], [10, 3], [16, 6], [20, 4], [20, 6]],
    band2: [[22, 7], [26, 8], [24, 9], [32, 10], [30, 11], [34, 12], [26, 7], [30, 8], [30, 9], [42, 10], [34, 11], [30, 12], [38, 9]],
    band3: [[40, 12], [38, 13], [38, 14], [38, 15], [46, 12], [44, 13], [42, 14], [46, 15], [48, 13], [50, 13], [48, 14], [58, 15], [54, 14]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    missData[band].forEach(([p, w], i) => {
      items.push(
        item("perimeter", "procedural", `missingSide_${band}`, band, {
          answer: p / 2 - w,
          answerType: "numberPad",
          display: { ap: { kind: "missSidePerim", p, w }, promptText: missPhr[band][phrIdx(i, 13, 4)](p, w) },
        })
      );
    });
  }

  return items;
}

export function perimeterConceptual() {
  const items = [];

  const halfTrapPhr = {
    band1: [
      (nm, w, h) => `${nm} finds the trip around a ${w}-by-${h} rectangle by adding just two sides: ${w} + ${h} = ${w + h} units. Is ${nm} right?`,
      (nm, w, h) => `For a ${w}-unit by ${h}-unit rectangle, ${nm} says the border is ${w} + ${h} = ${w + h} units. Is that right?`,
    ],
    band2: [
      (nm, w, h) => `${nm} computes the perimeter of a ${w} cm by ${h} cm rectangle as ${w} + ${h} = ${w + h} cm. Does the work hold?`,
      (nm, w, h) => `Adding one length and one width, ${nm} reports ${w + h} cm of perimeter for a ${w} by ${h} rectangle. Is ${nm} right?`,
    ],
    band3: [
      (nm, w, h) => `${nm}'s perimeter for a ${w} m by ${h} m rectangle reads ${w} + ${h} = ${w + h} m. Is the work sound?`,
      (nm, w, h) => `${nm} defends ${w + h} m as the perimeter of a ${w} by ${h} rectangle. Should the defense stand?`,
    ],
  };
  const halfTrapData = {
    band1: [[2, 3], [3, 4], [2, 5], [4, 5], [3, 6], [2, 6], [5, 6], [4, 4], [3, 3], [2, 4], [5, 5], [6, 6], [4, 6], [2, 3], [3, 4], [2, 5], [4, 5], [3, 6]],
    band2: [[7, 4], [8, 5], [9, 3], [10, 6], [11, 4], [12, 5], [7, 6], [8, 8], [9, 7], [10, 10], [11, 6], [12, 3], [9, 9], [7, 4], [8, 5], [9, 3], [10, 6], [11, 4]],
    band3: [[12, 8], [13, 6], [14, 5], [15, 4], [12, 12], [13, 9], [14, 7], [15, 8], [12, 11], [13, 13], [14, 10], [15, 15], [14, 14], [12, 8], [13, 6], [14, 5], [15, 4], [12, 12]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    halfTrapData[band].forEach(([w, h], i) => {
      items.push(
        item("perimeter", "conceptual", `perimHalfTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { ap: { kind: "trapNo" }, promptText: halfTrapPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), w, h), truth: false },
        })
      );
    });
  }

  const saidPhr = {
    band1: [
      (nm, w, h, said) => `${nm} says the trip around a ${w}-by-${h} rectangle is ${said} units. Is ${nm} right?`,
      (nm, w, h, said) => `The border of a ${w}-unit by ${h}-unit rectangle is ${said} units, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, w, h, said) => `${nm} records ${said} cm for the perimeter of a ${w} cm by ${h} cm rectangle. Does the record hold?`,
      (nm, w, h, said) => `Check ${nm}'s perimeter of ${said} cm for a ${w} by ${h} rectangle. Right or not?`,
    ],
    band3: [
      (nm, w, h, said) => `${nm} certifies ${said} m as the perimeter of a ${w} m by ${h} m rectangle. Valid?`,
      (nm, w, h, said) => `Audit ${nm}'s sheet: a ${w} by ${h} rectangle, perimeter written ${said}. Clean audit?`,
    ],
  };
  const saidData = {
    band1: [[2, 3, 10, true], [3, 4, 12, false], [2, 5, 14, true], [4, 5, 20, false], [3, 6, 18, true], [2, 6, 12, false], [4, 4, 16, true], [3, 3, 9, false], [2, 4, 12, true], [5, 5, 10, false], [3, 4, 14, true], [2, 3, 6, false], [4, 5, 18, true], [2, 5, 10, false], [2, 6, 16, true], [3, 6, 9, false], [3, 3, 12, true], [4, 4, 8, false]],
    band2: [[7, 4, 22, true], [8, 5, 40, false], [9, 3, 24, true], [10, 6, 60, false], [11, 4, 30, true], [12, 5, 60, false], [7, 6, 26, true], [8, 8, 64, false], [9, 7, 32, true], [10, 10, 100, false], [11, 6, 34, true], [12, 3, 36, false], [9, 9, 36, true], [7, 4, 28, false], [8, 5, 26, true], [9, 3, 27, false], [10, 6, 32, true], [11, 4, 44, false]],
    band3: [[12, 8, 40, true], [13, 6, 78, false], [14, 5, 38, true], [15, 4, 60, false], [12, 12, 48, true], [13, 9, 117, false], [14, 7, 42, true], [15, 8, 120, false], [12, 11, 46, true], [13, 13, 169, false], [14, 10, 48, true], [15, 15, 225, false], [14, 14, 56, true], [12, 8, 96, false], [13, 6, 38, true], [14, 5, 70, false], [15, 4, 38, true], [12, 12, 144, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    saidData[band].forEach(([w, h, said, ok], i) => {
      items.push(
        item("perimeter", "conceptual", `perimSaidJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ap: { kind: "perimSaid", w, h, said }, promptText: saidPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), w, h, said), truth: ok },
        })
      );
    });
  }

  const swapTrapPhr = {
    band1: [
      (nm, w, h) => `${nm} wants the trip AROUND a ${w}-by-${h} rectangle and answers with the ${w * h} unit squares inside it. Is ${nm} right?`,
      (nm, w, h) => `Asked for the border length of a ${w}-by-${h} rectangle, ${nm} counts the ${w * h} squares it covers. Is that right?`,
    ],
    band2: [
      (nm, w, h) => `${nm} answers a perimeter question about a ${w} cm by ${h} cm rectangle with its area, ${w * h}. Does the answer fit the question?`,
      (nm, w, h) => `For the distance around a ${w} by ${h} rectangle, ${nm} gives ${w * h}, the area. Is ${nm} right?`,
    ],
    band3: [
      (nm, w, h) => `${nm} swaps measures: asked for perimeter of a ${w} m by ${h} m rectangle, ${nm} reports the area ${w * h}. Is the report right?`,
      (nm, w, h) => `The question asks perimeter; ${nm} supplies ${w * h} square m of area for the ${w} by ${h} rectangle. Correct?`,
    ],
  };
  const swapData = {
    band1: [[2, 3], [3, 4], [2, 5], [4, 5], [3, 6], [2, 6], [4, 4], [3, 3], [2, 4], [5, 4? 4 : 4], [2, 3], [3, 4], [2, 5], [4, 5], [3, 6], [2, 6]].map((r) => [r[0], r[1]]),
    band2: [[7, 4], [8, 5], [9, 3], [10, 6], [11, 4], [12, 5], [7, 6], [8, 8], [9, 7], [10, 10], [11, 6], [12, 3], [9, 9], [7, 4], [8, 5], [9, 3]],
    band3: [[12, 8], [13, 6], [14, 5], [15, 4], [12, 12], [13, 9], [14, 7], [15, 8], [12, 11], [13, 13], [14, 10], [15, 15], [14, 14], [12, 8], [13, 6], [14, 5]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    swapData[band].forEach(([w, h], i) => {
      items.push(
        item("perimeter", "conceptual", `swapTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { ap: { kind: "trapNo" }, promptText: swapTrapPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), w, h), truth: false },
        })
      );
    });
  }

  return items;
}
