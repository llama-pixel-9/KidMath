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
    props: (q) => ({ whole: q.display?.whole, part: q.display?.part }),
  },
  symbolSelect: {
    Component: SymbolSelect,
    props: (_q, ctx) => ({ revealAnswer: ctx.revealAnswer, shakenChoice: ctx.shakenChoice }),
  },
};

/** All registered answer types. Used by tests and the ?input= override. */
export const ANSWER_TYPES = Object.keys(WIDGETS);

/** Look up a widget; returns null for `choice` and anything unregistered. */
export function getWidget(answerType) {
  return WIDGETS[answerType] || null;
}
