# Curated Item-Bank Rollout

Status: Phase A and B complete. Phase C/D ongoing.

This doc tracks the rollout strategy for the curated item-bank-first system.

## Phases

### Phase A: Foundation (DONE)
- Schema, validator, and selector implemented in `src/itemBank/`.
- Adaptive engine wired to bank-source `application` items.
- Per-item analytics keyed by `itemId` available in session state.

### Phase B: Coverage and Tooling (DONE)
- Seed bank for all 8 modes; >=3 approved items per `(mode, subskill)` pair.
- `npm run bank:report` produces a coverage and validation report.
- CI gates: tests assert validity, coverage, no duplicate ids/prompts.
- Authoring guide: [docs/word-problem-authoring-guide.md](./word-problem-authoring-guide.md).

### Phase C: Production Tuning (IN PROGRESS)
- Monitor `getBankFallbackStats()` to track `bank` vs `generated` rates.
- Rotate or expand items when single-item exposure exceeds healthy thresholds.
- Author additional items based on session analytics for under-served pairs.
- Collect teacher and content feedback; promote drafts and retire weak items.

### Phase D: Optional Expansion (FUTURE)
- Promote curated items into `conceptual` and `procedural` families where the
  language quality of generated content has been an issue.
- Consider per-student exposure persistence beyond session window.

## Operating Controls

### Fallback behavior
- Default: when no approved bank item exists for `(mode, level, subskill)`,
  the engine falls back to the dynamic generator and increments
  `bankFallbackStats.fallbackToGenerated`. A `console.warn` is emitted.
- Strict mode: pass `requireBankForApplication: true` in the generation
  context to make the engine throw instead of falling back. Use this in
  staging or in CI to catch coverage gaps before they reach students.

### Observability
- `getBankFallbackStats()` returns running counters since the last reset.
- `resetBankFallbackStats()` zeros counters (useful per session or per test).
- Session `analyticsEvents` include `itemId` and `itemSource` for every
  answered question for downstream telemetry.

### Coverage thresholds
- Minimum `(mode, subskill)` coverage: **3 approved items**.
- Minimum bank items per mode for healthy rotation: **12** (target during Phase C).
- Reviewable signals (manual): items with extreme success rates (>0.95 or <0.3)
  across many sessions are candidates for revise/retire.

## Rollout Checklist for New Items

1. Author per [authoring guide](./word-problem-authoring-guide.md).
2. Run `npm run bank:report` locally; fix any validation issues.
3. Run `npm test` and ensure all suites pass.
4. PR includes summary of new structures or contexts added.
5. Reviewer confirms language, math, accessibility.
6. Merge sets `reviewStatus: approved` for new items.

## Risks and Mitigations

- Repetition risk: bounded by exposure cooldown of `RECENT_BANK_WINDOW`
  (8 items) plus targeted authoring for thin pools.
- Coverage drift: enforced by tests and `bank:report` in CI.
- Silent fallback: warning logs + `getBankFallbackStats()` make it observable.
- Authoring throughput: prioritize subskill/level pairs with the highest
  request rate from production analytics.
