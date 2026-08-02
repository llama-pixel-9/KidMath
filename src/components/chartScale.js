/**
 * Pick a bar chart's axis scale. `step` is the labelled interval; `minorStep` is
 * the unlabelled gridline interval, always 1 so a bar landing between two labels
 * is still exactly readable — that is the grade 2-3 "scale of 2" reading skill,
 * not a guess.
 *
 * Lives apart from BarChart so the mode's tests can assert that every value it
 * generates is readable against the scale it will be drawn on, without pulling a
 * component into a logic test.
 */
export function chartScale(values) {
  const max = Math.max(1, ...values);
  const step = max <= 10 ? 1 : max <= 20 ? 2 : max <= 50 ? 5 : 10;
  return { axisMax: Math.ceil(max / step) * step, step, minorStep: 1 };
}
