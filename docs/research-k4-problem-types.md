# K-4 Math Problem-Type Research — Salvaged Report

> **Provenance of this document.** This report was reconstructed from the JSONL transcripts of a research
> agent and its three sub-agents that were stopped before writing a final report. **No new research was
> performed during reconstruction.** Everything below was actually retrieved by those agents from the
> cited URLs. Anything the transcripts did *not* cover is marked **[GAP]** rather than filled in.
>
> Two labels are used throughout, inherited from the original researchers:
> - **[S]** — verbatim from the cited source.
> - **[C]** — *constructed* by the researcher to match a sourced format spec. Not from the source.
>   Treat [C] examples as illustrative, not authoritative.
>
> Source transcripts:
> `a6da807f749f3409c` (parent — CCSS Tables 1 & 2, codebase gap analysis),
> `a2248f3cbd1f28359` (Singapore / Math in Focus),
> `a80f0a821729bec98` (non-standard problem formats),
> `a5f50fc68cbfce992` (rigor & cognitive demand),
> `a076640595d796c37` (codebase audit).

---

## Provenance note on Tables 1 and 2

Tables 1 and 2 below are reproduced from the **Massachusetts DESE Quick Reference Guides (Jan 2018)**,
which reprint CCSS Tables 1 and 2 verbatim, cross-checked against the **Idaho SDE CGI Problem Types
chart** (identical wording) and the **official CCSS-M OA Progressions document** (K–5 Counting &
Cardinality / Operations & Algebraic Thinking, draft 5/29/2011), which supplies the grade-level mastery
designations.

**`corestandards.org` returned HTTP 403 to automated fetch** — the canonical Table-1 and Table-2 pages
were *not* directly retrieved. The MA DESE PDFs also initially returned unreadable binary and had to be
recovered with `pdftotext`. The text below is from those faithful reprints, not the primary page.

All three trace to *Mathematics Learning in Early Childhood*, NRC (2009), Box 2-4, pp. 32–33, and to
Carpenter, Fennema, Franke, Levi & Empson, *Children's Mathematics: Cognitively Guided Instruction*
(Heinemann, 1999).

---

## 1. CCSS Table 1 — Addition & Subtraction Situations

### On the "14" count

The grid has **12 cells**, not 14. The commonly cited counts arise as follows:

- **11 one-unknown subtypes** — Add To ×3, Take From ×3, Put Together/Take Apart ×2 (Total, Addend),
  Compare ×3. *Both Addends Unknown is explicitly **not** a one-unknown subtype* (OA Progressions
  footnote 1: "a productive variation with two unknowns").
- **+2** if you count the two language variants of Compare/Bigger Unknown and Compare/Smaller
  Unknown → **13**
- **+1** if you also count both versions of Difference Unknown ("how many more?" / "how many
  fewer?") → **14**
- **15** counting all Compare language variants plus Both Addends Unknown as its own item.

Cleanest framing for a generator: **6 non-Compare structures + 6 Compare structures (3 columns × 2
language versions) + Both Addends Unknown = 13 one-unknown + 1 two-unknown = 14 generable templates.**
That is the "14."

### The grid (verbatim)

#### Change situations — Add To / Take From

| | Result Unknown | Change Unknown | Start Unknown |
|---|---|---|---|
| **Add To** | Two bunnies sat on the grass. Three more bunnies hopped there. How many bunnies are on the grass now? `2 + 3 = ?` | Two bunnies were sitting on the grass. Some more bunnies hopped there. Then there were five bunnies. How many bunnies hopped over to the first two? `2 + ? = 5` | Some bunnies were sitting on the grass. Three more bunnies hopped there. Then there were five bunnies. How many bunnies were on the grass before? `? + 3 = 5` |
| **Take From** | Five apples were on the table. I ate two apples. How many apples are on the table now? `5 – 2 = ?` | Five apples were on the table. I ate some apples. Then there were three apples. How many apples did I eat? `5 – ? = 3` | Some apples were on the table. I ate two apples. Then there were three apples. How many apples were on the table before? `? – 2 = 3` |

#### Put Together / Take Apart

| | Total Unknown | Addend Unknown | Both Addends Unknown |
|---|---|---|---|
| **Put Together / Take Apart** | Three red apples and two green apples are on the table. How many apples are on the table? `3 + 2 = ?` | Five apples are on the table. Three are red and the rest are green. How many apples are green? `3 + ? = 5`, `5 – 3 = ?` | Grandma has five flowers. How many can she put in her red vase and how many in her blue vase? `5 = 0+5, 5 = 5+0, 5 = 1+4, 5 = 4+1, 5 = 2+3, 5 = 3+2` |

#### Compare

| | Difference Unknown | Bigger Unknown | Smaller Unknown |
|---|---|---|---|
| **Compare** | *("How many more?" version):* Lucy has two apples. Julie has five apples. How many more apples does Julie have than Lucy?<br>*("How many fewer?" version):* Lucy has two apples. Julie has five apples. How many fewer apples does Lucy have than Julie?<br>`2 + ? = 5`, `5 – 2 = ?` | *(Version with "more"):* Julie has three more apples than Lucy. Lucy has two apples. How many apples does Julie have?<br>*(Version with "fewer"):* Lucy has 3 fewer apples than Julie. Lucy has two apples. How many apples does Julie have?<br>`2 + 3 = ?`, `3 + 2 = ?` | *(Version with "more"):* Julie has three more apples than Lucy. Julie has five apples. How many apples does Lucy have?<br>*(Version with "fewer"):* Lucy has three fewer apples than Julie. Julie has five apples. How many apples does Lucy have?<br>`5 – 3 = ?`, `? + 3 = 5` |

### Official footnotes (verbatim)

1. *(Both Addends Unknown)* "These take apart situations can be used to show all the decompositions of
   a given number. The associated equations, which have the total on the left of the equal sign, help
   children understand that the = sign does not always mean *makes* or *results in* but always does
   mean *is the same number as*." Per OA Progressions: "Such problems are not a problem subtype with one
   unknown… These problems are a productive variation with two unknowns."
2. *(Addend Unknown)* "Either addend can be unknown, so there are three variations of these problem
   situations. Both Addends Unknown is a productive extension… especially for small numbers less than
   or equal to 10."
3. *(Compare)* "For the Bigger Unknown or Smaller Unknown situations, one version directs the correct
   operation (the version using *more* for the bigger unknown and using *less* for the smaller
   unknown). **The other versions are more difficult.**"

### Grade-by-grade expectation

From the **OA Progressions**, "Table 2: Addition and subtraction situations by grade level," legend verbatim:

> "Darker shading indicates the four Kindergarten problem subtypes. Grade 1 and 2 students work with all
> subtypes and variants. Unshaded (white) problems are the four difficult subtypes or variants that
> students should work with in Grade 1 but need not master until Grade 2."

**Kindergarten — exactly 4 subtypes, within 10** (OA Progressions, "Summary of K–2"):

1. Add To / Result Unknown
2. Take From / Result Unknown
3. Put Together-Take Apart / Total Unknown
4. Put Together-Take Apart / Both Addends Unknown

Solved by **Level 1 (direct modeling / count all)** methods. Equations encouraged but not required.

**Grade 1 — all subtypes and variants**, single-digit addends and related subtractions. Level 2
(counting on) as the general method; Level 3 (make-a-ten, derived facts) introduced.
**The four subtypes G1 works with but need NOT master:**

1. Add To / Start Unknown
2. Take From / Start Unknown
3. Compare / Bigger Unknown with **"fewer"** language (misleading language suggesting wrong operation)
4. Compare / Smaller Unknown with **"more"** language (misleading language suggesting wrong operation)

**Grade 2 — masters all subtypes and all language variants**, within 100. Adds **two-step problems**,
with an explicit constraint: "two-step problems should not involve these [most difficult] subtypes. Most
work with two-step problems should involve single-digit addends."

### Difficulty tiers (directly generator-usable)

- **Easy** (Level 1-solvable, K): Add To/Result, Take From/Result, PT-TA/Total, PT-TA/Both Addends
- **Middle difficulty** (Level 2, counting-on solvable, G1): Add To/Change Unknown, PT-TA/Addend
  Unknown, Compare/Difference Unknown, Take From/Change Unknown
- **Difficult** (G1 exposure, G2 mastery): Add To/Start, Take From/Start, Compare/Bigger with "fewer",
  Compare/Smaller with "more"

The defining feature of the hard tier: **the situation equation is opposite to the solution operation.**
"Add To / Start Unknown" reads as addition (`? + 3 = 5`) but is solved by subtraction.

### Grade 2 two-step examples (verbatim from Progressions)

- *Two easy subtypes, same operation* (`9 + 5 + 7`): "There were 9 blue balls and 5 red balls in the
  bag. Aki put in 7 more balls. How many balls are in the bag altogether?"
- *Two easy subtypes, opposite operations* (`9 – 5 + 7`): "There were 9 carrots on the plate. The girls
  ate 5 carrots. Mother put 7 more carrots on the plate. How many carrots are there now?"
- *One easy + one middle difficulty:* "Maria has 9 apples. Corey has 4 fewer apples than Maria. How many
  apples do they have in all?"
- *One easy + one middle difficulty:* "The zoo had 7 cows and some horses in the big pen. There were 15
  animals in the big pen. Then 4 more horses ran into the big pen. How many horses are there now?"
- *Two middle difficulty subtypes:* "There were 9 boys and some girls in the park. In all, 15 children
  were in the park. Then some more girls came. Now there are 14 girls in the park. How many more girls
  came to the park?"

**Sources:**
[MA DESE — Common Addition and Subtraction Situations (Jan 2018)](https://www.doe.mass.edu/frameworks/math/2017-06qrg-common-add-sub.pdf) ·
[CCSS-M Progressions: K–5 CC & OA](https://www.isbe.net/Documents/counting-cardinality-k-5.pdf) ·
[Idaho SDE — Cognitively Guided Problem Types](https://www.sde.idaho.gov/wp-content/uploads/2025/09/Cognitively-Guided-Problem-Types.pdf) ·
[Wikipedia — Cognitively Guided Instruction](https://en.wikipedia.org/wiki/Cognitively_Guided_Instruction)

---

## 2. CCSS Table 2 — Multiplication & Division Situations

**9 core cells** (3 rows × 3 columns) + a General row. Column equations are constant across all rows.

| | **Unknown Product**<br>`3 × 6 = ?` | **Group Size Unknown**<br>("How many in each group?" Division)<br>`3 × ? = 18`, `18 ÷ 3 = ?` | **Number of Groups Unknown**<br>("How many groups?" Division)<br>`? × 6 = 18`, `18 ÷ 6 = ?` |
|---|---|---|---|
| **Equal Groups** | There are 3 bags with 6 plums in each bag. How many plums are there in all?<br><br>*Measurement example.* You need 3 lengths of string, each 6 inches long. How much string will you need altogether? | If 18 plums are shared equally into 3 bags, then how many plums will be in each bag?<br><br>*Measurement example.* You have 18 inches of string, which you will cut into 3 equal pieces. How long will each piece of string be? | If 18 plums are to be packed 6 to a bag, then how many bags are needed?<br><br>*Measurement example.* You have 18 inches of string, which you will cut into pieces that are 6 inches long. How many pieces of string will you have? |
| **Arrays, Area** | There are 3 rows of apples with 6 apples in each row. How many apples are there?<br><br>*Area example.* What is the area of a 3 cm by 6 cm rectangle? | If 18 apples are arranged into 3 equal rows, how many apples will be in each row?<br><br>*Area example.* A rectangle has area 18 square centimeters. If one side is 3 cm long, how long is a side next to it? | If 18 apples are arranged into equal rows of 6 apples, how many rows will there be?<br><br>*Area example.* A rectangle has area 18 square centimeters. If one side is 6 cm long, how long is a side next to it? |
| **Compare** | A blue hat costs $6. A red hat costs 3 times as much as the blue hat. How much does the red hat cost?<br><br>*Measurement example.* A rubber band is 6 cm long. How long will the rubber band be when it is stretched to be 3 times as long? | A red hat costs $18 and that is 3 times as much as a blue hat costs. How much does a blue hat cost?<br><br>*Measurement example.* A rubber band is stretched to be 18 cm long and that is 3 times as long as it was at first. How long was the rubber band at first? | A red hat costs $18 and a blue hat costs $6. How many times as much does the red hat cost as the blue hat?<br><br>*Measurement example.* A rubber band was 6 cm long at first. Now it is stretched to be 18 cm long. How many times as long is the rubber band now as it was at first? |
| **General** | `a × b = ?` | `a × ? = p`, `p ÷ a = ?` | `? × b = p`, `p ÷ b = ?` |

### Official footnotes (verbatim)

- "The first examples in each cell are examples of **discrete** things. These are easier for students and
  should be given **before** the measurement examples."
- "The language in the array examples shows the **easiest** form of array problems. A **harder** form is
  to use the terms *rows and columns*: *The apples in the grocery window are in 3 rows and 6 columns.
  How many apples are in there?* **Both forms are valuable.**"
- "Area involves arrays of squares that have been pushed together so that there are no gaps or overlaps,
  so array problems include these especially important measurement situations."

### Grade expectation

- **Grade 2** — informal precursor only: pairing/grouping objects in arrays, odd/even, repeated
  addition (2.OA.C).
- **Grade 3 (3.OA.A.3)** — **rows 1 and 2 only** (Equal Groups, Arrays/Area), within 100, using a
  variable for the unknown. Partitive division ("shared equally into 3 bags") is typically taught before
  quotitive/measurement ("packed 6 to a bag").
- **Grade 4 (4.OA.A.1, 4.OA.A.2)** — **the Compare row**, where students must distinguish *multiplicative*
  from *additive* comparison. Also 4.OA.A.3, multi-step problems with all four operations.
- Difficulty ordering (Progressions): Unknown Product easiest; Group Size Unknown and Number of Groups
  Unknown harder.

### CGI extension beyond CCSS Table 2

CGI (per the Rogers Public Schools chart, adapted from *Children's Mathematics*) adds two structures CCSS
folds into "Equal Groups" but which read very differently to a child:

| Structure | Multiplication | Measurement Division | Partitive Division |
|---|---|---|---|
| **Rate** | Susan runs 4 miles an hour. How many miles does she run in 6 hours? | Susan runs 4 miles an hour. How many hours will it take her to run 24 miles? | Susan runs 24 miles. It took her 6 hours. If she runs the same speed the whole way, how far did she run in one hour? |
| **Price** | Cakes cost 7 dollars each. How much do 5 cakes cost? | Cakes cost 7 dollars each. How many cakes can you buy for $35? | Jake bought 5 cakes. He spent a total of $35. If each cake cost the same amount, how much did one cake cost? |

**Cartesian product / combinations** — Greer's (1992) fourth class (equal groups, multiplicative
comparison, rectangular array, Cartesian product), absent from CCSS Table 2:
*"Jess has 3 skirts and 4 shirts. How many different outfits can she wear?"*
It is **symmetric** (both quantities treated alike) and, unlike equal groups, is not reducible to
repeated addition — a genuinely distinct generable type.

**Sources:**
[MA DESE — Common Multiplication and Division Situations (Jan 2018)](https://www.doe.mass.edu/frameworks/math/2017-06qrg-common-mult-divide.pdf) ·
[CGI Multiplication and Division Problem Types (Rogers PS)](https://cloud.rpsar.net/edocs/math/ProblemSolvingResources/CGI%20Multiplication%20and%20division%20Problem%20Types.pdf)

---

## 3. Math in Focus / Singapore

### 3.1 CPA progression (Concrete → Pictorial → Abstract)

Rooted in Bruner (enactive/iconic/symbolic). Singapore's MOE and MiF both scaffold **every** new skill
through all three stages rather than jumping to the algorithm.

**Worked example — 2-digit addition with regrouping, 27 + 15:**

| Stage | What the student does |
|---|---|
| **Concrete** | Builds 27 with 2 ten-rods + 7 unit cubes (or 2 orange "10" discs + 7 white "1" discs) and 15 similarly. Combines ones: 7 + 5 = 12 ones → physically **trades 10 ones for 1 ten disc** and moves it into the tens column. Result: 4 tens + 2 ones. |
| **Pictorial** | Draws sticks for tens and dots for ones (or draws the discs on a place-value chart), circles ten dots, and draws an arrow moving a new stick into the tens column. |
| **Abstract** | Writes vertical algorithm, "carries" the 1 above the tens column: 27 + 15 = 42. |

**Division example (MiF Gr 3-4), 72 ÷ 3:** Concrete = 7 ten-discs + 2 one-discs distributed into 3 boxes;
one ten can't be shared, so it is **traded for 10 ones** (12 ones ÷ 3 = 4). Pictorial = same on a drawn
place-value chart. Abstract = long-division notation.

**Digital representation of the pictorial stage:**

- Draggable **place-value discs on a labeled chart** with a "regroup" gesture: select 10 ones → they fuse
  into one ten and animate into the next column. Covers addition, subtraction, multiplication and
  division regrouping.
- **Ten-frames** and **number-bond diagrams** (circle-and-branch) with tappable blanks.
- **Bar models** built from resizable, snappable unit rectangles with labels and a `?` brace.
- **Number lines** (open number line for compensation/counting-on strategies).
- Key point: pictorial is *not* a picture of the story (3 apples clipart) — it is a **structural diagram
  of the mathematical relationship**. The Singaporean-vs-Spanish textbook study found Singapore textbooks
  carry a far larger proportion of illustrations reflecting the *semantic-mathematical structure* of the
  problem, not decorative context art.

**Sources:** [Frontiers in Education 2019 — Singapore textbook in England](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2019.00037/full) ·
[Third Space — CPA approach](https://thirdspacelearning.com/blog/concrete-pictorial-abstract-maths-cpa/)

### 3.2 Bar modeling

The "model method" was developed at Singapore's Curriculum Development Institute (CDIS) by a team led by
**Dr Kho Tek Hong** (papers 1982, 1987; *Singapore Model Method for Learning Mathematics*,
Kho/Yeo/Lim/Seah). Purpose: let primary pupils solve problems that previously required secondary-school
algebra. Two base schemas — **part-whole** and **comparison** — everything else is a composition.

**(a) Part-whole, addition (whole unknown) — Gr 1-2**
*"Aliya has 4 oranges. Alfie has 3 oranges. How many oranges are there altogether?"*
```
|<---------- ? ---------->|
+------------+------------+
|     4      |     3      |
+------------+------------+
```

**(b) Part-whole, subtraction / missing part — Gr 1-2**
*"Austin has 18 lego bricks. He used 15 to build a car. How many are left?"*
```
|<----------- 18 ----------->|
+------------------+---------+
|        15        |    ?    |
+------------------+---------+
```
Same diagram, different blank. **One schema, three question forms** (whole ?, left part ?, right part ?).

**(c) Comparison, "how many more" — Gr 2**
*"Austin has 18 lego bricks. Lionel has 3. How many more does Austin have?"*
```
Austin  +------------------------+
        |          18            |
        +------------------------+
Lionel  +----+~~~~~~~~~~~~~~~~~~~+
        | 3  |        ?          |
        +----+~~~~~~~~~~~~~~~~~~~+
              <---difference--->
```
Bars **left-aligned**, difference marked on the overhang. Inverts to: *"Lionel has 15 fewer than Austin,
who has 18. How many does Lionel have?"* — same picture, unknown moved to the short bar.

**(d) Comparison, multiplicative "3 times as many" — Gr 3**
*"Amy has 12 flowers. Bob has 3 times as many flowers as Amy. How many flowers do they have altogether?"*
```
Amy  +------+                       1 unit = 12
     |  12  |
     +------+
Bob  +------+------+------+          3 units
     |      |      |      |
     +------+------+------+
Total = 4 units = 48
```
The inverse ("Bob has 36, which is 3× Amy's; how many does Amy have?") is the *same diagram* with the
unit unknown — the "define a unit" move that makes the model algebraic.

**(e) Two-step — Gr 2-3**
*"There are 824 girls in the auditorium. There are 125 more girls than boys. How many children are there in all?"*
```
Girls +--------------------------+
      |           824            |
      +--------------------------+
Boys  +--------------------+-----+
      |          ?         | 125 |
      +--------------------+-----+
Step 1: 824 - 125 = 699 (boys)      [comparison]
Step 2: 824 + 699 = 1523 (total)    [part-whole]
```
Note there is **no (a)/(b) sub-question scaffold** — the two steps must be discovered.

**(f) Before-after — Gr 4-5**
*"Mary had saved $117; her sister Suzanne had saved $36. After they each earned the same amount washing
dishes, Mary had twice as much as Suzanne. How much did they earn in total?"*
```
BEFORE   Mary  +-----117-----+
         Suz   +--36--+

AFTER    Mary  +-----117-----+--x--+   = 2 units
         Suz   +--36--+--x--+          = 1 unit
1 unit = 117 - 36 = 81  ->  x = 81 - 36 = 45  ->  total = $90
```
Two organizing invariants to generate against: **constant difference** (both change by the same amount)
and **constant total** (one gives to the other). Classic P4-P5 item: *"Raju had 3 times as much money as
Gopal. After Raju spent $60 and Gopal spent $10, they had equal amounts."*

**(g) Fraction-of-a-set — Gr 3 (pictorial) → Gr 4 (bar model)**
*"3/5 of the 20 trucks are painted red. How many trucks are red?"*
```
|<----------------- 20 ----------------->|
+--------+--------+--------+--------+--------+
|   4    |   4    |   4    |   4    |   4    |
+--------+--------+--------+--------+--------+
 <------- 3/5 = 12 ------->
```
1 unit = 20 ÷ 5 = 4; 3 units = 12. Inverse form: *"3/5 of the trucks are red; 12 are red; how many trucks
in all?"* Also the "remainder" form: *"Lara read 2/5 of her book on Saturday and the other 90 pages on
Sunday. How many pages in the book?"* → 3 units = 90, 1 unit = 30, 5 units = 150.

**Grade introduction:**
- **Gr 1**: concrete objects lined up → counters → discrete pictorial; number bonds do the part-whole work.
- **Gr 2**: formal part-whole bars and comparison bars for +/− within 100 then 1,000; two-step problems appear.
- **Gr 3**: multiplication/division bars ("times as many"), unit-based reasoning; MiF Gr 3 has a dedicated
  **Chapter 7: Word Problems** using "strip models."
- **Gr 4-5**: fraction-of-a-set, remainder, before-after, complex multi-step segmented bars.
- **Gr 5-6**: ratio, percentage, bars used to solve linear equations (`2a + 7 = a + 11`).

Discrepancy worth knowing: the *original* Singapore Primary Mathematics texts introduce formal model
drawing in **3A**; US adaptations (MiF, Maths — No Problem) push simple bars into **Grade 2**.

**Sources:** [Third Space — Ultimate guide to the bar model](https://thirdspacelearning.com/us/blog/teach-bar-model-method/) ·
[TeachableMath — Bar Models](https://teachablemath.com/bar-models/) ·
[TeachableMath — Fraction of a Set](https://teachablemath.com/fraction-of-a-set/) ·
[Singapore Math Plus — before-and-after problem](https://singaporemathplus.net/a-before-and-after-singapore-math-problem/) ·
[MOE/Marshall Cavendish official Model Method text](https://people.math.harvard.edu/~engelwar/MathS305/Singapore%20Model%20Method%20Text.pdf) ·
[Yan Kow Cheong — The Model Method in Singapore (TME)](https://math.nie.edu.sg/ame/matheduc/tme/tmeV6_2/05-Yan%20KC%20Final%20version.pdf) ·
[Greenwich Schools — Model Drawing](https://www.greenwichschools.org/uploaded/district/curriculum/alp/ModelDrawing.pdf) ·
[Riverside Primary — Bar Modelling Whole School Progression](https://riversideprimary.co.uk/wp-content/uploads/2024/02/Bar-Modelling-Whole-School-Progression.pdf)

### 3.3 Number bonds

A circle-and-branch part-part-whole diagram — the pre-bar-model schema. One bond generates a fact family
of four sentences.

| Format | Example | Notes |
|---|---|---|
| Whole unknown | parts 5 and 2 → whole ? | trivially addition |
| Part unknown | whole 7, part 4 → other part ? | *subtraction taught as missing addend* |
| Both parts unknown (open decomposition) | "Show 3 different ways to make 8" | multiple correct answers — needs a set-validating checker, not a single-value check |
| Fact-family generation | given bond (4,3,7) write 4+3=7, 3+4=7, 7−4=3, 7−3=4 | |
| Three-part bond | 10 = 5 + 3 + 2 | adding three 1-digit numbers, Gr 2-3 |
| Bond as a *strategy tool* | "make ten": 7 + 6 → split 6 into **3 and 3** via a bond drawn *under* the 6 → 7+3=10, 10+3=13 | bond embedded inside a larger computation |
| Place-value bond | 562 → 500 + 60 + 2; or 84 → 7 tens + 14 ones | non-canonical decompositions essential for regrouping |
| Larger-magnitude bonds | 100 = 40 + 60; 1000 = 250 + 750 | Gr 2-4 |

**Grade progression:** K — bonds to 5/10 with counters. Gr 1 — bonds to 10, then to 20; fact families;
doubles & doubles-plus-one. MiF Gr 1 Ch. 8 "Ways to Add" explicitly practices **[S]** *"Double 2 means to
add ___ more to 2"*, *"3 + 4 is double ___ plus ___"*, *"7 + 6 = ___ ; I know 6 + 6 = 12"*. Gr 2 — bonds
to 100, three-part bonds, bonds used for compensation. Gr 3-4 — bonds to 1,000 and place-value
decomposition feeding mental strategies (`562 + 7 = (500+60) + (2+7)`).

MiF **flips the direction**: a bond exercise is not just "split 7 freely" but "here is the whole 7 and one
part 4 — find the other," structurally identical to a missing-addend subtraction and to the part-whole bar
model. **Which node is blank should be a first-class generator parameter.**

**Sources:** [MiF Gr 1 Ch 8 Practice 3 "Ways to Add" answer key](https://mathinfocusanswerkey.com/math-in-focus-grade-1-chapter-8-practice-3-answer-key/) ·
[Great Minds — The Number Bond: A K-5 Model](https://greatminds.org/math/blog/eureka/the-number-bond-a-k-5-model-that-fosters-number-sense)

### 3.4 Place-value discs / chips

Colour-coded discs (white=1, red=10, orange=100, yellow=1000) on a **place-value chart**. Unlike base-ten
blocks, discs are all the *same size* — the value is symbolic, deliberately one notch more abstract, and
extends to thousands and decimals without physically absurd manipulatives.

- **Addition with regrouping (268 + 47):** build both numbers → combine ones (8+7=15) → **trade 10 ones
  for 1 ten** → combine tens (6+4+1=11) → trade 10 tens for 1 hundred → 315. The trade *is* the carry.
- **Subtraction with regrouping (300 − 148):** can't take 8 from 0 ones → trade 1 hundred for 10 tens,
  then 1 ten for 10 ones → chart shows 2 hundreds, 9 tens, 10 ones → subtract. Makes "subtracting across
  zeros" (an explicit MiF Gr 2/3 lesson) visible.
- **Multiplication (4 × 24, 3 × 122):** lay out 2 tens + 4 ones, repeat 4 times → 8 tens + 16 ones →
  trade → 96. Extends to area-model/partial-products.
- **Division (72 ÷ 3):** dividend as discs on top, divisor as *empty boxes* below; deal discs from the
  largest place down; leftover tens are **traded down** to ones. Remainders become visible as
  undistributable discs.

**Question formats this affords:**
- "Which chart shows 405?" / "Write the number the discs show."
- "Drag discs to make 236 on the chart."
- "Regroup: 84 = 7 tens and ___ ones" / "= 6 tens and ___ ones" (renaming, non-canonical)
- "Do you need to regroup to compute 45 + 38? Where?" (predict-before-compute)
- Show a mid-computation chart with 15 ones in the ones column: "What must you do next?"
- Division: "Deal these discs into 4 boxes. What's in each box? What's left over?"
- Missing-digit puzzles derived from the disc picture (MiF Gr 3/4 have explicit *"Addition up to four
  digits — fill in missing digits"* and *"Subtraction: find missing digits"* skills).

**Sources:** [SIS4Teachers — Using place value discs](https://sis4teachers.org/2022/01/using-place-value-discs-in-the-math-classroom/) ·
[TeachableMath — Division: remainder and regrouping](https://teachablemath.com/division-remainder-and-regrouping/)

### 3.5 What makes a Singapore problem structurally different

1. **Unknowns in non-final positions.** US worksheets over-index on *result-unknown*. Singapore
   systematically includes *change-unknown* and *start-unknown*. Research shows the ability to identify
   the unknown's semantic role longitudinally predicts problem-solving performance. **Unknown position is
   a parameter, not an accident.**
2. **Inconsistent / non-cueing language.** "Alan has 5 fewer marbles than Ben. Alan has 12. How many does
   Ben have?" — "fewer" cues subtraction but the answer requires addition. Keyword-matching fails; the bar
   model succeeds.
3. **Multi-step with no scaffolding.** No "(a) first find the number of boys. (b) then find the total."
   MiF Gr 2 already has two-step word problems; Gr 3 has a whole "Word Problems" chapter.
4. **Comparison and before-after structures**, largely absent from typical US primary worksheets, making
   relations (difference, multiple, ratio) the object of reasoning.
5. **Systematic variation instead of random drill.** A page is a *designed sequence*.
6. **Non-routine problems as a standing feature.** Every MiF chapter closes with **"Put on Your Thinking
   Cap!"** — requiring heuristics (guess-and-check, work backwards, systematic listing, look for a
   pattern, simplify the problem, before-after) rather than the chapter's procedure. Expected of *all*
   students, not enrichment.
7. **Deliberately large/awkward numbers at times**, so naive drawing or counting breaks down.
8. **Fewer topics, greater depth, no annual re-teaching** — mastery pacing.
9. **Math Journal / explanation items**: "Explain why…", "Find the mistake and correct it", "Which method
   is better and why?" — answer is prose or a diagram, not a number.

**Caveat found in the literature:** the Singapore P2 textbook analysis reported an
**under-representation of *change* structures** relative to combine/compare — a gap a generator could
deliberately fill.

**Sources:** [Educational Studies in Mathematics — Singaporean vs Spanish textbooks](https://link.springer.com/article/10.1007/s10649-022-10169-x) ·
[Contemporary Maths & Science Ed — semantic structures in Singapore P2 textbooks](https://www.conmaths.com/article/an-analysis-of-semantic-structures-of-addition-and-subtraction-word-problems-used-in-primary-two-14690)

### 3.6 Problem variety within addition, MiF Grades 1-4

> Verified against **IXL's official MiF 2020 skill-plan alignments** (lesson-level) and MiF chapter pages.
> **[GAP]** — these are *skill lists*, not textbook pages. The actual MiF student-book problem wording was
> not retrieved (archive.org copy and HMH sampler did not yield item-level text). Treat this as a
> topic inventory, not a verbatim problem inventory.

**Grade 1** (19 chapters; addition spread across several)
- Composing/decomposing to 10 and 20 (number bonds)
- **Counting on** from the larger number
- **Make ten** with ten-frames
- **Doubles** and **doubles-plus-one**
- Number-bond diagram fill-ins (whole ?, part ?)
- Fact families / relating addition and subtraction
- Addition sentences with **unknown addend** (`5 + ___ = 9`)
- Word problems: put-together, add-to, and **comparison** ("how many more")
- Numbers to 40/120: two-digit addition with and without regrouping
- Equal groups (multiplication foundation)

**Grade 2** (Ch 2 Addition, Ch 3 Subtraction, Ch 4 mixed)
- Add 1-digit to 2-digit; 2-digit to 2-digit **without** regrouping (place-value method)
- 2-digit **with** regrouping (ones→tens)
- **Compensation** strategy and **number-line** addition (e.g. 38 + 25 → 40 + 23)
- 3-digit addition without / with regrouping (ones, tens, both)
- Adding **three** 3-digit numbers
- Complete-the-sentence / missing-addend
- Word problems within 100 then 1,000
- **Comparison word problems**, **two-step word problems** (Ch 4)
- Bar models: part-whole and comparison
- Put on Your Thinking Cap!

**Grade 3** (Ch 2 Addition)
- Add three or more 1-digit numbers
- Even/odd **addition patterns** ("odd + odd = ?")
- **Compensation** to add, sums to 200
- Add 2-digit numbers, sums to 200; use models to add 2-digit numbers
- Add up to 3-digit **without** then **with** regrouping; models for 3-digit
- Add up to 4-digit numbers
- **Missing-digit puzzles** (addition up to four digits)
- 4-digit addition **word problems**
- **Money** addition and money word problems
- **Estimate sums by rounding** (incl. in word problems)
- Ch 7 "Word Problems": strip models, comparison word problems (addition *or* multiplication),
  two-step mixed-operation
- Put on Your Thinking Cap!

**Grade 4** (Ch 1 Place Value, Ch 2 Comparing/Ordering, Ch 3 Addition & Subtraction)
- Place value to 100,000 then 1,000,000; standard/expanded/word forms
- Compare and order to one million
- Add numbers **up to six digits**
- **Addition: find missing digits**; subtraction: find missing digits
- **Use rules to complete addition/subtraction patterns**
- Rounding and **estimating sums and differences**
- *"Real-World Problems: Addition and Subtraction"* — multi-step word problems with estimation checks
- Bar models for multi-step and comparison situations
- Put on Your Thinking Cap!

**MiF lesson architecture** (usable as an in-app difficulty ladder): *Learn* (worked exposition) →
*Guided Practice* → *Hands-On Activity* → *Let's Practice* → *Math Journal* (explain/justify) → chapter
*Put on Your Thinking Cap!* → *Chapter Review/Test*. Chapters run 2-7 lessons.

**Sources:** IXL MiF 2020 alignments
[G1](https://www.ixl.com/math/skill-plans/math-in-focus-2020-grade-1.pdf) ·
[G2](https://www.ixl.com/math/skill-plans/math-in-focus-2020-grade-2.pdf) ·
[G3](https://www.ixl.com/math/skill-plans/math-in-focus-2020-grade-3.pdf) ·
[G4](https://www.ixl.com/math/skill-plans/math-in-focus-2020-grade-4.pdf) ·
[MiF Gr 3 Ch 3 lesson breakdown](https://mrslongs3rd.weebly.com/chapter-3-addition-up-to-10000.html) ·
[MiF K-5 Scope & Sequence (HMH)](https://www.hmhco.com/~/media/sites/home/education/global/pdf/scope-and-sequence/mathematics/elementary/math-in-focus/MIF_GradeK-5_Scope_and_Sequence.pdf)

### 3.7 Systematic variation

Derives from Dienes (1960) and Chinese *bianshi* / Marton's variation theory. Two axes:

- **Mathematical variability** — hold the representation fixed, vary the mathematics (without regrouping
  → with regrouping; 2-digit + 1-digit → 2-digit + 2-digit → 3-digit).
- **Perceptual variability** — hold the mathematics fixed, vary the representation (same 27 + 15 shown
  with base-ten blocks, place-value discs, a number line, expanded notation, vertical algorithm).

Principle: **within a set, change exactly one thing at a time.** A Singapore-style practice set:

```
8 + 5 = ?
8 + 6 = ?         (addend varies by 1 — attention on the pattern)
18 + 5 = ?        (place value varies — same fact, new decade)
8 + ? = 13        (unknown position varies)
? + 5 = 13        (unknown position varies again)
13 - 5 = ?        (operation varies — same fact family)
```

Singapore's **2021 MOE Primary Mathematics Syllabus (P1-P6)** frames everything under the Mathematics
Framework pentagon (Concepts, Skills, Processes, Metacognition, Attitudes) with **problem solving at the
centre**, endorses **Pólya's four steps**, and names heuristics students must learn: *draw a
diagram/model, make a systematic list, look for patterns, guess and check, work backwards, simplify the
problem, act it out, use before-after concept*. Tagging generated problems by heuristic is a defensible
curriculum spine.

**Sources:** [MOE Singapore — 2021 Primary Mathematics Syllabus P1-P6](https://www.moe.gov.sg/-/media/files/primary/2021-primary-mathematics-syllabus-p1-to-p6-updated-october-2025.pdf) ·
[Singapore Model Method text (MOE/Marshall Cavendish)](https://people.math.harvard.edu/~engelwar/MathS305/Singapore%20Model%20Method%20Text.pdf)

### Design takeaways (Singapore)

1. **Parameterize unknown position** on every schema (part-whole: whole/part-A/part-B; change:
   result/change/start; compare: larger/smaller/difference/multiplier).
2. **Schema-first generation.** Author schemas (part-whole, compare-additive, compare-multiplicative,
   before-after-constant-difference, before-after-constant-total, fraction-of-set, remainder), then
   instantiate numbers and context.
3. **Emit the diagram alongside the problem.** Every item should be able to render its number bond / bar
   model / place-value chart — that *is* the pictorial stage.
4. **Generate sets, not items.** A set is a base item plus a declared varying dimension (one at a time).
5. **Include non-numeric answer types**: multi-answer decompositions, "find the error", "explain which
   strategy", "predict whether regrouping is needed", drag-to-build.
6. **Reserve a per-chapter "Thinking Cap" slot** tagged by heuristic.
7. **Add a "change"-structure quota** — the literature says even Singapore's own P2 materials under-serve it.

---

## 4. Other curricula — non-standard problem formats

### 4.1 Eureka Math / EngageNY (A Story of Units)

**Lesson skeleton** (4 components, in order): Fluency Practice → Application Problem → Concept
Development (incl. Problem Set) → Student Debrief (incl. Exit Ticket). Fluency serves three named
purposes: *maintenance*, *preparation*, *anticipation*.
**Eureka Math² (2nd ed.)** replaced this with **Fluency → Launch → Learn → Land**.

| Format | Spec | Example |
|---|---|---|
| **Sprint** | Two parallel worksheets (A and B) of ~44 items, same skill, ordered easy→hard in patterned "sets" so the sequence itself teaches. Timed ~60s each; student competes against *own* Sprint A score. Explicitly for *already-acquired* skills near proficiency — "fast pace is essential," "low-stakes adrenaline boost." | **[C]** A 10+n Sprint opens: `10+1, 10+2, 10+3, … 10+9, 1+10, 2+10, …` then `10+□=13, 10+□=17, □+10=15`. Key insight: **items come in patterned clusters, not random order.** |
| **Application Problem** | One word problem per lesson, solved via **RDW = Read, Draw, Write**. Draw = number bond or tape diagram; Write = equation *plus a sentence answer*. Often deliberately seeded with a misconception. | **[S]** "Susan has 57 cents in her piggy bank. If she just put in 30 cents today, how much did she have yesterday?" — chosen because students want to *add*. |
| **Problem Set vs. Exit Ticket** | Problem Set = ~10 min of in-class practice inside Concept Development; teacher chooses a subset. Exit Ticket = 1–3 items, individual, formative, tied to the day's single objective. Different generator profiles. | **[C]** Problem Set: 8 mixed items on adding across a ten. Exit Ticket: exactly 2 — "Solve: 28 + 6. Use a number bond." |
| **Number bond** | Part-part-whole, non-directional (unlike an equation). Generate with any *one* of three cells blank. | **[C]** Whole 14, parts 8 and □. Or: whole □, parts 9 and 5. |
| **Tape diagram** | Bar model. Three canonical shapes: part-whole (one bar split), comparison (two bars, difference bracket), multiplicative (equal units). | **[C]** "Maria has 24 stickers. Ben has 9 fewer. How many do they have altogether?" |
| **Say Ten counting** | Numbers named by base-ten structure: 13 = "ten 3", 23 = "2 tens 3". Motivated by English "-teen" hiding place value. Routine: count Say Ten way, then regular way; later alternate mid-count. | **[S]** Rekenrek: show 10 beads, say "Ten 1," then "ten 2, ten 3, … ten 9, 2 tens." **[C]** "Write the number: 4 tens 7." / "Say Ten way, 62 is ___." |

**Sources:** [Great Minds — Eureka Math Lesson Structures](https://greatminds.org/math/blog/eureka/eureka-math-lesson-structures) ·
[EM G1 M6 Teacher Edition](https://greatminds.org/hubfs/knowledge/resources/math/EM_Basic_Curriculum_Files/Teacher_Editions/G1_TeacherEditions/EM_G1_M6_TeacherEdition.pdf) ·
[Eureka G1 M2 Topic C Lesson 24](https://content.eureka.greatminds.org/maps/math/grade-1/module-2/topic-c/lesson-24/)

### 4.2 Beast Academy (AoPS)

What makes them different: puzzles have **rules rather than procedures**, are **self-checking**,
frequently have **multiple or "find all" answer sets**, and are generated within tight combinatorial
constraints. Puzzles 1 contains 12 styles across 500+ puzzles; Puzzles 2 has 400+ in 12 styles.

**Level 1 puzzle styles (verbatim list) [S]:** Number Paths, Polyominoes, Sumdoku, Deka Dots, Difference
Pyramids, Greater-than Sudoku, Ordered Paths, Skip-Counting Crosswords, Magic SUMmer, Digit Differences,
Shape Connect, Turn Mazes. Other BA styles found: Cross Sum, Numbercross, Honeycomb Paths, X-Out.

- **Numbercross / cross-number** [S structure, C example]: grid where each row and column is an
  arithmetic equation; intersections must be consistent, making it self-checking. Michael Pershan
  reverse-engineered BA's 2×2 version: with entries a,b,c,d the puzzle requires `ac + bd = ab − cd`,
  i.e. `d = a(b−c)/(b+c)` — so **(b+c) must divide a(b−c)** for whole-number solvability. This is exactly
  the kind of constraint a generator must encode.
- **Difference Pyramid** [C]: bottom row holds numbers; each cell above = difference of the two below.
  *Fill the bottom row with 1, 3, 8, 9 in some order so the top cell is 0.*
- **Skip-Counting Crossword** [C]: across/down entries must be consecutive multiples. *Fill with multiples
  of 5 between 20 and 60; the shared cell forces a unique digit.*
- **Magic SUMmer** [C]: *Place 1–6, one each, in the circles of a triangle so each side sums to 10.*
  (Has multiple solutions → doubles as a "find all" task.)
- **Sumdoku / Greater-than Sudoku** [C]: 4×4 Latin square with cage sums, or with `>` `<` between adjacent
  cells instead of givens.
- **Skyscrapers** (BA-adjacent) [C]: grid of heights 1–n, one of each per row/column; edge clues state how
  many buildings are *visible*. 3×3, heights 1–3, top clues `2 1 2`, left clues `2 3 1` — pure logic, no
  arithmetic.
- **"Find all"** [C]: *Find every way to make 12 using exactly three of the digits 1–9 with no repeats.*
  Answers: 1+2+9, 1+3+8, 1+4+7, 1+5+6, 2+3+7, 2+4+6, 3+4+5 — the *completeness argument* is the mathematics.
- **Error-hunting** [C]: *Grogg computed 402 − 178 = 336. Find his mistake and explain what he did.*

**Sources:** [BA Puzzles 1](https://beastacademy.com/books/puzzles1) ·
[BA Puzzles 2](https://beastacademy.com/books/puzzles2) ·
[BA Daily Puzzles](https://beastacademy.com/puzzles/daily) ·
[Pershan — Crossword puzzles from Beast Academy](https://notepad.michaelpershan.com/crossword-puzzles-from-beast-academy/) ·
[Beast Academy Puzzles conference handouts](https://www.giftedpage.org/wp-content/uploads/2023/11/Beast-Academy-Puzzles-Handouts-for-Conference-Talks.pdf)

### 4.3 Bridges in Mathematics (Math Learning Center)

Grades K–2 daily structure: **Investigations, Work Places, Number Corner**. Grades 3–5 adds
**Problems & Investigations, Problem Strings, Math Forum, Daily Practice**.

- **Number Corner**: 15–20 min daily, anchored to the classroom calendar. Component slots: **Calendar
  Grid, Calendar Collector, Days in School / Number Line, Computational Fluency, Problem Solving, Problem
  Strings, Vocabulary**. Calendar Grid is a *growing pattern* — each day a new marker is revealed and
  students predict the next. **[C]** A Grade 2 Calendar Grid where day 1 = 1 square, day 2 = 4 squares,
  day 3 = 9 squares; prompt: "What will day 7 look like? How do you know?" Strong generator template:
  **serial reveal + prediction + justification.**
- **Work Places**: differentiated game/station tasks. Game structure (2 players, spinner/dice/cards, a
  recording sheet) is highly generatable.
- **Problem Strings** (Gr 3–5): fast-paced teacher-presented ordered sequence — see §4.6.

> **[GAP]** Bridges teacher-guide sample PDFs
> (`mathlearningcenter.org/sites/default/files/documents/sample_materials/br4-tg-u2-m3.pdf`,
> `br5-tg-u4-m1.pdf`) returned **403** to automated fetch. Bridges' *structure* is from secondary sources;
> **no verbatim Bridges problem or problem string was retrieved.**

### 4.4 Investigations 3 (TERC) — Ten-Minute Math

10-minute routines interleaved with units, repeated across the year with changing numbers.

- **Quick Images (Part 1 — quantity)** [S spec]: show a dot/sticker arrangement for **3–5 seconds**, hide
  it, students redraw from memory, then explain *how they saw it*. **[C]** Two ten-frames, one full and
  one with 3 → "I saw 10 and 3, so 13."
- **Quick Images (Part 2 — geometry)**: same 3–5s flash with a 2-D shape/design; redraw and discuss
  attributes (parallel sides, angle types).
- **Today's Number** [S spec]: target number, generate many expressions under a constraint. **[S]** Grade
  1: ways to make 9. Grade 5: ten expressions equal to 648 using multiplication and addition. **[C]**
  Grade 2 constrained version: "Make 25 using exactly three numbers" or "Make 25 using only coins."
- **Counting Around the Class**: class counts by *n*; before starting, predict what number the last
  student will say — a division/multiplication prediction task in disguise. **[C]** "We'll count by 4s and
  there are 22 of us. What number will the last person say?"
- **Guess My Rule**: teacher sorts objects/numbers by a secret rule; students propose new members and
  infer the rule. **[C]** In: 12, 20, 8, 36. Out: 15, 9, 22, 7. (Rule: multiples of 4.)
- **Close To…** games (How Many to 10? K; Close to 20 Gr 2; Close to 100 Gr 3; Close to 1000 Gr 4): draw
  cards, choose a subset to hit a landmark; score = |target − sum|, lowest wins.
- **Compare games** (Game of Compare K, Sticker Compare Gr 2, Multiplication Compare Gr 3).

**Source:** [Activities from Investigations 3 (TERC)](https://investigations.terc.edu/at-home-resources/activities-from-investigations-3/)

### 4.5 Illustrative Mathematics K–5 — warm-up routines

Official list, per the IM Course Guides:

**Act It Out · Choral Count · Estimation Exploration · How Many Do You See? · Notice and Wonder ·
Number Talk · Questions About Us · True or False · What Do You Know About ___? · Which One Doesn't Belong?**

Plus 8 Mathematical Language Routines, of which three are directly generatable as problem formats:
- **MLR3: Clarify, Critique, Correct** — students analyze *mathematical writing that is not their own*.
  This is the curricular home of error-analysis items.
- **MLR4: Information Gap** — two partners hold different necessary information.
- **MLR5: Co-craft Questions** — show a context *without* a question; students write the question.

Key generator specs from IM's own descriptions **[S]**:
- **True or False**: "students can determine whether an equation or inequality is true or false **without
  doing any direct computation**" — items must be *structurally* decidable.
- **Estimation Exploration**: a "rough evaluation of a quantity rather than a wild guess."
- **How Many Do You See?**: subitizing + combining parts; later grades push toward groupings that are
  *faster*.
- **Choral Count**: count aloud while *recording* the count in a grid, then notice patterns, **predict**
  upcoming numbers, and justify.
- **What Do You Know About ___?**: fully open prompt against a single number/expression/image.

**[C] Choral Count generator template:** Count by 3 from 3, record 5 per row:
`3 6 9 12 15 / 18 21 24 27 30 / 33 36 39 42 45`. Prompts: "What do you notice about each column?"
"What number will be directly below 42?"

**Sources:** [IM K-5 Grade 2 instructional routines](https://im.kendallhunt.com/k5/teachers/grade-2/course-guide/instructional_routines.html) ·
[Grade 3](https://im.kendallhunt.com/k5/teachers/grade-3/course-guide/instructional_routines.html)

### 4.6 Which One Doesn't Belong?

**Format spec:** Exactly **four items in a 2×2 grid**. The defining design constraint — and the reason
it's generatable — is that **for each of the four positions there must exist at least one valid
attribute-based argument that *it* is the odd one out.** No answer key; the deliverable is the reasoning.
Origin: Christopher Danielson's *Which One Doesn't Belong?: A Shapes Book* (Stenhouse) and
crowd-sourced [wodb.ca](https://wodb.ca/).

**Generator algorithm:** pick 4 items; verify each has a *unique* property among the set across at least
one of ~6 attribute axes (parity, magnitude, digit-count, digit-sum, square/prime, shape/color/orientation,
real-world meaning).

**[S] Canonical numbers example — 9, 16, 25, 43:**
- 43 — the other three are perfect squares (and composite); 43 is neither.
- 9 — the only one-digit number (and the others' digits all sum to 7).
- 16 — the only even number.
- 25 — the only one equal to a US coin value.

**[C] K–1 example:** 2, 5, 10, 12 → 12 (two digits), 5 (odd), 2 (smallest / only prime under 5),
10 (only multiple of 10).

**[C] Grade 3 shapes example:** a 3×4 rectangle · a 2×6 rectangle · a 4×4 square · a 3×4 parallelogram
(non-right) → square (all sides equal), parallelogram (no right angles), 2×6 (longest perimeter),
3×4 rectangle (dimensions duplicated by another panel).

> **[GAP]** wodb.ca serves its panels as **images with no alt text**; no verbatim WODB panel sets were
> retrieved from the site itself. The 9/16/25/43 set came via secondary discussion (Talking Math With
> Your Kids), not from wodb.ca.

### 4.7 Number Talks / Number Strings (Fosnot Problem Strings)

**Format spec:** an **ordered** sequence of 4–7 related problems presented **one at a time**, mentally,
with strategy-sharing between each. The sequence contains a **"helper problem"** placed just before a
problem that becomes easy *if* you use the helper. Designed so a specific strategy emerges by inference,
never by instruction. Fosnot: "a set of related math problems, crafted to support students to construct
big ideas about mathematics and build their own strategies."

- **[S] Grade 4 doubling/halving string:** `6 × 8 · 12 × 8 · 12 × 4 · 24 × 2 · 3 × 16 · 18 × 50`
- **[S] Near-doubles string (Gr 1–2):** `7 + 7 · 7 + 6 · 7 + 8` — 7+6 as (7+7)−1, 7+8 as (7+7)+1.
  Related: 8+9 as (8+8)+1.
- **[C] Making-ten string (Gr 1):** `9 + 1 · 9 + 3 · 9 + 6 · 8 + 3 · 8 + 7 · 7 + 5`
- **[C] Landmark-numbers string (Gr 2):** `40 + 30 · 42 + 30 · 42 + 38 · 42 + 39`
- **[C] Partial-products string (Gr 3–4):** `10 × 7 · 4 × 7 · 14 × 7 · 20 × 7 · 19 × 7`

Grade-2 strategy progression order **[S]**: Counting All/Counting On → Doubles & Near Doubles → Making
Tens → Landmark/Friendly Numbers.

**Generator note:** the string is the unit of generation, not the problem. Encode: target strategy →
helper problem → 1–2 "bridge" problems → 1–2 "you're on your own" problems.

### 4.8 Open Middle

**Format spec — extremely generatable.** Canonical stem: *"Using the digits 1 to 9 [or 0 to 9], **at most
one time each** [or **exactly one time each**], place a digit in each box to …"* followed by an objective
of one of four types:
1. **Make it true** — satisfy an equation.
2. **Optimize** — "as close as possible to N" / "as large as possible."
3. **Two-condition** — "once to make X, once to make Y."
4. **Constrained construction** — build an object (time, graph, number line) meeting a property.

**[S] Verbatim K–4 examples:**
- G1 *Adding Single Digits*: "Using the digits 0 to 9, at most one time each, place a digit in each box to
  make the equation true."
- G1 *Window Sum*: "Using the digits 0 to 9, at most one time each, complete the puzzle so that the sum of
  each side is equivalent."
- G1 *Open Number Line*: "Using the digits 1 to 9, at most one time each, place a digit in each box on the
  number line to make the number line true."
- G1 *Domino Window*: "Use four of these dominoes to form a square with the same number of dots on each side."
- G1 *Interpreting Data 2*: "Make a graph that shows a possible result of 7 students' favorite color with
  red being the most popular color."
- G2 *Subtraction with Regrouping 2*: "Using the digits 1 to 9, at most one time each, place a digit in
  each box to make the difference equal to 39."
- G2 *Sums to 100*: "Using the digits 1 to 9, at most one time each, place a digit in each box to create
  the closest possible sum to 100."
- G2 *Close to 1,000*: "Using the digits 1 to 9, exactly one time each, place a digit in each box to make
  the sum as close to 1000 as possible."
- G2 *Time Twister*: "Using the digits 0 to 9, at most one time each, create three different times on the
  clocks where the span of the times are between 12 noon and 7 pm."
- G3 *Multiply and Divide Within a Hundred 1*: "Using the digits 2 to 9, at most one time each, place a
  digit in each box to make two correct equations: one where the value is greater than 30 and one less
  than 30."
- G3 *Multiplying Multiples of Ten 2*: "Using the digits 0 to 9, at most one time each, place a digit in
  each box to make a product that's as close to 500 as possible."
- G3 *Adding 3-Digit Numbers*: "Using the digits 1 to 9, exactly one time each, place a digit in each box
  two times: once to make a sum that is greater than 700 and once to make a sum that is less than 700."
- G3 *What is it Not?*: "Use the terms square, rhombus, kite, parallelogram, trapezoid, rectangle,
  irregular quadrilateral at most one time each to complete two sentences."
- G3 *Fractions on a Number Line*: "Using the digits 0 to 5 at most one time each, place a digit to create
  five fractions and place them all on a number line with the correct order and spacing."

**Generator implication:** a single template `(digit_pool, reuse_policy, expression_skeleton, objective)`
covers essentially the whole corpus. The **optimize** variant is best: always has an answer, always has a
*better* answer, self-differentiating.

**Sources:** [Open Middle Grade 1](https://www.openmiddle.com/category/grade-1/) ·
[Grade 2](https://www.openmiddle.com/category/grade-2/) ·
[Grade 3](https://www.openmiddle.com/category/grade-3/)

### 4.9 True/False equations & the equal-sign misconception

**Research base:** Carpenter, Franke & Levi, *Thinking Mathematically: Integrating Arithmetic and Algebra
in the Elementary School* (2003). Most elementary students hold an **operational** view — "=" means "write
the answer next" — and therefore **reject** non-canonical forms like `3 = 3` and `3 + 5 = 5 + 3` as false.
The canonical diagnostic item is `8 + 4 = □ + 5`, where students commonly answer 12 or 17. The
instructional goal is a **relational** view of "=" as equivalence, enabling **relational thinking**:
solving without computing.

> The parent transcript additionally records: *"fewer than 10% correct at any grade 1–6, **and performance
> does not improve with age**."* **[GAP]** — the transcripts do not show the specific source page this
> statistic was fetched from; treat the precise figure as unverified.

**Generator spec — vary the *form* of the equation, not just the numbers.** Six structural buckets:
1. `a + b = c` (canonical, true/false)
2. `c = a + b` (reversed) — **[C]** `12 = 7 + 5` (true)
3. `a = a` — **[C]** `9 = 9` (true; many students say false)
4. `a + b = b + a` — **[C]** `6 + 9 = 9 + 6` (true)
5. `a + b = c + d` (both sides operations) — **[C]** `8 + 4 = 7 + 5` (true); `8 + 4 = 9 + 5` (false)
6. `a + b = □ + d` (open, relational) — **[S/C]** `8 + 4 = □ + 5` (answer 7, reachable by "5 is one more
   than 4, so the box is one less than 8")

**[C] Non-computational items (IM's stated criterion):** `37 + 48 = 38 + 47` — true by compensation, no
addition needed. `256 + 199 = 255 + 200` — true. `40 × 6 = 20 × 12` — true by doubling/halving.

### 4.10 Error analysis / "Find the mistake" / "Is she right?"

**Format spec:** present a *complete worked solution containing a specific, named misconception*,
attributed to a fictional student. Three required prompts: (a) what did they do? (b) where exactly did it
go wrong? (c) what is correct? IM operationalizes it as **MLR3: Clarify, Critique, Correct**.

**Nix the Tricks is the misconception catalog** — it enumerates the shortcuts (key words, "add a zero,"
"bigger bottom better borrow," "butterfly method," "does McDonald's sell burgers") whose predictable
failure modes are exactly what error-analysis items should target.

**[C] Examples:**
- G1: "Jo says 5 + 0 = 0 because adding nothing gives nothing. Is she right? How would you convince her?"
- G2: "Sam solved 63 − 27 like this: 63 − 27 = 44, because 6 − 2 = 4 and 7 − 3 = 4. What did Sam do? What
  is the real answer?" (subtracting the smaller digit from the larger)
- G3: "Priya read 'Ana has 8 apples. That is 3 fewer than Ben.' She saw the word *fewer* and subtracted:
  8 − 3 = 5. Is Priya right?" (key-word strategy failure; correct answer 11)
- G4: "Leo says to multiply 43 × 10 you 'add a zero,' so 4.3 × 10 = 4.30. Is that right? Why does 'add a
  zero' work for 43 but not 4.3?"

### 4.11 Always / Sometimes / Never

**Format spec:** a general claim; students classify as always/sometimes/never true and must justify with
an **example** (always), a **counterexample** (never/sometimes), or **both** (sometimes). "Sometimes"
forces production of a supporting *and* a refuting instance.

**[S] NRICH KS1 statements (verbatim):**
- "When you add two numbers you can change the order and the answer will be the same." (Always)
- "If you add 10 and take away 1, it is the same as adding 9." (Always)
- "When you add 10 to a number, the answer is a multiple of 10." (Sometimes)
- "When you subtract one number from another number you can change the order and the answer will be the
  same." (Sometimes — only when equal)
- "If you put two squares together you get a rectangle." (Sometimes)
- "3D shapes have more than four faces." (Sometimes)
- "When you cut a square in half you get a triangle." (Sometimes)
- "Four sided shapes are called squares." (Sometimes)
- "Three sided shapes are called triangles." (Always)

**[S] NRICH Number statements (Gr 3–4 reachable):**
- "If you add 1 to an odd number you get an even number." (Always)
- "Multiples of 5 end in a 5." (Sometimes)
- "If you add two odd numbers you get an odd number." (Never)
- "The sum of three numbers is odd." (Sometimes)
- "If you add a multiple of 10 to a multiple of 5 the answer is a multiple of 5." (Always)
- "When you multiply two numbers you will get a bigger number." (Sometimes — fails at 0 and 1)
- "If you add a number to 5 your answer will be bigger than 5." (Sometimes)
- "The sum of three consecutive numbers is divisible by 3." (Always)

**Generator note:** the richest bank is "Sometimes" statements built by taking a true generalization and
*removing a hypothesis*.

**Sources:** [NRICH — Always, Sometimes or Never? KS1](https://nrich.maths.org/problems/always-sometimes-or-never-ks1) ·
[NRICH — Always, Sometimes or Never? Number](https://nrich.maths.org/problems/always-sometimes-or-never-number)

### 4.12 Estimation routines

**Estimation 180** (Andrew Stadel, 180 challenges, launched 2012). Format: an image; students record
**too low**, **too high**, and **just right** estimates, plus **reasoning**, then see the reveal. The
too-low/too-high pair matters more than the point estimate — it's a *range* task, which lowers entry and
makes every student partially correct. Stadel recommends placing all three on an open number line, and
deliberately **not** putting "just right" at the midpoint. Day 1 establishes a **reference/benchmark**
("What is Mr. Stadel's height?" with no image) that Days 2–20 reuse.

**[C] Generator template:** `{image or quantity} + fields: too low / too high / my estimate / my reasoning
+ reveal`. Sequence items so item *n*+1 is estimable *relative to* item *n*.

**Esti-Mysteries** (Steve Wyborney) — hybrid estimation + number-property format:
1. Show image, students record an initial estimate with **no clues**.
2. Reveal clues **one at a time**; students revise after each, crossing off numbers on a **hundred chart**.
3. Crucially, clues narrow to **2–3 remaining candidates, not one** — the final step is still an
   *estimate*, using the picture.
4. Animated "Reveal" box shows the answer.

**[S] Structure of clue sequence** (the "Brown Beads" mystery): Clue 1 "More than 10 and less than 20" →
Clue 2 "The answer is even" → further clues on digits/multiples.

**[C] Grade 3 Esti-Mystery:** jar of cubes. Clue 1: "It is greater than 30." Clue 2: "It is a multiple of
4." Clue 3: "The digits add to 7." Clue 4: "It is less than 60." → 52 survives; loosen clue 3 to "odd
digit sum" to leave 2–3 candidates and force a picture-based final judgment.

**Sources:** [Wyborney — Esti-Mysteries](https://stevewyborney.com/2019/09/esti-mysteries/) ·
[51 Esti-Mysteries](https://stevewyborney.com/2019/09/51-esti-mysteries/)

### 4.13 Splat! (Steve Wyborney)

**Format spec:** a set of dots is shown with a **total** displayed; a "splat" blob covers some. Students
determine the hidden count. Generalizes into a genuine algebra progression across 10 levels.

- **Level 1–2**: one splat, totals to 10 then to 20. **[S/C]** Total 12, 8 dots visible → splat covers 4.
- **Level 3**: multiple splats, **same color must cover the same number**. **[S]** Two red splats + 3
  visible dots, total 11 → each red splat = 4.
- **Level 4**: splats shown *without* a total; question becomes "**What could the total be?**"
- **Level 5–6**: **two colors; different colors must have different values** → two unknowns.
- **Level 7–10**: multiple variables plus constraints on which numbers may be used.

**Generator spec:** `(total, visible_dots, [splat_color → count])` with the invariant
`total = visible + Σ(color_count × color_value)`. The reverse mode (hide the total, ask for possible
totals) is the open-ended variant.

**Source:** [Wyborney — Splat!](https://stevewyborney.com/2017/02/splat/)

### 4.14 Would You Rather Math

**Format spec:** two options, both mathematically legitimate; students **choose and justify with
mathematics**. Site tagline **[S]**: "asking students to choose a path and justify it with math." Best
items make the two options *close*, so the computation is necessary. Organized K-2 / 3-5 / 6-8 / 9-12.

**[S] Examples:** "Have 3 pencils that are 9 cm each OR 5 pencils that are 6 cm each?" ·
"Have 38 baskets of 12 apples OR 40 baskets of 10 apples?"

**[C] Examples:** K-1: "Would you rather have 2 dimes or 5 nickels?" (equal — the point) ·
G2: "Would you rather have 4 bags of 10 marbles or 3 bags of 14 marbles?" (40 vs 42) ·
G4: "Would you rather walk 1/2 mile then 1/4 mile, or walk 3/4 mile?" (equal).

**Generator spec:** `(option_A_expression, option_B_expression)` where |A − B| is small or zero, plus a
unit-consistency requirement.

**Sources:** [wouldyourathermath.com](https://www.wouldyourathermath.com/) ·
[K-2 category](https://www.wouldyourathermath.com/category/k2/)

### 4.15 Same But Different

**Format spec:** show **two** images/expressions side by side; the only prompt is **"How are they the
same? How are they different?"** Deliberately two panels, not four (contrast with WODB). Described by the
creator (Sue Looney) as teaching "grayscale thinking, categorical thinking" and building "a network of
ideas." Domains covered: early numeracy, addition/subtraction, multiplication/division, measurement, place
value, fractions, geometry, algebra.

**[C] Examples:**
- K: five dots in a die-pattern vs. five dots in a line. (Same: 5. Different: arrangement, ease of subitizing.)
- G1: `3 + 4` and `4 + 3`. (Same: sum 7, same addends. Different: order, the story each could tell.)
- G2: `20 + 7` and `27`. (Same: value. Different: expanded vs standard form.)
- G3: a 3×4 array of dots and a 4×3 array. (Same: 12, same factors. Different: rows vs columns, the
  situation modeled.)
- G4: `1/2` of a circle shaded and `2/4` of a same-size circle shaded. (Same: area shaded. Different:
  number of pieces, denominator.)

> **[GAP]** samebutdifferentmath.com serves its pairs as **images with no alt text**. **No verbatim Same
> But Different pair was retrieved.** All examples above are constructed.

**Sources:** [samebutdifferentmath.com](https://www.samebutdifferentmath.com/) ·
[addition-subtraction section](https://www.samebutdifferentmath.com/addition-subtraction)

### 4.16 Notice and Wonder

**Format spec:** show a mathematical object (image, story stem with **no question**, table, partially
completed work) and ask exactly two prompts: **"What do you notice?" / "What do you wonder?"** All
responses are recorded without evaluation. Developed by **Annie Fetter and the Math Forum**, now hosted by
NCTM. Core mechanism: deferring the question so students engage in sense-making before answer-getting.

**Generator implication — this is a *transform*, not a problem type.** Take any word problem and **delete
the question**:
- **[C]** Original: "Maya has 14 crayons. She gives 6 to Ken. How many does she have left?" → N&W version:
  "Maya has 14 crayons. She gives 6 to Ken." *What do you notice? What do you wonder?*
- **[C]** Show a completed tape diagram with two parts labeled 25 and 18 and a whole labeled `?` — no words.

Pairs directly with IM's **MLR5: Co-craft Questions**.

### 4.17 Cross-cutting design principles

1. **The unit of generation is often a *set*, not an item.** Sprints (patterned 44-item sequences),
   problem strings (helper→bridge→transfer), WODB (4 mutually-defensible panels), Esti-Mysteries (clue
   cascades), Number Corner Calendar Grid (serial reveal). A per-item generator can't produce these.
2. **Constraint satisfaction is the engine for puzzle formats.** Open Middle, Beast Academy
   Numbercross/Sumdoku/Magic SUMmer, Splat multi-color — all are `solve for digits under constraints`, and
   all need a solvability check.
3. **Vary equation *form*, not just numbers.** The Carpenter research says `c = a + b`, `a = a`, and
   `a + b = c + d` are qualitatively different items from `a + b = c`. Most generators emit only the last.
4. **Optimize-objectives beat exact-answer objectives** for open tasks: always solvable, always
   improvable, self-differentiating.
5. **Misconceptions are a first-class content asset.** Nix the Tricks is effectively a catalog to key
   error-analysis items off; Eureka deliberately seeds Application Problems with them.
6. **Range answers lower the floor.** Estimation 180's too-low/too-high, Splat Level 4's "what could the
   total be," Esti-Mystery's 2–3 survivors.
7. **Deleting the question is a cheap, high-value transform** (Notice and Wonder / Co-craft Questions).

---

## 5. Rigor balance — conceptual vs procedural vs application

### 5.1 CCSS "three legs of rigor"

Rigor = pursuing all three "with equal intensity" in the **major work** of the grade. It is not "harder
problems."

| Leg | Definition (Achieve the Core) | Diagnostic question for a given item | K-4 examples |
|---|---|---|---|
| **Conceptual understanding** | Access concepts "from a number of perspectives" so math is more than "a set of mnemonics or discrete procedures" | Could a student answer this by executing a memorized rule without knowing why? If yes → not conceptual | "Which picture shows 3/4? Explain how you know the pieces must be equal." / "Show 47 with base-ten blocks two different ways." / "Is 8 × 5 the same as 5 × 8? Use an array to show why." |
| **Procedural skill & fluency** | "Speed and accuracy in calculation"; practice core functions so students "have access to more complex concepts and procedures" | Is the strategy known and the task is executing it accurately/quickly? | `7 + 8 = ?` / `348 + 275` (standard algorithm) / `6 × 7` from memory |
| **Application** | "Use math flexibly for applications in problem-solving contexts," incl. cross-content (esp. science) | Must the student *choose* the operation/model from a situation? | "Maya has 24 stickers to share equally among 4 friends. How many each?" / "3 packs of 8 pencils; she gives away 5. How many left?" |

**Fluency ≠ speed.** The CCSS Progressions definition, quoted by Achieve the Core, is that fluency is
*"a mixture of just knowing some answers, knowing some answers from patterns (e.g., 'adding 0 yields the
same number'), and knowing some answers from the use of strategies"* — and "fluency will be a mixture of
these kinds of thinking which may differ across students." **A fluency mode should not be a pure speed
drill.** ATC also recommends fluency activities be *brief, flexible, and distributed across the whole
year* rather than concentrated.

### 5.2 Required fluencies, K-4 (verbatim from the CCSS "Where to Focus" one-pagers)

| Grade | Standard | Fluency |
|---|---|---|
| K | **K.OA.A.5** | Add/subtract within 5 |
| 1 | **1.OA.C.6** | Add/subtract within 10 |
| 2 | **2.OA.B.2** | Single-digit sums and differences (**sums from memory by end of Grade 2**) |
| 2 | **2.NBT.B.5** | Add/subtract within 100 |
| 3 | **3.OA.C.7** | Single-digit products and quotients (**products from memory by end of Grade 3**) |
| 3 | **3.NBT.A.2** | Add/subtract within 1000 |
| 4 | **4.NBT.B.4** | Add/subtract within 1,000,000 |

Note Grade 4 has **only one** required fluency — 4.NF and 4.NBT.5/6 (multi-digit multiply/divide) are
major work but *not* designated fluencies.

### 5.3 Major / supporting / additional clusters, K-4

**Focus recommendation (verbatim):** *"At least 65% and up to approximately 85% of class time, with Grades
K–2 nearer the upper end of that range, should be devoted to the major work of the grade."* Supporting and
additional work should ideally **engage students in the major work** rather than sit apart.

- **Kindergarten** — Major: K.CC.A, K.CC.B, K.CC.C, K.OA.A, K.NBT.A. Supporting: K.MD.B, K.G.B.
  Additional: K.MD.A, K.G.A.
- **Grade 1** — Major: 1.OA.A, 1.OA.B, 1.OA.C, 1.OA.D, 1.NBT.A, 1.NBT.B, 1.NBT.C, 1.MD.A.
  Supporting: 1.MD.C. Additional: 1.MD.B (tell/write time), 1.G.A.
- **Grade 2** — Major: 2.OA.A, 2.OA.B, 2.NBT.A, 2.NBT.B, 2.MD.A, 2.MD.B.
  Supporting: 2.OA.C, 2.MD.C (time & money), 2.MD.D. Additional: 2.G.A.
- **Grade 3** — Major: 3.OA.A, 3.OA.B, 3.OA.C, 3.OA.D, 3.NF.A, 3.MD.A, 3.MD.C (area).
  Supporting: 3.MD.B, 3.G.A. Additional: **3.NBT.A** (multi-digit arithmetic), 3.MD.D (perimeter).
- **Grade 4** — Major: 4.OA.A, 4.NBT.A, 4.NBT.B, 4.NF.A, 4.NF.B, 4.NF.C.
  Supporting: 4.OA.B (factors/multiples), 4.MD.A, 4.MD.B.
  Additional: 4.OA.C (patterns), 4.MD.C (angles), 4.G.A (lines/shapes).

Highlights of major work: **K-2 = addition and subtraction (concepts, skills, problem solving) + place
value. 3-5 = multiplication/division of whole numbers *and fractions* (concepts, skills, problem solving).**

**Direct relevance to KidMath:** the recently added `patterns`, `measurement`, `time`, `money`,
`factorsMultiples`, `areaPerimeter`, `angles`, `linesShapes`, `dataGraphs` modes are **almost all
supporting or additional clusters**. Major-work modes are the OA/NBT/NF ones. If the app surfaces modes
with equal visual weight, a child free-choosing will systematically under-practice major work. Consider
weighting default/suggested practice ~70-80% toward OA/NBT/NF.

### 5.4 Webb's Depth of Knowledge in elementary math

Webb explicitly notes: **large-scale on-demand math assessment should only assess DOK 1, 2, and 3. "Depth
of Knowledge at Level 4 in mathematics should be reserved for local assessment."** For an auto-generated
practice app, DOK 4 is essentially out of scope.

**Level 1 — Recall & Reproduction.** *"Recall of information such as fact, definition, term, or a simple
procedure, as well as performing a simple algorithm or applying a formula... a one-step, well-defined, and
straight algorithmic procedure."* Includes **solve a one-step word problem**, retrieve information from a
table or graph, locate numbers on a number line, determine area/perimeter of rectangles given a drawing.

K-4 examples: `9 − 4 = ?` · "What is the name of this shape?" · "Ben has 5 marbles. He gets 3 more. How
many now?" (one-step word problem — **still DOK 1**) · "How many students chose red?" (read one bar) ·
"Point to 3/4 on the number line" (marked/labeled) · `456 + 289` by the standard algorithm.

**Level 2 — Skills & Concepts.** *"Engagement of some mental processing beyond a habitual response...
requires students to make some decisions as to how to approach the problem."* Descriptors include
**solve a routine problem requiring multiple steps**, **provide justifications for steps**, **extend a
pattern**, **translate between tables, graphs, words and symbolic notation**, **select a procedure
according to criteria and perform it**.

K-4 examples: "Sort these shapes into ones with 4 sides and ones without. Then explain your rule." ·
"The pattern is 2, 5, 8, 11, ___, ___. What comes next and what is the rule?" · "Ana buys 3 notebooks at
$4 each and pays with $20. How much change?" · "The graph shows favorite fruits. How many more chose
apples than bananas?" · "Write a number sentence that matches this array of 4 rows of 6." · "Which of
these would you rather use for `398 + 47` — the standard algorithm or a mental strategy? Do it your way."
(a genuinely DOK 2 *fluency* item) · "Show 3/4 using a fraction bar, a number line, and a set of 8
counters."

**Level 3 — Strategic Thinking.** *"Requires reasoning, planning, using evidence, and a higher level of
thinking... In most instances, requiring students to explain their thinking is a Level 3."* Critically:
*"The complexity does not result from the fact that there are multiple answers, a possibility for both
Levels 1 and 2, but because the task requires more demanding reasoning."*

K-4 examples: "Jordan says every number ending in 0 is even. Is he right? Explain how you know it works
for *every* such number." · "Find three different rectangles with a perimeter of 12. Which has the biggest
area? Why do you think that happens?" · "Sam solved `35 × 4` by doing `30 × 4` then `5 × 4`. Riley did
`35 × 2` then doubled. Both got 140. Compare the two methods — when would each be easier?" · "Write a
story problem that could be solved by `24 ÷ 6`." · "Is 1/3 always bigger than 1/4? Kim says no because you
could have 1/3 of a cookie and 1/4 of a cake. Who is right and what is Kim missing?" · "Here are the
class's pet counts over 4 weeks in a table. What do you predict for week 5, and what makes you confident?"

**Level 4 — Extended Thinking.** Multi-day, teacher-mediated — not app-generatable. Examples: design a
class garden within a budget and area constraint · collect a week of lunch-waste data and recommend a
change · plan a class party for 24 students with a $50 budget comparing package sizes.

### 5.5 The critical misapplication: DOK is not difficulty

- **Complexity ≠ difficulty.** `7,846,392 + 2,957,481` is very difficult for a 4th grader and is **still
  DOK 1** (one well-defined algorithm). Bigger numbers raise difficulty, not depth.
- **Verbs alone don't set the level.** Webb's own document: *"Verbs such as 'describe' and 'explain' could
  be classified at different levels depending on what is to be described and explained."* The widely
  circulated "DOK verb wheels" are a misreading. Webb also clarifies DOK is **not a taxonomy** — the levels
  are four different ways of knowing, not a difficulty ladder.
- **Webb's own worked contrast:** *"Interpreting information from a simple graph, requiring reading
  information from the graph, also is a Level 2. Interpreting information from a complex graph that
  requires some decisions on what features of the graph need to be considered and how information from the
  graph can be aggregated is a Level 3."* Same verb, same object type, two levels.
- **Multiple answers ≠ DOK 3.** Explicitly called out.
- **Practical consequence:** difficulty (number magnitude, digit count, regrouping) and DOK must be **two
  independent axes** in the generator. Collapsing them into one "level" slider silently caps the app at
  DOK 1 forever.

The standard warning, verbatim: *"The Webb levels do not necessarily indicate degree of difficulty. Adding
4 + 4 is DOK 1 and is also easy to do. Adding 4,678,895 + 9,578,885 is still a DOK 1 but may be more
'difficult.'"*

### 5.6 Hess Cognitive Rigor Matrix (Math/Science, © 2009 Karin Hess)

Bloom's classifies the **kind of thinking**; Webb's DOK classifies **how deeply the student must engage
the content**. They are orthogonal enough that the same Bloom verb spans multiple DOK levels.

| Bloom ↓ / DOK → | **1 Recall & Reproduction** | **2 Skills & Concepts** | **3 Strategic Thinking** | **4 Extended Thinking** |
|---|---|---|---|---|
| **Remember** | Recall, observe, recognize facts, principles, properties; recall/identify conversions among representations or numbers | *(empty)* | *(empty)* | *(empty)* |
| **Understand** | Evaluate an expression; locate points on a grid or number on number line; solve a one-step problem; represent math relationships in words, pictures, symbols | Specify and explain relationships (non-examples/examples; cause-effect); make and record observations; explain steps followed; summarize results or concepts; make basic inferences or logical predictions from data; use models/diagrams to represent or explain concepts; make and explain estimates | Use concepts to solve non-routine problems; explain, generalize, or connect ideas using supporting evidence; make and justify conjectures; explain thinking when more than one response is possible | Relate math concepts to other content areas/domains; develop generalizations of results obtained and strategies used, and apply them to new problem situations |
| **Apply** | Follow simple procedures (recipe-type directions); calculate, measure, apply a rule (e.g., rounding); apply algorithm or formula (area, perimeter); make conversions among representations | Select a procedure according to criteria and perform it; solve routine problem applying multiple concepts or decision points; retrieve information from a table/graph/figure and use it to solve a multi-step problem; translate between tables, graphs, words, symbolic notations; construct models given criteria | Design investigation for a specific purpose; use concepts to solve non-routine problems; use & show reasoning, planning, and evidence; translate between problem & symbolic notation when not a direct translation | Select or devise approach among many alternatives; conduct a project that specifies a problem, identifies solution paths, solves it, and reports results |
| **Analyze** | Retrieve information from a table or graph to answer a question; identify whether specific information is contained in graphic representations; identify a pattern/trend | Categorize/classify materials, data, figures based on characteristics; organize or order data; compare/contrast figures or data; select appropriate graph and organize & display data; interpret data from a simple graph; extend a pattern | Compare information within or across data sets; analyze and draw conclusions from data, citing evidence; generalize a pattern; interpret data from complex graph; analyze similarities/differences between procedures or solutions | Analyze multiple sources of evidence; analyze complex/abstract themes; gather, analyze, and evaluate information |
| **Evaluate** | *(empty)* | *(empty)* | Cite evidence and develop a logical argument for concepts or solutions; describe, compare, and contrast solution methods; verify reasonableness of results | Gather, analyze, & evaluate information to draw conclusions; apply understanding in a novel way, provide argument or justification |
| **Create** | Brainstorm ideas, concepts, or perspectives related to a topic | Generate conjectures or hypotheses based on observations or prior knowledge | Synthesize information within one data set, source, or text; formulate an original problem given a situation; develop a mathematical model for a complex situation | Synthesize information across multiple sources; design a mathematical model to inform and solve a practical or abstract situation |

**Note the empty cells** — *Remember* only exists at DOK 1. *Evaluate* effectively starts at DOK 3. So a
"generate/create" interaction is automatically pulling toward DOK 2-3, and a "recall" interaction cannot be
pushed above DOK 1 no matter how big the numbers get.

### 5.7 Smarter Balanced — claims, DOK targets, and item types

Four claims, three reported scores (Claims 2 and 4 combined):
1. **Concepts and Procedures** — split into *Priority Cluster* and *Supporting Cluster*
2. **Problem Solving**
3. **Communicating Reasoning**
4. **Modeling and Data Analysis**

**Grades 3-5 item counts:** Claim 1 = 17-20 items (13-15 priority, 4-5 supporting), all CAT, all
machine-scored. Claims 2&4 = 8-10 (6 CAT + 2-4 PT). Claim 3 = 8-10 (8 CAT + 0-2 PT). One performance
task, 4-6 items.

**The explicit DOK floor rules (CAT algorithm configuration):**
- Claim 1: each student receives **at least 7 CAT items at DOK 2 or higher**
- Claims 2 & 4 combined: **at least 2 CAT items at DOK 3 or higher**
- Claim 3: **at least 2 CAT items at DOK 3 or higher**

These are *minimums*, not a percentage distribution — a useful design pattern: guarantee a floor of
higher-DOK items per session rather than target a ratio.

**Grade 3 per-target DOK assignments:**

| Target | DOK |
|---|---|
| 3.B Understand properties of multiplication & relationship to division | 1 |
| 3.C Multiply and divide within 100 | 1 |
| 3.I Area, relate to multiplication and addition | 1, 2 |
| 3.G Measurement/estimation of intervals of time, liquid volumes, masses | 1, 2 |
| 3.D Solve problems with four operations; identify/explain patterns | 2 |
| 3.F Develop understanding of fractions as numbers | 1, 2 |
| 3.A Represent and solve problems involving multiplication and division | 1, 2 |
| 3.E Place value understanding for multi-digit arithmetic | 1 |
| 3.J Perimeter | 1 |
| 3.K Reason with shapes and their attributes | 1, 2 |
| 3.H Represent and interpret data | **2, 3** |
| Claim 2 Problem Solving targets | 2, 3 / 1, 2, 3 |
| Claim 3 Communicating Reasoning targets | 2, 3 / 2, 3, 4 |
| Claim 4 Modeling targets | 2, 3 / 2, 3, 4 |

**Fluency-type targets (3.C, 3.E) are DOK 1 only.** Data representation (3.H) is the one content target
reaching DOK 3.

**Smarter Balanced item type / interaction catalog:**

| Type | Code | Interaction |
|---|---|---|
| **Equation** | EQ | One or more entry boxes plus an **on-screen math key panel**. Item specifies which of **11 pre-defined keypad layouts** to use. Response area 769px wide, default height 254px. Elementary layout is just digits + `.` + `−`. |
| **Grid Item — Graphing** | GI | Grid where students **plot points and/or draw lines**. Tools: select, delete, add point, connect line. Background may be a plain grid, an axis graph, or **any bitmap image**. Points/lines may be **constrained** — e.g. to a number line. |
| **Grid Item — Hot Spot** | GI | Clicking hot spot areas causes images to appear/disappear. "Click *all* of the shapes that are quadrilaterals." Same technique builds **student-manipulable bar charts**. |
| **Grid Item — Drag and Drop** | GI | Workspace with background image; images dragged in from a **palette**. Drop locations may be constrained; when constrained, **dropped images snap**. Palette items **reusable**; delete tool removes them. Variant: images **pre-located**, movable but not addable. |
| **Match Interaction** | MI | Rows (text or images) × columns; student **checks boxes where a match is valid**. Multiple matches per row allowed. |
| **Multi Select** | MS | Select N of several options; prompt states how many. |
| **Multiple Choice** | MC | Exactly one answer. |
| **Table Interaction** | TI | Table with **cells students type into** — "Complete the table to show how many cups Jaleen sold each week." |
| **Hot Text** | HTQ | Interactive words/phrases **selected by clicking** or **rearranged by click-and-drag**. |
| **Evidence-Based Selected Response** | EBSR | **Two-part item**: Part A multiple choice, Part B multi-select. Options display **vertically only**. |
| **Short Answer / Extended Response** | SA / ER | Free text, configurable character limit. |
| **Writing Extended Response** | WER | Rich text with formatting toolbar. |

**Real elementary math item examples from the doc [S]:**
- *Drag-and-drop equation builder:* "Christy has $60... Drag the numbers to the boxes and the symbols to
  the circles to create an equation to show how much money Christy has left to spend. Select one plant she
  **could** buy with the money she has left." — a single item combining equation-construction with a
  dependent multi-select. Note it has **multiple valid answers**.
- *Constrained number line drag:* "Drag each fraction to the correct location on the number line" —
  fractions 4/4, 4/1, 2/4, 1/4 onto a 0-4 number line. Deliberate inclusion of improper fractions and
  equivalent values.
- *Hot spot with number line:* "Click the number line to show the height of the dirt in the tank."

**Accessibility architecture** (three tiers): **Universal Tools**, **Designated Supports**,
**Accommodations**. Notably **text-to-speech is a *designated support* for math** (vs. an accommodation
for ELA) — read-aloud is broadly available in math, precisely because reading level otherwise confounds
the math measurement. Also ASL video, closed captioning, and TTS annotations using **WCAG/ARIA tags to
describe images and diagrams**.

### 5.8 PARCC task types and the concrete balance number

| Type | Description | Sub-claims | Scoring | Math Practices |
|---|---|---|---|---|
| **Type I** | Conceptual understanding, fluency, and application | **A:** major content; **B:** additional and supporting content | Computer-scored only | Any or all |
| **Type II** | Written arguments/justifications, critique of reasoning, or precision in mathematical statements | **C:** express mathematical reasoning | Computer- and hand-scored | Primarily **MP.3 and MP.6** |
| **Type III** | Modeling/application in a real-world context | **D:** solve real-world problems engaging in the modeling practice | Computer- and hand-scored | Primarily **MP.4** |

**Grade 3 point distribution:**

| Task Type | Tasks | Points | % of assessment |
|---|---|---|---|
| Type I, 1-point | 32 | 32 | — |
| Type I, 2-point | 4 | 8 | — |
| **Type I total** | 36 | **40** | **61%** |
| Type II, 3-point | 2 | 6 | — |
| Type II, 4-point | 2 | 8 | — |
| **Type II total** | 4 | **14** | **21%** |
| Type III, 3-point | 2 | 6 | — |
| Type III, 6-point | 1 | 6 | — |
| **Type III total** | 3 | **12** | **18%** |
| **Total** | **43** | **66** | |

**This ~60/20/20 split is the single most citable balance target for a K-4 app.** Type I (which internally
blends all three legs of rigor) ≈ 60%, reasoning ≈ 20%, modeling ≈ 20%. Note the *high-value* items are
the reasoning and modeling ones — 3, 4, and 6 points each vs. 1-2 for Type I.

**PARCC evidence statements** are a useful generator architecture: derived from CCSS but can (1) use exact
standard language, (2) split a standard into parts, (3) be **integrative** (`3.NF.A.Int.1` across a
cluster; `4.NBT.Int.1` across a domain; `4.Int.2` across a grade), (4) be **reasoning** statements keyed
`C` (e.g. `3.C.2` — "Base explanations/reasoning on the relationship between addition and subtraction or
the relationship between multiplication and division"), or (5) be **modeling** statements keyed `D`
(e.g. `4.D.2`).

Two design lessons: the C/D keys mean **reasoning and modeling are tagged separately from content**;
and `4.D.2` deliberately scopes modeling to **prior-grade content** — "using **securely held knowledge
from a previous grade**." Modeling and reasoning items should draw on content the student already owns, so
cognitive load goes to the reasoning, not the arithmetic.

Sample Grade 3 evidence-statement clarifications show how much constraint good item generation needs —
for 3.OA.3-1: *"All products come from the harder three quadrants of the times table (a × b where a > 5
and/or b > 5)"* and *"75% of tasks involve multiplying to find the total number (equal groups, arrays);
25% involve multiplying to find the area."* For 3.OA.1/3.OA.2: *"Tasks involve interpreting rather than
calculating products"* — the item asks which expression represents the situation, not what the answer is.

### 5.9 Stein & Smith Task Analysis Guide (levels of cognitive demand)

**Lower-level demands**

*Memorization* — reproducing previously learned facts, rules, formulas, definitions. **Cannot be solved
using procedures, because a procedure does not exist or because the time frame is too short to use one.**
Not ambiguous. No connection to underlying meaning.
K-4: "What is 6 × 7?" (from memory) · "How many sides does a pentagon have?" · "Say the counting sequence
from 1 to 20." · "What is the formula for the area of a rectangle?"

*Procedures without connections* — algorithmic; use of the procedure is specifically called for or evident
from prior instruction. Limited cognitive demand. **Focused on producing correct answers instead of
developing mathematical understanding.** Require no explanations, or explanations that solely describe the
procedure used.
K-4: "Add: 348 + 275, 561 + 189, 407 + 296" · "Multiply each by 4" · "Find the area of each rectangle using
A = l × w" · "Reduce each fraction to lowest terms"

**Higher-level demands**

*Procedures with connections* — focus attention on procedures **for the purpose of developing deeper
understanding**. Suggest **broad general procedures with close connections to underlying conceptual
ideas**. **Usually represented in multiple ways.** General procedures may be followed but **cannot be
followed mindlessly**.
K-4: "Use base-ten blocks to solve 348 + 275, then record what you did with the standard algorithm. Where
does the regrouping show up in each?" · "Show 3/4 = 6/8 using a fraction bar, a number line, and a set of
counters; explain what stays the same." · "Solve 24 ÷ 4 by drawing equal groups, by using an array, and by
skip-counting. How are they related?"

*Doing mathematics* — **require complex and non-algorithmic thinking**; a predictable, well-rehearsed
pathway is *not explicitly suggested* by the task, task instructions, or a worked-out example. **Demand
self-monitoring or self-regulation.** Require analyzing task constraints. **Require considerable cognitive
effort and may involve some level of anxiety** because of the unpredictable nature of the solution process.
K-4: "Using each of the digits 1, 3, 5, 7 exactly once, make two 2-digit numbers whose sum is as close to
100 as possible. Convince me it's the best." · "How many different rectangles can you build with 24 tiles?
What do you notice about the ones with the smallest and largest perimeter?" · "Find as many ways as you can
to make 3/4 using these fraction pieces. How do you know you found them all?"

**Two things the TAG adds that DOK doesn't:**

1. **The "worked example" criterion.** Doing Mathematics requires that *"a predictable, well-rehearsed
   approach or pathway is not explicitly suggested by the task, task instructions, or a worked-out
   example."* **Showing a hint or a worked example converts a high-demand task into a low-demand one.** An
   eagerly-applied hint system structurally caps the app at "procedures without connections."
2. **Anxiety is named as a *feature*.** An app optimized purely for smooth, confident, streak-preserving
   experience will systematically select against the highest-demand tasks.

The two frameworks disagree slightly at the low end: a one-step word problem is **DOK 1** (Webb) but could
be *Procedures without Connections* (Stein & Smith). The TAG's Memorization category has a criterion DOK
lacks: **a procedure does not exist or there isn't time to use one** — exactly the definition of a timed
fact-fluency drill, and why *timing* a task changes its cognitive-demand category without changing the
mathematics.

### 5.10 NCTM Effective Mathematics Teaching Practices (Principles to Actions, 2014)

1. **Establish mathematics goals to focus learning**
2. **Implement tasks that promote reasoning and problem solving** — *"engages students in solving and
   discussing tasks that promote mathematical reasoning and problem solving and allow **multiple entry
   points and varied solution strategies**."*
3. **Use and connect mathematical representations**
4. **Facilitate meaningful mathematical discourse**
5. **Pose purposeful questions**
6. **Build procedural fluency from conceptual understanding** — *"builds fluency with procedures on a
   foundation of conceptual understanding so that students, over time, become skillful in using procedures
   **flexibly**."*
7. **Support productive struggle in learning mathematics**
8. **Elicit and use evidence of student thinking**

**The three that most constrain app design:**
- **#2's "multiple entry points and varied solution strategies"** is a hard test most generated practice
  items fail. "How many ways can you make 12?" has many entry points; "8 + 4 = ?" has none.
- **#6 sets an *ordering* constraint**, not just a balance one: fluency is built *from* conceptual
  understanding. Jumping to timed 6×7 drills without the array/equal-groups foundation inverts the practice.
- **#7 productive struggle** argues against instant-hint, instant-correct-answer feedback loops.

Practices #4 (discourse) and #5 (questioning) are largely **outside** what a solo practice app can deliver.
The closest an app gets is asynchronous: "explain your thinking" capture, or comparing the student's method
to a shown alternative ("Sam did it this way — how is that like yours?").

### 5.11 Recommended blend

| Dimension | Target | Source basis |
|---|---|---|
| **Content**: major work of the grade | 65-85% (K-2 nearer 85%) | CCSS Where to Focus |
| **Task type**: Type I (concepts/fluency/application) | ~60% | PARCC Grade 3 blueprint |
| **Task type**: reasoning (justify, critique, compare methods) | ~20% | PARCC Type II = 21% |
| **Task type**: modeling/application in context | ~20% | PARCC Type III = 18% |
| **DOK floor per session** | guarantee ≥1-2 DOK 2+ items and ≥1 DOK 3 item per session, rather than a ratio | Smarter Balanced CAT floor rules |
| **DOK 4** | omit | Webb: reserve for local assessment |
| **Three legs** | each present in every unit; not each present in every session | ATC "equal intensity" |

A practical reading of "equal intensity": don't try to hit all three legs in one 10-minute session.
Balance across a *unit* or a week. A pure fluency session is legitimate — as long as it isn't the only
session type the app ever generates.

### 5.12 Practice scheduling — desirable difficulties and interleaving

**Bjork & Bjork's desirable difficulties** (coined 1994): **conditions that slow down acquisition often
accelerate long-term retention and transfer.** The core five: **spacing, interleaving, retrieval practice,
generation, and varied practice.**

The key trap: the **illusion of fluency** — performance during practice is a *poor* predictor of long-term
retention and is sometimes *inversely* related. **An app that optimizes for in-session accuracy and
streaks is optimizing for the wrong signal.**

Caution: difficulties are desirable only when the learner has enough prior knowledge to overcome them.

**Rohrer, Dedrick, Hartwig & Cheung (2020), *Journal of Educational Psychology*:**
- Preregistered **cluster RCT**, 54 seventh-grade math classes, ~5 months, naturalistic setting
- **One month later, unannounced test: interleaved 61% vs. blocked 38%, d = 0.83**
- Teachers implemented it **without training** and expressed support in an anonymous survey taken before
  they knew the results

Why it works, per the paper:
> "Interleaved practice requires students to **choose a strategy and not merely execute a strategy**. This
> is not a trivial distinction, because the choice of an appropriate strategy is often challenging... many
> problems lack features that clearly indicate which strategy is appropriate."

Two mechanisms come free:
- **Spacing is automatic.** "When the practice of multiple skills is interleaved (ABCABCABC) rather than
  blocked (AAABBBCCC), the practice of any one of the skills is necessarily spaced... interleaved practice
  guarantees spaced practice."
- **Retrieval practice is an artifact of interleaving.** "With blocked practice, the formula or procedure
  to solve a problem is often the same as that needed to solve the previous problem, and this permits
  students to solve the problem without retrieving that information from memory."

Honest caveat from the same paper: *"whereas substantial evidence suggests that spacing improves
mathematics problem solving, benefits of retrieval practice have yet to be demonstrated for mathematics
tasks other than fact learning."*

Also: a formal evaluation of six 7th-grade textbooks found **78% of practice problems were blocked, 11%
interleaved, 11% hard to classify** — and "blocked practice comprises 100% of the practice problems in many
consumable workbooks and Internet-downloadable assignments."

**Elementary-specific evidence — Nemeth, Werker, Arend, Vogel & Lipowsky (2019), *Frontiers in Psychology*:**
- **236 German third graders**, randomly assigned to interleaved (n=119) or blocked (n=117)
- **14 lessons** on three-digit subtraction: decomposition strategies (stepwise, split), shortcut
  strategies (compensation, indirect addition), and the standard written algorithm
- Measured pre, post, +1 week, +5 weeks
- **Flexibility:** interleaved students used shortcut strategies significantly more often and relied
  **less** on the standard written algorithm
- **Adaptivity (choosing the right strategy for the numbers at hand):** standard algorithm 38.1% vs 21.7%;
  compensation **65.0% vs 20.5%**; indirect addition **63.0% vs 22.5%**
- Crucially, the effective intervention was **"interleaved practice combined with explicit prompts to
  compare"** — interleaving alone wasn't the whole story
- Cluster analysis: high-adaptivity students were predominantly from the interleaved condition **and had
  stronger prior arithmetic achievement**

> **Note on a correction the researchers flagged:** the parent transcript's earlier draft said interleaving
> "roughly doubled to tripled delayed-test scores." The rigor sub-agent corrected this — a commonly cited
> "72% vs 38%" figure **does not match the published RCT**, which reports **61% vs 38%, d = 0.83**.

### 5.13 Concrete implementation recommendations (rigor)

1. **Two independent axes in the generator.** `difficulty` (number magnitude, digits, regrouping,
   denominators) and `cognitive_demand` (DOK / TAG level) must not be collapsed.
2. **Tag every item on four dimensions:** CCSS standard → cluster designation (major/supporting/additional)
   → rigor leg (conceptual/procedural/application) → DOK. This is the PARCC evidence-statement architecture
   and it's what lets you enforce blend targets programmatically.
3. **Interleave by default; make blocked practice the explicit opt-in.** Rohrer's operational definition:
   *"arranged so that no 2 consecutive problems require the same strategy."*
4. **But block on first introduction.** Blocked practice produces faster initial acquisition; interleaving
   is the superior *review* structure. Interleaving works best among *confusable* items — subtraction
   strategies, or ×6/×7/×8 facts — not across unrelated topics.
5. **Add explicit comparison prompts.** "You solved this with the algorithm — Sam used compensation. Which
   was faster here?" Serves NCTM #4 synthetically, DOK 3, and Hess CRM Evaluate/DOK 3.
6. **Guarantee a DOK floor per session rather than a ratio.** Floors are more robust than percentages when
   session lengths vary.
7. **Scope reasoning/modeling items to prior-grade content** (PARCC `4.D.2` pattern).
8. **Gate hints carefully.** Per the TAG, an available worked example converts Doing Mathematics into
   Procedures without Connections. Delay hints, offer strategy prompts before procedural ones, don't
   auto-reveal on first error.
9. **Don't report in-session accuracy as the headline metric.** Report **delayed** retrieval success.
10. **Build interactions from the SBAC catalog, not just multiple choice.** Highest-value for K-4:
    constrained **number-line drag**, **hot spot multi-select**, **drag-and-drop equation builder**
    (supports multiple valid answers), **table interaction**, **match interaction**, **equation entry** with
    a reduced keypad.
11. **Text-to-speech is close to mandatory** for K-4.
12. **Rebalance mode prominence against cluster designation** (see §5.3).

---

## 6. Question format taxonomy (consolidated)

| Format | Spec | K-4 example |
|---|---|---|
| Solve & select | Standard | `7 + 5 = ?` |
| **Missing operand** | Blank in any position | `7 + □ = 12`, `□ + 5 = 12`, `12 − □ = 5` |
| **Missing operator** | Blank the symbol | `8 □ 3 = 11`, `8 □ 3 = 24` |
| **True/False** | Six structural forms (§4.9) | `9 = 9`; `37+48 = 38+47` |
| **Comparison (>/</=)** | Compare expressions, not just numbers | `6 + 7 ○ 8 + 5` |
| **Odd one out** | 4 panels, each defensible | 9, 16, 25, 43 |
| **Matching** | Equation ↔ model ↔ story | Match `18 ÷ 6` to "packed 6 to a bag" vs "shared into 6 bags" |
| **Ordering/sequencing** | Order by value or order the solution steps | Order 1/2, 2/3, 3/8, 5/6 |
| **Estimation/reasonableness** | Range answer: too low / too high / estimate | "Is 38 + 47 closer to 70, 80, or 90?" |
| **Multi-step** | Two chained subtypes; per Progressions, avoid two *hard* subtypes | See §1 G2 examples |
| **Two-answer / multi-select** | More than one correct | "Select all equations equal to 24" |
| **Error analysis** | Named misconception, fictional student | "Sam solved 63−27 = 44 because 6−2=4 and 7−3=4." |
| **Extraneous info** | Word problem with a distractor fact | "Maya has 14 crayons, 3 markers, and 6 pencils. She gives 6 crayons away…" |
| **Missing info** | Not solvable; ask what's needed | "Ben bought 4 packs of gum. How much did he spend?" |
| **Open-ended / find all** | Multiple or exhaustive answers | "Find every way to make 12 with three different digits 1–9" |
| **Visual/model-based** | Number bond, tape diagram, array, ten-frame, place-value discs | Splat!, Quick Images |
| **Fill-in equation / Open Middle** | Digit-constrained construction | "Using digits 1–9 at most once, make the difference equal 39" |
| **Balance/equality** | Relational, non-computational | `8 + 4 = □ + 5` |
| **Problem posing** | Give the equation, write the story | "Write a story problem for `? − 2 = 3`" |
| **Question deletion** | Notice & Wonder transform | "Maya has 14 crayons. She gives 6 to Ken." |

---

## 7. Gap analysis against the existing KidMath generator

> From the parent agent's reading of `src/modes/`. The metadata schema is already well-shaped:
> `createQuestionMetadata` carries `itemFamily` (conceptual/procedural/application), `cognitiveDemand`,
> `representation`, `structureType`, and `misconceptionTags`. **`structureType` is currently unused
> (`null` default) and is the natural home for CGI/CCSS subtype codes.**

| Mode | Word-problem templates present | Table 1/2 coverage |
|---|---|---|
| `addition.js` | 1: `"${a} birds joined ${b} birds. How many birds in all?"` | **Add To / Result Unknown only — 1 of 14** |
| `subtraction.js` | 1: `"${a} stickers. ${b} were shared. How many are left?"` | **Take From / Result Unknown only — 1 of 14** |
| `multiplication.js` | 2: `"${a} groups of ${b}…"`, `"${a} rows with ${b} chairs each…"` | Equal Groups + Arrays, **Unknown Product only — 2 of 9** |
| `division.js` | 2: `"split into ${divisor} equal groups… how many in each"`, `"shared by ${divisor} friends"` | **Both are partitive (Group Size Unknown) — 1 of 9, duplicated. Quotitive/measurement division entirely absent.** |
| `barModels.js` | 2: part-whole addend-unknown, comparison bigger-unknown ("more") | PT-TA/Addend Unknown + Compare/Bigger with "more". **Missing: Difference Unknown, Smaller Unknown, both "fewer" variants, multiplicative comparison, two-step, before-after.** |

Every application-family word problem in the app is a **Result Unknown / Unknown Product** — the *easiest
tier in every table*, and precisely the tier Kindergarten already masters. The `unknownAddend` subskill
exists but is emitted only as bare symbolic `${a} + ? = ${total}`, never as a situated Change/Start Unknown
story.

**Highest-leverage changes, in order:**

1. **Populate `structureType`** with the ~14 Table 1 and 9 Table 2 codes; make word-problem template
   selection a function of it rather than a single hardcoded string.
2. **Add the difficult tier** — Start Unknown and the misleading-language Compare variants. Biggest jump in
   rigor available; explicitly a Grade 1–2 expectation currently untouched.
3. **Add quotitive division** — there are zero measurement-division items.
4. **Add the Compare "fewer" variants** — what separates reading comprehension from key-word matching;
   `misconceptionTags` already has a slot (`operationSwap`).
5. **True/False with structural variety** — cheap to build, targets the best-documented misconception in
   elementary math, and `cognitiveDemand: DOK2` is honest for it.
6. **Interleave across `structureType` within a mode**, not just across modes.

---

## 8. [GAP] — what was NOT retrieved

These are the honest gaps. Nothing below was filled in from model knowledge.

### Primary sources that failed to fetch

| Source | Failure | Consequence |
|---|---|---|
| `thecorestandards.org/Math/Content/mathematics-glossary/Table-1/` and `/Table-2/` | **HTTP 403** | Tables 1 & 2 above come from MA DESE reprints + Idaho SDE CGI chart + OA Progressions, not the canonical page. Wording is believed verbatim but is **not directly verified against corestandards.org**. |
| `mathlearningcenter.org/.../sample_materials/br4-tg-u2-m3.pdf`, `br5-tg-u4-m1.pdf` | **403** | **No verbatim Bridges problem, Number Corner item, or Bridges problem string exists in this report.** Bridges structure is from secondary sources only. |
| `wodb.ca` / `ww84.wodb.ca/numbers.html` | Panels are **images, no alt text** | **No WODB panel set was retrieved from the site.** The 9/16/25/43 set came via secondary discussion. |
| `samebutdifferentmath.com` | Items are **images, no alt text** | **Zero verbatim Same But Different pairs.** All §4.15 examples are constructed. |
| `beastacademy.com/puzzles/daily` | **JS app**; puzzle rules not in served HTML | Beast Academy style *names* are verbatim; **no actual BA puzzle grid was retrieved.** All BA examples are constructed or reverse-engineered from Pershan's blog. |
| `archive.org/details/mathinfocusgrade0000unse_u1h3`, HMH MiF Sampler PDF | No item-level text extracted | **No verbatim Math in Focus student-book problem was retrieved.** MiF variety in §3.6 is a *skill inventory* from IXL alignments and HMH scope-and-sequence, not textbook problems. |
| Several PDFs (MA DESE, CGI chart, Hess CRM, SAP fluencies, Singapore Model Method) | Initially returned **binary/compressed streams**; recovered via `pdftotext` or alternate mirrors | Recovered; noted for provenance. |

### Content areas the research did not cover at all

- **[GAP] Fractions problem types (3.NF, 4.NF).** No fraction analogue of Table 1/Table 2 was researched.
  Fraction *examples* appear incidentally (fraction-of-a-set bar models, DOK examples, Open Middle number
  line), but there is **no systematic fraction problem-type taxonomy** here.
- **[GAP] Measurement, geometry, data, time, money problem types.** Covered only as cluster designations
  (§5.3) and incidental examples. No per-domain problem-type grid was retrieved for any of these — despite
  KidMath having recently added modes for all of them.
- **[GAP] Kindergarten-specific counting/cardinality (K.CC) problem types.** Only the four K
  addition/subtraction subtypes are covered.
- **[GAP] Number-writing, place-value, and rounding problem type grids.** Only place-value-disc *question
  formats* (§3.4), sourced from a teacher blog, not a curriculum document.
- **[GAP] Eureka Math verbatim Sprint content.** The Sprint *spec* is sourced from the G1 M6 Teacher
  Edition; the sample Sprint sequence in §4.1 is constructed.
- **[GAP] Bridges problem strings and Number Corner Calendar Grid actual content** (see 403 above).
- **[GAP] Distractor / wrong-answer design.** No source on how curricula construct plausible distractors,
  despite `distractors.js` existing in the codebase.
- **[GAP] The `8 + 4 = □ + 5` "fewer than 10% correct at any grade 1–6" statistic.** Appears in the parent's
  synthesis but the transcripts do not show which fetched page supplied it. Unverified.
- **[GAP] Adaptive sequencing / mastery-threshold research.** Interleaving and spacing are well covered;
  there is nothing on mastery criteria, item-response theory, or when to advance a learner.
- **[GAP] Cross-check of MiF grade placements against Singapore's own Primary Mathematics.** The §3.2
  discrepancy note (bar models in 3A vs Grade 2) was flagged but not resolved.

### Interpretive claims that are the researcher's, not a source's

- The "**14** generable templates" reconciliation in §1 is the parent agent's own reasoning about how the
  commonly-cited count of 14 maps onto a 12-cell grid. **No source states "14."** The sources describe 12
  cells, 11 one-unknown subtypes, and language variants.
- The three difficulty tiers in §1 are the agent's restatement of the Progressions' Level 1/2/3 solution
  methods and the shading legend — the tier *names* ("Easy/Middle/Difficult") are partly the Progressions'
  own ("middle difficulty" and "difficult" are Progressions terms; "Easy" is inferred).
- All **[C]**-marked examples throughout are constructed, not sourced.

---

## Consolidated source list

**CCSS problem types**
- [MA DESE — Common Addition and Subtraction Situations (Jan 2018)](https://www.doe.mass.edu/frameworks/math/2017-06qrg-common-add-sub.pdf)
- [MA DESE — Common Multiplication and Division Situations (Jan 2018)](https://www.doe.mass.edu/frameworks/math/2017-06qrg-common-mult-divide.pdf)
- [CCSS-M Progressions: K–5 Counting and Cardinality & Operations and Algebraic Thinking](https://www.isbe.net/Documents/counting-cardinality-k-5.pdf)
- [Idaho SDE — Cognitively Guided Problem Types](https://www.sde.idaho.gov/wp-content/uploads/2025/09/Cognitively-Guided-Problem-Types.pdf)
- [CGI Multiplication and Division Problem Types (Rogers PS)](https://cloud.rpsar.net/edocs/math/ProblemSolvingResources/CGI%20Multiplication%20and%20division%20Problem%20Types.pdf)
- [Wikipedia — Cognitively Guided Instruction](https://en.wikipedia.org/wiki/Cognitively_Guided_Instruction)
- [RTI in Math — Mathematics Glossary Table 1 (Richards)](https://static1.squarespace.com/static/56b90cb101dbae64ff707585/t/58f7979bd482e93a160b522b/1492621211132/RTI+in+Math_Mathematics+Glossary+%C2%BB+Table+1_Richards.pdf)

**Singapore / Math in Focus**
- [MOE Singapore — 2021 Primary Mathematics Syllabus P1-P6](https://www.moe.gov.sg/-/media/files/primary/2021-primary-mathematics-syllabus-p1-to-p6-updated-october-2025.pdf)
- [Singapore Model Method text (MOE/Marshall Cavendish)](https://people.math.harvard.edu/~engelwar/MathS305/Singapore%20Model%20Method%20Text.pdf)
- [Yan Kow Cheong — The Model Method in Singapore (TME)](https://math.nie.edu.sg/ame/matheduc/tme/tmeV6_2/05-Yan%20KC%20Final%20version.pdf)
- [Kho Yew Hoong et al. (NIE)](https://math.nie.edu.sg/wkho/Research/My%20publications/Math%20Education/Yew%20Hoong%20et%20al%20(Final).pdf)
- [Third Space — Ultimate guide to the bar model](https://thirdspacelearning.com/us/blog/teach-bar-model-method/)
- [TeachableMath — Bar Models](https://teachablemath.com/bar-models/) · [Fraction of a Set](https://teachablemath.com/fraction-of-a-set/)
- [Greenwich Schools — Model Drawing](https://www.greenwichschools.org/uploaded/district/curriculum/alp/ModelDrawing.pdf)
- [Riverside Primary — Bar Modelling Whole School Progression](https://riversideprimary.co.uk/wp-content/uploads/2024/02/Bar-Modelling-Whole-School-Progression.pdf)
- [Singapore Math Plus — before-and-after problem](https://singaporemathplus.net/a-before-and-after-singapore-math-problem/)
- [SIS4Teachers — Place value discs](https://sis4teachers.org/2022/01/using-place-value-discs-in-the-math-classroom/)
- [MiF Gr 1 Ch 8 Practice 3 answer key](https://mathinfocusanswerkey.com/math-in-focus-grade-1-chapter-8-practice-3-answer-key/)
- IXL MiF 2020 skill plans: [G1](https://www.ixl.com/math/skill-plans/math-in-focus-2020-grade-1.pdf) · [G2](https://www.ixl.com/math/skill-plans/math-in-focus-2020-grade-2.pdf) · [G3](https://www.ixl.com/math/skill-plans/math-in-focus-2020-grade-3.pdf) · [G4](https://www.ixl.com/math/skill-plans/math-in-focus-2020-grade-4.pdf)
- [MiF K-5 Scope & Sequence (HMH)](https://www.hmhco.com/~/media/sites/home/education/global/pdf/scope-and-sequence/mathematics/elementary/math-in-focus/MIF_GradeK-5_Scope_and_Sequence.pdf)
- [MiF Gr 3 Ch 3 lesson breakdown](https://mrslongs3rd.weebly.com/chapter-3-addition-up-to-10000.html)
- [Educational Studies in Mathematics — Singaporean vs Spanish textbooks](https://link.springer.com/article/10.1007/s10649-022-10169-x)
- [Contemporary Maths & Science Ed — semantic structures, Singapore P2](https://www.conmaths.com/article/an-analysis-of-semantic-structures-of-addition-and-subtraction-word-problems-used-in-primary-two-14690)
- [Frontiers in Education 2019 — Singapore textbook in England](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2019.00037/full)

**Non-standard formats**
- [Great Minds — Eureka Math Lesson Structures](https://greatminds.org/math/blog/eureka/eureka-math-lesson-structures)
- [EM G1 M6 Teacher Edition](https://greatminds.org/hubfs/knowledge/resources/math/EM_Basic_Curriculum_Files/Teacher_Editions/G1_TeacherEditions/EM_G1_M6_TeacherEdition.pdf)
- [Eureka G1 M2 Topic C Lesson 24](https://content.eureka.greatminds.org/maps/math/grade-1/module-2/topic-c/lesson-24/)
- [Beast Academy Puzzles 1](https://beastacademy.com/books/puzzles1) · [Puzzles 2](https://beastacademy.com/books/puzzles2) · [Daily Puzzles](https://beastacademy.com/puzzles/daily)
- [Beast Academy Puzzles conference handouts](https://www.giftedpage.org/wp-content/uploads/2023/11/Beast-Academy-Puzzles-Handouts-for-Conference-Talks.pdf)
- [Pershan — Crossword puzzles from Beast Academy](https://notepad.michaelpershan.com/crossword-puzzles-from-beast-academy/)
- [Activities from Investigations 3 (TERC)](https://investigations.terc.edu/at-home-resources/activities-from-investigations-3/)
- IM K-5 instructional routines: [Grade 2](https://im.kendallhunt.com/k5/teachers/grade-2/course-guide/instructional_routines.html) · [Grade 3](https://im.kendallhunt.com/k5/teachers/grade-3/course-guide/instructional_routines.html)
- Open Middle: [Grade 1](https://www.openmiddle.com/category/grade-1/) · [Grade 2](https://www.openmiddle.com/category/grade-2/) · [Grade 3](https://www.openmiddle.com/category/grade-3/)
- NRICH: [Always, Sometimes or Never? KS1](https://nrich.maths.org/problems/always-sometimes-or-never-ks1) · [Number](https://nrich.maths.org/problems/always-sometimes-or-never-number)
- Steve Wyborney: [Esti-Mysteries](https://stevewyborney.com/2019/09/esti-mysteries/) · [51 Esti-Mysteries](https://stevewyborney.com/2019/09/51-esti-mysteries/) · [Splat!](https://stevewyborney.com/2017/02/splat/)
- [wouldyourathermath.com](https://www.wouldyourathermath.com/) · [K-2](https://www.wouldyourathermath.com/category/k2/)
- [samebutdifferentmath.com](https://www.samebutdifferentmath.com/) · [addition-subtraction](https://www.samebutdifferentmath.com/addition-subtraction)
- [wodb.ca](https://wodb.ca/) · [numbers](http://ww84.wodb.ca/numbers.html)

**Rigor & cognitive demand**
- [Achieve the Core — Rigor](https://achievethecore.org/page/1090/rigor)
- [CCSS Where to Focus, Mathematics K-8 (SAP)](https://achievethecore.org/content/upload/SAP%20Focus%20Math%20K%E2%80%938%2011.12.14.pdf)
- [Achieve the Core — Fluency Resources for Grade-Level Routines](https://achievethecore.org/page/2948/fluency-resources-for-grade-level-routines)
- [Depth-of-Knowledge (DOK) Levels for Mathematics](https://static.pdesas.org/content/documents/DOK_Math_levels.pdf)
- [Hess Cognitive Rigor Matrix — Math/Science](https://www.casciac.org/pdfs/DOK_Math_Science.pdf)
- [CT SDE — K-5 Cognitive Rigor Matrix Math/Science](https://portal.ct.gov/-/media/SDE/CT-Core-Standards/2014/05/K-5_CognitiveRigorMatrixMathScience.pdf)
- [Robert Kaplinsky — DOK Matrix](https://robertkaplinsky.com/tool-to-distinguish-between-depth-of-knowledge-levels/)
- [Smarter Balanced Mathematics Summative Assessment Blueprint](https://portal.smarterbalanced.org/library/en/mathematics-summative-assessment-blueprint.pdf)
- [SmarterApp — Item Types and Accessibility Features](https://www.smarterapp.org/documents/Item_Types_And_Features.pdf)
- [PARCC Informational Guide to Grade 3 Math Summative Assessment](https://mc2.nmsu.edu/teachers/paarc/paarc_website_resources/Grade-3.pdf)
- [Smith & Stein Task Analysis Guide (1998/2011)](https://mcp-coaching.osu.edu/files/2015/11/3-5-3-Smith_Stein_2011_Task_analysis_guide.pdf)
- [NCTM Principles to Actions Executive Summary](https://www.nctm.org/uploadedFiles/Standards_and_Positions/PtAExecutiveSummary.pdf)
- [NCTM Effective Mathematics Teaching Practices (via CDE)](https://www.cde.state.co.us/comath/effectivemathteachingpractices)
- [Rohrer, Dedrick, Hartwig & Cheung (2020) — RCT of Interleaved Mathematics Practice](https://gwern.net/doc/psychology/spaced-repetition/2019-rohrer.pdf)
- [Rohrer — Interleaved Mathematics Practice guide](https://uweb.cas.usf.edu/~drohrer/pdfs/Interleaved_Mathematics_Practice_Guide.pdf)
- [Nemeth et al. (2019) — Interleaved Learning in Elementary School Mathematics](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.00086/full)
- [Bjork & Bjork — Introducing Desirable Difficulties into Practice and Instruction](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-introducing-desirable-difficulties-into-practice-and-instruction-bjork-and-bjork.pdf)
- [UEN — Concrete-Representational-Abstract in Math](https://www.uen.org/literacyresources/downloads/CRM-Math.pdf)
