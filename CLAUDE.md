# KidMath — project rules

Adaptive K–5 math practice. React/Vite web app + native SwiftUI iPhone/iPad app
that **shares the same JavaScript engine** via JavaScriptCore. Supabase for auth,
progress, item bank, and entitlements. Stripe on web, StoreKit 2 on iOS.

Deploys to Vercel from `main`. Active dev branch: `ios-engine-bridge`.

---

## Commands

```bash
npm run dev              # vite dev server, localhost:5173
npm run test             # the CI suite — an explicit file list in package.json, NOT all of src/__tests__
npm run lint
npm run build            # web bundle
npm run build:engine     # esbuild → ios/KidMath/Resources/KidMathEngine.bundle.js (gitignored artifact)
npm run test:engine      # Node↔JS engine parity check
npm run test:coverage    # cell-coverage spec with KIDMATH_ENFORCE_CELL_COVERAGE=1

# item bank
npm run bank:report      # cell counts, PASS/FAIL
npm run bank:variety     # variety report (220 cells; all must pass)
npm run bank:audit       # structure audit
npm run bank:qc          # QC agent over the bank
npm run bank:export      # approved cloud rows → shipped bundle (src/itemBank/items/)
npm run bank:seed        # timestamped Supabase seed migration
npm run bank:gen         # generateDrafts.js
```

- **`npm run test` is a hand-maintained file list, not a glob.** Adding a spec file
  does nothing until you add it to that list. `choiceGeneration.spec.js` is
  currently *not* in the list and pre-fails ~104/222 cells — don't treat its
  failures as a regression you caused.
- Any script that touches Supabase needs `set -a && source .env.local && set +a`
  for the service key.
- `scripts/lib/registerResolve.js` is required (`node --import ...`) for scripts
  that import app source.

iOS:
```bash
cd ios && xcodegen generate && ./patch-scheme.sh   # .xcodeproj is generated + gitignored
```
`patch-scheme.sh` must run after **every** `xcodegen generate` — XcodeGen can't
put the StoreKit config on the scheme's TEST action.

---

## Architecture

```
src/
  mathEngine.js        adaptive session: level, family scheduling, weakest-subskill targeting, mistake bank
  modes/               22 modes, one file each; index.js is the registry
    structures/        CCSS additive/multiplicative structure templates — reference wording per structure
    formats/  distractors.js  itemMetadata.js  blueprints.js (STALE: only the original 8 modes)
  itemBank/            bundled seed + cloud loader + normalize + QC checks
    items/             exported approved rows (4,078 items) — the shipped bundle
    qc/checks.js       mechanical gate; severity `fail` blocks approval
  engine/nativeEntry.js  flat JSON-in/JSON-out `KidMath` global for JavaScriptCore
  admin/               /admin: Items, Review queue (card + batch view), coverage heatmap
  engagement/          star wallet, stickers, streaks, journey map, badges (localStorage v1)
  components/          widgets (NumberLine, AnalogClock, CoinTray, FractionInput, TenFrame, …)
  premium.js           FREE_MODE_IDS + entitlement logic, mirrored by iOS rowIsActive
ios/                   SwiftUI app; project.yml is the XcodeGen spec
scripts/itemGen/       LLM authoring pipeline (authorStructures, rewordItems, structureRules)
docs/                  24 spec/plan files — see the map at the bottom
supabase/              migrations + Edge Functions (stripe-checkout, stripe-webhook)
resources/             667MB CCSS Progressions + EngageNY PDFs (gitignored payloads)
```

The engine is ~12,900 lines of pure JS and is **the** brain for both platforms.
It was deliberately not rewritten in Swift.

---

## Hard rules

**Supabase reads on `item_bank` MUST paginate.** supabase-js silently caps at
1,000 rows and the bank is ~4,078. An unpaginated read is not a slow read — it
is a wrong read, and this class of bug already caused a phantom-empty admin
queue, clipped mode loads, and kids' in-memory banks being replaced with the
first alphabetical 1,000 items. All five existing read paths page; new ones must too.

**A bundle fix is not done until the DB has it too.** Signed-in kids get DB
payloads at runtime; offline/anon kids get the bundle. After any bank edit,
verify both agree. Past drift shipped 27 wrong-answer items online while the
bundle was correct.

**Never hard-delete bank content without checking the generator fallback.**
Bank items serve preferentially; an empty cell falls back to the template
generator, whose prose is *worse*. Reword in place. Per-item Retire in the
Review queue is the surgical tool for genuinely bad items.

**Wording rules land at every layer, not one.** See `.claude/skills/item-authoring`
for the full ladder: guide → structure templates → generator prompts → QC check
→ sweep existing items. When Sai critiques wording, update
`scripts/itemGen/structureRules.js` (`NARRATIVE_RULES` / `GOLD_EXAMPLES`) and
`docs/word-problem-authoring-guide.md` — not just the one prompt that produced it.

Two wording rules currently enforced as `fail` checks:
- `nounlessQuestion` — the question must restate the counted noun. "How many toy
  cars does Lily have?", never "How many does Lily have?"
- `decorativeContext` — context must *matter*. Never a story sentence on a
  bare-number question ("Emma has 53 pencils. How many tens are in 53?").

**Never symlink `node_modules` into a deploy worktree** — it breaks vitest/vite.
Always `npm ci` inside the worktree. (A cleanup of such a symlink once deleted
the repo's real `node_modules`.)

**Deploy pattern:** cherry-pick the web-relevant commits onto `origin/main` in a
worktree (with its own `npm ci`), and let Vercel build from `main`. Stripe and
iOS commits stay on the branch — they are not part of a web deploy.

**The native engine must stay dependency-free.** `src/engine/nativeEntry.js` may
not pull in `progressStore` / `supabaseClient`. Bank items and saved progress are
**injected** from Swift (`setBankItems`, `addBankRows`), never fetched by the
engine. Breaking this breaks the iOS build without failing any web test.

**Any `authorStructures` rerun needs batch tags** or generated item_ids collide.
Reruns also overwrite same-cell draft ids — be skip-existing aware.

**Reference material is for structure and pedagogy only.** EngageNY is CC BY-NC-SA
— never copy or adapt its content into the app. Item wording stays original.

---

## Conventions

- **Modes** export `generate(level, context)`, declare `subskills` (≥3, meaningful
  — never `easy`/`hard`) and `families`. Every item carries metadata via
  `createQuestionMetadata(...)`: modeId, gradeBand, domain, cluster, subskill,
  itemFamily, mathPractices, misconceptionTags, blueprintId.
- **Three item families** per mode: `conceptual`, `procedural`, `application`.
- **Distractors must be misconception-linked**, not random offsets
  (`src/modes/distractors.js`).
- **`promptText` is globally unique** across the whole bank; the validator flags dupes.
- **multiSelect answers may be a list of acceptable selections** (a list of lists).
  In that case `q.answer` is not itself a valid submission — submit `answer[0]`.
- **Item lifecycle**: `draft` → `reviewed` → `approved` → `bank:export` → shipped
  bundle. Human review is for wording and kid-appropriateness only; the gate has
  already verified the math and structure. Approve is blocked on any `fail` finding.
- **Swift**: dict literals with mixed numeric literals infer `[String: Double]` —
  always coerce through NSNumber (`ProgressStore.int/double` helpers).
- **Session layout is a centered narrow column** (~400pt / `max-w-sm`), never
  edge-to-edge. Home content caps at 760pt. This was explicit user feedback.
- **Feedback timing is 1.2s correct / 2s incorrect** on both platforms — parity
  with the web session loop.
- **iOS widget `@State` resets via `.id(viewModel.questionKey)`** — without it,
  a widget keeps the previous question's state.
- **Engagement state is localStorage-only (v1)** behind a swappable store API;
  cloud sync is a future migration, so don't hand-roll persistence around it.
- **Progress is per kid.** `progress` / `progress_item_stats` rows carry `kid_id`
  (null = household row merged before any profile; the first kid inherits it as a
  seed). Local key is `kidmath-progress:<kid>`. Every cloud read must filter by kid
  (`.eq` for a kid, `.is null` for household) — an unfiltered read silently returns
  a sibling's row. Upserts conflict on `user_id,kid_id,mode[,item_id]`; iOS mirrors
  this exactly in `ProgressStore.swift` / `SupabaseService.swift`.
- **The practice log (`src/analytics/sessionLog.js`, table `practice_sessions`)**
  is the parent report's source: one record per finished session with every
  attempt (prompt, answer, given, ms, subskill), per kid. Local mirror + cloud
  when signed in. `buildReport` in `reportModel.js` is pure — keep it that way,
  it is meant to run server-side for the emailed edition (`docs/parent-report.md`).
- **`entitlements` is a v1 client-write trust model.** Hardening (Edge Function
  receipt validation) is planned, not done — don't assume the row is server-verified.

---

## Dev tricks & known weak spots

Simulator flags (argument-domain `UserDefaults`, via `simctl launch com.kidmath.app`):
`-autostartMode <mode>` jumps straight into a mode · `-kidmath-theme <id>` forces
a theme · `-showPaywall 1` opens the paywall.

**StoreKit testing is awkward by design.** `SKTestSession` needs the
`com.apple.developer.storekit.request-data` entitlement (Debug-only
`KidMathDebug.entitlements`) *and* still only works Xcode-launched — headless
`xcodebuild` returns `notEntitled` and the test self-skips. The app must not
touch StoreKit before the test session exists, hence `StoreService(autostart:false)`
under XCTest.

**Engine parity** is enforced by `testNodeParityFixtures`: byte-identical JSON
across all 22 modes × 3 levels via seeded mulberry32 RNG. Fixtures come from
`scripts/generateParityFixtures.mjs` and are committed in
`ios/KidMathTests/Fixtures/`. Regenerate them when engine output legitimately
changes; never edit them by hand to make a test pass.

**The authoring gate's arithmetic check is position-agnostic**, which let 190
compare items through with swapped/mislabeled payloads. A strict
payload-convention check is an open idea, not a shipped safeguard — don't trust
the gate alone on compare structures.

**Deliberately not done** (so don't "fix" them as oversights): conceptual and
procedural drills were not swept by `rewordItems` (different register); noun-less
drills intentionally use "counters" (number) / "dots" (array); and
`nounlessQuestion` is kept strict even though Sai's own examples sometimes drop
the noun — revisit only if he raises it.

---

## Pricing (locked)

$8.99/mo · $54.99/yr (49% off) · **all kids in the household included, one price —
no per-child tiers, ever** · 14-day trial, card required.
Free tier is **both platforms** (decided 2026-08-02 with the §20 soft
paywall): addition, subtraction, multiplication, division, counting.
Paywalled: the other 17 modes, PDF worksheets, and cloud sync. Launch offer: $39/yr founding price that locks while subscribed.
Price identically on both platforms (Apple requires it).
Product IDs: `com.kidmath.app.premium.{monthly,annual}`.

---

## Current state

- iOS port is **code-complete** through P6 — all 22 modes playable, 5 themes,
  sounds, worksheets/PDF, StoreKit paywall, privacy manifest. Remaining work is
  account-side: `docs/ios-appstore-checklist.md` and `docs/stripe-setup.md`.
  Bundle ID placeholder `com.kidmath.app` must be replaced before ASC.
- Item bank: 4,078 approved items exported. **~3,200 items pending Sai's review**
  in `/admin`, ~1,440 of them with wording options awaiting a pick. Batch-trust
  mode (spot-check a sample, approve the batch) is built and deployed.
- Variety: 220/220 cells passing, 271 structures.
- Known stale: `src/modes/blueprints.js` (original 8 modes only); most modes
  effectively have 3 difficulty tiers, not 10.

---

## Where to look in `docs/`

| Need | File |
|---|---|
| Item wording + style (source of truth) | `word-problem-authoring-guide.md` |
| Mode × grade gap matrix, 6-workstream plan | `content-gap-analysis-2026-07.md` |
| Bank expansion playbook (cells → 50+) | `phase2-bank-expansion-playbook.md` |
| Variety targets and baseline | `item-bank-variety-spec.md`, `variety-baseline.md` |
| Per-domain mode specs | `spec-part-ab-operations.md`, `spec-part-c1/c2/c3-*.md` |
| Problem-type research (K–4) | `research-k4-problem-types.md` |
| Item metadata schema | `item-metadata-model.md` |
| Ship checklists | `ios-appstore-checklist.md`, `stripe-setup.md` |
| Parent report + practice log, email plan | `parent-report.md` |
| Why we skipped RevenueCat (billing decision) | `billing-revenuecat-decision.md` |
| Source licensing / attribution | `bank-sources.md`, `resources/README.md` |

## Skills

- `.claude/skills/item-authoring` — the rule ladder and itemGen pipeline. Load it
  before writing or editing any item prompt.
- `.claude/skills/robot-kid-e2e` — the Playwright smoke matrix (`npm run
  test:e2e`): kid oracle, widget drivers, and its traps. Load it before
  running/extending e2e or adding an answer widget.
- `.cursor/skills/kidmath-{add,audit}-mode-standards`, `kidmath-phase2-expand-mode`
  — Cursor-only, but their standards are summarized in Conventions above.
- `.agents/skills/supabase*` — vendored from `supabase/agent-skills`.
