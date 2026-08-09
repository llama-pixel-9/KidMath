# src/world — Larkit open-world mode

Phase 0+ of `docs/larkit-open-world-implementation-plan.md`. Everything the
world owns lives under this directory (plus `scripts/world/`,
`assets/world/`, `public/world/`, the `world_*`/`skill_mastery`/`quest_progress`
migrations, and the `world-award` Edge Function). The app shell knows exactly
one line of it: the `/world` route in `App.jsx`.

## Rules (from the plan, Part 4 — keep the launch safe)

- **Branch:** all world work on `feature/open-world`, rebased on `main` weekly.
- **Flag:** the world mounts only when `VITE_WORLD_ENABLED=true`. Local dev:
  put it in `.env.local`. Device testing: set it on Vercel scoped to the
  *Preview* environment; production stays dark. Milestones merge to `main`
  dark — compiled in, invisible.
- **Database:** world migrations are additive-only (new tables, never ALTERs
  to live tables) and don't run against production until the first dark merge.
- **Economy:** stars and mastery are written ONLY by the `world-award` Edge
  Function. If a client-side write to `skill_mastery` or `world_inventory`
  seems convenient, it's wrong.
- **iOS/Capacitor:** stays on this branch until the App Store launch build is
  approved.

## Layout

```
worldFlags.js         VITE_WORLD_ENABLED gate
worldStore.js         quest/fixture/star state (localStorage v1, pure transitions)
speech.js             audio-first dialog via Web Speech (recorded voice later)
QuestDialog.jsx       spoken quest dialog + number-sign choices
zones/meadowZone.js   the first walkable zone — world_defs-shaped content
zones/index.js        zone registry + island→zone lookup
scenes/IslandScene.js walkable island: tap-to-move, NPCs, quest runner
WorldRoute.jsx        the shell-facing mount: flag check + lazy chunk split
WorldPage.jsx         React host: loads progress → snapshot → game + panel
IslandPanel.jsx       DOM overlay: a zoomed island's practice spots
createWorldGame.js    Phaser.Game config (AUTO renderer, RESIZE scale)
atlasScale.js         DPR → 1x/2x/3x atlas pick (pure, unit-tested)
worldArt.js           manifest of the existing meadow art the world uses
islands.js            one island per MODE_GROUPS entry: layout + art choices
mastery/masteryModel.js  mastery/bloom/discovery from existing progress (pure)
scenes/BootScene.js   loads atlas + meadow webps
scenes/WorldMapScene.js  the Living Map: fog, bloom, tap-to-enter, first sail
```

## Engine

Phaser is pinned to the **3.x** line (`phaser@^3.90`). Phaser 4 removed
WebGL GeometryMask (`setMask` no-ops with a warning — the island vignettes
render as squares) and is not a drop-in upgrade. The atlas JSON is the
single-texture JsonHash format loaded with explicit URLs; do not switch back
to `load.multiatlas` — 3.90's multiatlas stalls the whole boot when its JSON
finishes loading last (child PNG never flushed).

## Art pipeline

SVG masters in `assets/world/svg/<zone>/` are the single source of truth.
`npm run world:atlases` rasterizes them at 1x/2x/3x and packs Phaser-3
atlases into `public/world/atlases/` — committed build artifacts, so previews
render without sharp. Rerun + commit after any SVG change (the world.spec.js
contract test fails if layout frames and atlases drift). Current SVGs are
placeholders awaiting art direction.
