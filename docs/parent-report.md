# Parent report (`/report`)

*Added 2026-08-22.* The parent-facing analytics page, built on a new
**practice log**. Before this, the only parent surface was the Grown-Ups
panel, which could show current level, lifetime stars and a mistake-bank
count per mode — because that was everything persisted. Nothing recorded
*when* a session happened, how long it took, or which questions were missed.

## What the report shows

| Section | Source |
|---|---|
| Headline sentence + tiles: minutes, sessions, active days, questions, first-try accuracy, retries fixed, day streak, perfect sessions, level-ups, challenge flights | session rows |
| "What to do with this" — 1–4 plain-language recommendations (weakest subskill, level climbs, stretch, habit, repeat-misses) | `recommendations()` |
| Practice over time — minutes per week (per day for ≤14-day ranges) with first-try accuracy under each bar | session rows |
| Skills table — per mode: grade span, level now + movement since the range started, time, sessions, questions, avg seconds per question, first-try accuracy; expands to per-subskill accuracy | session rows + `progress` for the current level |
| Strengths / needs work — subskills with ≥4 tries at ≥90% / <70% | attempts |
| Questions that tripped them up — first-try misses grouped by prompt, with the correct answer, what the kid tried, miss count, and whether a later retry landed; plus "right but slow" (≥20s) | attempts |
| When they practice — by weekday and time of day | session rows |

Controls: kid pills (signed-in, >1 kid), range (7 / 30 / 90 days / all time),
Print / Save as PDF (controls hidden in print). Entry points: Grown-Ups panel
("See the full report →"), ProfilePicker parent menu, `/account`.

## Data model

`src/analytics/sessionLog.js` — one record per **finished** session:

```
{ id, kidId, mode, kind: "normal"|"fledging", levelStart, levelEnd,
  startedAt, endedAt, durationMs (wall clock, capped 30 min), activeMs (sum of response times),
  questions, firstTryCorrect, retriesMastered, starsEarned,
  attempts: [{ t, prompt, answer, given, correct, retry, ms, level, subskill, family, itemId }] }
```

- Opened in `MathExplorer.loadNextQuestion` for a fresh session (`sessionRecordRef`),
  appended in `submitAnswer`, closed + saved in `finishSession`. Session-creating
  paths null the ref so the next question opens a new record.
- **Local**: `kidmath-sessions` / `kidmath-sessions:<kidId>` (same per-kid scoping as
  engagement), last 400 sessions, ≤60 attempts each. Rows carry `synced`.
- **Cloud**: `public.practice_sessions` (migration `20260822120000`), own-row RLS,
  `kid_id` nullable → `kid_profiles` ON DELETE SET NULL. Reads paginate.
  Unsynced local rows are flushed on the next signed-in read.
- This is the first **per-kid** progress dimension. `progress` itself is still
  account-level (ADR-001 step 3 not done), so "Level now" in the report is the
  household level for that mode.
- Account purge: `practice_sessions` is in `USER_DATA_TABLES`; `purgeKidData`
  deletes the kid's rows explicitly (child-scoped data, §312.6).

`src/analytics/reportModel.js` — `buildReport(sessions, { now, days, progressByMode })`
is pure and clock-free, so the same function can run server-side for the
emailed edition. `headline(report, kidName)` is the one-sentence summary.

`src/analytics/subskillLabels.js` — parent-language labels for every engine
subskill id (spec asserts full coverage, no bare camelCase).

## Known limits (deliberate v1)

- A quit mid-session records nothing — same rule as progress/stars. Time spent
  is therefore a floor. Follow-up: persist a partial record on unmount.
- `kind: "fledging"` challenge flights are excluded from totals and accuracy
  (they are a test, not practice) but counted as "challenge flights passed".
- Sessions before this shipped are invisible to the report; the Grown-Ups panel
  still shows the lifetime level/stars for those.
- No adult gate on `/report` (there is none anywhere in the app yet).

## Next: emailing the report

1. **Transport.** `supabase/functions/_shared/emailTransport.ts` is still the
   stub; pick Resend/Postmark (checklist B7) and implement `getTransport()` once —
   the consent flow gets real email at the same time.
2. **Renderer.** Port `buildReport` + `headline` to a Deno-safe module (they import
   only `modes/index.js` for labels and `gradeSpans.js`; extract label maps to a
   JSON manifest so the Edge Function does not bundle the engine).
3. **Edge Function `weekly-report`** on `pg_cron` (Sunday evening local-ish): for
   each user with ≥1 `practice_sessions` row in the last 7 days, build a 7-day
   report per kid, render an HTML email (same sections, no interactivity), send to
   the OAuth email. Opt-out flag in `user_preferences.weekly_report` (default on).
4. **"Email me this report" button** on `/report` → invokes the same function on
   demand for the selected kid and range.
