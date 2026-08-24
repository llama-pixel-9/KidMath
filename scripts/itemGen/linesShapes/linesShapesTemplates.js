/* Deterministic linesShapes bank items — part 1: shapeSides, symmetryLines,
 * shapeProperties. (Part 2: linesShapesTemplates2.js.)
 *
 * Property answers come from SHAPE_TABLE below, which mirrors the mode's own
 * SHAPES table (same keys the ShapeFigure widget draws) — authorLinesShapes
 * re-derives every display.shape claim from it, so a drawn figure and its
 * stated properties cannot drift. Figure caveats respected: the drawn
 * rhombus and octagon are never asked for symmetry off the picture.
 *
 * Payload shapes mirror the generator:
 *   count figure:  answerType "shapeFigure" + display {shape, shapeMode:"count", rotate}
 *   select figure: answerType "shapeFigure" + display {shapeMode:"select",
 *                  options:[{shape, rotate, value}...]}, answer = option INDEX.
 *
 * Uniqueness: figure-count prompts are numbered ("Shape 4: ...") because the
 * same question about different drawn shapes reads identically otherwise.
 * Band-1 prompts stay <= 20; judged = "Is this right?" Yes/No.
 */

import { rotor, shuffled, NAMES } from "../counting/countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };

export const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "linesShapes",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

export const nameAt = (i) => NAMES[i % NAMES.length];

// Mirrors src/modes/linesShapes.js SHAPES (keys the widget draws).
export const SHAPE_TABLE = [
  { key: "triangleEquilateral", name: "triangle", sides: 3, vertices: 3, symmetry: 3, parallelPairs: 0, rightAngles: 0, tier: 1 },
  { key: "triangleRight", name: "right triangle", sides: 3, vertices: 3, symmetry: 1, parallelPairs: 0, rightAngles: 1, tier: 2 },
  { key: "triangleScalene", name: "scalene triangle", sides: 3, vertices: 3, symmetry: 0, parallelPairs: 0, rightAngles: 0, tier: 3 },
  { key: "square", name: "square", sides: 4, vertices: 4, symmetry: 4, parallelPairs: 2, rightAngles: 4, tier: 1 },
  { key: "rectangle", name: "rectangle", sides: 4, vertices: 4, symmetry: 2, parallelPairs: 2, rightAngles: 4, tier: 1 },
  { key: "rhombus", name: "rhombus", sides: 4, vertices: 4, symmetry: 2, parallelPairs: 2, rightAngles: 0, tier: 2, askSymmetry: false },
  { key: "parallelogram", name: "parallelogram", sides: 4, vertices: 4, symmetry: 0, parallelPairs: 2, rightAngles: 0, tier: 2 },
  { key: "trapezoid", name: "trapezoid", sides: 4, vertices: 4, symmetry: 1, parallelPairs: 1, rightAngles: 0, tier: 2 },
  { key: "pentagon", name: "pentagon", sides: 5, vertices: 5, symmetry: 5, parallelPairs: 0, rightAngles: 0, tier: 1 },
  { key: "hexagon", name: "hexagon", sides: 6, vertices: 6, symmetry: 6, parallelPairs: 3, rightAngles: 0, tier: 2 },
  { key: "octagon", name: "octagon", sides: 8, vertices: 8, symmetry: 8, parallelPairs: 4, rightAngles: 0, tier: 3, askSymmetry: false },
];
export const NAMED_ONLY = [
  // Regular versions; parallel pairs exist only for even side counts.
  { name: "heptagon", sides: 7, vertices: 7, symmetry: 7, parallelPairs: 0, rightAngles: 0 },
  { name: "nonagon", sides: 9, vertices: 9, symmetry: 9, parallelPairs: 0, rightAngles: 0 },
  { name: "decagon", sides: 10, vertices: 10, symmetry: 10, parallelPairs: 5, rightAngles: 0 },
  { name: "dodecagon", sides: 12, vertices: 12, symmetry: 12, parallelPairs: 6, rightAngles: 0 },
];
export const byKey = (k) => SHAPE_TABLE.find((s) => s.key === k);
export const byName = (n) => [...SHAPE_TABLE, ...NAMED_ONLY].find((s) => s.name === n);

const T1 = SHAPE_TABLE.filter((s) => s.tier === 1); // triangle, square, rectangle, pentagon
const T12 = SHAPE_TABLE.filter((s) => s.tier <= 2);

const countFigure = (subskill, family, structureType, band, shape, kind, n, promptText, rotate = 0) =>
  item(subskill, family, structureType, band, {
    answer: n,
    answerType: "shapeFigure",
    display: { shape: shape.key, shapeMode: "count", rotate, shapeC: { kind, key: shape.key }, promptText },
  });

/* ================================================================== */
/* shapeSides                                                          */
/* ================================================================== */

export function shapeSidesProcedural() {
  const items = [];

  // Named vocabulary drills (per-shape, both properties, two phrasings).
  const sidePhr = [
    (n) => `How many sides does a ${n} have?`,
    (n) => `A ${n} has ? sides`,
  ];
  const vertPhr = [
    (n) => `How many vertices does a ${n} have?`,
    (n) => `A ${n} has ? vertices`,
  ];
  const allNamed = [...SHAPE_TABLE, ...NAMED_ONLY];
  // Band 1: tier-1 names; band 2: tier<=2 + heptagon; band 3: the rest.
  const bandShapes = {
    band1: T1,
    band2: [...T12.filter((s) => s.tier === 2), byName("heptagon")],
    band3: [byKey("triangleScalene"), byKey("octagon"), byName("nonagon"), byName("decagon"), byName("dodecagon")],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (const shape of bandShapes[band]) {
      for (const p of [0, 1]) {
        items.push(
          item("shapeSides", "procedural", `namedSides_${band}`, band, {
            answer: shape.sides,
            answerType: "numberPad",
            display: { shapeC: { kind: "sidesByName", name: shape.name }, promptText: sidePhr[p](shape.name) },
          })
        );
        items.push(
          item("shapeSides", "procedural", `namedVertices_${band}`, band, {
            answer: shape.vertices,
            answerType: "numberPad",
            display: { shapeC: { kind: "verticesByName", name: shape.name }, promptText: vertPhr[p](shape.name) },
          })
        );
      }
    }
  }

  // Figure counts, numbered for uniqueness.
  const figPhr = {
    band1: [
      (n) => `Shape ${n}: count its sides. How many sides are there?`,
      (n) => `Shape ${n}: count its corners. How many vertices are there?`,
    ],
    band2: [
      (n) => `Figure ${n} is tilted — count the sides anyway. How many sides?`,
      (n) => `Figure ${n} is tilted — count the vertices anyway. How many vertices?`,
    ],
    band3: [
      (n) => `Study figure ${n} closely. Exactly how many sides does it have?`,
      (n) => `Study figure ${n} closely. Exactly how many vertices does it have?`,
    ],
  };
  const figShapes = {
    band1: [...T1, ...T1, byKey("hexagon"), byKey("trapezoid"), ...T1],
    band2: T12,
    band3: SHAPE_TABLE,
  };
  const rotates = { band1: [0, 15], band2: [15, 30, 45], band3: [30, 45, 60] };
  for (const band of ["band1", "band2", "band3"]) {
    figShapes[band].forEach((shape, i) => {
      const rot = rotates[band][i % rotates[band].length];
      items.push(countFigure("shapeSides", "procedural", `figSides_${band}`, band, shape, "sides", shape.sides, figPhr[band][0](i + 1), rot));
      items.push(countFigure("shapeSides", "procedural", `figVertices_${band}`, band, shape, "vertices", shape.vertices, figPhr[band][1](i + 1), rot));
    });
  }

  // Side sums across two named shapes (countMath sum claim).
  const an = (w) => (/^[aeiou]/.test(w) ? `an ${w}` : `a ${w}`);
  const sumPhr = [
    (a, b) => `${an(a).replace(/^a/, "A").replace(/^An/, "An")} and ${an(b)} together have ? sides`,
    (a, b) => `Add the sides of ${an(a)} and ${an(b)}. How many sides in all?`,
  ];
  const sumPairs = {
    band1: [["triangle", "square"], ["square", "pentagon"], ["triangle", "pentagon"], ["rectangle", "triangle"], ["pentagon", "rectangle"], ["square", "rectangle"], ["triangle", "triangle"], ["pentagon", "pentagon"]],
    band2: [["hexagon", "square"], ["trapezoid", "pentagon"], ["hexagon", "triangle"], ["rhombus", "hexagon"], ["heptagon", "square"], ["hexagon", "hexagon"], ["heptagon", "pentagon"], ["parallelogram", "hexagon"], ["heptagon", "triangle"], ["trapezoid", "hexagon"]],
    band3: [["octagon", "hexagon"], ["nonagon", "square"], ["decagon", "triangle"], ["octagon", "octagon"], ["dodecagon", "pentagon"], ["nonagon", "hexagon"], ["decagon", "octagon"], ["dodecagon", "octagon"], ["nonagon", "decagon"], ["dodecagon", "dodecagon"]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    sumPairs[band].forEach(([a, b], i) => {
      const sa = byName(a).sides;
      const sb = byName(b).sides;
      items.push(
        item("shapeSides", "procedural", `sideSum_${band}`, band, {
          answer: sa + sb,
          answerType: "numberPad",
          display: { counting: { kind: "sum", parts: [sa, sb] }, promptText: sumPhr[i % 2](a, b) },
        })
      );
    });
  }

  return items;
}

export function shapeSidesConceptual() {
  const items = [];
  let seed = 271;

  const judgePhr = [
    (nm, name, prop, said) => `${nm} says a ${name} has ${said} ${prop}. Is ${nm} right?`,
    (nm, name, prop, said) => `${nm} writes that every ${name} has ${said} ${prop}. Is that right?`,
  ];
  const judgeData = {
    band1: [["triangle", "sides", 3, true], ["square", "sides", 5, false], ["pentagon", "sides", 5, true], ["rectangle", "sides", 3, false], ["triangle", "vertices", 3, true], ["square", "vertices", 3, false], ["pentagon", "vertices", 4, false], ["rectangle", "vertices", 4, true], ["triangle", "sides", 4, false], ["square", "sides", 4, true], ["pentagon", "vertices", 5, true], ["rectangle", "sides", 4, true], ["triangle", "vertices", 4, false], ["square", "vertices", 4, true], ["pentagon", "sides", 6, false], ["rectangle", "vertices", 5, false]],
    band2: [["hexagon", "sides", 6, true], ["trapezoid", "sides", 3, false], ["heptagon", "sides", 7, true], ["rhombus", "sides", 4, true], ["hexagon", "vertices", 5, false], ["parallelogram", "sides", 4, true], ["heptagon", "vertices", 7, true], ["trapezoid", "vertices", 4, true], ["hexagon", "sides", 8, false], ["rhombus", "vertices", 3, false], ["parallelogram", "vertices", 5, false], ["heptagon", "sides", 6, false], ["hexagon", "vertices", 6, true], ["trapezoid", "sides", 4, true], ["rhombus", "sides", 5, false], ["parallelogram", "vertices", 4, true]],
    band3: [["octagon", "sides", 8, true], ["nonagon", "sides", 9, true], ["decagon", "sides", 12, false], ["dodecagon", "sides", 12, true], ["octagon", "vertices", 6, false], ["nonagon", "vertices", 9, true], ["decagon", "vertices", 10, true], ["dodecagon", "vertices", 10, false], ["octagon", "sides", 10, false], ["nonagon", "sides", 8, false], ["decagon", "sides", 10, true], ["dodecagon", "vertices", 12, true], ["octagon", "vertices", 8, true], ["nonagon", "vertices", 7, false], ["decagon", "vertices", 8, false], ["scalene triangle", "sides", 3, true]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    judgeData[band].forEach(([name, prop, said, ok], i) => {
      items.push(
        item("shapeSides", "conceptual", `propJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { shapeC: { kind: "propSaid", name, prop, said }, promptText: judgePhr[i % 2](nameAt(i * 3 + 1 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), name, prop, said), truth: ok },
        })
      );
    });
  }

  // Side-vertex equality insight, judged.
  const svPhr = [
    (nm, name) => `${nm} notices a ${name} has the same number of sides as vertices. Is ${nm} right?`,
    (nm, name) => `${nm} claims a ${name}'s side count and vertex count are equal. Is that right?`,
  ];
  const svData = {
    band1: ["triangle", "square", "pentagon", "rectangle", "triangle", "square", "pentagon", "rectangle", "triangle", "square", "pentagon", "rectangle", "triangle", "square", "pentagon", "rectangle", "triangle", "square"],
    band2: ["hexagon", "trapezoid", "rhombus", "parallelogram", "heptagon", "hexagon", "trapezoid", "rhombus", "parallelogram", "heptagon", "hexagon", "trapezoid", "rhombus", "parallelogram", "heptagon", "hexagon", "trapezoid", "rhombus"],
    band3: ["octagon", "nonagon", "decagon", "dodecagon", "scalene triangle", "octagon", "nonagon", "decagon", "dodecagon", "scalene triangle", "octagon", "nonagon", "decagon", "dodecagon", "scalene triangle", "octagon", "nonagon", "decagon"],
  };
  for (const band of ["band1", "band2", "band3"]) {
    svData[band].forEach((name, i) => {
      if (i >= 18) return;
      items.push(
        item("shapeSides", "conceptual", `sideVertexEq_${band}`, band, {
          answer: "Yes",
          choices: ["Yes", "No"],
          display: { shapeC: { kind: "sideVertexEq", name }, promptText: svPhr[Math.floor(i / 9)](nameAt(i * 3 + 2 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), name), truth: true },
        })
      );
    });
  }

  // Which named shape has MORE sides.
  const morePhr = [
    (nm, a, b) => `${nm} compares a ${a} with a ${b}. Which shape has more sides?`,
    (nm, a, b) => `Which has more sides, a ${a} or a ${b}? ${nm} counts to decide.`,
  ];
  const moreData = {
    band1: [["square", "triangle"], ["pentagon", "square"], ["pentagon", "triangle"], ["rectangle", "triangle"], ["square", "pentagon"], ["triangle", "rectangle"], ["pentagon", "rectangle"], ["triangle", "pentagon"], ["rectangle", "pentagon"], ["square", "triangle"], ["pentagon", "square"], ["triangle", "square"], ["rectangle", "triangle"], ["pentagon", "triangle"], ["square", "pentagon"], ["triangle", "rectangle"], ["pentagon", "rectangle"], ["rectangle", "square"]],
    band2: [["hexagon", "square"], ["heptagon", "hexagon"], ["hexagon", "trapezoid"], ["heptagon", "pentagon"], ["trapezoid", "hexagon"], ["pentagon", "heptagon"], ["hexagon", "rhombus"], ["heptagon", "trapezoid"], ["rhombus", "hexagon"], ["parallelogram", "heptagon"], ["hexagon", "pentagon"], ["heptagon", "square"], ["trapezoid", "heptagon"], ["pentagon", "hexagon"], ["rhombus", "heptagon"], ["hexagon", "parallelogram"], ["square", "hexagon"], ["heptagon", "rhombus"]],
    band3: [["octagon", "hexagon"], ["nonagon", "octagon"], ["decagon", "nonagon"], ["dodecagon", "decagon"], ["octagon", "nonagon"], ["nonagon", "decagon"], ["decagon", "dodecagon"], ["dodecagon", "octagon"], ["octagon", "decagon"], ["nonagon", "dodecagon"], ["decagon", "octagon"], ["dodecagon", "nonagon"], ["hexagon", "octagon"], ["octagon", "dodecagon"], ["nonagon", "hexagon"], ["decagon", "hexagon"], ["dodecagon", "hexagon"], ["hexagon", "nonagon"]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    moreData[band].forEach(([a, b], i) => {
      if (byName(a).sides === byName(b).sides) {
        // equal-side pairs pivot to "the same" reasoning — skip here.
        return;
      }
      const winner = byName(a).sides > byName(b).sides ? a : b;
      items.push(
        item("shapeSides", "conceptual", `moreSides_${band}`, band, {
          answer: `the ${winner}`,
          choices: shuffled([`the ${a}`, `the ${b}`], (seed += 1)),
          display: { shapeC: { kind: "moreSides", a, b }, promptText: morePhr[i % 2](nameAt(i * 3 + 3 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), a, b) },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* symmetryLines                                                       */
/* ================================================================== */

export function symmetryProcedural() {
  const items = [];

  // Named symmetry drills — never off the drawn rhombus/octagon figure, but
  // WORD questions about ideal shapes are honest for every named shape.
  const symPhrByBand = {
    band2: [
      (n) => `How many lines of symmetry does a ${n} have?`,
      (n) => `A ${n} has ? lines of symmetry`,
    ],
    band3: [
      (n) => `Exactly how many lines of symmetry does a ${n} have?`,
      (n) => `Count every line of symmetry of a ${n}. How many lines is that?`,
    ],
  };
  const symShapes = {
    band2: ["square", "rectangle", "triangle", "pentagon", "hexagon", "trapezoid", "right triangle", "heptagon"],
    band3: ["octagon", "nonagon", "decagon", "dodecagon", "scalene triangle", "parallelogram", "hexagon", "square"],
  };
  for (const band of ["band2", "band3"]) {
    symShapes[band].forEach((name, i) => {
      for (const p of [0, 1]) {
        if (band === "band3" && i >= 6 && p === 1) return; // keep counts tidy
        items.push(
          item("symmetryLines", "procedural", `namedSymmetry_${band}`, band, {
            answer: byName(name).symmetry,
            answerType: "numberPad",
            display: { shapeC: { kind: "symmetryByName", name }, promptText: symPhrByBand[band][p](name) },
          })
        );
      }
    });
  }

  // Band 1 — halves-match fold drills (Yes/No, procedural mechanics).
  const foldPhr = [
    (nm, name, dir, ok) => `Fold a ${name} ${dir}. Do the two halves match exactly?`,
    (nm, name, dir, ok) => `${nm} folds a paper ${name} ${dir}. Will the halves line up exactly?`,
  ];
  const foldData = [
    ["square", "straight down the middle", true], ["square", "corner to corner", true],
    ["rectangle", "straight down the middle", true], ["rectangle", "corner to corner", false],
    ["triangle", "from the top point to the middle of the bottom", true], ["circle", "through the middle", true],
    ["heart", "down the middle", true], ["heart", "side to side", false],
    ["letter L shape", "down the middle", false], ["star", "through a point and the middle", true],
    ["square", "along a slanted off-center line", false], ["rectangle", "along a slanted off-center line", false],
    ["triangle", "along a slanted off-center line", false], ["circle", "along any line through the middle", true],
    ["letter S shape", "down the middle", false], ["oval", "through the long middle", true],
    ["heart", "corner to corner", false], ["star", "along an off-center line", false],
    ["oval", "along an off-center line", false], ["square", "side to side through the middle", true],
    ["star", "side to side through two points", true], ["heart", "along a slanted line", false],
    ["circle", "top to bottom through the middle", true], ["letter S shape", "corner to corner", false],
    ["oval", "top to bottom through the short middle", true], ["letter L shape", "along its long stroke", false],
    ["square", "corner to corner the other way", true], ["rectangle", "side to side through the middle", true],
    ["triangle", "from a bottom point to the middle of the far side", true], ["star", "along a line missing every point", false],
    ["heart", "through the dip and the tip", true],
    ["circle", "along a line missing the middle", false], ["star", "through two facing points", true],
    ["rectangle", "top to bottom through the middle", true], ["triangle", "side to side off center", false],
    ["circle", "off center", false], ["letter L shape", "corner to corner", false],
    ["star", "down through the top point", true], ["oval", "through the short middle", true],
  ];
  foldData.forEach(([name, dir, ok], i) => {
    items.push(
      item("symmetryLines", "procedural", "foldMatchTeen", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { shapeC: { kind: "authored" }, promptText: foldPhr[i % 2](nameAt(i * 3 + 4), name, dir, ok), truth: ok },
      })
    );
  });
  // Band 1 filler: symmetry-line counts for simple names (words, small numbers).
  const b1Sym = [["square", 4], ["rectangle", 2], ["triangle", 3], ["circle", 20], null].filter(Boolean);
  const b1SymPhr = [
    (n) => `Count the fold lines that split a ${n} into matching halves. How many fold lines are there?`,
    (n) => `How many matching-half fold lines does a ${n} have?`,
  ];
  [["square", 4], ["rectangle", 2], ["triangle", 3], ["pentagon", 5], ["hexagon", 6], ["trapezoid", 1]].forEach(([name, n], i) => {
    for (const p of [0, 1]) {
      items.push(
        item("symmetryLines", "procedural", "foldCountTeen", "band1", {
          answer: n,
          answerType: "numberPad",
          display: { shapeC: { kind: "symmetryByName", name }, promptText: b1SymPhr[p](name) },
        })
      );
    }
  });
  // Symmetry totals across two named shapes (countMath sum claim).
  const symSumPhrByBand = {
    band2: [
      (a, b) => `A ${a} and a ${b}: how many lines of symmetry do they have in total?`,
      (a, b) => `Add the lines of symmetry of a ${a} and a ${b}. What is the total?`,
    ],
    band3: [
      (a, b) => `Combine the symmetry lines of a ${a} and a ${b}. Exactly how many lines is that?`,
      (a, b) => `Tally every line of symmetry across a ${a} and a ${b}. How many lines in all?`,
    ],
  };
  const symSums = {
    band2: [["square", "rectangle"], ["triangle", "square"], ["pentagon", "rectangle"], ["hexagon", "triangle"], ["square", "trapezoid"], ["pentagon", "triangle"], ["hexagon", "rectangle"], ["square", "pentagon"], ["triangle", "trapezoid"], ["hexagon", "square"], ["rectangle", "trapezoid"], ["pentagon", "hexagon"], ["right triangle", "square"], ["heptagon", "triangle"], ["right triangle", "hexagon"]],
    band3: [["octagon", "square"], ["nonagon", "triangle"], ["decagon", "rectangle"], ["dodecagon", "square"], ["octagon", "pentagon"], ["nonagon", "hexagon"], ["decagon", "square"], ["dodecagon", "triangle"], ["octagon", "hexagon"], ["nonagon", "square"], ["decagon", "pentagon"], ["dodecagon", "rectangle"], ["octagon", "triangle"], ["nonagon", "pentagon"], ["decagon", "hexagon"], ["dodecagon", "pentagon"], ["octagon", "rectangle"], ["nonagon", "rectangle"], ["decagon", "triangle"], ["dodecagon", "hexagon"], ["scalene triangle", "square"], ["parallelogram", "octagon"], ["scalene triangle", "decagon"], ["parallelogram", "dodecagon"], ["scalene triangle", "hexagon"], ["parallelogram", "square"], ["scalene triangle", "octagon"]],
  };
  for (const band of ["band2", "band3"]) {
    symSums[band].forEach(([a, b], i) => {
      const sa = byName(a).symmetry;
      const sb = byName(b).symmetry;
      items.push(
        item("symmetryLines", "procedural", `symSum_${band}`, band, {
          answer: sa + sb,
          answerType: "numberPad",
          display: { counting: { kind: "sum", parts: [sa, sb] }, promptText: symSumPhrByBand[band][i % 2](a, b) },
        })
      );
    });
  }

  // Figure symmetry counts (safe shapes only), numbered.
  const figSymPhr = {
    band2: (n) => `Figure ${n}: how many lines of symmetry does the drawn shape have?`,
    band3: (n) => `Inspect figure ${n}. Exactly how many lines of symmetry does it show?`,
  };
  const symFig = {
    band2: ["square", "rectangle", "triangleEquilateral", "pentagon", "hexagon", "trapezoid", "triangleRight", "square", "rectangle", "triangleEquilateral", "pentagon", "hexagon", "trapezoid", "triangleRight", "square", "rectangle", "triangleEquilateral", "pentagon", "hexagon", "trapezoid"],
    band3: ["pentagon", "hexagon", "square", "trapezoid", "triangleScalene", "parallelogram", "rectangle", "triangleRight", "triangleEquilateral", "hexagon", "pentagon", "square", "trapezoid", "triangleScalene", "parallelogram", "rectangle", "triangleRight", "triangleEquilateral", "square", "hexagon"],
  };
  for (const band of ["band2", "band3"]) {
    symFig[band].forEach((key, i) => {
      const shape = byKey(key);
      items.push(countFigure("symmetryLines", "procedural", `figSymmetry_${band}`, band, shape, "symmetry", shape.symmetry, figSymPhr[band](i + 1), 0));
    });
  }

  return items;
}

export function symmetryConceptual() {
  const items = [];
  let seed = 281;

  const symJudgePhr = [
    (nm, name, said) => `${nm} says a ${name} has ${said} lines of symmetry. Is ${nm} right?`,
    (nm, name, said) => `${nm} counts ${said} lines of symmetry on a ${name}. Is that right?`,
  ];
  const judgeData = {
    band2: [["square", 4, true], ["rectangle", 4, false], ["triangle", 3, true], ["pentagon", 4, false], ["hexagon", 6, true], ["trapezoid", 2, false], ["right triangle", 1, true], ["square", 2, false], ["rectangle", 2, true], ["triangle", 1, false], ["pentagon", 5, true], ["hexagon", 3, false], ["trapezoid", 1, true], ["right triangle", 3, false], ["square", 3, false], ["heptagon", 7, true]],
    band3: [["octagon", 8, true], ["nonagon", 9, true], ["decagon", 8, false], ["dodecagon", 12, true], ["scalene triangle", 0, true], ["parallelogram", 2, false], ["octagon", 4, false], ["nonagon", 3, false], ["decagon", 10, true], ["dodecagon", 6, false], ["scalene triangle", 1, false], ["parallelogram", 0, true], ["octagon", 8, true], ["nonagon", 9, true], ["decagon", 5, false], ["dodecagon", 12, true]],
  };
  for (const band of ["band2", "band3"]) {
    judgeData[band].forEach(([name, said, ok], i) => {
      items.push(
        item("symmetryLines", "conceptual", `symJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { shapeC: { kind: "symSaid", name, said }, promptText: symJudgePhr[i % 2](nameAt(i * 3 + 5 + (band === "band3" ? 13 : 7)), name, said), truth: ok },
        })
      );
    });
  }

  // Which shape has more lines of symmetry.
  const moreSymPhr = [
    (nm, a, b) => `Which has more lines of symmetry, a ${a} or a ${b}? ${nm} pictures the folds.`,
    (nm, a, b) => `${nm} compares fold lines: a ${a} against a ${b}. Which shape has more?`,
  ];
  const moreData = {
    band2: [["square", "rectangle"], ["hexagon", "square"], ["pentagon", "rectangle"], ["triangle", "trapezoid"], ["hexagon", "trapezoid"], ["square", "trapezoid"], ["pentagon", "trapezoid"], ["hexagon", "rectangle"], ["triangle", "rectangle"], ["pentagon", "right triangle"], ["square", "right triangle"], ["hexagon", "right triangle"], ["triangle", "right triangle"], ["heptagon", "square"], ["heptagon", "hexagon"], ["heptagon", "trapezoid"]],
    band3: [["octagon", "hexagon"], ["nonagon", "octagon"], ["decagon", "nonagon"], ["dodecagon", "decagon"], ["octagon", "parallelogram"], ["nonagon", "scalene triangle"], ["decagon", "square"], ["dodecagon", "hexagon"], ["octagon", "scalene triangle"], ["nonagon", "parallelogram"], ["decagon", "trapezoid"], ["dodecagon", "square"], ["octagon", "trapezoid"], ["nonagon", "square"], ["decagon", "parallelogram"], ["dodecagon", "scalene triangle"]],
  };
  for (const band of ["band2", "band3"]) {
    moreData[band].forEach(([a, b], i) => {
      const winner = byName(a).symmetry > byName(b).symmetry ? a : b;
      items.push(
        item("symmetryLines", "conceptual", `moreSym_${band}`, band, {
          answer: `the ${winner}`,
          choices: shuffled([`the ${a}`, `the ${b}`], (seed += 1)),
          display: { shapeC: { kind: "moreSym", a, b }, promptText: moreSymPhr[i % 2](nameAt(i * 3 + 6 + (band === "band3" ? 13 : 7)), a, b) },
        })
      );
    });
  }

  // Band 1 — mirror-half reasoning, authored truths.
  const mirrorPhr = [
    (nm, thing, ok) => `${nm} says ${thing} looks the same on both sides of a middle fold. Is ${nm} right?`,
    (nm, thing, ok) => `${nm} claims ${thing} has two matching halves. Is that right?`,
  ];
  const mirrorData = [
    ["a butterfly with matching wings", true], ["a plain capital letter A", true], ["a capital letter F", false],
    ["a heart", true], ["a capital letter J", false], ["a snowflake", true], ["a capital letter R", false],
    ["a ladybug with even spots", true], ["a capital letter G", false], ["a smiley face", true],
    ["a capital letter T", true], ["a capital letter P", false], ["a capital letter M", true],
    ["a capital letter Q", false], ["a capital letter V", true], ["a capital letter Z", false],
    ["a capital letter U", true], ["a capital letter S", false], ["a capital letter H", true],
    ["a capital letter N", false], ["a capital letter O", true], ["a capital letter L", false],
    ["a capital letter W", true], ["a capital letter K", false], ["a capital letter X", true], ["a capital letter B", true],
    ["a capital letter C", true], ["a capital letter E", true], ["a capital letter D", true], ["a capital letter F... no", null],
    ["a valentine card heart", true], ["a checkmark", false], ["a plain diamond shape", true], ["a comma", false], ["a plus sign", true],
  ];
  mirrorData.filter((r) => r[1] !== null).forEach(([thing, ok], i) => {
    items.push(
      item("symmetryLines", "conceptual", "mirrorJudgeTeen", "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { shapeC: { kind: "authored" }, promptText: mirrorPhr[i % 2](nameAt(i * 3 + 7), thing, ok), truth: ok },
      })
    );
  });
  // Band 1 — which of two things folds into matching halves.
  const whichFoldPhr = [
    (nm, a, b) => `Which folds into two matching halves: ${a} or ${b}? ${nm} imagines the fold.`,
    (nm, a, b) => `${nm} must pick the one with matching halves — ${a} or ${b}. Which is it?`,
  ];
  [["a heart", "a capital letter F", "a heart"], ["a square", "a capital letter J", "a square"], ["a butterfly", "a capital letter R", "a butterfly"], ["a circle", "a capital letter G", "a circle"], ["a snowflake", "a capital letter P", "a snowflake"], ["a capital letter A", "a capital letter Z", "a capital letter A"], ["a capital letter M", "a capital letter S", "a capital letter M"], ["a smiley face", "a capital letter K", "a smiley face"], ["a capital letter T", "a capital letter N", "a capital letter T"], ["a capital letter V", "a capital letter L", "a capital letter V"], ["a capital letter O", "a capital letter Q", "a capital letter O"], ["a capital letter H", "a capital letter B... wait", ""], ["a capital letter U", "a capital letter J", "a capital letter U"], ["a capital letter X", "a capital letter Z", "a capital letter X"], ["a capital letter W", "a capital letter S", "a capital letter W"], ["a heart", "a capital letter N", "a heart"], ["a butterfly", "a capital letter G", "a butterfly"], ["a snowflake", "a capital letter R", "a snowflake"]].filter((r) => r[2]).forEach(([a, b, good], i) => {
    items.push(
      item("symmetryLines", "conceptual", "whichFoldsTeen", "band1", {
        answer: good,
        choices: shuffled([a, b], (seed += 1)),
        display: { shapeC: { kind: "authored" }, promptText: whichFoldPhr[i % 2](nameAt(i * 3 + 8), a, b) },
      })
    );
  });

  const fewestPhr = [
    (nm, a, b, c) => `Of a ${a}, a ${b}, and a ${c}, which has the FEWEST lines of symmetry? ${nm} compares them.`,
    (nm, a, b, c) => `${nm} ranks a ${a}, a ${b}, and a ${c} by symmetry lines. Which has the fewest?`,
  ];
  const fewestData = {
    band2: [["square", "rectangle", "trapezoid"], ["hexagon", "triangle", "right triangle"], ["pentagon", "square", "rectangle"], ["hexagon", "square", "trapezoid"], ["triangle", "rectangle", "right triangle"], ["pentagon", "hexagon", "rectangle"], ["square", "triangle", "trapezoid"], ["hexagon", "pentagon", "right triangle"], ["square", "rectangle", "right triangle"], ["pentagon", "triangle", "trapezoid"], ["heptagon", "square", "rectangle"], ["hexagon", "heptagon", "trapezoid"], ["square", "pentagon", "right triangle"], ["triangle", "heptagon", "rectangle"], ["pentagon", "rectangle", "right triangle"], ["hexagon", "triangle", "trapezoid"], ["heptagon", "pentagon", "rectangle"], ["square", "hexagon", "right triangle"], ["triangle", "pentagon", "trapezoid"]],
    band3: [["octagon", "square", "parallelogram"], ["nonagon", "hexagon", "scalene triangle"], ["decagon", "pentagon", "parallelogram"], ["dodecagon", "square", "scalene triangle"], ["octagon", "triangle", "parallelogram"], ["nonagon", "rectangle", "scalene triangle"], ["decagon", "hexagon", "parallelogram"], ["dodecagon", "pentagon", "scalene triangle"], ["octagon", "rectangle", "parallelogram"], ["nonagon", "square", "scalene triangle"], ["decagon", "triangle", "parallelogram"], ["dodecagon", "hexagon", "scalene triangle"], ["octagon", "pentagon", "parallelogram"], ["nonagon", "triangle", "scalene triangle"], ["decagon", "rectangle", "parallelogram"], ["dodecagon", "triangle", "scalene triangle"], ["octagon", "hexagon", "parallelogram"], ["nonagon", "pentagon", "scalene triangle"], ["decagon", "square", "scalene triangle"]],
  };
  for (const band of ["band2", "band3"]) {
    fewestData[band].forEach(([a, b, c], i) => {
      const trio = [a, b, c].map((n) => [n, byName(n).symmetry]);
      const min = Math.min(...trio.map((t) => t[1]));
      if (trio.filter((t) => t[1] === min).length !== 1) return;
      const loser = trio.find((t) => t[1] === min)[0];
      items.push(
        item("symmetryLines", "conceptual", `fewestSym_${band}`, band, {
          answer: `the ${loser}`,
          choices: shuffled([`the ${a}`, `the ${b}`, `the ${c}`], (seed += 1)),
          display: { shapeC: { kind: "fewestSym", names: [a, b, c] }, promptText: fewestPhr[i % 2](nameAt(i * 3 + 9 + (band === "band3" ? 13 : 7)), a, b, c) },
        })
      );
    });
  }

  return items;
}

/* ================================================================== */
/* shapeProperties                                                     */
/* ================================================================== */

export function shapePropertiesProcedural() {
  const items = [];

  const raPhrByBand = {
    band1: [
      (n) => `How many right angles does a ${n} have?`,
      (n) => `A ${n} has ? right angles`,
    ],
    band2: [
      (n) => `Count the right angles of a ${n}. How many right angles are there?`,
      (n) => `A ${n} comes with ? right angles`,
    ],
    band3: [
      (n) => `Exactly how many right angles does a ${n} contain?`,
      (n) => `Tally every right angle of a ${n}. How many right angles is that?`,
    ],
  };
  const ppPhrByBand = {
    band1: [
      (n) => `How many pairs of parallel sides does a ${n} have?`,
      (n) => `A ${n} has ? pairs of parallel sides`,
    ],
    band2: [
      (n) => `Count the parallel pairs of a ${n}. How many pairs are there?`,
      (n) => `A ${n} comes with ? pairs of parallel sides`,
    ],
    band3: [
      (n) => `Exactly how many pairs of parallel sides does a ${n} contain?`,
      (n) => `Tally the parallel pairs of a ${n}. How many pairs is that?`,
    ],
  };
  const propShapes = {
    band1: ["square", "rectangle", "triangle", "right triangle", "pentagon", "hexagon"],
    band2: ["trapezoid", "rhombus", "parallelogram", "heptagon"],
    band3: ["octagon", "scalene triangle", "nonagon", "decagon"],
  };
  for (const band of ["band1", "band2", "band3"]) {
    propShapes[band].forEach((name) => {
      for (const p of [0, 1]) {
        items.push(
          item("shapeProperties", "procedural", `rightAngles_${band}`, band, {
            answer: byName(name).rightAngles,
            answerType: "numberPad",
            display: { shapeC: { kind: "rightAnglesByName", name }, promptText: raPhrByBand[band][p](name) },
          })
        );
        items.push(
          item("shapeProperties", "procedural", `parallelPairs_${band}`, band, {
            answer: byName(name).parallelPairs,
            answerType: "numberPad",
            display: { shapeC: { kind: "parallelPairsByName", name }, promptText: ppPhrByBand[band][p](name) },
          })
        );
      }
    });
  }
  // Band-specific extras: band1 equal-sides counts; band2/3 diagonal counts.
  const eqPhr = [
    (n, k) => `All the sides of a ${n} are equal. How many equal sides is that?`,
    (n, k) => `A ${n} has all its sides the same length. How many sides are the same?`,
  ];
  [["square", 4], ["triangle", 3], ["rhombus", 4], ["pentagon", 5], ["hexagon", 6]].forEach(([name, k], i) => {
    for (const p of [0, 1]) {
      items.push(
        item("shapeProperties", "procedural", "equalSidesTeen", "band1", {
          answer: k,
          answerType: "numberPad",
          display: { shapeC: { kind: "sidesByName", name }, promptText: eqPhr[p](name) },
        })
      );
    }
  });
  const diagPhrByBand = {
    band2: [
      (n) => `How many diagonals does a ${n} have?`,
      (n) => `Count the diagonals of a ${n}. How many diagonals are there?`,
    ],
    band3: [
      (n) => `Exactly how many diagonals does a ${n} contain?`,
      (n) => `Tally every diagonal of a ${n}. How many diagonals is that?`,
    ],
  };
  const DIAG = { square: 2, rectangle: 2, rhombus: 2, parallelogram: 2, trapezoid: 2, pentagon: 5, hexagon: 9, heptagon: 14, octagon: 20, nonagon: 27, decagon: 35 };
  const diagShapes = { band2: ["square", "rectangle", "pentagon", "rhombus", "trapezoid", "parallelogram", "hexagon"], band3: ["hexagon", "heptagon", "octagon", "nonagon", "decagon", "pentagon", "square"] };
  for (const band of ["band2", "band3"]) {
    diagShapes[band].forEach((name, i) => {
      for (const p of [0, 1]) {
        if (band === "band2" && i === 6 && p === 1) return;
        items.push(
          item("shapeProperties", "procedural", `diagonals_${band}`, band, {
            answer: DIAG[name],
            answerType: "numberPad",
            display: { shapeC: { kind: "diagonals", name, n: DIAG[name] }, promptText: diagPhrByBand[band][p](name) },
          })
        );
      }
    });
  }

  const raSumPhrByBand = {
    band1: [
      (a, b) => `A ${a} and a ${b} together have ? right angles`,
      (a, b) => `Count the right angles of a ${a} and a ${b} together. How many right angles is that?`,
    ],
    band2: [
      (a, b) => `Add the right angles of a ${a} and a ${b}. What right-angle total do you get?`,
      (a, b) => `Together, a ${a} and a ${b} hold ? right angles`,
    ],
    band3: [
      (a, b) => `Exactly how many right angles do a ${a} and a ${b} have combined?`,
      (a, b) => `Tally every right angle across a ${a} and a ${b}. How many right angles in all?`,
    ],
  };
  const raSums = {
    band1: [["square", "rectangle"], ["square", "right triangle"], ["rectangle", "right triangle"], ["square", "triangle"], ["rectangle", "triangle"], ["square", "square"], ["rectangle", "rectangle"], ["right triangle", "right triangle"], ["square", "pentagon"], ["rectangle", "pentagon"], ["right triangle", "pentagon"], ["square", "hexagon"], ["rectangle", "hexagon"], ["right triangle", "triangle"], ["triangle", "pentagon"], ["square", "trapezoid"], ["rectangle", "trapezoid"]],
    band2: [["square", "rhombus"], ["rectangle", "parallelogram"], ["right triangle", "trapezoid"], ["square", "parallelogram"], ["rectangle", "rhombus"], ["right triangle", "rhombus"], ["square", "heptagon"], ["rectangle", "heptagon"], ["right triangle", "parallelogram"], ["square", "trapezoid"], ["rectangle", "trapezoid"], ["right triangle", "heptagon"], ["square", "hexagon"], ["rectangle", "hexagon"], ["right triangle", "hexagon"], ["square", "pentagon"], ["rectangle", "pentagon"], ["right triangle", "pentagon"], ["square", "square"], ["rectangle", "rectangle"], ["square", "rectangle"], ["right triangle", "square"]],
    band3: [["square", "octagon"], ["rectangle", "nonagon"], ["right triangle", "decagon"], ["square", "scalene triangle"], ["rectangle", "octagon"], ["right triangle", "nonagon"], ["square", "decagon"], ["rectangle", "scalene triangle"], ["right triangle", "octagon"], ["square", "nonagon"], ["rectangle", "decagon"], ["right triangle", "scalene triangle"], ["square", "dodecagon"], ["rectangle", "dodecagon"], ["right triangle", "dodecagon"], ["square", "parallelogram"], ["rectangle", "parallelogram"], ["right triangle", "parallelogram"], ["square", "rhombus"], ["rectangle", "rhombus"], ["right triangle", "rhombus"], ["square", "trapezoid"]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    raSums[band].forEach(([a, b], i) => {
      const ra = byName(a).rightAngles;
      const rb = byName(b).rightAngles;
      items.push(
        item("shapeProperties", "procedural", `raSum_${band}`, band, {
          answer: ra + rb,
          answerType: "numberPad",
          display: { counting: { kind: "sum", parts: [ra, rb] }, promptText: raSumPhrByBand[band][i % 2](a, b) },
        })
      );
    });
  }

  return items;
}

export function shapePropertiesConceptual() {
  const items = [];
  let seed = 291;

  // Name from properties (choice).
  const riddlePhr = [
    (nm, clues) => `${nm} reads a shape riddle: ${clues} Which shape is it?`,
    (nm, clues) => `A riddle for ${nm}: ${clues} Name the shape.`,
  ];
  const riddles = {
    band1: [
      ["I have 3 sides and 3 corners.", "triangle", ["square", "rectangle", "pentagon"]],
      ["I have 4 equal sides and 4 right angles.", "square", ["rectangle", "triangle", "pentagon"]],
      ["I have 4 right angles, and my sides are not all equal.", "rectangle", ["square", "triangle", "hexagon"]],
      ["I have 5 sides and 5 corners.", "pentagon", ["square", "hexagon", "triangle"]],
      ["I have 6 sides and 6 corners.", "hexagon", ["pentagon", "octagon", "square"]],
      ["I have 3 corners and one of my angles is a right angle.", "right triangle", ["square", "rectangle", "hexagon"]],
      ["I have 4 sides and exactly 1 pair of parallel sides.", "trapezoid", ["square", "rectangle", "triangle"]],
      ["I have 8 sides and 8 corners.", "octagon", ["hexagon", "pentagon", "square"]],
    ],
    band2: [
      ["I have 4 equal sides but no right angles.", "rhombus", ["square", "rectangle", "trapezoid"]],
      ["I have 2 pairs of parallel sides but no right angles, and my sides are not all equal.", "parallelogram", ["rectangle", "rhombus", "trapezoid"]],
      ["I have exactly 1 pair of parallel sides.", "trapezoid", ["parallelogram", "rhombus", "rectangle"]],
      ["I have 7 sides.", "heptagon", ["hexagon", "octagon", "pentagon"]],
      ["I have 6 sides and 3 pairs of parallel sides.", "hexagon", ["pentagon", "octagon", "trapezoid"]],
      ["I have 3 sides and no equal sides at all.", "scalene triangle", ["triangle", "right triangle", "trapezoid"]],
      ["I have 4 right angles and 2 pairs of parallel sides, and my sides are not all equal.", "rectangle", ["square", "rhombus", "parallelogram"]],
      ["I have 4 equal sides and 4 right angles.", "square", ["rhombus", "rectangle", "parallelogram"]],
    ],
    band3: [
      ["I have 9 sides.", "nonagon", ["octagon", "decagon", "heptagon"]],
      ["I have 10 sides.", "decagon", ["nonagon", "dodecagon", "octagon"]],
      ["I have 12 sides.", "dodecagon", ["decagon", "octagon", "nonagon"]],
      ["I have 8 sides and 4 pairs of parallel sides.", "octagon", ["hexagon", "decagon", "square"]],
      ["I am a quadrilateral with 4 equal sides; my angles need not be right angles.", "rhombus", ["square", "rectangle", "trapezoid"]],
      ["I am a triangle with no line of symmetry.", "scalene triangle", ["right triangle", "triangle", "trapezoid"]],
      ["I am a quadrilateral with no parallel sides at all.", "kite shape", ["trapezoid", "parallelogram", "rhombus"]],
      ["I have 2 pairs of parallel sides and exactly 0 right angles, with all sides equal.", "rhombus", ["parallelogram", "square", "rectangle"]],
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    riddles[band].forEach(([clues, good, wrong], i) => {
      for (const p of [0, 1]) {
        items.push(
          item("shapeProperties", "conceptual", `riddle_${band}`, band, {
            answer: good,
            choices: shuffled([good, ...wrong], (seed += 1)),
            display: { shapeC: { kind: "authoredChoice" }, promptText: riddlePhr[p](nameAt(i * 3 + p * 5 + 9 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), clues) },
          })
        );
      }
    });
  }

  // Property claims judged (from the table).
  const claimPhr = [
    (nm, claim) => `${nm} claims: ${claim} Is ${nm} right?`,
    (nm, claim) => `${nm} tells the class: ${claim} Is that right?`,
  ];
  const claims = {
    band1: [["A square has 4 right angles.", true], ["A triangle has a right angle every time.", false], ["A rectangle has 4 right angles.", true], ["A pentagon has 5 sides.", true], ["A square's sides are all different lengths.", false], ["A rectangle's opposite sides are the same length.", true], ["A triangle has 4 corners.", false], ["A hexagon has 6 corners.", true], ["A square is missing one corner.", false], ["A pentagon has 4 sides.", false], ["A triangle has 3 sides.", true], ["A rectangle has 5 sides.", false], ["A hexagon has 5 sides.", false], ["A square has 4 equal sides.", true], ["A pentagon has 5 corners.", true], ["A rectangle has 2 long sides and 2 short sides.", true], ["A triangle can have 2 right angles.", false], ["A hexagon has 6 sides.", true]],
    band2: [["A rhombus has 4 equal sides.", true], ["A trapezoid has 2 pairs of parallel sides.", false], ["A parallelogram has 2 pairs of parallel sides.", true], ["A rhombus always has right angles.", false], ["A trapezoid has exactly 1 pair of parallel sides.", true], ["A parallelogram always has 4 right angles.", false], ["A heptagon has 7 sides.", true], ["A hexagon has 3 pairs of parallel sides.", true], ["A rhombus has 5 sides.", false], ["A trapezoid has 4 sides.", true], ["A parallelogram has 3 sides.", false], ["A heptagon has 8 sides.", false], ["A right triangle has exactly 1 right angle.", true], ["A hexagon has no parallel sides.", false], ["A scalene triangle has no equal sides.", true], ["A rhombus has no parallel sides.", false], ["A rhombus has 2 pairs of parallel sides.", true], ["A trapezoid has 3 parallel pairs.", false], ["A parallelogram has 4 vertices.", true]],
    band3: [["Every square is a rhombus.", true], ["Every rhombus is a square.", false], ["Every square is a rectangle.", true], ["Every rectangle is a square.", false], ["Every rectangle is a parallelogram.", true], ["Every parallelogram is a rectangle.", false], ["Every square is a parallelogram.", true], ["Every trapezoid is a parallelogram.", false], ["Every rhombus is a parallelogram.", true], ["Every parallelogram is a trapezoid with two parallel pairs... actually a quadrilateral.", null], ["A dodecagon has 12 sides.", true], ["A nonagon has 10 sides.", false], ["Every equilateral triangle has 3 lines of symmetry.", true], ["Every scalene triangle has 1 line of symmetry.", false], ["A decagon has 10 vertices.", true], ["An octagon has 6 sides.", false], ["Every square has 4 lines of symmetry.", true], ["Every rectangle has 4 lines of symmetry.", false], ["A regular decagon has 5 pairs of parallel sides.", true], ["A regular nonagon has parallel sides.", false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    claims[band].forEach(([claim, ok], i) => {
      if (ok === null) return;
      items.push(
        item("shapeProperties", "conceptual", `claimJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { shapeC: { kind: "authored" }, promptText: claimPhr[i % 2](nameAt(i * 3 + 10 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), claim), truth: ok },
        })
      );
    });
  }

  // Which shape fits the single property (choice).
  const fitPhr = [
    (nm, prop) => `${nm} hunts for a shape with ${prop}. Which shape works?`,
    (nm, prop) => `Which shape has ${prop}? ${nm} checks each option.`,
  ];
  const fits = {
    band1: [["exactly 3 corners", "triangle", ["square", "pentagon", "hexagon"]], ["exactly 4 right angles and equal sides", "square", ["triangle", "pentagon", "trapezoid"]], ["exactly 5 corners", "pentagon", ["square", "hexagon", "triangle"]], ["exactly 6 sides", "hexagon", ["pentagon", "square", "triangle"]], ["exactly 4 right angles with sides not all equal", "rectangle", ["square", "triangle", "pentagon"]], ["one right angle and 3 sides", "right triangle", ["square", "hexagon", "pentagon"]], ["more corners than a pentagon", "hexagon", ["square", "triangle", "rectangle"]], ["fewer sides than a square", "triangle", ["pentagon", "hexagon", "rectangle"]]],
    band2: [["exactly 1 pair of parallel sides", "trapezoid", ["square", "rhombus", "parallelogram"]], ["4 equal sides and no right angles", "rhombus", ["square", "rectangle", "trapezoid"]], ["parallel sides in 2 pairs but no right angles, sides unequal", "parallelogram", ["rectangle", "rhombus", "square"]], ["exactly 7 sides", "heptagon", ["hexagon", "octagon", "pentagon"]], ["3 pairs of parallel sides", "hexagon", ["pentagon", "trapezoid", "triangle"]], ["no equal sides and 3 corners", "scalene triangle", ["triangle", "right triangle", "square"]], ["more sides than a hexagon but fewer than an octagon", "heptagon", ["pentagon", "nonagon", "square"]], ["4 sides with only one parallel pair", "trapezoid", ["rhombus", "rectangle", "parallelogram"]]],
    band3: [["exactly 9 sides", "nonagon", ["octagon", "decagon", "heptagon"]], ["exactly 10 vertices", "decagon", ["nonagon", "dodecagon", "octagon"]], ["exactly 12 sides", "dodecagon", ["decagon", "nonagon", "octagon"]], ["4 pairs of parallel sides", "octagon", ["hexagon", "square", "trapezoid"]], ["zero lines of symmetry among the triangles", "scalene triangle", ["triangle", "right triangle", "square"]], ["equal sides but angles that need not be right", "rhombus", ["square", "rectangle", "trapezoid"]], ["more sides than a decagon", "dodecagon", ["nonagon", "octagon", "hexagon"]], ["fewer sides than a nonagon but more than a heptagon", "octagon", ["hexagon", "decagon", "pentagon"]]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    fits[band].forEach(([prop, good, wrong], i) => {
      for (const p of [0, 1]) {
        items.push(
          item("shapeProperties", "conceptual", `fitPick_${band}`, band, {
            answer: good,
            choices: shuffled([good, ...wrong], (seed += 1)),
            display: { shapeC: { kind: "authoredChoice" }, promptText: fitPhr[p](nameAt(i * 3 + p * 7 + 11 + (band === "band2" ? 7 : band === "band3" ? 13 : 0)), prop) },
          })
        );
      }
    });
  }

  return items;
}
