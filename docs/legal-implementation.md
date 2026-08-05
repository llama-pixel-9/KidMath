# Legal documents — where they live and how to wire them

Companion to `docs/legal-compliance-plan.md` and `docs/launch-compliance-checklist.md`.
This is the "where does it go in code" half.

---

## File layout

```
src/legal/
  entity.js                    ← ⚠️ FILL THIS IN FIRST. Name, state, address, PHONE, emails.
  privacy-policy.md            ← public. Also IS the COPPA §312.4(d) online notice
  parental-consent-notice.md   ← the COPPA §312.4(c) DIRECT notice — emailed, and published
  terms-of-service.md          ← public. Subscription, arbitration, Apple EULA rider
  vulnerability-disclosure.md  ← public. Security contact + safe harbor
  index.js                     ← registry, version constants, logConsent()
  LegalPage.jsx                ← the single renderer for all four

src/__tests__/legalDocs.spec.js  ← version drift + placeholder guards

docs/
  childrens-data-security-program.md   ← INTERNAL. Never routed, never shipped.
  legal-compliance-plan.md             ← the analysis
  launch-compliance-checklist.md       ← the gated task list
  vendor-dpas/                         ← create this; drop signed Supabase/Vercel/Stripe DPAs here
```

**Why markdown and not more `SECTIONS` arrays:** the documents are now the single source of truth for both platforms, they diff legibly in code review (you can see exactly what changed in a policy), and each carries a version string that gets stamped onto every consent record. Without that version stamp you cannot answer "what did this parent actually agree to on August 14th," and California requires you to be able to answer it for three years.

**Why a hand-rolled renderer:** the markdown is first-party and committed, so there's no sanitization problem, and `react-markdown` + `remark` + `rehype` is roughly 100kB to render three static pages. Your CLAUDE.md already holds the line on keeping the native engine dependency-free; same instinct applies here.

---

## Step 1 — fill in `entity.js`

Five TODOs. All five block launch:

- **Legal entity name** exactly as registered, with the suffix. It must match the App Store seller name, the §1789.3 notice in Terms §24, and your Stripe account — mismatches between these are a routine finding.
- **State of formation** — also the governing law in Terms §20
- **Street address** — state auto-renewal statutes require the legal business name and contact in the checkout disclosure and the confirmation email
- **Telephone number** — **not optional.** 16 CFR §312.4(d)(1) requires the online notice to state "the name, address, telephone number, and email address" of the operator. This is the element operators most often omit. A forwarding number is fine.
- **Working `privacy@`, `support@`, `security@`, `legal@` mailboxes.** `privacy@` starts a 30-day response clock the moment mail lands. `legal@` is the address of record for arbitration opt-out notices under Terms §19.7 — **a missed opt-out notice can invalidate your arbitration agreement as to that user**, so route it somewhere you actually read.

`legalDocs.spec.js` fails if any token is unresolved or still says "Example St."

---

## Step 2 — routes

In `src/App.jsx`, replace the `PrivacyPage` import and route:

```diff
-import PrivacyPage from "./PrivacyPage";
+import LegalPage from "./legal/LegalPage";
```

```diff
-        <Route path="/privacy" element={<PrivacyPage />} />
+        <Route path="/privacy"           element={<LegalPage slug="privacy" />} />
+        <Route path="/terms"             element={<LegalPage slug="terms" />} />
+        <Route path="/security"          element={<LegalPage slug="security" />} />
+        <Route path="/parental-consent"  element={<LegalPage slug="parental-consent" />} />
```

Then delete `src/PrivacyPage.jsx`. Keeping it around guarantees someone edits the dead one.

**⚠️ Where the privacy link must appear.** 16 CFR §312.4(d) requires "a prominent and clearly labeled link" to the online notice **on the home or landing screen, *and* at each area where personal information is collected from a child.** A footer link alone does not satisfy this. Concretely, the link must appear: in the site footer; on `/welcome` and `/signup`; **on the add-a-child screen in `OnboardingFlow`**; on the paywall; and on the iOS equivalents of each. The add-a-child screen is the one most often missed and the most clearly required.

**Fix the two broken links while you're here.** `src/onboarding/SignupPage.jsx:71` currently points the word "Terms" at `/privacy`:

```diff
-          <Link to="/privacy" className="underline text-ink/60">Terms</Link>{" "}
+          <Link to="/terms" className="underline text-ink/60">Terms</Link>{" "}
```

And `ios/KidMath/Views/FirstFlight/FirstFlightView.swift:271` renders "By continuing you agree to the Terms and Privacy Policy" with only Privacy linked. Add a `Link` to `AppLinks.terms`.

**Add a footer** with Privacy · Terms · Security. Right now `/privacy` is reachable only from the About page on iOS and from nowhere obvious on web. Apple Guideline 3.1.2(c) wants Privacy *and* Terms reachable from the app, and a subscription paywall with no visible terms link is a routine rejection.

---

## Step 3 — the `consent_events` table

`supabase/migrations/20260803120000_create_consent_events.sql`:

```sql
-- Consent evidence. California B&P §17602 requires proof of what each
-- subscriber was shown and agreed to, retained for 3 years or 1 year after
-- termination, whichever is longer. `disclosure_text` stores the LITERAL
-- string rendered beside the checkbox — not a summary. That is the point.
create table if not exists public.consent_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            text not null check (kind in ('account','autorenew','coppa_vpc','coppa_revoked')),
  terms_version   text not null,
  privacy_version text not null,
  disclosure_text text not null,
  user_agent      text,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists consent_events_user_idx
  on public.consent_events (user_id, created_at desc);

alter table public.consent_events enable row level security;

-- Append-only from the client: a user may write and read their own consent
-- records, but may never alter or delete one. Evidence you can edit is not
-- evidence. Deletion happens only via the auth.users cascade.
drop policy if exists "consent_insert_own" on public.consent_events;
create policy "consent_insert_own" on public.consent_events
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "consent_select_own" on public.consent_events;
create policy "consent_select_own" on public.consent_events
  for select to authenticated using (auth.uid() = user_id);
```

Note there is deliberately **no update and no delete policy**. Records are append-only.

⚠️ **Retention tension worth knowing:** the cascade means deleting an account destroys its consent records, while consumer-protection law says keep them for three years. Resolve it by writing a minimal, child-free row (`user_id`, timestamp, versions, plan) to a separate `billing_consent_archive` table that does *not* cascade, at the moment of deletion. That table holds no child data, so nothing in COPPA requires its deletion. **Ask counsel to confirm this split** — it's the one place where two obligations genuinely pull against each other.

---

## Step 4 — call `logConsent` at exactly two moments

**At account creation**, after the OAuth round-trip completes in `OnboardingFlow`:

```js
import { logConsent } from "../legal";

await logConsent(supabase, {
  userId: user.id,
  kind: "account",
  disclosureText:
    "By continuing you agree to the Terms of Service and Privacy Policy.",
});
```

**At subscribe confirmation**, before you call `startCheckout` / `store.purchase`:

```js
await logConsent(supabase, {
  userId: user.id,
  kind: "autorenew",
  // The literal label next to the checkbox — with the real rendered dates.
  disclosureText: autoRenewLabel,        // see Step 5
  meta: { plan, price, trialEndsOn, firstChargeOn },
});
```

Pass the **rendered** string, dates and all. `"$8.99/mo"` proves nothing; `"first charge $8.99 on 2026-08-17"` proves what they saw.

**At COPPA consent**, when the parent responds to the direct notice:

```js
await logConsent(supabase, {
  userId: user.id,
  kind: "coppa_vpc",
  disclosureText: `Parental Consent Notice v${LEGAL_DOCS["parental-consent"].version}`,
  meta: {
    method: "email-plus",             // 16 CFR §312.5(b)(2)(viii)
    noticeSentAt,
    consentReceivedAt,
    confirmationSentAt,               // the "additional step"
    childProfileId,
  },
});
```

Record **all three** timestamps. The two-step structure is what makes email-plus a valid enumerated method; the confirmatory message is part of the method, not a courtesy. If you are ever asked to prove consent, the gap between receipt and confirmation is the fact in dispute.

### Building the email-plus flow

1. **Send the direct notice** to the parent's account email when they begin creating their first child profile. It must be *delivered* — a link the parent never opens is not delivery, so send the notice content itself, not just a link to it.
2. **Parent responds** with consent — a reply, or a one-tap confirmation link in the message.
3. **On receipt**, write the `kid_profiles` row and the `consent_events` row in the same transaction. **Nothing about the child touches the database before this point** — §312.5(c)(1) lets you hold the parent's contact details for the sole purpose of getting consent, and nothing more.
4. **Send the confirming message**, carrying (a) what they consented to, (b) that consent can be revoked, and (c) a working revocation link. **The revocation notice is required in terms by §312.5(b)(2)(viii)** — omit it and the method fails.
5. **Build the revocation endpoint before launch.** It must delete the child profile and all associated data and stop collection. An advertised revocation link that 404s is worse than not offering one.
6. **No consent within a reasonable time** → delete the parent's contact information and any names held. Run this as a scheduled job, not as an intention.

> ⚠️ **Two open points for counsel.**
>
> **Is consent complete at step 2 or step 4?** The rule says "an email **coupled with** additional steps," which reads as though both are constitutive — but also "following receipt of consent," which reads as though consent arrived at step 2. The FTC has never resolved it and there is no enforcement action on the gap. It determines whether the child can start practising while the confirmation is pending; the conservative answer is no.
>
> **Deliverability is now a compliance dependency, not just a growth one.** If the notice lands in spam, consent never completes and the account is stuck. Use a reputable transactional sender, authenticate the domain (SPF, DKIM, DMARC), monitor bounce and complaint rates, and give parents a "resend" control plus a support path at {{SUPPORT_EMAIL}} for when it fails.
>
> **If the friction proves costly**, the alternatives are text-plus (§312.5(b)(2)(ix), same two-step shape by SMS) or the payment-transaction method (§312.5(b)(2)(ii)) — the latter is free of extra steps but requires a real charge, which a $0 trial does not provide.

**Also log the arbitration opt-out window.** Terms §19.7 gives each user 30 days from first acceptance. That clock starts at the `kind: "account"` event, so your `consent_events` table is already the system of record for it — when an opt-out notice arrives at `legal@`, you need to be able to show whether it landed inside the window. Consider a small admin view over this table before launch rather than after the first dispute.

---

## Step 5 — the paywall disclosure block

`PaywallModal.jsx` needs this **above** the plan buttons, with a separate unchecked box. Do not merge it into Terms acceptance — California requires the auto-renewal consent to be its own affirmative act.

```jsx
const trialEnds = new Date(Date.now() + 14 * 864e5);
const fmt = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const price = plan === "annual" ? "$54.99/year" : "$8.99/month";

const autoRenewLabel =
  `I understand my 14-day free trial ends on ${fmt(trialEnds)}, ` +
  `that my payment method will then be charged ${price}, ` +
  `and that it renews automatically until I cancel.`;

<label className="flex gap-3 items-start mt-5 text-left">
  <input
    type="checkbox"
    checked={autoRenewAck}
    onChange={(e) => setAutoRenewAck(e.target.checked)}
    className="mt-1 h-5 w-5 shrink-0"
  />
  <span className="text-sm text-slate-600 leading-relaxed">{autoRenewLabel}</span>
</label>

<p className="mt-3 text-xs text-slate-500">
  Cancel anytime in one step from{" "}
  <Link to="/account/billing" className="underline">your billing settings</Link>.{" "}
  <Link to="/terms" className="underline">Terms</Link> ·{" "}
  <Link to="/privacy" className="underline">Privacy</Link>
</p>
```

Disable both plan buttons until `autoRenewAck` is true. Never pre-check it.

Mirror the same disclosure in `ios/KidMath/Views/PaywallView.swift` — the StoreKit sheet is *not* allowed to be the first place the terms appear, and the same block must also exist in `FirstFlightView.swift`, which carries its own paywall.

---

## Step 6 — the billing portal (highest-priority gap)

There is no way for a web subscriber to cancel today. Add `supabase/functions/stripe-portal/index.ts` calling `stripe.billingPortal.sessions.create`, configured for **immediate cancellation with no retention flow**, and link it from account settings.

Rules the flow must satisfy: one click after sign-in (Colorado); no survey, no phone, no email requirement; full mobile-web parity — "use a desktop" was a named FTC violation in *Chegg*. If you ever add a save offer, an equally prominent cancel button must sit beside it (California) and you must suppress the offer entirely for Minnesota users.

---

## Step 7 — retention purge

`supabase/migrations/20260803130000_diagnostics_retention.sql`:

```sql
-- §312.10 prohibits indefinite retention, and the published privacy policy
-- now commits to 90 days for diagnostics. This is what makes that true.
create extension if not exists pg_cron;

create or replace function public.purge_old_diagnostics()
returns void language sql security definer as $$
  delete from public.session_diagnostics
   where started_at < now() - interval '90 days';
$$;

select cron.schedule(
  'purge-session-diagnostics',
  '17 4 * * *',
  $$select public.purge_old_diagnostics()$$
);
```

Then verify it actually ran — an unverified cron job is a promise, not a control. Section 6 of the security program says check monthly.

Also add the matching purge for inactive accounts (24 months + a warning email) once you have an email sender wired.

---

## Step 8 — iOS

`AppLinks` in `ios/KidMath/Services/SupabaseConfig.swift` currently points at `https://kidmath.vercel.app/privacy`. Fix it and add the siblings:

```swift
enum AppLinks {
    static let privacyPolicy = URL(string: "https://larkit.io/privacy")!
    static let terms         = URL(string: "https://larkit.io/terms")!
    static let security      = URL(string: "https://larkit.io/security")!
}
```

Every one of these is an external link, so in the Kids Category **each must sit behind `ParentalGateView`**. `AboutView` already does this correctly. `FirstFlightView` does not gate anything — purchase, sign-in, or link — and it's the first screen a reviewer sees.

Update `ios/KidMath/Resources/PrivacyInfo.xcprivacy` to declare the child profile fields. Today it lists email, user ID, and other user content; it does not represent first name, age, or grade. Add:

```xml
<dict>
  <key>NSPrivacyCollectedDataType</key>
  <string>NSPrivacyCollectedDataTypeName</string>
  <key>NSPrivacyCollectedDataTypeLinked</key><true/>
  <key>NSPrivacyCollectedDataTypeTracking</key><false/>
  <key>NSPrivacyCollectedDataTypePurposes</key>
  <array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
</dict>
```

Add a matching `NSPrivacyCollectedDataTypeOtherDataTypes` entry for age and grade, and mirror all of it in the App Store Connect nutrition labels — the manifest and the labels are checked against each other.

---

## Step 9 — register the test

`npm run test` is a hand-maintained file list, not a glob. Add:

```
src/__tests__/legalDocs.spec.js
```

Without this the spec silently never runs, which is the exact failure mode your CLAUDE.md already warns about for `choiceGeneration.spec.js`.

---

## Step 10 — remove the third-party font call

`index.html` lines 12–14 preconnect to `fonts.googleapis.com` / `fonts.gstatic.com` and pull three families. Every page load hands a child's IP address to Google.

```bash
npm i @fontsource/fredoka @fontsource/nunito @fontsource-variable/ibm-plex-mono
```

Import them in `src/index.css`, delete all three `<link>` tags. This removes a name from your third-party disclosure, keeps the email-plus consent route available to you, and takes a cross-origin DNS + TLS handshake off the critical path.

---

## Step 11 — assent mechanics (this is what actually makes the Terms enforceable)

The best-drafted Terms in the world lose on a motion to compel arbitration if you cannot prove what the user saw. Nearly every such motion turns on the declaration establishing the assent screen, not on the contract language.

**Use clickwrap, not browsewrap.** A footer link with no affirmative act is routinely unenforceable (*Nguyen v. Barnes & Noble*, 9th Cir. 2014). The link must be **visually distinguishable** — blue and underlined is the safe harbor — and **immediately adjacent to the action button**, with language tying the click to assent: *"By tapping Start Free Trial, you agree to the Terms of Service and Privacy Policy."* Grey, small, or non-obviously-linked text fails (*Berman v. Freedom Financial*, 9th Cir. 2022); an uncluttered screen with a conspicuous adjacent link succeeds (*Meyer v. Uber*, 2d Cir. 2017).

**Keep the assent screen uncluttered.** Competing calls-to-action around the button are the fact pattern that loses.

**Capture the evidence at assent time**, not later: account ID, timestamp, IP and user agent, the exact **version strings** of both documents displayed, and a stored HTML or image snapshot of the screen as rendered on that date. `consent_events` covers the first four; add the snapshot. Retain the full version history of every document — `git log src/legal/` is your archive, so never rewrite that history.

---

## What still needs a human

Everything above you can execute. Take these to a lawyer — a few hours of specialist review, not a retainer:

1. **The arbitration agreement (Terms §19).** This is the single most consequential clause and the one where drafting choices have real consequences. It is drafted to current market practice — 60-day informal-resolution precondition, AAA consumer rules, hearing in the consumer's own county, small-claims and public-injunctive carve-outs, mass-arbitration batching, a 30-day opt-out, and a blow-up clause on the class waiver. **Confirm you want arbitration at all.** Trade-off: it caps class-action exposure, which for a subscription business facing California ARL claims is the main event — but school districts sometimes object to it in procurement, and it is not free to administer. Removing it means deleting §19 and the front-matter call-out, and relying on §20 alone.
2. **The `consent_events` cascade-vs-retention split** in Step 3 — the one place two legal obligations genuinely conflict.
3. **The rendered checkout and cancellation screens**, once built — the actual screens, not the spec.
4. **The email-plus VPC script and timing**, and whether the interval between the two steps is defensible.
5. **The limitation of liability, indemnity, and governing-law provisions** against Delaware law and against the consumer statutes of your highest-volume states.
6. **Terms §13 (educational disclaimer)** against whatever efficacy claims your marketing actually makes. If marketing says "raises test scores," §13.3 and the marketing cannot both stand.
