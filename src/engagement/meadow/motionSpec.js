/**
 * Every animation in the Meadow (gamification spec §14) — the table, verbatim,
 * as data. Three tiers: ambient loops that never stop, responses to a tap, and
 * ceremonies that play once. Nothing bounces aggressively, nothing flashes,
 * nothing loops in sync with anything else.
 *
 * Durations in ms unless noted; easings are CSS/framer-compatible.
 *
 * Rules carried by the runtime:
 *  - Only one tier-3 animation plays at a time. If a flight earns stars and
 *    hatches an egg, the stars land first and the hatch waits for the tap.
 *  - Every ceremony is skippable with a tap except the 600ms of stars landing.
 *  - Reduced motion: tier 1 OFF, tier 2 becomes a 120ms opacity fade with no
 *    movement, tier 3 becomes a still frame with the same copy. The Meadow
 *    stays fully usable and nothing is hidden.
 */

export const EASE = {
  inOut: "easeInOut",
  out: "easeOut",
  in: "easeIn",
  linear: "linear",
  tapHop: [0.34, 1.3, 0.64, 1],
  sheetIn: [0.2, 0.8, 0.2, 1],
  drawer: [0.2, 0.9, 0.25, 1],
};

export const TIER1 = {
  cloudDrift: { loopS: 26, ease: EASE.inOut, alternate: true, driftPx: 26, groups: 2 },
  canopySway: { loopS: 9, ease: EASE.inOut, alternate: true, degrees: 1.1 },
  grassSway: { loopS: 6, ease: EASE.inOut, alternate: true, degrees: 1.1 },
  pondRipple: { loopS: 7, ease: EASE.inOut, alternate: true, scaleX: [0.97, 1.03], opacity: [0.75, 1], frozenInWinter: true },
  birdIdleBob: { loopSMin: 4, loopSMax: 6, ease: EASE.inOut, alternate: true, riseYPx: -5, randomisedAtPlacementAndSaved: true },
  playLoops: { shallowsS: 8, feederS: 6, birdBathS: 10, dustPatchS: 7, ease: EASE.inOut, oneBirdPerSpot: true },
  signatureMoves: { minS: 2, maxS: 4, ease: EASE.inOut, perSession: [3, 4], minGapS: 90 },
  seasonParticle: { loopSMin: 16, loopSMax: 28, ease: EASE.linear, sprites: [3, 5], maxOnScreen: 5, snowSlowest: true },
};

export const TIER2 = {
  birdTapHop: { ms: 200, ease: EASE.tapHop, riseYPx: -14, tiltDeg: 2, rareAnswersWithSignature: true },
  callBubble: { inMs: 160, holdMs: 900, outMs: 200, riseYPx: 8, easeIn: EASE.out, easeOut: EASE.in, audioStartsWithRise: true },
  guideSheetIn: { ms: 260, ease: EASE.sheetIn, widthPx: 560, outMs: 200 },
  sceneShift: { ms: 300, ease: EASE.inOut, maxPx: 180, runsWithSheet: true },
  sceneDim: { ms: 200, ease: EASE.linear, inkOpacity: 0.12 },
  guideDrawer: { ms: 320, ease: EASE.drawer, fromHandlePx: 78, toHeightPct: 82, dragFollows: true, snapPastPct: 40 },
  entrySwap: { ms: 180, ease: EASE.out, riseYPx: 6, plateSlotNeverCollapses: true },
  zonePan: { chipMs: 600, settleMs: 240, rubberBandMs: 120, rubberBandPx: 40, ease: EASE.inOut },
};

export const TIER3 = {
  starsIntoNest: { perStarMs: 600, staggerMs: 40, ease: EASE.inOut, spriteCap: 14, skippable: false },
  nestCountUp: { ms: 800, ease: EASE.out, scalePulse: [1, 1.06, 1] },
  birdArrives: { ms: 1200, ease: EASE.out, isTheReceipt: true, nameBubbleHoldMs: 2000 },
  eggWarms: { ms: 700, ease: EASE.out, crackAtPct: [25, 50, 75], crackDrawMs: 300, shiverPx: 3 },
  hatch: { beats: 6, watchedS: 9, skippedS: 2, ease: EASE.inOut, skippableBeats: [2, 3, 5], waitingBeats: [1, 4, 6], dimPct: 30 },
  departure: { ms: 3000, ease: EASE.inOut, path: ["lift", "circle", "joinV"] },
  zoneOpens: { totalMs: 1500, signSwingMs: 400, hedgePartMs: 500, panThroughMs: 600, oncePerZoneEver: true },
  seasonTurns: { ms: 1500, ease: EASE.inOut, crossFades: ["canopy", "ground"], firstOpenOfQuarterOnly: true },
  dayTurnsToNight: { ms: 2000, ease: EASE.linear },
};

export const REDUCED_MOTION = {
  tier1: "off",
  tier2: { ms: 120, opacityOnly: true },
  tier3: "still frame with the same copy",
  nothingHidden: true,
};

/** Queue rule: at most one tier-3 ceremony at a time, stars land first. */
export const TIER3_ORDER = [
  "starsIntoNest",
  "nestCountUp",
  "zoneOpens",
  "birdArrives",
  "departure",
  "hatch",
  "seasonTurns",
  "dayTurnsToNight",
];
