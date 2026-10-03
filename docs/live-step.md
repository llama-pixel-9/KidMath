# The live step: approved item models become rows kids play

This is how a topic's approved item models become version-2 `item_bank` rows,
get played by Sai, and go live. It covers Word Problems and Multi-Digit Math,
Grade 2. Money is not taken live by this process (see the last section).

Nothing in `scripts/live/` writes to the database. The scripts read exported
JSON files and write SQL files. A person runs those files, and only after
Sai has typed the go for that step. Steps that need his typed go are marked
**[GO]** below, with the words he types.

The plan behind this is `item-skill/live-step/plan.md` (section C).

## What is in the repo

- `src/itemModels/live/liveRules.js` holds Sai's decisions as code: which
  topics may be written approved, the deferred rows, and the hold rule.
- `src/itemModels/live/liveRows.js` holds the row logic: the gate every row
  passes as the app will see it, the database row, and the checksum the
  database must reproduce.
- `src/itemModels/live/liveCoverage.js` says whether every blueprint row and
  tier has items, and what each catalog skill would serve.
- `src/itemBank/v2/manifests/` holds one manifest per topic and grade once a
  run is committed. It is empty today, so the app and every spec behave as
  before. A manifest names the models, their seeds, the script rows and the
  md5 the database must match. The rows are refilled from the repo's model
  files (`src/itemBank/v2/modelRows.js`), so the bundle and the database hold
  the same rows.
- `src/itemBank/v2/topicReadiness.js` decides whether a topic may be flipped
  to v2. The switch panel uses it.
- `scripts/live/` holds the scripts: `exportSql`, `prepare`, `layout`,
  `qcPanels`, `readiness`, `unapprove` and `retire`.

Every script runs from the repo root with
`node --import ./scripts/lib/registerResolve.js scripts/live/<name>.mjs`.
Below, `live/<name>` is short for that.

## What is held and deferred, and why

**Held models.** An approved model whose "-2" fix is still a draft is held.
None of its items are written, because they would have to be retired as soon
as Sai approves the fix. The rule is `HOLD_ORIGINAL_WHILE_FIX_PENDING` in
`liveRules.js`, and `prepare` works out the held models from the export each
time. On 2026-10-03 that was 10 models: 8 in Word Problems
(compare-smaller-fewer, put-together-total-regroup, va-estimate, and the five
tx-1000 models) and 2 in Multi-Digit Math (across-zero-discs and
va-estimate-sum). A held model's tiers show as "waiting" in the report. Once
Sai approves the fix, rerun `prepare` with `--base` to add the fix's rows.

**Deferred rows.** Nine blueprint rows have no model yet because the app has
no widget for them. They are listed in `DEFERRED_ROWS` in `liveRules.js`
with the reason "no widget yet" and the date 2026-10-03:

- Word Problems: choose-two-equations, two-step-two-part,
  two-step-tape-choice, tx-fl-story-for-equation, tx-1000-story-for-equation.
- Multi-Digit Math: add-number-line, true-false, true-false-both-sides,
  va-not-equal.

A deferred row is reported, never counted as a gap. Take a row off the list
when its widget ships and its model is approved.

**Empty cells.** Twenty-one engine cells (level 4 to 6, a family, a subskill)
of these two topics will have no rows. Twelve are asked for by no catalog
skill. Nine sit in a skill that serves its other family, and their own rows
are deferred. `bankCellCoverage.spec.js` names each one with its reason in
`EMPTY_CELLS`, and checks the reason still holds.

**Both decisions are Sai's defaults and can change.** If he says "clear the
drafts first" or "don't defer", change `liveRules.js` and rerun `prepare`.

## Step 1. Export (read-only)

1. Print the count query:
   `live/exportSql wordProblems --grade 2`
2. Run it in the Supabase SQL editor, or through the read-only
   `execute_sql` tool. Save the result as `counts.json` in an export folder.
3. Print the table queries:
   `live/exportSql wordProblems --grade 2 --counts <dir>/counts.json`
4. Run each one. Save each result under the file name printed above it
   (`item_models.json`, `blueprint_rows.json`, `switch.json`,
   `identities-001.json`, and so on). The identity read is paged at 1,000
   rows, about 46 pages for the whole bank. Every page is needed, because a
   short read would miss a duplicate question.

`prepare` checks every table against `counts.json` and refuses a short or
doubled export.

## Step 2. Prepare (local, no database)

```bash
node --import ./scripts/lib/registerResolve.js scripts/live/prepare.mjs wordProblems \
  --grade 2 --export <dir> --model <pinned judge id> --reviewer <Sai's user id>
```

It stops at the first red step:

1. **Export.** Counts must match. Rows already live for this topic and grade
   must be exactly the `--base` manifest's.
2. **Drift and holds.** A model is filled only if the database approved it
   and its spec (minus `checks`) equals the repo file's. Any drift stops the
   run. Held models are set aside.
3. **Fill.** Each model is filled seed by seed to 30 new questions. Every
   item passes `appGate`, which checks the row as the app will hold it. No
   question may repeat one the bank already asks.
4. **Layout.** Every new item is drawn at 390 px by the session's own card.
   A spill drops the item, and the next seed refills it. Run this from a
   worktree with its own `npm ci`, because it writes
   `public/__sweep.json`. `--skip-layout` skips it for a dry run.
5. **QC.** Blind solve and kid-safe, two passes each with the same pinned
   judge (`qcPanels.mjs`). Each batch carries canaries that are never
   written. An item flagged once is dropped and refilled. A model with an
   item flagged twice, or with 10% of its items flagged, is held. The judge
   must be calibrated once per model and prompt first:
   `live/qcPanels --calibrate --model <id>`. A full run takes about 2 hours
   for Word Problems and 2.5 hours for Multi-Digit Math. It needs the
   `claude` command line on PATH. `--skip-qc` skips it for a dry run.
6. **Coverage.** Every listed tier of every blueprint row needs 8 or more
   items, unless the row is deferred or waits on a held or draft model.
7. **Output** goes to `qa-out/live/<topic>/<run>/`: `manifest.js`, `sql/`,
   `expected.json`, `expected-rows.json`, `items.json`, `receipt.json` and
   `report.md`.

A dry run (`--skip-layout` or `--skip-qc`) writes the report and
`items.json`, never a manifest or SQL.

## Step 3. Commit the manifest and the seed

1. Copy `manifest.js` to `src/itemBank/v2/manifests/wordProblemsG2.js`.
2. Import it in `src/itemBank/v2/manifests/index.js` and add it to
   `MANIFESTS`.
3. Run `npm run bank:seed:build`. For a topic with a manifest, the seed keeps
   rows for every family, band and subskill, because each skill draws only
   its own subskill. This adds about 160 KB for Word Problems and 140 KB for
   Multi-Digit Math to `seedItems.js`.
4. Run `npm run test`. With a manifest committed, these checks apply:
   - `liveStep.spec`: the rows refill to the manifest's md5, pass the gate,
     repeat no question, cover their rows, and are in the seed.
   - `bankCellCoverage.spec`: the catalog-skill gate replaces the
     no-rows exemption.
   - `skillSession.spec`: every skill plays from its own rows.
5. Commit to the draft PR.

`seedItems.js` feeds the iPhone engine, so this commit needs the Mac compile
in step 7.

## Step 4. Write — [GO "write wordProblems"]

Only after Sai types **write wordProblems** (or **write multiDigit**). The
agent, or Sai in the SQL editor, runs the files in `sql/` in order:

1. `01-blueprints.sql` approves the topic's draft blueprint rows. Approval
   lives in the database, and the coverage views count only approved rows.
2. `02-switch.sql` writes the topic's switch row at `preview`, only if it
   has none. That is already the code's default, so kids see no change.
3. `03-insert-*.sql` inserts the rows, approved, with `reviewed_by` set to
   Sai. Each insert only adds rows (`on conflict do nothing`) and returns
   `rows_in_file` and `inserted`. On a first run the two must be equal. Each
   file has a read-only `try/` twin that returns the checksum its rows give,
   for checking before the insert runs.
4. `90-checksum.sql` must return the rows and checksum in `expected.json`.
   If it does not, run `91-rows.sql`, save the result as `rows.json` and run
   `readiness.mjs` to name the rows that differ. Never overwrite a row to
   make it match.

The topic stays hidden from every kid. Its default is `preview`, and iPhone
builds before PR #150 do not show these topics at all.

## Step 5. Sai plays the preview

Sai plays signed in, at phone width:
`/play/wordProblems?skill=<skill id>&preview=v2`.

- He can retire a bad item in `/admin`, or the agent writes the SQL with
  `live/retire wordProblems --run <run> --ids a,b` and runs it after a
  **[GO]**. Retiring never deletes a row.
- Then re-export with `live/exportSql wordProblems --grade 2 --for readiness`
  and run `live/readiness <manifest.js> --export <dir> --rewrite`. This drops
  the retired rows from the manifest. Commit it, rebuild the seed, and CI
  checks again.

## Step 6. Readiness

`live/readiness <manifest.js> --export <dir>` compares the bank's checksum
with the manifest's md5, shows the switch value, and lists what each skill
would serve. It exits 1 on any difference or any serving gap.

## Step 7. Mac compile, then merge

There is no iOS CI, and `seedItems.js` feeds the iPhone engine. On a Mac:

```bash
npm run build:engine && cd ios && xcodegen generate && ./patch-scheme.sh && \
xcodebuild test -project KidMath.xcodeproj -scheme KidMath \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -quiet
```

Then mark the PR ready. **Sai merges.** The deploy is a cherry-pick onto
`main`, as for any web deploy.

## Step 8. Flip — Sai's act, or [GO "flip wordProblems"]

Sai flips the topic to v2 at `/admin/switch`, or types **flip wordProblems**
for the agent to do it. Each topic on that page has a readiness line, read
from its approved version-2 rows. The v2 button stays disabled until the
topic has rows and every catalog skill has rows in its own cell. If the
readiness read fails, the line says why and v2 stays disabled. v1 and
preview always work.

After the flip, run `readiness.mjs` again. The checksum must still match,
the switch must read v2, and a signed-out web play of each skill must get
seed rows.

These topics have no v1 stories, so nothing retires at the flip. Releasing
the held addition and subtraction stories is a separate decision
(`src/skills/storyHold.js`).

## Rollback

From the lightest step to the heaviest:

1. **Sai flips the topic back** to preview or v1 at `/admin/switch`. Kids'
   next session follows, with no deploy.
2. **Unapprove the run**, after a **[GO]**. Run
   `live/unapprove wordProblems --run <run> --manifest <manifest.js>`. It
   writes SQL that moves the run's rows back to draft, keyed on
   `source->>'run'`. It starts with a read-only count, and that count must
   match the expected one before the update runs. Nothing is deleted.
3. **Revert the PR** to take the rows out of the bundle.

## Money (not taken live here)

Money is a topic that iPhone builds before PR #150 show. Those builds read no
version column, so they would serve any approved v2 money row as v1.
`writeStatusFor` in `liveRules.js` therefore lets a money run write drafts
only, and only after **[GO "write money drafts"]**. Approving money rows
waits on two things. First, Sai must confirm that no pre-#150 build,
TestFlight included, can still be installed. Second, a follow-up PR must add
a per-cell "v2 where ready" rule that those builds ignore. Do not stage money
rows in `reviewed`: the Review queue shows reviewed rows, and one click there
approves them.

The repo's Grade 2 money models match the database again
(`src/itemModels/pilot/grade2Money.json`, synced 2026-10-03). Seven had kept
a later story wording. They now carry the prompts Sai approved. If that
wording is wanted, it comes back as "-2" drafts.
