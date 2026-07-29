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
import { BADGES, BADGE_BY_ID } from "../engagement/badges.js";

/**
 * The engagement loop is what makes stars mean something, so its day math has
 * to be exactly right: a missed day resets the streak, yesterday's streak
 * survives until today is missed, and the daily-goal celebration fires exactly
 * once per day.
 */

const play = (state, stars, day) => applySessionEnd(state, stars, day);
const play2 = (state, stars, day, facts) => applySessionEnd(state, stars, day, facts);

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

describe("badges", () => {
  it("first session earns First Steps, and a perfect one earns Perfect Round too", () => {
    const { state, events } = play2(emptyEngagement(), 15, "2026-07-28", { perfect: true });
    const ids = events.newBadges.map((b) => b.id);
    expect(ids).toContain("firstSession");
    expect(ids).toContain("perfectRound");
    expect(state.badges.map((b) => b.id)).toEqual(expect.arrayContaining(ids));
  });

  it("never re-awards an earned badge", () => {
    const first = play2(emptyEngagement(), 15, "2026-07-28", { perfect: true }).state;
    const { events } = play2(first, 15, "2026-07-28", { perfect: true });
    expect(events.newBadges.map((b) => b.id)).not.toContain("firstSession");
    expect(events.newBadges.map((b) => b.id)).not.toContain("perfectRound");
  });

  it("Word Detective lands exactly when trap wins reach 5, accumulating across sessions", () => {
    let s = emptyEngagement();
    let r = play2(s, 5, "2026-07-28", { trapWins: 3 });
    expect(r.events.newBadges.map((b) => b.id)).not.toContain("wordDetective");
    r = play2(r.state, 5, "2026-07-28", { trapWins: 2 });
    expect(r.events.newBadges.map((b) => b.id)).toContain("wordDetective");
  });

  it("Comeback Kid accumulates mistake-bank clears; On Fire follows bestStreak", () => {
    let s = { ...emptyEngagement(), comebacks: 4 };
    let r = play2(s, 5, "2026-07-28", { comebacks: 1 });
    expect(r.events.newBadges.map((b) => b.id)).toContain("comeback5");

    let d = emptyEngagement();
    d = play2(d, 5, "2026-07-26").state;
    d = play2(d, 5, "2026-07-27").state;
    const day3 = play2(d, 5, "2026-07-28");
    expect(day3.events.newBadges.map((b) => b.id)).toContain("streak3");
  });

  it("Peak Climber fires on reaching level 7 in any mode", () => {
    const { events } = play2(emptyEngagement(), 5, "2026-07-28", { levelReached: 7 });
    expect(events.newBadges.map((b) => b.id)).toContain("peakClimber");
  });

  it("catalog integrity: unique ids and complete lookup", () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of BADGES) expect(BADGE_BY_ID[b.id]).toBe(b);
  });
});
