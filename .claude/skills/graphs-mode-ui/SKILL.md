---
name: graphs-mode-ui
description: How the Graphs (dataGraphs) mode presents questions on screen — bar charts, pictographs, tally charts and line plots. Use when changing what a graph item looks like, adding a figure type, or fixing graph-mode rendering and layout.
---

# Graphs mode — how it renders

Content authoring for this mode is `item-authoring`. This skill is about the
**figure on the screen**: what gets drawn, what must never be drawn, and where
the rendering lives.

## The one rule that matters

**The figure must be the only place the data appears, and the answer must not be
readable off the figure without doing the maths.**

Both halves of that have been violated in shipped code:

1. The mode used to serialise the data into the prompt —
   `Cats 5, Dogs 4, Birds 8, Fish 3. Which one was chosen the most?` — with no
   chart at all. The child scans four numbers in a sentence and picks the
   biggest. That is a reading-comprehension item wearing a graph costume, and
   every test passed, because the stated answer was still correct.
2. `BarChart` used to print each bar's value above the bar. For
   *"How many Bikes?"* the child reads `8` off the label. No axis, no scale,
   no chart-reading.

So: data lives in `display`, never in `promptText`; values are revealed on the
figure only **after** the answer is judged (`showValues`, driven by
`ctx.settled`), as feedback.

`graphFigures.spec.js` enforces both halves — a payload check and a set of
prompt-leak patterns (`●`, `IIII`, `stands for`, `XX`, `Label 5, Label 4`). If
you add a variety, it is covered automatically; if you add a new way to leak
data into a prompt, add the pattern there.

## Where rendering lives

Two registries, deliberately separate:

| Registry | Keyed on | Answers the question |
|---|---|---|
| `src/components/widgetRegistry.js` | `answerType` | what the child answers **through** |
| `src/components/figureRegistry.js` | `display.figure` | what the child reads **from** |

Most figures are read, not answered into: a pictograph is answered on a number
pad, a bar graph by tapping a category name. Before the figure registry existed,
`MathExplorer` had a hand-written `if (q.display?.bars)` branch, which is exactly
why bar graphs were the only figure the mode could draw and everything else had
to be prose.

`getFigure(question)` returns `null` when the answer widget draws its own figure
(`SELF_DRAWING`, currently just `barGraph` → `DataGraph`), so the child never
sees the same chart twice.

### Adding a figure type

1. Component in `src/components/`, an SVG with a `viewBox`, `w-full h-auto`, a
   `max-h-[Nvh]` cap, and `role="img"` + an `aria-label` that states the data
   (a screen-reader user cannot see the chart; that is the accommodation, not a
   leak).
2. One entry in `FIGURES` mapping `display.*` to the component's props.
3. `figure: "<key>"` on the mode's `display` payload.

Do not add a branch to `QuestionDisplay`.

**`display.type` is not `display.figure`.** Across the modes, `display.type` is
overloaded as a *variety name* (`wordFormToStandard`, `crossingBoundary`, …).
Keying figures off it would collide. `display.figure` exists for this and only
this.

## Axis conventions

`chartScale()` in `src/components/chartScale.js` (kept out of `BarChart.jsx` so
logic tests can import it without pulling in a component — eslint's
`react-refresh/only-export-components` also forbids the mixed export).

- max ≤ 10 → labelled step of 1
- max ≤ 20 → step of 2
- max ≤ 50 → step of 5
- axis maximum rounds up to a whole step

Minor gridlines are drawn every 1 unit whenever the labelled step is coarser,
so a bar landing between two labels is still exactly readable. That is the
grade 2-3 "scale of 2" skill and it is what the mode's `axisMisread`
misconception tag refers to — it was untestable while there was no axis.

`barChartScale.spec.js` asserts every value the generator can produce lands on
a drawn gridline. If you widen the value ranges in `makeBars`, that test is the
one that catches an unreadable chart.

`PAD_TOP` carries headroom above the top gridline so a revealed value label on a
full-height bar is not clipped by the viewBox.

## Layout

The play screen is two panes (`.play-area` / `.play-pane` in `src/index.css`),
question left, answer right.

**The binding constraint is viewport HEIGHT, not width.** A 1366×768 laptop and
a 1024×768 iPad in landscape are both *short*; a 1024-wide iPad in portrait is
not. So the side-by-side breakpoint is
`(min-width: 1024px) and (max-height: 900px)` — width alone flips tall portrait
tablets into a layout they do not need.

Sizes that scale with viewport height rather than sitting at a fixed value:
`.pad-key`, `.pad-display` (the digit pad is four rows, so every pixel of key
height costs four), and `.progress-ring`.

### Verifying layout changes

There is no DOM test infrastructure in this repo — the specs are pure logic. To
check layout, serve the app and load `/play/<mode>` in **sized iframes**; an
iframe gets its own viewport, so media queries evaluate against its dimensions.
Window resizing through the browser tools does not work when the Chrome window
is maximised — it reports success and changes nothing.

Then assert `scrollHeight - innerHeight <= 0` per mode per size, sweeping all 22
modes in batches (a full 22-mode sweep in one call exceeds the CDP timeout).
Two artefacts to expect: figures animate in, so wait ~1s before measuring, and
an offscreen iframe throttles rAF, so an element may read `opacity: 0` while
being perfectly fine.

Targets: 1366×768 laptop, 1024×768 iPad landscape, 768×1024 iPad portrait,
390×844 phone. Laptop and iPad must not scroll. Phone is best-effort.

## Gotchas

- **Graphs is a premium mode**, so it is unreachable in a signed-out dev
  session. There is no dev bypass; the way to look at it locally is to flip
  `isPremium` in `src/PremiumContext.jsx` temporarily and revert before
  committing.
- The mode has **no items in the bank** — neither bundled nor in the cloud
  `item_bank` table. Everything you see comes from the generator in
  `src/modes/dataGraphs.js`, so behaviour differences between environments are
  code differences, not content differences.
- **Check which branch prod is on before diagnosing a rendering bug.** The
  prose-graph bug was reported from prod while the fix had been sitting
  unmerged on a feature branch for days; a screenshot from prod and a screenshot
  from `npm run dev` were showing two different versions of the mode.
- `choiceGeneration.spec.js` fails for many modes on `main` and on feature
  branches alike (`generateChoices` returning fewer than 3 choices). It is
  pre-existing and unrelated to this mode — diff the failing set against a
  baseline worktree before assuming you broke it.
