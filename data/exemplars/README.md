# KidMath Item-Bank Exemplars

This directory holds the license-clean *exemplars* that seed the item-bank
authoring pipeline described in
[docs/curated-item-bank-rollout.md](../../docs/curated-item-bank-rollout.md).

An exemplar is a single reference problem for a specific pedagogical cell
(mode x subskill x family x level band) taken from an approved open-licensed
source (or hand-authored). The LLM draft pipeline in
[scripts/itemGen/](../../scripts/itemGen/) consumes these exemplars to
generate structurally similar variants that the admin review queue then
promotes from `draft` -> `reviewed` -> `approved`.

## Directory layout

```
data/exemplars/
  <modeId>/
    <subskill>/
      <itemFamily>/
        <levelBand>.json   # array of exemplars for this cell
```

Example: `data/exemplars/addition/makeTen/application/4-5.json` contains the
reference word problems used when generating `application`-family
`makeTen`-subskill items for grades 4-5.

## File schema

Each file is a JSON array of objects with this shape:

```jsonc
[
  {
    "exemplarId": "addition-makeTen-application-4_5-001",
    "modeId": "addition",
    "subskill": "makeTen",
    "itemFamily": "application",
    "levelBand": "4-5",
    "structureType": "joinResultUnknown",

    "source": {
      "name": "Illustrative Mathematics",
      "url": "https://tasks.illustrativemathematics.org/content-standards/...",
      "license": "CC-BY-4.0",
      "fetchedAt": "2026-04-19"
    },

    "raw": "Full original problem text as-is, retained for auditing.",

    "paraphrase": "Author's single-sentence restatement in KidMath voice.",

    "payload": {
      "a": 9, "b": 7, "op": "+", "answer": 16,
      "display": {
        "promptText": "A garden has 9 red tulips and 7 yellow tulips. How many tulips are in the garden?"
      }
    },

    "notes": "Optional reviewer notes, misconception targets, etc."
  }
]
```

`payload` must pass the same validator as a bank item
(`validateBankItem` in [src/itemBank/index.js](../../src/itemBank/index.js)).
The LLM generator treats `paraphrase` + `payload` as the canonical style and
math shape for variants.

## License allowlist

Only exemplars from sources on this list may be stored verbatim in `raw`. For
other sources, keep `source.url` + `source.name` for attribution and store
only your `paraphrase`/`payload` (no verbatim text).

| Source                            | License           | Verbatim OK  | Attribution required |
| --------------------------------- | ----------------- | ------------ | -------------------- |
| Illustrative Mathematics          | CC BY 4.0         | yes          | yes                  |
| OpenStax K-5 material             | CC BY 4.0         | yes          | yes                  |
| Open Up Resources K-5 math        | CC BY 4.0         | yes          | yes                  |
| CCSS Math Progressions (public)   | public domain     | yes          | recommended          |
| **EngageNY / Eureka Math**        | CC BY-NC-SA 3.0   | **no**       | inspiration only     |
| Commercial textbooks              | all rights        | **no**       | inspiration only     |

The CI check in `scripts/itemGen/validateDrafts.js` will reject any exemplar
that declares a non-allowlisted verbatim source.

## Authoring flow

1. Pick a target cell (use `npm run bank:report` or the admin Coverage tab).
2. Find 1-3 reference problems from allowlisted sources that match the cell.
3. Write a paraphrase in KidMath voice (see
   [docs/word-problem-authoring-guide.md](../../docs/word-problem-authoring-guide.md)).
4. Check the paraphrase + payload against `validateBankItem`.
5. Commit the exemplar file.
6. Run the LLM draft pipeline for that cell
   (`node scripts/itemGen/generateDrafts.js --mode addition --cell makeTen/application/4-5`),
   which writes draft items to Supabase with `reviewStatus=draft` and a
   `source.exemplarId` link for provenance.
7. Reviewers promote items through the admin review queue.
