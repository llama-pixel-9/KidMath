# Spec Part C3 — Measurement, Geometry, Data, Time, Money

Status: Draft for human review
Scope: `measurement`, `money`, `time`, `areaPerimeter`, `angles`, `linesShapes`, `dataGraphs`
Companion to: `problem-variety-expansion-plan.md` (three axes: structure / format / representation),
`word-problem-authoring-guide.md` (style contract), `research-k4-problem-types.md` (evidence base)

This document is the **authoring spec an LLM item-bank pipeline generates from**. Every row is meant to be
readable by a human reviewer as if it were on screen.

---

## ⚠️ Evidence status — read before using this spec

`research-k4-problem-types.md` §8 states explicitly:

> **[GAP] Measurement, geometry, data, time, money problem types.** Covered only as cluster designations
> (§5.3) and incidental examples. **No per-domain problem-type grid was retrieved for any of these** —
> despite KidMath having recently added modes for all of them.

There is **no Table 1 / Table 2 analogue** for any of the seven modes in this document. Everything here is
**reasoned, not sourced**. Concretely:

| Marker | Meaning |
|---|---|
| **[C]** | **Constructed.** The variety, its difficulty placement, and its example are the author's reasoning. No source says this is a problem type. **This is the default and covers the large majority of rows.** |
| **[S]** | The *question format* (not the domain taxonomy) is traceable to a source retrieved in the research doc — Open Middle, NRICH Always/Sometimes/Never, Would You Rather, Estimation 180, Webb DOK illustrations, IM routines. The row is cited inline. |

**No [S] marker in this document should be read as "standards-grounded problem type."** A DOK illustration
that happens to be about perimeter is evidence that *Webb used a perimeter example*, not that a perimeter
problem-type taxonomy exists. Level-band assignments are **all [C]** even on [S] rows — no source tiers
these by difficulty the way the OA Progressions tier the additive subtypes.

If this spec is used to justify a standards claim in product copy, that claim is unsupported. Before
building past the top two or three modes, do the focused per-domain research the expansion plan budgets
for (Geometric Measurement Progressions, Measurement & Data Progressions, K–6 Geometry Progression).

### Widget inventory (constraint on every row)

Existing `answerType` values the renderer already dispatches (`MathExplorer.jsx` ~L1903–2000):
`numberPad`, `fillBlank`, `decimal`, `fraction`, `barGraph`, `angle`, `clock`, `fractionSet`,
`placeValueDiscs`, `barModel`, `numberBond`, `symbolSelect`, and a default multiple-choice renderer
(referred to below as `choice`).

Any row needing something else is flagged **[NEW WIDGET]** with a cost note. Summary of new widgets this
spec would require, cheapest first:

| Widget | Used by | Cost estimate | Avoidable? |
|---|---|---|---|
| `multiSelect` (choice, ≥1 correct) | all 7 | XS — variant of `choice` | no cheap substitute |
| `shapeFigure` (render a named polygon / line figure as SVG from a spec) | linesShapes, angles, areaPerimeter | M — needs a shape-drawing primitive | **blocking for linesShapes**; without it the mode stays verbal-only |
| `gridShade` (tap unit squares on a grid) | areaPerimeter | M | can be read-only (render grid, answer via `numberPad`) at S cost |
| `pictograph` (rows of symbols + a key, half-symbols) | dataGraphs | M | **blocking** for the key-of-2/5 varieties |
| `linePlot` (X-stacks over a number line) | dataGraphs, measurement | M | no |
| `tallyChart` | dataGraphs | S | could be an image-free text render at XS |
| `rulerRead` (object against a ruler, start offset) | measurement | M | no |
| `coinTray` (coin images, optional tap-to-add) | money | M | read-only render at S cost |
| `rangeEstimate` (too low / too high / my estimate) | measurement, dataGraphs | M | **the Estimation 180 format does not survive reduction to a single answer**; degrade to `choice` bands only as a stopgap |
| `sortBins` (drag shapes into 2 bins) | linesShapes | L | substitutable by `multiSelect` ("select all that…") at XS |

**Recommendation:** land `multiSelect` + `shapeFigure` + `pictograph` first. Those three unlock roughly
half the new varieties across the seven modes.

---

## Sourcing model

**Decided: static authored items. No templating.** Every `bank` item is individually authored and
human-reviewed, with its numbers baked in — the existing item format:

```
question: { a: 9, b: 7, answer: 16,
            display: { promptText: "Mina has 9 shells and finds 7 more. How many now?" } }
```

Parameterized templates (one authored stem with slotted numbers) were **considered and rejected**. Nothing
in this spec should be read as proposing them, and the Source column below never means "template."

**Sourcing rule applied to every row's Source column:**

| Row looks like | Source |
|---|---|
| Family = `application` | `bank` — authored, reviewed |
| Family = `conceptual` **and** the item carries prose / `verbalContext` / a written question stem | `bank` |
| Family = `conceptual`, purely symbolic or visual, no authored wording (a bare clock face to read, a rendered angle to measure, a shape figure to count sides on) | `generator` |
| Family = `procedural` **and** symbolic (a unit conversion with no story has no prose to review; curating these wastes review budget) | `generator` |
| Format transform — true/false, odd-one-out, error analysis, estimation built from an existing item | `generator (from bank item)` — inherits reviewed prose |

Tie-break used below: it is the *presence of authored wording*, not the family label, that decides. A
`procedural` row whose representation is `verbalContext` (e.g. `money` row 1) is `bank`; a `conceptual` row
that is a bare figure is `generator`.

**Visual-mode caveat — these seven modes skew generator, and that is correct.** They are heavily visual:
clock faces, angle figures, shape figures, bar graphs, pictographs. A rendered figure carrying a short
stock question stem ("What time is it?", "How many degrees is this angle?", "How many students chose
Birds?") is `generator` — the figure is generated and there is no prose to review. Only items carrying a
real authored story or context become `bank`. Expect a much lower bank share here than in the arithmetic
modes; that is the rule working, not a gap.

**Volume consequence.** Because each authored item *is* one item — the numbers are fixed, so an item cannot
be re-rolled into a fresh one — avoiding repeats needs far more items per cell than the old 8-per-cell
floor assumed. In the engine, `SESSION_SIZE = 15` and `RECENT_BANK_WINDOW = 8` (`src/mathEngine.js`) mean an
adaptive session that keeps targeting one cell can **exhaust a small cell within a single session**. The
working floor used in the authoring-load lines below is **40 items per `bank` variety**.

---

## measurement — Measuring Wings

**Today:** 1 shape (`amount × factor` conversion), 2 word-problem templates (one symbolic string, one
"A rope is N m long"), 2 subskills (`lengthConvert`, `massVolumeConvert`). 5 unit pairs, amounts 2–9 (or
2–20 at L7+). Total item universe ≈ **5 unit pairs × 19 amounts × 2 prompt strings ≈ 190 items, but only
2 distinct prompt signatures** — which is the number that matters. Estimation and benchmark reasoning:
**zero items**.

**Target:** 16 varieties.

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | `convertDown` | Larger unit → smaller unit, whole number | "6 m = ? cm" | 4-6 | symbolic / `numberPad` | procedural | generator [C] |
| 2 | `convertUp` | Smaller unit → larger unit (the direction we never ask) | "4000 mL = ? L" | 7-10 | symbolic / `numberPad` | procedural | generator [C] |
| 3 | `convertMissingAmount` | Unknown on the left | "? kg = 5000 g" | 7-10 | symbolic / `numberPad` | conceptual | generator [C] |
| 4 | `convertMissingUnit` | Amounts fixed, the *unit* is unknown | "8 m = 800 ___ . Choose: mm / cm / km" | 4-6 | symbolic / `choice` | conceptual | generator [C] |
| 5 | `compareMeasures` | Two measures in different units, insert `<` `>` `=` | "2 m ○ 180 cm" | 4-6 | symbolic / `symbolSelect` | conceptual | generator [C] |
| 6 | `benchmarkPick` | Which real object is about this long/heavy? | "Which is about 1 metre? A door's width / a paperclip / a school bus / a pencil tip" | 1-3 | verbalContext / `choice` | conceptual | bank [C] |
| 7 | `unitReasonable` | Right unit for a real object | "A classroom door is about 2 ___ tall. Choose: cm / m / km / mm" | 1-3 | verbalContext / `choice` | conceptual | bank [C] |
| 8 | `estimateRange` | Too low / too high / my estimate, then reveal | "A pencil is shown next to a 30 cm ruler. Give a length that is too low, one that is too high, and your best estimate." | 4-6 | visual / `rangeEstimate` **[NEW WIDGET]** | conceptual | generator [S] — format per Estimation 180, research §4.12 |
| 9 | `estimateBand` | Cheap `choice` degradation of #8 | "About how tall is a kitchen table? 8 cm / 80 cm / 800 cm" | 1-3 | verbalContext / `choice` | conceptual | bank [C] |
| 10 | `rulerRead` | Read a length off a ruler, **object not starting at 0** | "The crayon starts at the 2 cm mark and ends at the 9 cm mark. How long is it?" | 4-6 | visual / `rulerRead` **[NEW WIDGET]** | conceptual | generator [C] |
| 11 | `iterateNonstandard` | Measure by repeating a unit; gaps/overlaps shown | "Nia lines up 6 paperclips end to end along a ribbon with no gaps. Each clip is 3 cm. How long is the ribbon?" | 1-3 | visual / `numberPad` | conceptual | bank [C] |
| 12 | `orderMeasures` | Put mixed-unit measures in order | "Order shortest to longest: 90 cm, 1 m, 850 mm, 1200 mm" | 7-10 | symbolic / `multiSelect`-ordering **[NEW WIDGET]** | conceptual | generator [C] |
| 13 | `addMixedUnits` | Add or subtract across units | "Theo's rope is 2 m 40 cm. He cuts off 75 cm. How many cm are left?" | 7-10 | verbalContext / `numberPad` | application | bank [C] |
| 14 | `twoStepConvert` | Convert, then operate | "A tank holds 3 L. Ava pours out 750 mL twice. How many mL are left?" | 7-10 | verbalContext / `numberPad` | application | bank [C] |
| 15 | `errorAnalysisConvert` | Named student, named misconception | "Luca says 5 cm = 500 mm because 'you add two zeros.' Is Luca right? What is 5 cm in mm?" | 7-10 | verbalContext / `choice` + `numberPad` | conceptual | generator (from bank item) [C] (format per research §4.10) |
| 16 | `wouldYouRatherLength` | Two options, choose and justify with math | "Would you rather have 3 ribbons that are 9 cm each, or 5 ribbons that are 6 cm each?" | 4-6 | verbalContext / `choice` | application | bank [S] — verbatim item, research §4.14 |

**Structural difficulty ladder (not numeric):** band 1-3 = benchmarks and non-standard iteration, no
conversion at all. Band 4-6 = single conversion, larger→smaller only, plus reading instruments. Band 7-10 =
reverse direction, unknown-on-the-left, mixed units, and two-step. Note this is a *reordering* of the mode:
today level 1 already asks metric conversion, which is a Grade 3-4 skill being served to a 6-year-old.

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor it generates | Example |
|---|---|---|---|
| `wrongFactor` (exists, unimplemented) | Uses 10 / 100 / 1000 interchangeably | `amount × 10` and `amount × 100` alongside the true `amount × 1000` | "3 kg = ? g" → correct 3000, distractors 30, 300 |
| `unitDirection` (exists, unimplemented) | Divides when they should multiply | `amount / factor` (offered only when whole) | "5 m = ? cm" → correct 500, distractor 0.05 or 5 ÷ 100 rendered as 0 |
| `placeValueSlip` (exists, unimplemented) | Right operation, one zero off | `answer × 10` and `answer / 10` | "4 L = ? mL" → correct 4000, distractors 400, 40000 |
| `unitLabelIgnored` **[new]** | Compares the numbers and ignores the units | Picks the numerically larger measure | "2 m ○ 180 cm" → child picks `<` because 2 < 180 |
| `benchmarkScaleError` **[new]** | Has no body-scale reference | Off by one metric step in the reasonable-unit item | "A door is about 2 ___" → child picks `cm` |

### Notes

- **Reviewer decision:** does `measurement` keep metric-only, or add customary units (inch/foot/yard,
  cup/pint/quart)? The mode's `standardRefs` say `4.MD`, which covers both. Customary roughly doubles the
  unit-pair table but introduces non-decimal factors (12, 3, 16) that are genuinely harder — a real
  structural difficulty axis, not a numeric one. **Recommend metric-only for bands 1-6, customary as a
  band 7-10 unlock.**
- **Reviewer decision:** rows 8 and 10 need new widgets. If neither ships, estimation in this mode is
  limited to row 9 (`choice` bands), which loses the too-low/too-high range mechanic that the research
  (§4.12) identifies as the reason the routine lowers the entry floor. Flagging this as a real pedagogical
  loss, not a cosmetic one.
- Row 8's "reveal" step has no analogue in the current answer flow — it is a *reveal-then-reflect* item,
  not a right/wrong item. Scoring it is an open question. Suggest: score any estimate within ±25% as
  correct, and always show the true value.
- **Not standards-grounded:** all of it. The band assignments in particular are pure judgment.
- Prompt length: every example above is under 220 chars and 1-2 sentences, per the authoring guide. Names
  used: Nia, Theo, Ava, Luca — rotating per the guide.

**Authoring load:** 7 varieties are `bank` → at x40 items/variety ≈ **280 authored items**; 9 varieties are
`generator` (1 of them `generator (from bank item)`).

---

## money — Money Magpie

**Today:** 2 shapes (coin count, make change), 4 prompt strings (2 per subskill), 2 subskills
(`countCoins`, `makeChange`). Coin counting is quarters/dimes/pennies only — **no nickels**. Total item
universe ≈ **4 distinct prompt signatures**; numeric variety is wide but structurally it is two questions.

**Target:** 15 varieties.

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | `countCoinsText` | Coin counts stated in words | "Mina has 2 quarters, 3 dimes, and 4 pennies. How many cents in all?" | 1-3 | verbalContext / `numberPad` | procedural | bank [C] |
| 2 | `countCoinsVisual` | Coins shown as images, unsorted | *[image: 3 dimes, 1 quarter, 2 nickels scattered]* "How many cents are shown?" | 1-3 | visual / `coinTray` **[NEW WIDGET]** | conceptual | generator [C] |
| 3 | `coinValueRecall` | Single coin value | "How many cents is one nickel worth?" | 1-3 | verbalContext / `numberPad` | conceptual | bank [C] |
| 4 | `equalValueSwap` | Trade equivalence | "How many nickels have the same value as 3 dimes?" | 4-6 | symbolic / `numberPad` | conceptual | generator [C] |
| 5 | `makeAmountFewest` | Build a total with the fewest coins | "What is the fewest number of coins that make 40¢?" (answer 3: quarter, dime, nickel) | 4-6 | symbolic / `numberPad` | conceptual | generator [C] |
| 6 | `makeAmountFindAll` | Two different ways, both valid | "Show 30¢ two different ways using quarters, dimes, and nickels." | 4-6 | manipulative / `coinTray` **[NEW WIDGET]** | conceptual | generator [C] (find-all format per research §4.2) |
| 7 | `makeChange` | Classic change | "A sticker costs 65¢. Sam pays with $1. How many cents change?" | 4-6 | verbalContext / `numberPad` | application | bank [C] |
| 8 | `changePriceUnknown` | **Start unknown** — reads as subtraction, solved by subtraction from the payment | "Ava paid with 100¢ and got 35¢ change. How many cents did the eraser cost?" | 7-10 | verbalContext / `numberPad` | application | bank [C] |
| 9 | `changePaidUnknown` | The genuinely hard one | "A book costs 45¢. Theo got 55¢ change. How many cents did Theo hand over?" | 7-10 | verbalContext / `numberPad` | application | bank [C] |
| 10 | `compareAmounts` | Insert `<` `>` `=` between two coin sets | "3 dimes ○ 1 quarter and 1 nickel" | 4-6 | symbolic / `symbolSelect` | conceptual | generator [C] |
| 11 | `wouldYouRatherCoins` | Two options, justify | "Would you rather have 2 dimes or 5 nickels?" (equal — that *is* the point) | 1-3 | verbalContext / `choice` | conceptual | bank [S] format, [C] item (research §4.14) |
| 12 | `canYouAfford` | Yes/no + reasoning, no exact arithmetic needed | "Nia has 3 quarters. A pen costs 80¢. Can she buy it?" | 4-6 | verbalContext / `choice` | application | bank [C] |
| 13 | `twoItemMultiStep` | Total, then change | "Luca buys a 35¢ apple and a 40¢ juice. He pays 100¢. How many cents change?" | 7-10 | verbalContext / `numberPad` | application | bank [C] |
| 14 | `dollarNotation` | Translate between `$` and `¢` | "Write $1.45 in cents." | 7-10 | symbolic / `numberPad` | procedural | generator [C] |
| 15 | `openMiddleCoins` | Digit/coin-constrained construction, optimize objective | "Using each of the coins quarter, dime, nickel, penny at most once, get as close as possible to 50¢." (answer 40¢, using Q+D+N) | 7-10 | manipulative / `coinTray` **[NEW WIDGET]** | conceptual | generator [S] format (Open Middle, research §4.8), [C] item |
| 16 | `errorAnalysisCoins` | Named misconception | "Sam counted 2 dimes and 3 pennies as 5¢ because there are 5 coins. What did Sam do wrong? What is the real total?" | 4-6 | verbalContext / `numberPad` | conceptual | generator (from bank item) [C] |

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor it generates | Example |
|---|---|---|---|
| `coinValueSlip` (exists, unimplemented) | Substitutes one coin's value for another (nickel↔dime is the classic — the dime is *smaller*) | Recompute the total with nickel=10, dime=5 | "2 dimes, 3 nickels" → correct 35, distractor 25 |
| `changeDirection` (exists, unimplemented) | Adds instead of subtracting, or subtracts the wrong way round | `price + paid` and `price − paid` | "65¢ item, pays 100¢" → correct 35, distractors 165, and (for row 8) 65 |
| `offByOne` (exists, unimplemented) | Miscounts one coin in a visual set | `answer ± smallestCoinValue` | 3 dimes shown → distractor 20 or 40 |
| `countCoinsNotValue` **[new]** | Counts the *number* of coins, not their value | Emit the coin count as a distractor | "2 quarters, 1 dime" → correct 60, distractor 3 |
| `sizeMeansValue` **[new]** | Believes the physically bigger coin is worth more | On `compareAmounts`, picks the set with the bigger/more coins | "3 dimes ○ 1 quarter + 1 nickel" → both 30¢; child picks `>` |

### Notes

- **Nickels are missing from the current generator entirely.** Adding them is a one-line fix and is a
  prerequisite for rows 4, 5, 6, 11, 15. Do this regardless of whether the rest ships.
- **Reviewer decision:** US coins only, or is this app expected to localise? Every row above is US-specific.
  A UK/EU/INR coin set is a data change, not a code change, if the coin table is extracted — but the
  *fewest-coins* and *Open Middle* rows have different answers per currency and would need per-currency
  validation.
- **Reviewer decision:** does the app want dollar/decimal notation (row 14) at all, given a separate
  `decimals` mode exists? Risk of overlap.
- Rows 8 and 9 are the money analogue of Start Unknown from CCSS Table 1 — that mapping is **[C], my
  inference**. Table 1 is about additive situations generally; nobody has published a money-specific grid.
- **Not standards-grounded:** all of it, including the claim that row 9 is harder than row 8.

**Authoring load:** 8 varieties are `bank` → at x40 items/variety ≈ **320 authored items**; 8 varieties are
`generator` (1 of them `generator (from bank item)`).

---

## time — Clock Stop!

**Today:** 2 shapes (analog clock read to 5 minutes, elapsed-time-within-the-hour word problem), 2 prompt
strings per subskill, 2 subskills. **`level` affects nothing** — a level-1 learner and a level-10 learner
get identical items. Clock reads are always minutes-past (never "what time is it"), and elapsed time never
crosses an hour boundary. Total item universe ≈ **12 hours × 12 minutes = 144 clock items with 1 prompt
signature**, plus ~ 500 elapsed items with 2 signatures.

**Target:** 16 varieties.

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | `readClockHour` | Analog clock, o'clock only | *[clock showing 4:00]* "What time is it?" | 1-3 | visual / `clock` | conceptual | generator [C] |
| 2 | `readClockHalf` | Half past | *[clock showing 7:30]* "What time is it?" | 1-3 | visual / `clock` | conceptual | generator [C] |
| 3 | `readClockQuarter` | Quarter past / quarter to | *[clock showing 2:45]* "What time is it?" | 4-6 | visual / `clock` | conceptual | generator [C] |
| 4 | `readClockFive` | To the nearest 5 minutes | *[clock showing 9:25]* "What time is it?" | 4-6 | visual / `clock` | conceptual | generator [C] |
| 5 | `readClockMinute` | To the minute — the real Grade 3 skill | *[clock showing 6:37]* "What time is it?" | 7-10 | visual / `clock` | conceptual | generator [C] |
| 6 | `setClock` | Reverse: given a time, position the hands | "Set the clock to 3:45." | 4-6 | manipulative / `clock` (as input) | conceptual | generator [C] |
| 7 | `matchAnalogWords` | Words ↔ digital ↔ analog | "Which time is 'quarter past seven'? 7:15 / 7:45 / 6:45 / 7:25" | 4-6 | symbolic / `choice` | conceptual | generator [C] |
| 8 | `elapsedWithinHour` | Duration unknown, same hour | "Recess starts at 10:15 and ends at 10:50. How many minutes long is recess?" | 4-6 | verbalContext / `numberPad` | application | bank [C] |
| 9 | `elapsedAcrossHour` | Duration unknown, crosses the hour — structurally harder, not numerically | "A film starts at 2:40 and ends at 3:25. How many minutes long is it?" | 7-10 | verbalContext / `numberPad` | application | bank [C] |
| 10 | `elapsedEndUnknown` | Start + duration → end | "Swim class starts at 4:20 and lasts 50 minutes. What time does it end?" | 7-10 | verbalContext / `clock` or `fillBlank` | application | bank [C] |
| 11 | `elapsedStartUnknown` | End + duration → start. **Reads forward, solved backward** | "Band practice ends at 5:10 after 45 minutes. What time did it start?" | 7-10 | verbalContext / `fillBlank` | application | bank [C] |
| 12 | `durationBenchmark` | Is this seconds, minutes, or hours? | "About how long does it take to brush your teeth? 2 seconds / 2 minutes / 2 hours" | 1-3 | verbalContext / `choice` | conceptual | bank [C] |
| 13 | `amPmReasoning` | Time of day sense | "Mina eats breakfast at 7:30. Is that a.m. or p.m.?" | 4-6 | verbalContext / `choice` | conceptual | bank [C] |
| 14 | `orderEvents` | Sequence times | "Put in order, earliest first: 11:45 a.m., 8:20 a.m., 1:05 p.m." | 4-6 | symbolic / `multiSelect`-ordering **[NEW WIDGET]** | conceptual | generator [C] |
| 15 | `calendarDuration` | Days / weeks / months | "Camp runs from June 3 to June 17. How many weeks is that?" | 7-10 | verbalContext / `numberPad` | application | bank [C] |
| 16 | `errorAnalysisElapsed` | The single most common time error | "Theo says a show from 2:40 to 3:25 lasts 85 minutes, because 325 − 240 = 85. Is Theo right? How long is it really?" | 7-10 | verbalContext / `numberPad` | conceptual | generator (from bank item) [C] |
| 17 | `openMiddleTime` | Digit-constrained construction | "Using the digits 0 to 9 at most one time each, write three different times on clocks that all fall between 12 noon and 7 p.m." | 7-10 | symbolic / `multiSelect` **[NEW WIDGET]** | conceptual | generator [S] — verbatim Open Middle G2 "Time Twister", research §4.8 |

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor it generates | Example |
|---|---|---|---|
| `hourMinuteSwap` (exists, unimplemented) | Reads the minute hand as the hour hand | Emit `minute:hour` as the answer | Clock at 3:20 → correct 3:20, distractor 4:15 (the classic "the short hand is past 3 so it's 4") |
| `clockDirection` (exists, unimplemented) | Counts minutes counter-clockwise, or reads "quarter to" as "quarter past" | `60 − minute` | Clock at 2:45 → distractor 2:15 |
| `offByFive` (exists, unimplemented) | Miscounts one 5-minute tick | `minute ± 5` | Clock at 9:25 → distractors 9:20, 9:30 |
| `decimalTimeArithmetic` **[new]** | Treats clock times as decimals and subtracts base-10 | `(endH·100+endM) − (startH·100+startM)` | 2:40 → 3:25 = 85 min instead of 45. **This is the single highest-yield distractor in the mode** and directly powers row 16 |
| `hourHandNotProportional` **[new]** | Expects the hour hand to sit exactly on the numeral at all times | On `setClock`, places the hour hand on the hour even at :45 | Setting 3:45 with the hour hand pointing straight at 3 |

### Notes

- **The single biggest fix here is that `level` is currently ignored.** Rows 1–5 are a real difficulty
  ladder (hour → half → quarter → five → minute) and they cost nothing but a clock-minute constraint per
  band. Ship this even if nothing else in this section ships.
- **Reviewer decision:** the `clock` widget currently answers "minutes past the hour" as a number. Rows 1–5
  need it to answer a *time* (hour + minute). Is that a widget change or a new answer shape? If it is
  expensive, rows 1–5 can degrade to `choice` with four candidate times — which is worse pedagogically
  (elimination becomes viable) but is free.
- **Reviewer decision:** row 6 (`setClock`) requires the clock widget to accept *input*, i.e. draggable
  hands. Worth checking whether the existing widget already does this — if so, row 6 is nearly free and is
  one of the highest-value conceptual items in the mode.
- Row 17 is the only verbatim-sourced item in this mode and is genuinely hard; consider band 7-10 only, and
  human-review its answers rather than trusting the pipeline.
- **Not standards-grounded:** the hour→half→quarter→five→minute ladder is conventional and appears in every
  curriculum, but **no source in our research states it**. Treat it as [C].

**Authoring load:** 7 varieties are `bank` → at x40 items/variety ≈ **280 authored items**; 10 varieties are
`generator` (1 of them `generator (from bank item)`). Rows 1–6 — the whole clock-reading ladder — are
generated figures with stock stems and cost no authoring at all.

---

## areaPerimeter — Area & Perimeter!

**Today:** 1 shape (rectangle `w × h` from randInt), 4 prompt strings, 2 subskills (`area`, `perimeter`).
Difficulty is purely `hi = 6 / 12 / 20`. Total item universe ≈ **4 distinct prompt signatures**. There is
no grid, no composite shape, no missing side, and no reason for the learner to ever decide *which* measure
a situation calls for.

**Target:** 15 varieties.

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | `areaFromGrid` | Count unit squares — the concrete entry point | *[figure: 4×3 grid of unit squares]* "How many unit squares cover this rectangle?" | 1-3 | visual / `numberPad` | conceptual | generator [C] |
| 2 | `perimeterFromGrid` | Count unit lengths around the edge | *[figure: 4×3 grid]* "How many units is the distance all the way around?" | 1-3 | visual / `numberPad` | conceptual | generator [C] |
| 3 | `areaFromDims` | Formula application | "A rectangle is 7 cm by 5 cm. What is its area in square centimetres?" | 4-6 | symbolic / `numberPad` | procedural | generator [C] |
| 4 | `perimeterFromDims` | Formula application | "A rectangle is 7 cm by 5 cm. What is its perimeter in centimetres?" | 4-6 | symbolic / `numberPad` | procedural | generator [C] |
| 5 | `missingSideFromArea` | Unknown moves into the figure | "A rectangle has an area of 48 sq cm. One side is 6 cm. How long is the other side?" | 7-10 | visual / `numberPad` | conceptual | generator [C] |
| 6 | `missingSideFromPerimeter` | Harder — requires halving first | "A rectangle has a perimeter of 26 cm. One side is 4 cm. How long is the other side?" | 7-10 | visual / `numberPad` | conceptual | generator [C] |
| 7 | `whichMeasureNeeded` | Decide area vs perimeter from the *situation*, before computing | "Ava wants to put a fence around her 8 m by 5 m garden. Does she need the area or the perimeter?" | 4-6 | verbalContext / `choice` | conceptual | bank [C] |
| 8 | `unitLabelSelect` | Square units vs linear units | "The area of a 6 m by 4 m rug is 24 ___ . Choose: m / sq m / cm / sq cm" | 4-6 | symbolic / `choice` | conceptual | generator [C] |
| 9 | `sameAreaDiffPerimeter` | Find-all + compare | "Find three different rectangles with whole-number sides and an area of 12 sq cm. Which has the smallest perimeter?" (1×12 P=26, 2×6 P=16, 3×4 P=14 → 3×4) | 7-10 | visual / `multiSelect` **[NEW WIDGET]** | conceptual | bank [S] format — Webb DOK 3 illustration, research §5.4; [C] numbers |
| 10 | `samePerimeterDiffArea` | The classic reasoning task, verbatim from the DOK research | "Find three different rectangles with a perimeter of 12. Which has the biggest area? Why do you think that happens?" (3×3 A=9) | 7-10 | visual / `multiSelect` **[NEW WIDGET]** | conceptual | bank [S] — verbatim, research §5.4; note the source uses it as a **DOK illustration**, not a taxonomy |
| 11 | `compositeArea` | L-shape; decompose into two rectangles | *[figure: L-shape, 8 by 6 with a 3 by 2 notch removed]* "What is the area of this shape in square units?" (42) | 7-10 | visual / `shapeFigure` + `numberPad` **[NEW WIDGET]** | conceptual | generator [C] |
| 12 | `compositePerimeter` | Same figure, perimeter — where children lose the hidden sides | *[same L-shape]* "What is the distance all the way around this shape?" (28) | 7-10 | visual / `shapeFigure` + `numberPad` **[NEW WIDGET]** | conceptual | generator [C] |
| 13 | `distributiveArea` | Area model as the bridge to multiplication | "A 6 by 13 rectangle is split into a 6 by 10 part and a 6 by 3 part. What is the total area?" | 7-10 | visual / `numberPad` | conceptual | generator [C] |
| 14 | `compareTwoRectangles` | Which is bigger, and by how much | "Rug A is 5 m by 6 m. Rug B is 4 m by 8 m. How many more square metres does the larger rug cover?" (2) | 7-10 | verbalContext / `numberPad` | application | bank [C] |
| 15 | `errorAnalysisSwap` | The canonical mistake, named | "Sam says the perimeter of a 5 cm by 3 cm rectangle is 15 cm. What did Sam do wrong? What is the perimeter?" | 4-6 | verbalContext / `numberPad` | conceptual | generator (from bank item) [C] |
| 16 | `alwaysSometimesNever` | Generalisation with justification | "Two rectangles with the same perimeter always have the same area. Always, sometimes, or never true?" (Sometimes — true only when the rectangles are congruent) | 7-10 | verbalContext / `choice` | conceptual | bank [S] format (NRICH, research §4.11); [C] statement |

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor it generates | Example |
|---|---|---|---|
| `areaPerimeterSwap` (exists, unimplemented) | Computes the other measure entirely | Emit `2(w+h)` on an area item, `w×h` on a perimeter item | 5×3 area → correct 15, distractor 16 |
| `addInsteadOfMultiply` (exists, unimplemented) | Adds the two dimensions | `w + h` | 5×3 area → distractor 8 |
| `offByOne` (exists, unimplemented) | Miscounts grid squares along one edge | `(w±1) × h` | 4×3 grid → distractors 9, 15 |
| `perimeterHalfCount` **[new]** | Adds only two sides | `w + h` on a perimeter item (visually plausible: they "went round" but stopped) | 7×5 perimeter → correct 24, distractor 12 |
| `compositeHiddenSides` **[new]** | On an L-shape, counts only the labelled edges | Sum of labelled sides only | L-shape perimeter 28 → distractor 19 |
| `unitSquareVsLinear` **[new]** | Correct number, wrong unit | Same number with the other unit label | "24 sq m" vs "24 m" as `choice` options |

### Notes

- **Reviewer decision:** rows 9–12 depend on `shapeFigure` / `multiSelect`. Rows 9 and 10 are the highest
  DOK items in this entire spec and are the reason the mode exists pedagogically — I would prioritise them
  over rows 3/4, which are already covered.
- **Reviewer decision:** row 10 asks "why do you think that happens?" The app has no free-text answer path.
  Either drop the justification clause (losing what makes it DOK 3), or add a follow-up `choice` of
  explanations. **Recommend the follow-up choice**: "Because the sides get closer to equal / Because bigger
  numbers make bigger areas / Because perimeter and area are the same thing."
- Row 1 and 2 currently have no home in the mode at all — the generator jumps straight to formulas. Grid
  counting is where area *comes from*; without it, `w × h` is a ritual.
- **Not standards-grounded:** rows 9 and 10 carry [S] because their wording is traceable to the Webb DOK
  material in the research doc. That is evidence they are *reasonable items*, not evidence of a
  measurement problem-type taxonomy. Everything else is [C].

**Authoring load:** 5 varieties are `bank` → at x40 items/variety ≈ **200 authored items**; 11 varieties are
`generator` (1 of them `generator (from bank item)`).

---

## angles — Angle Ace!

**Today:** 2 shapes (`angle` widget showing a multiple of 15°; a two-addend sum word problem), 3 prompt
strings, 2 subskills. **Flat difficulty** — `level` affects nothing at all in either branch. No angle is
ever classified, compared, or estimated. Total item universe ≈ **11 angle figures + ~200 sum pairs across
3 prompt signatures**.

**Target:** 14 varieties.

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | `classifyAngle` | Acute / right / obtuse / straight | *[figure: a 130° angle]* "Is this angle acute, right, obtuse, or straight?" | 1-3 | visual / `choice` | conceptual | generator [C] |
| 2 | `identifyRightAngles` | Find right angles in a figure | *[figure: a trapezoid with two right angles]* "How many right angles does this shape have?" | 4-6 | visual / `shapeFigure` + `numberPad` **[NEW WIDGET]** | conceptual | generator [C] |
| 3 | `measureAngleProtractor` | Read the measure | *[figure: a 75° angle with protractor]* "How many degrees is this angle?" | 4-6 | visual / `angle` | procedural | generator [C] |
| 4 | `drawAngle` | Reverse: produce the angle | "Set the arm to make a 40° angle." | 4-6 | manipulative / `angle` (as input) | conceptual | generator [C] |
| 5 | `estimateAngle` | Benchmark reasoning without a protractor | *[figure: a ~110° angle, no protractor]* "Is this angle closer to 30°, 90°, or 150°?" | 1-3 | visual / `choice` | conceptual | generator [C] |
| 6 | `compareAngleSize` | Two angles with **different ray lengths** — attacks the core misconception | *[figure: a 40° angle with long rays beside a 70° angle with short rays]* "Which angle is larger?" | 4-6 | visual / `choice` | conceptual | generator [C] |
| 7 | `angleSumAdjacent` | Add two adjacent angles | "Two angles that share a side measure 35° and 50°. What is the measure of the whole angle?" | 4-6 | symbolic / `numberPad` | procedural | generator [C] |
| 8 | `complementMissing` | Unknown addend to 90° | "Two angles form a right angle. One is 25°. How many degrees is the other?" | 7-10 | visual / `numberPad` | conceptual | generator [C] |
| 9 | `supplementMissing` | Unknown addend to 180° | "Two angles form a straight line. One is 115°. How many degrees is the other?" | 7-10 | visual / `numberPad` | conceptual | generator [C] |
| 10 | `fullTurnMissing` | Unknown addend to 360° | "Three angles meet at a point. Two measure 140° and 95°. How many degrees is the third?" (125) | 7-10 | visual / `numberPad` | conceptual | generator [C] |
| 11 | `turnsAsFractions` | Turn language ↔ degrees | "Nia turns a quarter turn to her right. How many degrees did she turn?" | 4-6 | verbalContext / `numberPad` | application | bank [C] |
| 12 | `clockHandsAngle` | Cross-mode with `time` | "What is the angle between the hands of a clock at 3 o'clock?" | 7-10 | visual / `numberPad` | application | bank [C] |
| 13 | `errorAnalysisProtractor` | The double-scale misread, named | "Luca measured an angle and read 50° off the protractor, but the angle looks obtuse. What did Luca do wrong? What is the real measure?" (130°) | 7-10 | verbalContext / `numberPad` | conceptual | generator (from bank item) [C] |
| 14 | `alwaysSometimesNeverAngle` | Generalisation | "A triangle can have two right angles. Always, sometimes, or never true?" (Never) | 7-10 | verbalContext / `choice` | conceptual | bank [S] format (NRICH, research §4.11); [C] statement |

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor it generates | Example |
|---|---|---|---|
| `protractorMisread` (exists, unimplemented) | Reads the wrong scale of the double-numbered protractor | `180 − answer` | 130° angle → correct 130, distractor 50 |
| `reflexConfusion` (exists, unimplemented) | Measures the outside of the angle | `360 − answer` | 75° → distractor 285 |
| `offBy10` (exists, unimplemented) | Miscounts protractor gradations | `answer ± 10` | 75° → distractors 65, 85 |
| `rayLengthIsSize` **[new]** | Believes longer rays = bigger angle. **The single best-known angle misconception** | On `compareAngleSize`, the correct answer is the *smaller* angle drawn with *longer* rays | 40° with long rays vs 70° with short rays → child picks the 40° |
| `rightAngleOnlyUpright` **[new]** | Recognises a right angle only in the standard orientation | On `identifyRightAngles`, omit rotated right angles from the count | A tilted square → child answers 0 right angles |
| `sumIsAlways180` **[new]** | Over-applies a remembered fact | `180 − a` on a plain two-angle sum item | 35° + 50° → correct 85, distractor 145 |

### Notes

- **Reviewer decision:** rows 2 and 6 need `shapeFigure` and a two-angle side-by-side render. Row 6 in
  particular cannot be faked in text — the whole item *is* the picture. If `shapeFigure` does not ship,
  row 6 dies, and with it the mode's best conceptual item.
- **Reviewer decision:** does the `angle` widget currently show a protractor overlay, or a bare angle? Row 3
  as written assumes a protractor; row 5 assumes explicitly *no* protractor. If the widget cannot toggle
  this, they collapse into the same item.
- Row 12 (`clockHandsAngle`) sits between two modes. Decide whether it lives here or in `time`; do not
  put it in both. **Recommend: here**, tagged with a `time` cross-reference.
- The mode's current level-independence is the easiest fix: bands 1-3 = classify and estimate only (no
  degrees), 4-6 = measure and add, 7-10 = missing-angle and multi-angle. Note this means **band 1-3 stops
  asking for degree measures at all**, which is the right call for a 6-year-old.
- **Not standards-grounded:** all of it. `4.MD.C` names angle measurement and additive angle reasoning as
  content, but nothing published breaks it into problem types.

**Authoring load:** 3 varieties are `bank` → at x40 items/variety ≈ **120 authored items**; 11 varieties are
`generator` (1 of them `generator (from bank item)`). This is the most generator-heavy mode in the spec —
rows 1–10 are all rendered angle figures with stock stems, which is exactly the visual-mode caveat.

---

## linesShapes — Shapes Shell

**Today:** 2 shapes (`shapeSides` from a 5-entry table, `symmetryLines` from a 5-entry table), 2 prompt
strings, 2 subskills. **`level` is ignored entirely.** Total item universe = **10 questions**, exactly.
This is the worst mode in the app by a wide margin, and a learner exhausts it in under two minutes.

**Target:** 18 varieties. The expansion plan's stated goal is **200+ items**; the arithmetic for that is
below the table.

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | `countSides` | Sides of a named shape (today's item) | "How many sides does a hexagon have?" | 1-3 | symbolic / `numberPad` | conceptual | generator [C] |
| 2 | `countVertices` | Corners, not sides — separates two ideas children merge | "How many vertices does a pentagon have?" | 1-3 | symbolic / `numberPad` | conceptual | generator [C] |
| 3 | `nameFromFigure` | Given a drawn shape, name it — including **non-prototypical orientations** | *[figure: a triangle resting on a vertex, not a side]* "What is the name of this shape?" | 1-3 | visual / `shapeFigure` + `choice` **[NEW WIDGET]** | conceptual | generator [C] |
| 4 | `nameFromProperties` | Property list → name | "A shape has 4 equal sides and 4 right angles. What is it? square / rhombus / rectangle / trapezoid" | 4-6 | verbalContext / `choice` | conceptual | bank [C] |
| 5 | `propertyOfNamed` | True/false on a single property | "True or false: every rhombus has 4 equal sides." (True) | 4-6 | symbolic / `choice` | conceptual | generator (from bank item) [C] |
| 6 | `nonExample` | "Which is NOT a…" — forces the definition to be used, not matched | *[four figures: equilateral triangle, right triangle, obtuse triangle, a 4-sided figure]* "Which one is NOT a triangle?" | 1-3 | visual / `shapeFigure` + `choice` **[NEW WIDGET]** | conceptual | generator [C] |
| 7 | `quadHierarchy` | Class inclusion — the hardest idea in K-4 geometry | "Is every square also a rectangle? Yes / No" (Yes) | 7-10 | verbalContext / `choice` | conceptual | bank [C] |
| 8 | `quadHierarchyReverse` | The other direction | "Is every rectangle also a square? Yes / No" (No) | 7-10 | verbalContext / `choice` | conceptual | bank [C] |
| 9 | `whatIsItNot` | Constrained construction over the quadrilateral vocabulary | "Use the terms square, rhombus, kite, parallelogram, trapezoid, rectangle at most one time each to complete: 'A ___ is always a ___, but a ___ is not always a ___.'" | 7-10 | verbalContext / `multiSelect` **[NEW WIDGET]** | conceptual | bank [S] — verbatim Open Middle G3 "What is it Not?", research §4.8 |
| 10 | `sortByAttribute` | Select-all against one attribute | *[six figures]* "Select every shape that has at least one pair of parallel sides." | 4-6 | visual / `multiSelect` **[NEW WIDGET]** | conceptual | generator [C] |
| 11 | `guessMyRule` | Infer the sorting rule from examples | "In the group: square, rectangle, rhombus. Out of the group: triangle, pentagon, circle. What is the rule?" (four-sided shapes) | 7-10 | verbalContext / `choice` | conceptual | bank [S] format — Investigations "Guess My Rule", research §4.4; [C] item |
| 12 | `whichOneDoesntBelong` | 2×2 panel, every panel defensible | *[panels: a 3×4 rectangle, a 2×6 rectangle, a 4×4 square, a non-right 3×4 parallelogram]* "Which one doesn't belong? Pick one and say why." | 7-10 | visual / `shapeFigure` + `choice` **[NEW WIDGET]** | conceptual | bank [S] format (wodb.ca / Danielson, research §4.6); [C] panel set |
| 13 | `symmetryCount` | Lines of symmetry (today's item) | "How many lines of symmetry does a regular hexagon have?" | 4-6 | symbolic / `numberPad` | conceptual | generator [C] |
| 14 | `symmetryIdentify` | Is this dashed line a line of symmetry? | *[figure: a rectangle with a diagonal dashed line]* "Is the dashed line a line of symmetry? Yes / No" (No — the classic error) | 4-6 | visual / `shapeFigure` + `choice` **[NEW WIDGET]** | conceptual | generator [C] |
| 15 | `composeShapes` | Put shapes together | "Ava puts two identical equilateral triangles together along a full side. What shape can she make?" (rhombus) | 1-3 | visual / `choice` | conceptual | bank [C] |
| 16 | `decomposeShapes` | Break a shape apart | *[figure: a regular hexagon with lines from the centre to each vertex]* "How many triangles is this hexagon divided into?" (6) | 4-6 | visual / `shapeFigure` + `numberPad` **[NEW WIDGET]** | conceptual | generator [C] |
| 17 | `lineRelationships` | Parallel / perpendicular / intersecting | *[figure: two lines meeting at a right angle]* "Are these lines parallel, perpendicular, or neither?" | 4-6 | visual / `shapeFigure` + `choice` **[NEW WIDGET]** | conceptual | generator [C] |
| 18 | `pointLineRaySegment` | Vocabulary of 4.G.A.1 | *[figure: a segment with one arrowhead]* "Is this a line, a ray, or a line segment?" (ray) | 4-6 | visual / `shapeFigure` + `choice` **[NEW WIDGET]** | conceptual | generator [C] |
| 19 | `shapeRiddle` | Multi-clue identification | "I have exactly 4 sides. Exactly one pair of my sides is parallel. What am I?" (trapezoid) | 7-10 | verbalContext / `choice` | conceptual | bank [C] |
| 20 | `alwaysSometimesNeverShape` | Generalisation with justification | "If you put two squares together you get a rectangle. Always, sometimes, or never true?" (Sometimes) | 7-10 | verbalContext / `choice` | conceptual | bank [S] — verbatim NRICH KS1, research §4.11 |

Additional verbatim NRICH statements available for row 20 **[S]**: "When you cut a square in half you get a
triangle." (Sometimes) · "Four sided shapes are called squares." (Sometimes) · "Three sided shapes are
called triangles." (Always) · "3D shapes have more than four faces." (Sometimes).

### How this reaches 200+ items

The current 10 items come from two 5-row tables. The expansion needs a **shape property table**, not more
prompt strings:

```
shapeLibrary: ~24 entries
  { name, sides, vertices, rightAngles, parallelPairs, equalSideGroups,
    symmetryLines, isRegular, superclasses: [...], figureSpec }
  covering: triangle (equilateral, isosceles, scalene, right, obtuse),
  quadrilateral (square, rectangle, rhombus, parallelogram, trapezoid, kite,
  irregular), pentagon, hexagon, heptagon, octagon (regular + irregular each),
  circle, and the line figures (point, line, ray, segment, parallel pair,
  perpendicular pair, intersecting pair).
```

Item counts, conservatively:

| Variety | Items generable |
|---|---|
| 1, 2, 13 (numeric property of a named shape) | 24 shapes × 3 = 72 |
| 3, 6 (figure → name, non-example) | 24 shapes × 2 orientations = 48 |
| 4, 5, 7, 8, 19 (property/hierarchy statements) | ~60 true/false + riddle combinations |
| 10, 11 (sort / guess-my-rule) | 6 attributes × ~8 shape sets = 48 |
| 12, 20 (WODB, always/sometimes/never) | 20 hand-authored panel sets + 9 sourced statements |
| 14, 15, 16, 17, 18 | ~40 figure-based |
| **Total** | **≈ 290** |

**200+ is reachable, but only with `shapeFigure`.** Ten of the twenty varieties are visual. Without a
shape renderer the mode caps at roughly 130 verbal items, and a geometry mode that never shows a shape is
a poor product regardless of item count.

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor it generates | Example |
|---|---|---|---|
| `sideVertexSwap` (exists, unimplemented) | Confuses sides with corners | Emit the other count | Asked for vertices of a pentagon → both are 5, so **generate this distractor only for shapes where they differ** (circle: 0 vertices, 1 side) — flag as a real generator constraint |
| `symmetryMiscount` (exists, unimplemented) | Assumes lines of symmetry = number of sides | Emit `sides` on a symmetry item | Rectangle → correct 2, distractor 4 |
| `offByOne` (exists, unimplemented) | Miscounts around the figure | `answer ± 1` | Octagon sides → distractors 7, 9 |
| `prototypeOnly` **[new]** | Recognises a shape only in its textbook orientation | On `nameFromFigure`, present the shape rotated; distractor is a plausible near-name | Triangle on its vertex → child answers "not a triangle" |
| `hierarchyExclusive` **[new]** | Believes categories are mutually exclusive — a square "can't" be a rectangle | On rows 7/8, "No" is the distractor for 7 and the correct answer for 8, so the pair *diagnoses* the misconception when both are asked | Square/rectangle pair |
| `diagonalIsSymmetry` **[new]** | Believes any line through the centre is a line of symmetry | On row 14, present a rectangle's diagonal | Rectangle diagonal → child answers "Yes" |
| `sidesCountedByCorners` **[new]** | Counts a shape's sides by counting its corners on a concave figure | Wrong count on L-shapes and stars | 6-sided L-shape → child answers 4 |

### Notes

- **Rows 7 and 8 must be asked as a pair to be diagnostic.** A child who answers "Yes/Yes" or "No/No" has
  no hierarchy concept; only "Yes/No" is correct. Suggest the generator emit them as a linked pair within
  one session. **Reviewer decision:** does the session engine support linked item pairs? If not, this
  degrades to two independent items and loses most of its diagnostic value.
- **Reviewer decision:** how far does 3-D go? Row 20 has a sourced 3-D statement, and faces/edges/vertices
  is standard K-4 content, but the current mode is 2-D only and 3-D needs its own figure renderer. **Recommend
  deferring 3-D to a separate spec.**
- **Reviewer decision:** row 12 (WODB) has *no answer key by design* — the research (§4.6) is explicit that
  all four panels must be defensible. The app is a right/wrong practice engine. Either accept any panel as
  correct and score the *reason* selection, or drop the format. I would accept-any-panel and follow with a
  reason `choice`; that keeps the format honest.
- **Not standards-grounded:** all of it. `4.G` and `3.G` name classification, symmetry, and the
  quadrilateral hierarchy as *content*, but no problem-type grid exists. The claim that hierarchy (rows
  7-9) is band 7-10 while non-examples (row 6) are band 1-3 is my judgment.

**Authoring load:** 9 varieties are `bank` → at x40 items/variety ≈ **360 authored items**; 11 varieties are
`generator` (1 of them `generator (from bank item)`). Note the tension with "How this reaches 200+" above:
that count assumed rows 4, 5, 7, 8 and 19 could be enumerated from the shape property table. Under the
static-authored rule their wording is authored prose and they are `bank`, so the shape table drives the
*figure* varieties (3, 6, 10, 14, 16, 17, 18) and the numeric-property varieties (1, 2, 13) only.

---

## dataGraphs — Graph Reader!

**Today:** 1 shape (a 4-bar vertical bar graph with random values), 2 prompt strings, 2 subskills.
`compareBars` **always compares bars 0 and 1** — a hard-coded `const [i, j] = [0, 1]`, so two of the four
categories are never the subject of a comparison. There is no pictograph, no key, no line plot, no tally,
no total, and no "how many fewer". Total item universe ≈ **2 distinct prompt signatures**.

**Target:** 16 varieties.

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | `readBarSingle` | Read one bar — **any** bar | *[bar graph: Cats 6, Dogs 9, Birds 4, Fish 7]* "How many students chose Birds?" (4) | 1-3 | visual / `barGraph` | procedural | generator [S] format — Webb DOK 1 illustration ("How many students chose red?"), research §5.4 |
| 2 | `compareBarsAny` | Difference between **any two** bars, randomised | *[same graph]* "How many more Dogs than Fish?" (2) | 4-6 | visual / `barGraph` | conceptual | generator [S] format — Webb DOK 2 illustration, research §5.4 |
| 3 | `compareFewer` | "How many **fewer**" — different language, same math | *[same graph]* "How many fewer Birds than Cats?" (2) | 4-6 | visual / `barGraph` | conceptual | generator [C] |
| 4 | `totalAcrossBars` | Sum two or more categories | *[same graph]* "How many students chose Cats or Dogs altogether?" (15) | 4-6 | visual / `numberPad` | conceptual | generator [C] |
| 5 | `mostLeastIdentify` | Extreme identification, no arithmetic | *[same graph]* "Which pet did the fewest students choose?" (Birds) | 1-3 | visual / `choice` | conceptual | generator [C] |
| 6 | `totalSurveyed` | Sum all bars — the multi-step read | *[same graph]* "How many students were asked in all?" (26) | 7-10 | visual / `numberPad` | conceptual | generator [C] |
| 7 | `buildBarToMatch` | Reverse: construct the bar | *[graph with Fish missing]* "4 more students chose Fish than Birds. Birds is 4. Drag the Fish bar to the right height." (8) | 4-6 | manipulative / `barGraph` (as input) | conceptual | generator [C] |
| 8 | `scaledAxis` | Bar graph where **one square = 2 or 5** | *[bar graph, y-axis marked 0, 5, 10, 15, 20; Buses bar reaches halfway between 10 and 15]* "How many buses?" (12 or 13 — use gridlines that land on values) | 7-10 | visual / `barGraph` | conceptual | generator [C] |
| 9 | `pictographKey1` | Pictograph, one symbol = one thing | *[pictograph: Apples ●●●●●, Pears ●●●, key: ● = 1 fruit]* "How many apples?" (5) | 1-3 | visual / `pictograph` **[NEW WIDGET]** | procedural | generator [C] |
| 10 | `pictographKey2` | **Key of 2** — where children start failing | *[pictograph: Bikes ●●●●, Cars ●●●●●●, key: ● = 2 vehicles]* "How many bikes?" (8) | 4-6 | visual / `pictograph` **[NEW WIDGET]** | conceptual | generator [C] |
| 11 | `pictographKey5Half` | **Key of 5 with a half symbol** — the hardest read in K-4 data | *[pictograph: Red ●●●◐, key: ● = 5 votes]* "How many votes for Red?" (17.5 → use whole-friendly keys; with ● = 4, a half is 2, giving 14) | 7-10 | visual / `pictograph` **[NEW WIDGET]** | conceptual | generator [C] |
| 12 | `pictographCompare` | Compare with a key — requires two conversions | *[pictograph, key: ● = 5]* "How many more people chose Green than Yellow?" (Green ●●●● = 20, Yellow ●● = 10 → 10) | 7-10 | visual / `pictograph` **[NEW WIDGET]** | conceptual | generator [C] |
| 13 | `tallyRead` | Read tally marks with the crossed group of 5 | *[tally: Blue ||||̸ ||, Green ||||̸ ||||̸ |]* "How many chose Blue?" (7) | 1-3 | visual / `tallyChart` **[NEW WIDGET]** | procedural | generator [C] |
| 14 | `tallyToBar` | Translate between representations | *[tally chart shown]* "Which bar graph matches this tally chart?" | 4-6 | visual / `choice` | conceptual | generator [C] |
| 15 | `linePlotRead` | Read a line plot / dot plot | *[line plot of plant heights in cm over 4, 5, 6, 7 with 2, 5, 3, 1 Xs]* "How many plants were 5 cm tall?" (5) | 4-6 | visual / `linePlot` **[NEW WIDGET]** | procedural | generator [C] |
| 16 | `linePlotSpread` | Range / difference from a line plot | *[same line plot]* "What is the difference between the tallest and shortest plant?" (3 cm) | 7-10 | visual / `linePlot` **[NEW WIDGET]** | conceptual | generator [C] |
| 17 | `whichStatementTrue` | Multi-select over claims about one graph | *[bar graph]* "Select every true statement: More students chose Dogs than Cats / Fish and Birds together are more than Dogs / Birds was the least popular" | 7-10 | visual / `multiSelect` **[NEW WIDGET]** | conceptual | bank [C] |
| 18 | `constructGraph` | Open construction against a constraint | "Make a graph that shows a possible result of 7 students' favourite colour, with red being the most popular colour." | 4-6 | manipulative / `barGraph` (as input) | conceptual | bank [S] — verbatim Open Middle G1 "Interpreting Data 2", research §4.8 |
| 19 | `errorAnalysisAxis` | Named misconception | "Mina says 8 buses were counted because the bar reaches the 4th line. But each line is 2 buses. Is Mina right? How many buses?" | 7-10 | visual / `numberPad` | conceptual | generator (from bank item) [C] |

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor it generates | Example |
|---|---|---|---|
| `axisMisread` (exists, unimplemented) | Counts gridlines instead of applying the scale | On a scaled axis, emit the *gridline count* | Bar at 12 with scale 2 → correct 12, distractor 6 |
| `compareDirection` (exists, unimplemented) | Subtracts the wrong way, or answers with the wrong bar | Emit `|b − a|`'s complement, and emit each bar's raw value | "How many fewer Birds than Cats?" (4 vs 6) → correct 2, distractors 4, 6 |
| `offByOne` (exists, unimplemented) | Reads the bar one unit high or low | `answer ± 1` | Bar at 7 → distractors 6, 8 |
| `keyIgnored` **[new]** | Counts pictograph symbols, ignoring the key | Emit the **symbol count** | Bikes ●●●● with ● = 2 → correct 8, distractor 4 |
| `halfSymbolWhole` **[new]** | Counts a half symbol as a whole one | `answer + key/2` | Red ●●●◐ with ● = 4 → correct 14, distractor 16 |
| `tallyFifthMiscount` **[new]** | Counts the crossing stroke as a 6th mark, or misses it | `answer ± groupsOf5` | ||||̸ || → correct 7, distractor 6 or 8 |
| `comparedInsteadOfTotalled` **[new]** | Subtracts when the question says "altogether" | `|a − b|` on a total item | "Cats or Dogs altogether" (6, 9) → correct 15, distractor 3 |

### Notes

- **The `const [i, j] = [0, 1]` bug is a one-line fix** and immediately doubles-plus the mode's compare
  variety (4 categories → 12 ordered pairs, 6 unordered). Do it independently of everything else here.
- **Reviewer decision:** `pictograph`, `linePlot`, and `tallyChart` are three new widgets. The research
  brief specifically calls out pictographs-with-a-key as where children fail, and I agree — but that is
  three renderers. **Recommend building `pictograph` first** (rows 9–12 and 19 = five varieties, the
  richest single return), then `linePlot`, then `tallyChart` (which could be rendered as styled text at
  near-zero cost).
- **Reviewer decision:** row 11 as literally specified (key of 5, half symbol) produces a non-integer
  answer, which `numberPad` and most children handle badly. I have written the example with a key of 4 so
  the half is a whole number. **Constrain the generator to even keys whenever half symbols are used.**
- **Reviewer decision:** row 18 (Open Middle construct-a-graph) has many valid answers. Scoring must
  validate the *constraint* (7 total, red strictly greatest), not compare to one key. That is a different
  scoring path from everything else in the app.
- Data in bands 1-3 should be counts of 1–10 with no scale; the scale itself (rows 8, 10-12) is the
  structural difficulty jump, not bigger bar values.
- **Not standards-grounded:** all of it. Rows 1 and 2 carry [S] only because Webb used graph-reading as
  DOK illustrations — that tells us their *depth*, not that a data problem-type taxonomy exists.

**Authoring load:** 2 varieties are `bank` → at x40 items/variety ≈ **80 authored items**; 17 varieties are
`generator` (1 of them `generator (from bank item)`). Lowest authoring load in the spec by a wide margin —
almost every item here is a rendered graph plus a stock read-off stem. The cost in this mode is renderers,
not authors.

---

## Cross-mode notes for the reviewer

1. **Three widgets unlock roughly half of everything above:** `multiSelect`, `shapeFigure`, `pictograph`.
   If the budget is one widget, it is `shapeFigure` — `linesShapes` cannot reach its 200-item target
   without it, and `angles` and `areaPerimeter` both draw on it.
2. **Four modes ignore `level` today** (`linesShapes` completely; `time` and `angles` effectively;
   `areaPerimeter` only numerically). Every mode section above proposes a *structural* band ladder. These
   ladders are the cheapest real improvement in this spec and are almost entirely free of widget cost.
3. **Every misconception tag currently in these seven modes is decorative.** This spec gives each existing
   tag a concrete distractor rule plus 2-4 new tags per mode. Implementing them is Phase 4 of the expansion
   plan and is what makes a wrong answer diagnostic.
4. **Family tagging is currently a lie in several of these modes** (`chooseFamily` is rolled, written to
   metadata, and only branches a prompt string in four of the seven). Per the expansion plan §5, family
   should be *derived* from (structure, format, representation). The Family column above is filled in on
   that basis, not by a random roll.
5. **Item-count reality check.** *(Revised under the static-authored sourcing model — this note
   previously said "bank application prose only," which no longer holds: conceptual prose is banked too.)*
   Adding these varieties multiplies the authoring bill, not just the cell count. Formats remain
   generator-side transforms, but **any row a child reads as prose is `bank`** regardless of family.
   These seven modes still skew generator (77 of 118) because a rendered clock face, angle, or shape
   figure carries no authored wording — that skew is correct, not a gap.
6. **Prompt-length compliance.** All 100+ examples above are ≤220 characters and 1-2 sentences. Row 9 in
   `linesShapes` (the Open Middle "What is it Not?" verbatim) is the closest to the limit and may need
   trimming; it is a verbatim source item, so trimming changes it from [S] to [C].
7. **The honest bottom line:** this document contains one genuinely sourced problem-type taxonomy — none.
   It contains ~15 sourced *formats* borrowed from routines (Open Middle, NRICH, WODB, Would You Rather,
   Estimation 180, Guess My Rule) and applied to these domains by analogy, and ~90 constructed varieties.
   That is a reasonable basis for building a practice app. It is not a basis for a standards-alignment
   claim.

---

## Authoring load summary

Items are **static and individually authored** — fixed numbers, human-reviewed, no templating. The floor
below is 40 authored items per `bank` variety. `generator` counts include the `generator (from bank item)`
format transforms (one per mode), which need no new prose of their own.

| Mode | Bank varieties | Generator varieties | Authored items needed @40 |
|---|---|---|---|
| `measurement` | 7 | 9 | 280 |
| `money` | 8 | 8 | 320 |
| `time` | 7 | 10 | 280 |
| `areaPerimeter` | 5 | 11 | 200 |
| `angles` | 3 | 11 | 120 |
| `linesShapes` | 9 | 11 | 360 |
| `dataGraphs` | 2 | 17 | 80 |
| **Total** | **41** | **77** | **1,640** |

118 varieties in all; **35% are `bank`**. That share is deliberately lower than the arithmetic modes — see
the visual-mode caveat in the sourcing model. The authoring cost concentrates in `linesShapes`, `money` and
the two conversion-and-story modes; `dataGraphs` and `angles` are cheap to author and expensive to *render*,
which is the opposite trade-off and should be scheduled accordingly.

**Reviewer decision:** 1,640 authored items is the floor, not the target. 40 per variety survives roughly
two to three focused sessions against one cell before repeats appear, given `SESSION_SIZE = 15` and
`RECENT_BANK_WINDOW = 8`. If a mode is expected to carry sustained daily practice, its high-traffic
varieties need 100+, not 40.
