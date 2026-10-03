# Item model writer kit (v2 item bank)

Written for the Grade 2 money pilot (2026-09-28) and kept as the kit for every skill after it: the spec and difficulty sections below are the money worked example; replace them with the next skill's approved plan section and keep everything else.

You are writing **item models** for Larkit, a paid K-5 math practice app. An item model is one well-written question with its numbers and context left as slots; the app fills a model into many concrete items with computed keys. Sai (the owner, a tutor) reviews every model on a review screen, so each model must be something a careful Grade 2 teacher would be proud to print.

Everything below is verified against the code on `main`; run commands from the repo root. Read the exemplar models first: `src/itemModels/samples/grade2Money.js` (five commented exemplars) and `src/itemModels/pilot/grade2Money.json` (the 141 pilot models). Copy their level of care, not their content.

Paths:
- Harness: `npm run models:harness -- <models.json> [--seeds N] [--samples N] [--items out.json --per N] [--quiet] [--mode ID --code CODE --prefix P]` (`scripts/itemModels/harness.mjs`; the per-model rules are in `scripts/itemModels/harnessRules.js`)
- Eligible objects with prices: `src/content/contextTable.json` (the objects whose `skills` include the skill, with their unit price range; the harness's `contextObjectKnown` and `priceInRange` checks read the same table)
- Loader: `npm run models:load -- <models.json> --dryRun` validates the file the way the loader will; without `--dryRun` it upserts the models as drafts for review at `/admin/models`
- Your output: one JSON array of models per cell, written outside `src/` (a scratch folder); the pilot file above is the shape to match

A writer never edits files inside the repo. It writes its own cell file and scratch files only.

## The spec Sai approved (plan section 3)

- Skill: Grade 2 money. Standards: CCSS `2.MD.C.8`; TX TEKS `2.5A`, `2.5B`; FL `MA.2.M.2.2`; VA `2.NS.4b` for counting coins, `2.NS.4c` for making an amount, `2.CE.1c` for stories and `2.CE.1b` for drills; GA `2.MDR.6.2`. Every code must be in that framework's list in `src/standards/`, and CI fails a code that is not.
- Subskills (the app's four): `countCoins` (count coins and bills by value), `makeChange` (count up from a price to what was paid), `coinEquivalence` (same value with different coins, fewest coins, make an amount, compare piles), `moneyReasoning` (money word problems: totals, what is left, enough money, how much more, saving, sharing).
- Number ranges: coins total up to 99¢; bills up to $10 in Grade 2 stories (the standard allows $100, but keep totals a 7-year-old can hold); **never more than 8 coins pictured**.
- Contexts: objects kids care about, from the context table, at realistic 2026 prices. Leave out bus fare.
- Item types: count the coins shown (coin tray), make an amount (tap coins on the tray), word problem with a total or change (choice grid with money amounts), compare two amounts.
- Widget rule: whenever the item is about one pile of coins the kid can see, show the tray (`widget: "coinTray"`). A two-pile comparison uses the choice grid and names the coins in words, with a `coinTray` hint picture (not drawn yet; see Hints).
- Common mistakes to target with distractors: counts coins instead of value; treats a nickel as worth more than a dime; drops the dollar or the cents when crossing a dollar; adds instead of subtracts; skips or stops after the first count-up hop; forgets to carry.
- Hints (bulb): nudge (what is asked, where to start), steps with the item's own numbers that stop before the answer, a picture, a worked example with other numbers (`"auto"`), feedback per tagged mistake, and a worked solution.
- Wording: Common Core test wording. "How much money…", "How much change…", "How many cents…". Money is written 45¢ under a dollar and $1.09 from a dollar (Florida kids automatically get $0.45; you never write that yourself). Never write amounts as bare cents in prose ("109 cents"). Say "a $1 bill", "two $1 bills", "a $5 bill".

### Difficulty dials (plan section 4)

| Dial | Easy | Moderate | Hard |
|---|---|---|---|
| Coins | one kind, under 50¢ | mixed kinds, up to 99¢ | bills and coins together, or two-step |
| Steps | one | one, less obvious wording | two (Grade 2 and up) |
| Numbers | friendly, no regrouping | regrouping once (a count-up with two hops, a carry) | crossing a dollar, near a dollar |
| Support | picture shown (tray) | picture for some | numbers and words only, like the test |
| Answer choices | clearly different | one close distractor | every distractor is a common mistake |

## Model shape (JSON, one object per model)

Write JSON, not JavaScript: every expression is a string. String literals inside an expression use single quotes: `"'They have the same amount'"`.

```
{
  "id": "money-g2-<shape>-<difficulty>",      // kebab or camel shape word; unique across the whole pilot
  "modeId": "money",
  "subskill": "countCoins" | "makeChange" | "coinEquivalence" | "moneyReasoning",
  "family": "application" | "conceptual" | "procedural",   // stories are application; "which coin / how many pennies" are conceptual; bare drills are procedural
  "structureType": "<shortCamelName>",       // a short tag for the question shape, e.g. "changeFromDollar"
  "grade": "2",
  "standards": { "ccss": ["2.MD.C.8"], "tx": ["2.5A", "2.5B"], "fl": ["MA.2.M.2.2"], "va": ["2.CE.1c"], "ga": ["2.MDR.6.2"] },
  "difficulty": "easy" | "moderate" | "hard",
  "format": "number" | "money" | "choice",   // number = a whole number of cents typed or built; money = an amount picked on the grid; choice = words picked on the grid
  "widget": "coinTray" | "numberPad" | null,  // null = the choice grid
  "representationType": "objectSet" | "verbalContext" | "symbolic",
  "template": { "prompt": "…{name}…{object_a}…{price}…?" },
  "slots": { … },
  "constraints": ["expr", …],                 // optional; the fill re-rolls until all hold
  "operation": { "a": "expr", "b": "expr", "op": "+" | "-" | "count" },   // optional; a/b only when the prompt shows those numbers as bare numerals
  "display": { … },                            // optional widget payload, every string an expression
  "answer": { "expr": "…", "type": "int" | "money" | "text" },
  "distractors": [ { "expr": "…", "mistake": "camelTag" }, … ],   // 2 to 3, each a different mistake tag
  "hint": { "nudge": "…", "steps": ["…"], "picture": {…} | null, "example": "auto" | null, "feedback": { "camelTag": "…" }, "solution": { "steps": ["…"], "answer": "expr" } },
  "provenance": { "author": "larkit", "checkedAgainst": ["CCSS 2.MD.C.8", "TEKS 2.5A-B", "FL B.E.S.T. MA.2.M.2.2", "VA SOL 2023", "GA K-12 2021"] }
}
```

### Slots

Tokens in any templated string: `{slot}`; for an object slot also `{slot_plural}` and `{slot_a}` ("an eraser"). A name slot renders the name; a money slot renders as 45¢ or $1.09; an int slot the number; a coins slot the phrase "2 quarters and 1 dime"; an expr slot its value in its `format`.

- `{ "kind": "name" }` — a first name from the app's list of 40; every name slot in a model gets a different name.
- `{ "kind": "object", "skill": "money", "band": "2-3", "minAppeal": 2, "priceCents": [lo, hi], "categories": [...], "excludeCategories": [...], "exclude": [ids] }` — an object from the context table whose unit price range overlaps `priceCents`. Coins, bills and pack-only objects are never drawn. The eligible list with price ranges comes from `src/content/contextTable.json`; objects with `"sellable": false` (chore, weekly allowance, lost tooth, song, app, arcade game…) must be excluded from anything a kid "buys". A safe purchase filter: `"excludeCategories": ["screens-media"], "exclude": ["arcade-game", "claw-machine", "lost-tooth", "family-photo", "chore", "weekly-allowance", "birthday-money-gift", "field-trip", "pressed-penny", "school-lunch", "train-ticket", "museum-ticket"]`. Add ids you see producing odd prompts.
- `{ "kind": "setting", "of": "object", "startsWith": "at ", "words": [shop words], "fallback": ["at the school store", …] }` or `{ "kind": "setting", "options": ["in a piggy bank", …] }`.
- `{ "kind": "money", "of": "object" | [lo, hi] | 100 }` — cents; a price inside the object's range, a range, or a fixed amount.
- `{ "kind": "int", "min": 1, "max": 9 }`.
- `{ "kind": "coins", "count": [lo, hi], "kinds": ["quarter", "dime", "nickel", "penny"], "sameKind": true|false, "maxCents": 99 }` — a list of coin names.
- `{ "kind": "expr", "expr": "…", "format": "int" | "money" | "text" | "coins" }` — computed from earlier slots, so hints can name a hop or a total without arithmetic in prose. Define every number a hint or solution mentions as an expr slot.

Expression language: numbers, `'strings'`, slot names, `+ - * / %`, comparisons, `&& || !`, `cond ? a : b`, and these helpers: `min max abs floor ceil round nextTen floorTen nextDollar ones tens len sum take drop concat coinValue coinValues sortByValue fewestCoins`. `nextTen(x)` is the next multiple of 10 at or above x; `tens(x)` is x without its ones digit; `fewestCoins(cents)` gives a coin list; `coinValue(list)` its cents.

### Answer, choices, distractors

- `answer.type` `int` for a whole number (cents typed or built, a count), `money` for an amount shown as 45¢ / $1.09 on the grid, `text` for words (a name, "They have the same amount").
- Numeric choices are sorted in number order automatically; text choices are shuffled. Every fill needs the key plus at least 2 distinct distractors; a distractor that collides with the key is re-rolled, and if it still collides it is dropped. Write constraints so collisions are rare (the harness fails a model whose distractors collide in over 20% of fills).
- A slip that exists only on some numbers (taking the smaller ones digit from the larger needs a trade; forgetting to carry needs a carry) carries `"when": "<expression>"`. On other draws its `"otherwise": { "expr", "mistake" }` stands in (use it on choice items, so every fill shows the same number of choices), or with no `otherwise` that choice sits the fill out (fine on number-pad items, which keep at least 2 other slips). Without `when`, the fill re-rolls until the slip exists, so a row that asks for "about half regroup" ends up regrouping on every fill. Hint lines that only fit one case (a trade step) come from a derived slot such as `"tradeStep": "a1 < b1 ? 'Trade 1 ten for 10 ones first.' : 'Take away the ones.'"`.
- Every distractor is one named mistake. Use these tags where they fit, and invent clear camelCase tags otherwise: `countedCoinsNotValue`, `skippedACoin`, `countedACoinTwice`, `nickelWorthMoreThanDime`, `usedWrongCoinValue`, `addedInsteadOfSubtracted`, `subtractedInsteadOfAdded`, `skippedFirstHop`, `stoppedAfterFirstHop`, `forgotTheDollar`, `droppedTheDollar`, `forgotToCarry`, `offByTen`, `offByOne`, `answeredWithAGiven`, `pickedTheOtherKid`, `calledThemEqual`, `countedCoinsNotDollars`, `halvedInsteadOfDoubled`, `doubledInsteadOfHalved`, `usedOneItemOnly`.
- Never negative or fractional values; whole cents only.

### Widgets and display

- **Choice grid** (`"widget": null`): the default for money-amount answers and word answers.
- **Coin tray, count mode** (`"widget": "coinTray"`, `"format": "number"`, `answer.type` `int`): the tray shows `display.coins`, the kid types the total in cents. Use `"display": { "coins": "coins", "coinMode": "'count'", "counting": { "kind": "sum", "parts": "coinValues(coins)" } }` and `"operation": { "op": "count" }`. Keep the pile to 8 coins or fewer.
- **Coin tray, build mode** (`"widget": "coinTray"`, `"format": "number"`, `answer.type` `int`): the kid taps coins in the tray to make the target amount; any combination that totals the target is right (the app checks the total, not the count). The tray must contain a combination that reaches the target and no more than 8 coins: e.g. slots `target` (money or int) and `tray` `{ "kind": "expr", "expr": "concat(fewestCoins(target), extras)", "format": "coins" }` with an `extras` coins slot of 1-3 coins, `"display": { "coins": "tray", "coinMode": "'build'" }`, answer `target`. Distractors are still required (they are stored, not shown): use nearby wrong totals.
- **Number pad** (`"widget": "numberPad"`, `"format": "number"`, `answer.type` `int`): the kid types a whole number of cents. Ask "How many cents…?" so the unit is unambiguous.
- Money stories with no coins shown: choice grid. You may add `"display": { "money": { "kind": "change" | "total", … } }` as the exemplars do; it is informational.
- `representationType`: `objectSet` when a tray is shown, `verbalContext` for a story, `symbolic` for a bare drill.

### Hints

- `nudge`: one sentence that says what is asked and where to start, never the answer.
- `steps`: 2-4 lines with this item's numbers, stopping before the answer. Name hops and partial totals through expr slots (`{nextTen}`, `{hop1}`), never compute in prose.
- `picture`: only dots, array, strip, numberLine and tenFrame are drawn today (the iPhone skips tenFrame too); the other kinds validate but show nothing, so do not lean on them. Shapes: `{ "kind": "coinTray", "coins": "sortByValue(coins)" }`, `{ "kind": "numberLine", "min": "floorTen(price)", "max": "paid", "mark": "price" }` (min < max required), `{ "kind": "barModel", "parts": ["price1", "price2"] }`, `{ "kind": "tenFrame", … }`, or null.
- `example`: `"auto"` (the same model filled with other numbers and solved; needs `solution`).
- `feedback`: one sentence per distractor mistake tag, explaining the slip and pointing to the right move.
- `solution`: 2-4 steps that finish the count-up or the addition with the item's numbers, then `answer` as an expression.
- No hint layer a kid reads before answering (nudge, steps, picture, example) may state this item's key. The harness checks it.

### Checks every fill must pass (the harness runs them)

One question mark and one question; the question word matches the answer type ("How many cents" → a number; "How much money / change" → a money amount; "Who" → a name); prompt ≤ 220 characters, ≤ 40 words; every object in the sentence is in the context table and its price inside the table's range; no kid-safe list hit (weapons, violence, alcohol, gambling, religion, brands, body weight, romance, scary content, unsafe-alone activities, put-downs); no teacher jargon from the `TEACHER_JARGON` list (subitize, numeral, equivalent, …; it does not include "minuend", "addend" or "equation", so read for those yourself); singular noun after "1"; a hint present; hints never give the key away; the tray, when present, has 1-8 coins; at least 20 distinct prompts in 40 fills; the key is among 3-4 distinct choices.

## Workflow

1. Write your 10 models into `<cell>.json` (a JSON array).
2. Run the harness from the repo root: `npm run models:harness -- path/to/<cell>.json`
   It prints PASS/FAIL per model with the first errors, six sample prompts per model with their choices, and writes `<cell>.report.json` (per-model samples, the first fill's full hint, stats).
3. Fix and re-run until every model passes. Then read every sample prompt as a teacher would: does each sentence make sense (a kid does not "buy a chore"), are the prices believable for that object in 2026, is the question one a state test would ask, do the hints read naturally with the filled numbers (open the report's `hintSample`)? Fix what reads wrong even when the harness passes.
4. Ten models per cell means ten different question shapes, not one sentence with ten wordings. Vary the setting, who acts, what is asked for (the total, the change, what is left, who has more, how many of a coin), and how the numbers are given (tray, coin words, prices).

## Sentence shapes (added 2026-09-28)

The default story is who and where, then the numbers, then the question, and the question card puts each sentence on its own line. That shape is right for most easy items, but ten of them in a row read as a worksheet, not a test. State tests and textbooks keep the setup-numbers-question order and vary the packaging; a cell of ten should too, with no more than six models of one shape:

- **Story in three sentences** (the default): "{name} buys 2 {object_plural} {setting}. Each one costs {price}. How much money does {name} spend?"
- **Folded story, two sentences**: both facts in one sentence, then the question. "{name} buys 2 {object_plural} for {price} each {setting}. How much money does {name} spend?" A folded sentence still counts its facts: at most two.
- **Question first, one sentence** (moderate and hard): "How much change does {name} get from a $5 bill when {object_a} costs {price} {setting}?"
- **The picture carries the numbers**: one sentence of text and the tray or a named coin list. "{name} has these coins {setting}. How many cents does {name} have?"
- **One detail to ignore** (hard only): a sentence with a number that is not part of the question, a distractor that uses it, and a feedback line that names it. "{name} looks at {object3_a} for {price3} but does not buy it." / "{name} also has {coins} in a pocket."

Whatever the shape: the question restates the noun, one question mark, every sentence at most two facts, and the QC `priceInRange` check reads any amount in the object's sentence as its price except money the kid has, earns, saves or finds and a bill handed over ("a $5 bill").

## Rules learned from the Grade 2 money pilot review (2026-09-28)
Every one of these came up as a reviewer finding; write to them from the start.
- Never put "die" (or any kid-safe list word) in an exclude list: the list scan reads the whole spec. Use the constraint `object.plural != 'dice'` per object slot instead.
- Hint steps stop before any subtotal that is most of the work: name the coins and the strategy, not "{coins} make {coinsPart}". The worked solution may state everything.
- Numbers in prose take a unit: "ten cents" or "10¢", never a bare "adds 10". A step must never spell the key (the harness fails hintNoAnswer): when a step names a coin value that can equal the answer, write the value in words.
- Fallback shops are neutral ("at the store", "at the school store", "at the dollar store"); "at the fair", "craft fair", "farmers market" only from the object's own settings. Two-object stories draw the setting from a generic options list, not from object1.
- Exclude cafeteria and grocery items (carton-of-milk, orange, apple, ear-of-corn, loaf-of-bread...) from toy or treat stories, and venue-bound items (arcade-token, carnival-ticket, ride-ticket, cup-of-lemonade, vending-machine-snack) from any multi-object story.
- Setting options that name a context-table object (car, backpack, coin purse, door) are silently dropped by fill.js; use options with no object word.
- A "these coins" tray needs count >= 2. A coin pile in a hard cell must mix kinds: add `coinValue(coins) != 25 * len(coins)` (and the 10 and 5 versions) and count >= 3.
- Test-style wording: no "along with", no "pays the exact price with"; short sentences, at most two facts each; possessives instead of pronouns.
- No franchise names anywhere (Aunt May); vary relatives and jobs; drop twin options ("folding laundry" and "folding the towels").
- Every distractor stays in the same money format as the key: no single choice over a dollar in a cents grid (fill.js switches the whole grid to dollars).
- Feedback for a direction-dependent slip must cover both directions ("two things do not always cost more than one").
- Each model's shape must differ from every other cell's, not only within its cell: the same template in two cells at two difficulties is a duplicate.

## Rules learned from the Grade 2 add/subtract review (2026-10-03)
Sai's first pass over the 77 Grade 2 models rejected 7. Each line is a reading check to run on 40 fills before a model goes to review.
- **Object variety.** Count the different objects in 40 fills; a story should show many. A template verb fixes the object ("{name1} and {name2} read books" plus a screens-media slot gave books and pages every time: "every single one of this is read books on Saturday. need variety"). Take the verb from the object, or write a verb that fits every object the slot can draw.
- **Pictures carry the story's names.** Label each bar with the person it stands for, not A and B, the way textbooks draw a comparison. Then the prompt needs no sentence explaining the labels ("Bar A shows Mia's stickers…").
- **A picture is either used or complete.** A disc mat showing only the first number above "What is 114 + 807?" asks the kid to ignore it ("What are kids supposed to do with this kind of problem?"). Either the kid works on the picture (a tray or mat they tap, whose state is the answer) or the picture shows everything the question needs.
- **The key must change.** A choice model whose key is the same on every fill ("Trade 1 ten for 10 ones", 6 of 6) is not a question. Count the different keys in 40 fills; when a row is about deciding (trade or no trade), about half the fills go each way.
- **Every distractor is a real mistake.** "Trade 1 ten for 1 one" is not something a kid does; cut a distractor no kid would pick, even if the mistake tag sounds right.
- **Say the number when reading it is not the skill.** An item about the next step (which trade, how much more) states the number on the mat or tray in words, so the question does not hinge on a count the kid was never asked to make.
- **Feedback fits every fill.** When the key can be either of two answers (who spends more), each wrong-answer line must make sense for both; build it from a slot that changes with the key.
- **Look before sending.** Screenshot every picture or widget model at phone width (`/mnt/project-files/item-skill/tools/shots.mjs`) and read it as the kid sees it; the mat and bar problems above show only on screen.

## Picture-first and bare items (added 2026-09-28)

Textbooks and state tests mix story problems with items that have no story at all: a tray of coins under "Count the coins. How many cents?", "How many nickels make a dime?", "Which coin is worth 10¢?", "The price is 38¢ and you pay 50¢. How much change?", "Set A is 3 dimes. Set B is 1 quarter. Which sign compares Set A to Set B?". About a third of a cell can take this shape. The Grade 2 money pilot's twelve are the `money-g2-bare*` models.

- **The picture carries the numbers.** A tray item uses the coinTray widget in count mode (`display: {coins, coinMode: "'count'", counting: {kind: "sum", parts: "coinValues(coins)"}}`, `operation: {op: "count"}`, an int answer) and keeps its text to one or two short sentences.
- **Fixed text is fine.** An item's identity is its prompt text plus the pictured coins: `validateBank` and the harness key duplicates on both, so a tray item may repeat its sentence across fills.
- **Declare the wordings a bare drill can take.** A model whose text can only take a few forms ("Which coin is worth 10¢?" has four values and three openers) sets `promptVariants: N`, the number of distinct prompts it can produce; the harness then holds it to half of that instead of twenty distinct prompts in forty seeds. Vary the phrasing with an int slot and a text expr, and keep money slots in the template (`You have {haveMoney}. {ask}`), since a money value pasted inside a text expr loses its ¢ sign.
- **A bare equation is not a question.** "25¢ + 10¢ = ?" fails the one-question-mark rule; write "What is 25¢ + 10¢?".
- **Match the question word to the answer.** "Which" needs choices (choice, multiSelect or symbolSelect); "How many" needs an int; "How much money" a money amount.
- **Fixed-text items need a fixed example.** `example: "auto"` skips fills that share the prompt, so a tray item gives `example: {problem, steps, answer}` of its own.
- **Text answers leak through coin names.** When the key is a coin set or a coin name, no nudge, step or feedback line may contain any word or digit of it, so write values in words ("ten cents"), name no coins in those lines, and keep counts out of them. The solution and example may state the key.
- **Comparing two sets** uses `format: "symbol"`, `widget: "symbolSelect"` and a text answer of `<`, `>` or `=`. Leave `operation.a`/`b` out (the sentence carries the sets, and payload numbers would have to appear in the prompt) and never write the = sign in a hint line ("the equal sign"), or a fill whose key is = fails the hint-leak check.
- **Where the forms sit.** Easy: one-kind tray, "which coin is worth", "how many make a", cents to a dollar. Moderate: mixed tray, terse change, which set equals a coin, "how much money is 2 dimes and 1 nickel". Hard: a 7-8 coin tray, coins in dollars, compare two sets with a sign.

## Grades 3 to 5 (added 2026-09-28)

Sai's K-5 money framework puts purchase-and-change, multi-step budgets, price lists, fractions of a dollar, unit prices, constraint puzzles and error analysis in grades 3 to 5. The forty-five models in `src/itemModels/money/grade{3,4,5}.json` cover them, fifteen per grade; the harness accepts any grade 2 to 5 (the id starts `money-g<grade>-`, and a grade above 2 names at least one CCSS code).

- **Level range.** A model above grade 2 sets `levelRange` itself: grade 3 `[6, 7]`, grade 4 `[7, 9]`, grade 5 `[9, 10]` (the default bands are 2-3 → levels 4-6 and 4-5 → levels 7-10). Objects come from band `"2-3"` in grade 3 and `"4-5"` above.
- **Dollars notation.** `moneyStyle: "dollars"` writes every amount as `$0.45` whatever the kid's state rule, for the decimal work of grades 4 and 5 (a grade 3 change item keeps `"auto"`, so 35¢ stays 35¢). Text choices that carry an amount build it with `money(cents)` ("45¢" or "$1.45") or `dollars(cents)` ("$0.45"): `'No, ' + money(diff) + ' short'`.
- **Price lists.** `display.priceList: {title: "'Price list'", rows: [{item: "object1.singular", cents: "price1"}, ...]}` renders a small table under the prompt; three or four rows, one of them a row nobody buys. Say "Use the price list." in the prompt and keep the bought things' prices out of the text.
- **Coin puzzles with a count** ("6 coins worth 51¢") use the build tray with `display.requiredCount: "n"`; Check stays off until exactly that many coins are picked. Draw the intended coins with a coins slot, add two or three extras, and constrain `len(fewestCoins(total)) < n` so the fewest-coins answer never fits. Phrase it as a question ("How can you make 51¢ with exactly 6 coins? Tap the coins to show it."): the question mark is what tells the structure check the stated amount is the target, not the key.
- **Packs.** A money slot with `pack: true` prices the pack the object is sold in (within 30% of the context table's pack price) and `object.pack.size` is the count, so "A pack of 6 muffins costs $5.64" stays realistic and passes the price check, which reads a pack sentence against the pack price. Constrain `pack % n == 0` for a whole-cent unit price. A single price in the same item goes in its own sentence without the word pack.
- **Whole cents only.** A distractor that comes out fractional (`product / 10` when the product is not a multiple of ten cents) is dropped as a collision; constrain the slots so every value is an integer.
- **Error analysis** states the slip and asks for the correct answer ("{name} forgot to regroup. What is the correct answer?"), or names the wrong answer and asks which slip produced it with fixed text choices built from a picked mistake index (`m == 0 ? t0 : m == 1 ? t1 : t2`). Keep the wrong total in a sentence without the object, or the price check reads it as the object's price.
- **Budget verdicts** ("Does {name} have enough money?") are text choices such as "Yes, $1.55 is left over" / "No, $1.55 short"; the hint lines then avoid every digit of the amount, so they speak in words ("the difference tells how much is extra or how much is missing").
- **`tens(c)` is everything above the ones** (tens(345) = 340), so use `c % 100` for a cents part and `c % 10` for the ones digit.
- **Sentence starts.** No slot capitalizes, so never open a sentence with `{object_plural}` or a bare `{n}`; write "Each {object} costs …" or a words slot ("Two friends").

## Models written for a blueprint row (added 2026-10-02)

From the Grade 2 add and subtract lists on, every model is written for one approved blueprint row (`src/blueprints/g2AddsubWp.json`, `src/blueprints/g2AddsubCalc.json`; the rows are also `blueprint_rows` in the database). The row is the contract and the model points back at it:

- **`blueprintId`** is the row's `id` (`"wp-g2-add-to-result"`). `validateModel` then holds the model to the row: the row must be an `item` row of the same grade and topic (`modeId` is the row's `mode_id`), and the model must use the row's `subskill` and `family`.
- **`structureType`** is copied from the row's `spec.structureType`, never invented, so every item a model fills is tagged the way its row is (figure contracts and coverage read it).
- **`levelRange`** is required and sits inside the row's `spec.levelRange` (Grade 2 is `[4, 6]`; a model may narrow it).
- **`standards`** are the row's codes in every framework, exactly: the same lists, no code added or dropped. A row with no Common Core code (a state-only line, `ccss: []`) gives a model with `ccss: []`.
- The items it fills carry `blueprintId` (`item_bank.blueprint_id`), and `npm run models:load` writes it to `item_models.blueprint_id`, a foreign key: the rows are loaded before the models.

One model per variant the row names (`spec.variants`), at the tier the variant gives in brackets, with the variant's mistakes (`spec.variantMistakes`) where it has its own.

**The harness reads the row too.** For a model with a `blueprintId` it takes the topic and grade from the row, asks for the row's codes (validateModel already holds them; a row with only a state code is fine), expects the id `<row id>` or `<row id>-<variant word>` (a fix adds `-2`), and runs the coin checks only on money models. The figure contract reads the row as well: a model for a disc-mat, bar-model or number-line row (`src/itemBank/figureContracts.js`) fails `missingRequiredFigure` until its `display` shows that picture. A model with no row takes its rules from flags: `--mode <topic>`, `--code <code>` (any framework) and `--prefix <id start>`; with none, the money pilot's rules apply. The disc mat counts toward "distinct prompts", as the coins do, so a model whose words never change but whose mat does is not read as one prompt.
