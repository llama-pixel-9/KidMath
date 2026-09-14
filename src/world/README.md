# src/world — Skylark Island (open-world mode, v2)

The second take on `docs/larkit-open-world-implementation-plan.md`. The
first build (branch `feature/open-world`) was a map of circular island
vignettes plus one walkable zone; it read as a prototype. This rewrite keeps
the plan's principles (intrinsic integration, autonomy, the 10-minute loop,
never a padlock) and the reusable pieces (world store, mastery model, quest
step DSL, zone content) and replaces everything the kid sees.

## What it is

One continuous island. The four painted zone backdrops (`public/meadow/zones`,
all 2048×1176 with the same sky and horizon) sit side by side: meadow → pond
→ woods → cliffs, sea at both ends. The kid's skylark hops along the ground
band (short trips) or flies (long trips, or anything over water). Each region
is one math strand:

| Region | Strand | Quests |
|---|---|---|
| The Meadow | Counting & Numbers | bridge planks, feeder seeds, nest eggs, ten-frame gate, chick hunt |
| The Pond | Add & Subtract | stepping stones, picnic berries, floating nests, gate, ducklings |
| The Woods | Multiply & Divide | plank bundles, acorn rows, eggs shared equally, gate, chicks in pairs |
| The Cliffs | Fractions & Decimals | half-full tray, quarter crossing, half the eggs, the lookout gate, half the chicks |

Regions the kid hasn't reached sit under mist. Opening a region's gate (a
full ten frame) rolls the mist back from the next one with a camera reveal.
Progress in the app itself also opens regions (mastery model). The cliffs'
gate is the finale: the whole flock flies past.

## The Nintendo layer (what makes it feel good)

- **Teach by doing.** No instructions. After the arrival flight a feather
  glints two hops away and the robin beckons until the kid follows
  (`engine/tutorial.js`). Runs once per kid.
- **Every tap answers back.** Trees drop leaves (sometimes a bird flies
  out), water ripples and a frog plops in, flowers release a butterfly,
  rocks tumble pebbles, helped birds show off a species move
  (`engine/reactive.js`, `npcs.js flourish`).
- **Secrets in plain sight.** Five hidden interactions (owl in the hollow,
  all five meadow flowers, the flipping lily pad, the woods knot, the cliff
  crack); each tap nudges, the third opens it, two stars once
  (`engine/secrets.js`).
- **Rhythm.** When the kid is still, birds visit each other, sing, preen;
  a newly revealed region's birds fly in while the camera lingers
  (`engine/life.js`, `npcs.js flyIn`). A tap interrupts.
- **The chick is a companion.** Points at a feather or a quest bird when the
  kid idles, hides behind the skylark near an owl, sleeps in the nest at
  night, grows with practice (`avatar.js createFollower`).
- **Daily hooks in growth framing.** Today's visitor lands on the beach with
  one problem worth two stars (`engine/visitor.js`); the island follows the
  season (`engine/seasonal.js`); the seed plot sprouts tomorrow; and once a
  bird's own quest is done it has a daily chore — the feeder emptied, planks
  came loose, the frame dimmed, the nests need eggs — same fixtures, new
  numbers seeded by the date, two per region per day (`engine/chores.js`,
  fixtures' `reset()`).
- **The map is the island.** A parchment scroll with the regions as they
  are, the skylark's position, mist, per-region progress (`MapPanel.jsx`).
- **A finale.** The lookout gate on the cliffs starts the Big Migration:
  six birds, one per strand, one last question each, then the flock crosses
  and the island cheers (`engine/migration.js`).
- **Sound as character.** Synth cues per action, a soft generative melody
  per region that ducks under dialog (`worldMusic.js`), spoken lines.
- **Calm mode.** The app's calm setting or `prefers-reduced-motion` keeps the
  colours and birds but stills the fluttering layer; portrait phones get a
  one-time "turn sideways" hint.

Everything else from the plan is here: the practice signpost in each region
opens that strand's minigames (every `MODE_GROUPS` entry is reachable from
some signpost); the home nest by the front door holds the pet egg (warmed by
quest stars and practice stars, hatches into a chick that follows the
skylark) and the decoration shop (earned stars only; premium items simply
absent for free families); feathers to find; the seed plot that sprouts
tomorrow and blooms the day after.

## Layout

```
regions.js            the panorama: region x-offsets, ground band, depth scale
zones/*.js            CONTENT (world_defs-shaped): NPCs, objects, quests — region-local coords
zones/index.js        registry; quest ids / fixtures / NPC ids must be globally unique
worldStore.js         localStorage v1: stars, quests, fixtures, egg, seed, feathers,
                      decorations, discovered regions, last region
mastery/masteryModel.js  progress → discovery (pure, tested)
worldArt.js           asset URLs + sizes from artManifest.json; the boot load list
worldAudio.js         synthesized cues (hop, pop, chime, wobble, reveal, chirp…)
worldTime.js          day / dusk / night (Phaser-free)
speech.js             Web Speech for every quest line (audio-first)

scenes/BootScene.js   loads the art, generates procedural textures
scenes/WorldScene.js  the orchestrator: builds everything, input, quests, discovery, pet
engine/terrain.js     sky/sea, backdrops + crossfade seams, landmark props, parallax clouds + grass
engine/ambient.js     butterflies, dragonflies, leaves, swallows, sparkle, night/dusk, fireflies
engine/mist.js        undiscovered regions + the reveal
engine/avatar.js      the skylark: hop / fly, shadow, squash & stretch, idle life; the chick follower
engine/npcs.js        birds with idle life, quest markers, greetings
engine/fixtures/*.js  bridge (planks/logs/rope/stones + the stream), feeder, nests, gate + ten frame,
                      chicks, home nest, feathers, seed plot, signpost
engine/questRunner.js the step DSL interpreter (talk / countTap / pickNumber / placeItems / celebrate)
engine/cameraRig.js   zoom for the viewport, follow with look-ahead, focus/release, cinematics
engine/juice.js       dust, sparkle, star burst (Sun diamonds), hearts, count pops, pulse rings
engine/textures.js    procedural textures + brand colours

WorldPage.jsx         React host: canvas + HUD + toasts + panels; talks to the scene over game.events
QuestDialog.jsx       the card in the SKY (top of screen) so the ground band stays tappable
HomePanel.jsx / PracticePanel.jsx / MapPanel.jsx / ui.jsx
WorldRoute.jsx        the one mount point (flag check + lazy chunk)
```

## Rules

- **Flag:** mounts only with `VITE_WORLD_ENABLED=true`. Set it in `.env.local`.
  It is currently `true` in Vercel for Production AND Preview — do not merge
  this branch until that is deliberate.
- **Zones are content.** New quests/regions are data against the object
  vocabulary; the scene has no per-zone code. `world.spec.js` validates every
  zone (real art, ground-band positions, honest options, matching counts).
- **Every tap target is a Phaser Zone** created by `fixtures/common.js`
  `hitZone`; scene-level taps move the skylark only when no zone consumed the
  pointer. Keep targets non-overlapping — or, for rows of small things (the
  crossing slots), use one big zone and resolve to the nearest slot.
- **Every question has a hint.** `pickNumber` steps carry
  `hint: { target, mode }`; a wrong pick counts the relevant things out loud.
  `world.spec.js` proves each hint counts to the answer, so content cannot
  drift from the math.
- **Island questions are practice.** Each quest with a question is saved to
  the practice log as a session of its strand's first mode (`logStart` /
  `logPick` / `logEnd` in WorldScene), so the parent report includes them.
  `kind` stays `normal` and `mode` a registry mode: the practice_sessions
  table constrains both.
- **The island is per kid** (`worldStore.storageKey`), like progress. The
  kid may walk during counting and placing steps; the camera keeps a fixture
  in view while placing and follows the kid on a chick hunt.
- **Brand:** reward star = the Sun diamond, never five points; correct = teal,
  wrong = wobble (never red); no padlocks, no prices in money.

## Testing

- `npm run test` includes `src/__tests__/world.spec.js` (Phaser-free).
- URL overrides for local QA, comma-separated: `all` (every region open, no
  first flight), `arrive` (force the arrival flight), `day` / `dusk` /
  `night`, `spring` / `summer` / `autumn` / `winter`, `calm`.
  e.g. `/world?world=all,night,winter`.
- Debug handles on `window.__larkitWorld`: `worldScene`, `toScreen(x, y)`,
  `tapTargets()`. A synthetic click must be a press (down, ~70 ms, up);
  Phaser drops a 0 ms click, and a tap during a camera pan lands on the
  wrong spot — wait for `panEffect`/`zoomEffect` to finish. Presses on the
  DOM layer never reach the world (`windowEvents: false` + a canvas-target
  check), so panels can sit over the canvas safely.
