# larkit — Legal & Compliance Plan
**Prepared 3 August 2026 · retail launch (web + iOS) first, schools/districts later**

*I'm not a lawyer and this isn't legal advice. It's an engineering-grade map of what applies, what your code does today, and what to fix in what order — written so that when you do hire counsel, you're paying them to review decisions rather than to discover your product.*

---

## 1. The short answer

**Yes, you need documents — but the number is smaller than you think, and the *product changes* are the expensive part, not the writing.**

| Question | Answer |
|---|---|
| Privacy policy? | **Required.** You have one. It is materially incomplete against the COPPA Rule as amended — whose full-compliance date passed on **22 April 2026**. |
| Terms of Service / EULA? | **Required, and you have none.** `SignupPage.jsx` links the word "Terms" to `/privacy`. Apple Guideline 3.1.2(c) requires a real Terms link in-app for auto-renewing subscriptions. |
| Cookie consent banner? | **No — not in the US.** See §6. Do three cheap things instead. |
| Other agreements? | A published **data retention policy** (inside the privacy notice) and an internal **written children's-data security program**. Both are now black-letter COPPA requirements, not best practice. |
| Biggest actual risk? | Not privacy documents. It's (a) **no verifiable parental consent mechanism**, (b) **auto-renewal subscription law**, and (c) **no in-app account deletion** — which is a flat App Store rejection. |

The through-line: **the laws you can't escape (COPPA, ROSCA, state auto-renewal laws, the App Store Accountability Acts) have no size threshold. The laws you're probably exempt from (state comprehensive privacy acts like CCPA/CPRA) are the ones cookie-banner vendors will try to sell you.** Spend your effort accordingly.

---

## 2. What your code actually does

I read the repo before reading the law. This is the ground truth the documents have to describe honestly.

**You collect, from or about children under 13:**

| Data | Where | Notes |
|---|---|---|
| Child first name, age (5–12+), grade (K–6th) | `kid_profiles` table, `src/kidProfiles.js` | Entered by the parent, stored in the cloud, joined to a persistent `user_id` |
| Practice progress — levels, stars, answered items, mistake bank | `progress` tables, `progressStore.js` | Generated *by the child*, in real time |
| Engagement state — stickers, streaks, badges | localStorage only (v1) | Local; low risk today, becomes cloud data at sync |
| User agent, platform, viewport, DPR, **CPU cores, device memory, max touch points, reduced-motion**, random session ID | `session_diagnostics` table, `telemetry/telemetryClient.js` | **On by default, for anonymous visitors, with no notice and no retention limit** |
| Parent email + account ID | Supabase Auth via Apple/Google OAuth | Adult data — outside COPPA, but disclosed |

**Third parties your web app contacts:** Supabase (auth/DB), Vercel (hosting), **Vercel Web Analytics + Speed Insights** (`App.jsx` mounts `<Analytics />` and `<SpeedInsights />`), **Google Fonts CDN** (`index.html` links `fonts.googleapis.com` / `fonts.gstatic.com`), Stripe (web checkout), Apple StoreKit (iOS).

### The gap list

**Privacy policy (`src/PrivacyPage.jsx`) — nine specific problems:**

1. **Doesn't mention `kid_profiles` at all.** It says *"Children never need to create an account to practice on the free web tier"* — true but beside the point. You store a child's first name, age, and grade in the cloud. That has to be in the notice.
2. **No general data retention policy.** You *do* commit to completing deletion requests within 30 days — good, keep it — but §312.10 now requires a written retention policy stating the purposes, the business need, and **a deletion timeframe for data you're holding**, and it expressly prohibits indefinite retention. `session_diagnostics` has no retention limit anywhere in the repo: no TTL column, no `pg_cron` job, no cleanup script.
3. **One unnamed third party: Vercel.** You do name Apple, Google, Stripe, and Supabase — better than I first assumed. But §312.4(d)(2) requires "the identities **and** specific categories," and Vercel is running analytics on every page while going unmentioned. Google Fonts is also an undisclosed third-party call.
4. **No "specific internal operations" disclosure.** §312.4(d)(3) is new: if you rely on the persistent-identifier / internal-operations exception (you do, for telemetry and auth), you must state *which* internal operations and *what safeguards* prevent other uses.
5. **The analytics sentence is engineered.** *"No third-party analytics or behavioral tracking **in the iOS app**"* — technically accurate, and the web app runs two Vercel products. A reader takes away "no third-party analytics." That's an FTC Act §5 deception exposure and it's entirely self-inflicted.
6. **No mention of session diagnostics.** Zero.
7. **Deletion is "email privacy@larkit.io."** Apple requires in-app deletion (§5.1.1(v)). Also, `docs/ios-appstore-checklist.md` still says the contact is `privacy@kidmath.app`.
8. **"Last updated: July 21, 2026"** but `kid_profiles` shipped 2 August.
9. **Says purchases are protected by a parental gate "on iOS"** — but see §7: the first-run flow bypasses the gate, and the web paywall has no gate at all.

**Missing entirely:**
- **Terms of Service / EULA.** Zero matches repo-wide for `/terms`, `TermsPage`, or `EULA`. Both `SignupPage.jsx:71` (web) and `FirstFlightView.swift:271` (iOS) tell the user they're agreeing to "the Terms" — the web links it to `/privacy`, the iOS copy doesn't link it at all.
- **Written children's-data security program** (§312.8(b)) — internal doc, five mandatory elements, annual review.
- **Verifiable parental consent.** Google/Apple OAuth is authentication, not VPC. Apple says so explicitly in Guideline 5.1.4.
- **In-app account deletion.** Nothing on web (`Navbar.jsx` has sign-out only; there's no settings page) and nothing on iOS (`SettingsView.swift:76` is sign-out only).
- **Sign in with Apple token revocation** on delete — no `revoke` anywhere in the Swift source.
- **A Stripe billing portal.** `PaywallModal.jsx:110` says "Cancel anytime from your billing portal," but `supabase/functions/` contains only `stripe-checkout` and `stripe-webhook`. There is no portal, so **there is currently no way for a web subscriber to cancel online** — which is itself a violation in every state with an auto-renewal law.

**Security/architecture items that become legal items later:**
- `session_diagnostics` RLS is `insert to anon with check (true)` and `update ... using (true)`, and upserts key on a client-generated `session_id`. Anyone holding the anon key — which ships in the client bundle — can overwrite arbitrary rows or flood the table. Reads are admin-only, so this is write-anything, not read-anything. Separately, the beacon path passes the anon key **in a URL query string** (`telemetryClient.js:269`), which puts it in proxy and CDN logs.
- Your own `CLAUDE.md` notes `entitlements` is a **v1 client-write trust model**. That's a revenue risk now and a procurement blocker later.
- `AppLinks.privacyPolicy` still points at `https://kidmath.vercel.app/privacy`, not larkit.io.
- *(Correction from an earlier draft: `/admin` and `/diagnostics` in `App.jsx` aren't wrapped in `RequireAdmin`, but both page components wrap themselves internally, and RLS backs it server-side. Not a hole — just a style inconsistency.)*

---

## 3. Documents you need for retail launch

Five artifacts. Two are public pages, one is a public section, two are internal.

### 3.1 Privacy Policy *(rewrite, don't patch)*

Must contain, at minimum:

- What you collect, split into **parent data** and **child data**, naming `kid_profiles` fields explicitly
- **How** you use each category (the amended Rule requires use, not just collection)
- **Named third parties** — Supabase, Vercel, Stripe, Apple, Google — with the purpose of each
- A **Data Retention section with real numbers.** Suggested: session diagnostics 30–90 days; child profile and progress deleted within 30 days of account deletion; inactive accounts purged after 24 months with prior notice; billing records retained 7 years for tax. Say it, then build the scheduled deletes that make it true.
- The **specific internal operations** the persistent identifiers support, and the safeguards
- A **Children's Privacy (COPPA)** section describing your VPC mechanism, and the parent's rights to review, delete, and refuse further collection (§312.6)
- Parents may consent to collection/use **without** consenting to third-party disclosure, unless integral (§312.5(a)(2))
- Contact, effective date, change-notification commitment

**Also write a child-readable one-paragraph version.** Not required in the US today. It's cheap, it's the right thing, and the UK Children's Code requires it if you ever touch the UK.

### 3.2 Terms of Service *(new — this is the missing document)*

Needs: license grant and restrictions; **the account is the parent's**, and the parent represents they're the legal guardian of each child profile; acceptable use; **subscription terms** (see §5 — this section carries real legal weight); the free tier and what's in it; IP ownership; disclaimers and limitation of liability; dispute resolution; governing law; **and no unilateral amendment right** — write it that way now, because that single clause is what kills district legal review later and it's free to avoid today.

On iOS you can use Apple's standard EULA or your own. Use your own — you need the subscription and guardian-representation terms in it.

### 3.3 Data Retention Policy — a **section inside** the privacy policy, not a separate page. §312.10 requires it *in the notice*.

### 3.4 Written Children's Personal Information Security Program *(internal, §312.8(b))*

Five mandatory elements: name a responsible person (you); identify internal and external risks with an **annual** assessment; document the safeguards; test and monitor them regularly; evaluate and modify the program annually. Two or three pages. Not published — but you must have it, and it's the first thing a district or the FTC asks for.

You also need **written assurances** from Supabase, Vercel, and Stripe that they'll protect children's data (§312.8(c)). Their standard DPAs generally do this — go download and file them.

### 3.5 Vulnerability Disclosure Policy *(one page, optional now, high leverage later)*

Costs you an afternoon. Unlocks CISA K-12 pledge credit and a breach-notification carve-out in the standard district data privacy agreement. Write it whenever you have a spare hour.

---

## 4. Verifiable parental consent — the hard one

This is the design decision with no clean answer, so it deserves its own section.

**The doctrine:** COPPA attaches to personal information collected *from* children. The FTC's own FAQs (A.8, F.4) say information an *adult* provides *about* a child isn't covered. So a parent typing "Maya, 7, 2nd grade" into a parent-authenticated dashboard is, on its face, outside the collection trigger. That's exactly why parent-account-with-child-sub-profiles is the dominant architecture in kids' edtech, and your instinct to build it that way was right.

**But three things pull you back in:**

1. **The child is the actual user.** Levels, stars, and answered items are generated by a 7-year-old interacting with your service, stored against a persistent ID. That's PI collected from a child.
2. **The service is child-directed** under the §312.2 multi-factor test — themes, stickers, star wallets, badges, a journey map, K-5 subject matter. A child-directed service must treat all visitors as children (FAQ D.4).
3. **First name alone isn't PI; first name + age + grade + persistent identifier + behavioral record is** — the definition's "combines with an identifier" clause.

**Conclusion: get VPC before the child's first synced session.**

**The trap in your specific model:** the credit-card VPC method requires the card be used *in connection with a monetary transaction* (FAQ I.5). Your 14-day trial captures a card and charges **nothing**. A $0 authorization doesn't qualify.

**Recommended path:**

- Use **"email plus"** (§312.5(b)(3)) during signup — an email to the parent obtaining consent, plus a second confirming step after a reasonable delay. It is permitted **only if you don't disclose child PI to third parties**, which means the fonts and analytics cleanup in §6 isn't cosmetic — it's what keeps this method available to you.
- Treat the first real $8.99/$54.99 charge as reinforcing consent.
- Keep the free/anonymous tier **genuinely account-free** — no name, no age, no grade, no cloud sync. It's your no-consent-needed on-ramp, and later it's the thing that lets a teacher pilot larkit without a data agreement. Protect it deliberately.

**Also consider a COPPA Safe Harbor program** (kidSAFE, PRIVO, ESRB Privacy Certified). Costs a few thousand dollars a year. Buys you a badge parents recognize, a badge district buyers recognize, and it moves routine oversight from the FTC to the program. For a solo founder in a child-directed category, this is one of the better dollar-for-dollar risk purchases available.

---

## 5. Auto-renewing subscriptions — the sleeper risk

**This is more likely to cost you money in the next 24 months than anything in the privacy section, and your paywall doesn't comply today.**

The FTC's "click-to-cancel" rule was vacated by the Eighth Circuit in July 2025 — *on procedural grounds only*, and the FTC re-opened rulemaking with an ANPRM in March 2026. Meanwhile the FTC enforces under ROSCA and §5 aggressively: **Amazon $2.5B** (Sept 2025), **Chegg $7.5M** (Sept 2025), **Shutterstock $35M** (May 2026), **Uber pending with 21 state AGs joined**. And roughly a dozen states have their own auto-renewal laws with **private rights of action**. California's §17603 deems services delivered in violation an "unconditional gift" — plaintiffs use it to seek refund of *all* subscription revenue in the class period.

**What `PaywallModal.jsx` is missing:**

- ❌ No separate, unchecked checkbox consenting **specifically to auto-renewal** (California requires this to be distinct from ToS acceptance — and Stripe's built-in ToS checkbox does *not* satisfy it)
- ❌ No trial end **date** ("14-day free trial" isn't enough — render the actual date)
- ❌ No first-charge date or amount stated together
- ❌ **No cancellation path at all on web.** "Cancel anytime from your billing portal" (`:110`) is static text with no link, and no billing-portal function exists. Online signup with no online cancel is a straight violation in CA, CO, IL, VA, MA, CT, NY and NYC. **This is the single most exposed thing in the codebase — fix it first.**
- ❌ No Terms or Privacy links (also an Apple 3.1.2(c) violation independently)
- ❌ No consent event logged — California requires retaining proof for **3 years, or 1 year post-termination, whichever is longer**

**Build to this and you're compliant nationally:**

*Before the card form / before the Stripe redirect,* in the same visual frame as the consent control:

- [ ] It automatically renews until cancelled
- [ ] Trial length **and the actual end date**
- [ ] The exact amount charged at conversion, and the exact date
- [ ] Renewal frequency and recurring amount
- [ ] How to cancel, with a working link
- [ ] Separate unchecked auto-renewal checkbox, never pre-ticked, distinct from ToS
- [ ] Log timestamp + IP + disclosure copy version + checkbox state

*Confirmation email, immediately, retainable:* full terms restated, trial end and first charge date/amount, cancellation policy in full, step-by-step cancel instructions with a **deep link** (not your homepage), legal business name and address. For iOS purchasers, Apple-specific cancel steps.

*Reminders — a merged schedule that satisfies every state:*

| When | Why |
|---|---|
| **Day 11 of trial** (3 days before conversion) | Utah requires it for *any* trial. Also your single best chargeback reducer. |
| **35 days before each annual renewal** | Lands inside NY (15–45), Utah (30–60) and Illinois (30–60) simultaneously |
| **Annually, every subscriber including monthly** | Connecticut and Minnesota require this regardless of term length |
| **10–14 days before any price change** | CA (7–30) and NY/MA (5–30); NY also needs re-consent or a prorated-refund window |

*Cancellation flow:* signed up online → must cancel online. One click after authentication (Colorado). If you show a save offer, an equally prominent cancel button must sit right next to it (California) — and suppress save offers entirely for Minnesota. **Full mobile parity** — "use a desktop to cancel" was a named Chegg violation. No surveys, no confirmation chains.

**Neither Apple nor Stripe discharges these.** Apple covers consent capture and cancellation mechanics well. Stripe covers payment. **Disclosure, acknowledgment, and reminders are yours on both platforms.** Drive the web reminders off Stripe's `customer.subscription.trial_will_end` (fires 3 days out by default — exactly Utah's requirement) and the iOS ones off StoreKit Server Notifications V2.

Your 14-day trial sits one day under Illinois' 15-day trigger and exactly at Maryland's threshold. **Don't rely on the margin.** Send the day-11 reminder to everyone and the question disappears.

---

## 6. Cookie consent — you don't need a banner

**US: no banner.** Every US state privacy law is an opt-out regime for adults; there's no American equivalent to the EU's prior-consent rule. With no ads, no data sale, no cross-context sharing, and first-party analytics only, there's nothing for a US visitor to opt out of at the cookie layer. You're also almost certainly below every state threshold — though watch **Montana (25k users)** and **Connecticut (35k)**, which you'll trip first, and note that **Texas has no numeric threshold** (it uses an SBA small-business test that isn't total).

**What you actually need instead:**

- A privacy policy — required regardless of thresholds by CalOPPA (no size threshold), COPPA §312.4, and Apple Guideline 3.1.2(c). CalOPPA also wants a Do Not Track disclosure.
- No "Do Not Sell or Share" link and no Global Privacy Control obligation — **as long as you never add an ad SDK or a Meta/Google pixel.** The day you do, both flip on in about ten states at once, and Maryland flatly prohibits targeted advertising to minors with no consent option.

**Do these four things instead of buying a consent platform:**

1. **Self-host your fonts.** Remove `fonts.googleapis.com` and `fonts.gstatic.com` from `index.html`, including the `preconnect` tags. Use `@fontsource/*` or drop the WOFF2s in `/public`. This kills a third-party IP transfer, removes a name from your COPPA third-party disclosure, and speeds up first paint. There's no argument for keeping it.
2. **Fix the session-diagnostics telemetry.** As written it collects `hardwareConcurrency`, `deviceMemory`, viewport geometry, user agent, and a session ID from **anonymous child visitors, on by default, with no notice**. That's the textbook fact pattern for California CIPA pen-register class actions — **$5,000 per user statutory damages, no size threshold, and first-party-only collection is not a defense.** Fix: drop the hardware fingerprint fields (ask what each buys you diagnostically — UA and a coarse breakpoint cover almost all triage), gate it behind authentication or explicit opt-in, set and enforce a 30–90 day retention, never join the session ID to a user record, and disclose it plainly.
3. **Honor Global Privacy Control** as a kill switch for telemetry. `navigator.globalPrivacyControl === true` → skip the write. Five lines. Evidence of good faith, and it doubles as your UK opt-out mechanism.
4. **Geo-suppress the discretionary trackers for EU/UK IPs.** Vercel hands you `x-vercel-ip-country` at the edge for free. Middleware conditional, not a consent platform.

**EU/UK:** don't geo-block — it's user-hostile and Apple distributes globally by default. The EDPB is explicit that mere accessibility of a website doesn't establish targeting. So: **stay USD-only, English-only, no `.eu` domain, no EU address or phone, no EU-directed marketing, no EU-language localization.** With #4 above, EU visitors get a fully functional tracker-free experience and the whole question is moot. One caveat worth knowing: the EU rule covers *reading information from the device*, not just cookies — so "cookieless" analytics like Vercel's doesn't exempt you there. Suppression does.

The UK is actually friendlier now — the Data (Use and Access) Act 2025 created a **first-party analytics exemption** effective 5 February 2026, conditioned on clear notice plus a working opt-out. Your GPC handler satisfies the opt-out half.

---

## 7. iOS-specific — what blocks review

**The Kids Category decision is a one-way door. Make it deliberately, before first submission.** Apple: once customers expect Kids Category behavior, *"it will need to continue to meet these guidelines in subsequent updates, even if you decide to deselect the category."*

The forcing function is **Guideline 2.3.8**: terms implying children are the main audience are *reserved* for the Kids Category. Your metadata says *"Adaptive K-5 math practice… for kids."* Either commit to the Kids Category or rewrite all of your App Store copy. Your checklist already assumes Kids Category — I think that's right for you (no ads, no chat, no data selling, parental gate already built in `ParentalGateView.swift`), but understand the tax: **the paywall, the privacy policy link, and every external link go behind the gate.**

### ⚠️ The parental gate has a hole, and it's in the screen review will exercise first

`ParentalGateView.swift` is well built — spelled-out operands so pre-readers can't pattern-match the digits — and it's correctly wired into three places: the paywall's purchase and restore buttons (`PaywallView.swift:54`), the external privacy-policy link in About (`AboutView.swift:85`), and unlocking sign-in in Settings (`SettingsView.swift:124`).

**But `FirstFlightView.swift` — the first-run onboarding presented via `HomeView.swift:59` — contains no reference to `ParentalGate` at all.** It bypasses the gate on all three surfaces: purchase (`:568` and `:585` call `app.store.purchase(product)` directly), sign-in (`SignInWithAppleButton` at `:219`, Google at `:238`), and the external privacy link (`:278`).

That's the screen every new user sees, it carries the soft paywall, and it's the path App Review is most likely to walk. Fix this before submission. While you're in there: the gate dismisses silently after three wrong answers with no lockout — a determined 8-year-old gets unlimited retries by reopening it.

**Blocking items:**

| Item | Status |
|---|---|
| **New age-rating questionnaire** | Deadline was **31 Jan 2026**. Unanswered = App Store Connect blocks all submissions. **No grace period.** Do this first. |
| **Parental gate on first-flight** | **Missing.** See above. Kids Category rejection risk. |
| **In-app account deletion** (5.1.1(v)) | **Missing.** Must delete, not deactivate. Must purge child profiles and progress, not just the login. |
| **Sign in with Apple token revocation** on delete | **Missing.** Common rejection cause. |
| **Terms of Use link in-app** (3.1.2(c)) | **Missing.** Title, length, price, Privacy *and* Terms links, all before purchase. |
| **Texas SB 2420** | **Live now.** Enforceable since the Fifth Circuit stay (May 2026); SCOTUS declined emergency relief 6 July 2026. Merits appeal still pending. |

**For Texas** you need four Apple integrations: **Declared Age Range API** (returns an age *range*, never a birthdate, with a `guardianDeclared` flag), **Significant Change API** for parental re-consent, **StoreKit `AppStore.ageRatingCode`**, and **App Store Server Notifications** handling `RESCIND_CONSENT` to block launch when a parent revokes. Note the trap: **an age-rating change automatically triggers parental re-consent.** Get the rating right the first time.

The Declared Age Range signal is a strong assurance signal — **but it is not COPPA verifiable parental consent**, and Apple doesn't claim it is. Utah's developer duties land May 2027, Louisiana's July 2027, California's AB 1043 January 2027 (and AB 1043's "across all platforms" clause reaches larkit.io on the web, not just the app). Build the age-signal plumbing once.

**Update `PrivacyInfo.xcprivacy` and your nutrition labels** to include the child profile fields. Right now the manifest declares email, user ID, and "other user content." First name, age, and grade aren't represented.

---

## 8. Sequenced plan

### Phase 0 — before you take a single dollar *(2–3 weeks, mostly writing)*

1. Answer the App Store Connect age-rating questionnaire. **Blocking; do it today.**
2. Rewrite the privacy policy against the nine gaps in §2.
3. Write the Terms of Service. No unilateral amendment clause.
4. Write the internal children's-data security program. Collect DPAs from Supabase, Vercel, Stripe.
5. Self-host fonts. Delete the Google Fonts links.
6. Fix session diagnostics: drop hardware fields, set 30–90 day retention with a scheduled delete, honor GPC, don't run for anonymous visitors by default.
7. **Ship the Stripe billing portal.** No web subscriber can cancel online today. Highest-exposure item in the repo.
8. Fix the paywall against the §5 checklist — both `PaywallModal.jsx` and the iOS `PaywallView`.
9. Build in-app account deletion, including Apple token revocation and a real purge of `kid_profiles` + progress.
10. **Wire the parental gate into `FirstFlightView`** — purchase, sign-in, and the privacy link.
11. Decide Kids Category, and align App Store copy with the decision.
12. Point `AppLinks.privacyPolicy` at larkit.io; fix the `privacy@kidmath.app` reference in the checklist doc.
13. Stop passing the anon key in the telemetry beacon's query string.

### Phase 1 — at launch

11. Implement VPC (email-plus), with the direct notice shown when the parent creates the first child profile.
12. Texas: Declared Age Range + Significant Change + `ageRatingCode` + `RESCIND_CONSENT`.
13. Reminder emails — day-11 trial, annual renewal, price change.
14. Geo-suppress trackers for EU/UK.
15. Consent event logging with the 3-year retention.

### Phase 2 — first 6 months, while you have paying users

16. COPPA Safe Harbor certification (kidSAFE or PRIVO).
17. Harden entitlements — server-side receipt validation via Edge Function. Your own `CLAUDE.md` flags this.
18. Tighten the `session_diagnostics` RLS policies.
19. Publish the vulnerability disclosure policy.
20. **Start the accessibility audit.** See below — this is your long pole and it doesn't get shorter by waiting.

---

## 9. Schools and districts — what changes

Three things are worth knowing now, because two of them are cheap now and expensive later.

**1. The FTC did *not* codify a school-consent exception in 2025.** They proposed it and explicitly declined to finalize, to avoid conflicting with a pending Department of Education FERPA rulemaking. So there's no safe-harbor regulatory text to point at — you rely on 1999-era FTC guidance plus a written school agreement. Expect this to move in the next 12–24 months.

**2. Keep the D2C and school consent paths architecturally separate from day one.** School-provided consent covers educational use only, with no commercial purpose. If school-channel data ever flows into a consumer marketing surface, you've broken the exception. This is the single most common structural error when a D2C app adds a school channel, and it costs nothing to prevent while you have one code path.

**3. Two things to do *now* because they're free now:**

- **No unilateral amendment clause in your ToS.** That clause defeats the "direct control" test districts need for the FERPA school-official exception. Writing it correctly today costs nothing; renegotiating later costs a deal.
- **Publish a data inventory** — every field, purpose, retention. Colorado requires vendors to post this on their own site, it's Exhibit B of the standard district agreement, and it's the core of New York's supplemental-information requirement. Write it once, reuse it five ways. You're writing most of it for the privacy policy anyway.

**When you actually chase districts,** the highest-leverage single artifact is the **SDPC National Data Privacy Agreement (NDPA v2.2)** with **Exhibit E signed**. Exhibit E is a "general offer" — sign one standard NDPA with one district, and every other district in the registry can adopt identical terms without renegotiation. That turns a per-district legal negotiation into a per-district checkbox. Protect it by refusing all redlines outside Exhibit H, which is the only place non-mandated modifications may go.

Pick **NIST CSF** as your named security framework — it satisfies New York's Part 121 requirement and the NDPA's Exhibit F simultaneously. Engineer your breach-response plan to **New York's 7-calendar-day clock**; it's the tightest, and one clock is simpler than fifty.

**Don't chase New York or Illinois first.** They carry the highest per-state compliance cost and name statutory penalties running against the *vendor*. Start in a SOPIPA-style state with an active SDPC alliance.

**Two more:** the Student Privacy Pledge was **retired in April 2025** — don't build toward it, and remove any reference if you have one. And **SOC 2 Type II can wait** — it needs a 3–12 month observation window, so start it about two quarters before your first district over ~25,000 students, not before.

### The real schedule risk is accessibility, not privacy

Districts require **WCAG 2.1 AA** and a completed **VPAT/ACR**. DOJ's Title II deadlines were extended in April 2026 to **26 April 2027** and **26 April 2028** — but that buys *districts* time, not you. They procure ahead of their deadlines, and OCR complaints are live today.

Your exposure is concentrated in exactly the components that make larkit good: `NumberLine`, `AnalogClock`, `CoinTray`, `FractionInput`, `TenFrame`, `PlaceValueDiscs`, `NumberBond`, `BarModel`. Each needs keyboard operability, correct ARIA roles and live regions, visible focus, non-color-dependent state, and screen-reader-meaningful math semantics. **A drag-based `CoinTray` with no keyboard path is a hard WCAG 2.1 AA failure (SC 2.1.1).** On iOS the equivalent is VoiceOver, Dynamic Type, and Switch Control.

Privacy is documents you can write in a month. This is engineering against a codebase built for mouse and touch. **Audit the widget layer before you promise anything in an ACR**, and start it well before you need it.

---

## 10. What to take to a lawyer

Don't hand them "review my app." Hand them these five, which is maybe 3–5 hours of specialist time:

1. **The VPC decision.** Email-plus vs. charge-and-refund during a 14-day trial. FAQ I.5's "monetary transaction" requirement is genuinely unresolved for trial-first models, and it's your sharpest COPPA question.
2. **The rendered checkout and cancellation flows** — not the spec, the actual screens. California ARL class actions are a growth industry and the "unconditional gift" remedy is the reason.
3. **The Terms of Service**, drafted with the district sale in mind.
4. **Kids Category, yes or no.** One-way door, and it constrains your paywall UX permanently.
5. **The session-diagnostics CIPA exposure**, if you keep collecting from anonymous visitors after the §6 fixes.

Everything else in this document you can execute yourself.

---

## Sources

**COPPA:** [Final rule, 90 FR (22 Apr 2025)](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule) · [16 CFR Part 312](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312) · [§312.4](https://www.ecfr.gov/current/title-16/part-312/section-312.4) · [§312.5](https://www.ecfr.gov/current/title-16/part-312/section-312.5) · [§312.8](https://www.ecfr.gov/current/title-16/part-312/section-312.8) · [§312.10](https://www.ecfr.gov/current/title-16/part-312/section-312.10) · [FTC COPPA FAQs](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) · [Verifiable Parental Consent](https://www.ftc.gov/business-guidance/privacy-security/verifiable-parental-consent-childrens-online-privacy-rule) · [FTC Ed Tech Policy Statement](https://www.ftc.gov/system/files/ftc_gov/pdf/Policy%20Statement%20of%20the%20Federal%20Trade%20Commission%20on%20Education%20Technology.pdf)

**Apple:** [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Parental Gates](https://developer.apple.com/app-store/parental-gates/) · [Age ratings update](https://developer.apple.com/news/?id=ks775ehf) · [Declared Age Range](https://developer.apple.com/documentation/declaredagerange) · [Texas requirements](https://developer.apple.com/news/?id=2ezb6jhj) · [Age assurance Q&A](https://developer.apple.com/support/age-assurance) · [Account deletion](https://developer.apple.com/news/?id=12m75xbj)

**Subscriptions:** [ROSCA, 15 U.S.C. §8403](https://www.law.cornell.edu/uscode/text/15/8403) · *Custom Communications v. FTC*, 142 F.4th 1060 (8th Cir. 2025) · [FTC Negative Option ANPRM (Mar 2026)](https://www.federalregister.gov/documents/2026/03/13/2026-04952/negative-option-rule) · [Cal. B&P §17600 et seq.](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=BPC&division=7.&part=3.&chapter=1.&article=9.) · [FTC v. Amazon settlement](https://www.ftc.gov/news-events/news/press-releases/2025/09/amazon-pay-25-billion-settle-ftc-lawsuit-prime-subscription-practices)

**App Store Accountability:** [FPF TX/UT/LA comparison chart](https://fpf.org/wp-content/uploads/2026/06/FPF-Legislation-TX-UT-LA-App-Store-Accountability-Act-Comparison-Chart.pdf) · [SCOTUS clears Texas ASAA (July 2026)](https://www.infolawgroup.com/insights/2026/7/7/supreme-court-clears-the-way-texass-app-store-accountability-act-is-now-enforceable) · [CA AB 1043](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB1043)

**EU/UK:** [EDPB Guidelines 2/2023 on Art. 5(3)](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en) · [EDPB Guidelines 3/2018 (territorial scope)](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-32018-territorial-scope-gdpr-article-3_en) · [ICO Children's Code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/) · [Vercel Analytics privacy](https://vercel.com/docs/analytics/privacy-policy)

**Schools:** [34 CFR §99.31](https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-D/section-99.31) · [ED Student Privacy vendor FAQ](https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Vendor%20FAQ.pdf) · [SDPC National DPA](https://privacy.a4l.org/national-dpa/) · [Cal. B&P §22584 (SOPIPA)](https://law.justia.com/codes/california/code-bpc/division-8/chapter-22-2/section-22584/) · [8 NYCRR Part 121](https://www.counsel.nysed.gov/sites/counsel/files/rulesandregs/part-121-terms.pdf) · [105 ILCS 85 (SOPPA)](https://www.ilga.gov/Legislation/ILCS/Articles?ActID=3806&ChapterID=17) · [DOJ Title II date extension (Apr 2026)](https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web) · [ITI VPAT](https://www.itic.org/policy/accessibility/vpat) · [CISA K-12 Secure by Design Pledge](https://www.cisa.gov/securebydesign/k-12-education-technology-pledge)
