/* angles bank — application stories. Three skeletons per subskill per band,
 * 17 names each; band 1 stays degree-free. Conventions in anglesTemplates.js.
 */

import { shuffled } from "./countingTemplates.js";
import { item, nameAt, OFF, CLASSES, classOf } from "./anglesTemplates.js";

const N = 17;

export function anglesStories() {
  const items = [];
  let seed = 671;

  /* ---------------- classifyAngle ---------------- */

  const doorPhr = {
    band1: (nm, state, kind) => `${nm} opens a door ${state}. Which kind of angle does the door make with the wall? Pick it.`,
    band2: (nm, state, kind) => `${nm} swings a locker door ${state}. Pick the kind of angle between door and frame.`,
    band3: (nm, state, kind) => `${nm} props a hatch ${state}. Which kind of angle does the hatch form with its frame?`,
  };
  const doorStates = [
    ["just a crack", "acute"],
    ["exactly to a square corner", "right"],
    ["far past a square corner", "obtuse"],
    ["flat against the wall", "straight"],
  ];
  const clockPhr = {
    band1: (nm, time, kind) => `${nm} looks at the clock at ${time}. Which kind of angle do the two hands make? Pick it.`,
    band2: (nm, time, kind) => `At ${time}, ${nm} checks the clock hands. Pick the kind of angle between them.`,
    band3: (nm, time, kind) => `${nm} reads the clock at ${time}. Classify the angle between the hands.`,
  };
  const clockTimes = [
    ["3:00", "right", 90],
    ["6:00", "straight", 180],
    ["1:00", "acute", 30],
    ["5:00", "obtuse", 150],
  ];
  const scissorPhr = {
    band1: (nm, state, kind) => `${nm} holds scissors open ${state}. Which kind of angle is between the blades? Pick it.`,
    band2: (nm, state, kind) => `${nm} spreads compasses ${state}. Pick the kind of angle between the arms.`,
    band3: (nm, state, kind) => `${nm} sets calipers ${state}. Which kind of angle sits between the jaws?`,
  };
  const scissorStates = [
    ["a tiny sliver", "acute"],
    ["to a square corner", "right"],
    ["very wide, past a square corner", "obtuse"],
    ["completely flat", "straight"],
  ];
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [st, kind] = doorStates[i % 4];
      items.push(
        item("classifyAngle", "application", `storyDoor_${band}`, band, {
          answer: kind,
          choices: shuffled([...CLASSES], (seed += 1)),
          display: { ang: { kind: "authoredChoice" }, promptText: doorPhr[band](nameAt(i + 1 + OFF[band]), st, kind) },
        })
      );
      const [time, kind2, deg] = clockTimes[i % 4];
      items.push(
        item("classifyAngle", "application", `storyClock_${band}`, band, {
          answer: kind2,
          choices: shuffled([...CLASSES], (seed += 1)),
          display: { ang: { kind: "classify", deg }, promptText: clockPhr[band](nameAt(i + 4 + OFF[band]), time, kind2) },
        })
      );
      const [st3, kind3] = scissorStates[i % 4];
      items.push(
        item("classifyAngle", "application", `storyScissors_${band}`, band, {
          answer: kind3,
          choices: shuffled([...CLASSES], (seed += 1)),
          display: { ang: { kind: "authoredChoice" }, promptText: scissorPhr[band](nameAt(i + 7 + OFF[band]), st3, kind3) },
        })
      );
    }
  }

  /* ---------------- measureAngle ---------------- */

  const robotPhr = {
    band1: (nm, whole, unit, W, U) => `${nm}'s toy robot makes ${whole}. How many ${unit} is that? Type it.`,
    band2: (nm, name, d) => `${nm}'s drone rotates through ${name}. How many degrees does it rotate? Type it.`,
    band3: (nm, name, d) => `${nm} programs a camera to sweep ${name}. Exactly how many degrees is the sweep?`,
  };
  const B1_TURNS = [
    ["a half turn", "quarter turns", 180, 90],
    ["a full turn", "quarter turns", 360, 90],
    ["a full turn", "half turns", 360, 180],
    ["a straight-line turn", "square corners", 180, 90],
  ];
  const DEG_TURNS = [
    ["a quarter turn", 90],
    ["a half turn", 180],
    ["a full turn", 360],
    ["three quarter turns", 270],
  ];
  const dialPhr = {
    band1: (nm, whole, unit, W, U) => `${nm} twists a jar lid through ${whole}. Count it in ${unit}: how many ${unit} is the twist?`,
    band2: (nm, name, d) => `${nm} turns an oven dial through ${name}. Type the turn in degrees.`,
    band3: (nm, name, d) => `${nm} rotates a telescope mount through ${name}. Determine the rotation in degrees.`,
  };
  const wheelPhr = {
    band1: (nm, whole, unit, W, U) => `${nm} spins a game wheel through ${whole}. How many ${unit} does the wheel pass? Type it.`,
    band2: (nm, name, d) => `${nm} swings a gate through ${name}. How many degrees does the gate swing?`,
    band3: (nm, name, d) => `${nm} steers a robot arm through ${name}. Compute the swing in degrees.`,
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      if (band === "band1") {
        const [whole, unit, W, U] = B1_TURNS[i % 4];
        const mk = (phr, off, st) =>
          item("measureAngle", "application", `${st}_band1`, "band1", {
            answer: W / U,
            answerType: "numberPad",
            display: { ang: { kind: "divTurn", whole: W, unit: U }, promptText: phr(nameAt(i + off), whole, unit, W, U) },
          });
        items.push(mk(robotPhr.band1, 2, "storyRobot"));
        items.push(mk(dialPhr.band1, 5, "storyDial"));
        items.push(mk(wheelPhr.band1, 8, "storyWheel"));
      } else {
        const [name, d] = DEG_TURNS[i % 4];
        const mk = (phr, off, st) =>
          item("measureAngle", "application", `${st}_${band}`, band, {
            answer: d,
            answerType: "numberPad",
            display: { ang: { kind: "benchDeg", d }, promptText: phr(nameAt(i + off + OFF[band]), name, d) },
          });
        items.push(mk(robotPhr[band], 2, "storyRobot"));
        items.push(mk(dialPhr[band], 5, "storyDial"));
        items.push(mk(wheelPhr[band], 8, "storyWheel"));
      }
    }
  }

  /* ---------------- angleSum ---------------- */

  const spinPhr = {
    band1: (nm, a, b) => `${nm} spins ${a} quarter turn${a === 1 ? "" : "s"}, pauses, then spins ${b} more. How many quarter turns does ${nm} spin in all?`,
    band2: (nm, a, b) => `${nm} tapes together pizza slice tips of ${a} degrees and ${b} degrees. How many degrees is the combined tip?`,
    band3: (nm, a, b) => `${nm} joins fan blades sweeping ${a} degrees and ${b} degrees with no gap. How many degrees do they sweep together?`,
  };
  const slicePhr = {
    band1: (nm, a, b) => `${nm} folds a paper ${a} square corner${a === 1 ? "" : "s"}' worth, then ${b} more square corners' worth. How many square corners of turn is that in all?`,
    band2: (nm, a, b) => `${nm} opens a book cover ${a} degrees, then ${b} degrees more. How many degrees has the cover opened in total?`,
    band3: (nm, a, b) => `${nm} tilts a solar panel ${a} degrees at dawn and ${b} degrees more at noon. What total angle has it tilted?`,
  };
  const dancePhr = {
    band1: (nm, a, b) => `In a dance move, ${nm} turns ${a} half turn${a === 1 ? "" : "s"} and then ${b} more. How many half turns is the whole move?`,
    band2: (nm, a, b) => `${nm} swings a golf club back ${a} degrees and follows through ${b} degrees. How many degrees does the club travel in all?`,
    band3: (nm, a, b) => `${nm} rotates a stage light ${a} degrees, then ${b} degrees further. Compute the total rotation in degrees.`,
  };
  const b1Sums = [[1, 1], [1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [1, 1], [1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [1, 1], [1, 2], [2, 1], [2, 2], [1, 3]];
  const degSums = {
    band2: [[30, 45], [60, 25], [40, 35], [50, 20], [55, 30], [15, 65], [70, 25], [45, 45], [20, 60], [35, 50], [65, 30], [25, 40], [10, 75], [30, 45], [60, 25], [40, 35], [50, 20]],
    band3: [[85, 40], [95, 55], [110, 45], [75, 80], [120, 35], [65, 90], [105, 60], [140, 25], [55, 115], [130, 45], [70, 95], [150, 30], [45, 125], [85, 40], [95, 55], [110, 45], [75, 80]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [a, b] = band === "band1" ? b1Sums[i] : degSums[band][i];
      const claim = band === "band1" ? { kind: "sumUnits", a, b } : { kind: "sumDeg", a, b };
      const mk = (phr, off, st) =>
        item("angleSum", "application", `${st}_${band}`, band, {
          answer: a + b,
          answerType: "numberPad",
          display: { ang: claim, promptText: phr(nameAt(i + off + OFF[band]), a, b) },
        });
      items.push(mk(spinPhr[band], 1, "storySpin"));
      items.push(mk(slicePhr[band], 4, "storyFold"));
      items.push(mk(dancePhr[band], 7, "storyDance"));
    }
  }

  /* ---------------- missingAngle ---------------- */

  const doorMissPhr = {
    band1: (nm, k) => `${nm}'s wind-up toy needs 4 quarter turns of its key. ${nm} has wound ${k}. How many quarter turns are missing?`,
    band2: (nm, t, a, tn) => `${nm} opens a door ${a} degrees of the ${t} degrees to ${tn}. How many more degrees can it open?`,
    band3: (nm, t, a, tn) => `${nm} raises a drawbridge ${a} degrees of its full ${t}-degree lift. How many degrees remain?`,
  };
  const piePhr = {
    band1: (nm, k) => `A pinwheel needs 4 quarter turns for a full spin. After ${nm} blows it ${k} quarter turn${k === 1 ? "" : "s"}, how many quarter turns are missing?`,
    band2: (nm, t, a, tn) => `Of the ${t} degrees in ${tn}, ${nm}'s spinner has swept ${a} degrees. How many degrees are left to sweep?`,
    band3: (nm, t, a, tn) => `${nm} has cut pie slices totaling ${a} degrees from the ${t}-degree pie. How many degrees of pie remain?`,
  };
  const gatePhr = {
    band1: (nm, k) => `${nm}'s music box crank takes 4 quarter turns per song. ${nm} cranks ${k}. How many quarter turns are missing for the song?`,
    band2: (nm, t, a, tn) => `A gate swings ${a} of the ${t} degrees to ${tn}. How many more degrees must ${nm} push it?`,
    band3: (nm, t, a, tn) => `${nm}'s telescope has panned ${a} degrees of a ${t}-degree sweep. Compute the degrees still to pan.`,
  };
  const b1Miss = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2];
  const degMiss = {
    band2: [[90, 30, "the wall"], [90, 45, "the wall"], [90, 60, "the wall"], [90, 20, "the wall"], [180, 120, "flat open"], [180, 45, "flat open"], [180, 90, "flat open"], [180, 60, "flat open"], [90, 70, "the wall"], [90, 15, "the wall"], [180, 135, "flat open"], [180, 30, "flat open"], [90, 35, "the wall"], [90, 55, "the wall"], [180, 100, "flat open"], [180, 155, "flat open"], [90, 65, "the wall"]],
    band3: [[360, 90, "a full circle"], [360, 270, "a full circle"], [360, 120, "a full circle"], [360, 200, "a full circle"], [180, 65, "flat"], [180, 115, "flat"], [180, 25, "flat"], [360, 45, "a full circle"], [360, 310, "a full circle"], [180, 155, "flat"], [180, 95, "flat"], [360, 250, "a full circle"], [360, 175, "a full circle"], [180, 140, "flat"], [360, 65, "a full circle"], [180, 35, "flat"], [360, 300, "a full circle"]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      if (band === "band1") {
        const k = b1Miss[i];
        const mk = (phr, off, st) =>
          item("missingAngle", "application", `${st}_band1`, "band1", {
            answer: 4 - k,
            answerType: "numberPad",
            display: { ang: { kind: "missDeg", total: 360, a: k * 90 }, promptText: phr(nameAt(i + off), k) },
          });
        items.push(mk(doorMissPhr.band1, 2, "storyWind"));
        items.push(mk(piePhr.band1, 5, "storyPinwheel"));
        items.push(mk(gatePhr.band1, 8, "storyCrank"));
      } else {
        const [t, a, tn] = degMiss[band][i];
        const mk = (phr, off, st) =>
          item("missingAngle", "application", `${st}_${band}`, band, {
            answer: t - a,
            answerType: "numberPad",
            display: { ang: { kind: "missDeg", total: t, a }, promptText: phr(nameAt(i + off + OFF[band]), t, a, tn) },
          });
        items.push(mk(doorMissPhr[band], 2, "storyDoorGap"));
        items.push(mk(piePhr[band], 5, "storyPie"));
        items.push(mk(gatePhr[band], 8, "storyGate"));
      }
    }
  }

  return items;
}
