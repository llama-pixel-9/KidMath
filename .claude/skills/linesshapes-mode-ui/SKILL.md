# linesShapes mode — UI + bank patterns

Generator: `src/modes/linesShapes.js`. Bank batch `b0821` (2,320 items; see
`docs/linesshapes-bank-design.md`). Subskills: `shapeSides`,
`symmetryLines`, `shapeProperties`, `shapeClassification`, `lineFigures`.
Bands: K-1 = tier-1 shapes (triangle/square/rectangle/pentagon) + fold
sense; 2-3 = quadrilateral family + symmetry counts; 4-5 = big polygons +
hierarchy.

## Rendering notes

- Figure counts: `answerType:"shapeFigure"` + `display {shape: key,
  shapeMode:"count", rotate}`. Select: `display {shapeMode:"select",
  options:[{shape, rotate, value}×4]}` with the answer as the option INDEX.
- The drawn rhombus reads as a square-on-point and the drawn octagon is
  cut-corner — never ask their symmetry off the figure (SHAPE_TABLE marks
  them `askSymmetry:false`); word questions about ideal shapes are fine.
- `selectVariety` keeps family subordinate to band (leak fix).
- `m4Measurement.spec.js` bypasses the bank (`consultBankFamilies: []`) —
  don't remove that; bank items displace the generator varieties whose
  answers it recomputes.

## Question pattern catalog

### procedural (auto-approved)

**shapeSides** — `namedSides/Vertices_*` "How many sides does a hexagon
have?" (band-disjoint shape lists) · `figSides/figVertices_*` numbered
drawn-figure counts ("Shape 4: count its sides…") · `sideSum_*` "A hexagon
and a square together have ? sides" (article-aware an/a)

**symmetryLines** — `foldMatchTeen` "Fold a square corner to corner. Do
the halves match exactly?" · `foldCountTeen` · `namedSymmetry_*` (per-band
phrasings) · `symSum_*` symmetry totals for two shapes ·
`figSymmetry_*` numbered figure symmetry counts (safe shapes only)

**shapeProperties** — `rightAngles_*`/`parallelPairs_*` per-band phrasings
· `equalSidesTeen` · `diagonals_*` (n(n−3)/2) · `raSum_*` combined right
angles

**shapeClassification** — `whichIs_*` "Round 3: which one is a pentagon?"
(select, fixed options) · `notA_*` odd-side-count-out selects ·
`sortCount_*` "From this list … how many shapes have exactly 4 sides?"

**lineFigures** — `endpoints_*` "How many endpoints does a ray have?" ·
`pathParts_*` letter-path straight-part counts · `vocabPick_*` line/ray/
segment/point + parallel/perpendicular/intersecting picks ·
`straightCurvedTeen`

### conceptual (reviewed; named prose)

**shapeSides** — `propJudge_*` "says a square has 5 sides — right?" ·
`sideVertexEq_*` sides-equal-vertices insight · `moreSides_*` ·
**symmetryLines** — `symJudge_*` · `moreSym_*` / `fewestSym_*` ·
`mirrorJudgeTeen` (butterflies and capital letters) · `whichFoldsTeen` ·
**shapeProperties** — `riddle_*` "I have 4 equal sides but no right
angles…" · `claimJudge_*` (incl. hierarchy claims: every square is a
rectangle) · `fitPick_*` ·
**shapeClassification** — `hierJudge_*` every-X-is-Y judged ·
`guessRule_*` sorting-circle rules · `bothNames_*` "can one shape be a
square AND a rhombus?" ·
**lineFigures** — `defJudge_*`(Extra) definitions judged · `modelPick_*`
real-world models (laser beam → ray) · `endJudge_*` · `straightPickTeen`

### application (reviewed; craft/build/neighborhood)

`storySticks_*`/`storyCorners_*`/`storyTwoShapes_*` craft-stick and pin
counts · `storyFolds_*`/`storyMirror_*`/`storyStencil_*` symmetry crafts ·
`storyRightAngles_*`/`storyParallel_*`/`storyDiagonals_*`/`storyCheck_*`
builder checks · `storyEqualSides_*`/`storyRightAnglesBig_*`/
`storySymPaint_*` · `storyBins_*`/`storyHunt_*`/`storyRename_*`/
`storyRegular_*` sorting and museum labels · `storyChalk_*`/`storyTrack_*`/
`storyStreets_*`/`storyStrings_*` line-figure scenes

## Traps learned building this bank

- Figure-count and select prompts carry no distinguishing text — NUMBER
  them ("Shape 4:", "Round 3:") or identical strings pile up; cross-band
  story families need band-tag suffixes or per-band skeletons.
- Named drills repeated across bands need per-band phrasings; keep shape
  lists band-disjoint where possible.
- NAMED_ONLY polygons need the property fields you plan to ask about
  (undefined table lookups are hard verifier failures).
- Never use the drawn rhombus/octagon for symmetry; never use rhombus/
  parallelogram as select targets.
- "1 endpoints" — pluralize said-values in judged claims.
