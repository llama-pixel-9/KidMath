/**
 * Persona kid: the probability model from scripts/simulateKid.mjs, ported to
 * the browser harness. p(correct) = clamp(base + growth·exposures −
 * levelPenalty·(level−1)) (+ retryBonus on a retry); response times are
 * log-normal-ish around msMean and are applied through Playwright's fake
 * clock so a "slow" kid costs no wall time.
 */

export const PERSONAS = {
  struggling: { base: 0.45, growth: 0.015, cap: 0.85, retryBonus: 0.15, levelPenalty: 0.02, msMean: 11000 },
  okay:       { base: 0.62, growth: 0.02,  cap: 0.95, retryBonus: 0.15, levelPenalty: 0.015, msMean: 6500 },
  strong:     { base: 0.85, growth: 0.02,  cap: 0.98, retryBonus: 0.1,  levelPenalty: 0.01, msMean: 4000 },
};

/** mulberry32 — deterministic per kid so a rerun reproduces the same play. */
export function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pCorrect(persona, { exposures, level, isRetry }) {
  const p = persona.base + persona.growth * exposures - persona.levelPenalty * (level - 1) + (isRetry ? persona.retryBonus : 0);
  return Math.max(0.05, Math.min(persona.cap, p));
}

/** Response time in ms: skewed around msMean, with an occasional long think. */
export function responseMs(persona, rand, { correct }) {
  const base = persona.msMean * (0.55 + rand() * 0.9);
  const slow = rand() < 0.08 ? persona.msMean * 1.8 : 0; // "right but slow" feeder
  return Math.round((correct ? base : base * 1.25) + slow);
}

/** A plausible WRONG answer for the question, in the shape the driver expects. */
export function wrongValue(question, rand) {
  const type = question.answerType || "choice";
  const a = question.answer;
  const correct = Array.isArray(a) && Array.isArray(a[0]) ? a[0] : a;
  const choices = question.choices || question.display?.choices;
  if (type === "choice" && Array.isArray(choices) && choices.length > 1) {
    const others = choices.filter((c) => String(c) !== String(correct));
    return others[Math.floor(rand() * others.length)];
  }
  if (type === "symbolSelect") return correct === "<" ? ">" : "<";
  if (type === "multiSelect") {
    const arr = Array.isArray(correct) ? correct : [correct];
    return arr.slice(0, Math.max(0, arr.length - 1)); // drop one → wrong
  }
  if (type === "fraction") {
    if (correct && typeof correct === "object") return { num: Number(correct.num) + 1, den: correct.den };
    const [n, d] = String(correct).split("/");
    return `${Number(n) + 1}/${d}`;
  }
  const n = Number(correct);
  if (Number.isFinite(n)) {
    const deltas = [1, -1, 2, 10, -10];
    const d = deltas[Math.floor(rand() * deltas.length)];
    const v = n + d;
    return v < 0 ? n + 1 : Number.isInteger(n) ? v : Math.round((n + 0.1) * 100) / 100;
  }
  return correct; // unknown shape — fall back to correct (driver stays happy)
}

/**
 * Spread N sessions over the last `days` days: 4–5 practice days a week,
 * 1–2 sessions per practice day, mostly afternoons/evenings, a few mornings.
 * Returns ascending epoch-ms start times, all in the past.
 */
export function scheduleSessions(n, days, rand, now) {
  const DAY = 86400000;
  const slots = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  for (let d = days; d >= 1 && slots.length < n * 2; d--) {
    const weekday = new Date(start.getTime() - d * DAY).getDay();
    const practise = weekday === 0 || weekday === 6 ? rand() < 0.5 : rand() < 0.7;
    if (!practise) continue;
    const perDay = rand() < 0.35 ? 2 : 1;
    for (let k = 0; k < perDay; k++) {
      const r = rand();
      const hour = r < 0.15 ? 7 + rand() * 2 : r < 0.6 ? 15 + rand() * 2.5 : 18 + rand() * 2.5;
      slots.push(start.getTime() - d * DAY + hour * 3600000 + k * 1800000);
    }
  }
  // Short windows can yield fewer slots than sessions — top up with random
  // afternoons so every session has a real timestamp.
  while (slots.length < n) slots.push(start.getTime() - Math.ceil(rand() * days) * DAY + (15 + rand() * 4) * 3600000);
  // keep the most recent n so the last session lands in the final week
  return slots.sort((x, y) => x - y).slice(-n);
}
