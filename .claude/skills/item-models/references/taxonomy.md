# Taxonomy: the four axes, problem types and mistake tags

Every blueprint row and every item model is placed on four axes: **problem
type**, **representation**, **answer format** and **demand**. Difficulty is
not an axis. It is read off the problem type, the number of steps and the
regrouping (see "Difficulty" in SKILL.md).

All examples here are our own wording, Grade 2, within 100. They follow the
house rules in SKILL.md: names from `src/itemModels/names.js`, the name
repeated instead of a pronoun, no sentence that opens with a numeral, and
counts inside each object's `count_one_kid` range. None shares a number set
or a sentence frame with the verbatim Table 1 and Progressions examples in
`docs/research-k4-problem-types.md`. Keep it that way when you add one. The
grade
placements follow CCSS Table 1 and the CCSS Progressions as quoted in
`docs/research-k4-problem-types.md` §1. That file was rebuilt second-hand and
the Progressions PDF is not in this checkout (`resources/` holds only its
README). Re-check against the source when it is on disk.

## 1. Problem type: add and subtract (CCSS Table 1)

The repo models all fifteen as one relation, `x + y = z`, with the unknown
moved around. The ids are `structureType` values from
`src/modes/structures/additiveStructures.js`. Use these ids exactly: the QC
structure check (`src/itemBank/qc/structureCheck.js`) keys on them.

**Expected** gives the grade where each type is mastered. K and G1 types stay
in Grade 2 with bigger numbers. **G2 tier** is that type's difficulty in a
one-step Grade 2 row. It is the row's `difficulty`. A model whose numbers
regroup moves an easy row's model to moderate (SKILL.md, Difficulty).

| # | `structureType` | Plain name | Kid solves by | Expected | G2 tier | Example (ours) |
|---|---|---|---|---|---|---|
| 1 | `addToResultUnknown` | Add to, result unknown | add | K | easy | Mia has 34 trading cards. Mia gets 25 more trading cards from a friend. How many trading cards does Mia have now? [59] |
| 2 | `addToChangeUnknown` | Add to, change unknown | count up or subtract | G1 | moderate | Hugo had 38 toy cars. Then Hugo got some more toy cars. Now Hugo has 62 toy cars. How many toy cars did Hugo get? [24] |
| 3 | `addToStartUnknown` | Add to, start unknown | **subtract** | G2 | hard | Zoe had some beads. Zoe found 17 more beads in a box. Now Zoe has 53 beads. How many beads did Zoe have at the start? [36] |
| 4 | `takeFromResultUnknown` | Take from, result unknown | subtract | K | easy | Omar has 76 trading cards. Omar gives 34 trading cards to Jude. How many trading cards does Omar have left? [42] |
| 5 | `takeFromChangeUnknown` | Take from, change unknown | subtract or count up | G1 | moderate | Nia had 70 marbles. Nia lost some marbles at the park. Now Nia has 43 marbles. How many marbles did Nia lose? [27] |
| 6 | `takeFromStartUnknown` | Take from, start unknown | **add** | G2 | hard | Sam had some stickers. Sam put 24 stickers on a card. Now Sam has 19 stickers. How many stickers did Sam have at the start? [43] |
| 7 | `putTogetherTotalUnknown` | Put together, total unknown | add | K | easy | Isla has 32 red crayons and 25 blue crayons. How many crayons does Isla have in all? [57] |
| 8 | `putTogetherAddendUnknown` | Take apart, one part unknown | subtract or count up | G1 | moderate | Kai has 46 red and blue building bricks. Kai has 19 red building bricks. How many blue building bricks does Kai have? [27] |
| 9 | `bothAddendsUnknown` | Both parts unknown (many answers) | find pairs | K | easy, reasoning | Dev has 40 wooden blocks. Dev uses all of the wooden blocks to build two towers. How many wooden blocks could be in the first tower and in the second tower? [any pair that makes 40] |
| 10 | `compareDifferenceMore` | Compare, how many more | subtract or count up | G1 | moderate | Tess read 51 pages. Finn read 27 pages. How many more pages did Tess read than Finn? [24] |
| 11 | `compareDifferenceFewer` | Compare, how many fewer | subtract or count up | G1 | moderate (a bit above #10) | Noor has 55 marbles. Cal has 38 marbles. How many fewer marbles does Cal have than Noor? [17] |
| 12 | `compareBiggerMore` | Compare, bigger unknown, "more" | add | G1 | moderate | Gia has 26 magnetic tiles. Eli has 15 more magnetic tiles than Gia. How many magnetic tiles does Eli have? [41] |
| 13 | `compareBiggerFewer` | Compare, bigger unknown, "fewer" (misleading) | **add** | G2 | hard | Lena has 37 leaves. Lena has 18 fewer leaves than Milo. How many leaves does Milo have? [55] |
| 14 | `compareSmallerMore` | Compare, smaller unknown, "more" (misleading) | **subtract** | G2 | hard | Rosa has 72 train track pieces. Rosa has 35 more train track pieces than Uma. How many train track pieces does Uma have? [37] |
| 15 | `compareSmallerFewer` | Compare, smaller unknown, "fewer" | subtract | G1 | moderate | Dara has 48 pattern blocks. Wren has 15 fewer pattern blocks than Dara. How many pattern blocks does Wren have? [33] |

The four **hard** types are 3, 6, 13 and 14. In each, the story's word or
action points to the opposite operation. A kid who goes by keywords gets
them wrong, so they are where the misconception distractors pay off.

**Compare rows.** The question names both sides ("than Finn"). A compare row
with no story keeps the compare words: "What number is 15 more than 26?",
"How far is it from 37 to 52?". Turned into a plain equation, a compare
becomes put-together (`STORY_ONLY_SITUATIONS` in `additiveStructures.js`).

**Do not trust v1 tags.** In the Grade 2 add/sub bank, 148 of 435 stories
(34%) carry the wrong `structureType`. For example, 126 rows tagged
`compareSmallerMore` are really add-to/start-unknown stories. Classify a v1
item from its text before you count it or use it as a reference. v1 also uses
a second naming scheme (`joinResultUnknown`, `separateChangeUnknown`).
Write the ids above.

### Two-step shapes (Grade 2)

Build two-step rows only from easy and moderate types, inside the two-step
number limits in SKILL.md:

- every number within 100
- at most one regroup across both steps
- in the default variant, one step uses a one-digit number

Two-step rows are always hard. Most Progressions examples use small addends
and stay away from the four hard types. `canComposeTwoStep` in
`src/modes/structures/levelPolicy.js` encodes the same rule (no
difficult-tier type in a two-step).

`structureType` ids for two-step rows are ours, in camelCase.
`src/modes/structures/additiveStructures.js` has none, and
`src/itemBank/qc/structureCheck.js` has no entry for them, so only its
universal checks run, and blind solve carries the load. Leave `operation` off
two-step models.

| Shape | `structureType` | Steps | Example (ours) [key] |
|---|---|---|---|
| Join, join | `twoStepJoinJoin` | 7 then 1 | Wren got 6 new stickers today. Wren already had 12 stickers in a book and 8 stickers in a box. How many stickers does Wren have now? [26] |
| Take from twice | `twoStepTakeTake` | 4 then 4 | Yara has 67 beads. Yara uses 23 beads on a necklace and 9 beads on a bracelet. How many beads does Yara have left? [35] |
| Take from, then add | `twoStepTakeAdd` | 4 then 1 | Gus had 47 marbles. Gus gave 15 marbles to Jude. Later, Gus's sister gave Gus 8 marbles. How many marbles does Gus have now? [40] |
| Add, then take from | `twoStepAddTake` | 1 then 4 | Faye has 36 beads. Faye gets 20 more beads as a gift. Then Faye uses 7 beads to make a ring. How many beads does Faye have now? [49] |
| Join, then compare | `twoStepJoinCompare` | 7 then 10 | Nico has 14 red pom-poms and 23 blue pom-poms. Hana has 30 pom-poms. How many more pom-poms does Nico have than Hana? [7] |
| Compare "more", then total | `twoStepCompareMoreTotal` | 12 then 7 | Kim read 15 more pages than Beck. Beck read 23 pages. How many pages did Kim and Beck read in all? [61] |
| Compare "fewer", then total | `twoStepCompareFewerTotal` | 15 then 7 | Isla has 8 fewer building bricks than Jae. Jae has 42 building bricks. How many building bricks do Isla and Jae have together? [76] |
| Take apart, then add more | `twoStepApartAdd` | 8 then 1 | Ezra has 52 green and yellow building bricks. Ezra has 30 green building bricks. Then Ezra gets 6 more yellow building bricks. How many yellow building bricks does Ezra have now? [28] |

In a part-whole story, name both colors in the total ("46 red and blue building
bricks") so the next "has" reads as a part, not a second amount. Take-from verbs
remove the objects (gives away, loses, eats, uses up); never "uses 34 blocks to
build a tower" when the question asks how many the kid has now.

Two-step distractors: the step-one result (`stopsAtStepOne`), every number
added together (`addedEverything`), and the wrong operation in step two
(`wrongOperationStepTwo`). Never put misleading wording, two steps and
regrouping in one item.

### Bare and reasoning rows

These ids are ours too, and `structureCheck.js` has no entry for them:

| `structureType` | Row |
|---|---|
| `equationUnknownMiddle` | bare equation with the box second or after =: 45 − □ = 18 |
| `equationUnknownFirst` | bare equation with the box first: □ − 24 = 19 |
| `chooseStoryForEquation` | pick the story that fits a number sentence |

A choose-the-equation row keeps the story's own Table 1 id.

### Other skills

For multiply and divide, use the CCSS Table 2 ids in
`src/modes/structures/multiplicativeStructures.js` (`equalGroups*`,
`array*`, `compare*Unknown`, `divisionWithRemainder`,
`remainderInterpretation`). For a skill with no structure file (time,
measurement, place value), the skill map (pipeline step 1) defines its
problem types from the standard and the tests before any row is drafted.
Give each type a camelCase id, a plain name, the grade where it is expected
and one example of ours. Put that table in the skill's map, not here.

## 2. Representation: what carries the numbers

| Value | The child sees | Grade 2 add/sub examples | App today |
|---|---|---|---|
| `picture` | the quantities drawn as things | tens and ones, place-value discs, a coin tray, objects in rows of ten | `discMat` figure works in models. No rods-and-units drawing exists (new figure). Object emoji runs render in `promptText` but are not wired into models. Ten frames stop at 20. |
| `model` | a math model of the relation | tape (bar) diagram; number line with hops; number bond | `barModel` widget: `barPartWhole` (whole and one part known, kid types the other part) and `barCompare` (smaller amount and difference, kid types the bigger). `numberLine` in `lineMode: 'jump'` draws one hop. Other tape shapes and multi-hop lines need widget work. |
| `numbers` | numerals in text only | a story told in words; a bare equation | always |

Each row also says whether it is a **story** (a context that matters) or
**bare** (no context). Coverage counts these definitions:

- **A picture row** has `representation: "picture"`: the quantities drawn as
  things. A tape diagram, number line or bond is a `model` row, never a
  picture row.
  - Every objective gets at least one picture row, marked
    `app: "needs …"` when the app cannot draw it yet.
  - A model row stands in for a picture row only if Sai agrees to that in a
    numbered decision.
- **A bare row** has `story: false`. In a story skill it is the same relation
  written as an equation with a box (□ − 24 = 19, 46 + □ = 72,
  36 − 14 + □ = 31). A story with equation choices is a story row. A
  computation drill (45 + 27 = ?) belongs to the computation track.

Rules:
- The picture shows the math relation, not decoration. It must not let the
  kid read off the answer by counting.
- A new figure class needs a line in `src/itemBank/figureContracts.js`, or
  CI fails it. Text that describes a picture is not a picture.
- Hint pictures: only `dots`, `array`, `strip`, `numberLine` and `tenFrame`
  are drawn (`HintPane.jsx`). `barModel` and `tapeDiagram` hint pictures
  validate, then are silently dropped.

## 3. Answer format

| Value | What the kid does | Fits | App today |
|---|---|---|---|
| `typed` | types a number (`widget: "numberPad"`) | any one-answer row; the CCSS default | works |
| `multipleChoice` | picks one of 3 or 4 numbers (`widget: null`) | rows where every distractor is a named mistake | works; numeric choices are sorted, served rows may reshuffle |
| `chooseEquation` | picks the number sentence that fits the story | hard types, where the story order and the solving order differ | works (text choices) |
| `chooseStory` | picks the story that fits a number sentence | TX 2.4D, FL MA.2.AR.1.1 (a situation from an equation) | works (text choices); stories in choices must stay short |
| `chooseModel` | picks the tape diagram or number line that fits | TX representation items (Grade 3) | needs figure work: no tape figure in choices |
| `completeModel` | types the missing part into a drawn bar or hop | part-whole and compare rows the widget can draw | works for the two bar shapes and one hop |
| `trueFalse` | Yes or No on a statement or equation | "Is 45 − 18 = 27 true?", "Did Ana add the right numbers?" | engine works; `validateModel` wants 2 distractors and the harness wants 3+ choices (blocked) |
| `multiSelect` | picks all that apply | both parts unknown; "which two number sentences fit" | widget works; item models cannot carry a list answer (blocked) |
| `twoPart` | answers Part A, then Part B | two-step with the middle result asked first | not built: one answer per question |

A blocked format can still be drafted as a row. Mark it `app: "needs …"` so
Sai can approve or strike it knowing the cost.

## 4. Demand

| Value | The kid has to | Example |
|---|---|---|
| `recall` | know or read off something without working it out | "What is 40 + 30?"; read the total off a labelled tape |
| `procedure` | carry out a known method on the given numbers | solve a one-step story; find the missing part |
| `reasoning` | decide, choose or judge something beyond the answer | choose the number sentence; find a kid's mistake; is this true; which pairs could it be; which story fits |

Demand is not difficulty: a reasoning row can be easy and a procedure row
hard. Most story rows are `procedure`. Each objective needs some
`reasoning` rows, because v1 had none.

## 5. Mistake tags (distractor `mistake` and hint `feedback` keys)

Each distractor is one named mistake. Reuse these tags. The kit's money tags
(`countedCoinsNotValue`, …) stay valid for money.

| Tag | The slip | Example |
|---|---|---|
| `addedInsteadOfSubtracted` | used + where − solves it | 52 − 27 answered 79 |
| `subtractedInsteadOfAdded` | used − where + solves it | start unknown 24 and 19 answered 5 |
| `keywordTrap` | followed "more", "fewer", "left" or "in all" instead of the story | "18 fewer than Milo", so 37 − 18 |
| `answeredWithAGiven` | gave a number from the story | 62 for "how many did Hugo get" |
| `startAsResult` | on a start unknown, combined the two givens in the story's direction | 17 + 53 = 70 for row 3 |
| `forgotToCarry` | added without regrouping | 28 + 35 answered 53 |
| `placeValueSlip` | wrote the ones total as digits | 28 + 35 answered 513 |
| `smallerFromLarger` | took the smaller digit from the larger in each column | 52 − 27 answered 35; 60 − 24 answered 44 |
| `offByTen` | a tens slip after regrouping | 61 − 24 answered 47 (regrouped the ones, kept 6 tens) |
| `offByOne` | counted the start when counting on | 38 to 62 counted as 25 |
| `countedBothEnds` | counted both ends of a number-line hop | 37 to 52 read as 16 |
| `readJumpBackwards` | read a number-line hop in the wrong direction | a hop left read as add |
| `solvedForWrongQuantity` | found the total when a part was asked, or the reverse | 46 + 19 for "how many blue building bricks" |
| `pickedStoryOrder` | chose the sentence that strings the story's numbers together in reading order with the story's sign | row 3: 17 + 53 = □ instead of □ + 17 = 53 or 53 − 17 = □ |
| `unknownInWrongPlace` | put the box where the story's answer is not | 45 − 18 = □ versus □ − 18 = 45 |
| `equalsMeansCompute` | read = as "write the answer next" | 7 + □ = 25 answered 32 |
| `pairDoesNotMakeTotal` | on both parts unknown, picked a pair with a different total | 15 and 35 for 40 |
| `countedRodsAsOnes` | counted a ten-rod as 1 in a tens-and-ones picture | 3 rods and 4 cubes read as 7 |
| `stopsAtStepOne` | gave the middle result of a two-step | 14 + 23 = 37 for "how many more than Hana" |
| `addedEverything` | added every number in a two-step story | 67 + 23 + 9 for "left" |
| `wrongOperationStepTwo` | did step one right, then used the wrong operation | 37 + 30 instead of 37 − 30 |
| `usedOnlyOnePart` | answered with one part where the total was asked | Tuesday's 41 pages for "in all on Monday and Tuesday" |
| `doubledTheFirstAmount` | used the first amount for both parts | 26 + 26 for Monday and Tuesday |
| `differenceAsAmount` | took the difference as the amount | Nico's bar drawn 9 long for "9 fewer than Tess" |
| `roundedDownBoth` | rounded both amounts down | 42 + 37 estimated as 40 + 30 |
| `roundedUpBoth` | rounded both amounts up | 42 + 37 estimated as 50 + 40 |
| `roundedToHundred` | rounded to the hundred | 79 estimated as 100 |

Which tags fit which type:

| Types | Tags |
|---|---|
| 1, 7 | `forgotToCarry`, `placeValueSlip`, `answeredWithAGiven` |
| 4 | `smallerFromLarger`, `offByTen`, `addedInsteadOfSubtracted` |
| 2, 5, 8 | `addedInsteadOfSubtracted`, `answeredWithAGiven`, `offByOne`, `solvedForWrongQuantity` |
| 3 | `startAsResult`, `answeredWithAGiven`, `smallerFromLarger` |
| 6 | `subtractedInsteadOfAdded` / `keywordTrap`, `answeredWithAGiven`, `forgotToCarry` |
| 9 | `pairDoesNotMakeTotal` |
| 10, 11 | `keywordTrap`, `answeredWithAGiven`, `countedBothEnds` |
| 12, 15 | `addedInsteadOfSubtracted` or `subtractedInsteadOfAdded`, `answeredWithAGiven` |
| 13, 14 | `keywordTrap`, `answeredWithAGiven`, a regroup slip |
| two-step | `stopsAtStepOne`, `addedEverything`, `wrongOperationStepTwo`, `usedOnlyOnePart`, `doubledTheFirstAmount` |
| estimate | `roundedDownBoth`, `roundedUpBoth`, `roundedToHundred` |
| choose the sentence | `pickedStoryOrder`, `unknownInWrongPlace` |
| tens-and-ones picture | `countedRodsAsOnes`, `forgotToCarry` |

Feedback for a slip that depends on direction covers both directions ("more
does not always mean add"). The v1 helper `misconceptionsFor` in
`src/modes/addition.js` tags `startAsResult` on every solve-for-x structure.
Do not copy that.

Sources: these tags come from `src/modes/distractors.js`, the money kit,
spec A6 and research §4.1/§4.10. `smallerFromLarger`, `addedEverything`,
`countedBothEnds` and `countedRodsAsOnes` are our own. No curriculum source
on building distractors is in the repo.
