# Item-bank draft generation pipeline

Bridges the license-clean exemplars in [data/exemplars/](../../data/exemplars/)
into the admin review queue, so reviewers can approve items rather than
author each one from scratch.

## Flow

```
data/exemplars/<mode>/<subskill>/<family>/<band>.json
        |
        |  loadExemplars.js                (read + schema validation)
        v
    Exemplar[]
        |
        |  generateDrafts.js               (LLM call per cell, gated by
        |                                   style/antipattern prompt)
        v
  Candidate[]                              (in-memory draft items with
        |                                   payload + provenance)
        |  validateDrafts.js               (reject failures: numeric
        v                                   inconsistency, banned patterns,
                                            duplicates against current bank,
                                            non-allowlisted verbatim source)
 AcceptedDrafts[]
        |
        |  writeDrafts.js                  (Supabase upsert with
        v                                   reviewStatus=draft and
                                            source.exemplarId link)
   item_bank (draft rows)
        |
        |  Admin review queue              (UI promotes draft -> reviewed
        v                                   -> approved)
   item_bank (approved rows)
```

## Current state

- `generateDrafts.js` is scaffolded with:
  - CLI arg parsing (`--mode`, `--subskill`, `--family`, `--band`,
    `--limit`, `--dryRun`)
  - exemplar loader
  - pluggable `llmProvider` interface (default: `echo` stub that produces
    trivial variants so the pipeline is testable without network calls)
  - structured-prompt builder that includes the style guide, misconception
    tags, the target cell, and all exemplars for that cell
- `validateDrafts.js` runs the full validator + license allowlist +
  numeric-consistency check + duplicate-prompt check against the current
  `BUNDLED_ITEMS` snapshot.
- `writeDrafts.js` does the Supabase upsert (skipped in dry-run and in
  environments without `SUPABASE_SERVICE_ROLE_KEY`).

## Running

Dry-run with the echo provider (default, no network):

```
node scripts/itemGen/generateDrafts.js \
  --mode addition --subskill makeTen --family application --band K-1 \
  --limit 6 --dryRun
```

Live run against Supabase (requires service-role key):

```
SUPABASE_SERVICE_ROLE_KEY=... \
SUPABASE_URL=https://....supabase.co \
node scripts/itemGen/generateDrafts.js \
  --mode addition --subskill makeTen --family application --band K-1 \
  --limit 12
```

### Real generation with Claude

Single cell, via the pluggable provider (`providers/claude.js`):

```
npm i -D @anthropic-ai/sdk         # once
ANTHROPIC_API_KEY=...  \           # or run `ant auth login`
SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=https://....supabase.co \
node scripts/itemGen/generateDrafts.js \
  --provider claude \
  --mode division --subskill partitioning --family application --band 4-5 \
  --limit 13
```

Bulk across every exemplar cell via the **Batch API** (50% cheaper — the Phase 4
accelerator):

```
npm run bank:gen:batch -- --all --limit 13            # dry-run first with --dryRun
```

`generateBatch.js` submits one request per cell, polls the batch to completion,
then runs each cell's output through the same numeric/duplicate gate and writes
draft rows. `--dryRun` builds and prints the requests without submitting (no SDK
or credentials needed), so you can inspect the prompts first.

- **Model** defaults to `claude-sonnet-5` (the deliberate cost choice for bulk
  content); override with `KIDMATH_ITEMGEN_MODEL` or `--model`.
- Every item lands as `reviewStatus=draft` and must clear the admin review queue
  before any learner sees it — blast radius of a bad prompt is zero.

Add more providers by exporting `generate({ exemplars, n })` from
`scripts/itemGen/providers/<name>.js`; the shared prompt/parse helpers live in
`scripts/itemGen/prompt.js`.

## Why a script, not a server function

- Drafting is run by content ops on-demand against concrete cell gaps
  shown in the admin Coverage tab; it isn't a per-user latency path.
- Keeping it as a local CLI means we can iterate on the prompt, costs,
  and provider without a deploy.
- All generated content lands with `reviewStatus=draft` and must clear the
  admin review queue before any learner sees it, so the blast radius of
  prompt regressions is zero.
