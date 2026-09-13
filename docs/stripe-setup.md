# Web Stripe setup

The web paywall is live in the code (PaywallModal, PremiumGate, route gating);
this is the account-side setup that makes checkout real. The entitlement it
writes is the same `public.entitlements` row the iOS app reads and writes —
one subscription unlocks both platforms.

## 1. Stripe dashboard

- Create a product **Larkit Premium** with two recurring prices (matching
  the App Store — Apple requires identical pricing):
  - **$8.99 / month**
  - **$54.99 / year**
- Both prices get their 14-day trial from the Checkout session
  (`trial_period_days: 14` in the function), not from the price object.
- **Give each price a lookup key** — `larkit_monthly` and `larkit_annual`
  (in the price form under *More pricing options → Lookup key*). That key is
  how the functions find the price to sell; there is no price id in any
  secret and no price literal in `src/`.
- **Stripe is the only source of the displayed price.** The web paywall,
  the onboarding plan step and the auto-renewal disclosure read the amounts
  from the `stripe-prices` function, which resolves the same lookup keys
  `stripe-checkout` sells. Until prices load the purchase button is
  disabled. iOS does the same via StoreKit `displayPrice`.
- **Changing a price is dashboard-only.** Create the new price with the
  same lookup key (Stripe asks to transfer the key off the old one), then
  archive the old price. Existing subscribers keep the price their
  subscription was created with. Launch: $39.99/yr; later $54.99/yr.
  Promotion codes are the wrong tool for a founding price: coupons apply
  per product, not per price, so one would also discount the monthly plan.
- `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` still work as optional
  overrides for a one-off test; do not set them in normal operation.

## 2. Deploy the Edge Functions

```sh
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-prices --no-verify-jwt    # public read of the two prices
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe sends no JWT

supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_...
```

## 3. Stripe webhook endpoint

Point a webhook at
`https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
with events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

The webhook is the trusted writer: it verifies Stripe's signature and
upserts `entitlements` with the service role. Status mapping:
trialing/active → `active`, past_due → `grace`, everything else → `expired`.

## 4. Verify end to end (test mode first)

1. Sign in on the web app, open a locked mode → paywall → subscribe with
   Stripe's test card (4242…). The trial means $0 due today.
2. `entitlements` row appears with `source = 'stripe'`, status `active`,
   `expires_at` = trial end.
3. Locked modes and `/worksheets` unlock without a reload (the app polls
   after the `?checkout=success` redirect).
4. Sign in with the same account in the iOS app → premium is active there
   too (StoreService reads the same row).
5. Cancel in Stripe → webhook flips the row to `expired` → both platforms
   lock again.

## 5. Customer self-service (recommended)

Enable Stripe's **customer portal** and link it from the web account menu
so parents can cancel/update cards without emailing you. (Not built into
the app yet — the paywall copy says "cancel anytime from your billing
portal".)
