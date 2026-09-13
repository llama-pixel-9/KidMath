import { MEADOW_ZONE, STEP_TYPES } from "./meadowZone";
import { POND_ZONE } from "./pondZone";
import { WOODS_ZONE } from "./woodsZone";
import { CLIFFS_ZONE } from "./cliffsZone";
import { REGIONS } from "../regions";

/**
 * Zone registry. Zones are content (world_defs-shaped); quest ids and
 * fixture names must be globally unique because every zone writes to the
 * one world store. Ordered to match REGIONS, left to right.
 */
export const ZONES = {
  meadow: MEADOW_ZONE,
  pond: POND_ZONE,
  woods: WOODS_ZONE,
  cliffs: CLIFFS_ZONE,
};

export const ZONE_LIST = REGIONS.map((r) => ZONES[r.id]).filter(Boolean);

export function zoneForRegion(regionId) {
  return ZONES[regionId] ?? null;
}

export { STEP_TYPES };
