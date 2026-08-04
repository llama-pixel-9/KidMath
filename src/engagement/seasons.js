/**
 * Seasons (gamification spec §12). The season follows the device calendar by
 * quarter: Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb winter.
 *
 * This module starts minimal for the store's availability rules (§08 —
 * seasonal birds can be given a home only while they are here, and the store
 * says "back next summer", never a countdown). The ceremonies step extends it
 * with tints, particles, night and the leaving/return lifecycle.
 */

export const SEASONS = ["spring", "summer", "autumn", "winter"];

export const SEASON_META = {
  spring: { id: "spring", name: "Spring", title: "First Light" },
  summer: { id: "summer", name: "Summer", title: "Long Days" },
  autumn: { id: "autumn", name: "Autumn", title: "The Leaving" },
  winter: { id: "winter", name: "Winter", title: "Quiet Meadow" },
};

export function seasonForDate(date = new Date()) {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

/** "back next summer" — the season a visitor returns in, kindly worded. */
export function returnLine(species) {
  if (!species.seasons?.length) return null;
  return `back next ${species.seasons[0]}`;
}

/** "Summer only" / "Winter only" chips for the store. */
export function seasonChip(species) {
  if (!species.seasons?.length) return null;
  if (species.seasons.length === 1) return `${SEASON_META[species.seasons[0]].name} only`;
  return `${SEASON_META[species.seasons[0]].name}–${SEASON_META[species.seasons[species.seasons.length - 1]].name}`;
}

// --- §12: a season changes exactly three things — the canopy and ground
// tint, one drifting particle, and which visitor is in the store. Birds and
// interface never retint. ---

export const SEASON_TINTS = {
  spring: { canopy: "#8FD9C8", ground: "#7FCFBE", sky: "#C9E8DF", particle: "petals" },
  summer: { canopy: "#3E9E8E", ground: "#6FC3B2", sky: "#C9E8DF", particle: "seeds" },
  autumn: { canopy: "#F26B3A", ground: "#F0A47A", sky: "#C9E8DF", particle: "leaves" },
  winter: { canopy: "#B9CFC9", ground: "#FFFBEB", sky: "#DCEDF2", particle: "snow" },
};

/** Night is a palette swap after 7pm — 9pm in summer (§12). */
export function isNight(date = new Date(), season = seasonForDate(date)) {
  const h = date.getHours();
  const nightAt = season === "summer" ? 21 : 19;
  return h >= nightAt || h < 6;
}

/** "2026-autumn" — the key departure/return events are remembered under. */
export function seasonKeyForDate(date = new Date()) {
  return `${date.getFullYear()}-${seasonForDate(date)}`;
}

function previousSeason(season) {
  return SEASONS[(SEASONS.indexOf(season) + 3) % 4];
}

function nextSeason(season) {
  return SEASONS[(SEASONS.indexOf(season) + 1) % 4];
}

/** §11: a week of restlessness — present now, gone next season. */
export function leavingSoon(species, date = new Date()) {
  if (!species.seasons) return false;
  const season = seasonForDate(date);
  const monthEnd = [4, 7, 10, 1][SEASONS.indexOf(season)];
  const boundary = new Date(
    date.getFullYear() + (season === "winter" && date.getMonth() === 11 ? 1 : 0),
    monthEnd + 1,
    1
  );
  const daysLeft = Math.ceil((boundary - date) / 86400000);
  return (
    daysLeft <= 7 &&
    species.seasons.includes(season) &&
    !species.seasons.includes(nextSeason(season))
  );
}

/**
 * §11 events on Meadow open, derived from the calendar + seen-marks.
 * A departure is due when an OWNED migrant was here last season and is gone
 * now, and this season's send-off hasn't played (or been missed). A return is
 * due when an owned migrant is back and this season's arrival hasn't played.
 * Away birds keep their perch and count toward everything.
 */
export function migrationEvents(state, ownedSpecies, date = new Date()) {
  const season = seasonForDate(date);
  const key = seasonKeyForDate(date);
  const departures = [];
  const returns = [];
  for (const species of ownedSpecies) {
    if (!species.seasons) continue;
    const here = species.seasons.includes(season);
    const wasHere = species.seasons.includes(previousSeason(season));
    if (!here && wasHere && state.departuresSeen?.[species.id] !== key) departures.push(species);
    if (here && !wasHere && state.returnsSeen?.[species.id] !== key) returns.push(species);
  }
  return { departures, returns, season, key };
}

export function isAway(species, date = new Date()) {
  return Boolean(species.seasons) && !species.seasons.includes(seasonForDate(date));
}

/** "Away · back in spring" — the chip on an away bird's entry (§11). */
export function awayChip(species) {
  if (!species.seasons?.length) return null;
  return `Away · back in ${species.seasons[0]}`;
}
