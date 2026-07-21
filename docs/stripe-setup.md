# Web Stripe setup

The web paywall is live in the code (PaywallModal, PremiumGate, route gating);
this is the account-side setup that makes checkout real. The entitlement it
writes is the same `public.entitlements` row the iOS app reads and writes —
one subscription unlocks both platforms.

## 1. Stripe dashboard

- Create a product **KidMath Premium** with two recurring prices (matching
  the App Store — Apple requires identical pricing):
  - **$8.99 / month**
  - **$54.99 / year**
- Both prices get their 14-day trial from the Checkout session
  (`trial_period_days: 14` in the function), not from the price object.
- Launch pricing: create an extra **$39/year** price and a promotion code
  restricted to it for the founding-member cohort (the checkout session
  already sets `allow_promotion_codes: true`), or temporarily point
  `STRIPE_PRICE_ANNUAL` at the $39 price and swap back after month-3
  retention — grandfathered subscribers keep their price automatically.

## 2. Deploy the Edge Functions

```sh
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe sends no JWT

supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_MONTHLY=price_... \
  STRIPE_PRICE_ANNUAL=price_...
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
