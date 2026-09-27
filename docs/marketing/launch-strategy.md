# Larkit launch marketing strategy

Validation-first go-to-market for the larkit.io web + iOS retail launch.
Written 2026-09-14. Shareable version: the "Larkit Launch Playbook" artifact
in Claude.

Companion docs: [launch-tracker.md](./launch-tracker.md) (the checklist —
check items off there, not here) ·
[marketing-claude-code-workorders.md](./marketing-claude-code-workorders.md)
(the code items, as paste-able Claude Code sessions) ·
[../go-live-tracker.md](../go-live-tracker.md) (compliance punch list; it
gates everything below).

| | |
|---|---|
| Target launch | Late Oct 2026 (4–6 weeks from writing) |
| Buyer | Parents of K–5 kids (schools/districts come later) |
| Months 1–2 spend | ~$0 paid media — validate and adjust first |
| Ramp trigger | Three gates (§4, Phase 2), not a date |

---

## 1 · The thesis

Larkit enters a category with big, funded incumbents (Prodigy, SplashLearn,
IXL) and a long tail of small apps. Out-spending them is not an option and,
for the first two months, not the goal. The goal is to answer three
questions cheaply:

1. Do parents understand what Larkit is within ten seconds?
2. Do kids come back on their own?
3. Will parents pay after a card-less free trial that includes COPPA
   email-plus consent?

Every activity in this plan either answers one of those questions or costs
nothing to keep running while we wait for the answer.

**Rule for the first 60 days:** every marketing dollar is replaced by a
conversation. Ten parents we can call beat a thousand we can't. Paid
channels are pre-planned (§4, Phase 3) so the switch can be flipped in a
week once retention and trial conversion clear the gates.

## 2 · Positioning

Tagline stays: **Math that feels like play.** The work is deciding what
Larkit is *against*, because "fun math" is table stakes in the App Store.
Four distinctions that are true today:

**Practice in minutes, not quests in hours.** Prodigy is an RPG where math
gates the game; parents complain about 40 minutes of pets and coins for six
problems. Larkit sessions ("flights") are 15 questions, short by design.
→ *"Five minutes a day. Nothing to feed, nothing to buy."*

**A reward loop a parent can feel good about: the Meadow.** Kids earn stars
for *accurate* flights and spend them giving real bird species a home —
Robin to Bald Eagle to a Whooping Crane hatched from an egg over two days —
with a Field Guide, real bird calls, seasonal migrations and a conservation
frame. Stars are earn-only (never purchasable), birds never gate math, and
nothing decays. It is the "can I play tomorrow?" engine, and it is the part
of Larkit that other parents will share.
→ *"Earn real birds by doing math. Stars you can't buy."*

**Nothing to sell but the subscription.** Kids Category, no third-party ads
or analytics, no data sales. Competitors can say some of this; few say it
next to the price.
→ *"No ads. No data selling. One price, cancel any time."*

**A trail the parent can hold.** Printable flight logs and worksheets are
rare among game-first apps and answer the "is screen time real practice?"
worry. The paper is the proof.
→ *"Print the flight log. See exactly what they practiced."*

**One-liner:** Larkit is five-minute math practice for K–5 where kids earn
stars for accurate flights and give real birds a home in their Meadow —
with a printable flight log so you can see what they actually did. No ads,
no in-game store, stars you can't buy.

Don't headline "adaptive" — everyone claims it and parents can't verify it.
Show it in the flight log instead ("moved from 2-digit to 3-digit addition
on Oct 14"). Likewise don't headline "gamified" — show a hatch.

## 3 · Where Larkit sits

Effective consumer pricing clusters at roughly $4–10/month on annual plans.
Free incumbents (Khan Academy Kids, Prodigy's free game) set the floor.

| Product | Model | Effective price | Hook | Where Larkit differs |
|---|---|---|---|---|
| Prodigy Math | Free game + paid tiers | $4.91–$9.91/mo (annual) | Fantasy RPG, pets, quests | Long sessions; heavy currency upsell |
| SplashLearn | 7-day trial → paid; free for teachers | from $7.49/mo (annual) | 4,400+ games, Math + English | Card required at trial; breadth over focus |
| IXL Math | Subscription | $9.95/mo | Skill drills, diagnostics | Worksheet-on-a-screen; not playful |
| DoodleMath | Subscription | $7.92–$10.99/mo | Adaptive K–5, short daily | Closest positioning; less game-like |
| Todo Math | Subscription | ~$4/mo | PreK–2, Common Core | Younger ceiling |
| Khan Academy Kids | Free (nonprofit) | $0 | Broad early learning | The "why pay?" objection to answer |
| **Larkit** | $0 trial (no card) → subscription | TBD (§7) | 5-min flights, the Meadow (earn real birds, hatch eggs), printable flight logs | Short, ad-free, earn-only rewards, paper proof of progress |

Prices are from third-party 2026 pricing guides (sources at the bottom) and
vary by region/channel — verify before quoting publicly.

### Constraints that shape the plan

- **Kids Category: no third-party ads or analytics SDKs in the app** (App
  Review 1.3). No Meta/TikTok pixel, no Adjust/AppsFlyer. Measurement is
  first-party: our own events in Supabase + App Store Connect analytics.
  Paid iOS attribution will be coarse (Apple Search Ads / SKAdNetwork only).
- **COPPA email-plus consent adds a step before the kid can play.** The
  consent email is the riskiest funnel point. "Consent sent → confirmed" is
  a first-class metric from day one, with plain-language copy in the UI.
- **Apple Developer enrollment not yet resolved** (trademark hold). Web
  launches on its own; iOS joins when approved and becomes a second wave.
  Never announce "now on the App Store" until the build is live.
- **Solo operator.** Sized for a few hours a week. Nothing that needs daily
  posting; everything that compounds (search, listing, referral).

## 4 · Phases

Order carries meaning: each phase has an exit condition, and Phase 3 does
not start on a date.

### Phase 0 · Runway (now → launch, 4–6 weeks)
**Goal: waitlist of 100+ parents and a listing that converts before any announcement.**

- Landing page that does one job: 20-second playable demo (no signup) above
  the fold that ends with a bird landing in the Meadow, the one-liner, three
  real screenshots (Meadow, a flight, a flight log), one CTA ("Get early
  access" now → "Start free" at launch). Pricing page live even
  before pricing is final, with the no-ads line next to the price.
- App Store listing for parents scanning at 11pm. Title
  `Larkit: Math Games for Kids K–5`; subtitle/keywords: addition,
  subtraction, multiplication, math practice, kindergarten, 1st/2nd/3rd
  grade, homeschool. Screenshot 1 = the Meadow mid-hatch or a bird
  landing; screenshot 2 = a flight; screenshot 3 = printed flight log;
  screenshot 4 = the Field Guide card with "tap to hear its call". App Privacy label filled carefully — parents read it.
- Ten founding families (own network, kid's school, a local homeschool
  co-op). Free lifetime access for a 20-min call in week 1 and week 4
  post-launch. Their quotes become launch social proof.
- Instrument the funnel: landing visit → demo played → account created →
  consent sent → consent confirmed → 1st session → 3rd session → D7 return →
  trial ended → paid. That is the whole dashboard.
- Seed the worksheet library: 15–20 indexable pages ("Free printable
  2-digit addition worksheets, grade 2"), each ending with "or practice the
  same skill in the game". Evergreen parent search; takes months to rank,
  so it starts now.
- Brand + press kit at /press: logos, two-sentence description, founder
  story (engineer parent who built it for their own kid), five screenshots,
  a 20-second Hatch Day clip and a 30-second gameplay clip.
- Support + review loops: help@ inbox with same-day promise; in-app rating
  prompt only after a kid's 5th session and never mid-play; one-question
  end-of-trial survey ("What almost stopped you from subscribing?").

### Phase 1 · Soft launch (launch week)
**Goal: 150–300 families in; no funnel step with >30% drop-off.**

Launch in waves. Day 1: waitlist + founding families. Days 2–3: personal
network, kid's class parent group, PTA newsletters, library/rec-center
boards (QR flyer with a free-month code). Days 4–5: two or three homeschool
and parenting communities where we've already been participating. Hold
Product Hunt, big subreddits and press for Phase 3.

Watch the funnel hourly for 48h. Likely failures: consent email in spam,
demo not loading on older iPads, parents not understanding what happens
after the trial. Fix, redeploy, keep going.

Send every new parent a plain-text welcome email, personally written, with
one question: "What made you try Larkit?" The replies are messaging
research.

### Phase 2 · Validate (months 1–2)
**Goal: pass the three ramp gates with real numbers.**

Weekly rhythm — Mon: read the dashboard and survey replies. Tue–Thu: three
parent calls (founding families first, then churned). Fri: ship the one
change that addresses the most repeated complaint, and email the people who
raised it. That email is the cheapest retention tool we have.

Two free experiments: a referral loop ("give a friend a month, get a month")
surfaced after a kid's 10th star; and a pricing-page test between
monthly-first and annual-first presentation, measured on trial→paid.

Keep organic warm: the weekly social batch in §6 (a Meadow clip, a Bird of
the Week, one tip), two worksheet pages a week, reply to every review and
comment within a day. Nothing else.

**Ramp gates — all three must hold for two consecutive weeks:**

| Gate | Target |
|---|---|
| Retention | ≥35% of kids who complete a first session play on day 7; ≥20% on day 30 |
| Conversion | ≥8% of trials that reached 3 sessions convert to paid (card-less kids' trials typically 5–10%; <5% means price, value message, or consent step is broken) |
| Message fit | Majority of parents on calls describe Larkit unprompted in our terms ("short", "no ads", "I can see what she did"). "Like Prodigy but smaller" = positioning hasn't landed; paid spend would amplify confusion |

Targets are starting assumptions; replace with our own baseline after the
first 200 families.

### Phase 3 · Ramp (month 3+, gated)
**Goal: one paid channel with payback under 6 months before adding a second.**

| Rung | Spend | What turns on |
|---|---|---|
| 0 (now) | $0 | Organic: search, communities, referral, founding families, listing |
| 1 | <$1k/mo | Apple Search Ads on exact-match terms; gift the app to 5–8 micro-creator parents (5–30k followers), no paid placement; Product Hunt; pitch 3 parent newsletters |
| 2 | $1–5k/mo | Scale converting Search Ads terms; paid placements with the 2 creators whose gifted posts drove signups; Meta ads to parents landing on web (never from inside the app); PR to parenting/edtech press |
| 3 | $5k+/mo | Creator program with codes + rev share; YouTube pre-roll on kids' educational channels; teacher free tier as the bridge into the school phase |

Move up a rung only when cost per paid subscriber is below ~⅓ of expected
first-year revenue per subscriber. Move down after two consecutive misses.

## 5 · Channels, ranked for a solo founder at $0

| Channel | Why it fits | Effort | Time to signal | Rules |
|---|---|---|---|---|
| Printable worksheet SEO | We already generate worksheets; "free printable ___ worksheets" is huge, evergreen, and exactly our parent | Medium up front, then low | 3–6 months | One page per skill × grade; genuinely useful PDF; game CTA at the bottom, never a gate |
| App Store listing (ASO) | Parents search the store directly; Kids Category browse is real discovery | Low | 2–4 weeks | Iterate screenshots/subtitle monthly on impressions→downloads |
| Founding families / word of mouth | Parents trust parents over ads | Low, high touch | Immediate | Ask for referrals only after a kid has a streak |
| Homeschool communities | Actively shop for math practice, buy annual, print things | Medium | Weeks | Participate 2 weeks before mentioning Larkit; only reply to "what do you use?" threads |
| Local: school, PTA, library, co-op | Concentrated K–5 parents; a QR flyer with a free-month code is cheap and unusual | Low | Days | Ask PTA for a newsletter line; offer a free classroom demo |
| Micro-creator parents (gifted) | Authentic, cheap, reusable clips | Medium | Weeks | Rung 1; no pay until a gifted post shows signups via a code |
| Product Hunt / indie channels | A day of attention + backlinks; audience is founders not parents | Medium | One day | Rung 1, after polish; treat as PR |
| Parenting & edtech press | "Best math apps" roundups drive durable traffic | Medium | Months | Pitch founder story + a Phase 2 stat; ask into existing roundups |
| Social media & outreach | Detail in §6 — the Meadow is the hook; Instagram home base, Shorts/TikTok for clips, Pinterest for cards and printables; groups and newsletters for outreach | Medium, weekly batch | Weeks–months | See §6 ground rules and post recipes |
| Paid social / search | Scalable but only measurable on web | High | Weeks | Rung 2+; always land on larkit.io with first-party events |

## 6 · Online presence: social media and outreach

The channel table in §5 says *where* parents are; this section says what
Larkit posts, on which platforms, how each post is made, and how a
following gets built from zero by one person in a few hours a week. The
posture matches the rest of the plan: during Phase 0–2 social is for
learning and warming organic, not scale. The numbers that matter are
replies, saves, and demo plays, not follower counts.

**The product on social is the app, and the face of the app is the
Meadow.** Worksheets are one supporting pillar (they earn saves and
search traffic), not the story. The story is a kid flying accurate math
"flights", earning stars, and giving real birds a home.

### The Meadow is the hook — lead with it

Every other kids' math app has a game loop; Larkit's is unusually easy to
show in ten seconds and unusually easy for a parent to feel good about.
The parts that film well and the line each one earns:

| Mechanic | What the camera sees | What the parent hears |
|---|---|---|
| **Flights and the Flight Report** | 15 questions, an end card that pays stars mostly for accuracy | "Fly carefully, not just far — a careful kid out-earns a fast one" |
| **The Nest** | Stars literally piling up in a nest in the tree | "Every star is a finished, accurate session — you can see the practice" |
| **Give a Home** | Tapping a Robin, Barn Owl or Bald Eagle and watching it land on a perch in the Meadow | "Kids earn birds. They can't buy them. Nothing to feed, nothing to lose" |
| **Field Guide + real calls** | Tap a bird → it sings its actual call, card slides up with a wow fact | "They walk away knowing what a Kingfisher sounds like" |
| **Zones unlocking** | Pond at 5 birds, Woods at 10, Cliffs at 15 | "The Meadow grows with the flock — a visible reason to keep going" |
| **Eggs and the Unveiling** | Egg in the nest, warmth ring, crack at 25/50/75%, a unique chick, the kid names it, next-day first flight | "The rarest birds arrive over two days. That's the 'can I play tomorrow?' moment" |
| **Fledging Flights** | Six questions, feather burst, Migration Map pin advances | "Levelling up is a ceremony, not a surprise — and it's earned across days" |
| **Seasonal migrations** | Snow in the Meadow, a Snowy Owl in the store | "New birds every season, and they come back next year — no countdowns" |
| **Conservation framing** | "Needs friends", "People are helping Whooping Cranes — and it's working" | "The reward system teaches something true about the world" |
| **The Horned Lark** | The free first resident after the first flight | "Everyone starts with a friend in the Meadow" |

Three of these become the brand's recurring formats: **Bird of the Week**
(Field Guide card + call + the math it costs), **Hatch Day** (an Unveiling
clip, always the top-performing type), and **Meadow Tour** (one kid's
Meadow at 5, 10, 15 birds).

### Who is on the other side

The person scrolling is a parent of a 5–10 year old, usually on a phone,
usually late evening. She is not looking for a math app; she is looking
for reassurance that her kid is okay at math, an idea for tomorrow, or
something her kid will actually *want* to do. The Meadow answers the third
one directly — and it is the one competitors' posts don't answer.

### Ground rules (non-negotiable)

- **No children's faces except your own kid, and only as a deliberate
  decision.** Founding families' kids never appear. Hands on an iPad,
  over-the-shoulder, and screen recordings carry the message.
- **No kid data in content.** All recordings come from a demo profile
  ("Sky", with a curated flock). Never a real Meadow or flight log.
- **No claims we can't show.** "Adaptive", "research-backed" stay out of
  captions unless the post shows the thing. Show the Fledging Flight.
- **The founder is the voice.** Brand account, first-person captions from
  a parent-engineer who built this for their own kid.
- **Stars are earn-only and birds never gate math.** Say it often; it is
  the single fact that separates Larkit from Prodigy in a parent's head.
- **Reply to everything within a day.** Early on, replies *are* growth.

### Content pillars

Five pillars; weekly mix roughly **3 : 2 : 1 : 1 : 1** in the order
below. The Meadow leads.

| Pillar | What it is | Why it works | Example posts |
|---|---|---|---|
| **Meadow moments** (the app) | 10–25s screen recordings of one satisfying beat: a bird landing, a call, a hatch, a zone unlocking, a Flight Report | Shows the product without a pitch; every beat is inherently clippable; parents share what their kid would love | "Sound on: the Barn Owl just moved in" · "Hatch Day 🥚 Kākāpō edition" · "What 15 birds unlocks" · "A perfect flight pays 12 stars. Here's why accuracy wins" |
| **Math confidence tips** | 20–40s: one thing parents get wrong or don't know, ending on how Larkit handles it | Builds trust; parents follow for the next one; every tip ends inside the app | "Why 'count on from the bigger number' beats counting from 1 (this is what Flier level practices)" · "The subtraction mistake every 2nd grader makes" |
| **Build-in-public** | Founder behind the scenes: a design choice, a bug, a kid's reaction | Humanizes the brand; the origin story is the launch post; indie makers reshare | "Why stars can't be bought with money" · "My 7-year-old rejected three bubble buttons" · "What a Kids Category app isn't allowed to do (and why that's good for you)" |
| **Parent voices** | A quote from a call or review (with permission); a poll; a question | Social proof and the cheapest research channel we have | "'She asked if the egg hatched yet' — founding family, week 2" · Poll: "Bird your kid would pick: Puffin or Peregrine?" |
| **Printables** | One worksheet or flight-log page a week, framed as "the paper version of this week's flight" | Highest save rate; feeds worksheet SEO; Pinterest lives on it — but it is the on-ramp, not the product | "Free 2-digit addition sheet — same skill Sky flew today" |

Every post has one job; text on screen is readable without sound; the
caption's first line is the whole message; the link goes to
larkit.io/start or the demo, never straight to a paywall.

### Post recipes — how to actually make them

Each recipe is one post type, repeatable weekly. Shot lists assume
QuickTime/iOS screen recording of the demo profile plus a phone.

**1. Hatch Day** (Reel/Short/TikTok, 15–20s) — *the flagship format*
- Hook (0–2s, text on screen): "Day 3 of warming the egg…"
- Shots: egg in the incubation nest with warmth ring at 75% (2s) → final
  crack (2s) → chick pops out, peeps (3s) → name picker, kid picks a name
  (3s) → cut to "next day": chick's first flight to the Cliffs, adult call
  plays (5s) → card with "Hatched by Sky's flock" ribbon (2s).
- Caption: "The rarest birds in Larkit can't be bought. You earn the egg
  with stars, warm it by playing, and it hatches over two days. This is
  the 'can I do math tomorrow?' moment. 🐣" + link.
- CTA: "Which bird should Sky hatch next?" (comment bait that's real
  research).

**2. Bird of the Week** (carousel, 5 slides; also a Pin)
- Slide 1: portrait + "Bird of the Week: Belted Kingfisher" + tier ("Needs
  friends · 50 stars").
- Slide 2: the wow fact from the Field Guide card.
- Slide 3: "How to earn it: about 4 accurate flights" with a Flight Report
  screenshot.
- Slide 4: the math a Flier-level kid practices to get there (one example
  problem).
- Slide 5: "Tap a bird in the Meadow and it sings. Sound on 🔊" → link.
- Caption: first line = the wow fact. Ask: "Has your kid ever heard one?"

**3. Meadow Tour** (Reel, 20–25s, sound on)
- Hook: "What 15 birds looks like."
- Shots: slow pan Meadow → Pond → Woods → Cliffs; tap two birds for calls;
  end on the Nest with the star pile.
- Caption: "Zones unlock with the flock — Pond at 5 birds, Woods at 10,
  Cliffs at 15. None of it gates the math, none of it costs money. Every
  bird here is a finished, accurate session."

**4. The Flight Report** (Reel, 12–15s)
- Hook: "Why a careful kid out-earns a fast one."
- Shots: last 3 questions of a flight → Flight Report: Landing 2 ·
  Precision 9 · Altitude +2 · Circle-back +1 = 14 ⭐, each line appearing.
- Caption: "Stars are paid once, at the end, mostly for accuracy. 15/15
  first-try pays 12. Blitzing through pays 1. That's the whole design."

**5. Sound On** (Reel/Short, 8–10s; the cheapest post there is)
- One bird, one tap, one real call, its name. That's it. Rotate species.
- Caption: "This is what a Pileated Woodpecker sounds like. Kids learn it
  by earning it. 🔊" Works as a series; batch five in ten minutes.

**6. Fledging Flight** (Reel, 15s)
- Hook: "Levelling up in Larkit is a ceremony."
- Shots: "The lark thinks you're ready" tease → 6-question Fledging
  Flight → pass → feather burst → Migration Map pin moves to The Ridge.
- Caption: "No surprise level jumps. A hot streak nominates, a short
  flight on a later day confirms. Kids feel it."

**7. Confidence Tip** (talking-head or voiceover Reel, 30–40s)
- Structure: the mistake (5s) → why it happens (10s) → the 30-second fix
  at home (15s) → "this is what [mode] practices" with a 3s clip (5s).
- Ten to start: number bonds to 10 · count on from the bigger number ·
  regrouping isn't "borrowing" · skip-counting before multiplication ·
  the equals sign isn't "the answer comes next" · place value discs ·
  reading a clock in fives · fair-share fractions · subtract by adding up
  · why timed tests backfire.

**8. Build-in-public** (text-first post or 30s to-camera)
- Prompts to draw from: why there are no coins · why stars can't be bought
  · what the Kids Category forbids · how the payout table was tuned · the
  three rejected bubble buttons · picking the 22-bird starter roster ·
  why legendaries are never seasonal · what the flight log is for.
- Caption ends with a question to the audience, never a pitch.

**9. Parent Voice** (quote card or Story)
- One sentence from a call, first name or initial with permission, plus
  the bird or mode it was about. Weekly from Phase 2.

**10. The paper version** (carousel + Pin)
- Slide 1: the worksheet as an image; slide 2: "Same skill Sky flew this
  week" with a 3s Meadow clip or screenshot; slide 3: link to the PDF page.
- The PDF page's bottom CTA is the game — the worksheet is the on-ramp.

Caption formula for all of them: **first line is the message → one
sentence of why → one honest product fact (earn-only stars / no ads /
never gates math) → one question or one link.** Five to eight specific
hashtags (#kindergartenmath #2ndgrademath #homeschoolmath #mathgames
#kidsapps #birdsofinstagram for the Meadow posts), never thirty.

### Platforms, in priority order

Two platforms done well beat five done badly. Instagram is home base;
YouTube Shorts and TikTok are where Meadow clips travel; Pinterest is
where the printables and Bird of the Week cards compound.

| Platform | Role | Format | Cadence (Phase 0–2) | Notes |
|---|---|---|---|---|
| **Instagram** | Home base: the Meadow clips, the founder voice, where parents follow | Reels (Hatch Day, Sound On, Meadow Tour, Flight Report, tips), carousels (Bird of the Week, paper version), Stories (polls, replies) | 3–4 posts/week + Stories most days | Bio link → larkit.io/start. Pin Hatch Day, the origin story, and a Meadow Tour to the top of the grid |
| **YouTube Shorts + a few long** | Where "math game for kids" and "how to help my kid with subtraction" get searched; Meadow clips find new parents here | Shorts = the Reels; long: "Larkit in 4 minutes", "How the Meadow works", "A week of flights", one per grade | Shorts as they exist; 1 long/month | Long videos become the demo for press and creators; embed on /pricing and /press |
| **TikTok** | Highest raw reach for satisfying game loops; parent audience is real if smaller than IG's | Native re-cuts of Hatch Day and Sound On with on-screen captions | 2/week, re-cut not re-uploaded | Promote to full effort at Rung 1 if two clips pass 10k views |
| **Pinterest** | Discovery engine that behaves like search; pins work for months | Bird of the Week cards, worksheet pins, tip carousels; boards by grade and by "Birds in the Meadow" | 5–10 pins/week, batched monthly | The worksheet SEO pages and /meadow are the landing pages; claim the site, enable Rich Pins |
| **Facebook** | Where homeschool and local parent groups live; the Page exists so groups can find one | Cross-post from IG; Groups are the work | Page mirrors IG; Groups: participate daily-ish, promote never | Most groups ban promo posts but allow answering "what do you use for math?" — a Meadow clip in a DM converts better than a link |
| **Reddit** | Research and rare, honest replies — not a posting channel | r/homeschool, r/Parenting, r/kindergarten, r/elementaryteachers | Read weekly; reply when asked | Self-promo gets removed; "I built one, happy to share" when asked does not |
| **X / Threads / LinkedIn** | Build-in-public and indie-maker audience; Product Hunt support later | Short founder posts, screenshots of the payout table, the Meadow | 1–2/week | Reach is founders not parents; useful for Rung 1, not signups |

Skip for now: Snapchat, Discord, a newsletter platform beyond the welcome
email (a "Sunday flight" email with the Bird of the Week and one printable
starts in Phase 2 once there are 200 addresses).

### Cadence a solo founder can keep

One two-hour batch a week, same day: record one Hatch Day or Meadow Tour,
three Sound On clips, one Flight Report or Fledging Flight, one Confidence
Tip; build one Bird of the Week carousel and one paper-version carousel
from templates; cut pins from the same assets; write one build-in-public
post. Stories are ad hoc from the phone. Schedule with Meta Business Suite
(IG + FB) and Pinterest's native scheduler; re-cut two clips for TikTok.

If the batch doesn't happen one week, post nothing rather than something
thin. Consistency matters over months, not days.

### Four-week launch content calendar

| Week | Mon | Wed | Fri | Sat/Sun | Stories |
|---|---|---|---|---|---|
| **L−2** | Origin story Reel ("why there are no coins") | Sound On: Horned Lark | Bird of the Week: Robin (carousel + Pin) | Paper version (Pin) | Follow/comment sprint; "what's your kid's sticking point?" poll |
| **L−1** | Meadow Tour (5 birds) | Confidence Tip #1 | Flight Report Reel | Bird of the Week: Chickadee | Countdown, waitlist link, demo profile naming poll ("Sky"?) |
| **Launch** | "It's live" — Hatch Day Reel, pinned | Build-in-public: the payout table | Sound On ×2 (Kingfisher, Barn Owl) | Bird of the Week: Barn Owl | Founding-family Story shares (asked once); reply to everything |
| **L+1** | Meadow Tour (10 birds — Woods unlock) | Confidence Tip #2 | Fledging Flight Reel | Parent Voice #1 + paper version | First DMs → next week's tip; "which bird next?" poll |

Weeks 5–8 repeat the pattern with a Hatch Day every other week, a new
Bird of the Week weekly, and the first seasonal migration post when the
season turns.

### Growing a following from zero

- **Seed with two posts, not one.** The origin story ("I'm an engineer, I
  built a math game for my kid, here's why there are no coins in it") and
  the first Hatch Day. Pin both. One earns the trust, the other earns the
  share.
- **Follow and comment before posting.** Two weeks before launch, follow
  50 accounts (homeschool parents, K–2 teachers, "math at home" creators,
  *and* bird and nature accounts — the Meadow gives Larkit a second
  audience no math app has). Leave real comments daily.
- **Make the Meadow the share.** "Send this to a kid who loves birds"
  and "send this to a parent whose kid is starting 2nd grade" both work;
  generic "share if useful" doesn't.
- **Let birds carry the series.** Bird of the Week is a reason to follow
  that renews every week for 22 weeks before any repeat, and seasonal
  migrations add more.
- **Turn replies into posts.** Every question in a DM or comment becomes
  next week's tip or the next bird.
- **Collaborate before you pay.** Instagram Collab posts with three to
  five small accounts (2–20k) — printables accounts *and* kid-friendly
  bird or nature accounts: a free family plan and a co-authored post;
  Larkit gets their audience once. The free version of Rung 1.
- **Founding families as first amplifiers.** Ask each of the ten, once,
  for a Story share on launch day and a review after week 4. Never more.

### Outreach beyond social

- **Facebook and local groups.** Join 5–8: two or three large homeschool
  groups, the local parents group, the school's class or PTA group, a
  co-op. Participate two weeks with no mention of Larkit. Then answer
  "what do you use for math practice?" threads honestly and briefly;
  offer a free-month code and a 15-second Meadow clip in DMs, not in the
  thread. Once a month, where rules allow, post a free printable with no
  link and let people ask.
- **Parent newsletters and blogs.** List of 15 (local parenting
  newsletters, homeschool bloggers, "best math apps" roundups). Pitch
  three per week in Phase 2: founder story, the one-liner, a Hatch Day
  clip, a free family plan for the writer, a funnel stat once there is
  one. Ask to be *added* to existing roundups before asking for a feature.
- **Bird and nature organizations.** The conservation framing is real
  and the birds are real species: a local Audubon chapter newsletter, a
  nature center, a children's librarian running a bird-themed story time.
  Offer a free classroom/family plan and a printable Field Guide page.
  No other math app can knock on this door.
- **Teachers, quietly.** A free classroom plan for any K–3 teacher who
  asks. They share printables and, more valuably, they let a class watch a
  hatch. Seed of the school phase; costs nothing.
- **Boards and reviews.** The QR flyer goes to pediatric waiting rooms,
  indoor play spaces, and the children's library, with "earn real birds by
  doing math" rather than "download our app". Ask for App Store and web
  reviews at the moments the plan already defines (5th session, week 4)
  and reply to every one.
- **Product Hunt, paid creators, press** stay in Rung 1 (§4, Phase 3) —
  the groundwork above is what makes them work when their turn comes.

### What to measure on social (Phase 0–2)

| Metric | Why | Target by week 8 |
|---|---|---|
| Demo plays from social (larkit.io/start → demo) | The only social number that ties straight to the funnel | ≥ 25% of demo plays |
| Hatch Day / Meadow clip completion rate | Whether the hook is landing | ≥ 40% watched to end |
| Saves per Bird of the Week + printable post | Signals format fit before followers exist | ≥ 5% of reach |
| Replies + DMs per week | Research channel and early retention | ≥ 10/week, all answered |
| Followers (IG) | A floor for creator collabs, not a goal | 500 |
| Groups active ≥ 2 weeks | Unlocks honest outreach | 5 |
| Collab posts published | Free version of Rung 1 | 3 |

Social metrics live in the tracker's Metrics table; the funnel metrics in
§8 remain the ones that decide the gates.

## 7 · Pricing hypothesis (to test in Phase 2, not locked)

| Plan | Price | Notes |
|---|---|---|
| Monthly | $6.99/mo | Below Prodigy monthly and SplashLearn headline; "no coins, no store" explains why there are no tiers |
| Annual | $49/yr (~$4.08/mo) | Present as default; ~40% saving, in line with category 37–50% |
| Family | included | Up to 4 kid profiles on one subscription; competitors charge per child or cap at 3 |
| Founding families | $0 for life | The ten Phase 0 families; plus first 100 paying subscribers lock a $39/yr founding rate forever — gives the soft launch a reason to act now |
| Trial | $0, no card, 14 days | Long enough for a D7 return and a printed flight log on the fridge |

iOS subscriptions go through StoreKit (15% under the Small Business
Program); web through Stripe. Nudge toward web where legal; never mention
external pricing inside the app without Apple's external-link entitlement.

## 8 · What to measure

One north star and a short funnel. Anything else is a distraction until
Phase 3. All in-app measurement stays first-party (Kids Category). On
larkit.io a cookieless analytics tool is fine; no ad pixels until Phase 3,
and then only on the marketing site.

| Metric | Definition | Phase 2 target | Source |
|---|---|---|---|
| **North star: active learners** | Kids with ≥3 completed sessions in the last 7 days | Grows week over week | Supabase events |
| Landing → demo played | Visitors who start the no-signup demo | ≥25% | First-party web analytics |
| Demo → account | Demo players who create a parent account | ≥15% | Supabase |
| Consent sent → confirmed | COPPA email-plus completion within 24h | ≥80% | Supabase |
| Account → 3rd session | Activation | ≥50% | Supabase |
| D7 / D30 kid retention | Played on day 7 / 30 after first session | ≥35% / ≥20% | Supabase |
| Trial → paid | Of trials that reached activation | ≥8% | Stripe + App Store Connect |
| Store impressions → downloads | Listing conversion | ≥30% | App Store Connect |
| Referral share | New accounts from referral codes | ≥10% by week 8 | Supabase |

## 9 · Eight-week calendar

Assumes launch at the start of week 3. If Apple enrollment slips, weeks 3–8
run on web alone and iOS becomes a second announcement.

| Week | Phase | Focus |
|---|---|---|
| 1 | Runway | Landing page with playable demo + waitlist. Event instrumentation. Recruit 10 founding families. Draft App Store listing. |
| 2 | Runway | First 15 worksheet pages. Press kit. Pricing page. Consent-email deliverability test (Gmail, iCloud, Outlook). Welcome email written. |
| 3 | Launch | Waitlist + founding families day 1; network/local days 2–3; communities days 4–5. Hourly funnel watch 48h. Fix and redeploy. |
| 4 | Validate | First founding-family calls. Ship the top complaint fix. Turn on rating prompt. Two worksheet pages. |
| 5 | Validate | Launch referral. Reply to every review. First churned-parent calls. Two worksheet pages. |
| 6 | Validate | Pricing-page presentation test begins. Second wave: any community skipped. First parent quotes on the site. |
| 7 | Validate | Second founding-family calls. Read gates for the first time. Draft PH + creator outreach for Rung 1 (don't send). |
| 8 | Decide | Gate review. Pass → Rung 1 begins week 9. Miss → another 4-week cycle on the failing gate. Either way, write up what parents said. |

## 10 · Risks

| Risk | Likelihood | Mitigation built in |
|---|---|---|
| iOS not approved by launch week | Medium | Web-first; iOS is a second wave |
| Consent email friction kills activation | Medium–high | Deliverability test week 2; consent completion is top-line; plain-language UI copy |
| "Why pay when Khan Kids is free?" | High | Lead with short sessions, flight logs, no ads; founding rate creates urgency; answer it on the pricing page |
| Kids play once and don't return | Medium | D7 gate blocks spend; weekly ship cadence on top complaint; the Meadow (eggs that hatch tomorrow, zones that unlock, seasonal birds) is the designed reason to return, and the launch content shows it |
| Community backlash for self-promo | Medium | Two-week participation rule; only reply to explicit "what do you use?" threads |
| Name confusion (Lark IT, Lark app) | Low–medium | Always "Larkit math" in listings/search; own the branded query with a clear site title |
| Founder time | High | Sized for a few hours a week; everything compounds without daily posting |

## Sources

- larkit.io (current positioning and features)
- Brighterly, "Prodigy membership cost" (2026): https://brighterly.com/blog/prodigy-membership-cost/
- Brighterly, "SplashLearn cost" (2026): https://brighterly.com/blog/splashlearn-cost/
- Brighterly, "Best math apps for kids" (2026): https://brighterly.com/blog/best-math-apps-for-kids/
- Apple App Store Review Guidelines §1.3 Kids Category: https://developer.apple.com/app-store/review/guidelines/
- Prodigy, "Choosing a membership": https://www.prodigygame.com/main-en/blog/choosing-prodigy-membership
