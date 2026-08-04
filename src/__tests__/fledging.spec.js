import { describe, expect, it } from "vitest";
import { createAdaptiveSession, getNextQuestion, recordAnswer } from "../mathEngine";
import {
  applyFlightEnd,
  applyFledgingResult,
  applyClearNomination,
  ROUGH_PRECISION,
  MAX_FLEDGING_ATTEMPTS,
} from "../engagement/fledging.js";
import { emptyEngagement } from "../engagement/engagementStore.js";

// Gamification spec §03: nomination + Fledging Flights replace within-session
// auto-promotion; two consecutive rough flights replace mid-session demotion.

function submissionFor(question) {
  // multiSelect answers may be a list of acceptable selections — submit the
  // first, mirroring the session loop.
  return Array.isArray(question.answer) && Array.isArray(question.answer[0])
    ? question.answer[0]
    : question.answer;
}

function forceHighMastery(session) {
  for (const key of Object.keys(session.skillMastery)) {
    session.skillMastery[key] = {
      ...session.skillMastery[key],
      attempts: 10,
      correct: 10,
    };
  }
}

describe("engine under the fledging flag", () => {
  it("nominates instead of leveling, and never changes level mid-flight", () => {
    let session = createAdaptiveSession("addition", 40, { fledging: true });
    session.level = 2;
    for (let i = 0; i < 6; i++) {
      forceHighMastery(session);
      const { question, isRetry } = getNextQuestion(session);
      const result = recordAnswer(session, question, submissionFor(question), 500, isRetry);
      expect(result.levelChanged).toBe(false);
      session = result.session;
    }
    expect(session.level).toBe(2);
    expect(session.nominated).toBe(true);
    expect(Array.isArray(session.nominationWeakSubskills)).toBe(true);
    expect(session.nominationWeakSubskills.length).toBeGreaterThan(0);
  });

  it("keeps the historical auto-promotion when the flag is off", () => {
    let session = createAdaptiveSession("addition", 40, {});
    session.level = 2;
    let promoted = false;
    for (let i = 0; i < 6 && !promoted; i++) {
      forceHighMastery(session);
      const { question, isRetry } = getNextQuestion(session);
      const result = recordAnswer(session, question, submissionFor(question), 500, isRetry);
      promoted = result.levelChanged && result.newLevel > 2;
      session = result.session;
    }
    expect(promoted).toBe(true);
    expect(session.nominated).toBeUndefined();
  });

  it("disables mid-session demotion under fledging", () => {
    let session = createAdaptiveSession("addition", 15, { fledging: true });
    session.level = 5;
    for (let i = 0; i < 2; i++) {
      const { question } = getNextQuestion(session);
      const result = recordAnswer(session, question, null, 1200, false);
      expect(result.levelChanged).toBe(false);
      session = result.session;
    }
    expect(session.level).toBe(5);
  });

  it("still demotes on two mistakes when the flag is off", () => {
    let session = createAdaptiveSession("addition", 15, {});
    session.level = 5;
    for (let i = 0; i < 2; i++) {
      const { question } = getNextQuestion(session);
      session = recordAnswer(session, question, null, 1200, false).session;
    }
    expect(session.level).toBeLessThan(5);
  });

  it("a challenge set rotates the nominated weak subskills and never re-nominates", () => {
    let session = createAdaptiveSession("addition", 6, {
      fledging: true,
      challengeSubskills: ["alpha", "beta"],
      savedProgress: { level: 4 },
    });
    expect(session.level).toBe(4);
    const seen = [];
    for (let i = 0; i < 4; i++) {
      forceHighMastery(session);
      const { question, isRetry } = getNextQuestion(session);
      if (!isRetry) seen.push(question.scheduler.targetSubskill);
      session = recordAnswer(session, question, submissionFor(question), 500, isRetry).session;
    }
    expect(seen.slice(0, 2)).toEqual(["alpha", "beta"]);
    expect(session.nominated).toBeUndefined();
    expect(session.level).toBe(4);
  });
});

describe("nomination lifecycle (§03, exactly four clears)", () => {
  const MODE = "addition";
  const goodNominatedFlight = {
    precisionRatio: 0.9,
    nominated: true,
    weakSubskills: ["makeTen"],
    dayKey: "2026-08-04",
  };

  it("a nominated good flight sets a persisted nomination", () => {
    const { state, nomination, roughFlight, glideDown } = applyFlightEnd(
      emptyEngagement(),
      MODE,
      goodNominatedFlight
    );
    expect(nomination).toMatchObject({ attempts: 0, weakSubskills: ["makeTen"] });
    expect(state.nominations[MODE]).toBeTruthy();
    expect(roughFlight).toBe(false);
    expect(glideDown).toBe(false);
  });

  it("re-nomination never resets failed-attempt counts", () => {
    let state = applyFlightEnd(emptyEngagement(), MODE, goodNominatedFlight).state;
    state = applyFledgingResult(state, MODE, false).state;
    const again = applyFlightEnd(state, MODE, goodNominatedFlight);
    expect(again.nomination.attempts).toBe(1);
  });

  it("a rough flight clears the nomination silently and counts toward gliding down", () => {
    let state = applyFlightEnd(emptyEngagement(), MODE, goodNominatedFlight).state;
    const rough = applyFlightEnd(state, MODE, { precisionRatio: ROUGH_PRECISION - 0.1, nominated: false });
    expect(rough.nomination).toBeNull();
    expect(rough.roughFlight).toBe(true);
    expect(rough.glideDown).toBe(false);
    expect(rough.state.roughFlights[MODE]).toBe(1);
  });

  it("two consecutive rough flights glide down and reset the counter", () => {
    let state = applyFlightEnd(emptyEngagement(), MODE, { precisionRatio: 0.2, nominated: false }).state;
    const second = applyFlightEnd(state, MODE, { precisionRatio: 0.3, nominated: false });
    expect(second.glideDown).toBe(true);
    expect(second.state.roughFlights[MODE]).toBe(0);
  });

  it("a good flight in between resets the rough counter", () => {
    let state = applyFlightEnd(emptyEngagement(), MODE, { precisionRatio: 0.2, nominated: false }).state;
    state = applyFlightEnd(state, MODE, { precisionRatio: 0.8, nominated: false }).state;
    const rough = applyFlightEnd(state, MODE, { precisionRatio: 0.2, nominated: false });
    expect(rough.glideDown).toBe(false);
    expect(rough.state.roughFlights[MODE]).toBe(1);
  });

  it("passing consumes the nomination", () => {
    const state = applyFlightEnd(emptyEngagement(), MODE, goodNominatedFlight).state;
    const result = applyFledgingResult(state, MODE, true);
    expect(result.cleared).toBe(true);
    expect(result.reearn).toBe(false);
    expect(result.state.nominations[MODE]).toBeUndefined();
  });

  it("three failed attempts clear it for re-earning; fewer keep it", () => {
    let state = applyFlightEnd(emptyEngagement(), MODE, goodNominatedFlight).state;
    for (let i = 1; i < MAX_FLEDGING_ATTEMPTS; i++) {
      const result = applyFledgingResult(state, MODE, false);
      expect(result.cleared).toBe(false);
      expect(result.state.nominations[MODE].attempts).toBe(i);
      state = result.state;
    }
    const last = applyFledgingResult(state, MODE, false);
    expect(last.cleared).toBe(true);
    expect(last.reearn).toBe(true);
    expect(last.state.nominations[MODE]).toBeUndefined();
  });

  it("any level change clears it (glide down / fledge)", () => {
    const state = applyFlightEnd(emptyEngagement(), MODE, goodNominatedFlight).state;
    expect(applyClearNomination(state, MODE).nominations[MODE]).toBeUndefined();
  });

  it("declining costs nothing — no state changes at all", () => {
    const state = applyFlightEnd(emptyEngagement(), MODE, goodNominatedFlight).state;
    // Declining simply dismisses the offer; there is no applier to call, and
    // the nomination (with its attempt count) is untouched.
    expect(state.nominations[MODE]).toMatchObject({ attempts: 0 });
  });
});
