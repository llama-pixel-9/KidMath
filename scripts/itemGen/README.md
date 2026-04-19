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

Swapping the LLM provider:

```
KIDMATH_ITEMGEN_PROVIDER=openai \
OPENAI_API_KEY=... \
node scripts/itemGen/generateDrafts.js ...
```

The `openai` provider is a thin wrapper around `fetch(...)` against the
Chat Completions API. Add more providers by exporting a function
`generate({ prompt, n })` from `scripts/itemGen/providers/<name>.js`.

## Why a script, not a server function

- Drafting is run by content ops on-demand against concrete cell gaps
  shown in the admin Coverage tab; it isn't a per-user latency path.
- Keeping it as a local CLI means we can iterate on the prompt, costs,
  and provider without a deploy.
- All generated content lands with `reviewStatus=draft` and must clear the
  admin review queue before any learner sees it, so the blast radius of
  prompt regressions is zero.
