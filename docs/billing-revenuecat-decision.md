# Decision: keep Stripe + StoreKit 2, skip RevenueCat

**Date:** 2026-08-02 · **Status:** decided (pre-launch, zero subscribers)

We evaluated RevenueCat as the payment layer for the iOS + web storefronts and
decided to **keep the current architecture**: Stripe Checkout + webhook on web,
StoreKit 2 on iOS, with the shared `public.entitlements` row in Supabase as the
cross-platform truth.

## What we already have

- **Web is already done right.** `supabase/functions/stripe-checkout` creates
  the session; `supabase/functions/stripe-webhook` is a signature-verified,
  server-side trusted writer to `entitlements`. This is exactly the pattern
  RevenueCat's webhook would replicate.
- **Cross-platform unlock already works.** Either store writes the
  `entitlements` row; `src/premium.js` (`entitlementIsActive`) and
  `StoreService.rowIsActive` read it with identical rules. RevenueCat's
  headline feature — cross-platform entitlements — is not something we lack.
- **The only real gap is iOS-side trust**: `StoreService.syncToSupabase` is a
  client write (documented v1 trust model), and nothing handles App Store
  renewals/cancellations/refunds while the app isn't running.

RevenueCat's marginal value for us was therefore only: iOS receipt validation,
App Store Server Notification handling, and analytics — not the entitlement
plumbing itself.

## Why we said no

1. **Kids Category risk (decisive).** Apple Guideline 1.3 forbids Kids
   Category apps from transmitting personal/device info to third parties.
   RevenueCat has scrubbed IDFA/AdSupport from its SDK, but its backend
   inherently receives purchase and device data, and developers with kids
   apps still report App Review rejections and awkward Kids Category review
   questions. Pure StoreKit 2 (what we have) sidesteps this entirely.
   - Rejection thread: https://community.revenuecat.com/sdks-51/we-rejected-depends-on-adsupport-guideline-1-3-safety-kids-category-729
   - Review-questions thread: https://community.revenuecat.com/sdks-51/how-should-i-answer-app-review-questions-about-the-kids-category-3041
2. **Cost at scale.** Free under $2,500/mo tracked revenue, then 1% of all
   tracked revenue — on top of Apple's 15–30% and Stripe's 2.9% + 30¢. At
   $50k MTR that's ~$500/mo for infrastructure we mostly already wrote.
3. **It rewrites finished, tested code.** `StoreService`, `PaywallView`, and
   `StoreTests` would be rebuilt around the Purchases SDK, and the already
   awkward `SKTestSession` / `autostart:false` testing setup gets harder
   because the RC SDK also calls RC's backend under test.
4. **Config drift.** Products/offerings/entitlements would live in RC's
   dashboard instead of code; the founding-price lock ($39/yr while
   subscribed) would rely on RC offering semantics layered over two stores'
   different price-preservation mechanisms.
5. **New aliasing surface.** Anonymous iOS purchase → later sign-in requires
   RC's anonymous-ID aliasing; the current StoreKit-local model (entitlement
   lives on the device, row synced on next sign-in) avoids that edge-case
   class.

## What we do instead (the planned hardening, unchanged)

The alternative costs roughly the same code as the RC integration would have,
with no vendor, no fee, no Kids Category exposure:

- One Edge Function that **verifies iOS transactions via the App Store Server
  API** and **ingests App Store Server Notifications (V2)**, writing the same
  `entitlements` row the Stripe webhook writes. This retires the v1
  client-write trust model and handles renewals/cancellations/refunds/grace
  server-side.
- Keep `entitlements` as the app-facing truth on both platforms — that
  interface is also what would let us adopt RevenueCat (or anything else)
  later by pointing a new webhook at the same row.

## Revisit if

- We decide **not** to ship in the Kids Category **and** we want RC's
  analytics/experiments dashboard badly enough to pay 1%.
- If we ever switch: pre-existing subscribers make migration much harder than
  it would have been pre-launch — RC would need historical receipts imported
  and Stripe subscriptions attached; budget for that.
- Minimal-change integration path, for the record: keep Stripe Checkout and
  use RC's Stripe integration (post the subscription to RC after checkout)
  rather than RC Web Billing; on iOS keep the `isUnlocked`/`canPlay` facade
  and swap only `StoreService` internals; RC webhook → Edge Function →
  existing `entitlements` row shape.
