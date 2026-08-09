# Larkit Open-World: Implementation Plan

**Goal:** Evolve Larkit from a set of K-3 math minigames into an explorable world where math is the core verb — built incrementally, with Claude writing the code, on the existing Supabase + Vercel + Stripe stack, shipping to larkit.io and iOS (Capacitor).

---

## Part 1 — Design principles the plan is built on

These aren't decoration; each one dictates specific decisions in the phases below.

### 1. Intrinsic integration: math must be the verb, not the toll booth

The strongest research finding in educational game design. Habgood & Ainsworth ([*Journal of the Learning Sciences*, 2011](https://www.tandfonline.com/doi/abs/10.1080/10508406.2010.508029); [full PDF](https://shura.shu.ac.uk/3556/1/Habgood_Ainsworth_final.pdf)) ran controlled studies with their game *Zombie Division* and found that children learned more — and chose to play seven times longer — when the math was embedded in the core mechanic (attacking skeletons *by* dividing) versus the identical game with math bolted on between levels. A follow-up ([ACM CHI PLAY, 2022](https://dl.acm.org/doi/abs/10.1145/3549503)) showed intrinsic integration works by directing attention to the learning content during the moments of highest engagement. The failure mode has a name — ["chocolate-covered broccoli"](https://screenwiseparenting.substack.com/p/chocolate-covered-broccoli-games) — and it describes most math games, arguably including Prodigy, where battles pause for a math quiz that has nothing to do with fire spells.

**What this means for Larkit:** every world interaction should *be* math where possible. The bridge has 12 planks and you carry 4 at a time — how many trips? The baker needs loaves in rows of 3. The gate shows 7+_=12. Never "answer 5 questions to continue."

### 2. Self-determination theory: competence, autonomy, relatedness

Ryan, Rigby & Przybylski's ([*Motivation and Emotion*, 2006](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf); [2010 follow-up](https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf)) research on why games motivate: they satisfy **competence** (I'm getting better and can feel it), **autonomy** (I chose to do this), and **relatedness** (I matter to someone). This is the theoretical backbone of Rigby & Ryan's book *Glued to Games*.

**What this means for Larkit:** competence = visible mastery (zones bloom as skills are mastered, not just stars accumulating); autonomy = at least 2–3 unlocked places to go at any time, and the kid picks — an open world's real payload is autonomy, which worksheet apps can never offer; relatedness (with no multiplayer allowed) = NPCs who remember you ("You fixed my bridge!") and a pet that grows because *you* practiced.

### 3. Flow: difficulty tracks skill

Csikszentmihalyi's flow channel — challenge slightly above skill, adjusted continuously. In practice for K-3: an adaptive engine keeps ~80% success rate, ramps within a session, and never punishes hard (wrong answers cost time, never progress or possessions).

### 4. Teach through level design, not tutorials

Nintendo's *kishōtenketsu* structure — introduce a mechanic safely, develop it, twist it, conclude — lets Mario games teach without a single text tutorial ([overview](https://openedsource.medium.com/kish%C5%8Dtenketsu-hakoniwa-dd5a568da169); [MCV/Develop on Nintendo's four-step level design](https://mcvuk.com/business-news/publishing/video-nintendos-level-design-secrets-in-four-steps/)). Critical for K-3, where many players *can't read yet*.

**What this means for Larkit:** the first zone IS the tutorial. First interaction is un-failable, audio + iconography over text everywhere, every new mechanic introduced in a safe context before it gates anything.

### 5. Anti-Prodigy: the ethics are the differentiation

Prodigy drew an [FTC complaint from Fairplay and 20+ advocacy groups](https://www.axios.com/2021/02/19/prodigy-math-game-ftc-complaint) ([EdWeek coverage](https://www.edweek.org/technology/popular-interactive-math-game-prodigy-is-target-of-complaint-to-federal-trade-commission/2021/02); [Fairplay's "7 reasons"](https://fairplayforkids.org/pf/prodigy/)) for relentless in-game membership upsells shown *to children*. Larkit's rules, stated as design law: all math content free forever; membership sold only on parent-facing surfaces, never inside the child's world; locked content shows as "not yet discovered," never as a padlock with a price; no artificial waiting mechanics. This is also required posture for Apple's Kids Category and the school sales channel later.

### 6. Session shape: the 10-minute loop

K-3 attention plus parental time limits mean every session must feel complete in ~10 minutes: one quest arc, one visible unlock, one collectible. Think Animal Crossing's daily rhythm, not Zelda's dungeon length. A "come back tomorrow" hook (a seed planted, an NPC's promise) beats any streak-guilt mechanic — growth framing, not loss framing, for this age.

---

## Part 2 — The game concept (working shape)

**The world:** a hand-drawn archipelago map built from the existing vector assets. Each island = a math strand (counting/number sense, addition, subtraction, place value, multiplication, division/fractions...). Islands are fogged until discovered; within an island, locations bloom from sketchy/grayscale to full color as mastery grows — the map itself is the progress bar.

**The loop:** pick an island → NPC has a problem → the problem *is* math (intrinsically integrated, per principle 1) → solving repairs/builds/feeds/unlocks something visible and permanent → earn stars (currency) + occasionally a collectible → spend stars on cosmetics, pet items, home decorations.

**The existing minigames** slot in as "practice spots" (the arcade in town, the bubble spring) — they're the high-rep drill layer; the world quests are the motivation and application layer. Nothing already built is thrown away.

**Mastery model:** per-skill mastery from streaks + spaced repetition (not raw question counts). Mastery gates discovery; stars are earned by *any* practice. So progression = learning, economy = effort. This split is what makes the teacher-dashboard story work for the school channel later.

---

## Part 3 — Technical architecture

**Rendering:** Phaser 3 mounted inside the existing web app as a full-screen scene ("world mode"), with the current DOM minigames launched as overlays from within the world. One codebase → larkit.io (Vercel) + iOS via Capacitor. No engine fork, no Godot.

**Asset pipeline (build-time script):** SVG masters → rasterized at 1x/2x/3x (sharp) → packed into texture atlases (free-tex-packer-core or texture-packer CLI) → atlases + JSON loaded by Phaser per zone. SVGs stay the single editable source of truth. Simple animation via Phaser tweens (bob, blink, squash-and-stretch); Rive later if characters need rigging.

**Data model (Supabase / Postgres, all behind RLS):**

- `world_defs` — versioned JSON per zone: layout, NPC placements, quest graph, interaction points (content, not code — so new islands ship without app releases)
- `player_state` — current zone, position, discovered zones
- `skill_mastery` — per-skill: mastery score, streak, last-seen (spaced repetition), attempt history
- `inventory` / `cosmetics` — stars balance, owned items, pet state, home layout
- `quest_progress` — per-quest step state

**Server-authoritative economy:** stars and unlocks awarded only via a Supabase Edge Function that validates the claimed work (question ids + answers + timing sanity checks). The client never mints currency. Same function updates mastery — one write path, one audit log.

**Adaptive difficulty engine:** pure TypeScript module, shared web/iOS, unit-testable: target ~80% success, select next question by (mastery gap × spaced-repetition due-ness), difficulty steps within session. Start simple (Leitner-style boxes per skill); leave the interface clean enough to swap in something smarter later.

**Offline/perf targets:** playable on a low-end school iPad and a cheap Chromebook; zone assets lazy-loaded; state syncs optimistically with server reconciliation.

---

## Part 4 — Keeping go-live safe: branching & release strategy

The open-world work must not put the Larkit launch at risk. The isolation happens at three layers — a branch alone isn't enough, because the danger isn't just code conflicts, it's the shared database and the eventual merge.

**Code: a `feature/open-world` branch, kept short-lived in spirit.** All world work happens on `feature/open-world`, never on `main`. Two rules keep it from becoming a merge nightmare after launch-crunch changes land on `main`: rebase it on `main` at least weekly (I do this; you review conflicts, which stay small at weekly cadence), and keep the world code physically isolated — everything lives under its own directory (e.g. `src/world/`) plus one mount point in the app shell, so a rebase almost never touches files the launch work is editing.

**Runtime: a feature flag, so merges are safe even before the world is ready.** The world mounts only when `WORLD_ENABLED` is on (env var now; a per-user flag in Supabase later for beta testing). This is the real protection: once each world milestone is stable, it can merge to `main` *dark* — compiled in, invisible in production, flipped on only for you. That converts the risky big-bang merge after launch into a series of small, boring ones, and means the launch build and the world build never truly diverge. If you'd rather not merge anything until after go-live, the branch alone still works — the flag just makes that choice reversible.

**Deploys & database: previews, and additive-only migrations.** Vercel automatically gives `feature/open-world` its own preview URL on every push — that's where world builds are tested (including on the iPad, via the preview URL) with zero contact with larkit.io. For the data layer, use Supabase preview branching if it's enabled on the project (each Git branch gets an isolated database); if not, the same safety comes from a migration discipline: world migrations are **additive only** — new tables (`world_defs`, `quest_progress`, etc.), never `ALTER`s to tables the live game uses — and they don't run against production until the first dark merge. The award Edge Function is likewise a *new* function, not a change to any existing one.

**iOS:** the Capacitor/world shell stays entirely on the branch until after the App Store launch build is approved — no world code in the binary Apple reviews for go-live.

Net effect: `main` stays launch-pure, you test the world on real devices via preview URLs the whole time, and post-launch adoption is a flag flip, not a merge event.

## Part 5 — Phased build

Assumes I write all code and content drafts; your time is review, on-device testing, art direction, and decisions. Estimates are calendar time at a your-evenings pace.

### Phase 0 — Foundations (2–3 sessions)

Create `feature/open-world` off `main` and set up the isolation from Part 4 (world directory, `WORLD_ENABLED` flag, Vercel preview confirmed, weekly-rebase routine). Then: asset pipeline script (SVG → atlases); Phaser mounted in the app behind the flag; Capacitor shell confirmed rendering it on an iPad via the preview URL; additive-only Supabase migrations for the tables above; the award Edge Function skeleton (as a new function). **Exit test:** a Phaser scene of your vector assets pans smoothly on an actual iPad.

### Phase 1 — The Living Map (1–2 weeks)

The scrollable archipelago: fog-of-war, islands that bloom with mastery, tap-to-enter nodes wrapping the existing minigames, stars flowing through the server-side award path, first-run "sail to the first island" moment (un-failable, wordless). Mastery engine v1 driving what unlocks.
**Ship this.** It's a real release — the map meta-layer alone changes the product's feel — and its retention data decides how hard to push Phase 2. **Exit test:** a kid can navigate it with zero adult help; D1/D7 retention baseline captured.

### Phase 2 — First Walkable Island (3–4 weeks)

One island becomes a walkable zone: touch-friendly movement (tap-to-move, no virtual joystick — they're miserable for small hands), 3 NPCs, 5 intrinsically-integrated quests (the bridge, the bakery, the gate — per principle 1), audio-first dialog (TTS or recorded), quest state persisted. The island's tutorial follows kishōtenketsu: safe intro → develop → twist → celebrate.
**Exit test:** watch a real K-3 kid for 10 minutes — do they *choose* the quest over the arcade? Does any quest step confuse a non-reader?

### Phase 3 — Ownership Layer (2–3 weeks)

The retention engine: a pet earned early (grows with practice — competence made visible), home base with star-purchasable decorations, collectibles hidden across zones, the "come back tomorrow" hook (planted seeds, NPC promises). Membership gating wired in, parent-side only (principle 5): free arc = full first islands + all math forever; membership = cosmetic breadth + additional islands.

### Phase 4 — World Expansion (ongoing, ~1 island / 1–2 weeks)

Because zones are data (`world_defs` JSON), new islands are content drops: I draft layout + quest graphs + dialog against the established schema; you art-direct and playtest. Seasonal events (a comet island in December) become cheap and are the strongest re-engagement lever this side of multiplayer.

### Deliberately cut (revisit only with data)

Multiplayer/social (COPPA + Kids Category minefield — async "visit a decorated house" is the *eventual* ceiling), battles/combat (Prodigy's lane; weakest math integration), reading-dependent story, virtual joysticks, streak-shaming mechanics.

---

## Part 6 — Measurement & verification

- **Per phase:** playtest on low-end iPad + Chromebook; the 10-minute-kid-test is the gate for every shipped phase.
- **Learning check (the one that matters):** mastery scores must correlate with performance on *out-of-game* items (the printable worksheets are a ready-made transfer test — a genuinely nice asset most competitors lack).
- **Engagement analytics:** D1/D7/D30, sessions/week, minutes/session (should hover near 10–15, not 60 — long sessions at this age mean parent-conflict churn), quest-vs-arcade choice rate (measures whether intrinsic integration is landing).
- **Economy audit:** stars awarded only via the Edge Function path; attempt-log sanity checks for cheating/exploits.
- **Compliance re-check before each App Store submission:** Kids Category checklist, COPPA consent flow untouched, zero child-facing purchase surfaces.

---

## Sources

- Habgood & Ainsworth, [Motivating Children to Learn Effectively: Exploring the Value of Intrinsic Integration in Educational Games](https://www.tandfonline.com/doi/abs/10.1080/10508406.2010.508029), *Journal of the Learning Sciences* (2011) — [author PDF](https://shura.shu.ac.uk/3556/1/Habgood_Ainsworth_final.pdf)
- [Learning by Doing: Intrinsic Integration Directs Attention to Increase Learning in Games](https://dl.acm.org/doi/abs/10.1145/3549503), ACM CHI PLAY (2022)
- Ryan, Rigby & Przybylski, [The Motivational Pull of Video Games: A Self-Determination Theory Approach](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf), *Motivation and Emotion* (2006); [A Motivational Model of Video Game Engagement](https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf) (2010)
- [Kishōtenketsu & Hakoniwa: How Nintendo Inspires My Designs](https://openedsource.medium.com/kish%C5%8Dtenketsu-hakoniwa-dd5a568da169); [Nintendo's level design secrets in four steps](https://mcvuk.com/business-news/publishing/video-nintendos-level-design-secrets-in-four-steps/)
- [Chocolate Covered Broccoli Games](https://screenwiseparenting.substack.com/p/chocolate-covered-broccoli-games) (on the bolt-on failure mode)
- Prodigy FTC complaint coverage: [Axios](https://www.axios.com/2021/02/19/prodigy-math-game-ftc-complaint), [EdWeek](https://www.edweek.org/technology/popular-interactive-math-game-prodigy-is-target-of-complaint-to-federal-trade-commission/2021/02), [Fairplay](https://fairplayforkids.org/pf/prodigy/)
- Books worth having on the shelf: Jesse Schell, *The Art of Game Design: A Book of Lenses*; Raph Koster, *A Theory of Fun for Game Design* (its thesis — fun IS learning — is basically Larkit's mission statement); Rigby & Ryan, *Glued to Games*; Csikszentmihalyi, *Flow*
