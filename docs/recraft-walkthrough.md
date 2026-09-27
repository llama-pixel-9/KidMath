# Recraft Walkthrough — first time, start to finish

Goal: 24 style-consistent bird SVGs in `design/meadow-art-pilot/generated/`, ready
for Claude to layer-cut and wire into the Meadow. Prompts: `docs/recraft-prompts.md`.

## Phase 0 — Account and plan (10 min)

1. Go to **recraft.ai** → Sign up (Google login works).
2. **Plan decision — this is a licensing decision, not a feature one.** The free
   tier (50 credits/day) makes your images PUBLIC and grants **no commercial
   rights**. KidMath is a paid app — final assets must be generated on a paid
   plan. **Basic (~$10–12/mo)** is enough: ~1,000 credits/mo, private images,
   commercial rights. You may explore style on free credits, but anything you
   ship must be (re)generated while subscribed. Same per-item license discipline
   as the bird-call recordings.
3. Budget check: 24 birds × ~6–8 attempts ≈ 150–200 credits — one Basic month
   covers the whole roster with plenty of headroom for the style hunt.

## Phase 1 — Project and the pilot 4 (1–2 evenings)

4. From the dashboard, create a **new project** — you land on an infinite canvas
   with a generation panel (exact labels shift between releases; the flow below
   is stable).
5. In the prompt bar at the bottom of the canvas (verified against the V4.1 UI,
   Aug 2026 — there is no separate "Image type" toggle; vector is a style/model
   choice):
   - Click the **Style** chip → the style dialog opens on **Discover**.
   - In the "Try Recraft V4.1" row, hover **Recraft V4.1 Vector** → **Apply**.
     The right-side panel must say **Type: Vector** — that's what makes SVG
     export possible. (**V4.1 Pro Vector** = higher quality, more credits.)
   - Cartoon/flat substyles: same dialog, search or the "All styles" dropdown;
     any style whose panel says Type: Vector works. Try 2–3 during the pilot —
     the style choice moves results more than prompt wording does.
   - **"+ Create style"** (top-right of this dialog) is where Phase 2's custom
     style gets made.
   - **Size:** 1:1. **Variants:** click the "2 images" chip → set to 4.
6. Paste the **Skylark** prompt from `docs/recraft-prompts.md` → Generate.
7. Repeat for **Cardinal, Barn Owl, Whooping Crane**. Judge the four AS A SET —
   a bird that's cute alone but breaks the set loses.
8. Iterating:
   - If output ignores parts of the prompt: Recraft favors shorter prompts.
     Use this condensed master instead and keep the species line intact:
     > Cute cartoon [SPECIES + field marks] game character for a kids' app.
     > Side view facing right, standing, full body, big expressive eye, kind
     > face, strong silhouette. Bold flat vector shapes, warm palette, max 6
     > colors, solid #C9E8DF background. Wing, head, tail and legs drawn as
     > clean separate shapes so the character can be animated by parts.
   - If a bird is 90% right, use Recraft's editing tools on the canvas (select →
     regenerate area / adjust colors) rather than rerolling from scratch.
   - Check each keeper against the acceptance checklist in
     `docs/imagegen-prompt-pack.md` (field marks, silhouette, no teal, wing
     distinct).

## Phase 2 — Lock the style (30 min)

9. When you have a batch you love: **create a custom style** from it. In the
   styles panel choose **Create/Add style**, upload 3–5 of your favorite
   generated birds as the reference images, and name it (e.g. `larkit-birds`).
10. Select that custom style for every generation from now on. This step is what
    keeps birds #5–24 looking like birds #1–4.

## Phase 3 — Batch the remaining 20 (1–2 evenings)

11. With `larkit-birds` selected, run the remaining prompts from
    `docs/recraft-prompts.md`, 2–4 variants each. The custom style now carries
    the look, so results converge much faster than the pilot did.
12. Watch the special cases: hummingbird (hovering), woodpecker (tail-propped),
    cranes (tall proportions), condor (enormous), chicks (fluffballs). Their
    prompts already say so — just verify the output honored it.

## Phase 4 — Export and hand off to Claude (30 min)

13. Select each final bird → **Export → SVG** (Recraft's vector export produces
    editable SVG with layers — exactly what the animation rigs need).
14. Name each file by its roster id, exactly:
    `skylark.svg, houseFinch.svg, mourningDove.svg, chickadee.svg, houseWren.svg,
    robin.svg, junco.svg, cardinal.svg, downyWoodpecker.svg, goldfinch.svg,
    blueJay.svg, hummingbird.svg, kingfisher.svg, barnSwallow.svg, barnOwl.svg,
    puffin.svg, sandhillCrane.svg, paintedBunting.svg, kestrel.svg, snowyOwl.svg,
    whoopingCrane.svg, condor.svg, whoopingCraneChick.svg, condorChick.svg`
15. Drop them in `KidMath/design/meadow-art-pilot/generated/` and tell Claude.
    Claude then: cuts wing/head/tail/body layers + pivots, normalizes size and
    feet-anchor to the BirdSprite contract, runs the small-size + night-silhouette
    checks, rebuilds the preview sheet and the rig demo with the new art.

## Phase 5 (optional) — automate the boring part

Recraft has an official **MCP server** (`recraft-ai/mcp-recraft-server`) and an
API (~$0.08/vector image). Once the custom style is locked, you can add the MCP
server to Claude desktop with a Recraft API key and let Claude batch-generate the
remaining birds and variants directly — you stay on art direction, Claude does
the clicking. Worth setting up if round 1 goes well or when seasonal flocks
(4–5 new birds per season) become routine.

## Pitfalls

- **Don't ship free-tier images** (no commercial rights, public).
- **Don't fall in love with one bird** — judge sets of four.
- **Don't skip the custom style** before batching; per-prompt consistency drifts.
- **Don't accept a bird whose wing is fused into the body** — it can't flap.
  That's a reroll, not a keeper, no matter how cute.
- Keep every keeper's generation (project stays in Recraft) so seasonal birds
  next quarter reuse the same locked style.
