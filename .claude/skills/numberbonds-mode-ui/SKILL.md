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

## Question pattern catalog (every structureType, by family)

The reviewer-facing map of what each pattern asks. Bands: K-1 = wholes ≤10,
2-3 = within 20, 4-5 = within 100/1000.

### Procedural — symbolic drills (no signature cap; the fluency backbone)

| structureType | Bands | Asks | Example |
|---|---|---|---|
| `partUnknown` | K-1 | bond diagram, missing part — every fact, wholes 2–10, zero legal | `4 + ? = 9` + cherry widget (part-first; a few use `? + 4 = 9` to stay unique vs addition) |
| `teenBond` | 2-3 | teen as ten-and-ones, both slots | `10 + ? = 14` · `? + 10 = 14` |
| `takeFromTenFact` | 2-3 | teen minus 9/8/7/6 as a bond | `9 + ? = 13` |
| `partnersOf20/100/1000` | 2-3 / 4-5 | complement to a landmark whole | `7 + ? = 20` · `35 + ? = 100` · `450 + ? = 1000` |
| `takeOutTen` | 4-5 | G2 take-out-ten split | `26 = ? + 10` |
| `tensOnesBond` | 4-5 | canonical tens/ones, either slot | `30 + ? = 37` · `? + 7 = 37` |
| `wholeFromParts` | K-1 | whole unknown, equal sign left — every pair ≤10 | `? = 4 + 5` |
| `teenFromTen` / `bigDouble` | 2-3 | compose teens / doubles 6–10 | `? = 10 + 4` · `? = 7 + 7` |
| `threeAddendBond` | 2-3 | three addends holding a partner-of-ten pair | `? = 9 + 1 + 5` |
| `tensOnesCompose` / `hundredsCompose` | 4-5 | compose from place parts | `? = 30 + 7` · `? = 200 + 30 + 5` |
| `bondPatternStep` | K-1 | ordered-family step: prior decomposition shown | `9 = 5 + 4. 9 = 6 + ?` |
| `commutativeFlip` | K-1 | same bond, parts swapped | `8 = 3 + 5. 8 = 5 + ?` |
| `makeTenSplit` | 2-3 | split the addend to make ten (9→1, 8→2, 7→3) | `9 + 4 = 9 + 1 + ?` |
| `teenBridgePair` | 2-3 | ten-fact bridges to a nine-fact | `14 = 10 + 4. 14 = 9 + ?` |
| `takeFromTenChain` | 2-3 | subtract via the ten inside the teen | `13 = 10 + 3. 13 − 9 = ?` |
| `makeNextTen` | 4-5 | bridge the next ten within 100 | `39 + 4 = 40 + ?` |
| `ladderPair` | 4-5 | a basic fact lifts +10/+20/+30 | `13 − 8 = 5. 23 − 8 = ?` |
| `takeOutTenSplit` | 4-5 | expose the ten in any 2-digit number | `34 = 24 + ?` |
| `trueFalseBond` / `trueFalsePlaceBond` | all / 4-5 | judged claim — "Is this right?" Yes/No | `4 + 5 = 9` · `300 + 40 + 5 = 345` |

### Conceptual — visual & judged forms (≤5 per signature; phrasings rotate)

| structureType | Bands | Asks | Example |
|---|---|---|---|
| `frameWholeUnknown` | K-1 | two-color ten frame, count all | "5 red and 3 blue counters — how many in all?" + frame |
| `pictureWholeUnknown` | K-1 | two emoji groups, join | "One part: 🥚🥚🥚 Other part: 🥚🥚 How many eggs in all?" |
| `teenFrameWhole` | 2-3 | full frame + partial frame | two stacked frames, 10 red + n blue |
| `chooseWhole` / `chooseWholeBig` | 2-3 / 4-5 | pick the whole (distractors: part echo, difference, off-by-one) | "Parts 9 and 4 — which is the whole?" |
| `threePartWhole` / `unitFormWhole` / `tensOnesWhole` | 2-3 / 4-5 | three-part and place-language wholes | "2 hundreds 6 tens 3 ones — what number?" |
| `makeTenFrame` / `makeFiveFrame` | K-1 | complement read off the frame | "Frame shows 6 — how many more make 10?" |
| `buildToTen` | K-1 | build mode: tap to complete the ten | child adds counters, submits how many |
| `bondSentence` / `teenBondSentence` | K-1 / 2-3 | sentence frame, unknown first | "___ and 4 make 9" |
| `choosePart` / `choosePartTo100` | K-1 / 4-5 | pick the missing part (swap/echo distractors) | "Whole 100, part 35 — other part?" |
| `hiddenPartFrame` | 2-3 | total told, part visible, rest hidden | "12 in all, frame shows 8 — hidden?" |
| `errorPartWholeSwap` / `errorAtMagnitude` | 2-3 / 4-5 | fix a child who added whole+part | "…answered 20. What is the correct part?" |
| `nonCanonicalSplit` | 4-5 | non-place splits (ten out, tens under) | "Split 43 into 33 and one more part" |
| `whichPairMakesWhole` / `oddOneOutBond` | K-1 | recognize / reject a pair | "Which pair makes 7?" · "Which pair does NOT make 8?" |
| `openDecomposition(Teen)` | K-1 / 2-3 | multiSelect BOTH valid pairs (K.OA.3) | options "1 and 5", "5 and 3", … pick 2 |
| `equalSplit` / `frameSplitRead` | K-1 | halves; read one part off a two-color frame | "Split 8 into two equal parts" |
| `factFamily` | 2-3 | multiSelect the two subtraction sentences a bond makes | "whole 13, parts 9 & 4 → 13−9=4, 13−4=9" |
| `makeTenStrategy` / `nextTenStrategy` | 2-3 / 4-5 | which split reaches the (next) ten — options are all real splits | "9 + 5: split 5 as 1 and 4" |
| `judgeSplit` | 2-3 | Yes/No on a claimed split | "Can 13 split into 6 and 7?" |
| `threeBranchPlace` | 4-5 | hundreds/tens/ones bond, middle branch hidden (zero traps: 305) | "263 → 200, ?, 3" |
| `twoSplitsOfN` | 4-5 | multiSelect canonical AND take-out-ten splits | "34 → '30 and 4' + '24 and 10'" |

### Application — stories (≤3 per signature; names+nouns rotate)

| structureType | Bands | Situation | Example skeleton |
|---|---|---|---|
| `bondStoryWholeUnknown` | all | put-together, total asked | "Mia has 2 red cups and 3 blue cups. How many cups…?" |
| `bondStoryThreeParts` | 2-3, 4-5 | three collections joined | "…three jars: 4, 6, and 3. How many in all?" |
| `bondStoryTensOnes` | 4-5 | bags-of-ten + loose ones | "3 full bags of ten and 7 loose beads" |
| `bondStoryPartUnknown` | all | take-apart / change unknown / still-needs | "9 shells, 4 are spotted — how many plain?" |
| `bondStoryPartnerToTen` | K-1 | how many more to a full ten | "Has 6, wants a full ten — how many more?" |
| `bondStoryFillTen` | K-1, 2-3 | fill the 10-box, extras remain | "16 crayons, box takes 10 — how many outside?" |
| `bondStoryMakeTen` | 2-3 | reach ten, report the leftover | "Has 8, gets 5, rack holds ten — extras?" |
| `bondStoryEqualSplit` | all | share equally between two | "Deals 12 beads into two equal piles" |
| `bondStoryTakeOutTen` / `bondStoryTensSingles` | 4-5 | bundle a ten / count leftovers after tens | "Bundles ten of the 34 cups — outside?" |

## Bond visual + prompt rules (2026-08-21 sweep, user feedback)

- **Never join two equations with a bare period** — "8 = 5 + 3. 8 = 4 + ?"
  reads as "8 = 5 + 3.8" (decimal misread) and gives no cue that the first
  equation is a given. Join with ", so ": "8 = 5 + 3, so 8 = 4 + ?".
  ("so" is 2 letters — the drills stay under the 6-letter verbal filter.)
  Applied to bondPatternStep, commutativeFlip, teenBridgePair, ladderPair,
  takeFromTenChain and the generator's splitDrill band 1 (the
  m4NumberSense splitDrill oracle regex is pinned to the ", so " form).
- **The cherry diagram is the default for part-whole items.** The
  NumberBond widget (web `NumberBond.jsx`, iOS `NumberBondWidget`) renders
  two shapes, inferred from the payload: `{whole, part}` → missing-part
  (blank bottom slot); `display.parts` array of 2-3 known parts →
  missing-WHOLE (blank top). 933 bank items were switched from numberPad
  to `answerType: "numberBond"` by `scripts/sweeps/sweepNumberBondVisuals.mjs`.
- **Exclusions (do NOT give these the widget):** `equalSplit` /
  `bondStoryEqualSplit` — the shown part equals the answer, the diagram
  reveals it; `makeTenSplit` / `makeNextTen` — the cherry's whole is the
  strategy-split addend, not the number under discussion, which misleads.
- Generator `wholeUnknown` now uses the widget too (display gained
  `parts: [p1, p2]`); a fresh Fledging Flight shows the diagram.
