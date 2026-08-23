---
name: answer-widgets-ui
description: How typed-answer widgets (digit pads, keypads) render on web and iOS — shared kit vocabulary, sizing rules, and the shrink-wrap layout trap. Use when adding or restyling any answer widget or debugging pad layout.
---

# Answer widgets — digit pads

## The one vocabulary (brand §08)

Every digit pad on the web draws its keys from `src/components/kit/index.js`:

- `digitKeyClass(digit)` — row tints, fixed forever: Seafoam 1–3, Teal Mid 4–6,
  Apricot 7–9, Sun Light 0. Ink labels, `.pad-key` height (clamped 52–64px;
  spec keys are 64px, floor stays above the 44px touch minimum), 18px radius,
  4px pressed edge via `btn-press`.
- `PAD_BACKSPACE` — solid Sun, Ink glyph, Ember edge.
- `PAD_GO` — solid Lark Teal, Cream label, Deep Teal edge.

Nine components consume it: NumberPad, FigureDigitPad, NumberBond, BarModel,
AnalogClock, TenFrame, FractionInput, FractionSet, PlaceValueDiscs. **Never
write a local `keyClass` in a widget again** — that is how the pads drifted
white/narrow the first time.

iOS mirrors it in `FigureKit.swift`: `DigitPadView.keyTint(_:)` returns the
same (fill, edge) pairs and is also used by `NumberPadWidget` in
AnswerWidgets.swift. Change tints in both places or not at all.

## The shrink-wrap trap

`.play-pane` is a column flex container with `align-items: center`. Any block
child without `w-full` **shrink-wraps to content width**, which collapses a
grid of text-only keys to sliver-width pills. The widget wrapper in
MathExplorer (`<div className="relative w-full">`) must keep `w-full`; a new
wrapper between the pane and a widget needs it too. The multiple-choice grid
never hit this because it renders as a direct child with `w-full`.

## Checking your work

Visual-check a typed-answer mode at desktop width (side-by-side layout) AND a
phone width — the pane is `max-width` constrained differently in each. Dev
shortcut: `/play/<mode>?input=numberpad` forces the pad onto any mode. Keys
must read ≥44px in both axes, rows must show the four tints in order.

## Keyboard (computers)

Every widget also answers from a keyboard via `useAnswerKeys` /
`useDigitKeys` / `useIndexKeys` in `src/components/kit/useAnswerKeys.js`.
One window listener, a stack of handlers — the most recently mounted widget
is the only one that hears keys (the AnimatePresence double-mount can't
answer the new question with the old widget). Keys are ignored while locked
(feedback showing), while focus is in a real `<input>`, and while any element
with `data-blocks-keys` (modal backdrops) is mounted.

Vocabulary: digit pads 0–9 / Backspace / Enter (`.` on decimal pads, `/` or
Tab swaps fraction fields); `< = >` on the comparison keys; 1–9 (0 = tenth)
picks options by position for word choices, multi-select, shapes, coins and
ten-frame cells; arrows walk number-line ticks. **Numeric choice bubbles
match by typed value, never position** — a child pressing "3" means the
number 3. `KeyHint` badges appear only on hover-capable fine-pointer devices
(`.key-hint` in index.css); touch kids never see them.

A new widget must call one of the hooks or it is unreachable by keyboard.
