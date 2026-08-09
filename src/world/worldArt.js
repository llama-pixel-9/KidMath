/**
 * The existing Larkit art the world uses — the Recraft meadow set under
 * public/meadow/ (copied byte-identical from the larkit-rebrand branch, so
 * the eventual merge is clean). Phaser loads webp natively; these don't go
 * through the SVG atlas pipeline, which is only for vector masters.
 *
 * Native sizes are recorded here (from the rebrand's artManifest) because
 * webp headers aren't readable until load and layout math needs them earlier.
 */
export const ZONE_BACKDROPS = {
  meadow: { url: "/meadow/zones/meadow.webp", w: 2048, h: 1176 },
  pond: { url: "/meadow/zones/pond.webp", w: 2048, h: 1176 },
  woods: { url: "/meadow/zones/woods.webp", w: 2048, h: 1176 },
  cliffs: { url: "/meadow/zones/cliffs.webp", w: 2048, h: 1176 },
};

/**
 * The skylark's two poses. Motion comes from code (docs/bird-animation-plan.md:
 * poses from art, motion from rigs): flight alternates fly/perch at ~6Hz with
 * tilt + bob (reads as flapping); standing uses the folded-wing perch pose.
 * Real multi-frame flight art (Level 2) drops in as extra keys here.
 */
export const GUIDE_BIRD = {
  key: "skylark-fly",
  url: "/meadow/birds/skylark-fly.webp",
  w: 512,
  h: 443,
  perchKey: "skylark-perch",
  perchUrl: "/meadow/birds/skylark.webp",
  perchW: 511,
  perchH: 489,
};

/** Props sprinkled on well-mastered islands (bloom stage 3). */
export const BLOOM_PROPS = {
  tree: { url: "/meadow/props/tree.webp", w: 652, h: 900 },
  feeder: { url: "/meadow/props/feeder.webp", w: 302, h: 640 },
  reeds: { url: "/meadow/props/reeds.webp", w: 259, h: 640 },
  rocks: { url: "/meadow/props/rocks.webp", w: 474, h: 640 },
  log: { url: "/meadow/props/log.webp", w: 640, h: 259 },
  sign: { url: "/meadow/props/sign.webp", w: 396, h: 640 },
};
