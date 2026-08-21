/* areaPerimeter bank — application stories. Three skeletons per subskill
 * per band, 17 names each. Conventions in areaPerimTemplates.js.
 */

import { item, nameAt, OFF } from "./areaPerimTemplates.js";

const N = 17;

export function areaPerimStories() {
  const items = [];

  const dims = {
    band1: [[2, 3], [3, 4], [2, 5], [4, 5], [3, 6], [2, 6], [5, 6], [4, 4], [3, 3], [2, 4], [5, 5], [6, 6], [4, 6], [2, 3], [3, 4], [2, 5], [4, 5]],
    band2: [[7, 4], [8, 5], [9, 3], [10, 6], [11, 4], [12, 5], [7, 6], [8, 8], [9, 7], [10, 10], [11, 6], [12, 3], [9, 9], [7, 4], [8, 5], [9, 3], [10, 6]],
    band3: [[12, 8], [13, 6], [14, 5], [15, 4], [12, 12], [13, 9], [14, 7], [15, 8], [12, 11], [13, 13], [14, 10], [15, 15], [14, 14], [12, 8], [13, 6], [14, 5], [15, 4]],
  };
  const unit = { band1: "units", band2: "cm", band3: "m" };
  const sqUnit = { band1: "unit squares", band2: "square cm", band3: "square m" };

  /* ---------------- area ---------------- */

  const rugPhr = {
    band1: (nm, w, h) => `${nm}'s play mat is ${w} units long and ${h} units wide. How many unit squares of floor does the mat cover?`,
    band2: (nm, w, h) => `${nm} unrolls a rug ${w} cm by ${h} cm in the reading nook. How many square cm of floor does the rug cover?`,
    band3: (nm, w, h) => `${nm} lays a tarp ${w} m by ${h} m over the infield. How many square m does the tarp cover?`,
  };
  const gardenPhr = {
    band1: (nm, w, h) => `${nm} plants a garden bed ${w} units by ${h} units. How many unit squares of soil does ${nm} plant?`,
    band2: (nm, w, h) => `${nm} preps a vegetable patch ${w} cm by ${h} cm in the planter box. How many square cm of soil is that?`,
    band3: (nm, w, h) => `${nm} tills a field section ${w} m by ${h} m. How many square m does ${nm} till?`,
  };
  const paintPhr = {
    band1: (nm, w, h) => `${nm} paints a poster board ${w} units wide and ${h} units tall, edge to edge. How many unit squares of board get paint?`,
    band2: (nm, w, h) => `${nm} rolls paint over a wall panel ${w} cm by ${h} cm. How many square cm does ${nm} paint?`,
    band3: (nm, w, h) => `${nm} seals a floor section ${w} m by ${h} m. How many square m does the sealant cover?`,
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [w, h] = dims[band][i];
      const mk = (phr, off, st) =>
        item("area", "application", `${st}_${band}`, band, {
          answer: w * h,
          answerType: "numberPad",
          display: { ap: { kind: "areaOf", w, h }, promptText: phr(nameAt(i + off + OFF[band]), w, h) },
        });
      items.push(mk(rugPhr[band], 1, "storyRug"));
      items.push(mk(gardenPhr[band], 4, "storyGardenA"));
      items.push(mk(paintPhr[band], 7, "storyPaint"));
    }
  }

  /* ---------------- perimeter ---------------- */

  const fencePhr = {
    band1: (nm, w, h) => `${nm} builds a block fence all the way around a ${w}-unit by ${h}-unit pen. How many units of fence does ${nm} build?`,
    band2: (nm, w, h) => `${nm} fences a rabbit run ${w} cm by ${h} cm on the balcony. How many cm of fencing does ${nm} need?`,
    band3: (nm, w, h) => `${nm} fences a paddock ${w} m by ${h} m. How many m of fencing does the paddock take?`,
  };
  const framePhr = {
    band1: (nm, w, h) => `${nm} glues ribbon around the edge of a ${w}-unit by ${h}-unit picture. How many units of ribbon does ${nm} glue?`,
    band2: (nm, w, h) => `${nm} tapes trim around a photo ${w} cm by ${h} cm. How many cm of trim go on?`,
    band3: (nm, w, h) => `${nm} welds edging around a sign ${w} m by ${h} m. How many m of edging does the sign need?`,
  };
  const walkPhr = {
    band1: (nm, w, h) => `${nm} walks once around a ${w}-unit by ${h}-unit sandbox. How many units does ${nm} walk?`,
    band2: (nm, w, h) => `${nm} jogs one lap around a court ${w} cm by ${h} cm on the floor plan. How many cm long is the lap on the plan?`,
    band3: (nm, w, h) => `${nm} strides once around a plaza ${w} m by ${h} m. How many m is the full trip?`,
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [w, h] = dims[band][(i + 3) % N];
      const mk = (phr, off, st) =>
        item("perimeter", "application", `${st}_${band}`, band, {
          answer: 2 * (w + h),
          answerType: "numberPad",
          display: { ap: { kind: "perimOf", w, h }, promptText: phr(nameAt(i + off + OFF[band]), w, h) },
        });
      items.push(mk(fencePhr[band], 2, "storyFence"));
      items.push(mk(framePhr[band], 5, "storyFrame"));
      items.push(mk(walkPhr[band], 8, "storyWalk"));
    }
  }

  /* ---------------- compositeFigures ---------------- */

  const roomsPhr = {
    band1: (nm, a, b, c, d) => `${nm} covers two mats with paper: one ${a} units by ${b} units, one ${c} units by ${d} units. How many unit squares of paper does ${nm} use in all?`,
    band2: (nm, a, b, c, d) => `${nm} carpets two rooms, ${a} cm by ${b} cm and ${c} cm by ${d} cm on the plan. How many square cm of carpet is that altogether?`,
    band3: (nm, a, b, c, d) => `${nm} turfs two fields, ${a} m by ${b} m and ${c} m by ${d} m. How many square m of turf does ${nm} lay in total?`,
  };
  const patioPhr = {
    band1: (nm, a, b, c, d) => `${nm} joins a ${a}-by-${b} sticker sheet to a ${c}-by-${d} sheet with no overlap. How many unit squares is the combined sheet?`,
    band2: (nm, a, b, c, d) => `${nm} builds an L-shaped patio from a ${a} by ${b} slab and a ${c} by ${d} slab, no overlap. How many square cm is the patio on the plan?`,
    band3: (nm, a, b, c, d) => `${nm} pours an L-shaped court from a ${a} m by ${b} m pad and a ${c} m by ${d} m pad. How many square m is the court?`,
  };
  const cutStoryPhr = {
    band1: (nm, W, H, w, h) => `${nm} cuts a ${w}-by-${h} corner off a ${W}-by-${H} sheet of grid paper. How many unit squares of the sheet are left?`,
    band2: (nm, W, H, w, h) => `${nm} trims a ${w} cm by ${h} cm notch from a ${W} cm by ${H} cm board. How many square cm of board remain?`,
    band3: (nm, W, H, w, h) => `${nm} clears a ${w} m by ${h} m pond corner out of a ${W} m by ${H} m lawn. How many square m of lawn remain?`,
  };
  const joinData = {
    band1: [[2, 3, 2, 2], [3, 3, 2, 2], [2, 4, 2, 2], [3, 4, 2, 2], [2, 3, 2, 3], [2, 4, 2, 3], [3, 3, 2, 3], [2, 2, 2, 2], [2, 5, 2, 2], [4, 3, 2, 2], [2, 4, 3, 2], [2, 5, 2, 3], [3, 4, 2, 3], [2, 3, 2, 2], [3, 3, 2, 2], [2, 4, 2, 2], [3, 4, 2, 2]],
    band2: [[7, 4, 3, 2], [8, 5, 4, 3], [9, 3, 5, 2], [10, 6, 4, 4], [11, 4, 3, 3], [12, 5, 5, 4], [7, 6, 2, 2], [8, 8, 4, 2], [9, 7, 3, 4], [10, 10, 5, 3], [11, 6, 4, 5], [12, 3, 6, 2], [9, 9, 2, 5], [7, 4, 3, 2], [8, 5, 4, 3], [9, 3, 5, 2], [10, 6, 4, 4]],
    band3: [[12, 8, 6, 4], [13, 6, 7, 3], [14, 5, 8, 4], [15, 4, 9, 5], [12, 12, 6, 6], [13, 9, 7, 5], [14, 7, 8, 6], [15, 8, 9, 4], [12, 11, 5, 5], [13, 13, 6, 3], [14, 10, 7, 7], [15, 15, 8, 5], [14, 14, 9, 6], [12, 8, 6, 4], [13, 6, 7, 3], [14, 5, 8, 4], [15, 4, 9, 5]],
  };
  const cutData = {
    band1: [[4, 4, 2, 2], [5, 4, 2, 2], [4, 3, 2, 2], [5, 3, 2, 2], [4, 4, 2, 3], [5, 4, 2, 3], [3, 3, 2, 2], [5, 4, 3, 2], [4, 3, 2, 1], [5, 3, 2, 1], [4, 4, 3, 2], [5, 5, 2, 2], [5, 5, 2, 3], [4, 4, 2, 2], [5, 4, 2, 2], [4, 3, 2, 2], [5, 3, 2, 2]],
    band2: [[10, 8, 4, 3], [12, 6, 5, 2], [9, 9, 3, 3], [11, 7, 4, 4], [10, 10, 5, 3], [12, 8, 6, 2], [9, 7, 2, 4], [11, 9, 5, 4], [10, 6, 3, 5], [12, 12, 4, 6], [9, 8, 4, 2], [11, 11, 6, 3], [10, 9, 5, 5], [10, 8, 4, 3], [12, 6, 5, 2], [9, 9, 3, 3], [11, 7, 4, 4]],
    band3: [[15, 10, 6, 4], [14, 12, 7, 3], [15, 12, 8, 5], [13, 11, 6, 6], [15, 15, 7, 4], [14, 10, 8, 3], [13, 13, 5, 7], [15, 14, 9, 4], [14, 11, 6, 5], [13, 12, 7, 7], [15, 11, 8, 6], [14, 13, 9, 5], [15, 13, 10, 4], [15, 10, 6, 4], [14, 12, 7, 3], [15, 12, 8, 5], [13, 11, 6, 6]],
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [a, b, c, d] = joinData[band][i];
      items.push(
        item("compositeFigures", "application", `storyRooms_${band}`, band, {
          answer: a * b + c * d,
          answerType: "numberPad",
          display: { ap: { kind: "joinAreas", a, b, c, d }, promptText: roomsPhr[band](nameAt(i + 1 + OFF[band]), a, b, c, d) },
        })
      );
      const [a2, b2, c2, d2] = joinData[band][(i + 7) % N];
      items.push(
        item("compositeFigures", "application", `storyPatio_${band}`, band, {
          answer: a2 * b2 + c2 * d2,
          answerType: "numberPad",
          display: { ap: { kind: "joinAreas", a: a2, b: b2, c: c2, d: d2 }, promptText: patioPhr[band](nameAt(i + 4 + OFF[band]), a2, b2, c2, d2) },
        })
      );
      const [W, H, w, h] = cutData[band][i];
      items.push(
        item("compositeFigures", "application", `storyCut_${band}`, band, {
          answer: W * H - w * h,
          answerType: "numberPad",
          display: { ap: { kind: "cutArea", W, H, w, h }, promptText: cutStoryPhr[band](nameAt(i + 7 + OFF[band]), W, H, w, h) },
        })
      );
    }
  }

  /* ---------------- measureReasoning ---------------- */

  const needFencePhr = {
    band1: (nm, w, h) => `${nm}'s chalk court is ${w} units by ${h} units. To chalk the border once around, how many units of chalk line does ${nm} draw?`,
    band2: (nm, w, h) => `${nm} edges a flower bed ${w} cm by ${h} cm with brick trim. How many cm of trim does the border take?`,
    band3: (nm, w, h) => `${nm} tapes off a work zone ${w} m by ${h} m. How many m of tape run around it?`,
  };
  const needCoverPhr = {
    band1: (nm, w, h) => `${nm} covers a ${w}-unit by ${h}-unit table top with square tiles, one per unit square. How many tiles does ${nm} place?`,
    band2: (nm, w, h) => `${nm} papers a display board ${w} cm by ${h} cm completely. How many square cm of paper is that?`,
    band3: (nm, w, h) => `${nm} sods a yard ${w} m by ${h} m corner to corner. How many square m of sod go down?`,
  };
  const bothPhr = {
    band1: (nm, w, h) => `${nm} looks at a ${w}-unit by ${h}-unit mat and needs its border length, not its inside space. How many units is the border?`,
    band2: (nm, w, h) => `Planning trim, not paint, ${nm} measures around a ${w} cm by ${h} cm panel. How many cm does the trim run?`,
    band3: (nm, w, h) => `For railing, not flooring, ${nm} measures around a deck ${w} m by ${h} m. How many m of railing is that?`,
  };
  for (const band of ["band1", "band2", "band3"]) {
    for (let i = 0; i < N; i += 1) {
      const [w, h] = dims[band][(i + 5) % N];
      items.push(
        item("measureReasoning", "application", `storyChalk_${band}`, band, {
          answer: 2 * (w + h),
          answerType: "numberPad",
          display: { ap: { kind: "perimOf", w, h }, promptText: needFencePhr[band](nameAt(i + 2 + OFF[band]), w, h) },
        })
      );
      const [w2, h2] = dims[band][(i + 9) % N];
      items.push(
        item("measureReasoning", "application", `storyCover_${band}`, band, {
          answer: w2 * h2,
          answerType: "numberPad",
          display: { ap: { kind: "areaOf", w: w2, h: h2 }, promptText: needCoverPhr[band](nameAt(i + 5 + OFF[band]), w2, h2) },
        })
      );
      const [w3, h3] = dims[band][(i + 12) % N];
      items.push(
        item("measureReasoning", "application", `storyTrim_${band}`, band, {
          answer: 2 * (w3 + h3),
          answerType: "numberPad",
          display: { ap: { kind: "perimOf", w: w3, h: h3 }, promptText: bothPhr[band](nameAt(i + 8 + OFF[band]), w3, h3) },
        })
      );
    }
  }

  return items;
}
