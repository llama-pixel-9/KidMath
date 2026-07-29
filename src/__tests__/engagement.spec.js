import { describe, it, expect } from "vitest";
import {
  emptyEngagement,
  applySessionEnd,
  applySpend,
  starBalance,
  starsToday,
  currentStreak,
  DAILY_GOAL,
} from "../engagement/engagementStore.js";
import { STICKERS, STICKER_BY_ID } from "../engagement/stickers.js";

/**
 * The engagement loop is what makes stars mean something, so its day math has
 * to be exactly right: a missed day resets the streak, yesterday's streak
 * survives until today is missed, and the daily-goal celebration fires exactly
 * once per day.
 */

const play = (state, stars, day) => applySessionEnd(state, stars, day);

describe("day streak", () => {
  it("starts at 1 on the first ever session", () => {
    const { state, events } = play(emptyEngagement(), 5, "2026-07-28");
    expect(state.streakDays).toBe(1);
    expect(events.streakExtended).toBe(true);
  });

  it("does not re-extend on a second session the same day", () => {
    const first = play(emptyEngagement(), 5, "2026-07-28").state;
    const { state, events } = play(first, 5, "2026-07-28");
    expect(state.streakDays).toBe(1);
    expect(events.streakExtended).toBe(false);
  });

  it("extends on the next calendar day, across a month boundary", () => {
    const d1 = play(emptyEngagement(), 5, "2026-07-31").state;
    const { state, events } = play(d1, 5, "2026-08-01");
    expect(state.streakDays).toBe(2);
    expect(events.streakExtended).toBe(true);
  });

  it("resets to 1 after a missed day", () => {
    const d1 = play(emptyEngagement(), 5, "2026-07-28").state;
    const { state } = play(d1, 5, "2026-07-30");
    expect(state.streakDays).toBe(1);
  });

  it("keeps bestStreak through a reset", () => {
    let s = emptyEngagement();
    s = play(s, 5, "2026-07-26").state;
    s = play(s, 5, "2026-07-27").state;
    s = play(s, 5, "2026-07-28").state;
    expect(s.bestStreak).toBe(3);
    s = play(s, 5, "2026-08-04").state;
    expect(s.streakDays).toBe(1);
    expect(s.bestStreak).toBe(3);
  });

  it("currentStreak survives overnight but dies after a missed day", () => {
    const s = play(emptyEngagement(), 5, "2026-07-28").state;
    expect(currentStreak(s, "2026-07-28")).toBe(1);
    expect(currentStreak(s, "2026-07-29")).toBe(1); // yesterday's streak still shows
    expect(currentStreak(s, "2026-07-30")).toBe(0); // missed a day
  });
});

describe("daily goal", () => {
  it("fires goalJustMet exactly when today's stars cross the target", () => {
    let s = emptyEngagement();
    let r = play(s, DAILY_GOAL - 3, "2026-07-28");
    expect(r.events.goalJustMet).toBe(false);
    r = play(r.state, 3, "2026-07-28");
    expect(r.events.goalJustMet).toBe(true);
    // Already met — must not fire again today.
    r = play(r.state, 5, "2026-07-28");
    expect(r.events.goalJustMet).toBe(false);
  });

  it("resets today's stars on a new day", () => {
    const d1 = play(emptyEngagement(), 12, "2026-07-28").state;
    expect(starsToday(d1, "2026-07-28")).toBe(12);
    expect(starsToday(d1, "2026-07-29")).toBe(0);
    const d2 = play(d1, 4, "2026-07-29").state;
    expect(starsToday(d2, "2026-07-29")).toBe(4);
  });
});

describe("star wallet and stickers", () => {
  const cheap = STICKERS.find((s) => s.cost === 10);

  it("earned minus spent, never negative", () => {
    const s = { ...emptyEngagement(), earnedStars: 25, spentStars: 10 };
    expect(starBalance(s)).toBe(15);
    expect(starBalance({ ...s, spentStars: 40 })).toBe(0);
  });

  it("buys a sticker when affordable, refuses when short or owned", () => {
    const rich = { ...emptyEngagement(), earnedStars: 25 };
    const bought = applySpend(rich, cheap);
    expect(bought.stickers).toContain(cheap.id);
    expect(starBalance(bought)).toBe(25 - cheap.cost);
    // Owned: refused.
    expect(applySpend(bought, cheap)).toBeNull();
    // Short: refused.
    expect(applySpend({ ...emptyEngagement(), earnedStars: 3 }, cheap)).toBeNull();
  });

  it("catalog integrity: unique ids, positive costs, lookup map complete", () => {
    const ids = STICKERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of STICKERS) {
      expect(s.cost).toBeGreaterThan(0);
      expect(STICKER_BY_ID[s.id]).toBe(s);
    }
  });
});
