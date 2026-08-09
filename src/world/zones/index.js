import { MEADOW_ZONE } from "./meadowZone";
import { POND_ZONE } from "./pondZone";

/**
 * Walkable zones, keyed by zone id, plus which island opens which zone.
 * Zones ship locally for now; the Phase 4 endgame swaps this for published
 * world_defs rows — same shape, different loader. Quest ids and fixture
 * names must be globally unique across zones (they share one store).
 */
export const ZONES = { meadow: MEADOW_ZONE, pond: POND_ZONE };

export function zoneForIsland(islandId) {
  return Object.values(ZONES).find((z) => z.islandId === islandId) ?? null;
}
