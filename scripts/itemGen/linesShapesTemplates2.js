/* linesShapes bank part 2 — shapeClassification and lineFigures cells.
 * See linesShapesTemplates.js for conventions and SHAPE_TABLE.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";
import { LEVELS, item, nameAt, SHAPE_TABLE, byKey, byName } from "./linesShapesTemplates.js";

/* ================================================================== */
/* shapeClassification                                                 */
/* ================================================================== */

// Deterministic select payloads: options are [{shape, rotate, value}], the
// answer is the INDEX of the correct option. Option orders are fixed data
// (no runtime shuffle) so every item is reproducible.
const selectItem = (family, structureType, band, promptText, optionKeys, correctIdx, rotates, predicate) =>
  item("shapeClassification", family, structureType, band, {
    answer: correctIdx,
    answerType: "shapeFigure",
    display: {
      shapeMode: "select",
      options: optionKeys.map((key, i) => ({ shape: key, rotate: rotates[i % rotates.length], value: i })),
      shapeC: { kind: "select", predicate, optionKeys, correctIdx },
      promptText,
    },
  });

export function classificationProcedural() {
  const items = [];

  // "Which one is a X?" — safe prototype names only (a square IS a rhombus,
  // so rhombus/parallelogram never appear as select targets).
  const WHICH = {
    band1: [
      ["triangle", ["square", "triangleEquilateral", "pentagon", "rectangle"], 1],
      ["square", ["square", "triangleEquilateral", "pentagon", "rectangle"], 0],
      ["pentagon", ["rectangle", "pentagon", "square", "triangleEquilateral"], 1],
      ["hexagon", ["hexagon", "pentagon", "square", "triangleEquilateral"], 0],
      ["triangle", ["pentagon", "square", "triangleRight", "rectangle"], 2],
      ["square", ["rectangle", "trapezoid", "square", "pentagon"], 2],
      ["pentagon", ["hexagon", "square", "triangleEquilateral", "pentagon"], 3],
      ["hexagon", ["pentagon", "hexagon", "rectangle", "square"], 1],
      ["triangle", ["square", "pentagon", "rectangle", "triangleScalene"], 3],
      ["square", ["square", "rhombus", "trapezoid", "pentagon"], 0],
      ["pentagon", ["pentagon", "hexagon", "triangleEquilateral", "trapezoid"], 0],
      ["hexagon", ["octagon", "square", "hexagon", "pentagon"], 2],
    ],
    band2: [
      ["trapezoid", ["square", "trapezoid", "rectangle", "triangleEquilateral"], 1],
      ["hexagon", ["pentagon", "octagon", "hexagon", "square"], 2],
      ["octagon", ["octagon", "hexagon", "pentagon", "square"], 0],
      ["triangle", ["rhombus", "square", "pentagon", "triangleRight"], 3],
      ["square", ["parallelogram", "square", "trapezoid", "pentagon"], 1],
      ["pentagon", ["hexagon", "octagon", "pentagon", "rectangle"], 2],
      ["trapezoid", ["trapezoid", "parallelogram", "square", "hexagon"], 0],
      ["hexagon", ["hexagon", "octagon", "trapezoid", "pentagon"], 0],
      ["octagon", ["hexagon", "pentagon", "square", "octagon"], 3],
      ["triangle", ["square", "triangleScalene", "rectangle", "pentagon"], 1],
      ["square", ["rhombus", "trapezoid", "pentagon", "square"], 3],
      ["pentagon", ["pentagon", "square", "hexagon", "octagon"], 0],
    ],
    band3: [
      ["octagon", ["hexagon", "octagon", "pentagon", "trapezoid"], 1],
      ["hexagon", ["octagon", "pentagon", "hexagon", "parallelogram"], 2],
      ["trapezoid", ["parallelogram", "rhombus", "trapezoid", "square"], 2],
      ["pentagon", ["hexagon", "pentagon", "octagon", "triangleScalene"], 1],
      ["triangle", ["triangleScalene", "trapezoid", "square", "hexagon"], 0],
      ["square", ["square", "parallelogram", "rhombus", "trapezoid"], 0],
      ["octagon", ["pentagon", "hexagon", "trapezoid", "octagon"], 3],
      ["hexagon", ["hexagon", "trapezoid", "octagon", "pentagon"], 0],
      ["trapezoid", ["rhombus", "trapezoid", "parallelogram", "rectangle"], 1],
      ["pentagon", ["octagon", "hexagon", "pentagon", "square"], 2],
      ["triangle", ["square", "pentagon", "hexagon", "triangleRight"], 3],
      ["square", ["trapezoid", "square", "parallelogram", "rhombus"], 1],
    ],
  };
  const whichPhr = {
    band1: (n, i) => `Round ${i + 1}: which one is a ${n}?`,
    band2: (n, i) => `Round ${i + 1}: the shapes are tilted. Which one is a ${n}?`,
    band3: (n, i) => `Round ${i + 1}: even turned around, one of these is a ${n}. Which one?`,
  };
  const rotates = { band1: [0, 15], band2: [15, 30, 45], band3: [30, 45, 60] };
  for (const band of ["band1", "band2", "band3"]) {
    WHICH[band].forEach(([name, keys, idx], i) => {
      items.push(selectItem("procedural", `whichIs_${band}`, band, whichPhr[band](name, i), keys, idx, rotates[band], { type: "isName", name }));
    });
  }

  // "Which one is NOT a ...?" — odd side-count out.
  const NOT = {
    band1: [
      ["triangle", ["triangleEquilateral", "triangleRight", "square", "triangleScalene"], 2],
      ["triangle", ["triangleRight", "pentagon", "triangleEquilateral", "triangleScalene"], 1],
      ["four-sided shape", ["square", "rectangle", "triangleEquilateral", "trapezoid"], 2],
      ["four-sided shape", ["rhombus", "rectangle", "square", "pentagon"], 3],
      ["triangle", ["triangleScalene", "triangleEquilateral", "hexagon", "triangleRight"], 2],
      ["four-sided shape", ["parallelogram", "hexagon", "trapezoid", "square"], 1],
      ["triangle", ["rectangle", "triangleRight", "triangleScalene", "triangleEquilateral"], 0],
      ["four-sided shape", ["square", "trapezoid", "rhombus", "triangleRight"], 3],
      ["triangle", ["triangleEquilateral", "triangleScalene", "triangleRight", "pentagon"], 3],
      ["four-sided shape", ["octagon", "square", "parallelogram", "rectangle"], 0],
      ["triangle", ["square", "triangleScalene", "triangleEquilateral", "triangleRight"], 0],
      ["four-sided shape", ["rectangle", "rhombus", "pentagon", "trapezoid"], 2],
    ],
    band2: [
      ["four-sided shape", ["rhombus", "parallelogram", "hexagon", "trapezoid"], 2],
      ["triangle", ["triangleScalene", "octagon", "triangleEquilateral", "triangleRight"], 1],
      ["four-sided shape", ["square", "octagon", "rhombus", "parallelogram"], 1],
      ["six-sided shape", ["hexagon", "square", "hexagon", "hexagon"], 1],
      ["four-sided shape", ["trapezoid", "rectangle", "pentagon", "rhombus"], 2],
      ["triangle", ["pentagon", "triangleRight", "triangleScalene", "triangleEquilateral"], 0],
      ["four-sided shape", ["parallelogram", "square", "trapezoid", "hexagon"], 3],
      ["four-sided shape", ["rhombus", "trapezoid", "octagon", "square"], 2],
      ["triangle", ["triangleEquilateral", "triangleRight", "hexagon", "triangleScalene"], 2],
      ["four-sided shape", ["pentagon", "parallelogram", "rectangle", "trapezoid"], 0],
      ["four-sided shape", ["square", "rhombus", "parallelogram", "triangleScalene"], 3],
      ["triangle", ["triangleRight", "triangleScalene", "square", "triangleEquilateral"], 2],
    ],
    band3: [
      ["quadrilateral", ["rhombus", "trapezoid", "hexagon", "parallelogram"], 2],
      ["quadrilateral", ["square", "octagon", "rectangle", "rhombus"], 1],
      ["triangle", ["triangleScalene", "triangleEquilateral", "pentagon", "triangleRight"], 2],
      ["quadrilateral", ["parallelogram", "trapezoid", "square", "pentagon"], 3],
      ["quadrilateral", ["rectangle", "hexagon", "rhombus", "trapezoid"], 1],
      ["triangle", ["octagon", "triangleRight", "triangleEquilateral", "triangleScalene"], 0],
      ["quadrilateral", ["square", "rhombus", "octagon", "parallelogram"], 2],
      ["quadrilateral", ["trapezoid", "pentagon", "parallelogram", "rectangle"], 1],
      ["triangle", ["triangleEquilateral", "triangleScalene", "triangleRight", "hexagon"], 3],
      ["quadrilateral", ["rhombus", "square", "trapezoid", "octagon"], 3],
      ["quadrilateral", ["hexagon", "parallelogram", "rectangle", "square"], 0],
      ["triangle", ["triangleRight", "pentagon", "triangleScalene", "triangleEquilateral"], 1],
    ],
  };
  const notPhr = {
    band1: (n, i) => `Round ${i + 1}: which one is NOT a ${n}?`,
    band2: (n, i) => `Round ${i + 1}: three of these are ${n}s. Which one is NOT?`,
    band3: (n, i) => `Round ${i + 1}: find the odd one out — which is NOT a ${n}?`,
  };
  for (const band of ["band1", "band2", "band3"]) {
    NOT[band].forEach(([label, keys, idx], i) => {
      const sides = label === "triangle" ? 3 : label === "six-sided shape" ? 6 : 4;
      items.push(selectItem("procedural", `notA_${band}`, band, notPhr[band](label, i), keys, idx, rotates[band], { type: "notSides", sides }));
    });
  }

  // Named sorting drills (typed count of matching shapes).
  const sortPhr = [
    (list, prop) => `From this list — ${list} — how many shapes have ${prop}?`,
    (list, prop) => `Count the shapes with ${prop} in this list: ${list}. How many shapes match?`,
  ];
  const sorts = {
    band1: [
      [["triangle", "square", "pentagon"], "exactly 4 sides", 1],
      [["square", "rectangle", "triangle"], "exactly 4 sides", 2],
      [["pentagon", "hexagon", "triangle"], "exactly 5 sides", 1],
      [["square", "triangle", "rectangle"], "exactly 3 sides", 1],
      [["triangle", "pentagon", "square"], "exactly 3 sides", 1],
      [["hexagon", "square", "rectangle"], "exactly 6 sides", 1],
      [["square", "rectangle", "trapezoid"], "exactly 4 sides", 3],
      [["triangle", "hexagon", "pentagon"], "exactly 4 sides", 0],
      [["square", "square", "triangle"], "exactly 4 sides", 2],
      [["pentagon", "pentagon", "hexagon"], "exactly 5 sides", 2],
      [["triangle", "triangle", "square"], "exactly 3 sides", 2],
      [["rectangle", "hexagon", "triangle"], "exactly 4 sides", 1],
      [["hexagon", "hexagon", "square"], "exactly 6 sides", 2],
      [["pentagon", "square", "square"], "exactly 4 sides", 2],
    ],
    band2: [
      [["rhombus", "trapezoid", "hexagon", "square"], "exactly 4 sides", 3],
      [["parallelogram", "pentagon", "rectangle", "trapezoid"], "exactly 4 sides", 3],
      [["hexagon", "heptagon", "square", "octagon"], "more than 5 sides", 3],
      [["rhombus", "square", "rectangle", "trapezoid"], "at least one right angle", 2],
      [["parallelogram", "rhombus", "square", "trapezoid"], "2 pairs of parallel sides", 3],
      [["trapezoid", "hexagon", "rectangle", "triangle"], "exactly 1 pair of parallel sides", 1],
      [["square", "rectangle", "rhombus", "parallelogram"], "4 equal sides", 2],
      [["pentagon", "hexagon", "heptagon", "octagon"], "an odd number of sides", 2],
      [["trapezoid", "trapezoid", "rhombus", "square"], "exactly 1 pair of parallel sides", 2],
      [["hexagon", "octagon", "square", "rectangle"], "more than 4 sides", 2],
      [["rhombus", "rhombus", "square", "rectangle"], "all sides equal", 3],
      [["right triangle", "square", "rectangle", "rhombus"], "at least one right angle", 3],
      [["heptagon", "pentagon", "hexagon", "octagon"], "an even number of sides", 2],
      [["parallelogram", "trapezoid", "square", "pentagon"], "exactly 4 vertices", 3],
    ],
    band3: [
      [["octagon", "nonagon", "decagon", "dodecagon"], "an even number of sides", 3],
      [["square", "rhombus", "parallelogram", "trapezoid"], "2 pairs of parallel sides", 3],
      [["nonagon", "decagon", "hexagon", "heptagon"], "more than 8 sides", 2],
      [["square", "rectangle", "rhombus", "scalene triangle"], "4 vertices", 3],
      [["octagon", "hexagon", "square", "decagon"], "at least 4 pairs of parallel sides", 2],
      [["dodecagon", "decagon", "octagon", "nonagon"], "more than 9 sides", 2],
      [["square", "rhombus", "rectangle", "parallelogram"], "all sides equal", 2],
      [["heptagon", "nonagon", "pentagon", "hexagon"], "an odd number of sides", 3],
      [["decagon", "dodecagon", "octagon", "nonagon"], "exactly 10 sides", 1],
      [["scalene triangle", "right triangle", "square", "rectangle"], "exactly 3 sides", 2],
      [["dodecagon", "dodecagon", "decagon", "octagon"], "exactly 12 sides", 2],
      [["square", "rectangle", "right triangle", "trapezoid"], "4 right angles", 2],
      [["nonagon", "heptagon", "decagon", "dodecagon"], "an even number of sides", 2],
      [["rhombus", "square", "trapezoid", "parallelogram"], "2 pairs of parallel sides", 3],
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    sorts[band].forEach(([list, prop, count], i) => {
      for (const p of [0, 1]) {
        items.push(
          item("shapeClassification", "procedural", `sortCount_${band}`, band, {
            answer: count,
            answerType: "numberPad",
            display: { shapeC: { kind: "authoredCount" }, promptText: sortPhr[p](list.join(", "), prop) },
          })
        );
      }
    });
  }

  return items;
}

export function classificationConceptual() {
  const items = [];
  let seed = 301;

  // Hierarchy judged (always/sometimes framing kept simple: every/some).
  const hierPhr = [
    (nm, claim) => `${nm} argues: ${claim} Is ${nm} right?`,
    (nm, claim) => `In the shape debate, ${nm} says: ${claim} Is that right?`,
  ];
  const hier = {
    band1: [["Every square has 4 sides.", true], ["Every triangle has 3 sides.", true], ["Every rectangle has 3 sides.", false], ["Every pentagon has 5 corners.", true], ["Every hexagon has 4 sides.", false], ["Every square has equal sides.", true], ["Every triangle has a square corner.", false], ["Every rectangle has 4 corners.", true], ["Every pentagon has 6 sides.", false], ["Every hexagon has 6 corners.", true], ["Every square has 3 corners.", false], ["Every triangle has 3 corners.", true], ["Every rectangle has equal sides all around.", false], ["Every pentagon has 5 sides.", true], ["Every hexagon has 6 sides.", true], ["Every square has 5 sides.", false]],
    band2: [["Every square is also a rectangle.", true], ["Every rectangle is also a square.", false], ["Every rhombus has 4 equal sides.", true], ["Every trapezoid has 2 parallel pairs.", false], ["Every parallelogram has 2 parallel pairs.", true], ["Every rhombus is also a square.", false], ["Every square is also a rhombus.", true], ["Every trapezoid is also a parallelogram.", false], ["Every right triangle has exactly 1 right angle.", true], ["Every triangle is a right triangle.", false], ["Every rectangle is a parallelogram.", true], ["Every parallelogram is a rectangle.", false], ["Every hexagon has more sides than every pentagon.", true], ["Every heptagon has 6 sides.", false], ["Every scalene triangle has unequal sides.", true], ["Every quadrilateral is a trapezoid.", false]],
    band3: [["Every square is a rhombus AND a rectangle.", true], ["Every rhombus with right angles is a square.", true], ["Every parallelogram with equal sides is a rhombus.", true], ["Every trapezoid can be called a parallelogram.", false], ["Every rectangle with equal sides is a square.", true], ["Every quadrilateral is a parallelogram.", false], ["Every regular polygon has equal sides.", true], ["Every polygon with 10 sides is a decagon.", true], ["Every decagon has 12 sides.", false], ["Every dodecagon has more sides than every decagon.", true], ["Every nonagon has more sides than every decagon.", false], ["Every octagon has twice as many sides as every square.", true], ["Every hexagon has twice as many sides as every triangle.", true], ["Every pentagon has twice as many sides as every square.", false], ["Every scalene triangle is still a triangle.", true], ["Every right triangle has 2 right angles.", false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    hier[band].forEach(([claim, ok], i) => {
      items.push(
        item("shapeClassification", "conceptual", `hierJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { shapeC: { kind: "authored" }, promptText: hierPhr[i % 2](nameAt(i * 3 + 1 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), claim), truth: ok },
        })
      );
    });
  }

  // Guess-my-rule (choice).
  const rulePhr = [
    (nm, members, outsider) => `${nm}'s sorting circle holds ${members}, but ${outsider} stays out. What is the rule?`,
    (nm, members, outsider) => `Inside ${nm}'s circle: ${members}. Outside: ${outsider}. Which rule fits?`,
  ];
  const rules = {
    band1: [
      ["a triangle and a pentagon", "a square", "an odd number of sides", ["4 sides exactly", "all right angles", "curved sides"]],
      ["a square and a rectangle", "a triangle", "exactly 4 sides", ["exactly 3 sides", "5 corners", "curved sides"]],
      ["a square and a rhombus", "a rectangle", "all sides equal", ["no equal sides", "5 sides", "curved sides"]],
      ["a triangle and a right triangle", "a hexagon", "exactly 3 sides", ["exactly 6 sides", "4 corners", "all right angles"]],
      ["a pentagon and a hexagon", "a triangle", "more than 4 sides", ["fewer than 4 sides", "exactly 4 sides", "right angles only"]],
      ["a square and a rectangle", "a trapezoid", "4 right angles", ["no right angles", "3 sides", "curved sides"]],
      ["a hexagon and a pentagon", "a square", "more than 4 corners", ["exactly 4 corners", "3 corners", "no corners"]],
      ["a triangle and a square", "a hexagon", "fewer than 5 sides", ["more than 5 sides", "exactly 6 sides", "no sides"]],
    ],
    band2: [
      ["a rhombus and a square", "a rectangle", "all sides equal", ["no parallel sides", "exactly 1 right angle", "5 sides"]],
      ["a trapezoid and a parallelogram", "a pentagon", "exactly 4 sides", ["exactly 5 sides", "all right angles", "no straight sides"]],
      ["a parallelogram and a rectangle", "a trapezoid", "2 pairs of parallel sides", ["exactly 1 parallel pair", "no parallel sides", "5 corners"]],
      ["a square and a rectangle", "a rhombus", "4 right angles", ["0 right angles", "3 right angles", "curved sides"]],
      ["a hexagon and an octagon", "a heptagon", "an even number of sides", ["an odd number of sides", "fewer than 5 sides", "all right angles"]],
      ["a right triangle and a rectangle", "an equilateral triangle", "at least one right angle", ["no right angles", "equal sides", "6 sides"]],
      ["a pentagon and a heptagon", "a hexagon", "an odd number of sides", ["an even number of sides", "4 sides", "parallel sides"]],
      ["a scalene triangle and a parallelogram", "a square", "no line of symmetry", ["4 lines of symmetry", "equal sides", "right angles"]],
    ],
    band3: [
      ["a square, a rhombus, and a parallelogram", "a trapezoid", "2 pairs of parallel sides", ["exactly 1 parallel pair", "no parallel sides", "3 sides"]],
      ["an octagon, a decagon, and a dodecagon", "a nonagon", "an even number of sides", ["an odd number of sides", "fewer than 8 sides", "equal angles"]],
      ["a square and a rhombus", "a parallelogram", "all 4 sides equal", ["no equal sides", "1 right angle", "5 vertices"]],
      ["a nonagon and a heptagon", "an octagon", "an odd number of sides", ["an even number of sides", "10 sides", "right angles"]],
      ["a square, a rectangle, and a right triangle", "a rhombus", "at least one right angle", ["no right angles", "all sides equal", "curved sides"]],
      ["a decagon and a dodecagon", "an octagon", "at least 10 sides", ["fewer than 9 sides", "exactly 8 sides", "no vertices"]],
      ["an equilateral triangle, a square, and a pentagon", "a scalene triangle", "at least one line of symmetry", ["no lines of symmetry", "10 sides", "1 parallel pair"]],
      ["a trapezoid and a parallelogram", "a pentagon", "exactly 4 vertices", ["exactly 5 vertices", "3 vertices", "no vertices"]],
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    rules[band].forEach(([members, outsider, good, wrong], i) => {
      for (const p of [0, 1]) {
        items.push(
          item("shapeClassification", "conceptual", `guessRule_${band}`, band, {
            answer: good,
            choices: shuffled([good, ...wrong], (seed += 1)),
            display: { shapeC: { kind: "authoredChoice" }, promptText: rulePhr[p](nameAt(i * 3 + p * 5 + 2 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), members, outsider) },
          })
        );
      }
    });
  }

  // Both-names judged ("can it be called both?").
  const bothPhr = [
    (nm, a, b, claim) => `${nm} wonders if one shape can be a ${a} AND a ${b} at the same time. ${nm} says yes. Is ${nm} right?`,
    (nm, a, b, claim) => `Can a single shape be both a ${a} and a ${b}? ${nm} answers yes. Is that right?`,
  ];
  const both = {
    band1: [["square", "four-sided shape", true], ["triangle", "four-sided shape", false], ["rectangle", "four-sided shape", true], ["pentagon", "triangle", false], ["square", "rectangle", true], ["hexagon", "pentagon", false], ["triangle", "three-sided shape", true], ["square", "triangle", false], ["rectangle", "square", true], ["pentagon", "five-sided shape", true], ["hexagon", "six-sided shape", true], ["triangle", "six-sided shape", false], ["square", "five-sided shape", false], ["rectangle", "three-sided shape", false], ["pentagon", "four-sided shape", false], ["hexagon", "four-sided shape", false], ["square", "shape with equal sides", true], ["rectangle", "shape with right angles", true]],
    band2: [["square", "rhombus", true], ["rectangle", "rhombus", false], ["square", "rectangle", true], ["trapezoid", "parallelogram", false], ["rhombus", "parallelogram", true], ["rectangle", "parallelogram", true], ["trapezoid", "rectangle", false], ["square", "parallelogram", true], ["rhombus", "trapezoid", false], ["parallelogram", "quadrilateral", true], ["trapezoid", "quadrilateral", true], ["hexagon", "quadrilateral", false], ["right triangle", "triangle", true], ["scalene triangle", "quadrilateral", false], ["square", "quadrilateral", true], ["heptagon", "hexagon", false], ["rectangle", "quadrilateral", true], ["rhombus", "quadrilateral", true]],
    band3: [["square", "regular polygon", true], ["rectangle", "regular polygon", false], ["equilateral triangle", "regular polygon", true], ["scalene triangle", "regular polygon", false], ["square", "rhombus with right angles", true], ["parallelogram", "trapezoid", false], ["rhombus", "parallelogram with equal sides", true], ["dodecagon", "decagon", false], ["square", "parallelogram", true], ["kite shape", "parallelogram", false], ["octagon", "polygon", true], ["decagon", "polygon", true], ["nonagon", "quadrilateral", false], ["right triangle", "polygon", true], ["scalene triangle", "triangle", true], ["dodecagon", "polygon with 12 sides", true], ["decagon", "polygon with 12 sides", false], ["hexagon", "polygon with an odd side count", false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    both[band].forEach(([a, b, ok], i) => {
      items.push(
        item("shapeClassification", "conceptual", `bothNames_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { shapeC: { kind: "authored" }, promptText: bothPhr[i % 2](nameAt(i * 3 + 3 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), a, b, ok), truth: ok },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* lineFigures                                                         */
/* ================================================================== */

export function lineFiguresProcedural() {
  const items = [];

  // Endpoint-count drills (line 0, ray 1, segment 2).
  const endPhr = [
    (f) => `How many endpoints does a ${f} have?`,
    (f) => `A ${f} has ? endpoints`,
  ];
  const ENDPOINTS = { "line segment": 2, ray: 1, line: 0 };
  const endBands = { band1: ["line segment", "ray", "line"], band2: ["line segment", "ray", "line"], band3: ["line segment", "ray", "line"] };
  const endTag = { band1: "", band2: " Think before typing.", band3: " Recall the exact definition." };
  for (const band of ["band1", "band2", "band3"]) {
    endBands[band].forEach((f) => {
      for (const p of [0, 1]) {
        items.push(
          item("lineFigures", "procedural", `endpoints_${band}`, band, {
            answer: ENDPOINTS[f],
            answerType: "numberPad",
            display: { shapeC: { kind: "endpoints", figure: f, n: ENDPOINTS[f] }, promptText: endPhr[p](f) + endTag[band] },
          })
        );
      }
    });
  }
  // Straight-side counts for letter-like paths (authored counts).
  const pathPhr = [
    (desc) => `${desc} How many straight parts does the path use?`,
    (desc) => `${desc} Count the straight parts. How many straight parts are there?`,
  ];
  const paths = {
    band1: [
      ["A path goes straight, turns once, and goes straight again.", 2],
      ["A zigzag path turns twice.", 3],
      ["A path shaped like a capital L.", 2],
      ["A path shaped like a capital Z.", 3],
      ["A path shaped like a capital N.", 3],
      ["A path shaped like a capital W.", 4],
      ["A path shaped like a capital M.", 4],
      ["A path shaped like a capital V.", 2],
      ["A square path all the way around.", 4],
      ["A triangle path all the way around.", 3],
      ["A path shaped like a capital E.", 4],
      ["A path shaped like a capital F.", 3],
    ],
    band2: [
      ["A pentagon path all the way around.", 5],
      ["A hexagon path all the way around.", 6],
      ["A path that zigzags with four turns.", 5],
      ["Two separate capital L paths.", 4],
      ["A capital Z path plus one extra straight stroke.", 4],
      ["A path shaped like a capital A (with its crossbar).", 3],
      ["A path shaped like a capital H.", 3],
      ["A path shaped like a capital K.", 3],
      ["An octagon path all the way around.", 8],
      ["Two triangle paths side by side.", 6],
      ["A path shaped like a capital X.", 2],
      ["A square path plus its two diagonals.", 6],
      ["A rectangle path all the way around.", 4],
      ["A path shaped like a capital Y.", 3],
      ["Two capital V paths.", 4],
      ["A capital T path plus one extra stroke.", 3],
      ["A trapezoid path all the way around.", 4],
    ],
    band3: [
      ["A decagon path all the way around.", 10],
      ["A dodecagon path all the way around.", 12],
      ["Two hexagon paths end to end.", 12],
      ["A nonagon path all the way around.", 9],
      ["Three square paths in a row.", 12],
      ["A pentagon path plus all five diagonals.", 10],
      ["Two octagon paths.", 16],
      ["A heptagon path all the way around.", 7],
      ["A square path plus a triangle path.", 7],
      ["Two pentagon paths.", 10],
      ["A hexagon path plus a square path.", 10],
      ["A zigzag with nine turns.", 10],
      ["A dodecagon path plus a triangle path.", 15],
      ["Two nonagon paths.", 18],
      ["An octagon path plus a hexagon path.", 14],
      ["Three triangle paths.", 9],
      ["A decagon path plus a pentagon path.", 15],
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    paths[band].forEach(([desc, n], i) => {
      for (const p of [0, 1]) {
        if (band === "band1" && i >= 9 && p === 1) return;
        items.push(
          item("lineFigures", "procedural", `pathParts_${band}`, band, {
            answer: n,
            answerType: "numberPad",
            display: { shapeC: { kind: "authoredCount" }, promptText: pathPhr[p](desc) },
          })
        );
      }
    });
  }

  // Vocabulary picks (which figure ...).
  const vocabPhr = [
    (q) => q,
    (q) => `Think about the definitions. ${q}`,
  ];
  const vocab = {
    band2: [
      ["Which figure goes on forever in BOTH directions?", "a line", ["a ray", "a line segment", "a point"]],
      ["Which figure has a start point but no end?", "a ray", ["a line", "a line segment", "a point"]],
      ["Which figure has two endpoints?", "a line segment", ["a line", "a ray", "a point"]],
      ["Which figure marks one exact spot?", "a point", ["a line", "a ray", "a line segment"]],
      ["Which figure is part of a line with two endpoints?", "a line segment", ["a ray", "a line", "a point"]],
      ["Which figure goes on forever in exactly ONE direction?", "a ray", ["a line segment", "a line", "a point"]],
      ["Which figure never ends on either side?", "a line", ["a line segment", "a point", "a ray"]],
      ["Which figure is the shortest path between two points?", "a line segment", ["a ray", "a line", "a circle"]],
    ],
    band3: [
      ["Which lines never meet, no matter how far they run?", "parallel lines", ["perpendicular lines", "intersecting lines", "rays"]],
      ["Which lines cross at a square corner?", "perpendicular lines", ["parallel lines", "rays", "line segments"]],
      ["Which lines cross at exactly one point, at any angle?", "intersecting lines", ["parallel lines", "points", "segments"]],
      ["Which word names lines that stay the same distance apart forever?", "parallel lines", ["perpendicular lines", "intersecting rays", "endpoints"]],
      ["Two streets meet at a perfect square corner. What are they like?", "perpendicular lines", ["parallel lines", "rays", "points"]],
      ["Train tracks that never touch are like which figure pair?", "parallel lines", ["perpendicular lines", "intersecting lines", "line segments"]],
      ["A plus sign shows which kind of line pair?", "perpendicular lines", ["parallel lines", "rays", "points"]],
      ["Scissors opened part way show which kind of line pair?", "intersecting lines", ["parallel lines", "perpendicular rays... no", "points"]],
    ],
  };
  vocab.band3[7][2] = ["parallel lines", "curved lines", "points"];
  for (const band of ["band2", "band3"]) {
    vocab[band].forEach(([q, good, wrong], i) => {
      for (const p of [0, 1]) {
        items.push(
          item("lineFigures", "procedural", `vocabPick_${band}`, band, {
            answer: good,
            choices: shuffled([good, ...wrong], i * 2 + p + (band === "band3" ? 31 : 17)),
            display: { shapeC: { kind: "authoredChoice" }, promptText: vocabPhr[p](q) },
          })
        );
      }
    });
  }
  // Band 1: straight-or-curved picks.
  const scPhr = [
    (thing, q) => `${thing} — ${q}`,
    (thing, q) => `Think of ${thing}. ${q}`,
  ];
  const sc = [
    ["the edge of a ruler", "Is that edge straight or curved?", "straight"],
    ["the rim of a round plate", "Is that rim straight or curved?", "curved"],
    ["a stretched jump rope", "Is it straight or curved?", "straight"],
    ["a rainbow", "Is it straight or curved?", "curved"],
    ["the side of a door", "Is it straight or curved?", "straight"],
    ["a banana", "Is it straight or curved?", "curved"],
    ["a flag pole", "Is it straight or curved?", "straight"],
    ["the letter C", "Is it straight or curved?", "curved"],
    ["the letter L", "Are its parts straight or curved?", "straight"],
    ["the moon's crescent", "Is it straight or curved?", "curved"],
    ["a slide's ladder rail", "Is it straight or curved?", "straight"],
    ["the letter O", "Is it straight or curved?", "curved"],
  ];
  sc.forEach(([thing, q, good], i) => {
    for (const p of [0, 1]) {
      items.push(
        item("lineFigures", "procedural", "straightCurvedTeen", "band1", {
          answer: good,
          choices: shuffled(["straight", "curved"], i * 2 + p + 3),
          display: { shapeC: { kind: "authoredChoice" }, promptText: scPhr[p](thing, q) },
        })
      );
    }
  });

  return items;
}

export function lineFiguresConceptual() {
  const items = [];
  let seed = 311;

  const defJudgePhr = [
    (nm, claim) => `${nm} explains: ${claim} Is ${nm} right?`,
    (nm, claim) => `${nm} writes in the math journal: ${claim} Is that right?`,
  ];
  const defs = {
    band1: [["A straight path does not bend.", true], ["A curved path bends.", true], ["A circle is made of straight parts.", false], ["A square's sides are straight.", true], ["A zigzag has curves.", false], ["A stretched string makes a straight path.", true], ["The letter S is made of straight parts.", false], ["The letter T is made of straight parts.", true], ["A wheel's rim is straight.", false], ["A book's edge is straight.", true], ["A wavy river is straight.", false], ["A ruler draws straight paths.", true], ["The letter O has corners.", false], ["A triangle path has 3 corners.", true], ["A curved path can make a perfect square.", false], ["A straight road never bends.", true], ["The letter U is all straight parts.", false], ["A fence rail is a straight part.", true]],
    band2: [["A line goes on forever in both directions.", true], ["A ray has two endpoints.", false], ["A line segment has two endpoints.", true], ["A point takes up space like a circle.", false], ["A ray starts at a point and goes on forever.", true], ["A line segment goes on forever.", false], ["A point marks one exact location.", true], ["A line has exactly one endpoint.", false], ["A ray has exactly one endpoint.", true], ["A line segment is part of a line.", true], ["A line is shorter than a line segment.", false], ["Two points can be joined by exactly one straight segment.", true], ["A ray goes on forever in both directions.", false], ["A line can be measured with a ruler end to end.", false], ["A segment can be measured with a ruler.", true], ["A point has a length of 5.", false]],
    band3: [["Parallel lines never meet.", true], ["Perpendicular lines never meet.", false], ["Perpendicular lines cross at right angles.", true], ["Intersecting lines cross at exactly one point.", true], ["Parallel lines cross at two points.", false], ["Railroad tracks model parallel lines.", true], ["A plus sign models parallel lines.", false], ["A plus sign models perpendicular lines.", true], ["Two different lines can cross at three points.", false], ["The sides of a square meet at right angles.", true], ["The opposite sides of a rectangle are perpendicular to each other.", false], ["The opposite sides of a rectangle are parallel.", true], ["Adjacent sides of a rectangle are perpendicular.", true], ["Any two rays always intersect.", false], ["A trapezoid has at least one pair of parallel sides.", true], ["Parallel lines slowly drift together.", false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    defs[band].forEach(([claim, ok], i) => {
      items.push(
        item("lineFigures", "conceptual", `defJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { shapeC: { kind: "authored" }, promptText: defJudgePhr[i % 2](nameAt(i * 3 + 4 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), claim), truth: ok },
        })
      );
    });
  }

  // Real-world model picks.
  const modelPhr = [
    (nm, thing) => `${nm} spots ${thing}. Which math figure does it model best?`,
    (nm, thing) => `Which figure best matches ${thing}? ${nm} decides.`,
  ];
  const models = {
    band1: [
      ["a taut kite string", "a straight path", ["a curved path", "a corner", "a circle"]],
      ["a curled garden hose", "a curved path", ["a straight path", "a square", "a corner"]],
      ["the edge of a table", "a straight path", ["a curved path", "a circle", "a wave"]],
      ["a slithering snake's trail", "a curved path", ["a straight path", "a triangle", "a corner"]],
      ["a folded book corner", "a corner", ["a curve", "a circle", "a wave"]],
      ["the top of a rainbow", "a curved path", ["a straight path", "a corner", "a square"]],
      ["a crosswalk stripe", "a straight path", ["a curved path", "a circle", "a spiral"]],
      ["a spring coil", "a curved path", ["a straight path", "a triangle", "a corner"]],
    ],
    band2: [
      ["a laser beam shooting into space from a pointer", "a ray", ["a line segment", "a point", "a circle"]],
      ["a piece of dry spaghetti", "a line segment", ["a ray", "a line", "a point"]],
      ["a dot made by a sharp pencil", "a point", ["a ray", "a segment", "a line"]],
      ["a road stretching beyond sight both ways", "a line", ["a ray", "a segment", "a point"]],
      ["a flashlight beam from the bulb outward", "a ray", ["a line", "a segment", "a point"]],
      ["one side of a picture frame", "a line segment", ["a line", "a ray", "a point"]],
      ["a star in the night sky", "a point", ["a line", "a ray", "a segment"]],
      ["an arrow shot that flies on and on from the bow", "a ray", ["a segment", "a point", "a circle"]],
    ],
    band3: [
      ["train tracks running side by side", "parallel lines", ["perpendicular lines", "intersecting rays", "points"]],
      ["a window's corner where two edges meet squarely", "perpendicular lines", ["parallel lines", "rays", "curves"]],
      ["two crossing hiking trails", "intersecting lines", ["parallel lines", "points", "circles"]],
      ["the rails of a straight ladder", "parallel lines", ["perpendicular lines", "rays", "spirals"]],
      ["a capital letter T's two strokes", "perpendicular lines", ["parallel lines", "curved lines", "points"]],
      ["an open pair of scissors", "intersecting lines", ["parallel lines", "circles", "rays"]],
      ["the top and bottom edges of a door", "parallel lines", ["perpendicular lines", "points", "curves"]],
      ["a tic-tac-toe grid's crossings", "perpendicular lines", ["curved lines", "single points... no", "spirals"]],
    ],
  };
  models.band3[7][2] = ["curved lines", "parallel rays", "spirals"];
  for (const band of ["band1", "band2", "band3"]) {
    models[band].forEach(([thing, good, wrong], i) => {
      for (const p of [0, 1]) {
        items.push(
          item("lineFigures", "conceptual", `modelPick_${band}`, band, {
            answer: good,
            choices: shuffled([good, ...wrong], (seed += 1)),
            display: { shapeC: { kind: "authoredChoice" }, promptText: modelPhr[p](nameAt(i * 3 + p * 9 + 5 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), thing) },
          })
        );
      }
    });
  }

  const straightPickPhr = [
    (nm, a, b) => `Which one is made of only straight parts: ${a} or ${b}? ${nm} decides.`,
    (nm, a, b) => `${nm} sorts drawings. Between ${a} and ${b}, which uses only straight parts?`,
  ];
  [["the letter L", "the letter O", "the letter L"], ["the letter T", "the letter C", "the letter T"], ["the letter E", "the letter S", "the letter E"], ["the letter Z", "the letter U", "the letter Z"], ["the letter H", "the letter G", "the letter H"], ["the letter K", "the letter Q", "the letter K"], ["the letter W", "the letter B", "the letter W"], ["the letter X", "the letter D", "the letter X"], ["the letter V", "the letter P", "the letter V"], ["the letter N", "the letter R", "the letter N"], ["the letter F", "the letter J", "the letter F"]].forEach(([a, b, good], i) => {
    items.push(
      item("lineFigures", "conceptual", "straightPickTeen", "band1", {
        answer: good,
        choices: shuffled([a, b], (seed += 1)),
        display: { shapeC: { kind: "authoredChoice" }, promptText: straightPickPhr[i % 2](nameAt(i * 3 + 12), a, b) },
      })
    );
  });
  const extraDefs = {
    band2: [["A ray can be named by its endpoint and one more point.", true], ["Two segments can be exactly the same length.", true], ["A ray is always longer than a line.", false], ["A segment has a definite length.", true], ["A line has a definite length.", false], ["A point has no length at all.", true], ["Two rays can point in opposite directions.", true], ["A segment can have three endpoints.", false], ["Every side of a polygon is a line segment.", true]],
    band3: [["Perpendicular lines form four right angles at their crossing.", true], ["Two parallel lines can share exactly one point.", false], ["Two perpendicular segments can form a capital T.", true], ["All intersecting lines are perpendicular.", false], ["Some intersecting lines are perpendicular.", true], ["The rails of a straight track must intersect.", false], ["A square's diagonals intersect.", true], ["Parallel segments never cross even when extended forever.", true], ["Perpendicular lines never form right angles.", false]],
  };
  for (const band of ["band2", "band3"]) {
    extraDefs[band].forEach(([claim, ok], i) => {
      items.push(
        item("lineFigures", "conceptual", `defJudgeExtra_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { shapeC: { kind: "authored" }, promptText: `${nameAt(i * 3 + 14 + (band === "band3" ? 13 : 7))} reasons it out: ${claim} Is that right?`, truth: ok },
        })
      );
    });
  }

  // Endpoint claims judged (table-checked).
  const ep = (n) => `${n} ${n === 1 ? "endpoint" : "endpoints"}`;
  const endJudgePhrByBand = {
    band1: [
      (nm, f, said) => `${nm} says a ${f} has ${ep(said)}. Is ${nm} right?`,
      (nm, f, said) => `${nm} labels a ${f} with ${ep(said)}. Is that right?`,
    ],
    band2: [
      (nm, f, said) => `On the homework, ${nm} marks a ${f} as having ${ep(said)}. Is ${nm} right?`,
      (nm, f, said) => `${nm} writes that every ${f} has ${ep(said)}. Is that right?`,
    ],
    band3: [
      (nm, f, said) => `In the geometry quiz, ${nm} answers that a ${f} has ${ep(said)}. Is ${nm} right?`,
      (nm, f, said) => `${nm} defends the claim that a ${f} carries ${ep(said)}. Is that right?`,
    ],
  };
  const endData = {
    band1: [["line segment", 2, true], ["line segment", 1, false], ["line segment", 2, true], ["line segment", 3, false], ["line segment", 2, true], ["line segment", 0, false]],
    band2: [["ray", 1, true], ["ray", 2, false], ["line", 0, true], ["line", 2, false], ["line segment", 2, true], ["ray", 0, false], ["line", 1, false], ["line segment", 1, false], ["ray", 1, true], ["line", 0, true]],
    band3: [["ray", 1, true], ["line", 0, true], ["line segment", 2, true], ["ray", 2, false], ["line", 2, false], ["line segment", 0, false], ["ray", 1, true], ["line", 0, true], ["line segment", 2, true], ["ray", 0, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    endData[band].forEach(([f, said, ok], i) => {
      items.push(
        item("lineFigures", "conceptual", `endJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { shapeC: { kind: "endpointsSaid", figure: f, said }, promptText: endJudgePhrByBand[band][i % 2](nameAt(i * 3 + 6 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), f, said), truth: ok },
        })
      );
    });
  }

  return items;
}
