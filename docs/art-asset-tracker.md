# Meadow Art & Audio Asset Tracker

Status: **living tracker** — update the Status column as assets land. Created 2026-08-05.
Sources: `docs/bird-gamification-design.md`, gamification spec (§04–§14), and the built
Meadow (`src/engagement/meadow/`, `src/engagement/roster.js`, `src/engagement/perches.js`).

The spec's own summary of the blocker: *"4 zone scenes painted once in summer, 3 retint
sets, 4 particle sprites, 1 hedge-and-sign, and 22 birds at 3 scales with per-tier
behaviour rigs."* This tracker expands that into every concrete asset, plus audio.

**Integration status (2026-08-08):** the generated kit is wired into the web app —
`public/meadow/` assets + `artAssets.js`; BirdSprite/zoneScenes/Ceremonies/FieldGuide/
StickerBook render art with code-drawn fallbacks. 🟨 below = generated first draft,
in-app. Still open: bird calls, part-layer animation rigs, seasonal variants.

**Status legend:** ⬜ not started · 🟨 first draft · 🟦 in review · 🟩 final (shipped)
**Priority:** P0 = blocks Meadow v1 ship · P1 = blocks a spec feature (eggs, seasons) · P2 = polish · P3 = nice-to-have

---

## 0. How art drops in (integration contract)

Everything renders through named placeholder slots — **no layout changes needed**:

| Asset class | Swap point | Contract |
|---|---|---|
| Bird sprites | `BirdSprite.jsx` (drawing + `SPRITE_SIZES`) | SVG `<g>`, **feet anchored at (0,0)**, faces right (parent flips with `scale(facing,1)`); depth scaling is a numeric multiply, so one vector asset covers all 3 depth bands (sky 0.7 / canopy 0.85 / mid 1.0 / foreground 1.15). Night sleep = flat recolor to `#0A2E28` silhouette — keep shapes silhouette-readable. |
| Zone scenes | `zoneScenes.jsx` backdrops | 1024×588 per zone, shared horizon `HORIZON_Y = 400`. Furniture must sit under the **named perch coordinates in `perches.js`** (14 perches + 4 play spots per zone, ± the zone jitter) and avoid `RESERVED_RECTS` (the Nest, the egg, guide handle). |
| Season looks | `seasons.js` `SEASON_TINTS` + palette tokens in `zoneScenes.jsx` | A season changes exactly: canopy tint, ground tint, one particle, store visitor. If final scenes stay vector with palette tokens, the 3 retint sets are config, not new paintings. |
| Bird calls | `sounds.js` `playBirdCall()` | Currently a 3-note placeholder chirp. Replace with per-species clip lookup; captions already exist per species (`callCaption` in roster.js) for accessibility. |
| Egg / hatch | `Ceremonies.jsx` `EggSprite` | Warmth ring + cracks at 25/50/75% are code-driven; art supplies the egg body + crack states + chick. |
| Portraits | `FieldGuide.jsx` plate slot ("Sketch · plate slot") | One plate per species, shown full even when unowned (spec §07). |

**Brand guardrail (design doc §6):** collectible birds are a distinct art family —
*soft naturalistic-cartoon, full color* — deliberately unlike the flat geometric teal
LarkMark. The logo stays the logo.

---

## 1. Style guide (gate for everything else)

| Asset | Pri | Status | Notes |
|---|---|---|---|
| Bird & Meadow style guide (1 page) | **P0** | 🟩 | Palette, line weight, eye/beak treatment, silhouette rules, size relationships, do/don't vs LarkMark. Blocks all commissioning and keeps AI/vector drafts consistent. |

## 2. Bird sprites (in-Meadow) — 22 species

One idle side-view sprite each, per the BirdSprite contract. Footprints from
`SPRITE_SIZES` (default 46×40 @ depth 1.0; overrides noted).

| # | Species | Tier | Sprite | Portrait | Call | Notes |
|---|---|---|---|---|---|---|
| 1 | Skylark *(starter)* | Common | 🟨 | 🟨 | ⬜ | First bird every kid gets — highest-visibility asset in the app |
| 2 | House Finch | Common | 🟨 | 🟨 | ⬜ | |
| 3 | Mourning Dove | Common | 🟨 | 🟨 | ⬜ | |
| 4 | Black-capped Chickadee | Common | 🟨 | 🟨 | ⬜ | |
| 5 | House Wren | Common | 🟨 | 🟨 | ⬜ | |
| 6 | American Robin | Common | 🟨 | 🟨 | ⬜ | |
| 7 | Dark-eyed Junco | Common | 🟨 | 🟨 | ⬜ | Migrant (winter) |
| 8 | Northern Cardinal | Common | 🟨 | 🟨 | ⬜ | |
| 9 | Downy Woodpecker | Uncommon | 🟨 | 🟨 | ⬜ | Signature: trunk drum |
| 10 | American Goldfinch | Uncommon | 🟨 | 🟨 | ⬜ | Signature: bounce flight |
| 11 | Blue Jay | Uncommon | 🟨 | 🟨 | ⬜ | Signature: hawk scream |
| 12 | Ruby-throated Hummingbird | Uncommon | 🟨 | 🟨 | ⬜ | 28×24; migrant (spr–aut); signature: hover-vanish |
| 13 | Belted Kingfisher | Uncommon | 🟨 | 🟨 | ⬜ | Signature: pond dive |
| 14 | Barn Swallow | Uncommon | 🟨 | 🟨 | ⬜ | Migrant (spr–sum); signature: zone loop |
| 15 | Barn Owl | Uncommon | 🟨 | 🟨 | ⬜ | 46×48; awake at night; signature: silent circuit |
| 16 | Atlantic Puffin | Rare | 🟨 | 🟨 | ⬜ | Signature: water rocket; tap: beak of fish |
| 17 | Sandhill Crane | Rare | 🟨 | 🟨 | ⬜ | 54×84 (tall); migrant (autumn); signature: bugle |
| 18 | Painted Bunting | Rare | 🟨 | 🟨 | ⬜ | Migrant (summer); signature: preen show |
| 19 | American Kestrel | Rare | 🟨 | 🟨 | ⬜ | Signature: hover-stoop |
| 20 | Snowy Owl | Rare | 🟨 | 🟨 | ⬜ | 54×52; awake at night; migrant (winter) |
| 21 | Whooping Crane | Legendary | 🟨 | 🟨 | ⬜ | 56×92 (tallest); set piece: 10s dance |
| 22 | California Condor | Legendary | 🟨 | 🟨 | ⬜ | 88×62 (widest); set piece: 10s thermal soar |

All sprites **P0** for Meadow v1; portraits **P0** (store shows full portraits to
unowned birds — they're the thing kids save for); calls **P1** (placeholder chirp is
shippable, real calls are the promised payoff).

### 2b. Animation readiness (see `docs/bird-animation-plan.md`)

**P0 delivery requirement on every sprite: separable layers** — `wing`, `head`
(head+beak+eye), `tail`, `body` as named groups with the pivots from the animation
plan. The existing framer-motion rig system animates the parts (flap, head cock,
tail fan); a flat merged image locks the app out of all part motion. Proof of
concept on the pilot sprites: `design/meadow-art-pilot/rig-demo.html`.

| Task | Pri | Status |
|---|---|---|
| Layer-spec compliance check per delivered sprite (22) | P0 | ⬜ |
| Wing-flap + head-cock rigs wired into `birdBehaviors.js` | P1 | ⬜ |
| Crane dance + condor thermal set-piece choreography (rigs) | P1 | ⬜ |
| Generic fly pose per body type (pose swap for flights) | P1 | ⬜ |
| Rive evaluation spike (ONLY if rig ceremonies feel flat) | P3 | ⬜ |

### 2c. Extra poses (signature/behaviour support) — P2

The behaviour rigs are motion-driven (transform keyframes), so idle sprites alone ship
v1. A small pose set makes the marquee moments land:

| Pose | For | Status |
|---|---|---|
| Wings-open soar | California Condor ("wings wider than a door") | 🟨 |
| Dance pose (wing-flare) | Whooping Crane set piece | 🟨 |
| Hover pose | Kestrel, Hummingbird | ⬜ |
| Generic flight pose | Arrival / departure / seasonal migration flights (all species currently fly in idle pose) | 🟨 — skylark/barnOwl/whoopingCrane/condor wired; other species still arrive in idle pose pending recolors |

## 3. Zone scenes — 4 backdrops + season system

| Asset | Pri | Status | Notes |
|---|---|---|---|
| Meadow zone scene (base/summer) | **P0** | 🟨 | Carries Nest tree, nest box, fence, reeds, log, pond, feeder, bath, dust patch — all perch/play-spot furniture |
| Pond zone scene | **P0** | 🟨 | Big pond variant, same 14 perch names |
| Woods zone scene | **P0** | 🟨 | Three trees variant |
| Cliffs zone scene | **P0** | 🟨 | Rock spires; where legendaries live |
| Spring retint set | P1 | ⬜ | Config-only if scenes stay vector (SEASON_TINTS) |
| Autumn retint set | P1 | ⬜ | " |
| Winter retint set (+ frozen pond) | P1 | ⬜ | Winter also swaps pond to ice |
| Particle sprites ×4 (petal, seed, leaf, snowflake) | P1 | ⬜ | Currently plain colored circles |
| Hedge + swinging sign | **P0** | 🟨 | Two halves (they part like curtains in the zone-open ceremony) + sign board |
| The Nest (star pile in tree) | **P0** | 🟨 | The wallet drawn literally; count-up pulse is code |
| Night look | — | 🟩 | Code-only. Decided 2026-08: birds render TINTED at night (colors kept), not silhouetted — swap BirdSprite's asleep `#0A2E28` recolor for a tint, and add a per-bird eyelid element (cut during layer integration) so sleeping birds close their eyes |

## 4. Eggs & hatching (legendary tier) — P1

| Asset | Status | Notes |
|---|---|---|
| Egg sprite (pristine + 25/50/75% crack states + hatch burst) | 🟨 | Warmth ring is code |
| Whooping Crane chick (unique juvenile) | 🟨 | Appears nowhere else in the app — the Unveiling's surprise |
| California Condor chick (unique juvenile) | 🟨 | " |
| Chick-in-nest nestle pose | ⬜ | Chick waits in nest until the next-day growing-up flight |

## 5. Feathers (badges) + map — P1

| Asset | Status | Notes |
|---|---|---|
| 8 feather designs (First Flight, Clean Glide, Three-Day Migration, Great Migration, Full Nest, Homing Feather, Hawk Eye, Skymaster Feather) | 🟨 | Distinct silhouette + color each; replaces emoji badges |
| "Your Wing" band layout art | ⬜ | Field Guide page holding the feathers |
| Migration Map landmarks ×3 (The Nest, The Ridge, High Sky) | ⬜ | JourneyMap → Migration Map rebrand |
| Fledging ceremony art (lark on Apricot disc, feather burst) | ⬜ | Mostly motion; needs the lark hero pose |
| Flight Log printable header bird slot | P3 ⬜ | "Cheap, charming" open question from the design doc |

## 6. Audio

| Asset | Pri | Status | Notes |
|---|---|---|---|
| 22 adult bird calls (2–6 s, trimmed + loudness-normalized) | P1 | ⬜ | See licensing rules below. Captions already in roster.js |
| 2 legendary **baby** calls (crane + condor chick) | P1 | ⬜ | Juvenile/begging calls exist on xeno-canto; only heard at the hatch |
| Egg soft-tap crack sound | — | 🟩 | Procedural (`playSoftTap`) — intentionally the only percussive audio |
| UI sound set (correct / wrong / streak / level-up / complete) | P3 | 🟩→ | Procedural WebAudio today and fine; optional designed pass later |
| Ambient meadow loop | P3 | ⬜ | Not in spec; backlog only |

### Audio licensing rules (paid app — this matters)

- **KidMath is a commercial product.** CC **BY-NC** anything (the majority of
  xeno-canto) is **unusable**. Filter to **CC0 / public domain** or **CC-BY** only;
  treat BY-SA as a last resort (trimmed clips are derivatives and inherit SA).
- CC-BY requires attribution: keep a machine-generated credits manifest and surface it
  on the About/legal page (recordist, XC catalog number, license, link).
- US federal recordings (e.g., FWS/NPS) are public domain — good fallback for gaps.
- Same discipline as the EngageNY rule in CLAUDE.md: verify the license **per
  recording**, not per site.
- Pipeline: `scripts/art/fetch-bird-calls.mjs` (this commit) queries xeno-canto with a
  license filter, downloads candidates, trims/normalizes via ffmpeg, and writes
  `credits.json` + `CREDITS.md`.

---

## 7. Counts & budget shape

| Class | Count | First draft path | Likely paid work |
|---|---|---|---|
| Style guide | 1 | In-house (this repo) | — |
| Bird sprites | 22 (+~4–6 poses) | Vector drafts in-style (free) | Artist consistency pass over the final set |
| Portraits | 22 | AI-assisted or vector (free) | Same pass |
| Zone scenes | 4 + 3 retints + hedge + Nest + 4 particles | Current vector scenes upgraded in place (free) | Optional single-scene hero polish |
| Eggs/chicks | 1 egg set + 2 chicks | Vector drafts | Chicks worth artist attention (emotional peak) |
| Feathers/map | 8 + band + 3 landmarks | Vector drafts (free) | — |
| Bird calls | 24 | CC0/CC-BY via script (free) | — |
| UI sounds | 6 | Already procedural (free) | Optional sound-design pass |

**The cheapest credible v1:** everything above ships as consistent in-style vector +
CC-audio drafts at $0, then one artist is commissioned for a **single consistency/polish
pass** on the 22 sprites + 22 portraits + 2 chicks against the style guide — a bounded,
quotable job instead of an open-ended "illustrate a world" commission.

## 8. Suggested production order

1. **Style guide** (gates everything) → 2. **Pilot 4 birds** (starter + one per tier) to
prove the pipeline → 3. **Remaining 18 sprites + portraits** batch-produced → 4. **Zone
scene upgrade pass** (keep perch coordinates!) → 5. **Calls pipeline run** →
6. **Feathers + Nest + hedge** → 7. **Egg + chicks** (with Phase-4 eggs feature) →
8. **Seasonal retints + particles** (with Phase-5 seasons) → 9. Polish poses, designed
UI sounds.
