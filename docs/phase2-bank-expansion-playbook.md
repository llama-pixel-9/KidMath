# Phase 2 Bank Expansion Playbook

Use this playbook when expanding any KidMath mode's item bank from the Phase 1 floor (3 items / cell) to the Phase 2 floor (**50+ items / cell**). Proven on addition, subtraction, and multiplication. Designed so several modes can be worked on in **parallel** chat windows — each window owns one mode on its own branch.

> **How to use this document**: at the start of a new chat, say something like "expand the **<mode>** mode bank to Phase 2 per @docs/phase2-bank-expansion-playbook.md". The chat should read this end-to-end, then start Session 1.

---

## 0. Target

- Every cell in the `(mode, subskill, family, band)` matrix has **≥ 50 approved items**.
- Cell matrix size per mode: `3 subskills × 3 families × 3 bands = 27 cells`.
- Items added per mode to reach the floor: **~1,200** (from a ~3-per-cell starting point).
- Bank validator (`npm run bank:report`) stays `PASS` and every `promptText` stays **globally unique** across the bank.

---

## 1. Mode Reference Table

Current per-mode metadata — do not invent values outside this table without first checking `src/modes/<mode>.js` and the existing Phase 1 items.

| Mode | Subskills | Primary `structureType` | Operator | Notes |
|---|---|---|---|---|
| `addition` | `makeTen`, `composeDecompose`, `unknownAddend` | `joinResultUnknown`, `partPartWhole`, `joinChangeUnknown` | `+` | ✅ Phase 2 done |
| `subtraction` | `differenceAsDistance`, `decomposeToSubtract`, `unknownSubtrahend` | `compareDifferenceUnknown`, `separateResultUnknown`, `separateChangeUnknown` | `−` (U+2212) | ✅ Phase 2 done |
| `multiplication` | `equalGroups`, `arrayReasoning`, `factFluency` | `equalGroupsTotalUnknown`, `arrayTotalUnknown` | `×` | ✅ Phase 2 done |
| `division` | `partitioning`, `inverseFact`, `unknownQuotient` | `partitiveDivision` | `÷` | |
| `comparing` | `benchmarkCompare`, `distanceCompare`, `symbolSelection` | `compareNumbers` | uses `<`, `>`, `=` | |
| `counting` | `cardinality`, `countOn`, `subitizing` | `countObjects` | n/a | |
| `skipCounting` | `groupsToProduct`, `patternRule`, `stepInference` | `patternNext` | n/a | |
| `placeValue` | `tensOnes`, `expandedForm`, `regroupingSense` | `buildFromUnits` | n/a | |

Level bands (use exactly these `levelRange` values):

- K-1 → `levelRange: [1, 3]`
- 2-3 → `levelRange: [4, 6]`
- 4-5 → `levelRange: [7, 10]`

---

## 2. Branch & PR Workflow

One branch per mode. Run in parallel safely because each mode's items live in distinct sections of `src/itemBank/applicationItems.js`.

```bash
# Start of work (at the start of each parallel chat):
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/phase2-<mode>        # e.g. feature/phase2-division
```

**After Session 1**, open a *draft* PR so each session's progress is visible:

```bash
gh pr create --draft --base main --head feature/phase2-<mode> \
  --title "Phase 2 <mode> bank expansion" \
  --body "Expands <mode> cells to 50+. Updated across sessions 1-4."
```

After Session 4's mop-up commit + push, mark the PR ready for review.

---

## 3. Session Cadence

Four sessions. Each session adds items to **all 27 cells** at once, across three families, so the cell matrix progresses uniformly.

| Session | Items / cell added | Cell target after session | Total items added |
|---|---|---|---|
| 1 | +13 | 16-18 | ~351 |
| 2 | +13 | 29-31 | ~351 |
| 3 | +13 | 42-44 | ~351 |
| 4 | +8 to +15 targeted | **50+** on every cell | ~200-300 |

Each session = **3 batches** inserted in this order: procedural → conceptual → application.

---

## 4. Per-Session Structure (the Hot Loop)

For each of the 3 batches in a session:

1. **Locate insertion anchor** with grep:

   ```bash
   grep -n "// ---------------- <Mode>:" src/itemBank/applicationItems.js | tail -5
   grep -n "<mode>-proc-<lastSubskill>-45-" src/itemBank/applicationItems.js | tail -3
   ```

   Insert immediately after the last item in the matching Phase 1 / prior-batch section.

2. **Compose the batch** as one `StrReplace` call. For sessions 1-3 that's **117 items** in one edit (13 items × 9 cells = 117 per batch).

3. **Validate immediately**:

   ```bash
   npm run bank:report
   ```

   The report ends with `PASS` when clean. Any `duplicate promptText shared with …` message must be fixed by editing the offending pair or rephrasing, then re-running until `PASS`.

4. **Move to the next batch** (proc → conc → app) and repeat steps 1-3.

At the **end of each session** (after all 3 batches land):

```bash
npx vitest run                                    # 130+ tests pass
npm run lint                                      # clean
npm run bank:seed                                 # creates a new timestamped migration
# NOTE: bank:seed writes supabase/migrations/YYYYMMDDHHMMSS_seed_item_bank.sql
#       — commit this file together with applicationItems.js so supabase db
#       push sees a new migration after merge.
```

Then commit with the session message (one commit per session):

```bash
git add -A
git commit -m "$(cat <<'EOF'
Phase 2 <mode> batch <N>: +<X> items across all 3 families.

… (short bulleted notes on phrasings and contexts used) …

Bundle: <before> → <after> items. Seed regenerated.
Bank report: PASS. <N> tests pass, lint clean.
EOF
)"
git push
```

---

## 5. Procedural Phrasing Rotation (Critical)

**The factor-/term-pair pool is small at the K-1 band.** Within a single subskill you will exhaust `"X op Y = ?"` quickly. To avoid prompt collisions, pick **one distinct phrasing per subskill per batch**. Over 4 batches, every pair can appear with up to 4-5 alternate prompt texts, each globally unique.

### Phrasing banks that have already been used (do *not* reuse within the same (subskill, pair) combination):

- **Canonical**: `X op Y = ?` — always safe for batch 1 within one subskill
- **Verbs**: `Compute X op Y.`, `Evaluate X op Y.`, `Calculate: X op Y.`, `Simplify: X op Y.`, `Work it out: X op Y.`, `Figure out: X op Y.`, `Find X op Y.`, `Find the product/difference/quotient: X op Y.`
- **Questions**: `What is X op Y?`, `What does X op Y equal?`, `X op Y equals:`, `Product/Difference/Quotient of X and Y?`
- **Readings**: `X times Y = ?` (mult), `X less Y is?` (sub), `X groups of Y = ?` (mult), `X by Y = ?` (mult), `Subtract X from Y.` (sub), `Share X among Y.` (div)
- **Unknown-slot variants**: `Solve: X − ? = Y.`, `In X − ? = Y, ? = ?`, `Missing value: X − ? = Y.`, `What value of ? makes X − ? = Y?`, `Find ? in X − ? = Y.`

**Strategy**: pick *one* phrasing per (subskill, batch) pair and reuse it for all 13 items in that cell. That way factor pairs can overlap across subskills within the same batch because the phrasing makes the full prompt text unique.

Example for mode `division`, batch 1:
- `partitioning`: `X ÷ Y = ?`
- `inverseFact`: `Compute X ÷ Y.`
- `unknownQuotient`: `What is X ÷ Y?`

Batch 2:
- `partitioning`: `Find the quotient: X ÷ Y.`
- `inverseFact`: `Evaluate X ÷ Y.`
- `unknownQuotient`: `Quotient of X and Y?`

…and so on for batches 3 and 4.

> **Non-arithmetic modes** (`comparing`, `counting`, `skipCounting`, `placeValue`) have no `op`. Use the same principle — one phrasing per (subskill, batch), rotating across batches. Examples:
> - `comparing/symbolSelection` batch 1: `Which is larger: X or Y?`, batch 2: `Choose the correct symbol: X __ Y.`, batch 3: `Compare X and Y using <, >, or =.`
> - `counting/cardinality` batch 1: `How many objects in the set?`, batch 2: `Count the set and state the total.`, batch 3: `What is the cardinality of {...}?`

---

## 6. Conceptual Template Families

Conceptual items use word/visual framings instead of pure symbolic computation. Keep a rotation of templates and introduce **1-2 new families per batch** so each cell ends with ~4-5 distinct templates.

Proven template inventory (from addition / subtraction / multiplication):

| Family | Example |
|---|---|
| Skip-count / jumps | "Skip count: 3, 6, 9. That's 3 jumps of 3. What is 3 × 3?" |
| Doubles / halving | "Doubles strategy: 8 × 6 = (8 × 3) + (8 × 3). What is the product?" |
| Commutative | "If 5 × 3 = 15, then 3 × 5 = ?" |
| Identity / zero | "Anything × 1 is itself. What is 1 × 7?" |
| Patterns (fives, nines, elevens) | "Nines trick: 9 × 8 digits sum to 9. What is the product?" |
| Squares | "10 × 10 is a perfect square. What is it?" |
| Area model | "A rectangle 6 units tall and 7 units wide covers how many unit squares?" |
| Place-value decomp | "14 × 3 = (10 + 4) × 3. What is the product?" |
| Distributive | "6 × 15 = 6 × 10 + 6 × 5. What is the product?" |
| Associative | "14 × 7 = 7 × (2 × 7). What is the product?" |
| Number bond | "Total 15, one part 6. What is the other part?" |
| Count-back / count-up | "Count back from 10 by 3. Where do you land?" |
| Ten-frame | "A ten-frame shows 10 dots. Erase 4. Dots remaining?" |
| Inverse operation | "If 3 + 7 = 10, then 10 − 3 = ?" |
| Bar model | "Bar model: whole of 15 with one part 5. The other part is?" |

For non-arithmetic modes add templates like:
- `comparing`: "Number-line position", "Benchmark to 10/100", "Between which two multiples of 10"
- `counting`: "Subitize at a glance", "Ten-frame fill", "Count-on from anchor"
- `skipCounting`: "Next 3 terms in the pattern", "Step size from two terms", "Multiples of N up to M"
- `placeValue`: "Tens + ones build", "Expanded form ↔ standard", "Trade 10 ones for 1 ten"

---

## 7. Application Context Rotation

Application items are word problems with named contexts. Three rules:

1. **Fresh context per batch** — avoid reusing the same noun cluster (e.g., "cookies") across batches within a mode.
2. **Age-appropriate numbers** — K-1 sticks to small numbers and kid-scale contexts (toys, pets, snacks); 4-5 can use larger and more abstract contexts (warehouse shipments, race stats, library checkouts).
3. **Rotate topic categories** across ~7 buckets: food, animals, school/classroom, home/household, outdoors/nature, sport/games, civic (library, museum, shop, festival).

A single batch of 117 application items should touch **~100 distinct nouns**.

---

## 8. Collision Debugging

If `npm run bank:report` flags `duplicate promptText shared with …`:

1. Identify the two item IDs.
2. Decide which one to rewrite (usually the newer one).
3. Options to resolve:
   - Change the numeric pair.
   - Change the phrasing (add/remove a qualifier, swap a verb).
   - Switch to an alternate template family (for conceptual).
4. Re-run `npm run bank:report` until `PASS`.

Most frequent root cause: reusing `"X op Y = ?"` across the same band in a different subskill. Fix by switching one of them to an already-existing band-specific phrasing.

---

## 9. Session 4 Mop-Up

After Session 3, cells land at 42-44 items. Session 4 must push every cell ≥ 50.

1. Find lagging cells:

   ```bash
   npm run bank:report 2>&1 | grep "<mode> ::" \
     | grep -E "application|procedural|conceptual" \
     | awk -v OFS=" " '{print $NF, $0}' | sort -n | head -10
   ```

2. Add **10 items per proc/conc cell** (90 items total) using one new phrasing round.
3. Add **15 items per application cell** (135 items total) — application tends to lag because application items were the least-dense in Phase 1.
4. After the main batch: if any cells still < 50, do a targeted mop-up batch of **5 items per still-lagging cell** until the distribution shows only counts ≥ 50.

Verify with:

```bash
npm run bank:report 2>&1 | grep "<mode> ::" \
  | grep -E "application|procedural|conceptual" \
  | awk '{print $NF}' | sort -n | uniq -c
```

Every line should show a count ≥ 50.

---

## 10. Seed & Supabase Workflow

The seed generator writes a **timestamped migration** on every invocation (see commit `203c253`). This is how `supabase db push` picks up new bank content after a merge.

```bash
npm run bank:seed          # writes supabase/migrations/YYYYMMDDHHMMSS_seed_item_bank.sql
```

Rules:
- Run `npm run bank:seed` **once per session** (after all three batches land), right before commit.
- Commit the generated migration together with `src/itemBank/applicationItems.js`.
- Do **not** overwrite `supabase/migrations/0004_seed_item_bank.sql` — that file is a historical snapshot; leave it alone.
- After the PR merges to `main`, the user runs `supabase db push` locally to apply the new migration. Because the filename is a new timestamp, Supabase's migration tracker sees it as unapplied and runs the full upsert.

---

## 11. Validation Checklist

Required at the end of **every** session (not just the final one):

- [ ] `npm run bank:report` → `PASS` with no issues
- [ ] `npx vitest run` → all tests pass (expect 130+)
- [ ] `npm run lint` → clean (the deoptimised-styling warning from Babel on `applicationItems.js` is expected)
- [ ] `npm run bank:seed` → new migration file appears under `supabase/migrations/`
- [ ] Cell distribution matches the session's target band
- [ ] Commit pushed; PR updated

Final session only:

- [ ] Cell distribution: every count ≥ 50
- [ ] Flip PR from draft to ready
- [ ] Update `docs/bank-sources.md` with a short attribution section for this mode's batches (follow the style used for addition / subtraction / multiplication)

---

## 12. Parallelism Notes

Because each mode's items live in a distinct contiguous section of `src/itemBank/applicationItems.js` (see the `// ---------------- <Mode>:` comment markers), multiple mode branches can be developed simultaneously without merge conflicts on item insertions.

Merge conflicts *will* appear on:
- `docs/bank-sources.md` — trivial to resolve; each mode adds its own entry at the top.
- `supabase/migrations/*_seed_item_bank.sql` — each mode creates its own timestamped migration, so no conflict between modes, but you may need to rebase on `main` before the final merge so your migration timestamp is after the previously-merged one.

Recommended merge order after all parallel PRs are ready:

1. Merge whichever mode finishes first.
2. For each subsequent PR: `git checkout main && git pull && git checkout feature/phase2-<mode> && git rebase main`, then re-run `npm run bank:seed` to regenerate the timestamped migration against the latest bundle, commit the new file, force-push, and merge.

This guarantees the final `item_bank` table on Supabase reflects the union of every mode's items after all merges land.

---

## 13. First-Message Template for a New Chat

Copy-paste this into a fresh chat window when starting a new mode. Replace `<mode>` and the subskill list.

```
Expand the <mode> mode item bank to Phase 2 per @docs/phase2-bank-expansion-playbook.md.

- Mode: <mode>
- Subskills: <s1>, <s2>, <s3>
- Target: every cell ≥ 50 items
- Branch: feature/phase2-<mode> (create off latest main)
- Sessions: 4 (follow the cadence in §3)

Start by branching off main, then begin Session 1 batch 1 (procedural).
Remember to run `npm run bank:seed` at the end of each session so the
timestamped Supabase migration is included in the commit.
```
