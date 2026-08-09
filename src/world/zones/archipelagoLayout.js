/**
 * Phase-0 layout for the archipelago map scene. Positions are world-space
 * points (1x pixels). This is throwaway-shaped on purpose: Phase 1 replaces
 * it with versioned `world_defs` JSON served from Supabase, so keep it a
 * plain data structure — no code in here.
 */
export const WORLD_BOUNDS = { width: 2400, height: 1600 };

export const ISLANDS = [
  { frame: "island-meadow", x: 520, y: 460, bob: 6 },
  { frame: "island-cove", x: 1240, y: 380, bob: 5 },
  { frame: "island-peak", x: 1900, y: 620, bob: 7 },
  { frame: "island-grove", x: 820, y: 1080, bob: 5 },
  { frame: "island-lagoon", x: 1620, y: 1180, bob: 6 },
];

export const CLOUDS = [
  { frame: "cloud-puff", x: 300, y: 180, drift: 40 },
  { frame: "cloud-long", x: 1500, y: 140, drift: 60 },
  { frame: "cloud-puff", x: 2100, y: 300, drift: 50 },
  { frame: "cloud-long", x: 700, y: 780, drift: 45 },
  { frame: "cloud-puff", x: 1150, y: 1400, drift: 55 },
];

export const BOAT = { frame: "boat", x: 1050, y: 760, bob: 4 };
