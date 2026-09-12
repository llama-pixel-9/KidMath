/* Deterministic angles bank items — part 1: classifyAngle, measureAngle.
 * (Part 2: anglesTemplates2.js; stories: anglesStories.js.)
 *
 * Band 1 is degree-free (square corners, turns) per the generator's design;
 * bands 2-3 use degrees. Answers are integers (numberPad) or word choices —
 * the generator's "angle" (protractor) and shapeFigure payloads are NOT in
 * the bank. Claims ride display.ang, re-derived by authorAngles.js: turn
 * counts carry their degree values in the claim even when the prompt stays
 * degree-free. Judged = "Is this right?" Yes/No. Letter-free forms
 * ("90 + ? = 180 (deg)") serve the words-off path in bands 2-3.
 */

import { shuffled, NAMES } from "../counting/countingTemplates.js";

export const LEVELS = { band1: [1, 3], band2: [4, 6], band3: [7, 10] };
export const OFF = { band1: 0, band2: 7, band3: 13 };
export const nameAt = (i) => NAMES[i % NAMES.length];
export const phrIdx = (i, listLen, phrCount) => (Math.floor(i / listLen) * 2 + (i % 2)) % phrCount;
export const CLASSES = ["acute", "right", "obtuse", "straight"];
export const classOf = (deg) => (deg === 180 ? "straight" : deg === 90 ? "right" : deg < 90 ? "acute" : "obtuse");

export const item = (subskill, family, structureType, band, question) => {
  if (band === "band1") {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 prompt exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "angles",
    subskill,
    itemFamily: family,
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

/* ================================================================== */
/* classifyAngle                                                       */
/* ================================================================== */

const REL = [
  ["less", "acute"],
  ["equal", "right"],
  ["more", "obtuse"],
  ["straight", "straight"],
];
const relText = {
  less: "opens less than a square corner",
  equal: "opens exactly like a square corner",
  more: "opens more than a square corner but less than a straight line",
  straight: "opens all the way into a straight line",
};

export function classifyProcedural() {
  const items = [];
  let seed = 651;

  if (true) {
    const phr = [
      (rel) => `An angle ${relText[rel]}. Pick its kind.`,
      (rel) => `Pick the kind of angle that ${relText[rel]}.`,
      (rel) => `One kind of angle ${relText[rel]}. Which kind is that?`,
      (rel) => `Which kind of angle is one that ${relText[rel]}?`,
    ];
    for (let i = 0; i < 13; i += 1) {
      const [rel, ans] = REL[i % 4];
      items.push(
        item("classifyAngle", "procedural", `cornerClassify_band1`, "band1", {
          answer: ans,
          choices: shuffled([...CLASSES], (seed += 1)),
          display: { ang: { kind: "classifyRel", rel }, promptText: phr[Math.floor(i / 4) % 4](rel) },
        })
      );
    }
  }
  const turnPhr = [
    (t, ans) => `A ${t} makes which kind of angle? Pick it.`,
    (t, ans) => `Pick the kind of angle a ${t} makes.`,
    (t, ans) => `Turning through a ${t} sweeps which kind of angle?`,
    (t, ans) => `Which kind of angle comes from a ${t}?`,
  ];
  const TURNS = [
    ["quarter turn", "right", 90],
    ["half turn", "straight", 180],
    ["small part of a quarter turn", "acute", 45],
    ["turn between a quarter and a half", "obtuse", 135],
  ];
  for (let i = 0; i < 13; i += 1) {
    const [t, ans, deg] = TURNS[i % 4];
    items.push(
      item("classifyAngle", "procedural", `turnClassify_band1`, "band1", {
        answer: ans,
        choices: shuffled([...CLASSES], (seed += 1)),
        display: { ang: { kind: "classify", deg }, promptText: turnPhr[Math.floor(i / 4) % 4](t, ans) },
      })
    );
  }
  const cmpPhr = [
    (thing, ans) => `${thing} opens ${ans === "acute" ? "just a little" : "very wide, past a square corner"}. Is that angle smaller or bigger than a square corner? Pick one.`,
    (thing, ans) => `${thing} makes ${ans === "acute" ? "a narrow opening" : "a wide opening beyond a square corner"}. Smaller or bigger than a square corner?`,
  ];
  const CMP_THINGS = ["A door open a crack", "A pair of scissors snipping", "A slightly open book", "A barely open laptop", "A pizza slice tip", "A wide-open gate", "A reclined chair back", "A fully spread fan", "A ramp leaning far back", "A wide-open door", "A folded-out sofa bed", "A wide slice of pie", "A nearly flat umbrella"];
  for (let i = 0; i < 13; i += 1) {
    const ans = i < 5 ? "acute" : "obtuse";
    items.push(
      item("classifyAngle", "procedural", `cmpCorner_band1`, "band1", {
        answer: ans === "acute" ? "smaller" : "bigger",
        choices: ["smaller", "bigger"],
        display: { ang: { kind: "authoredChoice" }, promptText: cmpPhr[i % 2](CMP_THINGS[i], ans) },
      })
    );
  }
  const smallestPhr = [
    (list) => `Which kind of angle is the smallest opening: ${list}? Pick it.`,
    (list) => `Of ${list}, which kind opens the least?`,
    (list) => `Pick the widest opening among ${list}. Which is it?`,
    (list) => `Of ${list}, which kind opens the most?`,
  ];
  const ROTS = [["acute", "right", "obtuse"], ["right", "obtuse", "acute"], ["obtuse", "acute", "right"]];
  for (let i = 0; i < 12; i += 1) {
    const trio = ROTS[i % 3];
    const wantSmall = i % 4 < 2;
    items.push(
      item("classifyAngle", "procedural", `orderKinds_band1`, "band1", {
        answer: wantSmall ? "acute" : "obtuse",
        choices: [...trio],
        display: { ang: { kind: "authoredChoice" }, promptText: smallestPhr[i % 4](trio.join(", ")) },
      })
    );
  }

  const degPhr = {
    band2: [
      (d) => `An angle measures ${d} degrees. Pick its kind.`,
      (d) => `Pick the kind of a ${d}-degree angle.`,
      (d) => `Classify the ${d}-degree angle. Which kind is it?`,
      (d) => `A ${d}-degree opening is which kind of angle?`,
    ],
    band3: [
      (d) => `Classify precisely: a ${d}-degree angle is which kind?`,
      (d) => `Determine the kind of an angle measuring ${d} degrees.`,
      (d) => `Which class holds the ${d}-degree angle?`,
      (d) => `Assign the ${d}-degree angle its kind.`,
    ],
  };
  const degData = {
    band2: [30, 90, 120, 180, 45, 100, 60, 150, 90, 20, 170, 75, 135],
    band3: [89, 90, 91, 180, 1, 179, 44, 46, 90, 134, 136, 88, 92],
  };
  for (const band of ["band2", "band3"]) {
    degData[band].forEach((d, i) => {
      items.push(
        item("classifyAngle", "procedural", `degreeClassify_${band}`, band, {
          answer: classOf(d),
          choices: shuffled([...CLASSES], (seed += 1)),
          display: { ang: { kind: "classify", deg: d }, promptText: degPhr[band][phrIdx(i, 13, 4)](d) },
        })
      );
    });
  }
  const rangePhr = {
    band2: [
      (kind, list) => `Which of these measures is ${kind === "acute" ? "an acute" : kind === "obtuse" ? "an obtuse" : `a ${kind}`} angle: ${list} degrees? Pick it.`,
      (kind, list) => `From ${list} degrees, pick the ${kind} angle's measure. Which is it?`,
      (kind, list) => `Exactly one of ${list} degrees makes ${kind === "acute" ? "an acute" : kind === "obtuse" ? "an obtuse" : `a ${kind}`} angle. Which one?`,
      (kind, list) => `Of ${list} degrees, which measure is ${kind}?`,
    ],
    band3: [
      (kind, list) => `Identify the ${kind} measure among ${list} degrees. Which is it?`,
      (kind, list) => `Of ${list} degrees, which one is ${kind}?`,
      (kind, list) => `Precisely one of ${list} degrees is ${kind}. Which?`,
      (kind, list) => `Determine which of ${list} degrees gives ${kind === "acute" ? "an acute" : kind === "obtuse" ? "an obtuse" : `a ${kind}`} angle.`,
    ],
  };
  const rangeData = {
    band2: [["acute", 40, [90, 120, 180]], ["right", 90, [45, 120, 160]], ["obtuse", 120, [30, 60, 90]], ["straight", 180, [45, 90, 135]], ["acute", 25, [90, 100, 180]], ["obtuse", 150, [20, 80, 90]], ["acute", 65, [90, 110, 170]], ["right", 90, [30, 135, 180]], ["obtuse", 95, [15, 60, 90]], ["straight", 180, [35, 90, 125]], ["acute", 80, [90, 140, 180]], ["obtuse", 165, [10, 70, 90]], ["acute", 50, [90, 130, 175]]],
    band3: [["acute", 89, [90, 91, 180]], ["obtuse", 91, [89, 90, 180]], ["right", 90, [89, 91, 179]], ["straight", 180, [90, 91, 179? 179 : 179]], ["acute", 1, [90, 91, 180]], ["obtuse", 179, [1, 89, 90]], ["acute", 44, [90, 134, 180]], ["obtuse", 134, [44, 46, 90]], ["right", 90, [45, 135, 180]], ["acute", 46, [90, 136, 180]], ["obtuse", 136, [46, 88, 90]], ["acute", 88, [90, 92, 180]], ["obtuse", 92, [88, 90, 180]]],
  };
  for (const band of ["band2", "band3"]) {
    rangeData[band].forEach(([kind, good, wrong], i) => {
      const all = shuffled([good, ...wrong], (seed += 1));
      items.push(
        item("classifyAngle", "procedural", `rangePick_${band}`, band, {
          answer: good,
          choices: all,
          display: { ang: { kind: "rangePick", want: kind }, promptText: rangePhr[band][phrIdx(i, 13, 4)](kind, all.join(", ")) },
        })
      );
    });
  }
  const halfPhr = {
    band2: [
      (d) => `Is a ${d}-degree angle smaller or bigger than a right angle? Pick one.`,
      (d) => `Compare ${d} degrees with a right angle: smaller or bigger?`,
      (d) => `A ${d}-degree angle sits which side of a right angle: smaller or bigger?`,
      (d) => `Against a right angle, is ${d} degrees smaller or bigger?`,
    ],
    band3: [
      (d) => `Judge ${d} degrees against a right angle: smaller or bigger?`,
      (d) => `Relative to 90 degrees, is ${d} degrees smaller or bigger?`,
      (d) => `Does a ${d}-degree angle open less or more than a right angle? Pick smaller or bigger.`,
      (d) => `Place ${d} degrees against the right-angle benchmark: smaller or bigger?`,
    ],
  };
  const halfData = { band2: [30, 120, 45, 150, 60, 100, 20, 170, 75, 95, 40, 160, 85], band3: [89, 91, 1, 179, 44, 136, 46, 134, 88, 92, 2, 178, 87] };
  const benchKindPhr = {
    band2: [
      (name) => `What kind of angle is ${name}? Pick it.`,
      (name) => `Pick the kind of angle made by ${name}.`,
      (name) => `${name[0].toUpperCase() + name.slice(1)} is which kind of angle?`,
      (name) => `Classify ${name}. Which kind is it?`,
    ],
    band3: [
      (name) => `Classify precisely: ${name} is which kind of angle?`,
      (name) => `Determine the kind of angle that ${name} makes.`,
      (name) => `Which class holds ${name}?`,
      (name) => `Assign ${name} its kind of angle.`,
    ],
  };
  const BENCH_KINDS = [
    ["a quarter turn", 90],
    ["a half turn", 180],
    ["half of a right angle", 45],
    ["a turn of one third of a half turn", 60],
  ];
  for (const band of ["band2", "band3"]) {
    for (let i = 0; i < 13; i += 1) {
      const [name, deg] = BENCH_KINDS[i % 4];
      items.push(
        item("classifyAngle", "procedural", `benchKind_${band}`, band, {
          answer: classOf(deg),
          choices: shuffled([...CLASSES], (seed += 1)),
          display: { ang: { kind: "classify", deg }, promptText: benchKindPhr[band][Math.floor(i / 4) % 4](name) },
        })
      );
    }
  }
  for (const band of ["band2", "band3"]) {
    halfData[band].forEach((d, i) => {
      items.push(
        item("classifyAngle", "procedural", `cmpRightDeg_${band}`, band, {
          answer: d < 90 ? "smaller" : "bigger",
          choices: ["smaller", "bigger"],
          display: { ang: { kind: "cmpRight", deg: d }, promptText: halfPhr[band][phrIdx(i, 13, 4)](d) },
        })
      );
    });
  }

  return items;
}

export function classifyConceptual() {
  const items = [];

  const saidPhr = {
    band1: [
      (nm, rel, said) => `${nm} sees an angle that ${relText[rel]} and calls it ${said}. Is ${nm} right?`,
      (nm, rel, said) => `An angle ${relText[rel]}, and ${nm} labels it ${said}. Is that right?`,
    ],
    band2: [
      (nm, d, said) => `${nm} measures an angle at ${d} degrees and calls it ${said}. Does the label fit?`,
      (nm, d, said) => `A ${d}-degree angle gets the label ${said} from ${nm}. Is ${nm} right?`,
    ],
    band3: [
      (nm, d, said) => `${nm} classifies a ${d}-degree angle as ${said}. Is the classification valid?`,
      (nm, d, said) => `Audit ${nm}'s label: ${d} degrees, marked ${said}. Clean audit?`,
    ],
  };
  const saidData1 = [["less", "acute", true], ["less", "obtuse", false], ["equal", "right", true], ["equal", "acute", false], ["more", "obtuse", true], ["more", "acute", false], ["straight", "straight", true], ["straight", "right", false], ["less", "acute", true], ["equal", "obtuse", false], ["more", "obtuse", true], ["less", "right", false], ["equal", "right", true], ["more", "right", false], ["straight", "straight", true], ["less", "straight", false], ["more", "obtuse", true], ["equal", "straight", false]];
  saidData1.forEach(([rel, said, ok], i) => {
    items.push(
      item("classifyAngle", "conceptual", `classSaidJudge_band1`, "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { ang: { kind: "relSaid", rel, said }, promptText: saidPhr.band1[i % 2](nameAt(i * 3 + 1), rel, said), truth: ok },
      })
    );
  });
  const saidDataDeg = {
    band2: [[40, "acute", true], [100, "acute", false], [90, "right", true], [90, "obtuse", false], [120, "obtuse", true], [60, "obtuse", false], [180, "straight", true], [180, "obtuse", false], [30, "acute", true], [150, "acute", false], [95, "obtuse", true], [45, "right", false], [90, "right", true], [170, "right", false], [20, "acute", true], [110, "acute", false], [135, "obtuse", true], [75, "obtuse", false]],
    band3: [[89, "acute", true], [91, "acute", false], [90, "right", true], [89, "right", false], [91, "obtuse", true], [90, "obtuse", false], [180, "straight", true], [179, "straight", false], [1, "acute", true], [179, "acute", false], [134, "obtuse", true], [44, "obtuse", false], [90, "right", true], [92, "right", false], [46, "acute", true], [136, "acute", false], [178, "obtuse", true], [88, "obtuse", false]],
  };
  for (const band of ["band2", "band3"]) {
    saidDataDeg[band].forEach(([d, said, ok], i) => {
      items.push(
        item("classifyAngle", "conceptual", `classSaidJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ang: { kind: "classSaid", deg: d, said }, promptText: saidPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), d, said), truth: ok },
        })
      );
    });
  }

  const tiltPhr = {
    band1: [
      (nm) => `${nm} says a square corner is only a right angle when one side points straight up. Is ${nm} right?`,
      (nm) => `${nm} says a tilted square corner is still a right angle. Is ${nm} right?`,
    ],
    band2: [
      (nm) => `${nm} claims a 90-degree angle stops being right when the page is rotated. Is the claim right?`,
      (nm) => `Rotating the paper does not change a right angle, says ${nm}. Is that right?`,
    ],
    band3: [
      (nm) => `${nm} asserts orientation decides rightness: a rotated 90-degree angle is no longer right. Sound assertion?`,
      (nm) => `A 90-degree angle stays right at any orientation, states ${nm}. Should the statement stand?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < 16; i += 1) {
      const ok = i % 2 === 1;
      items.push(
        item("classifyAngle", "conceptual", `tiltJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ang: { kind: "authored" }, promptText: tiltPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band])) + (i >= 8 ? " Think about the opening, not the tilt." : ""), truth: ok },
        })
      );
    }
  }

  const sizePhr = {
    band1: [
      (nm) => `${nm} draws two square corners, one with long sides and one with short sides, and says the long-sided one is a bigger angle. Is ${nm} right?`,
      (nm) => `Longer sides make a bigger angle, claims ${nm}, comparing two square corners. Is that right?`,
    ],
    band2: [
      (nm) => `${nm} says a 60-degree angle drawn with long rays beats a 60-degree angle drawn with short rays. Is ${nm} right?`,
      (nm) => `Ray length changes an angle's size, argues ${nm}, so longer rays mean a wider angle. Is that right?`,
    ],
    band3: [
      (nm) => `${nm} ranks two 45-degree angles by the lengths of their rays. Is ray length the right ranking?`,
      (nm) => `Two angles of equal degrees but different ray lengths are equal angles, yet ${nm} calls the long-rayed one larger. Is ${nm} right?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < 18; i += 1) {
      items.push(
        item("classifyAngle", "conceptual", `rayLengthTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { ang: { kind: "trapNo" }, promptText: sizePhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band])) + (i >= 12 ? " The opening is what counts." : i >= 6 ? " Degrees measure the turn, not the sides." : ""), truth: false },
        })
      );
    }
  }

  return items;
}

/* ================================================================== */
/* measureAngle                                                        */
/* ================================================================== */

export function measureProcedural() {
  const items = [];

  // band1: degree-free turn counting (claims carry the degree math).
  const countPhr = [
    (whole, unit) => `How many ${unit} fit exactly along ${whole}? Type the count.`,
    (whole, unit) => `Count the ${unit} that make ${whole}. How many ${unit} is that?`,
    (whole, unit) => `${whole[0].toUpperCase() + whole.slice(1)} is built from how many ${unit}? Type it.`,
    (whole, unit) => `Type how many ${unit} it takes to make ${whole}.`,
    (whole, unit) => `Stack ${unit} until they make ${whole}. How many ${unit} do you stack?`,
    (whole, unit) => `Exactly how many ${unit} together form ${whole}?`,
    (whole, unit) => `It takes how many ${unit} to build ${whole}? Type the number.`,
    (whole, unit) => `${whole[0].toUpperCase() + whole.slice(1)} equals how many ${unit} put together?`,
  ];
  const COUNTS = [
    ["a straight line", "square corners", 180, 90],
    ["a full turn", "square corners", 360, 90],
    ["a full turn", "half turns", 360, 180],
    ["a straight line", "quarter turns", 180, 90],
  ];
  for (let i = 0; i < 27; i += 1) {
    const [whole, unit, W, U] = COUNTS[i % 4];
    items.push(
      item("measureAngle", "procedural", `turnCount_band1`, "band1", {
        answer: W / U,
        answerType: "numberPad",
        display: { ang: { kind: "divTurn", whole: W, unit: U }, promptText: countPhr[Math.floor(i / 4) % 8](whole, unit) },
      })
    );
  }
  const quartersPhr = [
    (k) => `${k === 1 ? "One quarter turn" : `${k} quarter turns`} of a full turn leaves how many quarter turns to finish? Type it.`,
    (k) => `A full turn is 4 quarter turns. After ${k} of them, how many quarter turns remain?`,
    (k) => `${k} quarter turn${k === 1 ? " is" : "s are"} done. How many quarter turns complete the full turn?`,
    (k) => `Out of 4 quarter turns in a full spin, ${k} ${k === 1 ? "is" : "are"} made. How many quarter turns are left?`,
    (k) => `A spinner makes ${k} quarter turn${k === 1 ? "" : "s"}. How many more quarter turns finish the full spin?`,
    (k) => `After ${k} quarter turn${k === 1 ? "" : "s"}, how many quarter turns are still needed for a full turn?`,
    (k) => `The full turn needs 4 quarter turns; ${k} ${k === 1 ? "is" : "are"} finished. How many quarter turns remain?`,
    (k) => `${k} of the 4 quarter turns in a spin ${k === 1 ? "is" : "are"} complete. How many quarter turns are left to go?`,
  ];
  for (let i = 0; i < 24; i += 1) {
    const k = (i % 3) + 1;
    items.push(
      item("measureAngle", "procedural", `quartersLeft_band1`, "band1", {
        answer: 4 - k,
        answerType: "numberPad",
        display: { ang: { kind: "missDeg", total: 360, a: k * 90, unit: 90 }, promptText: quartersPhr[Math.floor(i / 3) % 8](k) },
      })
    );
  }

  // bands 2-3: degrees.
  const benchPhr = {
    band2: [
      (name, d) => `How many degrees is ${name}? Type it.`,
      (name, d) => `${name[0].toUpperCase() + name.slice(1)} measures how many degrees?`,
      (name, d) => `Type the degree measure of ${name}.`,
      (name, d) => `In degrees, ${name} = ?`,
    ],
    band3: [
      (name, d) => `State the degree measure of ${name}.`,
      (name, d) => `Exactly how many degrees is ${name}?`,
      (name, d) => `Determine the measure of ${name} in degrees.`,
      (name, d) => `${name[0].toUpperCase() + name.slice(1)} spans how many degrees? Type it.`,
    ],
  };
  const BENCH = [
    ["a right angle", 90],
    ["a straight angle", 180],
    ["a full turn", 360],
    ["a quarter turn", 90],
    ["a half turn", 180],
    ["half of a right angle", 45],
    ["a third of a full turn", 120],
    ["three quarter turns", 270],
    ["half of a straight angle", 90],
    ["a tenth of a full turn", 36],
    ["a sixth of a full turn", 60],
    ["a fifth of a full turn", 72],
    ["half of a half turn", 90],
  ];
  for (const band of ["band2", "band3"]) {
    BENCH.forEach(([name, d], i) => {
      items.push(
        item("measureAngle", "procedural", `benchmarkDeg_${band}`, band, {
          answer: d,
          answerType: "numberPad",
          display: { ang: { kind: "benchDeg", d }, promptText: benchPhr[band][phrIdx(i, 13, 4)](name) },
        })
      );
    });
  }

  // Letter-free: 90 + ? = 180 (deg)
  const lfPhr = [(t, a) => `${a} + ? = ${t} (deg)`, (t, a) => `? + ${a} = ${t} (deg)`];
  const lfData = {
    band2: [[180, 90], [180, 60], [180, 45], [180, 120], [90, 30], [90, 45], [90, 60], [180, 30], [180, 150], [90, 20], [90, 70], [180, 100], [180, 135]],
    band3: [[360, 90], [360, 180], [360, 270], [360, 120], [360, 45], [180, 65], [180, 115], [90, 35], [90, 55], [360, 300], [180, 25], [360, 240], [90, 15]],
  };
  for (const band of ["band2", "band3"]) {
    lfData[band].forEach(([t, a], i) => {
      items.push(
        item("measureAngle", "procedural", `degLF_${band}`, band, {
          answer: t - a,
          answerType: "numberPad",
          display: { ang: { kind: "missDeg", total: t, a }, promptText: lfPhr[i % 2](t, a) },
        })
      );
    });
  }

  const halfOfPhr = {
    band2: [
      (d) => `Half of a ${d}-degree angle measures how many degrees? Type it.`,
      (d) => `Split a ${d}-degree angle into two equal parts. How many degrees is each part?`,
      (d) => `A ${d}-degree angle folds into two equal angles. Type each part's degrees.`,
      (d) => `Each half of a ${d}-degree angle is how many degrees?`,
    ],
    band3: [
      (d) => `Bisect a ${d}-degree angle. Each half measures how many degrees?`,
      (d) => `Exactly how many degrees is half of ${d} degrees?`,
      (d) => `An angle bisector splits ${d} degrees into halves of how many degrees each?`,
      (d) => `Determine each equal part when ${d} degrees is halved.`,
    ],
  };
  const halfOfData = { band2: [90, 60, 180, 120, 80, 100, 40, 160, 140, 70? 70 : 70, 50, 170? 30 : 30, 110? 110 : 110], band3: [90, 150, 130, 170, 110, 50, 70, 30, 178, 86, 94, 62, 146] };
  for (const band of ["band2", "band3"]) {
    halfOfData[band].forEach((d, i) => {
      items.push(
        item("measureAngle", "procedural", `halfDeg_${band}`, band, {
          answer: d / 2,
          answerType: "numberPad",
          display: { ang: { kind: "halfDeg", of: d }, promptText: halfOfPhr[band][phrIdx(i, 13, 4)](d) },
        })
      );
    });
  }

  const doublePhr = {
    band2: [
      (d) => `Double a ${d}-degree angle. How many degrees is the doubled angle?`,
      (d) => `Two copies of a ${d}-degree angle side by side span how many degrees?`,
      (d) => `An angle of ${d} degrees is doubled. Type the new measure in degrees.`,
      (d) => `Twice ${d} degrees makes how many degrees?`,
    ],
    band3: [
      (d) => `Compute the double of a ${d}-degree angle in degrees.`,
      (d) => `Exactly how many degrees do two adjacent ${d}-degree angles span?`,
      (d) => `Determine the measure of a ${d}-degree angle doubled.`,
      (d) => `Doubling ${d} degrees yields how many degrees? Type it.`,
    ],
  };
  const doubleData = { band2: [15, 20, 25, 30, 35, 40, 45, 10, 50, 55, 60, 65, 70], band3: [35, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165] };
  for (const band of ["band2", "band3"]) {
    doubleData[band].forEach((d, i) => {
      items.push(
        item("measureAngle", "procedural", `doubleDeg_${band}`, band, {
          answer: 2 * d,
          answerType: "numberPad",
          display: { ang: { kind: "sumDeg", a: d, b: d }, promptText: doublePhr[band][phrIdx(i, 13, 4)](d) },
        })
      );
    });
  }

  return items;
}

export function measureConceptual() {
  const items = [];

  const estPhr = {
    band1: [
      (nm, thing, wide) => `${nm} says ${thing} makes an angle ${wide ? "wider" : "narrower"} than a square corner. Is ${nm} right?`,
      (nm, thing, wide) => `${thing[0].toUpperCase() + thing.slice(1)} opens ${wide ? "past" : "less than"} a square corner, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, thing, wide) => `${nm} estimates the angle of ${thing} at ${wide ? "about 150" : "about 20"} degrees. Is that a sensible estimate?`,
      (nm, thing, wide) => `For ${thing}, ${nm} guesses ${wide ? "150" : "20"} degrees. Does the guess fit?`,
    ],
    band3: [
      (nm, thing, wide) => `${nm} pegs ${thing} near ${wide ? "160" : "15"} degrees. Is the estimate reasonable?`,
      (nm, thing, wide) => `An estimate of ${wide ? "160" : "15"} degrees for ${thing} — does ${nm}'s number make sense?`,
    ],
  };
  const estData = {
    band1: [["a wide-open gate", true, true], ["a door open a crack", false, true], ["a fully spread fan", true, true], ["scissors barely open", false, true], ["a reclined beach chair", true, true], ["a slightly open book", false, true], ["a flat-out ramp", true, true], ["a nearly closed laptop", false, true], ["a wide slice of pie", true, true], ["a thin slice of pie", false, true], ["an almost flat umbrella", true, true], ["tweezers pinched nearly shut", false, true], ["a wide-open door", true, true], ["a barely open window", false, true], ["a spread-out wing", true, true], ["a half-shut beak", false, true], ["an opened-out sofa bed", true, true], ["a nearly folded easel", false, true]],
    band2: [["a wide-open gate", true, true], ["a door open a crack", false, true], ["a fully spread fan", true, true], ["scissors barely open", false, true], ["a reclined beach chair", true, true], ["a slightly open book", false, true], ["a wide-open laptop", true, true], ["a nearly closed umbrella", false, true], ["a wide slice of pie", true, true], ["a thin slice of pie", false, true], ["a leaned-back office chair", true, true], ["pliers pinched nearly shut", false, true], ["a wide-open window", true, true], ["a cracked-open lid", false, true], ["a spread protractor arm", true, true], ["a snipped ribbon vee", false, true], ["a folded-out futon", true, true], ["a nearly shut gate", false, true]],
    band3: [["a wide-open gate", true, true], ["a door open a crack", false, true], ["a fully spread fan", true, true], ["scissors barely open", false, true], ["a reclined dental chair", true, true], ["a slightly open book", false, true], ["a wide-open hatch", true, true], ["a nearly closed compass", false, true], ["a wide slice of pie", true, true], ["a sliver of pie", false, true], ["a laid-back lounger", true, true], ["calipers pinched nearly shut", false, true], ["a swung-wide door", true, true], ["a cracked window vent", false, true], ["an unfolded map crease", true, true], ["a barely open clam shell", false, true], ["an opened-flat laptop", true, true], ["a nearly closed shears", false, true]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    estData[band].forEach(([thing, wide, ok], i) => {
      items.push(
        item("measureAngle", "conceptual", `estimateJudge_${band}`, band, {
          answer: "Yes",
          choices: ["Yes", "No"],
          display: { ang: { kind: "authoredYes" }, promptText: estPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), thing, wide), truth: true },
        })
      );
    });
  }

  const missPhr = {
    band1: [
      (nm, thing, wide) => `${nm} claims ${thing} opens ${wide ? "less than" : "wider than"} a square corner. Is ${nm} right?`,
      (nm, thing, wide) => `${thing[0].toUpperCase() + thing.slice(1)} makes ${wide ? "a narrow angle" : "a very wide angle"}, says ${nm}. Is that right?`,
    ],
    band2: [
      (nm, thing, wide) => `${nm} estimates ${thing} at ${wide ? "20" : "150"} degrees. Is that a sensible estimate?`,
      (nm, thing, wide) => `For ${thing}, ${nm} writes ${wide ? "20" : "150"} degrees. Does the number fit?`,
    ],
    band3: [
      (nm, thing, wide) => `${nm} pegs ${thing} near ${wide ? "15" : "160"} degrees. Is the estimate reasonable?`,
      (nm, thing, wide) => `An estimate of ${wide ? "15" : "160"} degrees for ${thing} — does ${nm}'s number make sense?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    estData[band].slice(0, 16).forEach(([thing, wide], i) => {
      items.push(
        item("measureAngle", "conceptual", `estimateTrap_${band}`, band, {
          answer: "No",
          choices: ["Yes", "No"],
          display: { ang: { kind: "trapNo" }, promptText: missPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), thing, wide), truth: false },
        })
      );
    });
  }

  const zeroPhr = {
    band1: [
      (nm) => `${nm} says an angle that has not opened at all is the same as no turn. Is ${nm} right?`,
      (nm) => `No opening means no angle turn, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm) => `${nm} says turning all the way around lands you facing the same way you started. Is ${nm} right?`,
      (nm) => `A full 360-degree spin faces you back where you began, claims ${nm}. Is that right?`,
    ],
    band3: [
      (nm) => `${nm} states that two quarter turns in the same direction equal one half turn. Is the statement right?`,
      (nm) => `Four quarter turns in the same direction return you to the start, asserts ${nm}. Sound assertion?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < 18; i += 1) {
      items.push(
        item("measureAngle", "conceptual", `turnFactJudge_${band}`, band, {
          answer: "Yes",
          choices: ["Yes", "No"],
          display: { ang: { kind: "authoredYes" }, promptText: zeroPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band])) + (i >= 12 ? " Picture the turn." : i >= 6 ? " Try acting it out." : ""), truth: true },
        })
      );
    }
  }

  return items;
}
