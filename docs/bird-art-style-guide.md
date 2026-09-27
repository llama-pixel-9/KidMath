# Meadow Bird Art — Style Guide (v0.1, first draft)

The one-page reference that keeps 22 birds + scenes + AI/vector drafts + any future
commission looking like one hand. Pairs with `docs/art-asset-tracker.md`.
Pilot examples: `art/pilot-preview.html`.

> **Status note:** the final look is being explored in Recraft
> (`docs/imagegen-prompt-pack.md`) and is NOT bound to the hand-drawn pilot style.
> The Hard rules below (not-the-logo, field marks, silhouette test, feet-anchor,
> kind faces) apply to ANY style; the Construction recipe applies only to the
> hand-authored vector pipeline. When a Recraft style sheet is locked, update this
> guide to describe it.

## The one-line brief

**Soft naturalistic-cartoon, full color, flat shapes, ink outlines.** Real species,
recognizably — a birder parent should name every bird; a 6-year-old should want to tap it.

## Hard rules

1. **Not the logo.** The LarkMark is flat geometric teal; collectible birds are a
   different art family (design doc §6). Never draw a Meadow bird in mark teal
   (`#0E3B34`/`#3E9E8E`) as its body color.
2. **Field marks are non-negotiable.** Each species keeps its 2–3 real identifying
   marks (cardinal crest + mask, barn owl heart face, crane red crown + black
   wingtips). Everything else can simplify.
3. **Strong silhouette.** Every species should be identifiable by outline alone —
   good character design regardless. (Decided 2026-08: night renders birds
   TINTED, keeping their colors, not as silhouettes — so this is a design
   principle now, not a night-rendering requirement.)
4. **Feet at (0,0), facing right.** BirdSprite's contract; the parent flips for
   direction and scales for depth (0.7 / 0.85 / 1.0 / 1.15). Draw once at mid scale,
   verify legibility at 0.7.
5. **Kind faces.** Round eye with a single white highlight; no angry brows, no
   photorealistic talons/glare. Raptors look capable, not menacing.

## Construction recipe (what makes them consistent)

- **Shapes:** a ROUND compact body path + head circle — the roundness IS the
  charm; resist elongating toward realism. Hide the head/body outline seam with
  a same-fill, no-stroke blend patch drawn over the junction. One folded-wing
  shape with at most one tucked primary-tip stroke; two-feather tail wedge.
  Distinct feather groups (a cardinal's tail, a crane's bustle) may be separate
  outlined shapes — the overlap reads as a feather boundary. Legs get toes
  (3 front strokes + hallux). Max 2 detail passes (streaks, speckles) per bird —
  when in doubt, LESS detail: density reads as clutter at sprite size.
- **Outline:** `#14231F` (Ink), stroke 1.6 on major shapes, 1.1–1.3 on details,
  round joins/caps. Interior detail may drop the outline (flat fill only).
- **Color:** flat fills, max ~5 colors per bird, one optional soft-shade tone
  (no gradients). Warm naturalistic hues; saturation between the meadow pastels
  and the Apricot accent so birds pop against `#C9E8DF`/`#A7DED3`.
- **Eye:** Ink circle r≈1.7 (at mid scale) + white highlight dot, top-right.
- **Beak:** species-true color and shape; this is often the strongest field mark.
- **Proportions:** heads slightly oversized (~1.2× real), bodies rounded — cartoon
  warmth without going full chibi. Size relationships between species are REAL
  (`SPRITE_SIZES`): the condor is genuinely enormous, the hummingbird tiny.
  Kids should feel the scale in the Meadow.

## Portraits (Field Guide plates)

Same art family, larger and framed: cream plate `#FFFDF4`, ink frame, soft
`#EAF3EE` window, branch perch line, Fredoka name. Portraits may add one more
detail pass than sprites (wing feathering, subtler markings). Unowned birds show
the FULL portrait (spec §07) — plates are the shop window; make them poster-nice.

## Palette anchors (from the design system)

| Token | Hex | Use |
|---|---|---|
| Ink | `#14231F` | outlines, eyes, text |
| Cream | `#FFFDF4` | plates, bubbles |
| Apricot | `#F26B3A` | stars, beak accents, UI |
| Meadow sky | `#C9E8DF` | scene sky |
| Meadow ground | `#A7DED3` / `#7FCFBE` | scene grass |
| Night | `#0E3B34` / `#0A2E28` | night overlay, asleep silhouette |

## Per-tier ambition

- **Common:** clean idle sprite; personality from posture and field marks.
- **Uncommon:** same, plus the signature move must read from the base sprite
  (woodpecker braced on trunk, swallow streamlined).
- **Rare:** an extra flourish allowed (puffin's striped bill, bunting's three-color
  block) — "puts on a show."
- **Legendary:** the ceiling. Extra pose (crane dance / condor soar), unique chick
  art, most careful plate.

## Do / Don't

- ✅ Do keep every bird on the same 2-line legs + round-eye system.
- ✅ Do exaggerate the ONE thing the kid will remember (crest, heart face, wingspan).
- ❌ Don't retint birds for seasons or themes — birds never retint (spec §12).
- ❌ Don't use pure black `#000` or pure white `#FFF`; use Ink and Cream.
- ❌ Don't add backgrounds inside sprites — the scene owns the environment.
