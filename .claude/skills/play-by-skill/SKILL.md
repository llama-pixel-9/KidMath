---
name: play-by-skill
description: How play works by Grade → Topic → Skill — the shared skill catalog, skill sessions (pinned / mixed / challenge), durable mastery, the per-topic grade pointer, the earned grade-up, the topic sheet, and the rollout flag. Use when changing anything about what a play session practices, mastery, grades, the topic sheet, the parent skill controls, or turning VITE_SKILLS_PLAY on.
---

# Play by skill

Play used to be "mode + a hidden 10-level ladder". The ladder was really ~3
tiers (bank rows are tagged by BAND: levels 1–3 one pool, 4–6 another, 8–10 a
third), mastery was session-local and thrown away, and nobody could choose
what to practice. Now: **grade (from the kid profile, never asked) → topic →
skill**, on the SAME catalog the worksheets print from (`src/skills/`).

## The flag
**ON by default on both platforms since 2026-09-26** (`skillsPlayEnabled`,
`GamFlags.skillsPlay`). `VITE_SKILLS_PLAY=false` / `-skillsPlay 0` is the kill
switch, kept for one release; with it off everything is the ladder, bit for bit.
Never a gamification step — it must not follow `VITE_GAM_ALL` / `GamFlags.all`.
Migrations `20260920120000` and `20260920130000` are applied in prod; a fresh
environment needs them before the flag is on (the client names the columns).
`/play/<mode>` is the topic sheet; the QA pins `?item=` (from /admin) and
`?qaVariety=` still open a plain session (e2e and reviewers rely on this), and
the robot-kid / persona e2e play `?mix=1`.

## Catalog (`src/skills/`)
- `catalog.js` + `promptSkills.js` + `index.js` — the one list (see the
  `worksheets` skill). `src/worksheets/{skills,skillIndex,promptSkills}.js`
  are re-export shims.
- `play.js` — the catalog as play sees it: picture/plain TWINS merge (a
  session can mix charts and one-liners; a page cannot), print-only
  exclusions drop, the two remainder drills are print-only. Topic grades are
  NOT contiguous: use `topicGrades / clampGrade / nextTopicGrade / openGrades`,
  never grade arithmetic. `gradeForModeLevel` (monotonic) reads a level's
  grade off the catalog. `skillForAttempt` credits an attempt: `skillId` →
  bank cell + number size → bare `a op b` matched to a computation claim.
- `skillCatalogParity` (in `skillsPlay.spec`) pins play == worksheets.

## Sessions (`src/skills/session.js`, called from `mathEngine`)
`createAdaptiveSession(mode, size, { skillId | skillIds, grade,
masterySnapshot, challenge })`. Without skill options it is the ladder session.
- **pinned** one skill · **mixed** ("Larkit picks": ≤3 weakest unmastered in
  focus, never three in a row, ~1 in 5 a review, next skill rotates in) ·
  **challenge** (six questions across the grade, shakiest first).
- Keeps: mistake bank + spaced retries (a pinned session only re-serves its
  own), family rotation, recent-item avoidance, word-problems preference.
  Gone inside a skill session: promotion/demotion. `session.level` just
  follows the skill (altitude bonus, log columns).
- Worded questions are approved bank rows from the skill's own cell
  (`selectApprovedBankItem({levels, accept})`); drills are built to the claim
  (`computationPlay.js`, answers ≥100 typed on the number pad). A cell missing
  from memory falls back to a ladder question, un-stamped — never a hang.
- **A skill session NEVER moves the saved `level`.** `MathExplorer` saves the
  stored level back. Pinned by e2e.

## Mastery (`src/skills/mastery.js`) — pure, for iOS too
One reducer, `applySession(map, sessionRecord)`; `deriveMastery` is its fold
over the practice log (the backfill for kids who played before skills, and
the repair). Rule in `MASTERY_RULE`: ≥8 first-try attempts in the last 10,
≤1 miss, last 3 right, ≥2 sessions. No speed gate. Hint-assisted right
answers and challenge sessions are not evidence. A star is never removed —
`needsReview` steers the mix instead. Field is `recent`, not `window` (the
native bundle is grepped for browser globals).

## Where a kid stands (`src/skills/topicState.js`) — pure
State lives on the per-kid, per-mode **progress row** (already kid-scoped,
RLS'd, purged on account deletion): `grade`, `gradeUnlocked`,
`pinnedSkillId`, `skillMastery` (+ the challenge's bookkeeping under the
reserved key `__gradeUp`). `resolveTopic` fills what is missing — grade from
the level via the catalog, profile grade always open above it, mastery from
the log — and returns `toSave`; callers persist it with `saveTopicState`
(never counts a session, never touches level or stars).
`gradeUpStatus`: `advance` (next grade already open → focus just moves) ·
`challenge` (earned: 6 questions, 5 to pass, no stars; a third miss →
`needsPractice`, cleared by the next finished session) · `auto` (one-skill
grade) · `complete`. Grades never re-lock.

**Naming (Sai, 2026-09-20): kids see the grade-up challenge as a "Fledging
Flight"** — "Take the Fledging Flight", header "Fledging Flight to Grade 4".
"challenge" is code vocabulary only. The parent report counts one as passed by
score (`GRADE_UP.pass`), not by a level change — it never moves the level.

## UI
- `/play/:mode` → `src/play/TopicSheet.jsx` unless `?skill=`, `?mix=1`,
  `?challenge=1` or the admin `?item=` is present. `?challenge=1` only starts
  a challenge that is really earned.
- In-session chip: skill title / "Mixed · Grade 3" / "Grade 3 challenge".
  End cards use `src/play/SkillStanding.jsx` instead of the journey map /
  level bar. Home tile chip "Grade 3 · 1/3". Settings has no mode grid.
- Parents: `/report` + grown-ups panel speak skills (each with a print link
  to `/worksheets?skill=`); the panel can open a grade and pin a skill.
- "Level" must not appear in kid or parent UI when the flag is on.

## Tests
`skillsPlay.spec`, `skillMastery.spec`, `skillSession.spec` (every playable
skill serves five valid questions of its own, words on and off),
`topicState.spec`, `parentReport.spec`, `e2e/skillsPlay.spec.js` (whole
sessions through the real widgets: level untouched, mastery saved, challenge
pays no stars, parent controls). Must stay green unchanged: `bankCellCoverage`,
`ladderV2`, `sessionEngine`, `fledging`; parity fixtures need no regeneration
(stateless `generateQuestion` is untouched).

## Still to do (phase 6b)
Once the kill switch has gone unused for a release: delete the `bySkill` /
`skillsPlayEnabled()` branches, the ladder-only UI (Lv chip, level-up toast,
FledgingOffer, nomination pill, masterySummary tile line, "Difficulty adjusts
automatically"), the engine's promotion / demotion / nomination / glide-down
and `ladderV2`, and their specs (`ladderV2`, `fledging`, parts of
`sessionEngine`). Keep `level` itself: it picks the bank band, feeds the
altitude bonus and the NOT NULL `level_*` columns, and the QA pins still run a
plain session. Keep `startingLevelFor` — a topic's first row needs a level.

## One flow, two apps (`src/skills/flow.js`)

Everything between a screen and a store is in `flow.js`, pure, and exported
through `nativeEntry.js` — the web renders it and the SwiftUI app renders the
same output. Do not re-derive any of this in a component or in Swift:

| flow.js | native export | what it is |
|---|---|---|
| `topicSheetModel` | `topicSheetModel` | everything the topic sheet shows (+ `toSave`) |
| `sessionOptionsFor` | `skillSessionOptions` | `{skill}` / `{mix,grade}` / `{challenge}` → session options, or null (not earned / not open → the ladder) |
| `sessionLabel` | `skillSessionLabel` | the sub-header under the topic title |
| `settleSkillSession` | `settleSkillSession` | end of session → `patch` (never the level) + `standing` for the end card |
| `topicChip` | `topicChip` | Home tile "Grade 3 · 1/3", `flightReady` |
| `parentControls`, `unlockGradePatch` | `skillParentControls`, `unlockGradePatch` | grown-up open-a-grade / pin-a-skill |

**Trap (fixed 2026-09-21):** the practice log is saved BEFORE progress, so the
just-closed record is usually already in `context.sessions`. A kid with no
saved mastery has it rebuilt from that log — settling must drop the closed
record's id first or the first session counts twice. `settleSkillSession` does.

## iOS

Flag: `GamFlags.skillsPlay` — its own switch, NOT `step()`, because
`GamFlags.all` defaults to true. On by default; `-skillsPlay 0` turns it off.
- `TopicSheetView` (tap a Home card) → `SessionView(mode:skillRequest:)`;
  `SessionViewModel.SkillRequest` = `.skill(id)` / `.mix(grade:)` / `.flight`.
- A skill session saves `savedLevel` (what was loaded), never the session's
  `level` (that is only the skill's band). Pinned by `SkillsPlayTests`.
- Mastery is settled from the CLOSED practice record → a view model without a
  `PracticeLog` settles nothing (tests must pass one).
- `ProgressStore.saveTopicState` never counts a session; skill fields ride on
  the progress row (`grade`, `grade_unlocked`, `pinned_skill_id`,
  `skill_mastery`) and are always selected — the migration is applied.
- Grown-up controls: Settings → "Skills to practice", behind the parental gate.
- Dev: `-skillsPlay 1 -autostartMode subtraction [-autostartSkill sub-across-zeros]`.
- SwiftUI traps met here: "▶" in a `Text` renders as an emoji (use
  `Image(systemName: "play.fill")`); with two `.background`s the FIRST is
  nearest the content — face first, then the offset edge.
