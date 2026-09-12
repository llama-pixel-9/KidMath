import BarChart from "./BarChart.jsx";
import Pictograph from "./Pictograph.jsx";
import TallyChart from "./TallyChart.jsx";
import LinePlot from "./LinePlot.jsx";
import AreaFigure from "./AreaFigure.jsx";
import ClockFace from "./ClockFace.jsx";
import DiscMat from "./DiscMat.jsx";
import CubeGrid from "./CubeGrid.jsx";
import CoordGrid from "./CoordGrid.jsx";
import { areaFigureSpec } from "./areaFigureSpec.js";

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
  areaFigure: {
    Component: AreaFigure,
    props: (q) => ({ spec: areaFigureSpec(q) }),
  },
  discMat: {
    Component: DiscMat,
    props: (q) => ({ cols: q.display?.discMat?.cols, mats: q.display?.discMat?.mats }),
  },
  clockFace: {
    Component: ClockFace,
    props: (q) => ({
      hour: q.display?.clock?.hour ?? q.display?.time?.hour,
      minute: q.display?.clock?.minute ?? q.display?.time?.minute,
    }),
  },
  cubeGrid: {
    Component: CubeGrid,
    props: (q) => ({ l: q.display?.cube?.l, w: q.display?.cube?.w, h: q.display?.cube?.h }),
  },
  coordGrid: {
    Component: CoordGrid,
    props: (q) => ({ max: q.display?.coord?.max, points: q.display?.coord?.points }),
  },
};

/**
 * Figures inferred from the payload when no `figure:` key was authored. The
 * areaPerimeter bank carries structured dims in `display.ap` (and the
 * generator in `width`/`height`) without ever naming a figure; drawing them
 * is a detector here, not a rewrite of 1,800 rows.
 */
function inferFigure(question) {
  const mode = question?.mode || question?.metadata?.modeId;
  if (mode === "areaPerimeter" && areaFigureSpec(question)) return "areaFigure";
  return null;
}

/**
 * Answer widgets that draw the figure themselves. For these the question card
 * must NOT draw it too, or the child sees the same chart twice.
 */
const SELF_DRAWING = new Set(["barGraph"]);

export function getFigure(question) {
  const key = question?.display?.figure || inferFigure(question);
  if (!key || SELF_DRAWING.has(question?.answerType)) return null;
  return FIGURES[key] || null;
}
