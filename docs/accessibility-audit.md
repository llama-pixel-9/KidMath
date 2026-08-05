# Accessibility audit — answer widgets (WO-8)

**Date:** 2026-08-05
**Scope:** The 11 interactive answer widgets in `src/components/` — NumberLine, AnalogClock, CoinTray, FractionInput, TenFrame, PlaceValueDiscs, NumberBond, BarModel, MultiSelect, SymbolSelect, NumberPad — assessed against WCAG 2.1 AA. Shared infrastructure was read where it determines widget behaviour: `src/components/kit/index.js` (feedback/selection classes), `src/index.css` (focus styling), and `src/MathExplorer.jsx` (session host: widget mounting, feedback lifecycle, answer reveal).
**Method:** Static code review only. No screen-reader (VoiceOver/NVDA/JAWS), keyboard-only, or switch-access testing has been performed yet. Findings below are what the code demonstrably does; live assistive-technology testing may surface additional issues (especially around focus order in practice, SVG announcement behaviour across browsers, and framer-motion's effect on focus) and is a required follow-up before any conformance claim.

A note on the pre-audit hypothesis: **CoinTray was suspected to be a drag-only hard failure of SC 2.1.1. Code review does not confirm this.** CoinTray has no drag interaction at all — every coin is a real `<button>` toggled by click/Enter/Space, with `aria-label` and `aria-pressed` (`CoinTray.jsx:21–48`). No component in scope uses drag, pointer-move, or touch-specific handlers (verified by grep for `onPointerDown`/`onTouchStart`/`onDrag`/`draggable` — the only hit is `draggable={false}` on the coin image). The genuine SC 2.1.1 hard failure in this set is **NumberLine's locate mode**, detailed below.

---

## Findings table

| # | Component | Finding | WCAG SC | Severity | Effort |
|---|---|---|---|---|---|
| 1 | NumberLine | Locate mode: tick targets are SVG `<circle>`s with `onClick` only — not focusable, no role, no key handler. Zero keyboard path to pick a number. | 2.1.1 | **Blocker** | M |
| 2 | NumberLine | The interactive circles live inside `<svg role="img">`, which presents the entire SVG as a flat image — descendants (including any future focusable ticks) are hidden from assistive technology. | 4.1.2, 1.3.1 | **Blocker** | M |
| 3 | All widgets (systemic) | Correct/wrong outcome is never announced: no live region anywhere carries "correct"/"wrong". Feedback is a ring class swap + confetti; the reveal text ("The answer is X!") is not in a live region either. Silent to screen readers. | 4.1.3 | **Serious** | S–M |
| 4 | All widgets (systemic) | Correct vs wrong conveyed by ring **colour alone** (teal vs ember, `kit/index.js:34–38`) — same shape, same weight, no icon/text difference at the widget level. | 1.4.1 | **Serious** | M |
| 5 | All widgets (systemic) | On answer submit every control becomes `disabled`; the focused button loses focus to `<body>`. Each new question remounts the widget (`MathExplorer.jsx:1508` `key=`), resetting focus again. No focus management anywhere. | 2.4.3, 2.4.7 | **Serious** | M |
| 6 | All widgets (systemic) | No designed focus indicator: zero `focus`/`focus-visible`/`outline` rules in `src/index.css` or any widget. Keyboard focus relies entirely on the browser-default ring over saturated tinted buttons; visibility/contrast unverified. | 2.4.7, 1.4.11 | **Moderate** | S |
| 7 | TenFrame | Count mode: the frame IS the question, but cells announce only "counter" / "empty cell" — red (`filled`) vs blue (`filledB`) counters are distinguished by colour alone and share the same accessible name. No text summary of frame contents exists. A screen-reader user cannot do the task. | 1.1.1, 1.4.1 | **Serious** | S |
| 8 | NumberLine | Picked state is silent and colour/position-only: the filled circle plus the "You picked 7" paragraph (not a live region). Keyboard/SR users get no confirmation of state. | 4.1.3, 1.4.1 | Serious (subsumed by #1/#2 until those are fixed) | S |
| 9 | NumberLine | Jump mode: the hop (arc + two coloured dots) has no text alternative; the `aria-label` says only "Number line from X to Y". A non-visual user cannot perceive from/to. (Also noted: `submit()` at line 42 auto-computes `|to−from|`, so the Check button submits the correct answer regardless of the child's reading — a functional oddity flagged for the team, not a WCAG issue.) | 1.1.1 | **Serious** | S |
| 10 | FractionInput | Active-field state (numerator vs denominator) shown only by a teal ring (`fieldClass`, lines 33–36); no `aria-pressed`/`aria-current`/`aria-describedby`. SR users can't tell which field the digit pad edits. | 4.1.2, 1.4.1 | **Serious** | S |
| 11 | FractionInput | `aria-live="polite"` is on a container that *wraps interactive buttons* (lines 39–43) — live regions containing controls behave unpredictably; announcements may include button re-renders or be dropped. | 4.1.3 | Moderate | S |
| 12 | PlaceValueDiscs | The disc columns are plain `<div>`s (lines 29–43). Content is technically readable as a stream of text ("100 100 100…") but there is no grouping semantics or count summary ("3 hundreds"); tedious and error-prone for the maths task. | 1.3.1, 1.1.1 | Moderate | S |
| 13 | BarModel | Segment values are real text (good), but correct/wrong feedback is a text-colour change only (`text-deep-teal`/`text-ember`, lines 73–75) inside an `aria-live` container whose *text* never changes — so the outcome is both colour-alone and unannounced. Live region also wraps the visual diagram (noisy re-announcements possible). | 1.4.1, 4.1.3 | Moderate | S |
| 14 | MultiSelect | Good bones (`aria-pressed`, text labels). "Chosen N of M" progress text (lines 74–80) is not a live region, so count changes are silent; selection is bg-tint + ring (ring appearance is a non-colour cue — acceptable, but marginal). | 4.1.3 | Moderate | S |
| 15 | SymbolSelect | Good names ("less than"/"greater than"/"equal to", line 48). Wrong-answer shake `animate` at lines 38–45 keys off `lowEndDevice` only — it plays even when `lowMotionMode` is on (same pattern in MathExplorer choice bubbles, line 1556). | 2.3.3 | Minor | S |
| 16 | AnalogClock | Keyboard-fine (all buttons). The SVG `aria-label` "clock showing H:MM" (line 32) discloses the exact answer to SR users — arguably the correct accommodation for a blind child, but it is an unexamined pedagogical decision, and unformatted props could yield "clock showing undefined:NaN". Hour vs minute hands differ by colour *and* length/weight — passes 1.4.1. | — (note) | Minor | S |
| 17 | CoinTray | No drag (see note above). Count-mode residual issue: coins remain toggleable (`toggle` ignores `mode`, lines 72–75) as a counting aid, but that affordance is undiscoverable and unexplained to AT users; selection state in count mode is decorative. Labels ("penny, 1¢") deliberately disclose value — same pedagogical question as #16. | — (note) | Minor | S |
| 18 | NumberBond, NumberPad, AnalogClock, PlaceValueDiscs, TenFrame, FractionInput, BarModel | Digit-pad buttons lack `type="button"` (harmless outside a form today; a latent submit bug if ever wrapped in one). Entry displays with `aria-live="polite"` (NumberPad:47–51, AnalogClock:46, PlaceValueDiscs:48, NumberBond has **none** on its "?" slot, lines 39–44) — NumberBond's entry is silent. | 4.1.3 | Minor (NumberBond entry: Moderate) | S |

Severity key: **Blocker** = a user group cannot complete the task at all · **Serious** = task completable only with substantial difficulty or missing information · **Moderate** = degraded experience / conformance gap · **Minor** = polish or latent risk.

---

## Per-component detail

### NumberLine — `src/components/NumberLine.jsx`

The one true SC 2.1.1 blocker in this set.

- **Keyboard (2.1.1) — FAIL (locate mode).** The only way to answer is clicking an invisible SVG `<circle r="14">` with a bare `onClick` (lines 74–83). SVG circles are not focusable, have no `tabindex`, no role, no `onKeyDown`. A keyboard-only user can Tab to exactly one thing — the disabled-until-picked Check button (lines 124–132) — and can never enable it. **The task is impossible without a pointer.** The instruction text confirms the assumption: "Tap the number line" (line 120).
- **ARIA (4.1.2/1.3.1) — FAIL.** `<svg role="img" aria-label="Number line from ${min} to ${max}">` (line 51) flattens the whole graphic: even if the circles were focusable, `role="img"` marks descendants presentational. Fixing keyboard access requires removing `role="img"` from the container (or restructuring so interactive ticks live outside the image role) and giving each tick an accessible name.
- **State announcements.** Picking a tick sets a filled circle (lines 105–114) and updates "You picked 7" (lines 118–122) — neither is a live region; the state change is silent.
- **Names for the maths task.** There are no per-tick names at all today. The remediation target is names like "7, tick mark on a number line from 0 to 20", not merely "button".
- **Jump mode (1.1.1) — FAIL.** The hop is an arc plus an accent dot (from) and a warm dot (to) (lines 89–103) with no text alternative; nothing in the accessible tree conveys from/to. Separately (functional, not WCAG): `submit()` line 42 sends `Math.abs(to - from)` computed by the component, and `canSubmit` is unconditionally true in jump mode (line 46) — pressing Check always submits the correct answer.
- **Keyboard path needed:** roving-tabindex or arrow-key model — the tick group takes focus once; Left/Right move a highlighted candidate tick by `step` (announcing "7 of 0 to 20"); Enter/Space picks it; the picked value announced via live region. This is the shape of the shared "keyboard-drag/slider utility" recommended below (a `role="slider"` with `aria-valuemin/max/now/text` is the cheapest conformant implementation).

### AnalogClock — `src/components/AnalogClock.jsx`

- **Keyboard — PASS.** All interaction is real buttons (digits lines 50–61, backspace 62–71, 0 at 72–80, Go 81–90); backspace and Go have `aria-label`s.
- **ARIA.** Entry display has `aria-live="polite"` (line 46) — digit entry is announced. Clock SVG: `role="img" aria-label={"clock showing H:MM"}` (line 32). This is a meaningful name and, for a read-the-clock task, it *states the answer*. That is defensible as accommodation but should be a conscious decision; also `hour`/`minute` are interpolated raw, so missing props would produce "clock showing undefined:NaN".
- **Colour (1.4.1) — PASS** for the hands: minute (sky, thin, long) vs hour (slate, thick, short) differ in length and weight, not colour alone. Entry-display correct/wrong tone (line 26–27) is colour-only — covered by systemic finding #4.
- **Focus.** No custom indicator; on lock, focused key becomes disabled → focus drops (systemic #5, #6).

### CoinTray — `src/components/CoinTray.jsx`

- **Drag suspicion — NOT CONFIRMED.** There is no drag interaction. Each coin is `<motion.button type="button">` with `onClick` toggle (lines 21–48); the interaction is tap-to-select/deselect, total shown live. `draggable={false}` (line 42) exists only to stop native image ghost-drag.
- **Keyboard (2.1.1) — PASS.** Coins are buttons; count-mode `<input inputMode="numeric">` (lines 125–135) supports typing and Enter-to-submit (line 131); Check is a button.
- **ARIA — the strongest widget in the set.** `aria-label={"penny, 1¢"}` (line 27) and `aria-pressed` (line 28) on every coin; running total in build mode is `aria-live="polite"` (line 112); the wrong-answer hint "N¢ short / too much" (lines 116–122) is genuinely useful text feedback — the only widget that tells the child *how* they were wrong in words. Note the value-in-label discloses coin values (accommodation trade-off, as with the clock).
- **Gaps.** Selected state visual is ring + 6px lift (lines 29–35) — motion plus ring, acceptable under 1.4.1. In count mode, coins are still toggleable (lines 72–75) purely as a marking aid; the selection has no semantics for the task and nothing explains it. Identical coins get identical names ("dime, 10¢" × 3) with no positional index — acceptable, but "dime 2 of 3" would aid non-visual tracking.

### FractionInput — `src/components/FractionInput.jsx`

- **Keyboard — PASS.** Numerator/denominator selectors are `<button>`s (lines 44, 48); digit pad is buttons.
- **ARIA — FAIL on active-field state.** Which field the pad edits is shown *only* by `ring-4 ring-teal` vs transparent ring (lines 33–36). No `aria-pressed`, no announcement. A screen-reader user hears "Numerator, button" / "Denominator, button" with no way to know which is active, then types digits into an unknown target. The digit destination switch is the core interaction and it is silent.
- **Live region misuse.** `aria-live="polite"` sits on the container that *contains* both buttons (lines 39–43) — a live region wrapping interactive controls is unreliable and can re-announce the whole fraction on every keystroke or not at all, depending on AT.
- **Colour.** Feedback tone lines 27–32: ring colour + text colour only (systemic #4). Active ring is presence-of-ring, not colour-vs-colour — passes 1.4.1 visually, fails to reach AT (above).

### TenFrame — `src/components/TenFrame.jsx`

- **Keyboard — PASS (build mode).** Cells are real buttons (lines 79–97); fixed cells and count-mode cells are `disabled` (line 85).
- **ARIA / non-text content — FAIL (count mode).** In count mode the frame is the entire stimulus, and its accessible rendering is 10–20 *disabled* buttons named "counter" or "empty cell" (line 86). Red `filled` vs blue `filledB` counters — the whole point of showing 5 + 3 as five-and-three (comment lines 33–35) — are distinguished by **colour alone** (`counterTone`, lines 56–63) and share one name, "counter". No summary text ("ten frame 1: 5 red counters, 3 blue counters, 2 empty") exists anywhere. A screen-reader user cannot answer "how many?" except by counting disabled-button announcements, and can *never* answer anything depending on the red/blue split. `role="group" aria-label="Ten frame N"` (lines 71–72) is good scaffolding to hang a summary on.
- **Build mode — mostly good.** `aria-pressed` on toggleable cells (line 87), names "your counter"/"empty cell", and the Go button's label includes the count ("Go (3 added)", line 125) — that count reaching the button text is a nice touch, though changes to it are not announced until focused.
- **Colour.** Added counters are blue-only vs fixed blue (`filledB`) — visually identical; `aria-pressed` disambiguates for AT but not for colour-blind sighted users scanning the frame. Moderate.

### PlaceValueDiscs — `src/components/PlaceValueDiscs.jsx`

- **Keyboard — PASS.** Display-only diagram + standard digit pad (all buttons, lines 52–92).
- **ARIA (1.3.1/1.1.1) — Moderate.** The disc columns are unlabeled `<div>`s (lines 29–43). Every disc renders its value as text ("100"), so the content is *technically* perceivable as "1000 · 100 100 100 · 10 10 …", but there are no group roles, no per-column counts, and the column header (line 31) is visually a label but structurally a stray `<span>`. The task ("what number is shown?") demands counting; a summary per column ("3 discs of 100") or an overall `aria-label` on the diagram would make it tractable. Note `flex-col-reverse` (line 32) means visual order is bottom-up while DOM order is first-to-last — harmless for identical discs, but worth remembering if discs ever differ.
- **Entry display** `aria-live` present (line 48). Feedback tone colour-only (systemic #4).

### NumberBond — `src/components/NumberBond.jsx`

- **Keyboard — PASS.** Diagram is static; pad is all buttons (lines 47–89).
- **ARIA — Moderate gap.** The answer slot (lines 39–44) shows "?" then the typed entry with **no `aria-live`** — unlike every sibling widget's entry display. Typing is silent here. The whole/part circles are plain divs; their text content ("8", "3") is readable but nothing conveys the *bond structure* (which is whole, which is part). `aria-label="Number bond"` on the section (line 30) is the only structural hint. Suggested name shape: "Number bond: whole 8, part 3, missing part ?".
- **Connector SVG** correctly `aria-hidden` (line 33). Feedback: ring/text colour on the slot only (lines 21–26) — systemic #4/#3.

### BarModel — `src/components/BarModel.jsx`

- **Keyboard — PASS.** Diagram display-only; digit pad buttons (lines 83–124).
- **ARIA — Moderate.** All quantities are real text inside the bars ("Whole = 12", segment values, "B = ?") — the model's *values* survive a screen reader, though the proportional geometry (the pedagogy) does not, which is acceptable. `aria-live="polite"` on the whole diagram container (lines 71–77) will re-announce diagram text as the entry updates the "?" — usable, but noisy, and it wraps a large subtree.
- **Colour (1.4.1).** Known segment sky-400 vs unknown amber-400 — but the unknown also carries "?"/entry text, so not colour-alone. Correct/wrong feedback is *only* `text-deep-teal` vs `text-ember` on the container (lines 73–75) — colour-alone AND unannounced (the live region's text doesn't change on judgement). Empty-part edge case: when `part = 0` or `part = whole`, a segment has 0% width and its text becomes invisible/clipped (`overflow-hidden`, line 22) while remaining in the accessible tree — inconsistent visual/AT experience.

### MultiSelect — `src/components/MultiSelect.jsx`

- **Keyboard — PASS.** Options are `<button type="button">` (lines 56–69); Check is a button.
- **ARIA — good, with one gap.** `aria-pressed` on every option (line 61), labels are the visible math text. The "Chosen 2 of 3" status line (lines 74–80) is exactly the right feedback but is **not a live region** — selection-count changes are silent, and the disabled-Check-until-count-satisfied logic (lines 41–42) is therefore mysterious to an SR user ("why won't Check enable?").
- **Colour.** Selected = seafoam bg + teal ring + slight scale (`selectionClasses`, kit lines 41–46) — ring + background change together; marginal but defensible under 1.4.1. Wrong-answer state on selected tiles is ember ring vs teal ring — colour-vs-colour, systemic #4.
- **Names.** Labels come from option values — for expression options ("4 + 8") this reads naturally; adequate for the task.

### SymbolSelect — `src/components/SymbolSelect.jsx`

- **Keyboard — PASS.** Three buttons, submit-on-press (line 46).
- **ARIA — good names.** "less than" / "greater than" / "equal to" (line 48) — exactly the meaningful-for-maths naming this audit looks for. No pressed-state needed (single-shot submit).
- **Colour/feedback.** Correct = tint deepens on its own hue + scale pulse (lines 17–21, 31, 41–43); revealed-correct-after-wrong = teal ring; wrong = ember ring + shake (lines 36–37). Ring colours are systemic #4; the deepen-on-hue for correct is *especially* colour-subtle. **The wrong-answer shake ignores `lowMotionMode`** — `animate` (lines 38–44) gates intensity on `lowEndDevice` only; a user who chose reduced motion still gets the shake (SC 2.3.3 as implemented app policy; same pattern exists on the session's choice bubbles, `MathExplorer.jsx:1556`). Confetti *is* correctly gated (line 51).

### NumberPad — `src/components/NumberPad.jsx`

- **Keyboard — PASS.** All plain `<button>`s (no framer wrapper); backspace/decimal/Go labeled (lines 68–90).
- **ARIA.** Entry display `aria-live="polite"` (lines 47–51) — typed digits announced. Decimal key labeled "Decimal point" (line 84).
- **Remaining issues are all systemic:** feedback colour-only ring on the display (lines 28–33), focus lost on lock, no designed focus indicator, no outcome announcement. As the most-used widget, NumberPad is where the systemic fixes pay off first.

### Shared infrastructure findings

- `src/components/kit/index.js:34–38` (`feedbackRing`) and `41–46` (`selectionClasses`) encode the teal-vs-ember colour-alone vocabulary used by every widget — the single place to add a non-colour cue (e.g. ring style/iconography differences) alongside colour.
- `src/index.css` contains **no** `:focus`/`:focus-visible` rules; nothing removes outlines either (good), so the browser default ring is the only focus indicator. `-webkit-tap-highlight-color: transparent` (line 54) affects tap highlight only, not focus.
- `src/MathExplorer.jsx:1577–1585`: "The answer is X!" reveal is a plain `<motion.p>` — the one piece of textual outcome feedback in the app, and it is not announced. Line 1508: widget remount per question via `key` resets all widget state *and* focus.

---

## Proposed remediation order

Rationale: unblock the users who currently cannot complete tasks at all, then build the two pieces of shared infrastructure that every per-widget fix depends on (so widget fixes are one-liners, not eleven bespoke inventions), then per-widget content fixes, then polish.

1. **NumberLine keyboard + semantics rebuild (findings #1, #2, #8, #9) — Blocker.** The only widget a keyboard-only user cannot operate at all. Implement the locate interaction as a slider pattern (`role="slider"`, arrow keys move by `step`, `aria-valuetext` "7, on a number line from 0 to 20", Enter/Space to confirm) or roving tabindex over named ticks; remove `role="img"` from the interactive SVG (keep it for jump mode's static drawing, but add a text alternative describing the hop, e.g. "a jump from 3 to 8"). This also produces the reusable keyboard-selection utility any future draggy/spatial widget (and a possible future drag CoinTray) will need — build it as a shared hook, not inline.
2. **Shared live-region announcer (finding #3) — Serious, systemic.** One visually-hidden `aria-live="assertive"` (outcomes) + `aria-live="polite"` (state) region mounted once in `MathExplorer.jsx`, fed by the existing `submitAnswer`/`feedback` lifecycle: "Correct!" / "Not quite — the answer is 12." This single change makes every widget's outcome perceivable and fixes the reveal-text silence. Do this *before* per-widget ARIA work so widgets can also push state announcements ("Numerator selected", "Chosen 2 of 3") through it instead of growing eleven ad-hoc live regions (and lets us *remove* the misplaced ones, findings #11/#13).
3. **Focus management + designed focus indicator (findings #5, #6) — Serious, systemic.** On lock, move focus to a stable element (the feedback/next area) instead of letting it drop from a disabled button; on question remount, focus the question or first control. Add a global `:focus-visible` style (thick ink/teal offset ring) tested against every pad tint. Small, central, benefits all widgets.
4. **Non-colour feedback cue in the kit (finding #4) — Serious, systemic.** Extend `feedbackRing`/`selectionClasses` so correct vs wrong differ by more than hue (e.g. solid vs dashed ring, or a check/dot glyph slot every widget already renders). One file, all widgets inherit.
5. **TenFrame count-mode summary (finding #7) — Serious, contained.** Add a computed `aria-label` to each frame group ("Ten frame 1: 5 red counters, 3 blue counters, 2 empty") and differentiate counter names ("red counter"/"blue counter"); consider `aria-hidden` on the redundant per-cell disabled buttons in count mode once the summary exists.
6. **FractionInput active-field state (finding #10)** — `aria-pressed` on the num/den selectors + announce switches via the step-2 announcer; remove the wrapping live region (finding #11).
7. **Remaining moderates:** PlaceValueDiscs column summaries (#12), BarModel live-region scoping + outcome text (#13), MultiSelect chosen-count announcements (#14), NumberBond entry `aria-live` (#18).
8. **Minors:** `lowMotionMode` gating on shake animations (#15, incl. `MathExplorer.jsx:1556`), `type="button"` sweep, AnalogClock label robustness and the answer-disclosure policy decision (#16, #17 — decide deliberately whether SR labels may state coin values/clock times; document the decision either way).

Estimated total effort: items 1–4 are the substantial work (each M); 5–8 are S each once 2 exists.

---

## Closing note — evidentiary status

This document is the evidence base for a future VPAT/ACR and **must not be summarised as a conformance claim**. It records a static code review as of 2026-08-05: it demonstrates at least one full SC 2.1.1 failure (NumberLine locate mode), a systemic SC 4.1.3 gap (no outcome announcements), and systemic 1.4.1/2.4.7 weaknesses — and it has **not** been validated with any screen reader, keyboard-only walkthrough, switch access, magnification, or contrast instrumentation. Any ACR row must reflect these findings candidly ("Partially Supports" at best for the affected criteria, "Does Not Support" for 2.1.1 while NumberLine stands). Overstating conformance to school districts — who purchase against Section 508/ACR representations — is misrepresentation with legal and contractual consequences. Update this document as fixes land, and only after assistive-technology testing should any criterion be moved to "Supports".
