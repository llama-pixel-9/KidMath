# Writer brief (template)

This is the brief each writer agent got for the Grade 2 add/subtract models
(2026-10-03, 7 writers, 77 models). Copy it into the scratch folder as
`WRITER.md`, fill in the brackets, and give each writer one line: "Read
WRITER.md and follow it exactly. Your group: <group>. Output $G/<group>.json.
Your rows: <row ids>."

Group rows by kind so one writer holds related rows (Grade 2: change stories;
part-whole and compare stories; equations and missing numbers; two-step and
bigger-number stories; within-100 strategies; digits, trades and disc mats;
the equal sign and estimates). 4 to 14 rows per writer.

---

# [Grade N] [skill] model writer brief (Larkit K-5 math app)

Owner: Sai, a K-5 tutor. Sai approved [the blueprint list(s)] on [date]:
`src/blueprints/[file].json` ([topic name], mode_id [modeId]). Each row is the
contract for the models you write: its example, `spec.numbers` (ranges and
notes), `spec.mistakes` / `variantMistakes` / `slips`, `spec.rules`,
`display`, `picture`, `answer_format`, `widget`, `variants`, `models`,
`levelRange`, `standards`. Do not invent a shape the row does not describe.

Repo: [worktree on a branch with the rows registered]. It is READ-ONLY for
you: no edits, no commits, no Supabase. Write only in $G = [scratch folder].

## Read first (closed brief; no other repo exploration)
1. `docs/item-model-writing-kit.md`, all of it, including "Models written for
   a blueprint row" and every "Rules learned" section.
2. `src/itemModels/schema.js` (the model shape) and
   `src/itemModels/validate.js` (what fails).
3. Your rows, by id, in the blueprint file.
4. Exemplars: 5-6 approved models of different shapes (a story, a folded
   story, a question-first one, a bare one). Take them from the review queue's
   approved rows of the last skill, not from drafts.
5. Only as needed: `src/itemModels/fill.js` and `src/itemModels/expr.js`
   (slot kinds and expression functions), `src/itemBank/figureContracts.js`,
   and for a picture your row needs, one existing item that already uses that
   display (`grep -rl` in `src/itemBank/items/`); copy its display shape.

## Write
- The bar (Sai, 2026-10-03): every item your models fill must look at home
  on a practice page of Math in Focus or another premier K-5 textbook. Write
  to that standard in our own words; never copy or paraphrase a book's item.
- Output `$G/<your group>.json`: a JSON array of models. One model per variant
  in `spec.variants` (at the tier in brackets), else `spec.models` models.
  Ids: `<row id>` or `<row id>-<variant word>`.
- Every model: `blueprintId` = row id, `modeId` = row mode_id, the row's
  grade, `subskill`, `family`, `structureType`, a `levelRange` inside the
  row's, `standards` exactly the row's (same lists in every framework),
  difficulty per row/variant.
- Distractors and feedback come from the row's named mistakes, computed from
  the item's numbers; each wrong answer gets its own feedback line, and that
  line must fit every fill (if the key can be either of two answers, write the
  feedback from a slot that changes with it). Hints stop before the key.
- Wording: Common Core voice, the way a textbook or state test of that grade
  asks. Short sentences, at most two facts each, the question last and the
  only question mark, the question restates the counted noun, context that
  matters, no test-maker words (compute, determine, the value, evaluate).
- Objects come from object slots (context table): things kids care about,
  realistic counts for the object. The verbs come from the object, never from
  the template: "read books" in a template turns every fill into a book.
  Filter unsafe or odd draws with constraints.
- Pictures: when the row says a picture, the model's display must draw it the
  way the app already draws it, labelled with the story's own names. A
  picture is either something the kid uses (a tray or mat they tap) or carries
  everything the question needs; never a picture the kid has to ignore.

## Check
Run from the repo:
`npm run models:harness -- $G/<group>.json --items $G/<group>.items.json --per 5`.
It must end with 0 failures. Then read the printed samples and hint samples as
a seven-year-old would, and fix anything stiff, ambiguous, unrealistic or
repetitive. Read them once more as that textbook's editor would: an item that
would look out of place on its page is not done. Count, in 40 fills: the different objects (a story should show
many), the different keys (a choice key that never changes is not a
question), and whether each distractor is a mistake a kid really makes.
Rerun until clean.

## Report (your final message)
Models written per row, the harness summary line, two sample prompts per
model, any row you could not write honestly with what the app draws today
(say exactly what is missing; do not fake it), and anything you want a
reviewer to read hardest.
