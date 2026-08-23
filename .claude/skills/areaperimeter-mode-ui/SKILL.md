---
name: areaperimeter-mode-ui
description: How the Area & Perimeter (areaPerimeter) mode presents questions on screen — the AreaFigure drawn with every dimensioned item, how dims are recovered from bank `display.ap`, generator `width/height`, or the prose, and the drawing rules (grid vs plain, perimeter emphasis, unknown side, not-to-scale). Use when changing how an area/perimeter item renders or adding a new `ap.kind`.
---

# Area & Perimeter — on-screen presentation

## The figure is inferred, not authored

No areaPerimeter payload names a figure. `figureRegistry.inferFigure()` maps
any `mode === "areaPerimeter"` question with a recoverable spec to
`areaFigure`, drawn in the question card by `QuestionDisplay` (so it shows in
session, the /admin preview drawer, and anywhere else the card renders).

`src/components/areaFigureSpec.js` → `areaFigureSpec(q)` returns `null` or
`{ shape, unit, perim, grid, ... }`. Sources, in priority order:

| Source | Fields | Shapes |
|---|---|---|
| bank `display.ap` | `areaOf/perimOf/areaSaid/perimSaid {w,h}` · `missSidePerim {p,w}` (h unknown) · `joinAreas/joinSaid {a,b,c,d}` · `cutArea {W,H,w,h}` · `missingPart {T,a,b}` · `samePerimSaid {w,h,s}` | rect · rect(?) · join · cut · split · pair |
| generator `display.width/height` | + `metadata.structureType` — `/missingSide/` means `height` IS the answer → drawn as `?` | rect |
| prose | `N by M` / `N-by-M` / `N cm by M cm` pairs; `N rows of M` → M wide × N tall (grid) | 1 pair → rect; 2 pairs → cut (cut/notch/remove wording, and it fits), join (join/together/altogether…), else pair |

Judgment items with no dims (overlapping rugs, always/sometimes/never,
"which measure do you need") correctly get **no** figure.

## Drawing rules (`AreaFigure.jsx`)

- **Perimeter** (`ap.kind` has `perim`, or wording: around/border/fence/lap/ribbon/tape/trip…): heavy ink boundary, no fill. **Area**: Seafoam fill.
- **Grid** of unit squares only when the wording counts squares (unit squares / rows of / stickers / tiles / chocolate) and `w×h ≤ 60` — band 1 counts, bands 2–3 multiply.
- Side labels carry the prose unit (`7 cm`); unit-square items are bare numbers. Unknown side is an Ember `?`.
- Aspect is clamped to ≥ 0.3 so a 15×1 strip still reads; when clamped the figure prints "not drawn to scale".
- `cut`: full rect with the notch path; notch dims in Ember. `join`: two rects sharing a vertical edge, bottoms aligned, four labels. `split`: known part + dashed Ember `?` region with "T in all" above. `pair`: side by side.

## Checking your work

The dev server gets reaped between tool calls: start vite + screenshots in one
script. `/play/areaPerimeter?item=<id>` pins a row but needs the row in the
seed bundle or Supabase env; for coverage use a throwaway probe route that
renders `admin/QuestionPreview` over `itemBank/items/areaPerimeter.js`
(`ITEMS`) plus pending rows. Coverage script idea: run `areaFigureSpec` over
bundle + pending + 600 generated questions and tally `shape`; the only `NONE`s
should be dimensionless judgments.
