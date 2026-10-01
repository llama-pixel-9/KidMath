# Standards codes and coverage

Which standards codes the app covers, per framework and grade, computed from
what has been planned, written, approved and switched on. Nothing here is
ticked by hand.

Approved by Sai on 2026-10-01 (thread "Item generation skill brainstorm").

## Pieces

| Piece | Where | What it holds |
|---|---|---|
| Code lists | `src/standards/<framework>.json` | One row per code: grade, domain, our own one-line summary, kind (`fluency`, `skill`, `word_problem`, `concept`), in scope (`yes`, `partly`, `no` with a reason), parent for sub-parts. Common Core K–5 is loaded (191 codes, sub-parts included), Texas K–5 (288 student expectations, process standards listed as out of scope) Florida K–5 (184 B.E.S.T. benchmarks) and Virginia K–5 (2023 SOL: 72 standards and their 352 lettered parts, each part a row under its standard). Georgia joins next. |
| Reader | `src/standards/index.js` | `standardsFor`, `findStandard` (codes and aliases such as `2.MD.8`, `3.NF.A.2.a`, `3.4(F)` or `3.NSO.2.4`), `unknownCodes` and `validateCrosswalk` for the gate. A framework counts as loaded once its file is listed in `FILES`. |
| Crosswalk | `src/standards/crosswalk/<state>.json` (Texas: 219 links; Florida: 189; Virginia: 230, from lettered parts) | One row per link from a state code to a Common Core code, marked `same`, `partly`, `broader` or `narrower` (below). A state code with no Common Core counterpart has no row. |
| Blueprint rows | `src/blueprints/*.json` | The one-line question plans Sai approves. `factFluency.json` holds 54 fluency rows (operation × strategy group × fact band) from the fact fluency plan. |
| Tables | `supabase/migrations/20261001010730_standards_coverage.sql` | `standards`, `standard_crosswalk`, `blueprint_rows`, `blueprint_standards`, `item_model_standards`; `blueprint_id` on `item_models` and `item_bank`. |
| Views | same migration | `standard_blueprint_links`, `standard_model_links`, `blueprint_row_progress`, `standard_coverage`. |
| Admin | `/admin` → Standards tab (`src/admin/StandardsCoverage.jsx`) | Pick a framework and grade; each code shows planned rows, models approved / written, items live (and in preview), today's catalog skills, and a status. Click a code for its rows and models. |

## Rules

- **The repo is the source.** Codes and blueprint rows change by pull request.
  `node scripts/standards/loadStandards.js` prints the SQL that copies them into
  the database; `--check` prints a query whose rows are the differences (none
  means in sync). Run either in the Supabase SQL editor or through the
  Supabase tools. No service key is needed.
- **The CI gate** (`src/__tests__/standards.spec.js`) fails any item model,
  blueprint row or catalog skill that cites a code missing from a loaded
  framework's list, including a short form where the long form is expected.
  The link tables' foreign keys refuse unknown codes in the database too.
- **Summaries are our own words.** The official text stays at the source; Texas
  and others restrict reuse of their text.
- **Approval lives in the database.** A reload never changes a blueprint row
  that is no longer a draft, nor its code links. Item models keep their codes
  in `spec.standards`; a trigger rewrites `item_model_standards` whenever a
  spec is written, and the load re-derives them all, so a model loaded before
  its framework's codes picks up its links. Approved models are never rewritten.
- **A state code counts a Common Core tag only when the crosswalk says `same`.**
  Any other link shows as "needs a look" until the model carries the state
  code itself.

## Crosswalk matches

Each link says how the state code relates to the Common Core code. A note
names the Common Core grade when it differs, and what one side has that the
other lacks.

| Match | Meaning |
|---|---|
| `same` | The same skill; small range or wording differences are noted |
| `broader` | The state code asks for more (the Common Core code is one part of it) |
| `narrower` | The state code is one part of the Common Core code |
| `partly` | They overlap, and each has something the other lacks |

## Statuses

Per code, from its approved blueprint rows (each row: 0 planned, 1 models
written, 2 approved items ready, 3 in preview, 4 live for everyone):

| Status | Meaning |
|---|---|
| Out of scope | `in_scope = no`, with the reason |
| Not planned | No approved blueprint rows yet (models may exist; the counts still show) |
| Planned | Rows approved, nothing written |
| Building | Some rows have models, not every row has approved items |
| Ready to flip | Every row has approved items; the topic is still on v1 |
| In preview | Every row's topic is in preview |
| Covered | Every approved row is live for everyone |

The totals line counts codes without sub-parts (a code with sub-parts counts
through them) and leaves out-of-scope codes out of the percentage.

## Loading a state

1. Write `src/standards/<state>.json` from the state's official document: every
   K–5 code, our own one-line summaries, the edition and source URL.
2. Write `src/standards/crosswalk/<state>.json`, one link per row.
3. List both in `src/standards/index.js` (`FILES`, `CROSSWALKS`) and add the
   per-grade counts to the spec. The gate then checks every model and
   blueprint row tagged with that state's codes.
4. After merge, run the load SQL, then the check.
5. Sai spot-checks about 20 codes and 20 links, weighted to `partly`.
