# Content & Engagement Gap Analysis — July 2026

Status: analysis complete, plan proposed
Evidence: `npm run bank:variety` (2026-07-28 run), `npm run bank:audit`, live DB coverage query,
full source inventory of all 22 modes + widget/gamification layers, measured against
`research-k4-problem-types.md`, the MiF scope-and-sequence, and `resources/` (CCSS Progressions,
EngageNY K-4 full modules).

The question asked: **within each mode and each grade, is there enough genuine variety of
problems and play to keep a child engaged?** Short answer: the *structure* engine built in M1-M4
is real and working, but variety is badly skewed toward upper levels, the bank serves only 8 of
22 modes, manipulatives are mostly look-don't-touch, and the gamification loop stops at "stars
that go nowhere."

---

## 1. How the app's levels map to grades

Levels are within-mode difficulty, not absolute grades. Every mode has 3 structural bands
(L1-3 / L4-6 / L7-10) with a magnitude ramp inside each. A mode's bands land on different grades
depending on the mode:

| Mode | Primary grade span | L1-3 serves | L7-10 serves |
|---|---|---|---|
| counting, comparing, numberBonds | K-1 | **Kindergarten** | G1-2 |
| addition, subtraction, skipCounting, placeValue | K-2 | **Kindergarten** | G2 |
| time, money, measurement, patterns, linesShapes, dataGraphs, placeValueDiscs | 1-4 | G1 | G3-4 |
| barModels, multiplication, fractions | 2-4 | G2 | G4 |
| division, areaPerimeter | 3-4 | G3 | G4 |
| decimals, factorsMultiples, angles | 4 | G4 entry | G4 mastery |

Two consequences:
- **The L1-3 band IS the Kindergarten/entry experience** for every mode — and it is measurably
  the weakest band in the app (§2.1).
- **The app cannot say "2nd grade" anywhere.** Three bands cover five grades; K/G1 share cells,
  G3/G4 share cells. No kid- or parent-facing grade identity exists (§2.7).

---

## 2. Cross-cutting gaps (ranked by impact)

### 2.1 The entry band has the least variety in the app — backwards for engagement

Fresh variety run (500 items/cell, target ≤25% repetition of one signature): **all 55 failing
cells but 4 are in L1-6, and the worst are L1-3**:

| Mode | worst share @ L1-3 | structures at L1-3 vs total |
|---|---|---|
| skipCounting | **53%** | 2 of 14 |
| placeValueDiscs | **52%** | 2 of 12 |
| time | **50%** | 4 of 15 |
| addition | 40% (fails 9/10 levels) | 2 of 7 |
| counting | 40% | 8 of 14 |
| multiplication | 39% (fails 7/10) | 2 of 9 |
| subtraction | 38% | 1 of 7 |
| comparing / placeValue / numberBonds | 36-38% | 3 of 13-15 |

The variety catalogs gate most varieties to bands 2-3, so the youngest players — the ones with
the shortest attention spans and the most need for novelty — see 1-4 question shapes repeating.
A Kindergartner in subtraction sees essentially **one shape** at half the repetition budget blown.

### 2.2 The bank is a barbell: 2 deep modes, 6 thin, 14 empty

Live approved coverage (application/conceptual/procedural × K-1/2-3/4-5):

| | items | status |
|---|---|---|
| addition | 1,343 | deep |
| multiplication | 1,398 | deep |
| subtraction | 787 | mid |
| comparing, counting, division, placeValue, skipCounting | 85-90 each (~9/cell) | thin — one adaptive session targeting a weak cell can exhaust it |
| **the other 14 modes** | **0** | generator-only, including all prose a child reads there |

Division at 86 items is indefensible for a core operation. The 14 zero-bank modes include the
most visual, most engaging modes (time, money, fractions, barModels…) — exactly where curated
play should live.

### 2.3 Eleven of 24 CCSS structures still reach no child

Bank audit: `addToStartUnknown`, `takeFromStartUnknown`, all four hard Compare variants,
`bothAddendsUnknown`, `arrayRowCountUnknown`, and all three multiplicative-Compare structures
have **zero approved items**. The 120-item authored batch covering the ten difficult structures
is generated, QC-passed, reworded, and **waiting in the review queue** — the gap is one review
session away from closing for L7-10. Notably missing even from generators at K: **Both Addends
Unknown** ("5 = 0+5, 1+4, …"), one of Kindergarten's four canonical subtypes and MiF's
number-bond signature.

### 2.4 Manipulatives are mostly look-don't-touch

The CPA promise is half-kept: 15 widgets exist, but —
- **placeValueDiscs is read-only**: no dragging discs, no trading 10 ones for a ten — the entire
  point of the manipulative. Regroup varieties silently downgrade to typed answers.
- **No ten-frame widget at all** — the single most canonical K-1 representation in MiF and
  EngageNY. Make-ten is taught here entirely in symbols.
- Pictographs, tally charts, line plots render as **text** in dataGraphs.
- `FractionInput` is fully built and **used by zero modes**; missing-digit puzzles (MiF G3-4
  signature) have no digit-tile widget; clock is read-only (no "set the hands").
- Celebration inequity: confetti fires on multiple-choice bubbles only — a child who answers via
  numberPad, clock, coins, or any builder widget gets no confetti, ever. The most interactive
  answers get the least reward.

### 2.5 Every session is the same 15-question quiz

MiF's lesson arc is *Learn → Guided → Hands-On → Practice → Math Journal → Thinking Cap*.
Other curricula run daily warm-up routines (Number Talks, WODB, estimation, Splat). Our session
is: 15 adaptive questions, uniform pacing, done. Many "routine" formats already exist as
varieties (oddOneOut, hiddenCountSplat, estimation, error analysis) but nothing sequences them
into a session with an arc — no warm-up slot, no capstone challenge, no MiF-style "vary one
thing at a time" problem sets, no two-step story capstones at G2+.

### 2.6 Gamification is bones without a loop

What exists is solid bones: per-session stars, streak toasts, level ring, level-up sound/toast,
spaced-repetition mistake bank, 5 themes, session-complete trophy screen. What's missing is the
**loop that makes kids come back**:
- Lifetime stars accumulate invisibly and are **never spendable, never displayed** outside the
  end-of-session card.
- **No day streaks, no daily goal**, no calendar — nothing acknowledges "you came back."
- **No badges/achievements** — structure mastery ("cracked the *fewer-means-add* trap"),
  mode completion, review-comeback wins are all unrecognized.
- **No visible journey** — levels 1-10 exist as a number, not a map a child can see themselves
  climbing. Themes are premium-gated only; nothing is *earned*.
- **No parent view** at all: mastery, grade alignment, time played — stored, never surfaced.

### 2.7 No grade identity

A parent cannot pick "Kindergarten" and trust the app; a 2nd grader's "on track" is
inexpressible (§1). Bank bands (K-1/2-3/4-5) conflate exactly the grades parents distinguish.

### 2.8 Grade-specific topic holes vs MiF/EngageNY scope

| Grade | Missing or weak vs curriculum |
|---|---|
| **K** | Both Addends Unknown decompositions; ten-frames; more subitizing/hidden-count play; variety floor (§2.1) |
| **G1** | Doubles/doubles+1 strategy items; fact families as a first-class shape (exists only as a format); make-ten with visual support |
| **G2** | **Two-step word problems** (a hard curriculum expectation — only barModels has one two-step variety); compensation & number-line addition strategies; mental-math chapter equivalents; money+regrouping integration |
| **G3** | Missing-digit puzzles; estimation-then-verify in word problems; money word problems tied to 4-digit ops; quotitive division (4 bank items!); "Thinking Cap" non-routine slot |
| **G4** | Multiplicative compare (0 items); multi-step problems with estimation checks; six-digit magnitude work; decimals bank empty; factor/multiple applications |

---

## 3. Per-mode gap matrix

Format: **variety** (L1-3 → L7-10 structures; worst repetition), **bank** (approved items),
**interactivity**, **top gaps**.

| Mode | Variety | Bank | Interactivity | Top gaps |
|---|---|---|---|---|
| counting | 8→10 of 14; 40%@L1-3 | 85 | MC/typed, Splat exists | K band still fails target; no ten-frame; countBack thin |
| comparing | 3→14 of 15; 38%@L1-3 | 85 | symbolSelect, numberLine | L1-3 gating; bank thin |
| numberBonds | 3→13; 36%@L1-3 | 0 | bond builder | K gating; no ten-frame pairing; bank empty |
| skipCounting | 2→14; **53%**@L1-3 | 85 | numberLine | Worst entry band in app |
| placeValue | 3→15; 36%@L1-3 | 90 | numberLine | L1-3 gating; bank thin |
| placeValueDiscs | 2→12; **52%**@L1-3 | 0 | **read-only discs** | Trading/regrouping not manipulable — the mode's reason to exist |
| addition | 2→7 structures ×12 formats; fails 9/10 levels | 1,343 | MC-dominant | bothAddendsUnknown absent; K sees 2 shapes; two-step absent |
| subtraction | 1→7 ×6 formats; 38%@L1-3 | 787 | MC-dominant | K sees ONE shape; hard compares await review |
| barModels | 16 varieties, healthy | 0 | bar display, not draggable | Bank empty; bars not buildable by kids |
| multiplication | 2→9 ×8 formats; fails 7/10 | 1,398 | typed at L9-10 | K/G2-entry band repetition; mult-compare bank 0 |
| division | 2→6 ×5; 27%@L1 | 86 | MC/typed | Bank nearly empty; quotitive starved (4 items) |
| factorsMultiples | 13 varieties, passes | 0 | multiSelect | Bank empty; no G4 applications depth |
| patterns | 13, passes | 0 | fillBlank/MC | Bank empty; growing-pattern visuals thin |
| fractions | 20, passes | 0 | area/line/set visuals | Bank empty; **FractionInput unused**; add-unlike absent (G5 ok) |
| decimals | 4→14; 27%@L1-3 | 0 | decimal pad, line | Entry band thin; bank empty |
| measurement | 16, passes | 0 | MC/typed only | No ruler/visual manipulative; bank empty |
| money | 15, passes | 0 | **coinTray (photo coins, in progress)** | Bank empty; change-making could be tray-interactive both ways |
| time | 4→15; **50%**@L1-3 | 0 | clock read-only | No set-the-hands; entry band repetition; bank empty |
| areaPerimeter | 4→16; 29%@L1-3 | 0 | typed/MC on figures | No tile-the-grid interaction; bank empty |
| linesShapes | 17, passes | 0 | shapeFigure count/select | Bank empty; composition/decomposition visuals thin |
| angles | 4→15; 28%@L1-3 | 0 | angle reader | No protractor drag; bank empty |
| dataGraphs | 16, passes | 0 | barGraph only | Pictograph/tally/linePlot are TEXT; bank empty |

---

## 4. The plan

Six workstreams, ordered so each unblocks the next. A/B/E are the highest engagement-per-effort.

### A. Entry-band rescue (fixes §2.1) — the single highest-impact content fix
For every mode failing at L1-3: extend the variety catalog downward so **band 1 has ≥8 shapes**,
using K-appropriate play (subitize flashes, hidden/Splat reveals, which-one-doesn't-belong,
count-around, build-and-check) rather than watered-down band-2 items.
Build the **ten-frame widget** (used by counting, addition, numberBonds, subtraction at K-1) and
add **Both Addends Unknown** decomposition play (bond builder already supports multi-answer).
Acceptance: variety report shows **0 failing cells at L1-3** (currently 51).

### B. Finish the difficult tier + bank the starved cells (fixes §2.2, §2.3)
1. Review session: approve the 120 pending items (options are ranked; bulk approve works).
2. Scale `authorStructures --per 40` for the 10 difficult structures; author the 11 empty
   structures including multiplicative compare; re-tag the 22 ambiguous legacy items.
3. Raise the 5 thin modes (comparing, counting, division, placeValue, skipCounting) to ≥25/cell
   (tiered plan already in `problem-variety-expansion-plan.md` §Phase 5a); then application
   cells for the 14 empty modes, worst-traffic first (time, money, fractions first — most
   played, most visual).
   All authoring flows through the reword-and-choose pipeline (structureRules gold register).

### C. Make manipulatives manipulable (fixes §2.4)
Priority order by grade reach: **ten-frame** (A) → **draggable place-value discs with trading**
(regrouping is the G1-3 spine) → **pictograph/tally/linePlot renderers** → **digit tiles**
(missing-digit puzzles, MiF G3-4) → set-the-hands clock → protractor drag → tile-the-grid area
→ wire the orphaned FractionInput. Every widget gets the same celebration path as MC (confetti
+ sounds parity — trivial fix, do first).

### D. Session arc & problem sets (fixes §2.5)
Restructure the 15-question session into a **3-act arc** without changing the engine:
1. **Warm-up (2 q)**: one rotating routine — estimation, WODB/odd-one-out, true/false talk,
   Splat. Low stakes, no stars lost.
2. **Core (11 q)**: adaptive as today, plus **variation sets** — occasionally serve 3 questions
   that vary exactly one thing (8+5 → 8+6 → 18+5), labeled as a "combo" with a bonus star.
3. **Thinking Cap (1-2 q)**: one non-routine/two-step/error-analysis capstone at 2× stars.
   G2+ gets true two-step stories here (new format work, the one real content build in D).

### E. Close the gamification loop (fixes §2.6) — makes A-D *felt*
1. **Stars become currency**: persistent star counter on home; a small reward shop (avatar
   accessories/stickers/theme accents — cosmetic only, sits alongside premium gating).
2. **Day streak + daily goal**: "3 days in a row!" calendar, one gentle daily quest
   ("earn 10 stars in any mode").
3. **Mode journey map**: each mode's 10 levels drawn as a path with the child's pin on it;
   band boundaries are landmark badges ("Explorer → Adventurer → Master").
4. **Badges** tied to *structures*: mastering the fewer-means-add trap, clearing 5 mistake-bank
   reviews, first two-step story. The mistake-bank comeback badge rewards exactly the behavior
   the engine already tracks.
5. **Parent snapshot**: one screen — time played, streak, per-mode level, weakest/strongest
   subskills mapped to grade language ("comparing word problems — Grade 2").

### F. Grade identity (fixes §2.7)
Map (mode, band) → grade labels once, in data. Home gains an optional "My grade" lens:
picking **2nd grade** curates the right modes at the right bands and names them in grade terms.
Parent snapshot and bank cells reuse the same mapping. (Content already exists; this is
navigation + labeling.)

### Sequencing & measures

| Order | Workstream | Measure |
|---|---|---|
| 1 | C-parity (confetti/sounds on widgets) + B-review | trivial; unblocks everything felt |
| 2 | A (entry band + ten-frame) | 0 failing L1-3 cells in variety report |
| 3 | E1-E3 (stars, streaks, journey) | D1/D7 retention in telemetry |
| 4 | B (bank depth) | no cell < 25; difficult structures ≥ 40 each |
| 5 | D (session arc) | session completion rate; Thinking Cap attempt rate |
| 6 | C (big widgets), E4-E5, F | per-widget usage in telemetry |

CI guard already exists (`bank:variety`); tighten it from warn to fail at L1-3 once A lands.
