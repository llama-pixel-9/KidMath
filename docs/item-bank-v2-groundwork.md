# Item bank v2 groundwork

*Added 2026-09-28.* The groundwork for item bank v2 (plan sections 5, 7, 9, 10
and 11): nothing a kid sees changes until a skill is switched. This branch
lands the database shape, the per-skill switch and preview mode, per-item
hints, the new QC checks and content tables, item models with their review
screen, a state on each kid profile, CI, and five engine fixes. All of it is
additive: v1 rows are never edited, and the web app runs the same before and
after the migration.

## What this branch adds

| Piece | Where |
|---|---|
| Migration: v2 columns, switch table, item models table | `supabase/migrations/20260928100000_item_bank_v2_groundwork.sql` |
| Migration: kid state | `supabase/migrations/20260928110000_kid_profiles_state.sql` |
| Version switch + preview marker + `isServable` | `src/itemBank/versionSwitch.js` (rules in `versionRules.js`) |
| iOS applies the switch (2026-10-02) | `src/engine/nativeBank.js`, `ios/KidMath/Services/BankService.swift` |
| Loaders read the switch, select the v2 columns, fall back | `src/itemBank/cloudLoader.js`, `src/itemBank/modeLoader.js`, `src/itemBank/normalize.js` |
| Served question carries version, itemModelId, difficulty, hint | `src/mathEngine.js` (`bankQuestionFor`) |
| Hint schema, per-item hint in the bulb pane | `src/hints/hintSchema.js`, `src/hints/index.js`, `src/components/HintPane.jsx` |
| Content tables | `src/content/contextTable.{json,js}`, `stateWords.{json,js}`, `kidSafeList.js` |
| New QC checks | `src/itemBank/qc/checks.js` |
| Item models: schema, expressions, fill, validator, Grade 2 money pilot | `src/itemModels/` |
| Admin: model review screen, version switch panel, write paths | `src/admin/ModelReviewPage.jsx`, `VersionSwitchPanel.jsx`, `itemModelsApi.js`, `versionSwitchApi.js` |
| Admin: item_bank select carries the v2 columns | `src/admin/itemBankAdminApi.js`, `QuestionPreview.jsx` |
| Kid state | `src/usStates.js`, `src/kidProfiles.js`, `src/account/AccountPage.jsx`, onboarding picker |
| Blind solve and school-printable review scripts | `scripts/itemGen/qc/blindSolve.js`, `kidSafeReview.js`, `kidView.js`, `qcCli.js` |
| CI | `.github/workflows/ci.yml` |
| Engine fixes (section 7) | `src/mathEngine.js` |

New specs, all in the `npm test` list: `versionSwitch`, `qcChecksV2`,
`contentTables`, `itemModels`, `adminV2Api`, `kidProfileState`. Existing specs
extended: `cloudLoader`, `modeLoader`, `hints`, `sessionEngine`.

## The migration, and applying it before any switch flips

Two files, both additive and idempotent (`if not exists`, `drop policy if
exists`; no existing row is edited). Apply from the repo root after review:

```bash
supabase db push
```

Agents never push by design; the migration was reviewed by reading only, since
there is no local Postgres in the container it was written in.

`20260928100000_item_bank_v2_groundwork.sql`:

- `item_bank` gains `item_model_id text`, `difficulty text` (`easy | moderate |
  hard`), `hint jsonb`, `tags jsonb`, `kid_safe jsonb`, all nullable, plus a
  partial index on `item_model_id`. `version int default 1` already existed.
- `item_version_switch(mode_id pk, live_version 'v1'|'preview'|'v2' default
  'v1', changed_by, changed_at, note)`, seeded with one `v1` row per skill (the
  25 `TOPIC_LABELS` keys in `src/skills/catalog.js`). RLS: anyone can read;
  insert/update/delete only when `public.is_admin(auth.uid())`.
- `item_models(id pk, mode_id, subskill, grade, difficulty, spec jsonb,
  review_status 'draft'|'approved'|'rejected'|'flagged', review_note,
  reviewed_by, reviewed_at, created_at, updated_at)`. Select for signed-in
  users, writes admin-only.

`20260928110000_kid_profiles_state.sql`: `kid_profiles.state text check (state
~ '^[A-Z]{2}$')`, null meaning Common Core wording.

Order of operations: the app does not depend on either migration having
landed. A missing `item_version_switch` table reads as "every skill on v1"; a
missing v2 column makes the loaders (and the admin API) retry once with the v1
column list and log once. So the web deploy and the migration can go in either
order. What does depend on it: **apply the migration before flipping any
switch**, because `/admin/switch` writes to the table, and `bank:export` with
the new columns (below) needs them to exist.

Pre-migration window to know about: saving a kid on the account page always
sends `state`, so that one form fails with a "column not found" message until
the second migration is applied. Reads and onboarding inserts are covered by
fallbacks.

## The per-skill switch and preview mode

`item_version_switch` says, per skill, which bank version kids see. The app
reads it when it hydrates the bank (`getVersionSwitch` in `cloudLoader.js`,
cached for the session and re-read by the debounced refresh), so a flip or a
rollback reaches the next session with no redeploy. A failed re-read keeps
the last good map (`readVersionSwitch` resolves null on failure), so a flaky
read cannot roll a flipped skill back to v1; before any good read every skill
is at its default.

`isServable(item, switchMap, { preview })` in `src/itemBank/versionRules.js`
(re-exported by `versionSwitch.js`) is the single rule, applied by
`fetchApprovedBank` and `modeLoader.fetchMode` on the web and by the native
engine's `src/engine/nativeBank.js` on iOS before rows reach the in-memory
bank:

| live value | version 1 row | version 2 row |
|---|---|---|
| `v1` (or missing) | served | dropped |
| `preview` | served to everyone else | served to preview browsers only |
| `v2` | dropped | served |

Only `approved` rows are ever servable; a null `version` counts as 1; an
unknown or absent map entry counts as `v1`. The admin paths
(`fetchAllBankItems`, `fetchBankItemById`) deliberately do not filter.

Preview marker: localStorage `kidmath:previewV2 === "1"`. Visiting any page
with `?preview=v2` sets it and `?preview=v1` clears it (same soft-gate pattern
as the `?invite=1` tester link; RLS still decides what rows exist).
`previewEnabled()` / `setPreviewEnabled(bool)` are the accessors, and
`/admin/switch` has a toggle for the current browser.

`/admin/switch` (`VersionSwitchPanel`): one row per skill with the live badge,
a v1 / preview / v2 segmented control that arms an inline confirm with an
optional note, who changed it and when. Readable by anyone signed in, writable
by admins (RLS enforces it too). `setLiveVersion` upserts the row and then
refreshes the admin's own bank so their next session serves the chosen
version. Rollback is flipping the skill back to `v1`.

**The iOS app applies the same switch (2026-10-02).** The rules live in the
dependency-free `src/itemBank/versionRules.js` (`isServable`, `topicVisible`,
`liveVersionFor`, `switchMapFromRows`, `DEFAULT_LIVE_VERSION`);
`versionSwitch.js` re-exports them for the web and the native engine imports
them directly, so a per-skill switch later is a change to that one file plus
the two selects that read the table. On iOS:

- `SupabaseService.fetchVersionSwitchRows` reads `mode_id, live_version`. The
  item select always carries `version` (on `item_bank` since migration 0001)
  and adds `item_model_id, difficulty, hint, tags` as the web's does; a
  Postgres 42703 on one of those four drops them for the app's life and
  retries the page (the web's `noteMissingV2Columns`), since a shipped build
  cannot be hot-fixed. The fetch is always the whole topic, never a level
  window, because its rows replace the topic's seed.
- `BankService` reads the switch alongside a topic's first fetch and injects
  it before the rows (`KidMath.setVersionSwitch(rows, { preview })`). When a
  kid opens a topic that is already loaded, the session waits for a re-read
  before it starts (at most one read per 30 s, counted from the last attempt,
  as the web's refresh debounce), so a flip lands between sessions, never
  inside one, with no re-fetch. A failed read keeps the last good rows, or
  none (v1 everywhere, Math Facts at v2), as the web now does. The engine
  skips the rebuild when the switch did not change. Only signed-in kids read
  the switch today; signed-out kids have no cloud rows for it to filter.
- The engine (`src/engine/nativeBank.js`) holds every cloud row of both
  versions per topic. A topic with cloud rows serves only what `isServable`
  allows, in place of its seed items (as the web's signed-in refresh replaces
  the seed). Swift passes the topic id with its rows
  (`KidMath.addBankRows(rows, modeId)`), so a fetch that returns no approved
  rows also replaces the seed. A topic that was never fetched keeps its seed
  unfiltered (as for anonymous and offline web kids).
- `KidMath.hiddenTopics()` gives the v2-only topics the pickers must hide. It
  is not wired yet: iOS has no Math Facts tile. When it gets one, read the
  switch at launch for every kid (anon may read the table) and filter the
  home grid, topic controls and worksheet picker by it, as
  `useHiddenTopics.js` does on the web.
- Preview on iOS: open `kidmath://preview?v=2` on the device (from Messages,
  Notes or Safari) to make it a preview viewer, and `kidmath://preview?v=1`
  to stop, the twins of the web's `?preview=v2` and `?preview=v1`. The flag is
  UserDefaults `previewV2`, persistent like the web's marker, and applies at
  once. Under Xcode or `simctl`, `-previewV2 1` sets it for one launch.
- **Rollout: do not approve a version-2 row until kids and testers are on an
  iOS build with this change.** Older builds (TestFlight included) select no
  `version`, read every v2 row as v1 and serve it whatever the switch says.
  On 2026-10-02 prod had no approved v2 rows, so nobody was exposed.
- Tests: `nativeVersionSwitch.spec.js`, `scripts/engineParity.mjs` (the built
  bundle in a bare sandbox), `ios/KidMathTests/VersionSwitchTests.swift`.

The bundled offline copy (`src/itemBank/items/`) is a plain export of approved
rows and does not know the switch yet; re-export when a skill flips (see the
re-export section).

## Per-item hints and the bulb

The hint object, the same shape on `item_bank.hint`, the normalized bank item
and the served `question.hint`:

```
{ nudge: string,
  steps: string[],
  picture: { kind: coinTray|tenFrame|numberLine|array|dots|strip|tapeDiagram|
                   barModel|clock|placeValueDiscs|hundredChart, ...kind fields } | null,
  example: { problem, steps: string[], answer } | null,
  feedback: { [wrongAnswerText]: sentence } | null,
  solution: { steps: string[], answer } | null }
```

Any field may be missing; consumers tolerate a partial object.

`src/hints/hintSchema.js` (pure, dependency-free): `PICTURE_KINDS`,
`validateHint(hint) -> { ok, errors }`, `usableHintFields(hint)` (only the
well-formed fields), and `hintContainsAnswer(hint, answer)`, which is true
when the nudge, any step or any feedback line contains the answer as a whole
token, reading money on both sides (`$0.91` and `91 cents` both match 91),
stripping thousands commas and keeping fractions and clock times whole.
`example` and `solution` may state an answer by design and are not scanned.

The bulb pane (`hintFor` in `src/hints/index.js`) reads `question.hint` field
by field: idea = nudge, steps = the item's steps, the worked example, and the
picture, each falling back to today's skill-level text, `stepsFor` recipe or
number-based scaffold when the field is absent or malformed. A v1 item yields
exactly the v1 result. `HintPane` draws the picture for the four kinds
`Scaffold` can draw (`dots`, `array`, `strip`, `numberLine`) and omits the
section for the other kinds until each has a drawing.

`mathEngine.js` stamps `version`, `itemModelId`, `difficulty` and `hint` from
the bank item onto every served bank question (`bankQuestionFor`), so they
ride into the mistake bank and the practice log. Nothing renders `feedback`
or `solution` yet (after-miss feedback and the second-miss solution are the
next step in the second-chance path).

## New QC checks

Added to `src/itemBank/qc/checks.js`; `version` is read from `item.version`
(null, absent or `"1"` count as 1). Each fails a v2 item and warns on v1, so
the existing bank keeps its approvals:

| Check | What it catches |
|---|---|
| `kidSafe` | any kid-safe list hit in prompt, string choices or hint text |
| `oneQuestionMark` | more than one question in the prose (an unknown-slot `?` next to an operator is not counted) |
| `questionWordMatchesAnswerType` | "which" typed on a number pad, "how many" answered by a clock, and so on |
| `contextObjectKnown` | a story object outside the context table, or outside the item's grade band / appeal floor |
| `priceInRange` | a price outside the object's `price_usd` range (packs, several objects and count x unit handled; coins and bills skipped) |
| `hintNoAnswer` | `hintContainsAnswer(item.hint, answer)` |
| `hintPresent` | warn: a v2 item without a hint |

Simulated as v2, the v1 bank would fail 9,136 `oneQuestionMark`, 740
`questionWordMatchesAnswerType`, 251 `priceInRange` and 69
`contextObjectKnown`, all by design (two questions in the prose, "which" typed
on a pad, a 43-cent bookmark, objects outside their band).

The admin review queue runs these through `runChecksOnAdminItem`; the admin
`item_bank` select now carries `version, item_model_id, difficulty, hint,
tags` (with the same one-time fallback as the loaders), so the hint checks see
real data once the migration is applied.

## Content tables (`src/content/`)

- `contextTable.json` = `{ objects: [...] }`, 538 objects from the preliminary
  context table (id, singular, plural, category, age bands, appeal 1-3, count
  and price ranges, pack, measures, settings, skills, why kids care).
  `contextTable.js`: `CONTEXT_OBJECTS`, `objectsFor({ skill, band, minAppeal =
  2 })`, `objectById(id)`, `findObjectsInText(text)` (whole-word singular or
  plural), `objectMatchesInText(text)` (with positions), `priceRangeFor(id)`,
  `packFor(id)`.
- `stateWords.json` (`CC, TX, VA, FL, GA`: phrase -> replacement, with
  `gradeLimits` and a structured `money` rule). `stateWords.js`: `STATE_TERMS`,
  `localize(text, stateCode, { grade })` (whole phrases only, keeps case and
  plural, fixes a/an), `swapsFor`, `moneyRuleFor`.
- `kidSafeList.js`: `KID_SAFE_TERMS` by category, `PERSONAL_DATA_PATTERNS`,
  `KID_SAFE_ALLOWLIST` (a game die, tug-of-war, a target as a goal, sports
  shots, fruit punch, and so on), `findKidSafeHits(text) -> [{ term, category
  }]`, whole-word and case-insensitive.

## Item models and the review screen

An item model is a template with slots that fills into many items. Under
`src/itemModels/`:

- `schema.js`: the model shape (JSDoc), closed lists (`GRADES`, `DIFFICULTIES`,
  `FORMATS`, `WIDGET_IDS`, `SLOT_KINDS`, `STANDARD_KEYS`, `PICTURE_KINDS`) and
  the `{slot}` / `{object_plural}` / `{object_a}` token helpers.
- `expr.js`: a small parser and evaluator for the expression strings in models
  (numbers, strings, slot fields, arithmetic, comparison, `&& || ! ?:`, and a
  whitelisted helper table such as `nextTen`, `fewestCoins`, `sum`). Chosen
  over `new Function` because models are read back from the `item_models`
  jsonb column.
- `fill.js`: `fill(model, { seed, state })`, seeded (the same seed gives the
  same item). Slots draw names, context-table objects, settings, money
  amounts, ints and coin lists; constraints and distractor collisions re-roll.
  Output is a bank item (`itemId` `${model.id}-s${seed}-v2`, `version 2`,
  `itemModelId`, `difficulty`, `hint` with the picture fields evaluated,
  `tags` with grade, standards, mistakes per wrong choice, slots). Money is
  formatted (`55¢` / `$1.09`, FL's `$0.45` from grade 2) and every rendered
  text goes through `localize`.
- `validate.js`: `validateModel(model) -> { ok, errors }`.
- `samples/grade2Money.js`: the five pilot models (`money-g2-countCoinsShown-
  easy`, `money-g2-changeFromDollar-moderate`, `money-g2-changeFromTwoDollars-
  hard`, `money-g2-totalTwoObjects-hard`, `money-g2-compareTwoAmounts-
  moderate`), each with standards for CCSS, TX, FL and VA.

Models live in `item_models` (`spec` is the model). `/admin/models`
(`ModelReviewPage`, admin-only) lists them with a mode filter and a
pending-only toggle, shows the template with slot tokens highlighted, the
spec line and standards, `validateModel` errors, any verdicts stored under
`spec.checks`, and five filled samples rendered through `QuestionPreview` with
their answer, mistake tags and feedback, check findings and the bulb panel.
Keys: `A` approve, `R` reject (eight one-tap reasons, or "other" with text),
`F` flag, `E` inline edit of `{ template, hint }` as JSON, `Space` re-roll
every sample. Approve is disabled while the model fails validation, a sample
cannot fill, or any sample has a fail-severity finding. A state select re-fills
the samples in that state's words. When `item_models` is empty or unreachable
the bundled samples show, with an amber banner, and decisions are not saved.

## Kid state

`kid_profiles.state` (two-letter code, null = Common Core wording).
`src/usStates.js` has `US_STATES` (50 states + DC) and `isUsStateCode`,
`usStateName`. `kidProfiles.js` caches it under localStorage
`kidmath-active-kid-state` beside the grade key; `setActiveKid(id, grade,
state)`, `activeKidState()`; `updateKid` and `addKid` validate the code before
any network call; `fetchKids` retries without the column on a project the
migration has not reached. The account page's per-kid edit form has the
State select ("Only changes the math words to match your state's test."), and
the profile picker and onboarding pass the state through when a kid is
picked. Nothing reads `activeKidState()` at serve time yet: v2 fills are
localized at generation time, and a runtime `localize` at the session seam
is a follow-up.

## CI

`.github/workflows/ci.yml` runs on pull requests and pushes to main:

- `web`: `npm ci`, `npm run lint` (advisory, see below), `npm test`, `npm run
  build`, `npm run build:engine`, `npm run test:engine` on Node 22. The engine
  build comes first because the parity check reads the gitignored bundle.
- `e2e`: Playwright chromium against the Vite dev server, `continue-on-error`
  until the matrix has been green in CI; the HTML report is uploaded on
  failure.
- `bank`: `bank:report` and the structure audit, only when
  `src/itemBank/items`, `src/content` or `src/itemModels` changed.

Lint is advisory because `origin/main` already carries 238 eslint errors in
35 files (unused vars under `scripts/itemGen/**`, plus `src/PremiumContext.jsx`,
`src/PaywallModal.jsx`, `src/itemBank/figureContracts.js`,
`src/modes/placeValueDiscs.js`); none is in a file this branch touches. Once
main lints clean, delete `continue-on-error: true` from that step.

## Running the new scripts

```bash
# blind solve: does a solver who sees only what the kid sees reach the key?
npm run bank:blind-solve -- --from-bank money --limit 40
npm run bank:blind-solve -- drafts.json --dry-run

# kid-safe: the list first, then "would a school print this?" (a model)
npm run bank:kid-safe -- --from-bank money --limit 40
npm run bank:kid-safe -- models.json --list-only --out -
```

Both shell out to the `claude` CLI (`-p`, JSON back, 20 items per call); when
it is not on PATH the model pass is skipped loudly and the report carries
`skipped: true`. Reports default to `qa-out/` (gitignored). The kid-safe review
imports `src/content/kidSafeList.js` directly. Details and report shapes:
`scripts/itemGen/qc/README.md`.

## The bundle re-export

The shipped bundle (`src/itemBank/items/*.js`) now holds 43,503 items and
`seedItems.js` 1,800: the 107 wrong-key rows retired on 27 Sep and the six
kid-safe rows retired on 28 Sep were pruned on this branch with the repo's own
writer (`scripts/lib/itemBankFiles.js`, then `npm run bank:seed:build`), so
no retired id ships offline and the six bank specs pass. That prune removed
rows only; it did not re-read the cloud, because the Supabase host is outside
the groundwork container's network allowlist. A full re-export is still the
right move after the migration lands, from a machine with egress:

```bash
set -a && source .env.local && set +a && npm run bank:export
```

Then check: the "Wrote N items" line (43,502 expected if nothing else
changed), `git diff --stat` shows only rows that changed in the cloud since
the prune, and the six bank specs still pass.
`scripts/exportCloudBank.js` exports version-1 rows only
(`version` is null or 1; the column predates v2) because bundled items never
pass the version switch, so an approved v2 row in the bundle would reach every
offline and pre-hydration kid whatever the switch says. Before the first
version-2 row is approved, either keep that restriction or add
`item_model_id, difficulty, hint, tags` to the select, carry them through
`rowToItem`, and filter the bundle through `isServable` at load time.

## Engine fixes (plan section 7)

All in `src/mathEngine.js`, each with a test in `sessionEngine.spec.js`:

1. Authored choices are served as a shuffled copy (`serveAuthoredChoices`)
   when `metadata.itemSource === "bank"`; a Yes/No judgment pair and a set
   marked `choicesFixed: true` keep their order. Generator sets are untouched.
2. A retry reuses a reshuffled copy of its stored `reviewChoices` instead of
   rebuilding near-miss distractors.
3. The "word problems off" setting no longer skips a due retry of a story
   item; it still routes new application questions to procedural. (Since
   2026-10-02 a held topic's v1 story is never served as a retry either,
   `src/skills/storyHold.js`.)
4. A miss late in the session is pulled forward (`firstRetryDueAt`) so the
   retry is served before the end card whenever at least two fresh questions
   remain.
5. Served bank questions carry `version`, `itemModelId`, `difficulty`, `hint`.

The iOS parity fixtures regenerated byte-identical, so no fixture changed.

## Follow-ups

- ~~**iOS mirror of the switch.**~~ Done 2026-10-02: iOS reads
  `item_version_switch` and the engine filters with the shared
  `versionRules.js` (see "The per-skill switch and preview mode"). Still open:
  iOS has no Math Facts tile yet, so `hiddenTopics()` has no caller.
- **Server-side version guard.** Old iOS builds serve every approved v2 row.
  A `version` filter in the select (or an RLS rule) would protect them, but
  only once the wanted version can be computed server-side per viewer.
- **Web mode load merges into the seed.** `modeLoader.ensureModeLoaded` adds a
  topic's servable rows to the bundled seed (`addBankItems`, existing ids
  win), so until the boot full refresh lands (or if it fails) a topic at v2
  serves its v1 seed items alongside the v2 rows. iOS replaces the seed. A fix
  must replace only on a complete signed-in load: anonymous loads resolve to
  no rows under RLS and must keep the seed, and a partial load keeps the seed
  on purpose.
- **iOS mirror of kid state.** Add `state` to `KidProfilesService.swift`
  (model, `selectFields`, update/insert) and cache it under UserDefaults
  `kidmath-active-kid-state`. Compile the iOS project locally before merging
  (no iOS CI).
- **Play-these** on the review screen: needs a session pin by model (the
  `/play` pin takes one bank row id) and a reviewer profile that saves nothing
  to a kid.
- **Blind solve and kid-safe in CI** for content batches, gated on the
  `claude` CLI being available (a `--require-claude` flag, or a check on
  `skipped` in the report).
- **Re-export with the new columns** after the migration (above).
- **Consent path drops the state**: `request-consent` reads only
  firstName/age/grade; add a `kid_state` column on `consent_requests`, pass it
  through the function and `grant_parental_consent`.
- **State wording at serve time**: wire `activeKidState()` into `localize` at
  the session seam, and `speakable.js` needs a money-to-words rule (`45¢`,
  `$1.09`).
- **Carried-over misses**: a mistake-bank entry restored with `dueAt >=
  sessionSize` (a miss on the last question) is never retried; reset restored
  entries to `min(dueAt, RETRY_SPACING)` in `createAdaptiveSession` and stop
  `MathExplorer.jsx` from bypassing it. Pre-existing, not introduced here.
- **Picture kinds** `coinTray`, `tenFrame`, `tapeDiagram`, `barModel`, `clock`,
  `placeValueDiscs`, `hundredChart` are accepted by the schema but not drawn
  in the bulb pane; define their field shapes, then add them to
  `PICTURE_FIELDS` and `DRAWABLE_KINDS` (duplicated in `HintPane.jsx` and
  `ModelReviewPage.jsx`).
- **Feedback and solution rendering** after a first and second miss.
- **Check tuning**: `promptLength` splits sentences on every `.` so decimal
  prices count as extra sentences (reuse `sentencesOf`); `priceInRange` treats
  any pack/box/bag word as a pack sale even when it is part of the object's
  name; the preliminary context table has verb-like object names (`like`,
  `turn`, `step`) worth renaming.
- **Server-side version filter**: the loaders filter versions client-side, so
  once v2 rows exist in volume every load downloads both; `modeLoader` can add
  `.eq("version", wanted)` once the switch map is known.
- **Lint on main** (238 errors) so the CI lint step can become blocking.
- `judge.js` still carries its own copy of the `claude` transport; import it
  from `qcCli.js`.
