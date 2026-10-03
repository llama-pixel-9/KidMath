---
name: item-models
description: Plan and write v2 item models for a skill (skill map, blueprint rows Sai approves, one model per approved row, cheap checks, drafts for review). Use when planning a skill's blueprint list, writing or fixing v2 item models, reviewing them, or briefing writer agents.
---

# Item models (v2)

An item model is one well-written question whose numbers and context are left as
slots. `fill` makes many items from it, each with a computed key.

Sai approved this process on 2026-10-01. **Sai signs off a blueprint list per
skill, row by row, before any model is written.** In the money pilot, writers
got per-cell "shape lists" invented in the thread. The tail of each list was
filler, and Sai's rejects traced back to it. A blueprint row replaces the shape
list. Each row is a real, distinct item type that a test justifies.

**Never invent a shape list. Never write a model for a row Sai has not
approved.**

## The whole process at a glance

The Grade 2 add/subtract pass (Oct 1-3, 2026) is the worked example: it ran
steps 1-8, step 9 is in progress (2026-10-03), and step 10 is not built. Each
step ends at a gate.

| # | Step | Who | Gate |
|---|---|---|---|
| 1 | Skill map: objectives, codes in all five frameworks, ranges, problem types | Claude | every code known; crosswalk errors listed |
| 2 | Blueprint list: ~30 rows per grade (Grade 2 ran 42 and 35), review page, numbered decisions | Claude writes, **Sai answers** | Sai's own message approves the list |
| 3 | Rows into the repo (PR) and the database | Claude; **Sai merges** | standards spec green; `--check` returns nothing |
| 4 | App pieces the rows need (widgets, topic, harness rules) | Claude; Mac build; **Sai merges** | web CI green, iPhone tests pass on Sai's Mac |
| 5 | Write models: one writer per group of rows, closed brief | Claude (writer agents) | harness 0 failures |
| 6 | Cheap checks: harness, blind solve, kid-safe, screenshots, a teacher's read | Claude | every flag fixed or explained |
| 7 | Load models as drafts; commit the model files (PR) | Claude; **Sai merges** | counts match; no draft overwrote a reviewed row |
| 8 | Review at larkit.io/admin/models | **Sai** | approve, reject with a note, flag, edit |
| 9 | Fix rejects from the notes; record each lesson | Claude | fix reloaded as a draft; lesson in the kit |
| 10 | Fill approved models into the bank and switch the topic on | Claude; **Sai flips** | **not built yet**, see Pipeline step 7 below |

## When to use

- **Use this skill** to plan a skill's rows, to write, fix or review v2 models,
  and to brief writer agents.
- **v1 bank items** (itemGen, the Review queue, rewords, sweeps) use
  `item-authoring`. Its wording rules apply here too, except where this skill
  says it overrides them.
- **Fact fluency** (single-digit facts) is a separate track and already built:
  `src/facts/`, plus `src/blueprints/factFluency.json` (`track: "fluency"`, rows
  made by script, no models). Keep facts out of item lists.
- **Bare computation** (computing, strategy steps, 10 or 100 more or less, the
  equal sign) gets its own blueprint list per grade, beside the story list.
  Sai decided on 2026-09-28 that plain computation goes in the bank as v2
  rows; `computationSampler` only fills an empty cell. Plain computing rows
  with no words are built by script instead of models when Sai approves that
  for the list. Grade 2 did (calc decision 3, approved 2026-10-02): calc rows
  1-4 and 16-22 come from `src/multiDigit/calcItems.js`, load as v2 drafts
  with `scripts/multiDigit/loadCalcItems.mjs`, and are built at run time for
  signed-out kids by `src/modes/multiDigit.js`. Types, tiers and tags:
  taxonomy section 6.

## Sources

- `docs/item-model-writing-kit.md` covers model JSON, slots, widgets, hints,
  harness checks and the money review rules. It was written for money; the lines
  listed just below do not apply to v2 skills.
- `references/taxonomy.md` covers the four axes, problem types and mistake tags.
- `references/blueprint-rows.md` covers row JSON, mapping a row to model fields,
  the review page and the pre-flight checklist.
- Standards and blueprints: `docs/standards-coverage.md`, `src/standards/`,
  `src/blueprints/index.js`.
- House wording: `docs/word-problem-authoring-guide.md` and `NARRATIVE_RULES` in
  `scripts/itemGen/structureRules.js`.
- Model code: `src/itemModels/`. Exemplars: `samples/grade2Money.js` and
  `pilot/grade2Money.json`.
- Content: `src/content/contextTable.json` (objects, kid counts, prices),
  `kidSafeList.js`, `stateWords.json`, and `src/itemModels/names.js` (the 40
  names).

### Kit lines that do not apply to v2 skills

The kit says to swap in the next skill's spec "and keep everything else". These
lines are the exceptions. Leave them out of every writer excerpt.

- **"The spec Sai approved" and the "Difficulty dials" table, all of it.** The
  skill's approved rows and the Difficulty section below replace them. The
  table's "Support" dial (picture shown → numbers only) and "Answer choices"
  dial are never difficulty dials here.
- **Workflow step 1** ("Write your 10 models") and **step 4** ("Ten models per
  cell means ten different question shapes… Vary…"). This is the invented shape
  list Sai banned. Write one model per approved row or listed variant.
- **Sentence shapes: "a cell of ten … no more than six models of one shape".**
  - Varied packaging, such as a folded story or the question first, goes inside
    one model: an int slot picks the wording and a text expr builds it, as the
    kit's bare-item section shows.
  - Alternatively, propose it to Sai as a new row. Never add extra models for
    it.
- **Picture-first and bare items: "About a third of a cell can take this
  shape".** The rows set the mix.
- **Checks every fill must pass: the jargon clause** ("no teacher jargon
  ('minuend', 'addend', 'equation' in K-2 wording)"). That claim is false: no
  check catches those words, because `TEACHER_JARGON` in
  `src/itemBank/qc/checks.js` lacks all three. Read for them yourself.
- **The money-only harness rules** (modeId `money`, `2.MD.C.8`, `money-g` ids).
  Since PR #156 they apply only to models with no blueprint row.

## Pipeline (each step ends at a gate)

1. **Skill map.** Write one page,
   `/mnt/project-files/item-skill/<skill>-map.md`.
   - Contents: the objectives in our words; the anchor CCSS code; each state's
     codes and crosswalk match; the number range per framework; what each state
     asks that Common Core does not; the codes a bare row can cite; the excluded
     neighbours and why; the problem types expected at the grade.
   - Check every code from the repo root. The command prints `[]` when every
     code is known:
     `node --input-type=module -e 'import { unknownCodes } from "./src/standards/index.js"; console.log(unknownCodes({ ccss: ["2.OA.A.1"], tx: ["2.4C", "2.7C"], fl: ["MA.2.AR.1.1"], va: ["2.CE.1c"], ga: ["2.NR.2.3"] }))'`
   - List crosswalk errors for Sai. Do not edit `src/standards/` inside a skill.
   - A review page whose code tables and "left out" section cover all of this
     may stand in for the map; say so on the page.
2. **Blueprint list.** The rows stay out of the repo and the database until Sai
   has answered.
   - Write about 30 rows per grade in `/mnt/project-files/item-skill/<skill>-blueprints.json` as `{ "source", "note", "rows": [...] }`. Put the review page beside it as `<skill>-blueprints.md`.
   - Pass the checklist in `references/blueprint-rows.md`. Its first item gives
     the shape-and-codes command for the draft file.
   - Send Sai the page with the file attached, plus numbered decisions and a
     recommendation for each. Freeze the row numbering once the page is sent.
   - Sai approves, edits or strikes each row. Approval comes only from Sai's own
     message, never from an agent's summary. Apply Sai's edits to the JSON.
   - Open the PR:
     - Branch from a fresh `origin/main`, in a worktree with its own `npm ci`.
     - Copy the file to `src/blueprints/<camelName>.json` and register it in
       `src/blueprints/index.js`.
     - Run `npx vitest run src/__tests__/standards.spec.js`, then open a PR.
   - After the PR merges, load the rows:
     - On an up-to-date `main`, run `node scripts/standards/loadStandards.js`.
     - Execute the printed SQL (about 680 KB) through the Supabase tools
       (`execute_sql`) or the SQL editor.
     - Run the `--check` query. No rows back means the database is in sync.
     - Set each row's status (SQL in `references/blueprint-rows.md`).
   - **Never run the load from a stale or unmerged branch.** It upserts every
     standard and deletes and reinserts every state's crosswalk links. Run from
     the wrong branch, it rewrites production standards data to that branch's
     copy.
3. **Write models.**
   - The harness takes each model's topic, grade and id prefix from its
     blueprint row, asks that the model carry a code in some framework
     (`validateModel` holds the codes to the row's), and runs the coin checks
     for money only (PR #156). A model
     with no row falls back to `--mode`, `--code` and `--prefix`.
   - **Before writing, land the app pieces the rows need** (a widget, a
     figure, a topic) and look at them on a phone. Writers must not fake a
     picture the app can't draw; a row marked `app: "needs …"` waits.
   - **Writers.** One writer agent per group of related rows (4 to 14 rows),
     each with the closed brief in `references/writer-brief.md`. Grade 2 used
     7 writers for 77 models. They write JSON in a scratch folder and run only
     the harness. Writers do not load anything or touch the repo.
   - **The thread reads every writer's report** and keeps a `NOTES.md` of
     problems that cut across groups. Fix those once, after all writers
     finish, rather than in each writer. Grade 2's example: rows that wanted
     "about half regroup" regrouped on every fill, because the trade slips only
     exist when a trade happens; one fix (`when` / `otherwise` on distractors,
     in the kit) cured four groups.
   - Write one model per approved row, or one per variant when the row lists
     `variants`.
   - Fill each model's fields from its row with "From row to model" in
     `references/blueprint-rows.md`. Each model sets its own `difficulty` (see
     Difficulty).
   - **`operation` is the computation that solves the item.** For v2 models,
     this replaces `item-authoring`'s payload convention (the givens in the
     structure's declared slots, with the situation's sign).
     - Examples:
       - Start unknown "Sam had some… put 24 on a card… now has 19" is `{a: 24,
         b: 19, op: '+'}`.
       - Change unknown "had 38… now has 62" is `{a: 62, b: 38, op: '-'}`.
       - A compare difference is bigger − smaller.
       - A bigger unknown with "fewer" adds the two givens.
     - Why: `storyMatches` in `src/worksheets/claimCheck.js` reads a, b and op
       to decide whether a story regroups, and so which worksheet it prints on.
       v1 start-unknown payloads kept the situation's sign, and 33 rows printed
       on the wrong regrouping sheet.
     - Leave `operation` out of two-step items. a and b cannot hold three
       numbers, and with no operation the sheet filter skips its regrouping
       test.
   - Writers work in a scratch folder, never in the repo.
   - When writing turns up a gap, send Sai a proposed row. Never write a model
     for it until Sai approves the row.
4. **Cheap checks**, in this order:
   - `npm run models:harness -- <group>.json --items <group>.items.json --per 5`,
     until every model passes. Name the items file `<group>.items.json`: the
     two tools below read that name.
   - Blind solve and kid-safe on `<group>.items.json`, both at once:
     `bash /mnt/project-files/item-skill/tools/runqc.sh <dir> <group>` from the
     repo root (it runs `scripts/itemGen/qc/blindSolve.js` and
     `kidSafeReview.js`; needs the `claude` CLI). The solver sees the item as
     the kid does and must reach the key. A flag counts only if it comes back
     on a rerun.
   - **Screenshots of every model with a picture or widget**, at phone width:
     `node /mnt/project-files/item-skill/tools/shots.mjs <group>.items.json <dir> --one`
     from a worktree with `node_modules` (it starts its own vite on port
     5205, or `SHOTS_PORT`, and uses `/opt/pw-browsers/chromium`; kill stray
     vite servers first, or it screenshots an old page). The tools live in the
     shared project folder, not the repo. Look at each one as the kid would.
     Grade 2's disc-mat and bar models would have been caught here.
   - Read every sample prompt and hint as a teacher would, with the reading
     list under "Rules learned from the Grade 2 add/subtract review" in the
     kit (object variety, a key that changes, real mistakes, names on
     pictures, pictures the kid can use).
   - Then at most **one AI review per subskill**: one reviewer reads that
     subskill's models against their rows. No checker swarms.
5. **Load drafts.**
   - Run `set -a && source .env.local && set +a && npm run models:load -- f.json --dryRun`, then the same without `--dryRun`.
     - The script loads neither env file itself.
     - It reads the URL from `SUPABASE_URL` or `VITE_SUPABASE_URL` (which lives
       in `.env`) and the service key from `.env.local`.
     - In a worktree, copy in both files first (CLAUDE.md). Also source `.env`
       if `.env.local` has no URL.
   - **From a cloud thread** (no `.env.local`): build the same upsert as SQL
     with `/mnt/project-files/item-skill/tools/mkload.mjs` (header lists the
     command and the check queries) and run each file with the Supabase
     `execute_sql` tool, in order. Then check the counts by mode and status,
     that no loaded model has a null `blueprint_id`, and run
     `select public.sync_item_model_standards(null);`.
   - Sai reviews at `/admin/models`.
   - Commit the loaded files under `src/itemModels/` in a PR, branched from a
     fresh `origin/main`: money is `money/grade<N>.json`; Grade 2 add/subtract
     is `g2Addsub/<group>.json`, one file per writer group (merged in PR #156).
     - `standards.spec.js` checks codes only for models under `src/itemModels/`,
       so models left in scratch skip the CI code gate.
     - Fixes from Sai's review go in the same file under their new ids.
   - Never `--force` over an approved model. A fix to a flagged or rejected
     model gets a new id with a `-2` suffix.
6. **Lessons.** Record each lesson from Sai's model reviews in the kit's "Rules
   learned" section. Then apply the `item-authoring` ladder: the guide,
   `NARRATIVE_RULES`, and a QC check when the rule is mechanical.
   - Read Sai's notes from the database (`select id, review_status,
     review_note from item_models where review_status in ('rejected',
     'flagged')`), answer each question in the thread, and put any choice
     (a new widget, a row change) to Sai on a card.
   - A fix to a rejected or flagged model keeps the review history: a new id
     with a `-2` suffix, loaded as a draft. Never overwrite an approved row;
     a fix to an approved model is also a `-2` draft, and the old one is set
     aside only after Sai approves the fix.
7. **Fill and go live. Not built yet** (money and Grade 2 add/subtract both
   wait on it). What it has to do, in order:
   - A script that fills each approved model into version-2 `item_bank` rows
     (30+ per skill and grade across easy, moderate and hard), keeping only
     fills with distinct prompts (`promptIdentity`), each through the QC gate,
     blind solve and kid-safe before any write ("it is unacceptable to push
     any item bank to the bank without QC checks", Sai, 2026-10-02).
   - A coverage check: every approved blueprint row has items at each tier it
     lists.
   - Bundle: `bank:export` exports version-1 rows only (see
     `docs/item-bank-v2-groundwork.md`, "The bundle re-export"), so decide
     before the first v2 row is approved whether v2 rows ship offline.
   - Switch: `/admin/switch` to `preview`, Sai plays it (`?preview=v2` on the
     web, `kidmath://preview?v=2` on iPhone), then Sai flips it to `v2`.
     Retire that topic's v1 stories in the same step, on Sai's typed go
     (decision of 2026-10-02).
   - iPhone builds older than PR #150 ignore the switch and serve every
     approved row, so no v2 row in an existing topic is approved until kids
     have that build.

## The four axes (full tables in references/taxonomy.md)

- **Problem type**: the situation, and where the unknown sits.
  - For add/subtract, these are the 15 situations in `additiveStructures.js`
    (CCSS Table 1, with the compare variants counted separately, plus
    both-parts-unknown), named by `structureType`. Two-step shapes have their own camelCase ids, listed in the
    taxonomy.
  - Classify from the text, never from v1 tags. 34% of the Grade 2 add/sub tags
    are wrong.
- **Representation**: `picture` (the quantities drawn as things), `model` (tape
  diagram, number line or bond) or `numbers` (text only).
  - Separately, mark each row as story or bare.
  - A bare row is defined under Coverage.
- **Answer format**: typed, multiple choice, choose the equation, choose the
  story, choose the model, complete the model, true/false, multiselect or
  two-part.
- **Demand**: recall, procedure or reasoning. Demand is not difficulty.

## Difficulty

- **Source**: the problem type (where the unknown sits, and wording that
  misleads), the number of steps, and regrouping. Never odd contexts, rare
  nouns, long sentences, invented names or adult settings.
- **Type tiers**, the G2 tier column in the taxonomy:
  - **Easy**: result unknown, total unknown, or both parts unknown. One step.
  - **Moderate**: a change or one part unknown, or a compare whose wording
    matches the operation (difference unknown, bigger unknown with "more",
    smaller unknown with "fewer").
  - **Hard**: any of the four misleading types (add-to start unknown, take-from
    start unknown, bigger unknown with "fewer", smaller unknown with "more");
    any two-step row; or a row with a detail to ignore, which appears only in
    hard rows.
- **A row records its type tier, and each model records its own tier.**
  - The row's `difficulty` is the type tier.
  - Each model's `difficulty` starts from the row's tier. When the model's
    numbers regroup, an easy row's model becomes moderate. Moderate and hard
    rows keep their tier.
  - A number-range variant stays inside its row. The review page shows each
    variant's tier, for example "easy (no regrouping) / moderate (one regroup)".
- **Number dial**, from easy to hard: whole tens; 2-digit ± 1-digit; 2-digit ±
  2-digit with no regrouping; regrouping in addition; regrouping in subtraction;
  subtracting across a zero. Use it to place numbers within a tier. Only the
  step from no regrouping to regrouping changes a model's tier.
- **Two-step rows** are built only from easy and moderate types, and are always
  hard.
  - Every given, the middle result and the answer stay within 100.
  - There is at most one regroup across both steps.
  - In the default variant, one of the two steps uses a one-digit number. The
    Progressions keep most Grade 2 two-step work to one-digit addends.
  - Never put misleading wording, two steps and regrouping in one item.
  - A state line may lift the range when the state asks for it (TX 2.4C,
    multi-step stories within 1,000). Only the numbers grow; the other limits
    hold. Every kid of the grade sees the line, so it is proposed as its own
    skill, last in the grade (Coverage, "No state filter").
- **Computation rows** use the rule in taxonomy section 6 (a second trade or
  a trade across a zero is its own hard row), approved with the Grade 2
  computation list (2026-10-02, decision 10). `checkCalcItem` in
  `src/multiDigit/calcItems.js` enforces it on the script rows.
- **Other axes**: picture, model and answer format are their own axes, never
  difficulty dials. Every distractor is a named mistake.
  - A slip must be possible on every fill. A carry or trade slip equals the
    key when nothing regroups, so a no-regrouping variant lists its own slips
    in `spec.variantMistakes`.
  - Write each slip's value for the example into `spec.slips`, so the check
    script can recompute it.

## Coverage

- **Rows set the count, not a quota.** About 30 distinct, test-justified rows
  per grade per skill. The number of models follows the rows; there is no fixed
  ten per cell.
- **Every objective gets these, alongside its story rows** (Sai, 2026-09-30):
  - **At least one picture row** (`spec.representation: "picture"`): the
    quantities drawn as things.
    - A row the app cannot draw yet still goes on the list, marked `app: "needs
      …"`.
    - A tape diagram or number line is a model row, not a picture row. If you
      think a model row should stand in for a picture row, put that to Sai as a
      numbered decision.
  - **At least one bare row** (`spec.story: false`).
    - In a story skill, a bare row is the same relation written as an equation
      with a box: □ − 24 = 19, 46 + □ = 72, 36 − 14 + □ = 31.
    - A two-step bare row puts the box in the second step, and that step adds
      (taxonomy section 1, "Bare and reasoning rows").
    - A story with equation choices is a story row.
    - A computing item (45 + 27 = ?, 58 − 23 + 7 = □) belongs on the grade's
      computation list, not on a story list.
  - **Reasoning rows**, not only procedure rows.
- **Every problem type the grade expects** gets a row, or a written reason why
  not.
- **Every code gets a place.** Take the grade's codes from `src/standards/` in
  all five frameworks and place each one exactly once: cited by a row, left
  out with a reason (another list or track owns it), not this subject, a
  parent code, or a process standard. A code left out for another track must
  be cited there, or listed as pending with a plan. Script it, so a gap fails
  loudly; copy `/mnt/project-files/item-skill/g2-addsub-coverage.mjs`.
- **When Sai says "all of X"**, cover the whole subject at the grade (stories,
  computation, the equal sign, and the state ranges), and say on the page
  which grades the pass covers.
- **Common Core wording is the base.**
  - A state line exists only where that state asks the question differently:
    a different item type, range or task (Sai, 2026-10-01).
  - Keep a state's line even when only one state asks for it (Sai,
    2026-10-02: "err on the side of keeping the states recommendation").
  - Vocabulary differences are never a state line. `stateWords.json` maps the
    vocabulary per state, for example "strip diagram", "number sentence" and
    money notation, as backend data. Admin preview and
    `fill(model, { state })` can use it, but bank items are filled with no
    state and play reads no state, so every kid sees the Common Core word. A
    hint may name the state word once, using "it" ("Some classes call it a
    strip diagram").
- **When a grade has no state test.** TX, VA and GA start state tests at Grade
  3, and FL K-2 uses a vendor's adaptive test, so no Grade 2 state test can
  justify a line.
  - A line resting on the state's standard for that grade is kept (Sai,
    2026-10-02). It does not go to Sai as a decision to widen the rule; name
    the standard in the row's `why`.
- **No state filter** (Sai, 2026-10-02, 17:54 UTC). No per-state filter will
  be built. The account page stores an optional wording state per kid
  (`kid_profiles.state`), but nothing in play reads it (`activeKidState` has
  no caller), so every kid sees the same words. State codes (TX, FL,
  VA, GA) are backend tags that feed the Standards tab and coverage. Every
  approved row, state lines included, reaches every kid of its grade and
  skill.
  - `state.asks` says what the state asks, never which kids the row serves
    (never "Serve to X kids only").
  - Write a state line so any kid of the grade can answer it.
  - A row whose numbers go past Common Core's range for the grade is proposed
    to Sai as its own skill, listed last in the grade. Say on the review page
    that, like every skill in a grade, it counts toward the grade: a grade is
    complete only when every skill is mastered, and the Fledging Flight draws
    from every skill (`summarize` in `src/skills/mastery.js`, `gradeUpStatus`
    in `src/skills/topicState.js`). The skill cites only its rows' codes
    (`ccss: []` when no Common Core code fits).
  - A move Common Core does not teach at that grade must be answerable
    without the hint, because mastery does not count a right answer reached
    with the hint (`if (attempt.hint && attempt.correct) return false` in
    `mastery.js`). Put the meaning in the item, for example keys labelled
    "= (equal)" and "≠ (not equal)", rather than relying on the bulb.
- **A state line is its own row, not a variant**, even when only the range
  differs: codes live on a row, and a variant can't carry them. Say so on the
  page.
- **Equal-sign items** (true/false, = or ≠, a sum on both sides) go on the
  computation list, not a story list.
- **Leave out of a story list**: fact fluency, bare computation (its own
  list), and neighbours with their own codes: money (2.MD.C.8), lengths
  (2.MD.B.5), graphs (2.MD.D.10).
- **Range**: stay inside the standard's range, which is within 100 for
  2.OA.A.1. Read a state's range in its official text, not our one-line
  summary: Texas 2.4C runs stories to 1,000, Virginia 2023 caps each number
  added or subtracted at 100 (not the total), and Georgia 2.NR.2.3 names
  two-digit numbers. A wider state range is a state line, not the default.
  It is kept, and because every kid sees it, it goes in its own skill.

## Wording and kid-safe

Every rule `item-authoring` enforces applies. On top of those:

- **Nouns.** Restate the counted noun. A compare question names both sides
  ("than Milo").
- **Context.** It must matter: no story on a bare item, and never a
  self-answering item.
- **Shape.**
  - 2-4 short sentences, at most two facts each.
  - One question, and its question word matches the answer.
  - Never open a sentence with a numeral ("19 kids are…") or a bare number slot.
- **Repeat the name; no he, she, him, her, his, hers or they for a story's
  people** ("Mia gets 25 more trading cards from a friend. How many trading
  cards does Mia have now?"). Possessives are fine ("Mia's friend"). This
  follows the kit's money rule. For v2 it overrides `GOLD_EXAMPLES` in
  `structureRules.js`, which use pronouns.
- **K-2 jargon.**
  - Never write addend, minuend or subtrahend.
  - "Equation" appears only in choose-the-equation rows, and only if the state
    tests use the word (Sai's condition). For a grade with no state test, ask
    Sai on the review page which word those rows use.
  - `stateWords` maps "equation" to "number sentence" for TX and VA in K-2,
    as backend data. Play applies no state words, so every kid reads
    "equation"; a hint may name "number sentence" once.
  - **No check catches these words** (`TEACHER_JARGON` lacks them), so read for
    them yourself.
- **Clutter.** No tail instructions ("Sketch the bar if it helps"), no
  fragments, no race words in a compare ("how far ahead").
- **Hints never hold the key.** A nudge, step or feedback line never states
  the answer; the v2 `hintNoAnswer` check in `src/itemBank/qc/checks.js`
  fails it. Only the worked solution may name it.
  - For an estimate row, the steps say to work the exact answer, then ask
    which ten it is closest to, and stop.
  - Never write "=" or "≠" in a hint line of a row whose key is that sign.
- **Objects and counts.**
  - Use objects kids care about, at counts one kid could own.
  - `fill` ignores the context table's counts (that is how v1 shipped "51 license plates"), so constrain each object slot: `obj.count_one_kid != null && <total> <= sum(drop(obj.count_one_kid, 1))`.
- **Names, settings, brands.** Names come from `src/itemModels/names.js` only.
  No adult or institutional settings, and no brands (v1 had "lego bricks").
- **Fresh numbers per item type.** v1 reused 27 + 31 across a story, a Yes/No
  item and a drill.
- **Pictures.** A picture never lets the kid count off the answer. A new figure
  class needs a line in `src/itemBank/figureContracts.js`.
- **Kid-safe checks.** Run the harness list, then `bank:kid-safe`, then ask:
  would a school print this?
- **Sources.**
  - Textbooks, curricula (EngageNY is CC BY-NC-SA) and state tests are for
    structure and pedagogy only. Never copy or closely paraphrase an item.
  - No example may share a number set or a sentence frame with the verbatim
    Table 1 and Progressions items in `docs/research-k4-problem-types.md`.

## Standards

- **Where codes come from.** Every code is in `src/standards/<fw>.json`.
- **Long form only**: `2.OA.A.1`, `2.7C`, `MA.2.AR.1.1`, `2.CE.1c`, `2.NR.2.3`.
  - A short form resolves, but `standards.spec.js` fails any row, model or
    catalog skill with an unknown code.
  - The database does not catch a typo: its link sync matches aliases and
    skips an unknown code silently. CI is the only gate.
- **Cite all five frameworks** wherever a code fits.
  - Carry the state code itself. A crosswalk link counts on its own only when it
    is `same`.
  - Cite the child code (`2.CE.1c`), not the parent.
- **Story rows**, one-step and two-step, for Grade 2 add/subtract cite these
  codes:
  - CCSS 2.OA.A.1
  - TX 2.4C and 2.7C. 2.4C covers one-step and multi-step stories; its link to
    2.OA.A.1 is `broader`, so it must be cited itself.
  - FL MA.2.AR.1.1
  - VA 2.CE.1c
  - GA 2.NR.2.3
- **Bare rows** cite the codes that fit a bare item, never the word-problem
  codes. For Grade 2 add/subtract:

  | Item kind | CCSS | TX | FL | VA | GA |
  |---|---|---|---|---|---|
  | Equation with a box, within 100 (this skill's bare rows) | 2.NBT.B.5 | 2.4B | MA.2.AR.2.2 | 2.CE.1b | 2.NR.2.4 |
  | Computing within 100 (the computation list) | 2.NBT.B.5 | 2.4B | MA.2.NSO.2.3 | 2.CE.1b | 2.NR.2.4 |
  | Computing within 1,000 (the computation list) | 2.NBT.B.7 | — | MA.2.NSO.2.4 | — | — |

  - TX 2.4B links to 2.NBT.B.5 only `partly`, so a CCSS tag never counts for
    Texas. Carry 2.4B itself.
  - Do not cite a lower grade's code (1.OA.D.8, TX 1.5F, GA 1.NR.2.6) or a
    within-20 code (VA 2.CE.1g) on a Grade 2 row within 100. Those are different
    skills, and the row would mark them planned.
- **Empty lists.** Any one framework's list may be empty, with the reason in
  `spec.why`. All five empty fails `validateBlueprintRow` ("cites no code").
- **Never store official text.** Store only our own one-line summaries.

## Cost

Credits are not the constraint right now, but don't fan out dozens of agents
that each re-read the repo.

- One researcher per question.
- Give writers excerpts:
  - their approved rows
  - the kit sections they need, leaving out the lines listed under "Kit lines
    that do not apply"
  - their taxonomy rows and tags
  - two exemplars
  - the harness command
- Tell Sai how many agents a run will use.

## Open gaps (updated 2026-10-03)

Closed by PR #156 (merged 2026-10-03): the harness reads each model's row,
`blueprintId` flows through the schema, `fill` and the loader, the disc mat
counts in `promptIdentity`, the `multiDigit` topic exists, and `when` /
`otherwise` distractors keep "about half regroup" rows honest.

Still open:

- **No path to the bank for models.** Nothing fills approved models into v2
  `item_bank` rows yet; see Pipeline step 7. (Script rows have a loader; see
  "When to use".)
- **The version switch is per mode.** Flipping `addition` replaces every grade,
  so new v2 rows go in a v2-only topic (Word Problems, Multi-Digit Math).
  Installed iPhone builds older than PR #150 ignore the switch. Agree with Sai
  where a skill's rows will serve.
- **No per-state filter, by decision** (Sai, 2026-10-02): state lines are
  approved and served like any row.
- **Formats and figures.**
  - True/false and multiselect cannot be written as models yet (a model needs
    2 distractors and 3 or more choices, and can't carry a list answer);
    two-part answers don't exist. There is no ≠ key.
  - The tape diagram has two shapes only. Its bars were labelled A and B,
    which Sai rejected on 2026-10-03; names on the bars (`labelA`, `labelB`
    on a `barCompare` display) are being added. The number line draws one
    hop. There are no base-ten blocks.
  - The disc mat was a picture only, and Sai rejected five mat models on
    2026-10-03 for it. A mat the kid taps (`placeValueDiscs` with
    `display.mode: "build"`; the answer is the number the finished mat shows)
    is being built. Until it merges, no model may ask the kid to work on a
    mat.
  - The price list drew on the web only, and the blind solver was not shown
    it; an iPhone table and a solver line are being added (2026-10-03).
  - Long text choices sit two to a row; check them with screenshots.
  - Hint pictures other than dots, array, strip, numberLine and tenFrame
    (coinTray, barModel, tapeDiagram, clock, placeValueDiscs, hundredChart)
    validate but are not drawn; the iPhone also skips tenFrame.
- **QC never checks that the key follows from the text** (blind solve does). It
  also misses fragments, a compare question without "than", and nounless
  questions whose verbs are outside its list ("How many arrived?"). Two-step
  `structureType`s, the bare ids and five one-step ids (`addToResult`,
  `takeFromResult`, `putTogetherTotal`, `putTogetherAddend`,
  `bothAddendsUnknown`) have no entry in `structureCheck.js`, so only its
  universal checks run on them.
- **The harness does not count distinct objects**, and it only warns when a
  model has fewer than 8 distinct answers in 200 seeds, so a choice key stuck
  on 2 values passes. Count both in 40 fills yourself (kit, "Rules learned
  from the Grade 2 add/subtract review").

## Pilot status (2026-10-03)

- **Where it stands.** Sai approved both lists on 2026-10-02 (22:47 UTC,
  "approve both lists as recommended"). The rows and their app pieces
  merged in PR #156. 77 models (43 Word Problems, 34 Multi-Digit Math) were
  loaded as drafts on 2026-10-03 (~01:36 UTC). Their files are in `src/itemModels/g2Addsub/` (PR #156).
  Sai's first review the same night rejected 7 with notes and asked for
  fixed copies of 10 approved ones; their lessons are in the kit, and the
  fixes (a tappable disc mat, names on bars, more objects, wider estimate
  keys) load as `-2` drafts. Both
  topics stay hidden until their items exist (step 7).
- **Scope.** All of Grade 2 adding and subtracting (Sai, 2026-10-02), in two
  lists. Kindergarten, Grade 1 and Grade 3 follow with the same process.
- **Word problems**, slug `g2-addsub-wp`, ids `wp-g2-*`, topic `wordProblems`
  (Sai settled the topic on 2026-10-02: one Word Problems topic for every
  story; multiply and divide stories join later as their own skills).
  42 rows: rows 1-33 as sent on 2026-10-01 (numbering frozen), 34-35 the
  two-step bare and picture rows, 36-42 state lines past 100, proposed as
  their own skill (`biggerNumberStories`, decision 4). Every kid sees state
  lines.
- **Computation**, slug `g2-addsub-calc`, ids `calc-g2-*`, topic
  `multiDigit` (approved 2026-10-02, its decision 1). 35 rows. Row 35 is its
  own skill, `tenOrHundredTo1200` (decision 11, in `src/skills/catalog.js`).
- **Files**, in `/mnt/project-files/item-skill/`: `<slug>-blueprints.md` (the
  review page, numbered in file order) and `.json`, built by
  `<slug>-build.mjs`; `<slug>-check.mjs` runs the mechanical checklist (shape,
  codes, names, numbers, recomputed keys and slips, structure checks);
  `g2-addsub-coverage.mjs` places every Grade 2 code. Run the scripts from the
  repo root with `node --import ./scripts/lib/registerResolve.js`. Apply Sai's
  edits in the build scripts and rerun all three. The copy Sai commented on
  is in `archive/`; the research behind both lists is in `research/`.
- **Writer files** for the 77 models (briefs, build scripts, harness reports,
  QC results, load SQL) are in the thread's scratch folder; the brief is
  `references/writer-brief.md`, and the reusable tools are in
  `/mnt/project-files/item-skill/tools/`.
- **v1 stories.** Sai settled decision 9 on 2026-10-02 (13:10 UTC): each
  topic's v1 stories retire only when its v2 stories go live; nothing is
  retired now. The all-at-once retire (draft PR #152) was closed unmerged;
  reuse its pieces topic by topic. The one wrong-key story
  (`addition-app-433`) was retired on its own at Sai's go (PR #153, merged).
  Retire only on Sai's typed go, and never so that the template generator
  fills a story cell.
- **Money** has 15 picture-first lines
  (`/mnt/project-files/item-skill/money-picture-blueprints.md`) waiting for
  Sai's edits. They predate this format. Move them into the step 2 flow when
  Sai answers.
- **v1 stories are reference only.** v1 has 435 Grade 2 two-digit add/sub
  stories. All are words only, 4-choice and one-step, and none is take-apart,
  both-parts-unknown or two-step. Reclassify each from its text before using
  it.
