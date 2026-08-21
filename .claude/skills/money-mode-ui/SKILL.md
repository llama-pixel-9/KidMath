# money mode — UI + bank patterns

Generator: `src/modes/money.js`. Bank batch `b0821` (1,837 items; see
`docs/money-bank-design.md`). Subskills: `countCoins`, `makeChange`,
`coinEquivalence`, `moneyReasoning`. Bands: K-1 = pennies/nickels/dimes,
everything stated ≤20¢; 2-3 = quarters, to ~$1; 4-5 = dollar notation.

## Rendering notes

- Coin trays render via `answerType: "coinTray"` + `display.{coins,
  coinMode}` (`src/components/CoinTray.jsx`). `count` mode shows the pile
  and takes a typed total; `build` mode has the child tap coins —
  checkAnswer compares TOTALS, not specific coins.
- Bank tray items use the letter-free values caption ("10 + 5 + 1 = ? c")
  so they pass `isVerbalPrompt` and serve at the numbers-only early levels.
  The " c" suffix keeps them distinct from addition strings; the "+"
  separator keeps them distinct from disc-mat captions ("10 10 | 1 1 = ?").
- `selectVariety` no longer lets `itemFamily` beat the band filter (level-1
  kids drew band-2/3 change questions). Keep family subordinate to band.

## Question pattern catalog

### procedural (auto-approved)

**countCoins** — `coinSumTeen/Mid/Big` "1 dime, 1 nickel and 4 pennies = ?
cents" · `trayCountTeen/Mid` visual trays, caption "10 + 5 + 1 = ? c" ·
`singleCoinKind` "3 nickels = ? cents" · `addOneCoin` "A pile is worth 35
cents. Add 1 nickel. Now it is worth ? cents" · `dollarToCents` "$1.30 = ?
cents" · `centsToDollar` "130 cents = $1 and ? cents"

**makeChange** — `changeTeen/Mid/Big` "Pay 25 cents for a 18-cent toy.
Change = ? cents" (band 1 pays from 10/15/20; band 2 from 25/50; band 3
from 100/200) · `saveUpTeen/Mid/Big` "18 cents saved. ? more cents make 25
cents"

**coinEquivalence** — `tradeTeen/Mid/Big` "1 quarter = ? nickels", "$1 = ?
dimes" · `coinsForAmountTeen/Mid/Big` "? nickels make 25 cents"

**moneyReasoning** — `fewestTeen/Mid/Big` "Fewest coins for 87 cents = ?"
(greedy) · `twoPriceTeen/Mid/Big` "7c toy + 6c toy = ? c"

### conceptual (reviewed; named prose)

**countCoins** — `coinValueJudge`/`quarterValueJudge` "Kai says one dime is
worth 5 cents. Is Kai right?" · `countVsValueJudge` "counts 1 dime and 2
pennies as 3 cents — one cent per coin. Is that right?" (the classic slip)
· `whichTotalTeen/Mid` (coin-count distractor among choices) ·
`orderInvariance` "does counting coins in a different order change the
total?" · `notationJudge` "$1.30 for 130 cents?" · `whichNotation` (digit
swap distractors) · `compareNotation` cents vs "$1 and N cents"

**makeChange** — `changeJudge_*` "expects 8 cents back. Is that right?" ·
`whichChange_*` (±1 distractors) · `anyChange_*` "pays exactly the price —
does any change come back?" (exact-payment No cases)

**coinEquivalence** — `eqJudge_*` "2 nickels and 1 dime are worth the same?"
/ fair-trade framing · `whichWorthMore_*` "1 dime or 7 pennies?" (fewer
coins can be worth more) · `pickTradeCount_*` (cents-count distractor)

**moneyReasoning** — `affordJudge_*` "has 10 cents; prize costs 7 — can
they buy it?" (includes exact-equal Yes cases) · `whichBank_*` compare ·
`leftOverPick_*` (sum-instead-of-difference distractor)

### application (reviewed; booth/stand/sale/craft-table + coin machine + trading post)

`storyPocket_*` "coins worth 10, 5, 1 cents — how many cents?" ·
`storyEarnCoin_*` "+1 coin into the jar" · `storyCombine_*` two banks
poured together · `storyShop_*` change at the booth · `storySaveUp_*` "how
many more cents?" · `storyTwoCoinPay_*` "pays with a dime and a nickel" ·
`storyMachine_*` "the coin machine gives back only nickels" ·
`storySwap_*` fair-trade judged · `storyNeedCoins_*` "the sticker machine
only takes nickels" · `storySpend_*` leftover money · `storyTwoItems_*`
two purchases · `storyFewest_*` fewest coins to pay exactly

## Traps learned building this bank

- Never STATE 25 (or anything >20) in a band-1 prompt — quarters exist
  visually at band 1 only; band-1 change works from 10/15/20-cent targets.
- Tray captions must be per-multiset unique — "Total = ?" reused across
  trays violates global promptText uniqueness.
- Data lists with repeated values ("fewest for 16" twice) and repeated
  (total, addedCoin) pairs produce duplicate prompts — dedupe by the
  RENDERED string, not the tuple.
- Greedy change-making is provably optimal for US coins — safe as the
  verifier for fewest-coins items.
