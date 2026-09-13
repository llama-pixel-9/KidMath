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

- [ ] Stripe dashboard (live mode): product with **$8.99/mo** and
  **$54.99/yr** prices, plus the **$39/yr founding** price (promotion code
  restricted to it, or point `STRIPE_PRICE_ANNUAL` at it temporarily).
- [ ] Deploy `stripe-checkout` and `stripe-webhook --no-verify-jwt` from a
  main-based tree.
- [ ] Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`.
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
  (`…premium.monthly` / `…premium.annual`), $39/yr intro offer, TestFlight.
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
- [ ] 24-month inactive-account purge (warning email now unblocked by §3).
- [ ] Admin view over consent_events (arbitration opt-out window evidence).

---

*Update this file as items close — it doubles as the launch-readiness record.*
