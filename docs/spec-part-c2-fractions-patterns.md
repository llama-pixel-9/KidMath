# Spec Part C2 — Question Variety: fractions, decimals, factorsMultiples, patterns, barModels

Status: Draft for review
Companion to: `problem-variety-expansion-plan.md` (the 3 axes), `research-k4-problem-types.md` (evidence),
`word-problem-authoring-guide.md` (style contract)

## Sourcing model

**The item bank is static authored items. There is no templating.** Every banked item is authored
individually, human-reviewed, and ships with its numbers baked in — the existing item format:

```
question: {a:9, b:7, answer:16, display:{promptText:"Mina has 9 shells and finds 7 more. How many now?"}}
```

Parameterized templates — one authored sentence with `{name}`/`{n}` slots expanded at runtime — were
considered and **rejected**. Nothing in this spec should be read as proposing them, and no downstream plan
should reintroduce them. Prose is either authored and reviewed once, in full, or it is not prose.

**Sourcing rule** — the `Source` column of every variety row is assigned by this rule and nothing else:

| Row characteristic | Source |
|---|---|
| Family = `application` | `bank` — authored, reviewed |
| Family = `conceptual` **and** the item carries prose / verbalContext / a written question stem | `bank` |
| Family = `conceptual` but purely symbolic or visual, no authored wording (e.g. "Compare: 3/8 ? 5/8", "Write 9/12 in simplest form") | `generator` |
| Family = `procedural` and symbolic | `generator` — `2/7 + 3/7 = ?` has no prose to review; curating these wastes review budget |
| Format transform (true/false, odd-one-out, error analysis, estimation) built from an existing item | `generator (from bank item)` — it inherits the already-reviewed prose |

A format transform whose base item is itself a generator row (a symbolic odd-one-out, a "which term is
wrong" on a generated sequence) has no reviewed prose to inherit and is plain `generator`.

### Volume consequence

Because each authored item **is one item** — the numbers are fixed, so a bank cell of 8 items is 8 prompts
and no more — avoiding repeats needs far more items per cell than the old 8-per-cell floor assumed. That
floor was written for a world where one authored string covered many numeric instances. It does not survive
the move to static items.

The engine makes this concrete: `SESSION_SIZE = 15` and `RECENT_BANK_WINDOW = 8`. An adaptive session that
keeps targeting one weak cell can draw 15 items from it while only the last 8 are suppressed as recent —
i.e. **a small cell can be exhausted, and start visibly repeating, inside a single session.** The working
floor used throughout this document is therefore **40 authored items per `bank` variety**, not 8.

This is the authoring spec an LLM item-bank pipeline generates from. Every example below is a real,
ready-to-use question with real numbers — a reviewer should be able to read the "Concrete example" column
as if it were on screen.

## Evidence status — read this first

`research-k4-problem-types.md` §8 states explicitly:

> **[GAP] Fractions problem types (3.NF, 4.NF).** No fraction analogue of Table 1/Table 2 was researched…
> there is **no systematic fraction problem-type taxonomy** here.
>
> **[GAP] Measurement, geometry, data, time, money problem types.** No per-domain problem-type grid was
> retrieved for any of these.

So: **there is no CCSS Table 1 equivalent for fractions, decimals, patterns, or number theory.** The
variety catalogs below are *reasoned proposals*, not standards-derived taxonomies. Rows are marked:

- **[S]** — grounded in a source actually retrieved by the research (CCSS Table 1/2 structures, MiF bar-model
  schemas §3.2, Open Middle format spec §4.8, true/false equation forms §4.9, format taxonomy §6).
- **[C]** — constructed. The row is our own reasoning about what makes a distinct concept. Defensible,
  pedagogically ordinary, but **do not describe it as standards-aligned** in any user-facing or funder-facing
  material.

`barModels` is the exception: its schemas are **[S]** throughout, from §3.2's seven ASCII diagrams.

## Style contract (applies to every generated item)

- ≤220 characters, 1–2 short sentences, one question target.
- Concrete nouns; rotate names across Sam, Mina, Luca, Nia, Theo, Ava, Priya, Owen, Jonas, Kaia.
- No idioms, no narrative decoration, no ambiguous pronouns, no unresolved `{...}` tokens.
- Numbers in the prompt must match the payload.

## answerType budget

Reused, zero UI cost: `fraction`, `decimal`, `fractionSet`, `barModel`, `symbolSelect`, `numberPad`,
`fillBlank`, `choice`.

**New widgets flagged as UI cost** (each appears in the catalogs below and is tallied in Notes):

| Widget | Needed by | Cost estimate |
|---|---|---|
| `numberLine` (place a point / read a labelled tick) | fractions ×3, decimals ×3 | **High** — the single biggest ask, but already named as a gap in the expansion plan §2 Axis 3 |
| `multiSelect` (pick all that apply) | all 5 modes | **Low** — variant of existing `choice` |
| `areaModel` (tap parts of a shape to shade) | fractions ×2 | **Medium** |
| `orderStrip` (drag to order 3–4 values) | fractions, decimals | **Medium** |
| `digitPlace` (Open Middle digit tiles into boxes) | fractions, decimals, factorsMultiples, patterns | **Medium-High** — unlocks a whole format family |
| `shapeSequence` (repeating shape/colour patterns) | patterns ×3 | **Medium** |

Everything else in this spec is wiring, not new UI.

---

## fractions — Fraction Frenzy!

**Today:** 4 shapes (simplify, compare, add-like-denominators, fraction-of-set), 4 word-problem templates
(one per subskill, each a single hardcoded string), 4 subskills. Denominator pool is 3/6/8 values by band;
numerators are `randInt`. Total item universe ≈ **420 distinct prompts** across all 10 levels — and the
*application* variant is literally the same 4 sentences with numbers swapped, so effective word-problem
variety is **4**.

**Target:** **18 varieties.**

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | partWholeAreaName [C] | Shaded region shown; name the fraction | A circle is cut into 4 equal parts. 3 parts are shaded. What fraction is shaded? | 1-3 | visual / `fraction` | conceptual | generator |
| 2 | partWholeAreaShade [C] | Given a fraction, shade the model | Tap parts of this 6-part bar to show 2/6. | 1-3 | visual / `areaModel` **(new)** | conceptual | generator |
| 3 | unitFractionMeaning [C] | Meaning of 1/n as one of n equal parts | A ribbon is cut into 8 equal pieces. Nia takes one piece. What fraction did she take? | 1-3 | verbalContext / `fraction` | conceptual | bank |
| 4 | equalPartsCheck [C] | Is this a valid fraction model? | This rectangle is split into 4 parts, but they are not the same size. Can the shaded part be called 1/4? | 1-3 | visual / `choice` | conceptual | bank |
| 5 | partWholeSetName [C] | Fraction of a discrete set | A tray holds 10 muffins. 4 are blueberry. What fraction of the muffins are blueberry? | 1-3 | visual / `fraction` | conceptual | bank |
| 6 | fractionOnNumberLine [C] | Locate a fraction on 0–1 | Place 3/4 on this number line marked from 0 to 1 in fourths. | 4-6 | visual / `numberLine` **(new)** | conceptual | generator |
| 7 | numberLineReadOff [C] | Read the fraction at a marked point | The number line runs 0 to 1 in sixths. Point A is on the fifth tick. What fraction is A? | 4-6 | visual / `fraction` | conceptual | generator |
| 8 | equivalenceGenerate [C] | Produce an equivalent fraction | Write a fraction equal to 2/3 that has 12 as its denominator. | 4-6 | symbolic / `fraction` | procedural | generator |
| 9 | equivalenceSimplify [C] | Reduce to simplest form | Write 9/12 in simplest form. | 4-6 | symbolic / `fraction` | procedural | generator |
| 10 | compareSameDenominator [C] | Compare with matched denominators | Compare: 3/8 ? 5/8. Use <, >, or =. | 1-3 | symbolic / `symbolSelect` | conceptual | generator |
| 11 | compareSameNumerator [C] | Compare with matched numerators — bigger denominator, smaller piece | Compare: 2/3 ? 2/5. Use <, >, or =. | 4-6 | symbolic / `symbolSelect` | conceptual | generator |
| 12 | compareToHalf [C] | Benchmark against 1/2 | Is 5/12 less than, equal to, or greater than 1/2? | 4-6 | symbolic / `choice` | conceptual | generator |
| 13 | orderFractions [C] | Order 3–4 fractions | Drag these into order from smallest to largest: 1/2, 3/8, 5/6, 2/3. | 7-10 | symbolic / `orderStrip` **(new)** | procedural | generator |
| 14 | addLikeDenominators [C] | Add/subtract with a common denominator | 2/7 + 3/7 = ? | 4-6 | symbolic / `fraction` | procedural | generator |
| 15 | fractionOfSetForward [S §3.2g] | n/d of a known total | 3/5 of the 20 trucks are painted red. How many trucks are red? | 4-6 | manipulative / `fractionSet` | application | bank |
| 16 | fractionOfSetInverse [S §3.2g] | Part and fraction known; total unknown | 3/5 of Luca's trucks are red. 12 trucks are red. How many trucks does Luca have? | 7-10 | manipulative / `fractionSet` | application | bank |
| 17 | mixedImproperConvert [C] | Convert between mixed and improper | Write 7/3 as a mixed number. | 7-10 | symbolic / `fraction` | procedural | generator |
| 18 | fractionErrorAnalysis [S §6, §4.10] | Critique a named student's wrong work | Theo says 1/2 + 1/3 = 2/5 because 1+1=2 and 2+3=5. Is Theo right? | 7-10 | verbalContext / `choice` | conceptual | bank |

Notes on coverage: rows 1–2 and 5 are *part-whole area* vs *part-whole set* — genuinely different concepts,
not difficulty tiers, per the instruction. Rows 6–7 give fraction-as-a-number (the concept most often
skipped). Rows 10–12 are three distinct comparison strategies, deliberately not collapsed into one
"compare" generator, because a child can do same-denominator and fail same-numerator.

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor generated | Example |
|---|---|---|---|
| `wholeNumberBias` | Treats numerator and denominator as separate whole numbers when adding | `(n1+n2)/(d1+d2)` | 1/2 + 1/3 → offer **2/5** |
| `biggerDenominatorBigger` | Assumes a larger denominator means a larger fraction | Flip the comparison symbol on same-numerator items | 2/3 ? 2/5 → offer **<** |
| `numeratorOnly` | Compares numerators only, ignoring denominators | The fraction with the larger numerator | 3/8 vs 1/2 → offer **3/8 is larger** |
| `denominatorAdd` | Adds denominators on like-denominator addition | `(n1+n2)/(d1+d2)` with matched d | 2/7 + 3/7 → offer **5/14** |
| `partToPartConfusion` | Reads part-to-part as part-to-whole on set models | `part/(total−part)` | 4 of 10 muffins → offer **4/6** |
| `unequalPartsAccepted` | Counts parts without checking they are equal | "Yes, it's 1/4" on an unequal split | row 4 |
| `numberLineCountsTicks` | Counts tick marks instead of intervals | Answer off by one interval | 3/4 placed at the 3rd tick of 5 |
| `mixedDropsWhole` | Converts 7/3 and loses the whole | **1 1/3** instead of 2 1/3 | row 17 |

**Authoring load:** 6 varieties are `bank` (rows 3, 4, 5, 15, 16, 18) → at ×40 items/variety ≈ **240
authored items**; 12 varieties are `generator`.

---

## decimals — Decimal Dash!

**Today:** 3 shapes (write-as-decimal, fraction→decimal, compare), 3 word-problem templates, 3 subskills.
Tenths below level 7, hundredths at and above. Total item universe ≈ **250 distinct prompts**; the
application variants are again 3 fixed sentences.

**Target:** **14 varieties.**

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | tenthsFromModel [C] | Shaded 10-strip → decimal | A strip is split into 10 equal parts and 7 are shaded. Write that as a decimal. | 4-6 | visual / `decimal` | conceptual | generator |
| 2 | hundredthsFromGrid [C] | Shaded 100-grid → decimal | A 10-by-10 grid has 43 squares shaded. Write that as a decimal. | 7-10 | visual / `decimal` | conceptual | generator |
| 3 | decimalFromWords [C] | Spoken quantity → decimal | Write as a decimal: 3 tenths and 6 hundredths. | 4-6 | symbolic / `decimal` | procedural | generator |
| 4 | decimalToWords [C] | Decimal → spoken quantity | How do you say 0.05? | 4-6 | symbolic / `choice` | conceptual | generator |
| 5 | fractionToDecimal [C] | Denominator 10 or 100 → decimal | Write 7/10 as a decimal. | 4-6 | symbolic / `decimal` | procedural | generator |
| 6 | decimalToFraction [C] | Decimal → fraction | Write 0.09 as a fraction. | 7-10 | symbolic / `fraction` | procedural | generator |
| 7 | tenthsHundredthsEquiv [C] | 0.3 = 0.30 | Is 0.4 equal to 0.40? | 7-10 | symbolic / `choice` | conceptual | generator |
| 8 | compareDecimals [C] | Two decimals, <, >, or = | Compare: 0.7 ? 0.65. Use <, >, or =. | 7-10 | symbolic / `symbolSelect` | conceptual | generator |
| 9 | orderDecimals [C] | Order 3–4 decimals | Drag these into order from smallest to largest: 0.3, 0.25, 0.7, 0.09. | 7-10 | symbolic / `orderStrip` **(new)** | procedural | generator |
| 10 | decimalOnNumberLine [C] | Place a decimal between 0 and 1 | Place 0.6 on this number line marked from 0 to 1 in tenths. | 4-6 | visual / `numberLine` **(new)** | conceptual | generator |
| 11 | decimalNumberLineRead [C] | Read a marked point | This number line runs 0 to 1 in tenths. Point B is between 0.4 and 0.5. Which is B: 0.45 or 0.54? | 7-10 | visual / `choice` | conceptual | generator |
| 12 | moneyAsDecimal [C] | Decimal in a money context | Mina has 3 dimes and 4 pennies. Write the amount as a decimal part of a dollar. | 4-6 | verbalContext / `decimal` | application | bank |
| 13 | measurementDecimal [C] | Decimal in a measurement context | Owen's plant grew 0.8 cm one week and 0.15 cm the next. Which week did it grow more? | 7-10 | verbalContext / `choice` | application | bank |
| 14 | decimalErrorAnalysis [S §6, §4.10] | Critique wrong reasoning | Kaia says 0.15 is bigger than 0.2 because 15 is bigger than 2. Is Kaia right? | 7-10 | verbalContext / `choice` | conceptual | bank |

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor generated | Example |
|---|---|---|---|
| `longerIsLarger` | More digits after the point means bigger | Pick the longer decimal | 0.7 vs 0.65 → offer **0.65** |
| `shorterIsLarger` | Overcorrects: fewer digits means bigger | Pick the shorter decimal | 0.25 vs 0.3 → offer **0.3 is smaller** |
| `decimalAsWholeNumber` | Reads the tail as a whole number | Compare 15 vs 2 | row 14 |
| `placeValueSlip` | Puts a digit in the wrong column | 3 tenths and 6 hundredths → **0.63** | row 3 |
| `zeroIgnored` | Drops a placeholder zero | 5 hundredths → **0.5** | row 4 |
| `decimalPointDrift` | Point misplaced on fraction conversion | 7/10 → **7.0** or **0.07** | row 5 |

**Authoring load:** 3 varieties are `bank` (rows 12, 13, 14) → at ×40 items/variety ≈ **120 authored
items**; 11 varieties are `generator`.

---

## factorsMultiples — Factor Lab!

**Today:** 2 shapes (count factors of n, nth multiple of n), 2 word-problem templates, 2 subskills. Below
the project's own documented ≥3 subskill minimum. Total item universe ≈ **150 distinct prompts** — and
`factorCount` asks the same sentence about at most 49 different numbers.

**Target:** **12 varieties.**

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | listFactors [C] | List every factor | List all the factors of 18. | 4-6 | symbolic / `multiSelect` **(new)** | procedural | generator |
| 2 | factorCount [C] | How many factors | How many factors does 24 have? | 4-6 | symbolic / `numberPad` | procedural | generator |
| 3 | isFactorOf [C] | Yes/no membership | Is 6 a factor of 42? | 4-6 | symbolic / `choice` | conceptual | generator |
| 4 | isMultipleOf [C] | Yes/no membership, other direction | Is 45 a multiple of 9? | 4-6 | symbolic / `choice` | conceptual | generator |
| 5 | nthMultiple [C] | Find the nth multiple | What is the 6th multiple of 7? | 4-6 | symbolic / `numberPad` | procedural | generator |
| 6 | multiplesInRange [C] | Find all multiples in a window | Pick every multiple of 4 between 20 and 40. | 4-6 | symbolic / `multiSelect` **(new)** | procedural | generator |
| 7 | primeOrComposite [C] | Classify | Is 29 prime or composite? | 7-10 | symbolic / `choice` | conceptual | generator |
| 8 | factorPairs [C] | Give a pair with a given product | Name two whole numbers that multiply to make 36. | 4-6 | symbolic / `numberPad` ×2 | procedural | generator |
| 9 | commonFactor [C] | Shared factor of two numbers | Name a number that is a factor of both 12 and 18. | 7-10 | symbolic / `numberPad` | conceptual | generator |
| 10 | commonMultiple [C] | Shared multiple of two numbers | What is the smallest number that is a multiple of both 4 and 6? | 7-10 | symbolic / `numberPad` | conceptual | generator |
| 11 | arrayFactorContext [S §3.2 array framing] | Rectangular arrangements | Priya arranges 24 tiles into equal rows. How many different row sizes can she use? | 4-6 | manipulative / `numberPad` | application | bank |
| 12 | oddOneOut [S §6, §4.6] | Which does not belong | Which one is not a factor of 30: 5, 6, 8, 15? | 7-10 | symbolic / `choice` | conceptual | generator |

Note that rows 3 and 4 exist specifically as a matched pair — asking both is how the `factorMultipleSwap`
misconception becomes visible.

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor generated | Example |
|---|---|---|---|
| `factorMultipleSwap` | Confuses the two directions | Offer a multiple when a factor is asked | "Is 42 a factor of 6?" phrased as row 3; or list 36, 54 as factors of 18 |
| `missingOneOrSelf` | Omits 1 and n from the factor list | Factor count minus 2 | 18 → offer **4** instead of 6 |
| `oneIsPrime` | Calls 1 prime, or 2 composite | Misclassify 1, 2, 9 | row 7 with n=1 |
| `squareDoubleCount` | Counts the repeated factor twice on perfect squares | Factor count plus 1 | 36 → offer **10** instead of 9 |
| `offByOneMultiple` | Counts the number itself as the 1st multiple inconsistently | nth vs (n+1)th multiple | 6th multiple of 7 → offer **49** |
| `commonFactorAdds` | Adds instead of finding shared structure | a+b as the common multiple | 4 and 6 → offer **10** |

**Authoring load:** 1 variety is `bank` (row 11) → at ×40 items/variety ≈ **40 authored items**; 11
varieties are `generator`. Row 12's odd-one-out is symbolic, so it is a plain `generator` transform with no
banked prose to inherit.

---

## patterns — Pattern Power!

**Today:** 3 shapes (arithmetic next, geometric next, missing term), **0 word-problem templates**, 3
subskills. All numeric, all left-to-right, all answered with `fillBlank`. `chooseFamily()` is called and
written to metadata but **never branches the prompt** — an item tagged `application` renders identically to
`procedural` (confirmed bug, expansion plan §Phase 1). Total item universe ≈ **300 distinct sequences**,
but only **3 prompt signatures**.

**Target:** **13 varieties.**

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source |
|---|---|---|---|---|---|---|---|
| 1 | repeatingShapeNext [C] | Extend an AB/ABC shape pattern | Pattern: circle, square, circle, square, circle, ? — what comes next? | 1-3 | visual / `shapeSequence` **(new)** | conceptual | generator |
| 2 | repeatingCoreIdentify [C] | Name the repeating unit | Pattern: red, red, blue, red, red, blue. Which part repeats? | 1-3 | visual / `choice` | conceptual | generator |
| 3 | arithmeticNext [C] | Next term, constant add | Pattern: 4, 9, 14, 19, ? — what comes next? | 1-3 | sequence / `fillBlank` | procedural | generator |
| 4 | arithmeticBackwards [C] | Extend to the left | Pattern: ?, 11, 17, 23, 29 — what comes first? | 4-6 | sequence / `fillBlank` | procedural | generator |
| 5 | missingTerm [C] | Gap in the middle | Fill the gap: 6, 13, ?, 27. | 4-6 | sequence / `fillBlank` | procedural | generator |
| 6 | ruleIdentify [C] | State the rule, not the term | Pattern: 3, 12, 48, 192. What is the rule? | 4-6 | sequence / `choice` | conceptual | generator |
| 7 | applyGivenRule [C] | Build from a stated rule | Start at 5 and add 8 each time. What is the 4th number? | 4-6 | sequence / `fillBlank` | procedural | generator |
| 8 | geometricNext [C] | Next term, constant multiply | Pattern: 2, 6, 18, 54, ? — what comes next? | 7-10 | sequence / `fillBlank` | procedural | generator |
| 9 | subtractPattern [C] | Decreasing sequence | Pattern: 60, 53, 46, 39, ? — what comes next? | 4-6 | sequence / `fillBlank` | procedural | generator |
| 10 | findTheError [S §6, §4.10] | Spot the broken term | Ava wrote 5, 10, 15, 21, 25. Which number is wrong? | 7-10 | sequence / `choice` | conceptual | generator |
| 11 | growingShapePattern [C] | Figurate/growing pattern | Step 1 has 3 tiles, step 2 has 5, step 3 has 7. How many tiles in step 5? | 7-10 | visual / `numberPad` | conceptual | generator |
| 12 | patternFeature [C] | Reason about the sequence without extending it | Every number in the pattern 4, 8, 12, 16 is even. Will the 10th number be even too? | 7-10 | sequence / `choice` | conceptual | bank |
| 13 | patternInContext [C] | Genuine word problem — **the missing family** | Jonas saves $6 each week and starts with $10. How much has he saved after 4 weeks? | 4-6 | verbalContext / `numberPad` | application | bank |

Row 13 is the fix for the confirmed `chooseFamily()` bug: `patterns` currently has no application prompt at
all. Either build this row or stop writing `application` into `patterns` metadata.

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor generated | Example |
|---|---|---|---|
| `wrongStep` | Uses the difference between the wrong pair of terms | Apply a step of ±1 from the true step | 4, 9, 14, 19 → offer **23** (step 4) |
| `additiveForMultiplicative` | Treats a ×pattern as a +pattern | Last term + last difference | 2, 6, 18, 54 → offer **90** |
| `patternReset` | Restarts the sequence at the start value | The first term | 4, 9, 14, 19 → offer **4** |
| `repeatsLastTerm` | Copies the final visible term | Last term unchanged | 6, 13, ?, 27 → offer **13** |
| `backwardsAddsInstead` | Adds when extending leftwards | first + step instead of first − step | row 4 → offer **23** |
| `coreMiscounted` | Takes too few/many elements as the repeating unit | AB core on an ABB pattern | row 2 |
| `stepCountOffByOne` | Miscounts which term is "the 4th" | Value at term 3 or 5 | row 7 → offer **21** or **37** |

**Authoring load:** 2 varieties are `bank` (rows 12, 13) → at ×40 items/variety ≈ **80 authored items**; 11
varieties are `generator`. Row 10's find-the-error runs on a generated sequence, so it stays plain
`generator`.

---

## barModels — Bar Models!

**Today:** 2 shapes (`barPartWhole` with the right part unknown; `barCompare` with the bigger amount
unknown), 2 word-problem templates, 2 subskills. Per research §7, this covers **PT-TA/Addend Unknown +
Compare/Bigger-with-"more" only** — 2 of the 7 schemas in §3.2, and both at the easy end. Total item
universe ≈ **large numerically, 2 structurally.**

**Target:** **16 varieties.**

### A note on what this mode *is*

`barModels` is not a topic. It is a **representation** — Singapore's model method — that serves the other
modes. Every schema below names the modes it serves. Two organizing implications:

1. These schemas should be **callable from `addition`, `subtraction`, `multiplication`, `division`,
   `fractions`, and `barModels` alike**, with `barModels` being the mode that presents them *as* diagram
   work rather than as arithmetic.
2. The §3.2 insight that governs the whole catalog: **one diagram, several question forms.** Schema (b) is
   a single picture with three possible blanks (whole, left part, right part). Building the diagram once and
   moving the blank is where the variety comes from — not from new pictures.

All rows are **[S]**, from research §3.2 (a)–(g).

### Variety catalog

| # | Variety ID | Question form | Concrete example | Level band | Representation + answerType | Family | Source | Serves |
|---|---|---|---|---|---|---|---|---|
| 1 | partWholeTotalUnknown [S a] | Two parts shown, total blank | Aliya has 4 oranges. Alfie has 3 oranges. How many oranges are there altogether? | 1-3 | manipulative / `barModel` | conceptual | bank | addition |
| 2 | partWholePartUnknown [S b] | Whole and one part shown, other part blank | Austin has 18 lego bricks. He used 15 to build a car. How many are left? | 1-3 | manipulative / `barModel` | conceptual | bank | subtraction |
| 3 | partWholeFirstPartUnknown [S b] | Same diagram, *left* blank | A box holds 20 crayons. 12 are blue and the rest are red. How many are red? | 1-3 | manipulative / `barModel` | conceptual | bank | subtraction |
| 4 | partWholeThreeParts [S b ext.] | Three-segment bar, one blank | Nia read 8 pages on Monday, 6 on Tuesday, and some on Wednesday. She read 20 in all. How many on Wednesday? | 4-6 | manipulative / `barModel` | procedural | bank | addition |
| 5 | compareDifferenceUnknown [S c] | Two bars, overhang blank | Austin has 18 lego bricks. Lionel has 3. How many more does Austin have? | 4-6 | manipulative / `barModel` | conceptual | bank | subtraction |
| 6 | compareBiggerUnknownMore [S c] | Short bar + difference known; long bar blank ("more") | Ravi scored 24 points. Mia scored 9 more than Ravi. How many did Mia score? | 4-6 | manipulative / `barModel` | procedural | bank | addition |
| 7 | compareSmallerUnknownFewer [S c] | Long bar + difference known; short bar blank ("fewer") | Lionel has 15 fewer bricks than Austin, who has 18. How many does Lionel have? | 4-6 | manipulative / `barModel` | procedural | bank | subtraction |
| 8 | compareSmallerUnknownMore [S c + Table 1 hard tier] | **Language trap** — says "more", solved by subtracting | Mina has 7 more stickers than Theo. Mina has 22. How many does Theo have? | 7-10 | verbalContext / `barModel` | application | bank | subtraction |
| 9 | compareBiggerUnknownFewer [S c + Table 1 hard tier] | **Language trap** — says "fewer", solved by adding | Owen has 6 fewer marbles than Kaia. Owen has 14. How many does Kaia have? | 7-10 | verbalContext / `barModel` | application | bank | addition |
| 10 | multiplicativeTotalUnknown [S d] | n units of a known unit | Amy has 12 flowers. Bob has 3 times as many as Amy. How many flowers do they have altogether? | 7-10 | manipulative / `barModel` | procedural | bank | multiplication |
| 11 | multiplicativeUnitUnknown [S d inverse] | Total known, define the unit | Bob has 36 flowers, which is 3 times as many as Amy. How many does Amy have? | 7-10 | manipulative / `barModel` | procedural | bank | division |
| 12 | multiplicativeCompareFactor [S d, Table 2] | Both amounts known, factor blank | Priya has 30 beads and Luca has 6. How many times as many beads does Priya have? | 7-10 | manipulative / `barModel` | conceptual | bank | division |
| 13 | twoStepCompareThenTotal [S e] | Two chained schemas, no sub-question scaffold | There are 824 girls in the auditorium. There are 125 more girls than boys. How many children are there in all? | 7-10 | verbalContext / `barModel` | application | bank | addition, subtraction |
| 14 | fractionOfSetBar [S g] | Bar partitioned into d units, n shaded | 3/5 of the 20 trucks are painted red. How many trucks are red? | 4-6 | manipulative / `barModel` | procedural | bank | fractions |
| 15 | fractionOfSetRemainder [S g] | The remainder form | Lara read 2/5 of her book on Saturday and the other 90 pages on Sunday. How many pages are in the book? | 7-10 | verbalContext / `barModel` | application | bank | fractions |
| 16 | beforeAfterConstantDifference [S f] | Two-row before/after bars | Sam had $117 saved and Mina had $36. They each earned the same amount, and then Sam had twice as much as Mina. How much did each earn? | 7-10 | manipulative / `barModel` | application | bank | addition, subtraction |

Coverage against §3.2: (a) row 1 · (b) rows 2–4 · (c) rows 5–9 · (d) rows 10–12 · (e) row 13 · (f) row 16 ·
(g) rows 14–15. **All seven schemas covered.**

Row 13 respects the Progressions constraint quoted in the expansion plan §2 — a two-step problem should not
chain two *hard* subtypes. It chains Compare/Smaller (middle) with Part-Whole/Total (easy). Do not generate
a two-step item from rows 8 or 9.

### Misconceptions & distractors

| Tag | What the child does wrong | Distractor generated | Example |
|---|---|---|---|
| `keywordOperation` | Matches "more"→add, "fewer"→subtract without reading the structure | Apply the keyword operation | row 8 → offer **29** (22+7) |
| `compareDirection` | Solves for the wrong bar | The other bar's value | row 7 → offer **33** (18+15) |
| `partWholeSwap` | Treats the whole as a part | part + whole instead of whole − part | row 2 → offer **33** |
| `unitNotDefined` | On multiplicative bars, uses the total as one unit | total × n instead of total ÷ n | row 11 → offer **108** |
| `stopsAtStepOne` | Answers the intermediate value of a two-step problem | The step-1 result | row 13 → offer **699** (boys only) |
| `remainderIsWhole` | On fraction-of-set remainder, treats the given part as the total | The stated part | row 15 → offer **90** |
| `fractionUnitMiscount` | Divides by the numerator instead of the denominator | total ÷ n × d | row 14 → offer **33** |

**Authoring load:** 16 varieties are `bank` (all rows) → at ×40 items/variety ≈ **640 authored items**; 0
varieties are `generator`. `barModels` is a representation, not a symbol-manipulation mode: every row is a
narrative word problem wrapped around a diagram, so every row carries authored prose that must be reviewed.
The diagram is generated; the sentence is not. This makes `barModels` the single largest authoring
commitment in this spec.

---

## Cross-cutting: formats that apply to all five modes

Per the expansion plan §Phase 2, formats are **generator-side transforms and are never banked**. Each takes
a solved item from any catalog above and re-presents it. When the base item is a `bank` row, the transform
is sourced `generator (from bank item)` — it inherits prose that has already been reviewed, so no second
review is needed. When the base item is a `generator` row, the transform is plain `generator`. Building these five multiplies the catalogs rather
than adding to them.

| Format | Applied to | Example built from a catalog row |
|---|---|---|
| True/false [S §4.9] | any comparison or equation row | "3/8 + 2/8 = 5/16. True or false?" (from fractions #14) |
| Odd one out [S §4.6] | any classification row | "Which is not equal to 1/2: 2/4, 3/6, 4/6, 5/10?" |
| Error analysis [S §4.10] | any row with a misconception tag | already instantiated as fractions #18, decimals #14, patterns #10 |
| Multi-select [S §6] | any row with several correct answers | "Select every fraction greater than 1/2: 3/5, 2/6, 5/8, 1/4" |
| Open Middle [S §4.8] | fractions, decimals, factorsMultiples, patterns | "Using the digits 0 to 5 at most one time each, place a digit to create five fractions and place them all on a number line with the correct order and spacing." (verbatim G3 item, §4.8) |

The Open Middle canonical stem is fully specified in §4.8 as
`(digit_pool, reuse_policy, expression_skeleton, objective)` and is the cheapest large win here — but it
needs the `digitPlace` widget.

---

## Notes — reviewer decisions required

**D1. Standards claim.** Of the 73 varieties in this spec, **16 are [S]** (all of `barModels`, plus the
error-analysis / odd-one-out / Open Middle format rows). **57 are [C]** — our own reasoning. If any
user-facing copy, app-store text, or funder material says "aligned to 3.NF/4.NF problem types," that claim
is not currently supported. Either accept the spec as reasoned-not-sourced, or commission the NF
Progressions research pass the expansion plan §Phase 3 already budgets for. **This is the most important
decision on the page.**

**D2. Six new widgets.** `numberLine`, `multiSelect`, `areaModel`, `orderStrip`, `digitPlace`,
`shapeSequence`. `numberLine` and `multiSelect` are load-bearing — 6 and 4 varieties respectively depend on
them, and `numberLine` is the fraction-as-a-number concept, which cannot be expressed any other way. The
other four are deferrable. Cutting all six removes **14 varieties** (73 → 59). Reviewer should approve a
subset, not all-or-nothing.

**D3. `barModels` as a shared service.** This spec treats bar-model schemas as callable by six other modes.
That is an architectural commitment (a `src/modes/representations/barSchemas.js` sitting beside the planned
`structures/` directory), not just content. If `barModels` stays a standalone mode, rows 1–16 still work but
the other modes gain nothing, and the CPA discipline the expansion plan §Axis 3 asks for is not achieved.

**D4. `patterns` application family.** `chooseFamily()` currently writes `application` into metadata for an
item that renders identically to a procedural one. Either build row 13 or delete the family tag. Same
confirmed bug exists in `dataGraphs` and `linesShapes` — out of scope here but the same fix.

**D5. Level-band placement is judgment, not standards.** The bands assigned above (e.g. fraction-on-a-
number-line at 4-6, mixed/improper at 7-10) come from ordinary curricular sequencing, not from a retrieved
source. A reviewer with classroom experience should sanity-check the column; nothing else in the spec
depends on it being exactly right.

**D6. Subskill vs variety.** The expansion plan §Phase 5 decides `structureType` replaces `subskill` for the
four operation modes. These five modes have no Table 1/2 analogue, so they keep `subskill`. Open question:
do the variety IDs above **become** the subskill list (turning `fractions` from 4 subskills into 18), or do
they sit under the existing 4 as a new `varietyId` field? Bank cell count depends entirely on this —
option A gives fractions 18 × 3 bands = 54 cells; option B keeps it at 12. **Recommend option B**
(`varietyId` as a new field, subskills unchanged) to keep the bank tractable, consistent with the plan's
combinatorial-trap warning.

**D7. Not covered here.** Fraction addition with *unlike* denominators, fraction × whole number, decimal
addition/subtraction, and prime factorization are all absent — deliberately, as they sit at Grade 5 and
above and this app targets K-4. Confirm that boundary is where the reviewer wants it.

---

## Authoring load summary

At the working floor of **40 authored items per `bank` variety** (see §Sourcing model), across the 73
varieties in this spec:

| Mode | bank varieties | generator varieties | Authored items needed @40 |
|---|---|---|---|
| fractions | 6 | 12 | 240 |
| decimals | 3 | 11 | 120 |
| factorsMultiples | 1 | 11 | 40 |
| patterns | 2 | 11 | 80 |
| barModels | 16 | 0 | 640 |
| **Total** | **28** | **45** | **1,120** |

`barModels` is 57% of the authoring bill on its own, because it is the one mode where every variety is a
narrative word problem. The four symbolic modes together need 480 items. If the review budget will not
carry 1,120 items, the lever is variety count or the per-variety floor — not templating, which is rejected.
