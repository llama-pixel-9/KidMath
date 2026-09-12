import NumberPad from "./NumberPad.jsx";
import FractionInput from "./FractionInput.jsx";
import NumberBond from "./NumberBond.jsx";
import BarModel from "./BarModel.jsx";
import AnalogClock from "./AnalogClock.jsx";
import FractionSet from "./FractionSet.jsx";
import PlaceValueDiscs from "./PlaceValueDiscs.jsx";
import DataGraph from "./DataGraph.jsx";
import AngleFigure from "./AngleFigure.jsx";
import SymbolSelect from "./SymbolSelect.jsx";
import MultiSelect from "./MultiSelect.jsx";
import NumberLine from "./NumberLine.jsx";
import ShapeFigure from "./ShapeFigure.jsx";
import CoinTray from "./CoinTray.jsx";
import TenFrame from "./TenFrame.jsx";

/**
 * answerType -> answer widget.
 *
 * Every widget receives the same base props (onSubmit, feedback, theme,
 * lowMotionMode, lowEndDevice); `props(question, ctx)` supplies the extras a
 * given widget needs from the question payload. Anything not registered here
 * falls back to the multiple-choice grid.
 *
 * Adding a widget (implementation plan M2) is one entry, not another branch in
 * a ternary chain.
 */
export const WIDGETS = {
  numberPad: { Component: NumberPad },
  fillBlank: { Component: NumberPad },
  decimal: { Component: NumberPad, props: () => ({ allowDecimal: true }) },
  fraction: { Component: FractionInput },
  barGraph: { Component: DataGraph, props: (q) => ({ bars: q.display?.bars }) },
  angle: { Component: AngleFigure, props: (q) => ({ degrees: q.display?.degrees }) },
  clock: {
    Component: AnalogClock,
    props: (q) => ({ hour: q.display?.hour, minute: q.display?.minute }),
  },
  fractionSet: { Component: FractionSet, props: (q) => ({ set: q.display?.set }) },
  placeValueDiscs: { Component: PlaceValueDiscs, props: (q) => ({ cols: q.display?.cols }) },
  barModel: { Component: BarModel, props: (q) => ({ spec: q.display }) },
  numberBond: {
    Component: NumberBond,
    // display.parts present => missing-whole shape (blank on top); otherwise
    // the classic missing-part shape from {whole, part}.
    props: (q) => ({ whole: q.display?.whole, part: q.display?.part, parts: q.display?.parts }),
  },
  symbolSelect: {
    Component: SymbolSelect,
    props: (_q, ctx) => ({ revealAnswer: ctx.revealAnswer, shakenChoice: ctx.shakenChoice }),
  },

  // M2 widgets. Each unlocks varieties across several modes, which is why they
  // are shared infrastructure rather than any one mode's concern.
  multiSelect: {
    Component: MultiSelect,
    props: (q) => ({
      options: q.display?.options || [],
      requiredCount: q.display?.requiredCount ?? null,
    }),
  },
  numberLine: {
    Component: NumberLine,
    props: (q) => ({
      min: q.display?.min ?? 0,
      max: q.display?.max ?? 10,
      step: q.display?.step ?? 1,
      from: q.display?.from ?? null,
      to: q.display?.to ?? null,
      labelEvery: q.display?.labelEvery ?? 1,
      mode: q.display?.lineMode || "locate",
    }),
  },
  shapeFigure: {
    Component: ShapeFigure,
    props: (q) => ({
      shape: q.display?.shape,
      options: q.display?.options || [],
      rotate: q.display?.rotate || 0,
      showSymmetry: q.display?.showSymmetry || false,
      mode: q.display?.shapeMode || "count",
    }),
  },
  coinTray: {
    Component: CoinTray,
    props: (q) => ({
      coins: q.display?.coins || [],
      mode: q.display?.coinMode || "count",
      // For the §18 wrong-answer coaching line ("7¢ short") — the tray
      // states the shortfall, never a red X.
      targetCents: typeof q.answer === "number" ? q.answer : null,
    }),
  },
  tenFrame: {
    Component: TenFrame,
    props: (q) => ({
      filled: q.display?.filled ?? 0,
      filledB: q.display?.filledB ?? 0,
      frames: q.display?.frames ?? 1,
      mode: q.display?.frameMode || "count",
    }),
  },
};

/** All registered answer types. Used by tests and the ?input= override. */
export const ANSWER_TYPES = Object.keys(WIDGETS);

/** Look up a widget; returns null for `choice` and anything unregistered. */
export function getWidget(answerType) {
  return WIDGETS[answerType] || null;
}
