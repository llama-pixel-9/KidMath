# Curated Item-Bank Rollout

Status: Phase 0 foundation for all-family all-band coverage shipped
(branch `feature/high-quality-item-bank`). Phase 1 authoring underway.

This doc tracks the rollout strategy for the curated item-bank-first system
across every `(mode x subskill x family x level band)` cell - 216 cells for
the current 8 modes.

## Phases

### Phase A: Foundation, application-only (DONE)
- Schema, validator, and selector implemented in `src/itemBank/`.
- Adaptive engine wired to bank-source `application` items.
- Per-item analytics keyed by `itemId` available in session state.

### Phase B: Application coverage + tooling (DONE)
- Seed bank for all 8 modes; >=3 approved items per `(mode, subskill)` pair.
- `npm run bank:report` produces a coverage and validation report.
- CI gates: tests assert validity, coverage, no duplicate ids/prompts.
- Authoring guide: [docs/word-problem-authoring-guide.md](./word-problem-authoring-guide.md).

### Phase 0: All-family foundation (DONE)
Broadens the bank machinery so conceptual and procedural items can ship
through the same pipeline.
- Bundle split: `src/itemBank/{application,conceptual,procedural}Items.js`
  aggregated via `src/itemBank/bundle.js`.
- Selector accepts an explicit `family` (back-compat wrapper keeps
  `selectApprovedApplicationItem`).
- Validator is family-aware: application items still require
  `display.promptText`; conceptual/procedural items accept any supported
  `representation` (numberLine, tenFrame, array, placeValueBlocks,
  decomposition, objectSet, sequence, symbolic, verbalContext) or a
  structural shape.
- Engine's `generateQuestion` consults the bank for any family listed in
  `context.consultBankFamilies` (defaults to `[application]` for
  back-compat).
- `bankFallbackStats.byFamily` added.
- Cloud migration `0005_extend_item_bank_for_all_families.sql` adds
  `representation_type`, generated `level_band`, `source jsonb`,
  `reviewed_by`, `reviewed_at`, and the composite index matching the
  selector hot path.
- `bank:report` upgraded to enumerate per-cell coverage and empty cells.
- Admin UI gained a Review queue tab (gap-first sort + bulk approve) and a
  Coverage heatmap keyed to the pedagogical blueprint.
- Exemplar directory scaffolded at `data/exemplars/` with CC-BY-4.0 /
  CC0 / public-domain allowlist and a sample for three cells.
- Draft pipeline at `scripts/itemGen/` (echo provider included for CI /
  dry-run; provider interface is pluggable).
- New test suite `src/__tests__/itemBankCoverage.spec.js` with opt-in
  per-cell floor enforcement
  (`KIDMATH_ENFORCE_CELL_COVERAGE=1 npm run test:coverage`).

### Phase 1: Mode-by-mode floor (IN PROGRESS)
Raise every cell to the 3-approved-item floor, one mode at a time, via the
exemplar + LLM draft pipeline plus admin review. Suggested order based on
content density in Phase B and grade-band importance:

1. `addition`    -> `subtraction`
2. `multiplication` -> `division`
3. `placeValue`  -> `comparing`
4. `counting`    -> `skipCounting`

Per mode:
1. Seed 1-3 exemplars per cell in `data/exemplars/<mode>/...`.
2. `npm run bank:gen -- --mode <mode> --all --limit 6` (once the `--all`
   scope is extended to walk a single mode's cells - current `--all`
   walks every mode with exemplars on disk).
3. Reviewers promote items in the admin Review queue.
4. Flip `KIDMATH_ENFORCE_CELL_COVERAGE=1 KIDMATH_COVERAGE_MODE=<mode>` in
   CI for that mode once the floor is hit.

### Phase 2: Healthy depth (AFTER PHASE 1)
Bring every cell to 8 approved items; tune by analytics from
`getBankFallbackStats()` and per-item exposure data already tracked in the
engine.

### Phase 3: Optional expansion
- Per-student exposure persistence beyond session window.
- Per-student reading-level adaptation.
- Multilingual variants of application items.

## Operating Controls

### Fallback behavior
- Default: when no approved bank item exists for the requested `(mode,
  family, level, subskill)` bucket, the engine falls back to the dynamic
  generator and increments
  `bankFallbackStats.byFamily.<family>.fallbackToGenerated` plus the
  aggregate `bankFallbackStats.fallbackToGenerated`. A `console.warn` is
  emitted once per cell.
- Strict mode:
  - `requireBankForApplication: true` (back-compat) throws for
    application misses.
  - `requireBank: true` throws for any family miss in the configured
    `consultBankFamilies` set. Use this in staging and in coverage-focused
    CI to catch gaps before they reach students.

### Observability
- `getBankFallbackStats()` returns aggregate + per-family counters since
  the last reset.
- `resetBankFallbackStats()` zeros counters (useful per session or per
  test).
- Session `analyticsEvents` include `itemId`, `itemSource`, and
  `itemFamily` for every answered question for downstream telemetry.

### Coverage thresholds
- Minimum per-cell coverage: **3 approved items** (Phase 1 floor).
- Healthy per-cell coverage for Phase 2: **8 approved items**.
- Reviewable signals (manual): items with extreme success rates (>0.95 or
  <0.3) across many sessions are candidates for revise/retire.

## Rollout Checklist for New Items

1. Pick a target cell from the admin Coverage tab or `npm run bank:report`.
2. Seed exemplars in `data/exemplars/<mode>/<subskill>/<family>/<band>.json`.
3. Run `npm run bank:gen -- --mode <m> --subskill <s> --family <f> --band <b> --limit <n>`.
4. Review drafts in the admin Review queue.
5. Promote items to `approved`.
6. `npm run bank:report` to verify coverage; optionally regenerate the
   bundle snapshot with `npm run bank:seed` if the item should ship
   offline.
7. PR includes summary of new cells filled and license notes for any
   newly-cited sources.

## Risks and Mitigations

- **Repetition risk**: bounded by exposure cooldown of `RECENT_BANK_WINDOW`
  (8 items) plus gap-first review ordering.
- **Coverage drift**: enforced by tests and `bank:report` in CI.
- **License contamination**: allowlist in `data/exemplars/README.md` +
  `licenseAllowed()` check in the draft pipeline.
- **LLM math hallucinations**: numeric consistency check in
  `validateBankItem` + re-computed `answer` from `a,b,op` in the echo
  provider. Real LLM providers must pass the same gate.
- **Silent fallback**: warning logs + `getBankFallbackStats().byFamily`
  make it observable per family.
- **Authoring throughput**: gap-first review queue + heatmap prioritize
  subskill/level/family cells with the highest unmet need.
