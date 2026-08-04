import { describe, it, expect } from "vitest";
import {
  summarizeFlight,
  levelBandIndex,
  LANDING_BONUS,
  ALTITUDE_BONUS,
  CIRCLE_BACK_CAP,
} from "../mathEngine";
import { gamStepEnabled, flightReportEnabled } from "../gamificationFlags.js";
import { emptyEngagement, applySessionEnd, isFirstWeek } from "../engagement/engagementStore.js";

// Gamification spec §01: four payouts, settled once at the end of a flight.

function flight(overrides = {}) {
  return {
    questionsAnswered: 15,
    sessionSize: 15,
    firstTryCorrect: 0,
    retriesMastered: 0,
    level: 1,
    ...overrides,
  };
}

describe("summarizeFlight (§01 the economy)", () => {
  it("pays nothing at all for an unfinished flight", () => {
    const p = summarizeFlight(flight({ questionsAnswered: 9, firstTryCorrect: 8, level: 8, retriesMastered: 2 }));
    expect(p.finished).toBe(false);
    expect(p.total).toBe(0);
    expect(p.landing + p.precision + p.altitude + p.circleBack).toBe(0);
  });

  it("always pays the landing for finishing, at any accuracy", () => {
    const p = summarizeFlight(flight({ firstTryCorrect: 0 }));
    expect(p.landing).toBe(LANDING_BONUS);
    expect(p.total).toBe(LANDING_BONUS);
  });

  it("pays one star per first-try correct — the bulk of the payout", () => {
    const p = summarizeFlight(flight({ firstTryCorrect: 13, level: 5, retriesMastered: 1 }));
    // 2 landing + 13 precision + 2 Flier altitude + 1 circle-back
    expect(p).toMatchObject({ landing: 2, precision: 13, altitude: 2, circleBack: 1, total: 18 });
  });

  it("altitude bonus follows the three bands", () => {
    expect(levelBandIndex(1)).toBe(0);
    expect(levelBandIndex(3)).toBe(0);
    expect(levelBandIndex(4)).toBe(1);
    expect(levelBandIndex(6)).toBe(1);
    expect(levelBandIndex(7)).toBe(2);
    expect(levelBandIndex(10)).toBe(2);
    expect(ALTITUDE_BONUS).toEqual([0, 2, 4]);
    expect(summarizeFlight(flight({ level: 3 })).altitude).toBe(0);
    expect(summarizeFlight(flight({ level: 4 })).altitude).toBe(2);
    expect(summarizeFlight(flight({ level: 7 })).altitude).toBe(4);
  });

  it("caps the circle-back bonus", () => {
    const p = summarizeFlight(flight({ firstTryCorrect: 15, level: 9, retriesMastered: 3 }));
    expect(p.circleBack).toBe(CIRCLE_BACK_CAP);
    expect(p.total).toBe(2 + 15 + 4 + CIRCLE_BACK_CAP);
  });

  it("a careful Fledgling out-earns a sloppy Skymaster", () => {
    const careful = summarizeFlight(flight({ firstTryCorrect: 14, level: 2 }));
    const sloppy = summarizeFlight(flight({ firstTryCorrect: 5, level: 9 }));
    expect(careful.total).toBeGreaterThan(sloppy.total);
  });
});

describe("gamification flags", () => {
  it("is on only for the exact string 'true'", () => {
    expect(flightReportEnabled({ VITE_GAM_FLIGHT_REPORT: "true" })).toBe(true);
    expect(flightReportEnabled({ VITE_GAM_FLIGHT_REPORT: "TRUE" })).toBe(false);
    expect(flightReportEnabled({ VITE_GAM_FLIGHT_REPORT: "1" })).toBe(false);
    expect(flightReportEnabled({ VITE_GAM_FLIGHT_REPORT: true })).toBe(false);
    expect(flightReportEnabled({})).toBe(false);
  });

  it("rejects unknown steps", () => {
    expect(gamStepEnabled("stickerBook", { VITE_GAM_STICKER_BOOK: "true" })).toBe(false);
  });
});

describe("firstFlightDay / isFirstWeek (§02 ledger default)", () => {
  it("records the first finished flight once and keeps it", () => {
    const first = applySessionEnd(emptyEngagement(), 10, "2026-08-04").state;
    expect(first.firstFlightDay).toBe("2026-08-04");
    const later = applySessionEnd(first, 12, "2026-08-10").state;
    expect(later.firstFlightDay).toBe("2026-08-04");
  });

  it("is the first week for exactly seven days (and before any flight)", () => {
    expect(isFirstWeek(emptyEngagement(), "2026-08-04")).toBe(true);
    const state = { ...emptyEngagement(), firstFlightDay: "2026-08-04" };
    expect(isFirstWeek(state, "2026-08-04")).toBe(true);
    expect(isFirstWeek(state, "2026-08-10")).toBe(true);
    expect(isFirstWeek(state, "2026-08-11")).toBe(false);
    // Month boundary math uses real dates, not string arithmetic.
    const eom = { ...emptyEngagement(), firstFlightDay: "2026-08-29" };
    expect(isFirstWeek(eom, "2026-09-04")).toBe(true);
    expect(isFirstWeek(eom, "2026-09-05")).toBe(false);
  });
});
