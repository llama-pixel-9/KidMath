---
name: fix-bugs
description: Pick up open bug issues from GitHub and fix them — triage, reproduce with the QA harnesses, fix, verify, PR with auto-close. Use when Sai says "pick up the bugs", "fix the bugs", "check the bug list", or names a specific issue number.
---

# Bug pickup workflow

Sai logs bugs as GitHub issues labeled `bug` (repo llama-pixel-9/KidMath).
This skill is the standing authorization to pick them up and fix them.

## 1. Collect and triage

```bash
gh issue list --label bug --state open --json number,title,body,createdAt
```

Fix in this order — severity beats age:
1. **Kid-blocking**: crashes, stuck sessions, can't answer/submit
2. **Wrong math**: correct answers scored wrong, wrong answers scored right,
   display disagrees with scoring (the "19 + 14 → 5" class)
3. **Rendering**: widgets clipped/blank/misdrawn (the AngleFigure class)
4. **Progress/engagement**: levels, stars, streaks, Meadow
5. **Polish**: copy, layout, sounds

If a report is too vague to reproduce, comment on the issue with ONE specific
question (ideally: "what did the question say, exactly?") and move to the next
bug — never guess-fix.

## 2. Reproduce before fixing

Pick the right harness — do not start in the code:
- Engine / content / scoring / progression → `scripts/simulateKid.mjs`
  (see its header; `--modes X --personas typical` for a targeted run) or a
  small Node repro via `node --import ./scripts/lib/registerResolve.js`
- Anything visual or widget-input → robot-kid e2e (`npx playwright test
  --grep "<mode>"`, load `.claude/skills/robot-kid-e2e` first) or drive the
  dev server in the browser; seed level via localStorage `kidmath-progress`
- Bank content → query the item, check bundle↔cloud both (CLAUDE.md hard
  rules: paginate, and a fix isn't done until BOTH agree)
- iOS-specific → engine bugs reproduce in Node (shared engine); SwiftUI
  bugs need the simulator

## 3. Fix, then verify with the ladder

Match verification to blast radius, minimum `npm run test`:
- Engine touched → + `npm run build:engine && npm run test:engine`, and
  regenerate parity fixtures if generateQuestion output legitimately changed
- Content/generator touched → + simulator run
- UI touched → + e2e for the affected mode, browser screenshot for visual fixes
- Add a regression test in the right spec — remember `npm run test` is a
  hand-maintained file list; a new spec file must be added to it

## 4. Ship

```bash
git checkout -b fix/issue-<N>-<slug> origin/main
# ... fix + tests ...
git commit  # body explains cause, not just symptom; include "Fixes #<N>"
git push -u origin fix/issue-<N>-<slug>
gh pr create --base main ...   # summary + verification evidence
```

- "Fixes #N" in the commit/PR auto-closes the issue on merge.
- Comment on the issue with the one-line root cause when the PR opens.
- **Merging**: if Sai's instruction included merge authority ("fix and
  ship"), merge when checks pass; otherwise leave the PR for his review.
- Batch mode: one branch+PR per bug unless bugs share a root cause.

## 5. Close the loop

After the batch, reply with a table: issue → root cause → PR → status, and
anything that suggests a missing QC layer (a bug the harnesses should have
caught → extend the harness in the same PR).
