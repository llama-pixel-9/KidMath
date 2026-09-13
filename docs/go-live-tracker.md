# Go-live tracker

The punch list between "built" and "officially live." Started 2026-08-05
after the compliance work-orders (WO-1..9) merged; **refreshed 2026-09-13**
against what is actually deployed (prod `main`, Supabase functions/secrets,
consent tables).

Companion docs: [launch-compliance-checklist.md](./launch-compliance-checklist.md)
(the full legal analysis) · [compliance-claude-code-workorders.md](./compliance-claude-code-workorders.md)
(what was built) · [stripe-setup.md](./stripe-setup.md) · [ios-appstore-checklist.md](./ios-appstore-checklist.md).
This file is the short list — check items off here.

**Status at a glance (2026-09-13):** compliance code is live on prod
(PR #88 merged `larkit-rebrand` → `main`). Consent email flow is live and
rehearsed end to end. Left before opening signups: real phone number + one
env flip. Billing has not been started. iOS is waiting on Apple Developer
Program enrollment.

---

## 0 · Private-test mode (current posture)

Prod carries all the code while staying closed to new users:

- `VITE_PAYWALL_ENABLED` **unset** → no Stripe calls, all modes free, no plan
  step. (Still the default.)
- `VITE_SIGNUPS_DISABLED=true` in the Vercel **Production** env → /signup
  shows a friendly "accounts are almost ready" page; the account-free free
  tier keeps working. Testers open `https://larkit.io/?invite=1` once.
- Going live for real = finish §1, remove `VITE_SIGNUPS_DISABLED`, redeploy.
  Billing additionally needs §2 + `VITE_PAYWALL_ENABLED=true`. Opening
  signups before billing is acceptable (everyone gets every mode free until
  the paywall flag flips).

---

## 1 · Blocks opening signups

- [x] Real entity name + address in `src/legal/entity.js` — Larkit Labs LLC,
  502 W 7th St Ste 100, Erie PA 16502-1333 (PR #85, 2026-09-12).
  `legalDocs.spec.js` gate passes; `npm run test` fully green.
- [ ] **Real phone number in `src/legal/entity.js`** — still `(555) 555-0100`
  on prod. 16 CFR §312.4(d)(1) requires it on the public notice. A monitored
  forwarding number is fine. The entity string is duplicated in
  `supabase/functions/_shared/emailTemplates.ts` — keep both in sync, and
  redeploy `request-consent` + `consent-confirm` from a **main-based tree**
  (never from `larkit-rebrand`, its functions copy is stale).
- [x] Role mailboxes receive mail — privacy@ support@ security@ legal@
  hello@ larkit.io are Google Groups delivering to nagasai@larkit.io;
  never-spam filter set (2026-09-12).
- [x] "Drafting note — remove before publication" block removed from
  `src/legal/parental-consent-notice.md` (2026-09-13; its guidance moved to
  the comment block in `src/legal/index.js`).
- [x] Compliance deploy pushed to prod — PR #88 (2026-09-12), plus PR #91
  consent-resend fix (2026-09-13).
- [ ] **Remove `VITE_SIGNUPS_DISABLED` from the Vercel Production env** and
  redeploy, once the phone number lands.
- [ ] **Post-deploy smoke pass on prod:** /privacy /terms /security
  /parental-consent render the real phone; footer everywhere; privacy link
  on welcome / signup / add-a-child / paywall; no request to
  fonts.googleapis.com in the network tab; /.well-known/security.txt serves.

## 2 · Blocks charging real money (before `VITE_PAYWALL_ENABLED=true`)

Nothing here has started. As of 2026-09-13 `stripe-checkout` and
`stripe-webhook` are **not deployed** and no `STRIPE_*` secrets exist.

- [ ] Stripe dashboard (live mode): product **Larkit Premium** with
  **$8.99/mo** (lookup key `larkit_monthly`) and **$39.99/yr** launch price
  (lookup key `larkit_annual`). Retiring the launch price later = new
  $54.99 price with the same lookup key, archive the old one.
- [ ] Deploy `stripe-checkout`, `stripe-portal`, `stripe-prices
  --no-verify-jwt` and `stripe-webhook --no-verify-jwt` from a main-based
  tree. (PR #94: prices are read from Stripe at runtime — the paywall and
  disclosure carry no literals, so the launch price is purely a dashboard +
  secret decision.)
- [ ] Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. (No price ids:
  prices are found by lookup key `larkit_monthly` / `larkit_annual` set on
  the price in the dashboard.)
- [ ] Webhook endpoint at `…/functions/v1/stripe-webhook` with
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`.
- [ ] Test-mode end-to-end per stripe-setup.md §4 (checkout → entitlements
  row `active` → premium unlocks on web; iOS honors the same row).
- [ ] **Cancel-flow test on a phone browser:** subscribe (test card) →
  /account/billing → cancelled in one tap, no survey. "Use a desktop" was a
  named FTC violation (*Chegg*) — test on the phone, not the laptop.
- [ ] Confirmation + reminder emails (trial day 11, 35 days pre-annual-renewal,
  annual, pre-price-change). Sender is now live (§3) — confirm these are
  actually built and wired to Resend before flipping the paywall.
- [ ] Stripe Tax before live mode: Pennsylvania taxes digital products, so
  PA parents owe sales tax from the first sale. Enable under Settings → Tax
  and set `automatic_tax: { enabled: true }` on the Checkout session.
- [ ] **Live mode uses a restricted key, not the standard secret key.**
  Developers → API keys → Create restricted key, permissions: Checkout
  Sessions *write*, Billing Portal *write* (configurations + sessions),
  Prices *read*, Products *read*, Customers *read*, Subscriptions *read*.
  Everything else *none*. Set it as `STRIPE_SECRET_KEY`. The standard
  `sk_live_` key can do anything (refunds, payouts, deleting customers);
  the functions only need the list above. Test mode keeps the standard
  `sk_test_` key — no need to harden a sandbox.
- [ ] Set `VITE_PAYWALL_ENABLED=true` in Vercel Production; redeploy.

## 3 · Consent flow (B7 — email sender) — DONE 2026-09-12/13

- [x] Sender: Resend. `RESEND_API_KEY` + `EMAIL_FROM="Larkit <hello@larkit.io>"`
  set; `emailTransport.ts` swapped (PR #85).
- [x] Domain auth on larkit.io: SPF, DKIM, DMARC verified.
- [x] Links land on branded pages (`/confirm-consent`, `/revoke-consent`,
  PR #82); explicit button POST, so scanner prefetch cannot grant/revoke.
- [x] Resend supersedes prior pending requests; sent-state panel with 60s
  cooldown (PR #91, migration 20260913020000).
- [x] End-to-end rehearsal: real signup 2026-09-13 → notice email → confirm
  → `consent_events` coppa_vpc row carries noticeSentAt, consentReceivedAt,
  confirmationSentAt.
- [ ] Revocation link from the confirmation email exercised once on prod
  (not yet recorded here — do it during the §1 smoke pass).

## 4 · Blocks App Store submission (B2 — waiting on Apple Developer Program)

Enrollment submitted; nothing below can start until it completes.

- [ ] Replace bundle-id placeholder `com.kidmath.app` in `ios/project.yml`,
  both product IDs in `ios/KidMath/KidMath.storekit`, and the
  `APP_BUNDLE_ID` function secret.
- [ ] Set `APPLE_ROOT_CERTS_B64` + `APPSTORE_ENV` secrets so
  `verify-entitlement` stops failing closed (501) for App Store receipts.
  Coordinate with the first iOS release — old builds write `entitlements`
  directly, new builds call the function.
- [ ] Sign in with Apple token revocation in `delete-account`
  (`TODO(B2)`); unskip the test in `accountDeletion.spec.js`. Needs the
  Apple Developer key for the client_secret.
- [ ] Team signing for Sign in with Apple on device; `kidmath://auth-callback`
  redirect registered in the Supabase Google provider.
- [ ] App Store Connect: app record, both subscriptions
  (`…premium.monthly` $8.99, `…premium.annual` **$39.99** — the launch price
  itself, no intro offer; Apple requires parity with web), TestFlight.
- [ ] iOS paywall fallbacks: `PaywallView.swift` still falls back to literal
  "$54.99"/"$8.99" when StoreKit products haven't loaded. Match the web —
  disable purchase until `displayPrice` is real, never show a literal.
- [ ] Privacy nutrition labels in ASC, checked against PrivacyInfo.xcprivacy
  (declares child name/age/grade — labels must match).
- [ ] Manual first-run pass in Xcode: purchase, sign-in, and every external
  link unreachable without solving the parental gate; three wrong answers →
  60s lockout that survives reopening the sheet.
- [ ] **Larkit branding on iOS.** The app was built as KidMath before the
  rebrand: display name, generated placeholder icon, and theme names all
  predate Larkit. Decide the scope before submission.
- [ ] The rest of docs/ios-appstore-checklist.md.

## 5 · Verify the automated controls actually run

- [ ] `cron.job_run_details`: `purge-session-diagnostics` and
  `expire-consent-requests` have each run at least once. As of 2026-09-13
  four `consent_requests` rows from 2026-09-12 are still `pending` — a good
  canary. Not checkable from the CLI without a DB URL; use the dashboard.
- [x] `consent_events` rows appear on real signup with the literal
  disclosure text and real dates (verified 2026-09-13; `account` and
  `coppa_vpc` kinds). Subscribe-time rows unverified until §2.
- [ ] Google OAuth brand verification ("to continue to Larkit") — submitted
  2026-09-11, pending at Google.

## 6 · Human review (lawyer, hours not a retainer) — from legal-implementation.md

- [ ] Arbitration clause (Terms §19): confirm we want it at all.
- [ ] consent_events cascade-vs-3-year-retention split (billing_consent_archive).
- [ ] The **rendered** checkout and cancellation screens, as built.
- [ ] Email-plus script + the step-2-vs-step-4 consent-completion question.
- [ ] Liability/indemnity/governing-law vs highest-volume states.
- [ ] Terms §13 educational disclaimer vs whatever marketing actually claims.

## 7 · Not retail-blocking (district track — don't let it slip silently)

- [ ] Accessibility: NumberLine keyboard rebuild (the SC 2.1.1 blocker), then
  the shared announcer/focus/non-colour-cue infrastructure —
  docs/accessibility-audit.md has the ordered plan. Months; start early.
- [ ] Tenancy ADR decision (docs/adr-001-tenancy.md) — approve/amend before
  real user volume makes the RLS rewrite expensive.
- [ ] **24-month inactive-account purge.** A promise in the privacy policy
  (§7.2 retention table: "24 months without a sign-in; we email you and
  delete 30 days later absent a response"; `legalDocs.spec.js` asserts the
  text). Nothing is built and nothing determines inactivity today. First
  possible purge date is ~2028-09 (24 months after the first real signup),
  so not a launch item — but it must exist before then.
  - **Inactive =** no sign-in AND no usage in 24 months. Do not use
    `auth.users.last_sign_in_at` alone: it updates on fresh login/OAuth
    exchange, not on silent token refresh, so a parent whose phone stays
    signed in while the kid practices weekly would look dormant. Also
    require no `practice_sessions` row and no `progress` write for the
    user in the window.
  - **Mechanism,** following the `purge-session-diagnostics` /
    `expire-consent-requests` pattern: (1) daily SQL cron finds accounts
    past 24 months on both signals with no warning yet sent, inserts a row
    in a small `account_purge_notices` table; (2) scheduled Edge Function
    emails those parents via Resend (§3 sender) with a "sign in to keep
    your account" link and stamps the row; (3) a second pass 30 days
    later, still no activity, runs the same deletion path as
    `delete-account` so kids, progress, and consent requests go together.
    `consent_events` keep their own 3-year retention (no child data).
    Any sign-in or practice in the 30-day window cancels the notice.
- [ ] Admin view over consent_events (arbitration opt-out window evidence).

---

*Update this file as items close — it doubles as the launch-readiness record.*
