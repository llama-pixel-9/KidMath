# factorsMultiples mode — UI + bank patterns

Generator: `src/modes/factorsMultiples.js` (band-safe `selectVariety`;
`isMultipleOf` band-1 candidates capped ≤20 on 2026-08-21). Bank batch
`b0821` (1,862 items; see `docs/factorsmultiples-bank-design.md`).
Subskills: `factorCount`, `nthMultiple`, `factorPairs`, `primesAndCommon`.
Number pools: {4..12} / {12..30} / {24..60}.

## Rendering notes

- Bank answers are integers (numberPad) or strings (choice); the
  generator's multiSelect varieties are not in the bank.
- Pick drills print their choice list inside the prompt AND carry it as
  `choices` — the claim verifier checks that no other choice satisfies the
  property (exactly-one-correct is enforced at authoring).

## Question pattern catalog

### procedural (auto-approved)

**factorCount** — `countFactors_*` "How many factors does 12 have?" ·
`missingFactor_*` LETTER-FREE "12 = 3 x ?" · `pickFactor_*` /
`pickNonFactor_*` "Which of 3, 5, 7, 11 is (NOT) a factor of 12?"
**nthMultiple** — `nthMultiple_*` "The 4th multiple of 5 = ?" ·
`multipleSeq_*` LETTER-FREE "x5: 5, 10, 15, ?" (+ long-window variant) ·
`nextMultiple_*` "next multiple of 4 after 12" · `pickMultiple_*`
**factorPairs** — `pairComplete_*` "3 pairs with which number to make
12?" · `pairRows_*` LETTER-FREE "12 = ? x 4" · `pairPick_*` "Which pair
multiplies to 12: 3 x 4, …?" · `pairCount_*` **primesAndCommon** —
`primePick_*` "Which of 9, 4, 6, 5 is prime?" · `classify_*`
prime/composite · `commonMultiple_*` LCM · `commonFactor_*` GCF

### conceptual (reviewed; named prose, mostly judged)

**factorCount** — `isFactorJudge_*` "3 is a factor of 12 — right?" ·
`rowsJudge_*` equal-rows-with-none-left checks · `oneSelfJudge_*` 1 and n
are always factors (Yes) **nthMultiple** — `isMultipleJudge_*` ·
`nthSaidJudge_*` off-by-one multiple audits · `selfMultipleJudge_*` n is
its own first multiple (Yes) **factorPairs** — `pairJudge_*` ·
`sumTrap_*` "5 and 7 pair for 12 because 5+7=12" (No) · `swapJudge_*`
"3 x 4 and 4 x 3 are the SAME pair" (Yes) **primesAndCommon** —
`primeJudge_*` · `evenPrimeJudge_*` 2 as the only even prime ·
`oneNotPrime_*` "1 is prime" (No)

### application (reviewed; 3 skeletons × 17 names per band)

`storyRows_*`/`storyBags_*`/`storyFit_*` (equal rows/bags; leftover-zero
judgments) · `storyBus_*`/`storyPage_*`/`storyLap_*` (nth-event timing) ·
`storyGarden_*`/`storyDesk_*`/`storyQuilt_*` (rows-per-arrangement) ·
`storyMeet_*`/`storyPack_*`/`storyBasket_*` (lcm meet-again / equal packs,
gcf identical baskets).

## Traps learned building this bank

- Pick prompts MUST embed the choice list — "Which number is a factor of
  12?" repeated per phrasing collides on promptText across rows.
- Band-1 lcm/gcf data must avoid nested pairs (lcm(2,4)=4, gcf(4,8)=4):
  the answer is literally in the prompt, and phrasings without a `?`
  marker fail structureMatch's answer-stated rule.
- "The factor pairs of 32 number how many?" fails nounlessQuestion —
  "how many pairs" needs the noun.
- k=2 ordinals: "2th bus" — always route through an ordinal helper.
- Seed sampling is subskill-aware but was verbal-blind; buildSeedBank now
  sorts non-verbal first so offline words-off cells can serve.
