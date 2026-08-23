/**
 * Gamification rollout flags — one per build step of the bird-world spec
 * (design/Larkit rebrand design system/Larkit Gamification Spec.dc.html).
 *
 * Same contract as premium.paywallEnabled: OFF unless the deploy explicitly
 * sets the env var to the string "true"; `env` is injectable so predicates are
 * unit-testable. For local QA a step can also be forced on via
 * `?gam=flightReport,meadow` (or `all`) or localStorage["kidmath-gam-flags"] —
 * overrides only ever turn a step ON, never off.
 */

const STEP_ENV_KEYS = {
  flightReport: "VITE_GAM_FLIGHT_REPORT", // §01 economy + §02 Flight Report
  fledging: "VITE_GAM_FLEDGING", // §03 nomination + Fledging Flights
  meadow: "VITE_GAM_MEADOW", // §04–§06 Meadow tab, zones, perches
  birdStore: "VITE_GAM_BIRD_STORE", // §07 Field Guide + §08 Give a home
  roster: "VITE_GAM_ROSTER", // §09 rarity + §13 full roster
  ceremonies: "VITE_GAM_CEREMONIES", // §10–§12 hatching, leaving, seasons
  meadowMotion: "VITE_GAM_MEADOW_MOTION", // §14 motion tiers
  // Ladder v2 (kid-sim fix plan, PR B): promotion without the absolute 8.5 s
  // speed gate, demotion on the third miss instead of the second. Off by
  // default so the iOS parity fixtures stay valid until the switch flips.
  ladderV2: "VITE_GAM_LADDER_V2",
};

function overrideSet() {
  if (typeof window === "undefined") return new Set();
  try {
    const fromQuery = new URLSearchParams(window.location.search || "").get("gam");
    const fromStorage = window.localStorage?.getItem("kidmath-gam-flags");
    const raw = [fromQuery, fromStorage].filter(Boolean).join(",");
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

export function gamStepEnabled(step, env = import.meta.env) {
  const envKey = STEP_ENV_KEYS[step];
  if (!envKey) return false;
  // An explicit per-step value always wins — "false" is the selective kill
  // switch that works even while the master switch is on.
  const explicit = env?.[envKey];
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  // Master launch switch: one env var turns every step on.
  if (env?.VITE_GAM_ALL === "true") return true;
  const overrides = overrideSet();
  return overrides.has(step) || overrides.has("all");
}

export const flightReportEnabled = (env) => gamStepEnabled("flightReport", env);
export const fledgingEnabled = (env) => gamStepEnabled("fledging", env);
export const meadowEnabled = (env) => gamStepEnabled("meadow", env);
export const birdStoreEnabled = (env) => gamStepEnabled("birdStore", env);
export const rosterEnabled = (env) => gamStepEnabled("roster", env);
export const ceremoniesEnabled = (env) => gamStepEnabled("ceremonies", env);
export const meadowMotionEnabled = (env) => gamStepEnabled("meadowMotion", env);
export const ladderV2Enabled = (env) => gamStepEnabled("ladderV2", env);
