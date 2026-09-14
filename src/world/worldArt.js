import manifest from "../engagement/meadow/artManifest.json";

/**
 * The world draws with the same generated art the Meadow ships
 * (public/meadow/, sizes in artManifest.json). Everything is loaded straight
 * from those WebP files — no atlas pipeline, no build step.
 */
const BASE = (import.meta.env?.BASE_URL ?? "/") + "meadow/";

export function birdUrl(id) {
  return `${BASE}birds/${id}.webp`;
}
export function propUrl(id) {
  return `${BASE}props/${id}.webp`;
}
export function zoneUrl(id) {
  return `${BASE}zones/${id}.webp`;
}
export function eggUrl(stage) {
  return `${BASE}egg/stage${stage}.webp`;
}
export function featherUrl(id) {
  return `${BASE}feathers/${id}.webp`;
}

export function birdSize(id) {
  return manifest.birds?.[id] ?? { w: 512, h: 512 };
}
export function propSize(id) {
  return manifest.props?.[id] ?? { w: 512, h: 512 };
}

/** The kid's avatar and its two poses. */
export const AVATAR = { standing: "skylark", flying: "skylark-fly" };

/** Every texture the world scene may need, keyed the way the scene asks. */
export function buildLoadList(zones) {
  const list = new Map();
  const add = (key, url) => {
    if (!list.has(key)) list.set(key, url);
  };
  for (const z of ["meadow", "pond", "woods", "cliffs"]) add(`zone-${z}`, zoneUrl(z));
  for (const id of Object.keys(manifest.birds)) add(`bird-${id}`, birdUrl(id));
  for (const id of Object.keys(manifest.props)) add(`prop-${id}`, propUrl(id));
  for (let s = 0; s < 4; s++) add(`egg-${s}`, eggUrl(s));
  for (const id of Object.keys(manifest.feathers)) add(`feather-${id}`, featherUrl(id));
  // Zone content may reference art by id; make sure it's covered.
  for (const zone of zones) {
    for (const npc of zone.npcs) add(`bird-${npc.bird}`, birdUrl(npc.bird));
    for (const item of zone.home?.shop ?? []) add(`prop-${item.prop}`, propUrl(item.prop));
    for (const f of zone.feathers ?? []) add(`feather-${f.art}`, featherUrl(f.art));
  }
  return list;
}
