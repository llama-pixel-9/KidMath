import BarChart from "./BarChart.jsx";
import Pictograph from "./Pictograph.jsx";
import TallyChart from "./TallyChart.jsx";
import LinePlot from "./LinePlot.jsx";

/**
 * `display.figure` -> the figure drawn WITH THE QUESTION.
 *
 * The sibling registry in widgetRegistry.js maps `answerType` to the widget the
 * child answers THROUGH. The two are separate because most figures are read,
 * not answered into: a pictograph is answered on a number pad, a bar graph is
 * answered by tapping a category name. Before this existed, MathExplorer had a
 * hand-written `if (q.display?.bars)` branch, so bar graphs were the only
 * figure a question could show and every other data representation had to be
 * spelled out in the prompt text instead.
 *
 * Adding a figure is one entry here plus a `figure:` key on the mode's display
 * payload — not another branch in QuestionDisplay.
 *
 * `props(question, ctx)` pulls what the component needs off `display`.
 * ctx.settled is true once the answer has been judged, for figures that reveal
 * more after the fact.
 */
export const FIGURES = {
  barGraph: {
    Component: BarChart,
    props: (q, ctx) => ({ bars: q.display?.bars, showValues: ctx.settled }),
  },
  pictograph: {
    Component: Pictograph,
    props: (q) => ({ rows: q.display?.rows, keyValue: q.display?.keyValue }),
  },
  tallyChart: {
    Component: TallyChart,
    props: (q) => ({ rows: q.display?.rows }),
  },
  linePlot: {
    Component: LinePlot,
    props: (q) => ({ points: q.display?.points, axisLabel: q.display?.axisLabel }),
  },
};

/**
 * Answer widgets that draw the figure themselves. For these the question card
 * must NOT draw it too, or the child sees the same chart twice.
 */
const SELF_DRAWING = new Set(["barGraph"]);

export function getFigure(question) {
  const key = question?.display?.figure;
  if (!key || SELF_DRAWING.has(question?.answerType)) return null;
  return FIGURES[key] || null;
}
