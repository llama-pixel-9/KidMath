# Launch marketing tracker

The short list for [launch-strategy.md](./launch-strategy.md). Check items
off here. Code items link to a work-order in
[marketing-claude-code-workorders.md](./marketing-claude-code-workorders.md)
(`WO-M1` etc.); everything else is a you-task.

Render it: `npm run marketing:dashboard` builds and opens
`docs/marketing/dashboard.html` from this file (progress per phase, metrics
vs. targets, gate status). The dashboard reads only this file, so keep the
checkbox and table shapes below.

**Gate:** nothing in Phase 1 happens until [../go-live-tracker.md](../go-live-tracker.md)
§1 and §3 are done and `VITE_SIGNUPS_DISABLED` is off.

Launch target: **late Oct 2026** · Started 2026-09-14

---

## 0 · Phase 0 — Runway (now → launch)

### Product & site (Claude Code)
- [ ] `WO-M1` Funnel events: first-party event table + client helper for the 10 funnel steps
- [ ] `WO-M2` Playable demo on the landing page (no signup), "Start free" CTA at launch
- [ ] `WO-M3` Pricing page with the no-ads line next to the price; founding-rate banner
- [ ] `WO-M4` Consent-step copy: plain-language explainer + "resend" + spam-folder hint
- [ ] `WO-M5` Worksheet SEO pages: indexable `/worksheets/<grade>/<skill>` with PDF + game CTA (first 15)
- [ ] `WO-M6` Rating prompt after 5th completed session (never mid-play); end-of-trial one-question survey
- [ ] `WO-M7` `/press` page: logos, description, founder story, screenshots, gameplay clip
- [ ] `WO-M8` Referral codes: "give a month, get a month", surfaced after 10th star (build now, flag off until week 5)
- [ ] `WO-M9` Cookieless web analytics on larkit.io marketing pages only (no pixels; nothing in the kid app)

### Listing & assets (you)
- [ ] App Store title/subtitle/keywords drafted (`ios-appstore-checklist.md` has the account side)
- [ ] 5 screenshots: #1 Meadow (hatch or bird landing), #2 a flight, #3 printed flight log, #4 Field Guide card; captions written
- [ ] App Privacy label filled and double-checked against `childrens-data-security-program.md`
- [ ] 20-second Hatch Day clip + 30-second gameplay clip recorded
- [ ] OG image / social card updated for Larkit

### People (you)
- [ ] 10 founding families recruited (own network / school / homeschool co-op)
- [ ] Founding-family offer sent: free for life ↔ 20-min call week 1 + week 4
- [ ] Welcome email written (plain text, one question: "What made you try Larkit?")
- [ ] help@larkit.io monitored; same-day reply promise on the site
- [ ] Consent-email deliverability tested: Gmail, iCloud, Outlook, Yahoo
- [ ] Waitlist ≥ 100 parents

### Community groundwork (you)
- [ ] Joined 5–8 groups (2–3 homeschool, local parents, school/PTA, co-op); participating, no Larkit mentions yet
- [ ] PTA / school newsletter contact identified
- [ ] QR flyer with free-month code designed for library / rec-center / waiting-room boards
- [ ] List of 15 parent newsletters / bloggers / roundups to pitch in Phase 2

### Social setup (you — strategy §6)
- [ ] Accounts claimed: Pinterest (site claimed, Rich Pins on), Instagram, Facebook Page, YouTube; handle `larkit` or `larkitmath` everywhere
- [ ] larkit.io/start links page (bio link) live
- [ ] Demo kid profile ("Sky") with a curated flock (5, 10 and 15-bird states saved) for all screenshots and recordings — never a real Meadow or flight log
- [ ] Templates made in Canva/Figma: Bird of the Week carousel, paper-version carousel, quote card, Pin
- [ ] Origin-story Reel recorded ("why there are no coins in Larkit") and first Hatch Day clip recorded — both pinned on launch
- [ ] Following 50 accounts (homeschool, K–2 teachers, math-at-home, bird/nature); commenting daily for 2 weeks pre-launch
- [ ] Week L−2 and L−1 of the launch content calendar (strategy §6) scheduled
- [ ] Ten Confidence Tips scripted (list in §6, recipe 7)
- [ ] Pinterest boards created ("Birds in the Meadow" + per grade × topic); first 10 Bird of the Week pins and 10 worksheet pins live

## 1 · Phase 1 — Soft launch (launch week)

- [ ] Day 1: waitlist email + founding families
- [ ] Days 2–3: personal network, class parent group, PTA newsletter, local boards
- [ ] Days 4–5: 2–3 communities (only where we've been participating ≥ 2 weeks)
- [ ] 48-hour funnel watch done; every step < 30% drop-off or fix shipped
- [ ] Every new parent got the personal welcome email
- [ ] Launch-week calendar posted (Hatch Day pinned, payout-table post, Sound On ×2, Bird of the Week); founding families asked (once) for a launch-day Story share
- [ ] Replies to "what made you try Larkit?" collected in `docs/marketing/parent-voice.md`
- [ ] iOS: App Store live → second announcement wave sent (skip if not yet approved)

## 2 · Phase 2 — Validate (weeks 4–8)

### Weekly rhythm (tick per week: W4 W5 W6 W7 W8)
- [ ] W4 · dashboard read · 3 parent calls · 1 fix shipped · fix email sent · 2 worksheet pages
- [ ] W5 · dashboard read · 3 parent calls · 1 fix shipped · fix email sent · 2 worksheet pages
- [ ] W6 · dashboard read · 3 parent calls · 1 fix shipped · fix email sent · 2 worksheet pages
- [ ] W7 · dashboard read · 3 parent calls · 1 fix shipped · fix email sent · 2 worksheet pages
- [ ] W8 · dashboard read · 3 parent calls · 1 fix shipped · fix email sent · 2 worksheet pages

### Social & outreach (weekly batch, same day each week)
- [ ] W4 · batch posted (Meadow Tour 10 birds, tip, Fledging Flight, Bird of the Week) · replies answered · 3 newsletter/blog pitches sent
- [ ] W5 · batch posted · replies answered · 3 pitches · first Collab post with a small printables account
- [ ] W6 · batch posted · replies answered · 3 pitches · "Sunday flight" email starts if list ≥ 200 · first Audubon/nature-center outreach
- [ ] W7 · batch posted · replies answered · 3 pitches · second Collab post
- [ ] W8 · batch posted · replies answered · third Collab post · social metrics read into the table below

### Experiments
- [ ] W4 · Rating prompt turned on
- [ ] W5 · Referral loop turned on (`WO-M8` flag)
- [ ] W6 · Pricing-page presentation test started (monthly-first vs annual-first, measured on trial→paid)
- [ ] W6 · First parent quotes on the site
- [ ] W7 · First founding-family round-2 calls done
- [ ] W7 · Rung-1 outreach drafted (Product Hunt, 5–8 micro-creators, 3 newsletters) — NOT sent
- [ ] W8 · Gate review done; decision written at the bottom of this file

## 3 · Phase 3 — Ramp (gated; do not start until §Gates passes)

- [ ] Rung 1 · Apple Search Ads exact-match campaign live (< $1k/mo)
- [ ] Rung 1 · 5–8 micro-creator parents gifted access + code
- [ ] Rung 1 · Product Hunt launch
- [ ] Rung 1 · 3 parent newsletters pitched
- [ ] Rung 2 · unlocked (cost per paid sub < ⅓ first-year revenue for 2 weeks on Rung 1)
- [ ] Rung 3 · unlocked

---

## Metrics

Update **Latest** weekly (Monday). Targets are starting assumptions from
the strategy §8; replace them with our own baseline after ~200 families.

| Metric | Target | Latest | As of |
|---|---|---|---|
| Active learners (≥3 sessions, last 7d) | grows w/w | | |
| Landing → demo played | ≥ 25% | | |
| Demo → account | ≥ 15% | | |
| Consent sent → confirmed (24h) | ≥ 80% | | |
| Account → 3rd session | ≥ 50% | | |
| D7 kid retention | ≥ 35% | | |
| D30 kid retention | ≥ 20% | | |
| Trial → paid (of activated) | ≥ 8% | | |
| Store impressions → downloads | ≥ 30% | | |
| Referral share of new accounts | ≥ 10% by W8 | | |
| Waitlist size | ≥ 100 pre-launch | | |
| Families (accounts with ≥1 kid) | 150–300 launch week | | |
| Social · demo plays from social | ≥ 25% of demo plays | | |
| Social · Hatch Day / Meadow clip completion | ≥ 40% watched to end | | |
| Social · saves per Bird of the Week + printable post | ≥ 5% of reach | | |
| Social · replies + DMs per week (all answered) | ≥ 10 | | |
| Social · IG followers | 500 (floor for collabs, not a goal) | | |
| Social · groups active ≥ 2 weeks | 5 | | |
| Social · collab posts published | 3 | | |

## Gates

All three must hold for two consecutive weeks before Phase 3. Status is
`pass`, `miss`, or blank.

| Gate | Target | Week A | Week B | Status |
|---|---|---|---|---|
| Retention | D7 ≥ 35% and D30 ≥ 20% | | | |
| Conversion | trial→paid ≥ 8% of activated | | | |
| Message fit | majority of calls describe it in our terms | | | |

## Decisions log

- 2026-09-14 · Plan written. Slow ramp: two months of validation at ~$0 before any paid rung.
