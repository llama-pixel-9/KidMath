# larkit — Launch Compliance Checklist

**Two parallel tracks.** Track A is engineering and can start today. Track B is paperwork only you can do. They run independently and meet at the gates.

**Companion documents:** `docs/legal-compliance-plan.md` (why each item exists) · `docs/legal-implementation.md` (how to build the Track A items) · `docs/childrens-data-security-program.md` (internal, Track B).

Decisions locked: **single-member LLC** · **Kids Category: yes** · **VPC: email-plus, §312.5(b)(2)(viii)** · **$0 free trial, no verification charge** · **legal content as versioned markdown**.

**Legend:** 🔴 critical — shipping without it means a rejected build, an unenforceable contract, or a violation on every transaction. 🔒 blocked — needs a Track B item first; the blocker is named inline.

---

## The dependency picture

Only four engineering items are genuinely blocked. Everything else in Track A can start now.

| Blocked engineering item | Waiting on | Workaround until then |
|---|---|---|
| Real values in `entity.js` | B1 (LLC formed), B4 (mailboxes live) | Build against the scaffold values. `legalDocs.spec.js` fails on purpose until they're real — that failing test *is* the reminder. |
| Sign in with Apple token revocation | B2 (Apple Developer enrollment as the LLC) | Build the rest of account deletion; leave the revocation call stubbed behind a TODO and a failing test. |
| Texas SB 2420 APIs (Declared Age Range, Significant Change, `ageRatingCode`, `RESCIND_CONSENT`) | B2, B5 (age-rating questionnaire answered) | Nothing — genuinely blocked. Sequence it last in E6. |
| Consent, confirmation, and reminder emails | B7 (pick and configure a transactional email sender) | Build the flows against a local stub that logs the payload; swap the transport in later. B7 is a 30-minute task — do it early and this unblocks itself. |

Everything else below is unblocked as of today.

**One item is time-sensitive in the other direction.** E9 (tenancy) doesn't block launch, but its cost rises with every production family you add — see the note at the head of that workstream. If you expect to chase districts at all, the schema decision in E9a is worth making before you build much more on the current shape.

**Your hosting stack is not a district blocker.** Supabase and Vercel both hold SOC 2 Type II and ISO 27001:2022, publish DPAs and subprocessor lists, and run on AWS. NDPA and NY Part 121 obligations land on the application vendor, not the host. Your Supabase project is already in `us-east-2` — which matters, because **Supabase regions are immutable after project creation.**

---

# TRACK A — ENGINEERING

Eight workstreams. They're ordered by exposure, not by size. **E3 first if you only have one afternoon.**

## E1 — Wire up the legal pages

*Small, self-contained, closes a live App Store rejection risk. Good warm-up.*

- [ ] Add routes `/privacy`, `/terms`, `/security`, `/parental-consent` → `<LegalPage slug=… />`
- [ ] Delete `src/PrivacyPage.jsx`. Leaving it guarantees someone edits the dead copy.
- [ ] Fix `src/onboarding/SignupPage.jsx:71` — the word "Terms" currently links to `/privacy`
- [ ] Fix `ios/KidMath/Views/FirstFlight/FirstFlightView.swift:271` — "Terms" is unlinked text
- [ ] Add a site footer: Privacy · Terms · Security
- [ ] 🔴 **Put a privacy link at every collection point.** §312.4(d) requires a prominent labelled link on the home screen **and at each area where personal information is collected from a child** — a footer alone does not satisfy it. Concretely: footer, `/welcome`, `/signup`, **the add-a-child screen in `OnboardingFlow`**, the paywall, and the iOS equivalents. The add-a-child screen is the one most often missed and the most clearly required.
- [ ] Point `AppLinks` at `larkit.io` — `SupabaseConfig.swift:21` still says `kidmath.vercel.app`
- [ ] Add `src/__tests__/legalDocs.spec.js` to the `test` script list in `package.json` *(hand-maintained list, not a glob — an unlisted spec silently never runs)*
- [ ] 🔒 Fill in `src/legal/entity.js` — **blocked on B1 + B4**

## E2 — Data hygiene

*Shrinks the surface the privacy policy has to describe, and keeps email-plus consent legally available to you.*

- [ ] 🔴 **Self-host fonts.** Remove `fonts.googleapis.com` and `fonts.gstatic.com` from `index.html` lines 12–14, preconnects included. `npm i @fontsource/fredoka @fontsource/nunito @fontsource-variable/ibm-plex-mono`, import in `index.css`. Removes a third-party recipient of children's IP addresses and takes a cross-origin handshake off the critical path.
- [ ] Drop `hardwareConcurrency`, `deviceMemory`, `maxTouchPoints` from `telemetry/telemetryClient.js`. Ask what each buys you diagnostically — user agent plus a coarse breakpoint covers nearly all triage, and the fingerprint surface is the CIPA exposure.
- [ ] Stop running diagnostics for anonymous visitors by default — gate behind auth or explicit opt-in
- [ ] Honor Global Privacy Control: `navigator.globalPrivacyControl === true` → skip the write. Five lines, and it doubles as the UK opt-out.
- [ ] Ship the 90-day `session_diagnostics` purge (`pg_cron`), **then verify rows actually disappear.** An unverified cron job is a promise, not a control.
- [ ] Tighten `session_diagnostics` RLS — drop the blanket `update ... using(true)` for anon
- [ ] Move the anon key out of the telemetry beacon query string into a header (`telemetryClient.js:269`)
- [ ] Geo-suppress Vercel Analytics, Speed Insights, and diagnostics for EU/UK via `x-vercel-ip-country`. Middleware conditional, not a consent platform.
- [ ] Add `beforeSend` redaction on Vercel Analytics so no identifier can ride in a URL path

## E3 — Billing and cancellation

*🔴 The whole workstream. This is more likely to cost money in the next two years than anything in the privacy section, and it applies from the very first transaction.*

- [ ] 🔴 **Ship the Stripe billing portal.** **No web subscriber can cancel today** — `PaywallModal.jsx:110` promises a billing portal and `supabase/functions/` contains only `stripe-checkout` and `stripe-webhook`. Online signup with no online cancel violates the ARL in CA, CO, IL, VA, MA, CT, NY and NYC. Configure for immediate cancellation, no retention flow.
- [ ] 🔴 **Rebuild the paywall disclosure** in three places — web `PaywallModal.jsx`, iOS `PaywallView.swift`, **and `FirstFlightView.swift`**, which carries its own paywall. Must show, before the card field: auto-renews until cancelled; trial length **and the actual end date rendered**; exact first-charge amount **and date**; renewal frequency and amount; how to cancel with a working link; Terms and Privacy links *(also Apple 3.1.2(c))*.
- [ ] 🔴 **Separate unchecked auto-renewal checkbox**, distinct from Terms acceptance, never pre-ticked. California requires it as its own affirmative act — **Stripe's bundled ToS checkbox does not satisfy this.**
- [ ] Ship the `consent_events` migration; call `logConsent` at account creation and at subscribe, storing the **literal rendered** disclosure text with real dates
- [ ] Verify the cancellation flow **on a phone browser.** "Use a desktop" was a named FTC violation in *Chegg*.
- [ ] One click after sign-in, no survey, no phone requirement (Colorado's one-step rule)
- [ ] If you ever add a save offer: equally prominent cancel button beside it (California), suppressed entirely for Minnesota
- [ ] 🔒 Confirmation email on subscribe — **blocked on B7**
- [ ] 🔒 Reminder emails: day 11 of trial, 35 days before annual renewal, annually for every subscriber, 10–14 days before any price change — **blocked on B7**

## E4 — Deletion and parental rights

- [ ] 🔴 **In-app account deletion**, web and iOS. Deletion, not deactivation. Must purge `kid_profiles`, `progress`, `item_stats`, engagement — not just the login. Nothing exists today: `Navbar.jsx` has sign-out only, `SettingsView.swift:76` has sign-out only, and there's no settings page on web.
- [ ] Per-child profile deletion — that's the parent's "refuse further collection" right under §312.6
- [ ] Parent data review — show everything held about each child, from the account area (§312.6 again)
- [ ] Revocation endpoint. The consent confirmation message advertises it; a link that 404s is worse than none.
- [ ] 24-month inactive-account purge *(the warning email part is 🔒 on B7; the purge itself is not)*
- [ ] 🔒 Sign in with Apple token revocation on delete — **blocked on B2.** Required, and a common rejection cause.

## E5 — Consent plumbing

- [ ] 🔴 **Email-plus VPC flow** (§312.5(b)(2)(viii)): direct notice delivered when the parent creates their first child profile → parent responds with consent → write `kid_profiles` and `consent_events` in one transaction → confirming message carrying the revocation notice. *(Transport is 🔒 on B7; the state machine is not — build it against a stub.)*
- [ ] 🔴 **Nothing about a child touches the database before consent completes.** §312.5(c)(1) lets you hold the parent's contact details for the sole purpose of obtaining consent, and nothing more.
- [ ] Scheduled job: no consent within a reasonable time → delete the parent's contact information and any names held
- [ ] Keep the free web tier **genuinely account-free** — no name, age, grade, or cloud sync. It's your no-consent-needed on-ramp, and later it's what lets a teacher pilot larkit without a data agreement. Protect it deliberately.
- [ ] **Guard the eligibility condition.** Email-plus requires that you not "disclose" children's data. Supabase and Vercel are carved out as service providers; **an ad SDK, marketing pixel, or third-party analytics tool receiving children's data ends eligibility immediately** and forces you onto knowledge-based authentication, which means asking every parent for name, address, date of birth and last-four SSN.

## E6 — iOS and App Store

- [ ] 🔴 **Wire the parental gate into `FirstFlightView`.** Purchase (`:568`, `:585`), sign-in (`:219`, `:238`), and the privacy link (`:278`) are all ungated — and it's the first screen a reviewer opens. `ParentalGateView` is correctly wired into `PaywallView`, `AboutView`, and `SettingsView`; first-flight was missed.
- [ ] Add a lockout after repeated gate failures — it currently dismisses silently after three wrong answers, so a determined 8-year-old just reopens it
- [ ] Audit every external link and purchase path for gate coverage
- [ ] Update `PrivacyInfo.xcprivacy` to declare child name, age, and grade. Today it lists email, user ID, and other user content only.
- [ ] 🔒 Complete privacy nutrition labels and check them against the manifest — **blocked on B2**
- [ ] 🔒 Texas SB 2420: Declared Age Range API, Significant Change API, StoreKit `ageRatingCode`, `RESCIND_CONSENT` handling — **blocked on B2 + B5.** ⚠️ An age-rating change auto-triggers parental re-consent, so get the rating right the first time.

## E7 — Hardening

*None of this blocks retail launch. All of it blocks the first district.*

- [ ] Server-side entitlement verification via Edge Function; make `entitlements` service-role-write only. Your own `CLAUDE.md` flags the current client-write model.
- [ ] Publish `.well-known/security.txt` pointing at `/security`
- [ ] Verify every reminder email actually sends, in staging, with a clock you can move
- [ ] Confirm the diagnostics purge has run at least once in production

## E8 — Accessibility

*🔴 Start now. This is the long pole for the district sale — months, not weeks — and it does not get shorter by waiting.*

- [ ] Audit the widget layer: `NumberLine`, `AnalogClock`, `CoinTray`, `FractionInput`, `TenFrame`, `PlaceValueDiscs`, `NumberBond`, `BarModel`
- [ ] Each needs keyboard operability, correct ARIA roles and live regions, visible focus, non-color-dependent state, and screen-reader-meaningful math semantics
- [ ] **A drag-only `CoinTray` is a hard WCAG 2.1 AA failure (SC 2.1.1).** Give every drag interaction a keyboard path.
- [ ] iOS equivalent: VoiceOver, Dynamic Type, Switch Control
- [ ] Districts require WCAG 2.1 AA and a completed VPAT/ACR. Audit **before** you promise anything in an ACR — a candid report with a roadmap beats an inflated one, and overclaiming is misrepresentation.

## E9 — Tenancy seam for districts

*Does not block retail launch. Blocks the first district — and this is the workstream where "cheap now, expensive later" is most true.*

**The point of doing this early is not to build district features. It's to avoid writing your Row Level Security policies twice.** Today every child-bearing table is scoped `auth.uid() = user_id`, which encodes "a household owns a learner." A district owns learners too, and a teacher must see a roster without seeing billing. Retrofitting that means rewriting every policy on `kid_profiles`, `progress`, and `item_stats` while live consumer families are reading through them. Doing it at zero production users is a weekend; doing it at ten thousand is a migration project with a rollback plan.

The vendor stack is **not** the constraint — Supabase and Vercel both hold SOC 2 Type II and ISO 27001:2022, and your project is already in a US region (`us-east-2`, which matters because Supabase regions are immutable). The constraint is the shape of your schema.

### E9a — Decide the model, write it down

- [ ] 🔴 **Write a short ADR for the tenancy model before touching the schema.** The decision you're making is *what owns a learner*, and it is hard to reverse.
- [ ] **Recommended shape:** a `learners` table with exactly one owner — either `owner_user_id` (household) or `org_id` (school) — enforced by a `CHECK` constraint so a row can never have both or neither. Then RLS is written **once**, against "may this actor see this learner," rather than twice against two different ownership models.
- [ ] Decide whether a learner can ever move between a household and a school, or be in both. **Recommendation: no.** Two separate learner records, no linkage. It keeps the consent paths separate (standing rule 4) and avoids the hardest data-governance question in edtech.

### E9b — Add the seam

- [ ] `orgs` table with a self-referencing parent, so district → school → classroom is one hierarchy rather than three tables
- [ ] `org_members` — user, org, role (`district_admin`, `school_admin`, `teacher`). **A teacher sees a roster and progress; never billing, never another classroom.**
- [ ] Refactor `kid_profiles` → `learners` with the ownership `CHECK`
- [ ] Add nullable `org_id` to `progress` and `item_stats`, denormalized from the learner, so district-scoped deletes and exports are a single indexed predicate rather than a join
- [ ] **Rewrite every RLS policy once**, against the new shape. This is the actual work; everything else here is bookkeeping.
- [ ] Keep the school side dormant behind a flag until you have a signed agreement — the seam is what matters now, not the features

### E9c — Deletion and export at district granularity

- [ ] 🔴 **Deletion must be provable per-learner, per-classroom, per-school, and per-district.** NDPA Exhibit D governs disposition on termination, and "we delete per user account" does not answer it.
- [ ] Write it as a **test**, not a runbook: seed a district with two schools and three classrooms, delete at each level, assert zero rows across every table. That test is what you show a district, and it's what stops a future migration from silently orphaning rows.
- [ ] Data export on termination — districts get their data back, in a documented format
- [ ] Confirm the `ON DELETE CASCADE` chain still holds after the `learners` refactor. Today `kid_profiles.user_id` cascades from `auth.users`; an org-owned learner has no `auth.users` parent to cascade from.

### E9d — Audit logging

- [ ] Append-only audit table: who accessed or modified student data, what, when. **You have none today, and district security questionnaires ask.**
- [ ] No update or delete policy on it — evidence you can edit is not evidence
- [ ] Cover admin access specifically. `RequireAdmin` gates the UI and `is_admin()` gates the reads, but neither leaves a trace.

### E9e — Rostering and SSO

- [ ] Google Workspace for Education SSO first — broadest coverage, least work
- [ ] Then **Clever or ClassLink**, whichever your first district actually uses. Don't build both on spec.
- [ ] **Elementary students do not have Apple IDs.** Your current auth is Apple/Google consumer OAuth only, which cannot serve a classroom.

### E9f — Keep the two channels apart

- [ ] 🔴 **School-provided consent covers educational use only.** If school-channel data ever reaches a consumer marketing surface, the exception breaks. Enforce it in the schema, not in a code comment — an org-owned learner should be structurally incapable of entering a consumer email flow.
- [ ] Suppress Vercel Analytics and Speed Insights entirely on school-channel surfaces. A third-party analytics recipient of student data is exactly what a district questionnaire surfaces.
- [ ] Pin Vercel functions to `iad1` explicitly in `vercel.json` — you're on the US default today, but declared beats inherited when someone asks where processing happens

---

# TRACK B — OFFLINE

Paperwork, accounts, and signatures. No code. Roughly ordered by what unblocks the most.

## B1 — Form the entity 🔴

- [ ] Form the LLC — registered agent, EIN, operating agreement
- [ ] Open a business bank account; point Stripe and App Store payouts at it. **Commingling funds pierces the liability shield you just paid for.**
- [ ] *Unblocks: `entity.js`, and every document that names a contracting party*

## B2 — Apple accounts 🔴

- [ ] Enroll in the Apple Developer Program **as the LLC**, not as an individual. Kids Category apps from individual accounts get extra scrutiny, and the seller name should match the entity in your Terms.
- [ ] Enroll in the Small Business Program (15% commission — the $54.99 annual nets ~$46.74)
- [ ] Pick the real bundle ID; replace `com.kidmath.app` in `ios/project.yml`
- [ ] Select the Kids Category age band (6–8 or 9–11)
- [ ] *Unblocks: Apple token revocation, nutrition labels, Texas APIs*

## B3 — Confirm the documents are true

*You are the only person who can do this one. Read each document with the code open.*

- [ ] Read the Privacy Policy end to end and confirm **every sentence is true of your code today.** Where it isn't, either change the code or change the sentence — a policy describing an aspiration is an FTC Act §5 deception problem.
- [ ] Read the Terms, especially §5 (subscriptions), §19 (arbitration), and §13 (educational disclaimer)
- [ ] **Decide whether you want the arbitration clause at all.** It caps class-action exposure — which for you is mainly California ARL claims — but districts sometimes object in procurement. Removing it means deleting §19 and the front-matter callout.
- [ ] Check §13 against whatever your marketing actually claims. If marketing says "raises test scores," §13.3 and the marketing cannot both stand.
- [ ] Confirm the retention schedule matches what E2 and E4 will actually build

## B4 — Mailboxes 🔴

- [ ] Set up `privacy@`, `support@`, `security@`, `legal@`
- [ ] **Make sure someone reads `privacy@`** — mail landing there starts a 30-day response clock
- [ ] **Route `legal@` somewhere you actually read** — it's the address of record for arbitration opt-out notices under Terms §19.7, and a missed opt-out can invalidate the arbitration agreement as to that user
- [ ] *Unblocks: `entity.js`*

## B5 — App Store Connect 🔴

- [ ] **Answer the new age-rating questionnaire.** The deadline was **31 January 2026** and there was no grace period — until it's answered, App Store Connect blocks every submission. **Do this before anything else on this track.**
- [ ] Confirm App Store copy is Kids-Category-consistent — you may use "K-5" and "for kids" *because* you're in the category
- [ ] Write Review Notes: no ads, no third-party analytics or SDKs in the iOS bundle, no social or chat, only network peer is your own backend, gate covers all purchases and links
- [ ] *Unblocks: Texas APIs, and submission at all*

## B6 — Vendor paperwork 🔴

- [ ] Collect and countersign DPAs: **Supabase, Vercel, Stripe, Google.** §312.8(c) requires written assurances **before** they receive children's data.
- [ ] File them at `docs/vendor-dpas/` and fill in §5 of the security program
- [ ] Standing rule: **no new vendor touches children's data without a signed DPA and a row in that table**

## B7 — Pick a transactional email sender

*Small task, unblocks four engineering items. Do it early.*

- [ ] Choose a sender (Resend, Postmark, SES) and configure the domain
- [ ] **Authenticate: SPF, DKIM, DMARC.** With email-plus consent, **deliverability is a compliance dependency, not a growth metric** — if the notice lands in spam, consent never completes and the account is stuck in a state where you legally cannot write the child's profile.
- [ ] Set up bounce and complaint monitoring
- [ ] *Unblocks: E3 confirmation + reminders, E4 inactivity warning, E5 consent transport*

## B8 — Adopt the security program

- [ ] Fill every TODO in `docs/childrens-data-security-program.md` — name yourself as coordinator, set real dates
- [ ] Put the **3 August 2027** annual review in your calendar now. An annual review everyone forgot to do is the most common way this requirement is failed.
- [ ] Keep the risk table honest as E2 and E4 close items A1–A8

## B9 — Lawyer review

*Budget 3–5 hours of specialist time, not a retainer. Hand them these, not "review my app."*

- [ ] The **arbitration agreement** (Terms §19) — most consequential clause, and the one where drafting choices have real consequences
- [ ] The **rendered checkout and cancellation screens**, once E3 ships — the actual screens, not the spec
- [ ] The **Terms as a whole**, with the district sale in mind
- [ ] The **email-plus consent script and timing**, and whether the interval between the two steps is defensible
- [ ] The **`consent_events` cascade-vs-retention conflict** described in `legal-implementation.md` Step 3 — the one place two legal obligations genuinely pull against each other
- [ ] **Limitation of liability, indemnity, and governing law** against Delaware law and the consumer statutes of your highest-volume states

## B10 — Later, before districts

- [ ] **Subscribe to both subprocessor change lists.** Supabase pushes 30 days' notice; **Vercel requires you to email `privacy@vercel.com` to get on theirs.** NDPA §2.3 requires you to flow subprocessor changes down to districts, and you cannot flow down a notice you never receive.
- [ ] **Budget for the Supabase Team plan** before your first district deal — SOC 2 and ISO 27001 reports are gated behind Team or Enterprise, and every district security review asks for them
- [ ] COPPA Safe Harbor certification (kidSAFE or PRIVO) — a badge parents and district buyers both recognize, and it moves routine oversight off the FTC
- [ ] Sign the **SDPC National Data Privacy Agreement v2.2 with Exhibit E** — turns per-district legal negotiation into a checkbox. **Refuse all redlines outside Exhibit H.**
- [ ] Adopt **NIST CSF** — satisfies NY Part 121 and NDPA Exhibit F at once
- [ ] Engineer breach response to a **7-calendar-day** clock (New York's, the tightest you'll face)
- [ ] Publish a data inventory — Colorado requires it on your own site; it's also NDPA Exhibit B
- [ ] Cyber insurance, $1–5M
- [ ] Canonical security questionnaire response doc
- [ ] External penetration test
- [ ] Complete a **VPAT 2.5 ACR** — *after* E8, and honestly
- [ ] **SOC 2 Type II** — start ~2 quarters before your first district over 25,000 students; it needs a 3–12 month observation window and cannot be produced on demand
- [ ] Ask each district for its FERPA annual notification; confirm it designates contractors as school officials

---

# GATES

Where the two tracks converge. Each gate is one binary question — don't pass it on a maybe.

### ⛔ Gate 1 — Can you sign a contract?
**B1 + B4 done, and `entity.js` names the LLC correctly with a real address.** `legalDocs.spec.js` passes.
*Blocks: taking any money.*

### ⛔ Gate 2 — Is every promise you make true?
**E1 + B3 done.** All four documents live at real URLs, linked from web and iOS including the add-a-child screen, and every factual claim matches shipped behaviour.
*Test: read the privacy policy aloud with the code open. Any sentence that makes you hesitate is the one to fix.*

### ⛔ Gate 3 — Is the data surface as small as the policy claims?
**E2 + B6 done.**
*Test: open devtools on a fresh session and watch the network tab. Every request should go to a domain you named in the privacy policy.*

### ⛔ Gate 4 — Can a subscriber leave as easily as they arrived?
**E3 done.**
*Test: sign up on a phone, then cancel on that same phone, in one step, without emailing anyone. Time it — more than 30 seconds or two taps after sign-in and it isn't done.*

### ⛔ Gate 5 — Does deletion actually delete?
**E4 + E5 done.**
*Test: create an account, add two children, generate progress, subscribe, then delete from inside the app. Query every table by that `user_id` and confirm zero rows. Both platforms. Repeat quarterly forever.*

### ⛔ Gate 6 — Would a reviewer find an ungated path?
**E6 + B5 done.**
*Test: hand an iPad to someone who has never seen the app and ask them to spend money or leave the app. If they can do either without an adult solving a spelled-out addition problem, you're not ready.*

### ⛔ Gate 7 — Launch
**Gates 1–6 green, and B9 done — a lawyer has seen the Terms and the rendered checkout.**

### ⛔ Gate 8 — District-ready
**E7 + E8 + E9 + B10.** NDPA with Exhibit E signed and active in the SDPC registry, an honest ACR exists, and deletion is provable per-student, per-cohort, and per-district.
*Test for the last part: run the E9c deletion test in front of them. A passing test beats a paragraph of assurance.*

---

## Standing rules

Break any of these and obligations you don't currently have switch on across ten states at once.

1. **No ad SDK, no pixel, no tag manager. Ever.** The day one lands, "Do Not Sell/Share" links and Global Privacy Control obligations trigger in about ten states, Maryland flatly prohibits targeted advertising to minors with no consent option, **and you lose email-plus consent eligibility.**
2. **No new vendor touches children's data** without a signed DPA and a row in §5 of the security program.
3. **No unilateral amendment clause in the Terms.** It defeats the "direct control" test districts need for the FERPA school-official exception.
4. **Keep the D2C and school consent paths architecturally separate.** School consent covers educational use only.
5. **Bump a document's version whenever its substance changes.** CI enforces the version match; only you can judge what counts as substantive.
6. **Stay USD-only and English-only.** EUR pricing or EU-language localization is what pulls you into GDPR.
7. **No LLM feature touching child data** without revisiting §312.5(a)(2) — the FTC has said model training is not "integral to the service."

---

## Watch list

| What | Why it matters to you | When |
|---|---|---|
| FTC negative-option rulemaking | ANPRM March 2026. If re-proposed properly, roughly the vacated click-to-cancel rule returns with ~180 days' notice. E3 already builds to it. | Ongoing |
| Texas SB 2420 merits appeal | Enforceable now, but the Fifth Circuit hasn't ruled on the merits. Could be struck. | Ongoing |
| California AB 1043 | OS-level age signals. Its "across all platforms" clause reaches larkit.io on the web, not just the app. | 1 Jan 2027 |
| Utah / Louisiana developer duties | ASAA obligations land | May 2027 / Jul 2027 |
| FERPA rulemaking at the Dept. of Education | The FTC deferred the COPPA school-authorization exception waiting on it. When ED moves, school-consent rules follow. | 12–24 months |
| Montana (25k users) / Connecticut (35k) | The first state comprehensive privacy thresholds you'll cross. Instrument a count of distinct residents. | On growth |
