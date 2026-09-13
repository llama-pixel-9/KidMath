# iOS ↔ web parity plan

Audit date: **2026-09-13**. Scope: bring the native app to feature parity with
the web app. **Out of scope:** the open-world / Skylark Island feature.

The iOS port tracked the web faithfully until 2026-08-24 (all 25 modes
registered, per-kid progress, meadow/fledging/first-flight, compliance
E1–E7, single larkit theme, free tier, auto-renewal disclosure). Nothing in
`ios/` changed for the next 20 days while `src/` took 22 commits — and `main`
did not compile for iOS in that window (fixed in PR #101). There is no iOS
CI; see the compile-before-merge rule in CLAUDE.md.

Status legend: ☐ open · ◐ partial · ☑ done (PR).

## Ranked gaps

| # | Gap | Impact | Size | Status |
|---|---|---|---|---|
| 1 | **COPPA consent flow.** `KidProfilesService.addKid` inserts a child's name/age/grade directly; the web refuses until the parent confirms by email (`request-consent` → link → `consent-confirm` creates the profile). Ship-blocker for App Review and §312.5. | critical | M | ☐ |
| 2 | **Item-bank reads don't paginate** (`SupabaseService.fetchModeItemRows`) — fractions (2,787), time (1,852), placeValueDiscs (1,406) clipped to 1,000 rows. CLAUDE.md hard rule. | critical | S | ☑ PR ios/parity-1 |
| 3 | **Missing widgets/figures.** `tenFrame` answer widget, figures `pictograph`, `tallyChart`, `linePlot`, `areaFigure` (spec shared via `KidMath.areaFigureSpec`), `SequenceNumberLine`. `IOS_MIRRORED_FIGURES` updated. `FigureRenderTests` snapshot every shape (`TEST_RUNNER_KIDMATH_FIGURE_SNAPSHOT_DIR=… ` writes PNGs). Still open: `display.numberLine.marks` under story prompts (rare). | high | M | ☑ PR ios/parity-2 |
| 4 | **No practice log.** `practice_sessions` never written from iOS → parent report blind to iPad sessions. `buildReport` is pure; expose via `nativeEntry` rather than reimplement. | high | M | ☐ |
| 5 | **Work space + hint panes** (web PR #93). `hintFor` not on the bridge; no Scratchpad (PencilKit), no HintPane, no SidePane for iPad. | high | L | ☐ |
| 6 | **Worksheets on the old generator** (`generateWorksheetSet`). Web uses `generateFlightLog` + `flightLogScope`: per-level, three-part sheet, separate answer-key sheet, page-fit rules, `allowWordProblems` pref. Neither is on the bridge. | med | M | ☐ |
| 7 | **Paywall literals** — `$54.99`, `49% OFF`, `$4.58/mo`, "22 modes, Grades 1-4" hardcoded; launch price is $39.99. | med | S | ☑ PR ios/parity-1 (derived from `Product.price`, fail-closed) |
| 8 | **Badges (8), stickers (22), engagement bar, journey map, grown-ups panel, `goalJustMet` toast, DepartureFlight animation** — missing. Facts they need (`perfectSessions`, `comebacks`, `trapWins`, `maxLevel`) not recorded. | med | M | ☐ |
| 9 | **Teach-don't-grade** — no `scaffoldFor` second chance, no read-aloud (`speech.js` → AVSpeechSynthesizer), no mastery line. | med | M | ☐ |
| 10 | **Home not grade-aware; kid can't be switched or edited** — no `groupsForGrade`, no Quick Start, `ProfilePickerView` only on cold start, no `updateKid`. Siblings on one iPad is the expected case. | med | M | ☐ |
| 11 | **Meadow art** — 59 WebP assets on web; iOS still draws placeholder shapes (`MeadowView.swift` "rough sketch"). | med | M | ☐ |
| 12 | **Ladder v2 unreachable** — `GamFlags` lacked `ladderV2`/`secondChance`/`readAloud`/`birdStore`; `GamFlags.all` defaulted OFF while web prod has `VITE_GAM_ALL=true`; `createAdaptiveSession` never got `options.ladderV2`; level-up copy capped at 10. | med | S | ☑ PR ios/parity-1 |
| 13 | **Allow-word-problems preference** (`user_preferences.allow_word_problems`) — no toggle, not passed to sessions. | low | S | ☐ |
| 14 | **Kid profiles service** — no `updateKid`, `hasParentalConsent`, `requestParentalConsent`, `KID_LIMIT_MESSAGE` (raw Postgres error shown). Folds into #1/#10. | — | — | ☐ |
| 15 | **Branding leftovers** — `CFBundleName` = KidMath (shows in iOS Settings), `kidmath://` URL scheme (OAuth sheet says "open KidMath"), bundle id `com.kidmath.app` (must change before ASC anyway), `ios/README.md` stale. | low | S–M | ☐ (bundle id waits on Apple) |
| 16 | **Telemetry / diagnostics** — web freeze-detection has no native analogue (MetricKit). Low priority. | low | M | ☐ |
| 17 | **iOS CI** — none. Compile-before-merge rule added to CLAUDE.md; a GitHub Actions macOS job is the real fix. | — | S | ☐ |

## Already at parity (don't redo)

Per-kid progress (`ProgressStore`, `SupabaseService` kid_id filters), engagement
blob + fledging + flight report + meadow logic (roster/zones/perches from the
engine), grade seeding (`GradeSeed.swift`), auto-renewal disclosure text,
free-tier ids, `rowIsActive`, theme/fonts/sounds/calm mode/reduce-motion,
account review + per-child delete + full delete, billing via App Store.

## Bridge additions needed (`src/engine/nativeEntry.js`)

`generateFlightLog`, `flightLogScope` (#6) · `hintFor` (#5) · `scaffoldFor`
(#9) · `buildReport` (#4). Done: `areaFigureSpec` (#3 — the file moved to
`src/figures/` because the bundle guard rejects anything under
`components/`; pure modules that iOS needs live outside `components/`).
Keep the bridge dependency-free (no progressStore/supabaseClient).

## Order of work

parity-1 (☑ #2 #7 #12) → parity-2 (☑ #3) → #1 consent → #4 practice log →
#6 worksheets → #10 home/kids → #8 badges/stickers → #9 teach-don't-grade →
#5 hints/work space → #11 meadow art → #13 #15 #16 #17.
