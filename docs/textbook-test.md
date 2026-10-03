# The textbook test

Sai's bar (2026-10-03): every question an item model fills should look at home on a practice page of Math in Focus or another premier K-5 textbook. Passing the harness, blind solve and kid-safe is the floor, not the bar.

`npm run models:textbook -- <models.json>` tests models against that bar. Code: `scripts/itemModels/textbookTest.js` (measures, rubric, vote rule; pure) and `textbookTest.mjs` (the CLI). Spec: `src/__tests__/textbookTest.spec.js`.

## Why it is built this way

The simple test is to ask one reader "would any of these look out of place?". That answer changes from run to run, and when it says no it can't say why. This test splits the question so most of it has the same answer every time, and the rest must quote its evidence.

### 1. Count what can be counted

Code fills each model 40 times with fixed seeds. These counts are the same on every run.

| Fails the model | Note for Sai (fails nothing) |
|---|---|
| A story model has 4 or fewer different things to count in 40 questions | 3 or fewer different number answers in 40 (coin trades and estimates have few answers by nature) |
| The answer is the same in all 40 | A fixed choice set (coins, yes/no) where some choice is never the key in 40 |
| | One of the 10 questions the readers see repeats an earlier one word for word (choice order aside) |
| Test-engine words: "compute", "determine", "evaluate", "the value of the expression", "solve for" … | A sentence longer than 20 words (Grades K-2) or 25 words |
| A story's picture or text names its parts with a capital letter (Bar A, Mat B); a bare drill only gets a note | A bare drill's lettered mats |
| A fill fails to build | |

The "4 or fewer things" line was set from Sai's own calls. Every model rejected or fixed for sameness had 4 or fewer; every model approved as varied had 5 or more. It fits that set by construction, so check it again on the next skill.

### 2. Seven yes/no lines instead of one question

| Line | Passes when |
|---|---|
| real | Counts and times are ones the situation has, and the place fits what happens there. **Prices may be made up and never fail** (Sai, 2026-10-03). Bananas at the school store or coin trades at the front office still fail. |
| voice | It reads like a well-edited textbook. House style passes: the name repeats instead of he or she, and the question restates the noun. |
| clear | The child knows what to find and how to give it, and nothing gives the answer away. |
| picture | A picture is usable and labelled with the story's names. Coins named in words, Mat A/Mat B in a bare drill, and an easy item that shows what it says all pass. |
| reading | Short sentences and familiar words, about a grade below. |
| format | The way the child answers is how a textbook would ask. |
| kidWorld | A context children of that age know and care about. |

There is an eighth line, **fresh** (variety). The readers answer it, but it is only a note. A model is one exercise type, so it keeps its question shape and kind of answer by design, and readers who judged ten fills of one model as a whole page failed it for that. Sameness inside a model is counted in layer 1. Variety across a page belongs to a read of a page that mixes a skill's models. That read is not built yet; until it is, the one AI review per subskill does it.

### 3. Three readers, two runs, quotes required

An editor at a premier K-5 publisher, a teacher of that grade, and a reader standing in for the child each read the same ten fills (seeds 1-10), twice. That is 6 votes per line.

A "no" must quote the question number and say how to fix it. A dislike that can't be quoted doesn't count.

| Votes saying no | Result |
|---|---|
| 4 or more of 6 | The line fails. Fix the model before loading it. |
| 2 or 3 | Load it. Sai sees the quotes on the model's review card. |
| 1 | Dropped as one reader's taste. It is in neither report. |

The verdict is **fail** on any counted flag or failed line, **review** on any 2-3 line, and **pass** otherwise. A model is **incomplete** when fewer than 6 replies came back even after the CLI asks again for the missing ones (a reader can leave a model out of its answer, or a call can fail). A fail stands on the votes it has; anything else needs all 6. Rerun incomplete models; nothing is stored for them.

## Calibration (2026-10-03)

The test was checked against 134 of Sai's decisions on the Grade 2 add/subtract and money models: 114 approved, 8 rejected, and 12 approved but later fixed as `-2` models. Two independent panels were run (runs 1-2 and runs 3-4), 408 reader calls in all.

| | This test | One reader, one question (3 runs) |
|---|---|---|
| Sai's 8 rejects | 4 fail and 1 goes to Sai with quotes, in both panels | 3 of 8 |
| The 12 later-fixed models | 8 fail, in both panels | 2 to 3 of 12 |
| Sai's 114 approved models | 16 and 19 fail; 4 and 5 go to Sai with quotes | 19 to 21 fail |
| Same pass or fail between panels | 127 of 134 (125 the same verdict) | 120 of 134 the same in all 3 runs |

- **The counting layer alone** catches 4 of 8 rejects and 7 of 12 fixed models. It flags none of the 114 approved models and never changes between runs.
- **What it misses.** Sai's 3 rejected mat models pass: Sai's reason was that the mat wasn't hands-on, which no reading of the text can judge. That stays with the screenshots and Sai's review. The two estimate models fixed for a key that was only ever 60, 70 or 80 pass too; layer 1 notes the 3 answers. One "wrong words" money reject goes to Sai with quotes rather than failing.
- **What it finds in approved models.** Most of these were approved before the bar existed. The fails are places that don't sell or do the thing: bananas, pizza or a pumpkin at the school store, coins traded at the front office or the lemonade stand, an eraser at the pet store. The rest are a few counts ("96 toy cars", "25 chess pieces") and a repeated noun ("45 of the marbles … the rest of the marbles"). Sai chose to keep approved models as they are (2026-10-03). The test runs on new models.
- **A first version** scored variety per model and failed made-up prices. It failed 67 to 70 of the 114 approved models.

Rerun the calibration after changing a measure threshold, a rubric line or the vote rule:

```bash
npm run models:textbook -- /mnt/project-files/item-skill/textbook-test/calibration.json --calibrate --runs 4 --out <dir>
```

`calibration.json` is `[{ id, label, note, model }]`: each model with Sai's decision and note. It lives in the shared project folder, not the repo.

## Running it

```bash
npm run models:textbook -- <group>.json --sql <group>.textbook.sql   # counts + readers; needs the claude CLI
npm run models:textbook -- <group>.json --measures-only              # counts only; no model calls
```

- **Reports.** It writes `<group>.textbook.md` (what to fix, what is incomplete, then what Sai will see, with up to three quotes per line and the readers' variety notes) and `<group>.textbook.json` (every vote), named after the first input, next to it or under `--out`. It exits 1 when any model fails or is incomplete.
- **`--sql`.** Writes each verdict except incomplete into `item_models.spec.checks.textbook`, for drafts only. The review screen shows it as the **Textbook test** card: green on pass, amber with the quotes on review, red on fail. Fails are written too, so a rerun on a loaded draft replaces its old card. Hash checks on loaded specs compare `spec - 'checks'`.
- **`--measures-only`** never takes `--sql`: a counts-only pass is not a textbook-test pass.
- **`--runs`** stays at 2, the 6 votes the rule is set for. Only `--calibrate` takes more, to compare independent panels; the verdict is panel 1's.
- **Readers.** They see each question as the kid does (`scripts/itemGen/qc/kidView.js`). The session shuffles choices, so choice order varies between runs. The words, numbers and pictures don't.
- **Cost.** 3 roles × 2 runs × one call per 4 models: about 1.5 reader calls per model.
