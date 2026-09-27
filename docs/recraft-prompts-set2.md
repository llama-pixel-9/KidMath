# Recraft Prompts — Set 2: poses, egg, feathers, props, zone backdrops

Run these with your LOCKED custom bird style selected — that's what keeps this whole
batch in the same family as the roster. All prompts under 1,000 characters.

Integration contract (why prompts insist on "isolated" and "background only"):
props get placed at the exact perch coordinates from `perches.js`, birds and stars
are drawn by code, and the backdrop must leave the furniture layer to Claude.

# A. Poses & rerolls

Fly poses are generic per body type — Claude recolors the vector fills per species during integration, so one songbird fly pose covers ~14 birds. Wings must be separate clean shapes.

## Songbird fly pose — modeled on the Skylark (adapted per species by part-grafting) — `fly-songbird` (740 chars)

```
Cute cartoon Skylark game character flying, side view facing right, mid-flap: both wings raised above the body as clean separate complete shapes, tail slightly fanned as one distinct shape, legs tucked up against the belly, beak pointing forward, kind cheerful expression, one big eye with a white highlight. Streaky warm buff-brown back, cream belly, small pointed crest on the crown, thin horn-colored beak. Bold simplified flat vector shapes; no gradients, no texture; warm friendly palette, max 6 colors; solid mint #C9E8DF background. Built for parts animation: each wing is one complete closed shape, the head with beak and eye is separable at the neck, the tail is distinct at its base — no parts fused or hidden. Full body centered.
```

## Skylark downstroke — completes the wingbeat with `fly-songbird` — `fly-skylark-down` (743 chars)

```
Cute cartoon Skylark game character flying, side view facing right, downstroke: both wings swept down below the body as clean separate complete shapes, tail slightly fanned as one distinct shape, legs tucked up against the belly, beak pointing forward, kind cheerful expression, one big eye with a white highlight. Streaky warm buff-brown back, cream belly, small pointed crest on the crown, thin horn-colored beak. Bold simplified flat vector shapes; no gradients, no texture; warm friendly palette, max 6 colors; solid mint #C9E8DF background. Built for parts animation: each wing is one complete closed shape, the head with beak and eye is separable at the neck, the tail is distinct at its base — no parts fused or hidden. Full body centered.
```

## Skylark mid-beat — optional third frame for a smooth cycle — `fly-skylark-level` (752 chars)

```
Cute cartoon Skylark game character flying, side view facing right, mid-beat: both wings stretched straight out level with the body as clean separate complete shapes, tail slightly fanned as one distinct shape, legs tucked up against the belly, beak pointing forward, kind cheerful expression, one big eye with a white highlight. Streaky warm buff-brown back, cream belly, small pointed crest on the crown, thin horn-colored beak. Bold simplified flat vector shapes; no gradients, no texture; warm friendly palette, max 6 colors; solid mint #C9E8DF background. Built for parts animation: each wing is one complete closed shape, the head with beak and eye is separable at the neck, the tail is distinct at its base — no parts fused or hidden. Full body centered.
```

Wingbeat integration (the world's flap rig, src/world/birdFlight.js on
feature/open-world): export as skylark-fly-down.webp / skylark-fly-level.webp
into public/meadow/birds/, then the cycle becomes
up (skylark-fly) -> level -> down -> level. Re-roll any generation where the
legs dangle -- tucked legs are what make it read as flight.

## Owl fly pose — modeled on the Barn Owl (recolored for the Snowy Owl) — `fly-owl` (545 chars)

```
Cute cartoon Barn Owl game character flying, side view facing right, broad rounded wings raised mid-flap as clean separate complete shapes, big round head forward with the white heart-shaped facial disc and dark kind eyes, legs tucked. Golden-buff back and wings, white speckled breast. Bold simplified flat vector shapes; no gradients, no texture; solid mint #C9E8DF background. Built for parts animation: each wing one complete closed shape, head separable at the neck, tail distinct at its base — no parts fused or hidden. Full body centered.
```

## Crane fly pose — modeled on the Whooping Crane (recolored for the Sandhill) — `fly-crane` (576 chars)

```
Cute cartoon Whooping Crane game character flying, side view facing right: long neck stretched straight forward, long dark legs trailing straight behind, broad wings raised mid-flap as clean separate complete shapes, white body with black wingtips, red crown, long straight beak, one big kind eye. Elegant and joyful. Bold simplified flat vector shapes; no gradients, no texture; solid mint #C9E8DF background. Built for parts animation: each wing one complete closed shape, head separable at the neck, tail distinct at its base — no parts fused or hidden. Full body centered.
```

## Condor soaring pose — `soar-condor` (278 chars)

```
Cute cartoon California Condor game character soaring, side view facing right, enormous wings fully spread flat like a glider with visible finger feathers at the tips, white underwing panels, bald pink head looking forward, short tail. Majestic but friendly. Full body centered.
```

## Condor standing wing-spread (set-piece start) — `spread-condor` (281 chars)

```
Cute cartoon California Condor game character standing on the ground, facing right, opening both enormous black wings fully out to the sides like a cloak, white wing panels showing, bald pink head, black neck ruff, proud friendly expression. Full body centered, feet at the bottom.
```

## Whooping Crane dance pose (set-piece) — `dance-whoopingCrane` (256 chars)

```
Cute cartoon Whooping Crane game character dancing: leaping off the ground, wings flared up and out as clean separate shapes, head thrown up joyfully, long legs extended in the leap, black wingtip plumes visible, red crown. Full of joy. Full body centered.
```

## EDIT — Downy Woodpecker reposed (use Recraft's edit / image-to-image ON the existing woodpecker, not a fresh generation) — `reroll-downyWoodpecker` (718 chars)

Select the current woodpecker on the canvas and run this as an edit so his exact character survives — moderate edit strength; if the result loses his face, lower the strength.

```
Keep this exact Downy Woodpecker character — the same colors, the same black-and-white checkered wings, white back stripe, red patch on the back of the head, the same face, eye and beak, the same flat cartoon style — and change only his pose: he clings upright to the side of a plain vertical warm-brown tree trunk at the left edge of the image, both feet gripping the bark, his stiff tail feathers pressed against the trunk below him as a brace, body vertical, head up and tilted slightly back, ready to drum. The trunk is one simple flat brown strip with no branches. Solid mint #C9E8DF background everywhere else. His wing stays one complete closed shape, head separable at the neck, tail distinct — no parts fused.
```

## REROLL — Whooping Crane, taller — `reroll-whoopingCrane` (370 chars)

```
Cute cartoon Whooping Crane game character, side view facing right, standing very tall: a VERY long graceful S-curved neck (the tallest bird in the set), long dark legs, white body, black wingtip plumes drooping over the tail as a distinct shape, red crown, dark mustache mark, long straight beak, one big kind eye with highlight. Full body centered, feet at the bottom.
```

# B. The egg (incubation mechanic)

One generation, four crack states in a row — Claude cuts them apart. Keeping all stages in one image is what keeps them identical.

**Why the egg stays ONE image (unlike the feathers):** the four stages must be the
IDENTICAL egg with only the cracks changing — separate generations would drift in
shape and color. If the sheet comes out uneven, fallback: generate stage 1 alone,
then use Recraft's edit/image-to-image on that same egg to add each crack stage.


## Legendary egg — all 4 stages in one image — `egg-stages` (536 chars)

```
Sprite sheet, one row of four large cartoon eggs side by side on a solid mint #C9E8DF background, equal size and spacing: (1) a pristine cream-white egg with soft speckles, (2) the same egg with one small hairline crack near the top, (3) the same egg with cracks spreading across the upper half, (4) the same egg heavily cracked with a small piece lifting and a soft warm glow from inside. Identical egg shape, coloring and lighting in all four — only the cracks change. Flat cartoon style, no gradients, no nest, no background scenery.
```

# C. Feather badges (replaces emoji badges)

One generation, all 8 in a grid so they read as a family. Order matches: First Flight, Clean Glide, Three-Day Migration, Great Migration, Full Nest, Homing Feather, Hawk Eye, Skymaster.

## Feather badges — 8 individual generations — `feather-*`

Generated one at a time (NOT a sheet): the locked custom style keeps them a family,
and individual generations mean an exact count, cleaner cutting, and single-feather
rerolls. Generate in one session, back to back, for maximum consistency.

### First Flight — `feather-firstFlight` (370 chars)

```
A single cartoon feather: a small, soft cream-white downy feather, fluffy and rounded — a baby's first feather. A collectible achievement badge for a kids' game — charming, clean, instantly readable at small size. Centered and isolated on a solid mint #C9E8DF background. Flat vector color fills with one soft second tone; no gradients, no texture; simple elegant shape.
```

### Clean Glide — `feather-cleanGlide` (344 chars)

```
A single cartoon feather: a sleek white flight feather with one smooth elegant curve. A collectible achievement badge for a kids' game — charming, clean, instantly readable at small size. Centered and isolated on a solid mint #C9E8DF background. Flat vector color fills with one soft second tone; no gradients, no texture; simple elegant shape.
```

### Three-Day Migration — `feather-threeDayMigration` (349 chars)

```
A single cartoon feather: a short feather with three bold blue-and-white diagonal stripes. A collectible achievement badge for a kids' game — charming, clean, instantly readable at small size. Centered and isolated on a solid mint #C9E8DF background. Flat vector color fills with one soft second tone; no gradients, no texture; simple elegant shape.
```

### Great Migration — `feather-greatMigration` (342 chars)

```
A single cartoon feather: a long, bold feather in deep blue with a warm orange tip. A collectible achievement badge for a kids' game — charming, clean, instantly readable at small size. Centered and isolated on a solid mint #C9E8DF background. Flat vector color fills with one soft second tone; no gradients, no texture; simple elegant shape.
```

### Full Nest — `feather-fullNest` (343 chars)

```
A single cartoon feather: a warm golden-orange rounded body feather, plump and cozy. A collectible achievement badge for a kids' game — charming, clean, instantly readable at small size. Centered and isolated on a solid mint #C9E8DF background. Flat vector color fills with one soft second tone; no gradients, no texture; simple elegant shape.
```

### Homing Feather — `feather-homing` (335 chars)

```
A single cartoon feather: a rusty-red feather with a distinctive curled tip. A collectible achievement badge for a kids' game — charming, clean, instantly readable at small size. Centered and isolated on a solid mint #C9E8DF background. Flat vector color fills with one soft second tone; no gradients, no texture; simple elegant shape.
```

### Hawk Eye — `feather-hawkEye` (344 chars)

```
A single cartoon feather: a sharp, pointed hawk feather with brown-and-white barring. A collectible achievement badge for a kids' game — charming, clean, instantly readable at small size. Centered and isolated on a solid mint #C9E8DF background. Flat vector color fills with one soft second tone; no gradients, no texture; simple elegant shape.
```

### Skymaster — `feather-skymaster` (378 chars)

```
A single cartoon feather: a grand ornate feather in deep teal with gold edging — the most impressive of a set of eight. A collectible achievement badge for a kids' game — charming, clean, instantly readable at small size. Centered and isolated on a solid mint #C9E8DF background. Flat vector color fills with one soft second tone; no gradients, no texture; simple elegant shape.
```

# D. Meadow prop kit

Each prop generated ISOLATED so Claude can place it at the exact perch coordinates from perches.js. Do not generate props inside scenes.

## The great meadow tree — `prop-tree` (384 chars)

```
A single friendly cartoon tree for a kids' game scene: round layered green canopy in 2-3 soft green tones, sturdy warm-brown trunk with one visible dark oval hollow near the base, one thick low side branch good for perching. Whole tree isolated and centered. Flat cartoon style matching the bird set, no gradients, solid mint #C9E8DF background, no birds, no ground scenery around it.
```

## Nest box on a pole — `prop-nestbox` (278 chars)

```
A single cartoon wooden bird nest box on a straight pole: warm brown wood, small round dark entrance hole, slightly slanted roof. Isolated and centered. Flat cartoon style matching the bird set, no gradients, solid mint #C9E8DF background, no birds, no ground scenery around it.
```

## Bird feeder on a pole — `prop-feeder` (273 chars)

```
A single cartoon bird feeder on a straight pole: a small apricot-orange tray roof #F26B3A over a seed tray, warm brown pole. Isolated and centered. Flat cartoon style matching the bird set, no gradients, solid mint #C9E8DF background, no birds, no ground scenery around it.
```

## Fallen log — `prop-log` (272 chars)

```
A single cartoon fallen log lying horizontally: warm brown bark, one visible round end showing rings, a little moss on top. Isolated and centered. Flat cartoon style matching the bird set, no gradients, solid mint #C9E8DF background, no birds, no ground scenery around it.
```

## Clump of reeds — `prop-reeds` (300 chars)

```
A single clump of cartoon pond reeds: 5-7 tall slim green-teal stalks of varied height, two with soft brown cattail tops, small grass tuft at the base. Isolated and centered. Flat cartoon style matching the bird set, no gradients, solid mint #C9E8DF background, no birds, no ground scenery around it.
```

## Fence posts — `prop-fence` (279 chars)

```
Two short cartoon wooden fence posts connected by one horizontal rail: warm brown weathered wood, slightly uneven charming angles. Isolated and centered. Flat cartoon style matching the bird set, no gradients, solid mint #C9E8DF background, no birds, no ground scenery around it.
```

## Cliff rock spires — `prop-rocks` (319 chars)

```
Two cartoon rocky spires side by side, one taller than the other: soft blue-grey stone in 2 tones, rounded friendly edges, a few horizontal ledge lines good for perching. Isolated and centered. Flat cartoon style matching the bird set, no gradients, solid mint #C9E8DF background, no birds, no ground scenery around it.
```

## The hedge wall — `prop-hedge` (353 chars)

```
A single tall cartoon hedge bush wall, wider than tall, dense rounded leafy lobes across the top, rich medium green with darker green scallop shadows. It should look like a soft impassable wall of leaves. Isolated and centered. Flat cartoon style matching the bird set, no gradients, solid mint #C9E8DF background, no birds, no ground scenery around it.
```

## Wooden zone sign — `prop-sign` (330 chars)

```
A single cartoon wooden signpost: a rounded rectangular cream sign board with a warm brown frame on a single wooden post, blank face (text added in code). Slightly tilted, friendly. Isolated and centered. Flat cartoon style matching the bird set, no gradients, solid mint #C9E8DF background, no birds, no ground scenery around it.
```

## The Nest (star wallet) + incubation nest — `prop-nest` (458 chars)

```
Two cartoon bird nests side by side on a solid mint background: (1) a generous round stick nest woven from warm browns with a soft cream inner rim, shown from a slight top-front angle so the open bowl is visible and EMPTY, (2) a smaller ground nest of the same style. Flat style, no eggs, no birds (stars and egg are drawn by code). Flat cartoon style matching the bird set, no gradients, solid mint #C9E8DF background, no birds, no ground scenery around it.
```

# E. Zone backdrop panorama

Set the WIDEST aspect ratio Recraft offers (ultra-wide/panoramic). If one image can't hold all four zones cleanly, use the fallback prompt four times (meadow / pond / woods / cliffs) — same horizon and sky rules make them stitchable. Either way the image is BACKDROP ONLY: Claude overlays the prop kit at the exact perch coordinates and draws the pond/paths in code where the spec needs them.

## All four zones, one wide scrolling backdrop — `zones-panorama` (723 chars)

```
A very wide seamless cartoon landscape panorama for a kids' game, one continuous horizon line at the same height across the whole image, four biomes blending left to right: (1) an open sunny meadow of soft mint-green grass with tiny flowers, (2) a calm pale-blue pond area with gentle banks, (3) a soft woodland with a distant treeline in 2-3 green tones, (4) gentle blue-grey cliffs and rocky ground at the far right. Pale mint sky #C9E8DF with a few simple cream clouds. BACKGROUND SCENERY ONLY: no trees in the foreground, no animals, no birds, no buildings — the foreground ground band stays clean and empty (game furniture is placed on top in code). Flat cartoon style, soft two-tone shading, no gradients, no texture.
```

## Fallback: one zone at a time (run 4x, swap the biome line) — `zone-single` (523 chars)

```
A wide cartoon landscape backdrop for a kids' game: [BIOME — e.g. 'an open sunny meadow of soft mint-green grass with tiny flowers']. Horizon line at exactly two-thirds down, pale mint sky #C9E8DF, a few simple cream clouds high up, distant scenery in soft muted tones. BACKGROUND ONLY: empty clean foreground ground band, no foreground trees, no animals, no birds. Flat cartoon style, soft two-tone shading, no gradients. Same sky, same horizon height, same palette as the other zones so they join seamlessly side by side.
```

# E2. The four biome prompts, filled in (16:9, run once each)

Same-sky + same-horizon rules are what make the four join seamlessly — if one comes out with a different horizon height, reroll it rather than keeping it.

## Meadow (start zone) — `zone-meadow` (814 chars)

```
Wide cartoon landscape backdrop for a kids' game, 16:9. Horizon line at exactly two-thirds down the image, pale mint sky #C9E8DF above it, a few simple cream clouds high up. An open sunny meadow: soft mint-green grass in 2-3 gentle green tones rolling to the horizon, scattered tiny cream and apricot wildflowers in the middle distance only, a very distant soft treeline on the horizon. BACKGROUND ONLY: the bottom third is a clean, empty, softly colored ground band with no objects — no foreground trees, no bushes, no rocks, no animals, no birds, no buildings (game furniture is placed on top in code). Flat cartoon style, soft two-tone shading, no gradients, no texture, no outlines. Same sky color, same horizon height and same soft palette as the companion zone backdrops so they join seamlessly side by side.
```

## The Pond (opens at 5 birds) — `zone-pond` (838 chars)

```
Wide cartoon landscape backdrop for a kids' game, 16:9. Horizon line at exactly two-thirds down the image, pale mint sky #C9E8DF above it, a few simple cream clouds high up. A calm pond landscape: a wide pale-blue pond stretching across the middle distance just below the horizon, gentle grassy banks, a few soft green reed clusters at the far water's edge in the middle distance only, a distant soft treeline. BACKGROUND ONLY: the bottom third is a clean, empty, softly colored ground band with no objects — no foreground trees, no bushes, no rocks, no animals, no birds, no buildings (game furniture is placed on top in code). Flat cartoon style, soft two-tone shading, no gradients, no texture, no outlines. Same sky color, same horizon height and same soft palette as the companion zone backdrops so they join seamlessly side by side.
```

## The Woods (opens at 10 birds) — `zone-woods` (864 chars)

```
Wide cartoon landscape backdrop for a kids' game, 16:9. Horizon line at exactly two-thirds down the image, pale mint sky #C9E8DF above it, a few simple cream clouds high up. A soft friendly woodland: several rounded cartoon trees in the middle distance with layered green canopies in 2-3 tones and warm brown trunks, deeper forest fading to a muted green treeline at the horizon, dappled lighter-green patches on the mid-distance grass. BACKGROUND ONLY: the bottom third is a clean, empty, softly colored ground band with no objects — no foreground trees, no bushes, no rocks, no animals, no birds, no buildings (game furniture is placed on top in code). Flat cartoon style, soft two-tone shading, no gradients, no texture, no outlines. Same sky color, same horizon height and same soft palette as the companion zone backdrops so they join seamlessly side by side.
```

## The Cliffs (opens at 15 birds) — `zone-cliffs` v2, green ground (948 chars)

```
Wide cartoon landscape backdrop for a kids' game, 16:9. Horizon line at exactly two-thirds down the image, pale mint sky #C9E8DF above it, a few simple cream clouds high up. A gentle highland: soft blue-grey rocky spires and ledges rising in the middle distance in 2 stone tones with rounded friendly edges, sparse tufts of green grass between the distant rocks, one far-off peak near the horizon. The bottom third is the same soft green grass as a sunny meadow — gentle rolling green bands in 2-3 tones with a few small sandy-earth patches and scattered small stones between them, NOT a solid sand-colored floor. BACKGROUND ONLY: no objects in the foreground, no animals, no birds, no buildings (game furniture is placed on top in code). Flat cartoon style, soft two-tone shading, no gradients, no texture, no outlines. Same sky color, same horizon height and same soft palette as the companion zone backdrops so they join seamlessly side by side.
```
