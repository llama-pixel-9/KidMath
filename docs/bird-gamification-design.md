# Bird Gamification Design — Stars, the Meadow, and the Flock

Status: **planning draft v1** — nothing here is committed; numbers are starting values for playtesting.
Owner: Sai · Drafted: 2026-08-03

This doc turns the star system into the heart of larkit's bird identity: kids earn stars by
flying accurate practice sessions, spend them giving real bird species a home in their Meadow,
and hatch the rarest birds from eggs. It also replaces the too-easy earning/leveling rules and
rebrands every existing engagement piece into one coherent bird world.

---

## 1. Decisions already made

- **Earning:** stars are paid once per *finished* session, weighted primarily on accuracy
  (no mid-session stars, no pay-per-answer).
- **Pace anchor:** a kid playing ~1 session/day should take **~2–3 weeks** to earn a
  legendary (endangered) bird. All prices derive from this.
- **Leveling:** promotion requires **cross-session consistency** — a hot streak nominates,
  a Fledging Flight confirms. No more multi-level jumps in one sitting.
- **Scope for v1 of the bird world:** the Meadow, Field Guide cards, egg hatching
  (legendary tier only), seasonal migrations, and a full rebrand of existing pieces.
  Companion birds, quests, and daily visitors are explicitly deferred.

## 2. Baseline (what the code does today)

- 1 star per first-try correct answer, any level (`session.firstTryCorrect`); ~10–15/session.
- Global wallet in `engagementStore` (`earnedStars − spentStars`); sink = emoji Sticker Book
  (10–100 ⭐). Daily goal = 10 ⭐. Local-day streak + best streak. 8 badges.
- Leveling (`mathEngine.recordAnswer`): +1 level on a 4-streak (fast, mastery ≥ .8) or
  7-streak (mastery ≥ .72), unlimited per session; −1 level on 2 mistakes at level.
- Brand already half-bird: lark mark, Feather icons, printable **Flight Logs**,
  "stars in the nest" copy, "You've fledged" level-up toast (§17).

Problems: volume pays the same as difficulty; a strong kid blitzes several levels in one
session; stickers are off-brand and shallow as a sink.

## 3. Design principles

1. **Kind by default.** No FOMO timers, no streak-shaming, no loss-framed copy. Seasonal
   birds *return* next year and the UI says so.
2. **Cosmetic only.** Birds and the Meadow never gate math content. Premium stays a separate
   axis. Stars are **earn-only** — never purchasable with money (Apple Kids / COPPA posture).
3. **Conservation framing.** Rare = "needs friends," acquiring = "giving a home." Never
   "endangered birds as luxury goods."
4. **Legible to a 6-year-old.** Every payout line on the end card says why in ≤ 4 words.
5. **Calm-mode faithful.** Reduced-motion/calm settings get static Meadow poses, no confetti;
   stars and birds themselves always stay.

## 4. Star economy v2 — the Flight Report

A session (15 questions) is a **Flight**. Stars are paid once, at the end card, now framed
as the **Flight Report**. Quitting mid-flight pays nothing (mistake-bank writes still happen).

### 4.1 Payout table

| Component | Rule | Stars |
|---|---|---|
| **Landing** | finished all 15 questions | 2 |
| **Precision** (dominant term) | 15/15 first-try | 12 |
| | 13–14 | 9 |
| | 11–12 | 7 |
| | 8–10 | 4 |
| | 5–7 | 2 |
| | 0–4 | 1 |
| **Altitude bonus** | band: Fledgling +0 · Flier +2 · Skymaster +4 | 0–4 |
| **Circle-back bonus** | +1 per mistake-bank problem cleared | max +2 |

- **Max flight:** 20 ⭐ (perfect, Skymaster, 2 reviews).
- **Typical solid flight** (12/15, Flier, 1 review): 2 + 7 + 2 + 1 = **12 ⭐**.
- **Rough flight** (6/15, Fledgling): 2 + 2 = **4 ⭐** — always something for finishing.

Expected daily flow for an engaged kid: **~10–14 ⭐** (one flight), ~20–25 with two.
Daily goal stays `DAILY_GOAL = 10` — its meaning shifts from "10 correct answers" to
"one accurate flight," which is exactly the behavior we want to anchor.

### 4.2 Why accuracy dominates

Precision spans 1–12 ⭐ while altitude spans only 0–4: a careful Fledgling out-earns a
sloppy Skymaster. Difficulty still matters (and prevents "park at level 1 forever"), but
the message a kid absorbs is *fly carefully, not just far*.

### 4.3 Anti-gaming notes

- Quit-and-restart to dodge a bad start: payout-on-landing makes this cost the whole flight;
  mistakes already made still enter the mistake bank. Accept the residual risk at this age.
- No daily payout cap — more math is always fine; the payout ceiling (20) self-limits farming.
- Replaying low levels is self-limiting: fledging (§5) keeps pulling the level to skill, and
  altitude bonus rewards staying there.

### 4.4 Bookkeeping changes

- Wallet: `earnedStars += flightPayout` at session end (replaces `+= firstTryCorrect`).
- Per-mode `lifetimeStars` in `progressStore` becomes misnamed — rename concept to
  per-mode **"correct answers"** for the Grown-Ups table, or store payout share per mode.
  Decide during implementation; parent-facing label should say what it counts.

## 5. Leveling v2 — Fledging Flights

Within-session auto-promotion is removed. Levels change only through deliberate,
celebrated moments.

### 5.1 Nomination

The current promotion signals become a **nomination** instead of an instant level-up:
during any flight, hitting streak ≥ 4 (fast, weakest-mastery ≥ .8) or streak ≥ 7
(mastery ≥ .72) sets a persisted `readyToFledge` flag for that mode. The end card teases:
*"The lark thinks you're ready for higher skies."*

### 5.2 The Fledging Flight

- While nominated, the next session start offers a **Fledging Flight**: a short challenge
  set of **6 questions at the current level**, drawn to include the kid's weakest subskills.
- **Pass = ≥ 5/6 first-try** → fledge immediately: level +1, full ceremony (lark on the
  Apricot disc, feather burst, Migration Map pin advances). Then the normal flight begins
  at the new level.
- **Miss** → kind copy ("Almost — a little more practice and you'll be soaring"), the
  normal session runs, nomination is kept. One attempt per session; no other cooldown.
- **Nomination removal — exactly four ways:**
  1. **Consumed:** the Fledging Flight is passed; the kid fledges.
  2. **Withdrawn by evidence:** a rough flight (< 40% precision) at that level clears the
     flag silently — the readiness signal is stale.
  3. **Withdrawn by attempts:** after **3 failed Fledging Flights**, the flag clears and
     must be re-earned via a new in-flight streak ("The lark wants to see one more great
     flight first"). Prevents a demoralizing fail-offer loop.
  4. **Invalidated:** any level change in that mode (gliding down) clears it.
  Otherwise it persists indefinitely — time away never costs a nomination (kind by default).
- **Hard cap: one fledge per mode per session.** Minimum realistic pace is one level per
  ~2 sessions, so the L3→L7 single-sitting rocket is gone.
- Fledging Flights pay no separate stars (the ceremony is the reward); the following
  normal flight pays as usual at the new altitude.

### 5.3 Gliding down (demotion)

Mid-session demotion (2 mistakes → −1 level) is removed as too twitchy next to the new
promotion gravity. Instead: a flight landing below 40% precision is marked a **rough
flight**; two *consecutive* rough flights at a level glide the kid down one level, framed
as "smoother skies for a bit." Mistake-bank behavior is unchanged.

### 5.4 Rank bands, rebranded

| Levels | Old rank | New rank | Migration Map landmark |
|---|---|---|---|
| 1–3 | Explorer 🧭 | **Fledgling** | The Nest |
| 4–6 | Adventurer ⛺ | **Flier** | The Ridge |
| 7–10 | Master 🏔️ | **Skymaster** | High Sky |

JourneyMap becomes the **Migration Map** — same 10-dot path, bird landmarks.

## 6. The Meadow

The Meadow replaces the Sticker Book as the tap-target behind the star chip: a single
illustrated scene where the collection *lives*.

- **Scene:** layered SVG/illustration — sky, tree, pond, grass. Light time-of-day tint from
  the device clock; seasonal dressing (§9). Calm/reduced-motion → static.
- **Perches:** owned birds occupy perch points with small idle loops (hop, peck, preen,
  occasional fly-across). Tap a bird → it sings (short real call) and its Field Guide card
  slides up.
- **Zones unlock with the flock** (gives collection size a visible payoff):
  Meadow (start) → **Pond** at 5 birds → **Woods** at 10 → **Cliffs** at 15 (where
  legendaries live). Zone unlocks are free — collection milestones, not purchases.
- **The Nest:** the star balance drawn literally — sun-diamond stars piled in a nest in
  the tree. Cashes the existing "stars in the nest" copy.
- **Incubation nest:** a visible spot where a purchased egg sits (§8).
- **Starter bird:** after the first-ever finished flight, the kid is *given* a
  **Horned Lark** — the brand bird, free, first resident. Instant attachment, empty-meadow
  problem solved.
- **One Meadow per kid.** Every kid profile has their own Meadow, flock, wallet, and egg —
  nothing is shared between siblings (see §11). Switching the active kid switches the
  entire bird world.
- **Brand guardrail:** collectible birds are a distinct art family (soft naturalistic-cartoon,
  full color) so the flat geometric teal LarkMark stays unmistakably *the logo*. The
  one-bird-per-surface brand rule applies to the mark, not the Meadow's residents.

## 7. Field Guide and the bird roster

The Field Guide is the collection book: one card per species, browsable from the Meadow.

**Card contents (owned):** cartoon portrait · real name + kid nickname · one "wow fact" ·
size compared to something a kid knows ("wings as wide as your arms!") · where it lives
(simple map blob) · what it eats · **its real call** (tap to play) · conservation note in
kid language. **Unowned:** the **full portrait is shown** — kids should see exactly the
bird they're saving for — along with name, cost, and one teaser fact. What ownership
unlocks: the bird living in the Meadow, its real call, and the rest of its facts.

**Conservation labels, kid-translated** (never scary): Thriving · Doing OK ·
Needs Friends · Very Rare. Legendary cards add one hopeful sentence about real recovery
efforts ("People are helping Whooping Cranes learn their migration — and it's working").

### 7.1 Tiers and pricing (derived from ~12 ⭐/day)

| Tier | Price | Days @ 1 flight/day | Examples (starter roster) |
|---|---|---|---|
| Starter | free | — | Horned Lark |
| **Common** | 15–25 ⭐ | 1–2 | Robin, Chickadee, Cardinal, Blue Jay, Mourning Dove, House Finch |
| **Uncommon** | 40–60 ⭐ | 3–5 | Barn Owl, Belted Kingfisher, Ruby-throated Hummingbird, Pileated Woodpecker, Atlantic Puffin |
| **Rare** | 90–120 ⭐ | 7–10 | Bald Eagle, Peregrine Falcon, Sandhill Crane, Painted Bunting, Roseate Spoonbill |
| **Legendary** (egg-only, §8) | 160–220 ⭐ + warmth | ~2–3 weeks total | Whooping Crane, California Condor, Kākāpō, Philippine Eagle |

Starter roster: **~22 species** (5–6 per tier + starter) to keep the initial art commission
sane; seasonal migrations (§9) add 4–5 per season thereafter.

## 8. Eggs and hatching (legendary tier only)

Buying a legendary doesn't hand over the bird — it places an **egg** in the incubation nest:

1. **Buy the egg** (e.g., Whooping Crane, 180 ⭐). It appears in the Meadow's incubation nest.
2. **Warm it by playing:** the egg needs **warmth = 40 ⭐ of *earned* stars** (earned after
   purchase, not spent — warmth accrues automatically from Flight Reports). At ~12/day
   that's ~3–4 more days.
3. **Visible progress:** the egg shows a warmth ring and cracks at 25/50/75%.
4. **The Unveiling** — since the Field Guide already shows every adult portrait, the
   ceremony reveals things the card never does, in three beats:
   - **Beat 1 — the hatch:** final crack, and out pops a **unique chick** — juvenile art
     that appears nowhere else in the app (a Kākāpō chick is a gray fluffball nothing like
     the card). It peeps its soft *baby* call, also unheard anywhere else.
   - **Beat 2 — the naming:** the kid gives their bird a name (tap-to-pick suggestions +
     free entry, so pre-readers aren't blocked). Store-bought birds come with preset
     nicknames; **a name you chose yourself is exclusive to hatched birds.**
   - **Beat 3 — first flight:** the chick nestles into the Meadow's nest and stays there
     **until the kid's next visit on a later day**, when it takes a short growing-up
     flight to the Cliffs as the full adult, its real call plays for the first time, and
     the Field Guide card gains the **"Hatched by [name's] flock"** ribbon. One reward
     becomes two sessions of arrival — and a reason to come back tomorrow that is pure
     anticipation, never punishment (the chick waits as long as it takes).

Rules: one egg incubating at a time; warmth carries no decay (a break never harms the egg —
kind by default). Total legendary journey: 180 ⭐ (~15 days) + 40 warmth (~3 days) ≈
**2.5 weeks**, matching the pace anchor. The mechanic exists to stretch the reward past the
purchase click and to make the rarest birds *arrive* rather than merely be bought.

## 9. Seasonal migrations

Each real-world season, a small **migrating flock** (4–5 species) is available in the store,
themed to the season (Snowy Owl and Dark-eyed Junco in winter; warblers in spring; etc.).

- Off-season cards stay visible in the Field Guide — full portrait, labeled kindly:
  *"Flies back in spring."* They **return every year** — stated explicitly in the UI.
  No countdown clocks anywhere.
- The Meadow dresses for the season (snow, blossoms, autumn leaves) — pure skin.
- Seasonal birds price into Common–Rare tiers only (legendaries are never seasonal —
  a 2–3-week goal must not expire).
- Optional later: one seasonal feather (§10) per season for N goal-met days.

This is the content drumbeat that keeps the store from exhausting: ~16–20 new birds/year
without inflating the permanent roster.

## 10. Rebrand glossary (existing pieces → bird world)

Every rename below applies to **kid-facing surfaces only** — parent-facing surfaces keep
plain language (§12).

| Today | Becomes | Notes |
|---|---|---|
| Session (15 q) | **Flight** | Pairs with printable Flight Logs |
| End card | **Flight Report** | Carries the payout table lines |
| Stars | Stars (unchanged) | Sun-diamond mark stays; they live "in the Nest" |
| Star wallet | **The Nest** | Drawn literally in the Meadow |
| Sticker Book | **Meadow + Field Guide** | Stickers → see migration note below |
| Daily goal | **Daily Flight** | Same `DAILY_GOAL = 10` |
| Day streak | **Migration streak** | Feather-bolt icon already exists |
| Level up | **Fledging** | Toast copy already says it (§17) |
| Ranks | **Fledgling / Flier / Skymaster** | §5.4 |
| JourneyMap | **Migration Map** | Same 10-dot path |
| Mistake-bank retry | **Circle-back** | Birds circle back; feeds the payout bonus |
| Badges | **Feathers** | Collected into a wing band; table below |

### Badges → Feathers

| Badge today | Feather | Earned by (unchanged) |
|---|---|---|
| First Steps | **First Flight** | first finished session |
| Perfect Round | **Clean Glide** | first perfect flight |
| On Fire (3-day) | **Three-Day Migration** | 3-day streak |
| Week Streak | **Great Migration** | 7-day streak |
| Star Collector | **Full Nest** | 100 stars all-time |
| Comeback Kid | **Homing Feather** | 5 circle-backs cleared |
| Word Detective | **Hawk Eye** | 5 trick-wording first-tries |
| Peak Climber | **Skymaster Feather** | reach the Skymaster band |

Each feather gets a distinct silhouette/color; the Field Guide gains a "Your Wing" page
showing the band. Emoji badges retire.

**Stickers:** removed outright when the Meadow ships — no migration, no keepsakes drawer.
The sticker store closes and owned stickers retire; wallet balances carry over untouched,
and the free starter lark ensures no kid opens an empty Meadow.

## 11. Data model sketch (planning-level)

```
engagement (per kid — see prerequisite below):
  earnedStars, spentStars          — unchanged wallet
  birds:   [{ id, day, hatched? }] — owned species
  egg:     { id, warmth, boughtDay } | null
  feathers: [...]                  — renamed badges list
  readyToFledge: { [mode]: { attempts } } — nomination flag + failed-attempt count
  roughFlights: { [mode]: count }  — glide-down counter
  (stickers field dropped entirely)
```

**Requirement (decided): one engagement state per kid.** `kidmath-engagement` is currently
one device-global localStorage key, but kid profiles exist (up to 4 per account) and birds
are attachment objects — siblings must never share a flock, wallet, Meadow, or egg. Scope
the whole engagement blob per kid (e.g., `kidmath-engagement:<kidId>`) **before** the bird
store ships. Details: an anonymous device (no profiles yet) uses one local state that
migrates to the first kid profile created; a second profile starts fresh; cloud sync can
follow the same pattern progressStore used so a kid's Meadow travels across devices.

## 12. Grown-Ups panel additions

**Hard rule: the bird language is kid-surface only.** Parents get plain, grade-level
vocabulary everywhere — the Grown-Ups panel, emails, receipts, App Store copy. Concretely:
"practice session" not flight, "Level 5 of 10" not Skymaster (rank names drop from the
parent table), "day streak" not migration, "review problems" not circle-backs,
"achievements" not feathers. The one bird thing parents *do* see is the collection itself,
stated factually: a stat tile for species collected (with count of rare/endangered ones)
and a footnote explaining the conservation-education framing — that's a selling point,
not a pun.

## 13. Build order (each phase shippable alone)

1. **Economy + Fledging** — Flight Report payout, nomination/Fledging Flight, glide-down.
   No art needed; interim: retune sticker prices to the new flow rate. Biggest fix ships first.
2. **Per-kid engagement scoping** — the §11 prerequisite.
3. **Store + Field Guide + Meadow v1** — ~22 species commissioned, static perches, Nest,
   starter lark, sticker book removed outright, rebrand copy pass (feathers, ranks, map —
   kid surfaces only, per §12).
4. **Eggs + hatching** — incubation nest, warmth, ceremony.
5. **Seasons** — first migrating flock + meadow dressing (target the nearest season flip).

## 14. Open questions

- Art pipeline: ~22 species + Meadow scene + feathers; one style guide before commissioning.
  (Distinct from the LarkMark geometry per §6.)
- Bird call audio: source and licensing (e.g., xeno-canto CC recordings — verify terms);
  captions for calls ("♪ cheerily-cheer-up!") for accessibility.
- Do Flight Logs (printables) get the kid's newest bird in the header? (Cheap, charming.)
- Exact per-mode stat shown to parents once `lifetimeStars` is renamed (§4.4).
- Whether nomination signals need retuning once auto-promotion is off (playtest).
- Payout numbers, prices, and warmth values are all playtest-tunable; the pace anchor
  (legendary ≈ 2–3 weeks) is the invariant to protect.
