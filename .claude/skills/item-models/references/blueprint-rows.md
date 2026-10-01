# Blueprint rows: shape, review page, pre-flight checklist

A blueprint row is a one-line plan for one distinct, test-justified item
type. Sai approves rows. Writers turn each approved row into one item model,
or one per listed variant. This file covers:

- where rows live
- every field in a row
- how a row maps onto model fields
- the review page Sai reads
- the checklist a draft list must pass before Sai sees it

## Where rows live and how they load

1. **Draft.** Until Sai answers, the rows live only in
   `/mnt/project-files/item-skill/<skill>-blueprints.json` as
   `{ "source", "note", "rows": [...] }`. They are not in the repo or the
   database.
   - Loading early adds nothing, because coverage counts only approved rows.
   - It would also freeze the ids before Sai edits them.
2. **Repo, by pull request.** After Sai answers, the rows move into the repo
   (`docs/standards-coverage.md`: rows change by pull request):
   - Branch from a fresh `origin/main` and copy the file to
     `src/blueprints/<camelName>.json`. `factFluency.json` is the worked
     example.
   - Register it in `src/blueprints/index.js`: import it and add it to `FILES`.
     A file that is not registered is ignored.
   - Run `npx vitest run src/__tests__/standards.spec.js`, then open the PR.
3. **CI gate.** `src/__tests__/standards.spec.js` checks that each registered
   row passes `validateBlueprintRow`, and that every code it cites is in
   `src/standards/<fw>.json` in long form.
4. **Loading, after merge only.**
   - On an up-to-date `main`, run `node scripts/standards/loadStandards.js`. It
     prints the SQL, about 540 KB. Run it through the Supabase tools
     (`execute_sql`) or the SQL editor. No service key is needed.
   - **The SQL rewrites more than your rows.** It upserts every standard and
     deletes and reinserts every state's crosswalk links. Run it from a stale or
     unmerged branch and production standards data becomes that branch's copy.
   - `--check` prints a query that returns no rows when the database matches
     the files. It compares draft rows **by title only**, so it cannot confirm
     an
     edited example, spec or code. Confirm those with these two queries:
     `select id, title, example, spec from public.blueprint_rows where id in (...);`
     `select * from public.blueprint_standards where blueprint_id in (...);`
5. **Reload rules.**
   - A reload updates a row **only while it is a draft**. An approved or struck
     row is never touched, and neither are its code links.
   - Rows are never deleted. A row dropped from the file stays in the database
     as a draft. Keep struck rows in the file.
6. **Only these keys reach the database.**
   - The top-level columns are `track`, `mode_id`, `grade`, `title`,
     `problem_type`, `picture`, `answer_format`, `difficulty` and `example`.
   - `spec` becomes jsonb.
   - `standards` becomes `blueprint_standards` links, for loaded frameworks
     only.
   - Any other top-level key is dropped silently, so everything else goes
     inside `spec`.

## Row shape

```json
{
  "id": "wp-g2-take-from-start",
  "track": "item",
  "mode_id": "addition",
  "grade": "2",
  "title": "Take from, start unknown: story in words, typed answer",
  "problem_type": "Take from, start unknown",
  "picture": "none, words only",
  "answer_format": "typed (number pad)",
  "difficulty": "hard",
  "example": "Sam had some stickers. Sam put 24 stickers on a card. Now Sam has 19 stickers. How many stickers did Sam have at the start? [43]",
  "standards": { "ccss": ["2.OA.A.1"], "tx": ["2.4C", "2.7C"], "fl": ["MA.2.AR.1.1"], "va": ["2.CE.1c"], "ga": ["2.NR.2.3"] },
  "spec": {
    "skill": "g2-addsub-wp",
    "objective": "One-step add and subtract stories within 100, unknown in any place",
    "structureType": "takeFromStartUnknown",
    "representation": "numbers",
    "story": true,
    "format": "typed",
    "widget": "numberPad",
    "demand": "procedure",
    "steps": 1,
    "numbers": { "max": 100, "regroup": "one" },
    "family": "application",
    "subskill": "<one of the mode's subskills>",
    "mistakes": ["subtractedInsteadOfAdded", "answeredWithAGiven", "forgotToCarry"],
    "why": "Start unknown is one of the four types Common Core leaves to Grade 2; the action word points to the wrong operation",
    "state": null,
    "app": "today",
    "models": 1,
    "levelRange": [7, 10]
  }
}
```

### Top-level fields

| Field | Required | What goes in it |
|---|---|---|
| `id` | yes | Kebab case: a short prefix for the skill, the grade, then the type, plus what the kid sees or does when two rows share a type (`wp-g2-take-from-start`, `wp-g2-tape-missing-part`, `wp-g2-box-middle`, `wp-g2-choose-equation`). Must match `^[a-z0-9]+(-[a-z0-9]+)*$`. **Never rename a loaded id.** Approval is keyed on it, and a renamed row loads as a new draft while the old one stays. |
| `track` | yes | `"item"`. `"fluency"` is the fact-fluency track only. |
| `mode_id` | yes | The topic the models will be filed under. It decides what a version-switch flip replaces (see SKILL.md). Settle it before approval, because a reload cannot change it afterwards. The `addition` in the example is only an illustration. |
| `grade` | yes | `"K"` to `"5"`. |
| `title` | yes | One line in our words: type, then what the kid sees and does. This is what the Standards tab lists. |
| `problem_type` | no, but always fill it | The plain name from the taxonomy table. |
| `picture` | no, but always fill it | What the kid sees, in words: "tape diagram, whole and one part labelled", "tens and ones picture", "none, words only". |
| `answer_format` | no, but always fill it | "typed (number pad)", "multiple choice, 4", "choose the number sentence", "Yes / No"… |
| `difficulty` | no, but always fill it | The row's type tier: `easy`, `moderate` or `hard`, from problem type and steps (SKILL.md, Difficulty). A regrouping variant of an easy row is moderate at the model level; the page shows both. |
| `example` | no, but always fill it | One complete item in our words, with the key in brackets. For multiple choice, also list the choices and the mistake behind each one. It must pass every wording rule, because Sai judges the row by it. |
| `standards` | yes | `{ccss, tx, fl, va, ga}`, each a list of long-form codes. A framework with no fitting code gets an empty list, with the reason in `spec.why`. All five may not be empty. |
| `status`, `note` | **never in the file** | Decided in the database. `validateBlueprintRow` rejects `status`. |

### `spec` fields

| Field | What goes in it |
|---|---|
| `skill` | A slug shared by every row in the list (`g2-addsub-wp`). The review page and writers group by it. |
| `objective` | Our one-line objective the row serves. The coverage rules count per objective. |
| `structureType` | The taxonomy id, a two-step id from the taxonomy, or the skill map's id for a non-additive skill. The model copies it. |
| `representation` | `picture` (the quantities drawn as things), `model` (tape diagram, number line, bond) or `numbers`. A model is never a picture row. |
| `story` | `true` if a context matters to the question. `false` for a bare item: in a story skill, the relation as an equation with a box. |
| `format` | `typed`, `multipleChoice`, `chooseEquation`, `chooseStory`, `chooseModel`, `completeModel`, `trueFalse`, `multiSelect` or `twoPart`. |
| `widget` | The widget the models will use: `numberPad`, `barModel`, `numberLine`, `null` (choice grid)… |
| `demand` | `recall`, `procedure` or `reasoning`. |
| `steps` | `1` or `2`. |
| `numbers` | `max` is the standard's ceiling (100 for 2.OA.A.1). `regroup` is `none`, `one`, `any` or `acrossZero`. Add `min` or `note` when they matter ("tens only", "one-digit change"). Two-step rows follow the limits in SKILL.md. |
| `family` | The model `family`: a story is `application`; a bare relation or a reasoning item is `conceptual`; a bare computation is `procedural`. |
| `subskill` | The subskill the models will carry. It must be one of `mode_id`'s declared subskills. |
| `mistakes` | Two or three taxonomy mistake tags the distractors and feedback must model. |
| `why` | One line naming what justifies the row: the standard's own clause (paraphrased), the Table 1 type, or a test format seen in released items. It is never "for variety". |
| `state` | `null` for a Common Core row. For a state line, `{ "framework": "tx", "asks": "<what this state's test asks that Common Core does not>" }`. |
| `app` | `"today"`, or `"needs <the widget or figure work>"`. |
| `models` | How many models are planned. The default is 1. Use more than 1 only for number-range variants, listed in `variants`. |
| `variants` | Only when `models > 1`, e.g. `["no regrouping", "one regroup"]`. A variant never changes type, picture, format or steps; that would be a new row. |
| `levelRange` | The app levels the models fill into. Set it explicitly, to the band the target skill's filter reads. The Grade 2 default is 4–6, which is what Bar Models reads. Grade 2 add/sub story filters read 7–10, and the Grade 1 two-digit story filters read 4–10, so check that the rows do not land on Grade 1 sheets. |

## From row to model

Row fields carry over directly:

| Row | Model field |
|---|---|
| `id` | `id` is the row id, or `<row id>-<variant word>` for a variant (`wp-g2-take-from-result-regroup`). A fix adds `-2`. `blueprintId` is the row id. |
| `mode_id`, `grade`, `standards` | `modeId`, `grade`, `standards`, copied unchanged. |
| `spec.structureType`, `spec.family`, `spec.subskill`, `spec.levelRange` | The same field names, copied unchanged. |
| `difficulty` and `spec.variants` | `difficulty`: the row's tier, or moderate for the regrouping variant of an easy row. |
| `spec.mistakes` | `distractors[].mistake` and the `hint.feedback` keys, one tag per distractor. |
| `spec.steps: 2` | Leave out `operation`. Otherwise `operation` is the computation that solves the item (SKILL.md, step 3). |

The row's `spec.format` sets three model fields:

| `spec.format` | `format` | `widget` | `answer.type` | App today |
|---|---|---|---|---|
| `typed` | `number` | `numberPad` | `int` | works |
| `multipleChoice` | `number` | `null` (choice grid) | `int` | works; the money pilot's numeric-choice models use this |
| `chooseEquation`, `chooseStory` | `choice` | `null` | `text` | works |
| `completeModel` | `number` | `barModel` or `numberLine` | `int` | two bar shapes, one hop |
| `chooseModel` | | | | needs figure work |
| `trueFalse` | `choice` | `null` | `text` ("Yes" / "No") | blocked: Yes/No has one distractor, but `validateModel` wants 2 and the harness wants 3+ choices |
| `multiSelect` | `multiSelect` | `multiSelect` | | blocked: a model cannot carry a list answer |
| `twoPart` | | | | not built |

The row's `spec.representation` and `spec.story` set `representationType`:

| Row | `representationType` |
|---|---|
| `numbers`, story | `verbalContext` |
| bare (`story: false`) | `symbolic` |
| `picture` | `objectSet`, or `placeValueBlocks` for a tens-and-ones picture |
| `model`, number line | `numberLine` |
| `model`, tape diagram | `verbalContext` for a story, `symbolic` for a bare item. The `barModel` widget records the tape. The editor's list (`src/admin/ItemEditor.jsx`) has no tape value. |

## Review page template

- Put the page at `/mnt/project-files/item-skill/<skill>-blueprints.md`, next to the JSON. `money-picture-blueprints.md` set the precedent.
- Keep tables at six columns or fewer so the page reads on a phone, and put the
  long text under each table.
- Attach the file to the thread reply so Sai gets a card for it.
- **Number the page in the JSON's row order**, so row n on the page is the
  file's nth row. Build both from one script so they cannot drift.
- **Freeze the numbering once the page is sent.** Sai answers by number. When
  you write the status SQL, map numbers to ids from the copy Sai saw, never from
  a later draft.

```markdown
# <Skill>: blueprint rows for approval

Draft. Nothing is written as a model until a row is approved.
Answer with: "approve all", "approve all but 4, 9", "edit 7: …", "strike 12".

**Anchor:** CCSS <code>. **States:** TX <codes> · FL <codes> · VA <codes> · GA <codes>.
**Numbers:** <range and why>. **Left out:** <fact fluency, computation drills, neighbours with their own codes, and why>.

## Decisions for you
1. <question> I recommend <x> because <one line>. (yes / no)
(Always include, where they apply: state lines resting on a standard, not a
test; a model row standing in for a picture row; which word choose-the-equation
rows use where no state test settles it.)

## Coverage at a glance
| Problem type | Story | Picture | Model | Bare | Two-step |
|---|---|---|---|---|---|
| <each type the standard expects> | <row numbers> | … | … | … | … |
Totals: <n> rows · easy/moderate/hard <a/b/c> · recall/procedure/reasoning <x/y/z> · <k> rows need app work.

## <Objective 1>
| # | Type | Kid sees | Answer | Diff | Example [key] |
|---|---|---|---|---|---|
| 1 | Take from, start unknown | words only | typed | hard | Sam had some stickers… [43] |

Why each row: 1. <why>. 2. <why>. …
App work: rows <n, m> need <widget>.

## State lines
| # | State | What its test asks differently | Example [key] |
Why each row: <n>. <why>. …

## Not planned, and why
- <type or format>: <reason>
```

## Recording Sai's answer

1. Apply Sai's edits to the draft JSON in `/mnt/project-files/item-skill/`.
   Approval and strikes are not file edits; they become statuses in step 3.
2. Move the file into the repo, open the PR and load after merge, as in
   "Where rows live" 2–4. Confirm any edited example, spec or code with the
   two `select` queries there, because `--check` compares titles only.
3. Set the status in the database. Map numbers to ids from the copy Sai saw.
   `reviewed_by` stays null unless you have Sai's auth user id.

   ```sql
   update public.blueprint_rows set status = 'approved', reviewed_at = now() where id in (...);
   update public.blueprint_rows set status = 'struck', reviewed_at = now(), note = '<Sai''s reason>' where id in (...);
   ```
4. To change a row after approval, edit the file (by PR) and the database row
   in the same change, and put the reason in `note`. A reload will not carry
   the edit.
5. Echo the result to Sai in one line: approved n, struck m, edited k.

## Checklist before the list goes to Sai

Run every item. A failed item goes back to drafting, not to Sai with a caveat.

1. **Shape and codes.** Run this from the repo root. It prints each row that
   fails `validateBlueprintRow` or cites an unknown or short-form code, then a
   count:

   ```bash
   node --input-type=module -e 'import fs from "node:fs"; import { validateBlueprintRow } from "./src/blueprints/index.js"; import { unknownCodes } from "./src/standards/index.js"; const { rows } = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); let bad = 0; for (const r of rows) { const e = [...validateBlueprintRow(r), ...unknownCodes(r.standards).map((u) => `unknown ${u.framework} ${u.code}`)]; if (e.length) { bad++; console.log(r.id, e.join("; ")); } } console.log(`${rows.length} rows, ${bad} with problems`)' /mnt/project-files/item-skill/<skill>-blueprints.json
   ```

   Use long forms only: `2.OA.A.1`, never `2.OA.1`. Every id follows
   the `id` rule above, and every spec field above is present.
2. **Every row is distinct.** No two rows share problem type, representation,
   story/bare, format, demand and steps. A difference in number range is a
   variant inside one row, not a new row. Never merge two Table 1 subtypes
   (such as "how many more" and "how many fewer") into one row.
3. **Every row is justified.** `why` names a standard clause, a Table 1 type or
   a test format. If a row exists only to reach a count, drop it.
4. **Types are covered.** Every problem type the standard expects at this grade
   has at least one row. Each missing one is listed under "Not planned" with a
   reason.
5. **Objectives are covered.** Every objective has its story rows, plus:
   - at least one row with `representation: "picture"`, marked `app: "needs …"`
     if the app cannot draw it yet. A model row counts only if Sai has agreed
     to that in a numbered decision.
   - at least one row with `story: false`: the relation as an equation with a
     box. A story with equation choices does not count.
6. **Demand mix.** Each objective has reasoning rows, not only procedure.
7. **Difficulty.** Each row's tier follows SKILL.md's Difficulty section:
   - Easy: result, total or both parts unknown.
   - Two-step rows are hard.
   - Picture, model and format never move a tier.
   - Variants that regroup show their own tier.
   - No two-step row uses a hard type, and no row stacks misleading wording,
     two steps and regrouping.
8. **Numbers and codes.** Every row is inside the standard's range, and two-step
   rows follow the two-step limits. Story rows carry every story code (TX 2.4C
   and 2.7C on all of them). Bare rows carry the bare codes from SKILL.md,
   never the word-problem codes.
9. **Examples.** Each example:
   - is our own wording, with no textbook or test item paraphrased
   - shares no number set and no sentence frame with the verbatim Table 1 and
     Progressions examples in `docs/research-k4-problem-types.md`
   - restates the noun and names both sides of a compare
   - has 2–4 short sentences, at most two facts per sentence
   - repeats the name (no he, she, him, her, his or they) and opens no sentence
     with a numeral
   - takes its names from `src/itemModels/names.js`
   - has no K–2 jargon
   - uses a kid object at a count within its `count_one_kid` range and passes
     the kid-safe list (no scenes such as swimming)
   - has its key computed and checked by hand
10. **Formats exist or are flagged.** Every row the app cannot show today says
    `app: "needs …"`, and the page groups that work.
11. **State lines are earned.** Each one names the state and what its test asks
    that Common Core does not.
    - A line resting on a standard because the grade has no state test goes to
      Sai as a numbered decision.
    - A vocabulary change is not a state line: it belongs in
      `src/content/stateWords.json`.
12. **Exclusions are stated.** The page says what was left out and why: fact
    fluency, computation drills, equal-sign items, and neighbours with their
    own codes (money, lengths, graphs).
13. **Size.** About 30 rows per grade per skill, set by the distinct types the
    standard and tests justify. The list is never padded or cut to hit 30.
14. **No official text.** Summaries and `why` lines are paraphrases, and no
    standard text is stored.
15. **Page.** Tables have six columns or fewer, the page numbers rows in the
    JSON's order, and the numbering is frozen once the page is sent.
