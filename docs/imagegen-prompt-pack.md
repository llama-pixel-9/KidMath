# Meadow Bird Art — Image-Model Prompt Pack

Companion to `docs/bird-art-style-guide.md`. Use with a purpose-built image model,
then hand the outputs back to Claude for integration (vectorize/normalize/QC into
the BirdSprite contract).

## Which model (as of Aug 2026)

| Model | Why / why not | Output |
|---|---|---|
| **Recraft** (recraft.ai) | **Best fit.** Built for consistent icon/character sets in one style; exports **real SVG** (drops straight into the vector pipeline, keeps the free night-silhouette recolor). Style-reference feature keeps 22 birds in one hand. | SVG or PNG |
| **Gemini image (Nano Banana Pro)** | Best character consistency from reference images — generate one style sheet, then condition every bird on it. | PNG |
| **GPT Image** (ChatGPT/OpenAI API) | Strong style adherence with a reference image + long instructions. | PNG |
| **Midjourney** | Prettiest single images; weakest at strict cross-image consistency and transparent flat-vector looks. Use for portrait-plate exploration, not the sprite set. | PNG |
| Human illustrator | Still the quality ceiling. With the style guide + this pack as the brief, "22 flat-vector birds, 3 poses of 2 of them, 2 chicks" is a small, quotable commission. | any |

All majors currently allow commercial use of outputs — but re-check the specific
plan's terms before shipping (API vs consumer plan terms sometimes differ).

## Workflow that keeps 22 birds consistent

1. Generate ONE **style sheet** first (prompt below) and iterate until you love it.
2. Generate every species **with that sheet attached as a style/reference image**,
   one bird per image, transparent or flat `#C9E8DF` background.
3. Batch in one session/thread where the tool supports it (consistency drifts less).
3½. **Animation requirement:** prefer vector output (Recraft) or clean flat raster —
   Claude must be able to cut each bird into `wing` / `head` / `tail` / `body`
   layers for the rig system (`docs/bird-animation-plan.md`). If commissioning a
   human artist instead, put "deliver layered SVG, wing/head/tail as separate
   groups" in the brief up front.
4. Drop outputs into `design/meadow-art-pilot/generated/` and hand back to Claude:
   Claude vectorizes (if raster), normalizes size/anchor to the BirdSprite contract,
   enforces the palette, builds night silhouettes, and rebuilds the preview sheet.
   Raster is shippable too: PNG @2x with a CSS `brightness(0)` filter for night.

## Master style prompt — Recraft (paste before every bird)

Note: this deliberately does NOT anchor to the hand-drawn pilot look. The style is
open for Recraft to explore — the constraints are the app's visual language +
game-character appeal + the integration/animation contract.

> Charming cartoon bird character for a polished kids' game — the collectible
> mascot of a premium children's app. Side view, facing right, full body, standing
> with a confident, playful pose and real personality: this bird should feel
> alive, like it's about to hop, sing, or show off a trick. One big expressive eye
> with a white highlight; a cheerful, kind face (the audience is 6-year-olds —
> friendly, never fierce). [SPECIES LINE from the table below.] Keep the species'
> 2–3 real field marks accurate and recognizable, but exaggerate them with
> cartoon charm. Style: bold, simplified cartoon shapes with a strong, instantly
> readable silhouette. Flat vector color fills — at most one soft second tone per
> color area for depth; no gradients, no texture, no realistic rendering. Warm,
> friendly palette of max 6 colors that pops against a soft mint background
> (#C9E8DF) and harmonizes with a cream-and-apricot interface (#FFFDF4, #F26B3A).
> Do not use dark teal (#0E3B34) as a body color and do not use flat geometric
> logo styling. Wing, head, and tail drawn as clean, distinct shapes (the
> character will be animated by parts). Solid #C9E8DF background, character
> centered, feet at the bottom.

**Animation clause (include in every generation):**

> Built to be animated by parts: the folded wing is one complete closed shape
> layered over the body, ready to rotate at the shoulder; the head (with beak and
> eye) is separable at the neck; the tail is a distinct shape at its base; both
> legs are drawn separate from the body with visible feet. No parts fused into one
> blob, no limbs hidden behind the body, nothing overlapping the wing except the
> body behind it.

**→ `docs/recraft-prompts.md` has all 24 prompts fully assembled** (master +
species line + animation clause already substituted) — copy-paste one per bird.

Recraft workflow: pick a vector style (Vector Illustration → flat/cartoon
substyle). Round 1: run the skylark + cardinal + barn owl + whooping crane with
this prompt and iterate until one batch makes you smile. Save that batch as a
**custom style / style reference**, then generate the remaining birds against it —
that's what keeps 22 birds in one hand. Export SVG.

## Per-species prompts (append to the master)

| speciesId | Append |
|---|---|
| skylark | "A Skylark: streaky warm buff-brown upperparts, cream belly, small pointed crest on the crown, pale eyebrow stripe, thin horn-colored beak." |
| houseFinch | "A male House Finch: rosy red head and chest, streaky brown wings and belly, stubby seed-cracking beak." |
| mourningDove | "A Mourning Dove: soft grey-tan, small round head on a plump body, long tapered tail, black wing spots, gentle expression." |
| chickadee | "A Black-capped Chickadee: black cap and bib, white cheeks, grey wings, buff flanks, tiny beak." |
| houseWren | "A House Wren: warm brown all over, fine barring on wings and tail, short tail cocked upward, thin slightly curved beak." |
| robin | "An American Robin: brick-orange breast, dark grey-brown head and back, yellow beak, white eye crescent." |
| junco | "A Dark-eyed Junco: slate-grey hood and back, crisp white belly, small pink beak." |
| cardinal | "A female Northern Cardinal: warm buff-tan body, red-orange crest, red-washed wings and tail, black face around a thick orange conical beak." |
| downyWoodpecker | "A Downy Woodpecker clinging upright: black and white checkered wings, white back stripe, small red patch on the back of the head, short chisel beak." |
| goldfinch | "An American Goldfinch: bright lemon-yellow body, black cap, black wings with white wingbar, small pink conical beak." |
| blueJay | "A Blue Jay: bright blue crest and back, white face and belly, black necklace, black barring on wings and tail." |
| hummingbird | "A Ruby-throated Hummingbird hovering: emerald green back, white belly, iridescent ruby-red throat patch, long needle beak, tiny blurred wings." |
| kingfisher | "A Belted Kingfisher: blue-grey with a shaggy crest, big head, white collar, blue breast band, long dagger beak." |
| barnSwallow | "A Barn Swallow: glossy steel-blue back, rusty-orange throat, buff belly, long forked tail streamers, tiny beak." |
| barnOwl | "A Barn Owl standing upright: white heart-shaped facial disc, golden-buff back and wings with tiny spots, white speckled breast, dark eyes." |
| puffin | "An Atlantic Puffin: black back, white belly, big triangular striped beak (orange, yellow and blue-grey), orange feet, white face." |
| sandhillCrane | "A Sandhill Crane: tall grey body, long neck and legs, red crown patch, white cheek, long straight beak." |
| paintedBunting | "A male Painted Bunting: blue head, green back, red chest and belly — three clean color blocks, small finch beak." |
| kestrel | "An American Kestrel: rusty-orange back and tail, slate-blue wings, two black vertical face stripes, small hooked beak, spotted cream chest." |
| snowyOwl | "A Snowy Owl: round white body with sparse dark speckles, golden-yellow eyes, feathered feet, sitting upright on the ground." |
| whoopingCrane | "A Whooping Crane: very tall white body, black wingtip plumes drooping over the tail, red crown, dark mustache mark, long dark legs, long straight beak. Proportions: much taller than a songbird." |
| condor | "A California Condor: huge black body, bald orange-pink head, white wing panel, massive hooked ivory beak, ruff of black feathers around the neck. Proportions: enormous, wings like a cloak." |
| whoopingCraneChick | "A Whooping Crane chick: round cinnamon-buff fluffball, stubby beak, oversized dark legs, nothing like the adult — adorable." |
| condorChick | "A California Condor chick: grey downy fluffball with a bare pinkish head, hunched and endearing." |

## Extra poses (only after the base set is approved)

- condor: "wings fully spread like an open cloak, soaring" · whoopingCrane: "dancing —
  leaping with wings flared and head thrown back" · kestrel/hummingbird: "hovering"
- generic flight pose per body type: "same bird flying, wings up, side view"

## Acceptance checklist (Claude runs this on every delivered image)

- [ ] Side view, faces right, full body, feet at consistent baseline
- [ ] Field marks correct per roster.js facts
- [ ] Flat fills, one consistent line treatment across the whole set (whatever the
      locked style reference uses), ≤6 colors — no gradients or texture
- [ ] Reads at 32px tall (sprite) AND as a silhouette (night test)
- [ ] Not LarkMark teal; not in the logo's geometric style
- [ ] Size relationships honored when normalized (SPRITE_SIZES ratios)
