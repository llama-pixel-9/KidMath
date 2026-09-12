# Counting bank — design

Built 2026-08-20 (batch tag `b0821`, 1,506 items). Companion to
`docs/numberbonds-bank-design.md` — same recipe, counting-specific
conventions. The reviewer-facing pattern catalog lives in
`.claude/skills/counting-mode-ui` ("Question pattern catalog").

## Source survey

EngageNY modules (structure only, zero copied wording):

- **GK M1** (Numbers to 10): configuration is a first-class difficulty dial
  (row → array → circle → scatter); production ("count out N") is a distinct,
  harder shape than recognition ("how many"); the cardinality principle
  (last number said IS the count); conservation under rearrangement; zero
  arrives by decrement-to-empty; ±1 ladders; numeral-choice distractors are
  a tight ±1 window.
- **GK M5** (10–20 and counting to 100): teens as "10 ones and n ones";
  the Say Ten register; decade boundaries drilled as their own skill
  (stay-inside → cross with a model → cross abstractly); count-across runs
  with direction reversals; count-by-tens; spot-the-counting-error items.
- **G1 M6** (to 120): matched ±100 twin sequences (8,9,__,11 ↔ 108,109,__,111);
  blanks in all four positions; the 110-for-101/120-for-111 naming slip is
  THE error-analysis misconception; boundary micro-strips (108,__,110);
  quick-tens counting past 100.

## Cell matrix

Subskills `subitizing` / `countOn` / `cardinality` × 3 families × 3 bands,
every cell ≥ 50 new items (legacy approved/reviewed counting rows are extra).
Bands: K-1 counts ≤ 20 · 2-3 teens/decades ≤ 100 · 4-5 to 120.

**Numeric-first low levels**: procedural drills are letter-free emoji-figure
captions (`🍎🍎🍎 = ?` renders the rows-of-ten object figure on web AND iOS)
or bare sequences (`8, 9, 10, ?`) — they pass `isVerbalPrompt`, so the
no-word-problems path serves bank items at level 1 (verified 86/90 served,
0/90 verbal).

## Payload convention (enforced by the `countMath` QC check)

`op: "count"`, a/b null. Numeric items carry `display.counting = {kind, …}`;
the gate recomputes the answer and the assembler asserts every given is
stated in prose or pictured (emoji-run glyph counts — including per-kind
counts in mixed runs — `display.count`, frame `filled`/capacity):

| kind | givens | answer |
|---|---|---|
| `set` | count | count |
| `countOn` / `countBack` | start, more/back | start ± n |
| `next` | sequence, step | last + step |
| `between` | before, after | midpoint |
| `hidden` | total, seen | total − seen |
| `gap` | have, target | target − have |
| `moreLess` | n, delta | n + delta |
| `groups` | tens, ones | tens×10 + ones |
| `sum` | parts[] | Σ parts |

Judged items are Yes/No ("Is this right?" register — never True/False) and
carry `display.truth` for the assembler.

## Renderer bindings (from counting-mode-ui)

- `display.{emoji,count}` → object-set figure (rows of ten, five-split).
- emoji runs in promptText → emoji-run layout; `" | "` splits rows.
- `display.{sequence,step}` → sequence + unit-step number line.
- `display.numberLine.marks` → count-on scaffold.
- frames ONLY via `answerType: "tenFrame"`.

## Generator repairs shipped with this bank

`src/modes/counting.js` had the numberBonds level-leak class: no subitizing
procedural variety at any band, no cardinality procedural at band 3 → those
requests escaped the band filter and mislabeled the family, so bank consults
missed. Fixed with two `targetedOnly` drills (`subitizeDrill`,
`bigSetWriteDrill`) + the band-preserving subskill fallback. Unconditioned
variety profile unchanged (bank:variety 10/10, parity fixtures byte-stable).

## Ops notes

- Assembler: `scripts/itemGen/authorCounting.js` (dry-run default; `--write
  --tag bMMDD`). Idempotent per tag; uniqueness checked against bundle AND
  cloud counting rows (paginated), both excluding this batch's own ids.
- Signature-overuse failures only fire for buckets containing this batch —
  legacy approved counting items breach some caps on their own (known debt:
  the `counting-app-eng-*` seats-on-the-bus family ×7, and the old
  `counting-conc-cardinality-*` / `counting-conc-countOn-*` families).
- Status policy (Sai, from the numberBonds review): procedural drills are
  machine-verified → approved directly; conceptual + application go to the
  /admin queue as `reviewed`.
