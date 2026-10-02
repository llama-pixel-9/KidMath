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

## No flag, no ladder (since 2026-09-26)
Play by skill is the only play. The ladder — promotion, demotion, nomination,
the Fledging offer/ceremony, `ladderV2`, glide-down, the Lv chip, the level-up
toast, `masterySummary` — was deleted in phase 6b; there is no kill switch.
`level` survives only as the bank band a session draws from (a skill session's
`level` is `levelForSkill`), the altitude bonus's input, and the NOT NULL
`level_*` columns; a skill session never writes it. `startingLevelFor` still
seeds a topic's first row. Migrations `20260920120000` and `20260920130000`
are applied in prod (a fresh environment needs them — the client names the
columns). `/play/<mode>` is the topic sheet; the QA pins `?item=` (from
/admin) and `?qaVariety=` open a PLAIN session (no skills, no level change —
e2e and reviewers rely on this), and the robot-kid / persona e2e play `?mix=1`.

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

## Word problems (the setting and the held topics)
- **On by default since 2026-10-02 (Sai):** `DEFAULT_ALLOW_WORD_PROBLEMS =
  true` in `src/userPreferences.js`. The only switch is the in-session gear;
  it saves to `kidmath-allow-word-problems` and, signed in, to
  `user_preferences.allow_word_problems` (the cloud row wins on sign-in; a
  user with no row gets one seeded from this device; a FAILED read plays the
  local value and writes nothing). `MathExplorer` passes it into every
  session.
- **Existing signed-in households stay OFF until a data migration runs.**
  Their rows were seeded from the old default (off) and the cloud row wins.
  `20261002183000` only changes the column default; `20261002183100` flips
  the false rows nobody changed after the seeding insert and needs Sai's
  go-ahead. Neither is applied.
- A worded skill adds the `application` family only when it has `stories`
  and `playStoriesAllowed(mode, setting)` is true (`familiesFor`); with two
  source families that is one question in three. A drill with `stories`
  serves one from its story cell every third question of that skill
  (`drillStoryDue`, falling back to the drill when the cell is empty). No
  skill lists `application` in its own source families. A skill whose
  catalog entry has no `stories` never serves one: today multiplication
  grade 5 and division grades 4 and 5 have none, so Larkit picks there is
  story-free.
- **Held topics:** `STORIES_HELD_MODE_IDS` in `src/skills/storyHold.js`
  (addition, subtraction, barModels, numberBonds). Their v1 stories stay out
  of play whatever the setting: not in skill sessions (worded or drill), not
  in the plain session (application turns procedural), not from the template
  generator when a cell is empty (it is asked with stories off), not as a
  due retry (`restoreMistakeBank(saved, mode)` drops a saved one, so the next
  save clears it; `isHeldStory` also guards the retry pick, and the
  grown-ups' "In review" count skips them). The gear panel says new word
  problems for the topic are on the way. The admin `?item=` pin still serves
  the pinned row. When a topic's v2 stories go live, its v1 stories retire
  and the topic leaves the list.
- Printed worksheets do not read the setting (web and iOS): the screen
  starts at the last sheet type printed, else "practice".
- iOS passes the setting into both sessions (`SessionViewModel.
  allowWordProblems`: the same UserDefaults key, on when missing; nothing on
  iOS writes it and iOS does not read `user_preferences` yet). The engine's
  own `createAdaptiveSession` default is still off, so a caller that passes
  nothing gets no stories (`simulateKid` plays words on unless `--words 0`).

## Math Facts practice (`src/facts/factPractice.js`, `factMarks.js`)
A Math Facts skill session (not its Fledging Flight) picks FACTS, not bank
rows. A fact (trackKey) is **ready** when fast, or answered fast earlier
today (`initFluency(skills, marks, { now, grade })`). Of the rest, the
session works on 8 facts from the first 4 strategy groups, taken in turn.
A strategy is the fact's group NUMBER (`f.group`), shared across bands and
with the partner operation ("Plus zero" and "Zero" are both 1), never the
group name, or a mixed + and − session drills zero facts across the two
skills. The pick steers away from the strategy this skill asked last and the
one asked just before (a 2-strategy mix like K can still pair two). A fact answered right
within the grade's limit this session is cleared and the next of its group
moves in; one asked 3 times without that waits for the next session. Every
4th question of a skill is a review: a ready or cleared fact not just
asked, then its turnaround asked plain (5 + 8 right after 8 + 5; it does not
take a turn). Elsewhere add/mul facts come in either order. Do not go back
to "the first group until it is fast": the fast mark needs 2 days, so that
drilled one group (× 0) for a whole day (Sai, Oct 1). `recordSkillAnswer`
needs the response time for the clear. Each fact is served from its bank row
(`mathFacts-v2-<fact>-<format>`) when in memory, else built by
`buildFactQuestion` — same payload. ~20 questions unless the caller sets a
size. The question carries `factId` / `factFormat` (top level, never in
metadata: a bank question inherits the generator's metadata scaffold), and
the practice log copies them onto the attempt.
The per-fact **fast** mark: right within 3 s (5 s for K and Grade 1 sessions)
on 2 different days, recall formats only (plain, stacked, missing), no
retries, no hint-assisted right answers. It lives in the Math Facts mastery
map under `__facts` (keyed by trackKey), folded by the same `applySession`,
merged per fact on sign-in, and **never gates a grade or a skill star**.
Shown on the topic sheet, the end card and the parent report.

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
`topicState.spec`, `parentReport.spec`, `storyHold.spec` (stories show for
an open topic, drills included, never for a held one, generator fallback and
`?item=` pin included), `userPreferences.spec` (default on, failed read writes nothing),
`e2e/skillsPlay.spec.js` (whole
sessions through the real widgets: level untouched, mastery saved, challenge
pays no stars, parent controls). Must stay green unchanged: `bankCellCoverage`,
`sessionEngine` (which pins "the level never moves mid-session"); parity
fixtures need no regeneration (stateless `generateQuestion` is untouched).

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

No flag. A `SessionViewModel` without a `skillRequest` is a plain session
(tests only — Home always opens the topic sheet).
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
