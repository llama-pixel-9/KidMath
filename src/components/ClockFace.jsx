import { clockHand } from "./clockHand.js";

/**
 * Read-only analog clock face — the QUESTION-side figure (figureRegistry
 * `clockFace`). The interactive sibling is AnalogClock (answerType "clock"),
 * which draws its own face plus a digit pad; this one only shows a time, for
 * choice/judged items where the child reads the face and answers elsewhere.
 * Same geometry as AnalogClock so the two faces look identical.
 *
 * `numbered` is the PRINTED face (worksheets): numerals 1–12, a minute track,
 * a solid rim and all-black hands. The on-screen face is twelve soft dots —
 * on paper, with no numbers, a child cannot tell which dot is 12, and the tip
 * of the minute hand reads as a thirteenth dot.
 */
export default function ClockFace({ hour, minute, numbered = false }) {
  const cx = 80;
  const cy = 80;
  const minuteAngle = (minute || 0) * 6;
  const hourAngle = (((hour || 12) % 12) + (minute || 0) / 60) * 30;
  const mh = clockHand(cx, cy, numbered ? 60 : 58, minuteAngle);
  const hh = clockHand(cx, cy, numbered ? 34 : 40, hourAngle);

  if (numbered) {
    return (
      <div className="flex justify-center">
        <svg width="200" height="200" viewBox="0 0 160 160" role="img" aria-label="clock face">
          <circle cx={cx} cy={cy} r="74" fill="#fff" stroke="#000" strokeWidth="2.5" />
          {Array.from({ length: 60 }, (_, i) => {
            const onHour = i % 5 === 0;
            const outer = clockHand(cx, cy, 72, i * 6);
            const inner = clockHand(cx, cy, onHour ? 65 : 68, i * 6);
            return (
              <line key={i} x1={inner.x2} y1={inner.y2} x2={outer.x2} y2={outer.y2} stroke="#000" strokeWidth={onHour ? 1.8 : 0.7} />
            );
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const at = clockHand(cx, cy, 54, (i + 1) * 30);
            return (
              <text
                key={i}
                x={at.x2}
                y={at.y2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="13"
                fontWeight="700"
                fill="#000"
                className="font-display"
              >
                {i + 1}
              </text>
            );
          })}
          <line x1={cx} y1={cy} x2={hh.x2} y2={hh.y2} stroke="#000" strokeWidth="5" strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={mh.x2} y2={mh.y2} stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="4" fill="#000" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        role="img"
        aria-label="clock face"
      >
        <circle cx={cx} cy={cy} r="70" className="fill-white stroke-slate-300" strokeWidth="4" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = clockHand(cx, cy, 62, i * 30);
          return <circle key={i} cx={a.x2} cy={a.y2} r="2.5" className="fill-slate-400" />;
        })}
        <line x1={cx} y1={cy} x2={hh.x2} y2={hh.y2} className="stroke-slate-700" strokeWidth="5" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={mh.x2} y2={mh.y2} className="stroke-sky-500" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" className="fill-slate-700" />
      </svg>
    </div>
  );
}
