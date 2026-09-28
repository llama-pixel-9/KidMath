# Item QC scripts

Model-backed checks that run on the developer's Claude Code subscription:
each shells out to `claude -p` (headless), 20 items per call, JSON back. No
API key, no Supabase writes, no network besides the `claude` CLI. When
`claude` is not on PATH the model pass is skipped **loudly** (stderr says so
and the report carries `skipped: true`); nothing is silently marked clean.

| Script | Question it answers | Exit 1 when |
|---|---|---|
| `reviewAgent.js` (`npm run bank:qc`) | deterministic checks, then readability/coherence judgment | a deterministic check fails |
| `blindSolve.js` | does a solver who sees only what the kid sees reach the key? | any item disagrees (`--fail-on-ambiguous` adds ambiguous ones) |
| `kidSafeReview.js` | would a US public elementary school print this for that grade? | any item is not printable |

Shared plumbing: `qcCli.js` (args, transport, batching) and `kidView.js`
(item loading and the kid's view: served choices, sub-prompt, a plain
description of the figure or widget, the hint text). The view is built from
the same payload fields the renderers read, so a field the app never draws
is never sent to the model.

## Running

```bash
# blind solve: a JSON file of items, or one mode of the bundled bank
node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/blindSolve.js drafts.json
node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/blindSolve.js --from-bank money --limit 40

# kid-safe review: items, raw item_bank rows, or item model specs ({ id, grade, spec })
node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/kidSafeReview.js models.json
node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/kidSafeReview.js --from-bank money --limit 40 --list-only
```

Common options: `--item id[,id]`, `--limit n`, `--out path` (default
`qa-out/<script>.json`, gitignored; `-` for stdout), `--model name`
(default `KIDMATH_QC_MODEL`, else Claude Code's pick), `--dry-run` (prints the
first batch's prompt, no model call), `--help`.

Suggested `package.json` scripts (not added here):

```json
"bank:blind-solve": "node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/blindSolve.js",
"bank:kid-safe": "node --import ./scripts/lib/registerResolve.js scripts/itemGen/qc/kidSafeReview.js"
```

## Reports

`blindSolve.js` → `{ source, model, total, disagreed, ambiguous, skipped, items }`, one
`{ itemId, agreed, modelAnswer, ambiguous, reason, expected, prompt }` per item.
`agreed` is the app's own scorer (`checkAnswer`) on the served question, so it
means what the session would have marked. A failed batch marks every item in
it as disagreed with the error as the reason.

`kidSafeReview.js` → `{ source, list, model, total, notPrintable, listHits, skipped, items }`,
one `{ itemId, printable, reason, hits: [{ term, category }] }` per item. The
kid-safe list (`src/content/kidSafeList.js`) runs first over everything the kid
can read; a hit fails the item outright and it is not sent to the model.
