# iOS App Store submission checklist

Everything needed to take the built app (P0–P6 complete on branch
`ios-engine-bridge`) through TestFlight and review. Items marked **[you]**
need the account owner; everything else is already done in the repo.

## 1. Accounts & identifiers

- [ ] **[you]** Apple Developer Program enrollment (choose the entity type
      carefully — Kids category apps from individual accounts get extra
      scrutiny; an organization enrollment reads better).
- [ ] **[you]** Enroll in the **Small Business Program** (15% commission
      instead of 30% — the $54.99 annual nets ~$46.74).
- [ ] **[you]** Pick the real bundle ID and replace the placeholder
      `com.kidmath.app` in `ios/project.yml` (one line), then
      `xcodegen generate && ./patch-scheme.sh`.
- [ ] **[you]** In Xcode → Signing & Capabilities, select your team.
      Sign in with Apple is already in the entitlements files.

## 2. App Store Connect setup

- [ ] **[you]** Create the app record (Kids category, age band 6–8 or 9–11).
- [ ] **[you]** Subscription group "KidMath Premium" with two products,
      matching `ios/KidMath/KidMath.storekit` exactly:
      - `com.kidmath.app.premium.monthly` — $8.99/month, 14-day free trial
      - `com.kidmath.app.premium.annual` — $54.99/year, 14-day free trial
      - Family Sharing: ON for both (the "every child included" promise).
- [ ] **[you]** Launch pricing: add an **introductory offer** on the annual
      plan at **$39/yr** (founding-member price, locks while subscribed).
      Remove the offer once month-3 retention looks healthy — do NOT add a
      renewal step-up.
- [ ] **[you]** Supabase dashboard: enable Google provider; add
      `kidmath://auth-callback` under Auth → Redirect URLs.

## 3. Privacy nutrition labels

Answers map 1:1 to `ios/KidMath/Resources/PrivacyInfo.xcprivacy`:

| Question | Answer |
|---|---|
| Data used to track you | **None** |
| Email address | Collected, linked to identity, App Functionality (account) |
| User ID | Collected, linked, App Functionality |
| Other user content (learning progress) | Collected, linked, App Functionality |
| Purchases | Handled by Apple — not collected by us |
| Anything else (location, contacts, browsing, diagnostics…) | Not collected |

The iOS app sends **no telemetry** (the web app's Vercel analytics is
web-only and not in the iOS bundle). Privacy policy URL: the web app's
`/privacy` route — set the real domain in `AppLinks.privacyPolicy`
(`ios/KidMath/Services/SupabaseConfig.swift`) and use the same URL in the
listing.

## 4. Kids category review points (state these in Review Notes)

- Parental gate (spelled-out arithmetic) guards: purchases, restore,
  account sign-in, and the only external link (privacy policy in About).
- No ads, no third-party analytics/SDKs, no social features, no chat.
- The only network peer is our own backend (Supabase: auth, progress,
  item bank, entitlement).
- Subscription unlocks practice content; the paywall is presented outside
  child play flow and behind the gate for purchase.
- Demo account for review: provide a signed-in test account, or note that
  the app works without sign-in once subscribed (StoreKit sandbox).

## 5. Ship steps

1. `npm run build:engine && npm run test:engine` (engine fresh + parity).
2. `cd ios && xcodegen generate && ./patch-scheme.sh`.
3. Xcode: run the full test suite on a simulator (all tests, including the
   StoreKit purchase test, pass when run from Xcode).
4. Manual pass on a real iPad + iPhone: sign in with Apple (needs your
   team), Google OAuth round-trip, sandbox purchase → entitlement row in
   Supabase, restore purchases, parental gate blocks a child, worksheet
   PDF prints via AirPrint.
5. Archive (Release config — note it uses the clean entitlements, no
   StoreKit-test key) → upload → TestFlight internal testing.
6. External TestFlight with a few families → submit for review.

## 6. Known placeholders to resolve before submission

- Bundle ID `com.kidmath.app` (project.yml).
- Privacy/marketing domain in `AppLinks.privacyPolicy`.
- Contact email in the web privacy page (`src/PrivacyPage.jsx`,
  currently privacy@kidmath.app).
- App icon is a generated placeholder — fine for TestFlight, consider
  real branding for launch.
- Web Stripe companion (checkout + entitlement write + free-tier gating on
  the web) is **built** — the iOS side honors the same Stripe-written
  entitlement row. Account-side setup (products, secrets, webhook) is in
  `docs/stripe-setup.md`.
