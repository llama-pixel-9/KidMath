/* angles bank part 2 — angleSum, missingAngle. Conventions in
 * anglesTemplates.js. Letter-free shapes are disjoint per structure:
 * angleSum "30 + 45 = ? (deg)", missingAngle "90 - 40 = ? (deg)",
 * measureAngle "90 + ? = 180 (deg)".
 */

import { shuffled } from "../counting/countingTemplates.js";
import { item, nameAt, OFF, phrIdx } from "./anglesTemplates.js";

/* ================================================================== */
/* angleSum                                                            */
/* ================================================================== */

export function angleSumProcedural() {
  const items = [];
  let seed = 661;

  const makePhr = [
    (parts, opts) => `${parts} together make what? Pick it.`,
    (parts, opts) => `Pick what ${parts.toLowerCase()} add up to.`,
    (parts, opts) => `Joined with no gap, ${parts.toLowerCase()} form which turn?`,
    (parts, opts) => `What do ${parts.toLowerCase()} combine into? Pick it.`,
  ];
  const MAKE = [
    ["Two square corners side by side", "a straight line", ["a quarter turn", "a full turn", "a small tilt"], 90, 90],
    ["Two half turns in the same direction", "a full turn", ["a straight line", "a quarter turn", "a small tilt"], 180, 180],
    ["A quarter turn followed by another quarter turn", "a half turn", ["a full turn", "a quarter turn", "a small tilt"], 90, 90],
    ["Four square corners around a point", "a full turn", ["a half turn", "a quarter turn", "a straight line"], 90, 270],
  ];
  for (let i = 0; i < 13; i += 1) {
    const [parts, good, wrong, a, b] = MAKE[i % 4];
    items.push(
      item("angleSum", "procedural", `turnsMake_band1`, "band1", {
        answer: good,
        choices: shuffled([good, ...wrong], (seed += 1)),
        display: { ang: { kind: "authoredChoice" }, promptText: makePhr[Math.floor(i / 4) % 4](parts) },
      })
    );
  }

  const totalPhr = [
    (a, b) => `${a} quarter turn${a === 1 ? "" : "s"}, then ${b} more. How many quarter turns in all? Type it.`,
    (a, b) => `A spinner turns ${a} quarter turn${a === 1 ? "" : "s"} and then ${b} more. Type the total number of quarter turns.`,
    (a, b) => `Add the turns: ${a} quarter turn${a === 1 ? "" : "s"} plus ${b} more makes how many quarter turns?`,
    (a, b) => `First ${a} quarter turn${a === 1 ? "" : "s"}, next ${b} more. What is the total count of quarter turns?`,
  ];
  const totalData = [[1, 1], [1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [1, 1], [1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [2, 2]];
  totalData.forEach(([a, b], i) => {
    items.push(
      item("angleSum", "procedural", `turnsTotal_band1`, "band1", {
        answer: a + b,
        answerType: "numberPad",
        display: { ang: { kind: "sumUnits", a, b }, promptText: totalPhr[(Math.floor(i / 6) * 2 + (i % 2)) % 4](a, b) },
      })
    );
  });

  const cornersPhr = [
    (n) => `${n} square corner${n === 1 ? "" : "s"} plus 1 more square corner: how many square corners in all? Type it.`,
    (n) => `Stack ${n} square corner${n === 1 ? "" : "s"} with 1 more. Type the total number of square corners.`,
    (n) => `Add 1 square corner to ${n}. How many square corners is that altogether?`,
    (n) => `${n} square corner${n === 1 ? "" : "s"} and then another one — type how many square corners that makes.`,
  ];
  const cornersData = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3];
  cornersData.forEach((n, i) => {
    items.push(
      item("angleSum", "procedural", `cornersTotal_band1`, "band1", {
        answer: n + 1,
        answerType: "numberPad",
        display: { ang: { kind: "sumUnits", a: n, b: 1 }, promptText: cornersPhr[Math.floor(i / 3) % 4](n) },
      })
    );
  });

  const halvesPhr = [
    (k) => `${k} half turn${k === 1 ? "" : "s"} and 1 more half turn: how many half turns in all? Type it.`,
    (k) => `A dial makes ${k} half turn${k === 1 ? "" : "s"}, then 1 more. Type the total half turns.`,
    (k) => `Combine ${k} half turn${k === 1 ? "" : "s"} with another. How many half turns is that?`,
    (k) => `After ${k} half turn${k === 1 ? "" : "s"} plus one more, what is the half-turn total?`,
  ];
  const halvesData = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3];
  halvesData.forEach((k, i) => {
    items.push(
      item("angleSum", "procedural", `halvesTotal_band1`, "band1", {
        answer: k + 1,
        answerType: "numberPad",
        display: { ang: { kind: "sumUnits", a: k, b: 1 }, promptText: halvesPhr[Math.floor(i / 3) % 4](k) },
      })
    );
  });

  const addPhr = {
    band2: [
      (a, b) => `Two angles sit side by side, measuring ${a} and ${b} degrees. Their combined measure = ? Type it.`,
      (a, b) => `Angles of ${a} degrees and ${b} degrees share a ray. How many degrees do they span together?`,
      (a, b) => `Add the adjacent angles ${a} degrees and ${b} degrees. Type the total.`,
      (a, b) => `Side-by-side angles of ${a} and ${b} degrees make how many degrees in all?`,
    ],
    band3: [
      (a, b) => `Compute the combined measure of adjacent angles ${a} and ${b} degrees.`,
      (a, b) => `Exactly how many degrees do adjacent ${a}-degree and ${b}-degree angles span?`,
      (a, b) => `Determine the total of angles ${a} degrees and ${b} degrees placed together.`,
      (a, b) => `Together, ${a}-degree and ${b}-degree angles sweep how many degrees? Type it.`,
    ],
  };
  const addData = {
    band2: [[30, 45], [60, 25], [40, 35], [50, 20], [55, 30], [15, 65], [70, 25], [45, 45], [20, 60], [35, 50], [65, 30], [25, 40], [10, 75]],
    band3: [[85, 40], [95, 55], [110, 45], [75, 80], [120, 35], [65, 90], [105, 60], [140, 25], [55, 115], [130, 45], [70, 95], [150, 30], [45, 125]],
  };
  for (const band of ["band2", "band3"]) {
    addData[band].forEach(([a, b], i) => {
      items.push(
        item("angleSum", "procedural", `addDeg_${band}`, band, {
          answer: a + b,
          answerType: "numberPad",
          display: { ang: { kind: "sumDeg", a, b }, promptText: addPhr[band][phrIdx(i, 13, 4)](a, b) },
        })
      );
    });
  }

  // Letter-free.
  const lfPhr = [(a, b) => `${a} + ${b} = ? (deg)`, (a, b) => `${b} + ${a} = ? (deg)`];
  for (const band of ["band2", "band3"]) {
    addData[band].forEach(([a, b], i) => {
      items.push(
        item("angleSum", "procedural", `sumLF_${band}`, band, {
          answer: a + b,
          answerType: "numberPad",
          display: { ang: { kind: "sumDeg", a, b }, promptText: lfPhr[i % 2](a, b) },
        })
      );
    });
  }

  const triplePhr = {
    band2: [
      (a, b, c) => `Three angles around a line measure ${a}, ${b}, and ${c} degrees. Type their total in degrees.`,
      (a, b, c) => `Add three adjacent angles: ${a}, ${b}, and ${c} degrees. What is the sum?`,
      (a, b, c) => `Angles of ${a}, ${b}, and ${c} degrees combine into how many degrees?`,
      (a, b, c) => `Sum the three measures ${a}, ${b}, ${c} degrees. Type it.`,
    ],
    band3: [
      (a, b, c) => `Compute the total of three adjacent angles: ${a}, ${b}, and ${c} degrees.`,
      (a, b, c) => `Exactly how many degrees do ${a}, ${b}, and ${c} degrees make together?`,
      (a, b, c) => `Determine the combined sweep of ${a}, ${b}, and ${c} degrees.`,
      (a, b, c) => `Three angle pieces of ${a}, ${b}, ${c} degrees total how many degrees?`,
    ],
  };
  const tripleData = {
    band2: [[20, 30, 40], [25, 35, 30], [15, 45, 20], [30, 30, 30], [10, 40, 25], [35, 25, 15], [20, 20, 50], [45, 15, 30], [25, 30, 35], [40, 10, 20], [15, 35, 40], [30, 45, 15], [20, 25, 45]],
    band3: [[50, 60, 70], [45, 85, 50], [65, 55, 60], [90, 45, 45], [80, 40, 60], [75, 65, 40], [55, 95, 30], [100, 35, 45], [70, 60, 50], [85, 55, 40], [60, 45, 75], [95, 40, 45], [110, 30, 40]],
  };
  for (const band of ["band2", "band3"]) {
    tripleData[band].forEach(([a, b, c], i) => {
      items.push(
        item("angleSum", "procedural", `tripleDeg_${band}`, band, {
          answer: a + b + c,
          answerType: "numberPad",
          display: { ang: { kind: "sumDeg3", a, b, c }, promptText: triplePhr[band][phrIdx(i, 13, 4)](a, b, c) },
        })
      );
    });
  }

  const pickPhr = {
    band2: [
      (a, b) => `Adjacent angles measure ${a} and ${b} degrees. Pick their total.`,
      (a, b) => `Pick the combined measure of ${a}-degree and ${b}-degree angles.`,
      (a, b) => `Which choice totals angles of ${a} and ${b} degrees?`,
      (a, b) => `Choose the sum of ${a} degrees and ${b} degrees.`,
    ],
    band3: [
      (a, b) => `Identify the total of adjacent ${a}-degree and ${b}-degree angles.`,
      (a, b) => `Which value is the combined sweep of ${a} and ${b} degrees?`,
      (a, b) => `Precisely which choice equals ${a} degrees plus ${b} degrees?`,
      (a, b) => `Determine the sum of the measures ${a} and ${b} degrees from the choices.`,
    ],
  };
  for (const band of ["band2", "band3"]) {
    addData[band].forEach(([a, b], i) => {
      const good = a + b;
      const wrong = [...new Set([good + 10, Math.max(5, good - 10), good + 5])].filter((x) => x !== good);
      items.push(
        item("angleSum", "procedural", `sumPick_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seed += 1)),
          display: { ang: { kind: "sumDeg", a, b }, promptText: pickPhr[band][phrIdx(i, 13, 4)](a, b) },
        })
      );
    });
  }

  return items;
}

export function angleSumConceptual() {
  const items = [];

  const sumSaidPhr = {
    band1: [
      (nm, a, b, said) => `${nm} says ${a} quarter turn${a === 1 ? "" : "s"} plus ${b} more make ${said} quarter turns in all. Is ${nm} right?`,
      (nm, a, b, said) => `${a} and ${b} quarter turns total ${said}, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, a, b, said) => `${nm} adds adjacent angles of ${a} and ${b} degrees and reports ${said} degrees. Does the report hold?`,
      (nm, a, b, said) => `Check ${nm}'s total of ${said} degrees for angles ${a} and ${b}. Right or not?`,
    ],
    band3: [
      (nm, a, b, said) => `${nm} certifies ${said} degrees as the combined measure of ${a} and ${b} degrees. Valid?`,
      (nm, a, b, said) => `Audit the sum: ${a} plus ${b} degrees, recorded ${said} by ${nm}. Clean?`,
    ],
  };
  const sumSaidData = {
    band1: [[1, 1, 2, true], [1, 2, 4, false], [2, 1, 3, true], [2, 2, 3, false], [1, 3, 4, true], [3, 1, 5, false], [2, 2, 4, true], [1, 1, 3, false], [1, 2, 3, true], [2, 1, 4, false], [1, 3, 5, false], [3, 1, 4, true], [2, 2, 5, false], [1, 1, 2, true], [1, 2, 3, true], [2, 1, 2, false], [1, 3, 4, true], [3, 1, 3, false]],
    band2: [[30, 45, 75, true], [60, 25, 95, false], [40, 35, 75, true], [50, 20, 80, false], [55, 30, 85, true], [15, 65, 70, false], [70, 25, 95, true], [45, 45, 100, false], [20, 60, 80, true], [35, 50, 95, false], [65, 30, 95, true], [25, 40, 55, false], [10, 75, 85, true], [30, 45, 85, false], [60, 25, 85, true], [40, 35, 65, false], [55, 30, 95, false], [50, 20, 70, true]],
    band3: [[85, 40, 125, true], [95, 55, 140, false], [110, 45, 155, true], [75, 80, 165, false], [120, 35, 155, true], [65, 90, 145, false], [105, 60, 165, true], [140, 25, 175, false], [55, 115, 170, true], [130, 45, 165, false], [70, 95, 165, true], [150, 30, 190, false], [45, 125, 170, true], [85, 40, 135, false], [95, 55, 150, true], [110, 45, 145, false], [75, 80, 155, true], [120, 35, 145, false]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    sumSaidData[band].forEach(([a, b, said, ok], i) => {
      items.push(
        item("angleSum", "conceptual", `sumSaidJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ang: { kind: band === "band1" ? "sumUnitsSaid" : "sumSaid", a, b, said }, promptText: sumSaidPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), a, b, said), truth: ok },
        })
      );
    });
  }

  const rightPairPhr = {
    band1: [
      (nm, ok) => `${nm} says two square corners put together make a straight line. Is ${nm} right?`,
      (nm, ok) => `${nm} says two square corners put together make a full turn. Is ${nm} right?`,
    ],
    band2: [
      (nm, a, b, ok) => `${nm} claims angles of ${a} and ${b} degrees together make a right angle. Is the claim right?`,
      (nm, a, b, ok) => `${a} degrees plus ${b} degrees complete a right angle, says ${nm}. Is that right?`,
    ],
    band3: [
      (nm, a, b, ok) => `${nm} asserts ${a} and ${b} degrees combine into a straight angle. Is the assertion right?`,
      (nm, a, b, ok) => `Together, ${a} and ${b} degrees form a straight line, states ${nm}. Sound statement?`,
    ],
  };
  const rightPairData = {
    band2: [[30, 60, true], [40, 40, false], [45, 45, true], [50, 30, false], [20, 70, true], [35, 45, false], [10, 80, true], [25, 55, false], [15, 75, true], [60, 40, false], [55, 35, true], [65, 15, false], [5, 85, true], [70, 30, false], [80, 10, true], [45, 55, false], [25, 65, true], [50, 50, false]],
    band3: [[90, 90, true], [85, 85, false], [120, 60, true], [100, 70, false], [45, 135, true], [95, 75, false], [30, 150, true], [110, 60, false], [65, 115, true], [125, 45, false], [140, 40, true], [155, 35, false], [75, 105, true], [80, 90, false], [20, 160, true], [130, 60, false], [55, 125, true], [70, 100, false]],
  };
  for (let i = 0; i < 18; i += 1) {
    const ok = i % 2 === 0;
    items.push(
      item("angleSum", "conceptual", `pairMakeJudge_band1`, "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { ang: { kind: "authored" }, promptText: rightPairPhr.band1[i % 2](nameAt(i * 3 + 2)) + (i >= 12 ? " Picture the two corners." : i >= 6 ? " Try drawing it." : ""), truth: ok },
      })
    );
  }
  for (const band of ["band2", "band3"]) {
    const target = band === "band2" ? 90 : 180;
    rightPairData[band].forEach(([a, b, ok], i) => {
      items.push(
        item("angleSum", "conceptual", `pairMakeJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ang: { kind: "pairSaid", a, b, total: target }, promptText: rightPairPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band]), a, b, ok), truth: ok },
        })
      );
    });
  }

  const orderPhr = {
    band1: [
      (nm) => `${nm} says turning a quarter and then another quarter gives the same total turn as doing the two quarters in the other order. Is ${nm} right?`,
      (nm) => `Swapping the order of two turns changes the total turn, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm) => `${nm} says adding a 30-degree angle to a 45-degree angle gives the same total as adding them the other way around. Is ${nm} right?`,
      (nm) => `Order matters when adding two angle measures, argues ${nm}. Is that right?`,
    ],
    band3: [
      (nm) => `${nm} states that angle measures add in any order without changing the total. Sound statement?`,
      (nm) => `Rearranging three angle pieces changes their combined measure, asserts ${nm}. Is the assertion right?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < 16; i += 1) {
      const ok = i % 2 === 0;
      items.push(
        item("angleSum", "conceptual", `orderJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ang: { kind: "authored" }, promptText: orderPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band])) + (i >= 8 ? " Adding is adding." : ""), truth: ok },
        })
      );
    }
  }

  return items;
}

/* ================================================================== */
/* missingAngle                                                        */
/* ================================================================== */

export function missingProcedural() {
  const items = [];

  const missTurnPhr = [
    (k) => `A full spin is missing some quarter turns: ${k} ${k === 1 ? "is" : "are"} done. How many quarter turns are missing? Type it.`,
    (k) => `To finish a full spin after ${k} quarter turn${k === 1 ? "" : "s"}, how many quarter turns are missing?`,
    (k) => `${k} of the 4 quarter turns in a spin ${k === 1 ? "is" : "are"} drawn. How many quarter turns are missing from it?`,
    (k) => `The spin diagram shows ${k} quarter turn${k === 1 ? "" : "s"} of 4. How many quarter turns does it still lack?`,
    (k) => `A skater completes ${k} quarter turn${k === 1 ? "" : "s"} of a full spin. How many quarter turns does the skater still need?`,
    (k) => `With ${k} quarter turn${k === 1 ? "" : "s"} marked, how many quarter turns are missing from the full spin?`,
    (k) => `Of 4 quarter turns, only ${k} ${k === 1 ? "appears" : "appear"}. How many quarter turns are missing?`,
    (k) => `Count the gap: ${k} quarter turn${k === 1 ? "" : "s"} shown, a full spin needed. How many quarter turns short is it?`,
  ];
  for (let i = 0; i < 24; i += 1) {
    const k = (i % 3) + 1;
    items.push(
      item("missingAngle", "procedural", `missingQuarters_band1`, "band1", {
        answer: 4 - k,
        answerType: "numberPad",
        display: { ang: { kind: "missDeg", total: 360, a: k * 90 }, promptText: missTurnPhr[Math.floor(i / 3) % 8](k) },
      })
    );
  }
  const linePhr = [
    (k) => `A straight line holds 2 square corners. ${k} ${k === 1 ? "is" : "are"} drawn. How many square corners are missing? Type it.`,
    (k) => `Two square corners make a straight line; ${k} ${k === 1 ? "is" : "are"} in place. How many square corners are missing now?`,
    (k) => `The line needs 2 square corners and shows ${k}. How many square corners does it still need?`,
    (k) => `Of the 2 square corners along a straight line, ${k} ${k === 1 ? "is" : "are"} filled. How many square corners are left to fill?`,
    (k) => `A straight edge takes 2 square corners; ${k} ${k === 1 ? "is" : "are"} placed. How many square corners remain to place?`,
    (k) => `${k} square corner${k === 1 ? "" : "s"} of the 2 along a line ${k === 1 ? "is" : "are"} shaded. How many square corners are unshaded?`,
    (k) => `To complete the straight line's 2 square corners, with ${k} done, how many square corners are missing?`,
    (k) => `The diagram fills ${k} of a straight line's 2 square corners. How many square corners are missing from the diagram?`,
  ];
  const PLACES = [" The line is on grid paper.", " The line is on the whiteboard.", " The line is chalked on the playground.", " The line runs along a ruler.", " The line crosses a poster.", " The line sits on a worksheet."];
  for (let i = 0; i < 14; i += 1) {
    const k = 1;
    items.push(
      item("missingAngle", "procedural", `missingCornerLine_band1`, "band1", {
        answer: 2 - k,
        answerType: "numberPad",
        display: { ang: { kind: "missDeg", total: 180, a: 90 }, promptText: linePhr[i % 8](k) + (i >= 8 ? PLACES[i - 8] : "") },
      })
    );
  }
  const fullHalfPhr = [
    (k) => `A full turn is 2 half turns. ${k} ${k === 1 ? "is" : "are"} done. How many half turns are missing? Type it.`,
    (k) => `Of the 2 half turns in a full spin, ${k} ${k === 1 ? "is" : "are"} complete. How many half turns are still missing?`,
    (k) => `The spin needs 2 half turns and has ${k}. How many half turns are missing?`,
    (k) => `${k} half turn${k === 1 ? "" : "s"} of 2 ${k === 1 ? "is" : "are"} made. How many half turns remain missing?`,
    (k) => `To close the full turn's 2 half turns, with ${k} done, how many half turns are missing?`,
    (k) => `A dial shows ${k} of its 2 half turns. How many half turns does it lack?`,
    (k) => `Just ${k} half turn${k === 1 ? "" : "s"} of the needed 2 ${k === 1 ? "is" : "are"} drawn. How many half turns are absent?`,
    (k) => `Count what's missing: ${k} of 2 half turns done. How many half turns to go?`,
  ];
  const SPINNERS = [" It is a game spinner.", " It is a bottle cap.", " It is a merry-go-round.", " It is a steering wheel.", " It is a record on a turntable.", " It is a revolving door."];
  for (let i = 0; i < 14; i += 1) {
    items.push(
      item("missingAngle", "procedural", `missingHalf_band1`, "band1", {
        answer: 1,
        answerType: "numberPad",
        display: { ang: { kind: "missDeg", total: 360, a: 180 }, promptText: fullHalfPhr[i % 8](1) + (i >= 8 ? SPINNERS[i - 8] : "") },
      })
    );
  }

  const toPhr = {
    band2: [
      (t, a, tn) => `Two angles form ${tn}. One measures ${a} degrees. The other = ? Type it.`,
      (t, a, tn) => `An angle of ${a} degrees needs a partner to complete ${tn}. How many degrees is the partner?`,
      (t, a, tn) => `Together with ${a} degrees, which measure completes ${tn}? Type it.`,
      (t, a, tn) => `${tn[0].toUpperCase() + tn.slice(1)} splits into ${a} degrees and one more angle. Type the other angle's degrees.`,
    ],
    band3: [
      (t, a, tn) => `Compute the partner: ${a} degrees plus what makes ${tn}?`,
      (t, a, tn) => `Exactly how many degrees pair with ${a} degrees to form ${tn}?`,
      (t, a, tn) => `Determine the missing measure when ${tn} is split into ${a} degrees and one other angle.`,
      (t, a, tn) => `${tn[0].toUpperCase() + tn.slice(1)} minus a ${a}-degree part leaves how many degrees?`,
    ],
  };
  const toData = {
    band2: [[90, 30, "a right angle"], [90, 50, "a right angle"], [90, 60, "a right angle"], [90, 20, "a right angle"], [90, 70, "a right angle"], [90, 15, "a right angle"], [180, 120, "a straight angle"], [180, 45, "a straight angle"], [180, 90, "a straight angle"], [180, 60, "a straight angle"], [180, 135, "a straight angle"], [180, 30, "a straight angle"], [90, 35, "a right angle"]],
    band3: [[180, 65, "a straight angle"], [180, 115, "a straight angle"], [180, 25, "a straight angle"], [360, 90, "a full turn"], [360, 270, "a full turn"], [360, 120, "a full turn"], [360, 200, "a full turn"], [360, 45, "a full turn"], [90, 40, "a right angle"], [90, 25, "a right angle"], [180, 155, "a straight angle"], [360, 310, "a full turn"], [180, 95, "a straight angle"]],
  };
  for (const band of ["band2", "band3"]) {
    toData[band].forEach(([t, a, tn], i) => {
      items.push(
        item("missingAngle", "procedural", `missingTo_${band}`, band, {
          answer: t - a,
          answerType: "numberPad",
          display: { ang: { kind: "missDeg", total: t, a }, promptText: toPhr[band][phrIdx(i, 13, 4)](t, a, tn) },
        })
      );
    });
  }

  // Letter-free (subtraction shape, disjoint from measureAngle's "a + ? = t").
  const lfPhr = [(t, a) => `${t} - ${a} = ? (deg)`, (t, a) => `${t} - ${a} = ? (degrees)`];
  for (const band of ["band2", "band3"]) {
    toData[band].forEach(([t, a], i) => {
      items.push(
        item("missingAngle", "procedural", `missLF_${band}`, band, {
          answer: t - a,
          answerType: "numberPad",
          display: { ang: { kind: "missDeg", total: t, a }, promptText: lfPhr[i % 2](t, a) },
        })
      );
    });
  }

  const threePhr = {
    band2: [
      (a, b) => `Three angles make a straight angle. Two measure ${a} and ${b} degrees. The third = ? Type it.`,
      (a, b) => `A straight angle splits into ${a} degrees, ${b} degrees, and one more piece. Type the third piece's degrees.`,
      (a, b) => `With ${a} and ${b} degrees placed along a straight angle, how many degrees complete it?`,
      (a, b) => `The three parts of a straight angle include ${a} and ${b} degrees. What is the remaining part?`,
    ],
    band3: [
      (a, b) => `Compute the third angle when a full turn contains parts of ${a} and ${b} degrees.`,
      (a, b) => `A full turn splits into ${a} degrees, ${b} degrees, and one more angle. Exactly how many degrees is it?`,
      (a, b) => `Determine the missing piece of a full turn holding ${a} and ${b} degrees.`,
      (a, b) => `Of a full turn, ${a} and ${b} degrees are used. The rest = ? Type it.`,
    ],
  };
  const threeData = {
    band2: [[60, 70], [45, 85], [90, 30], [55, 65], [40, 95], [75, 50], [20, 110], [100, 35], [65, 45], [80, 60], [25, 105], [50, 70], [35, 90]],
    band3: [[120, 130], [90, 180], [100, 150], [80, 160], [140, 105], [95, 155], [70, 190], [200, 60], [130, 120], [85, 175], [160, 90], [115, 135], [105, 145]],
  };
  for (const band of ["band2", "band3"]) {
    const total = band === "band2" ? 180 : 360;
    threeData[band].forEach(([a, b], i) => {
      items.push(
        item("missingAngle", "procedural", `missingThird_${band}`, band, {
          answer: total - a - b,
          answerType: "numberPad",
          display: { ang: { kind: "missDeg3", total, a, b }, promptText: threePhr[band][phrIdx(i, 13, 4)](a, b) },
        })
      );
    });
  }

  const missPickPhr = {
    band2: [
      (t, a, tn) => `An angle of ${a} degrees needs which partner to complete ${tn}? Pick it.`,
      (t, a, tn) => `Pick the measure that joins ${a} degrees to make ${tn}.`,
      (t, a, tn) => `Which choice pairs with ${a} degrees to form ${tn}?`,
      (t, a, tn) => `Choose the missing measure: ${a} degrees plus what makes ${tn}?`,
    ],
    band3: [
      (t, a, tn) => `Identify the partner of ${a} degrees in ${tn}.`,
      (t, a, tn) => `Which value completes ${tn} alongside ${a} degrees?`,
      (t, a, tn) => `Precisely which choice fills ${tn} after ${a} degrees?`,
      (t, a, tn) => `Determine the measure pairing with ${a} degrees to total ${tn}.`,
    ],
  };
  let seedMp = 691;
  for (const band of ["band2", "band3"]) {
    toData[band].forEach(([t, a, tn], i) => {
      const good = t - a;
      const wrong = [...new Set([good + 10, Math.max(5, good - 10), t])].filter((x) => x !== good);
      items.push(
        item("missingAngle", "procedural", `missPick_${band}`, band, {
          answer: good,
          choices: shuffled([good, ...wrong.slice(0, 3)], (seedMp += 1)),
          display: { ang: { kind: "missDeg", total: t, a }, promptText: missPickPhr[band][phrIdx(i, 13, 4)](t, a, tn) },
        })
      );
    });
  }

  return items;
}

export function missingConceptual() {
  const items = [];

  const missSaidPhr = {
    band1: [
      (nm, k, said) => `${nm} says a full spin with ${k} quarter turn${k === 1 ? "" : "s"} done is missing ${said} quarter turns. Is ${nm} right?`,
      (nm, k, said) => `After ${k} quarter turn${k === 1 ? "" : "s"}, ${said} more finish the spin, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, t, a, said) => `${nm} says an angle of ${a} degrees needs ${said} more degrees to make ${t === 90 ? "a right angle" : "a straight angle"}. Does the number hold?`,
      (nm, t, a, said) => `Check ${nm}'s missing measure: ${a} degrees plus ${said} makes ${t === 90 ? "a right angle" : "a straight angle"}. Right or not?`,
    ],
    band3: [
      (nm, t, a, said) => `${nm} certifies that ${a} degrees and ${said} degrees complete ${t === 180 ? "a straight angle" : "a full turn"}. Valid?`,
      (nm, t, a, said) => `Audit: ${a} degrees recorded with a ${said}-degree partner for ${t === 180 ? "a straight angle" : "a full turn"}, per ${nm}. Clean?`,
    ],
  };
  const missSaidData = {
    band1: [[1, 3, true], [2, 3, false], [3, 1, true], [1, 2, false], [2, 2, true], [3, 2, false], [1, 3, true], [2, 1, false], [3, 1, true], [1, 1, false], [2, 2, true], [3, 3, false], [1, 3, true], [2, 3, false], [3, 1, true], [1, 2, false], [2, 2, true], [3, 2, false]],
    band2: [[90, 30, 60, true], [90, 45, 55, false], [90, 60, 30, true], [90, 20, 60, false], [180, 120, 60, true], [180, 45, 145, false], [180, 90, 90, true], [180, 60, 110, false], [90, 70, 20, true], [90, 15, 65, false], [180, 135, 45, true], [180, 30, 140, false], [90, 35, 55, true], [90, 50, 30, false], [180, 100, 80, true], [180, 75, 115, false], [90, 25, 65, true], [90, 80, 20, false]],
    band3: [[180, 65, 115, true], [180, 115, 75, false], [360, 90, 270, true], [360, 270, 100, false], [180, 25, 155, true], [360, 120, 220, false], [360, 200, 160, true], [360, 45, 305, false], [180, 55, 125, true], [360, 15, 300, false], [180, 155, 25, true], [360, 310, 60, false], [180, 95, 85, true], [180, 140, 50, false], [360, 250, 110, true], [360, 180, 190, false], [180, 35, 145, true], [360, 65, 275, false]],
  };
  missSaidData.band1.forEach(([k, said, ok], i) => {
    items.push(
      item("missingAngle", "conceptual", `missSaidJudge_band1`, "band1", {
        answer: ok ? "Yes" : "No",
        choices: ["Yes", "No"],
        display: { ang: { kind: "missUnitsSaid", have: k, said, whole: 4 }, promptText: missSaidPhr.band1[i % 2](nameAt(i * 3 + 1), k, said), truth: ok },
      })
    );
  });
  for (const band of ["band2", "band3"]) {
    missSaidData[band].forEach(([t, a, said, ok], i) => {
      items.push(
        item("missingAngle", "conceptual", `missSaidJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ang: { kind: "missSaid", total: t, a, said }, promptText: missSaidPhr[band][i % 2](nameAt(i * 3 + 1 + OFF[band]), t, a, said), truth: ok },
        })
      );
    });
  }

  const biggerPhr = {
    band1: [
      (nm) => `${nm} says that when a square corner is split into a big part and a small part, the two parts still make the whole square corner together. Is ${nm} right?`,
      (nm) => `Splitting a square corner loses some of the turn, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm) => `${nm} says the two parts of a split right angle always add back to 90 degrees. Is ${nm} right?`,
      (nm) => `Splitting a right angle changes its total, argues ${nm}. Is that right?`,
    ],
    band3: [
      (nm) => `${nm} states that however a straight angle is cut in two, the parts sum to 180 degrees. Sound statement?`,
      (nm) => `The pieces of a cut straight angle can total more than 180 degrees, asserts ${nm}. Is the assertion right?`,
    ],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < 16; i += 1) {
      const ok = i % 2 === 0;
      items.push(
        item("missingAngle", "conceptual", `splitWholeJudge_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ang: { kind: "authored" }, promptText: biggerPhr[band][i % 2](nameAt(i * 3 + 2 + OFF[band])) + (i >= 8 ? " The whole stays the whole." : ""), truth: ok },
        })
      );
    }
  }

  const overPhr = {
    band1: [
      (nm) => `${nm} draws a part of a square corner that is BIGGER than the square corner itself. Can a part be bigger than its whole?`,
      (nm) => `A piece of a turn can be larger than the full turn, claims ${nm}. Is that right?`,
    ],
    band2: [
      (nm, a) => `${nm} says an angle of ${a} degrees can be one part of a right angle. Is ${nm} right?`,
      (nm, a) => `${a} degrees fits inside a right angle as a part, claims ${nm}. Is that right?`,
    ],
    band3: [
      (nm, a) => `${nm} offers ${a} degrees as one piece of a straight angle. Can it be?`,
      (nm, a) => `A ${a}-degree part belongs inside a straight angle, states ${nm}. Sound statement?`,
    ],
  };
  const overData = {
    band2: [[30, true], [120, false], [45, true], [95, false], [60, true], [100, false], [20, true], [135, false], [70, true], [150, false], [15, true], [91, false], [85, true], [110, false], [40, true], [175, false]],
    band3: [[120, true], [200, false], [90, true], [190, false], [45, true], [270, false], [150, true], [185, false], [30, true], [225, false], [175, true], [181, false], [60, true], [300, false], [135, true], [210, false]],
  };
  for (let i = 0; i < 16; i += 1) {
    items.push(
      item("missingAngle", "conceptual", `partWholeTrap_band1`, "band1", {
        answer: "No",
        choices: ["Yes", "No"],
        display: { ang: { kind: "trapNo" }, promptText: overPhr.band1[i % 2](nameAt(i * 3 + 3)) + (i >= 8 ? " A part never beats its whole." : ""), truth: false },
      })
    );
  }
  for (const band of ["band2", "band3"]) {
    const total = band === "band2" ? 90 : 180;
    overData[band].forEach(([a, ok], i) => {
      items.push(
        item("missingAngle", "conceptual", `partWholeTrap_${band}`, band, {
          answer: ok ? "Yes" : "No",
          choices: ["Yes", "No"],
          display: { ang: { kind: "partFits", a, total }, promptText: overPhr[band][i % 2](nameAt(i * 3 + 3 + OFF[band]), a), truth: ok },
        })
      );
    });
  }

  return items;
}
