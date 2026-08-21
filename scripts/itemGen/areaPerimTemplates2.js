/* areaPerimeter bank part 2 — compositeFigures, measureReasoning.
 * Conventions in areaPerimTemplates.js.
 */

import { shuffled } from "./countingTemplates.js";
import { item, nameAt, OFF, phrIdx } from "./areaPerimTemplates.js";

/* ================================================================== */
/* compositeFigures                                                    */
/* ================================================================== */

export function compositeProcedural() {
  const items = [];
  let seed = 631;

  const joinPhr = {
    band1: [
      (a, b, c, d) => `A ${a}-by-${b} rectangle and a ${c}-by-${d} rectangle join with no overlap. How many unit squares do they cover together?`,
      (a, b, c, d) => `Two grid rectangles, ${a} by ${b} and ${c} by ${d}, sit side by side without overlapping. How many unit squares in all?`,
      (a, b, c, d) => `An L-shape is built from a ${a}-by-${b} piece and a ${c}-by-${d} piece. How many unit squares make the L-shape?`,
      (a, b, c, d) => `Join a ${a}-by-${b} patch to a ${c}-by-${d} patch with no overlap. How many unit squares is the whole figure?`,
    ],
    band2: [
      (a, b, c, d) => `A figure is a ${a} cm by ${b} cm rectangle joined to a ${c} cm by ${d} cm rectangle, no overlap. What is its total area in square cm?`,
      (a, b, c, d) => `Two rectangles, ${a} by ${b} and ${c} by ${d}, combine into one figure without overlapping. Find the total area in square cm.`,
      (a, b, c, d) => `An L-shaped floor is a ${a} by ${b} part plus a ${c} by ${d} part. How many square cm does the floor cover?`,
      (a, b, c, d) => `Compute the combined area of non-overlapping rectangles ${a} by ${b} and ${c} by ${d}, in square cm.`,
    ],
    band3: [
      (a, b, c, d) => `A composite figure is a ${a} m by ${b} m rectangle plus a ${c} m by ${d} m rectangle, no overlap. Compute its area in square m.`,
      (a, b, c, d) => `Exactly how many square m cover a figure made of ${a} by ${b} and ${c} by ${d} rectangles with no overlap?`,
      (a, b, c, d) => `Determine the total area of the non-overlapping pieces ${a} by ${b} and ${c} by ${d}, in square m.`,
      (a, b, c, d) => `An L-shaped park is a ${a} m by ${b} m field joined to a ${c} m by ${d} m field. What is the park's area in square m?`,
    ],
  };
  const joinData = {
    band1: [[2, 3, 2, 2], [3, 3, 2, 2], [2, 4, 2, 2], [3, 4, 2, 2], [2, 3, 2, 3], [2, 4, 2, 3], [3, 3, 2, 3], [2, 2, 2, 2], [2, 5, 2, 2], [3, 4, 2, 3? 3 : 3], [2, 4, 3, 2], [4, 3, 2, 2], [2, 5, 2, 3]].map((r) => [r[0], r[1], r[2], r[3]]),
    band2: [[7, 4, 3, 2], [8, 5, 4, 3], [9, 3, 5, 2], [10, 6, 4, 4], [11, 4, 3, 3], [12, 5, 5, 4], [7, 6, 2, 2], [8, 8, 4, 2], [9, 7, 3, 4], [10, 10, 5, 3], [11, 6, 4, 5], [12, 3, 6, 2], [9, 9, 2, 5]],
    band3: [[12, 8, 6, 4], [13, 6, 7, 3], [14, 5, 8, 4], [15, 4, 9, 5], [12, 12, 6, 6], [13, 9, 7, 5], [14, 7, 8, 6], [15, 8, 9, 4], [12, 11, 5, 5], [13, 13, 6, 3], [14, 10, 7, 7], [15, 15, 8, 5], [14, 14, 9, 6]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    joinData[band].forEach(([a, b, c, d], i) => {
      items.push(
        item("compositeFigures", "procedural", `joinAreas_${band}`, band, {
          answer: a * b + c * d,
          answerType: "numberPad",
          display: { ap: { kind: "joinAreas", a, b, c, d }, promptText: joinPhr[band][phrIdx(i, 13, 4)](a, b, c, d) },
        })
      );
    });
  }

  const cutPhr = {
    band1: [
      (W, H, w, h) => `A ${W}-by-${H} rectangle of unit squares has a ${w}-by-${h} corner piece removed. How many unit squares remain?`,
      (W, H, w, h) => `Cut a ${w}-by-${h} notch out of a ${W}-by-${H} grid rectangle. How many unit squares are left?`,
      (W, H, w, h) => `A ${W}-by-${H} chocolate bar loses a ${w}-by-${h} corner. How many squares of chocolate remain?`,
      (W, H, w, h) => `Removing a ${w}-by-${h} piece from a ${W}-by-${H} rectangle leaves how many unit squares?`,
    ],
    band2: [
      (W, H, w, h) => `A ${W} cm by ${H} cm sheet has a ${w} cm by ${h} cm corner cut away. What area remains, in square cm?`,
      (W, H, w, h) => `Cutting a ${w} by ${h} notch from a ${W} by ${H} sheet leaves how many square cm?`,
      (W, H, w, h) => `A ${W} by ${H} panel loses a ${w} by ${h} rectangle. Find the remaining area in square cm.`,
      (W, H, w, h) => `Compute the leftover area when a ${w} cm by ${h} cm piece is removed from a ${W} cm by ${H} cm sheet.`,
    ],
    band3: [
      (W, H, w, h) => `A ${W} m by ${H} m plot has a ${w} m by ${h} m corner excluded. Compute the remaining area in square m.`,
      (W, H, w, h) => `Excluding a ${w} by ${h} section from a ${W} by ${H} plot leaves exactly how many square m?`,
      (W, H, w, h) => `Determine the area left when a ${w} m by ${h} m patch is removed from a ${W} m by ${H} m field.`,
      (W, H, w, h) => `An L-shaped lot is a ${W} m by ${H} m rectangle minus a ${w} m by ${h} m corner. What is its area in square m?`,
    ],
  };
  const cutData = {
    band1: [[4, 4, 2, 2], [5, 4, 2, 2], [4, 3, 2, 2], [5, 3, 2, 2], [4, 4, 2, 3], [5, 4, 2, 3], [3, 3, 2, 2], [5, 4, 3, 2], [4, 3, 2, 1], [5, 3, 2, 1], [4, 4, 3, 2], [5, 5, 2, 2], [5, 5, 2, 3]],
    band2: [[10, 8, 4, 3], [12, 6, 5, 2], [9, 9, 3, 3], [11, 7, 4, 4], [10, 10, 5, 3], [12, 8, 6, 2], [9, 7, 2, 4], [11, 9, 5, 4], [10, 6, 3, 5], [12, 12, 4, 6], [9, 8, 4, 2], [11, 11, 6, 3], [10, 9, 5, 5]],
    band3: [[15, 10, 6, 4], [14, 12, 7, 3], [15, 12, 8, 5], [13, 11, 6, 6], [15, 15, 7, 4], [14, 10, 8, 3], [13, 13, 5, 7], [15, 14, 9, 4], [14, 11, 6, 5], [13, 12, 7, 7], [15, 11, 8, 6], [14, 13, 9, 5], [15, 13, 10, 4]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    cutData[band].forEach(([W, H, w, h], i) => {
      items.push(
        item("compositeFigures", "procedural", `cutArea_${band}`, band, {
          answer: W * H - w * h,
          answerType: "numberPad",
          display: { ap: { kind: "cutArea", W, H, w, h }, promptText: cutPhr[band][phrIdx(i, 13, 4)](W, H, w, h) },
        })
      );
    });
  }

  const twoSqPhr = {
    band1: [
      (s, t) => `Two squares sit side by side: one ${s} units on a side, one ${t} units on a side. How many unit squares do they cover together?`,
      (s, t) => `A ${s}-unit square and a ${t}-unit square join with no overlap. How many unit squares in all?`,
      (s, t) => `Squares of side ${s} and side ${t} make one figure without overlapping. How many unit squares is the figure?`,
      (s, t) => `Together, a square of side ${s} and a square of side ${t} cover how many unit squares?`,
    ],
    band2: [
      (s, t) => `Two squares with sides ${s} cm and ${t} cm combine without overlap. What is the total area in square cm?`,
      (s, t) => `Find the combined area of squares of side ${s} cm and side ${t} cm, in square cm.`,
      (s, t) => `A ${s} cm square joins a ${t} cm square, no overlap. How many square cm together?`,
      (s, t) => `Compute the total area of two squares, sides ${s} cm and ${t} cm.`,
    ],
    band3: [
      (s, t) => `Squares of side ${s} m and side ${t} m form one non-overlapping figure. Compute its area in square m.`,
      (s, t) => `Exactly how many square m do squares of sides ${s} m and ${t} m cover together?`,
      (s, t) => `Determine the combined area of a ${s} m square and a ${t} m square.`,
      (s, t) => `The total area of two squares, sides ${s} m and ${t} m, is how many square m?`,
    ],
  };
  const twoSqData = {
    band1: [[2, 3], [2, 2], [3, 3], [2, 4], [3, 4], [2, 3? 0 : 0]].filter((r) => r[1]).concat([[4, 4? 0 : 0]].filter((r) => r[1])).concat([[3, 2], [4, 2], [4, 3], [2, 2? 0 : 0]].filter((r) => r[1])).concat([[3, 3? 0 : 0]].filter((r) => r[1])),
    band2: [],
    band3: [],
  };
  const twoSqLists = {
    band1: [[2, 3], [2, 2], [3, 3], [2, 4], [3, 4], [3, 2], [4, 2], [4, 3], [2, 3], [2, 2], [3, 3], [2, 4], [3, 4]],
    band2: [[5, 6], [6, 7], [5, 7], [6, 8], [7, 8], [5, 8], [6, 6], [7, 7], [8, 8], [5, 5], [6, 5], [7, 6], [8, 7]],
    band3: [[9, 10], [10, 11], [9, 11], [10, 12], [11, 12], [9, 12], [10, 10], [11, 11], [12, 12], [9, 9], [10, 9], [11, 10], [12, 11]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    twoSqLists[band].forEach(([s, t], i) => {
      items.push(
        item("compositeFigures", "procedural", `twoSquares_${band}`, band, {
          answer: s * s + t * t,
          answerType: "numberPad",
          display: { ap: { kind: "joinAreas", a: s, b: s, c: t, d: t }, promptText: twoSqPhr[band][phrIdx(i, band === "band1" ? 8 : 13, 4)](s, t) },
        })
      );
    });
  }

  const partPhr = {
    band1: [
      (T, a, b) => `A figure of ${T} unit squares is split into two rectangles. One part covers ${a * b} unit squares (${a} by ${b}). How many unit squares are in the other part?`,
      (T, a, b) => `Two pieces make a ${T}-square figure. The first piece is ${a} by ${b}. How many unit squares does the second piece cover?`,
      (T, a, b) => `A ${T}-unit-square shape breaks into a ${a}-by-${b} piece and one more piece. How many unit squares is the other piece?`,
      (T, a, b) => `Of a figure covering ${T} unit squares, a ${a}-by-${b} part is shaded. How many unit squares are unshaded?`,
    ],
    band2: [
      (T, a, b) => `A composite figure of ${T} square cm splits into a ${a} by ${b} rectangle and one other piece. What is the other piece's area in square cm?`,
      (T, a, b) => `Two rectangles total ${T} square cm; one is ${a} cm by ${b} cm. Find the other's area in square cm.`,
      (T, a, b) => `A ${T} square cm floor is a ${a} by ${b} section plus one more section. How many square cm is the other section?`,
      (T, a, b) => `Compute the missing part: total area ${T} square cm, known part ${a} by ${b}.`,
    ],
    band3: [
      (T, a, b) => `A composite region of ${T} square m contains a ${a} m by ${b} m rectangle and one other rectangle. Compute the other rectangle's area.`,
      (T, a, b) => `Two rectangles cover ${T} square m in all; one measures ${a} by ${b}. Exactly how many square m is the other?`,
      (T, a, b) => `Determine the second piece's area when a ${T} square m figure includes a ${a} m by ${b} m piece.`,
      (T, a, b) => `Of ${T} square m total, a ${a} by ${b} rectangle is one part. The remaining part covers how many square m?`,
    ],
  };
  const partData = {
    band1: [[10, 2, 3], [14, 2, 4], [12, 3, 3], [16, 3, 4], [14, 3, 3], [12, 2, 4], [16, 2, 5], [18, 3, 4], [10, 2, 2], [15, 3, 3], [18, 2, 5], [20, 3, 4], [20, 4, 4]],
    band2: [[40, 4, 6], [50, 5, 6], [45, 4, 5], [60, 6, 6], [55, 5, 7], [48, 4, 7], [64, 6, 8], [70, 7, 6], [52, 4, 8], [66, 6, 7], [58, 5, 8], [72, 8, 6], [80, 7, 8]],
    band3: [[100, 8, 6], [110, 9, 6], [120, 8, 7], [130, 9, 8], [96, 6, 8], [140, 10, 7], [126, 9, 9], [150, 10, 8], [112, 8, 8], [144, 12, 6], [135, 9, 7], [160, 10, 9], [154, 11, 8]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    partData[band].forEach(([T, a, b], i) => {
      items.push(
        item("compositeFigures", "procedural", `missingPart_${band}`, band, {
          answer: T - a * b,
          answerType: "numberPad",
          display: { ap: { kind: "missingPart", T, a, b }, promptText: partPhr[band][phrIdx(i, 13, 4)](T, a, b) },
        })
      );
    });
  }

  return items;
}

export function compositeConceptual() {
  const items = [];

  const overlapPhr = {
    band1: [
      (nm) => `${nm} slides two paper rectangles so they overlap, then adds their two areas to get the area they cover on the table. Is ${nm} right?`,
      (nm) => `Two overlapping stickers cover the page, and ${nm} just adds their areas to find the covered space. Is that right?`,
    ],
    band2: [
      (nm) => `${nm} overlaps two rugs and sums their areas to report the floor space they cover. Does the sum hold?`,
      (nm) => `With two overlapping posters, ${nm} adds the two areas for the covered wall space. Is ${nm} right?`,
    ],
    band3: [
      (nm) => `${nm} computes covered ground for two overlapping tarps by simple addition of their areas. Is the computation sound?`,
      (nm) => `Two overlapping fields are fenced as one; ${nm} adds both areas for the enclosed ground. Should the addition stand?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < 18; i += 1) {
      items.push(
        item("compositeFigures", "conceptual", `overlapTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { ap: { kind: "trapNo" }, promptText: overlapPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band])) + (i >= 12 ? " Think about the doubled part." : i >= 6 ? " The overlap counts once." : ""), truth: false },
        })
      );
    }
  }

  const splitPhr = {
    band1: [
      (nm) => `${nm} cuts a paper rectangle into two pieces and says the two pieces together cover the same amount as before. Is ${nm} right?`,
      (nm) => `Cutting a shape in two does not change the total space it covers, says ${nm}. Is that right?`,
    ],
    band2: [
      (nm) => `${nm} splits a garden into two beds and claims the total planted area stays the same. Does the claim hold?`,
      (nm) => `Dividing a floor plan into two rooms keeps the total floor area, argues ${nm}. Is ${nm} right?`,
    ],
    band3: [
      (nm) => `${nm} partitions a field into two plots and asserts the combined area equals the original. Is the assertion sound?`,
      (nm) => `A region cut into two non-overlapping parts keeps its total area, states ${nm}. Should the statement stand?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < 16; i += 1) {
      items.push(
        item("compositeFigures", "conceptual", `splitJudge_${band}`, band, {
          answer: "Yes",
          choices: ["Yes", "No"],
          display: { ap: { kind: "authoredYes" }, promptText: splitPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band])) + (i >= 8 ? " No paper is lost in the cut." : ""), truth: true },
        })
      );
    }
  }

  const sumJudgePhr = {
    band1: [
      (nm, a, b, c, d, said) => `${nm} joins a ${a}-by-${b} piece and a ${c}-by-${d} piece (no overlap) and says they cover ${said} unit squares. Is ${nm} right?`,
      (nm, a, b, c, d, said) => `A ${a}-by-${b} patch plus a ${c}-by-${d} patch covers ${said} unit squares, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, a, b, c, d, said) => `${nm} totals a ${a} by ${b} rectangle and a ${c} by ${d} rectangle at ${said} square cm. Does the total hold?`,
      (nm, a, b, c, d, said) => `Check ${nm}'s combined area of ${said} square cm for ${a} by ${b} plus ${c} by ${d}. Right or not?`,
    ],
    band3: [
      (nm, a, b, c, d, said) => `${nm} certifies ${said} square m for the union of non-overlapping ${a} by ${b} and ${c} by ${d} rectangles. Valid?`,
      (nm, a, b, c, d, said) => `Audit the composite total: ${a} by ${b} plus ${c} by ${d}, recorded ${said} by ${nm}. Clean?`,
    ],
  };
  const sumJudgeData = {
    band1: [[2, 3, 2, 2, 10, true], [3, 3, 2, 2, 12, false], [2, 4, 2, 2, 12, true], [3, 4, 2, 2, 14, false], [2, 3, 2, 3, 12, true], [2, 4, 2, 3, 15, false], [3, 3, 2, 3, 15, true], [2, 2, 2, 2, 6, false], [2, 5, 2, 2, 14, true], [4, 3, 2, 2, 18, false], [2, 4, 3, 2, 14, true], [2, 5, 2, 3, 17, false], [3, 4, 2, 3, 18, true], [2, 3, 2, 2, 12, false], [3, 3, 2, 2, 13, true], [2, 4, 2, 2, 10, false], [2, 3, 2, 3, 11, false], [3, 4, 2, 2, 16, true]],
    band2: [[7, 4, 3, 2, 34, true], [8, 5, 4, 3, 56, false], [9, 3, 5, 2, 37, true], [10, 6, 4, 4, 80, false], [11, 4, 3, 3, 53, true], [12, 5, 5, 4, 84, false], [7, 6, 2, 2, 46, true], [8, 8, 4, 2, 76, false], [9, 7, 3, 4, 75, true], [10, 10, 5, 3, 120, false], [11, 6, 4, 5, 86, true], [12, 3, 6, 2, 52, false], [9, 9, 2, 5, 91, true], [7, 4, 3, 2, 36, false], [8, 5, 4, 3, 52, true], [9, 3, 5, 2, 35, false], [11, 4, 3, 3, 50, false], [10, 6, 4, 4, 76, true]],
    band3: [[12, 8, 6, 4, 120, true], [13, 6, 7, 3, 105, false], [14, 5, 8, 4, 102, true], [15, 4, 9, 5, 110, false], [12, 12, 6, 6, 180, true], [13, 9, 7, 5, 160, false], [14, 7, 8, 6, 146, true], [15, 8, 9, 4, 150, false], [12, 11, 5, 5, 157, true], [13, 13, 6, 3, 190, false], [14, 10, 7, 7, 189, true], [15, 15, 8, 5, 270, false], [14, 14, 9, 6, 250, true], [12, 8, 6, 4, 116, false], [13, 6, 7, 3, 99, true], [14, 5, 8, 4, 98, false], [12, 12, 6, 6, 176, false], [15, 4, 9, 5, 105, true]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    sumJudgeData[band].forEach(([a, b, c, d, said, ok], i) => {
      items.push(
        item("compositeFigures", "conceptual", `sumJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ap: { kind: "joinSaid", a, b, c, d, said }, promptText: sumJudgePhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), a, b, c, d, said), truth: ok },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* measureReasoning                                                    */
/* ================================================================== */

export function measureProcedural() {
  const items = [];
  let seed = 641;

  const whichPhr = {
    band1: [
      (task) => `To ${task}, do you need the trip AROUND the shape or the space INSIDE it? Pick one.`,
      (task) => `Which do you measure to ${task}: around the edge, or inside the shape?`,
    ],
    band2: [
      (task) => `To ${task}, which measure do you need: perimeter or area?`,
      (task) => `Which measurement fits the job of ${task}: perimeter or area?`,
    ],
    band3: [
      (task) => `Deciding how to ${task} calls for which measure: perimeter or area?`,
      (task) => `Select the measure required to ${task}: perimeter or area.`,
    ],
  };
  const CHOICES = { band1: ["around the edge", "inside the shape"], band2: ["perimeter", "area"], band3: ["perimeter", "area"] };
  const whichData = {
    band1: [["put tape all the way around a card", 0], ["color in a whole card", 1], ["walk the border of the rug", 0], ["cover the rug with paper", 1], ["string lights around a window", 0], ["fill a tray with tiles", 1], ["draw a line around a photo", 0], ["paint the whole photo mat", 1], ["ribbon the edge of a gift lid", 0], ["cover the lid in foil", 1], ["trace the outline of a book", 0], ["wrap the front of the book in paper", 1], ["put a border of dots on a page", 0]],
    band2: [["fence a garden", 0], ["sod a lawn", 1], ["frame a picture", 0], ["carpet a bedroom", 1], ["put trim around a door", 0], ["tile a kitchen floor", 1], ["edge a flower bed with bricks", 0], ["paint a wall", 1], ["hang a border strip around a bulletin board", 0], ["cover a table in cloth", 1], ["outline a court with chalk", 0], ["turf a soccer field", 1], ["put baseboard around a room", 0]],
    band3: [["install a railing around a deck", 0], ["seal a driveway surface", 1], ["string a banner around a stage", 0], ["lay flooring in a hall", 1], ["put curbing around a pond", 0], ["mulch an entire bed", 1], ["wrap caution tape around a site", 0], ["seed a whole pasture", 1], ["mount weather stripping around a window", 0], ["shingle a flat roof", 1], ["put piping around a cushion edge", 0], ["upholster a seat surface", 1], ["run a fence line around a paddock", 0]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    whichData[band].forEach(([task, idx], i) => {
      items.push(
        item("measureReasoning", "procedural", `whichMeasure_${band}`, band, {
          answer: CHOICES[band][idx],
          choices: [...CHOICES[band]],
          display: { ap: { kind: "authoredChoice" }, promptText: whichPhr[band][i % 2](task) },
        })
      );
    });
  }

  const unitPhr = {
    band1: [
      (which, noun) => `You measured the ${which === "area" ? "space inside" : "trip around"} a ${noun}. Is the answer counted in unit squares or in units? Pick one.`,
      (which, noun) => `Counting the ${which === "area" ? "inside" : "border"} of a ${noun} uses which count: unit squares or units?`,
    ],
    band2: [
      (which, noun) => `A ${noun}'s ${which} is measured in which unit: square cm or cm?`,
      (which, noun) => `Which unit labels the ${which} of a ${noun}: square cm or cm?`,
    ],
    band3: [
      (which, noun) => `Report the ${which} of a ${noun} in the correct unit: square m or m?`,
      (which, noun) => `The proper unit for a ${noun}'s ${which} is which: square m or m?`,
    ],
  };
  const unitNouns = {
    band1: ["card", "rug", "photo", "book cover", "tray", "mat", "flag", "poster", "tile patch", "game board", "quilt square", "napkin", "sticker sheet"],
    band2: ["garden bed", "picture frame", "bedroom floor", "bulletin board", "tabletop", "doormat", "window pane", "chalkboard", "welcome mat", "shelf top", "cutting board", "desk pad", "place mat"],
    band3: ["deck", "parking pad", "sports court", "stage floor", "hall carpet", "roof panel", "pasture", "patio", "driveway", "warehouse floor", "terrace", "plaza", "playground"],
  };
  const unitChoices = { band1: ["unit squares", "units"], band2: ["square cm", "cm"], band3: ["square m", "m"] };
  for (const band of ["band1", "band2", "band3"]) {
    unitNouns[band].forEach((noun, i) => {
      const which = i % 2 === 0 ? "area" : "perimeter";
      items.push(
        item("measureReasoning", "procedural", `unitPick_${band}`, band, {
          answer: unitChoices[band][which === "area" ? 0 : 1],
          choices: [...unitChoices[band]],
          display: { ap: { kind: "authoredChoice" }, promptText: unitPhr[band][Math.floor(i / 2) % 2](which, noun) },
        })
      );
    });
  }

  const labelPhr = {
    band1: [
      (w, h) => `A rectangle is ${w} units by ${h} units. Its area is ${w * h} of which count: unit squares or units? Pick one.`,
      (w, h) => `The border of a ${w}-by-${h} rectangle is ${2 * (w + h)} of which count: units or unit squares? Pick one.`,
    ],
    band2: [
      (w, h) => `A ${w} cm by ${h} cm rectangle has area ${w * h}. Which unit finishes that: square cm or cm?`,
      (w, h) => `A ${w} cm by ${h} cm rectangle has perimeter ${2 * (w + h)}. Which unit finishes that: cm or square cm?`,
    ],
    band3: [
      (w, h) => `The area of a ${w} m by ${h} m rectangle is ${w * h}, in which unit: square m or m?`,
      (w, h) => `The perimeter of a ${w} m by ${h} m rectangle is ${2 * (w + h)}, in which unit: m or square m?`,
    ],
  };
  const labelData = {
    band1: [[2, 3], [3, 4], [2, 5], [4, 4], [3, 3], [2, 4], [2, 6], [3, 6? 0 : 0], [4, 5? 0 : 0]].filter((r) => r[1]).concat([[3, 5? 0 : 0]].filter((r) => r[1])),
    band2: [],
    band3: [],
  };
  const labelLists = {
    band1: [[2, 3], [3, 4], [2, 5], [4, 4], [3, 3], [2, 4], [2, 6], [5, 2], [4, 3], [3, 2], [5, 3], [6, 2], [4, 2]],
    band2: [[7, 4], [8, 5], [9, 3], [10, 6], [11, 4], [12, 5], [7, 6], [8, 8], [9, 7], [10, 10], [11, 6], [12, 3], [9, 9]],
    band3: [[12, 8], [13, 6], [14, 5], [15, 4], [12, 12], [13, 9], [14, 7], [15, 8], [12, 11], [13, 13], [14, 10], [15, 15], [14, 14]],
  };
  const labelChoices = { band1: ["unit squares", "units"], band2: ["square cm", "cm"], band3: ["square m", "m"] };
  for (const band of ["band1", "band2", "band3"]) {
    labelLists[band].forEach(([w, h], i) => {
      const isArea = i % 2 === 0;
      items.push(
        item("measureReasoning", "procedural", `labelPick_${band}`, band, {
          answer: labelChoices[band][isArea ? 0 : 1],
          choices: [...labelChoices[band]],
          display: { ap: { kind: "authoredChoice" }, promptText: labelPhr[band][i % 2](w, h) },
        })
      );
    });
  }

  const bothPhr = {
    band1: [
      (w, h) => `For a ${w}-by-${h} rectangle, type the number of unit squares inside it.`,
      (w, h) => `For a ${w}-by-${h} rectangle, type the number of units around it.`,
    ],
    band2: [
      (w, h) => `A rectangle is ${w} cm by ${h} cm. Type its area in square cm only, no label.`,
      (w, h) => `A rectangle is ${w} cm by ${h} cm. Type its perimeter in cm only, no label.`,
    ],
    band3: [
      (w, h) => `Compute and type the area of a ${w} m by ${h} m rectangle (number only).`,
      (w, h) => `Compute and type the perimeter of a ${w} m by ${h} m rectangle (number only).`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    labelLists[band].forEach(([w, h], i) => {
      const isArea = i % 2 === 1;
      items.push(
        item("measureReasoning", "procedural", `bothMeasures_${band}`, band, {
          answer: isArea ? w * h : 2 * (w + h),
          answerType: "numberPad",
          display: { ap: isArea ? { kind: "areaOf", w, h } : { kind: "perimOf", w, h }, promptText: bothPhr[band][isArea ? 0 : 1](w, h) },
        })
      );
    });
  }

  return items;
}

export function measureConceptual() {
  const items = [];

  const purposePhr = {
    band1: [
      (nm, job) => `${nm} wants to ${job} and measures the space INSIDE the shape to do it. Is that the right measure?`,
      (nm, job) => `To ${job}, ${nm} counts the unit squares inside. Is ${nm} measuring the right thing?`,
    ],
    band2: [
      (nm, job) => `${nm} plans to ${job} and calculates the area. Is area the measure the job needs?`,
      (nm, job) => `For the task of ${job}, ${nm} works out the area. Is that the right measure?`,
    ],
    band3: [
      (nm, job) => `${nm} prepares to ${job} by computing the area. Does the job call for area?`,
      (nm, job) => `Area is what ${nm} computes before starting to ${job}. Is that the measure required?`,
    ],
  };
  const purposeData = {
    band1: [["put ribbon around a card", false], ["color a whole card", true], ["tape the edge of a photo", false], ["cover a tray with paper", true], ["outline a page with stars", false], ["fill a page with a drawing", true], ["string beads around a frame", false], ["paint a whole door", true], ["walk the border of a rug", false], ["tile the top of a table", true], ["put a fence of blocks around a mat", false], ["blanket a doll bed", true], ["chalk around a hopscotch court", false], ["cover a lid with glitter", true], ["lace around a bookmark", false], ["sticker a whole notebook cover", true], ["hem the edge of a napkin", false], ["frost the top of a sheet cake", true]],
    band2: [["fence a chicken run", false], ["sod the backyard", true], ["frame a poster", false], ["carpet a hallway", true], ["put trim around a mirror", false], ["paint a ceiling", true], ["edge a walkway with stones", false], ["mulch a whole flower bed", true], ["border a quilt", false], ["cover a corkboard in fabric", true], ["gutter the roof edge", false], ["turf a play area", true], ["put tape around a box lid seam", false], ["wrap the top of a bench in vinyl", true], ["chalk the boundary of a field", false], ["resurface a patio", true], ["ring a fire pit with bricks", false], ["seed a lawn", true]],
    band3: [["rail a balcony", false], ["seal a parking lot", true], ["cable around a tower base", false], ["floor a gymnasium", true], ["curb a roundabout", false], ["asphalt a basketball court", true], ["tape off a construction boundary", false], ["insulate an attic floor", true], ["pipe the edge of a banner", false], ["laminate a countertop surface", true], ["fence a vineyard row", false], ["shingle a shed roof", true], ["weld a rim around a tank lid", false], ["paint a mural wall", true], ["trim a stage apron edge", false], ["felt a pool table surface", true], ["wire the border of a sign", false], ["tar a flat roof", true]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    purposeData[band].forEach(([job, ok], i) => {
      items.push(
        item("measureReasoning", "conceptual", `purposeJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ap: { kind: "authored" }, promptText: purposePhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), job), truth: ok },
        })
      );
    });
  }

  const unitJudgePhr = {
    band1: [
      (nm, w, h) => `${nm} reports the area of a ${w}-by-${h} rectangle as "${w * h} units" instead of unit squares. Is the label right?`,
      (nm, w, h) => `${nm} labels the border of a ${w}-by-${h} rectangle "${2 * (w + h)} unit squares". Is the label right?`,
    ],
    band2: [
      (nm, w, h) => `${nm} writes the area of a ${w} cm by ${h} cm rectangle as ${w * h} cm. Is the unit right?`,
      (nm, w, h) => `${nm} writes the perimeter of a ${w} cm by ${h} cm rectangle as ${2 * (w + h)} square cm. Is the unit right?`,
    ],
    band3: [
      (nm, w, h) => `${nm} states a ${w} m by ${h} m rectangle's area as ${w * h} m. Is the unit correct?`,
      (nm, w, h) => `${nm} states a ${w} m by ${h} m rectangle's perimeter as ${2 * (w + h)} square m. Is the unit correct?`,
    ],
  };
  const unitJudgeData = {
    band1: [[2, 3], [3, 4], [2, 5], [4, 4], [3, 3], [2, 4], [2, 6], [5, 2], [4, 3], [3, 2], [5, 3], [6, 2], [4, 2], [2, 3], [3, 4], [2, 5]],
    band2: [[7, 4], [8, 5], [9, 3], [10, 6], [11, 4], [12, 5], [7, 6], [8, 8], [9, 7], [10, 10], [11, 6], [12, 3], [9, 9], [7, 4], [8, 5], [9, 3]],
    band3: [[12, 8], [13, 6], [14, 5], [15, 4], [12, 12], [13, 9], [14, 7], [15, 8], [12, 11], [13, 13], [14, 10], [15, 15], [14, 14], [12, 8], [13, 6], [14, 5]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    unitJudgeData[band].forEach(([w, h], i) => {
      items.push(
        item("measureReasoning", "conceptual", `unitJudge_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { ap: { kind: "trapNo" }, promptText: unitJudgePhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), w, h), truth: false },
        })
      );
    });
  }

  const samePerimPhr = {
    band1: [
      (nm, w, h, s) => `${nm} says a ${w}-by-${h} rectangle and a ${s}-by-${s} square can have the same border length but cover different numbers of unit squares. Is ${nm} right?`,
      (nm, w, h, s) => `Same trip around, different space inside: ${nm} claims that happens for a ${w}-by-${h} rectangle and a ${s}-by-${s} square. Is that right?`,
    ],
    band2: [
      (nm, w, h, s) => `${nm} claims a ${w} by ${h} rectangle and a ${s} by ${s} square share a perimeter yet differ in area. Does the claim hold here?`,
      (nm, w, h, s) => `Equal perimeter, unequal area — ${nm} offers the ${w} by ${h} rectangle and the ${s} by ${s} square. Is ${nm} right?`,
    ],
    band3: [
      (nm, w, h, s) => `${nm} presents the ${w} m by ${h} m rectangle and the ${s} m square as equal-perimeter, unequal-area shapes. Is the presentation sound?`,
      (nm, w, h, s) => `Same fence, different field: ${nm} cites the ${w} by ${h} rectangle versus the ${s} by ${s} square. Correct example?`,
    ],
  };
  const samePerimData = {
    band1: [[2, 4, 3, true], [1, 5, 3, true], [2, 6, 4, true], [3, 5, 4, true], [1, 3, 2, true], [2, 4, 4, false], [1, 5, 2, false], [2, 6, 3, false], [3, 5, 5, false], [1, 3, 3, false], [2, 4, 3, true], [2, 6, 4, true], [1, 5, 3, true], [3, 5, 4, true], [1, 3, 2, true], [2, 4, 2, false]],
    band2: [[4, 8, 6, true], [3, 9, 6, true], [5, 7, 6, true], [4, 10, 7, true], [6, 8, 7, true], [4, 8, 5, false], [3, 9, 7, false], [5, 7, 5, false], [4, 10, 6, false], [6, 8, 8, false], [4, 8, 6, true], [5, 7, 6, true], [3, 9, 6, true], [4, 10, 7, true], [6, 8, 7, true], [4, 8, 7, false]],
    band3: [[8, 12, 10, true], [6, 14, 10, true], [9, 11, 10, true], [7, 13, 10, true], [10, 14, 12, true], [8, 12, 9, false], [6, 14, 11, false], [9, 11, 12, false], [7, 13, 9, false], [10, 14, 11, false], [8, 12, 10, true], [9, 11, 10, true], [6, 14, 10, true], [7, 13, 10, true], [10, 14, 12, true], [8, 12, 11, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    samePerimData[band].forEach(([w, h, s, ok], i) => {
      items.push(
        item("measureReasoning", "conceptual", `samePerimJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ap: { kind: "samePerimSaid", w, h, s }, promptText: samePerimPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), w, h, s), truth: ok },
        })
      );
    });
  }

  return items;
}
