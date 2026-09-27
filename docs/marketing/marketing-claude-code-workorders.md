# Launch Marketing — Claude Code Work-Orders

Paste-able work-orders for the code items in
[launch-tracker.md](./launch-tracker.md) §0, in service of
[launch-strategy.md](./launch-strategy.md). Same shape as
[../compliance-claude-code-workorders.md](../compliance-claude-code-workorders.md).

## How to use this document

- **One work-order = one focused Claude Code session.** Paste the **Prompt**
  block into a fresh session in `~/KidMath`.
- **Branch per work-order:** `feature/mkt-M1` etc., off `larkit-rebrand`.
  None of these touch `src/legal/` substance, the item bank, or billing
  logic; they should not need migrations except WO-M1 and WO-M8.
- **Hard constraints every session inherits** (repeat them in the prompt if
  the session drifts):
  - Apple Kids Category: **no third-party analytics or ad SDKs anywhere in
    the app bundle.** First-party only. WO-M9 is the one exception and it
    applies only to marketing routes, never to `/play` or anything a child
    sees after consent.
  - Nothing new collects personal data from a child. Funnel events are
    keyed to the parent account / anonymous install id, never to a kid's
    name, and hold no free-text.
  - Nothing changes the consent flow's *substance* (WO-M4 is copy only).
    If a change would, stop and say so.
- **Acceptance gate** at the end of every work-order:
  ```bash
  npx vitest run
  npm run lint
  npm run build
  ```
  WO-M2 and WO-M5 additionally: `npm run test:e2e` if the smoke matrix
  touches `/` or `/worksheets`.
- **Model:** **Fable 5.1** (latest) for every work-order — start each session
  with `/model` set to Fable. If Fable credits run out mid-plan, fall back to
  **Opus** for the remaining sessions; do not drop to Sonnet for M1, M2, M5 or
  M8 (event schema, the kid play loop, SEO routing/PDF, entitlement logic —
  the judgement-heavy ones).
- **Ordering:** M1 first (everything else emits its events), then M2 and M3
  (they're what launch week points at), then M4, M5, M6. M7 and M9 are
  quick, any time. M8 last, behind a flag.

---

## WO-M1 · Funnel events (first-party)

**Why:** Strategy §8. Ten funnel steps are the whole validation dashboard;
without them Phase 2 is guesswork.

**Prompt:**

> Read `CLAUDE.md`, `docs/marketing/launch-strategy.md` §8, and
> `docs/marketing/launch-tracker.md` §Metrics. Then look at what already
> exists before adding anything: `src/telemetry/telemetryClient.js`,
> `src/analytics/sessionLog.js`, `src/progressStore.js`, and the Supabase
> schema under `supabase/migrations/`. Report what is already captured for
> each of these funnel steps and what is missing:
> `landing_view`, `demo_started`, `demo_completed`, `account_created`,
> `consent_sent`, `consent_confirmed`, `session_completed` (with a per-kid
> session ordinal so "3rd session" is derivable), `trial_started`,
> `trial_ended`, `subscription_started` (source: stripe | storekit).
>
> Then implement the gaps as one small, append-only `funnel_events` table
> (migration) with RLS so a parent can insert only their own rows and only
> the service role can read aggregates, plus a client helper
> `src/analytics/funnel.js` with a `track(event, props)` that is a no-op
> when offline or when the row would fail. Keys: parent user id when
> signed in, otherwise a random anonymous install id stored locally and
> linked on signup. **No child names, no free text, no third-party SDK.**
> Add a SQL view or Edge Function that returns the weekly funnel
> (counts per step + D7/D30 retention + activation) so it can be pasted
> into the tracker's Metrics table. Write unit tests for the helper and
> a test that the migration's RLS blocks cross-parent reads.

**Acceptance:** gate green; `supabase db diff` shows only the new table,
policies, and view; a manual run of the weekly query returns rows.

---

## WO-M2 · Playable demo on the landing page

**Why:** Strategy §4 Phase 0. "Landing → demo played ≥ 25%" is the first
funnel metric; a parent has to see the game before creating an account.

**Prompt:**

> Read `CLAUDE.md`, `docs/marketing/launch-strategy.md` §2 and §4 (Phase 0),
> then `src/HomePage.jsx`, `src/onboarding/ValuePage.jsx`, `src/MathExplorer.jsx`
> and `src/launchFlags.js`. The site already has an account-free free tier;
> find how a visitor can currently reach play without an account.
>
> Build a 20-second "try it" demo embedded above the fold on `/`: one
> short addition round (grade 1–2 band) using the real play component in a
> constrained mode — real bubble buttons, real stars — that ends on a card
> with the one-liner from strategy §2 and a single CTA. The CTA label comes
> from a flag: `Get early access` (waitlist) before launch, `Start free`
> after. No signup, no consent, no data stored beyond a `demo_started` /
> `demo_completed` funnel event (WO-M1). Must work on an older iPad Safari
> and at 400px wide. Keep the existing hero copy editable in one place.
> Update `HomePage` tests and add an e2e smoke for the demo path.

**Acceptance:** gate green; demo completes with no network beyond the two
events; Lighthouse mobile performance on `/` not worse than before.

---

## WO-M3 · Pricing page + founding rate

**Why:** Strategy §7. Price has to be visible before launch, with the
"No ads. No data selling. One price, cancel any time." line next to it.

**Prompt:**

> Read `docs/marketing/launch-strategy.md` §7, `docs/stripe-setup.md`,
> `src/PaywallModal.jsx`, `src/premium.js`, `src/PremiumContext.jsx`. Add a
> `/pricing` route rendering one plan (monthly / annual toggle, annual
> default), family profiles included, 14-day card-less trial, and the
> exact no-ads line beside the price. Prices come from one config object
> (`src/pricing.js`) so they can change without touching JSX; use
> placeholders matching §7 for now. Add a "founding rate" banner controlled
> by a flag (first 100 paying subscribers lock $39/yr) — copy only, no
> billing change in this WO. Answer the "why not Khan Academy Kids (free)?"
> objection in a short FAQ on the page using the three distinctions in §2.
> Link from the footer and the paywall. Do not change Stripe or StoreKit
> logic. Tests for the toggle and the config.

**Acceptance:** gate green; `/pricing` renders with paywall flag on and off.

---

## WO-M4 · Consent-step copy and recovery

**Why:** Strategy §3 constraints and §8: "consent sent → confirmed ≥ 80%".
Copy-only; the consent mechanism itself is compliance-owned.

**Prompt:**

> Read `docs/launch-compliance-checklist.md` (email-plus section),
> `src/ConsentLinkPages.jsx`, `src/onboarding/OnboardingFlow.jsx`, and the
> consent Edge Function under `supabase/functions/`. **Do not change what
> is collected, when, or the legal notice text.** Improve only the
> parent-facing UI around the consent email: a plain-language explainer
> ("We email you because the law asks us to check with a grown-up. It
> takes one tap."), a visible "Resend email" with a cooldown, a
> "check spam / promotions" hint after 60s, the exact sender address
> shown so parents can whitelist it, and a clear "what happens next"
> state after confirmation. Emit `consent_sent` / `consent_confirmed`
> (WO-M1) if not already emitted. Tests for the resend cooldown.

**Acceptance:** gate green; `legalDocs.spec.js` untouched and still at its
known state.

---

## WO-M5 · Worksheet SEO pages

**Why:** Strategy §5, top organic channel. Evergreen "free printable ___
worksheets" search; it takes months to rank so it must ship pre-launch.

**Prompt:**

> Read `docs/marketing/launch-strategy.md` §5 (worksheet row),
> `src/PrintableWorksheet.jsx`, the `/worksheets` route in `src/App.jsx`,
> `src/modes/` and `src/bands.js` to see which grade × skill combinations
> exist. Design indexable routes `/worksheets/grade-<n>/<skill-slug>` that
> render server-friendly HTML (title, H1, 150-word intro that actually
> helps a parent, an example problem, a "Download PDF" that generates the
> worksheet client-side from the existing generator, and at the bottom
> "Or practice the same skill in the game →" linking to the matching
> `/play/:mode`). Because this is a Vite SPA on Vercel, propose and
> implement the simplest approach that gives crawlers real HTML for these
> pages (prerender at build via a script in `scripts/`, or Vercel
> rewrites — explain the tradeoff before choosing). Generate the first 15
> pages covering K–3 addition/subtraction/multiplication variants, plus
> `sitemap.xml` and per-page meta/OG. No third-party scripts.

**Acceptance:** gate green; `curl` of a worksheet URL returns the H1 and
intro in the HTML body; sitemap lists 15 URLs.

---

## WO-M6 · Rating prompt + end-of-trial survey

**Why:** Strategy §4 Phase 0 (support and review loops).

**Prompt:**

> Read `src/engagement/engagementStore.js`, `src/analytics/sessionLog.js`,
> `src/account/`, and `ios/` for how the web and native app share the
> engine. Implement (1) a review request that fires once, only after a
> kid's 5th *completed* session, only on a parent-facing screen (never
> during play): on iOS use `SKStoreReviewController` via the native side;
> on web a gentle in-app card linking to the App Store / a "tell us"
> mailto. (2) A one-question survey shown to the parent when a trial ends
> without conversion: "What almost stopped you from subscribing?" with
> 4 fixed choices + optional short text, stored on the parent account
> (not the kid), emitted as a funnel event. Both behind flags. Tests for
> the 5th-session trigger and the once-only rule.

**Acceptance:** gate green; `npm run build:engine` still passes.

---

## WO-M7 · `/press` page

**Why:** Strategy §4 Phase 0 (brand + press kit).

**Prompt:**

> Add a static `/press` route: Larkit marks from `public/` (light/dark,
> SVG + PNG), a two-sentence description, the one-liner from
> `docs/marketing/launch-strategy.md` §2, a short founder story paragraph
> (leave a clearly marked placeholder for Sai to write), five screenshot
> slots reading from `public/press/`, a 30-second clip slot, and a
> "download everything" zip built at build time by a script in `scripts/`.
> Contact: press@larkit.io. Link from the footer. No new dependencies.

**Acceptance:** gate green; `/press` renders with missing assets handled
gracefully.

---

## WO-M8 · Referral codes (flag off)

**Why:** Strategy §4 Phase 2 experiment. Built pre-launch, turned on week 5.

**Prompt:**

> Read `src/premium.js`, `src/PremiumContext.jsx`, `docs/stripe-setup.md`,
> `docs/billing-revenuecat-decision.md`, and the entitlement tables in
> `supabase/migrations/`. Design "give a friend a month, get a month":
> each parent account gets a short code; a new account entering a code at
> signup gets +30 days of trial; when that account completes 3 sessions,
> the referrer gets +30 days. Grants must be idempotent, capped (max 12
> months earned), and expressed as entitlement extensions the existing
> premium logic already understands — do not add a parallel entitlement
> path. Surface the code in the Grown-Ups panel only after a kid's 10th
> star, behind `VITE_REFERRALS_ENABLED`. Emit `referral_applied` /
> `referral_earned` funnel events. Migration + RLS + tests. Note in the
> PR anything StoreKit-side that a web-only grant can't cover.

**Acceptance:** gate green; flag off = no UI, no behaviour change.

---

## WO-M9 · Cookieless analytics on marketing routes only

**Why:** Strategy §8. "Landing → demo" needs page-level data; the app
itself stays free of any third-party script.

**Prompt:**

> Read `docs/childrens-data-security-program.md` and `src/App.jsx`. Add a
> cookieless, no-personal-data page analytics script (Plausible-style;
> pick one and justify) loaded **only** on `/`, `/pricing`, `/press`,
> `/about`, `/worksheets/**` — never on `/play`, `/onboarding`,
> `/profiles`, `/account`, `/report`, `/meadow`, or any consent route —
> and never when a kid profile is active. Implement as a route-guarded
> loader, not a global tag. Document the choice and the exclusion list in
> `docs/childrens-data-security-program.md`. Test that the script tag is
> absent on excluded routes.

**Acceptance:** gate green; the exclusion test passes; the App Privacy
label needs no change (confirm in the PR description).
