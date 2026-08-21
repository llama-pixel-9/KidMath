/* linesShapes application stories — shapes met in craft, building, and the
 * neighborhood. Table-checkable claims ride display.shapeC; compositions
 * and spotted-shape counts are authored truths. Band-1 prompts <= 20.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";
import { LEVELS, nameAt, byName } from "./linesShapesTemplates.js";

const B1 = "band1";
const B2 = "band2";
const B3 = "band3";

const mk = (subskill, structureType, band, question) => {
  if (band === B1) {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 story exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "linesShapes",
    subskill,
    itemFamily: "application",
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const BAND_TAG = { band1: "", band2: " Count carefully.", band3: " Double-check your count." };
const JUDGE_TAG = { band1: "", band2: " Look closely.", band3: " Study it before answering." };

function cycle(count, space, skeletons, offset, emit) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(emit(space[i % space.length], skeletons[(i + offset) % skeletons.length], nameAt(i + offset), i));
  }
  return items;
}

export function buildStoryItems() {
  const items = [];
  const OFF = { band1: 0, band2: 7, band3: 13 };

  /* shapeSides app: craft sticks and fence posts. */
  const STICKS_SKELETONS = [
    (nm, shape) => `${nm} builds a ${shape} out of craft sticks, one stick per side. How many sticks does ${nm} need?`,
    (nm, shape) => `To lay a ${shape} garden border with one board per side, how many boards does ${nm} buy?`,
    (nm, shape) => `${nm} bends wire into a ${shape}, one straight piece per side. How many pieces is that?`,
  ];
  const sticksEmit = (band) => ([shape], sk, nm) =>
    mk("shapeSides", `storySticks_${band}`, band, {
      answer: byName(shape).sides,
      answerType: "numberPad",
      display: { shapeC: { kind: "sidesByName", name: shape }, promptText: sk(nm, shape) + BAND_TAG[band] },
    });
  items.push(...cycle(17, [["triangle"], ["square"], ["pentagon"], ["rectangle"], ["hexagon"], ["triangle"], ["square"], ["pentagon"], ["rectangle"], ["hexagon"], ["triangle"], ["square"], ["pentagon"], ["rectangle"], ["hexagon"], ["triangle"], ["square"]], STICKS_SKELETONS, 0, sticksEmit(B1)));
  items.push(...cycle(17, [["hexagon"], ["trapezoid"], ["heptagon"], ["rhombus"], ["parallelogram"], ["hexagon"], ["trapezoid"], ["heptagon"], ["rhombus"], ["parallelogram"], ["hexagon"], ["trapezoid"], ["heptagon"], ["rhombus"], ["parallelogram"], ["hexagon"], ["trapezoid"]], STICKS_SKELETONS, 1, sticksEmit(B2)));
  items.push(...cycle(17, [["octagon"], ["nonagon"], ["decagon"], ["dodecagon"], ["octagon"], ["nonagon"], ["decagon"], ["dodecagon"], ["octagon"], ["nonagon"], ["decagon"], ["dodecagon"], ["octagon"], ["nonagon"], ["decagon"], ["dodecagon"], ["octagon"]], STICKS_SKELETONS, 2, sticksEmit(B3)));
  /* shapeSides app: corners for fasteners. */
  const CORNER_SKELETONS = [
    (nm, shape) => `${nm} pins a paper ${shape} to the board with one pin in every corner. How many pins does ${nm} use?`,
    (nm, shape) => `A ${shape} tile gets one dab of glue at each vertex. How many dabs does ${nm} squeeze?`,
    (nm, shape) => `${nm} sews a bead onto every corner of a ${shape} patch. How many beads is that?`,
  ];
  const cornersEmit = (band) => ([shape], sk, nm) =>
    mk("shapeSides", `storyCorners_${band}`, band, {
      answer: byName(shape).vertices,
      answerType: "numberPad",
      display: { shapeC: { kind: "verticesByName", name: shape }, promptText: sk(nm, shape) + BAND_TAG[band] },
    });
  items.push(...cycle(17, [["square"], ["triangle"], ["rectangle"], ["pentagon"], ["hexagon"], ["square"], ["triangle"], ["rectangle"], ["pentagon"], ["hexagon"], ["square"], ["triangle"], ["rectangle"], ["pentagon"], ["hexagon"], ["square"], ["triangle"]], CORNER_SKELETONS, 1, cornersEmit(B1)));
  items.push(...cycle(17, [["trapezoid"], ["rhombus"], ["hexagon"], ["parallelogram"], ["heptagon"], ["trapezoid"], ["rhombus"], ["hexagon"], ["parallelogram"], ["heptagon"], ["trapezoid"], ["rhombus"], ["hexagon"], ["parallelogram"], ["heptagon"], ["trapezoid"], ["rhombus"]], CORNER_SKELETONS, 2, cornersEmit(B2)));
  items.push(...cycle(17, [["nonagon"], ["decagon"], ["octagon"], ["dodecagon"], ["nonagon"], ["decagon"], ["octagon"], ["dodecagon"], ["nonagon"], ["decagon"], ["octagon"], ["dodecagon"], ["nonagon"], ["decagon"], ["octagon"], ["dodecagon"], ["nonagon"]], CORNER_SKELETONS, 0, cornersEmit(B3)));
  /* shapeSides app: sticks for two shapes (sum). */
  const TWO_SHAPES_SKELETONS = [
    (nm, a, b) => `${nm} frames a ${a} and a ${b} with straws, one straw per side. How many straws in all?`,
    (nm, a, b) => `One art project uses a ${a} and a ${b}, each side made of one pipe cleaner. How many pipe cleaners does ${nm} need?`,
    (nm, a, b) => `${nm} chalks a ${a} and a ${b} on the path, stick by stick. How many sticks of chalk lines is that?`,
  ];
  const twoShapesEmit = (band) => ([a, b], sk, nm) =>
    mk("shapeSides", `storyTwoShapes_${band}`, band, {
      answer: byName(a).sides + byName(b).sides,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [byName(a).sides, byName(b).sides] }, promptText: sk(nm, a, b) + BAND_TAG[band] },
    });
  items.push(...cycle(17, [["triangle", "square"], ["square", "pentagon"], ["triangle", "pentagon"], ["rectangle", "triangle"], ["pentagon", "rectangle"], ["square", "rectangle"], ["triangle", "hexagon"], ["hexagon", "square"], ["pentagon", "hexagon"], ["triangle", "square"], ["square", "pentagon"], ["rectangle", "hexagon"], ["triangle", "rectangle"], ["pentagon", "square"], ["hexagon", "triangle"], ["rectangle", "pentagon"], ["square", "hexagon"]], TWO_SHAPES_SKELETONS, 2, twoShapesEmit(B1)));
  items.push(...cycle(17, [["hexagon", "trapezoid"], ["heptagon", "rhombus"], ["hexagon", "parallelogram"], ["heptagon", "trapezoid"], ["rhombus", "hexagon"], ["parallelogram", "heptagon"], ["trapezoid", "hexagon"], ["heptagon", "hexagon"], ["rhombus", "trapezoid"], ["parallelogram", "hexagon"], ["heptagon", "parallelogram"], ["hexagon", "hexagon"], ["trapezoid", "heptagon"], ["rhombus", "parallelogram"], ["heptagon", "heptagon"], ["hexagon", "rhombus"], ["trapezoid", "parallelogram"]], TWO_SHAPES_SKELETONS, 0, twoShapesEmit(B2)));
  items.push(...cycle(17, [["octagon", "hexagon"], ["nonagon", "square"], ["decagon", "triangle"], ["octagon", "octagon"], ["dodecagon", "pentagon"], ["nonagon", "hexagon"], ["decagon", "octagon"], ["dodecagon", "octagon"], ["nonagon", "decagon"], ["dodecagon", "dodecagon"], ["octagon", "nonagon"], ["decagon", "dodecagon"], ["nonagon", "octagon"], ["dodecagon", "hexagon"], ["octagon", "decagon"], ["nonagon", "dodecagon"], ["decagon", "decagon"]], TWO_SHAPES_SKELETONS, 1, twoShapesEmit(B3)));

  /* symmetryLines app: folded crafts. */
  const FOLD_SKELETONS = [
    (nm, shape) => `${nm} cuts a paper ${shape} and finds every fold that makes matching halves. How many folds does ${nm} find?`,
    (nm, shape) => `A ${shape} cookie cutter gets tested for matching-half folds. How many such folds does ${nm} count?`,
    (nm, shape) => `${nm}'s ${shape} kite design must show every line of symmetry. How many lines does ${nm} draw?`,
  ];
  const foldEmit = (band) => ([shape], sk, nm) =>
    mk("symmetryLines", `storyFolds_${band}`, band, {
      answer: byName(shape).symmetry,
      answerType: "numberPad",
      display: { shapeC: { kind: "symmetryByName", name: shape }, promptText: sk(nm, shape) + BAND_TAG[band] },
    });
  items.push(...cycle(17, [["square"], ["rectangle"], ["triangle"], ["trapezoid"], ["square"], ["rectangle"], ["triangle"], ["trapezoid"], ["square"], ["rectangle"], ["triangle"], ["trapezoid"], ["square"], ["rectangle"], ["triangle"], ["trapezoid"], ["square"]], FOLD_SKELETONS, 0, foldEmit(B1)));
  items.push(...cycle(17, [["pentagon"], ["hexagon"], ["right triangle"], ["square"], ["heptagon"], ["pentagon"], ["hexagon"], ["right triangle"], ["square"], ["heptagon"], ["pentagon"], ["hexagon"], ["right triangle"], ["square"], ["heptagon"], ["pentagon"], ["hexagon"]], FOLD_SKELETONS, 1, foldEmit(B2)));
  items.push(...cycle(17, [["octagon"], ["nonagon"], ["decagon"], ["dodecagon"], ["scalene triangle"], ["octagon"], ["nonagon"], ["decagon"], ["dodecagon"], ["scalene triangle"], ["octagon"], ["nonagon"], ["decagon"], ["dodecagon"], ["scalene triangle"], ["octagon"], ["nonagon"]], FOLD_SKELETONS, 2, foldEmit(B3)));
  /* symmetryLines app: mirror-half judged crafts. */
  const MIRROR_SKELETONS = [
    (nm, thing, ok) => `${nm} paints ${thing} and folds the paper down the middle while wet. ${nm} expects the halves to match. Will they?`,
    (nm, thing, ok) => `For the mirror-art wall, ${nm} submits ${thing}. Do its two halves match across the middle?`,
    (nm, thing, ok) => `${nm} checks ${thing} with a small mirror on its middle line. Does the mirror image match the hidden half?`,
  ];
  const mirrorEmit = (band) => ([thing, ok], sk, nm) =>
    mk("symmetryLines", `storyMirror_${band}`, band, {
      answer: ok ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { shapeC: { kind: "authored" }, promptText: sk(nm, thing, ok) + JUDGE_TAG[band], truth: ok },
    });
  items.push(...cycle(17, [["a butterfly with matching wings", true], ["a capital letter F", false], ["a heart", true], ["a capital letter J", false], ["a snowflake", true], ["a capital letter R", false], ["a smiley face", true], ["a capital letter G", false], ["a capital letter A", true], ["a capital letter P", false], ["a capital letter M", true], ["a capital letter Z", false], ["a capital letter T", true], ["a capital letter S", false], ["a capital letter V", true], ["a capital letter K", false], ["a capital letter U", true]], MIRROR_SKELETONS, 1, mirrorEmit(B1)));
  items.push(...cycle(17, [["a paper square", true], ["a paper parallelogram", false], ["a paper rectangle", true], ["a paper scalene triangle", false], ["a paper equilateral triangle", true], ["a letter N banner", false], ["a paper pentagon", true], ["a letter Q flag", false], ["a paper hexagon", true], ["a letter L pennant", false], ["a paper heart", true], ["a letter Z streamer", false], ["a paper circle", true], ["a letter G card", false], ["a paper trapezoid", true], ["a letter R poster", false], ["a paper star", true]], MIRROR_SKELETONS, 2, mirrorEmit(B2)));
  items.push(...cycle(17, [["a regular octagon banner", true], ["a scalene triangle pennant", false], ["a regular decagon medallion", true], ["a parallelogram sticker", false], ["a regular nonagon badge", true], ["a letter P mosaic", false], ["a regular dodecagon clock face", true], ["a letter J mural", false], ["a square quilt block", true], ["a letter S weathervane", false], ["a regular hexagon tile", true], ["a letter K flag", false], ["an equilateral triangle sail", true], ["a letter N kite", false], ["a rectangle door design", true], ["a letter G stencil", false], ["a circle target", true]], MIRROR_SKELETONS, 0, mirrorEmit(B3)));

  /* shapeProperties app: builders and right angles. */
  const RIGHT_SKELETONS = [
    (nm, shape) => `${nm} braces every right angle of a ${shape} picture frame with a corner bracket. How many brackets does ${nm} need?`,
    (nm, shape) => `Each square corner of ${nm}'s ${shape} shelf gets one screw. How many screws is that?`,
    (nm, shape) => `${nm} tapes every right angle of a ${shape} poster board. How many pieces of tape are used?`,
  ];
  const rightEmit = (band) => ([shape], sk, nm) =>
    mk("shapeProperties", `storyRightAngles_${band}`, band, {
      answer: byName(shape).rightAngles,
      answerType: "numberPad",
      display: { shapeC: { kind: "rightAnglesByName", name: shape }, promptText: sk(nm, shape) },
    });
  items.push(...cycle(17, [["square"], ["rectangle"], ["right triangle"], ["square"], ["rectangle"], ["right triangle"], ["square"], ["rectangle"], ["right triangle"], ["square"], ["rectangle"], ["right triangle"], ["square"], ["rectangle"], ["right triangle"], ["square"], ["rectangle"]], RIGHT_SKELETONS, 0, rightEmit(B1)));
  /* shapeProperties app: parallel pairs in structures. */
  const PARALLEL_SKELETONS = [
    (nm, shape) => `${nm} paints each pair of parallel sides of a ${shape} sign the same color. How many colors does ${nm} need?`,
    (nm, shape) => `A ${shape} garden bed gets matching trim on every parallel pair of sides. How many trim colors does ${nm} pick?`,
    (nm, shape) => `${nm} labels every pair of parallel sides on a ${shape} banner. How many labels is that?`,
  ];
  const parallelEmit = (band) => ([shape], sk, nm) =>
    mk("shapeProperties", `storyParallel_${band}`, band, {
      answer: byName(shape).parallelPairs,
      answerType: "numberPad",
      display: { shapeC: { kind: "parallelPairsByName", name: shape }, promptText: sk(nm, shape) },
    });
  items.push(...cycle(17, [["square"], ["rectangle"], ["trapezoid"], ["parallelogram"], ["hexagon"], ["rhombus"], ["square"], ["rectangle"], ["trapezoid"], ["parallelogram"], ["hexagon"], ["rhombus"], ["square"], ["rectangle"], ["trapezoid"], ["parallelogram"], ["hexagon"]], PARALLEL_SKELETONS, 1, parallelEmit(B2)));
  const DIAG_SKELETONS = [
    (nm, shape, n) => `${nm} strings ribbon across every diagonal of a ${shape} display board. How many ribbons does ${nm} cut?`,
    (nm, shape, n) => `A ${shape} kite frame needs a rod along each diagonal. How many rods does ${nm} add?`,
    (nm, shape, n) => `${nm} draws all the diagonals of a chalk ${shape}. How many chalk diagonals appear?`,
  ];
  const DIAG = { square: 2, rectangle: 2, rhombus: 2, trapezoid: 2, pentagon: 5, hexagon: 9, heptagon: 14, octagon: 20 };
  const diagEmit = ([shape], sk, nm) =>
    mk("shapeProperties", "storyDiagonals_band3", B3, {
      answer: DIAG[shape],
      answerType: "numberPad",
      display: { shapeC: { kind: "diagonals", name: shape, n: DIAG[shape] }, promptText: sk(nm, shape, DIAG[shape]) },
    });
  items.push(...cycle(17, [["square"], ["pentagon"], ["hexagon"], ["heptagon"], ["octagon"], ["rectangle"], ["rhombus"], ["trapezoid"], ["pentagon"], ["hexagon"], ["square"], ["heptagon"], ["octagon"], ["pentagon"], ["rectangle"], ["hexagon"], ["rhombus"]], DIAG_SKELETONS, 2, diagEmit));
  /* shapeProperties app bands 1 and 3 extras: equal-side beads / right angles big. */
  const BEAD_SKELETONS = [
    (nm, shape, n) => `Every side of ${nm}'s ${shape} charm is the same length, and each side gets one bead. How many beads is that?`,
    (nm, shape, n) => `${nm} glues one gem on each equal side of a ${shape} ornament. How many gems does ${nm} glue?`,
    (nm, shape, n) => `A ${shape} badge gets one stitch per equal side from ${nm}. How many stitches are sewn?`,
  ];
  const beadEmit = ([shape], sk, nm) =>
    mk("shapeProperties", "storyEqualSides_band1", B1, {
      answer: byName(shape).sides,
      answerType: "numberPad",
      display: { shapeC: { kind: "sidesByName", name: shape }, promptText: sk(nm, shape) },
    });
  items.push(...cycle(17, [["square"], ["triangle"], ["pentagon"], ["hexagon"], ["square"], ["triangle"], ["pentagon"], ["hexagon"], ["square"], ["triangle"], ["pentagon"], ["hexagon"], ["square"], ["triangle"], ["pentagon"], ["hexagon"], ["square"]], BEAD_SKELETONS, 2, beadEmit));
  const RA_BIG_SKELETONS = [
    (nm, k) => `${nm} tiles a wall with ${k} square tiles and marks every right angle on every tile. How many right angles get marked?`,
    (nm, k) => `Each of ${nm}'s ${k} rectangular cards has all its right angles taped. How many pieces of tape is that?`,
    (nm, k) => `${nm} checks all right angles on ${k} square window panes. How many right angles does ${nm} check?`,
  ];
  const raBigEmit = ([k], sk, nm) =>
    mk("shapeProperties", "storyRightAnglesBig_band3", B3, {
      answer: k * 4,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: Array.from({ length: k }, () => 4) }, promptText: sk(nm, k) },
    });
  items.push(...cycle(17, [[3], [5], [7], [4], [6], [8], [9], [2], [10], [12], [11], [5], [7], [6], [8], [4], [9]], RA_BIG_SKELETONS, 0, raBigEmit));
  /* shapeProperties app band2 second pattern: symmetry lines painted. */
  const SYM_PAINT_SKELETONS = [
    (nm, shape) => `${nm} paints every line of symmetry on a ${shape} mural stencil. How many painted lines is that?`,
    (nm, shape) => `A ${shape} logo shows all its lines of symmetry in silver. How many silver lines does ${nm} draw?`,
    (nm, shape) => `${nm} embroiders each line of symmetry of a ${shape} patch. How many embroidered lines are there?`,
  ];
  const symPaintEmit = ([shape], sk, nm) =>
    mk("shapeProperties", "storySymPaint_band2", B2, {
      answer: byName(shape).symmetry,
      answerType: "numberPad",
      display: { shapeC: { kind: "symmetryByName", name: shape }, promptText: sk(nm, shape) },
    });
  items.push(...cycle(17, [["square"], ["rectangle"], ["triangle"], ["pentagon"], ["hexagon"], ["trapezoid"], ["square"], ["rectangle"], ["triangle"], ["pentagon"], ["hexagon"], ["trapezoid"], ["square"], ["rectangle"], ["triangle"], ["pentagon"], ["hexagon"]], SYM_PAINT_SKELETONS, 1, symPaintEmit));

  /* shapeClassification app: sorting bins. */
  const BIN_SKELETONS = [
    (nm, list, prop, n) => `${nm} sorts blocks into a bin for shapes with ${prop}. From ${list}, how many blocks land in the bin?`,
    (nm, list, prop, n) => `A sorting game asks ${nm} to keep only shapes with ${prop}. Out of ${list}, how many shapes are kept?`,
    (nm, list, prop, n) => `${nm}'s robot grabs every block with ${prop}. Given ${list}, how many blocks does it grab?`,
  ];
  const binEmit = (band) => ([list, prop, n], sk, nm) =>
    mk("shapeClassification", `storyBins_${band}`, band, {
      answer: n,
      answerType: "numberPad",
      display: { shapeC: { kind: "authoredCount" }, promptText: sk(nm, list, prop, n) + BAND_TAG[band] },
    });
  items.push(...cycle(17, [
    ["a triangle, a square, and a circle", "straight sides only", 2],
    ["two squares and a triangle", "exactly 4 sides", 2],
    ["a pentagon, a square, and a triangle", "exactly 5 sides", 1],
    ["a hexagon, two triangles, and a square", "exactly 3 sides", 2],
    ["three rectangles and a pentagon", "exactly 4 sides", 3],
    ["a circle, an oval, and a square", "corners", 1],
    ["two hexagons and a triangle", "exactly 6 sides", 2],
    ["a square, a rectangle, and a trapezoid", "exactly 4 sides", 3],
    ["two pentagons and a hexagon", "exactly 5 sides", 2],
    ["a triangle, a circle, and a rectangle", "exactly 3 sides", 1],
    ["four squares and a triangle", "exactly 4 sides", 4],
    ["a hexagon, a pentagon, and a square", "more than 4 sides", 2],
    ["two triangles and two squares", "exactly 3 sides", 2],
    ["a circle and two rectangles", "straight sides only", 2],
    ["three pentagons and a triangle", "exactly 5 sides", 3],
    ["a square, a hexagon, and a circle", "exactly 6 sides", 1],
    ["two trapezoids and a pentagon", "exactly 4 sides", 2],
  ], BIN_SKELETONS, 0, binEmit(B1)));
  items.push(...cycle(17, [
    ["a rhombus, a trapezoid, and a hexagon", "exactly 4 sides", 2],
    ["a parallelogram, a square, and a pentagon", "2 pairs of parallel sides", 2],
    ["two trapezoids and a rhombus", "exactly 1 pair of parallel sides", 2],
    ["a square, a rectangle, and a rhombus", "4 right angles", 2],
    ["a hexagon, a heptagon, and an octagon", "an even number of sides", 2],
    ["two rhombuses and a rectangle", "all sides equal", 2],
    ["a right triangle, a square, and a trapezoid", "at least one right angle", 2],
    ["three parallelograms and a trapezoid", "2 pairs of parallel sides", 3],
    ["a pentagon, a heptagon, and a hexagon", "an odd number of sides", 2],
    ["two squares and two trapezoids", "4 right angles", 2],
    ["a rhombus, a parallelogram, and a right triangle", "exactly 4 vertices", 2],
    ["a heptagon and two hexagons", "exactly 7 sides", 1],
    ["two rectangles and a rhombus", "4 right angles", 2],
    ["a trapezoid, a square, and a hexagon", "exactly 1 pair of parallel sides", 1],
    ["three rhombuses and a square", "all sides equal", 4],
    ["an octagon, a hexagon, and a pentagon", "more than 5 sides", 2],
    ["two parallelograms and a pentagon", "exactly 4 sides", 2],
  ], BIN_SKELETONS, 1, binEmit(B2)));
  items.push(...cycle(17, [
    ["a nonagon, a decagon, and an octagon", "an even number of sides", 2],
    ["two dodecagons and a nonagon", "exactly 12 sides", 2],
    ["a square, a rhombus, and a trapezoid", "2 pairs of parallel sides", 2],
    ["three octagons and a hexagon", "exactly 8 sides", 3],
    ["a decagon, a nonagon, and a heptagon", "an odd number of sides", 2],
    ["two scalene triangles and an equilateral triangle", "no equal sides", 2],
    ["a square, a rectangle, and a parallelogram", "4 right angles", 2],
    ["two decagons and a dodecagon", "at least 10 sides", 3],
    ["a rhombus, a square, and a rectangle", "all sides equal", 2],
    ["an octagon, a nonagon, and a decagon", "more than 8 sides", 2],
    ["two heptagons and an octagon", "exactly 7 sides", 2],
    ["a dodecagon, an octagon, and a square", "an even number of sides", 3],
    ["three nonagons and a decagon", "exactly 9 sides", 3],
    ["a trapezoid, a parallelogram, and a rhombus", "exactly 1 pair of parallel sides", 1],
    ["two equilateral triangles and a scalene triangle", "at least one line of symmetry", 2],
    ["a hexagon, an octagon, and a decagon", "more than 6 sides", 2],
    ["two squares and two rhombuses", "4 right angles", 2],
  ], BIN_SKELETONS, 2, binEmit(B3)));
  /* shapeClassification app: rename stories (judged). */
  const RENAME_SKELETONS = [
    (nm, claim, ok) => `At the museum, ${nm} reads a label: ${claim} Is the label right?`,
    (nm, claim, ok) => `${nm}'s puzzle book claims: ${claim} Is the book right?`,
    (nm, claim, ok) => `A quiz card tells ${nm}: ${claim} Is the card right?`,
  ];
  const renameEmit = (band) => ([claim, ok], sk, nm) =>
    mk("shapeClassification", `storyRename_${band}`, band, {
      answer: ok ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { shapeC: { kind: "authored" }, promptText: sk(nm, claim, ok) + JUDGE_TAG[band], truth: ok },
    });
  items.push(...cycle(17, [["Every square window is a four-sided shape.", true], ["Every triangle flag has four corners.", false], ["Every rectangular door has 4 right angles.", true], ["Every pentagon sign has 6 sides.", false], ["Every hexagonal tile has 6 corners.", true], ["Every square napkin has unequal sides.", false], ["Every triangular slice has 3 sides.", true], ["Every rectangular rug has 3 corners.", false], ["Every pentagon badge has 5 corners.", true], ["Every hexagonal bolt has 5 sides.", false], ["Every square sticky note has equal sides.", true], ["Every triangle ramp has a curved side.", false], ["Every rectangle poster has 4 corners.", true], ["Every pentagon patio stone has 4 sides.", false], ["Every hexagon honeycomb cell has 6 sides.", true], ["Every square cracker has 5 corners.", false], ["Every triangle tent face has 3 corners.", true]], RENAME_SKELETONS, 1, renameEmit(B1)));
  items.push(...cycle(17, [["This square picture frame is also a rectangle.", true], ["This rectangular tabletop is also a square.", false], ["This square coaster is also a rhombus.", true], ["This trapezoid lampshade is also a parallelogram.", false], ["This rhombus kite is also a parallelogram.", true], ["This parallelogram banner is also a rectangle.", false], ["This rectangular window is also a parallelogram.", true], ["This rhombus tile is also a square.", false], ["This square garden bed is also a parallelogram.", true], ["This trapezoid roof face is also a rectangle.", false], ["This right-triangle ramp is still a triangle.", true], ["This hexagonal gazebo floor is a quadrilateral.", false], ["This square chess board is a quadrilateral.", true], ["This heptagon coin is a hexagon.", false], ["This rectangular field is a quadrilateral.", true], ["This scalene-triangle sail is a quadrilateral.", false], ["This rhombus charm is a quadrilateral.", true]], RENAME_SKELETONS, 2, renameEmit(B2)));
  items.push(...cycle(17, [["This square clock is a regular polygon.", true], ["This rectangular whiteboard is a regular polygon.", false], ["This equilateral-triangle pennant is a regular polygon.", true], ["This scalene-triangle bracket is a regular polygon.", false], ["This rhombus with right angles is a square.", true], ["This parallelogram path stone can be called a trapezoid.", false], ["This octagonal stop sign is a polygon.", true], ["This decagon medal has 12 sides.", false], ["This dodecagon clock face has 12 sides.", true], ["This nonagon plaque is a quadrilateral.", false], ["This equal-sided parallelogram pendant is a rhombus.", true], ["This kite-shaped charm has parallel sides.", false], ["This square mosaic tile is both a rhombus and a rectangle.", true], ["This decagon table has fewer sides than an octagon.", false], ["This right-triangle set square is a polygon.", true], ["This hexagon paver has an odd number of sides.", false], ["This scalene-triangle shard is still a triangle.", true]], RENAME_SKELETONS, 0, renameEmit(B3)));

  /* lineFigures app: streets and strings. */
  const STREET_SKELETONS = [
    (nm, thing, good) => `On ${nm}'s walk, ${thing}. Which figure pair does that model?`,
    (nm, thing, good) => `${nm} sketches the scene: ${thing}. What kind of line pair is that?`,
    (nm, thing, good) => `In the town map ${nm} draws, ${thing}. Which line pair matches?`,
  ];
  const streetEmit = (band) => ([thing, good, wrong], sk, nm, i) =>
    mk("lineFigures", `storyStreets_${band}`, band, {
      answer: good,
      choices: shuffled([good, ...wrong], i + 21),
      display: { shapeC: { kind: "authoredChoice" }, promptText: sk(nm, thing, good) },
    });
  items.push(...cycle(17, [
    ["two straight roads never meet", "parallel lines", ["perpendicular lines", "intersecting lines", "curved lines"]],
    ["two paths cross at a square corner", "perpendicular lines", ["parallel lines", "curved lines", "rays"]],
    ["two trails cross at a slant", "intersecting lines", ["parallel lines", "perpendicular lines... hm", "curves"]],
    ["train rails run side by side", "parallel lines", ["intersecting lines", "perpendicular lines", "points"]],
    ["a crosswalk meets the curb squarely", "perpendicular lines", ["parallel lines", "curved lines", "points"]],
    ["two shoelaces cross once", "intersecting lines", ["parallel lines", "circles", "points"]],
    ["ladder rails run straight up together", "parallel lines", ["perpendicular lines", "curves", "rays"]],
    ["a plus-sign intersection", "perpendicular lines", ["parallel lines", "curves", "points"]],
    ["two straws lie crossed on the table", "intersecting lines", ["parallel lines", "circles", "rays"]],
    ["swim-lane ropes stretch side by side", "parallel lines", ["perpendicular lines", "points", "curves"]],
    ["a window frame corner", "perpendicular lines", ["parallel lines", "curves", "rays"]],
    ["two jump ropes cross on the ground", "intersecting lines", ["parallel lines", "points", "circles"]],
    ["bookshelf shelves stack evenly", "parallel lines", ["perpendicular lines", "curves", "points"]],
    ["a capital T drawn with a marker", "perpendicular lines", ["parallel lines", "curves", "circles"]],
    ["two chopsticks crossed", "intersecting lines", ["parallel lines", "rays", "points"]],
    ["notebook lines run down the page", "parallel lines", ["perpendicular lines", "points", "curves"]],
    ["a fence post meets the ground squarely", "perpendicular lines", ["parallel lines", "curves", "rays"]],
  ].map((r) => { if (r[2][1] && r[2][1].includes("hm")) r[2][1] = "curved lines"; return r; }), STREET_SKELETONS, 0, streetEmit(B3)));
  const STRING_SKELETONS = [
    (nm, thing, good) => `${nm} looks at ${thing}. Which math figure is it most like?`,
    (nm, thing, good) => `In art class, ${nm} models ${thing} with a figure. Which one fits?`,
    (nm, thing, good) => `${nm}'s scavenger hunt card shows ${thing}. Which figure should ${nm} mark?`,
  ];
  const stringEmit = (band) => ([thing, good, wrong], sk, nm, i) =>
    mk("lineFigures", `storyStrings_${band}`, band, {
      answer: good,
      choices: shuffled([good, ...wrong], i + 23),
      display: { shapeC: { kind: "authoredChoice" }, promptText: sk(nm, thing, good) },
    });
  items.push(...cycle(17, [
    ["a stretched-tight kite string", "a straight path", ["a curved path", "a corner", "a circle"]],
    ["a coiled snake at the zoo", "a curved path", ["a straight path", "a square", "a corner"]],
    ["the straight edge of a bench", "a straight path", ["a curved path", "a circle", "a wave"]],
    ["a winding garden path", "a curved path", ["a straight path", "a triangle", "a corner"]],
    ["a taut tug-of-war rope", "a straight path", ["a curved path", "a spiral", "a circle"]],
    ["a curly slide at the park", "a curved path", ["a straight path", "a corner", "a square"]],
    ["the crease of a folded card", "a straight path", ["a curved path", "a circle", "a wave"]],
    ["the swirl of soft-serve ice cream", "a curved path", ["a straight path", "a corner", "a triangle"]],
    ["a laser level's beam on the wall", "a straight path", ["a curved path", "a spiral", "a wave"]],
    ["a jump rope mid-swing", "a curved path", ["a straight path", "a corner", "a square"]],
    ["the seam of a ruler-drawn margin", "a straight path", ["a curved path", "a circle", "a spiral"]],
    ["the arc of a thrown ball", "a curved path", ["a straight path", "a corner", "a point"]],
    ["a flag pole against the sky", "a straight path", ["a curved path", "a wave", "a circle"]],
    ["the curl of a pig's tail", "a curved path", ["a straight path", "a square", "a corner"]],
    ["the edge of a picture book", "a straight path", ["a curved path", "a circle", "a wave"]],
    ["a rainbow over the field", "a curved path", ["a straight path", "a triangle", "a corner"]],
    ["a zip line cable pulled tight", "a straight path", ["a curved path", "a spiral", "a circle"]],
  ], STRING_SKELETONS, 1, stringEmit(B1)));
  const BEAM_SKELETONS = [
    (nm, thing, good) => `${nm} watches ${thing}. Which figure does it act like?`,
    (nm, thing, good) => `On the physics poster, ${nm} matches ${thing} to a figure. Which one?`,
    (nm, thing, good) => `${nm} tags ${thing} in the class scrapbook with a math figure. Which tag fits?`,
  ];
  items.push(...cycle(17, [
    ["a flashlight beam shooting from the bulb", "a ray", ["a line segment", "a point", "a circle"]],
    ["a piece of uncooked spaghetti", "a line segment", ["a ray", "a line", "a point"]],
    ["a pencil dot on the page", "a point", ["a ray", "a segment", "a line"]],
    ["a highway stretching beyond sight both ways", "a line", ["a ray", "a segment", "a point"]],
    ["a firework trail climbing from the launcher", "a ray", ["a line", "a segment", "a point"]],
    ["one edge of a cracker", "a line segment", ["a line", "a ray", "a point"]],
    ["a distant star", "a point", ["a line", "a ray", "a segment"]],
    ["sunbeams leaving the sun", "a ray", ["a segment", "a point", "a circle"]],
    ["a bridge cable between two towers", "a line segment", ["a ray", "a line", "a point"]],
    ["the tip of a pin", "a point", ["a segment", "a ray", "a line"]],
    ["an endless number line in both directions", "a line", ["a ray", "a segment", "a point"]],
    ["a water jet from a fountain nozzle", "a ray", ["a segment", "a line", "a point"]],
    ["a crayon laid on the desk", "a line segment", ["a ray", "a line", "a point"]],
    ["a freckle on a nose", "a point", ["a line", "a ray", "a segment"]],
    ["a railway modeled to run forever both ways", "a line", ["a ray", "a segment", "a point"]],
    ["an arrow leaving a bow and flying on", "a ray", ["a segment", "a point", "a circle"]],
    ["a matchstick", "a line segment", ["a ray", "a line", "a point"]],
  ], BEAM_SKELETONS, 2, stringEmit(B2)));

  /* lineFigures app: chalk figures with endpoints. */
  const CHALK_SKELETONS = [
    (nm, f) => `${nm} chalks a giant ${f} on the playground and circles every endpoint. How many endpoints get circled?`,
    (nm, f) => `In string art, ${nm} makes a ${f} and pins each endpoint. How many pins hold endpoints?`,
    (nm, f) => `${nm} draws a ${f} on the whiteboard and dots its endpoints. How many dots does ${nm} add?`,
  ];
  const ENDPOINTS2 = { "line segment": 2, ray: 1, line: 0 };
  const chalkEmit = (band) => ([f], sk, nm) =>
    mk("lineFigures", `storyChalk_${band}`, band, {
      answer: ENDPOINTS2[f],
      answerType: "numberPad",
      display: { shapeC: { kind: "endpoints", figure: f, n: ENDPOINTS2[f] }, promptText: sk(nm, f) + BAND_TAG[band] },
    });
  for (const band of [B1, B2, B3]) {
    items.push(...cycle(17, [["line segment"], ["ray"], ["line"], ["line segment"], ["ray"], ["line"], ["line segment"], ["ray"], ["line"], ["line segment"], ["ray"], ["line"], ["line segment"], ["ray"], ["line"], ["line segment"], ["ray"]], CHALK_SKELETONS, OFF[band] % 3, chalkEmit(band)));
  }
  /* lineFigures app: track paths with straight parts. */
  const TRACK_SKELETONS = [
    (nm, desc, n) => `${nm} lays out a race track: ${desc} How many straight track pieces does ${nm} need?`,
    (nm, desc, n) => `The model railway plan says: ${desc} How many straight rails does ${nm} lay?`,
    (nm, desc, n) => `${nm} tapes a floor course: ${desc} How many straight tape strips is that?`,
  ];
  const trackEmit = (band) => ([desc, n], sk, nm) =>
    mk("lineFigures", `storyTrack_${band}`, band, {
      answer: n,
      answerType: "numberPad",
      display: { shapeC: { kind: "authoredCount" }, promptText: sk(nm, desc, n) },
    });
  items.push(...cycle(17, [["a triangle loop.", 3], ["a square loop.", 4], ["an L-shaped run.", 2], ["a zigzag with two turns.", 3], ["a V-shaped dash.", 2], ["a pentagon loop.", 5], ["a straight sprint with one turn back.", 2], ["a W-shaped weave.", 4], ["a rectangle loop.", 4], ["an M-shaped climb.", 4], ["a Z-shaped cut.", 3], ["a hexagon loop.", 6], ["an N-shaped switchback.", 3], ["a T-shaped junction.", 2], ["a plus-sign crossing.", 2], ["an E-shaped comb.", 4], ["a Y-shaped fork.", 3]], TRACK_SKELETONS, 1, trackEmit(B1)));
  items.push(...cycle(17, [["a hexagon loop plus one shortcut straight.", 7], ["two square loops.", 8], ["a pentagon loop plus a V-chicane.", 7], ["an octagon loop.", 8], ["a zigzag with five turns.", 6], ["two triangle loops.", 6], ["a square loop with both diagonals.", 6], ["a heptagon loop.", 7], ["an X-crossing plus a straightaway.", 3], ["two L-sections and a straight.", 5], ["a hexagon loop with one diagonal.", 7], ["three V-chicanes.", 6], ["a rectangle loop plus a Z-section.", 7], ["two W-weaves.", 8], ["a pentagon loop and a T-junction.", 7], ["four straights in a fan.", 4], ["a square loop and a triangle loop.", 7]], TRACK_SKELETONS, 2, trackEmit(B2)));
  items.push(...cycle(17, [["a decagon loop.", 10], ["a dodecagon loop.", 12], ["two hexagon loops.", 12], ["a nonagon loop.", 9], ["three square loops.", 12], ["a pentagon loop with all diagonals.", 10], ["two octagon loops.", 16], ["a heptagon loop.", 7], ["a square loop plus a triangle loop.", 7], ["two pentagon loops.", 10], ["a hexagon loop plus a square loop.", 10], ["a zigzag with nine turns.", 10], ["a dodecagon loop plus a triangle loop.", 15], ["two nonagon loops.", 18], ["an octagon loop plus a hexagon loop.", 14], ["a decagon loop plus a pentagon loop.", 15], ["four triangle loops.", 12]], TRACK_SKELETONS, 0, trackEmit(B3)));
  /* shapeClassification app band 3: regular-polygon counts. */
  const REG_SKELETONS = [
    (nm, list, n) => `${nm}'s badge kit holds ${list}. How many badges are REGULAR polygons (all sides and angles equal)?`,
    (nm, list, n) => `Out of ${list}, ${nm} keeps only the regular polygons. How many shapes does ${nm} keep?`,
    (nm, list, n) => `A display case shows ${list}. ${nm} labels each regular polygon. How many labels does ${nm} write?`,
  ];
  const regEmit = ([list, n], sk, nm) =>
    mk("shapeClassification", "storyRegular_band3", B3, {
      answer: n,
      answerType: "numberPad",
      display: { shapeC: { kind: "authoredCount" }, promptText: sk(nm, list, n) },
    });
  items.push(...cycle(17, [["a square, a rectangle, and an equilateral triangle", 2], ["two squares and a scalene triangle", 2], ["an equilateral triangle, a rhombus, and a square", 2], ["a rectangle, a parallelogram, and a square", 1], ["two equilateral triangles and a right triangle", 2], ["a square, a scalene triangle, and a rectangle", 1], ["three squares and a parallelogram", 3], ["an equilateral triangle and two rectangles", 1], ["two squares and two rhombuses", 2], ["a square, an equilateral triangle, and a trapezoid", 2], ["a parallelogram, a rhombus, and a square", 1], ["two equilateral triangles and a square", 3], ["a rectangle, a square, and a right triangle", 1], ["three equilateral triangles and a trapezoid", 3], ["a square and two parallelograms", 1], ["two rectangles and two squares", 2], ["an equilateral triangle, a square, and a parallelogram", 2]], REG_SKELETONS, 2, regEmit));

  /* symmetryLines app: stencil pairs (symmetry-line sums). */
  const STENCIL_SKELETONS = [
    (nm, a, b) => `${nm} traces every line of symmetry on a ${a} stencil and a ${b} stencil. How many lines does ${nm} trace in all?`,
    (nm, a, b) => `Two window clings — a ${a} and a ${b} — get all their symmetry lines drawn by ${nm}. How many lines in total?`,
    (nm, a, b) => `${nm} scores fold lines into a ${a} card and a ${b} card, one per line of symmetry. How many fold lines altogether?`,
  ];
  const stencilEmit = (band) => ([a, b], sk, nm) =>
    mk("symmetryLines", `storyStencil_${band}`, band, {
      answer: byName(a).symmetry + byName(b).symmetry,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [byName(a).symmetry, byName(b).symmetry] }, promptText: sk(nm, a, b) + BAND_TAG[band] },
    });
  items.push(...cycle(17, [["square", "rectangle"], ["triangle", "square"], ["rectangle", "triangle"], ["square", "trapezoid"], ["triangle", "trapezoid"], ["rectangle", "trapezoid"], ["square", "triangle"], ["square", "square"], ["rectangle", "rectangle"], ["triangle", "triangle"], ["trapezoid", "trapezoid"], ["square", "rectangle"], ["triangle", "square"], ["rectangle", "triangle"], ["square", "trapezoid"], ["triangle", "trapezoid"], ["rectangle", "trapezoid"]], STENCIL_SKELETONS, 0, stencilEmit(B1)));
  items.push(...cycle(17, [["pentagon", "square"], ["hexagon", "rectangle"], ["pentagon", "triangle"], ["hexagon", "square"], ["pentagon", "rectangle"], ["hexagon", "triangle"], ["right triangle", "square"], ["heptagon", "rectangle"], ["right triangle", "pentagon"], ["heptagon", "triangle"], ["pentagon", "hexagon"], ["hexagon", "trapezoid"], ["right triangle", "hexagon"], ["heptagon", "square"], ["pentagon", "trapezoid"], ["heptagon", "hexagon"], ["right triangle", "rectangle"]], STENCIL_SKELETONS, 1, stencilEmit(B2)));
  items.push(...cycle(17, [["octagon", "square"], ["nonagon", "triangle"], ["decagon", "rectangle"], ["dodecagon", "square"], ["octagon", "pentagon"], ["nonagon", "hexagon"], ["decagon", "square"], ["dodecagon", "triangle"], ["octagon", "hexagon"], ["nonagon", "square"], ["decagon", "pentagon"], ["dodecagon", "rectangle"], ["scalene triangle", "octagon"], ["parallelogram", "decagon"], ["octagon", "triangle"], ["nonagon", "pentagon"], ["dodecagon", "hexagon"]], STENCIL_SKELETONS, 2, stencilEmit(B3)));

  /* shapeProperties app: judged property checks per band. */
  const CHECK_SKELETONS = [
    (nm, name, prop, said, ok) => `${nm} inspects a ${name} ${prop === "right angles" ? "frame" : "banner"} and reports ${said} ${prop}. Is ${nm} right?`,
    (nm, name, prop, said, ok) => `The quality check on a ${name} tile lists ${said} ${prop}. ${nm} signs off on it. Should ${nm} have signed?`,
    (nm, name, prop, said, ok) => `${nm}'s build log says the ${name} piece has ${said} ${prop}. Is the log right?`,
  ];
  const checkEmit = (band, prop, kind) => ([name, said, ok], sk, nm) =>
    mk("shapeProperties", `storyCheck_${band}`, band, {
      answer: ok ? "Yes" : "No",
      choices: ["Yes", "No"],
      display: { shapeC: { kind, name, said }, promptText: sk(nm, name, prop, said, ok) + JUDGE_TAG[band], truth: ok },
    });
  items.push(...cycle(17, [["square", 4, true], ["rectangle", 3, false], ["right triangle", 1, true], ["square", 2, false], ["rectangle", 4, true], ["right triangle", 4, false], ["triangle", 0, true], ["square", 3, false], ["rectangle", 2, false], ["right triangle", 2, false], ["triangle", 1, false], ["square", 4, true], ["rectangle", 4, true], ["right triangle", 1, true], ["triangle", 0, true], ["square", 1, false], ["rectangle", 0, false]], CHECK_SKELETONS, 0, (p2, sk, nm) => checkEmit(B1, "right angles", "rightSaid")(p2, sk, nm)));
  items.push(...cycle(17, [["trapezoid", 1, true], ["rhombus", 1, false], ["parallelogram", 2, true], ["trapezoid", 2, false], ["rhombus", 2, true], ["parallelogram", 1, false], ["hexagon", 3, true], ["trapezoid", 0, false], ["rhombus", 0, false], ["parallelogram", 0, false], ["hexagon", 2, false], ["square", 2, true], ["rectangle", 2, true], ["square", 1, false], ["rectangle", 3, false], ["hexagon", 1, false], ["trapezoid", 1, true]], CHECK_SKELETONS, 1, (p2, sk, nm) => checkEmit(B2, "pairs of parallel sides", "parallelSaid")(p2, sk, nm)));
  items.push(...cycle(17, [["square", 2, true], ["pentagon", 5, true], ["hexagon", 9, true], ["square", 4, false], ["pentagon", 4, false], ["hexagon", 6, false], ["octagon", 20, true], ["heptagon", 14, true], ["octagon", 16, false], ["heptagon", 12, false], ["rectangle", 2, true], ["rhombus", 2, true], ["rectangle", 4, false], ["rhombus", 3, false], ["trapezoid", 2, true], ["trapezoid", 1, false], ["pentagon", 5, true]], CHECK_SKELETONS, 2, (p2, sk, nm) => checkEmit(B3, "diagonals", "diagSaid")(p2, sk, nm)));

  /* shapeClassification app: side hunts for bands 1-2. */
  const HUNT_SKELETONS = [
    (nm, scene, prop, n) => `On a shape hunt, ${nm} spots ${scene}. How many of them have ${prop}?`,
    (nm, scene, prop, n) => `${nm}'s scavenger list shows ${scene}. How many of those have ${prop}?`,
    (nm, scene, prop, n) => `Around the room ${nm} finds ${scene}. Counting only the ones with ${prop}, how many shapes make the cut?`,
  ];
  const huntEmit = (band) => ([scene, prop, n], sk, nm) =>
    mk("shapeClassification", `storyHunt_${band}`, band, {
      answer: n,
      answerType: "numberPad",
      display: { shapeC: { kind: "authoredCount" }, promptText: sk(nm, scene, prop, n) },
    });
  items.push(...cycle(17, [
    ["a square window, a triangle flag, and a round clock", "straight sides", 2],
    ["two square tiles and a triangle ramp", "exactly 4 sides", 2],
    ["a pentagon sign, a square napkin, and a triangle slice", "exactly 5 sides", 1],
    ["a hexagon sticker and two triangle stickers", "exactly 3 sides", 2],
    ["three rectangle doors and a pentagon window", "exactly 4 sides", 3],
    ["a round rug, an oval mirror, and a square poster", "corners", 1],
    ["two hexagon tiles and a triangle tile", "exactly 6 sides", 2],
    ["a square book, a rectangle tray, and a trapezoid shelf", "exactly 4 sides", 3],
    ["two pentagon badges and a hexagon badge", "exactly 5 sides", 2],
    ["a triangle sail, a round buoy, and a rectangle deck", "exactly 3 sides", 1],
    ["four square crackers and a triangle chip", "exactly 4 sides", 4],
    ["a hexagon cell, a pentagon patch, and a square panel", "more than 4 sides", 2],
    ["two triangle tents and two square kites", "exactly 3 sides", 2],
    ["a circle plate and two rectangle mats", "straight sides", 2],
    ["three pentagon stones and a triangle stone", "exactly 5 sides", 3],
    ["a square frame, a hexagon mirror, and a circle lamp", "exactly 6 sides", 1],
    ["two trapezoid roofs and a pentagon door", "exactly 4 sides", 2],
  ], HUNT_SKELETONS, 0, huntEmit(B1)));
  items.push(...cycle(17, [
    ["a rhombus kite, a trapezoid roof, and a hexagon paver", "exactly 4 sides", 2],
    ["a parallelogram ramp, a square gate, and a pentagon plaque", "2 pairs of parallel sides", 2],
    ["two trapezoid awnings and a rhombus sign", "exactly 1 pair of parallel sides", 2],
    ["a square grid, a rectangle door, and a rhombus tile", "4 right angles", 2],
    ["a hexagon bolt, a heptagon coin, and an octagon sign", "an even number of sides", 2],
    ["two rhombus charms and a rectangle charm", "all sides equal", 2],
    ["a right-triangle ramp, a square step, and a trapezoid board", "at least one right angle", 2],
    ["three parallelogram stickers and a trapezoid sticker", "2 pairs of parallel sides", 3],
    ["a pentagon patch, a heptagon patch, and a hexagon patch", "an odd number of sides", 2],
    ["two square coasters and two trapezoid coasters", "4 right angles", 2],
    ["a rhombus pane, a parallelogram pane, and a right-triangle pane", "exactly 4 vertices", 2],
    ["a heptagon token and two hexagon tokens", "exactly 7 sides", 1],
    ["two rectangle place mats and a rhombus mat", "4 right angles", 2],
    ["a trapezoid shelf, a square shelf, and a hexagon shelf", "exactly 1 pair of parallel sides", 1],
    ["three rhombus beads and a square bead", "all sides equal", 4],
    ["an octagon clock, a hexagon clock, and a pentagon clock", "more than 5 sides", 2],
    ["two parallelogram flags and a pentagon flag", "exactly 4 sides", 2],
  ], HUNT_SKELETONS, 1, huntEmit(B2)));

  return items;
}
