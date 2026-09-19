/**
 * Furniture per zone — pure data, shared with the native engine bundle so
 * iOS places the same props at the same perch coordinates (zone space is
 * 1024×588 on both platforms; see perches.js).
 */
/*
 * Furniture per zone: prop id, base-center (x, y) in zone coordinates, and
 * target height in zone px. Positions serve the perch inventory — the tree
 * carries the branch/hollow perches, the fence rail the fencePost perches,
 * etc. Validated against the composed previews before wiring.
 */
export const SCENERY = {
  meadow: [
    { prop: "tree", x: 330, y: 442, h: 330, sway: true },
    { prop: "nestbox", x: 178, y: 440, h: 140 },
    { prop: "feeder", x: 940, y: 442, h: 120 },
    { prop: "fence", x: 920, y: 452, h: 58 },
    { prop: "log", x: 566, y: 500, h: 46 },
    { prop: "reeds", x: 700, y: 478, h: 75 },
    { prop: "reeds", x: 792, y: 492, h: 62 },
  ],
  pond: [
    { prop: "tree", x: 356, y: 448, h: 330, sway: true },
    { prop: "nestbox", x: 204, y: 446, h: 140 },
    { prop: "feeder", x: 966, y: 448, h: 120 },
    { prop: "fence", x: 944, y: 460, h: 58 },
    { prop: "log", x: 592, y: 506, h: 46 },
    { prop: "reeds", x: 920, y: 470, h: 70 },
  ],
  woods: [
    { prop: "tree", x: 80, y: 430, h: 210 },
    { prop: "tree", x: 760, y: 436, h: 260 },
    { prop: "tree", x: 312, y: 442, h: 330, sway: true },
    { prop: "nestbox", x: 160, y: 442, h: 140 },
    { prop: "feeder", x: 922, y: 446, h: 120 },
    { prop: "fence", x: 902, y: 456, h: 58 },
    { prop: "log", x: 548, y: 502, h: 46 },
    { prop: "reeds", x: 682, y: 474, h: 72 },
  ],
  cliffs: [
    { prop: "tree", x: 342, y: 436, h: 330, sway: true },
    { prop: "rocks", x: 140, y: 500, h: 150 },
    { prop: "nestbox", x: 190, y: 436, h: 140 },
    { prop: "feeder", x: 952, y: 436, h: 120 },
    { prop: "fence", x: 932, y: 448, h: 58 },
    { prop: "log", x: 578, y: 494, h: 46 },
    { prop: "reeds", x: 712, y: 468, h: 70 },
  ],
};
