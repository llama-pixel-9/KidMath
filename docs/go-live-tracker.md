# Go-live tracker

The punch list between "built" and "officially live." Started 2026-08-05
after the compliance work-orders (WO-1..9) merged to `larkit-rebrand` and
the backend (4 migrations, 6 Edge Functions, `CONSENT_REVOCATION_SECRET`)
went live on Supabase.

Companion docs: [launch-compliance-checklist.md](./launch-compliance-checklist.md)
(the full legal analysis) · [compliance-claude-code-workorders.md](./compliance-claude-code-workorders.md)
(what was built). This file is the short list — check items off here.

**Rule:** nothing ships to prod (`main`) until every item in §1 is checked.

---

## 1 · Blocks the prod deploy (do these, then push)

- [ ] **Real entity address + phone in `src/legal/entity.js`.** Registered-agent
  address and a forwarding number are fine. This clears the deliberate
  `legalDocs.spec.js` launch gate (the one failing test) and is required by
  16 CFR §312.4(d)(1) on the public notice. *Waiting on: Sai has the values.*
- [ ] **Verify the four mailboxes actually receive mail:** privacy@, support@,
  security@, legal@ larkit.io. `privacy@` starts a 30-day legal response
  clock; `legal@` receives arbitration opt-outs — a missed one can void the
  arbitration clause for that user.
- [ ] **Delete the "Drafting note — remove before publication" block** from
  `src/legal/parental-consent-notice.md` (top of file). No version bump
  needed (not a substance change).
- [ ] **Push the deploy.** The merge is already prepared and gate-green in the
  `/Users/sai/kidmath-deploy` worktree (`deploy-compliance` = origin/main +
  larkit-rebrand, clean merge, fresh npm ci). After the items above land on
  `larkit-rebrand`, refresh and push:
  ```bash
  cd /Users/sai/kidmath-deploy
  git merge larkit-rebrand --no-edit && npm run build && npm run test
  git push origin deploy-compliance:main     # or open a PR like #27
  ```
- [ ] **Post-deploy smoke pass on prod:** /privacy /terms /security
  /parental-consent render with real entity details; footer everywhere;
  privacy link on welcome / signup / add-a-child / paywall; no request to
  fonts.googleapis.com in the network tab; /.well-known/security.txt serves.

## 2 · Blocks charging real money (before `VITE_PAYWALL_ENABLED=true`)

- [ ] Stripe live mode: products + prices ($8.99/mo, $54.99/yr), secrets set
  (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`,
  `STRIPE_WEBHOOK_SECRET`), webhook endpoint registered (docs/stripe-setup.md).
- [ ] **Cancel-flow test on a phone browser:** subscribe (test card) →
  /account/billing → cancelled in one click, no survey. "Use a desktop" was
  a named FTC violation (*Chegg*) — test on the phone, not the laptop.
- [ ] Confirmation + reminder emails (trial day 11, 35 days pre-annual-renewal,
  annual, pre-price-change) — **blocked on §3 email sender.**

## 3 · Blocks the consent flow going live (B7 — email sender)

- [ ] Choose the transactional sender (Resend / Postmark / SES).
- [ ] Implement it in `supabase/functions/_shared/emailTransport.ts` (the one
  swap point — nothing else changes), redeploy `request-consent` and
  `consent-confirm`.
- [ ] Domain auth on larkit.io: SPF, DKIM, DMARC. Deliverability is a
  compliance dependency — a consent notice in spam means the account is stuck.
- [ ] End-to-end rehearsal: add first kid → notice email arrives → confirm
  link → profile appears + coppa_vpc event has all three timestamps →
  confirmation email carries a revocation link → revocation link works.
- [ ] Until this section is done, first-kid creation on prod sends nothing
  (stub logs to function logs) — parents would be stuck at "check your
  email." **Either finish §3 before or together with §1's deploy, or
  temporarily feature-flag the consent gate.** ⚠️ decide explicitly.

## 4 · Blocks App Store submission (B2 — Apple credentials)

- [ ] Replace bundle-id placeholder `com.kidmath.app` everywhere (project.yml,
  StoreKit config, `APP_BUNDLE_ID` secret).
- [ ] Set `APPLE_ROOT_CERTS_B64` + `APPSTORE_ENV` secrets so verify-entitlement
  stops failing closed (501) for App Store receipts.
- [ ] Sign in with Apple token revocation in delete-account (TODO in the
  function; unskip the test in accountDeletion.spec.js).
- [ ] Privacy nutrition labels in ASC, checked against PrivacyInfo.xcprivacy
  (now declares child name/age/grade — labels must match).
- [ ] Manual first-run pass in Xcode: purchase, sign-in, and every external
  link unreachable without solving the parental gate; three wrong answers →
  60s lockout that survives reopening the sheet.
- [ ] The rest of docs/ios-appstore-checklist.md.

## 5 · Verify the automated controls actually run

- [ ] `cron.job_run_details`: `purge-session-diagnostics` and
  `expire-consent-requests` have each run at least once (check ~1 day after
  the migrations were applied, then monthly per the security program §6).
- [ ] `consent_events` rows appear on real signup/subscribe with the literal
  disclosure text and real dates.

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
- [ ] 24-month inactive-account purge (warning email part blocked on §3).
- [ ] Admin view over consent_events (arbitration opt-out window evidence).

---

*Update this file as items close — it doubles as the launch-readiness record.*
