---
name: numberbonds-mode-ui
description: How Number Bonds! (numberBonds) presents questions and how its bank is built — the cherry-diagram widget, bond payload conventions, ten-frame rules, the bondMath QC check, and the deterministic authoring pipeline. Use when changing bond rendering, authoring/expanding numberBonds bank items, or debugging a bond item.
---

# Number Bonds — mode UI & bank

Generator: `src/modes/numberBonds.js` (13 varieties, subskills `partWhole` /
`missingPart` / `decompose`). Bank design: `docs/numberbonds-bank-design.md`
(source of truth — read it before adding items). Authoring pipeline:
`scripts/itemGen/authorNumberBonds.js` + `numberBondTemplates.js` +
`numberBondStories.js` (deterministic, no LLM; 1,591-item batch `b0820`).

## Payload convention — memorize this before touching an item

Every bank item: `op: "bond"`, `a`/`b` **null**. Setting numeric `a`/`b`
risks two engine behaviors: the trio arithmetic QC check, and MathExplorer's
vertical-equation layout (fires when `answer === a op b` and an operand ≥10,
replacing your prompt with a column sum). The `bondMath` QC check
(`src/itemBank/qc/checks.js`) then verifies:

- `display.whole` + `display.part` → missing part (`part + answer = whole`)
- `display.whole` + `display.parts` → three-part missing (`sum + answer = whole`)
- `display.parts` only → whole unknown (`sum = answer`)

Judged/choice items carry no numeric bond payload — the authoring script's
build-time asserts cover them; if you add such a shape, extend
`extraMathProblems()` in `authorNumberBonds.js`.

## Widget rules

- `answerType: "numberBond"` (`src/components/NumberBond.jsx`) draws whole +
  one part + entry slot. **Missing-part only** — there is no whole-blank
  bond widget; whole-unknown items use `numberPad`. Circle is 64px/text-2xl:
  keep displayed values ≤3 characters (bonds to 1000 → `numberPad`).
- Frame visuals ONLY render through `answerType: "tenFrame"` — `tenFrame` is
  a self-drawing answer widget, not in `figureRegistry`. A frame payload
  with `answerType: "numberPad"` silently shows caption-only. `filled` =
  red, `filledB` = blue (two-color = visible addition), `frames: 2` stacks
  for teens; `frameMode: "build"` submits the count of cells the child taps.
- True/false: claim in `promptText` ordered `a + b = c` (the judgment
  renderer's regex needs that order), `subPrompt: "True or false?"`,
  `choices: ["True","False"]`. Bank-authored `choices` survive —
  `generateChoices` returns them untouched.
- Emoji part-pictures ("One part: 🥚🥚🥚 …") go through the emoji-run prompt
  path; no display fields needed beyond `parts` for the gate.

## Authoring traps (each burned us during the b0820 build)

- **Signature caps span bands**: `findPromptOveruse` buckets by
  `mode::subskill::family` — application ≤3, conceptual ≤5 per prompt
  signature, and K-1/2-3/4-5 items share the bucket. Conceptual templates
  need phrasing rotation (`rotor()`); stories vary name+noun (both are part
  of the signature). A skeleton without a name in it (e.g. "Two friends
  share…") pins its signature — always include the child's name.
- **No prose item may state a part equal to the answer** (w = 2p missing
  part): the structure gate rejects "One part is 4 — name the other part"
  when the answer is 4. Symbolic prompts with `?` are exempt.
- **Pluralize**: "1 counters" / "1 tens" — use the `ctr()`/`unit()` helpers.
- **Pattern-pair collisions**: a commutative flip of `[w, p]` equals a
  bondPatternStep string when `w = 2p + 1`; T/F claim shapes collide on
  small wholes (dedupe set).
- **Strategy-split choice items**: distractors are OTHER genuine splits of
  the addend (all options sum to it); correctness = the option whose FIRST
  number completes the ten. Never use the reversed correct pair as a
  distractor.
- **Rerunning `authorNumberBonds.js --write` with the same `--tag` upserts
  over the previous batch** (same itemIds). New batch → new tag.

## QA / verification

- Dry run prints per-cell coverage and exits non-zero on any gate failure:
  `node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorNumberBonds.js`
- Reproduce a generator variety: `?qaVariety=<id>` on web (ids in
  `NUMBER_BOND_VARIETY_IDS`).
- Force a widget onto any mode: `/play/numberBonds?input=numberbond`.
- `bondMath` fixtures live in `src/__tests__/authorStructuresGate.spec.js`.
