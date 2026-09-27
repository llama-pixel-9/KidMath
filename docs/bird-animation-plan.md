# Meadow Bird Animation Plan

Companion to `docs/art-asset-tracker.md` and `docs/bird-art-style-guide.md`.
Written against the built motion system (`src/engagement/meadow/motionSpec.js`,
`birdBehaviors.js`, `BirdSprite.jsx`) — which is **puppet-style transform rigs in
framer-motion**, not frame animation. That architecture is the right one; the plan
below extends it instead of replacing it.

## The one decision that matters NOW

**Whatever produces the final art must deliver each bird as separable layers**
(or vector shapes Claude can cut into layers). Everything else can be decided later
without redoing art. A flat merged PNG locks you out of levels 1–2 below.

## The escalation ladder (spend nothing until the previous level falls short)

### Level 0 — whole-sprite rigs (BUILT ✅)
What ships today: idle bob, tap hop, play-spot drift, signature-move keyframes,
arrival/departure flights — all transforms on the whole sprite, timed by
`motionSpec.js`. Works with any art, raster or vector. Reduced-motion story done.

### Level 1 — layered-part rigs (the big win, ~zero new tooling)
Cut each sprite into named groups with fixed pivots; the existing framer-motion
system animates the *parts*:

| Layer (SVG group id) | Pivot | What it unlocks |
|---|---|---|
| `wing` | shoulder (front-top of wing) | flap on takeoff/landing, flutter in play spots, condor's slow spread |
| `head` (head+beak+eye) | neck base | head cock on tap (owls: big rotation), look-at-player, peck |
| `tail` | tail base | fan/flick during dance and landing |
| `body` | feet (0,0) | existing bob/hop unchanged |
| `beak` (optional) | hinge | sing while the call plays |

Rig sketches per motion (all easings from `motionSpec.js` EASE):
- **Takeoff/flight:** wing rotate −40°→15° loop at ~6Hz (2 keyframes is enough at
  sprite size), body tilt −8°, existing arc path. Replaces the current
  fly-in-idle-pose look — the single biggest perceived-quality jump.
- **Tap response:** hop (existing) + head cock 10° + one wing flick.
- **Sing:** beak open 12° 2×/s while the call audio plays; head tips back 6°.
- **Crane dance set piece:** choreography of leaps (body y), bows (body rotate
  ~20° at feet), wing flares (both-wing rotate), tail fan — a 10s keyframe
  sequence in `birdBehaviors.js` rigs, same pattern as today's `rigFor()`.
- **Condor thermal ride:** wing spread hold + slow whole-sprite circle (existing
  path animation) — needs the wings-open pose OR a big wing-rotate on the layer.

### Level 2 — pose swap (only for flight + the 2 legendaries)
2–3 extra poses per bird where a rotation can't fake it: generic fly pose
(per body type, reusable), crane dance mid-pose, condor full-spread. Crossfade
120ms between poses, rigs continue on top. Generate poses with the same image
model + style reference ("same bird, wings raised, side view").

### Level 3 — Rive (only if a ceremony still feels flat)
[Rive](https://rive.app): free editor, state machines, **runtimes for both web
React and SwiftUI** — that last part matters if the Meadow ever ships native
(framer-motion rigs are web-only; a native Meadow would otherwise mean
reimplementing rigs in SwiftUI). Scope it to the two legendary set pieces and
the hatch ceremony at most — one songbird skeleton template re-skinned per
species keeps it bounded. Alternatives: Spine (game standard, paid license),
Lottie (After Effects playback, no interactivity — wrong shape for this).

**Do not** plan on AI video/animation models for sprite motion: they don't
produce loopable, transparent, layer-stable frames at production quality yet.
AI generates the *poses*; code (or Rive) owns the *motion*.

## What this means for the art pipeline

- **Recraft/vector route:** ask for separable shapes; Claude cuts layers + sets
  pivots during integration (wing/head/tail are distinct fills in this style —
  demonstrated on the v0.3 pilot sprites, see `design/meadow-art-pilot/rig-demo.html`).
- **Raster route (Gemini/GPT Image):** either accept Level 0 only, or have Claude
  vectorize first (auto-trace + cleanup) so layers can be cut. Budget one extra
  integration pass per bird.
- **Artist commission:** add one line to the brief — "deliver layered SVG (or
  layered source) with wing, head, tail as separate groups" — near-zero extra
  cost when stated up front, expensive to retrofit.

## Per-tier animation ambition (matches the roster's tier promise)

| Tier | Gets |
|---|---|
| Common | Level 0 + wing flap on takeoff/landing |
| Uncommon | + signature move upgraded with part motion (woodpecker head-drum, jay scream posture) |
| Rare | + tap-response part motion (puffin shows fish = head+beak layer swap) |
| Legendary | + full set-piece choreography (dance / thermal ride), pose swaps, hatch beats |

## Tracker additions

Rows added to `docs/art-asset-tracker.md`: layer-spec compliance per sprite
(P0 requirement on delivery), generic fly poses (P1), legendary set-piece poses
(P1, with eggs phase), Rive evaluation spike (P3, only if needed).
