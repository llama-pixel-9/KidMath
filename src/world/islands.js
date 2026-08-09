import { MODE_GROUPS } from "../modes/index.js";

/**
 * The archipelago: one island per home-page mode group, so the map and the
 * mode picker stay the same taxonomy (modeGroups.spec.js already guards the
 * groups themselves). Islands are drawn as circular vignettes of the
 * existing painted zone backdrops (public/meadow/zones), reused across
 * islands with flips/tints until each strand gets bespoke art.
 *
 * Positions are world-space 1x pixels in WORLD_BOUNDS, laid out as a lazy
 * S-curve so panning reveals them in learning order.
 */
export const WORLD_BOUNDS = { width: 2400, height: 1600 };

const ISLAND_ART = {
  numbers: { backdrop: "meadow", flip: false, prop: "tree" },
  addSubtract: { backdrop: "pond", flip: false, prop: "reeds" },
  multiplyDivide: { backdrop: "woods", flip: false, prop: "log" },
  fractionsDecimals: { backdrop: "cliffs", flip: false, prop: "rocks" },
  measureMoneyTime: { backdrop: "meadow", flip: true, prop: "feeder" },
  shapesData: { backdrop: "woods", flip: true, prop: "sign" },
};

const ISLAND_POSITIONS = {
  numbers: { x: 460, y: 500, r: 175 },
  addSubtract: { x: 1040, y: 340, r: 165 },
  multiplyDivide: { x: 1640, y: 500, r: 165 },
  fractionsDecimals: { x: 1990, y: 960, r: 160 },
  measureMoneyTime: { x: 1340, y: 1180, r: 160 },
  shapesData: { x: 660, y: 1120, r: 160 },
};

export const ISLANDS = MODE_GROUPS.map((group) => ({
  id: group.id,
  title: group.title,
  modeIds: group.modeIds,
  ...ISLAND_POSITIONS[group.id],
  ...ISLAND_ART[group.id],
}));

/** Where the guide bird and the first-run flight land: the first island. */
export const HOME_ISLAND_ID = ISLANDS[0].id;
