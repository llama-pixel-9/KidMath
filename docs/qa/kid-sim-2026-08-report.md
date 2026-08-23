# Kid simulation QA — 2026-08-23

Browser-level test of Larkit (`main` @ 6ef5158, local dev server against the prod
Supabase project) as experienced by simulated kids from every grade K–5 at three
ability levels, plus two multi-kid households. Companion files: per-mode level
curves in `kid-sim-2026-08-curves.md`, raw ground truth in `qa-out/sessions/*.json`
(not committed), harness in `e2e/personaKid.spec.js` + `scripts/qa/`.

## What was run

| Layer | Scope | Result |
|---|---|---|
| Persona runner (Playwright, real widgets, faked clock) | 18 anonymous kids = 6 grades × {struggling, okay, strong} × 3 grade-appropriate modes × 6 sessions (324 sessions, 4,860 questions) | **18/18 pass** — every session completed, 0 page errors, 0 "aimed correct but scored wrong", saved counts == ground truth for all 18 |
| Same runner, signed in | Household A: Mia (K, struggling), Leo (2nd, okay), Ava (4th, strong); Household B: Sam (1st, okay), Zoe (5th, strong) — 90 sessions | **Found P0 data-loss bug** (below); sessions themselves played fine |
| Headless `simulateKid.mjs` | 22 modes × 3 personas × ≤30 sessions, bundle bank | 0 item-validity findings; pacing + repetition numbers below |
| Hand-driven Chrome | Sign-up → consent → 3 + 2 kids, 4-kid cap, profile switch, one real-speed counting session as Sam, Grown-Ups panel, `/report` for 5 kids × ranges, anonymous `/report`, paywall flip | Findings below |
| Baseline | `npm run test` 577/578 (known `legalDocs` entity-placeholder gate), `npm run test:e2e` 60/60 | green |

Test households (kept as fixtures): `qa-household-a@larkit.test` (Mia K · Leo 2nd · Ava 4th · Kai 3rd),
`qa-household-b@larkit.test` (Sam 1st · Zoe 5th). Email/password users created with
`scripts/qa/createTestUsers.mjs`; consent granted with `scripts/qa/grantConsent.mjs`
(the email transport is still a stub).

## Bugs found (ranked)

### P0 — Signed-in kids cannot save progress in 19 of 22 modes
The live `progress` table has a check constraint `progress_mode_check` that only
allows `addition`, `subtraction`, `multiplication`. It is **not in the repo's
migrations** (schema drift). Every `saveProgress` for any other mode fails with
`23514`, so:
- the kid restarts that mode at **level 1 every session** (Zoe, seeded at 7 in
  decimals, ended 18 sessions at "Level 3 ↑2" with 16 level-ups in the report);
- Home shows "New" on every tile on another device;
- because `finishSession` awaits `persistSession` before `saveSessionRecord`
  (`src/MathExplorer.jsx:991-999`), the **practice-log row is not uploaded either** —
  Ava's report shows 6 of 18 sessions, Mia 13 of 18, Sam lost 1 of 6 numberBonds.
  Rows sit in the device's local mirror and only flush when `/report` is opened
  on that same device.
- Empirically verified by inserting each of the 22 modes with the service key:
  3 accepted, 19 rejected. `progress_item_stats` and `practice_sessions` accept all.

Fix: `supabase/migrations/20260823200000_progress_drop_mode_check.sql` (drops the
constraint; written, **not applied** — needs Sai's go). Also make the session-log
save independent of the progress save (fire both, don't chain).

### P1 — `session_diagnostics` inserts are rejected (403, RLS)
Every session end posts to `/rest/v1/session_diagnostics` and gets
`new row violates row-level security policy`. Diagnostics are silently lost and the
console shows an error on every flight.

### P1 — Figure-less counting items tell the kid the answer
`counting-conc-subitizing-K1-001` renders as the text *"A small set of 4 dots.
Subitize the count."* with no dots; `counting-proc-cardinality-K1-001`: *"Count 10
items. The cardinality is?"*; `counting-proc-b0821-0034`: *"A ten frame is filled
with a blue chip in every space. Say how many chips…"*. Counted in the shipped
bundle: **278 counting items have no figure, 66 of them describe the objects in
prose** (answer is in the prompt), and **216 items across 10 modes use teacher
jargon in the kid-facing prompt** (*subitize, cardinality, decompose, commutative
property, identity*). A kindergartner cannot read "subitize".

### P1 — Emoji-run wrap changes the math
`counting-conc-b0821-0010` ("Top row: 🟢×6 / Bottom row: 🟢×5 — same number?")
wrapped the 6th top-row dot onto the bottom-row line, so the screen showed 5 on
top and 6 below and the correct answer "No" looked wrong. PR #54 fixed the label
case; the run-wrap case remains. (Screenshot in session transcript.)

### P2 — Adding a 5th kid shows a raw Postgres error
`/onboarding?add=1` still offers the form with 4 kids; submitting shows *"new row
violates row-level security policy for table "kid_profiles""* in red. The cap is
enforced, the message is not parent-language. (`/profiles` correctly hides the
"+ Add" tile.)

### P2 — Two "correct answer not among choices" hits
Sam's run flagged `subtraction "8 − 3 = ?"` and `addition "5 + 5 = ?"` where the
correct value wasn't a rendered choice. Not reproduced on rerun; likely the
AnimatePresence ghost-card race the robot-kid skill documents, but worth a
`--repeat-each` hunt on addition/subtraction L1–3.

### P3 — Copy / data nits
- Home greets the **parent's email** ("Morning, qa-household-b — pick a game")
  even when a kid is selected; the active kid's name is never shown on Home.
- `decimals`: *"finds exactly 1 dimes"* (plural agreement in a generated prompt).
- "Two square corners side by side together make what? Pick it." (angles) reads
  like a riddle.
- `kidmath-progress-migrated` / `kidmath-engagement-migrated` survive sign-out, so
  a second household on the same device can never inherit an anonymous blob.
- The flight report paid **+14 stars for 14/15** — the §01 four-part payout
  (landing +2, altitude) is not on without the `flightReport` flag.

## What worked (verified)

- Sign-in, COPPA consent request → pending panel ("I've confirmed" correctly
  refused before the grant) → profile created → kids 2–4 added directly; the
  "Add another kid" path on `/account` (PR #55); `/profiles` picker; Home redirects
  to `/profiles` when no kid is active; kid pills on `/report` only when > 1 kid.
- Household isolation: household B's report/profiles never show A's kids; Mia's
  play never moved Ava's levels.
- Cross-device: Sam's sessions played in the Playwright browser showed up in
  Chrome's report ("across your family account") immediately.
- `/report` reconciles: Sam 18 sessions / 270 questions / 92 % exactly matches
  the 18 × 15 ground truth; ranges 7/30/90/all switch per-day ↔ per-week; "needs
  work" fired for Mia (*sides and corners 44 % on 18 tries*), "celebrate" for
  Ava/Zoe; "questions that tripped them up" shows prompt, correct, what was tried
  and "got it on a later try"; "when they practice" buckets backdated sessions
  correctly; Print control present; anonymous `/report` has a sensible empty state.
- All answer widgets the 22 modes use were driven by the robot without a single
  plumbing failure across 4,860 questions.
- Paywall flip (`VITE_PAYWALL_ENABLED=true`): 5 free tiles open, 17 locked,
  PremiumGate on `/play/fractions` with "Back to free practice".
- Bank coverage: headless sim served 15,157 questions, **0 generator fallbacks**,
  0 invalid items.

Not run: phone-width layout (Chrome extension window would not resize), kid
deletion cascade, fledging flights, sticker purchase, promotional-grant row.

## How the three kinds of kid actually fared

Anonymous kids, 6 sessions per mode, 54 (grade × persona × mode) cells.
Full per-cell curves: `kid-sim-2026-08-curves.md`.

| Persona | first-try accuracy | avg active min / session | wrong / session | promotions / session | reached Level 10 within 6 sessions | ended ≤ Level 2 |
|---|---|---|---|---|---|---|
| Strong (p≈0.85→0.98, ~4 s/answer) | 97 % | 1.2 | 0.4 | 1.08 | **18 / 18** | 0 |
| Okay (p≈0.62→0.95, ~6.5 s) | 91 % | 2.0 | 1.3 | 1.52 | **15 / 18** | 0 |
| Struggling (p≈0.45→0.85, ~11 s) | 78 % | 3.7 | 3.3 | 0.57 | 0 / 18 | **12 / 18** |

Headless, all 22 modes: typical kid reaches Level 10 in **9.1 sessions on
average** (range 6–12), strong in **5.6**, struggling in 4 modes only; a struggling
kid's served questions were only **8 % distinct** — *"2 × 3 = ?"* 126 times in 30
multiplication sessions, *"11 → 10 + ?"* 96 times.

Caveat: the "okay" persona's growth term makes it play like a strong kid by
session 3; treat its curve as an upper bound on an average kid.

## Honest assessment as a math learning tool

**What is genuinely good**
- The item bank is large, mechanically validated and 100 % bank-served; the
  distractors are misconception-linked; retries are spaced and the report tells
  parents whether a miss was later fixed. That loop (miss → spaced retry →
  "got it on a later try") is real retrieval practice and most apps don't have it.
- The parent report is the best surface in the product: concrete, honest about
  what it counts, and its recommendations fired correctly for every persona.
- The session feels calm: no timers, clean widgets, a satisfying flight report.

**Where it falls short as a learning tool**
1. **It does not know the child.** Grade is collected and never used: a
   kindergartner and a 5th grader both start every mode at Level 1 and see the
   same 22 tiles. The strong 5th grader's first session is `7, 6, 5, ?`.
2. **The ladder is too short and climbs too fast.** An average kid tops out all
   ten levels of a mode in ~9 sessions (≈ 30 minutes of play). After that the app
   has nothing harder to offer in that mode; with 22 modes that is ~10 hours of
   content before a capable kid is "done". Ten levels are effectively three tiers.
3. **A slow, accurate kid is stuck.** The struggling persona got 78 % right and
   still never left Level 1–2, because the fast-promotion path needs < 8.5 s
   answers and the slow path needs a 7-streak, while two misses demote. Speed is
   gating progress for exactly the kids who should not be rushed.
4. **Struggling kids get the least variety.** Level-1 cells are small, so the
   kid who most needs fresh practice sees "2 × 3 = ?" again and again.
5. **Feedback is verdict-only.** Wrong → the right answer appears → next
   question. No hint, no ten-frame/number-line scaffold, no second attempt with
   support. The app measures learning; it does not yet teach.
6. **Reading load at K–1.** K prompts average ~11 words, a quarter are pure
   symbolic; the rest need reading with no read-aloud. Plus the jargon items.
7. **Signed-in cloud progress is broken for most modes** (P0 above) — today a
   family paying for sync gets a worse experience than an anonymous device.

## Recommended improvements (ranked)

1. **Apply the constraint fix and decouple the two saves** (P0). Add a migration
   test that inserts every `MODE_ID` into `progress` so drift can't recur.
2. **Use the grade.** Seed each mode's starting level from `kid.grade` (clamped to
   the mode's grade span), sort/filter Home tiles by grade, hide above-grade modes
   behind "Explore more". Show the kid's name on Home.
3. **Re-tune promotion/demotion.** Drop the response-time gate for promotion (or
   scale it by grade), require a wrong *retry* or 3 misses before demotion, and
   let struggling kids earn Level 2 on accuracy alone.
4. **Make levels mean more.** Either stretch the ladder (real L7–10 content for
   grades 4–5) or replace "Level N of 10" with mastery per subskill, which the
   report already computes.
5. **Scaffolded second chance** on a first miss: show the relevant model (ten
   frame, number line, bar model — widgets exist) before revealing the answer.
6. **Variety at low levels**: enforce a per-session no-repeat window across
   sessions at L1–2, and widen L1 cells in counting/multiplication/time/measurement.
7. **Fix the 66 answer-in-prompt counting items and 216 jargon items**; add a QC
   `fail` check for *subitize|cardinality|decompose|commutative|identity* in kid-facing
   text and for figure-less prompts that describe a quantity.
8. **Text-to-speech** for K–2 prompts (Web Speech API; AVSpeechSynthesizer on iOS).
9. Friendly 4-kid cap message; hide the add form at 4.
10. Persist a partial session on unmount so "minutes practiced" stops being a floor.

## Reproducing

```bash
# worktree of main, npm ci, copy .env + .env.local, dev server on 5199
node scripts/qa/createTestUsers.mjs                       # needs SUPABASE_* + VITE_SUPABASE_ANON_KEY
QA_PLAN=qa-out/plan-main.json KIDMATH_E2E_PORT=5199 npx playwright test e2e/personaKid.spec.js --workers=5
node scripts/qa/reconcile.mjs                             # ground truth vs DB / localStorage
node --import ./scripts/lib/registerResolve.js scripts/simulateKid.mjs --personas typical,strong,struggling --maxSessions 30 --out qa-out/sim.json
```
Plan format and the Date-only clock shim are documented at the top of
`e2e/personaKid.spec.js`. Playwright's `page.clock` cannot be used — it freezes
the feedback transitions.
