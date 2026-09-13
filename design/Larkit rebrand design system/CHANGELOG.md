# Larkit rebrand — change log

> **`Larkit Gamification Spec.dc.html` is the finalized, consolidated gamification design —
> build against that file.** `Larkit Gamification.dc.html` keeps the turn-by-turn working
> record (turns 6–8) and
> Gamification explorations for turns 1–5 now live in `Larkit Gamification Explorations.dc.html`.
> `Larkit Gamification.dc.html` holds current spec only (turns 6–8). Ambient motion runs live
> only in the 6a hero frame; §6e's table is the source of truth for every animation.

Two-bucket system: **Unreleased** is everything not yet in the live app. When you
push, move the whole block into a dated section under Shipped and empty Unreleased.

Rule of thumb: one bullet per *thing a developer must change*, with the brand-guide
section number and the file(s) it touches — not per design tweak.

---

## Unreleased — not yet in the app

### Build log — gamification implementation (app code, behind flags)
- ADDED the master launch switch (`src/gamificationFlags.js`, `GamFlags.swift`):
  `VITE_GAM_ALL=true` / `GamFlags.all` turns every step on; an explicit per-step
  `false` still wins, so one layer can be killed while the master stays on.
  Deployed to main (7bb42c8) alongside the full gamification merge (a40af4a) —
  everything dormant in prod until the env vars are set.
- BUILT spec §11 + §14 on iOS (completing the port): migration send-off prompt +
  circle-and-V departure + arrival-style returns with seen-marks
  (`Services/Seasons.swift` migrationEvents, `FlockService.swift`,
  `MeadowView.swift` DeparturePromptView); stars-into-the-Nest on arriving from a
  Flight Report (≤14 sprites, 600/40ms, unskippable, before migration events) +
  `Services/MotionSpec.swift` mirroring the web's verbatim §14 table; play-spot
  visits with species-suitable kinds; signature rigs in ground-wiggle / flight-arc
  archetypes; DEBUG `-seedMeadowStars N` QA hook. Ceremony verified on-simulator
  (0 → 12 in the Nest). 35 iOS + 486 web tests green. Both platforms now cover
  §01–§14; remaining gaps are placeholder fidelity (art, rigs, real calls), the
  web's richer zone-open choreography on iOS, and iOS cloud sync of the
  engagement blob.
- BUILT spec §09–§12 v1 on iOS, behind `GamFlags.roster` / `.ceremonies` /
  `.meadowMotion` (`-gamRoster 1` etc.): tap hop + rare signature answer + scheduled
  performances + saved idle bob (`MeadowView.swift` PerchedBirdView); egg purchase,
  warmth ring/cracks/ready-glow and the hatch sheet with naming chips
  (`FlockService.swift`, `MeadowCeremonies.swift`, store egg rows in
  `MeadowSheets.swift`); seasonal tints + frozen winter pond + night palette swap with
  sleeping silhouettes (`Services/Seasons.swift`, `MeadowScenery.swift`); away migrants
  keep an empty reserved perch + guide chip. Send-off/return ceremonies and full §14
  tiers still to come on iOS. Tests: egg lifecycle + seasons in
  `ios/KidMathTests/FlockTests.swift` (35 iOS tests green).
- BUILT spec §04–§08 v1 on iOS, behind `GamFlags.meadow` (`-gamMeadow 1`,
  `-autostartMeadow 1`): roster/zones/perches/placement now exported from the shared
  JS engine (`src/engine/nativeEntry.js` + `EngineBridge`) so the platforms share one
  source of truth; `Services/FlockService.swift` (starter, zone unlocks, Give a home);
  `Views/MeadowView.swift` (design-unit scene, drag/rubber-band/settle, chips, hedge,
  Nest, tap → call → entry), `MeadowScenery.swift`, `MeadowSheets.swift` (guide entry +
  store with two bands and balance-after); Meadow card + cover on `HomeView`; chirp in
  `SoundPlayer`. Deferred: behaviour rigs, eggs/ceremonies/seasons, §14 tiers. Tests:
  `ios/KidMathTests/FlockTests.swift` (33 iOS tests green).
- BUILT spec §03 on iOS, behind `GamFlags.fledging` (`-gamFledging 1`; flip with the
  web's `VITE_GAM_FLEDGING`): sessions run the shared engine's fledging rules
  (nominate, never level mid-flight); nomination lifecycle + glide-down in
  `ios/KidMath/Services/EngagementStore.swift`; take-off offer, six-question
  challenge run, pass/miss ceremony in `SessionViewModel` + new
  `Views/FledgingViews.swift`; Seafoam report note + glide-down line in
  `SessionCompleteView`; Sun "Ready to fledge" pill on Home cards; test-only
  `forceHighMastery` hook in `EngineBridge`. Tests:
  `ios/KidMathTests/FledgingTests.swift` (29 iOS tests green).
- BUILT spec §01 + §02 on iOS (port kickoff), behind `GamFlags.flightReport`
  (`simctl launch … -gamFlightReport 1`; flip together with the web's
  `VITE_GAM_FLIGHT_REPORT`): the settlement comes from the SAME shared engine
  (`EngineBridge.summarizeFlight` → `ios/KidMath/Engine/EngineBridge.swift`);
  new `ios/KidMath/Services/EngagementStore.swift` — Swift mirror of the web
  engagement blob (wallet, local-day streak, firstFlightDay, pendingNestDrop,
  egg warmth passthrough, per-kid `kidmath-engagement:<kid>` scoping with the
  same one-time migration); `ProgressStore.starsEarned(from:)` honours the
  payout (explicit 0 included) with the historical fallback;
  `SessionCompleteView` gains the Flight Report strip → itemised ledger →
  level-bar slot with "N in the Nest" (first-week auto-expand), classic card
  unchanged with the flag off; wiring in `SessionViewModel`/`SessionView`;
  flags in `ios/KidMath/Services/GamFlags.swift`. Tests:
  `ios/KidMathTests/FlightReportTests.swift` (27 iOS tests green, flag-off
  behaviour byte-identical).
- POLISH pass on the build above: nest count-up now tweens 800ms ease-out ending as the
  last diamond lands, with the 1→1.06→1 pulse (`zoneScenes.jsx`); zone-open plays the
  full choreography — sign swings 400ms, hedge PARTS as two halves 500ms at the opening
  zone's edge, camera pans through 600ms — and a ceremony-cancelling effect bug is fixed
  so it actually records (`MeadowScene.jsx`, `zoneScenes.jsx`); egg warmth ring fills
  700ms on arrival with crack draw + 3px shiver at crossed thresholds (`Ceremonies.jsx`);
  both drawers drag 1:1 and snap past 40% (`useDragDismiss.js`); Grown-Ups panel gains
  the §12 parent surface — "bird species collected (N rare or endangered)" stat tile,
  plain-language rank drop, and the two parent-FAQ lines (migration is temporary, stars
  can never be bought) (`GrownUpsPanel.jsx`); `scripts/engineParity.mjs` now submits
  `answer[0]` for list-of-lists multiSelect items, making `npm run test:engine` fully
  green (the 3 long-standing checkAnswer failures were a test-script bug).
- BUILT spec §14 (motion), behind `VITE_GAM_MEADOW_MOTION`: the full three-tier table
  verbatim as data in `src/engagement/meadow/motionSpec.js` (locked word-for-word by
  `src/__tests__/motionSpec.spec.js`, in the `npm test` list); tier-1 ambient loops —
  cloud drift 26s ±26px in two groups, canopy sway 9s ±1.1°, grass sway 6s, pond ripple
  7s (frozen in winter), per-bird idle bob on the saved 4–6s period/delay so the flock
  never pulses together (`zoneScenes.jsx`, `MeadowScene.jsx`); tier-3 stars-into-the-Nest
  on arriving from a Flight Report (≤14 Sun diamonds at 600ms/40ms stagger, count-up,
  pending total carried in the engagement blob via `pendingNestDrop`) with the queue rule
  — stars land first, migration events wait (`MeadowPage.jsx`, `engagementStore.js`,
  `flock.js`); reduced-motion contract everywhere: tier 1 off, tier 2 as 120ms opacity,
  tier 3 as still frames with the same copy, nothing hidden.
- BUILT spec §10–§12 (ceremonies + seasons), behind `VITE_GAM_CEREMONIES`: legendary egg
  purchase (180★), warmth = earned-stars-after-purchase with 25/50/75% cracks, ready-glow
  that waits forever, and the six-beat hatch (rock/crack with the app's only percussive
  taps, chick at 0.6 scale, naming with curated chips + accept-anything input, first
  flight, resumable-by-construction) — `src/engagement/flock.js`,
  `src/engagement/meadow/Ceremonies.jsx`, `engagementStore.js` (EGG_WARMTH_TARGET);
  leaving/return lifecycle (restlessness week, gentle send-off prompt with a genuine
  "Later today", 3s circle-and-V departure, "Away · back in spring" chip, arrival-style
  returns, missed-departure = no missed-event screen) — `src/engagement/seasons.js`,
  `MeadowPage.jsx`, `FieldGuide.jsx`; four seasonal canopy/ground tints + one particle
  each + frozen winter pond + night palette swap at 7pm (9pm summer, owls awake) —
  `zoneScenes.jsx`, `MeadowScene.jsx`; store gains live egg rows ("Bring the egg home",
  "Already warming") — `GiveAHome.jsx`; soft-tap crack sound in `src/sounds.js`.
  Tests: `src/__tests__/ceremonies.spec.js` (in the `npm test` list).
- BUILT spec §09 + §13 (rarity + roster), behind `VITE_GAM_ROSTER`: behaviour ladder in
  `src/engagement/meadow/birdBehaviors.js` — placeholder signature rigs per roster move
  id (2–4s envelopes; 10s legendary set pieces), signature scheduling 3–4×/session at
  ≥90s (busier in a rare bird's own hour), play-spot visits with drift-there-and-back,
  rare/legendary tap → signature instead of hop, calm ~3-days-a-week set-piece cadence —
  wired into `src/engagement/meadow/MeadowScene.jsx` (two-layer bird motion: drift +
  activity). Roster data (all 22 species, prices, six curated names, true four-fact
  entries) shipped in `src/engagement/roster.js`; §13 integrity locked by
  `src/__tests__/roster.spec.js` (exact price table, 8/7/5/2 tiers, 6 migrants,
  per-zone perch suitability, rig coverage — in the `npm test` list).
- BUILT spec §07 + §08 (Field Guide + Give a home), behind `VITE_GAM_BIRD_STORE`:
  guide entry sheet from the right with plate slot, 3px Ink rule, ♪ call, four ruled
  mono-labelled fact rows, tier tabs (met birds only), Rename for hatched rarities,
  and the guide drawer flock strip (`src/engagement/meadow/FieldGuide.jsx`); the
  store drawer with two bands ("you can give a home today" / "keep flying for these",
  "N away" instead of locks), filter chips, seasonal chips, legendary comes-as-an-egg
  rows, and the one purchase screen with balance-after
  (`src/engagement/meadow/GiveAHome.jsx`); tap → hop → call → entry with the ≤180px
  scene shift, and the 1200ms arrival flight as the receipt
  (`src/engagement/meadow/MeadowScene.jsx`, `MeadowPage.jsx`); seasonal availability
  helpers (`src/engagement/seasons.js`). Tests: `src/__tests__/birdStore.spec.js`
  (in the `npm test` list).
- BUILT spec §04–§06 (the Meadow), behind `VITE_GAM_MEADOW`: fourth "Meadow" perch tab +
  `/meadow` route (`src/Navbar.jsx`, `src/App.jsx`); four 1024×588 zone scenes on one
  horizon with free 1:1 drag, 240ms settle, 40px hedge rubber-band, chip rail of earned
  zones only and the once-ever zone-open sequence
  (`src/engagement/meadow/MeadowScene.jsx`, `zoneScenes.jsx`); the Nest as scenery,
  hedge + sign, bird tap → hop + name/call bubble (placeholder chirp in `src/sounds.js`);
  placeholder sprite slots (`BirdSprite.jsx`); 14 named perches + 4 play spots per zone,
  species-suitable placement, ≥96px spacing, 7-per-zone cap, reserved rects
  (`src/engagement/perches.js`); flock/zone appliers + starter Skylark on first flight
  (`src/engagement/flock.js`, `MathExplorer.jsx`); full 22-species roster data file
  (`src/engagement/roster.js`); **per-kid engagement scoping with one-time migration**
  (`src/engagement/engagementStore.js`); star chip now opens the Meadow instead of the
  sticker book when flagged (`src/HomePage.jsx`) and the sticker book's crash on unowned
  stickers is fixed. Tests: `src/__tests__/meadow.spec.js` (in the `npm test` list).
- BUILT spec §03 (fledging), behind `VITE_GAM_FLEDGING`: engine nomination replaces
  in-session auto-promotion and mid-session demotion (`src/mathEngine.js` —
  `options.fledging`, `session.nominated`, challenge sets via `challengeSubskills`);
  nomination lifecycle with the four clears + two-consecutive-rough-flights glide-down
  in `src/engagement/fledging.js` (persisted in the engagement blob); Flight Report
  state 2 Seafoam note + glide-down line (`src/engagement/FlightReport.jsx`); Sun
  "Ready to fledge" pill on the mode's Home card (`src/HomePage.jsx`); take-off offer,
  6-question Fledging Flight run (no stars), pass/miss ceremony in
  `src/MathExplorer.jsx`. Tests: `src/__tests__/fledging.spec.js` (in the `npm test` list).
- BUILT spec §01 + §02 (economy + Flight Report), behind `VITE_GAM_FLIGHT_REPORT`
  (`?gam=flightReport` for QA): four-payout settlement in `src/mathEngine.js`
  (`summarizeFlight`, exposed on `src/engine/nativeEntry.js`), payout wiring in
  `src/MathExplorer.jsx` + `src/progressStore.js` (`starsEarned` with legacy fallback),
  new end card `src/engagement/FlightReport.jsx` (Apricot strip → itemised ledger,
  level-bar slot with the three states, "N in the Nest", first-week auto-expand via
  `firstFlightDay` in `src/engagement/engagementStore.js`), ranks renamed
  Fledgling/Flier/Skymaster in `src/engagement/ranks.js`, parent panel now says
  "Level n of 10" (`src/engagement/GrownUpsPanel.jsx`), badges no longer render on the
  new report (Rule 04), calm mode now suppresses end-card confetti. Tests:
  `src/__tests__/flightPayout.spec.js` (added to the `npm test` list).

### Auth, signup & onboarding — `Larkit Auth Onboarding.dc.html`
- NEW: three directions for login/signup/onboarding (iPad + web desktop): 1a The Perch
  (calm stepped wizard), 1b The Flock (teal-immersive, one screen), 1c The Aviary
  (conversational). **Direction not yet chosen — do not build.**
- NEW 2a "The Perch, flying" — the chosen merged direction: Perch layout and restraint,
  Flock taglines ("Little lark, big numbers", "they leave the nest…", "Give Maya the whole
  sky"), one full-bleed teal/Seafoam panel per screen, Sun reserved for the paid action,
  and the Aviary's two-card compare paywall redrawn in Perch type. Build against 2a.
- Screens covered per direction: value carousel, parent account (Apple/Google),
  add-a-kid (first name / age / grade), soft paywall with skip, returning profile picker.

### Gamification — stars, Meadow, flock — `Larkit Gamification.dc.html`
- NEW: three directions for the star economy and bird collection in context (kid iPad):
  1a Flight Report leads (itemised payout ledger + nomination note), 1b Meadow first
  (Meadow is home; report lands on it as a sheet; egg + Unveiling), 1c One goal bird
  (goal rail on home, Field Guide as store, owned card). **Direction not yet chosen —
  do not build.** Mechanics source: `uploads/bird-gamification-design.md`.
- NEW: Meadow page (turn 3, three directions, iPad landscape) — full-page scene with the
  Nest, egg, zone rail and tappable birds, plus a store mechanism and the Field Guide card
  on bird tap: 3a guide-as-drawer (owned + unowned in one tier-banded list, card as side
  sheet), 3b open-guidebook spread (scene left, 392px page right holding shelf/index/card),
  3c empty perches with price signs in the scene, card centred with the buy action.
  **3a chosen.**
- NEW: **`Larkit Gamification Spec.dc.html`** — the complete, finalized gamification design
  in 13 sections: six governing rules; the four-payout economy; the Flight Report in its
  three slot states; the fledging/nomination lifecycle; the Meadow scene; four zones with
  panning to a hedge frontier; perches and play spots; the Field Guide; Give a home; the
  behaviour-based rarity ladder; eggs and the six-beat hatching; the six-beat leaving and
  return; four seasons; the full 22-bird roster (8 common / 7 uncommon / 5 rare /
  2 legendary, 6 of them seasonal, with prices and signature moves; the Skylark is a
  starter and never bought); and the full three-tier motion spec. Supersedes the turn-by-turn
  files as the handoff artefact.
- NEW (turn 8) — revises turns 6-7: **birds are no longer tied to a zone.** Any bird can be
  bought at any time and takes a free perch in whatever zone the kid is viewing; zone labels
  are removed from the store cards, the store filters and the guide entry. **Every owned bird is present every day** — no chance, no roll, nothing to check back for;
  seasonal migrants (7d) are the only empty perch in the app. Rarity is expressed as
  **behaviour**: Common 15-25 "good company" (shared idle + play loops), Uncommon 40-60 "has
  a trick" (one bespoke signature move, 3-4 times a session), Rare 90-130 "puts on a show"
  (signature move + a tap response + a time-of-day variant), Legendary egg-only "one of a
  kind" (all of that plus a ~10s set piece the meadow stops to watch). Rare behaviour never
  demands attention — no badge, no notification, no "you missed it". Store cards name tier + signature move. The Field Guide entry is now strictly about the
  REAL species — Latin name, size, food, range, conservation, call — and carries nothing
  about the kid's own bird (no nickname, perch, tier, join date or hatched-by-you flag);
  names surface on the scene tap bubble and flock strip instead, and Rename remains only as
  an action in the entry's foot for hatched rarities.
  Hatched rarities keep a permanent Rename on their entry.
- NEW (turn 7) — revises turn 6: **panning is back within earned zones**. The earned zones
  sit side by side on one continuous horizon and drag 1:1 with the finger; the hedge is a
  hard wall at the frontier with a 120ms rubber-band and nothing rendered behind it. Zone
  chips now animate as a 600ms pan; unlock pans through the parting hedge instead of
  cross-fading (supersedes 6a's 160ms cross-fade — the no-access rule is unchanged).
  Adds: perch inventory (7b — 14 named perches per zone incl. branches, trunk hollow, reeds,
  nest box, fence posts, log, plus 4 play spots: shallows, feeder, bird bath, dust patch,
  each a 6-10s ambient loop, one bird at a time; a bird's saved slot is a named perch, and
  species pick perch types that suit them). Hatching ceremony in 6 beats (7c — egg waits at
  100%% warmth and never self-fires; rock/crack, chick at 0.6 scale with scene dimmed 30%%,
  naming, first flight to the Nest, new guide entry flagged hatched-by-you; ~9s watched, ~2s
  skipped, resumable). Leaving ceremony in 6 beats (7d — a week of restlessness, one gentle
  prompt with a real "later today", circle then V across the sky, perch stays empty and
  reserved with an "Away · back in spring" chip, arrival-style return next season, residents
  never leave; migrating birds still count toward unlocks). Ordinary birds now arrive with a
  preset name drawn from six curated names per species; only hatched rarities are named or
  renamed by the child.
- NEW (turn 6) — revises turn 5: **the widening clearing is dropped** (5b) and **no panning
  through a continuous landscape** (5d). Four fixed 1024x588 zone scenes; switching between
  earned zones is a 160ms cross-fade, not a pan. **Unearned zones cannot be entered, panned
  to, or previewed** — the world ends at a hedge with a sign ("The Pond · opens at 5 birds ·
  2 more to go") and the chip rail lists only places you can visit. Zone unlock is the sole
  scene change: sign swings 400ms → hedge parts 500ms → new scene cross-fades 600ms, once per
  zone. Adds: Field Guide (6b) — opened ONLY by tapping a bird; standard palette, distinguished by
  formatting alone: one subject per sheet entering from the right, 206px full-width plate,
  3px Ink rule under the name, facts as ruled label/value rows with mono labels, flat (no
  cards, no shadows, no grid, no prices). "Where she lives" is the species' REAL-WORLD range;
  the app zone is a separate teal line under the name. Renaming is removed from ordinary
  entries — naming is a rarity-only ceremony, kept for hatched eggs at the Unveiling.
  Deliberately unlike the store (6c), a Cream drawer pulled up from the bottom in the app's
  white-card language, whose cards name the zone for every bird including locked ones: two bands — affordable now / "20 away", single purchase screen with
  balance-after, arrival animation as the receipt), all four seasons (6d — Spring First Light,
  Summer Long Days, Autumn The Leaving, Winter Quiet Meadow; each = canopy+ground tint, one
  particle, one visitor; birds and UI never retint), and a full motion spec (6e — 22
  animations in three tiers with durations, easings and reduced-motion fallbacks).
- Superseded in part (turn 5): Meadow scene worked out on top of 3a — one continuous landscape that pans
  between zones (Meadow / Pond at 5 / Woods at 10 / Cliffs at 15) instead of swapping
  screens; the clearing starts ~55% width walled by grass and widens as the flock grows;
  placement bands (sky 0.7 / canopy 0.85 / mid 1.0 / foreground 1.15, min 96px apart,
  saved per bird, 7 visible per zone); ambient motion (clouds 26s, sway 6–9s, per-bird bob
  4–6s staggered) with a reduced-motion stop; night and season retints; tap sequence
  hop → call → card, scene pans so the tapped bird clears the 560px sheet.
  Scene art is a rough SVG sketch for composition only — illustrator brief in §5e notes.
- CHOSEN (turn 4) — build against this: end card = 2a Flight Report, Meadow = 3a
  (scene owns the page, Field Guide drawer, owned + unowned in one tier-banded list, card
  as a side sheet). The level bar's slot on the card carries three states: level read-out,
  Seafoam nomination note ("Ready for higher skies"), and the expanded four-line payout.
  Nomination path: set silently mid-flight → announced on the Flight Report → Sun
  "Ready to fledge" pill on the mode's Home card (§14 addition) → offered at next take-off
  → cleared by pass / rough flight / 3 failed attempts / glide down.
- Superseded, kept for reference: minimal-change set (turn 2, five options) that keeps §14 home and §12 perch as
  built: §11 end card becomes the Flight Report (payout shown as collapsed total / four-line
  ledger / chips / Fledging note / Meadow goal row) and the perch gains a fourth tab,
  **Meadow**, beside Home · Play · Worksheets. All five drop the "N stars to Level 3" label
  from the level bar — stars no longer buy levels. **Option not yet chosen.**
- Blocked on: bird roster art style guide (~22 species + Meadow scene); all art is
  placeholdered in the mockups.

### Game modes & naming — brand guide §13, §14 — `Larkit Brand.dc.html`
- RENAMED all game modes to one formula, [plain skill] + [alliterating bird word]:
  Addition Acorns, Subtraction Swoop, Multiplication Meadow, Division Dive,
  Fractions Feather, Counting Chicks, Comparison Crow, Time Tweet, Money Magpie,
  Shapes Shell, Measuring Wings, Place Value Perch. Bird words are capped at two
  syllables and limited to vocabulary a five-year-old already has. Retires Sum Perch / Countdown Coop / Times Tree / Split the Nest /
  Tell the Time / Weigh Station / Measure Up! everywhere, incl. in-game header (§13),
  flight-log headers (§15) and store copy.
- Home grid now shows all 12 modes, four tints cycling in reading order.
- Card icon spec: one Ink math glyph in the 38px cream well, Fredoka 600/20px — no bird art.
- Card subtitle is now scope ("Sums to 20"), not a restatement of the skill.

### Onboarding spec added — brand guide §20 — `Larkit Brand.dc.html`
- New section 20 "First flight — signup & onboarding" documents the approved 2a flow:
  five screens, Apple/Google only, first name + age + grade, soft paywall, profile picker.
- Voice rule: account flow is plain English; bird voice only on kid-facing screens and
  game names. Slogan is "Math that takes flight."
- Layout rule: one full-bleed teal panel per screen, standardised play cards (name +
  Sun level pill + figure + Fredoka prompt), Sun reserved for the paid action, web
  mirrors the app.

### Flight logs rebuilt — brand guide §15 — `Larkit Brand.dc.html`
- Sheet is now three fixed blocks (Part A stacked ×6, Part B inline ×4, Part C one thought
  problem) with captions — formats must not interleave.
- Stacked items: operands right-aligned in one digit column, single 1.5px rule, 34px clear
  answer space. Removes the second stray rule and the letter-spaced digits.
- Inline items: the bordered box IS the blank — no "?" and no printed answer.
- "Pick two numbers" prompts must print a number bank and a structured answer line.
- Generator fixes required: operands must obey level range (L1 = sums to 10); never fill the
  result slot; no duplicate items or repeated prompt wording; max one zero-fact per sheet.
- Removed all decorative colour glyphs (hearts, moons) — pure black only.
- Footer gains a "Landed ☐ of 11" score box; answer key is a separate sheet.

### Brand guide — `Larkit Brand.dc.html`
- Added a "Since the last push" strip under the header: orange `NEW · NOT YET PUSHED`
  badge convention + running list. Documentation only, nothing to implement.

---

## Shipped

### Pushed — 2026-08-02 (baseline)
Brand guide sections 01–19 as of the handoff: tokens, logo, type, grid, play area,
charts, math diagrams, comparison keys, the perch, feather icons, the aviary,
flight logs, nesting states, fledging, coin purse. Assets in `/brand`.
_Confirm this list matches what actually went live and edit if not._
