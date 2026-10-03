/**
 * The tappable disc mat: the "build" mode of the placeValueDiscs answer
 * widget (`display.mode === "build"`), as pure state. The kid starts from
 * `display.cols`, adds and takes away discs, trades 10 of a place for 1 of
 * the next place, breaks 1 into 10 of the place to its right, and submits
 * the number the mat shows. No React, no DOM: PlaceValueDiscs.jsx renders
 * it, and the iPhone mirrors the same rules and strings in Swift
 * (`DiscMatBuild`, ios/KidMath/Views/Widgets/DiscMatBuild.swift). Change a
 * rule or a string in both places.
 *
 * A mat is an array of { place, count }, biggest place first, places
 * contiguous (1000, 100, 10, 1). Every action takes the mat and the index of
 * a place and returns a NEW mat; an action that is not allowed returns the
 * same mat unchanged, so a stray tap or key can never break the state.
 */

/** The most discs a place can hold: 9 + 9 = 18, or 9 ones and 10 from a
 * broken ten = 19 — the most any Grade 2 step needs. */
export const DISC_CAP = 19;

/** Places a mat may use, biggest first. */
export const PLACES = Object.freeze([1000, 100, 10, 1]);

const NAMES = {
  1000: { one: "thousand", many: "thousands" },
  100: { one: "hundred", many: "hundreds" },
  10: { one: "ten", many: "tens" },
  1: { one: "one", many: "ones" },
};

/** "ten" / "tens": a place's name, singular for exactly one. */
export function placeName(place, count = 2) {
  const n = NAMES[place];
  if (!n) return String(place);
  return count === 1 ? n.one : n.many;
}

const clampCount = (n) => {
  const v = Math.trunc(Number(n));
  return Number.isFinite(v) ? Math.min(Math.max(v, 0), DISC_CAP) : 0;
};

/**
 * The editable copy of a start mat. Keeps only real places (numbers, or
 * numeric strings, among 1000/100/10/1), biggest first, each count a whole
 * number from 0 to DISC_CAP. A skipped place in between (100 and 1 with no
 * 10) comes back with 0 discs, so a trade always goes to the place exactly
 * 10 times bigger.
 */
export function startMat(cols) {
  const counts = new Map();
  for (const c of Array.isArray(cols) ? cols : []) {
    const place = Number(c?.place);
    if (!PLACES.includes(place) || counts.has(place)) continue;
    counts.set(place, clampCount(c?.count));
  }
  // A payload with no usable place still gets a mat to build on (an empty
  // hundreds, tens and ones) rather than a widget with nothing to tap.
  if (!counts.size) return [100, 10, 1].map((place) => ({ place, count: 0 }));
  const present = PLACES.filter((p) => counts.has(p));
  const from = PLACES.indexOf(present[0]);
  const to = PLACES.indexOf(present[present.length - 1]);
  return PLACES.slice(from, to + 1).map((place) => ({ place, count: counts.get(place) ?? 0 }));
}

const has = (mat, i) => Array.isArray(mat) && Number.isInteger(i) && i >= 0 && i < mat.length;
const withCounts = (mat, changes) =>
  mat.map((col, j) => (j in changes ? { place: col.place, count: col.count + changes[j] } : col));

export const canAdd = (mat, i) => has(mat, i) && mat[i].count < DISC_CAP;
export const canRemove = (mat, i) => has(mat, i) && mat[i].count > 0;

/** 10 of this place for 1 of the next bigger place (the one to its left). */
export const canTradeUp = (mat, i) =>
  has(mat, i) && i > 0 && mat[i].count >= 10 && mat[i - 1].count < DISC_CAP;

/** 1 of this place for 10 of the next smaller place (the one to its right). */
export const canBreakDown = (mat, i) =>
  has(mat, i) && i < mat.length - 1 && mat[i].count >= 1 && mat[i + 1].count + 10 <= DISC_CAP;

export const add = (mat, i) => (canAdd(mat, i) ? withCounts(mat, { [i]: 1 }) : mat);
export const remove = (mat, i) => (canRemove(mat, i) ? withCounts(mat, { [i]: -1 }) : mat);
export const tradeUp = (mat, i) => (canTradeUp(mat, i) ? withCounts(mat, { [i]: -10, [i - 1]: 1 }) : mat);
export const breakDown = (mat, i) => (canBreakDown(mat, i) ? withCounts(mat, { [i]: -1, [i + 1]: 10 }) : mat);

/** The number the mat shows: the sum of place × count. */
export function matValue(mat) {
  return (Array.isArray(mat) ? mat : []).reduce((sum, c) => sum + c.place * c.count, 0);
}

/** A number writes one digit per place, so every place must hold 9 or fewer. */
export function canCheck(mat) {
  return Array.isArray(mat) && mat.length > 0 && mat.every((c) => c.count <= 9);
}

/** Same counts in the same places (Start over has nothing to undo). */
export function sameMat(a, b) {
  return (
    Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
    a.every((c, i) => c.place === b[i].place && c.count === b[i].count)
  );
}

/**
 * The place the status line talks about, as an index, or null when no place
 * holds 10 or more. The smallest place that can trade up comes first (trade
 * the ones, then the tens they made); when none can — the biggest place is
 * the one over, or the place to its left is full — the biggest overfull
 * place, which can only be fixed by taking discs away.
 */
export function overfullPlace(mat) {
  if (!Array.isArray(mat)) return null;
  for (let i = mat.length - 1; i >= 0; i -= 1) {
    if (mat[i].count >= 10 && canTradeUp(mat, i)) return i;
  }
  const i = mat.findIndex((c) => c.count >= 10);
  return i >= 0 ? i : null;
}

/** "The ones have 12 discs. Trade 10 ones for 1 ten." — or "" when the mat
 * can be checked. Never a dead end: with no trade possible it says to take
 * discs away. */
export function statusLine(mat) {
  const i = overfullPlace(mat);
  if (i === null) return "";
  const { place, count } = mat[i];
  const lead = `The ${placeName(place)} have ${count} discs.`;
  return canTradeUp(mat, i)
    ? `${lead} Trade 10 ${placeName(place)} for 1 ${placeName(mat[i - 1].place, 1)}.`
    : `${lead} Take some discs away.`;
}

/** After a submit: "The mat shows 921." (correct) / "Your mat shows 911." */
export function feedbackLine(value, correct) {
  return correct ? `The mat shows ${value}.` : `Your mat shows ${value}.`;
}

// Control labels. Buttons say the trade with an arrow; screen readers get it
// in words. Place names in labels are singular: "Add a one disc".

export const addLabel = (place) => `Add a ${placeName(place, 1)} disc`;
export const removeLabel = (place) => `Take away a ${placeName(place, 1)} disc`;

/** Trade-up of `place` into the place 10 times bigger. */
export const tradeUpText = (place) => `10 ${placeName(place)} → 1 ${placeName(place * 10, 1)}`;
export const tradeUpLabel = (place) => `Trade 10 ${placeName(place)} for 1 ${placeName(place * 10, 1)}`;

/** Break-down of `place` into the place 10 times smaller. */
export const breakDownText = (place) => `1 ${placeName(place, 1)} → 10 ${placeName(place / 10)}`;
export const breakDownLabel = (place) => `Trade 1 ${placeName(place, 1)} for 10 ${placeName(place / 10)}`;
