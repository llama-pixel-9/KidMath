import { MEADOW_ZONE } from "./meadowZone";

/**
 * Walkable zones, keyed by zone id, plus which island opens which zone.
 * v1 ships one zone locally; Phase 4 swaps this for published world_defs
 * rows — same shape, different loader.
 */
export const ZONES = { meadow: MEADOW_ZONE };

export function zoneForIsland(islandId) {
  return Object.values(ZONES).find((z) => z.islandId === islandId) ?? null;
}
