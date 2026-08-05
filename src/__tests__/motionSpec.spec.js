import { describe, expect, it } from "vitest";
import { TIER1, TIER2, TIER3, REDUCED_MOTION, TIER3_ORDER, EASE } from "../engagement/meadow/motionSpec.js";
import { emptyEngagement, applySessionEnd } from "../engagement/engagementStore.js";

// §14: the motion table, verbatim. These assertions ARE the table — a change
// here is a change to the spec, not a tuning knob.

describe("tier 1 · ambient — always running, never in sync", () => {
  it("matches the table", () => {
    expect(TIER1.cloudDrift).toMatchObject({ loopS: 26, driftPx: 26, groups: 2, alternate: true });
    expect(TIER1.canopySway).toMatchObject({ loopS: 9, degrees: 1.1 });
    expect(TIER1.grassSway).toMatchObject({ loopS: 6, degrees: 1.1 });
    expect(TIER1.pondRipple).toMatchObject({ loopS: 7, scaleX: [0.97, 1.03], opacity: [0.75, 1], frozenInWinter: true });
    expect(TIER1.birdIdleBob).toMatchObject({ loopSMin: 4, loopSMax: 6, riseYPx: -5, randomisedAtPlacementAndSaved: true });
    expect(TIER1.playLoops).toMatchObject({ shallowsS: 8, feederS: 6, birdBathS: 10, dustPatchS: 7, oneBirdPerSpot: true });
    expect(TIER1.signatureMoves).toMatchObject({ minS: 2, maxS: 4, perSession: [3, 4], minGapS: 90 });
    expect(TIER1.seasonParticle).toMatchObject({ loopSMin: 16, loopSMax: 28, maxOnScreen: 5, snowSlowest: true });
  });
});

describe("tier 2 · response — something the kid did", () => {
  it("matches the table", () => {
    expect(TIER2.birdTapHop).toMatchObject({ ms: 200, riseYPx: -14, tiltDeg: 2, rareAnswersWithSignature: true });
    expect(TIER2.birdTapHop.ease).toEqual([0.34, 1.3, 0.64, 1]);
    expect(TIER2.callBubble).toMatchObject({ inMs: 160, holdMs: 900, outMs: 200, riseYPx: 8, audioStartsWithRise: true });
    expect(TIER2.guideSheetIn).toMatchObject({ ms: 260, outMs: 200, widthPx: 560 });
    expect(TIER2.guideSheetIn.ease).toEqual([0.2, 0.8, 0.2, 1]);
    expect(TIER2.sceneShift).toMatchObject({ ms: 300, maxPx: 180, runsWithSheet: true });
    expect(TIER2.sceneDim).toMatchObject({ ms: 200, inkOpacity: 0.12 });
    expect(TIER2.guideDrawer).toMatchObject({ ms: 320, fromHandlePx: 78, toHeightPct: 82, snapPastPct: 40 });
    expect(TIER2.guideDrawer.ease).toEqual([0.2, 0.9, 0.25, 1]);
    expect(TIER2.entrySwap).toMatchObject({ ms: 180, riseYPx: 6, plateSlotNeverCollapses: true });
    expect(TIER2.zonePan).toMatchObject({ chipMs: 600, settleMs: 240, rubberBandMs: 120, rubberBandPx: 40 });
  });
});

describe("tier 3 · ceremony — once, and it earns the time", () => {
  it("matches the table", () => {
    expect(TIER3.starsIntoNest).toMatchObject({ perStarMs: 600, staggerMs: 40, spriteCap: 14, skippable: false });
    expect(TIER3.nestCountUp).toMatchObject({ ms: 800, scalePulse: [1, 1.06, 1] });
    expect(TIER3.birdArrives).toMatchObject({ ms: 1200, isTheReceipt: true, nameBubbleHoldMs: 2000 });
    expect(TIER3.eggWarms).toMatchObject({ ms: 700, crackAtPct: [25, 50, 75], crackDrawMs: 300, shiverPx: 3 });
    expect(TIER3.hatch).toMatchObject({ beats: 6, watchedS: 9, skippedS: 2, skippableBeats: [2, 3, 5], waitingBeats: [1, 4, 6], dimPct: 30 });
    expect(TIER3.departure).toMatchObject({ ms: 3000, path: ["lift", "circle", "joinV"] });
    expect(TIER3.zoneOpens).toMatchObject({ totalMs: 1500, signSwingMs: 400, hedgePartMs: 500, panThroughMs: 600, oncePerZoneEver: true });
    expect(TIER3.seasonTurns).toMatchObject({ ms: 1500, firstOpenOfQuarterOnly: true });
    expect(TIER3.dayTurnsToNight).toMatchObject({ ms: 2000, ease: EASE.linear });
  });

  it("stars land first in the queue, and only the star landing is unskippable", () => {
    expect(TIER3_ORDER[0]).toBe("starsIntoNest");
    expect(TIER3.starsIntoNest.skippable).toBe(false);
  });
});

describe("reduced motion", () => {
  it("tier 1 off · tier 2 → 120ms opacity · tier 3 → still frames, nothing hidden", () => {
    expect(REDUCED_MOTION.tier1).toBe("off");
    expect(REDUCED_MOTION.tier2).toEqual({ ms: 120, opacityOnly: true });
    expect(REDUCED_MOTION.tier3).toMatch(/still frame/);
    expect(REDUCED_MOTION.nothingHidden).toBe(true);
  });
});

describe("stars into the Nest (pending drop)", () => {
  it("accumulates at flight end and rides the engagement blob", () => {
    let state = applySessionEnd(emptyEngagement(), 14, "2026-08-04").state;
    expect(state.pendingNestDrop).toBe(14);
    state = applySessionEnd(state, 6, "2026-08-04").state;
    expect(state.pendingNestDrop).toBe(20);
  });
});
