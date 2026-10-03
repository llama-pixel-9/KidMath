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
structure check (`src/itemBank/qc/structureCheck.js`) keys on ten of them.
`addToResult`, `takeFromResult`, `putTogetherTotal`, `putTogetherAddend` and
`bothAddendsUnknown` have no entry, so only its universal checks run on
those.

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
| `twoStepEquationSecondStep` | a two-step relation as one equation, box in the second step: 73 − 41 + □ = 38 |
| `chooseStoryForEquation` | pick the story that fits a number sentence |

A choose-the-equation row keeps the story's own Table 1 id.

A story skill's two-step bare row puts the box in the second step, and that
step always adds, so the kid finds a change, never a start. Two other forms
are not story rows:
- **Box at the end** (58 − 23 + 7 = □) has no missing number. It is a
  computing item (`addSubThree`, section 6).
- **Box in the first step** (68 − □ + 5 = 41) hides a start-unknown step
  inside a two-step item, and two-step rows never use a hard type.
- A take-away box step is left out too: a kid who carries on through the =
  sign (73 − 41 − □ = 20, then 32 − 20) lands on the key.

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
| `picture` | the quantities drawn as things | tens and ones, place-value discs, a coin tray, objects in rows of ten | `discMat` figure works in models (a picture). The tappable mat (`placeValueDiscs`, `display.mode: "build"`) is in PR #158. No rods-and-units drawing exists (new figure). Object emoji runs render in `promptText` but are not wired into models. Ten frames stop at 20. |
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
  computing item (45 + 27 = ?) belongs on the grade's computation list
  (section 6).

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
| `chooseExpression` | picks the expression, renaming, mistake or trade that fits (text choices) | computation reasoning rows (section 6) | works; model fields as `chooseEquation`; long text choices need a layoutSweep and simulator check |
| `chooseSymbol` | picks = or ≠ | VA 2.CE.1i | needs build: the symbol keys are fixed to <, = and >, and a two-choice answer is blocked like Yes/No |
| `buildModel` | builds the answer on a tappable place-value disc mat: adds and takes away discs, trades 10 for 1 and 1 for 10, then Check; the answer is the number the mat shows | mat rows: add or subtract on the mat, 10 or 100 more or less, which trade | PR #158 (2026-10-03; web and iPhone, needs a Mac build before merge). Each place holds 0 to 19 discs and Check opens only when every place has 9 or fewer |

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

## 6. Computation (no story)

A computation row is a bare add or subtract item: no story, no context. Sai
decided on 2026-09-28 that plain computation goes in the bank like any other
v2 row; `computationSampler` only fills an empty cell. Single-digit facts are
not computation rows: they are the fact fluency track. A story skill's box
equations (section 1, "Bare and reasoning rows") stay with the stories.

Classify a computation item by the work it asks for, never by v1 tags (v1
uses `multiDigitSum`, `multiDigitMissingAddend` and so on). The Grade 2 list
(`/mnt/project-files/item-skill/g2-addsub-calc-blueprints.json`) put these
rows in a new v2-only topic, `multiDigit` (its decision 1, approved by Sai
2026-10-02).

### Types (Grade 2)

| `structureType` | Plain name | G2 tier | Example (ours) [key] |
|---|---|---|---|
| `addWithin100` | Add two numbers within 100 | easy; moderate when it regroups | 68 + 25 = ? [93] |
| `subtractWithin100` | Subtract within 100 | easy; moderate when it trades | 81 − 47 = ? [34] |
| `addSeveral` | Add three or four two-digit numbers | moderate | 26 + 17 + 38 = ? [81] |
| `addSubThree` | Add and take away in one line (box at the end) | hard | 58 − 23 + 7 = ? [42] |
| `makeTenStep` | Make a ten, written as a step | moderate | 47 + 8 = 50 + □ [5] |
| `placeValueStep` | Tens, then ones, written as a step | moderate | 46 + 38 = 70 + □ [14] |
| `compensateAdd` | Same sum, friendlier numbers | moderate | Which is equal to 49 + 36? [50 + 35] |
| `compensateSubtract` | Same difference, friendlier numbers | moderate | Which is equal to 63 − 29? [64 − 30] |
| `addOnNumberLine` | Add with hops of ten, then ones | moderate | 54 + 28 on a line of hops [82] |
| `subtractOnNumberLine` | Subtract by counting up one hop | moderate | 75 − 38, one hop from 38 to 75 [37] |
| `checkWithInverse` | Check with the other operation | moderate | Which can you use to check 62 − 27 = 35? [35 + 27 = 62] |
| `findTheMistake` | Name the mistake in someone's work | moderate | Ava says 57 + 26 = 73. What mistake did Ava make? [did not add the new ten] |
| `missingDigit` | Find the missing digit | moderate | 4□ + 27 = 73 [6] |
| `whichTrade` | Which trade? (disc mat) | moderate | Take 36 from a mat of 7 tens, 1 one [trade 1 ten for 10 ones] |
| `groupToMakeTen` | Which two numbers make a ten first? | moderate | 36 + 18 + 14 [36 and 14] |
| `addWithin1000` | Add within 1,000 | easy; moderate when it regroups | 254 + 163 = ? [417] |
| `addPast100` | Two two-digit numbers, sum past 100 | moderate | 83 + 45 = ? [128] |
| `addTwoRegroups` | Add, regrouping the ones and the tens | hard | 386 + 147 = ? [533] |
| `addSeveralPast100` | Three or four two-digit numbers past 100 | hard | 37 + 28 + 46 = ? [111] |
| `subtractWithin1000` | Subtract within 1,000 | easy; moderate when it trades | 547 − 182 = ? [365] |
| `subtractTwoTrades` | Subtract, trading twice | hard | 621 − 358 = ? [263] |
| `subtractAcrossZero` | Subtract across a zero | hard | 503 − 276 = ? [227] |
| `addWithDiscs` | Add with a disc mat of the first number | moderate | 158 + 216 [374] |
| `subtractWithDiscs` | Subtract across a zero with a disc mat | hard | 403 − 158 [245] |
| `renameToSubtract` | Rename a number to subtract across a zero | hard | Which way of writing 605 has enough tens and enough ones to take away 278? [5 hundreds, 9 tens, 15 ones] |
| `tenOrHundredMoreLess` | 10 or 100 more or less | easy; moderate across a hundred | What number is 10 less than 503? [493] |
| `tenOrHundredOnMat` | 10 or 100 more or less on a disc mat | easy; moderate across a hundred | one more hundred disc on 386 [486] |
| `balanceEquation` | Box with a sum on both sides | hard | 58 + 27 = □ + 25 [60] |
| `chooseTrueEquation` | Which one is true? | moderate | [70 = 46 + 24] |
| `trueFalseEquation` | Is this true? (a number on one side) | moderate | 72 − 36 = 46 [No] |
| `trueFalseBothSides` | Is this true? (a sum on both sides) | hard | 44 + 29 = 43 + 30 [Yes] |
| `sameValueTwoMats` | Do two disc mats show the same number? | moderate | 4 tens 14 ones and 5 tens 4 ones [Yes] |
| `estimateSumDifference` | Best estimate (VA) | easy | About how much is 57 + 21? [80] |
| `equalOrNotEqual` | = or ≠ (VA) | moderate | 47 + 25 ○ 62 [≠] |

Every kid sees the two VA rows (no state filter, Sai 2026-10-02). The
estimate's hint leads to the exact answer and asks for the closest ten
without naming it. The ≠ row labels its keys in words ("= (equal)" and
"≠ (not equal)"), and its hint never writes = or ≠.

### Difficulty (computation rows)

Sai approved this rule with the Grade 2 computation list (2026-10-02,
decision 10). `checkCalcItem` in `src/multiDigit/calcItems.js` enforces it on
the script rows.

The tier comes from the trades the item needs, where the box sits, and how
many numbers and operations the equation has. Number size, the picture or
model, columns or a row, and the answer format never move it.

- **Easy**: no trade, two numbers, one operation, the answer after the =
  sign (43 + 25, 425 + 132, 100 more than 462). A rounding estimate.
- **Moderate**: exactly one trade (including a zero in the ones, 60 − 24,
  carrying 2 tens from one column, and 10 or 100 more or less across a
  hundred); three or four numbers added; a strategy step with its first move
  shown. A row that judges finished work is at least moderate.
- **Hard**: two trades, or a trade across a zero; a box or a true/false with
  a sum on both sides and no step shown; two operations in one line.
- A second trade or a trade across a zero is its own hard row, never a
  variant (the proposed departure from the skill's number dial).
- Two operations in one line keep the two-step limits: within 100, at most
  one trade, one step with a one-digit number.

### Representation and layout

- **Columns or a row** is a model setting (`display.layout`), never a row or
  a variant. A column row's prompt is the bare equation (`68 + 25 = ?`) and
  carries a, b and op: a sentence prompt ("What is 68 + 25?") shows in a row
  on web and iPhone.
- **Disc mat** (`figure: "discMat"`) is a picture. `promptIdentity` and the
  harness's prompt key count the mat (PR #156). A mat must be either something
  the kid taps or complete: a mat showing only the first number above the
  question was rejected (kit, "Rules learned from the Grade 2 add/subtract
  review"). The tappable mat is the `placeValueDiscs` widget with
  `display.mode: "build"` and the start mat in `display.cols`; the answer is
  the number the finished mat shows, scored like a typed number (format
  `buildModel`, section 3; PR #158, 2026-10-03). Start the mat on the first
  number only, and let the kid do the step: the six Grade 2 mat models
  (`calc-g2-*-discs*-2`, `calc-g2-which-trade-*-2`) are the exemplars.
- **Number line**: one hop works today (the kid types its length). Several
  hops, or the landing point as the answer, need widget work.
- **Numbers past 999 in choices** print without commas (1005), so the prompt
  must match.
- **Plain computing rows** (no words, no picture) are built by script the
  way Math Facts items are (Grade 2 calc rows 1-4 and 16-22,
  `src/multiDigit/calcItems.js`, loaded by `scripts/multiDigit/loadCalcItems.mjs`;
  its decision 3, approved 2026-10-02). Signed-out kids get them from a build
  at run time (`src/modes/multiDigit.js`).

### Mistake tags added

`smallerFromLarger` already covers "took the top digit from the bottom one".
`countedRodsAsOnes` also covers a ten or hundred disc counted as 1.
`calledThemEqual` (a money kit tag) is used outside money.

| Tag | The slip | Example |
|---|---|---|
| `misalignedPlaces` | lined the numbers up from the left | 57 + 6 answered 117 |
| `offByHundred` | broke a hundred into tens but kept the hundreds digit | 547 − 182 answered 465 |
| `acrossZeroSlip` | made the zero into 9 tens but did not take 1 from the hundreds | 503 − 276 answered 327; 10 less than 503 answered 593 |
| `tradedOnlyOnce` | across a zero, traded a hundred into tens but never a ten into ones | 605 as 5 hundreds, 10 tens, 5 ones to take away 278 |
| `tradedTheWrongWay` | traded a ten for ones when adding, or ones for a ten when subtracting | 7 tens and 13 ones: "trade 1 ten for 10 ones" |
| `carriedOneNotTwo` | a column made 20 or more, and only 1 ten was carried | 26 + 17 + 38 answered 71 |
| `leftOutAPart` | left out one number, or one place-value part | 26 + 17 + 38 answered 43; 49 + 36 as 40 + 30 + 6 |
| `stoppedAtTheTen` | on a make-a-ten step, gave the part that reaches the ten | 47 + 8 = 50 + □ answered 3 |
| `compensatedOneSide` | changed one number to a friendly number and left the other | 49 + 36 as 50 + 36 |
| `compensatedWrongWay` | changed both numbers the wrong way | 63 − 29 as 62 − 30 |
| `wrongSignOnSecondPart` | split a number to subtract, then added the second part | 63 − 29 as 63 − 20 + 9 |
| `missedAHop` | lost one hop on a number line with several hops | 54 + 28 answered 72 |
| `addedToTheStart` | checked a subtraction by adding to the start | 62 − 27 = 35 checked with 62 + 27 |
| `checkedWithSameOperation` | checked a subtraction with another subtraction | 62 − 27 = 35 checked with 35 − 27 |
| `blamedARightPlace` | on name the mistake, blamed a place that was done right | "Ava added the ones wrong" for 57 + 26 = 73 |
| `blamedAnotherSlip` | named a different slip, one that gives another answer | "Leo traded but kept 7 tens" for 74 − 38 = 44 |
| `blamedTheOperation` | said the wrong operation was used | "Ava took away" for 57 + 26 = 73 |
| `keptTheWrongAnswer` | said there was no mistake | "Ava made no mistake" |
| `changedTheWrongPlace` | changed the wrong digit for 10 or 100 more or less | 100 less than 462 answered 452 |
| `changedTheOnes` | added or took 1 instead of 10 or 100 | 100 less than 462 answered 461 |
| `pickedTheFirstTwo` | grouped the first two numbers when another pair makes a ten | 36 + 18 + 14: picked 36 and 18 |
| `pairDoesNotMakeTen` | picked a pair whose ones do not make a ten | 36 + 18 + 14: picked 18 and 14 |
| `roundedOneWrongWay` | rounded one number to the wrong ten | 62 − 28 estimated as 40 |
| `roundedBothWrongWay` | rounded both numbers to the wrong ten | 62 − 28 estimated as 50 |

For a difference, `roundedDownBoth` and `roundedUpBoth` give the same number,
so a difference estimate uses the two tags above. When two slips give the
same number for a fill (63 − 28: `smallerFromLarger` and `offByTen` both give
45), constrain the fill so they differ.

### Slips for variants that don't regroup

A carry or trade slip equals the key when nothing regroups, and `fill` drops
a distractor equal to the key, which leaves too few choices. A row whose
variants include no regrouping (or no crossing) lists that variant's own
slips in `spec.variantMistakes` (and its own example in
`spec.variantExamples`), for example "took away; a number shown; off by one"
for a no-regrouping put-together story.
