# Launch Compliance — Claude Code Work-Orders

Copy-pasteable work-orders for building the Track A engineering items in
[launch-compliance-checklist.md](./launch-compliance-checklist.md), using the
patterns and code in [legal-implementation.md](./legal-implementation.md).

Same shape as [grade1-4-claude-code-workorders.md](./grade1-4-claude-code-workorders.md).

## How to use this document

- **One work-order = one focused Claude Code session.** Paste the **Prompt**
  block into a fresh session. Scoped sessions keep the prompt cache hot and stop
  the agent drifting into unrelated files.
- **These are mostly independent** — unlike the grade-expansion phases, they
  don't build on each other. Recommended order: **WO-3 first** (no web
  subscriber can cancel today, which is a live violation on every transaction),
  then WO-1 as a quick win, then the rest.
- **Branch per work-order:** `feature/compliance-E1` and so on, off
  `larkit-rebrand`. Six of these touch `src/legal/`, `supabase/migrations/`, or
  the paywall; keeping them separate makes review tractable.
- **Do not merge until the acceptance gate is green.** Every work-order ends
  with:
  ```bash
  npx vitest run          # all tests green
  npm run lint            # clean (the Babel 500KB deopt note on applicationItems.js is expected)
  npm run build           # web bundle builds
  ```
  Work-orders touching modes or the item bank additionally need
  `npm run bank:report` to end with PASS. None of these should, but run it if a
  session strayed.
- **Model:** default **Sonnet 5** for WO-1, WO-2, WO-6, WO-7. Use **Opus 4.8**
  for WO-3 (billing/ARL logic), WO-5 (consent state machine), WO-8
  (accessibility semantics) and WO-9 (the tenancy schema decision) — those are
  judgement-heavy and expensive to get wrong.
- **Before the first session:** clear the stale git lock left in the working
  copy — `rm .git/index.lock .git/.__probe` — or every session will fail to
  stage. Set `user.name` and `user.email`; this repo has neither.

## Before you start: constrain git

`.claude/settings.json` currently has an allow-list and no deny-list. These
work-orders touch legal documents and database migrations, so add:

```json
"deny": [
  "Bash(git push *)",
  "Bash(git rebase *)",
  "Bash(supabase db push *)",
  "Bash(supabase db reset *)"
]
```

Migrations should be written and reviewed, then applied by you. An agent that
can push a migration to a production Postgres holding children's data is a
category of accident worth designing out.

---

## Non-negotiable invariants (every work-order)

Carry these into every prompt. They are the compliance equivalent of "same game
physics, kept stable" — violating any one of them creates a legal problem that
passing tests will not catch.

1. **No child data is written before parental consent completes.** 16 CFR
   §312.5(c)(1) permits holding the parent's contact details for the sole
   purpose of obtaining consent, and nothing more. No `kid_profiles` row, no
   progress row, no engagement row.
2. **No new third-party SDK, analytics tool, pixel, or tag manager may receive
   children's data — ever.** Doing so simultaneously ends our eligibility for
   email-plus parental consent (§312.5(b)(2)(viii)), triggers "Do Not
   Sell/Share" and Global Privacy Control obligations in about ten states, and
   violates Maryland's flat prohibition on targeted advertising to minors. If a
   task seems to need one, stop and ask.
3. **`npm run test` is a hand-maintained file list.** Any new spec must be added
   to that list in `package.json` or it silently never runs.
4. **Changing the substance of a document in `src/legal/*.md` requires bumping
   its version in BOTH the markdown `**Version:**` line and `src/legal/index.js`.**
   `legalDocs.spec.js` enforces the match.
5. **`legalDocs.spec.js` fails on purpose** while `entity.js` still holds
   scaffold values ("Example St"). That failing assertion is a deliberate
   launch gate. **Do not weaken, skip, or delete the assertion to make the suite
   green** — if it fails, report it and move on.
6. **Do not touch the in-flight iOS gamification work** — `MeadowView.swift`,
   `MeadowScenery.swift`, `MeadowSheets.swift`, `MeadowCeremonies.swift`,
   `FlockService.swift`, `Seasons.swift`, `GamFlags.swift`, `FlockTests.swift`,
   or anything under `design/`. Those are uncommitted and mid-change.
7. **Row Level Security is the control; the UI check is convenience.** Every new
   table holding child or consent data enables RLS and scopes it to
   `auth.uid()`. Never rely on a client-side guard alone.

---

## WO-1 — Legal pages wired up (E1)

**Goal:** four legal documents reachable at real routes, with the privacy link
at every point where child data is collected.

**Files:** `src/App.jsx`, `src/PrivacyPage.jsx` (delete),
`src/onboarding/SignupPage.jsx`, `src/onboarding/OnboardingFlow.jsx`,
`src/Navbar.jsx` (footer), `package.json`,
`ios/KidMath/Services/SupabaseConfig.swift`,
`ios/KidMath/Views/FirstFlight/FirstFlightView.swift`

### Prompt

```
Read docs/launch-compliance-checklist.md section "E1 — Wire up the legal pages"
and docs/legal-implementation.md steps 1, 2 and 9.

The legal documents and renderer already exist in src/legal/. Wire them up:

1. In src/App.jsx, replace the PrivacyPage import and route with LegalPage, and
   add routes for /privacy, /terms, /security and /parental-consent. Then delete
   src/PrivacyPage.jsx entirely.
2. Fix src/onboarding/SignupPage.jsx — the word "Terms" currently links to
   /privacy. Point it at /terms.
3. Add a site footer with Privacy · Terms · Security, rendered on every route.
4. 16 CFR §312.4(d) requires a prominent, clearly labelled privacy link on the
   home screen AND at every area where personal information is collected from a
   child. A footer alone does not satisfy it. Add the link to /welcome, /signup,
   the paywall, and — most importantly — the add-a-child screen in
   src/onboarding/OnboardingFlow.jsx.
5. Add "src/__tests__/legalDocs.spec.js" to the test script's file list in
   package.json. That list is hand-maintained, not a glob.
6. iOS: in ios/KidMath/Services/SupabaseConfig.swift, point AppLinks at
   larkit.io (it still says kidmath.vercel.app) and add `terms` and `security`
   URLs alongside `privacyPolicy`. In FirstFlightView.swift around line 271,
   "Terms" is unlinked plain text — make it a Link to AppLinks.terms.

Do NOT change any content inside src/legal/*.md.

legalDocs.spec.js will fail on the ENTITY_ADDRESS assertion because entity.js
still holds scaffold values. That is a deliberate launch gate — report it, do
not weaken the assertion.

Acceptance: npx vitest run (only the known entity.js failure), npm run lint,
npm run build.
```

---

## WO-2 — Data hygiene (E2)

**Goal:** shrink the data surface to what the privacy policy actually describes.

**Files:** `index.html`, `src/index.css`, `src/telemetry/telemetryClient.js`,
`src/main.jsx`, `supabase/migrations/`, `vercel.json`,
`ios/KidMath/Resources/PrivacyInfo.xcprivacy`

### Prompt

```
Read docs/launch-compliance-checklist.md section "E2 — Data hygiene".

1. Self-host fonts. Install @fontsource/fredoka, @fontsource/nunito and
   @fontsource-variable/ibm-plex-mono, import them in src/index.css, and remove
   ALL fonts.googleapis.com / fonts.gstatic.com references from index.html
   including the two preconnect tags. Every page load currently hands a child's
   IP address to Google.
2. In src/telemetry/telemetryClient.js, remove hardwareConcurrency, deviceMemory
   and maxTouchPoints from describeDevice(). Keep user agent and a coarse
   viewport. This fingerprint surface is a California CIPA pen-register exposure.
3. Do not start telemetry for anonymous visitors. Gate bootstrapTelemetry() in
   src/main.jsx behind an authenticated session, and honour Global Privacy
   Control: if navigator.globalPrivacyControl === true, skip entirely.
4. Move the Supabase anon key out of the beacon URL query string (around line
   269) into a request header.
5. New migration: tighten session_diagnostics RLS — drop the blanket anon
   `update ... using (true)` policy and scope updates to the row's own
   session_id. Add a pg_cron job deleting rows older than 90 days, plus a
   purge_old_diagnostics() function. Write the migration; do NOT apply it.
6. Add a regions key to vercel.json pinning functions to iad1.
7. Update ios/KidMath/Resources/PrivacyInfo.xcprivacy to declare the child's
   name, age and grade. It currently declares only email, user ID and other
   user content, which does not match what the app collects.

Acceptance: npx vitest run, npm run lint, npm run build. Then confirm by hand
that no request in the network tab goes to a domain not named in
src/legal/privacy-policy.md section 4.1.
```

---

## WO-3 — Billing and cancellation (E3) · **do this one first**

**Goal:** a web subscriber can cancel online in one step, and the paywall
discloses what state auto-renewal law requires before the card field.

**Files:** `supabase/functions/stripe-portal/`, `src/PaywallModal.jsx`,
`src/premium.js`, `supabase/migrations/`, `ios/KidMath/Views/PaywallView.swift`,
`ios/KidMath/Views/FirstFlight/FirstFlightView.swift`

### Prompt

```
Read docs/launch-compliance-checklist.md section "E3 — Billing and cancellation"
and docs/legal-implementation.md steps 3, 4, 5 and 6.

Context: PaywallModal.jsx line 110 tells users they can "cancel anytime from
your billing portal", but supabase/functions/ contains only stripe-checkout and
stripe-webhook. There is no portal and no way to cancel online. Online signup
with no online cancellation violates the automatic-renewal statutes of CA, CO,
IL, VA, MA, CT, NY and NYC. Fix that first.

1. Create supabase/functions/stripe-portal/index.ts, modelled on the existing
   stripe-checkout function. Call stripe.billingPortal.sessions.create for the
   signed-in user's customer. Configure for immediate cancellation with no
   retention flow. Wire a link to it from account settings and from the paywall.
   Cancellation must be one click after authentication, with no survey, no phone
   step, and full mobile-web parity.
2. Create the consent_events migration exactly as specified in
   legal-implementation.md step 3, including the append-only RLS policies. Note
   there is deliberately NO update and NO delete policy. Write it; do NOT apply.
3. Rebuild the paywall disclosure in THREE places: src/PaywallModal.jsx,
   ios/KidMath/Views/PaywallView.swift, and
   ios/KidMath/Views/FirstFlight/FirstFlightView.swift, which carries its own
   separate paywall and is the screen App Review opens first.
   Before the card field, each must show: that it auto-renews until cancelled;
   the trial length AND the actual end date rendered as a date; the exact first
   charge amount AND date; the renewal frequency and amount; how to cancel with
   a working link; and links to Terms and Privacy.
4. Add a separate, unchecked auto-renewal checkbox, distinct from Terms
   acceptance and never pre-ticked. California requires the auto-renewal consent
   to be its own affirmative act — Stripe's bundled ToS checkbox does not
   satisfy this. Disable the plan buttons until it is ticked.
5. Call logConsent from src/legal/index.js at account creation (kind "account")
   and at subscribe (kind "autorenew"). Pass the LITERAL rendered disclosure
   string with real dates, not a summary — "$8.99/mo" proves nothing, "first
   charge $8.99 on 2026-08-17" proves what the user saw.

Add a spec covering: the auto-renewal checkbox defaults to unchecked; plan
buttons are disabled until it is ticked; and the rendered disclosure contains a
formatted date rather than a relative phrase. Add it to the test list in
package.json.

Acceptance: npx vitest run, npm run lint, npm run build.
```

---

## WO-4 — Deletion and parental rights (E4)

**Goal:** a parent can delete a child, or the whole account, from inside the app,
and it actually purges.

**Files:** `src/` account settings (new), `src/kidProfiles.js`,
`supabase/functions/delete-account/`, `ios/KidMath/Views/SettingsView.swift`

### Prompt

```
Read docs/launch-compliance-checklist.md section "E4 — Deletion and parental
rights".

There is no deletion path anywhere today. Navbar.jsx has sign-out only, iOS
SettingsView.swift line 76 has sign-out only, and there is no settings page on
web. Apple guideline 5.1.1(v) requires in-app account deletion for any app
offering account creation, and 16 CFR §312.6 requires parents to be able to
review and delete a child's data and refuse further collection.

1. Build an account area on web with: a list of child profiles showing exactly
   what we hold about each (name, age, grade, and progress summary) — that is
   the §312.6 review right; per-child "Delete this profile"; and "Delete my
   account and all data".
2. Create supabase/functions/delete-account/index.ts using the service role to
   purge, in one transaction: kid_profiles, progress, item_stats, user
   preferences, engagement rows, and finally the auth user. Deletion must be
   deletion, not deactivation.
3. Mirror both on iOS in SettingsView.swift.
4. Add a revocation endpoint that takes a signed token from a consent
   confirmation message, deletes the child profile and everything associated
   with it, and stops collection. The confirmation message advertises this link,
   so a 404 here is worse than not offering it.
5. Leave a clearly marked TODO where Sign in with Apple token revocation belongs
   (the REST call to revoke user tokens on delete). It needs Apple Developer
   credentials we do not have yet. Add a skipped test naming the gap so it is
   not forgotten.

Add a spec that seeds an account with two child profiles and progress, runs the
deletion path, and asserts zero remaining rows across every table. Add it to the
test list in package.json. That test is the deliverable — a district will ask to
see it.

Acceptance: npx vitest run, npm run lint, npm run build.
```

---

## WO-5 — Consent plumbing (E5)

**Goal:** the email-plus parental consent state machine, with no child data
written before consent completes.

**Files:** `src/onboarding/OnboardingFlow.jsx`, `src/kidProfiles.js`,
`supabase/functions/`, `supabase/migrations/`

### Prompt

```
Read docs/launch-compliance-checklist.md section "E5 — Consent plumbing" and
src/legal/parental-consent-notice.md in full.

Implement email-plus verifiable parental consent under 16 CFR §312.5(b)(2)(viii).
Build the state machine now against a stub email transport that logs the payload
— the real sender is not chosen yet. Keep the transport behind a single
interface so it can be swapped without touching the flow.

The flow:
1. Parent begins creating their first child profile. Deliver the direct notice
   (src/legal/parental-consent-notice.md, rendered) to the account email. Send
   the notice content itself, not merely a link to it — it must be delivered.
2. Parent responds with consent, via reply or a one-tap confirmation link.
3. ONLY on receipt: write the kid_profiles row and a consent_events row with
   kind "coppa_vpc" in a single transaction, recording noticeSentAt,
   consentReceivedAt and confirmationSentAt.
4. Send the confirming message. It MUST carry (a) what was consented to, (b)
   that consent can be revoked, and (c) a working revocation link. The
   revocation notice is required in terms by the rule — omit it and the method
   fails.
5. Scheduled job: if no consent arrives within a reasonable time, delete the
   parent's contact information and any names held.

CRITICAL: nothing about a child may touch the database before step 3. §312.5(c)(1)
permits holding the parent's contact details for the sole purpose of obtaining
consent and nothing more. The current addKid() in src/kidProfiles.js writes
immediately — that has to change.

Also: keep the free web tier genuinely account-free. No name, age, grade or
cloud sync without an account.

Add a spec asserting that no kid_profiles row exists between steps 1 and 3, and
that the confirming message payload contains a revocation link. Add it to the
test list in package.json.

Acceptance: npx vitest run, npm run lint, npm run build.
```

---

## WO-6 — Parental gate coverage (E6)

**Goal:** no purchase or external link reachable without an adult solving the
gate. Kids Category rejection risk.

**Files:** `ios/KidMath/Views/FirstFlight/FirstFlightView.swift`,
`ios/KidMath/Views/ParentalGateView.swift`

### Prompt

```
Read docs/launch-compliance-checklist.md section "E6 — iOS and App Store".

ParentalGateView is correctly wired into PaywallView (purchase and restore),
AboutView (the external privacy link) and SettingsView (unlocking sign-in). But
FirstFlightView.swift contains no reference to ParentalGate at all, and it is
the first-run screen every new user sees and the one App Review will open first.

1. Gate all three surfaces in FirstFlightView: the purchase calls around lines
   568 and 585, sign-in (SignInWithAppleButton around 219 and Google around
   238), and the Privacy Policy Link around line 278. Follow the pattern
   PaywallView already uses.
2. ParentalGateView currently dismisses silently after three wrong answers, so a
   child can simply reopen it. Add a cooldown that persists across presentations.
3. Search the whole iOS target for any other openURL, Link, purchase or restore
   call reachable from a child-facing screen and gate anything that is not
   already covered. List what you find.

Acceptance: the iOS test suite passes from Xcode, and a manual pass confirms
first-run cannot reach purchase, sign-in or an external link without the gate.
```

---

## WO-7 — Hardening (E7)

**Goal:** server-verified entitlements and the security.txt endpoint.

### Prompt

```
Read docs/launch-compliance-checklist.md section "E7 — Hardening".

1. CLAUDE.md notes entitlements are a v1 client-write trust model. Move
   verification server-side: an Edge Function validates the Stripe or StoreKit
   receipt and writes the entitlement row; a migration makes public.entitlements
   service-role-write only, with users able to read their own row and nothing
   else. Write the migration; do NOT apply it.
2. Add public/.well-known/security.txt per RFC 9116, pointing at
   https://larkit.io/security with the security@larkit.io contact and an expiry
   date one year out.

Acceptance: npx vitest run, npm run lint, npm run build.
```

---

## WO-8 — Accessibility audit (E8) · start early, it is the long pole

**Goal:** every interactive widget is keyboard-operable and screen-reader
meaningful. Months of work; this work-order is the audit that scopes it.

### Prompt

```
Read docs/launch-compliance-checklist.md section "E8 — Accessibility".

Do NOT fix anything in this session. Produce an audit.

Assess these against WCAG 2.1 AA: src/components/NumberLine.jsx, AnalogClock.jsx,
CoinTray.jsx, FractionInput.jsx, TenFrame.jsx, PlaceValueDiscs.jsx,
NumberBond.jsx, BarModel.jsx, MultiSelect.jsx, SymbolSelect.jsx, NumberPad.jsx.

For each, report: whether every interaction is reachable and operable by
keyboard alone (SC 2.1.1); whether ARIA roles, names and live regions convey
state to a screen reader; whether focus is visible and order is logical (SC
2.4.3, 2.4.7); whether any state is conveyed by colour alone (SC 1.4.1); and
whether the accessible name of each control is meaningful for a maths task
rather than "button".

Flag drag-only interactions specifically — CoinTray is a suspected hard failure
of SC 2.1.1 with no keyboard path.

Output docs/accessibility-audit.md: one table of findings with severity and
estimated effort, then a proposed remediation order. This becomes the evidence
base for the VPAT, so be candid — an inflated report is a misrepresentation to
districts.
```

---

## WO-9 — Tenancy seam (E9) · schema decision, do before you have real users

**Goal:** decide what owns a learner, and rewrite RLS once rather than twice.

### Prompt

```
Read docs/launch-compliance-checklist.md section "E9 — Tenancy seam for
districts".

Session 1 is a DESIGN session. Do not write migrations yet.

Every child-bearing table is currently scoped auth.uid() = user_id, which
hard-codes "a household owns a learner". Districts own learners too, and a
teacher must see a roster without seeing billing. Retrofitting that later means
rewriting every RLS policy on kid_profiles, progress and item_stats while live
consumer families are reading through them.

Produce docs/adr-001-tenancy.md covering:
1. The recommended shape — a learners table with exactly one owner, either
   owner_user_id (household) or org_id (school), enforced by a CHECK constraint
   so a row can never have both or neither. Show how RLS is then written once
   against "may this actor see this learner".
2. An orgs table with a self-referencing parent so district → school → classroom
   is one hierarchy, and org_members with roles.
3. Why a learner should never move between household and school — two records,
   no linkage — and what that buys us for consent separation.
4. Whether progress and item_stats should carry a denormalised org_id so
   district-scoped deletion and export are one indexed predicate rather than a
   join. Recommend and justify.
5. What breaks: kid_profiles.user_id currently cascades from auth.users, and an
   org-owned learner has no auth.users parent to cascade from. Propose the
   replacement.
6. The migration sequence, ordered so each step is independently revertible.

Do not implement. I will review the ADR and approve before any schema change.
```

---

## Progress

Mark work-orders `✅ DONE` here as they merge, in the same style as the
grade-expansion doc, with a one-line note on what shipped.

> **Branch note (2026-08-05):** the branches were built **stacked**, in
> execution order E3 → E1 → E2 → E4 → E5 → E6 → E7 → E9 → E8, each on top of
> the previous rather than each off `larkit-rebrand`. Two reasons: every
> work-order depends on the legal scaffolding commit (`c1db655`, which lived
> on `legal/compliance-docs`, not on `larkit-rebrand`), and later WOs build
> on earlier ones (E3's links need E1's routes; E4's revocation endpoint is
> advertised by E5's confirmation message; E6 gates links E1/E3 added).
> Review each branch by its own last commit's diff; merging the topmost
> branch merges everything below it in order.

| WO | Workstream | Branch | Status |
|---|---|---|---|
| WO-1 | E1 legal pages | `feature/compliance-E1` | built — awaiting review (routes live, PrivacyPage deleted, footer + §312.4(d) links, iOS links) |
| WO-2 | E2 data hygiene | `feature/compliance-E2` | built — awaiting review (self-hosted fonts, telemetry gated+minimized, retention migration UNAPPLIED) |
| WO-3 | E3 billing | `feature/compliance-E3` | built — awaiting review (stripe-portal, disclosure ×3 surfaces, consent_events migration UNAPPLIED) |
| WO-4 | E4 deletion | `feature/compliance-E4` | built — awaiting review (/account, delete-account + revoke-consent fns, zero-rows spec) |
| WO-5 | E5 consent | `feature/compliance-E5` | built — awaiting review (email-plus state machine on stub transport, consent_requests migration UNAPPLIED) |
| WO-6 | E6 parental gate | `feature/compliance-E6` | built — awaiting review (FirstFlight gated, gate lockout, Settings restore gated) |
| WO-7 | E7 hardening | `feature/compliance-E7` | built — awaiting review (verify-entitlement fn, entitlements write-lock migration UNAPPLIED, security.txt) |
| WO-8 | E8 accessibility audit | `feature/compliance-E8` | built — audit at docs/accessibility-audit.md (NumberLine is the 2.1.1 blocker; CoinTray drag hypothesis NOT confirmed) |
| WO-9 | E9 tenancy ADR | `feature/compliance-E9` | ADR written — awaiting Sai's decision (docs/adr-001-tenancy.md) |
